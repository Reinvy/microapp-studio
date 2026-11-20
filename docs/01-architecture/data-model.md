---
id: ARCH-DATA
title: Data Model
status: accepted
owner: data
prd_refs: ["§4.4", "§3 Modul 4"]
---

# Data Model

Dokumen ini menetapkan model data target untuk Host (web dan native), Studio, dan self-hosted server. Seluruh penyimpanan lokal memakai SQLite; tidak ada sumber data kedua. Status implementasi saat ini dicatat di `../00-foundation/implementation-status.md`; Dexie/IndexedDB hanya jembatan impor Phase 0 dan tidak menjadi bagian model ini.

## 1. Prinsip dan Konvensi

| Aspek | Ketetapan | Alasan |
|---|---|---|
| Primary key record | `TEXT` berisi UUIDv7 (36 karakter, lowercase) | Monoton per waktu, aman untuk penggabungan lintas perangkat, tidak membocorkan urutan bisnis. |
| App ID | Reverse-DNS, regex `^[a-z][a-z0-9]*(\.[a-z][a-z0-9-]*)+$` | Sama dengan `id` pada manifest; mencegah tabrakan antar-registry. |
| Site ID | `BLOB` 16 byte acak kriptografis, ditampilkan sebagai base32 tanpa padding (26 karakter) | Identitas perangkat stabil untuk HLC, pairing, dan deduplikasi mutation. |
| Timestamp | `INTEGER` epoch milidetik UTC | Urutan total, tanpa zona waktu, selaras dengan SQLite dan Postgres. |
| Boolean | `INTEGER` 0/1 dengan `CHECK (kolom IN (0,1))` | SQLite tidak memiliki tipe boolean asli. |
| JSON | `TEXT` berisi JSON kanonik (RFC 8785) dengan `CHECK (json_valid(kolom))` | Dapat diverifikasi hash-nya dan dipetakan ke `JSONB`. |
| Uang/desimal | `INTEGER` unit terkecil atau `TEXT` desimal | Menghindari galat pembulatan floating point. |
| Nama tabel/kolom | `snake_case`, Bahasa Inggris | Konsisten dengan SDK dan migration SQL. |
| Penghapusan | Soft delete (`deleted_at_ms`) untuk entitas pengguna; hard delete hanya untuk data turunan | Larangan menghapus data pengguna secara otomatis. |

Setiap database micro-app memisahkan tiga hal: data aplikasi (dikelola CRDT), state runtime host (tabel `*_state`), dan metadata instalasi pada database host.

## 2. ERD

```mermaid
erDiagram
    local_identity ||--o{ workspaces : owns
    local_identity ||--o{ sync_peers : pairs
    workspaces ||--o{ installed_microapps : hosts
    installed_microapps ||--|| app_databases : has
    installed_microapps ||--o{ crdt_change_log : emits
    installed_microapps ||--o{ conflict_history : records
    installed_microapps ||--o{ crdt_schema_staging : stages
    installed_microapps ||--o{ workflow_runs : executes
    installed_microapps ||--o{ notifications : raises
    registries ||--o{ installed_microapps : sources
    sync_peers ||--o{ sync_cursors : tracks
    workflow_outbox ||--o{ workflow_runs : schedules
    vault_items }o--|| local_identity : sealed_by
    server_users ||--o{ server_sessions : authenticates
    server_users ||--o{ server_tenants_rbac : granted
    server_registry_index ||--o{ server_blobs : points_to

    local_identity {
        text id PK
        blob site_id
        blob identity_pubkey
        blob key_agreement_pubkey
    }
    workspaces {
        text id PK
        text name
        integer is_default
    }
    installed_microapps {
        text id PK
        text app_id
        text version
        blob content_hash
    }
    app_databases {
        text id PK
        text app_install_id FK
        integer schema_version
    }
    crdt_change_log {
        text mutation_id PK
        blob hlc
        text table_name
    }
    sync_peers {
        text id PK
        blob peer_site_id
        text trust_state
    }
    sync_cursors {
        text id PK
        text peer_id FK
        blob last_acked_hlc
    }
    workflow_outbox {
        text id PK
        text idempotency_key
        text status
    }
```

## 3. Katalog Tabel

### 3.1 Tabel Lokal (Host dan Studio)

| Tabel | Fungsi | Cakupan |
|---|---|---|
| `local_identity` | Identitas pengguna, Site ID, kunci publik identitas | Per instalasi |
| `workspaces` | Ruang kerja terisolasi | Per instalasi |
| `registries` | Sumber registry terkonfigurasi dan kunci publiknya | Per instalasi |
| `registry_pins` | Pin TOFU kunci author dan registry | Per instalasi |
| `installed_microapps` | Instalasi micro-app beserta manifest, hash, signature, status | Per workspace |
| `app_databases` | Registri database per micro-app dan versi skemanya | Per micro-app |
| `crdt_change_log` | Mutation log CRDT ber-HLC | Per micro-app |
| `crdt_schema_staging` | Migrasi skema tertunda saat peer berbeda versi | Per micro-app |
| `conflict_history` | Riwayat konflik kolom dan pemenangnya | Per micro-app |
| `workflow_outbox` | Antrean durable eksekusi workflow | Per instalasi |
| `workflow_runs` | Riwayat eksekusi dan node trace | Per instalasi |
| `sync_peers` | Peer terpasang, sertifikat, trust state | Per instalasi |
| `sync_cursors` | Posisi HLC terakhir yang diakui per peer | Per instalasi |
| `vault_items` | Item rahasia terenkripsi | Per instalasi |
| `notifications` | Pusat notifikasi lokal | Per instalasi |
| `audit_log_chain` | Rantai audit lokal ber-hash | Per instalasi |
| `schema_migrations` | Ledger migrasi database host | Per database |

