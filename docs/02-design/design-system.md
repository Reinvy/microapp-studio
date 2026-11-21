---
id: DESIGN-SYSTEM
title: Design System MADS v3
status: accepted
owner: design
prd_refs: ["§6 UX dan Design"]
---

# Design System MADS v3

## 1. Tujuan

MADS v3 "Clay" adalah kontrak token dan implementasi untuk Host, Studio, dan micro-app. Dokumen ini menerjemahkan sumber visual kanonik [DESIGN.md](../../DESIGN.md) menjadi aturan teknis: lapisan token, nama variabel CSS, tema, breakpoint, dan validasi. Jika nilai visual berbeda, [DESIGN.md](../../DESIGN.md) menang.

## 2. Lapisan Token

Token berlapis tiga dan tidak boleh dilompati:

1. **Primitive** — nilai mentah palet, skala, dan bayangan. Tidak dipakai langsung oleh komponen kecuali melalui semantic.
2. **Semantic** — peran (`--mads-color-surface`, `--mads-color-primary`, `--mads-color-error`). Komponen memakai lapisan ini.
3. **Component** — hanya bila semantic tidak cukup (mis. tinggi tombol), didefinisikan di katalog komponen dan tetap memakai nilai primitive.

Aturan:

- Komponen MUST NOT memuat warna, ukuran font, radius, shadow, atau durasi hardcoded.
- Nama token memakai prefiks `--mads-` dan tidak di-rename per framework.
- Token baru MUST ditambahkan ke dokumen ini dan DESIGN.md sebelum dipakai.
- Tema adalah set nilai lengkap; tidak ada pewarisan parsial antar tema.

## 3. Token Kanonik

Blok berikut identik dengan [DESIGN.md](../../DESIGN.md). Perubahan harus dilakukan di kedua dokumen dalam commit yang sama.

