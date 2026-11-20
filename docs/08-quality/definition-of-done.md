---
id: QA-DOD
title: Definition of Done
status: accepted
owner: qa
prd_refs: ["§7.2"]
---

# Definition of Done

Dokumen ini menetapkan syarat minimum agar pekerjaan boleh disebut selesai. "Selesai" berarti perilaku yang diminta telah diimplementasikan, acceptance criteria terbukti, dokumentasi selaras, dan bukti verifikasi dapat diperiksa oleh orang lain. Kode yang berjalan tetapi tidak memenuhi dokumen adalah bug, bukan pekerjaan selesai.

## 1. Tujuan dan Prinsip

1. **Tidak ada done tanpa acceptance.** Setiap pekerjaan MUST merujuk minimal satu requirement atau acceptance criterion; pekerjaan yang tidak dapat dirujuk MUST ditolak atau didahului spec.
2. **Tidak ada done tanpa verifikasi.** Klaim "sudah diuji" MUST disertai perintah dan hasil. Test yang tidak dijalankan bukan bukti.
3. **Dokumen lebih dulu.** Perubahan perilaku MUST mengubah spec/flow/acceptance sebelum kode.
4. **Bersih, bukan ditambal.** Tidak ada placeholder pekerjaan tertunda, mock produksi, fallback tidak aman, atau kode mati yang ditinggalkan.
5. **Dapat di-rollback.** Perubahan yang berisiko MUST memiliki rencana rollback yang diuji.

## 2. DoD Global

Berlaku untuk setiap PR, terlepas dari jenis artefak:

- [ ] Spec/flow terkait diperbarui dan menyebut ID requirement yang dipenuhi.
- [ ] Acceptance criteria memiliki test otomatis atau prosedur verifikasi manual yang tercatat.
- [ ] `node scripts/check-docs.mjs --strict` hijau.
- [ ] Typecheck, lint, dan test untuk area yang berubah hijau.
- [ ] Tidak ada string hardcoded pada UI; kunci `id-ID` dan `en-US` lengkap.
- [ ] Tidak ada secret, token, kunci, atau data pengguna nyata di kode, test, log, atau fixture.
- [ ] Tidak ada `eval`, `new Function`, `innerHTML` tanpa sanitasi, atau akses host langsung dari sandbox.
- [ ] Kode error baru terdaftar di [03-specs/error-codes.md](../03-specs/error-codes.md) dan dipakai di spec/flow.
- [ ] Perubahan UI memenuhi keyboard, screen reader, kontras, dan reduced motion.
- [ ] Perubahan kontrak (manifest, bridge, sync, permission, crypto, registry) melalui RFC.
- [ ] Dokumentasi tidak mengklaim fitur yang belum ada; status implementasi memakai `missing`/`partial`/`implemented` secara jujur.
- [ ] PR menyebut `Spec:` atau alasan `docs-not-needed`; reviewer menyetujui.
- [ ] Rencana rollback ada untuk perubahan yang menyentuh data, migrasi, atau rilis.

## 3. DoD per Artefak

### 3.1 Spec

- [ ] Frontmatter `id`, `title`, `status`, `owner`, `prd_refs` valid dan unik.
- [ ] H1 sama dengan `title`; bahasa Indonesia; istilah kanonik konsisten.
- [ ] Bagian wajib lengkap: tujuan, aktor, requirement, model data/state, error, keamanan, acceptance, verifikasi, referensi.
- [ ] Setiap requirement memakai level MUST/SHOULD/MAY dan memiliki minimal satu acceptance criterion.
- [ ] Setiap requirement memiliki baris di [matriks kepatuhan](../00-foundation/prd-compliance-matrix.md).
- [ ] Tidak ada requirement yatim, ID duplikat, atau referensi ke ID yang tidak terdefinisi.
- [ ] Spec mencerminkan ADR `accepted`; bila berbeda, ADR menang dan spec direvisi.

### 3.2 Kode

- [ ] Mengikuti aturan bahasa terkait di [07-rules](../07-rules/typescript.md) setelah dokumen tersebut tersedia.
- [ ] Typecheck ketat dan lint bersih; tidak ada `any` implisit atau suppression tanpa alasan.
- [ ] Unit test mencakup jalur sukses, jalur gagal, batas input, dan error code terkait.
- [ ] Contract test diperbarui bila schema/envelope berubah.
- [ ] Log tidak memuat PII, token, kunci, atau path absolut; error memakai kode terdaftar.
- [ ] Sumber daya (file, koneksi, isolate, Worker) ditutup pada semua jalur, termasuk error.
- [ ] Perubahan performa diverifikasi terhadap [performance-budgets.md](performance-budgets.md).
- [ ] Tidak ada dependency baru tanpa review lisensi, keamanan, dan lockfile.

### 3.3 Test

