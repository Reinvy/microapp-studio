---
id: ADR-0021
title: "ADR-0021: MADS v3 Claymorphism Design System"
status: accepted
owner: design
prd_refs: ["§6", "§9"]
---

# ADR-0021: MADS v3 Claymorphism Design System

## Konteks

Antarmuka harus terasa tenang, taktil, dan konsisten di seluruh layar tanpa mengorbankan aksesibilitas atau performa. Arah visual sebelumnya memakai token teal/neutral yang netral dan datar, belum memiliki bahasa material yang khas. Claymorphism dipilih sebagai bahasa visual: permukaan lembut dengan radius besar, highlight atas, bayangan dalam bawah, dan bayangan luar hangat.

Kebutuhan yang mengikat:

1. Satu sumber token yang dipakai komponen, layar, dan dokumentasi.
2. Tidak ada nilai visual hardcoded pada komponen.
3. Kontras teks memenuhi WCAG 2.2 AA.
4. Gerakan tidak memblokir input dan dihilangkan saat `prefers-reduced-motion`.
5. Efek hanya memakai properti murah: `box-shadow`, `transform`, `opacity`, dan `filter` ringan.

## Keputusan

1. Design system bernama **MADS v3 Clay** dengan prefiks variabel CSS **`--mads-`**. Prefiks dipertahankan agar implementasi tidak memerlukan rename total.
2. Token berlapis tiga: **primitive → semantic → component**. Primitive menyimpan nilai mentah (warna, radius, durasi); semantic memberi peran (bg, surface, fg, muted, border, primary, success, warning, error, focus); component hanya merujuk token semantic dan primitive yang disetujui.
3. Warna light memakai latar hangat `#F3EEE7`, surface `#FFFBF5`, teks `#2A2233`, primary `#5B4B8A`, accent `#D96C4A`. Dark memakai latar `#1B1724`, surface `#262131`, teks `#F7F2EA`, primary `#C9B8FF`. High-contrast memakai latar putih, teks hitam, primary `#1A1AFF`.
4. Tint clay mint `#BFE3D0`, lilac `#D9CCF2`, peach `#F7C8B8`, butter `#F7E3A1`, dan sky `#C5DFF7` hanya untuk area dan blob dekoratif, bukan teks kecil.
5. Radius memakai skala `--mads-radius-clay-sm` 14 px, `md` 20 px, `lg` 28 px, `xl` 36 px, dan `full` 9999 px. Bayangan memakai token `--mads-clay-shadow-1` sampai `3` serta `pressed`; komponen tidak menulis `box-shadow` langsung.
6. Motion memakai durasi 120/180/240/320 ms dengan easing `cubic-bezier(.34,1.56,.64,1)` untuk pegas clay dan `cubic-bezier(.2,0,0,1)` untuk standar. Press 90 ms, hover 180 ms, enter 240 ms, page 320 ms.
7. **Aksesibilitas adalah bagian dari token**: teks normal minimal 4.5:1, teks besar 3:1, batas kontrol 3:1, focus ring 3 px dengan offset 2 px, target sentuh 44×44 px, dan warna tidak menjadi satu-satunya pembeda status.
8. Status surface dihitung dengan `color-mix` dari warna status dan surface, bukan nilai hardcoded; high-contrast memakai surface status netral.
9. `prefers-reduced-motion: reduce` memaksa durasi transform menjadi 0 ms dan menghapus blob animation serta confetti.
10. `DESIGN.md` adalah sumber visual kanonik; [design-system](../../02-design/design-system.md) adalah kontrak token dan implementasi. Jika nilai berbeda, `DESIGN.md` menang.

Rujukan: [DESIGN.md](../../../DESIGN.md), [component-catalog](../../02-design/component-catalog.md), [accessibility](../../02-design/accessibility.md).

## Konsekuensi

- Setiap komponen baru wajib memiliki entri katalog dan memakai token; nilai hardcoded ditolak pada review.
- Perubahan token berdampak luas dan harus melalui RFC serta uji regresi visual.
- Bayangan berlapis menambah biaya komposit; jumlah elemen berbayang dalam satu layar dibatasi.
- Tema dark dan high-contrast harus diuji untuk setiap layar, bukan hanya tema light.
- Dokumentasi visual dan implementasi dapat menyimpang bila tidak diperiksa; perbandingan token menjadi bagian dari gate.

## Alternatif

| Alternatif | Alasan ditolak |
|---|---|
| Glassmorphism | Transparansi menurunkan kontras dan performa; sulit dibaca di latar sibuk. |
| Flat material tanpa bayangan | Kehilangan afordansi taktil yang menjadi inti pengalaman. |
| Token per komponen tanpa lapisan semantic | Duplikasi nilai dan perubahan tema menjadi mahal. |
| Animasi berbasis layout | Memicu reflow dan melanggar anggaran interaksi. |
| Prefiks baru selain `--mads-` | Rename besar tanpa manfaat produk. |

## Verifikasi

1. Pemeriksaan token memastikan tidak ada `box-shadow`, `border-radius`, atau hex langsung pada komponen.
2. Uji kontras otomatis mencakup pasangan teks, surface, border, dan focus pada light, dark, dan high-contrast.
3. Uji `prefers-reduced-motion` memastikan tidak ada transform atau animasi blob.
4. Uji keyboard memastikan focus ring terlihat dan urutan fokus logis.
5. Regresi visual mencakup komponen core pada ketiga tema dan tiga breakpoint.
