---
id: SKILL-UI
title: Menambah Komponen UI
status: accepted
owner: design
prd_refs: ["§6", "§5 F3"]
name: add-ui-component
description: "Menambah atau mengubah komponen clay dari katalog 120 ID tanpa mengubah jumlahnya: token, state, aksesibilitas, dan regresi visual."
when_to_use: "Dipakai saat komponen katalog perlu diimplementasikan, diperbaiki, atau diberi varian baru, atau saat implementasi menyimpang dari design system."
required_docs: ["docs/02-design/component-catalog.md", "docs/02-design/design-system.md", "docs/02-design/accessibility.md", "docs/03-specs/ui-protocol.md", "docs/07-rules/ui-ux.md", "DESIGN.md"]
---

# Menambah Komponen UI

## Kapan Digunakan

Dipakai ketika sebuah komponen dari katalog MADS perlu dibuat, diperbaiki, atau diperluas variannya pada `packages/ui-kit` atau renderer MUIP. Katalog berisi tepat 120 ID; skill ini tidak boleh menambah, menghapus, atau mengganti ID.

Di luar cakupan: menambah tipe node MUIP (gunakan [extend-manifest](../extend-manifest/SKILL.md) dan RFC), menambah layar (gunakan [add-screen](../add-screen/SKILL.md)), dan mengubah token global (gunakan [design-system.md](../../02-design/design-system.md) dan [DESIGN.md](../../../DESIGN.md) lebih dulu).

## Prasyarat

- Entri komponen sudah ada di [component-catalog.md](../../02-design/component-catalog.md) dengan ID `MADS-<CAT>-<NN>`; bila belum, layar tidak boleh memakainya.
- [design-system.md](../../02-design/design-system.md) dan [DESIGN.md](../../../DESIGN.md) dibaca; nilai visual yang berbeda mengikuti `DESIGN.md`.
- [ui-protocol.md](../../03-specs/ui-protocol.md) dibaca untuk nama tipe, props, event, dan batas renderer.
- `packages/ui-kit/src/tokens.css` dan `packages/ui-kit/src/tokens.ts` dipahami sebagai satu-satunya sumber nilai.
- `node scripts/generate-catalog.mjs --check` lulus sebelum perubahan.

## Input

| Input | Wajib | Contoh |
|---|---|---|
| ID komponen | ya | `MADS-INP-01` |
| Perubahan | ya | Menambah state `loading` dan `error` pada Button |
| Token yang dipakai | ya | `--mads-clay-shadow-2`, `--mads-radius-clay-md`, `--mads-color-primary` |
| Keyboard dan ARIA | ya | `Enter`/`Space` memicu, `aria-busy` saat loading |

## Prosedur

1. Buka entri katalog dan catat ID, nama tipe, anatomi, props, state, token, dan a11y yang tertulis. Jangan mengubah ID, nama, urutan, atau kategori.
2. Jika komponen belum ada, tambahkan baris katalog dengan format `| MADS-<CAT>-<NN> | NamaKomponen | ... |` memakai ID yang sudah tercantum di kategori. Jumlah baris katalog MUST tetap 120.
3. Implementasikan komponen di `packages/ui-kit/src/components/` dan ekspor dari `packages/ui-kit/src/index.ts`. Nilai visual hanya dari token `--mads-*`; jangan menulis hex, `box-shadow`, atau `border-radius` langsung.
4. Implementasikan state yang diwajibkan katalog: `default`, `hover`, `focus-visible`, `pressed`, `disabled`, `loading`, `error`, dan `empty` bila relevan. Hover lift hanya untuk pointer halus; touch tidak memakai hover.
5. Terapkan motion clay: hover 180 ms `translateY(-2px)`, press 90 ms `scale(.97)` + `translateY(1px)`, release 180 ms `ease-clay`. Semua durasi menjadi 0 di `prefers-reduced-motion: reduce`.
6. Lengkapi a11y: elemen semantik yang benar, `aria-*` sesuai peran, focus ring 3 px dengan offset 2 px, target sentuh minimal 44x44 px, dan warna bukan satu-satunya pembeda status.
7. Pastikan renderer MUIP memakai komponen yang sama; tipe node di `packages/runtime-web/src/muip/components.ts` dan validasi di `validate.ts` harus konsisten dengan katalog.
8. Tambahkan test komponen di `packages/ui-kit/src/__tests__/ui-kit.test.tsx`: render tiap state, keyboard, dan atribut ARIA.
9. Tambahkan snapshot regresi visual pada suite Playwright untuk komponen yang tampil di layar, dalam tema light dan dark.
10. Jalankan `node scripts/generate-catalog.mjs` bila baris katalog berubah, lalu commit hasil `packages/runtime-web/src/muip/catalog.generated.ts`.

## Verifikasi

```bash
node scripts/generate-catalog.mjs --check
npm test -w @microapp/ui-kit
npm test -w @microapp/runtime-web
npm run typecheck
npm run lint
npm run e2e
node scripts/check-docs.mjs --strict
```

Generator harus melaporkan 120 komponen dan tidak menulis ulang file. Snapshot visual dan axe tidak boleh menambah perbedaan atau pelanggaran serius.

## Kesalahan Umum

| Kesalahan | Perbaikan |
|---|---|
| Menambah ID komponen baru | Pakai ID yang ada; jumlah dan kategori tidak boleh berubah |
| Menulis `#5B4B8A` di komponen | Ganti dengan `var(--mads-color-primary)` |
| Melewatkan state `focus-visible` | Tambahkan ring 3 px dan uji dengan keyboard |
| Animasi memakai properti layout | Batasi ke `transform`, `opacity`, dan `box-shadow` |
| Katalog diubah tanpa regenerasi | Jalankan generator dan commit file generated |

## Definition of Done

- Katalog tetap 120 komponen dan `--check` lulus.
- Seluruh state wajib diimplementasikan dan diuji.
- Tidak ada nilai visual hardcoded.
- Keyboard, ARIA, kontras, dan reduced motion terverifikasi.
- Snapshot visual light/dark diperbarui dengan sengaja.
