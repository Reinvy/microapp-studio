---
id: FOUND-GLOSSARY
title: Glosarium Istilah Kanonik
status: accepted
owner: product
prd_refs: ["§1.1", "§3 Modul 1", "§4.3"]
---

# Glosarium Istilah Kanonik

Istilah pada kolom **Istilah** adalah satu-satunya bentuk yang boleh dipakai pada dokumen, kode, UI, dan issue. Kolom **Sinonim terlarang** mencantumkan bentuk yang tidak boleh muncul.

## 1. Produk dan Struktur

| Istilah | Definisi | Sinonim terlarang | Contoh |
|---|---|---|---|
| micro-app | Aplikasi kecil terisolasi yang dipasang di Host, dibungkus manifest dan dijalankan di sandbox. | mini app, mikro aplikasi, MicroApp | `org.reinvy.kas-offline` |
| Host Shell | Aplikasi induk yang menjalankan micro-app, mengelola workspace, permission, dan storage. | host app, super app | Home Shell di Flutter dan PWA |
| Studio | IDE di dalam Host untuk membangun micro-app secara visual dan pro-code. | builder, editor | `apps/studio-web` |
| Workspace | Konteks terisolasi berisi kumpulan micro-app, data, dan identitas tampilan. | profil, akun | Personal Offline, Kantor |
| Registry | Kumpulan metadata statis bertanda tangan yang mendistribusikan micro-app. | store, marketplace | Official Community Registry |
| `.mapp` | Arsip ZIP deterministik berisi manifest, bundle, aset, migrasi, dan signature. | paket app, apk | `kas-lokal-1.3.0.mapp` |
| Manifest | Berkas `microapp.manifest.json` yang mendeklarasikan identitas, entry, permission, dan runtime. | config app | `manifest.json` |
| Site ID | Identitas 16 byte per instalasi perangkat, dipakai sebagai tie-breaker HLC. | device id | `base32:7F3K...` |
| Workspace ID | UUIDv7 yang mengidentifikasi workspace. | tenant id (untuk lokal) | `0192f0...` |

## 2. Identitas dan Kriptografi

| Istilah | Definisi | Sinonim terlarang | Contoh |
|---|---|---|---|
| Local Identity | Pasangan kunci Ed25519 (signing) dan X25519 (ECDH) yang dibuat di perangkat tanpa akun. | akun lokal, profil | dibuat saat first run |
| Recovery Phrase | 24 kata BIP-39 yang menurunkan master key untuk memulihkan data. | seed phrase, kata sandi | 24 kata |
| Device Certificate | Sertifikat perangkat yang ditandatangani identity key dan mengikat kunci ECDH. | device token | `dev_cert_v1` |
| Master Key | Kunci turunan HKDF yang menjadi akar subkey `sync`, `vault`, `backup`. | root key | `microapp/v1/master` |
| Key ID | 16 byte pengenal kunci pada envelope terenkripsi. | key name | `key_id` |
| Vault | Brankas terenkripsi lokal untuk kredensial, token BYOK, dan dokumen sensitif. | password manager | Vault item |
| BYOK | Bring Your Own Key: kredensial API milik pengguna untuk provider AI OpenAI-compatible. | api key cloud | `sk-...` disimpan di Vault |
| TOFU | Trust On First Use: kunci author di-pin pada pemakaian pertama dan dibandingkan pada pemakaian berikutnya. | trust first | pin per author |
| Reproducible Build | Build yang menghasilkan artefak identik bit-per-bit dari commit, builder image, dan parameter yang sama. | verified build | `reproducibleBuild` |
| Signature | Tanda tangan Ed25519 detached atas digest artefak. | hash | `signatures/author.ed25519` |

## 3. Data dan Sinkronisasi

