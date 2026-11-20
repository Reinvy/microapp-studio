---
id: OPS-AIRGAP
title: Runbook Air-Gap
status: accepted
owner: ops
prd_refs: ["§3 Modul 7"]
---

# Runbook Air-Gap

## 1. Tujuan dan Ruang Lingkup

Runbook ini menetapkan cara membuat, memverifikasi, memasang, dan memperbarui instalasi MicroApp Studio yang beroperasi tanpa egress internet sama sekali. Cakupannya: bundle offline server, mirror registry, model AI lokal, aset UI (font, ikon, Monaco, language server), pembaruan offline, dan checklist bukti tanpa egress.

Kontrak server ada di [03-specs/07-selfhost.md](../03-specs/07-selfhost.md); arsitektur air-gap ada di [01-architecture/selfhost.md](../01-architecture/selfhost.md). Runbook ini melengkapi, bukan menggantikan, [selfhost-runbook.md](selfhost-runbook.md).

## 2. Definisi dan Prinsip

**Air-gapped** berarti instance tidak melakukan koneksi keluar ke internet pada runtime, termasuk DNS publik, CDN font, telemetry, pembaruan otomatis, dan unduhan model. Seluruh dependensi datang dari media yang diverifikasi.

| Prinsip | Konsekuensi operasional |
|---|---|
| Verifikasi sebelum eksekusi | Checksum dan signature bundle diverifikasi di jaringan terisolasi sebelum instalasi |
| Tidak ada phone-home | Update manual; tidak ada pemeriksaan versi otomatis |
| Aset dibundel lokal | Font, ikon, Monaco, dan LSP dimuat dari bundle, bukan CDN (`NFR-SUPPLY-003`) |
| Telemetry mati permanen | `telemetry.optIn: false` dan tidak boleh diubah oleh update |
| Reproducible | Bundle mencatat commit, digest image, dan SBOM (`NFR-SUPPLY-001`) |

## 3. Komponen Bundle

| Komponen | Isi | Wajib |
|---|---|---|
| Binary server | `microapp-server` untuk `linux-amd64` dan `linux-arm64` | Ya |
| Image container | Core server, PostgreSQL 16 + pgvector, Valkey, MinIO untuk profil Standard/Cluster | Ya untuk container |
| Chart | Helm chart dan values contoh | Ya untuk Cluster |
| SBOM | CycloneDX atau SPDX untuk seluruh artefak | Ya (`NFR-SUPPLY-001`) |
| Checksum | `SHA256SUMS` untuk setiap berkas | Ya (`NFR-SUPPLY-002`) |
| Signature | Detached Ed25519 atas `SHA256SUMS` dengan kunci rilis | Ya |
| Mirror registry | Indeks JSON statis + blob `.mapp` + signature registry internal | Ya |
| Model AI | Model lokal opsional (GGUF/format adapter) untuk Ollama/llama.cpp/WebLLM | Opsional |
| Aset UI | Font Inter dan JetBrains Mono, ikon, Monaco, language server TypeScript, dokumentasi | Ya |
| Dokumentasi | Salinan dokumen `docs/` yang relevan untuk operator | Ya |

Bundle **MUST** memuat seluruh komponen yang dibutuhkan operasi inti; bundle yang hanya berisi binary tanpa aset UI dan mirror registry tidak memenuhi `FR-SRV-009`.

## 4. Membuat Bundle

Pembuatan bundle dilakukan pada host yang memiliki akses ke artefak rilis, bukan pada jaringan terisolasi.

