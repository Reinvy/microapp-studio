---
id: QA-TEST
title: Strategi Test
status: accepted
owner: qa
prd_refs: ["§9", "§12"]
---

# Strategi Test

Dokumen ini menetapkan strategi pengujian untuk produk web-only MicroApp Studio: satu PWA Next.js yang berjalan di browser desktop, tablet, dan mobile. Test diturunkan dari kolom `Acceptance` pada requirement di [03-specs](../03-specs/nfr.md), bukan dari detail implementasi. Test yang tidak memetakan ke FR, NFR, atau SEC tidak menambah keyakinan dan SHOULD dihapus.

## 1. Tujuan dan Prinsip

1. **Acceptance adalah kontrak.** Setiap test menyebut requirement atau flow yang dibuktikannya. Test tanpa rujukan tidak dihitung sebagai bukti pada [prd-compliance-matrix.md](../00-foundation/prd-compliance-matrix.md).
2. **Deterministik.** Test MUST NOT bergantung pada waktu nyata, jaringan publik, urutan eksekusi paralel, atau data pengguna nyata. Waktu memakai fake timer, randomness memakai seed yang dicatat, dan locale dipatok.
3. **Offline adalah mode utama.** Shell dan micro-app terpasang diuji tanpa jaringan. Test yang memerlukan jaringan MUST memakai server lokal atau mock dan diberi tag `network-mock`.
4. **Fail closed.** Bila sandbox, signature, atau izin tidak tersedia, test MUST membuktikan runtime berhenti, bukan jatuh ke mode tidak aman.
5. **Piramida, bukan es krim.** Mayoritas cakupan ada di unit dan component test; E2E hanya untuk alur yang tidak dapat dibuktikan lebih murah.
6. **Satu sumber fixture.** Fixture manifest, arsip `.mapp`, database lama, dan vektor kriptografi dipakai bersama lintas paket agar tidak ada dua definisi kebenaran.
7. **Baseline bukan target.** Angka pada §3 adalah fakta saat refactor dokumen, bukan janji rilis. Angka tersebut MUST diverifikasi ulang sebelum dipakai sebagai bukti.

## 2. Piramida Test Web

| Lapisan | Cakupan | Alat | Gate |
|---|---|---|---|
| Unit | Fungsi murni, reducer, parser, validator, kriptografi, util token | Vitest | Setiap PR |
| Component | Komponen React, state, keyboard, ARIA, token clay | Vitest + Testing Library | Setiap PR UI |
| Contract | Manifest v2, MUIP, bridge, schema backup, index statis | JSON Schema validator + test konsumen | Setiap PR kontrak |
| Integration | SQLite WASM/OPFS di worker, migrasi, import/export, WASM core | Vitest environment worker + `cargo test` | Setiap PR data/runtime |
| E2E | First run, create, edit/preview, share/install, backup, consent, crash, migrasi | Playwright | Nightly dan release |
| Visual | Regresi visual clay pada komponen dan layar | Playwright screenshot | Setiap PR UI |
| A11y | Keyboard, kontras, focus, reduced motion, ARIA | axe-core + audit manual | Setiap PR UI dan release |
| Offline/PWA | Service worker, cache, reload offline, update | Playwright context offline | Setiap PR shell/runtime |
| Security | Escape sandbox, bypass izin, signature, XSS/CSP, exfiltration | Lihat [security-test-plan.md](security-test-plan.md) | Setiap PR keamanan dan release |
| Performance | LCP, INP, CLS, ukuran JS, interaksi builder | Lihat [performance-budgets.md](performance-budgets.md) | Nightly dan release |

## 3. Baseline Test Saat Ini

Angka berikut adalah kondisi nyata saat refactor dokumen dan MUST diverifikasi ulang dengan perintah pada kolom terakhir. Tidak ada angka yang boleh dinaikkan tanpa menjalankan suite.

| Area | Lokasi | Baseline | Perintah |
|---|---|---|---|
| Unit/component aplikasi | `apps/studio-web` | 15 file, 153 test | `npm test` |
| Runtime sandbox | `packages/runtime-web` | ±7 file, 69 test | `npm test` |
| UI kit | `packages/ui-kit` | ±1 file, 33 test | `npm test` |
| WASM core | `packages/core-rust` | 53 test | `cargo test --manifest-path packages/core-rust/Cargo.toml` |
| E2E web | `e2e` | ±5 skenario | `npm run e2e` |

Baseline ini tidak membuktikan fitur target. Builder visual, galeri template, Magic Create, per-app database saat runtime, dan UI clay belum tercakup sampai test-nya ditulis.

## 4. Unit dan Component

