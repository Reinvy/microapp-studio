import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Import → verify → install → run → consent → crash.
 *
 * These exercise the real surfaces: the package dialog, the runner iframe, the
 * global consent dialog (default focus on **Tolak**, `Esc` denies), and the
 * crash boundary. Fixtures are signed with an ephemeral key generated when
 * `scripts/make-fixtures.mjs` ran; only the public key is on disk.
 */
const FIXTURES = JSON.parse(readFileSync(join(__dirname, 'fixtures', 'index.json'), 'utf8')) as {
  authorPublicKey: string;
  fixtures: Array<{ file: string; sha256: string }>;
};

async function openImport(page: Page): Promise<void> {
  await page.goto('/packages/import');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
}

async function installFixture(page: Page, file: string): Promise<void> {
  await openImport(page);
  await page.getByLabel('Kunci publik penulis (hex)').fill(FIXTURES.authorPublicKey);
  await page.locator('.mads-file-picker__input').first().setInputFiles(join(__dirname, 'fixtures', file));

  // All three verification rows must pass before install is enabled.
  await expect(page.getByText('Manifest v2 valid')).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText('Signature Ed25519 cocok')).toBeVisible();
  await expect(page.getByText('Digest SHA-256 cocok')).toBeVisible();
  await expect(page.getByText('Izin yang diminta').first()).toBeVisible();

  await page.getByRole('button', { name: 'Pasang', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Buka app' })).toBeVisible({ timeout: 30_000 });
}

test('a signed .mapp installs and appears on Home', async ({ page }) => {
  await installFixture(page, 'valid.mapp');

  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  // The Home library card is labelled with the manifest name, version, and state.
  await expect(page.getByRole('button', { name: /1\.0\.0/ }).first()).toBeVisible({ timeout: 20_000 });
});

test('the first permission call asks for consent with focus on Tolak and Esc denies', async ({ page }) => {
  await installFixture(page, 'consent.mapp');
  await page.getByRole('button', { name: 'Buka app' }).click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible({ timeout: 30_000 });
  await expect(dialog.getByRole('button', { name: 'Tolak' })).toBeFocused();

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden({ timeout: 10_000 });
});

test('a crashing app shows the boundary while the host stays responsive', async ({ page }) => {
  await installFixture(page, 'crash.mapp');
  await page.getByRole('button', { name: 'Buka app' }).click();

  const boundary = page.getByRole('alertdialog');
  await expect(boundary).toBeVisible({ timeout: 20_000 });
  await expect(boundary.getByRole('button', { name: /Muat ulang app/ })).toBeFocused();

  await boundary.getByRole('button', { name: /Kembali ke Home/ }).click();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});

test('an unsigned package is rejected with E-PACK-002 and cannot be installed', async ({ page }) => {
  await openImport(page);
  await page.getByLabel('Kunci publik penulis (hex)').fill(FIXTURES.authorPublicKey);
  await page.locator('.mads-file-picker__input').first().setInputFiles(join(__dirname, 'fixtures', 'unsigned.mapp'));

  await expect(page.getByText(/E-PACK-002/).first()).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole('button', { name: 'Pasang', exact: true })).toBeDisabled();
});
