---
id: DESIGN-SYSTEM
title: Design System MADS
status: accepted
owner: design
prd_refs: ["§3 Modul 2", "§6"]
---

# Design System MADS

## 1. Tujuan dan Ruang Lingkup

MADS (MicroApp Design System) adalah satu-satunya sumber token visual dan aturan komponen untuk Host, Studio, dan micro-app. Dokumen ini menetapkan prinsip, skala token, tema, breakpoint, serta pemetaan token antara web (CSS custom properties) dan Flutter (`ThemeExtension`).

Keputusan arsitektur terkait ada di [ADR-0010](../01-architecture/adr/0010-design-system.md). Katalog komponen beserta ID `MADS-<CAT>-<NN>` ada di [component-catalog.md](component-catalog.md). Kontrak render micro-app ada di [ui-protocol.md](../03-specs/ui-protocol.md).

Di luar lingkup: spesifikasi anatomi per komponen (katalog), copy dan terjemahan ([content-i18n.md](content-i18n.md)), serta kriteria WCAG per layar ([accessibility.md](accessibility.md)).

## 2. Prinsip

| Prinsip | Arti operasional | Konsekuensi yang mengikat |
|---|---|---|
| Calm | Permukaan tenang, hierarki jelas, satu aksi utama per layar. | Tanpa gradien dekoratif, animasi berulang, atau badge yang berkedip. |
| Tactile | Umpan balik tekan dan drag terasa langsung tanpa menunda data. | State `pressed`/`dragging` memakai transform ≤ 2% dan durasi 120 ms. |
| Offline-first | Tidak ada elemen UI yang bergantung pada jaringan untuk tampil. | Ikon, font, dan ilustrasi dibundel lokal; state offline adalah state normal, bukan error. |
| High-contrast | Setiap tema, termasuk AMOLED, memenuhi NFR-A11Y-004. | Warna bukan satu-satunya pembeda status; ikon dan label wajib menyertai. |
| No dark patterns | Tidak ada countdown palsu, pre-checked consent, atau tombol menipu. | Aksi destruktif selalu di kanan/bawah dengan label eksplisit; consent default `Deny`. |

## 3. Arsitektur Token

Token berlapis tiga dan tidak boleh dilompati:

1. **Primitive** — nilai mentah palet dan skala (`--mads-teal-700`, `--mads-space-16`). Tidak dipakai langsung oleh komponen.
2. **Semantic** — peran (`--mads-color-primary`, `--mads-color-fg`, `--mads-color-error-surface`). Komponen hanya memakai lapisan ini.
3. **Component** — hanya bila semantic tidak cukup (`--mads-button-height-md`), didefinisikan di katalog komponen.

Aturan yang mengikat:

- Komponen MUST NOT memuat nilai warna, ukuran font, radius, shadow, atau durasi hardcoded.
- Nama token identik antara CSS dan Flutter; hanya prefiks dan pemisah yang berbeda.
- Token baru MUST ditambahkan ke tabel dokumen ini sebelum dipakai di kode.
- Tema MUST didefinisikan sebagai set nilai lengkap; tidak ada pewarisan parsial antar tema.

## 4. Token Warna

### 4.1 Palet semantik

| Peran | CSS variable | Light | Dark | AMOLED | High-contrast |
|---|---|---|---|---|---|
| Latar aplikasi | `--mads-color-bg` | `#F8F7F4` | `#0C0A09` | `#000000` | `#FFFFFF` |
| Permukaan | `--mads-color-surface` | `#FFFFFF` | `#1C1917` | `#0A0A0A` | `#FFFFFF` |
| Permukaan terangkat | `--mads-color-surface-raised` | `#FFFFFF` | `#292524` | `#141414` | `#FFFFFF` |
| Teks utama | `--mads-color-fg` | `#1C1917` | `#FAFAF9` | `#FAFAF9` | `#000000` |
| Teks sekunder | `--mads-color-muted` | `#78716C` | `#A8A29E` | `#A8A29E` | `#000000` |
| Garis dekoratif | `--mads-color-border` | `#E7E5E4` | `#44403C` | `#292524` | `#000000` |
| Batas kontrol | `--mads-color-border-strong` | `#78716C` | `#A8A29E` | `#A8A29E` | `#000000` |
| Aksi utama | `--mads-color-primary` | `#0F766E` | `#2DD4BF` | `#2DD4BF` | `#0000EE` |
| Teks di atas aksi utama | `--mads-color-on-primary` | `#FFFFFF` | `#0C0A09` | `#0C0A09` | `#FFFFFF` |
| Aksen | `--mads-color-accent` | `#D97706` | `#F59E0B` | `#F59E0B` | `#000000` |
| Sukses | `--mads-color-success` | `#15803D` | `#4ADE80` | `#4ADE80` | `#000000` |
| Peringatan | `--mads-color-warning` | `#B45309` | `#FBBF24` | `#FBBF24` | `#000000` |
| Bahaya | `--mads-color-error` | `#B91C1C` | `#F87171` | `#F87171` | `#000000` |
| Informasi | `--mads-color-info` | `#0369A1` | `#38BDF8` | `#38BDF8` | `#000000` |
| Cincin fokus | `--mads-color-focus` | `#0F766E` | `#2DD4BF` | `#2DD4BF` | `#0000EE` |

