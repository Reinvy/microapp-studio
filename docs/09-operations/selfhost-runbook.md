---
id: OPS-SELFHOST
title: Runbook Self-Host
status: accepted
owner: ops
prd_refs: ["§3 Modul 7"]
---

# Runbook Self-Host

## 1. Tujuan dan Ruang Lingkup

Runbook ini adalah prosedur operasi untuk memasang, memverifikasi, meng-upgrade, dan memulihkan server MicroApp Studio pada tiga profil deployment: **Lite**, **Standard**, dan **Cluster**. Kontrak perilaku server ada di [03-specs/07-selfhost.md](../03-specs/07-selfhost.md); keputusan arsitektur ada di [01-architecture/selfhost.md](../01-architecture/selfhost.md) dan [ADR-0005](../01-architecture/adr/0005-go-selfhost-server.md).

Runbook ini bersifat preskriptif untuk target PRD. Status implementasi tidak dinyatakan di sini; status nyata ada di [00-foundation/implementation-status.md](../00-foundation/implementation-status.md).

Di luar ruang lingkup: pembuatan bundle air-gap (lihat [airgap-runbook.md](airgap-runbook.md)), kebijakan retensi backup (lihat [backup-restore.md](backup-restore.md)), dan penanganan insiden (lihat [incident-response.md](incident-response.md)).

## 2. Prasyarat dan Peran Operator

| Peran server | Tanggung jawab dalam runbook | Batas |
|---|---|---|
| `owner` | Bootstrap, kunci signing registry, perubahan TLS, pemulihan bencana | Tidak boleh dipakai untuk operasi harian |
| `admin` | Kelola pengguna, registry internal, kebijakan, audit | Tidak memegang kunci data pengguna |
| `maintainer` | Deploy, upgrade, backup, health check, workflow | Tidak mengubah kebijakan keamanan |
| `viewer` | Baca health, metrik, dan audit | Tanpa perubahan konfigurasi |

Prasyarat di luar server:

- DNS A/AAAA untuk domain server sudah mengarah ke instance.
- Port **8080** (HTTP) dan **8443** (HTTPS) dapat dijangkau; port **80/443** diperlukan bila `tls.mode: auto` memakai ACME.
- Waktu sistem tersinkron dengan sumber waktu internal.
- Kredensial database, object storage, dan IdP disimpan di secret manager atau environment variable, bukan di `microapp.yaml`.
- Salinan `microapp.yaml` dan `branding.yaml` berada di repositori konfigurasi operator, bukan di image.

## 3. Matriks Profil

| Profil | Perintah deploy | Database | Komponen wajib | Anggaran minimum |
|---|---|---|---|---|
| Lite | `./microapp-server start` | SQLite WAL | Binary tunggal, local disk | **1 vCPU, 512 MB RAM** |
| Standard | `docker compose up -d` | PostgreSQL 16 + pgvector | Core server, Valkey, MinIO | 2–4 vCPU, 4 GB RAM |
| Cluster | `helm install` | PostgreSQL HA | Core server, Valkey, MinIO/S3, NATS JetStream, OTel Collector | Multi-node, HPA |

Anggaran Lite adalah gate rilis: server **MUST** tetap sehat pada 1 vCPU/512 MB untuk 1–20 pengguna aktif dan menyelesaikan deployment dari nol di bawah dua menit (`FR-SRV-026`). Kenaikan konsumsi tanpa penurunan fungsi dianggap regresi.

## 4. Instalasi

### 4.1 Lite

```bash
# 1. Verifikasi artefak rilis
sha256sum -c microapp-server-linux-amd64.sha256

# 2. Pasang binary dan direktori data
install -m 0755 microapp-server /usr/local/bin/microapp-server
install -d -m 0750 /var/lib/microapp /etc/microapp

# 3. Letakkan konfigurasi
install -m 0640 microapp.yaml /etc/microapp/microapp.yaml
install -m 0640 branding.yaml /etc/microapp/branding.yaml

# 4. Jalankan dari direktori konfigurasi
cd /etc/microapp && ./microapp-server start
```

Konfigurasi minimum Lite:

```yaml
listen: ":8080"
dataDir: "/var/lib/microapp"
database:
  url: "sqlite:///var/lib/microapp/microapp.db"
storage:
  type: "filesystem"
  path: "/var/lib/microapp/blobs"
auth:
  provider: "oidc"
  issuer: "https://id.example.org"
  clientId: "microapp"
  roleClaim: "groups"
registry:
  name: "internal"
  url: "https://microapp.example.org"
  publicKey: "/etc/microapp/registry.pub"
  policy: "internal"
workflow:
  enabled: true
  concurrency: 4
  timeout: "600s"
  runner: "local"
security:
  allowPrivateEgress: false
tls:
  mode: "auto"
  domain: "microapp.example.org"
branding: "/etc/microapp/branding.yaml"
telemetry:
  optIn: false
```

