---
id: DESIGN-CLAY
title: Claymorphism Design System
status: accepted
owner: design
prd_refs: ["§6"]
---

# Claymorphism Design System

Dokumen ini adalah **sumber visual kanonik** untuk MicroApp Studio. Jika nilai visual di dokumen lain berbeda, dokumen ini yang menang. Kontrak implementasi token ada di [docs/02-design/design-system.md](docs/02-design/design-system.md).

## 1. Prinsip

1. **Clay, bukan kaca.** Permukaan terlihat seperti tanah liat lembut: radius besar, highlight atas, bayangan dalam bawah, bayangan luar hangat. Tidak ada glassmorphism transparan sebagai bahasa utama.
2. **Tenang dan fokus.** Satu aksi utama per layar. Warna pastel untuk area, warna pekat untuk aksi. Tidak ada gradien dekoratif yang bersaing dengan konten.
3. **Taktil.** Setiap kontrol memiliki hover lift, press depress, dan release spring. Gerakan maksimal 320 ms dan tidak memblokir input.
4. **Aksesibel.** Kontras teks ≥ 4.5:1; fokus 3 px; target sentuh 44 px; reduced motion = 0 ms; warna bukan satu-satunya pembeda.
5. **Cepat.** Efek clay hanya `box-shadow`, `transform`, `opacity`, dan `filter` ringan. Tidak ada animasi layout yang mahal.

## 2. Token Kanonik

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

## 3. Warna

### 3.1 Light

| Token | Nilai | Peran |
|---|---|---|
| `--mads-color-bg` | `#F3EEE7` | Latar hangat |
| `--mads-color-surface` | `#FFFBF5` | Permukaan clay |
| `--mads-color-surface-raised` | `#FFFFFF` | Kartu terangkat |
| `--mads-color-fg` | `#2A2233` | Teks utama |
| `--mads-color-muted` | `#6B5F73` | Teks sekunder |
| `--mads-color-border` | `#E3D9CE` | Garis dekoratif |
| `--mads-color-border-strong` | `#8C7E86` | Batas kontrol |
| `--mads-color-primary` | `#5B4B8A` | Aksi utama (lavender tua) |
| `--mads-color-on-primary` | `#FFFFFF` | Teks di aksi utama |
| `--mads-color-accent` | `#D96C4A` | Aksen terracotta (grafik/fill) |
| `--mads-color-success` | `#2F7D5B` | Sukses |
| `--mads-color-warning` | `#9A5B00` | Peringatan |
| `--mads-color-error` | `#B23A48` | Bahaya |
| `--mads-color-info` | `#2C6E8F` | Informasi |
| `--mads-color-focus` | `#5B4B8A` | Cincin fokus |

Tint clay: mint `#BFE3D0`, lilac `#D9CCF2`, peach `#F7C8B8`, butter `#F7E3A1`, sky `#C5DFF7`. Tint hanya untuk blob latar, ilustrasi, dan penanda kategori; tidak untuk teks kecil.

### 3.2 Dark dan High-Contrast

Nilai dark dan high-contrast ada pada blok token di §2. High-contrast memakai polaritas terang, `#1A1AFF` untuk aksi dan fokus, error `#B00020`, serta bayangan berupa outline. Status pada high-contrast wajib memakai ikon + label.

### 3.3 Status Surface

Permukaan status dihitung, bukan hardcoded:

```css
--mads-color-success-surface: color-mix(in srgb, var(--mads-color-success) 12%, var(--mads-color-surface));
```

Aturan: teks di atas status surface memakai `--mads-color-fg`; border memakai `--mads-color-border-strong`; high-contrast memakai `#E0E0E0` dengan teks `#000000`.

## 4. Clay Shadow dan Radius

| Token | Light | Dark |
|---|---|---|
| `--mads-clay-shadow-1` | highlight atas + inner bawah + luar 4/10 | highlight tipis + inner gelap + luar 4/10 |
| `--mads-clay-shadow-2` | kartu default, luar 10/24 | kartu default |
| `--mads-clay-shadow-3` | modal/drag, luar 20/48 | modal/drag |
| `--mads-clay-shadow-pressed` | inner depressed | inner depressed |