### 3.2 Tabel Server (Self-Hosted)

| Tabel | Fungsi |
|---|---|
| `server_users` | Akun dari OIDC/SAML/LDAP/passkey/magic link |
| `server_sessions` | Sesi dan refresh token per perangkat |
| `server_tenants_rbac` | Keanggotaan tenant, role, dan atribut ABAC |
| `server_registry_index` | Index registry yang dilayani server |
| `server_blobs` | Objek `.mapp`, artefak build, dan lampiran |
| `telemetry_events` | Metrik opt-in; tabel kosong selama opt-in mati |

Server menyimpan ciphertext payload sync. Kolom plaintext pada tabel server hanya metadata operasional (tenant, akun, ukuran, hash, status) dan tidak pernah berisi data micro-app pengguna.

### 3.3 Tabel Pendukung

`telemetry_events` hanya menerima baris jika `telemetry.optIn` bernilai benar pada `microapp.yaml`; tidak ada kolom PII dan tidak ada device fingerprint. `schema_migrations` mencatat `version`, `name`, `checksum`, dan `applied_at_ms`, dan menjadi sumber kebenaran migrasi di samping `PRAGMA user_version`.

### 3.4 Rincian Tabel Pendukung

`registries`:

| Kolom | Tipe | Null | Keterangan |
|---|---|---|---|
| `id` | TEXT | NOT NULL | PK, UUIDv7 |
| `name` | TEXT | NOT NULL | Nama sumber |
| `url` | TEXT | NOT NULL | UNIQUE; kanonis tanpa trailing slash |
| `kind` | TEXT | NOT NULL | `http`, `git`, `local`, `enterprise` |
| `trust_level` | TEXT | NOT NULL | `official`, `community`, `internal`, `local` |
| `public_signing_key` | BLOB(32) | NOT NULL | Ed25519 registry key |
| `key_fingerprint` | TEXT | NOT NULL | UNIQUE; SHA-256 hex |
| `cached_index_json` | TEXT | NULL | Salinan index terverifikasi |
| `last_fetched_at_ms` | INTEGER | NULL | Waktu fetch terakhir |
| `cache_ttl_s` | INTEGER | NOT NULL | Default 86400 (24 jam) |
| `priority` | INTEGER | NOT NULL | Urutan resolusi saat ID sama, kecil lebih dulu |
| `enabled` | INTEGER | NOT NULL | 0/1 |

Index: `UNIQUE(url)`, `UNIQUE(key_fingerprint)`, `INDEX(priority)`. Retensi: sampai pengguna menghapus; cache tetap dipakai offline tanpa kedaluwarsa, dan signature diverifikasi setiap load.

`registry_pins`:

| Kolom | Tipe | Null | Keterangan |
|---|---|---|---|
| `id` | TEXT | NOT NULL | PK, UUIDv7 |
| `scope` | TEXT | NOT NULL | `author` atau `registry` |
| `key_fingerprint` | TEXT | NOT NULL | Fingerprint yang dipin |
| `app_id` | TEXT | NULL | Terisi untuk pin author per aplikasi |
| `registry_id` | TEXT | NULL | FK `registries(id)` ON DELETE SET NULL |
| `first_seen_at_ms` | INTEGER | NOT NULL | Waktu pin dibuat |
| `approved_at_ms` | INTEGER | NULL | Waktu pengguna menyetujui perubahan kunci |
| `approved_by` | TEXT | NULL | `user` atau `policy` |

Index: `UNIQUE(scope, key_fingerprint, app_id)`, `INDEX(app_id)`. Constraint: fingerprint tidak boleh diganti di tempat; perubahan kunci menghasilkan baris baru dan baris lama ditandai lewat `approved_at_ms` baru. Retensi: permanen sampai reset identitas.

`notifications`:

| Kolom | Tipe | Null | Keterangan |
|---|---|---|---|
| `id` | TEXT | NOT NULL | PK, UUIDv7 |
| `app_install_id` | TEXT | NULL | FK `installed_microapps(id)` ON DELETE SET NULL |
| `title` | TEXT | NOT NULL | Judul terlokalisasi |
| `body` | TEXT | NOT NULL | Isi tanpa PII sensitif |
| `deep_link` | TEXT | NULL | `microapp://` bila ada |
| `scheduled_at_ms` | INTEGER | NULL | Jadwal |
| `fired_at_ms` | INTEGER | NULL | Waktu tampil |
| `state` | TEXT | NOT NULL | `scheduled`, `fired`, `cancelled` |
| `read_at_ms` | INTEGER | NULL | Waktu dibaca |
| `created_at_ms` | INTEGER | NOT NULL | Waktu dibuat |