```bash
# 1. Siapkan direktori kerja deterministik
mkdir -p bundle/{binary,images,charts,registry,models,assets,docs,sbom}
export VERSION=1.0.0
export TARGET_ARCH=amd64

# 2. Salin artefak
cp microapp-server-linux-${TARGET_ARCH} bundle/binary/microapp-server
cp deploy/helm/microapp-${VERSION}.tgz bundle/charts/
docker save microapp/server:${VERSION} -o bundle/images/microapp-server-${VERSION}.tar
cp sbom/*.json bundle/sbom/
cp -r assets/fonts assets/icons assets/monaco assets/lsp bundle/assets/
cp -r registry-mirror/* bundle/registry/
cp -r docs bundle/docs

# 3. Buat arsip deterministik
tar --sort=name \
    --mtime='1980-01-01 00:00:00Z' \
    --owner=0 --group=0 --numeric-owner \
    -cf microapp-airgap-${VERSION}-${TARGET_ARCH}.tar bundle/

# 4. Hitung checksum dan tanda tangani
( cd bundle && find . -type f -print0 | sort -z | xargs -0 sha256sum ) > SHA256SUMS
openssl pkeyutl -sign -inkey release-ed25519.pem -rawin \
  -in SHA256SUMS -out SHA256SUMS.sig
```

Aturan pembuatan:

- Arsip **MUST** deterministik: urutan entry tetap, timestamp tetap, tanpa extended attribute yang tidak perlu.
- Checksum **MUST** mencakup setiap berkas yang dieksekusi atau dimuat runtime.
- Signature **MUST** detached Ed25519 dan dibuat dengan kunci rilis yang fingerprint-nya dipublikasikan.
- Bundle **MUST** mencatat versi, commit, dan digest image di `bundle/manifest.json`.
- Bundle **MUST NOT** memuat kunci privat, token, atau konfigurasi rahasia.

## 5. Verifikasi Bundle

Lakukan pada host tujuan sebelum mengekstrak apa pun yang dieksekusi.

```bash
# 1. Verifikasi signature checksum
openssl pkeyutl -verify -pubin -inkey release-ed25519.pub -rawin \
  -in SHA256SUMS -sigfile SHA256SUMS.sig

# 2. Verifikasi checksum seluruh berkas
sha256sum -c SHA256SUMS

# 3. Periksa isi arsip tanpa mengekstrak
tar -tvf microapp-airgap-${VERSION}-${TARGET_ARCH}.tar | head -50
```

| Pemeriksaan | Kriteria lulus | Tindakan bila gagal |
|---|---|---|
| Signature checksum | Verifikasi Ed25519 sukses | Hentikan; jangan ekstrak |
| Checksum berkas | Seluruh baris `OK` | Hentikan; minta media baru |
| SBOM | Memuat seluruh dependency runtime | Hentikan; bundle tidak lengkap |
| Path arsip | Tidak ada path absolut atau `..` | Hentikan; indikasi arsip berbahaya |
| Versi | Sama dengan versi rilis yang diumumkan | Hentikan; jangan campur versi |

## 6. Instalasi Tanpa Egress

### 6.1 Lite

```bash
tar -xf microapp-airgap-${VERSION}-${TARGET_ARCH}.tar
install -m 0755 bundle/binary/microapp-server /usr/local/bin/microapp-server
install -d -m 0750 /var/lib/microapp /etc/microapp
cd /etc/microapp && ./microapp-server start
```

Gunakan `tls.mode: manual` dengan sertifikat dari CA internal; `tls.mode: auto` **MUST NOT** dipakai karena ACME membutuhkan internet.

### 6.2 Standard

```bash
docker load -i bundle/images/microapp-server-${VERSION}.tar
docker load -i bundle/images/postgres-16-pgvector.tar
docker load -i bundle/images/valkey.tar
docker load -i bundle/images/minio.tar

cd deploy/docker
docker compose up -d --pull never
```

Compose **MUST** memakai image yang sudah dimuat dan `pull_policy: never`; kegagalan pull tidak boleh menjadi jalur fallback ke registry internet.

### 6.3 Cluster

```bash
helm install microapp bundle/charts/microapp-${VERSION}.tgz \
  -n microapp --create-namespace \
  -f values-airgap.yaml
```

`values-airgap.yaml` **MUST** menetapkan image digest lokal, menonaktifkan `imagePullPolicy: Always`, dan mengarahkan registry internal ke mirror di dalam jaringan.

## 7. Mirror Registry

