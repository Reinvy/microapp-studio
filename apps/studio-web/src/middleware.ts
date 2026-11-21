import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Per-request Content-Security-Policy with a nonce.
 *
 * The nonce is generated here, echoed on the request as `x-nonce` so server
 * components can read it, and set (with its matching CSP) on the *request* so
 * Next.js can stamp the same nonce onto every framework script tag. Setting it
 * only on the response would leave Next's scripts nonce-less and blocked.
 *
 * `theme-init.js` is a same-origin external script, so it needs no nonce under
 * `script-src 'self'`.
 *
 * Development additionally allows `eval` (React refresh) and plain HTTP for the
 * BYOK endpoint; production restricts connections to HTTPS plus loopback.
 */
const isDev = process.env.NODE_ENV !== 'production';

export function middleware(request: NextRequest): NextResponse {
  const nonce = createNonce();

  const scriptSrc = ["'self'", `'nonce-${nonce}'`, "'wasm-unsafe-eval'"];
  if (isDev) scriptSrc.push("'unsafe-eval'");

  const connectSrc = ["'self'", 'https:', 'http://localhost:*', 'http://127.0.0.1:*'];
  if (isDev) connectSrc.push('http:', 'ws:', 'wss:');

  const policy = [
    "default-src 'self'",
    `script-src ${scriptSrc.join(' ')}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "media-src 'self' data: blob:",
    "font-src 'self'",
    `connect-src ${connectSrc.join(' ')}`,
    "worker-src 'self' blob:",
    "frame-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; ');

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', policy);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', policy);
  response.headers.set('x-nonce', nonce);
  return response;
}

function createNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export const config = {
  // Static assets and the service worker never need a nonce, and rewriting them
  // through middleware would break the immutable caching Next sets up for them.
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|theme-init\\.js|sw\\.js|sandbox-bootstrap\\.js|wasm/|sqlite-wasm/|icons/|manifest\\.webmanifest).*)',
  ],
};