Index: `INDEX(state, scheduled_at_ms)`, `INDEX(app_install_id)`. Constraint: `state = 'fired'` mewajibkan `fired_at_ms` terisi. Retensi: 30 hari setelah `fired_at_ms` atau `read_at_ms`, mana yang lebih dahulu.

## 4. Tabel Inti

Dua belas tabel berikut adalah kontrak minimum. Kolom bertipe `BLOB` selalu berisi byte mentah (bukan base64).

### 4.1 `local_identity`

| Kolom | Tipe | Null | Keterangan |
|---|---|---|---|
| `id` | TEXT | NOT NULL | PK, UUIDv7 |
| `site_id` | BLOB(16) | NOT NULL | UNIQUE; Site ID perangkat |
| `identity_pubkey` | BLOB(32) | NOT NULL | UNIQUE; Ed25519 |
| `key_agreement_pubkey` | BLOB(32) | NOT NULL | X25519 |
| `device_cert` | BLOB | NULL | Sertifikat perangkat yang ditandatangani identity key |
| `device_cert_expires_ms` | INTEGER | NULL | Masa berlaku sertifikat |
| `display_name` | TEXT | NULL | Nama tampilan, boleh kosong |
| `recovery_hint` | TEXT | NULL | Pengingat non-rahasia; dilarang memuat kata mnemonic |
| `created_at_ms` | INTEGER | NOT NULL | Waktu pembuatan |
| `rotated_at_ms` | INTEGER | NULL | Waktu rotasi identitas |

Index: `UNIQUE(site_id)`, `UNIQUE(identity_pubkey)`. Constraint: tepat satu baris per instalasi; `recovery_hint` tidak boleh cocok dengan pola 24 kata BIP39 (diperiksa di lapisan aplikasi). Retensi: selama instalasi hidup; hanya dihapus lewat reset identitas eksplisit yang lebih dulu meminta ekspor.

### 4.2 `workspaces`

| Kolom | Tipe | Null | Keterangan |
|---|---|---|---|
| `id` | TEXT | NOT NULL | PK, UUIDv7 |
| `name` | TEXT | NOT NULL | Nama tampilan |
| `slug` | TEXT | NOT NULL | UNIQUE, `^[a-z0-9-]{1,48}$` |
| `theme` | TEXT | NOT NULL | Default `studio`; nilai skin lain dicatat di sini |
| `locale` | TEXT | NOT NULL | BCP-47, default mengikuti OS |
| `is_default` | INTEGER | NOT NULL | 0/1; partial unique index `WHERE is_default = 1` |
| `created_at_ms` | INTEGER | NOT NULL | Waktu pembuatan |
| `updated_at_ms` | INTEGER | NOT NULL | Waktu perubahan |
| `last_opened_at_ms` | INTEGER | NULL | Dasar urutan Workspace Switcher |
| `deleted_at_ms` | INTEGER | NULL | Soft delete |

Index: `UNIQUE(slug)`, `UNIQUE(is_default) WHERE is_default = 1`, `INDEX(deleted_at_ms)`. Retensi: baris soft delete dipurge setelah 30 hari hanya bila seluruh micro-app di dalamnya sudah diekspor atau dihapus pengguna.

### 4.3 `installed_microapps`

| Kolom | Tipe | Null | Keterangan |
|---|---|---|---|
| `id` | TEXT | NOT NULL | PK, UUIDv7 |
| `workspace_id` | TEXT | NOT NULL | FK `workspaces(id)` ON DELETE CASCADE |
| `app_id` | TEXT | NOT NULL | Reverse-DNS dari manifest; unik per workspace |
| `version` | TEXT | NOT NULL | Semver |
| `manifest_json` | TEXT | NOT NULL | Manifest kanonik yang sudah diverifikasi |
| `content_hash` | BLOB(32) | NOT NULL | SHA-256 arsip `.mapp` kanonik |
| `signature` | BLOB(64) | NOT NULL | Ed25519 detached signature author |
| `author_key_fingerprint` | TEXT | NOT NULL | SHA-256 hex kunci author yang dipin |
| `registry_id` | TEXT | NULL | FK `registries(id)` ON DELETE SET NULL |
| `install_source` | TEXT | NOT NULL | `registry`, `git`, `enterprise`, `local` |
| `bundle_path` | TEXT | NOT NULL | Direktori hasil ekstraksi `.mapp` di storage host |
| `state` | TEXT | NOT NULL | `installed`, `running`, `hibernated`, `disabled`, `quarantined` |
| `offline_cage_enabled` | INTEGER | NOT NULL | 0/1, default 1 |
| `pinned_version` | TEXT | NULL | NULL berarti mengikuti kebijakan update; terisi berarti versi dikunci |
| `update_mode` | TEXT | NOT NULL | `auto`, `notify`, `manual`; default `notify` |
| `permission_grants_json` | TEXT | NOT NULL | Array grant aktif beserta `granted_at_ms` |
| `previous_version` | TEXT | NULL | Target rollback |
| `previous_content_hash` | BLOB(32) | NULL | Verifikasi rollback |
| `installed_at_ms` | INTEGER | NOT NULL | Waktu instalasi |
| `updated_at_ms` | INTEGER | NOT NULL | Waktu update |
| `last_launched_at_ms` | INTEGER | NULL | Untuk hibernasi dan LRU |

