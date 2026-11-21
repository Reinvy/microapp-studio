---
id: SPEC-DATA
title: Data
status: accepted
owner: data
prd_refs: ["§8 Data dan Privasi", "§5 F6"]
---

# Data

## 1. Tujuan

Menetapkan kontrak penyimpanan lokal: host DB SQLite WASM di OPFS, satu DB terisolasi per app, migrasi bernomor, FTS5, kuota, ekspor/impor, isolasi workspace, dan audit. Tidak ada database jaringan, CRDT, atau sinkronisasi.

## 2. Ruang Lingkup

Di dalam: host DB, app DB, worker, migrasi, snapshot, FTS5, kuota, ekspor/impor data app, audit. Di luar: backup terenkripsi ([06-backup.md](06-backup.md)), package ([05-packages.md](05-packages.md)), identitas ([identity-crypto.md](../01-architecture/identity-crypto.md)).

## 3. Requirement

| ID | Level | Requirement | Acceptance |
|---|---|---|---|
| FR-DATA-001 | MUST | Host DB adalah SQLite WASM di OPFS dan hanya diakses melalui worker. | Tidak ada akses SQLite dari main thread; worker menjadi satu-satunya pintu. |
| FR-DATA-002 | MUST | Setiap app mendapat DB terisolasi per workspace. | Query app A tidak dapat membaca tabel app B. |
| FR-DATA-003 | MUST | Nama DB deterministik dari `app_id` dan `workspace_id`. | Nama dapat dihitung ulang dan stabil lintas reload. |
| FR-DATA-004 | MUST | Migrasi bernomor mendukung forward dan rollback. | Migrasi gagal tidak meninggalkan schema setengah jadi. |
| FR-DATA-005 | MUST | Snapshot atomik dibuat sebelum migrasi. | Snapshot dapat dipulihkan bila migrasi gagal. |
| FR-DATA-006 | MUST | FTS5 tersedia untuk pencarian teks pada data app dan host. | Query FTS mengembalikan hit dalam < 100 ms untuk 10k baris. |
| FR-DATA-007 | MUST | Pemakaian dan kuota storage diestimasi dan ditampilkan. | Angka berasal dari `navigator.storage.estimate()` dan ukuran file DB. |
| FR-DATA-008 | MUST | Data app dapat diekspor ke JSON dan CSV. | Ekspor memuat schema version dan checksum. |
| FR-DATA-009 | MUST | Impor data app memvalidasi schema dan checksum sebelum menulis. | File invalid ditolak tanpa mengubah data lama. |
| FR-DATA-010 | MUST | Query lintas workspace ditolak oleh lapisan data. | Workspace id wajib pada setiap query; tidak ada query global implisit. |
| FR-DATA-011 | MUST | Operasi data sensitif dicatat di audit lokal. | Audit memuat operasi, app, waktu, hasil; tanpa nilai record. |
| FR-DATA-012 | MUST | Dexie tidak dipakai untuk data baru; hanya dibaca untuk migrasi. | Tidak ada import Dexie di jalur runtime baru. |

Error yang mengikat: `E-DATA-001` untuk kegagalan buka/migrasi DB, `E-DATA-002` untuk kuota atau tulis yang ditolak.

## 4. Skema Host

| Tabel | Kolom kunci | Catatan |
|---|---|---|
| `local_identity` | `id`, `public_key`, `created_at`, `wrapped_private_key` | Satu baris per instalasi. |
| `workspaces` | `id`, `name`, `created_at` | Default `ws_default`. |
| `installed_microapps` | `id`, `workspace_id`, `name`, `version`, `manifest_json`, `installed_at` | Unik per workspace+app. |
| `app_databases` | `app_id`, `workspace_id`, `file_name`, `schema_version` | Nama file deterministik. |
| `permission_grants` | `app_id`, `permission`, `scope`, `granted_at` | `scope` = once/always. |
| `vault_items` | `id`, `kind`, `wrapped_value`, `updated_at` | Nilai selalu terenkripsi. |
| `audit_log_chain` | `seq`, `actor`, `action`, `target`, `result`, `prev_hash`, `hash` | Rantai hash lokal. |
| `studio_project` | `id`, `name`, `document_json`, `updated_at` | Draft builder. |
| `registry_sources` | `id`, `url`, `public_key`, `added_at` | Index statis opsional. |
| `storage_pins` | `key`, `kind`, `pinned_at` | Cache yang dipertahankan. |
| `notifications` | `id`, `kind`, `payload_json`, `read_at` | Notifikasi lokal. |

Tabel workflow, outbox, CRDT, mutation log, dan server tidak ada dan MUST NOT ditambahkan tanpa ADR baru.

## 5. Migrasi

Migrasi disimpan sebagai file bernomor `NNN_name.sql` dengan pasangan rollback. Aturan:

1. Worker membuka DB, membaca `schema_version`.
2. Jika snapshot belum ada untuk versi saat ini, buat snapshot.
3. Jalankan migrasi dalam transaksi; gagal → rollback penuh dan `E-DATA-001`.
4. Setelah sukses, perbarui `schema_version` dan hapus snapshot sesuai kebijakan retensi.

Migrasi tidak boleh memuat `DROP TABLE` tanpa rollback yang eksplisit dan tidak boleh menyentuh DB app lain.

## 6. Kuota dan Eviction

Browser dapat mengusir storage kapan saja. Shell MUST meminta `navigator.storage.persist()` setelah interaksi pertama yang bermakna, menampilkan estimasi, dan memperingatkan pada 80%. App MUST menangani kegagalan tulis dengan `E-DATA-002` dan menawarkan ekspor. Tidak ada klaim bahwa data tidak dapat dihapus browser.

## 7. Acceptance Criteria

1. Host DB hanya dibuka di worker; main thread tidak memuat SQLite.
2. App A tidak dapat membaca tabel app B.
3. Migrasi gagal mengembalikan schema dan data ke kondisi sebelum migrasi.
4. Ekspor JSON/CSV dapat diimpor ulang dengan checksum valid.
5. Peringatan kuota muncul > 80% dan menawarkan ekspor.

## 8. Verifikasi

| Pemeriksaan | Cara |
|---|---|
| Isolasi DB | Vitest: dua app, query silang gagal. |
| Migrasi | `node scripts/test-migrations.mjs` dan Vitest rollback. |
| Snapshot | Vitest: paksa error di tengah migrasi, bandingkan isi. |
| FTS5 | Vitest: seed 10k baris, ukur query. |
| Ekspor/impor | Vitest: round-trip JSON/CSV, checksum mismatch ditolak `E-DATA-002`. |
| Kuota | Vitest: mock estimate 85%, badge dan peringatan tampil. |