- Mirror **MUST** menyajikan indeks JSON statis dengan format yang sama seperti registry publik (`FR-SRV-027`).
- Indeks **MUST** ditandatangani kunci registry internal; kunci author tetap terpisah (`FR-REG-012`).
- Klien **MUST** menambahkan URL mirror sebagai sumber `internal` dan memprioritaskannya.
- Indeks di-cache 24 jam dan tetap dipakai tanpa kedaluwarsa saat offline (`FR-REG-003`).
- Blob `.mapp` **MUST** disalin lengkap dengan `sha256` yang cocok dengan indeks.

```bash
# Sajikan mirror sebagai berkas statis di jaringan internal
python3 -m http.server 8000 --directory /srv/microapp-registry
```

Untuk produksi gunakan Nginx atau MinIO dengan TLS internal; jangan mengekspos mirror ke internet.

## 8. Model AI Lokal

| Adapter | Sumber model | Catatan |
|---|---|---|
| Ollama | Model yang diimpor dari media | `ollama create <nama> -f Modelfile` dengan `FROM ./model.gguf` |
| llama.cpp | Berkas GGUF | Didaftarkan pada direktori model lokal |
| WebLLM | Bobot model yang dibundel | Dimuat dari aset lokal, bukan CDN |
| BYOK OpenAI-compatible | Gateway internal | Hanya jika organisasi menyediakan endpoint internal |

- Unduhan model otomatis **MUST NOT** terjadi; ketiadaan model menampilkan status tidak tersedia dan menawarkan BYOK atau input manual.
- Load model maksimal **300 detik**; generasi maksimal **120 detik**.
- Model **MUST** disimpan di luar direktori data pengguna dan diverifikasi checksum-nya.
- Tidak ada telemetry inferensi; prompt dan hasil tidak dikirim ke pihak ketiga.

## 9. Font, Ikon, Monaco, dan Language Server

- Font Inter dan JetBrains Mono **MUST** dibundel dan dimuat via `@font-face` lokal.
- Ikon **MUST** berasal dari paket ikon yang dibundel, bukan layanan ikon eksternal.
- Monaco **MUST** dimuat dari aset aplikasi; worker editor tidak boleh mengambil CDN.
- Language server TypeScript dan library tipe **MUST** berada di bundle dan diarahkan melalui konfigurasi LSP lokal.
- Dokumentasi bantuan **MUST** tersedia offline di dalam aplikasi atau salinan `docs/`.

## 10. Update Offline

```bash
# 1. Verifikasi bundle baru (bagian 5)
# 2. Backup pra-upgrade (lihat backup-restore.md)
# 3. Hentikan layanan
systemctl stop microapp

# 4. Ganti binary/image/chart
install -m 0755 bundle/binary/microapp-server /usr/local/bin/microapp-server
docker load -i bundle/images/microapp-server-${VERSION}.tar   # bila container
helm upgrade microapp bundle/charts/microapp-${VERSION}.tgz -n microapp -f values-airgap.yaml --atomic --wait

# 5. Mulai dan verifikasi
systemctl start microapp
curl -fsS https://microapp.internal:8443/readyz
```

Aturan update:

- Update **MUST** memakai bundle baru yang checksum dan signature-nya terverifikasi.
- Migrasi database **MUST** berjalan dengan backup pra-migrasi dan **MUST** dapat di-rollback (`FR-SRV-024`).
- `telemetry.optIn` **MUST** tetap `false` setelah update; perubahan nilai oleh bundle dianggap kegagalan rilis.
- Tidak ada pemeriksaan versi otomatis, phone-home, atau notifikasi keluar.

## 11. Checklist Tanpa Egress

Jalankan checklist ini pada instance uji sebelum produksi dan ulangi setelah setiap update.

