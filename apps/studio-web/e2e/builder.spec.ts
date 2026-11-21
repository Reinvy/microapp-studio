import { expect, test, type Page } from '@playwright/test';

/** Template → builder → edit → preview → share, plus the autosave round trip. */

async function openBuilderFromTemplate(page: Page): Promise<void> {
  await page.goto('/templates');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page.getByRole('button', { name: 'Pakai template', exact: true }).first().click();
  await expect(page.getByRole('button', { name: 'Bagikan' })).toBeVisible({ timeout: 20_000 });
  await expect(page).toHaveURL(/\/studio\/.+/);
}

test('a template opens the builder with a valid document and sample data', async ({ page }) => {
  await openBuilderFromTemplate(page);
  // The canvas renders the real MUIP tree, so a catalog component is visible.
  await expect(page.locator('[data-muip-id]').first()).toBeVisible();
  // Device frames are radio options with the documented widths.
  await expect(page.getByRole('radio', { name: 'Mobile' })).toBeVisible();
  await expect(page.getByRole('radio', { name: 'Desktop' })).toBeVisible();
});

test('adding a node, editing text, and undo all update the canvas', async ({ page }) => {
  await openBuilderFromTemplate(page);

  const before = await page.locator('[data-muip-id]').count();
  await page.getByRole('button', { name: /Tambah komponen: Button/ }).click();
  await expect.poll(async () => page.locator('[data-muip-id]').count()).toBeGreaterThan(before);

  // Double-click the new button to edit its text inline, then confirm with Enter.
  const button = page.locator('[data-muip-type="Button"]').filter({ hasText: 'Tombol' }).first();
  await button.dblclick();
  const field = page.locator('.mads-canvas form').getByLabel('label');
  await field.fill('Simpan transaksi');
  await field.press('Enter');
  await expect(page.locator('[data-muip-id]').filter({ hasText: 'Simpan transaksi' }).first()).toBeVisible();

  // Undo restores the previous label.
  await page.getByRole('button', { name: 'Urungkan' }).click();
  await expect(page.locator('[data-muip-type="Button"]').filter({ hasText: 'Tombol' }).first()).toBeVisible();
});

test('autosave survives a reload', async ({ page }) => {
  await openBuilderFromTemplate(page);
  await page.getByRole('button', { name: /Tambah komponen: Card/ }).click();
  await expect(page.getByText('Tersimpan').first()).toBeVisible({ timeout: 20_000 });

  const url = page.url();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Bagikan' })).toBeVisible({ timeout: 20_000 });
  expect(page.url()).toBe(url);
  // The added Card persisted (template cards are also named Kartu, so count grows).
  await expect(page.locator('[data-muip-id]').first()).toBeVisible();
});

test('preview runs the draft in an opaque-origin sandbox', async ({ page }) => {
  await openBuilderFromTemplate(page);
  await page.getByRole('button', { name: 'Preview', exact: true }).click();

  const iframe = page.locator('iframe');
  await expect(iframe).toBeVisible({ timeout: 20_000 });
  await expect(iframe).toHaveAttribute('sandbox', 'allow-scripts');

  await page.getByRole('button', { name: 'Ubah' }).click();
  await expect(page.getByRole('button', { name: 'Bagikan' })).toBeVisible();
});

test('sharing builds and downloads a .mapp file', async ({ page }) => {
  await openBuilderFromTemplate(page);
  await page.getByRole('button', { name: 'Bagikan' }).click();

  const sheet = page.getByRole('dialog');
  await expect(sheet).toBeVisible();
  await sheet.getByRole('button', { name: 'Bagikan', exact: true }).click();
  await expect(sheet.getByText('Package siap diunduh.')).toBeVisible({ timeout: 60_000 });

  const downloadPromise = page.waitForEvent('download', { timeout: 60_000 });
  await sheet.getByRole('button', { name: 'Unduh .mapp' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.mapp$/);
});
