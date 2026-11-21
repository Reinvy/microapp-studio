/**
 * Import-flow decisions, extracted so they are testable without a browser.
 *
 * The dialog owns rendering only: which verification rows pass, whether the
 * install may proceed, which permissions are approved, and whether a source URL
 * or key is acceptable are all pure functions here. Nothing in this module
 * touches storage, the network, or the DOM.
 */

import type { InstalledApp } from '@/db/repositories/apps';
import { planInstall, type InstallPlan } from './packageService';
import type { InstallSourceName, VerifiedPackage } from '@microapp/runtime-web';

export type VerificationKey = 'manifest' | 'signature' | 'digest';

export type VerificationState = 'pending' | 'pass' | 'fail' | 'skipped';

export interface VerificationRow {
  key: VerificationKey;
  state: VerificationState;
  /** Catalog code (`E-PACK-001/002/003`) when the row failed. */
  code: string | null;
}

export const VERIFICATION_ORDER: VerificationKey[] = ['manifest', 'signature', 'digest'];

const FAILURE_ROW: Record<string, VerificationKey> = {
  'E-PACK-001': 'manifest',
  'E-PACK-002': 'signature',
  'E-PACK-003': 'digest',
};

const HEX_64 = /^[0-9a-f]{64}$/i;
const ID_PATTERN = /^[a-z][a-z0-9]*(?:\.[a-z0-9]+){1,4}$/;
const VERSION_PATTERN = /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/;
const KEY_ID_PATTERN = /^ed25519:[0-9a-f]{64}$/i;

/** Rows rendered before a file has been inspected. */
export function pendingVerificationRows(): VerificationRow[] {
  return VERIFICATION_ORDER.map((key) => ({ key, state: 'pending', code: null }));
}

function manifestValid(pkg: VerifiedPackage): boolean {
  const manifest = pkg.manifest;
  return (
    manifest.schemaVersion === 2 &&
    ID_PATTERN.test(manifest.id) &&
    VERSION_PATTERN.test(manifest.version) &&
    manifest.entry.bundle.length > 0 &&
    HEX_64.test(manifest.integrity.contentHash) &&
    manifest.ui.engine === 'muip-web' &&
    manifest.ui.protocol === 1
  );
}

function signatureValid(pkg: VerifiedPackage): boolean {
  const signature = pkg.manifest.signature;
  if (signature.algorithm !== 'ed25519' || !KEY_ID_PATTERN.test(signature.keyId)) return false;
  try {
    // 64 raw signature bytes, base64 encoded.
    return atob(signature.value).length === 64;
  } catch {
    return false;
  }
}

function digestValid(pkg: VerifiedPackage): boolean {
  if (!HEX_64.test(pkg.digestHex)) return false;
  return pkg.digestHex.toLowerCase() === pkg.manifest.integrity.contentHash.toLowerCase();
}

/**
 * Three observable verification rows. A verified package is re-checked against
 * the fields the dialog shows, so a row can only be `pass` when the data behind
 * it is actually present and consistent.
 *
 * When inspection failed there is no manifest to inspect: only the row the
 * catalog code maps to is marked failed, the rest are `skipped` (never a
 * misleading pass).
 */
export function verificationRows(
  pkg: VerifiedPackage | null,
  failureCode: string | null,
): VerificationRow[] {
  if (!pkg) {
    if (!failureCode) return pendingVerificationRows();
    const failedKey = FAILURE_ROW[failureCode] ?? 'manifest';
    return VERIFICATION_ORDER.map((key) =>
      key === failedKey
        ? { key, state: 'fail' as const, code: failureCode }
        : { key, state: 'skipped' as const, code: null },
    );
  }
  const results: Record<VerificationKey, { ok: boolean; code: string }> = {
    manifest: { ok: manifestValid(pkg), code: 'E-PACK-001' },
    signature: { ok: signatureValid(pkg), code: 'E-PACK-002' },
    digest: { ok: digestValid(pkg), code: 'E-PACK-003' },
  };
  return VERIFICATION_ORDER.map((key) => ({
    key,
    state: results[key].ok ? ('pass' as const) : ('fail' as const),
    code: results[key].ok ? null : results[key].code,
  }));
}

/** `storage.app` needs no consent and is approved as soon as it is declared. */
export const ALWAYS_GRANTED_PERMISSION = 'storage.app';

