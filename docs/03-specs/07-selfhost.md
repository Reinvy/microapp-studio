---
id: SPEC-SRV
title: Self-Host Server
status: accepted
owner: server
prd_refs: ["§3 Modul 7", "§4.1", "§8"]
---

# 07. Self-Host Server

## 1. Tujuan dan Ruang Lingkup

Server self-host menyediakan sync hub, registry internal, auth, RBAC/ABAC, audit, workflow runner, dan white-label tanpa batas pengguna. Tiga profil deployment harus dapat dijalankan mulai dari satu binary 512 MB sampai cluster Kubernetes.

Di luar lingkup: client sync (spec 06), kebijakan registry (spec 05), operasi harian (dokumen operations).

## 2. Aktor dan Prasyarat

| Aktor | Prasyarat |
|---|---|
| Admin | Akses server, DNS/TLS, kredensial bootstrap |
| Operator | Akses metric/log; tidak memiliki kunci data pengguna |
| Pengguna organisasi | Identitas dari IdP atau akun lokal server |
| Client | Koneksi HTTPS ke server; kunci E2EE tetap di perangkat |

## 3. Requirement

| ID | Level | Requirement | Acceptance |
|---|---|---|---|
| FR-SRV-001 | MUST | Profil Lite MUST berjalan sebagai satu binary dengan perintah `./microapp-server start`, SQLite WAL, dan local disk storage. | Binary tunggal melayani sync dan registry pada 1 vCPU/512 MB. |
| FR-SRV-002 | MUST | Lite MUST menyediakan auto-HTTPS (Let's Encrypt atau Caddy) dan MUST menolak trafik plaintext bila TLS aktif. | Sertifikat diterbitkan otomatis; HTTP dialihkan ke HTTPS. |
| FR-SRV-003 | MUST | Profil Standard MUST dapat dijalankan dengan `docker compose up -d` yang mencakup core server, PostgreSQL 16 + pgvector, Valkey, dan MinIO. | Compose menyala < 2 menit dan health check lulus. |
| FR-SRV-004 | MUST | Profil Cluster MUST menyediakan Helm chart dengan Horizontal Pod Autoscaler, PostgreSQL HA, NATS JetStream, object storage S3, dan OpenTelemetry Collector. | Chart terpasang di cluster uji; HPA menambah pod saat beban naik. |
| FR-SRV-005 | MUST | Server MUST mendukung SQLite dan PostgreSQL melalui driver yang sama dengan query portabel; fitur Lite MUST NOT bergantung pada layanan eksternal. | Lite berjalan tanpa Postgres/Redis/MinIO; Standard berjalan dengan keduanya. |
| FR-SRV-006 | MUST | Server MUST mendukung Valkey/Redis untuk cache/session pada Standard/Cluster dan MUST tetap berfungsi tanpanya pada Lite. | Mematikan Valkey membuat Standard menampilkan status degradasi tanpa kehilangan data. |
| FR-SRV-007 | MUST | Server MUST mendukung object storage S3-compatible (MinIO, Ceph, S3) untuk blob registry dan lampiran, dengan presigned URL berbatas waktu. | Unggah/unduh blob berhasil; URL kedaluwarsa setelah batas waktu. |
| FR-SRV-008 | MUST | Cluster MUST memakai NATS JetStream untuk queue workflow dan event; Lite MUST memakai durable SQLite queue dengan semantik yang sama. | Job yang sama berjalan pada kedua backend dengan status dan retry identik. |
| FR-SRV-009 | MUST | Server MUST menyediakan bundle air-gapped berisi binary/image, font, ikon, Monaco/LSP, mirror registry, model AI opsional, dokumentasi, dan checksum. | Instalasi dari bundle berhasil dengan seluruh egress diblokir. |
| FR-SRV-010 | MUST | Auth MUST mendukung OIDC dengan discovery, PKCE, dan mapping klaim ke user/role. | Login OIDC berhasil; klaim memetakan role sesuai konfigurasi. |
| FR-SRV-011 | MUST | Auth MUST mendukung OAuth2 generik untuk provider yang tidak menyediakan OIDC penuh. | Login OAuth2 berhasil dengan scope minimal. |
| FR-SRV-012 | MUST | Auth MUST mendukung SAML 2.0 dengan metadata IdP, signed assertion, dan mapping atribut. | Login SAML berhasil; assertion tidak bertanda tangan ditolak. |
| FR-SRV-013 | MUST | Auth MUST mendukung LDAP bind untuk direktori organisasi dengan TLS dan filter grup. | Login LDAP berhasil; kredensial salah ditolak tanpa bocor. |
| FR-SRV-014 | MUST | Auth MUST mendukung passkey/WebAuthn sebagai faktor utama, dengan fallback yang dapat dikonfigurasi. | Registrasi dan login passkey berhasil pada authenticator uji. |
| FR-SRV-015 | MUST | Auth MUST mendukung magic link dengan token sekali pakai berbatas waktu dan pengikatan perangkat. | Link kedaluwarsa setelah batas; penggunaan kedua ditolak. |
| FR-SRV-016 | MUST | Server MUST menerapkan RBAC dengan peran minimal `owner`, `admin`, `maintainer`, `member`, `viewer` dan izin per resource. | Matriks izin diuji per peran; akses di luar izin ditolak 403. |
| FR-SRV-017 | MUST | Server MUST menerapkan ABAC berbasis policy JSON (atribut user, resource, aksi, konteks) yang dievaluasi sebelum aksi. | Policy menolak akses berdasarkan atribut; audit mencatat alasan. |
| FR-SRV-018 | MUST | Setiap aksi sensitif MUST dicatat pada `audit_log_chain` dengan algoritma yang sama seperti host: `entry_hash = SHA-256(prev_hash \|\| u64_be(seq_id) \|\| JCS(payload))`, `payload = {actor, action, target, metadata, created_at_ms}`, `prev_hash` 32 byte nol untuk genesis; penyisipan/penghapusan MUST terdeteksi. | Tool verifikasi host dapat memverifikasi rantai server; menghapus satu entri membuat verifikasi gagal. |
| FR-SRV-019 | MUST | Audit MUST dapat diekspor real-time ke Loki, Elasticsearch, Wazuh, atau Syslog dengan format terstruktur. | Ekspor diterima keempat tujuan uji; tidak ada data rahasia. |
| FR-SRV-020 | MUST | White-label MUST dikonfigurasi melalui `branding.yaml` dengan field `appName`, `shortName`, `logo`, `favicon`, `colors`, `domain`, `defaultRegistry`, `featureFlags`, `legal`, `supportUrl`, `locale`, tanpa fork. | Mengubah branding mengubah UI dan metadata tanpa rebuild; field tidak valid ditolak. |
| FR-SRV-021 | MUST | Server MUST NOT memiliki tabel billing, subscription, seat limit, atau pembatasan fitur berdasarkan lisensi. | Skema tidak memuat tabel billing; jumlah pengguna tidak dibatasi. |
| FR-SRV-022 | SHOULD | Server MUST menyediakan plugin host `wazero` untuk sync connector, LLM adapter, theme, dan native capability bridge dengan deklarasi capability, consent eksplisit, dan crash isolation per plugin. | Plugin uji dimuat; plugin tanpa capability yang disetujui ditolak; crash plugin tidak menjatuhkan server. |
| FR-SRV-023 | MUST | Server MUST menyediakan backup dan restore untuk database, object storage, dan konfigurasi, dengan verifikasi checksum. | Restore pada instance baru memulihkan data dan konfigurasi; checksum diverifikasi. |
| FR-SRV-024 | MUST | Upgrade MUST menjalankan migrasi database yang dapat di-rollback dan MUST menolak startup bila versi schema tidak kompatibel. | Upgrade berhasil; migrasi gagal memicu rollback; versi tidak cocok menolak start. |
| FR-SRV-025 | MUST | Server MUST menyediakan endpoint health/readiness yang membedakan dependencies (DB, storage, queue) dan tidak membocorkan detail internal. | Health melaporkan status per dependency; tanpa kredensial atau stack trace. |
| FR-SRV-026 | MUST | Profil Lite MUST beroperasi dalam 1 vCPU dan 512 MB RAM untuk 1–20 pengguna aktif, dan MUST menyelesaikan deployment dari nol < 2 menit. | Uji beban 20 pengguna pada 512 MB tanpa OOM; waktu instalasi terukur < 2 menit. |
| FR-SRV-027 | MUST | Server MUST meng-host registry internal dan sync hub dengan format yang sama seperti registry publik. | Indeks internal dapat dibaca client tanpa perubahan format. |
| FR-SRV-028 | MUST | Server MUST menjalankan workflow 24/7 dan webhook listener, termasuk trigger cron, DB, lintas app, dan webhook; node dan connector diimplementasikan di Go dan function dijalankan sebagai WASM (`wazero`) dengan kontrak input/output identik dengan runner web. | Job cron berjalan tanpa client aktif; webhook diterima dan memicu run; fixture workflow menghasilkan output sama di runner web dan server. |
| FR-SRV-029 | MUST | Server MUST menyediakan session management dengan access token 15 menit, refresh/session 30 hari, rotasi refresh, dan revoke per device. | Token kedaluwarsa sesuai; refresh berputar; revoke menghentikan sesi perangkat. |
| FR-SRV-030 | MUST | Server MUST menegakkan SSRF guard pada seluruh egress (workflow, webhook, plugin) dan MUST mencatat setiap penolakan. | Request ke CIDR privat ditolak; audit mencatat target dan alasan. |

### 3.1 Notifikasi push

Notifikasi push server MUST memakai WebPush (VAPID) atau UnifiedPush; FCM dan APNs MUST NOT menjadi jalur wajib. Bila perangkat tidak memiliki endpoint push mandiri, server MUST menyimpan notifikasi dan mengirimkannya saat klien terhubung (polling/WebSocket), bukan mengandalkan layanan pihak ketiga. Payload push MUST NOT memuat isi data E2EE.

## 4. Model Data dan State

| Entitas | Field kunci | Invariant |
|---|---|---|
| `server_users` | `id`, `oidc_sub`, `email`, `display_name`, `created_at`, `disabled_at` | `oidc_sub` unik per issuer |
| `server_sessions` | `id`, `user_id`, `refresh_hash`, `device_id`, `expires_at`, `revoked_at` | Refresh token di-hash; satu sesi per device |
| `server_tenants_rbac` | `workspace_id`, `user_id`, `role`, `policy_json` (ABAC) | Role ∈ `owner\|admin\|maintainer\|member\|viewer`; tidak ada role lain; policy valid |
| `server_registry_index` | `id`, `name`, `public_key`, `index_json`, `updated_at` | Satu indeks aktif per registry |
| `server_blobs` | `id`, `sha256`, `size`, `path`, `created_at` | `sha256` unik; immutable |
| `audit_log_chain` | `seq_id`, `actor`, `action`, `target`, `metadata_json`, `created_at_ms`, `prev_hash`, `entry_hash` | Rantai hash valid; append-only; algoritma sama dengan host |

`outbox` server memakai status kanonik `queued|running|waiting_network|waiting_hitl|done|failed|dead`; riwayat run adalah deret `outbox.state` plus trace node di log diagnostik, tanpa tabel run terpisah. Retensi log diagnostik server minimal 180 hari.

State server: `booting → migrating → ready → degraded → ready`, dengan `ready → draining → stopped` untuk graceful shutdown. `degraded` MUST tetap melayani operasi baca.

## 5. Error dan Recovery

| Kode | Kondisi | Recovery |
|---|---|---|
| E-SRV-001 | Migrasi database gagal | Rollback ke versi sebelumnya, jangan mulai melayani |
| E-SRV-002 | IdP tidak dapat dijangkau | Tampilkan status, izinkan sesi aktif sampai kedaluwarsa, jangan fallback tanpa izin |
| E-SRV-003 | Object storage tidak tersedia | Tandai degraded, antre unggahan, tetap layani sync |
| E-SRV-004 | Queue backend gagal | Tandai degraded, pertahankan job, retry dengan backoff |
| E-SRV-005 | Audit chain tidak valid (celah `seq_id`, urutan salah, atau hash tidak cocok) | Hentikan aksi sensitif, tampilkan insiden, jangan menimpa log |

## 6. Keamanan dan Privasi

- Server tidak memiliki kunci dekripsi data pengguna.
- Session token disimpan sebagai hash; refresh rotation wajib.
- RBAC/ABAC dievaluasi di server, bukan hanya di UI.
- SSRF guard mencakup metadata endpoint (`169.254.169.254`), loopback, dan CIDR privat.
- Log tidak memuat token, kredensial, atau isi payload E2EE.
- Audit chain diverifikasi saat startup dan sebelum ekspor.
- Plugin berjalan di `wazero` dengan capability yang dideklarasikan dan disetujui; crash plugin diisolasi per instance dan tidak menghentikan server.
- Notifikasi push memakai WebPush/UnifiedPush; tidak ada ketergantungan wajib pada FCM/APNs, dan payload push tidak memuat isi E2EE.

## 7. Acceptance Criteria

- **Given** VPS 1 vCPU/512 MB **When** menjalankan Lite **Then** server siap < 2 menit dan melayani 20 pengguna tanpa OOM.
- **Given** IdP OIDC **When** pengguna login **Then** sesi dibuat dengan access 15 menit dan refresh 30 hari.
- **Given** policy ABAC menolak akses **When** user mencoba aksi **Then** 403 dan audit mencatat alasan.
- **Given** satu entri audit dihapus **When** verifikasi rantai **Then** kegagalan terdeteksi.
- **Given** bundle air-gap **When** egress diblokir total **Then** instalasi dan operasi inti berhasil.

## 8. Verifikasi

| Bukti | Perintah/Prosedur |
|---|---|
| Deploy | `docker compose up -d`; ukur waktu dan health |
| Load | 20 pengguna simulasi pada 512 MB; catat RSS |
| Auth | Test OIDC/SAML/LDAP/passkey/magic link dengan IdP uji |
| RBAC/ABAC | Matriks izin per peran dan policy |
| Audit | Verifikasi rantai, ekspor ke empat tujuan; bandingkan dengan tool verifikasi host |
| Plugin | Fixture plugin `wazero` dengan dan tanpa capability; uji crash isolation |
| Workflow parity | Fixture workflow yang sama dijalankan di runner web dan server; bandingkan output |
| Air-gap | Instalasi dengan `iptables` egress drop |

## 9. Referensi

- [03-specs/06-sync-backup.md](06-sync-backup.md), [03-specs/07-selfhost.md](07-selfhost.md)
- [01-architecture/selfhost.md](../01-architecture/selfhost.md), [09-operations/selfhost-runbook.md](../09-operations/selfhost-runbook.md), [04-flows/10-selfhost-airgap.md](../04-flows/10-selfhost-airgap.md)
