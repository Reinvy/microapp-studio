/**
 * Bridge broker: permission → parameters → rate limit → execution, plus cancel,
 * duplicate-id detection, timeouts, and audit.
 *
 * The broker never hands Host objects to the sandbox: handlers receive plain
 * JSON params and return plain JSON results.
 */

import { BridgeError, toBridgeError } from './errors';
import {
  effectiveTimeout,
  methodSpec,
  parseRequest,
  validateParams,
  type BridgeRequest,
  type BridgeResponse,
  type StreamFrame,
} from './protocol';
import { TokenBucket } from './rate-limit';
import { isRecord } from '../types/guards';

export type PermissionDecision = 'granted' | 'denied' | 'mocked';

export interface BridgeContext {
  readonly appId: string;
  readonly requestId: string;
  readonly signal: AbortSignal;
  readonly mocked: boolean;
  readonly emit: (frame: StreamFrame) => void;
}

export type BridgeHandler = (
  params: Record<string, unknown>,
  context: BridgeContext,
) => Promise<unknown> | unknown;

export type ConsentDecision = 'granted' | 'denied';

export interface AuditEvent {
  appId: string;
  method: string;
  result: 'ok' | 'error' | 'cancelled';
  code?: string;
  durationMs: number;
  mocked?: boolean;
}

export interface BrokerOptions {
  appId: string;
  handlers: Record<string, BridgeHandler>;
  checkPermission: (
    permissionId: string,
    request: BridgeRequest,
  ) => PermissionDecision | Promise<PermissionDecision>;
  requestConsent?: (request: BridgeRequest) => ConsentDecision | Promise<ConsentDecision>;
  audit?: (event: AuditEvent) => void;
  now?: () => number;
  rateLimitPerSecond?: number;
  /** Methods whose timeout stays retryable (idempotent reads). */
  idempotentMethods?: string[];
}

const DEFAULT_IDEMPOTENT = [
  'db.query',
  'storage.get',
  'storage.keys',
  'fs.read',
  'fs.stat',
  'notifications.list',
  'device.info',
  'sync.status',
  'log.flush',
  'intents.canHandle',
];

const MAX_SEEN_REQUEST_IDS = 512;

export class BridgeBroker {
  private readonly appId: string;
  private readonly handlers: Record<string, BridgeHandler>;
  private readonly checkPermission: BrokerOptions['checkPermission'];
  private readonly requestConsent: BrokerOptions['requestConsent'];
  private readonly audit: (event: AuditEvent) => void;
  private readonly now: () => number;
  private readonly bucket: TokenBucket;
  private readonly idempotent: ReadonlySet<string>;
  private readonly inflight = new Map<string, AbortController>();
  private readonly seenRequestIds: string[] = [];

  constructor(options: BrokerOptions) {
    this.appId = options.appId;
    this.handlers = options.handlers;
    this.checkPermission = options.checkPermission;
    this.requestConsent = options.requestConsent;
    this.audit = options.audit ?? (() => {});
    this.now = options.now ?? (() => Date.now());
    const perSecond = options.rateLimitPerSecond ?? 100;
    this.bucket = new TokenBucket(perSecond, perSecond / 1000, this.now());
    this.idempotent = new Set(options.idempotentMethods ?? DEFAULT_IDEMPOTENT);
  }

  /** Cancel an in-flight request by id (envelope-level, no permission). */
  cancel(id: string): boolean {
    const controller = this.inflight.get(id);
    if (!controller) return false;
    controller.abort();
    return true;
  }

  activeRequests(): number {
    return this.inflight.size;
  }