Index: `UNIQUE(workspace_id, app_id)`, `INDEX(state)`, `INDEX(registry_id)`, `INDEX(workspace_id, last_launched_at_ms)`. Constraint: `state = 'quarantined'` memaksa `pinned_version` terisi versi saat ini dan memblokir launch; `update_mode = 'auto'` tidak sah bila `pinned_version` terisi. Retensi: uninstall menandai `state = 'disabled'` sampai pengguna memilih hapus data; baris tidak dihapus otomatis.

### 4.4 `app_databases`

| Kolom | Tipe | Null | Keterangan |
|---|---|---|---|
| `id` | TEXT | NOT NULL | PK, UUIDv7 |
| `app_install_id` | TEXT | NOT NULL | FK `installed_microapps(id)` ON DELETE CASCADE |
| `workspace_id` | TEXT | NOT NULL | FK `workspaces(id)`; menjamin isolasi antar-workspace |
| `relative_path` | TEXT | NOT NULL | Path relatif di OPFS/sandbox, `^[a-z0-9_./-]{1,120}$`, tanpa `..` |
| `schema_version` | INTEGER | NOT NULL | Cermin `PRAGMA user_version` |
| `encryption` | TEXT | NOT NULL | `sqlcipher` (native), `field-aes-gcm` (web), `none` (data non-sensitif) |
| `size_bytes` | INTEGER | NOT NULL | Ukuran terakhir yang diukur |
| `created_at_ms` | INTEGER | NOT NULL | Waktu pembuatan |
| `updated_at_ms` | INTEGER | NOT NULL | Waktu perubahan |

Index: `UNIQUE(app_install_id, relative_path)`, `INDEX(workspace_id)`. Constraint: `encryption = 'sqlcipher'` hanya sah bila runtime melaporkan dukungan SQLCipher native. Retensi: mengikuti `installed_microapps`; file database tidak dihapus selama baris masih ada.

### 4.5 `crdt_change_log`

| Kolom | Tipe | Null | Keterangan |
|---|---|---|---|
| `mutation_id` | TEXT | NOT NULL | PK, UUIDv7; dipakai sebagai idempotency key |
| `app_install_id` | TEXT | NOT NULL | FK ke `installed_microapps(id)` |
| `table_name` | TEXT | NOT NULL | Tabel data micro-app |
| `row_id` | TEXT | NOT NULL | Primary key baris (UUIDv7) |
| `column_name` | TEXT | NOT NULL | Kolom yang berubah |
| `value_json` | TEXT | NULL | Nilai baru kanonik; NULL untuk tombstone |
| `hlc` | BLOB(24) | NOT NULL | 48-bit ms + 16-bit counter + 16 byte Site ID, big-endian |
| `site_id` | BLOB(16) | NOT NULL | Asal mutation |
| `origin` | TEXT | NOT NULL | `local`, `remote`, `workflow` |
| `schema_version` | INTEGER | NOT NULL | Versi skema saat mutation dibuat |
| `applied_at_ms` | INTEGER | NOT NULL | Waktu diterapkan lokal |
| `synced_at_ms` | INTEGER | NULL | Waktu semua peer dan server meng-ACK mutation |

Index: `UNIQUE(app_install_id, table_name, row_id, column_name, hlc)`, `INDEX(app_install_id, hlc)`, `INDEX(synced_at_ms)`, `INDEX(site_id)`. Constraint: tombstone wajib `value_json IS NULL`; baris tidak boleh diubah setelah ditulis (append-only). Retensi: dipadatkan (compaction) hanya setelah semua `sync_cursors` peer melewati HLC baris tersebut dan tidak lebih cepat dari 90 hari; salinan server disimpan 180 hari.

### 4.6 `crdt_schema_staging`

| Kolom | Tipe | Null | Keterangan |
|---|---|---|---|
| `id` | TEXT | NOT NULL | PK, UUIDv7 |
| `app_install_id` | TEXT | NOT NULL | FK ke `installed_microapps(id)` |
| `from_version` | INTEGER | NOT NULL | Versi skema lokal |
| `to_version` | INTEGER | NOT NULL | Versi skema dari peer atau manifest baru |
| `migration_sql` | TEXT | NOT NULL | Migrasi forward idempoten |
| `status` | TEXT | NOT NULL | `pending`, `applied`, `rejected` |
| `created_at_ms` | INTEGER | NOT NULL | Waktu staging |
| `applied_at_ms` | INTEGER | NULL | Waktu penerapan |