```css
:root {
  --mads-color-bg: #F3EEE7;
  --mads-color-surface: #FFFBF5;
  --mads-color-surface-raised: #FFFFFF;
  --mads-color-fg: #2A2233;
  --mads-color-muted: #6B5F73;
  --mads-color-border: #E3D9CE;
  --mads-color-border-strong: #8C7E86;
  --mads-color-primary: #5B4B8A;
  --mads-color-on-primary: #FFFFFF;
  --mads-color-accent: #D96C4A;
  --mads-color-success: #2F7D5B;
  --mads-color-warning: #9A5B00;
  --mads-color-error: #B23A48;
  --mads-color-info: #2C6E8F;
  --mads-color-focus: #5B4B8A;
  --mads-clay-mint: #BFE3D0;
  --mads-clay-lilac: #D9CCF2;
  --mads-clay-peach: #F7C8B8;
  --mads-clay-butter: #F7E3A1;
  --mads-clay-sky: #C5DFF7;
  --mads-clay-shadow-1: 0 1px 0 rgba(255,255,255,.85) inset, 0 -2px 4px rgba(80,60,100,.10) inset, 0 4px 10px rgba(80,60,100,.12);
  --mads-clay-shadow-2: 0 2px 0 rgba(255,255,255,.90) inset, 0 -4px 8px rgba(80,60,100,.12) inset, 0 10px 24px rgba(80,60,100,.18);
  --mads-clay-shadow-3: 0 3px 0 rgba(255,255,255,.92) inset, 0 -6px 12px rgba(80,60,100,.14) inset, 0 20px 48px rgba(80,60,100,.24);
  --mads-clay-shadow-pressed: 0 2px 0 rgba(255,255,255,.55) inset, 0 4px 10px rgba(80,60,100,.20) inset;
  --mads-radius-clay-sm: 14px;
  --mads-radius-clay-md: 20px;
  --mads-radius-clay-lg: 28px;
  --mads-radius-clay-xl: 36px;
  --mads-radius-full: 9999px;
  --mads-font-ui: "Plus Jakarta Sans", system-ui, -apple-system, "Segoe UI", sans-serif;
  --mads-font-display: "Fraunces", Georgia, serif;
  --mads-font-mono: "JetBrains Mono", ui-monospace, monospace;
  --mads-text-12: 12px;
  --mads-text-14: 14px;
  --mads-text-16: 16px;
  --mads-text-18: 18px;
  --mads-text-22: 22px;
  --mads-text-28: 28px;
  --mads-text-36: 36px;
  --mads-text-48: 48px;
  --mads-leading-16: 16px;
  --mads-leading-20: 20px;
  --mads-leading-24: 24px;
  --mads-leading-28: 28px;
  --mads-leading-32: 32px;
  --mads-leading-36: 36px;
  --mads-leading-44: 44px;
  --mads-leading-56: 56px;
  --mads-weight-regular: 400;
  --mads-weight-medium: 500;
  --mads-weight-semibold: 600;
  --mads-weight-bold: 700;
  --mads-weight-extrabold: 800;
  --mads-space-1: 4px;
  --mads-space-2: 8px;
  --mads-space-3: 12px;
  --mads-space-4: 16px;
  --mads-space-5: 20px;
  --mads-space-6: 24px;
  --mads-space-8: 32px;
  --mads-space-10: 40px;
  --mads-space-12: 48px;
  --mads-space-16: 64px;
  --mads-duration-micro: 120ms;
  --mads-duration-control: 180ms;
  --mads-duration-panel: 240ms;
  --mads-duration-page: 320ms;
  --mads-ease-clay: cubic-bezier(.34,1.56,.64,1);
  --mads-ease-standard: cubic-bezier(.2,0,0,1);
  --mads-breakpoint-sm: 640px;
  --mads-breakpoint-md: 768px;
  --mads-breakpoint-lg: 1024px;
  --mads-breakpoint-xl: 1280px;
}

[data-theme="dark"] {
  --mads-color-bg: #1B1724;
  --mads-color-surface: #262131;
  --mads-color-surface-raised: #312A3F;
  --mads-color-fg: #F7F2EA;
  --mads-color-muted: #B9AEC6;
  --mads-color-border: #3E354B;
  --mads-color-border-strong: #8F82A0;
  --mads-color-primary: #C9B8FF;
  --mads-color-on-primary: #241B3A;
  --mads-color-accent: #FF9B7A;
  --mads-color-success: #7BD8A8;
  --mads-color-warning: #F2C66D;
  --mads-color-error: #FF8E9A;
  --mads-color-info: #8CCFF0;
  --mads-color-focus: #C9B8FF;
  --mads-clay-shadow-1: 0 1px 0 rgba(255,255,255,.08) inset, 0 -2px 4px rgba(0,0,0,.35) inset, 0 4px 10px rgba(0,0,0,.40);
  --mads-clay-shadow-2: 0 2px 0 rgba(255,255,255,.10) inset, 0 -4px 8px rgba(0,0,0,.40) inset, 0 10px 24px rgba(0,0,0,.50);
  --mads-clay-shadow-3: 0 3px 0 rgba(255,255,255,.12) inset, 0 -6px 12px rgba(0,0,0,.45) inset, 0 20px 48px rgba(0,0,0,.60);
  --mads-clay-shadow-pressed: 0 2px 0 rgba(255,255,255,.06) inset, 0 4px 10px rgba(0,0,0,.50) inset;
}

[data-theme="high-contrast"] {
  --mads-color-bg: #FFFFFF;
  --mads-color-surface: #FFFFFF;
  --mads-color-surface-raised: #FFFFFF;
  --mads-color-fg: #000000;
  --mads-color-muted: #000000;
  --mads-color-border: #000000;
  --mads-color-border-strong: #000000;
  --mads-color-primary: #1A1AFF;
  --mads-color-on-primary: #FFFFFF;
  --mads-color-accent: #000000;
  --mads-color-success: #000000;
  --mads-color-warning: #000000;
  --mads-color-error: #B00020;
  --mads-color-info: #000000;
  --mads-color-focus: #1A1AFF;
  --mads-clay-shadow-1: 0 0 0 1px #000000;
  --mads-clay-shadow-2: 0 0 0 2px #000000;
  --mads-clay-shadow-3: 0 0 0 3px #000000;
  --mads-clay-shadow-pressed: 0 0 0 2px #000000 inset;
}
```

