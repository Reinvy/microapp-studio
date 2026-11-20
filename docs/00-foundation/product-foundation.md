---
id: FOUND-PRODUCT
title: Fondasi Produk
status: accepted
owner: product
prd_refs: ["§1.1", "§1.2", "§1.3", "§2.1", "§2.2"]
---

# Fondasi Produk

Dokumen ini mengunci niat produk yang menjadi dasar seluruh spec. Setiap requirement di [03-specs](../03-specs/01-host-shell.md) harus dapat dilacak ke sini dan ke PRD.

## 1. Visi

MicroApp Studio adalah **Open-Source Super App Operating System** yang dimiliki penggunanya: siapa pun dapat mengunduh, menjalankan, membuat, membagikan, dan men-self-host ekosistem ratusan micro-app secara gratis, baik 100% offline tanpa akun, tersinkronisasi P2P antar perangkat, maupun dijalankan di server milik sendiri untuk keluarga, komunitas, atau organisasi besar.

## 2. Empat Pilar

| Pilar | Isi | Spec utama |
|---|---|---|
| **Offline-First Host Shell** | Aplikasi induk yang langsung dipakai tanpa login dan tanpa internet, menjalankan micro-app secara terisolasi. | [01-host-shell](../03-specs/01-host-shell.md), [03-sandbox-runtime](../03-specs/03-sandbox-runtime.md) |
| **Local-First Hybrid Studio IDE** | Studio visual + pro-code + AI lokal/BYOK yang berjalan di perangkat atau web self-hosted. | [02-studio-ide](../03-specs/02-studio-ide.md) |
| **Embedded Data, CRDT Sync & Automation** | Database lokal per micro-app, sinkronisasi bebas konflik, orkestrator workflow yang tetap bekerja offline. | [04-data-automation](../03-specs/04-data-automation.md), [06-sync-backup](../03-specs/06-sync-backup.md) |
| **Federated Registry & Offline Sharing** | Distribusi terdesentralisasi tanpa gatekeeper: registry komunitas, Git langsung, server internal, dan berkas `.mapp`. | [05-registry](../03-specs/05-registry.md) |

## 3. Lima Prinsip Tanpa Kompromi

| # | Prinsip | Konsekuensi yang mengikat |
|---|---|---|
| 1 | **100% gratis tanpa paywall** | Semua fitur kelas enterprise (OIDC/SAML, RBAC/ABAC, audit, white-label, multiplayer, workflow tanpa batas, air-gapped) tersedia tanpa lisensi berbayar dan tanpa kuota buatan. Tidak ada tabel billing di skema server. |
| 2 | **Zero-account instant start** | Launch pertama membuat Local Identity; tidak ada panggilan jaringan wajib; tidak ada layar login sebelum Home. Akun server hanya untuk mode self-host. |
| 3 | **Offline-first sebagai default** | Baca/tulis, pencarian, render UI, eksekusi logika, dan aset selalu dilayani dari penyimpanan lokal. Jaringan hanya kanal sinkronisasi asinkron dan unduhan paket. |
| 4 | **Kedaulatan data dan zero-telemetry** | Tidak ada phone-home, tidak ada analytics pihak ketiga, tidak ada data keluar tanpa aksi pengguna. Telemetri self-host hanya opt-in dan disimpan di instance sendiri. |
| 5 | **Zero-crash sandbox isolation** | Kegagalan, infinite loop, atau kebocoran memori satu micro-app tidak boleh memengaruhi Host atau micro-app lain. Tidak ada fallback eksekusi di luar sandbox. |

## 4. Persona

| Persona | Kebutuhan utama | Jalur produk |
|---|---|---|
| **Sovereign End-User** | Super app cepat, tanpa iklan, 100% offline, privasi absolut. | Home, omni-search, vault, notifikasi lokal. |
| **Maker / Citizen Builder** | Membangun micro-app pribadi tanpa menulis kode. | Visual Builder, schema designer, AI prompt-to-app. |
| **Open-Source Developer** | Micro-app kompleks via pro-code, CLI, Git, distribusi komunitas. | Monaco/AST sync, CLI, Git, registry, SDK. |
| **Self-Hoster / Homelabber** | Instance untuk keluarga/komunitas di server sendiri. | Lite/Standard, sync hub, registry internal, workflow 24/7. |
| **Organization / Enterprise Admin** | Platform internal dengan SSO, kebijakan, white-label. | Cluster, OIDC/SAML/LDAP, RBAC/ABAC, audit SIEM, branding. |
| **Registry Maintainer & Auditor** | Kurasi, verifikasi reproducible build, signature. | Registry tooling, scanner, reproducible build, TOFU. |

## 5. Mode Operasi

Empat mode memakai basis kode yang sama; mode ditentukan konfigurasi, bukan fork.