Setiap warna status memiliki pasangan permukaan (`--mads-color-<status>-surface`) untuk alert dan badge, dengan teks `--mads-color-fg` dan border `--mads-color-border-strong`. Nilai pasangan permukaan adalah 12% campuran warna status di atas `--mads-color-surface`; nilainya dihitung saat build token, bukan ditulis manual.

### 4.2 Batas kontras yang mengikat

| Pasangan | Rasio minimum | Catatan |
|---|---|---|
| `fg` pada `bg`/`surface` | 4,5:1 | Terpenuhi di keempat tema. |
| `muted` pada `surface` | 4,5:1 | Light 4,80:1; Dark/AMOLED 7,1:1. |
| `muted` pada `bg` | 4,5:1 untuk teks kecil | Light 4,48:1 sehingga `muted` MUST NOT dipakai untuk teks < 24 px (atau < 18,66 px bold) di atas `bg`; gunakan `fg` atau tempatkan teks di `surface`. |
| `on-primary` pada `primary` | 4,5:1 | Light 5,5:1; Dark 10,6:1. |
| `accent` pada `surface` | 3:1 untuk grafik, 4,5:1 untuk teks | Light 3,2:1 sehingga `accent` MUST NOT dipakai sebagai warna teks kecil; gunakan `warning` untuk teks. |
| `border-strong` pada `surface` | 3:1 | `border` biasa bersifat dekoratif dan MUST NOT menjadi satu-satunya batas kontrol. |
| Cincin fokus pada permukaan | 3:1 | High-contrast memakai `#0000EE` dengan halo putih 2 px. |

High-contrast memakai polaritas terang sebagai kontrak. Varian gelap high-contrast membalik `bg`/`fg` tetapi tetap memakai cincin `#0000EE` dengan halo kontras. Pada high-contrast, warna status MUST disertai ikon dan label teks agar tidak bergantung pada warna.

## 5. Tipografi

| Keluarga | Penggunaan | Berkas |
|---|---|---|
| Inter | Seluruh teks UI, termasuk label, judul, dan tombol | WOFF2 subset Latin + Latin Extended; target lokasi `apps/studio-web/public/fonts` dan aset Flutter |
| JetBrains Mono | Kode, diff, log, angka teknis, ID | WOFF2 subset Latin, bundel lokal |

Font MUST dimuat dari aset lokal (NFR-SUPPLY-003); tidak ada permintaan CDN. `font-display: block` dipakai karena berkas berada di cache lokal; fallback stack: `Inter, system-ui, -apple-system, "Segoe UI", sans-serif` dan `"JetBrains Mono", ui-monospace, monospace`.

| Token | Ukuran | Line-height | Peran tipikal | Weight default |
|---|---|---|---|---|
| `--mads-font-size-12` | 12 px | 16 px | Caption, metadata, badge | 500 |
| `--mads-font-size-14` | 14 px | 20 px | Body sekunder, label kontrol, kode inline | 400 |
| `--mads-font-size-16` | 16 px | 24 px | Body utama, input | 400 |
| `--mads-font-size-20` | 20 px | 28 px | Judul kartu, subjudul | 600 |
| `--mads-font-size-24` | 24 px | 32 px | Judul layar | 600 |
| `--mads-font-size-28` | 28 px | 36 px | Judul panel besar | 600 |
| `--mads-font-size-32` | 32 px | 40 px | Angka metrik, judul onboarding | 700 |

