import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const FIXTURES = JSON.parse(readFileSync(join(__dirname, 'fixtures', 'index.json'), 'utf8')) as {
  authorPublicKey: string;
  fixtures: Array<{ file: string; sha256: string }>;
};

const CONFIRM_INDICES = [2, 9, 17];

/** Block every non-local request so offline-first behaviour is provable. */
export async function blockExternal(page: Page): Promise<string[]> {
  const blocked: string[] = [];
  await page.route('**/*', (route) => {
    const url = route.request().url();
    if (url.startsWith('http://127.0.0.1:3100') || url.startsWith('blob:') || url.startsWith('data:')) {
      void route.continue();
      return;
    }
    blocked.push(url);
    void route.abort();
  });
  return blocked;
}

export async function completeFirstRun(page: Page): Promise<string[]> {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Buat identitas lokal' })).toBeVisible();
  await page.getByRole('button', { name: 'Buat identitas baru' }).click();
  const wordNodes = page.getByTestId('mnemonic-word');
  await expect(wordNodes).toHaveCount(24);
  const words: string[] = [];
  for (let index = 0; index < 24; index += 1) {
    const text = await wordNodes.nth(index).innerText();
    words.push(text.replace(/^\d+\.\s*/, '').trim());
  }
  await page.getByRole('button', { name: 'Konfirmasi' }).click();
  for (const index of CONFIRM_INDICES) {
    await page.getByLabel(`Kata nomor ${index + 1}`).fill(words[index]);
  }
  await page.getByRole('button', { name: 'Konfirmasi' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Beranda' })).toBeVisible();
  return words;
}

export async function installFixture(page: Page, file: string): Promise<void> {
  await page.getByLabel('Author public key (hex)').fill(FIXTURES.authorPublicKey);
  await page.getByLabel('Pasang .mapp').setInputFiles(join(__dirname, 'fixtures', file));
  await expect(page.getByRole('heading', { name: 'Izin yang diminta' })).toBeVisible();
  await page.getByRole('button', { name: 'Izinkan' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Paket terpasang' })).toBeVisible();
}

test('first run creates a local identity fully offline', async ({ page }) => {
  const blocked = await blockExternal(page);
  const words = await completeFirstRun(page);
  expect(words).toHaveLength(24);
  expect(blocked).toEqual([]);

  // Identity survives a reload (OPFS + non-extractable wrapping key).
  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: 'Beranda' })).toBeVisible();

  // No auth remnants: nothing is written to localStorage.
  const storageKeys = await page.evaluate(() => Object.keys(localStorage));
  expect(storageKeys).toEqual([]);
});

test('signed .mapp installs offline and runs isolated in the sandbox', async ({ page }) => {
  const blocked = await blockExternal(page);
  await completeFirstRun(page);
  await installFixture(page, 'escape.mapp');
  expect(blocked).toEqual([]);

  await page.getByRole('link', { name: 'Jalankan' }).click();
  const frame = page.frameLocator('iframe[sandbox="allow-scripts"]');
  await expect(frame.getByText('Fixture siap')).toBeVisible({ timeout: 30_000 });
  const escapeText = await frame.getByText(/parent-/).innerText();
  expect(escapeText).toContain('parent-blocked');
  expect(escapeText).toContain('storage-blocked');
  expect(escapeText).toContain('cookie-blocked');
  expect(escapeText).toContain('eval-blocked');

  // The host page still owns its own document.
  await expect(page.getByRole('heading', { level: 1, name: 'org.reinvy.fixture' })).toBeVisible();
});

test('encrypted backup exports and restores with verified checksums', async ({ page }) => {
  await completeFirstRun(page);
  await installFixture(page, 'escape.mapp');
  await page.getByRole('link', { name: 'Pengaturan' }).click();
  await page.getByRole('link', { name: 'Backup terenkripsi' }).click();

  await page.getByLabel('Passphrase backup').fill('correct horse battery');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Ekspor .mapp-backup' }).click();
  const download = await downloadPromise;
  const backupPath = test.info().outputPath('backup.mapp-backup');
  await download.saveAs(backupPath);
  expect(backupPath).toContain('.mapp-backup');

  await page.getByLabel('Pilih berkas backup').setInputFiles(backupPath);
  await page.getByLabel(/Workspace tujuan sudah berisi data/).check();
  await page.getByRole('button', { name: 'Pulihkan backup' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Backup berhasil' })).toBeVisible({ timeout: 30_000 });
});

test('Phase 0 Dexie data migrates into Studio drafts', async ({ page }) => {
  await completeFirstRun(page);
  await page.evaluate(async () => {
    const request = indexedDB.open('MicroAppStudio', 6);
    await new Promise<void>((resolve, reject) => {
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('apps')) db.createObjectStore('apps', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('content')) db.createObjectStore('content', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('runHistory')) db.createObjectStore('runHistory', { keyPath: 'id' });
      };
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    const db = request.result;
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('apps', 'readwrite');
      tx.objectStore('apps').put({
        id: 'legacy-app-1',
        name: 'Kas lama',
        description: 'dari phase 0',
        prompt: 'kas',
        fields: [],
        logicNodes: [],
        layout: [],
        createdAt: 1,
        updatedAt: 2,
        version: 1,
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  });

  await page.getByRole('link', { name: 'Pengaturan' }).click();
  await page.getByRole('link', { name: 'Backup terenkripsi' }).click();
  await page.getByRole('button', { name: 'Jalankan migrasi' }).click();
  await expect(page.getByText('Draft dibuat')).toBeVisible({ timeout: 30_000 });
  const summary = await page.locator('section[aria-label="Migrasi Phase 0"] dl').innerText();
  expect(summary).toContain('App\n1');
  await page.goto('/studio');
  await expect(page.getByText('Kas lama')).toBeVisible();
});

test('a crashing app is isolated and the host stays responsive', async ({ page }) => {
  await completeFirstRun(page);
  await installFixture(page, 'crash.mapp');
  await page.getByRole('link', { name: 'Jalankan' }).click();

  await expect(page.getByRole('main').getByRole('alert')).toContainText('Aplikasi berhenti', { timeout: 30_000 });
  // Host remains interactive after the kill.
  await page.getByRole('link', { name: 'Kembali' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Beranda' })).toBeVisible();
});