Aturan yang mengikat:

- Server **MUST** gagal start bila ada field tidak valid; nilai fallback diam-diam dilarang.
- `tls.mode: auto` **MUST** gagal tertutup bila sertifikat tidak dapat diperoleh (`FR-SRV-002`).
- `telemetry.optIn` **MUST** tetap `false` kecuali analytics self-host diaktifkan eksplisit (`FR-DEV-007`).
- `security.allowPrivateEgress` **MUST** tetap `false` kecuali ada kebutuhan workflow terdokumentasi; setiap perubahan dicatat audit (`FR-SRV-030`).

Unit systemd minimum:

```ini
[Unit]
Description=MicroApp Studio Server
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=microapp
Group=microapp
WorkingDirectory=/etc/microapp
ExecStart=/usr/local/bin/microapp-server start
Restart=on-failure
RestartSec=3
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
```

```bash
systemctl daemon-reload
systemctl enable --now microapp
journalctl -u microapp -f
```

### 4.2 Standard

```bash
cd deploy/docker
cp .env.example .env
# Isi kredensial database, object storage, dan auth pada .env sesuai microapp.yaml.
docker compose up -d
docker compose ps
```

Compose **MUST** menjalankan core server, PostgreSQL 16 + pgvector, Valkey, dan MinIO, serta lulus health check dalam dua menit (`FR-SRV-003`). Jalankan migrasi database melalui mekanisme server saat startup; migrasi yang gagal **MUST** memicu rollback dan server tidak boleh melayani (`FR-SRV-024`, `E-SRV-001`).

### 4.3 Cluster

```bash
helm install microapp ./deploy/helm/microapp \
  -n microapp --create-namespace \
  -f values.yaml

kubectl -n microapp rollout status deploy/microapp --timeout=10m
kubectl -n microapp get pods,hpa
```

Chart **MUST** menyediakan HPA, PostgreSQL HA, NATS JetStream, object storage S3, dan OpenTelemetry Collector (`FR-SRV-004`). Cluster **MUST** menolak startup bila PostgreSQL atau NATS tidak sehat; readiness gate tidak boleh dilewati.

## 5. Health Check dan Smoke Test

| Pemeriksaan | Perintah | Kriteria lulus |
|---|---|---|
| Liveness | `curl -fsS http://127.0.0.1:8080/healthz` | HTTP 200, tanpa stack trace atau kredensial |
| Readiness | `curl -fsS https://microapp.example.org:8443/readyz` | Status per dependency: DB, storage, queue |
| TLS | `curl -fsS -o /dev/null -w '%{http_code}' https://microapp.example.org:8443/` | 200; HTTP 8080 mengalihkan ke HTTPS |
| Registry internal | `curl -fsS https://microapp.example.org:8443/registry/index.json` | Indeks bertanda tangan dapat diunduh |
| Audit chain | Verifikasi saat startup dan sebelum ekspor | Rantai `prev_hash`/`entry_hash` valid |
| Login | Login OIDC/SAML/LDAP/passkey pada akun uji | Sesi dibuat; role terpetakan |
| Sync | Klien uji mengirim satu batch ciphertext | `ACK` diterima; server tidak dapat membaca payload |

Endpoint health **MUST** membedakan dependency dan **MUST NOT** membocorkan detail internal (`FR-SRV-025`). Bila satu dependency gagal, server masuk `degraded` dan tetap melayani operasi baca.

## 6. TLS dan Domain

| `tls.mode` | Perilaku | Prasyarat |
|---|---|---|
| `auto` | ACME menerbitkan sertifikat; HTTP dialihkan ke HTTPS; gagal tertutup | DNS benar, port 80/443 atau 443 dapat dijangkau |
| `manual` | Sertifikat dan kunci dari file operator | `cert` dan `key` valid; chain lengkap |
| `off` | Hanya untuk loopback atau di belakang reverse proxy tepercaya | Tidak boleh diekspos ke jaringan pengguna |

Aturan:

- Bila TLS aktif, server **MUST** menolak trafik plaintext (`FR-SRV-002`).
- Reverse proxy **MUST** meneruskan header `X-Forwarded-Proto` dan `X-Forwarded-For` hanya dari alamat proxy tepercaya.
- Rotasi sertifikat **MUST** diuji sebelum masa berlaku habis; alert sertifikat ada di [observability.md](observability.md).