Weight yang diizinkan: 400, 500, 600, 700. Weight lain MUST NOT dipakai. Kode editor memakai JetBrains Mono 14/20; log memakai 12/16. Line-height MUST berupa nilai token, bukan `normal`, agar tinggi baris konsisten antara web dan Flutter. Angka metrik memakai `font-variant-numeric: tabular-nums`.

## 6. Spacing, Radius, Shadow, Motion

| Kelompok | Token | Nilai |
|---|---|---|
| Spacing | `--mads-space-4` … `--mads-space-64` | 4, 8, 12, 16, 20, 24, 32, 40, 48, 64 px |
| Radius | `--mads-radius-4`, `-8`, `-12`, `-16`, `-24`, `-full` | 4, 8, 12, 16, 24 px; `full` = 9999 px |
| Shadow | `--mads-shadow-0` … `--mads-shadow-3` | 0: tanpa bayangan; 1: `0 1px 2px rgba(28,25,23,0.06)`; 2: `0 4px 12px rgba(28,25,23,0.10)`; 3: `0 12px 32px rgba(28,25,23,0.16)` |
| Motion | `--mads-motion-120`, `-180`, `-240`, `-320` | 120 ms (micro), 180 ms (kontrol), 240 ms (panel), 320 ms (transisi layar) |
| Easing | `--mads-ease-standard` | `cubic-bezier(0.2, 0, 0, 1)` |

Aturan:

- Spacing MUST berasal dari skala; nilai di antaranya MUST NOT dipakai.
- Radius `full` hanya untuk elemen sirkular atau pill; kartu memakai 12 atau 16.
- Shadow 0 adalah default untuk permukaan di dalam panel; shadow 3 hanya untuk modal, sheet, dan PiP.
- Durasi 0 dipaksa saat `prefers-reduced-motion: reduce` (NFR-A11Y-005); transisi yang tersisa MUST hanya perubahan opacity tanpa pergeseran.
- Motion MUST NOT memblokir input; animasi keluar maksimum 180 ms.

## 7. Breakpoint dan Layout

| Breakpoint | Lebar | Navigasi | Grid konten |
|---|---|---|---|
| compact | < 600 px | Tab bar bawah + header | 4 kolom, gutter 16 |
| medium | 600–1023 px | Rail ikon 72 px + panel | 8 kolom, gutter 16 |
| expanded | 1024–1439 px | Sidebar 280 px + rail opsional | 12 kolom, gutter 24 |
| large | ≥ 1440 px | Sidebar 280 px + panel kanan opsional | 12 kolom, gutter 24, konten maksimum 1440 px |

| Konstanta layout | Nilai |
|---|---|
| Lebar sidebar | 280 px |
| Lebar rail | 72 px |
| Lebar maksimum konten | 1440 px |
| Tinggi kontrol minimum | 32 px (desktop), 44 px (sentuh) |
| Target sentuh minimum | 44 × 44 px; batas mutlak 24 × 24 px |
| Lebar dialog | 480 px (`sm`), 640 px (`md`), 800 px (`lg`) |

Konten MUST NOT melebar melewati 1440 px; ruang sisa menjadi margin simetris. Pada compact, sidebar menjadi sheet penuh dan panel properti menjadi sheet bawah. Tabel dan kanban MUST menggulir horizontal, bukan memotong kolom.

## 8. Pemetaan CSS ↔ Flutter

| CSS variable | Flutter (`MadsTheme`) | Tipe Flutter |
|---|---|---|
| `--mads-color-bg` | `MadsColors.bg` | `Color` |
| `--mads-color-surface` | `MadsColors.surface` | `Color` |
| `--mads-color-surface-raised` | `MadsColors.surfaceRaised` | `Color` |
| `--mads-color-fg` | `MadsColors.fg` | `Color` |
| `--mads-color-muted` | `MadsColors.muted` | `Color` |
| `--mads-color-border` | `MadsColors.border` | `Color` |
| `--mads-color-border-strong` | `MadsColors.borderStrong` | `Color` |
| `--mads-color-primary` | `MadsColors.primary` | `Color` |
| `--mads-color-on-primary` | `MadsColors.onPrimary` | `Color` |
| `--mads-color-focus` | `MadsColors.focus` | `Color` |
| `--mads-space-<n>` | `MadsSpace.s<n>` | `double` |
| `--mads-radius-<n>` | `MadsRadius.r<n>` | `double` |
| `--mads-shadow-<n>` | `MadsElevation.e<n>` | `List<BoxShadow>` |
| `--mads-font-size-<n>` | `MadsType.size<n>` | `double` |
| `--mads-line-<n>` | `MadsType.line<n>` | `double` |
| `--mads-weight-<n>` | `MadsType.weight<n>` | `FontWeight` |
| `--mads-motion-<n>` | `MadsMotion.ms<n>` | `Duration` |
| `--mads-ease-standard` | `MadsMotion.standard` | `Cubic` |

