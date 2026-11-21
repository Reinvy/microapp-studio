---
id: FLOW-08
title: Migrasi Phase 0
status: accepted
owner: data
prd_refs: ["§8 Data dan Privasi", "§10 Roadmap"]
---

# Migrasi Phase 0

## 1. Tujuan

Menetapkan alur migrasi data lama Dexie v6 ke SQLite WASM/OPFS: deteksi, impor read-only, idempoten, ekspor sebelum/sesudah, dan penghapusan hanya setelah konfirmasi eksplisit.

Requirement utama: `FR-DATA-004`.

## 2. Aktor dan Prasyarat

Aktor: pengguna lama yang membuka versi baru. Prasyarat: database Dexie v6 ada di origin yang sama.

## Alur Utama

1. Boot mendeteksi Dexie v6 yang belum dimigrasikan.
2. Banner "Data lama ditemukan" tampil dengan aksi **Impor** dan **Nanti**.
3. Pengguna memilih Impor. Host membuka Dexie dalam mode read-only.
4. Setiap record dipetakan: `apps` → `studio_project`, `content` → dokumen draft, `runHistory` → arsip.
5. Impor dijalankan idempoten dengan `legacy_record_map`; record yang sudah dimigrasikan dilewati.
6. Ringkasan hasil ditampilkan: jumlah project, record, dan item yang dilewati.
7. **Ekspor dulu** tersedia sebelum penghapusan.
8. Penghapusan Dexie hanya berjalan setelah pengguna mengetik konfirmasi.
9. Jika pengguna memilih Nanti, banner tetap dapat dibuka dari Settings → Data.

## Cabang Gagal

| Kondisi | Perilaku |
|---|---|
| Dexie tidak dapat dibuka | `E-DATA-001`, data lama tidak disentuh, retry. |
| Sebagian record invalid | Transaksi rollback; data lama utuh; laporkan jumlah. |
| Ruang tidak cukup | `E-DATA-002`, tawarkan bersihkan cache, jangan hapus sumber. |
| Migrasi dijalankan dua kali | Idempoten; tidak ada duplikat. |
| Pengguna menolak hapus | Dexie dipertahankan; tidak ada perubahan destruktif. |
| Tab lain menulis Dexie | Impor membaca snapshot; perubahan setelah impor dilaporkan. |

## Acceptance Criteria

1. Impor tidak pernah menulis ke Dexie.
2. Menjalankan impor dua kali tidak menghasilkan duplikat.
3. Penghapusan Dexie memerlukan konfirmasi eksplisit dan menawarkan ekspor.
4. Kegagalan sebagian tidak mengubah data lama.
5. Ringkasan hasil akurat.

## Verifikasi

| Pemeriksaan | Cara |
|---|---|
| Deteksi | Vitest: seed Dexie v6, boot mendeteksi. |
| Idempoten | Vitest: impor dua kali, jumlah sama. |
| Rollback | Vitest: satu record invalid, tidak ada tulisan. |
| Konfirmasi | Playwright: hapus tanpa konfirmasi ditolak. |
| Ekspor | Playwright: ekspor tersedia sebelum hapus. |

## 7. Referensi

- [04-data.md](../03-specs/04-data.md)
- [ADR-0018](../01-architecture/adr/0018-browser-local-first-data.md)
- [implementation-status.md](../00-foundation/implementation-status.md)