Radius: `clay-sm` 14 px untuk chip dan field; `clay-md` 20 px untuk tombol dan kartu kecil; `clay-lg` 28 px untuk kartu dan panel; `clay-xl` 36 px untuk sheet dan hero; `full` untuk avatar dan pill.

Aturan mengikat:

- Komponen MUST NOT menulis `box-shadow`, `border-radius`, atau nilai hex langsung. Hanya token.
- Border 1 px `color-mix(in srgb, var(--mads-color-border) 70%, transparent)` untuk definisi tepi; border bukan satu-satunya pemisah.
- Bayangan tidak dipakai untuk menyampaikan status; status memakai ikon, label, dan warna permukaan.

## 5. Tipografi

| Kelompok | Nilai |
|---|---|
| Font UI | Plus Jakarta Sans, fallback system-ui |
| Font display | Fraunces, fallback Georgia |
| Font mono | JetBrains Mono, fallback ui-monospace |
| Size | 12, 14, 16, 18, 22, 28, 36, 48 px |
| Line-height | 16, 20, 24, 28, 32, 36, 44, 56 px |
| Weight | 400, 500, 600, 700, 800 |

Font dibundel lokal sebagai WOFF2, tanpa CDN, dengan `font-display: swap`. Body memakai 16/24; label 14/20; caption 12/16; judul layar 28/36; hero 36/44 atau 48/56. Maksimal dua weight per layar.

## 6. Spacing dan Layout

Skala spacing: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64 px. Grid 12 kolom dengan gutter 24 px pada desktop; 8 px pada mobile. Sidebar desktop 264 px, rail tablet 80 px, bottom dock mobile 64 px + safe area. Konten maksimal 1200 px.

## 7. Motion

| Peran | Durasi | Easing | Transform |
|---|---|---|---|
| Micro (warna, opacity) | 120 ms | standard | — |
| Control (hover) | 180 ms | clay | `translateY(-2px)` |
| Press | 90 ms | ease-out | `scale(.97)` + `translateY(1px)` |
| Panel/modal | 240 ms | standard | `scale(.96)→1`, fade |
| Page | 320 ms | standard | fade + 8 px slide |

Aturan: tidak ada overshoot > 2%; animasi tidak memblokir input; `prefers-reduced-motion: reduce` memaksa durasi 0 dan menghapus transform. Blob latar hanya beranimasi `translate3d` 12 s alternate bila reduced motion tidak aktif.

## 8. Background dan Tekstur

- Tiga blob radial-gradient (mint, lilac, peach) opacity 0.18–0.28, blur 80–120 px, posisi fixed; dark 0.10–0.16.
- Noise SVG inline (data URI) opacity 0.03 dengan `mix-blend-mode: soft-light`.
- Tidak ada gambar eksternal, video background, atau partikel canvas.
- Blob tidak boleh menutupi teks; kontras diukur pada permukaan efektif.

## 9. Komponen

Katalog 120 komponen ada di [component-catalog.md](docs/02-design/component-catalog.md). 48 komponen core clay adalah default palette builder; 72 advanced tetap terdaftar dan dapat diaktifkan.

Aturan komponen:

1. Gunakan radius dan shadow clay; jangan mencampur sudut tajam dengan permukaan clay.
2. State wajib: default, hover, focus-visible, pressed, disabled, loading, error, empty bila relevan.
3. Tombol primer memakai `primary` + `on-primary`; sekunder memakai `surface` + border; destruktif memakai `error` dengan label eksplisit.
4. Input memakai `surface-raised`, border `border-strong`, dan focus ring 3 px.
5. Kartu memakai `surface` + shadow 1; kartu terpilih memakai shadow 2 + border primary.
6. Sheet dan modal memakai shadow 3 dengan backdrop blur 8 px.

## 10. Pola Interaksi