Index: `UNIQUE(app_install_id, to_version)`, `INDEX(status)`. Constraint: `to_version > from_version`; `status = 'applied'` mewajibkan `applied_at_ms` terisi. Retensi: 30 hari setelah `applied`, lalu dipurge; status `rejected` disimpan sampai pengguna mengonfirmasi.

### 4.7 `conflict_history`

| Kolom | Tipe | Null | Keterangan |
|---|---|---|---|
| `conflict_id` | TEXT | NOT NULL | PK, UUIDv7 |
| `app_install_id` | TEXT | NOT NULL | FK ke `installed_microapps(id)` |
| `table_name` | TEXT | NOT NULL | Tabel sumber konflik |
| `row_id` | TEXT | NOT NULL | Primary key baris |
| `column_name` | TEXT | NOT NULL | Kolom yang berkonflik |
| `losing_value_json` | TEXT | NOT NULL | Nilai yang tidak dipakai |
| `losing_hlc` | BLOB(24) | NOT NULL | HLC pihak yang kalah |
| `losing_site` | BLOB(16) | NOT NULL | Site ID pihak yang kalah |
| `winning_hlc` | BLOB(24) | NOT NULL | HLC pemenang |
| `winning_value_json` | TEXT | NOT NULL | Nilai pemenang saat konflik terdeteksi |
| `detected_at_ms` | INTEGER | NOT NULL | Waktu deteksi |
| `resolution` | TEXT | NOT NULL | `lww` atau `manual` |
| `resolved_by` | TEXT | NOT NULL | `system` atau Site ID pengguna |
| `resolved_at_ms` | INTEGER | NOT NULL | Waktu resolusi |

Index: `INDEX(app_install_id, detected_at_ms DESC)`, `INDEX(table_name, row_id)`. Retensi: 90 hari; pengguna dapat mengekspor lebih dulu. Baris tidak pernah dihapus sebelum UI konflik menandainya terbaca. Pemulihan nilai yang kalah menghasilkan mutation baru di `crdt_change_log`, bukan edit pada baris riwayat.

### 4.8 `workflow_outbox`

| Kolom | Tipe | Null | Keterangan |
|---|---|---|---|
| `id` | TEXT | NOT NULL | PK, UUIDv7 |
| `workflow_id` | TEXT | NOT NULL | ID logis workflow dari manifest |
| `idempotency_key` | TEXT | NOT NULL | UNIQUE; UUIDv7 |
| `payload_ciphertext` | BLOB | NOT NULL | Envelope AES-256-GCM berisi input |
| `status` | TEXT | NOT NULL | `pending`, `running`, `waiting_network`, `waiting_hitl`, `succeeded`, `failed`, `dead` |
| `attempt` | INTEGER | NOT NULL | 0 sampai 8 |
| `next_attempt_at_ms` | INTEGER | NULL | Jadwal retry |
| `last_error_code` | TEXT | NULL | Kode `E-*` terakhir |
| `created_at_ms` | INTEGER | NOT NULL | Waktu enqueue |
| `updated_at_ms` | INTEGER | NOT NULL | Waktu perubahan |

Index: `UNIQUE(idempotency_key)`, `INDEX(status, next_attempt_at_ms)`. Constraint: `attempt <= 8`; `status = 'dead'` hanya tercapai setelah delapan kegagalan. Retensi: `succeeded` 7 hari; `dead` disimpan sampai pengguna menindaklanjuti, minimum 30 hari.

### 4.9 `workflow_runs`

| Kolom | Tipe | Null | Keterangan |
|---|---|---|---|
| `id` | TEXT | NOT NULL | PK, UUIDv7 |
| `workflow_id` | TEXT | NOT NULL | ID workflow |
| `outbox_id` | TEXT | NULL | FK `workflow_outbox(id)` ON DELETE SET NULL |
| `status` | TEXT | NOT NULL | `running`, `succeeded`, `failed`, `cancelled`, `awaiting_hitl` |
| `checkpoint_json` | TEXT | NULL | State node terakhir untuk resume setelah crash atau restart |
| `node_trace_json` | TEXT | NOT NULL | Jejak node tanpa PII, sudah diredaksi |
| `error_code` | TEXT | NULL | Kode `E-*` bila gagal |
| `started_at_ms` | INTEGER | NOT NULL | Mulai eksekusi |
| `finished_at_ms` | INTEGER | NULL | Selesai eksekusi |

Index: `INDEX(workflow_id, started_at_ms DESC)`, `INDEX(status)`. Retensi: 30 hari detail; agregat durasi dan tingkat sukses dipertahankan 12 bulan tanpa payload.

### 4.10 `sync_peers`

| Kolom | Tipe | Null | Keterangan |
|---|---|---|---|
| `id` | TEXT | NOT NULL | PK, UUIDv7 |
| `peer_site_id` | BLOB(16) | NOT NULL | UNIQUE |
| `peer_name` | TEXT | NULL | Nama tampilan yang diisi pengguna |
| `peer_identity_pubkey` | BLOB(32) | NOT NULL | Ed25519 peer |
| `device_cert` | BLOB | NOT NULL | Sertifikat perangkat peer |
| `transport` | TEXT | NOT NULL | `lan`, `webrtc`, `selfhost`, `byos` |
| `last_seen_lan_ip` | TEXT | NULL | Alamat LAN terakhir; hanya dipakai untuk reconnect |
| `sync_server_url` | TEXT | NULL | Endpoint self-host yang dipakai peer |
| `trust_state` | TEXT | NOT NULL | `tofu`, `verified`, `revoked` |
| `paired_at_ms` | INTEGER | NOT NULL | Waktu pairing |
| `last_seen_at_ms` | INTEGER | NULL | Aktivitas terakhir |
| `revoked_at_ms` | INTEGER | NULL | Waktu revokasi |

