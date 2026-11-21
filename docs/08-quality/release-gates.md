---
id: QA-GATES
title: Gate Rilis
status: accepted
owner: qa
prd_refs: ["§9", "§12"]
---

# Gate Rilis

Dokumen ini menetapkan gate yang MUST dilewati sebelum perubahan masuk cabang utama dan sebelum build web dinyatakan siap dirilis. Gate bersifat biner: tidak ada "lulus dengan catatan" tanpa pengecualian tertulis yang disetujui menurut §6. Gate hanya berlaku untuk artefak web; produk tidak menghasilkan artefak platform lain.

## 1. Prinsip

1. **Gate adalah bukti, bukan niat.** Setiap gate menyebut perintah atau artefak yang dapat diperiksa ulang.
2. **Blokir berarti menghentikan merge atau deploy.** Gate advisory tidak menghentikan, tetapi wajib ditinjau dan dicatat.
3. **Lingkungan bersih.** Gate dijalankan pada checkout bersih dengan dependensi terpasang dari lockfile.
4. **Build produksi.** Build, E2E, aksesibilitas, dan budget dijalankan pada `npm run build`, bukan dev server.
5. **Tidak ada gate yang dilemahkan untuk membuat PR lulus.** Perbaiki kode, dokumen, atau test.
6. **Satu sumber angka.** Budget dan cakupan test merujuk [performance-budgets.md](performance-budgets.md) dan [test-strategy.md](test-strategy.md), bukan salinan baru.

## 2. Gate per Pull Request

| Gate | Perintah atau bukti | Blokir | Catatan |
|---|---|---|---|
| PR-01 Docs check | `node scripts/check-docs.mjs --strict` | Ya | Frontmatter, link, ID, matrix, reachability; 0 error dan 0 warning |
| PR-02 Catalog check | `node scripts/generate-catalog.mjs --check` | Ya | 120 komponen katalog tidak melenceng dari generated file |
| PR-03 Unit dan component | `npm test` | Ya | Vitest untuk `apps/studio-web`, `packages/runtime-web`, `packages/ui-kit` |
| PR-04 Typecheck | `npm run typecheck` | Ya | TypeScript strict; tidak ada error baru |
| PR-05 Lint | `npm run lint` | Ya | Aturan web-only, aksesibilitas statis, dan import boundary |
| PR-06 Build | `npm run build` | Ya | Build Next.js produksi berhasil |
| PR-07 E2E smoke | `npm run e2e` untuk alur yang tersentuh | Ya | Minimal first run, create, dan area yang berubah |
| PR-08 Axe | axe-core di dalam E2E | Ya | Tidak ada pelanggaran `serious` atau `critical` pada layar yang berubah |
| PR-09 Budget bundle | Laporan `next build` dibanding baseline | Ya untuk perubahan UI | Initial JS < 250 KB gzip; lihat [performance-budgets.md](performance-budgets.md) |
| PR-10 Spec-first | PR menyebut path spec dan ID requirement, atau alasan `docs-not-needed` | Ya | Perubahan perilaku tanpa spec ditolak |
| PR-11 Rust core | `cargo test` dan `cargo clippy --all-targets -- -D warnings` | Ya bila `packages/core-rust` berubah | Signature, digest, dan format `.mapp` |

PR kecil yang hanya mengubah dokumen tetap menjalankan PR-01. PR yang hanya mengubah fixture atau test tetap menjalankan PR-03 sampai PR-06 agar build tidak rusak.

## 3. Gate Rilis

| Gate | Perintah atau bukti | Blokir | Gagal bila |
|---|---|---|---|
| RG-01 Docs strict | `node scripts/check-docs.mjs --strict` | Ya | Ada error atau warning |
| RG-02 Catalog check | `node scripts/generate-catalog.mjs --check` | Ya | Jumlah, ID, atau nama komponen berubah tanpa pembaruan generator |
| RG-03 Unit dan component | `npm test` | Ya | Ada test gagal atau suite tidak lengkap |
| RG-04 Typecheck | `npm run typecheck` | Ya | Ada error TypeScript |
| RG-05 Lint | `npm run lint` | Ya | Ada error lint |
| RG-06 Build | `npm run build` | Ya | Build produksi gagal atau memakai dev mode |
| RG-07 E2E penuh | `npm run e2e` | Ya | Ada alur kritis gagal |
| RG-08 Axe penuh | axe pada 12 layar | Ya | Ada pelanggaran `serious` atau `critical` |
| RG-09 Budget performa | Lighthouse CI, `next build`, React Profiler, Playwright offline | Ya | LCP, INP, CLS, initial JS, builder interaction, atau offline start melewati budget |
| RG-10 Deploy smoke | `node scripts/verify-deploy.mjs` pada build yang dideploy | Ya | Route `/`, `/templates`, `/packages`, `/settings` tidak merespons 2xx/3xx |
| RG-11 Rust core | `cargo test` dan `cargo clippy` | Ya | Ada test gagal atau warning clippy |
| RG-12 Security suite | Test pada [security-test-plan.md](security-test-plan.md) | Ya | Ada temuan kritis atau tinggi yang belum diperbaiki |
| RG-13 Evidence | `npm run verify:web`, lalu periksa [baseline.md](evidence/baseline.md) | Ya | `result` bukan `pass`, atau evidence tidak menyebut commit rilis |
| RG-14 Status dokumen | [prd-compliance-matrix.md](../00-foundation/prd-compliance-matrix.md) dan [implementation-status.md](../00-foundation/implementation-status.md) diperbarui | Ya | Klaim `implemented` tanpa bukti, atau status bertentangan dengan evidence |

