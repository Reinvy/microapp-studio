---
id: ADR-0018
title: "ADR-0018: Data Local-First di Browser"
status: accepted
owner: architecture
prd_refs: ["§8", "§7"]
---

# ADR-0018: Data Local-First di Browser

## Konteks

Produk tidak memiliki backend, sehingga seluruh data harus tinggal di perangkat pengguna dan tetap dapat diakses setelah reload maupun offline. Browser menyediakan beberapa mekanisme penyimpanan dengan karakter berbeda: IndexedDB untuk objek terstruktur, OPFS untuk berkas, dan Cache Storage untuk aset. Data micro-app bersifat relasional, membutuhkan query, indeks, migrasi, dan pencarian teks.

Kebutuhan yang mengikat:

1. Satu sumber kebenaran untuk data host dan data per app.
2. Isolasi antar app dan antar workspace.
3. Migrasi bernomor dengan snapshot sebelum perubahan.
4. Pencarian teks penuh tanpa layanan eksternal.
5. Tidak ada data yang meninggalkan perangkat tanpa aksi eksplisit pengguna.

## Keputusan

1. **SQLite WASM adalah mesin data kanonik**, dijalankan di dalam Web Worker dan dipersistenkan ke OPFS. UI tidak pernah menyentuh handle database secara langsung.
2. Setiap app memiliki database terisolasi per workspace. Nama database deterministik dari pasangan `app_id` dan `workspace_id`, sehingga tidak ada tabrakan dan tidak ada query lintas workspace.
3. **IndexedDB hanya dipakai untuk `CryptoKey` non-extractable dan metadata kecil** yang tidak dapat disimpan di SQLite (misalnya penanda migrasi dan status worker). IndexedDB bukan tempat data domain.
4. **Dexie tidak dipakai untuk data baru.** Dexie hanya dibaca pada migrasi fase 0 untuk memindahkan data lama, lalu tidak ditulis lagi.
5. Skema host memuat `local_identity`, `workspaces`, `installed_microapps`, `app_databases`, `permission_grants`, `vault_items`, `audit_log_chain`, `studio_project`, `registry_sources`, `storage_pins`, dan `notifications`.
6. Migrasi bernomor bersifat forward dan rollback; sebelum migrasi dijalankan, dibuat snapshot atomik. Migrasi yang gagal tidak meninggalkan database setengah berubah.
7. Pencarian memakai FTS5 pada tabel yang dideklarasikan. Tidak ada indeks pencarian di server.
8. Kuota penyimpanan diestimasi dan ditampilkan; pengguna mendapat peringatan sebelum ruang habis. Eviction browser diperlakukan sebagai risiko yang dimitigasi lewat ekspor, bukan diasumsikan tidak terjadi.
9. Semua operasi data sensitif dicatat pada audit chain lokal.

Rujukan kontrak: [data-model](../data-model.md), [spec data](../../03-specs/04-data.md), [ADR-0022](0022-deferred-recovery-onboarding.md) untuk perlakuan kunci.

## Konsekuensi

- Data hanya ada di perangkat; kehilangan storage berarti kehilangan data kecuali pengguna memiliki backup.
- Worker menjadi jalur wajib; semua API data harus asinkron dan dapat gagal.
- Ukuran database dan performa query dibatasi kemampuan browser, sehingga pagination dan indeks wajib.
- Migrasi harus deterministik dan diuji dengan fixture nyata.
- Tidak ada sinkronisasi otomatis antar tab atau perangkat; konsistensi antar tab dijaga lewat koordinasi worker dan lock.
- Penyimpanan `CryptoKey` di IndexedDB membuat kunci tidak dapat diekspor; pemulihan bergantung pada frasa pemulihan atau backup terenkripsi.

## Alternatif

| Alternatif | Alasan ditolak |
|---|---|
| IndexedDB/Dexie sebagai penyimpanan utama | Tidak mendukung SQL, join, FTS5, dan migrasi terstruktur dengan baik. |
| `localStorage` | Sinkron, kecil, dan tidak cocok untuk data relasional. |
| Database di server | Melanggar local-first dan zero-account. |
| Cache Storage untuk data | Hanya untuk respons HTTP, bukan transaksi. |
| Satu database bersama untuk semua app | Melanggar isolasi dan menyulitkan ekspor per app. |

## Verifikasi

1. Uji integrasi memastikan worker membuka database dari OPFS dan menolak akses lintas workspace.
2. Uji migrasi memastikan snapshot dibuat dan rollback bekerja saat migrasi gagal.
3. Audit kode memastikan tidak ada penulisan Dexie baru dan tidak ada data domain di IndexedDB.
4. Uji FTS5 mencakup pencarian lintas app, project, dan record.
5. Uji kuota memastikan peringatan muncul sebelum penyimpanan penuh.