## 7. Autentikasi, Sesi, dan RBAC

| Metode | Profil | Catatan operasional |
|---|---|---|
| OIDC | Standard/Cluster | Discovery + PKCE; klaim grup dipetakan ke role |
| OAuth2 | Standard/Cluster | Hanya provider tanpa OIDC penuh |
| SAML 2.0 | Standard/Cluster | Assertion wajib bertanda tangan |
| LDAP | Standard/Cluster | Bind service account; filter grup → role |
| Passkey/WebAuthn | Semua | Disarankan untuk `owner` dan `admin` |
| Magic link | Semua | Sekali pakai, berbatas waktu, rate limit |

- Access token berlaku **15 menit**; refresh/session **30 hari**, dirotasi setiap pemakaian, dan dapat dicabut per device (`FR-SRV-029`).
- Role bawaan: `owner`, `admin`, `maintainer`, `member`, `viewer` (`FR-SRV-016`). ABAC mengevaluasi atribut resource sebelum aksi (`FR-SRV-017`).
- Auth **MUST** gagal tertutup: IdP tidak terjangkau berarti login ditolak, bukan bypass (`E-SRV-002`).
- Bootstrap `owner` hanya aktif saat database kosong; kredensial bootstrap **MUST** hangus setelah pemakaian pertama dan tidak boleh dipakai untuk operasi harian.
- Pencabutan perangkat **MUST** menghentikan sesi aktif berikutnya, bukan hanya login baru.

## 8. Audit

- Setiap aksi sensitif **MUST** menghasilkan event berantai hash: login, perubahan role, perubahan konfigurasi, akses registry, publish, workflow manual, pencabutan device, dan perubahan kunci (`FR-SRV-018`).
- Audit **MUST** append-only dari sudut pandang API; tidak ada endpoint edit atau hapus.
- Ekspor SIEM **MUST** mendukung Loki, Elasticsearch, Wazuh, dan Syslog tanpa menyertakan rahasia atau payload pengguna (`FR-SRV-019`).
- Bila verifikasi rantai gagal, hentikan aksi sensitif dan buka insiden SEV-1 (`E-SRV-005`); jangan menimpa log.

Retensi audit dikonfigurasi operator; penghapusan hanya oleh `owner` dan menghasilkan event audit baru.

## 9. Backup dan Restore

Prosedur lengkap ada di [backup-restore.md](backup-restore.md). Aturan minimum:

- Backup **MUST** mencakup database, object storage, konfigurasi non-rahasia, dan audit (`FR-SRV-023`).
- Backup **MUST** terenkripsi dan diuji restore minimal sekali per siklus rilis.
- Backup **MUST** dibuat sebelum setiap upgrade yang menjalankan migrasi.
- Restore **MUST** diverifikasi checksum dan signature-nya sebelum diterapkan.
- Setelah restore, jumlah record, blob hash, rantai audit, dan login IdP **MUST** diverifikasi pada instance bersih.
- Binary **MUST NOT** lebih lama dari skema database hasil restore; bila skema lebih baru, jalankan binary versi yang sesuai atau pulihkan backup yang kompatibel.

## 10. Upgrade dan Rollback

### 10.1 Lite

```bash
# 1. Backup pra-upgrade (lihat backup-restore.md)
# 2. Hentikan layanan
systemctl stop microapp

# 3. Ganti binary dan mulai
install -m 0755 microapp-server /usr/local/bin/microapp-server
systemctl start microapp

# 4. Verifikasi
curl -fsS https://microapp.example.org:8443/readyz
journalctl -u microapp --since '10 min ago'
```

Bila migrasi gagal (`E-SRV-001`), server **MUST NOT** melayani. Kembalikan binary versi sebelumnya; bila skema database sudah lebih baru dan migrasi tidak reversibel, pulihkan backup pra-upgrade. Downgrade ke binary yang lebih lama dari skema **MUST** ditolak.

### 10.2 Standard

```bash
docker compose pull
docker compose up -d
docker compose logs --tail=200 core
```

Rollback: pin tag image ke versi sebelumnya pada `.env`, jalankan `docker compose up -d`, lalu pulihkan backup bila migrasi tidak reversibel.

### 10.3 Cluster

```bash
helm upgrade microapp ./deploy/helm/microapp \
  -n microapp -f values.yaml \
  --atomic --wait --timeout 10m

# Rollback
helm rollback microapp -n microapp
```

Aturan upgrade:

