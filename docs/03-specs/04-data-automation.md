---
id: SPEC-DATA
title: Data Layer dan Automation
status: accepted
owner: data
prd_refs: ["§3 Modul 4", "§4.4", "§5.2"]
---

# 04. Data Layer dan Automation

## 1. Tujuan dan Ruang Lingkup

Setiap micro-app mendapat database SQLite terisolasi, migrasi yang aman, sinkronisasi CRDT, fungsi lokal/server dengan API identik, serta workflow offline yang tahan restart. Seluruh operasi data inti MUST bekerja tanpa jaringan.

Di luar lingkup: transport sinkronisasi (spec 06), sandbox eksekusi (spec 03), server deployment (spec 07).

## 2. Aktor dan Prasyarat

| Aktor | Prasyarat |
|---|---|
| Micro-app | Manifest dan migrasi tervalidasi; permission `storage.local.sqlite` |
| Maker/Developer | Schema designer atau migrasi SQL |
| Workflow runner | Outbox dan checkpoint tersedia lokal |
| Server | Hanya untuk eksekusi workflow server dan connector jaringan |

## 3. Requirement

| ID | Level | Requirement | Acceptance |
|---|---|---|---|
| FR-DATA-001 | MUST | Host MUST menyediakan satu database SQLite terisolasi per `app_id` per workspace; micro-app MUST NOT dapat membuka database micro-app lain. | Query lintas `app_id` gagal; file database terpisah per app. |
| FR-DATA-002 | MUST | Penamaan database MUST deterministik dari `app_id` dan `workspace_id`, dan Host MUST memegang registry database untuk mencegah tabrakan. | Dua app dengan nama mirip mendapat file berbeda; registry mencatat owner. |
| FR-DATA-003 | MUST | Web MUST memakai SQLite WASM di Web Worker dengan OPFS; native MUST memakai SQLite native. API query MUST identik di kedua platform. | Query yang sama menghasilkan hasil sama di web dan native; UI tidak memblokir saat query. |
| FR-DATA-004 | MUST | Native MUST mendukung SQLCipher full-file untuk database sensitif; web MUST NOT mengklaim enkripsi full-file dan MUST memakai AES-256-GCM field-level untuk kolom sensitif. | File native terenkripsi; web menunjukkan kolom sensitif sebagai ciphertext dan UI menyatakan batasannya. |
| FR-DATA-005 | MUST | Kolom sensitif MUST dapat ditandai di schema dan dienkripsi sebelum ditulis, dengan kunci dari master key dan key id pada envelope. | Nilai plaintext tidak muncul di file/backup; dekripsi hanya dengan kunci yang benar. |
| FR-DATA-006 | MUST | Setiap database micro-app MUST memiliki indeks FTS5 untuk kolom teks yang ditandai dan MUST menyediakan rebuild indeks tanpa kehilangan data. | Pencarian menemukan teks; rebuild selesai dan jumlah hasil sama. |
| FR-DATA-007 | SHOULD | Bila `sqlite-vec` tersedia, micro-app MUST dapat mendefinisikan kolom vektor dan melakukan pencarian kemiripan lokal; bila tidak, fitur MUST dinonaktifkan dengan status jelas. | Kolom vektor tersimpan; pencarian mengembalikan tetangga terdekat; tanpa ekstensi, UI menampilkan status. |
| FR-DATA-008 | MUST | Schema designer MUST mendukung tipe, nullability, default, primary key, foreign key, unique, check, dan index, serta MUST menghasilkan DDL dan tipe TypeScript. | Perubahan schema menghasilkan DDL dan tipe; DDL dijalankan pada database uji. |
| FR-DATA-009 | MUST | Setiap perubahan schema MUST menghasilkan migrasi forward dan rollback yang bernomor dan tersimpan di `db/migrations/`. | Migrasi `001` memiliki pasangan rollback; urutan diterapkan sekali. |
| FR-DATA-010 | MUST | Sebelum migrasi dijalankan, Host MUST membuat atomic snapshot database dan MUST mencatat hash-nya. | Snapshot ada sebelum migrasi; hash tercatat dan dapat diverifikasi. |
| FR-DATA-011 | MUST | Bila migrasi gagal, Host MUST mengembalikan database ke snapshot dan micro-app ke versi sebelumnya secara otomatis, tanpa kehilangan data. | Migrasi rusak disimulasikan; database dan versi app kembali; jumlah record sama. |
| FR-DATA-012 | MUST | Versi schema MUST dilacak dengan `PRAGMA user_version` dan ledger migrasi yang mencatat versi, waktu, dan hash migrasi. | Ledger berisi setiap migrasi yang diterapkan; `user_version` sama dengan versi terakhir. |
| FR-DATA-013 | MUST | Setiap mutasi tabel yang disinkronkan MUST menulis entri `crdt_change_log` dengan `row_id` UUIDv7 plaintext, `pk_hash` BLOB(32) berisi SHA-256 dari gabungan `table_name` dan `row_id`, `column_name`, HLC, dan nilai kolom; nilai sensitif MUST disimpan sebagai `value_ciphertext` per kolom. | Insert/update/delete menghasilkan entri; HLC monoton naik per Site ID; nilai sensitif tidak muncul plaintext di log. |
| FR-DATA-014 | MUST | Penggabungan mutasi MUST bersifat column-level last-write-wins dengan HLC sebagai pembanding dan Site ID sebagai tie-breaker deterministik. | Dua perangkat mengubah kolom berbeda; keduanya bertahan; kolom sama dipilih deterministik. |
| FR-DATA-015 | MUST | Nilai yang kalah pada konflik kolom identik MUST disimpan di `conflict_history` dengan nilai pemenang, nilai kalah, dan HLC, serta dapat ditinjau dan dipulihkan pengguna. | Konflik disimulasikan; kedua nilai tersedia; memulihkan nilai lama mengubah data dan mencatat mutasi baru. |
| FR-DATA-016 | MUST | Mutasi dengan schema version lebih baru MUST disimpan di `crdt_schema_staging` sampai perangkat mendukung versi tersebut, dan MUST NOT diterapkan ke tabel aktif. | Perangkat lama menerima mutasi versi baru; tabel tidak berubah; staging bertambah. |
| FR-DATA-017 | MUST | Micro-app MUST dapat mendefinisikan serverless function TypeScript/WASM yang berjalan lokal di sandbox dengan akses data melalui API terbatas. | Function lokal membaca/menulis hanya database app-nya; akses lain ditolak. |
| FR-DATA-018 | MUST | Function yang sama MUST dapat dijalankan di server self-host dengan kontrak input/output dan perilaku identik. | Fixture yang sama menghasilkan output sama di lokal dan server. |
| FR-DATA-019 | MUST | Workflow editor MUST menyediakan node graph dengan validasi koneksi, deteksi siklus tak sah, dan pratinjau data per node. | Graph dengan edge tidak valid ditolak; pratinjau menampilkan payload. |
| FR-DATA-020 | MUST | Trigger MUST mencakup perubahan database, jadwal/cron, event lintas app, dan webhook (khusus self-host). | Keempat trigger memicu run; webhook tidak tersedia di mode lokal dan statusnya jelas. |
| FR-DATA-021 | MUST | Setiap task eksternal MUST masuk ke outbox persisten (`outbox`) dengan status kanonik `queued`, `running`, `waiting_network`, `waiting_hitl`, `done`, `failed`, atau `dead`, dan MUST bertahan setelah restart. Nilai `succeeded`/`awaiting_hitl` adalah label UI, bukan nilai penyimpanan. | Matikan app saat queued; restart; job tetap ada dan dieksekusi; `SELECT DISTINCT state FROM outbox` hanya berisi tujuh nilai kanonik. |
| FR-DATA-022 | MUST | Retry MUST maksimal 8 attempt dengan backoff eksponensial 1 detik × 2^n (cap 1 jam) dan jitter 20%; setelah attempt kedelapan gagal, job berstatus `dead`, bukan `failed` berulang. | Log retry menunjukkan 8 attempt dengan interval sesuai dan jitter dalam rentang; attempt tidak pernah melebihi 8. |
| FR-DATA-023 | MUST | Setiap job MUST memiliki idempotency key UUIDv7 yang dikirim ke endpoint eksternal dan disimpan untuk deduplikasi. | Eksekusi ulang dengan key sama tidak menghasilkan efek ganda pada endpoint uji. |
| FR-DATA-024 | MUST | Human-in-the-loop MUST dapat disyaratkan sebelum aksi berisiko, menggunakan notifikasi lokal dengan aksi setuju/tolak dan timeout yang eksplisit. | Job berhenti di approval; menolak menandai `failed` dengan alasan; timeout sesuai konfigurasi. |
| FR-DATA-025 | MUST | Workflow MUST mendukung conditional branching dan node AI agent yang memakai provider eksplisit (lokal/BYOK) dengan output tervalidasi skema. | Cabang memilih path sesuai kondisi; output AI tidak valid ditolak dan run gagal terkontrol. |
| FR-DATA-026 | MUST | Connector MUST tersedia untuk REST, GraphQL, dan WebSocket, dengan timeout, retry policy, dan pemetaan respons. | Ketiga connector menyelesaikan request uji; timeout menghasilkan `waiting_network` atau `failed` sesuai konfigurasi. |
| FR-DATA-027 | MUST | Connector MUST tersedia untuk MQTT, PostgreSQL, MySQL, SQLite eksternal, S3/MinIO, WebDAV, CalDAV, dan CardDAV. | Setiap connector lulus smoke test terhadap layanan uji lokal. |
| FR-DATA-028 | MUST | Connector MUST tersedia untuk n8n/Activepieces webhook, Matrix, Telegram, Discord, Slack, dan LLM lokal/cloud. | Pesan terkirim ke endpoint uji; kredensial berasal dari Vault. |
| FR-DATA-029 | MUST | Pada server, HTTP node MUST memblokir CIDR privat dan loopback secara default, dan hanya dapat dibuka oleh admin melalui `security.allowPrivateEgress` dengan audit. | Request ke `127.0.0.1` dan `10.0.0.0/8` ditolak; membuka flag mengizinkan dan mencatat audit. |
| FR-DATA-030 | MUST | Workflow yang terhenti karena restart server MUST dilanjutkan dari checkpoint terakhir secara idempoten, tanpa menggandakan efek. | Matikan server saat run; nyalakan; run selesai sekali dan status konsisten. |

