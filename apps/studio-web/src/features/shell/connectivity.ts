/**
 * Connectivity probe.
 *
 * `navigator.onLine` alone is not trustworthy: it reports `true` behind a captive
 * portal, and several automation environments never flip it. The probe below is
 * the honest signal — it issues a request that cannot be satisfied from the
 * service-worker cache (unique query string) so a failure means "the network is
 * actually unreachable".
 *
 * Probes run on mount and on `online`/`offline` events only; there is no polling.
 */

const PROBE_PATH = '/manifest.webmanifest';
const PROBE_TIMEOUT_MS = 2000;

/** True when a real network request succeeds. */
export async function probeNetwork(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return false;
  try {
    const response = await fetch(`${PROBE_PATH}?probe=${Date.now()}`, {
      method: 'GET',
      cache: 'no-store',
      credentials: 'omit',
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    });
    return response.ok;
  } catch {
    return false;
  }
}