- Framework: Vitest. Test aplikasi berada di `apps/studio-web`, test runtime di `packages/runtime-web`, test komponen di `packages/ui-kit`.
- Environment: `jsdom` atau `happy-dom` untuk komponen; worker untuk modul yang memang berjalan di worker.
- Larangan: `fetch`, `XMLHttpRequest`, `WebSocket`, dan `EventSource` asli. Semua I/O dimock; unit test yang membuka jaringan dianggap gagal.
- Waktu: `vi.useFakeTimers()` untuk debounce autosave, watchdog, toast, dan retry. Test MUST memajukan waktu secara eksplisit, bukan menunggu nyata.
- Randomness: `crypto.randomUUID` dan generator ID dimock atau diberi seed; snapshot tidak memuat UUID acak.
- Nama test menyebut requirement atau perilaku, misalnya `FR-STUDIO-010 undo menghapus langkah terakhir`. Test tanpa rujukan tidak dihitung sebagai bukti.
- Component test memeriksa state `default`, `hover`, `focus-visible`, `pressed`, `disabled`, `loading`, dan `error` sesuai [component-catalog.md](../02-design/component-catalog.md), serta memastikan tidak ada nilai visual hardcoded di luar token `--mads-*`.
- Snapshot DOM tidak dipakai sebagai satu-satunya bukti; assertion perilaku dan aksesibilitas lebih diutamakan.

## 5. Contract dan Integration

- **Manifest dan package.** Fixture `microapp.manifest.json` divalidasi terhadap schema di [manifest.md](../03-specs/manifest.md). Kasus wajib: field hilang, versi tidak didukung, permission tidak dikenal, signature kosong, dan hash tidak cocok.
- **MUIP.** Setiap node di [ui-protocol.md](../03-specs/ui-protocol.md) diuji dengan props valid dan tidak valid. Renderer MUST menolak HTML, CSS, atau JavaScript arbitrer.
- **Bridge.** Setiap method di [host-bridge.md](../03-specs/host-bridge.md) diuji untuk parameter, timeout, rate limit, dan penolakan tanpa grant.
- **Data.** Test integrasi membuka SQLite WASM melalui worker dengan OPFS tiruan, menjalankan migrasi 001/002, memeriksa snapshot sebelum migrasi, FTS5, serta isolasi database antar app. Data uji tidak boleh menyentuh OPFS pengguna nyata.
- **WASM core.** `cargo test` mencakup signature, digest, format `.mapp`, dan pemrosesan manifest. `cargo clippy --all-targets -- -D warnings` adalah gate terpisah.
- **Backup.** Fixture `.mapp-backup` mencakup passphrase benar/salah, checksum rusak, section terpotong, dan header salah.

## 6. E2E Playwright

E2E berada di `e2e` dan menjalankan build produksi terhadap origin lokal. Setiap test memakai konteks browser bersih, storage terisolasi, dan tidak membuka host eksternal.

Alur wajib:

| Flow | Bukti |
|---|---|
| [01-first-run.md](../04-flows/01-first-run.md) | Identitas otomatis, Home tampil tanpa jaringan, tidak ada mnemonic sebelum Home, create ≤ 3 klik |
| [02-create-app.md](../04-flows/02-create-app.md) | Tiga jalur create berakhir di builder dengan draft tersimpan |
| [04-share-install.md](../04-flows/04-share-install.md) | Ekspor `.mapp`, verifikasi, permission preview, install |
| [05-backup-recovery.md](../04-flows/05-backup-recovery.md) | Backup terenkripsi, restore gabung/ganti, passphrase salah ditolak |
| [06-permission-consent.md](../04-flows/06-permission-consent.md) | Consent JIT, allow once/always/deny, revoke berlaku langsung |
| [07-crash-recovery.md](../04-flows/07-crash-recovery.md) | Watchdog, boundary, reload, ekspor data, draft aman |

Aturan E2E:

- Test MUST memblokir semua request eksternal dengan `page.route` dan gagal bila ada request tak terduga.
- Test offline memakai `context.setOffline(true)` setelah kunjungan pertama; shell dan app terpasang harus tetap terbuka.
- Test tidak boleh bergantung pada urutan file. Setiap test membuat workspace dan data sendiri.
- Timeout didefinisikan eksplisit; tidak ada `waitForTimeout` sebagai sinkronisasi. Gunakan assertion yang menunggu kondisi.
- Screenshot atau trace disimpan sebagai artefak CI saat gagal, bukan sebagai bukti kelulusan.

## 7. Visual Regression Clay

- Snapshot diambil untuk 48 komponen core di [component-catalog.md](../02-design/component-catalog.md), pada tema light, dark, dan high-contrast.
- State yang diuji: default, hover, focus-visible, pressed, disabled, loading, dan error. State hover/pressed dipicu lewat kelas uji, bukan gerakan mouse nyata.
- Animasi dimatikan lewat `prefers-reduced-motion: reduce` sebelum snapshot; snapshot dengan animasi berjalan dianggap tidak stabil.
- Perbedaan visual MUST ditinjau manusia. Perubahan baseline hanya boleh disertai alasan desain dan pembaruan [DESIGN.md](../../DESIGN.md) bila nilainya berubah.
- Snapshot tidak boleh menyertakan data dinamis seperti waktu, ID, atau nama pengguna.