/** The declared permissions start approved; the user can opt out of the rest. */
export function initialPermissionSelection(declared: readonly string[]): string[] {
  return Array.from(new Set(declared));
}

/**
 * The exact `approvedPermissions` argument for `installPackage`: declared
 * permissions only, declaration order preserved, `storage.app` always present
 * even when the user unselected everything.
 */
export function approvedPermissionSet(
  declared: readonly string[],
  selected: readonly string[],
): string[] {
  const chosen = new Set(selected);
  if (declared.includes(ALWAYS_GRANTED_PERMISSION)) chosen.add(ALWAYS_GRANTED_PERMISSION);
  return declared.filter((permission) => chosen.has(permission));
}

/** Toggle one permission; `storage.app` cannot be removed. */
export function togglePermission(
  declared: readonly string[],
  selected: readonly string[],
  permission: string,
  on: boolean,
): string[] {
  const next = new Set(selected);
  if (on) next.add(permission);
  else next.delete(permission);
  if (declared.includes(ALWAYS_GRANTED_PERMISSION)) next.add(ALWAYS_GRANTED_PERMISSION);
  return declared.filter((candidate) => next.has(candidate));
}

export interface AcknowledgeState {
  keyChange: boolean;
  downgrade: boolean;
}

export type GateBlocker = 'verification' | 'permission' | 'key_change' | 'downgrade';

export interface InstallGateInput {
  rows: readonly VerificationRow[];
  plan: InstallPlan | null;
  acknowledge: AcknowledgeState;
  declaredPermissions: readonly string[];
  approvedPermissions: readonly string[];
}

export interface InstallGate {
  ready: boolean;
  blockedBy: GateBlocker | null;
  /** Localized via `errors.<code>`; never rendered as a raw English reason. */
  code: string | null;
}

/**
 * One place that decides whether **Pasang** may run. Order is fixed so the
 * message the user sees is the first thing they have to fix.
 */
export function installGate(input: InstallGateInput): InstallGate {
  const failed = input.rows.find((row) => row.state === 'fail');
  if (failed) {
    return { ready: false, blockedBy: 'verification', code: failed.code ?? 'E-PACK-002' };
  }
  if (input.rows.length < VERIFICATION_ORDER.length || input.rows.some((row) => row.state !== 'pass')) {
    // Not verified yet: a pending/skipped row can never install.
    return { ready: false, blockedBy: 'verification', code: 'E-PACK-002' };
  }
  const missing = input.declaredPermissions.filter(
    (permission) =>
      permission !== ALWAYS_GRANTED_PERMISSION && !input.approvedPermissions.includes(permission),
  );
  if (missing.length > 0) {
    return { ready: false, blockedBy: 'permission', code: 'E-RUN-003' };
  }
  const warnings = input.plan?.warnings ?? [];
  if (warnings.some((warning) => warning.code === 'key_change') && !input.acknowledge.keyChange) {
    return { ready: false, blockedBy: 'key_change', code: 'E-PACK-002' };
  }
  if (warnings.some((warning) => warning.code === 'downgrade') && !input.acknowledge.downgrade) {
    return { ready: false, blockedBy: 'downgrade', code: 'E-PACK-004' };
  }
  return { ready: true, blockedBy: null, code: null };
}

export interface PackageKeys {
  authorPubkeyHex?: string;
  registryPubkeyHex?: string;
}

export interface PackageKeyValidation {
  ok: boolean;
  /** `author`/`registry` when that field is malformed, otherwise `null`. */
  field: 'author' | 'registry' | null;
  keys: PackageKeys;
}

/** Optional keys must be absent or exactly 32 bytes of hex. */
export function validatePackageKeys(keys: PackageKeys): PackageKeyValidation {
  const author = keys.authorPubkeyHex?.trim().toLowerCase() ?? '';
  const registry = keys.registryPubkeyHex?.trim().toLowerCase() ?? '';
  if (author.length > 0 && !HEX_64.test(author)) {
    return { ok: false, field: 'author', keys: {} };
  }
  if (registry.length > 0 && !HEX_64.test(registry)) {
    return { ok: false, field: 'registry', keys: {} };
  }
  return {
    ok: true,
    field: null,
    keys: {
      ...(author.length > 0 ? { authorPubkeyHex: author } : {}),
      ...(registry.length > 0 ? { registryPubkeyHex: registry } : {}),
    },
  };
}

