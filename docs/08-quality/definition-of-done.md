---
id: QA-DOD
title: Definisi Selesai
status: accepted
owner: qa
prd_refs: ["§9", "§12"]
---

# Definisi Selesai

Dokumen ini menetapkan kapan sebuah artefak dianggap selesai. "Selesai" berarti perilaku yang dijanjikan telah diimplementasikan, diuji, didokumentasikan, dan dibuktikan dengan evidence yang dapat dijalankan ulang. Tidak ada artefak yang selesai hanya karena kode sudah ditulis atau dokumen sudah ada.

## 1. Aturan Bukti

1. **Setiap klaim punya bukti.** Status `implemented` pada [prd-compliance-matrix.md](../00-foundation/prd-compliance-matrix.md) MUST didukung minimal satu test yang lulus dan tercatat di [baseline.md](evidence/baseline.md).
2. **Bukti spesifik.** Nama test, perintah, dan hasilnya disebutkan. "Sudah dicoba" bukan bukti.
3. **Bukti segar.** Bukti berlaku untuk commit yang dinilai. Perubahan setelah test dijalankan membatalkan bukti untuk area yang berubah.
4. **Bukti deterministik.** Test yang lulus hanya dengan retry berulang tidak dihitung; penyebab flakiness harus diperbaiki.
5. **Bukti aman.** Evidence tidak memuat secret, token AI, data pribadi, atau isi vault. Log yang diekspor MUST teredaksi.
6. **Tidak ada klaim masa depan.** Dokumen dan evidence tidak boleh menyatakan fitur target sebagai sudah ada. Gunakan `missing` atau `partial` sampai test membuktikan sebaliknya.
7. **Satu artefak, satu pemilik.** Pemilik artefak bertanggung jawab memastikan checklist terpenuhi sebelum meminta review.

## 2. Spesifikasi

Spec selesai bila:

- [ ] Memuat section `## 1. Tujuan`, `## 3. Requirement`, `## 7. Acceptance Criteria`, dan `## 8. Verifikasi`.
- [ ] Setiap requirement memiliki ID unik, level, pernyataan yang dapat diuji, dan acceptance yang terukur.
- [ ] Tidak ada ID yang tidak terdefinisi; rujukan requirement lain valid.
- [ ] Setiap flow terkait disebut, dan setiap error code yang relevan terhubung ke [error-codes.md](../03-specs/error-codes.md).
- [ ] Setiap requirement memiliki baris pada [prd-compliance-matrix.md](../00-foundation/prd-compliance-matrix.md).
- [ ] `node scripts/check-docs.mjs --strict` lulus untuk file tersebut.
- [ ] Tidak ada klaim platform atau kemampuan yang tidak ada di produk web-only.

Bukti: spec tertaut dari [docs/README.md](../README.md), matrix memuat seluruh ID, dan checker lulus.

## 3. Flow

Flow selesai bila:

- [ ] Memuat section `## Alur Utama`, `## Cabang Gagal`, `## Acceptance Criteria`, dan `## Verifikasi`.
- [ ] Setiap langkah merujuk minimal satu requirement FR atau SEC.
- [ ] Jalur gagal menyebut kode error yang ditampilkan dan keadaan data setelah gagal.
- [ ] Acceptance dapat diuji dan tidak memuat ambiguitas seperti "cepat" tanpa angka.
- [ ] Ada E2E atau test integrasi yang mencakup jalur utama dan minimal satu cabang gagal.
- [ ] Tidak ada langkah yang membutuhkan akun, server, atau konfigurasi awal yang tidak ada.

Bukti: nama test E2E pada [baseline.md](evidence/baseline.md) dan tautan flow pada spec terkait.

## 4. ADR

ADR selesai bila:

- [ ] Memuat `## Konteks`, `## Keputusan`, dan `## Konsekuensi`.
- [ ] Menyebut alternatif yang ditolak dan alasan penolakannya.
- [ ] Status `accepted` dan terdaftar di [ADR README](../01-architecture/adr/README.md).
- [ ] Tidak bertentangan dengan [PRD-v3.0.md](../00-foundation/PRD-v3.0.md) atau spec aktif.
- [ ] Menyebut dampak pada implementasi, keamanan, dan migrasi bila ada.
- [ ] Ditinjau oleh architecture dan, bila menyentuh keamanan, security.

Bukti: ADR tertaut dari indeks dan dirujuk oleh spec atau kode yang menerapkannya.

## 5. Komponen UI

Komponen selesai bila:

- [ ] Memiliki entri katalog `MADS-<CAT>-<NN>` yang tepat di [component-catalog.md](../02-design/component-catalog.md); ID dan nama tidak berubah tanpa pembaruan generator.
- [ ] Untuk 48 komponen core: anatomi, props/varian, state, token, keyboard, ARIA, dan contoh copy lengkap.
- [ ] Hanya memakai token `--mads-*`; tidak ada `box-shadow`, radius, warna, atau durasi hardcoded.
- [ ] State `default`, `hover`, `focus-visible`, `pressed`, `disabled`, `loading`, dan `error` diuji sesuai relevansi.
- [ ] Lolos axe tanpa pelanggaran `serious` atau `critical`.
- [ ] Lolos visual regression pada tema light, dark, dan high-contrast.
- [ ] `prefers-reduced-motion` menonaktifkan transform dan animasi.
- [ ] `node scripts/generate-catalog.mjs --check` lulus.

Bukti: component test, snapshot visual yang ditinjau, dan laporan axe.

## 6. Fitur

Fitur selesai bila seluruh poin berikut terpenuhi:

- [ ] Acceptance pada spec terpenuhi dan dapat ditunjukkan.
- [ ] Unit atau component test mencakup logika baru.
- [ ] E2E mencakup alur pengguna yang berubah, termasuk jalur gagal.
- [ ] Aksesibilitas: keyboard-only, fokus, label, dan kontras sesuai [accessibility.md](../02-design/accessibility.md).
- [ ] Offline: perilaku tanpa jaringan diuji bila fitur menyentuh shell, data, atau runtime.
- [ ] i18n: string baru ada di `id-ID` dan `en-US`; tidak ada teks hardcoded di komponen.
- [ ] Keamanan: izin, validasi input, dan penanganan error mengikuti [security-test-plan.md](security-test-plan.md) bila relevan.
- [ ] Tidak menambah telemetry, request eksternal, atau dependensi tanpa persetujuan.
- [ ] Dokumentasi, matrix, dan evidence diperbarui pada PR yang sama.
- [ ] Status requirement diubah ke `implemented` hanya setelah bukti tersedia; jika belum, tetap `partial` atau `missing`.

Bukti: daftar test yang lulus, hasil axe, hasil offline, dan baris matrix yang diperbarui.

## 7. Dokumen

Dokumen selesai bila:

- [ ] Frontmatter memuat `id`, `title`, `status`, `owner`, dan `prd_refs` yang valid.
- [ ] H1 sama dengan `title` dan tidak bernomor.
- [ ] Semua tautan relatif menunjuk file yang ada; tidak ada tautan ke dokumen yang dihapus.
- [ ] Tidak ada placeholder, bagian kosong, atau janji implementasi tanpa bukti.
- [ ] Istilah dan angka konsisten dengan spec serta [implementation-status.md](../00-foundation/implementation-status.md).
- [ ] Dapat dijangkau dari [docs/README.md](../README.md).
- [ ] `node scripts/check-docs.mjs --strict` lulus tanpa warning.

Bukti: keluaran checker dan daftar file yang berubah.

## 8. Rilis

Rilis selesai bila:

- [ ] Seluruh gate blokir pada [release-gates.md](release-gates.md) lulus pada commit yang dideploy.
- [ ] [baseline.md](evidence/baseline.md) memuat `result: pass`, commit, timestamp, dan status setiap perintah.
- [ ] Deploy smoke lulus untuk `/`, `/templates`, `/packages`, dan `/settings`.
- [ ] Budget performa dan aksesibilitas terpenuhi pada build produksi.
- [ ] Tidak ada temuan keamanan kritis atau tinggi yang terbuka.
- [ ] Matrix dan implementation status sesuai kenyataan; tidak ada klaim yang belum diuji.
- [ ] Rencana rollback tersedia dan telah diuji minimal sekali pada lingkungan staging.
- [ ] Catatan rilis menyebut perubahan, batasan, dan requirement yang belum selesai.

Bukti: tautan evidence, hasil deploy smoke, dan catatan rilis.

## 9. Ringkasan Bukti Minimum

| Artefak | Bukti minimum |
|---|---|
| Spec | Checker lulus, matrix memuat seluruh ID |
| Flow | E2E jalur utama dan satu cabang gagal |
| ADR | Entri indeks dan rujukan dari spec/kode |
| Komponen | Component test, axe, visual regression, catalog check |
| Fitur | Unit/component, E2E, a11y, offline, i18n, matrix |
| Dokumen | Checker lulus tanpa warning dan tautan valid |
| Rilis | Seluruh gate blokir, evidence `pass`, deploy smoke |

Jika salah satu bukti tidak ada, artefak belum selesai. Menurunkan cakupan hanya boleh dilakukan dengan persetujuan eksplisit pada issue atau PR, bukan dengan menghapus checklist.