## 4. Status Surface

Permukaan status dihitung dengan `color-mix` agar mengikuti tema:

```css
--mads-color-success-surface: color-mix(in srgb, var(--mads-color-success) 12%, var(--mads-color-surface));
```

Aturan: teks memakai `--mads-color-fg`, border memakai `--mads-color-border-strong`, dan high-contrast memakai permukaan `#E0E0E0` dengan teks `#000000`. Status tidak boleh hanya dibedakan oleh warna; sertakan ikon dan label.

## 5. Tema

| Tema | Selector | Catatan |
|---|---|---|
| Light | `:root` / `[data-theme="light"]` | Default. |
| Dark | `[data-theme="dark"]` | Bayangan lebih gelap; fokus tetap kontras. |
| High-contrast | `[data-theme="high-contrast"]` | Outline menggantikan bayangan; semua status memakai ikon + label. |
| System | `prefers-color-scheme` | Hanya memilih light/dark; high-contrast selalu eksplisit. |

Tema disimpan di host DB dan dicerminkan ke atribut `data-theme` pada `<html>` sebelum paint untuk mencegah flash.

## 6. Breakpoint

| Nama | Nilai | Layout |
|---|---|---|
| `sm` | 640 px | Mobile besar; dock bawah. |
| `md` | 768 px | Tablet; rail 80 px. |
| `lg` | 1024 px | Desktop; sidebar 264 px. |
| `xl` | 1280 px | Desktop lebar; konten maksimal 1200 px. |

Builder memakai device frame sendiri (mobile 390 px, tablet 834 px, desktop 1280 px) yang tidak bergantung pada viewport host.

## 7. Token Komponen

Token komponen hanya boleh ditambahkan bila semantic tidak cukup. Penamaan: `--mads-<component>-<property>-<variant>`. Contoh yang diizinkan: tinggi tombol per ukuran, lebar sidebar, tinggi bottom dock. Nilai harus merujuk primitive, bukan angka baru.

## 8. Validasi

1. Tidak ada hex, `rgb()`, `box-shadow` literal, atau `border-radius` literal di komponen.
2. Setiap komponen memakai token semantic untuk warna, radius, shadow, dan motion.
3. Kontras diukur pada permukaan efektif, termasuk saat blob latar terlihat.
4. `prefers-reduced-motion` menghasilkan durasi 0 dan tanpa transform.
5. Blok token pada dokumen ini dan DESIGN.md identik.

## 9. Implementasi

- Token didefinisikan sekali di `packages/ui-kit` sebagai CSS variables dan diekspor sebagai konstanta TypeScript untuk kebutuhan non-CSS.
- Tailwind v4 memakai `@theme` yang memetakan nama token ke variabel; tidak ada nilai duplikat di utility.
- Komponen `packages/ui-kit` menjadi satu-satunya sumber komponen host; micro-app memakai MUIP, bukan React langsung.
- Font dibundel di aplikasi web sebagai WOFF2; tidak ada permintaan ke CDN.

## 10. Aksesibilitas

Aturan kontras dan fokus mengikuti [accessibility.md](accessibility.md). Ringkas: teks normal ≥ 4.5:1, teks besar ≥ 3:1, batas kontrol ≥ 3:1, focus ring 3 px dengan offset 2 px, target sentuh 44 px, dan `muted` tidak dipakai untuk teks kecil di atas `bg`.

## 11. Verifikasi

| Pemeriksaan | Cara |
|---|---|
| Token identik | `diff` hasil ekstraksi token DESIGN.md dan dokumen ini. |
| Tanpa nilai literal | ESLint/stylelint dan review komponen. |
| Kontras | axe dan pengukuran manual di tiga tema. |
| Motion | Playwright `reducedMotion: 'reduce'`. |
| Katalog | `node scripts/generate-catalog.mjs --check`. |
