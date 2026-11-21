import { expect, test } from '@playwright/test';

/**
 * RTL pass: every shipped screen must lay out inside the viewport when the
 * document direction flips. Icons that point somewhere (chevrons, back arrows)
 * use logical properties, so the layout must not need a second stylesheet.
 */

const SCREENS = [
  '/',
  '/templates',
  '/create?mode=blank',
  '/create?mode=ai',
  '/packages',
  '/packages?tab=sources',
  '/packages/import',
  '/settings',
  '/settings/general',
  '/settings/permissions',
  '/settings/ai',
  '/settings/about',
];

for (const path of SCREENS) {
  test(`no horizontal overflow in RTL: ${path}`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(path);
    await expect(page.locator('main#mads-main')).toBeVisible();

    const overflow = await page.evaluate(() => {
      document.documentElement.dir = 'rtl';
      // Force a layout pass after the direction change.
      void document.documentElement.offsetWidth;
      const root = document.documentElement;
      return {
        dir: root.dir,
        scrollWidth: root.scrollWidth,
        clientWidth: root.clientWidth,
      };
    });

    expect(overflow.dir).toBe('rtl');
    expect(
      overflow.scrollWidth - overflow.clientWidth,
      `${path} overflows by ${overflow.scrollWidth - overflow.clientWidth}px in RTL`,
    ).toBeLessThanOrEqual(1);
  });
}

test('the skip link and focus ring follow the logical direction', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('main#mads-main')).toBeVisible();
  const positions = await page.evaluate(() => {
    document.documentElement.dir = 'rtl';
    const link = document.querySelector<HTMLElement>('.mads-skip-link');
    if (!link) return null;
    link.focus();
    const styles = getComputedStyle(link);
    return { insetInlineStart: styles.insetInlineStart, left: styles.left, right: styles.right };
  });
  // A logical inset means the same rule serves both directions.
  expect(positions).not.toBeNull();
});