Gate rilis dijalankan pada commit yang sama dengan yang akan dideploy. Menjalankan gate pada commit lain tidak dihitung sebagai bukti.

## 4. Perintah Gate

```bash
npm ci
node scripts/check-docs.mjs --strict
node scripts/generate-catalog.mjs --check
npm test
npm run typecheck
npm run lint
npm run build
npm run e2e
cargo test --manifest-path packages/core-rust/Cargo.toml
cargo clippy --manifest-path packages/core-rust/Cargo.toml --all-targets -- -D warnings
npm run verify:web
DEPLOY_URL="$DEPLOY_URL" node scripts/verify-deploy.mjs
```

`npm run verify:web` menjalankan rangkaian wajib dan menulis evidence. `verify-deploy.mjs` memakai `DEPLOY_URL` dan memeriksa route shell dengan HEAD atau GET. Bila `DEPLOY_URL` tidak tersedia pada PR, RG-10 ditunda ke tahap deploy dan tetap wajib sebelum rilis dinyatakan selesai.

## 5. Gate Advisory

| Pemeriksaan | Alasan tidak memblokir | Tindakan |
|---|---|---|
| Tren Lighthouse antar-rilis | Variasi runner CI | Tinjau; regresi berulang menjadi blokir |
| Diff visual clay | Perubahan desain yang disengaja | Tinjau manusia; perbarui baseline dengan alasan |
| Tren coverage | Angka bukan tujuan itu sendiri | Investigasi penurunan besar tanpa alasan |
| Audit dependensi | Temuan mungkin tidak dapat dieksploitasi di browser | Catat, jadwalkan perbaikan, eskalasi bila kritis |
| Ukuran bundle per chunk | Chunk lazy tidak selalu menjadi masalah | Tinjau bila memengaruhi route awal |

Advisory yang gagal berulang pada area yang sama MUST diubah menjadi gate blokir melalui PR terpisah.

## 6. Pengecualian

- Pengecualian hanya berlaku untuk kegagalan lingkungan, bukan untuk kegagalan produk.
- Permintaan pengecualian ditulis di PR: gate, alasan, bukti kegagalan lingkungan, dan rencana verifikasi ulang.
- Persetujuan diberikan oleh maintainer menurut [governance.md](../10-contributing/governance.md); pengecualian berlaku maksimal untuk satu rilis.
- Gate keamanan, docs check, signature, dan kebocoran data tidak dapat dikecualikan.
- Pengecualian tanpa issue tindak lanjut dianggap tidak sah.

## 7. Rollback

Bila RG-10 gagal setelah deploy:

1. Kembalikan deployment ke build stabil sebelumnya.
2. Jalankan ulang `verify-deploy.mjs` pada URL yang di-rollback.
3. Catat insiden pada [incident-response.md](../09-operations/incident-response.md).
4. Jangan menaikkan status requirement yang terpengaruh sampai build baru lulus seluruh gate.
5. Simpan evidence rollback bersama evidence rilis.

Prosedur deploy dan rollback terperinci ada di [deployment.md](../09-operations/deployment.md).

## 8. Verifikasi

1. Jalankan perintah §4 pada commit rilis.
2. Pastikan setiap gate blokir berstatus lulus; gate advisory ditinjau dan dicatat.
3. Periksa [baseline.md](evidence/baseline.md) memuat commit yang sama, timestamp, status per perintah, dan `result: pass`.
4. Periksa [prd-compliance-matrix.md](../00-foundation/prd-compliance-matrix.md) tidak memuat status `implemented` tanpa bukti.
5. Arsipkan tautan build dan evidence pada catatan rilis.

Gate ini tidak menggantikan review manusia. Reviewer tetap memeriksa desain, keamanan, aksesibilitas, dan kesesuaian dengan [PRD-v3.0.md](../00-foundation/PRD-v3.0.md).
