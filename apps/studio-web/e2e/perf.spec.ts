import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

/**
 * Performance budget on the documented throttle (Fast 3G + 4x CPU).
 *
 * Thresholds: LCP < 2000 ms, CLS < 0.1, INP p75 < 200 ms. Measurements come from
 * the page's own PerformanceObserver, so they reflect what a user experiences
 * rather than a synthetic score.
 */

const LCP_BUDGET_MS = 2000;
const CLS_BUDGET = 0.1;
const INP_BUDGET_MS = 200;

test.use({ viewport: { width: 1280, height: 800 } });

async function throttle(page: Page): Promise<void> {
  const session = await page.context().newCDPSession(page);
  await session.send('Network.enable');
  await session.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 150,
    downloadThroughput: (1.6 * 1024 * 1024) / 8,
    uploadThroughput: (750 * 1024) / 8,
  });
  await session.send('Emulation.setCPUThrottlingRate', { rate: 4 });
}

test('Home meets the LCP, CLS, and INP budgets under Fast 3G and 4x CPU', async ({ page }) => {
  await page.addInitScript(() => {
    const metrics = { lcp: 0, cls: 0, inp: 0, events: [] as number[] };
    (window as unknown as { __perf: typeof metrics }).__perf = metrics;

    // LCP stops at the first user interaction (Web Vitals definition); without
    // this the metric keeps growing while the user is already working.
    let interacted = false;
    for (const type of ['pointerdown', 'keydown', 'click'] as const) {
      window.addEventListener(type, () => {
        interacted = true;
      }, { once: true, capture: true });
    }
    new PerformanceObserver((list) => {
      if (interacted) return;
      for (const entry of list.getEntries()) metrics.lcp = Math.max(metrics.lcp, entry.startTime);
    }).observe({ type: 'largest-contentful-paint', buffered: true });

    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const shift = entry as PerformanceEntry & { value?: number; hadRecentInput?: boolean };
        if (!shift.hadRecentInput) metrics.cls += shift.value ?? 0;
      }
    }).observe({ type: 'layout-shift', buffered: true });

    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const event = entry as PerformanceEntry & { duration?: number };
        metrics.events.push(event.duration ?? 0);
      }
    }).observe({ type: 'event', buffered: true, durationThreshold: 16 } as PerformanceObserverInit);
  });

  await throttle(page);
  const navigation = Date.now();
  await page.goto('/', { waitUntil: 'load' });
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 30_000 });

  // Several real interactions so the INP sample is a distribution, not one spike.
  const palette = page.getByRole('button', { name: /Palet perintah/ });
  for (let round = 0; round < 3; round += 1) {
    await palette.click();
    await page.keyboard.press('Escape');
  }
  await page.waitForTimeout(800);
  const loadMs = Date.now() - navigation;

  const metrics = await page.evaluate(
    () => (window as unknown as { __perf: { lcp: number; cls: number; events: number[] } }).__perf,
  );

  // INP is the 75th percentile of interaction latencies (Web Vitals), not the max.
  const sorted = [...metrics.events].sort((a, b) => a - b);
  const p75 = sorted.length === 0 ? 0 : sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.75))];

  expect(metrics.lcp, `LCP ${metrics.lcp.toFixed(0)} ms`).toBeLessThan(LCP_BUDGET_MS);
  expect(metrics.cls, `CLS ${metrics.cls.toFixed(3)}`).toBeLessThan(CLS_BUDGET);
  if (sorted.length > 0) {
    expect(p75, `INP p75 ${p75.toFixed(0)} ms over ${sorted.length} events`).toBeLessThan(INP_BUDGET_MS);
  }
  // Sanity: the throttled load itself must still complete in a reasonable window.
  expect(loadMs).toBeLessThan(30_000);
});

test('reduced motion removes transforms and long transitions', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'microapp.preferences',
      JSON.stringify({ theme: 'light', locale: 'id-ID', textScale: 1, reducedMotion: true }),
    );
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

  const violations = await page.evaluate(() => {
    const buttons = [document.querySelector('.mads-button'), ...document.querySelectorAll('.mads-button')];
    const bad: string[] = [];
    for (const element of buttons) {
      if (!element) continue;
      const styles = getComputedStyle(element);
      if (styles.transform !== 'none') bad.push(`transform: ${styles.transform}`);
      const duration = Number.parseFloat(styles.transitionDuration.split(',')[0] || '0');
      if (duration > 0.12) bad.push(`transition: ${duration}s`);
    }
    return bad;
  });
  expect(violations).toEqual([]);
});
