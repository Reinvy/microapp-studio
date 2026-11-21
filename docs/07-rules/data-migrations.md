---
id: RULE-DATA
title: Rules Data dan Migrasi
status: accepted
owner: data
prd_refs: ["§8"]
---

# Rules Data dan Migrasi

Aturan ini mengikat seluruh penyimpanan lokal: SQLite WASM di OPFS, database per app, FTS5, ekspor/impor, dan migrasi. Kontrak lengkap ada di [04-data.md](../03-specs/04-data.md) dan keputusan arsitektur di [ADR-0018](../01-architecture/adr/0018-browser-local-first-data.md). Tidak ada CRDT, sinkronisasi antar perangkat, atau server data; backup terenkripsi adalah satu-satunya jalur pemindahan data.

## 1. Tujuan dan Ruang Lingkup

| Aspek | Kontrak |
|---|---|
| Mesin | SQLite WASM yang dijalankan di worker, disimpan di OPFS. |
| Isolasi | Satu database host dan satu database per app per workspace. |
| Migrasi | Bernomor, dapat di-rollback, dengan snapshot sebelum eksekusi. |
| Pencarian | FTS5 untuk teks; tidak ada pemindaian penuh untuk pencarian. |
| Transfer | Ekspor/impor JSON/CSV dan `.mapp-backup` terenkripsi. |

Di luar cakupan: format package (lihat [05-packages.md](../03-specs/05-packages.md)) dan backup terenkripsi (lihat [06-backup.md](../03-specs/06-backup.md)).

## 2. Prinsip

1. **Data pengguna adalah milik pengguna.** Selalu ada jalur ekspor tanpa enkripsi dan tanpa jaringan.
2. **Satu penulis.** Setiap database hanya ditulis oleh worker pemiliknya; tidak ada akses lintas worker.
3. **Migrasi tidak boleh kehilangan data.** Snapshot dan transaksi wajib sebelum perubahan skema.
4. **Deterministik.** ID dan urutan waktu stabil agar test dan ekspor dapat dibandingkan.

## 3. Aturan

| ID | Level | Aturan | Verifikasi |
|---|---|---|---|
| RULE-DATA-001 | MUST | ID entitas baru memakai UUIDv7 yang dihasilkan helper tunggal; ID berurutan yang dapat ditebak dilarang sebagai kunci publik. | Unit test helper |
| RULE-DATA-002 | MUST | Waktu disimpan sebagai epoch milidetik UTC. Waktu lokal hanya untuk tampilan; konversi memakai `Intl` dengan zona pengguna. | Review skema |
| RULE-DATA-003 | MUST | SQLite WASM dan OPFS diakses hanya dari worker melalui RPC bertipe. Main thread dilarang menyentuh handle OPFS atau menjalankan query sinkron. | Review, profil INP |
| RULE-DATA-004 | MUST | Setiap app mendapat database sendiri per workspace dengan nama deterministik dari `app_id` dan `workspace_id`; app tidak dapat membuka database app lain. | Test isolasi, FR-DATA-002 |
| RULE-DATA-005 | MUST | Migrasi bernomor berurutan, idempoten, dan memiliki skrip rollback. Migrasi yang sudah pernah dirilis tidak boleh diedit; perbaikan dibuat sebagai migrasi baru. | Test migrasi forward/rollback |
| RULE-DATA-006 | MUST | Snapshot database dibuat sebelum migrasi dijalankan; bila migrasi gagal, snapshot dipulihkan dan error dilaporkan. | Test kegagalan migrasi |
| RULE-DATA-007 | MUST | Setiap migrasi berjalan dalam satu transaksi dan selesai tanpa menunggu input pengguna. Transaksi tidak boleh terbuka melintasi interaksi UI. | Review, test |
| RULE-DATA-008 | MUST | Skema memakai `NOT NULL` untuk kolom wajib, foreign key aktif, dan indeks untuk kolom filter/sort yang dipakai UI. | Review skema, query plan |
| RULE-DATA-009 | MUST | Pencarian teks memakai tabel FTS5 dengan strategi rebuild yang terdokumentasi; `LIKE '%...%'` untuk pencarian penuh dilarang. | Test pencarian, FR-DATA-006 |
| RULE-DATA-010 | MUST | Ekspor dan impor data memuat `schemaVersion`, divalidasi sebelum apply, dan menolak versi yang tidak dikenal tanpa mengubah data. | Test impor tidak valid |
| RULE-DATA-011 | MUST | Dexie/IndexedDB tidak dipakai untuk data baru. Data lama dibaca sekali lewat alur migrasi read-only di [FLOW-08](../04-flows/08-migration.md); penghapusan hanya setelah konfirmasi pengguna. | Test migrasi, FR-DATA-012 |
| RULE-DATA-012 | MUST | Pemakaian storage diestimasi dan diperingatkan pada 80% kuota; penulisan yang gagal dilaporkan ke pengguna, tidak pernah dibuang diam-diam. | Test kuota, FR-SHELL-012 |
| RULE-DATA-013 | MUST | Setiap query difilter oleh `workspace_id` pada database host; penulisan lintas workspace dilarang dan dicatat sebagai audit. | Test isolasi |
| RULE-DATA-014 | MUST | Tidak ada replikasi, CRDT, atau sinkronisasi antar perangkat. Satu perangkat adalah sumber kebenaran; pemindahan data hanya melalui ekspor atau backup terenkripsi. | Review arsitektur |

## 4. Tata Cara Migrasi

1. Tambahkan berkas migrasi baru dengan nomor berikutnya; jangan mengubah berkas lama.
2. Tulis langkah `up` dan `down`; keduanya diuji pada fixture berisi data representatif.
3. Ambil snapshot, jalankan migrasi dalam transaksi, lalu perbarui versi skema hanya bila sukses.
4. Catat migrasi di changelog internal dan matrix bila mengubah requirement.
5. Sertakan test yang menjalankan seluruh rantai migrasi dari versi kosong dan dari versi sebelumnya.

## 5. Anti-pola

| Anti-pola | Risiko |
|---|---|
| Query langsung di komponen | Blocking main thread dan bypass isolasi. |
| `ATTACH DATABASE` untuk menulis lintas app | Merusak isolasi. |
| Menghapus tabel lama tanpa ekspor | Kehilangan data permanen. |
| Menyimpan blob besar di IndexedDB | Kuota tidak terpantau dan sulit diekspor. |
| Mengandalkan `Date.now()` di dalam migrasi | Hasil tidak deterministik saat diuji ulang. |

## 6. Verifikasi

| Langkah | Perintah | Lulus bila |
|---|---|---|
| Forward/rollback | `npm test` pada paket data | Rantai migrasi lulus dari versi kosong dan sebelumnya. |
| Isolasi | Test multi-workspace | Tidak ada query yang membaca app/workspace lain. |
| Ekspor/impor | Test round-trip | Data identik dan `schemaVersion` valid. |
| Kuota | Simulasi penuh | Peringatan tampil dan penulisan gagal dilaporkan. |

## 7. Pengecualian

Pengecualian pada RULE-DATA MUST disetujui reviewer `data`. RULE-DATA-004, RULE-DATA-006, dan RULE-DATA-013 tidak dapat dikecualikan karena melindungi isolasi dan integritas data.