  async handle(raw: unknown): Promise<BridgeResponse> {
    const started = this.now();
    let request: BridgeRequest | undefined;
    const rawId =
      isRecord(raw) && typeof raw.id === 'string' ? raw.id : '';
    try {
      request = parseRequest(raw);
      const methodKey = `${request.ns}.${request.method}`;
      if (this.inflight.has(request.id) || this.seenRequestIds.includes(request.id)) {
        throw new BridgeError('E-SBX-008', { requestId: request.id });
      }
      const spec = methodSpec(request.ns, request.method);
      if (!spec) throw new BridgeError('E-SBX-005', { reason: 'unknown_method' });
      if (spec.disabled) {
        // Fail closed for phase-gated features before any handler or dialog.
        throw new BridgeError('E-SBX-005', { reason: 'not_available_in_this_host_version' });
      }

      // Permission (or per-transfer consent) before parameter validation (B-03).
      let mocked = false;
      if (spec.consent) {
        if (!this.requestConsent) {
          throw new BridgeError('E-SBX-009', { reason: 'consent_unavailable' });
        }
        const decision = await this.requestConsent(request);
        if (decision !== 'granted') {
          throw new BridgeError('E-SBX-009', { reason: 'consent_denied' });
        }
      } else if (spec.permission) {
        const decision = await this.checkPermission(spec.permission, request);
        if (decision === 'denied') {
          throw new BridgeError('E-SBX-005', { permission: spec.permission });
        }
        mocked = decision === 'mocked';
      }

      // Parameters.
      const params = validateParams(request);

      // Rate limit.
      if (!this.bucket.tryTake(this.now())) {
        throw new BridgeError('E-SBX-005', { reason: 'rate_limited' });
      }

      const handler = this.handlers[methodKey];
      if (!handler) {
        throw new BridgeError('E-SBX-001', { reason: 'handler_unavailable' });
      }
      this.remember(request.id);
      const controller = new AbortController();
      this.inflight.set(request.id, controller);
      try {
        const result = await this.runWithTimeout(
          handler,
          params,
          {
            appId: this.appId,
            requestId: request.id,
            signal: controller.signal,
            mocked,
            emit: () => {},
          },
          controller,
          effectiveTimeout(request),
          this.idempotent.has(methodKey),
        );
        this.audit({
          appId: this.appId,
          method: methodKey,
          result: 'ok',
          durationMs: this.now() - started,
          mocked,
        });
        return { id: request.id, ok: true, result };
      } finally {
        this.inflight.delete(request.id);
      }
    } catch (error) {
      const bridgeError = toBridgeError(error);
      this.audit({
        appId: this.appId,
        method: request ? `${request.ns}.${request.method}` : 'unknown',
        result: bridgeError.code === 'E-SBX-006' ? 'cancelled' : 'error',
        code: bridgeError.code,
        durationMs: this.now() - started,
      });
      return { id: rawId, ok: false, error: bridgeError.toBody() };
    }
  }

  private async runWithTimeout(
    handler: BridgeHandler,
    params: Record<string, unknown>,
    context: BridgeContext,
    controller: AbortController,
    timeoutMs: number,
    idempotent: boolean,
  ): Promise<unknown> {
    const { promise, resolve, reject } = Promise.withResolvers<unknown>();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      reject(
        idempotent
          ? new BridgeError('E-NET-003', { reason: 'timeout' })
          : new BridgeError('E-SBX-005', { reason: 'timeout' }, false),
      );
      controller.abort();
    }, timeoutMs);
    const onAbort = () => {
      if (timedOut) return;
      clearTimeout(timer);
      reject(new BridgeError('E-SBX-006'));
    };
    controller.signal.addEventListener('abort', onAbort, { once: true });
    void Promise.resolve()
      .then(() => handler(params, context))
      .then((result) => {
        clearTimeout(timer);
        controller.signal.removeEventListener('abort', onAbort);
        if (controller.signal.aborted) {
          reject(new BridgeError('E-SBX-006'));
          return;
        }
        resolve(result);
      })
      .catch((error: unknown) => {
        clearTimeout(timer);
        controller.signal.removeEventListener('abort', onAbort);
        reject(error);
      });
    return promise;
  }

  private remember(id: string): void {
    this.seenRequestIds.push(id);
    if (this.seenRequestIds.length > MAX_SEEN_REQUEST_IDS) {
      this.seenRequestIds.shift();
    }
  }
}
