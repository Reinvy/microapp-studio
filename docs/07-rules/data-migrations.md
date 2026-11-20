---
id: RULE-DATA
title: Aturan Data dan Migrasi
status: accepted
owner: data
prd_refs: ["§4.4", "§3 Modul 4"]
---

# Aturan Data dan Migrasi

Aturan ini berlaku untuk database host, database per micro-app, ledger migrasi, CRDT, backup, dan pemetaan ke PostgreSQL. Model dan katalog tabel ada di [data-model.md](../01-architecture/data-model.md); requirement perilaku ada di [04-data-automation.md](../03-specs/04-data-automation.md).

## 1. Cakupan

| Area | Kewajiban utama |
|---|---|
| Identitas record | UUIDv7, app ID reverse-DNS, Site ID, timestamp UTC |
| Penyimpanan | Satu sumber SQLite, tanpa Dexie untuk data baru |
| Migrasi | Forward + rollback, ledger, snapshot, transaksi |
| CRDT | HLC, LWW per kolom, conflict history, tombstone |
| Enkripsi | SQLCipher native, field-level AES-GCM di web |
| Indeks | FTS5 dan sqlite-vec dibangun ulang |
| Backup | Verifikasi, restore aman, tanpa data loss |

## 2. Aturan

### 2.1 Identitas dan Nilai

| ID | Level | Aturan | Konsekuensi |
|---|---|---|---|
| RULE-DATA-001 | MUST | Primary key record MUST `TEXT` berisi UUIDv7 lowercase 36 karakter; ID acak non-monotonik dan `AUTOINCREMENT` untuk ID domain dilarang. | Penggabungan lintas perangkat tidak deterministik; test data gagal. |
| RULE-DATA-002 | MUST | `app_id` MUST reverse-DNS sesuai regex `^[a-z][a-z0-9]*(\.[a-z][a-z0-9-]*)+$` dan MUST sama dengan `id` manifest. | Tabrakan antar-registry; instalasi ditolak. |
| RULE-DATA-003 | MUST | Site ID MUST 16 byte acak kriptografis, disimpan sebagai `BLOB`, dan ditampilkan base32 tanpa padding; Site ID MUST NOT diturunkan dari kunci identitas. | Site ID dapat ditebak atau berubah saat rotasi; pairing gagal. |
| RULE-DATA-004 | MUST | Timestamp MUST `INTEGER` epoch milidetik UTC; tanggal lokal, string tanggal, dan float waktu dilarang. | Urutan dan sinkronisasi kacau; query lintas zona waktu salah. |
| RULE-DATA-005 | MUST | Uang dan desimal MUST disimpan sebagai integer unit terkecil atau `TEXT` desimal; `REAL`/floating point untuk nilai finansial dilarang. | Galat pembulatan; data tidak dapat direkonsiliasi. |
| RULE-DATA-006 | MUST | Boolean MUST `INTEGER` 0/1 dengan `CHECK (kolom IN (0,1))`; JSON MUST `TEXT` kanonik RFC 8785 dengan `CHECK (json_valid(kolom))`. | Data tidak valid masuk dan hash tidak stabil; migrasi gagal. |

### 2.2 Sumber Data dan Enkripsi

| ID | Level | Aturan | Konsekuensi |
|---|---|---|---|
| RULE-DATA-007 | MUST | Data baru MUST disimpan di SQLite WASM + OPFS (web) atau SQLite native; Dexie/IndexedDB hanya boleh dipakai sebagai jembatan impor Phase 0 dan MUST NOT menjadi sumber data kedua. | Dua sumber data menyimpang; PR arsitektur ditolak. |
| RULE-DATA-008 | MUST | Database micro-app MUST terisolasi per `app_id` dan workspace; `ATTACH`, akses lintas app, dan query lintas database dilarang. | Data app bocor ke app lain; security test gagal. |
| RULE-DATA-009 | MUST | Native (Android/iOS/desktop) MUST memakai SQLCipher full-file; web MUST memakai AES-256-GCM field-level untuk kolom sensitif dan `vault_items`, dan MUST NOT mengklaim proteksi setara native. | Klaim keamanan palsu atau data sensitif plaintext; audit gagal. |
| RULE-DATA-010 | MUST | Kolom sensitif MUST ditandai di schema dan dienkripsi sebelum ditulis; envelope MUST memakai subkey yang benar dan AAD yang mengikat tabel, baris, dan versi schema. | Plaintext muncul di file/backup; test enkripsi gagal. |
| RULE-DATA-011 | MUST | `vault_items` MUST selalu terenkripsi, dan kunci vault MUST dibuka hanya setelah biometrik/PIN dengan auto-lock 5 menit. | Vault dapat dibaca tanpa autentikasi; blocker keamanan. |
| RULE-DATA-012 | MUST | Rotasi kunci MUST mengenkripsi ulang nilai dalam satu transaksi dan MUST NOT mendekripsi nilai lama setelah rotasi selesai kecuali untuk rollback yang diotorisasi. | Data tidak dapat dipulihkan atau kunci lama tetap berlaku; PR ditolak. |

### 2.3 Migrasi dan Versioning

