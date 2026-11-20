---
id: ADR-0011
title: ADR-0011 Database Host Kanonik dan Isolasi Workspace
status: accepted
owner: data
prd_refs: ["§4.4", "§3 Modul 1", "§3 Modul 4"]
---

# ADR-0011 Database Host Kanonik dan Isolasi Workspace

## Konteks

Paket dokumen sebelum rekonsiliasi memuat dua skema host yang saling bertentangan: `data-model.md` mendaftarkan `registries`, `workflow_outbox`, `workflow_runs`, dan `vault_items` tanpa `workspace_id`, sementara flow migrasi, spec host, dan spec data memakai `registry_sources`, `outbox`, `studio_project`, `crash_incident`, `app_placements`, `dock_items`, `widgets`, dan `permission_grants`. Grant permission disimpan dua kali: tabel normal dan kolom JSON `permission_grants_json`. Audit juga terduplikasi antara `audit_log_chain` dan `sandbox_audit`, dan alokasi `seq_id` tidak didefinisikan sehingga rantai tidak dapat diverifikasi.

Tanpa satu DDL kanonik, migrasi Phase 1, worker SQLite, repository, dan verifikasi gate akan dibangun di atas kontrak yang berbeda-beda.

## Keputusan

1. **Satu DDL kanonik** ditulis verbatim di [data-model.md](../data-model.md) §5 untuk tabel: `local_identity`, `workspaces`, `workspace_state`, `folders`, `app_placements`, `dock_items`, `widgets`, `installed_microapps`, `app_databases`, `permission_grants`, `permission_sessions`, `app_policy`, `runtime_sessions`, `audit_log_chain`, `vault_items`, `vault_grants`, `vault_key_wraps`, `notifications`, `registry_sources`, `registry_pins`, `storage_pins`, `outbox`, `crash_incident`, `diagnostic_log`, `db_snapshot`, `schema_migrations`, `migration_report`, `legacy_record_map`, `migration_backup`, `studio_project`, `settings`.
2. **Kolom generik** seragam: ID `TEXT` UUIDv7, timestamp `INTEGER` epoch milidetik bersufiks `_ms`, boolean `INTEGER` 0/1 dengan `CHECK`, JSON `TEXT` dengan `CHECK (json_valid(...))`, biner `BLOB`.
3. **Isolasi workspace.** Setiap tabel yang menyentuh data pengguna wajib memuat `workspace_id` dengan FK `workspaces(id)`: `installed_microapps`, `app_databases`, `permission_grants`, `permission_sessions`, `app_policy`, `runtime_sessions`, `vault_items`, `vault_grants`, `vault_key_wraps`, `notifications`, `folders`, `app_placements`, `dock_items`, `widgets`, `workspace_state`, `registry_sources`, `registry_pins`, `storage_pins`, `outbox`, `crash_incident`, `diagnostic_log`, `db_snapshot`, `studio_project`. Pengecualian eksplisit hanya `local_identity`, `audit_log_chain`, `schema_migrations`, `migration_report`, `legacy_record_map`, `migration_backup`, dan `settings`: identitas, audit, ledger migrasi, dan preferensi instalasi bersifat per instalasi.
4. **Satu audit.** `audit_log_chain` adalah satu-satunya tabel audit append-only. `sandbox_audit` didefinisikan sebagai `VIEW` filter atas `audit_log_chain` untuk kompatibilitas spec, bukan tabel. Preimage hash: `entry_hash = SHA-256(prev_hash || u64_be(seq_id) || JCS(payload))` dengan `payload = {actor, action, target, metadata, created_at_ms}` dan `prev_hash` 32 byte nol untuk entri genesis. `seq_id` dialokasikan di dalam transaksi `BEGIN IMMEDIATE`; celah, urutan salah, atau hash tidak cocok menghasilkan `E-HOST-006` dan memblokir aksi sensitif.
5. **Grant permission kanonik** ada di `permission_grants(id, workspace_id, app_install_id, permission_id, scope, mocked, granted_at_ms, revoked_at_ms)` dengan partial unique index untuk grant aktif per `(workspace_id, app_install_id, permission_id)`. Kolom `permission_grants_json` pada `installed_microapps` dihapus dari sumber kebenaran. `permission_sessions` menyimpan `Allow once`; `app_policy` menyimpan `offline_cage` dan `mock_permissions_json`.
6. **State runtime** disimpan di `runtime_sessions` dengan satu sesi aktif per app/workspace lewat partial unique index; `state` ∈ `starting`, `running`, `background`, `hibernated`, `crashed`, `stopped`.
7. **Tata letak launcher.** `folders` maksimal tiga level (ditegakkan service dan trigger SQL), `app_placements` menyimpan urutan Home/folder dan `pinned`, `dock_items` maksimal delapan entri, `widgets` menyimpan board widget, `workspace_state` menyimpan `last_app_id`, `home_scroll`, dan `filters_json` agar cold start memulihkan konteks.
8. **Diagnostik dan rollback.** `crash_incident`, `diagnostic_log` (append-only), dan `db_snapshot` menjadi dasar error boundary, ekspor, dan rollback.
9. **Migrasi dan Studio.** `migration_report`, `legacy_record_map`, `migration_backup`, dan `studio_project` (status awal `draft`) dimiliki host DB; flow Phase 0 migration menulis ke tabel yang sama.
10. **Tabel sync/CRDT/peer** dibuat pada migrasi fase 3, bukan sebagai tabel kosong di fase 1. `outbox` memakai nama kanonik `outbox(id, workspace_id, workflow_id, idempotency_key, payload_ciphertext, state, attempt, next_attempt_at_ms, last_error_code, created_at_ms, updated_at_ms)` dan menggantikan alias `workflow_outbox`/`workflow_runs`; riwayat run disimpan sebagai `outbox.state` plus `diagnostic_log` untuk node trace.

