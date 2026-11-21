/**
 * Runner core: everything in `useSandboxApp` that does not need React.
 *
 * The hook is a thin orchestrator over these pieces, and the tests drive them
 * directly: the restart-budget → error-boundary transition, the per-mount
 * session id, and the bridge handlers that have fail-closed rules of their own
 * (`files.pick` size, `net.fetch` allowlist, `share.export` in preview).
 *
 * Every failure here surfaces as a catalog code; the bridge turns unknown
 * shapes into `E-DEV-001`, so handlers always throw `BridgeError`.
 */

import {
  BridgeError,
  MAX_RESTARTS,
  RESTART_WINDOW_MS,
  type BridgeHandler,
  type WatchdogAction,
} from '@microapp/runtime-web';

// ---------------------------------------------------------------------------
// Manifest facts
// ---------------------------------------------------------------------------

export interface ManifestFacts {
  id: string | null;
  name: string | null;
  version: string | null;
  bundle: string | null;
  permissions: string[];
  networkAllowlist: string[];
}

const EMPTY_FACTS: ManifestFacts = {
  id: null,
  name: null,
  version: null,
  bundle: null,
  permissions: [],
  networkAllowlist: [],
};

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === 'string');
}

/** Read the manifest fields the runner depends on; unreadable JSON degrades. */
export function parseManifestFacts(manifestJson: string | null | undefined): ManifestFacts {
  if (!manifestJson) return EMPTY_FACTS;
  let parsed: unknown;
  try {
    parsed = JSON.parse(manifestJson);
  } catch {
    return EMPTY_FACTS;
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return EMPTY_FACTS;
  // Narrowed above to a non-array object; a named const keeps the cast visible.
  const record = parsed as Record<string, unknown>;
  const entry = record.entry;
  const bundle =
    entry && typeof entry === 'object' && 'bundle' in entry && typeof entry.bundle === 'string'
      ? entry.bundle
      : null;
  return {
    id: typeof record.id === 'string' ? record.id : null,
    name: typeof record.name === 'string' ? record.name : null,
    version: typeof record.version === 'string' ? record.version : null,
    bundle,
    permissions: stringArray(record.permissions),
    // Only HTTPS origins are ever consulted; anything else is ignored.
    networkAllowlist: stringArray(record.networkAllowlist).filter((origin) => origin.startsWith('https://')),
  };
}

export interface SandboxAppFacts {
  name: string;
  version: string;
  manifest: ManifestFacts;
}

interface InstalledAppLike {
  id: string;
  name: string;
  version: string;
  manifestJson: string;
}

/** Facts for the installed row backing `appInstallId`; preview has no row. */
export function appFactsFor(
  apps: readonly InstalledAppLike[],
  appInstallId: string,
  appId: string,
): SandboxAppFacts {
  const installed = apps.find((candidate) => candidate.id === appInstallId);
  if (!installed) {
    return { name: appId, version: '0.0.0', manifest: EMPTY_FACTS };
  }
  const manifest = parseManifestFacts(installed.manifestJson);
  return {
    name: manifest.name ?? installed.name,
    version: manifest.version ?? installed.version,
    manifest,
  };
}

// ---------------------------------------------------------------------------
// Session id
// ---------------------------------------------------------------------------

function randomSessionId(): string {
  const cryptoObject = typeof globalThis.crypto === 'undefined' ? undefined : globalThis.crypto;
  if (cryptoObject && typeof cryptoObject.randomUUID === 'function') return cryptoObject.randomUUID();
  return `session-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export interface RunnerSession {
  /** Passed to `permissionDecision` and to every consent request. */
  sessionId: string;
  /** Idempotent: drops `Allow once` grants bound to this session. */
  dispose(): Promise<number>;
}

/**
 * One runner mount = one session. `Allow once` never outlives it because the
 * host clears every session grant here, and the id is never reused.
 */
export function createRunnerSession(clear: (sessionId: string) => Promise<number>): RunnerSession {
  const sessionId = randomSessionId();
  let disposing: Promise<number> | null = null;
  return {
    sessionId,
    dispose() {
      disposing ??= Promise.resolve()
        .then(() => clear(sessionId))
        .catch(() => 0);
      return disposing;
    },
  };
}

// ---------------------------------------------------------------------------
// Restart budget and watchdog transitions
// ---------------------------------------------------------------------------

export type SandboxStatus = 'starting' | 'running' | 'stopped' | 'crashed';

export interface SandboxCrash {
  code: string;
  message: string;
}

export interface SandboxRunState {
  status: SandboxStatus;
  crash: SandboxCrash | null;
  /** Automatic restarts inside the rolling window. */
  restartTimes: number[];
  /** Set when the budget is exhausted; the boundary shows a countdown. */
  restartBlockedUntil: number | null;
}

export interface SandboxAppState {
  status: SandboxStatus;
  crash: SandboxCrash | null;
  restarts: number;
  restartBlockedUntil: number | null;
}

export type WatchdogEffect = 'none' | 'remount' | 'crash' | 'hibernate';

export interface WatchdogTransition {
  state: SandboxRunState;
  effect: WatchdogEffect;
}

export const INITIAL_RUN_STATE: SandboxRunState = {
  status: 'starting',
  crash: null,
  restartTimes: [],
  restartBlockedUntil: null,
};

const CRASH_MESSAGES: Record<string, string> = {
  'E-RUN-001': 'App was stopped by the watchdog',
  'E-RUN-002': 'Sandbox is unavailable',
  'E-RUN-004': 'App renderer failed',
};

/** Safe, catalog-level crash payload; never carries host detail. */
export function crashFor(code: string, message?: string): SandboxCrash {
  return { code, message: message?.trim() ? message.slice(0, 200) : (CRASH_MESSAGES[code] ?? 'Sandbox stopped') };
}

export function runStateToAppState(run: SandboxRunState): SandboxAppState {
  return {
    status: run.status,
    crash: run.crash,
    restarts: run.restartTimes.length,
    restartBlockedUntil: run.restartBlockedUntil,
  };
}

export function isRestartBlocked(run: SandboxRunState, now: number): boolean {
  return run.restartBlockedUntil !== null && now < run.restartBlockedUntil;
}

function pruneRestartTimes(times: number[], now: number): number[] {
  return times.filter((at) => at > now - RESTART_WINDOW_MS).slice(-MAX_RESTARTS);
}

/**
 * Map a watchdog tick onto runner state.
 *
 * - `restart` → remount the sandbox and record the attempt;
 * - `error-boundary` → `crashed` with `E-RUN-001`, blocked until the oldest
 *   restart leaves the rolling window, and no further restart is attempted;
 * - `hibernate` → `stopped` and the caller posts `background`;
 * - `kill` → `crashed` with `E-RUN-001`.
 */
export function applyWatchdogOutcome(
  run: SandboxRunState,
  action: WatchdogAction,
  now: number,
): WatchdogTransition {
  switch (action.action) {
    case 'restart': {
      if (run.status === 'crashed') return { state: run, effect: 'none' };
      const restartTimes = [...pruneRestartTimes(run.restartTimes, now), now].slice(-MAX_RESTARTS);
      return {
        state: { status: 'starting', crash: null, restartTimes, restartBlockedUntil: null },
        effect: 'remount',
      };
    }
    case 'error-boundary': {
      if (run.status === 'crashed') return { state: run, effect: 'none' };
      const oldest = run.restartTimes.length > 0 ? Math.min(...run.restartTimes) : now;
      return {
        state: {
          ...run,
          status: 'crashed',
          crash: crashFor('E-RUN-001'),
          restartBlockedUntil: oldest + RESTART_WINDOW_MS,
        },
        effect: 'crash',
      };
    }
    case 'kill': {
      if (run.status === 'crashed') return { state: run, effect: 'none' };
      return { state: { ...run, status: 'crashed', crash: crashFor('E-RUN-001') }, effect: 'crash' };
    }
    case 'hibernate': {
      if (run.status !== 'running') return { state: run, effect: 'none' };
      return { state: { ...run, status: 'stopped' }, effect: 'hibernate' };
    }
    default:
      return { state: run, effect: 'none' };
  }
}

/**
 * Manual reload: refused while the budget countdown runs, otherwise a fresh
 * start that keeps the automatic-restart history for the rolling window.
 */
export function resetForManualReload(run: SandboxRunState, now: number): SandboxRunState | null {
  if (isRestartBlocked(run, now)) return null;
  return {
    status: 'starting',
    crash: null,
    restartTimes: pruneRestartTimes(run.restartTimes, now),
    restartBlockedUntil: null,
  };
}

// ---------------------------------------------------------------------------
// Bridge handlers
// ---------------------------------------------------------------------------

export const MAX_FILE_BYTES = 256 * 1024;
export const MAX_RESPONSE_BYTES = 256 * 1024;
export const NET_TIMEOUT_MS = 30_000;
const MAX_INDEX_BODY_LENGTH = 4 * 1024;

/** Structural subset of `File`, so tests can hand in a plain object. */
export interface PickableFile {
  name: string;
  size: number;
  arrayBuffer(): Promise<ArrayBuffer>;
}

/** Structural subset of `AppDatabase` used by the storage handlers. */
export interface AppKv {
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown): Promise<void>;
  remove(key: string): Promise<void>;
  keys(): Promise<string[]>;
}

export interface BridgeHandlerDeps {
  appId: string;
  appName: string;
  version: string;
  mode: 'run' | 'preview';
  networkAllowlist: readonly string[];
  openAppDb: () => Promise<AppKv>;
  /** Also feeds FTS; the hook binds the host DB. */
  indexRecord?: (key: string, value: unknown) => Promise<void>;
  scheduleNotification?: (title: string, body: string) => Promise<string>;
  showNotification?: (title: string, body: string) => void;
  exportPackage?: () => Promise<Uint8Array | null>;
  download?: (fileName: string, bytes: Uint8Array) => void;
  postToSandbox?: (message: Record<string, unknown>) => void;
  pickFile?: (accept: string | null) => Promise<PickableFile | null>;
  readClipboard?: () => Promise<string>;
  writeClipboard?: (text: string) => Promise<void>;
  vaultRead?: (itemId: string) => Promise<{ label: string; value: string }>;
  fetchImpl?: typeof fetch;
}

/** Base64 for a small byte array; chunked so `fromCharCode` never overflows. */
export function bytesToBase64(bytes: Uint8Array): string {
  const CHUNK = 0x8000;
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + CHUNK));
  }
  return btoa(binary);
}

/** FTS body for one app record: the JSON form of the stored scalar, bounded. */
export function indexBodyFor(value: unknown): string {
  try {
    const encoded = JSON.stringify(value);
    return (encoded ?? 'null').slice(0, MAX_INDEX_BODY_LENGTH);
  } catch {
    return '';
  }
}

/**
 * Enforce the `files.pick` size cap and encode the bytes. The sandbox never
 * receives a host handle — only plain JSON.
 */
export async function encodePickedFile(
  file: PickableFile,
  maxBytes: number = MAX_FILE_BYTES,
): Promise<{ name: string; size: number; dataBase64: string }> {
  if (!Number.isFinite(maxBytes) || maxBytes <= 0) {
    throw new BridgeError('E-RUN-003', { field: 'maxBytes', reason: 'expected_number' });
  }
  if (file.size > maxBytes) {
    throw new BridgeError('E-RUN-003', { reason: 'file_too_large', maxBytes });
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes.byteLength > maxBytes) {
    throw new BridgeError('E-RUN-003', { reason: 'file_too_large', maxBytes });
  }
  const name = (file.name.split(/[\\/]/).pop() ?? 'file').slice(0, 200);
  return { name, size: bytes.byteLength, dataBase64: bytesToBase64(bytes) };
}

/**
 * `net.fetch` origin gate: HTTPS only and exactly one of the manifest's
 * allowlisted origins. The broker already refused the Offline Cage case.
 */
export function checkAllowedOrigin(origin: string, allowlist: readonly string[]): string {
  let parsed: URL;
  try {
    parsed = new URL(origin);
  } catch {
    throw new BridgeError('E-RUN-003', { field: 'origin', reason: 'expected_https_origin' });
  }
  if (parsed.protocol !== 'https:') {
    throw new BridgeError('E-RUN-003', { field: 'origin', reason: 'expected_https_origin' });
  }
  const normalized = parsed.origin;
  const allowed = allowlist.some((entry) => {
    try {
      return new URL(entry).origin === normalized;
    } catch {
      return false;
    }
  });
  if (!allowed) {
    throw new BridgeError('E-RUN-003', { field: 'origin', reason: 'origin_not_allowed' });
  }
  return normalized;
}

const FETCH_METHODS: Record<string, true> = {
  GET: true,
  POST: true,
  PUT: true,
  PATCH: true,
  DELETE: true,
  HEAD: true,
};

function headersFrom(value: unknown): Record<string, string> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return {};
  const headers: Record<string, string> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry === 'string' && key.length > 0) headers[key.slice(0, 100)] = entry.slice(0, 1024);
  }
  return headers;
}

/** Show a browser notification when the platform permission allows it. */
export function showBrowserNotification(title: string, body: string): void {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  try {
    new Notification(title, { body });
  } catch {
    // A notification that cannot be shown is not a bridge failure.
  }
}

/** Default `share.export` sink: a normal anchor download. */
export function downloadBytes(fileName: string, bytes: Uint8Array): void {
  if (typeof document === 'undefined' || typeof URL.createObjectURL !== 'function') {
    throw new BridgeError('E-DATA-002', { reason: 'download_unavailable' });
  }
  const blob = new Blob([bytes as unknown as BlobPart], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.rel = 'noopener';
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

interface PickerWindow {
  showOpenFilePicker?: (options?: {
    multiple?: boolean;
    excludeAcceptAllOption?: boolean;
    types?: Array<{ description?: string; accept: Record<string, string[]> }>;
  }) => Promise<Array<{ getFile(): Promise<File> }>>;
}

/**
 * `showOpenFilePicker()` when available, hidden `<input type="file">` otherwise.
 * Cancellation returns `null`; the handler then returns `null` to the sandbox.
 */
export async function pickFileFromUser(accept: string | null): Promise<PickableFile | null> {
  if (typeof window === 'undefined' || typeof document === 'undefined') return null;
  const picker = (window as unknown as PickerWindow).showOpenFilePicker;
  if (typeof picker === 'function') {
    const first = accept?.split(',')[0]?.trim() ?? '';
    const types =
      first.includes('/') && !first.includes('*') ? [{ description: 'Files', accept: { [first]: [] } }] : undefined;
    try {
      const handles = await picker({ multiple: false, excludeAcceptAllOption: false, types });
      const handle = handles[0];
      if (!handle) return null;
      return await handle.getFile();
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return null;
      // Picker unavailable in this context (insecure, unsupported): fall back.
    }
  }
  const { promise, resolve } = Promise.withResolvers<PickableFile | null>();
  const input = document.createElement('input');
  input.type = 'file';
  if (accept) input.accept = accept;
  input.hidden = true;
  const settle = (file: PickableFile | null): void => {
    input.remove();
    resolve(file);
  };
  input.addEventListener('change', () => settle(input.files?.[0] ?? null), { once: true });
  input.addEventListener('cancel', () => settle(null), { once: true });
  document.body.append(input);
  input.click();
  return promise;
}

/**
 * Build the 14 bridge handlers. Handlers receive validated params; only the
 * rules that belong to the host live here (size, allowlist, preview policy).
 */
export function createBridgeHandlers(deps: BridgeHandlerDeps): Record<string, BridgeHandler> {
  const fetchImpl = deps.fetchImpl ?? ((...args: Parameters<typeof fetch>) => fetch(...args));

  return {
    'ui.ready': () => ({ version: 1, appId: deps.appId }),

    'ui.toast': (params) => {
      deps.postToSandbox?.({
        type: 'microapp.toast',
        message: String(params.message ?? ''),
        tone: String(params.tone ?? 'default'),
      });
      return true;
    },

    'storage.get': async (params) => {
      const database = await deps.openAppDb();
      return { value: await database.get(String(params.key)) };
    },

    'storage.set': async (params) => {
      const key = String(params.key);
      const database = await deps.openAppDb();
      await database.set(key, params.value);
      // App records are searchable: FTS indexes the scalar value, never a handle.
      await deps.indexRecord?.(key, params.value);
      return { saved: true };
    },

    'storage.remove': async (params) => {
      const database = await deps.openAppDb();
      await database.remove(String(params.key));
      return { removed: true };
    },

    'storage.keys': async () => {
      const database = await deps.openAppDb();
      return { keys: await database.keys() };
    },

    'clipboard.read': async () => {
      try {
        if (deps.readClipboard) return await deps.readClipboard();
        if (typeof navigator === 'undefined' || !navigator.clipboard) throw new Error('clipboard unavailable');
        return await navigator.clipboard.readText();
      } catch {
        throw new BridgeError('E-RUN-003', { reason: 'clipboard_denied' });
      }
    },

    'clipboard.write': async (params) => {
      const text = String(params.text ?? '');
      try {
        if (deps.writeClipboard) {
          await deps.writeClipboard(text);
        } else {
          if (typeof navigator === 'undefined' || !navigator.clipboard) throw new Error('clipboard unavailable');
          await navigator.clipboard.writeText(text);
        }
        return { written: true };
      } catch {
        throw new BridgeError('E-RUN-003', { reason: 'clipboard_denied' });
      }
    },

    'notify.local': async (params) => {
      const title = String(params.title ?? '');
      const body = String(params.body ?? '');
      if (!deps.scheduleNotification) {
        throw new BridgeError('E-DATA-002', { reason: 'notifications_unavailable' });
      }
      const id = await deps.scheduleNotification(title, body);
      // Preview only records the schedule; it never surfaces a system banner.
      if (deps.mode !== 'preview') (deps.showNotification ?? showBrowserNotification)(title, body);
      return { id };
    },

    'files.pick': async (params) => {
      const accept = typeof params.accept === 'string' ? params.accept : null;
      const maxBytes = typeof params.maxBytes === 'number' ? params.maxBytes : MAX_FILE_BYTES;
      const picker = deps.pickFile ?? pickFileFromUser;
      const picked = await picker(accept);
      if (!picked) return null;
      return encodePickedFile(picked, maxBytes);
    },

    'net.fetch': async (params, context) => {
      const origin = checkAllowedOrigin(String(params.origin ?? ''), deps.networkAllowlist);
      const rawPath = typeof params.path === 'string' && params.path.length > 0 ? params.path : '/';
      if (rawPath.includes('://') || rawPath.startsWith('//')) {
        throw new BridgeError('E-RUN-003', { field: 'path', reason: 'invalid_path' });
      }
      const url = new URL(rawPath.startsWith('/') ? `${origin}${rawPath}` : `${origin}/${rawPath}`);
      if (url.origin !== origin) {
        throw new BridgeError('E-RUN-003', { field: 'path', reason: 'origin_not_allowed' });
      }
      const method = (typeof params.method === 'string' ? params.method : 'GET').toUpperCase();
      if (!FETCH_METHODS[method]) {
        throw new BridgeError('E-RUN-003', { field: 'method', reason: 'expected_method' });
      }
      const bodyAllowed = method !== 'GET' && method !== 'HEAD';
      const body = bodyAllowed && typeof params.body === 'string' ? params.body : undefined;

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), NET_TIMEOUT_MS);
      const abortFromBroker = (): void => controller.abort();
      context.signal.addEventListener('abort', abortFromBroker, { once: true });
      try {
        const response = await fetchImpl(url.toString(), {
          method,
          headers: headersFrom(params.headers),
          body,
          credentials: 'omit',
          redirect: 'follow',
          signal: controller.signal,
        });
        const buffer = new Uint8Array(await response.arrayBuffer());
        const capped = buffer.byteLength > MAX_RESPONSE_BYTES ? buffer.subarray(0, MAX_RESPONSE_BYTES) : buffer;
        return { status: response.status, bodyText: new TextDecoder().decode(capped) };
      } catch (error) {
        if (error instanceof BridgeError) throw error;
        throw new BridgeError('E-RUN-003', {
          reason: controller.signal.aborted ? 'timeout' : 'network_error',
        });
      } finally {
        clearTimeout(timer);
        context.signal.removeEventListener('abort', abortFromBroker);
      }
    },

    'vault.read': async (params) => {
      const itemId = String(params.itemId ?? '');
      if (!deps.vaultRead) throw new BridgeError('E-AUTH-001', { reason: 'vault_locked' });
      try {
        return await deps.vaultRead(itemId);
      } catch (error) {
        if (error instanceof BridgeError) throw error;
        throw new BridgeError('E-AUTH-001', { reason: 'vault_locked' });
      }
    },

    'share.export': async () => {
      if (deps.mode === 'preview') {
        throw new BridgeError('E-RUN-003', { reason: 'preview_export_disabled' });
      }
      if (!deps.exportPackage) {
        throw new BridgeError('E-PACK-002', { reason: 'package_unavailable' });
      }
      const bytes = await deps.exportPackage();
      if (!bytes || bytes.byteLength === 0) {
        throw new BridgeError('E-PACK-002', { reason: 'package_unavailable' });
      }
      const fileName = `${deps.appId}-${deps.version}.mapp`;
      (deps.download ?? downloadBytes)(fileName, bytes);
      return { fileName, size: bytes.byteLength };
    },

    'app.getInfo': () => ({ id: deps.appId, name: deps.appName, version: deps.version }),
  };
}