- Migrasi **MUST** dapat di-rollback dan berjalan otomatis dengan backup pra-migrasi (`FR-SRV-024`).
- Upgrade **MUST** menjaga sesi dan data pengguna; downtime Lite **SHOULD** di bawah dua menit.
- Perubahan `database.url` **MUST** melalui prosedur migrasi, bukan swap langsung.

## 11. Scaling dan Migrasi Profil

| Dari → Ke | Prosedur | Verifikasi |
|---|---|---|
| Lite → Standard | Backup Lite, deploy Standard, restore ke instance baru, arahkan klien | Jumlah record, blob hash, audit chain, dan login IdP cocok |
| Standard → Cluster | Backup database + object storage, deploy chart, restore, alihkan DNS | Readiness semua dependency, HPA aktif, sync batch lulus |
| Scale out Standard | Tambah replika API stateless di belakang load balancer | Sesi tetap valid; tidak ada state lokal |
| Scale out Cluster | Naikkan `replicas`/HPA; NATS dan PostgreSQL HA tetap sehat | Tidak ada job hilang; graceful shutdown mengembalikan job ke queue |

- API **MUST** stateless kecuali data persisten di database/object storage.
- Migrasi profil **MUST NOT** mengubah format data pengguna; ciphertext dan manifest tetap sama.
- Split-brain **MUST** dicegah dengan leader election untuk job scheduler.

## 12. Troubleshooting

| Gejala | Kemungkinan penyebab | Tindakan |
|---|---|---|
| Startup berhenti dengan field konfigurasi | `microapp.yaml` tidak valid | Perbaiki field yang disebut; server tidak boleh dijalankan dengan fallback |
| `E-SRV-001` migrasi gagal | Skema tidak kompatibel atau disk penuh | Rollback binary, pulihkan backup, periksa ruang disk |
| `E-SRV-002` login gagal | IdP tidak terjangkau | Periksa discovery URL dan jaringan; sesi aktif tetap berlaku |
| `E-SRV-003` unggahan gagal | MinIO/S3 tidak tersedia | Perbaiki endpoint/kredensial/bucket; server degraded, sync tetap jalan |
| `E-SRV-004` job tertahan | NATS/Valkey gagal | Periksa queue; job dipertahankan dan di-retry dengan backoff |
| `E-SRV-005` audit chain invalid | Entri diubah atau dihapus | Hentikan aksi sensitif, ekspor bukti, buka SEV-1 |
| `E-NET-002` koneksi klien ditolak | TLS pinning gagal setelah rotasi sertifikat | Verifikasi fingerprint yang dipin; jangan turunkan ke plaintext |
| HTTP 502 pada reverse proxy | Port salah atau TLS gagal | Pastikan backend 8080/8443 dan sertifikat valid |
| RSS melewati 512 MB pada Lite | Workflow concurrency terlalu tinggi atau regresi | Turunkan concurrency, catat sebagai regresi `FR-SRV-026` |
| Registry internal tidak terbaca klien | Indeks tidak ditandatangani kunci yang dipin | Tanda tangani ulang indeks dengan kunci registry internal yang benar |

## 13. Verifikasi

| Bukti | Prosedur |
|---|---|
| Instalasi Lite | Deploy dari nol pada 1 vCPU/512 MB; ukur waktu < 2 menit dan RSS |
| Instalasi Standard | `docker compose up -d`; semua service sehat < 2 menit |
| Instalasi Cluster | `helm install`; rollout selesai; HPA terdeteksi |
| TLS | HTTP 8080 mengalihkan ke HTTPS 8443; sertifikat valid |
| Auth | Login OIDC/SAML/LDAP/passkey; sesi 15 menit/30 hari; revoke per device |
| RBAC/ABAC | Matriks izin lima role; policy menolak akses dan mencatat audit |
| Audit | Hapus satu entri uji pada salinan; verifikasi rantai gagal |
| Upgrade | Upgrade dengan migrasi; rollback berhasil; data utuh |
| Restore | Instance baru dipulihkan dari backup; record, blob, audit, dan login cocok |
| Beban | 20 pengguna simulasi pada Lite tanpa OOM |

## 14. Referensi

- [03-specs/07-selfhost.md](../03-specs/07-selfhost.md), [03-specs/error-codes.md](../03-specs/error-codes.md)
- [01-architecture/selfhost.md](../01-architecture/selfhost.md), [01-architecture/threat-model.md](../01-architecture/threat-model.md)
- [ADR-0005](../01-architecture/adr/0005-go-selfhost-server.md)
- [airgap-runbook.md](airgap-runbook.md), [backup-restore.md](backup-restore.md), [observability.md](observability.md), [incident-response.md](incident-response.md)
