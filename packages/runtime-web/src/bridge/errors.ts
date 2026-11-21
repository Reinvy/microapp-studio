/**
 * Bridge error catalog.
 *
 * The 27 documented codes are normative (`docs/03-specs/error-codes.md`); a code
 * outside this map is a bug. Messages are safe to hand to a micro-app: no host
 * paths, no stack traces, no resource-existence leaks.
 */

export const ERROR_CODES = [
  'E-SHELL-001',
  'E-SHELL-002',
  'E-SHELL-003',
  'E-CREATE-001',
  'E-CREATE-002',
  'E-CREATE-003',
  'E-STUDIO-001',
  'E-STUDIO-002',
  'E-STUDIO-003',
  'E-RUN-001',
  'E-RUN-002',
  'E-RUN-003',
  'E-RUN-004',
  'E-PACK-001',
  'E-PACK-002',
  'E-PACK-003',
  'E-PACK-004',
  'E-DATA-001',
  'E-DATA-002',
  'E-BACKUP-001',
  'E-BACKUP-002',
  'E-AUTH-001',
  'E-AUTH-002',
  'E-SET-001',
  'E-SET-002',
  'E-NET-001',
  'E-DEV-001',
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

/** The code an unrecognised failure falls back to (`error-codes.md` §7). */
export const FALLBACK_CODE: ErrorCode = 'E-DEV-001';

const SAFE_MESSAGES: Record<ErrorCode, string> = {
  'E-SHELL-001': 'Host database unavailable',
  'E-SHELL-002': 'Local identity unavailable',
  'E-SHELL-003': 'Offline cache unavailable',
  'E-CREATE-001': 'Prompt is empty or too long',
  'E-CREATE-002': 'AI provider is not configured',
  'E-CREATE-003': 'Generation failed',
  'E-STUDIO-001': 'Draft document is invalid',
  'E-STUDIO-002': 'Autosave failed',
  'E-STUDIO-003': 'Drop target is not valid',
  'E-RUN-001': 'App was stopped by the watchdog',
  'E-RUN-002': 'Sandbox is unavailable',
  'E-RUN-003': 'Request denied',
  'E-RUN-004': 'App renderer failed',
  'E-PACK-001': 'Package layout is invalid',
  'E-PACK-002': 'Package signature is invalid',
  'E-PACK-003': 'Package integrity check failed',
  'E-PACK-004': 'Package version is unavailable',
  'E-DATA-001': 'Database unavailable',
  'E-DATA-002': 'Storage write rejected',
  'E-BACKUP-001': 'Backup authentication failed',
  'E-BACKUP-002': 'Backup file is corrupt',
  'E-AUTH-001': 'Key material unavailable',
  'E-AUTH-002': 'Recovery phrase does not match',
  'E-SET-001': 'Setting value is invalid',
  'E-SET-002': 'Preferences could not be saved',
  'E-NET-001': 'Network request blocked by Offline Cage',
  'E-DEV-001': 'Diagnostics unavailable',
};

const RETRYABLE: ReadonlySet<ErrorCode> = new Set<ErrorCode>([
  'E-SHELL-001',
  'E-SHELL-003',
  'E-CREATE-003',
  'E-STUDIO-002',
  'E-RUN-002',
  'E-DATA-001',
  'E-DATA-002',
  'E-SET-002',
  'E-DEV-001',
]);

export interface BridgeErrorBody {
  code: ErrorCode | string;
  message: string;
  retryable: boolean;
  details?: Record<string, unknown>;
}

function isErrorCode(value: string): value is ErrorCode {
  return (ERROR_CODES as readonly string[]).includes(value);
}

function messageFor(code: ErrorCode): string {
  return SAFE_MESSAGES[code];
}

export class BridgeError extends Error {
  readonly code: ErrorCode;
  readonly retryable: boolean;
  readonly details: Record<string, unknown>;

  constructor(code: ErrorCode, details: Record<string, unknown> = {}, retryable?: boolean) {
    super(messageFor(code));
    this.name = 'BridgeError';
    this.code = code;
    this.details = details;
    this.retryable = retryable ?? RETRYABLE.has(code);
  }

  toBody(): BridgeErrorBody {
    return {
      code: this.code,
      message: this.message,
      retryable: this.retryable,
      ...(Object.keys(this.details).length > 0 ? { details: this.details } : {}),
    };
  }
}

/** Map any thrown value onto the catalog; unknown shapes become the fallback. */
export function toBridgeError(error: unknown): BridgeError {
  if (error instanceof BridgeError) return error;
  if (error instanceof Error) {
    const match = /^([A-Z]-[A-Z]+-\d{3})\b/.exec(error.message);
    if (match && isErrorCode(match[1])) {
      const code = match[1];
      return new BridgeError(code, { reason: safeReason(error.message) });
    }
  }
  return new BridgeError(FALLBACK_CODE, { reason: 'unexpected' });
}

/** Strip anything that could leak host detail into an app-visible reason. */
function safeReason(message: string): string {
  const normalized = message.replace(/^[A-Z]-[A-Z]+-\d{3}\s*/, '');
  const withoutPaths = normalized.replace(/(?:\/|[A-Za-z]:\\)[^\s]*/g, '[path]');
  return withoutPaths.slice(0, 120);
}
