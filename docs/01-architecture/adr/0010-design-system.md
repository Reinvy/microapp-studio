---
id: ADR-0010
title: ADR-0010 Design System MADS
status: accepted
owner: architecture
prd_refs: ["§3 Modul 2", "§6"]
---

# ADR-0010 Design System MADS

## Konteks

Studio dan Host harus konsisten di web (CSS) dan Flutter (widget), mendukung Light/Dark/AMOLED/High-Contrast, serta mewarisi tema Host ke micro-app. Phase 0 memakai token gelap hardcoded dan gaya claymorphism yang tidak skalabel ke 120 komponen.

## Keputusan

1. **MADS (MicroApp Design System)** menjadi satu-satunya sumber token dan komponen.
2. **Web memakai CSS custom properties**; Flutter memakai `ThemeExtension` dengan nama token identik.
3. **Default theme "Studio"** dengan palet netral dan aksen teal/amber. Claymorphism menjadi skin opsional, bukan default.
4. **Tidak ada warna, ukuran, radius, shadow, atau durasi hardcoded** di komponen; semua melalui token.
5. **Skala:** spacing 4/8/12/16/20/24/32/40/48/64; radius 4/8/12/16/24/full; motion 120/180/240/320 ms dengan easing `cubic-bezier(0.2,0,0,1)`; reduced-motion memaksa 0.
6. **Breakpoint:** compact < 600, medium 600–1023, expanded 1024–1439, large ≥ 1440; sidebar 280, rail 72, max content 1440.
7. **Katalog 120 komponen** dengan ID `MADS-<CAT>-<NN>`; setiap komponen memiliki state wajib dan catatan a11y.
8. **Theme inheritance:** micro-app mewarisi token Host; manifest hanya boleh memilih varian tema yang diizinkan, bukan mendefinisikan warna arbitrer.
9. Tipografi Inter (UI) dan JetBrains Mono (kode), dibundel lokal.

## Konsekuensi

- Satu bahasa desain untuk web dan native; review desain dapat membandingkan token, bukan screenshot.
- Micro-app tidak dapat memalsukan UI Host, sehingga consent dan permission dialog selalu dapat dipercaya.
- Katalog besar menuntut disiplin: komponen tanpa entri katalog ditolak.
- Migrasi dari claymorphism Phase 0 memerlukan pemetaan token.

## Alternatif

| Alternatif | Alasan ditolak |
|---|---|
| Dua design system (web dan Flutter) | Divergensi visual dan biaya ganda. |
| Tailwind config sebagai sumber token | Tidak dapat dipakai Flutter; token harus netral platform. |
| Mempertahankan claymorphism | Tidak memenuhi high-contrast dan konsistensi 120 komponen. |
| Theme bebas per micro-app | Memungkinkan spoofing UI Host dan merusak a11y. |

## Status

`accepted`. Token dan katalog ada di [02-design/design-system.md](../../02-design/design-system.md) dan [02-design/component-catalog.md](../../02-design/component-catalog.md).
