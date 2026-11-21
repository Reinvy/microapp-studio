---
id: RULE-TEST
title: Rules Testing Web
status: accepted
owner: qa
prd_refs: ["§9", "§12"]
---

# Rules Testing Web

Aturan ini mengikat cara membuktikan bahwa perubahan benar. Piramida, alat, dan ambang bukti ditetapkan di [test-strategy.md](../08-quality/test-strategy.md); anggaran performa di [performance-budgets.md](../08-quality/performance-budgets.md). Tidak ada requirement yang boleh ditandai `implemented` tanpa test yang benar-benar berjalan.

## 1. Tujuan dan Ruang Lingkup

| Lapisan | Alat | Cakupan |
|---|---|---|
| Unit | Vitest | Logika murni, parser, migrasi, kriptografi wrapper. |
| Komponen | Vitest + Testing Library | State, keyboard, ARIA, token. |
| End-to-end | Playwright | 8 flow kritis di build lokal. |
| Aksesibilitas | axe | Layar dan komponen yang berubah. |
| Visual | Snapshot terkontrol | Komponen clay pada light/dark/high-contrast. |
| Keamanan | Skenario terpisah | Sandbox, CSP, signature, izin. |

Di luar cakupan: pengujian perangkat keras atau runtime di luar browser.

## 2. Prinsip

1. **Test mengikuti perilaku, bukan implementasi.** Assert terhadap hasil yang dilihat pengguna atau kontrak data.
2. **Cepat dan deterministik.** Tanpa jaringan nyata, tanpa waktu nyata, tanpa urutan acak.
3. **Satu bug, satu test regresi.** Perbaikan tanpa test regresi dianggap belum selesai.
4. **Bukti, bukan klaim.** Status requirement mengacu pada test yang dapat dijalankan ulang.

## 3. Aturan

| ID | Level | Aturan | Verifikasi |
|---|---|---|---|
| RULE-TEST-001 | MUST | Setiap perubahan perilaku menyertakan test pada lapisan terendah yang dapat membuktikannya; perbaikan bug menyertakan test regresi yang gagal sebelum perbaikan. | Review diff test |
| RULE-TEST-002 | MUST | Unit dan komponen memakai Vitest; test perilaku tidak boleh bergantung pada snapshot markup saja. | Review |
| RULE-TEST-003 | MUST | Alur create, edit, preview, install, backup, consent, crash recovery, dan migrasi memiliki smoke test Playwright. | `npm run e2e` |
| RULE-TEST-004 | MUST | Layar atau komponen yang berubah lulus axe tanpa pelanggaran `serious` atau `critical`. | Test axe |
| RULE-TEST-005 | MUST | Komponen clay memiliki regresi visual pada light, dark, dan high-contrast; perubahan snapshot memerlukan persetujuan reviewer desain. | Snapshot review |
| RULE-TEST-006 | MUST | Test memakai fake timer, clock yang diinjeksi, dan ID deterministik; tidak ada ketergantungan pada waktu nyata atau UUID acak. | Review, test berulang |
| RULE-TEST-007 | MUST | Dilarang `sleep` arbitrer atau retry untuk menutupi race. Tunggu kondisi, event, atau state yang eksplisit. | Lint test, review |
| RULE-TEST-008 | MUST | Test offline/PWA memverifikasi shell dan app terpasang dapat dibuka setelah reload tanpa jaringan, serta perilaku cache yang benar. | Test offline, NFR-REL-001 |
| RULE-TEST-009 | MUST | Test sandbox mencakup penolakan akses DOM host, pelanggaran CSP, panggilan bridge tanpa permission, dan fail-closed saat sandbox tidak tersedia. | Test keamanan |
| RULE-TEST-010 | MUST | Test package mencakup signature salah, digest berubah, manifest tidak valid, dan public key berbeda; semuanya harus ditolak. | Test package |
| RULE-TEST-011 | MUST | Coverage baris tidak turun dari baseline paket; kode baru pada modul kritis (kripto, migrasi, permission) memiliki coverage minimal 80%. | Laporan coverage |
| RULE-TEST-012 | MUST | Fixture memakai data sintetis; tidak ada kunci, token, passphrase, atau data pribadi nyata di test. | Secret scan |
| RULE-TEST-013 | MUST | Perubahan yang menyentuh render atau interaksi mengukur LCP, INP, dan CLS pada profil referensi dan mencatat hasilnya di PR. | Ukur di build produksi |
| RULE-TEST-014 | MUST | Test flaky dikarantina dengan issue, pemilik, dan tenggat; retry otomatis tidak boleh menjadi cara lulus. | Review status test |

## 4. Struktur Test

```ts
import { describe, expect, it, vi } from 'vitest';

describe('autosave builder', () => {
  it('menyimpan 500 ms setelah perubahan terakhir', async () => {
    vi.useFakeTimers();
    const save = vi.fn();
    const scheduler = createAutosave(save, 500);

    scheduler.schedule({ nodeId: 'n1' });
    scheduler.schedule({ nodeId: 'n1' });
    await vi.advanceTimersByTimeAsync(499);
    expect(save).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(save).toHaveBeenCalledTimes(1);
  });
});
```

Nama test menyebut perilaku dan kondisi, bukan nama fungsi internal. Satu `it` membuktikan satu klaim.

## 5. Anti-pola

| Anti-pola | Alasan |
|---|---|
| `await page.waitForTimeout(1000)` | Lambat dan tetap flaky. |
| Mock seluruh modul sehingga test tidak menyentuh kode nyata | Bukti palsu. |
| Menurunkan ambang coverage agar PR lulus | Menyembunyikan regresi. |
| Snapshot besar untuk seluruh halaman | Sulit ditinjau dan rapuh. |
| Test yang bergantung pada urutan eksekusi | Gagal acak saat dijalankan paralel. |

## 6. Verifikasi

| Langkah | Perintah | Lulus bila |
|---|---|---|
| Unit/komponen | `npm test` | Seluruh test lulus, tanpa flaky. |
| E2E | `npm run e2e` | 8 flow kritis lulus. |
| Aksesibilitas | axe pada layar berubah | Tanpa pelanggaran serius. |
| Bukti rilis | `npm run verify:web` | Status dicatat di [baseline.md](../08-quality/evidence/baseline.md). |

## 7. Pengecualian

Pengecualian pada RULE-TEST-003, RULE-TEST-004, atau RULE-TEST-009 memerlukan persetujuan reviewer `qa` dan `security`, serta tenggat perbaikan yang dicatat di PR. Tidak ada pengecualian untuk RULE-TEST-012.
