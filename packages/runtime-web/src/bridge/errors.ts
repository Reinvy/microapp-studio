/**
 * Bridge error catalog.
 *
 * Codes are normative (`docs/03-specs/error-codes.md`); a bridge error that is
 * not in this map is a bug. Messages are safe to hand to a micro-app: no host
 * paths, no stack traces, no resource existence leaks.
 */

export const ERROR_CODES = [
  'E-SBX-001',
  'E-SBX-002',
  'E-SBX-003',
  'E-SBX-004',
  'E-SBX-005',
  'E-SBX-006',
  'E-SBX-007',
  'E-SBX-008',
  'E-SBX-009',
  'E-NET-003',
  'E-DATA-001',
  'E-DATA-006',
  'E-CRYPTO-001',
  'E-CRYPTO-002',
  'E-HOST-004',
  'E-HOST-006',
  'E-AUTH-006',
  'E-REG-001',
  'E-REG-002',
  'E-REG-003',
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

const SAFE_MESSAGES: Record<ErrorCode, string> = {
  'E-SBX-001': 'Sandbox runtime unavailable',
  'E-SBX-002': 'Memory quota exceeded',
  'E-SBX-003': 'Sandbox frozen',
  'E-SBX-004': 'Sandbox startup timed out',
  'E-SBX-005': 'Request denied',
  'E-SBX-006': 'Request cancelled',
  'E-SBX-007': 'Transfer incomplete',
  'E-SBX-008': 'Duplicate request',
  'E-SBX-009': 'Invalid intent',
  'E-NET-003': 'Network operation timed out',
  'E-DATA-001': 'Database unavailable',
  'E-DATA-006': 'Storage quota exceeded',
  'E-CRYPTO-001': 'Data integrity check failed',
  'E-CRYPTO-002': 'Key unavailable',
  'E-HOST-004': 'Vault locked',
  'E-HOST-006': 'Audit chain invalid',
  'E-AUTH-006': 'Recovery mismatch',
  'E-REG-001': 'Package signature invalid',
  'E-REG-002': 'Publisher key changed',
  'E-REG-003': 'Package integrity check failed',
};

const RETRYABLE: Record<ErrorCode, boolean> = {
  'E-SBX-001': true,
  'E-SBX-002': true,
  'E-SBX-003': true,
  'E-SBX-004': true,
  'E-SBX-005': true,
  'E-SBX-006': false,
  'E-SBX-007': true,
  'E-SBX-008': false,
  'E-SBX-009': false,
  'E-NET-003': true,
  'E-DATA-001': true,
  'E-DATA-006': true,
  'E-CRYPTO-001': false,
  'E-CRYPTO-002': false,
  'E-HOST-004': true,
  'E-HOST-006': false,
  'E-AUTH-006': true,
  'E-REG-001': false,
  'E-REG-002': false,
  'E-REG-003': false,
};

export interface BridgeErrorBody {
  code: ErrorCode;
  message: string;
  details?: Record<string, unknown>;
  retryable: boolean;
}

export type BridgeFailure = {
  id: string;
  ok: false;
  error: BridgeErrorBody;
};

/** Error carrying a catalog code, safe message, and retryability. */
export class BridgeError extends Error {
  readonly code: ErrorCode;
  readonly details?: Record<string, unknown>;
  readonly retryable: boolean;

  constructor(code: ErrorCode, details?: Record<string, unknown>, retryableOverride?: boolean) {
    super(SAFE_MESSAGES[code]);
    this.name = 'BridgeError';
    this.code = code;
    this.details = details;
    // Catalog default, overridable for cases like a non-idempotent timeout where
    // the same code must not advertise retryability.
    this.retryable = retryableOverride ?? RETRYABLE[code];
  }

  toBody(): BridgeErrorBody {
    return {
      code: this.code,
      message: SAFE_MESSAGES[this.code],
      details: this.details,
      retryable: this.retryable,
    };
  }
}

/** Map unknown failures to a catalog code without leaking internals. */
export function toBridgeError(error: unknown): BridgeError {
  if (error instanceof BridgeError) return error;
  if (error instanceof DOMException && error.name === 'AbortError') {
    return new BridgeError('E-SBX-006');
  }
  return new BridgeError('E-SBX-001');
}

export function safeMessage(code: ErrorCode): string {
  return SAFE_MESSAGES[code];
}
