---
id: SKILL-SCREEN
title: Menambah Layar
status: accepted
owner: design
prd_refs: ["§6", "§4"]
name: add-screen
description: "Menambahkan layar baru secara utuh: information architecture, screen spec SCR, komposisi komponen katalog, state, dan test."
when_to_use: "Dipakai saat produk membutuhkan layar atau route baru, atau saat layar lama dipecah, dipindahkan, atau dihapus."
required_docs: ["docs/02-design/information-architecture.md", "docs/02-design/screen-specs.md", "docs/02-design/component-catalog.md", "docs/02-design/accessibility.md", "docs/02-design/content-i18n.md", "docs/03-specs/01-app-shell.md"]
---

# Menambah Layar

## Kapan Digunakan

Dipakai ketika sebuah pekerjaan menambah layar atau route baru pada PWA, memindahkan layar ke route lain, atau memecah satu layar menjadi beberapa state yang berbeda. Layar yang hanya berubah copy atau token tidak memerlukan skill ini.

Di luar cakupan: membuat komponen baru (gunakan [add-ui-component](../add-ui-component/SKILL.md)), menambah permission (gunakan [add-permission](../add-permission/SKILL.md)), dan mengubah perilaku shell yang sudah ada (gunakan [add-shell-feature](../add-shell-feature/SKILL.md)).

## Prasyarat

- [information-architecture.md](../../02-design/information-architecture.md) dibaca: sitemap, route, dan navigasi desktop/tablet/mobile.
- [screen-specs.md](../../02-design/screen-specs.md) dibaca untuk format `SCR-xx` dan nomor yang belum terpakai.
- [component-catalog.md](../../02-design/component-catalog.md) dipahami: layar disusun hanya dari 120 komponen yang terdaftar.
- [accessibility.md](../../02-design/accessibility.md) dan [content-i18n.md](../../02-design/content-i18n.md) dibaca untuk kontras, fokus, dan copy.
- Spec modul pemilik layar sudah ada; layar tidak boleh menjadi cara menambah perilaku tanpa requirement.

## Input

| Input | Wajib | Contoh |
|---|---|---|
| Tujuan layar | ya | Menampilkan galeri template dengan filter kategori |
| Route target | ya | `/templates` |
| Requirement terkait | ya | `FR-CREATE-001` |
| Komponen yang dipakai | ya | `MADS-NAV-02`, `MADS-DATA-05`, `MADS-FBK-01` |
| State yang harus ada | ya | loading, empty, error, offline |

## Prosedur

1. Tentukan posisi layar pada sitemap di `02-design/information-architecture.md`. Perbarui tabel route, entri navigasi, dan aturan akses. Navigasi desktop memakai sidebar 264 px, tablet rail 80 px, mobile dock 4 item + FAB **Buat**.
2. Pilih nomor `SCR-xx` berikutnya dan tulis bagian baru di `02-design/screen-specs.md` dengan: tujuan, route, wireframe ASCII, komponen katalog, state loading/empty/error/offline, interaksi, a11y, dan acceptance yang dapat diperiksa.
3. Pastikan setiap komponen yang dipakai ada di `02-design/component-catalog.md`. Jika komponen tidak ada, jangan menambah komponen; susun ulang layar dari komponen terdaftar atau hentikan pekerjaan dan ajukan RFC.
4. Tentukan data yang dibaca: seluruh akses data lewat repository yang ada. Jika butuh tabel atau kolom baru, gunakan [write-db-migration](../write-db-migration/SKILL.md) lebih dulu.
5. Buat route tipis di `apps/studio-web/src/app/` dan implementasi layar di `apps/studio-web/src/features/`. Route hanya boleh berisi metadata, guard, dan komposisi.
6. Susun tata letak dengan token clay (`--mads-radius-clay-*`, `--mads-clay-shadow-*`, spacing, motion). Tidak boleh ada nilai visual hardcoded.
7. Implementasikan seluruh state yang tercantum di screen spec. Empty state memuat satu aksi utama; error memuat kode dari [error-codes.md](../../03-specs/error-codes.md) dan langkah pemulihan.
8. Tambahkan seluruh string ke `apps/studio-web/src/i18n/id-ID.json` dan `en-US.json`; siapkan layout RTL tanpa clipping.
9. Tambahkan test komponen dan alur: unit untuk logika, E2E untuk navigasi dan state kritis, serta axe untuk layar baru.
10. Perbarui tautan di [docs/README.md](../../README.md) bila layar menambah dokumen baru, lalu jalankan verifikasi.

## Verifikasi

```bash
npm test -w @microapp/studio-web
npm run typecheck
npm run lint
npm run e2e
node scripts/check-docs.mjs --strict
```

Uji manual wajib pada tiga breakpoint (mobile 360 px, tablet 768 px, desktop 1280 px), keyboard-only, dan `prefers-reduced-motion: reduce`. Layar baru tidak boleh menambah pelanggaran axe serius.

## Kesalahan Umum

| Kesalahan | Perbaikan |
|---|---|
| Menambah komponen di luar katalog | Susun ulang dari 120 komponen atau ajukan RFC katalog |
| Menulis route dengan logika data di dalamnya | Pindahkan ke `features/` dan repository |
| Hanya mengimplementasikan state sukses | Implementasikan loading, empty, error, dan offline |
| Copy ditulis langsung di JSX | Pindahkan ke kedua locale |
| Layar baru tanpa entri IA dan screen spec | Tulis dokumen lebih dulu, commit `docs(design):` |

## Definition of Done

- Entri IA dan `SCR-xx` lengkap dengan acceptance yang dapat diperiksa.
- Layar hanya memakai komponen katalog dan token clay.
- Empat state utama ada dan diuji.
- Keyboard path, fokus, dan label ARIA benar; axe bersih.
- String ada di kedua locale dan layout RTL tidak terpotong.