- [ ] Test deterministik: seed, fake clock, tanpa jaringan publik.
- [ ] Test memetakan ke acceptance criterion, bukan hanya ke fungsi internal.
- [ ] Ada test negatif untuk keamanan, permission, signature, dan input tidak valid.
- [ ] Fixture baru disimpan di repositori dengan checksum bila biner.
- [ ] Tidak ada test flaky; bila ditemukan, dikarantina maksimal 24 jam dengan issue.
- [ ] Fuzz/mutation dijalankan untuk modul crypto dan sandbox yang berubah.

### 3.4 Dokumentasi

- [ ] Link relatif valid; tidak ada anchor mati.
- [ ] Tidak ada penanda placeholder atau teks contoh yang belum diganti.
- [ ] Status `implemented` hanya dipakai setelah verifikasi nyata di `## Verifikasi`.
- [ ] Perubahan perilaku tercermin di spec, flow, dan matriks secara konsisten.
- [ ] Istilah baru ditambahkan ke [glossary](../00-foundation/glossary.md).
- [ ] Dokumen yang saling bergantung tidak saling bertentangan; sumber kebenaran dirujuk, bukan diduplikasi.

### 3.5 Keamanan

- [ ] Risiko terkait di [threat model](../01-architecture/threat-model.md) memiliki suite dan test regresi.
- [ ] Tidak ada temuan critical/high terbuka tanpa pengecualian tertulis.
- [ ] Permission baru memiliki ID, risk tier, consent copy, audit event, dan test grant/revoke.
- [ ] Input tidak dipercaya divalidasi pada boundary; output di-escape sesuai konteks.
- [ ] Fail closed: isolasi/verifikasi yang gagal menghentikan operasi, bukan menurunkan keamanan.
- [ ] Secret tidak pernah ditulis ke disk, log, atau crash report.

### 3.6 Desain

- [ ] Memakai token MADS; tidak ada warna/ukuran hardcoded.
- [ ] State loading, empty, error, offline, dan permission tercakup.
- [ ] Komponen yang dipakai tercatat di katalog 120 dengan anatomi, state, token, dan a11y.
- [ ] Kontras, target sentuh, fokus, dan keyboard terverifikasi.
- [ ] Copy mengikuti formula error dan voice/tone; tidak ada string hardcoded.
- [ ] Dark, light, high-contrast, dan reduced motion diuji.

### 3.7 Operasi

- [ ] Runbook instalasi/upgrade/rollback diperbarui bila perintah atau konfigurasi berubah.
- [ ] Backup dan restore diuji, termasuk verifikasi checksum dan jumlah record.
- [ ] Observability tidak mengaktifkan telemetry secara default; log teredaksi.
- [ ] Health/readiness membedakan dependency dan melaporkan degraded dengan benar.
- [ ] Resource budget (1 vCPU/512 MB) diverifikasi untuk perubahan server.
- [ ] Prosedur insiden dan rotasi kunci tersedia untuk perubahan yang menyentuh kunci atau signing.

## 4. Bukti dan Verifikasi

| Jenis pekerjaan | Bukti minimum |
|---|---|
| Perubahan perilaku | Test otomatis + hasil perintah + acceptance yang dipetakan |
| Perubahan UI | Screenshot/test snapshot + laporan axe + keyboard path |
| Perubahan kontrak | Schema test + fixture valid/invalid + RFC |
| Perubahan data | Test migrasi forward/rollback + fixture versi lama |
| Perubahan keamanan | Suite keamanan terkait + test negatif |
| Perubahan performa | Sebelum/sesudah pada perangkat referensi |
| Perubahan rilis | Checklist [release-gates.md](release-gates.md) §5 |

Bukti MUST disimpan di tempat yang dapat diakses reviewer (CI, PR, catatan rilis). Klaim lisan atau tautan ke percakapan pribadi bukan bukti.

## 5. Larangan

Pekerjaan MUST NOT disebut selesai bila:

- Acceptance criterion belum dijalankan atau hanya "diperkirakan".
- Test dinonaktifkan, di-skip, atau dilonggarkan agar lulus.
- Fitur PRD diklaim sudah ada padahal statusnya `missing`/`partial`.
- Perubahan perilaku tidak memiliki spec/flow.
- Ada migrasi destruktif tanpa export dan rollback.
- Ada placeholder pekerjaan tertunda, mock produksi, atau fallback tidak aman yang tertinggal.
- Pengecualian gate keamanan tidak tercatat dan tidak disetujui.
- Dokumentasi, matriks, atau status implementasi tidak diperbarui.

## 6. Referensi

- [00-foundation/sdd-workflow.md](../00-foundation/sdd-workflow.md), [00-foundation/prd-compliance-matrix.md](../00-foundation/prd-compliance-matrix.md)
- [03-specs/nfr.md](../03-specs/nfr.md), [03-specs/error-codes.md](../03-specs/error-codes.md)
- [test-strategy.md](test-strategy.md), [performance-budgets.md](performance-budgets.md), [security-test-plan.md](security-test-plan.md), [release-gates.md](release-gates.md)
- [01-architecture/threat-model.md](../01-architecture/threat-model.md)
