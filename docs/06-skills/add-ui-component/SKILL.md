---
id: SKILL-ADD-UI-COMPONENT
title: Menambah Komponen MADS
status: accepted
owner: dx
prd_refs: ["§3 Modul 2"]
name: add-ui-component
description: "Mengimplementasikan komponen MADS pada katalog dan di kedua renderer, web serta Flutter, dengan state dan aksesibilitas yang lengkap."
when_to_use: "Dipakai saat menambah komponen baru ke katalog MADS atau melengkapi komponen yang sudah terdaftar dengan varian, state, dan dukungan Flutter."
required_docs: ["docs/02-design/design-system.md", "docs/02-design/component-catalog.md", "docs/02-design/accessibility.md", "docs/03-specs/ui-protocol.md", "docs/03-specs/02-studio-ide.md", "docs/07-rules/ui-ux.md"]
---

# Menambah Komponen MADS

## Kapan Digunakan

Dipakai ketika Studio atau Host membutuhkan komponen antarmuka baru, atau ketika komponen yang sudah ada di katalog MADS belum memiliki padanan Flutter, state wajib, atau perilaku aksesibilitas. Katalog MADS dikunci pada 120 komponen; pekerjaan ini utamanya melengkapi dan mengimplementasikan entri yang sudah terdaftar.

Di luar cakupan: perubahan token global atau tema (melalui revisi [design-system.md](../../02-design/design-system.md) dan ADR-0010), serta penambahan tipe node MUIP baru (melalui RFC kontrak UI).

## Prasyarat

- [02-design/design-system.md](../../02-design/design-system.md) dibaca: token warna, tipografi, spacing, radius, motion, breakpoint, dan aturan theme inheritance.
- Baris komponen pada [component-catalog.md](../../02-design/component-catalog.md) sudah ada, atau permintaan penambahan komponen sudah disetujui lewat RFC.
- [03-specs/ui-protocol.md](../../03-specs/ui-protocol.md) dipahami: tipe node, props, event, batas ukuran, dan aturan aksesibilitas.
- `packages/ui-kit` sudah ter-scaffold dan dependensi workspace terpasang dengan `npm install`.

## Input

| Input | Wajib | Contoh |
|---|---|---|
| Komponen target | ya | `Button` atau entri katalog lain yang sudah terdaftar |
| Kebutuhan produk | ya | Studio membutuhkan tombol dengan varian dan state loading |
| Platform | ya | Web React di `packages/ui-kit` dan Flutter di paket UI kit Flutter |
| Pemakaian layar | ya | `SCR-07` Studio Dashboard dan `SCR-08` Visual Builder |
| Acceptance a11y | ya | Fokus terlihat, nama/role terbaca, target sentuh minimum 24×24 |

## Prosedur

1. Baca token dan aturan komposisi di [02-design/design-system.md](../../02-design/design-system.md), lalu buka baris komponen terkait di `docs/02-design/component-catalog.md`.
2. Verifikasi bahwa komponen sudah termasuk 120 entri katalog. Bila belum, hentikan implementasi: ajukan RFC penambahan komponen beserta kategori dan ID katalog melalui `docs/10-contributing/rfc-process.md` dan [templates/component-spec.md](../../templates/component-spec.md). Jangan mengarang ID atau menambah komponen ke-121 tanpa persetujuan.
3. Lengkapi baris katalog: anatomy, varian, ukuran, state wajib, keyboard, ARIA, token yang dipakai, serta do/don't. Baris ini menjadi kontrak implementasi.
4. Implementasikan versi web di `packages/ui-kit/src/components/` dengan React 19 dan TypeScript strict. Seluruh warna, spacing, radius, shadow, dan durasi motion MUST berasal dari CSS variable token; tidak boleh ada nilai hardcoded.
5. Implementasikan padanan Flutter di paket UI kit Flutter dengan `ThemeExtension` yang memetakan token yang sama. Semantik, nama state, dan perilaku keyboard harus identik dengan versi web.
6. Sediakan state wajib: default, hover, focus-visible, active, disabled, loading, serta error dan empty bila komponen menampilkan data. Hormati `prefers-reduced-motion` dan sediakan alternatif tanpa animasi.
7. Pasang nama, role, dan state ARIA yang benar; pastikan urutan fokus logis dan seluruh aksi dapat dicapai dengan keyboard. Untuk target sentuh, gunakan minimal 24×24 dengan anjuran 44×44.
8. Tulis test di `packages/ui-kit`: unit untuk props dan state, test keyboard, serta assertion role/nama a11y. Tambahkan golden test Flutter untuk visual dan state.
9. Periksa kontras teks minimal 4,5:1 dan komponen non-teks minimal 3:1 pada tema light, dark, dan high-contrast.
10. Bila komponen masuk ke component palette Studio, perbarui `docs/03-specs/02-studio-ide.md` pada requirement yang relevan dan pastikan pemetaan tipe node MUIP tercatat di [03-specs/ui-protocol.md](../../03-specs/ui-protocol.md).
11. Jalankan blok verifikasi, lalu perbarui baris katalog dengan path implementasi dan status verifikasi.

## Verifikasi

```bash
npm test -w @microapp/ui-kit
npx tsc --noEmit -p packages/ui-kit
npm run docs:check
cd apps/host-flutter && flutter analyze && flutter test
```

Selain perintah di atas, periksa manual dengan keyboard saja pada tema light dan dark: fokus harus terlihat, tidak ada focus trap yang salah, dan tidak ada informasi yang hilang saat animasi dimatikan.

## Kesalahan Umum

| Kesalahan | Perbaikan |
|---|---|
| Menulis warna atau spacing hardcoded | Ganti dengan CSS variable token yang terdaftar di design system |
| Hanya mengimplementasikan web | Implementasikan Flutter dengan token dan semantik yang sama, atau nyatakan pengecualian lewat RFC |
| Menambah komponen ke-121 tanpa persetujuan | Ajukan RFC katalog; katalog dikunci 120 sampai keputusan diterima |
| Melewatkan state focus-visible atau disabled | Lengkapi seluruh state wajib sebelum menambah varian baru |
| Kontras di bawah ambang WCAG | Sesuaikan token atau pasangan warna; jangan menurunkan ambang |
| Menambah tipe node MUIP tanpa memperbarui schema | Perbarui `docs/03-specs/schemas/ui-node.v1.schema.json` dan spec lewat RFC |

## Definition of Done

- Baris katalog terisi lengkap: anatomy, varian, state, keyboard, ARIA, token, dan do/don't.
- Implementasi web dan Flutter memakai token yang sama dan berperilaku setara.
- Seluruh state wajib dan perilaku reduced-motion diuji.
- Test unit, keyboard, a11y, dan golden test Flutter lulus.
- Kontras memenuhi 4,5:1 untuk teks dan 3:1 untuk non-teks pada semua tema.
- `npm run docs:check` lulus dan baris katalog diperbarui.