Index: `UNIQUE(peer_site_id)`, `INDEX(trust_state)`. Constraint: `trust_state = 'revoked'` mewajibkan `revoked_at_ms` terisi dan memblokir handshake; perubahan `peer_identity_pubkey` untuk `peer_site_id` yang sama ditolak sampai pairing ulang. Retensi: baris `revoked` disimpan 90 hari untuk mencegah re-pairing diam-diam, lalu dihapus.

### 4.11 `sync_cursors`

| Kolom | Tipe | Null | Keterangan |
|---|---|---|---|
| `id` | TEXT | NOT NULL | PK, UUIDv7 |
| `peer_id` | TEXT | NOT NULL | FK `sync_peers(id)` ON DELETE CASCADE |
| `app_install_id` | TEXT | NULL | NULL berarti cursor global instalasi |
| `last_acked_hlc` | BLOB(24) | NOT NULL | HLC tertinggi yang di-ACK peer |
| `last_batch_id` | TEXT | NULL | UUIDv7 batch terakhir |
| `updated_at_ms` | INTEGER | NOT NULL | Waktu pembaruan |

Index: `UNIQUE(peer_id, app_install_id)`, `INDEX(last_acked_hlc)`. Retensi: mengikuti `sync_peers`; cursor dipakai untuk menentukan aman-tidaknya compaction `crdt_change_log`.

### 4.12 `vault_items` dan `audit_log_chain`

`vault_items`:

| Kolom | Tipe | Null | Keterangan |
|---|---|---|---|
| `id` | TEXT | NOT NULL | PK, UUIDv7 |
| `kind` | TEXT | NOT NULL | `api_key`, `password`, `note`, `certificate` |
| `label` | TEXT | NOT NULL | Nama tampilan, bukan rahasia |
| `ciphertext` | BLOB | NOT NULL | Envelope `version, key_id, nonce, ciphertext, tag` |
| `key_id` | BLOB(16) | NOT NULL | Penunjuk subkey vault |
| `nonce` | BLOB(12) | NOT NULL | Nonce unik per enkripsi |
| `auto_lock_ms` | INTEGER | NOT NULL | Default 300000 (5 menit) |
| `created_at_ms` | INTEGER | NOT NULL | Waktu pembuatan |
| `updated_at_ms` | INTEGER | NOT NULL | Waktu perubahan |
| `deleted_at_ms` | INTEGER | NULL | Soft delete |

Index: `INDEX(kind)`, `INDEX(deleted_at_ms)`. Constraint: `nonce` tidak boleh berulang untuk `key_id` yang sama. Retensi: sampai pengguna menghapus; item terhapus dipurge setelah 30 hari.

`audit_log_chain`:

| Kolom | Tipe | Null | Keterangan |
|---|---|---|---|
| `id` | TEXT | NOT NULL | PK, UUIDv7 |
| `seq_id` | INTEGER | NOT NULL | UNIQUE; monoton naik tanpa gap |
| `prev_hash` | BLOB(32) | NOT NULL | Hash entri sebelumnya |
| `entry_hash` | BLOB(32) | NOT NULL | UNIQUE; SHA-256(`prev_hash`, payload kanonik, `seq_id`) |
| `actor` | TEXT | NOT NULL | `system`, `user`, atau Site ID |
| `action` | TEXT | NOT NULL | Misalnya `permission.grant`, `app.install`, `key.rotate` |
| `target` | TEXT | NULL | ID subjek, tanpa PII |
| `metadata_json` | TEXT | NOT NULL | Detail teredaksi |
| `created_at_ms` | INTEGER | NOT NULL | Waktu kejadian |

Index: `UNIQUE(seq_id)`, `UNIQUE(entry_hash)`, `INDEX(action, created_at_ms)`. Retensi: 400 hari lokal, 400 hari server, hanya boleh dipangkas setelah diekspor ke penyimpanan eksternal.

## 5. Tabel Server Rinci

