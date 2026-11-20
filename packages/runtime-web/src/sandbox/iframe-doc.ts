/**
 * Opaque-origin sandbox document builder.
 *
 * The iframe carries exactly `sandbox="allow-scripts"` (no `allow-same-origin`),
 * loads its bootstrap from a `blob:` URL, and declares the CSP from ADR-0014.
 * No inline script is emitted, so a CSP violation cannot be bypassed by the
 * bootstrap itself.
 */

export const SANDBOX_CSP_TEMPLATE = [
  "default-src 'none'",
  "script-src 'nonce-{nonce}' blob: 'wasm-unsafe-eval'",
  'worker-src blob:',
  "style-src blob: 'unsafe-inline'",
  'img-src blob: data:',
  'media-src blob:',
  'font-src blob:',
  "connect-src 'none'",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ');

/** CSP without a nonce, for documentation/tests that assert base directives. */
export const SANDBOX_CSP = SANDBOX_CSP_TEMPLATE.replace("'nonce-{nonce}' ", '');

export const SANDBOX_IFRAME_ATTRIBUTES = {
  sandbox: 'allow-scripts',
  referrerpolicy: 'no-referrer',
  allow: '',
} as const;

export function assertNonce(nonce: string): void {
  if (!/^[A-Za-z0-9+/_-]{16,128}$/.test(nonce)) {
    throw new Error('sandbox nonce is invalid');
  }
}

function escapeAttribute(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

export interface SandboxDocumentOptions {
  /** Inline bootstrap source; executed with a CSP nonce inside the sandbox. */
  bootstrapSource: string;
  nonce: string;
  bridgeVersion?: number;
  muipVersion?: number;
  appId: string;
  locale?: string;
}

/**
 * Build the iframe `srcdoc`.
 *
 * Opaque-origin iframes cannot load `blob:` URLs created by the parent origin,
 * so the bootstrap is inlined and authorized with a per-mount CSP nonce. The app
 * bundle arrives over `postMessage` and is turned into an iframe-local blob URL
 * by the bootstrap itself.
 */
export function buildSandboxDocument(options: SandboxDocumentOptions): string {
  assertNonce(options.nonce);
  const locale = options.locale ?? 'id-ID';
  const csp = SANDBOX_CSP_TEMPLATE.replace('{nonce}', options.nonce);
  // The bootstrap is a classic module body; a closing script tag inside it would
  // terminate the inline element early, so escape any occurrence defensively.
  const bootstrap = options.bootstrapSource.replaceAll('</script', '<\\/script');
  return [
    '<!doctype html>',
    `<html lang="${escapeAttribute(locale)}">`,
    '<head>',
    '<meta charset="utf-8">',
    `<meta http-equiv="Content-Security-Policy" content="${escapeAttribute(csp)}">`,
    '<meta name="referrer" content="no-referrer">',
    `<title>${escapeAttribute(options.appId)}</title>`,
    '</head>',
    '<body>',
    '<div id="muip-root" role="main"></div>',
    '<div id="muip-status" role="status" aria-live="polite"></div>',
    `<script type="module" nonce="${escapeAttribute(options.nonce)}" data-bridge-version="${options.bridgeVersion ?? 1}" data-muip-version="${options.muipVersion ?? 1}">${bootstrap}</script>`,
    '</body>',
    '</html>',
  ].join('');
}

export interface SandboxMessage {
  source: 'muip' | 'bridge';
  appId: string;
  payload: unknown;
}

/**
 * A message is trusted only when it comes from the expected window and carries
 * the app id this sandbox was mounted for (B-01/B-19).
 */
export function isTrustedMessage(
  event: { source: unknown; data: unknown },
  expectedWindow: unknown,
  appId: string,
): boolean {
  if (!expectedWindow || event.source !== expectedWindow) return false;
  const data = event.data;
  if (typeof data !== 'object' || data === null) return false;
  const candidate = data as { source?: unknown; appId?: unknown };
  return candidate.appId === appId && (candidate.source === 'muip' || candidate.source === 'bridge');
}
