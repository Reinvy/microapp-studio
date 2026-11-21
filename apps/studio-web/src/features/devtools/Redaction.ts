/**
 * DevTools redaction.
 *
 * The DevTools panels and the `dev_log` writer share one redactor so a value that
 * is safe in the panel is exactly the value that reaches SQLite. Nothing in this
 * module is allowed to log the input.
 */

export { redactForLog, redactText } from '@/db/repositories/devLog';

/** Fields whose *name* marks a value as secret, regardless of content. */
export const SENSITIVE_FIELDS = [
  'token',
  'secret',
  'passphrase',
  'password',
  'key',
  'apikey',
  'api_key',
  'authorization',
  'cookie',
  'mnemonic',
] as const;

export function isSensitiveField(name: string): boolean {
  const normalized = name.toLowerCase().replace(/[-_]/g, '');
  return SENSITIVE_FIELDS.some((field) => field.replace(/_/g, '') === normalized);
}