| Tabel | Kolom Kunci | Constraint dan Retensi |
|---|---|---|
| `server_users` | `id` UUID PK, `tenant_id` UUID FK, `subject` TEXT UNIQUE, `email` TEXT NULL, `display_name` TEXT, `status` TEXT (`active`,`suspended`,`deleted`), `created_at_ms`, `last_login_at_ms` | `subject` unik per tenant gabungan (`UNIQUE(tenant_id, subject)`); data akun dihapus 30 hari setelah status `deleted`. |
| `server_sessions` | `id` UUID PK, `user_id` UUID FK, `device_label` TEXT, `refresh_token_hash` BLOB(32) UNIQUE, `access_expires_ms`, `refresh_expires_ms`, `revoked_at_ms` | Access token 15 menit, refresh 30 hari; rotasi refresh token wajib; revoke per perangkat mengisi `revoked_at_ms`. Retensi 30 hari setelah revokasi. |
| `server_tenants_rbac` | `id` UUID PK, `tenant_id` UUID, `user_id` UUID, `role` TEXT (`owner`,`admin`,`curator`,`member`,`auditor`), `attributes_json` | `UNIQUE(tenant_id, user_id)`; minimal satu `owner` aktif per tenant; perubahan role masuk audit chain. |
| `server_registry_index` | `id` UUID PK, `registry_name`, `app_id`, `version`, `sha256`, `signature`, `manifest_json`, `published_at_ms`, `status` | `UNIQUE(app_id, version)`; status `active`, `deprecated`, `delisted`. Delisting tercatat di audit. |
| `server_blobs` | `id` UUID PK, `sha256` BLOB(32) UNIQUE, `size_bytes`, `storage_uri`, `ref_count`, `created_at_ms` | Blob tanpa referensi dipurge setelah 30 hari; blob yang direferensikan index tidak pernah dihapus otomatis. |
| `telemetry_events` | `id` UUID PK, `tenant_id`, `event_name`, `props_json`, `occurred_at_ms` | Hanya ditulis bila opt-in; tanpa PII; retensi 30 hari. |

## 6. HLC, Mutation Log, dan Konvergensi

HLC adalah `BLOB` 24 byte dengan urutan: 48-bit milidetik, 16-bit counter, 16 byte Site ID (big-endian). Nilai diurutkan secara leksikografis sehingga indeks SQLite langsung memberi urutan total. Aturan pembaruan: bila waktu fisik lebih besar dari HLC lokal, HLC baru memakai waktu fisik dan counter 0; bila sama atau lebih kecil, counter dinaikkan; overflow counter memaksa milidetik naik satu.

Resolusi konflik memakai last-writer-wins per kolom dengan perbandingan HLC; nilai yang kalah dicatat di `conflict_history` sebelum dibuang, sehingga UI dapat menampilkan pemulihan manual. Operasi delete direpresentasikan tombstone (`value_json IS NULL`), bukan penghapusan baris, agar propagasi tetap deterministik.

## 7. Migrasi dan Versioning

| Aturan | Ketetapan |
|---|---|
| Penanda versi | `PRAGMA user_version` per database (host maupun per micro-app) |
| Ledger | Tabel `schema_migrations` menyimpan `version`, `name`, `checksum`, `applied_at_ms`, `rollback_sql` |
| Arah | Setiap migrasi wajib menyediakan forward dan rollback; rollback diuji pada fixture versi lama |
| Transaksi | Migrasi dijalankan dalam satu transaksi; kegagalan menggulung penuh |
| Snapshot | Snapshot dibuat sebelum migrasi destruktif (rename/drop) |
| Larangan | Tidak ada drop tabel/kolom berisi data pengguna tanpa ekspor lebih dulu |
| Indeks turunan | FTS5 dan sqlite-vec dibangun ulang setelah migrasi yang mengubah kolom terindeks |
| Idempotensi | Migrasi aman dijalankan ulang setelah crash; `checksum` mencegah file migrasi diubah |

Skema data micro-app dimiliki manifest (`db/migrations/`) dan diverifikasi ulang sebelum diterapkan. Migrasi yang tidak kompatibel ditempatkan di `crdt_schema_staging` sampai semua peer mencapai versi yang sama.

## 8. Pencarian

| Kebutuhan | Implementasi |
|---|---|
| Pencarian teks | Tabel virtual FTS5 dengan `content=` menunjuk tabel sumber dan trigger sinkronisasi |
| Pencarian semantik | Tabel virtual `vec0` (sqlite-vec) menyimpan embedding; hanya aktif bila model embedding lokal tersedia |
| Rebuild | `INSERT INTO content_fts(content_fts) VALUES('rebuild')` setelah migrasi atau pemulihan backup |
| Isolasi | FTS dan vector index hidup di database micro-app masing-masing; omni-search host mengagregasi lintas database secara read-only |

Embedding tidak pernah dikirim ke jaringan tanpa aksi eksplisit pengguna dan izin `local_ai.inference`.

## 9. Enkripsi Data

| Platform | Mekanisme | Cakupan | Catatan |
|---|---|---|---|
| Android, iOS | SQLCipher full-file | Seluruh database micro-app dan host | Kunci SQLCipher diturunkan dari subkey vault perangkat dan disimpan di Keystore |
| Desktop native | SQLCipher full-file | Seluruh database | Kunci di OS keychain, dibuka saat unlock |
| Web | AES-256-GCM field-level | Kolom sensitif dan seluruh `vault_items` | Envelope per nilai; AAD mengikat tabel, baris, dan versi skema |