## 8. Aksesibilitas

- axe-core dijalankan pada 12 layar di [screen-specs.md](../02-design/screen-specs.md) dan pada komponen core. Pelanggaran level `serious` atau `critical` memblokir.
- Keyboard-only: setiap alur inti diselesaikan tanpa mouse; fokus terlihat, urutan logis, `Esc` menutup lapisan teratas, dan fokus kembali ke pemicu.
- Kontras dihitung dari token pada [design-system.md](../02-design/design-system.md); kombinasi teks kecil dengan `muted` di atas `bg` diuji sebagai pelanggaran.
- `prefers-reduced-motion: reduce` disimulasikan di Playwright; durasi transisi dan transform MUST menjadi nol.
- Target sentuh diperiksa minimal 44×44 px pada viewport mobile.
- Pemeriksaan manual screen reader dilakukan untuk alur first run, create, consent, dan crash recovery sebelum rilis.

## 9. Offline dan PWA

- Setelah satu kunjungan, service worker MUST menyajikan shell dan aset statis tanpa jaringan.
- Test memeriksa: reload offline, navigasi ke `/settings`, membuka app terpasang, dan pesan `offline` yang benar.
- Update service worker diuji dengan dua build berbeda; pengguna MUST mendapat prompt update, bukan white screen.
- Simulasi storage penuh dan eviction memastikan UI menampilkan peringatan serta jalur ekspor, bukan kehilangan data diam-diam.
- Test offline tidak boleh lulus dengan fallback ke jaringan; request eksternal harus gagal.

## 10. Keamanan Paket

Suite keamanan mengikuti [security-test-plan.md](security-test-plan.md). Minimum yang berjalan di CI setiap PR yang menyentuh sandbox, bridge, package, atau kriptografi:

- escape iframe dan akses DOM induk;
- pemanggilan bridge tanpa grant;
- signature dan digest `.mapp` yang dimodifikasi;
- zip traversal dan entri duplikat;
- XSS melalui props MUIP dan pelanggaran CSP;
- pembacaan storage lintas app;
- kebocoran BYOK ke log atau jaringan;
- perubahan audit chain.

## 11. Fixture, Determinisme, dan Isolasi

- Fixture bersama berada di `e2e/fixtures` dan `packages/*/test/fixtures`. Fixture package ditandatangani dengan kunci uji yang tidak pernah dipakai produksi.
- Tidak ada secret nyata, token AI nyata, atau data pribadi di fixture. Kunci uji diberi label jelas dan tidak dapat dipakai untuk menandatangani rilis.
- Database uji dibuat per test dan dihapus setelahnya. Test paralel memakai workspace dan port terpisah.
- Seed, zona waktu, dan locale dipatok. Test yang gagal karena waktu nyata harus diperbaiki, bukan di-retry sampai lulus.
- Retry maksimal satu kali hanya untuk test E2E yang bergantung pada browser; retry tidak boleh menutupi kegagalan deterministik.

## 12. Perintah Verifikasi

| Perintah | Cakupan | Wajib |
|---|---|---|
| `node scripts/check-docs.mjs --strict` | Frontmatter, link, ID, matrix, reachability | Ya |
| `node scripts/generate-catalog.mjs --check` | Katalog 120 komponen tidak melenceng | Ya |
| `npm test` | Unit dan component Vitest | Ya |
| `npm run typecheck` | TypeScript strict | Ya |
| `npm run lint` | Aturan web-only dan aksesibilitas statis | Ya |
| `npm run build` | Build Next.js dan budget dasar | Ya |
| `cargo test --manifest-path packages/core-rust/Cargo.toml` | WASM core | Ya |
| `cargo clippy --manifest-path packages/core-rust/Cargo.toml --all-targets -- -D warnings` | Lint Rust | Ya |
| `npm run e2e` | Alur kritis Playwright | Ya saat rilis |
| `npm run verify:web` | Seluruh rangkaian dan penulisan evidence | Ya saat rilis |

Hasil setiap perintah dicatat pada [baseline.md](evidence/baseline.md) melalui `npm run verify:web`. Gate yang memakai perintah ini didefinisikan di [release-gates.md](release-gates.md).

## 13. Hubungan dengan Dokumen Lain

- Requirement dan angka NFR: [nfr.md](../03-specs/nfr.md).
- Aturan implementasi test: [testing.md](../07-rules/testing.md).
- Bukti dan status: [evidence/README.md](evidence/README.md) dan [prd-compliance-matrix.md](../00-foundation/prd-compliance-matrix.md).
- Alur kerja kontribusi: [workflow.md](../05-agents/workflow.md).