| Kapabilitas | Standalone Offline | P2P Mesh | Personal Self-Host | Cluster |
|---|---|---|---|---|
| Basis data lokal | SQLite/OPFS | SQLite/OPFS | SQLite/OPFS | SQLite/OPFS |
| Sync | Tidak ada | LAN/WebRTC/BYOS | LAN/WebRTC/server WS | LAN/WebRTC/server WS |
| Server | Tidak ada | Tidak ada (signaling opsional) | 1 binary/Docker | Kubernetes + HA |
| Auth | Local Identity | Local Identity + pairing | + OIDC/passkey/magic link | + SAML/LDAP, RBAC/ABAC |
| Workflow | Local worker | Local worker | + runner 24/7 | + NATS JetStream/HA runner |
| Registry | Cache lokal + `.mapp` | + peer share | + registry internal | + registry internal HA |
| AI | Lokal/WebLLM/BYOK | Lokal/WebLLM/BYOK | + AI gateway self-host | + AI gateway HA |
| Air-gap | Ya | Ya (LAN) | Ya (bundle) | Ya (bundle + mirror) |

Default untuk pengguna baru adalah **Standalone Offline**; server bersifat opsional dan tidak pernah menjadi prasyarat fitur inti.

## 6. Metrik Produk

Target di bawah adalah kontrak, bukan aspirasi. Metode ukur dan gate ada di [03-specs/nfr.md](../03-specs/nfr.md) dan [08-quality/performance-budgets.md](../08-quality/performance-budgets.md).

| Dimensi | Metrik | Target |
|---|---|---|
| Kecepatan offline | Cold start micro-app dari cache lokal | < 150 ms |
| Kecepatan offline | Warm start / switch antar micro-app | < 50 ms |
| Performa UI | Render pertama Host Shell | < 500 ms |
| Performa UI | Frame rate Host dan transisi micro-app | 60–120 FPS |
| Stabilitas | Crash-free session rate Host Shell | ≥ 99,98% |
| Efisiensi self-host | Personal self-host minimum | 1 vCPU, 512 MB RAM |
| Kemudahan deploy | Time-to-self-host (Compose/binary) | < 2 menit |
| Sinkronisasi | Latensi delta sync per mutasi CRDT | < 100 ms (LAN/self-host) |
| Keamanan | Sandbox escape dan akses Host tanpa izin | 0 insiden kritis |
| Ukuran | Installer mobile / desktop / server | < 35 MB / < 45 MB / < 30 MB |
| Aksesibilitas | Kepatuhan | WCAG 2.2 AA |
| Internasionalisasi | Bahasa dan arah | `id-ID`, `en-US`, RTL |

## 7. Batas Produk

| Batas | Keputusan |
|---|---|
| Tanpa paywall | Tidak ada edisi enterprise terpisah, tidak ada fitur terkunci, tidak ada seat limit. |
| Tanpa telemetry default | Tidak ada pengiriman data otomatis; analytics self-host opt-in dan dapat dimatikan total. |
| Tanpa akun wajib | Akun server hanya untuk self-host; penggunaan lokal tidak memerlukan akun. |
| Tanpa CDN runtime | Font, ikon, Monaco, LSP, model AI opsional dibundel lokal; tidak ada aset eksternal saat runtime. |
| Tanpa cloud proprietary | Sync memakai LAN, WebRTC, server sendiri, atau BYOS; tidak ada relay vendor wajib. |
| Tanpa gatekeeper | Registry bersifat terfederasi; pengguna dapat menambah, menghapus, dan memprioritaskan sumber. |
| Tanpa eksekusi di luar sandbox | `eval`/`new Function`/WebView tanpa sandbox dilarang pada runtime produksi. |

## 8. Definisi "Selesai" per Fase

Fase mengikuti roadmap PRD §8. Sebuah fase selesai hanya jika seluruh exit gate terverifikasi dan dicatat di [08-quality/release-gates.md](../08-quality/release-gates.md).

| Fase | Fokus | Exit gate |
|---|---|---|
| **1** | Host shell, core Rust, sandbox runtime, `.mapp`, identity | Host berjalan 100% offline di web/desktop/mobile, memasang dan menjalankan `.mapp` terisolasi, lolos audit sandbox escape. |
| **2** | Studio IDE, SQLite embedded, CLI | Micro-app full-stack offline dibuat di perangkat, diekspor `.mapp`, diuji di ponsel tanpa internet. |
| **3** | AI lokal/BYOK, workflow offline, P2P sync | Dua perangkat yang diedit terpisah saat offline bertemu tanpa konflik via LAN E2EE; AI dan otomasi berjalan tanpa internet. |
| **4** | Registry terfederasi, reproducible build | Siapa pun dapat membuat registry, merilis via Git, dan pengguna memverifikasi signature lalu memasang dalam satu klik. |
| **5** | Self-host one-click, air-gap, governance gratis | Self-host < 2 menit pada 512 MB RAM, air-gap 100% tanpa egress, SBOM dan dokumentasi publik lengkap. |

Status nyata setiap fase ada di [implementation-status.md](implementation-status.md).