| ID | Level | Aturan | Konsekuensi |
|---|---|---|---|
| RULE-DATA-013 | MUST | Versi schema MUST dilacak dengan `PRAGMA user_version` dan tabel `schema_migrations` yang mencatat `version`, `name`, `checksum`, `applied_at_ms`, dan `rollback_sql`. | Versi tidak dapat diaudit dan migrasi dapat diulang; startup gagal. |
| RULE-DATA-014 | MUST | Setiap perubahan schema MUST menghasilkan migrasi forward dan rollback bernomor di `db/migrations/`; migrasi satu arah dilarang. | Rollback tidak mungkin; E-DATA-002 tidak dapat dipulihkan. |
| RULE-DATA-015 | MUST | Migrasi MUST diuji pada fixture database versi lama; forward, rollback, dan data hasil MUST dibandingkan sebelum migrasi dianggap sah. | Migrasi merusak data produksi; PR data ditolak. |
| RULE-DATA-016 | MUST | Snapshot atomik MUST dibuat sebelum migrasi destruktif (rename/drop/backfill besar) dan hash snapshot MUST dicatat. | Kegagalan migrasi menghapus data permanen; blocker. |
| RULE-DATA-017 | MUST | Migrasi MUST dijalankan dalam satu transaksi, idempoten setelah crash, dan MUST gagal tertutup tanpa membuat database kosong bila database tidak dapat dibuka. | Database kosong menimpa data; E-DATA-001 dilanggar. |
| RULE-DATA-018 | MUST | Drop tabel/kolom berisi data pengguna MUST NOT dilakukan tanpa ekspor lebih dulu; penghapusan pengguna MUST memakai soft delete (`deleted_at_ms`) dan konfirmasi kedua. | Kehilangan data permanen; blocker data. |
| RULE-DATA-019 | MUST | Setelah migrasi yang mengubah kolom terindeks atau setelah restore, FTS5 dan sqlite-vec MUST dibangun ulang dan hasilnya diverifikasi. | Pencarian mengembalikan hasil basi; test pencarian gagal. |
| RULE-DATA-020 | MUST | Migrasi yang tidak kompatibel dengan peer lama MUST ditempatkan di `crdt_schema_staging` dan MUST NOT diterapkan ke tabel aktif sampai seluruh peer mendukung versi tersebut. | Skema korup saat sync; E-DATA-003 dilanggar. |

### 2.4 CRDT, Backup, dan Pemetaan Server

| ID | Level | Aturan | Konsekuensi |
|---|---|---|---|
| RULE-DATA-021 | MUST | HLC MUST 48-bit milidetik + 16-bit counter + 16 byte Site ID, diurutkan leksikografis; konflik MUST diselesaikan LWW per kolom dan nilai yang kalah MUST dicatat di `conflict_history`. | Konflik hilang tanpa jejak; property test gagal. |
| RULE-DATA-022 | MUST | Delete MUST direpresentasikan sebagai tombstone (`value_json IS NULL`), bukan penghapusan baris, agar propagasi deterministik. | Data terhapus muncul kembali setelah sync; test konvergensi gagal. |
| RULE-DATA-023 | MUST | Backup MUST memverifikasi hash konten dan `PRAGMA integrity_check` sebelum dianggap sah; restore MUST hanya ke `app_id` yang sama setelah verifikasi signature dan `content_hash`. | Backup rusak menimpa data sehat; gate backup gagal. |
| RULE-DATA-024 | MUST | Backup MUST NOT memuat mnemonic, kunci privat, atau token sesi; snapshot terenkripsi hanya boleh dibuka dengan recovery phrase atau passkey PRF yang sah. | Kunci bocor melalui backup; blocker keamanan. |
| RULE-DATA-025 | MUST | Data yang dibuat pengguna MUST NOT dihapus otomatis oleh pembersihan cache atau retensi; hanya data turunan/operasional yang boleh dipangkas. | Kehilangan data tanpa consent; blocker. |
| RULE-DATA-026 | MUST | Pemetaan SQLite ke PostgreSQL MUST mempertahankan tipe: UUIDv7 → `UUID`, epoch ms → `TIMESTAMPTZ` UTC, JSON kanonik → `JSONB`, BLOB → `BYTEA`; FTS5 dan `vec0` MUST dibangun ulang sebagai `tsvector`/`pgvector`. | Query dan hash berbeda antar-backend; migrasi server gagal. |

## 3. Pengecualian dan Penegakan

1. Perubahan schema pengguna MUST melalui [write-db-migration](../06-skills/write-db-migration/SKILL.md) dan RFC bila menyentuh kontrak data atau sync.
2. Migrasi yang sudah diterapkan MUST NOT diedit; buat migrasi baru dan pertahankan checksum lama.
3. Test migrasi dan restore MUST dijalankan pada salinan database, bukan pada data pengguna nyata.
4. Pelanggaran RULE-DATA-009, RULE-DATA-011, RULE-DATA-016, RULE-DATA-018, atau RULE-DATA-024 MUST NOT diberi pengecualian sementara.

## 4. Referensi

- [data-model.md](../01-architecture/data-model.md) — ERD, tabel, migrasi, backup, retensi.
- [sync-crdt.md](../01-architecture/sync-crdt.md) — HLC, batch, schema staging.
- [04-data-automation.md](../03-specs/04-data-automation.md) — requirement data dan workflow.
- [06-sync-backup.md](../03-specs/06-sync-backup.md) — format backup dan restore.
- [identity-crypto.md](../01-architecture/identity-crypto.md) — envelope dan subkey.
- [documentation.md](documentation.md) — pembaruan matriks dan status.