| Pola | Perilaku |
|---|---|
| Hover lift | `translateY(-2px)`, shadow 1→2, 180 ms; tidak berlaku di touch. |
| Press | `scale(.97)`, `translateY(1px)`, shadow pressed, 90 ms. |
| Release | Spring kembali 180 ms; overshoot ≤ 2%. |
| Drag | Ghost `rotate(1.5deg) scale(1.02)`, shadow 3, opacity 0.9; drop indicator 2 px primary. |
| Modal | Backdrop blur 8 px + fade; panel `scale(.96)→1`, 240 ms. |
| Sheet | Slide up 240 ms; drag handle; `Esc` menutup. |
| Toast | Slide/fade 180 ms; auto-dismiss 4 s; pause saat hover/focus. |
| Command palette | `Cmd/Ctrl+K`, fuzzy search, arrow/enter, `Esc`, focus trap, 120 ms. |
| Inline edit | Klik teks → input; Enter commit, Esc cancel; autosave 500 ms. |
| Undo/redo | `Cmd/Ctrl+Z`, `Cmd/Ctrl+Shift+Z`; 100 langkah; label aksi di toast. |
| Confetti | Hanya setelah micro-app pertama dibuat; 800 ms; reduced motion = tidak ada. |
| Coachmark | Maksimal 3 langkah; dismissible; tidak muncul lagi setelah selesai. |

## 11. Aksesibilitas

- Kontras teks normal ≥ 4.5:1; teks besar ≥ 3:1; batas kontrol ≥ 3:1; focus ring ≥ 3:1 terhadap permukaan.
- `muted` di atas `bg` hanya untuk teks ≥ 18.66 px bold atau ≥ 24 px regular; teks kecil memakai `surface`.
- `accent` tidak untuk teks kecil; gunakan `warning`/`error` atau teks `fg` di atas fill accent.
- Focus ring 3 px `--mads-color-focus` + offset 2 px + halo putih 2 px di dark.
- Target sentuh 44×44 px; minimum 24×24 px hanya untuk kontrol sekunder dengan padding.
- Semua ikon status punya label teks atau `aria-label`; warna bukan satu-satunya pembeda.
- `prefers-reduced-motion` menghapus blob, confetti, parallax, dan transisi transform; sisakan opacity ≤ 120 ms.
- Keyboard: semua alur dapat diselesaikan tanpa mouse; urutan fokus logis; `Esc` menutup lapisan teratas; fokus kembali ke pemicu.

## 12. Do dan Don't

| Do | Don't |
|---|---|
| Pakai token `--mads-*` untuk warna, radius, shadow, motion. | Menulis hex, `box-shadow`, atau `border-radius` langsung di komponen. |
| Satu aksi primer per layar. | Dua tombol primary bersaing. |
| Status dengan ikon + label + warna. | Status hanya warna. |
| Animasi 120–320 ms yang tidak memblokir input. | Animasi layout, parallax berat, atau loop tak berujung. |
| Teks di atas permukaan dengan kontras terukur. | Teks `muted` kecil di atas `bg`. |
| Empty state dengan aksi jelas. | Layar kosong tanpa jalan keluar. |
| Consent default Tolak. | Consent tercentang atau countdown palsu. |

## 13. Contoh CSS

```css
.clay-button {
  font: 600 var(--mads-text-16) / var(--mads-leading-24) var(--mads-font-ui);
  color: var(--mads-color-on-primary);
  background: var(--mads-color-primary);
  border: 1px solid color-mix(in srgb, var(--mads-color-border) 70%, transparent);
  border-radius: var(--mads-radius-clay-md);
  box-shadow: var(--mads-clay-shadow-1);
  padding: var(--mads-space-3) var(--mads-space-6);
  transition: transform var(--mads-duration-control) var(--mads-ease-clay),
    box-shadow var(--mads-duration-control) var(--mads-ease-clay);
}

.clay-button:hover {
  transform: translateY(-2px);
  box-shadow: var(--mads-clay-shadow-2);
}

.clay-button:active {
  transform: scale(.97) translateY(1px);
  box-shadow: var(--mads-clay-shadow-pressed);
  transition-duration: 90ms;
}

.clay-button:focus-visible {
  outline: 3px solid var(--mads-color-focus);
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  .clay-button {
    transition-duration: 0ms;
  }
  .clay-button:hover,
  .clay-button:active {
    transform: none;
  }
}
```

## 14. Verifikasi

| Pemeriksaan | Cara |
|---|---|
| Kontras | Ukur pasangan teks/permukaan di tiga tema; target WCAG 2.2 AA. |
| Token | `diff` blok token dengan design-system.md; harus identik. |
| Visual | Regression screenshot komponen core di light/dark/high-contrast. |
| Motion | `prefers-reduced-motion` → tidak ada transform. |
| Implementasi | Review komponen: tidak ada hex, `box-shadow`, atau radius literal. |