| Istilah | Definisi | Sinonim terlarang | Contoh |
|---|---|---|---|
| HLC | Hybrid Logical Clock: 48-bit milidetik + 16-bit counter + Site ID untuk urutan mutasi deterministik. | timestamp | `hlc_timestamp` |
| CRDT | Conflict-free Replicated Data Type; penggabungan deterministik tanpa server otoritatif. | merge engine | `cr-sqlite` |
| Mutation Log | Catatan mutasi tabel berisi HLC, tabel, primary key hash, dan payload terenkripsi. | change log, WAL | `crdt_change_log` |
| Conflict History | Tabel penyimpan nilai yang kalah saat konflik kolom identik, dapat ditinjau pengguna. | error log | `conflict_history` |
| Schema Staging | Penyimpanan mutasi dengan skema lebih baru sampai perangkat lama diperbarui. | pending migration | `crdt_schema_staging` |
| Outbox | Antrean tugas persisten di SQLite untuk panggilan eksternal saat offline. | queue, buffer | `workflow_outbox` |
| Workflow Run | Satu eksekusi graph workflow dengan status dan checkpoint. | job | `workflow_runs` |
| Delta Update | Pembaruan yang hanya mengirim perbedaan antara versi terpasang dan versi baru. | patch | `delta.json` |
| Pin | Penguncian versi micro-app agar tidak berubah oleh auto-update. | lock | `pinned_version` |
| Rollback | Pengembalian ke versi sebelumnya beserta snapshot database. | revert, undo | rollback 1 klik |

## 4. Runtime dan Keamanan

| Istilah | Definisi | Sinonim terlarang | Contoh |
|---|---|---|---|
| Sandbox | Lingkungan eksekusi terisolasi tanpa akses ambient ke Host. | container, iframe | iframe opaque origin |
| Offline Cage | Mode yang memaksa micro-app berjalan tanpa jaringan meski manifest meminta allowlist. | offline mode | `offline_cage_enabled` |
| Capability | Kemampuan yang diminta micro-app dan dijembatani Host setelah consent. | fitur, API | `camera.qr` |
| Permission Grant | Persetujuan pengguna atas capability, tersimpan sampai dicabut. | izin | `granted_permissions` |
| Intent | Permintaan terstruktur antar micro-app atau dari deep link, dengan consent. | action, event | `image.receipt` |
| Deep Link | URL `microapp://` yang membuka micro-app, route, dan parameter secara lokal. | universal link | `microapp://local/org.reinvy.kas/route` |
| Host Bridge | Kanal request/response teraudit antara sandbox dan Host. | API, RPC | namespace `camera` |
| MUIP | Micro-App UI Protocol: protokol deklaratif node UI yang dirender Host. | DSL, UI JSON | `ui-node.v1` |
| MADS | MicroApp Design System: token dan katalog 120 komponen. | design kit | `MADS-INP-01` |
| Watchdog | Pemantau freeze/infinite loop yang mematikan isolate setelah 5 detik. | timeout | `E-SBX-004` |
| Error Boundary | Batas isolasi yang menangkap crash micro-app dan menawarkan recovery. | crash handler | restart/rollback/export |
| Hibernasi | Penangguhan micro-app background setelah 30 detik tanpa interaksi. | suspend, sleep | state dipulihkan saat `onFocus` |

## 5. Server dan Operasi

| Istilah | Definisi | Sinonim terlarang | Contoh |
|---|---|---|---|
| Lite | Profil self-host single binary dengan SQLite WAL untuk 1–20 pengguna. | small | `./microapp-server start` |
| Standard | Profil Docker Compose dengan PostgreSQL, Valkey, MinIO untuk 20–500 pengguna. | medium | `docker compose up -d` |
| Cluster | Profil Kubernetes/Helm dengan HA, NATS JetStream, object storage, OTel. | enterprise | Helm chart |
| Air-Gapped | Operasi tanpa koneksi keluar sama sekali, memakai bundle offline terverifikasi. | offline server | intranet rumah sakit |
| Audit Chain | Log aktivitas berantai hash yang tidak dapat diubah tanpa terdeteksi. | activity log | `audit_log_chain` |
| Branding | Konfigurasi white-label `branding.yaml` tanpa fork. | theme | `appName`, `logo` |

## 6. Aturan Pemakaian

1. Gunakan "micro-app" dengan hyphen; "Micro-App" hanya di awal kalimat atau judul.
2. Nama produk **MicroApp Studio** ditulis tanpa spasi di tengah.
3. Istilah asing yang tercantum di tabel tidak diterjemahkan pada identifier, field JSON, dan nama perintah.
4. Sinonim terlarang pada tabel wajib ditolak saat review copy dan review spec.
5. Istilah baru wajib ditambahkan ke dokumen ini sebelum dipakai di spec lain.
