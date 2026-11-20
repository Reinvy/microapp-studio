/**
 * Canonical runtime type guards.
 *
 * One exported `isRecord` for the whole package; call sites import it instead of
 * redefining the guard (or, worse, trusting a shape they did not check).
 */

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
