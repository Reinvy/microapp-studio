---
id: FLOW-02
title: Create App
status: accepted
owner: design
prd_refs: ["§4 User Journey", "§5 F2"]
---

# Create App

## 1. Tujuan

Menetapkan tiga jalur pembuatan micro-app yang semuanya berakhir di builder dengan draft tersimpan, tanpa wizard, tanpa modal nama project, dan tanpa langkah yang dapat dihapus.

Requirement utama: `FR-CREATE-001`.

## 2. Aktor dan Prasyarat

Aktor: Maker atau Power User. Prasyarat: Home terbuka dan identitas lokal tersedia (atau mode `ephemeral`). AI opsional dan tidak pernah menjadi prasyarat.

## Alur Utama

### 3.1 Jalur Template

1. Pengguna memilih kartu **Template** di Home atau route `/templates`.
2. Galeri menampilkan kategori dan pencarian.
3. Pengguna membuka preview template: satu layar contoh, data contoh, dan permission yang diminta.
4. Pengguna menekan **Pakai template**.
5. Draft dibuat dengan nama otomatis dan sample data, lalu builder terbuka.

### 3.2 Jalur Magic Create

1. Pengguna memilih kartu **Magic Create** atau `/create?mode=ai`.
2. Satu textarea tampil dengan chip contoh: kasir, daftar tugas, inventaris, survey.
3. Pengguna menulis prompt dan menekan **Buat** atau `Cmd/Ctrl+Enter`.
4. Host memeriksa provider. Jika belum ada API key, dua tombol tampil: **Atur AI** dan **Gunakan template**.
5. Jika provider tersedia, rencana singkat (layar, data, aksi) ditampilkan.
6. Pengguna memilih **Buat aplikasi** atau **Ubah**.
7. Draft dibuat dari rencana dan builder terbuka.

### 3.3 Jalur Blank

1. Pengguna memilih kartu **Mulai kosong** atau `/create?mode=blank`.
2. Pengguna memilih satu layout: Form, List, atau Dashboard.
3. Draft dengan satu layar contoh dibuat dan builder terbuka.

## Cabang Gagal

| Kondisi | Perilaku |
|---|---|
| Prompt kosong atau > 2000 karakter | `E-CREATE-001`, fokus kembali ke textarea. |
| Provider belum dikonfigurasi | `E-CREATE-002`, fallback template/blank tetap aktif. |
| Generate gagal/timeout | `E-CREATE-003`, tampilkan coba lagi dan fallback. |
| Template tidak dapat dimuat | Toast, tetap di galeri, tidak ada draft setengah jadi. |
| Pengguna menekan Esc | Kembali ke Home; draft yang sudah dibuat tetap tersimpan. |
| Kuota storage penuh | `E-DATA-002`, tawarkan ekspor dan bersihkan cache. |

## Acceptance Criteria

1. Ketiga jalur mencapai builder ≤ 3 klik dari Home.
2. Draft selalu tersimpan sebelum builder tampil.
3. Tidak ada modal nama project; nama dibuat otomatis dan dapat diubah inline.
4. Tanpa API key, pengguna tetap dapat membuat app lewat template atau blank.
5. Membatalkan create tidak menghapus draft yang sudah dibuat.

## Verifikasi

| Pemeriksaan | Cara |
|---|---|
| Template | Playwright: pilih template, preview, pakai, cek draft dan sample data. |
| Magic Create | Playwright dengan mock provider: prompt, rencana, buat, builder. |
| Tanpa key | Playwright: provider kosong, dua fallback tampil. |
| Blank | Playwright: tiga layout, satu layar contoh. |
| Hitungan klik | Instrumentasi Playwright menghitung klik sampai builder. |
| Error AI | Vitest: provider 500, `E-CREATE-003`, fallback tetap bisa. |

## 7. Referensi

- [02-studio.md](../03-specs/02-studio.md)
- [ai-assist.md](../01-architecture/ai-assist.md)
- [templates](../../docs/README.md)
