---
id: SKILL-RELEASE
title: Merilis Web
status: accepted
owner: ops
prd_refs: ["§10", "§9"]
name: release-web
description: "Merilis PWA web: verifikasi build Next.js, budget bundle, header, smoke deploy, dan rollback yang dapat dijalankan."
when_to_use: "Dipakai saat menaikkan versi, mempublikasikan build ke host, atau melakukan rollback rilis web."
required_docs: ["docs/08-quality/release-gates.md", "docs/08-quality/performance-budgets.md", "docs/09-operations/deployment.md", "docs/03-specs/nfr.md", "docs/08-quality/definition-of-done.md"]
---

# Merilis Web

## Kapan Digunakan

Dipakai ketika build kandidat siap dipublikasikan ke Vercel, Node host, atau static export, dan ketika rilis harus dibatalkan atau dikembalikan ke versi sebelumnya. Rilis hanya untuk PWA web; tidak ada artefak desktop, native, atau server terpisah.

Di luar cakupan: mengubah perilaku produk (gunakan skill modul terkait), menambah dependency rilis, dan menetapkan kebijakan versi (gunakan [governance.md](../../10-contributing/governance.md)).

## Prasyarat

- [release-gates.md](../../08-quality/release-gates.md) dibaca: gate PR dan gate fase yang berlaku.
- [performance-budgets.md](../../08-quality/performance-budgets.md) dibaca: LCP, INP, CLS, initial JS, dan interaksi builder.
- [deployment.md](../../09-operations/deployment.md) dibaca: target host, header, cache, dan prosedur rollback.
- [nfr.md](../../03-specs/nfr.md) dibaca: angka performa, aksesibilitas, dan reliabilitas yang mengikat.
- Cabang rilis bersih, seluruh perubahan sudah direview, dan tidak ada pekerjaan orang lain yang belum ter-commit.

## Input

| Input | Wajib | Contoh |
|---|---|---|
| Versi | ya | `1.4.0` |
| Target | ya | Vercel, Node host, atau static export |
| Build kandidat | ya | Commit SHA yang akan dirilis |
| Bukti gate | ya | Test, build, E2E, a11y, budget bundle |
| Rencana rollback | ya | Deploy sebelumnya atau commit sebelumnya |

## Prosedur

1. Bekukan kandidat: catat commit SHA dan pastikan tidak ada perubahan setelah verifikasi dimulai.
2. Jalankan seluruh gate lokal: docs check, generator katalog, test, typecheck, lint, dan build. Build menjalankan `build:sandbox`, `build:sqlite`, lalu workspace.
3. Periksa PWA: service worker terdaftar, manifest aplikasi valid, ikon tersedia, dan shell dapat dibuka offline setelah satu kunjungan.
4. Ukur budget: initial JS di bawah 250 KB gzip, LCP < 2.0 s, INP < 200 ms, CLS < 0.1, dan interaksi builder < 50 ms pada perangkat referensi. Catat angka pada PR rilis.
5. Verifikasi header produksi: CSP tanpa `unsafe-eval`, `Cross-Origin-Opener-Policy: same-origin`, `Cross-Origin-Embedder-Policy: require-corp`, dan cache yang tidak menyajikan HTML basi.
6. Deploy ke target dan tunggu build selesai. Jangan menaikkan traffic sebelum smoke test lulus.
7. Jalankan smoke test pada URL produksi: `/`, `/templates`, `/packages`, `/settings`, dan `/app/[appId]` dengan fixture. Periksa status 2xx/3xx dan tidak ada error konsol.
8. Uji alur kritis: first run tanpa jaringan, create dari template, preview di sandbox, impor `.mapp` bertanda tangan, dan restore backup.
9. Catat hasil pada [baseline evidence](../../08-quality/evidence/README.md) dan perbarui [implementation-status.md](../../00-foundation/implementation-status.md) hanya untuk kemampuan yang benar-benar terverifikasi.
10. Jika ada regresi, jalankan rollback: alihkan ke deployment sebelumnya atau redeploy commit terakhir yang lulus, lalu verifikasi smoke test dan invalidasi cache service worker.

## Verifikasi

```bash
npm run build
npm test
npm run typecheck
npm run lint
npm run e2e
node scripts/generate-catalog.mjs --check
node scripts/check-docs.mjs --strict
```

Setelah deploy, ulangi smoke test pada URL produksi dan periksa header dengan `curl -sI`. Rilis dinyatakan gagal bila salah satu gate berstatus merah atau header keamanan tidak sesuai.

## Kesalahan Umum

| Kesalahan | Perbaikan |
|---|---|
| Deploy tanpa mengukur ulang budget | Ukur dan catat sebelum dan sesudah rilis |
| Service worker menyajikan HTML lama | Naikkan versi cache dan invalidasi dengan benar |
| Rollback tanpa rencana | Catat deployment sebelumnya sebelum mulai |
| Menandai status `implemented` karena build lulus | Status mengikuti test perilaku, bukan build |
| Menonaktifkan header agar halaman jalan | Perbaiki sumber pelanggaran CSP |

## Definition of Done

- Seluruh gate lokal dan produksi hijau.
- Budget performa terukur dan tercatat.
- Header keamanan terverifikasi pada respons nyata.
- Smoke test alur kritis lulus.
- Rencana rollback tersedia dan diuji saat diperlukan.