## 4. Model Data dan State

| Entitas | Field kunci | Invariant |
|---|---|---|
| `app_databases` | `app_id`, `workspace_id`, `path`, `schema_version`, `encrypted`, `size_bytes` | Satu baris per app+workspace |
| `crdt_change_log` | `mutation_id` UUIDv7, `app_install_id`, `table_name`, `row_id` UUIDv7 plaintext, `column_name`, `pk_hash` BLOB(32), `value_json`/`value_ciphertext`, `hlc` BLOB(24), `site_id` BLOB(16), `schema_version` | HLC unik per site; append-only; nilai sensitif hanya di `value_ciphertext` |
| `conflict_history` | `conflict_id`, `table_name`, `row_id`, `column_name`, `losing_value`, `losing_hlc`, `winning_hlc`, `resolution`, `resolved_by` | Tidak dihapus sebelum retensi berakhir |
| `crdt_schema_staging` | `id`, `app_install_id`, `from_version`, `to_version`, `migration_sql`, `status` | `to_version > from_version`; tidak diterapkan ke tabel aktif sebelum versi didukung |
| `outbox` | `id`, `workspace_id`, `workflow_id`, `idempotency_key`, `payload_ciphertext`, `state`, `attempt`, `next_attempt_at_ms`, `last_error_code` | `idempotency_key` unik; `attempt ≤ 8`; `state` hanya tujuh nilai kanonik |