`MadsTheme` adalah `ThemeExtension<MadsTheme>` tunggal yang dipasang di `ThemeData.extensions`; widget MUST membaca token melalui `Theme.of(context).extension<MadsTheme>()!` dan MUST NOT mengimpor nilai mentah. Nama field Flutter MUST identik dengan nama token tanpa prefiks `mads`.

## 9. Tema dan Pewarisan Host ke Micro-App

Token mengikuti urutan resolusi berikut, dan setiap langkah MUST menghasilkan set lengkap:

1. **Host theme** — `studio` (default), `high-contrast`, atau `amoled` dipilih pengguna; mode terang/gelap mengikuti OS kecuali dikunci.
2. **Workspace override** — hanya densitas (`comfortable`/`compact`) dan preferensi motion; warna MUST NOT diubah per workspace.
3. **Micro-app** — menerima token aktif yang sudah diresolusi Host saat mount dan setiap kali tema berubah; Host adalah satu-satunya pihak yang boleh meresolusi nilai token.

Aturan yang mengikat:

- Micro-app MUST memperlakukan token sebagai read-only dan MUST NOT mendefinisikan warna, font, atau radius arbitrer (FR-STU-007).
- Micro-app hanya boleh memilih skin dari daftar yang disediakan Host; jika meminta skin tidak dikenal, Host MUST memakai `studio` dan mencatat peringatan.
- Perubahan tema Host MUST berlaku tanpa reload micro-app; renderer MUIP mengganti nilai token pada render berikutnya.
- Dialog consent, permission, dan error Host MUST selalu memakai token Host, bukan token micro-app, agar tidak dapat dipalsukan.
- Studio MUST menampilkan preview dengan token Host aktif, termasuk high-contrast, dan MUST memvalidasi bahwa theme yang diekspor hanya memakai token yang diizinkan.

## 10. Legacy Claymorphism

Gaya claymorphism Phase 0 adalah **skin opsional** bernama `clay`, bukan default. Skin ini hanya mengganti nilai shadow, radius, dan permukaan; struktur, tipografi, dan semantik warna tetap MADS. Skin `clay` MUST NOT dipakai pada dialog consent, permission, error boundary, atau komponen keamanan lain. Penambahan token baru untuk skin ini MUST melalui perubahan dokumen ini, bukan ditambahkan langsung di komponen ([DESIGN.md](../../DESIGN.md) hanya menyimpan banner legacy).

## 11. Validasi dan Gate

| Pemeriksaan | Metode | Gate |
|---|---|---|
| Tidak ada nilai hardcoded | Lint token pada `packages/ui-kit` dan `apps/host-flutter` | Gagal jika menemukan hex, px, atau durasi di luar berkas token |
| Kontras | Uji otomatis seluruh pasangan token per tema | Gagal jika di bawah ambang §4.2 |
| Paritas web–Flutter | Snapshot visual komponen inti pada 4 tema | Gagal jika selisih di luar toleransi 1 px/1 warna |
| Reduced motion | Uji `prefers-reduced-motion` dan setelan Flutter | Gagal jika durasi bukan 0 |
| Katalog | Setiap komponen yang dirender ada di [component-catalog.md](component-catalog.md) | Gagal jika tipe tidak terdaftar |

## 12. Referensi

- [ADR-0010 Design System MADS](../01-architecture/adr/0010-design-system.md)
- [component-catalog.md](component-catalog.md)
- [accessibility.md](accessibility.md)
- [content-i18n.md](content-i18n.md)
- [ui-protocol.md](../03-specs/ui-protocol.md)
- [host-bridge.md](../03-specs/host-bridge.md)
- [nfr.md](../03-specs/nfr.md)
