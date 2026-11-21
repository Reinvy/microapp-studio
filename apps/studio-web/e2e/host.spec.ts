import { expect, test, type Page } from '@playwright/test';

/** Abort every non-local request so offline-first behaviour stays provable. */
export async function blockExternal(page: Page): Promise<string[]> {
  const blocked: string[] = [];
  await page.route('**/*', (route) => {
    const url = route.request().url();
    if (url.startsWith('http://127.0.0.1:') || url.startsWith('blob:') || url.startsWith('data:')) {
      void route.continue();
      return;
    }
    blocked.push(url);
    void route.abort();
  });
  return blocked;
}

test('a clean profile opens Home without asking for a mnemonic', async ({ page }) => {
  const blocked = await blockExternal(page);
  await page.goto('/');

  // The v3 shell provisions identity silently: Home is usable immediately.
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  // No mnemonic surface exists in the shell; the recovery *nudge* is plain copy.
  await expect(page.locator('[data-testid="mnemonic-word"]')).toHaveCount(0);
  await expect(page.locator('.mads-mnemonic-grid, .mnemonic-grid')).toHaveCount(0);

  // The welcome overlay may be present, but it never blocks Home.
  const overlay = page.getByRole('dialog');
  if ((await overlay.count()) > 0) {
    await expect(overlay.first()).toHaveAttribute('aria-modal', 'false');
  }

  const create = page.locator('.mads-empty-state__action button, .mads-empty-state__action a');
  await expect(create.first()).toBeVisible();
  expect(blocked).toEqual([]);

  // Nothing identity-related is ever written to localStorage.
  const keys = await page.evaluate(() => Object.keys(localStorage));
  expect(keys.every((key) => key === 'microapp.preferences')).toBe(true);
});

test('the three create cards fit on a 360x640 viewport', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await page.goto('/');
  const actions = page.locator('.mads-empty-state__action button, .mads-empty-state__action a');
  await expect(actions).toHaveCount(3);
  for (let index = 0; index < 3; index += 1) {
    await expect(actions.nth(index)).toBeInViewport();
  }
});

test('identity survives a reload and the shell has exactly one main landmark', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('main#mads-main')).toHaveCount(1);
  await page.reload();
  await expect(page.locator('main#mads-main')).toHaveCount(1);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  // A failed identity provisioning would surface E-SHELL-002 in the shell badges.
  await expect(page.getByText('E-SHELL-002')).toHaveCount(0);

  // The host database really lives in OPFS, not in the memory fallback.
  const hasHostDb = await page.evaluate(async () => {
    const root = await navigator.storage.getDirectory();
    try {
      const dir = await root.getDirectoryHandle('microapp-studio');
      await dir.getFileHandle('host.db');
      return true;
    } catch {
      return false;
    }
  });
  expect(hasHostDb).toBe(true);
});

test('pre-paint theme init applies the stored preference before React boots', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'microapp.preferences',
      JSON.stringify({ theme: 'dark', locale: 'en-US', textScale: 1.25, reducedMotion: true }),
    );
  });
  // Block the framework chunks so only the pre-paint script can have run.
  await page.route('**/_next/static/chunks/**', (route) => route.abort());
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  const applied = await page.evaluate(() => ({
    theme: document.documentElement.dataset.theme,
    lang: document.documentElement.lang,
    reduced: document.documentElement.dataset.reducedMotion,
    scale: document.documentElement.style.getPropertyValue('--mads-text-scale'),
  }));
  expect(applied).toEqual({ theme: 'dark', lang: 'en-US', reduced: 'true', scale: '1.25' });
});

test('the shell renders offline after the first visit', async ({ page, context }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  // Wait for the service worker to control the page and finish precaching.
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null, undefined, { timeout: 30_000 });

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByText(/offline/i).first()).toBeVisible({ timeout: 15_000 });
  await context.setOffline(false);
});