`outbox` adalah satu-satunya antrean durable untuk workflow dan sync. Riwayat run **MUST NOT** disimpan di tabel terpisah: riwayat adalah deret nilai `outbox.state` dari waktu ke waktu ditambah jejak node yang diredaksi di `diagnostic_log` (terhubung lewat `incident_id`).

State job kanonik: `queued → running → done`, `running → failed`, `queued/running → waiting_network → running`, `queued/running → waiting_hitl → running`, `failed → dead` setelah attempt kedelapan. Transisi mundur selain ke `waiting_network` dan `waiting_hitl` dilarang; `done` dan `dead` bersifat terminal sampai pengguna memicu ulang dengan idempotency key baru.

HLC direpresentasikan sebagai `{physical_ms, counter, site_id}` dan diserialisasi 24 byte big-endian (6+2+16). Nilai sensitif pada mutation log disimpan per kolom sebagai `value_ciphertext` dengan envelope `version | key_id | nonce | ciphertext | tag`; `pk_hash` adalah SHA-256 dari gabungan `table_name` dan `row_id` dan bukan pengganti `row_id` untuk operasi lokal.

**Mesin CRDT.** Data micro-app memakai `cr-sqlite` bila ekstensi tersebut dapat dimuat di `@sqlite.org/sqlite-wasm`. Bila tidak dapat dimuat, implementasi mutation log kolom-level sesuai bagian ini berjalan di `packages/core-rust` dan ADR supersede terhadap [ADR-0004](../01-architecture/adr/0004-crdt-strategy.md) dibuat sebelum rilis fase 3; fase 3 **MUST NOT** ditunda karena ketergantungan ekstensi.