SQLCipher versi WASM **bukan** jalur yang didukung dan tidak boleh dijadwalkan sebagai pekerjaan: `@sqlite.org/sqlite-wasm` tidak menyediakan build SQLCipher resmi, dan efisiensi enkripsi halaman di OPFS belum terverifikasi. Karena itu host web tidak boleh mengklaim proteksi setara native. Data non-sensitif di web disimpan sebagai plaintext SQLite di OPFS yang dilindungi origin isolation dan CSP; data sensitif wajib melewati enkripsi field-level. Kunci field-level berasal dari subkey vault yang tidak dapat diekstrak (lihat `identity-crypto.md`).

Rotasi kunci mengenkripsi ulang nilai dengan `key_id` baru dalam transaksi, lalu menandai `key_id` lama sebagai pensiun; nilai lama tidak boleh didekripsi setelah rotasi selesai kecuali untuk rollback yang diotorisasi.

## 10. Pemetaan SQLite ke PostgreSQL

| SQLite | PostgreSQL | Aturan Konversi |
|---|---|---|
| `TEXT` UUIDv7 | `UUID` | Validasi regex sebelum insert; tanpa konversi byte |
| `INTEGER` epoch ms | `TIMESTAMPTZ` | `to_timestamp(ms / 1000.0)`; selalu UTC |
| `INTEGER` 0/1 | `BOOLEAN` | `ms <> 0` |
| `TEXT` JSON | `JSONB` | JSON kanonik dipertahankan untuk verifikasi hash |
| `BLOB` | `BYTEA` | Tanpa encoding |
| `REAL` | `DOUBLE PRECISION` | Hanya untuk metrik non-kritis |
| FTS5 | `tsvector` + GIN | Dibangun ulang saat migrasi atau impor |
| `vec0` | `pgvector` | Dimensi dan metrik harus sama dengan model yang dipakai |
| `PRAGMA user_version` | Tabel `schema_migrations` | Ledger server memakai goose dengan checksum yang sama |
| Partial unique index | Partial unique index | Didukung penuh |
| `AUTOINCREMENT` | `BIGSERIAL` | Tidak dipakai untuk ID domain |

Skema server tidak menyalin tabel lokal yang bersifat privat (misalnya `vault_items`, `local_identity`). Tabel server hanya menyimpan data tenant, index registry, blob, audit, dan metadata sync.

## 11. Backup dan Restore

| Langkah | Ketetapan |
|---|---|
| Snapshot lokal | `VACUUM INTO` dijalankan di DB worker agar konsisten tanpa memblokir UI |
| Format ekspor | SQLite mentah, JSONL, CSV, Markdown, atau encrypted snapshot (envelope AES-256-GCM dengan subkey backup) |
| Verifikasi | Hash konten dan `PRAGMA integrity_check` wajib lulus sebelum snapshot dianggap sah |
| Generasi | Tiga generasi snapshot lokal; yang lebih lama dipangkas hanya setelah generasi terbaru terverifikasi |
| Restore | Hanya ke `app_id` yang sama; verifikasi signature manifest dan `content_hash` sebelum menimpa |
| Kegagalan restore | Database aktif tidak disentuh sampai snapshot baru lulus verifikasi; tidak ada penghapusan data lama |
| Uji restore | Wajib diuji pada perangkat bersih sebelum rilis, dengan jumlah baris dan checksum dibandingkan |

Backup tidak pernah memuat mnemonic, kunci privat, atau token sesi. Backup terenkripsi hanya dapat dibuka dengan recovery phrase atau passkey PRF yang sah.

## 12. Retensi, Audit, dan Larangan Penghapusan

- Data yang dibuat pengguna (workspace, micro-app terpasang, isi database, vault, workflow, audit) **tidak boleh** dihapus oleh proses otomatis, pembersihan cache, atau kebijakan retensi.
- Yang boleh dipangkas otomatis hanya data turunan dan operasional: log perubahan CRDT yang sudah di-ACK semua peer, riwayat konflik kedaluwarsa, jejak run workflow, notifikasi, dan telemetri opt-in.
- Setiap aksi destruktif yang dipicu pengguna wajib memiliki pratinjau, konfirmasi eksplisit, dan jendela undo 10 detik; setelah itu aksi tercatat di `audit_log_chain`.
- Uninstall default menyimpan data micro-app; penghapusan data hanya terjadi setelah ekspor sukses atau konfirmasi kedua yang menyebutkan jumlah record.
- Pemadaman perangkat tidak boleh mengubah status retensi; cursor peer yang hilang diperlakukan sebagai peer baru dengan verifikasi ulang.

## 13. Referensi

- [system-overview.md](system-overview.md) — process model dan trust boundary.
- [identity-crypto.md](identity-crypto.md) — hierarki kunci dan envelope.
- [sync-crdt.md](sync-crdt.md) — handshake, batch, transport.
- [monorepo.md](monorepo.md) — lokasi paket pemilik skema.
- [../03-specs/04-data-automation.md](../03-specs/04-data-automation.md) — kontrak perilaku data dan workflow.
- [../03-specs/06-sync-backup.md](../03-specs/06-sync-backup.md) — format backup dan restore.
- [../03-specs/manifest-v2.md](../03-specs/manifest-v2.md) — skema manifest dan migrasi.
