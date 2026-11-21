/**
 * Bridge broker.
 *
 * Validation order is binding (`host-bridge.md` B-03):
 *   envelope/version → frame size → rate → declared method/permission →
 *   consent → parameters → handler → audit.
 *
 * The broker never hands host objects to the sandbox: handlers receive plain
 * JSON params and return plain JSON results. A permissioned method that the
 * manifest did not declare fails closed with `E-RUN-003` *before* any consent
 * dialog can appear.
 */

import { BridgeError, toBridgeError } from './errors';
import {
  effectiveTimeout,
  methodKey,
  methodSpec,
  parseRequest,
  validateParams,
  type BridgeRequest,
  type BridgeResponse,
} from './protocol';
import { TokenBucket } from './rate-limit';

export type PermissionDecision = 'granted' | 'denied' | 'mocked';

export interface BridgeContext {
  readonly appId: string;
  readonly requestId: string;
  readonly signal: AbortSignal;
  readonly mocked: boolean;
}

export type BridgeHandler = (
  params: Record<string, unknown>,
  context: BridgeContext,
) => Promise<unknown> | unknown;

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
  /** Permissions the installed manifest declares. Nothing else can be called. */
  declaredPermissions: string[];
  /** True when the app's Offline Cage is active; `network.fetch` then fails with `E-NET-001`. */
  offlineCage?: boolean;
  handlers: Record<string, BridgeHandler>;
  /**
   * Resolve the current decision for a permission. This is where JIT consent
   * happens: the host asks its dialog when no grant exists, then reports back.
   */
  checkPermission: (permissionId: string) => PermissionDecision | Promise<PermissionDecision>;
  audit?: (event: AuditEvent) => void;
  now?: () => number;
}

/** `storage.app` owns only the app's own database, so it needs no consent. */
const IMPLICIT_PERMISSIONS = new Set(['storage.app']);

const MAX_SEEN_REQUEST_IDS = 512;

export class BridgeBroker {
  private readonly appId: string;
  private readonly declared: ReadonlySet<string>;
  private readonly offlineCage: boolean;
  private readonly handlers: Record<string, BridgeHandler>;
  private readonly checkPermission: BrokerOptions['checkPermission'];
  private readonly audit: (event: AuditEvent) => void;
  private readonly now: () => number;
  private readonly bucket: TokenBucket;
  private readonly inflight = new Map<string, AbortController>();
  private readonly seenRequestIds: string[] = [];

  constructor(options: BrokerOptions) {
    this.appId = options.appId;
    this.declared = new Set(options.declaredPermissions);
    this.offlineCage = options.offlineCage ?? true;
    this.handlers = options.handlers;
    this.checkPermission = options.checkPermission;
    this.audit = options.audit ?? (() => {});
    this.now = options.now ?? (() => Date.now());
    this.bucket = new TokenBucket(undefined, undefined, this.now());
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
    let method = 'unknown';
    try {
      request = parseRequest(raw); // envelope + version + frame size
      method = methodKey(request.ns, request.method);

      if (this.inflight.has(request.id) || this.seenRequestIds.includes(request.id)) {
        throw new BridgeError('E-RUN-003', { reason: 'duplicate_request' });
      }

      const spec = methodSpec(request.ns, request.method);
      if (!spec) throw new BridgeError('E-RUN-003', { reason: 'unknown_method', method });

      // Rate limit before touching permission state.
      if (!this.bucket.tryTake(this.now())) {
        throw new BridgeError('E-RUN-003', { reason: 'rate_limited' });
      }

      // Declaration gate: a method whose permission is not declared never runs.
      if (spec.permission && !this.declared.has(spec.permission)) {
        throw new BridgeError('E-RUN-003', { reason: 'permission_not_declared', permission: spec.permission });
      }

      // Offline Cage blocks network before consent, so no dialog can appear for
      // a request that is going to be refused anyway.
      if (spec.permission === 'network.fetch' && this.offlineCage) {
        throw new BridgeError('E-NET-001', { reason: 'offline_cage' });
      }

      let mocked = false;
      if (spec.permission && !IMPLICIT_PERMISSIONS.has(spec.permission)) {
        const decision = await this.checkPermission(spec.permission);
        if (decision === 'denied') {
          throw new BridgeError('E-RUN-003', { permission: spec.permission, reason: 'permission_denied' });
        }
        mocked = decision === 'mocked';
      }

      const params = validateParams(request);

      const handler = this.handlers[method];
      if (!handler) throw new BridgeError('E-RUN-002', { reason: 'handler_unavailable', method });

      this.remember(request.id);
      const controller = new AbortController();
      this.inflight.set(request.id, controller);
      try {
        const result = await this.runWithTimeout(
          handler,
          params,
          { appId: this.appId, requestId: request.id, signal: controller.signal, mocked },
          controller,
          effectiveTimeout(spec),
        );
        this.audit({ appId: this.appId, method, result: 'ok', durationMs: this.now() - started, mocked });
        return { id: request.id, ok: true, result };
      } finally {
        this.inflight.delete(request.id);
      }
    } catch (error) {
      const bridgeError = toBridgeError(error);
      const cancelled = controllerAborted(error);
      this.audit({
        appId: this.appId,
        method,
        result: cancelled ? 'cancelled' : 'error',
        code: bridgeError.code,
        durationMs: this.now() - started,
      });
      return { id: requestIdOf(raw), ok: false, error: bridgeError.toBody() };
    }
  }

  private async runWithTimeout(
    handler: BridgeHandler,
    params: Record<string, unknown>,
    context: BridgeContext,
    controller: AbortController,
    timeoutMs: number,
  ): Promise<unknown> {
    const { promise, resolve, reject } = Promise.withResolvers<unknown>();
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      controller.abort();
      reject(new BridgeError('E-RUN-001', { reason: 'timeout', timeoutMs }));
    }, timeoutMs);
    const onAbort = (): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(new BridgeError('E-RUN-003', { reason: 'cancelled' }));
    };
    controller.signal.addEventListener('abort', onAbort, { once: true });
    void Promise.resolve()
      .then(() => handler(params, context))
      .then((result) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        controller.signal.removeEventListener('abort', onAbort);
        resolve(result);
      })
      .catch((error: unknown) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        controller.signal.removeEventListener('abort', onAbort);
        reject(error);
      });
    return promise;
  }

  private remember(id: string): void {
    this.seenRequestIds.push(id);
    if (this.seenRequestIds.length > MAX_SEEN_REQUEST_IDS) this.seenRequestIds.shift();
  }
}

function requestIdOf(raw: unknown): string {
  if (raw && typeof raw === 'object' && 'id' in raw) {
    const id = (raw as { id?: unknown }).id;
    if (typeof id === 'string' && id.length <= 64) return id;
  }
  return '';
}

function controllerAborted(error: unknown): boolean {
  return error instanceof BridgeError && error.details.reason === 'cancelled';
}
