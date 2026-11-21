import { expect, test } from '@playwright/test';

test('document responses carry the nonce CSP and cross-origin isolation headers', async ({ page }) => {
  const response = await page.goto('/');
  expect(response).not.toBeNull();
  const headers = response!.headers();

  expect(headers['x-frame-options']).toBe('DENY');
  expect(headers['cross-origin-opener-policy']).toBe('same-origin');
  expect(headers['cross-origin-embedder-policy']).toBe('require-corp');
  expect(headers['cross-origin-resource-policy']).toBe('same-origin');
  expect(headers['permissions-policy']).toBe('camera=(), microphone=(), geolocation=()');

  const csp = headers['content-security-policy'];
  expect(csp).toBeTruthy();
  expect(csp).toContain("default-src 'self'");
  expect(csp).toContain("object-src 'none'");
  expect(csp).toContain("base-uri 'none'");
  expect(csp).toContain("frame-ancestors 'none'");
  expect(csp).toContain("'wasm-unsafe-eval'");

  const nonce = /'nonce-([0-9a-f]{32})'/.exec(csp!)?.[1];
  expect(nonce, 'CSP must carry a 32 hex character nonce').toMatch(/^[0-9a-f]{32}$/);
  expect(headers['x-nonce']).toBe(nonce);
});

test('every inline script in the served document carries the request nonce', async ({ page }) => {
  const response = await page.goto('/');
  const html = (await response!.text()) ?? '';
  const csp = response!.headers()['content-security-policy'] ?? '';
  const nonce = /'nonce-([0-9a-f]{32})'/.exec(csp)?.[1];
  expect(nonce).toBeTruthy();

  const tags = [...html.matchAll(/<script\b[^>]*>/g)].map((match) => match[0]);
  expect(tags.length).toBeGreaterThan(0);

  for (const tag of tags) {
    const hasSrc = /\bsrc=/.test(tag);
    if (!hasSrc) {
      // Inline scripts are only allowed with the matching nonce.
      expect(tag, `inline script without nonce: ${tag.slice(0, 120)}`).toContain(`nonce="${nonce}"`);
    }
  }

  // The pre-paint preference script is same-origin and covered by 'self'.
  expect(html).toContain('src="/theme-init.js"');
});

test('an inline script without the nonce is blocked', async ({ page }) => {
  await page.goto('/');
  const executed = await page.evaluate(() => {
    const marker = '__csp_inline_probe__';
    (window as unknown as Record<string, unknown>)[marker] = false;
    const script = document.createElement('script');
    script.textContent = `window.${marker} = true;`;
    document.head.appendChild(script);
    script.remove();
    return (window as unknown as Record<string, unknown>)[marker] === true;
  });
  expect(executed).toBe(false);
});

test('production CSP does not allow eval, and injected code cannot run', async ({ page }) => {
  const response = await page.goto('/');
  const csp = response!.headers()['content-security-policy'] ?? '';
  expect(csp).not.toContain("'unsafe-eval'");
  expect(csp).toContain("'wasm-unsafe-eval'");

  // A script element without the nonce never executes, so neither does its
  // `eval` body: the sandbox CSP has no dynamic-code escape hatch.
  const executed = await page.evaluate(() => {
    const marker = '__eval_probe__';
    (window as unknown as Record<string, unknown>)[marker] = 'not-run';
    const script = document.createElement('script');
    script.textContent = `window.${marker} = eval('1 + 1');`;
    document.head.appendChild(script);
    script.remove();
    return (window as unknown as Record<string, unknown>)[marker];
  });
  expect(executed).toBe('not-run');
});