## Konsekuensi

- Worker host DB, repository TypeScript, test migrasi, dan gate fase memakai satu daftar tabel saja; `scripts/test-migrations.mjs` menjalankan DDL yang sama di `sqlite3`.
- Setiap query lintas workspace menjadi bug yang dapat diuji: repository wajib menyertakan `workspace_id` dan test isolasi menolak hasil lintas workspace (`E-HOST-007`).
- Audit tidak dapat ditulis paralel tanpa transaksi `IMMEDIATE`; throughput audit dibatasi satu transaksi per entri. Ini diterima karena audit bukan jalur panas.
- Nama tabel spec lama (`registries`, `workflow_outbox`, `workflow_runs`) wajib diperbarui di seluruh dokumen; referensi yang tertinggal dianggap bug dokumentasi.
- Migrasi fase 1 wajib memuat trigger level folder dan batas dock; melanggar berarti gate fase gagal.

## Alternatif

| Alternatif | Alasan ditolak |
|---|---|
| Mempertahankan dua skema dan memetakan di repository | Dua sumber kebenaran; migrasi dan test akan divergen. |
| Menyimpan grant sebagai JSON di `installed_microapps` | Tidak dapat diindeks, tidak dapat dicabut secara atomik, dan tidak dapat diaudit per baris. |
| `sandbox_audit` sebagai tabel terpisah | Rantai audit ganda tidak dapat diverifikasi; memungkinkan penghapusan selektif. |
| `seq_id` dari `AUTOINCREMENT` tanpa transaksi | Celah dan duplikasi saat crash; rantai tidak dapat diverifikasi. |
| Tabel sync dibuat sejak fase 1 | Skema fase 3 belum final; tabel kosong menyesatkan dan menambah biaya migrasi. |

## Status

`accepted`. DDL lengkap ada di [data-model.md](../data-model.md) §5; kontrak perilaku di [03-specs/04-data-automation.md](../../03-specs/04-data-automation.md) dan [03-specs/01-host-shell.md](../../03-specs/01-host-shell.md).