| No | Pemeriksaan | Perintah | Lulus bila |
|---|---|---|---|
| 1 | Tidak ada rute internet | `ip route`; `curl -m 5 https://example.com` | Curl gagal; hanya rute internal |
| 2 | Firewall egress | `iptables -S OUTPUT`; `nft list ruleset` | Kebijakan default drop untuk keluar |
| 3 | Tidak ada koneksi keluar aktif | `ss -tunp state established` | Tidak ada koneksi ke alamat publik |
| 4 | DNS hanya internal | `cat /etc/resolv.conf` | Hanya resolver internal |
| 5 | Telemetry mati | `grep -A1 telemetry microapp.yaml` | `optIn: false` |
| 6 | Aset lokal | DevTools Network pada Host/Studio | Tidak ada request ke CDN |
| 7 | Font lokal | `fc-list` | Inter dan JetBrains Mono terpasang dari bundle |
| 8 | Mirror registry | `curl -fsS http://registry.internal/index.json` | Indeks bertanda tangan tersedia |
| 9 | Model tersedia | Pilih provider lokal | Model termuat tanpa unduhan |
| 10 | OTel lokal | `ss -lntp` | Port 4318 hanya mendengar di jaringan internal |
| 11 | Update manual | Tidak ada proses pemeriksaan versi | Tidak ada request keluar berkala |
| 12 | Audit ekspor | Tujuan SIEM internal | Tidak ada endpoint eksternal |

Checklist **MUST** disimpan sebagai bukti rilis air-gap; satu kegagalan berarti instalasi tidak boleh dipromosikan.

## 12. Troubleshooting

| Gejala | Penyebab | Tindakan |
|---|---|---|
| `docker compose` mencoba pull | Image belum dimuat atau `pull_policy` salah | Muat image dari bundle; set `pull_policy: never` |
| Editor tidak memuat bahasa | LSP atau library tipe tidak ada di bundle | Salin ulang aset LSP; verifikasi checksum |
| Font tampil fallback | Font tidak terpasang atau diblokir CSP | Pasang font bundle; izinkan `font-src 'self'` |
| Model gagal dimuat | Berkas model tidak lengkap atau checksum beda | Impor ulang dari media terverifikasi |
| Registry kosong | Indeks tidak ditandatangani atau URL salah | Tanda tangani indeks dengan kunci internal; periksa URL sumber |
| Update gagal migrasi | Skema tidak kompatibel | Rollback binary, pulihkan backup (`E-SRV-001`) |
| Sertifikat ditolak | CA internal tidak dipercaya klien | Distribusikan root CA internal melalui kebijakan perangkat |
| Koneksi keluar terdeteksi | Aset eksternal atau telemetry aktif | Blokir, audit, perbaiki konfigurasi sebelum rilis |

## 13. Verifikasi

| Bukti | Prosedur |
|---|---|
| Bundle utuh | `sha256sum -c SHA256SUMS` dan verifikasi signature Ed25519 |
| Instalasi Lite | Instalasi pada host tanpa rute internet; health check lulus |
| Instalasi Standard | `docker compose up -d --pull never`; seluruh service sehat |
| Instalasi Cluster | `helm install` dari chart lokal; pod siap tanpa pull |
| Mirror registry | Klien menambah sumber internal dan memasang `.mapp` bertanda tangan |
| Aset offline | Editor, font, ikon, dan dokumentasi terbuka tanpa request keluar |
| Model AI | Provider lokal memuat model dari media; tidak ada unduhan |
| Update offline | Bundle baru terverifikasi; upgrade dan rollback berhasil |
| Tanpa egress | Checklist bagian 11 lulus seluruhnya |

## 14. Referensi

- [03-specs/07-selfhost.md](../03-specs/07-selfhost.md), [03-specs/05-registry.md](../03-specs/05-registry.md)
- [03-specs/nfr.md](../03-specs/nfr.md), [03-specs/08-devtools-cli-sdk.md](../03-specs/08-devtools-cli-sdk.md)
- [01-architecture/selfhost.md](../01-architecture/selfhost.md), [01-architecture/registry-supply-chain.md](../01-architecture/registry-supply-chain.md)
- [selfhost-runbook.md](selfhost-runbook.md), [backup-restore.md](backup-restore.md), [observability.md](observability.md)
