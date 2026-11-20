/**
 * Opaque-origin sandbox document builder.
 *
 * The iframe carries exactly `sandbox="allow-scripts"` (no `allow-same-origin`),
 * loads its bootstrap from a `blob:` URL, and declares the CSP from ADR-0014.
 * No inline script is emitted, so a CSP violation cannot be bypassed by the
 * bootstrap itself.
 */

export const SANDBOX_CSP = [
  "default-src 'none'",
  "script-src blob: 'wasm-unsafe-eval'",
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

export const SANDBOX_IFRAME_ATTRIBUTES = {
  sandbox: 'allow-scripts',
  referrerpolicy: 'no-referrer',
  allow: '',
} as const;

export function assertBlobUrl(url: string): void {
  if (!url.startsWith('blob:')) {
    throw new Error('sandbox bootstrap must be a blob: URL');
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
  bootstrapUrl: string;
  bridgeVersion?: number;
  muipVersion?: number;
  appId: string;
  locale?: string;
}

/**
 * Build the iframe `srcdoc`. The document contains no inline script and no
 * host markup: only the bootstrap blob, a mount root, and a status region.
 */
export function buildSandboxDocument(options: SandboxDocumentOptions): string {
  assertBlobUrl(options.bootstrapUrl);
  const locale = options.locale ?? 'id-ID';
  return [
    '<!doctype html>',
    `<html lang="${escapeAttribute(locale)}">`,
    '<head>',
    '<meta charset="utf-8">',
    `<meta http-equiv="Content-Security-Policy" content="${escapeAttribute(SANDBOX_CSP)}">`,
    '<meta name="referrer" content="no-referrer">',
    `<title>${escapeAttribute(options.appId)}</title>`,
    '</head>',
    '<body>',
    '<div id="muip-root" role="main"></div>',
    '<div id="muip-status" role="status" aria-live="polite"></div>',
    `<script type="module" src="${escapeAttribute(options.bootstrapUrl)}" data-bridge-version="${options.bridgeVersion ?? 1}" data-muip-version="${options.muipVersion ?? 1}"></script>`,
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