export interface InspectOutcome {
  pkg: VerifiedPackage | null;
  bytes: Uint8Array | null;
  rows: VerificationRow[];
  plan: InstallPlan | null;
  /** Catalog code of the failure, or the first failed verification row. */
  errorCode: string | null;
}

export interface ImportInspectDeps {
  inspectPackage: (
    file: File,
    source: InstallSourceName,
    keys?: PackageKeys,
  ) => Promise<{ pkg: VerifiedPackage; bytes: Uint8Array }>;
  /** The already-installed app with this manifest id, when there is one. */
  findExisting: (appId: string) => InstalledApp | null;
}

/**
 * Stage 2 of the dialog: verify the file and decide what the user is shown.
 * Invalid optional keys are rejected locally, before any verification work.
 */
export async function inspectForImport(
  deps: ImportInspectDeps,
  file: File,
  keys: PackageKeys,
): Promise<InspectOutcome> {
  const validated = validatePackageKeys(keys);
  if (!validated.ok) {
    return {
      pkg: null,
      bytes: null,
      rows: verificationRows(null, 'E-PACK-002'),
      plan: null,
      errorCode: 'E-PACK-002',
    };
  }
  try {
    const { pkg, bytes } = await deps.inspectPackage(file, 'local', validated.keys);
    const rows = verificationRows(pkg, null);
    const failure = rows.find((row) => row.state === 'fail');
    return {
      pkg,
      bytes,
      rows,
      plan: planInstall(deps.findExisting(pkg.manifest.id), {
        version: pkg.manifest.version,
        authorKeyFingerprint: pkg.manifest.signature.keyId,
      }),
      errorCode: failure?.code ?? null,
    };
  } catch (error) {
    const code = packageErrorCode(error);
    return {
      pkg: null,
      bytes: null,
      rows: verificationRows(null, code),
      plan: null,
      errorCode: code,
    };
  }
}

const CODE_PATTERN = /^E-(SHELL|CREATE|STUDIO|RUN|PACK|DATA|BACKUP|AUTH|SET|NET|DEV)-\d{3}$/;

/**
 * Map any thrown value onto the 27-code catalog. Package-domain failures
 * default to `E-PACK-002` ("could not be verified") rather than a diagnostic
 * code that would mislead the user.
 */
export function packageErrorCode(error: unknown, fallback = 'E-PACK-002'): string {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = typeof error.code === 'string' ? error.code : '';
    if (CODE_PATTERN.test(code)) return code;
  }
  const message = error instanceof Error ? error.message : typeof error === 'string' ? error : '';
  const match = /\b(E-[A-Z]+-\d{3})\b/.exec(message);
  if (match && CODE_PATTERN.test(match[1])) return match[1];
  return fallback;
}

/* ------------------------------------------------------------------------ */
/* Source form                                                              */
/* ------------------------------------------------------------------------ */

export interface SourceDraft {
  name: string;
  url: string;
  publicKeyHex: string;
}

export type SourceField = 'url' | 'key';

export type SourceValidation =
  | { ok: true; name: string; url: string; publicKeyHex: string }
  | { ok: false; field: SourceField; code: 'E-PACK-001' | 'E-PACK-002' };

/**
 * Validate the **Tambah sumber** form without touching the network: the URL
 * must be an absolute `https:` URL with no embedded credentials, and the key
 * must be 32 bytes of hex.
 */
export function validateSourceDraft(draft: SourceDraft): SourceValidation {
  let parsed: URL;
  try {
    parsed = new URL(draft.url.trim());
  } catch {
    return { ok: false, field: 'url', code: 'E-PACK-001' };
  }
  if (parsed.protocol !== 'https:' || parsed.hostname.length === 0) {
    return { ok: false, field: 'url', code: 'E-PACK-001' };
  }
  if (parsed.username.length > 0 || parsed.password.length > 0) {
    return { ok: false, field: 'url', code: 'E-PACK-001' };
  }
  const publicKeyHex = draft.publicKeyHex.trim().toLowerCase();
  if (!HEX_64.test(publicKeyHex)) {
    return { ok: false, field: 'key', code: 'E-PACK-002' };
  }
  const name = draft.name.trim() || parsed.hostname;
  return { ok: true, name: name.slice(0, 80), url: parsed.toString(), publicKeyHex };
}