## 5. Error dan Recovery

| Kode | Kondisi | Recovery |
|---|---|---|
| E-DATA-001 | Database tidak dapat dibuka | Tampilkan error, tawarkan restore snapshot, jangan buat DB baru kosong |
| E-DATA-002 | Migrasi gagal | Rollback ke snapshot dan versi sebelumnya, catat penyebab |
| E-DATA-003 | Konflik skema tidak dapat diterapkan | Simpan di staging, beri tahu pengguna, lanjutkan operasi lain |
| E-DATA-004 | Outbox gagal permanen setelah 8 attempt | Tandai `dead`, pertahankan payload, sediakan retry manual dengan idempotency key baru |
| E-DATA-005 | Connector diblokir SSRF guard | Tolak request, catat audit, tampilkan alasan kebijakan |
| E-DATA-006 | Kuota storage app (`permissions.quotas.storageMb`, default 10 MB) terlampaui | Tolak penulisan, tampilkan pemakaian per kategori, tawarkan pembersihan cache tanpa menyentuh database/Vault |

## 6. Keamanan dan Privasi

- Query micro-app dibatasi pada database miliknya; tidak ada ATTACH lintas app.
- Payload sync dan backup terenkripsi; server tidak menerima plaintext.
- Kredensial connector hanya dari Vault dan tidak ditulis ke workflow definition.
- SSRF guard default menolak CIDR privat, loopback, link-local, dan metadata endpoint.
- Retensi `conflict_history` dan audit ditetapkan; penghapusan data pengguna hanya melalui aksi eksplisit.
- Mutation log lokal dipertahankan minimal 90 hari dan salinan server 180 hari sebelum compaction; tombstone dipertahankan minimal 90 hari.
- Kuota storage per app ditegakkan sebelum penulisan dan gagal tertutup dengan `E-DATA-006`; pembersihan hanya menyentuh cache yang dapat diunduh ulang.

## 7. Acceptance Criteria

- **Given** dua perangkat mengedit kolom berbeda pada record yang sama **When** sync **Then** kedua perubahan bertahan tanpa konflik.
- **Given** migrasi yang gagal di tengah **When** Host restart **Then** database kembali ke snapshot dan tidak ada record hilang.
- **Given** perangkat offline **When** workflow memanggil HTTP **Then** job berstatus `waiting_network` dan dieksekusi saat online dengan idempotency key sama.
- **Given** server menerima webhook ke alamat privat **When** node HTTP dijalankan **Then** request ditolak dan audit mencatat.
- **Given** server restart saat run **When** server hidup **Then** run dilanjutkan dari checkpoint tanpa duplikasi.
- **Given** app menulis melebihi kuota `permissions.quotas.storageMb` **When** penulisan dijalankan **Then** penulisan ditolak dengan `E-DATA-006` dan database/Vault tidak berubah.
- **Given** `cr-sqlite` gagal dimuat di `@sqlite.org/sqlite-wasm` **When** sync berjalan **Then** mutation log kolom-level di `core-rust` dipakai dan ADR supersede tercatat, tanpa menunda fase 3.

## 8. Verifikasi

| Bukti | Perintah/Prosedur |
|---|---|
| Migrasi | Fixture DB versi lama; jalankan forward dan rollback; bandingkan hash data |
| CRDT | Property test convergence dua site dengan urutan acak |
| Outbox | Simulasi offline/restart; verifikasi attempt, backoff, idempotency, dan hanya tujuh nilai `state` |
| Connector | Smoke test tiap connector terhadap layanan lokal |
| SSRF | Test CIDR privat dan metadata endpoint |
| Kuota | Isi storage hingga melewati batas; verifikasi `E-DATA-006` dan cleanup cache |
| CRDT fallback | Muat skema tanpa `cr-sqlite`; jalankan property test mutation log kolom-level |

## 9. Referensi

- [03-specs/06-sync-backup.md](06-sync-backup.md), [03-specs/manifest-v2.md](manifest-v2.md), [03-specs/error-codes.md](error-codes.md)
- [01-architecture/data-model.md](../01-architecture/data-model.md), [04-flows/08-workflow-outbox.md](../04-flows/08-workflow-outbox.md)
