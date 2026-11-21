---
id: FLOW-03
title: Edit dan Preview
status: accepted
owner: design
prd_refs: ["§4 User Journey", "§5 F3", "§5 F4"]
---

# Edit dan Preview

## 1. Tujuan

Menetapkan alur kerja builder: memilih komponen, menempatkan di canvas, mengatur properti, mengedit teks inline, autosave, undo/redo, dan preview di sandbox yang sama dengan runtime.

Requirement utama: `FR-STUDIO-001`.

## 2. Aktor dan Prasyarat

Aktor: Maker atau Power User. Prasyarat: draft ada di `/studio/[projectId]`. Tidak ada prasyarat jaringan.

## Alur Utama

1. Builder terbuka dengan top bar: kembali, nama inline, status simpan, undo/redo, device switcher, **Preview**, **Bagikan**.
2. Panel kiri menampilkan palette 48 komponen core dengan search dan kategori; toggle **Advanced** menampilkan 120.
3. Pengguna menambah komponen dengan klik atau drag ke canvas. Drop indicator 2 px menunjukkan posisi.
4. Pengguna memilih node; inspector kanan menampilkan tab Content, Style, Layout, Behavior.
5. Perubahan style memilih token clay (warna, radius, shadow, spacing); tidak ada input CSS mentah.
6. Klik kedua pada teks membuka inline edit: `Enter` commit, `Esc` cancel.
7. Autosave berjalan 500 ms setelah perubahan; status berubah Menyimpan → Tersimpan.
8. Undo/redo menyimpan 100 langkah; toast menyebut aksi yang dibatalkan.
9. Pengguna menekan **Preview**. Canvas diganti iframe sandbox; permission consent muncul JIT jika diperlukan.
10. Pengguna dapat mengganti device di preview dan kembali ke edit tanpa kehilangan state.

Di mobile, canvas penuh dan panel menjadi bottom sheet dengan tab **Tambah / Layer / Atur**.

## Cabang Gagal

| Kondisi | Perilaku |
|---|---|
| Drop tidak valid | `E-STUDIO-003`, toast, node kembali ke posisi semula. |
| Autosave gagal | `E-STUDIO-002`, banner retry, antrean dipertahankan, salinan lokal. |
| Dokumen draft rusak | `E-STUDIO-001`, muat versi valid terakhir, tawarkan ekspor. |
| Runtime error di preview | Boundary di dalam iframe, app lain tidak terpengaruh. |
| Permission ditolak | Preview tetap jalan tanpa fitur tersebut; tidak ada retry paksa. |
| Meninggalkan builder saat menyimpan | Guard singkat; draft tetap tersimpan setelah simpan selesai. |

## Acceptance Criteria

1. Menambah, memindah, dan menghapus node dapat dilakukan dengan mouse dan keyboard.
2. Autosave 500 ms terlihat statusnya dan tidak ada tombol Save wajib.
3. Undo/redo mencapai 100 langkah dan tidak kehilangan dokumen.
4. Preview memakai iframe `sandbox="allow-scripts"` dan consent JIT.
5. Tidak ada field CSS mentah di inspector.

## Verifikasi

| Pemeriksaan | Cara |
|---|---|
| Tambah node | Playwright: drag dari palette, cek drop indicator dan hasil. |
| Inline edit | Playwright: Enter commit, Esc cancel. |
| Autosave | Vitest fake timer 500 ms dan status. |
| Undo | Vitest: 101 perubahan, langkah tertua dibuang. |
| Preview | Playwright: iframe sandbox dan consent. |
| Keyboard | Playwright: tambah node tanpa mouse. |

## 7. Referensi

- [02-studio.md](../03-specs/02-studio.md)
- [03-sandbox-runtime.md](../03-specs/03-sandbox-runtime.md)
- [interaction-patterns.md](../02-design/interaction-patterns.md)
