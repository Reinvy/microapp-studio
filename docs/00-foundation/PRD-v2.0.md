---
id: FOUND-PRD
title: "Master PRD v2.0: MicroApp Studio Super App (Open-Source, Offline-First & Self-Hosted Edition)"
status: accepted
owner: product
prd_refs: ["§1", "§2", "§3", "§4", "§5", "§6", "§7", "§8"]
---

Salinan referensi; jika berbeda dengan PRD asli, PRD asli di root workspace menang.

# Master PRD v2.0: MicroApp Studio Super App (Open-Source, Offline-First & Self-Hosted Edition)

**Versi Dokumen:** 2.0 (Full-Feature Open-Source Enterprise Specification)

**Model Distribusi:** 100% Free & Open-Source Software (FOSS) — Tanpa Langganan, Tanpa Paywall, Tanpa Fitur Terkunci

**Lisensi Rekomendasi:** Apache 2.0 atau AGPLv3 (Core Platform & Host) + MIT (SDK, CLI, UI Kit & Template Micro-App)

**Paradigma Inti:** Local-First, Offline-First, Sovereign Self-Hosting, Decentralized Registry

**Target Platform:** Mobile Native (Android & iOS), Desktop Native (Linux, Windows, macOS), Web/PWA, dan Self-Hosted Server (Single Binary / Docker / Kubernetes)

---

## 1. Visi Produk, Filosofi FOSS & Prinsip Arsitektur

### 1.1 Visi Utama

**MicroApp Studio** adalah **Open-Source Super App Operating System** yang sepenuhnya dimiliki oleh penggunanya. Siapa pun dapat mengunduh, menjalankan, membuat, membagikan, dan men-*self-host* ekosistem ratusan micro-app secara gratis selamanya—baik 100% *offline* di perangkat pribadi tanpa akun, tersinkronisasi antar perangkat secara *Peer-to-Peer* (P2P), maupun dijalankan di server *self-hosted* untuk keluarga, komunitas, atau perusahaan besar.

Empat pilar utama sistem:

1. **Offline-First Super App Host Shell:** Aplikasi utama yang langsung dapat dipakai tanpa login dan tanpa internet untuk menjalankan micro-app secara native dan terisolasi.
2. **Local-First Hybrid Studio IDE (Visual + Pro-Code + Local/BYOK AI):** Studio pengembangan penuh yang berjalan langsung di perangkat lokal maupun web self-hosted, lengkap dengan AI lokal (Ollama/WebLLM) atau *Bring Your Own API Key* (BYOK).
3. **Embedded Data, CRDT Sync & Local Automation Engine:** Database lokal terenkripsi, mesin sinkronisasi bebas konflik (CRDT), dan orkestrator *workflow* yang tetap bekerja meski perangkat terputus dari internet.
4. **Federated Open Registry & Offline Package Sharing:** Ekosistem distribusi terdesentralisasi (seperti gabungan F-Droid, Homebrew, dan Git) tanpa *gatekeeper* tunggal—pengguna bebas memasang micro-app dari Registry Komunitas, repositori Git langsung, server *self-hosted*, atau berkas `.mapp` secara *offline*.

### 1.2 Prinsip Tanpa Kompromi

* **100% Gratis & Bebas Paywall Selamanya:** Seluruh fitur kelas enterprise (SSO/OIDC, RBAC, Audit Log, White-Label, Multiplayer, Workflow tanpa batas, Air-Gapped Mode) tersedia terbuka untuk semua orang tanpa lisensi berbayar atau batasan kuota buatan.
* **Zero-Account Instant Start:** Pengguna dapat membuka aplikasi, memakai micro-app, dan membangun micro-app baru di Studio sejak detik pertama tanpa wajib mendaftar akun atau terhubung ke server mana pun.
* **Offline-First sebagai Default (Bukan Fallback):** Seluruh operasi baca/tulis, pencarian, rendering UI, eksekusi logika, dan penyimpanan aset dieksekusi terlebih dahulu ke penyimpanan lokal perangkat. Jaringan hanya digunakan sebagai kanal sinkronisasi asinkron dan pengunduhan paket baru.
* **Kedaulatan Data & Zero-Telemetry:** Tidak ada pelacakan tersembunyi, tidak ada *phone-home* paksa. Seluruh data berada di perangkat pengguna atau server *self-hosted* miliknya, terenkripsi *End-to-End* (E2EE) saat disinkronkan.
* **Zero-Crash Sandbox Isolation:** Micro-app dari komunitas atau buatan sendiri dieksekusi di dalam *sandbox* ketat; kegagalan, *infinite loop*, atau kebocoran memori pada satu micro-app tidak pernah memengaruhi Host maupun micro-app lain.

### 1.3 Target Metrik Performa & Kualitas

| Dimensi | Metrik Utama | Target Produksi |
| --- | --- | --- |
| **Kecepatan Offline** | Cold Start Micro-App (dari cache lokal) | Di bawah 150 ms |
| **Kecepatan Offline** | Warm Start / Switch antar Micro-App | Di bawah 50 ms |
| **Stabilitas** | Crash-Free Session Rate (Host Shell) | Minimal 99,98% |
| **Efisiensi Self-Host** | Kebutuhan Minimum Personal Self-Host | 1 vCPU, 512 MB RAM (Single Binary + SQLite) |
| **Kemudahan Deploy** | Time-to-Self-Host (Docker Compose / Binary) | Di bawah 2 menit dari nol hingga siap pakai |
| **Sinkronisasi** | Latensi Delta Sync (LAN P2P / Self-Host) | Di bawah 100 ms per mutasi CRDT |
| **Keamanan** | Sandbox Escape & Unauthorized Host Access | 0 insiden kritis |

---

## 2. Mode Operasi, Persona & Kontrol Akses Terbuka

### 2.1 Empat Mode Penggunaan Fleksibel

Satu basis kode yang sama beradaptasi otomatis pada empat skenario penggunaan:

| Mode Operasi | Infrastruktur Dibutuhkan | Cara Kerja & Kegunaan |
| --- | --- | --- |
| **1. Standalone Offline** | Tidak ada (Hanya perangkat pengguna) | 100% lokal di HP/Laptop/Browser. Data tersimpan di SQLite/OPFS lokal. Cocok untuk privasi mutlak dan penggunaan instan tanpa server. |
| **2. P2P Multi-Device Mesh** | Tidak ada server (Wi-Fi lokal / WebRTC) | Sinkronisasi data, state, dan paket micro-app antar HP & Laptop milik sendiri secara langsung terenkripsi E2EE melalui LAN/mDNS atau WebRTC signaling ringan. |
| **3. Personal / Homelab Self-Host** | 1 Binary / Docker Container (VPS murah, Raspberry Pi, NAS) | Seluruh data, sync server, workflow terjadwal, dan registry pribadi berjalan di server milik sendiri dengan database SQLite (WAL mode) atau PostgreSQL. |
| **4. Community / Organization Cluster** | Docker Swarm / Kubernetes + PostgreSQL + Redis + S3/MinIO | Skala ratusan hingga jutaan pengguna dengan SSO/OIDC, RBAC/ABAC, Registry Internal, High Availability, dan dukungan mode *Air-Gapped* (tanpa akses internet publik sama sekali). |

### 2.2 Persona Pengguna

1. **Sovereign End-User:** Pengguna harian yang menginginkan satu Super App cepat, bebas iklan, 100% *offline*, dan menjaga privasi data pribadinya.
2. **Maker / Citizen Builder:** Pengguna non-teknis yang membangun micro-app pribadi (pelacak keuangan, katalog koleksi, catatan belajar, manajemen toko) memakai *Visual Builder* dan AI lokal.
3. **Open-Source Developer:** Engineer yang membangun micro-app kompleks melalui Pro-Code IDE, CLI, Git, dan membagikannya ke komunitas.
4. **Self-Hoster / Homelabber:** Pengguna yang meng-host *instance* MicroApp Studio untuk keluarga, komunitas, atau kebutuhan operasional harian di server sendiri.
5. **Organization / Enterprise Admin:** Tim IT yang men-deploy MicroApp Studio secara gratis sebagai platform aplikasi internal perusahaan lengkap dengan SSO, kebijakan keamanan, dan *white-labeling*.
6. **Registry Maintainer & Auditor:** Komunitas yang mengkurasi, memverifikasi *reproducible build*, dan menandatangani micro-app publik pada registry terbuka.

---

## 3. Spesifikasi Fungsional Lengkap (8 Modul Inti)

### Modul 1: Offline-First Super App Host Shell

Antarmuka utama yang berfungsi sebagai "sistem operasi micro-app" lokal yang ringan dan super cepat.

* **Zero-Login Instant Launch:** Saat pertama kali dibuka, sistem otomatis membuat **Local Cryptographic Identity** (pasangan kunci Ed25519 + X25519 tersimpan di *OS Keychain / Keystore / WebCrypto*) sehingga pengguna langsung dapat memakai dan menyinkronkan data tanpa membuat akun cloud.
* **Smart Home, Folders & Live Offline Widgets:**
* Grid micro-app kustom, folder bertingkat, *pinned dock*, dan *live widgets* yang membaca langsung dari database lokal micro-app secara instan meski tanpa internet.
* *Workspace Switcher* di sisi klien: memisahkan konteks ruang kerja (misal *Personal Offline*, *Keluarga Self-Host*, *Kantor*) dalam satu aplikasi dengan isolasi data mutlak.


* **Local Omni-Search & Command Palette (`Cmd/Ctrl + K`):**
* Indeks pencarian lokal penuh berbasis **SQLite FTS5** dan opsional **Local Vector Search** untuk mencari lintas micro-app, catatan, data formulir, serta mengeksekusi aksi cepat secara *offline*.


* **Multi-Tasking & OS-Like Windowing:**
* *App Switcher* mempertahankan state penuh saat berpindah antar micro-app.
* Mode *Split-Screen*, *Tabbed Workspace*, dan *Floating Picture-in-Picture* di Desktop/Tablet.


* **Universal Intent Bus & Offline Deep Linking:**
* Skema URL `microapp://<registry-or-local>/<app-id>/<route>?params=...` yang bekerja baik *online* maupun *offline* (langsung membuka salinan lokal).
* **Cross-App Intent Sharing:** Micro-app A dapat mengirim berkas, teks, gambar, atau JSON terstruktur ke Micro-app B melalui dialog sistem lokal dengan persetujuan pengguna.


* **Zero-Knowledge Local Data Vault:**
* Brankas terenkripsi lokal (AES-256-GCM / XChaCha20-Poly1305) yang dilindungi biometrik/PIN/Passphrase perangkat untuk menyimpan profil, kredensial API pribadi (BYOK), dan dokumen sensitif yang dapat dibagikan ke micro-app hanya per izin eksplisit.


* **Unified Local Notification & Scheduler:**
* Penjadwalan pengingat dan notifikasi lokal langsung di sistem operasi (tetap berbunyi meski 100% *offline*) serta dukungan *UnifiedPush / WebPush* (bebas ketergantungan Google FCM/Apple APNs jika diinginkan) untuk *instance self-hosted*.


* **Offline Bundle & Storage Manager:**
* Dasbor transparan untuk melihat ukuran paket, data lokal, cache media per micro-app, tombol *Export Backup* (`.mapp-backup` terenkripsi), dan *Pin Forever* agar aset tidak pernah dibersihkan otomatis.



---

### Modul 2: Local-First Hybrid MicroApp Studio IDE

Studio pembangunan aplikasi kelas dunia yang berjalan mulus secara lokal di Desktop/Web tanpa butuh koneksi server eksternal.

* **Visual Drag-and-Drop Canvas & Layout Engine:**
* Editor visual *Flexbox/Grid* responsif dengan *live breakpoints* (Mobile, Tablet, Desktop, Widget).
* **120+ Komponen Open-Source Production-Ready:** Data Table virtualized, Form & Schema Validator, Kanban Board, Calendar/Timeline, Interactive Charts, Offline Vector Maps (PMTiles/MapLibre), Markdown/Rich-Text Editor, Camera/QR/Barcode Scanner, Signature Pad, Audio/Video Player, dan Chat UI.
* **Design Token & Adaptive Theme Studio:** Mendukung Light, Dark, AMOLED, High-Contrast, serta pewarisan otomatis tema Host App.


* **Two-Way Visual-to-Code Sync (Pro-Code IDE):**
* Editor kode berbasis Monaco (terbundel lokal sehingga bekerja 100% *offline*) lengkap dengan TypeScript strict LSP, linting, formatter, dan inspektor AST dua arah.
* Mengedit di Canvas memperbarui kode sumber bersih secara otomatis; mengedit kode langsung merefleksikan perubahan di Canvas tanpa merusak format.


* **Local-First & BYOK AI Studio Copilot (Gratis Total):**
* **100% Local AI Engine:** Integrasi native ke **Ollama**, **LM Studio**, **llama.cpp**, **vLLM**, serta **WebGPU / WebLLM** langsung di browser/desktop untuk *prompt-to-microapp*, *autocomplete*, dan *debugging* tanpa internet dan tanpa biaya API.
* **BYOK (Bring Your Own Key) Universal Adapter:** Mendukung endpoint OpenAI-compatible apa pun (Gemini API, OpenAI, Anthropic, OpenRouter, DeepSeek, Groq, atau server AI internal perusahaan) dengan kunci API yang disimpan terenkripsi hanya di perangkat pengguna atau *secrets vault self-hosted*.
* **Kemampuan AI Studio:** Prompt-to-Full-MicroApp (UI + Skema SQLite/CRDT + Validasi + Logika + Dummy Data), Screenshot/Figma-to-Canvas, *Self-Healing Error Fixer*, dan *Offline Security/Permission Linter*.


* **Git-Native & P2P/Self-Hosted Multiplayer:**
* Integrasi Git bawaan (*isomorphic-git* / native Git) untuk *commit*, *branch*, *visual UI diff*, dan *push/pull* ke GitHub, GitLab, Gitea, Forgejo, atau folder lokal.
* Kolaborasi *real-time* berbasis **CRDT (Yjs)** yang dapat berjalan lewat **WebRTC P2P** (langsung antar developer tanpa server) maupun lewat **Self-Hosted Sync Server**.


* **Instant Multi-Device Live Preview (LAN Hot-Reload):**
* Memindai QR Code di Studio Desktop/Web akan menghubungkan Super App di ponsel melalui jaringan Wi-Fi lokal (*local WebSocket/mDNS*) untuk *hot-reload* instan tanpa mengunggah kode ke internet.



---

### Modul 3: Universal Micro-App Sandbox Runtime

Mesin eksekusi yang menjamin kecepatan aplikasi native sekaligus keamanan setara kontainer di seluruh platform.

* **Dual-Mode Isolated Execution Engine:**
* **Web & Desktop Runtime:** *Sandboxed Iframe* dengan *unique opaque origin* + *Dedicated Web Workers* + *WebAssembly (WASM)*, dilindungi *Content Security Policy* (CSP) ketat yang secara default memblokir semua akses jaringan eksternal.
* **Mobile Native Bridge Runtime:** Mesin eksekusi *JavaScript/WASM Isolate* (QuickJS / Hermes / Wasmtime terisolasi) yang berkomunikasi melalui *Asynchronous Binary Bridge* ke *Native Flutter Widget Renderer*, menghasilkan UI 60–120 FPS dengan jejak memori sangat kecil.


* **Offline-By-Default Capability Security Broker:**
* Micro-app tidak memiliki izin jaringan, kamera, penyimpanan bebas, atau sensor secara default (*Zero-Privilege Default*).
* Seluruh akses dideklarasikan dalam `microapp.manifest.json`: `storage.local`, `camera`, `microphone`, `location`, `biometrics`, `filesystem.picker`, `bluetooth`, `nfc`, `local_ai.inference`, dan `network.allowlist` (daftar domain spesifik; jika kosong, micro-app dijamin **100% Offline-Only**).
* Pengguna dapat mencabut atau memalsukan (*mock/spoof*) izin tertentu (misal memblokir akses internet pada micro-app tertentu agar berjalan dalam mode *Strict Offline Cage*).


* **Watchdog, Resource Quota & Error Boundary:**
* Pembatasan RAM per micro-app (konfigurabel, default 128 MB Mobile / 512 MB Desktop) dan deteksi *freeze/infinite loop* dalam 5 detik.
* *Crash* pada micro-app ditangani oleh *Error Boundary* terisolasi dengan tombol *Restart*, *Inspect Error Log*, *Rollback ke Versi Sebelumnya*, atau *Export Data Lokal* agar data pengguna tidak pernah hilang.


* **Deterministic Lifecycle & Background Hibernation:**
* Siklus hidup: `onInstall` → `onMount` → `onFocus` → `onBlur` → `onBackground` → `onSync` → `onMemoryWarning` → `onUpdate` → `onUninstall`.
* Micro-app di latar belakang otomatis di-hibernasi untuk menjaga baterai dan RAM.



---

### Modul 4: Local-First Data Layer, Embedded BaaS & Offline Automation

Setiap micro-app memiliki kemampuan *full-stack* secara mandiri di perangkat pengguna, dan otomatis meningkat skalanya jika dihubungkan ke server *self-hosted*.

* **Embedded Local-First Database (Per Micro-App):**
* Setiap micro-app mendapatkan database **SQLite** terisolasi (Native SQLite di Mobile/Desktop, SQLite WASM + OPFS di Browser) lengkap dengan **SQLite FTS5** (pencarian teks cepat) dan **sqlite-vec** (penyimpanan vektor untuk fitur AI/RAG lokal 100% *offline*).
* Visual Schema Designer, migrasi versi skema otomatis (*forward & rollback safe*), serta enkripsi tingkat berkas (SQLCipher) untuk data sensitif.


* **CRDT Conflict-Free Sync Engine:**
* Seluruh mutasi tabel dicatat ke dalam *Hybrid Logical Clock (HLC) Mutation Log* berbasis CRDT (seperti `cr-sqlite` / Yjs Document Store).
* Pengguna dapat membuat, mengubah, dan menghapus ribuan data saat *offline* selama berminggu-minggu; saat koneksi LAN P2P atau Server Self-Hosted kembali tersedia, seluruh perubahan bergabung secara deterministik tanpa menimpa data secara kasar.


* **Local & Self-Hosted Serverless Functions (WASM / JS Isolates):**
* Micro-app dapat mendefinisikan *logic worker* dalam TypeScript/WASM yang berjalan di perangkat lokal (saat mode Standalone) atau dieksekusi di server *self-hosted* (saat mode Server/Team) dengan API yang identik.


* **Offline-Capable Visual Workflow & AI Agent Orchestrator:**
* Editor *workflow* berbasis *node graph* yang berjalan langsung di perangkat (Local Worker) maupun di server *self-hosted* (24/7 Cron & Webhook Runner).
* **Durable Offline Outbox:** Jika sebuah alur kerja membutuhkan panggilan HTTP eksternal saat perangkat sedang *offline*, tugas tersebut otomatis antre secara persisten di SQLite lokal dan dieksekusi dengan *exponential backoff* begitu perangkat kembali *online*.
* Mendukung: *Local DB Triggers*, *Schedule/Cron*, *Cross-App Event Triggers*, *Webhook Listener* (di mode self-host), *Local/BYOK AI Agent Nodes*, *Conditional Branching*, dan *Human-in-the-Loop Local Notification Approval*.


* **Universal Open Connectors:**
* Konektor bawaan tanpa biaya tambahan untuk: REST, GraphQL, WebSocket, MQTT (untuk IoT & Smart Home lokal!), PostgreSQL/MySQL/SQLite eksternal, S3/MinIO, WebDAV (Nextcloud/OwnCloud), CalDAV/CardDAV, n8n/Activepieces Webhook, Matrix/Telegram/Discord/Slack, serta LLM Lokal & Cloud.



---

### Modul 5: Federated Open Registry, Git Distribution & Offline Sharing

Menggantikan toko aplikasi terpusat berbayar dengan sistem distribusi terbuka, terdesentralisasi, dan bebas sensor.

* **Multi-Source Federated Registries (Model F-Droid / Homebrew):**
* Aplikasi hadir dengan **Official Community Registry** (terkurasi terbuka via Git PR) sebagai bawaan opsional, namun pengguna bebas menambah, menghapus, atau memprioritaskan URL Registry pihak ketiga maupun Registry Internal Self-Hosted.
* Registry hanyalah kumpulan metadata statis JSON + tanda tangan kriptografi yang dapat di-host di mana saja (GitHub Pages, GitLab, MinIO, Nginx statis, atau server MicroApp Studio).


* **4 Cara Instalasi Micro-App:**
1. **Browse Federated Registry:** Pencarian lintas semua registry yang ditambahkan pengguna (indeks registry di-cache lokal sehingga penelusuran tetap jalan saat *offline*).
2. **Direct Git Install:** Memasang micro-app langsung dari URL repositori (`[https://github.com/user/my-microapp](https://github.com/user/my-microapp)`) atau rilis Git tag.
3. **100% Offline `.mapp` File Sharing:** Ekspor micro-app menjadi satu berkas arsip portabel `.mapp` (berisi bundle, aset, manifest, dan tanda tangan) untuk dibagikan lewat USB, AirDrop, Nearby Share, Bluetooth, atau kode QR LAN tanpa internet sama sekali.
4. **Self-Hosted Enterprise Push:** Admin organisasi dapat mengonfigurasi *auto-install* paket internal ke seluruh perangkat tim saat tersambung ke server kantor.


* **Reproducible Builds & Community Trust Verification:**
* Sistem mendukung **Reproducible Builds**: siapa pun dapat memverifikasi bahwa paket `.mapp` yang terkompilasi identik bit-per-bit dengan kode sumber terbukanya di Git.
* **Automated Open Security Scanner (CI & Lokal):** Pemindaian SAST, deteksi *obfuscation* mencurigakan, audit dependensi CVE, dan verifikasi izin manifest dijalankan baik di pipeline Registry maupun secara lokal di perangkat sebelum pengguna menekan "Install".
* Tanda tangan kriptografi **Ed25519 / Sigstore** diverifikasi secara lokal; perubahan kunci penandatangan (*key mismatch*) langsung memicu peringatan keamanan keras.


* **Delta Updates, Version Pinning & Instant Rollback:**
* Pembaruan menggunakan *delta diff* hemat bandwidth.
* Pengguna punya kendali penuh: *Auto-Update*, *Notify Only*, *Pin Specific Version* (mengunci versi tertentu agar tidak berubah), serta *1-Click Rollback* ke versi sebelumnya yang masih tersimpan di arsip lokal.



---

### Modul 6: P2P Mesh Sync, E2EE Backup & Data Portability

Sinkronisasi lintas perangkat yang tidak pernah memaksa pengguna menyewa cloud pihak ketiga.

* **End-to-End Encrypted (E2EE) Sync Protocol:**
* Seluruh payload sinkronisasi dienkripsi di sisi klien sebelum meninggalkan perangkat menggunakan kunci simetris yang diturunkan dari **Master Recovery Phrase** (24 kata BIP-39 atau Passkey PRF). Server *self-hosted* maupun *relay* tidak pernah bisa membaca isi data pengguna (*Zero-Knowledge Relay*).


* **Multi-Transport Sync Layer (Otomatis Memilih Jalur Tercepat):**
1. **Local LAN / Wi-Fi Sync (mDNS + TLS Lokal):** Jika HP dan Laptop berada di jaringan Wi-Fi yang sama, sinkronisasi berlangsung langsung antar perangkat berkecepatan tinggi tanpa internet.
2. **WebRTC P2P Direct Sync:** Sinkronisasi langsung antar perangkat melewati NAT menggunakan *lightweight open-source signaling/STUN* (atau *self-hosted TURN*).
3. **Self-Hosted Sync Server:** Sinkronisasi real-time lewat WebSocket/HTTP2 ke server MicroApp Studio milik sendiri agar perubahan tetap tersimpan meski perangkat lain sedang mati.
4. **Bring-Your-Own-Storage (BYOS) File Sync:** Sinkronisasi asinkron melalui berkas terenkripsi di **WebDAV (Nextcloud)**, **S3/MinIO**, **Google Drive/Dropbox (opsional)**, **Git Repo Privat**, atau folder lokal yang disinkronkan oleh **Syncthing**.


* **Full Data Portability & Anti-Lock-In:**
* Ekspor satu klik seluruh ekosistem atau per micro-app ke format standar terbuka: **SQLite `.db**`, **JSONL**, **CSV**, **Markdown**, dan **Encrypted Snapshot Archive**.



---

### Modul 7: Self-Hosting Suite, Air-Gapped Mode & Free Governance

Seluruh fitur skala organisasi diberikan secara gratis tanpa batas jumlah pengguna (*unlimited seats*).

* **3 Profil Deployment Self-Hosting:**

| Profil | Target Skala | Arsitektur & Cara Deploy | Kebutuhan Sumber Daya |
| --- | --- | --- | --- |
| **Lite (Single Binary)** | 1–20 pengguna (Pribadi / Keluarga / Homelab) | 1 berkas binary Go/Rust + Embedded SQLite (WAL) + Local Disk Storage + Auto-HTTPS (Let's Encrypt/Caddy). Jalankan `./microapp-server start`. | 1 vCPU, 512 MB RAM |
| **Standard (Docker Compose)** | 20–500 pengguna (Komunitas / UMKM / Tim) | `docker compose up -d` (Core Server, PostgreSQL + pgvector, Valkey/Redis, MinIO, Built-in Registry & Sync Hub). | 2–4 vCPU, 4 GB RAM |
| **Cluster (Kubernetes / Helm)** | 500–1.000.000+ pengguna (Organisasi / Publik) | Helm Chart resmi: Horizontal Pod Autoscaler, PostgreSQL HA (Patroni/Citus), NATS JetStream, Object Storage S3/Ceph, OpenTelemetry Collector. | Multi-node Auto-Scaling |

* **100% Air-Gapped Mode:**
* Dirancang khusus agar dapat berjalan di jaringan intranet terisolasi tanpa koneksi internet keluar (rumah sakit, pabrik, instansi riset, laboratorium). Seluruh font, ikon, Monaco LSP, dokumentasi, mirror registry, dan model AI lokal dibundel dalam *offline deployment bundle*.


* **Enterprise Governance Gratis untuk Semua:**
* **Auth Fleksibel:** Local Accounts, Passkeys/WebAuthn, Magic Link, dan integrasi **OIDC / OAuth2 / SAML 2.0 / LDAP** (Keycloak, Authentik, Authelia, Pocket ID, Okta, Google Workspace) tanpa biaya tambahan.
* **Granular RBAC & ABAC:** Kontrol penuh atas siapa yang boleh membuat, menyetujui rilis ke registry internal, melihat log, atau mengakses micro-app tertentu.
* **Immutable Audit Trail & SIEM Export:** Log aktivitas berantai hash (*hash-chained*) yang dapat diekspor secara *real-time* ke Loki, Elasticsearch, Wazuh, atau Syslog.
* **White-Label & Custom Branding Engine:** Mengganti nama aplikasi, logo, palet warna, domain, dan katalog micro-app default cukup melalui satu berkas konfigurasi `branding.yaml` tanpa perlu *fork* yang rumit.



---

### Modul 8: Privacy-First DevTools, CLI & Open Extension SDK

Ekosistem pengembang yang membuat komunitas mudah memperluas kemampuan inti Super App itu sendiri.

* **Local-Only Profiler & DevTools:**
* Inspektor bawaan di Host App (mode Developer) untuk memantau penggunaan RAM per micro-app, FPS, query SQLite lambat, antrean sinkronisasi CRDT, panggilan Host Bridge, dan log *console* tanpa mengirim data ke server analitik pihak ketiga.


* **Self-Hosted Optional Analytics:**
* Jika admin *self-hosted* menginginkan metrik penggunaan internal (jumlah pengguna aktif, error rate micro-app internal), tersedia modul telemetri *opt-in* ringan yang seluruh datanya disimpan di *instance* milik sendiri (ClickHouse atau SQLite/PostgreSQL).


* **Developer CLI (`microapp-cli`):**
* `microapp init <template>` — Inisialisasi proyek lokal (React, Svelte, Vue, Solid, Flutter-Schema, atau Vanilla TS/WASM).
* `microapp dev --lan` — Menjalankan dev server lokal + QR Code *hot-reload* via Wi-Fi lokal.
* `microapp test --sandbox` — Menjalankan *unit test*, simulasi *offline*, dan audit kepatuhan izin sandbox.
* `microapp pack --sign <key>` — Mempaketkan seluruh aset dan dependensi menjadi berkas `.mapp` siap distribusi *offline*.
* `microapp publish --registry <url|git>` — Memublikasikan rilis terverifikasi ke registry pilihan atau rilis Git.


* **Host Plugin / Driver API (Ekstensibilitas Inti):**
* Komunitas dapat mengembangkan *Host Extension* untuk menambah konektor sinkronisasi baru, *adapter* LLM lokal baru, tema global baru, atau *native device capability bridge* (misal integrasi perangkat serial/USB/printer thermal POS Bluetooth) tanpa harus mengubah kode inti Host.



---

## 4. Arsitektur Teknis Offline-First & Self-Hosted

### 4.1 Diagram Arsitektur Sistem Terpadu

```text
┌───────────────────────────────────────────────────────────────────────────────────┐
│                   PERANGKAT PENGGUNA (100% OFFLINE-CAPABLE CORE)                  │
│  ┌─────────────────────────────────────────────────────────────────────────────┐  │
│  │  SUPER APP HOST SHELL (Flutter Native Mobile/Desktop & Next.js/PWA Web)     │  │
│  │  • Smart Launcher, Live Widgets, Omni-Search (FTS5), Local Vault (E2EE)     │  │
│  │  • Hybrid Studio IDE (Visual Canvas + Offline Monaco + Local/BYOK AI)       │  │
│  └───────────────┬─────────────────────────────────────────┬───────────────────┘  │
│                  ▼                                         ▼                      │
│  ┌──────────────────────────────────────┐  ┌───────────────────────────────────┐  │
│  │  SANDBOX RUNTIME & CAPABILITY BROKER │  │  LOCAL-FIRST ENGINE               │  │
│  │  • Isolated Web/WASM/QuickJS Runtime │  │  • Embedded SQLite + sqlite-vec   │  │
│  │  • Ed25519 Signature Verifier        │  │  • CRDT HLC Sync Log (cr-sqlite)  │  │
│  │  • Permission & Offline Cage Guard   │  │  • Local Workflow & Outbox Queue  │  │
│  │  • Watchdog & Error Boundary         │  │  • Local AI Bridge (Ollama/WebGPU)│  │
│  └──────────────────────────────────────┘  └───────────────┬───────────────────┘  │
└────────────────────────────────────────────────────────────┼──────────────────────┘
                                                             │
            ┌────────────────────────────────────────────────┼────────────────────┐
            ▼ (Jalur 1: Tanpa Server)                        ▼ (Jalur 2: Opsional)│
┌───────────────────────────────────────┐    ┌────────────────────────────────────┴─┐
│     P2P MESH & OFFLINE SHARING        │    │   SELF-HOSTED SERVER (OPSIONAL)      │
│  • LAN / mDNS Direct Sync (E2EE)      │    │  • Single Binary / Docker / K8s      │
│  • WebRTC Direct Peer Sync            │    │  • E2EE CRDT Sync Hub (WebSocket)    │
│  • Offline .mapp Transfer (USB/QR/BT) │    │  • Private MicroApp Registry         │
│  • BYOS (WebDAV / S3 / Syncthing)     │    │  • 24/7 Workflow & Webhook Runner    │
└───────────────────────────────────────┘    │  • Free Auth (Local/OIDC/SAML/RBAC)  │
                                             │  • SQLite (Lite) atau PG+Redis (HA)  │
                                             └───────────────┬──────────────────────┘
                                                             ▼
                                             ┌──────────────────────────────────────┐
                                             │    FEDERATED OPEN REGISTRIES         │
                                             │  • Official Community Git Registry   │
                                             │  • 3rd-Party & Org Registries (JSON) │
                                             │  • Direct Git Repos & Reproducible   │
                                             │    Signed .mapp Release Artifacts    │
                                             └──────────────────────────────────────┘

```

### 4.2 Rekomendasi Tech Stack 100% Open-Source

| Komponen | Teknologi Open-Source | Alasan Pemilihan |
| --- | --- | --- |
| **Mobile & Desktop Host App** | **Flutter** (Impeller Renderer) | Satu basis kode untuk Android, iOS, Linux, Windows, dan macOS dengan performa 60–120 FPS, dukungan FFI native ke SQLite/Rust/QuickJS, dan integrasi hardware penuh. |
| **Web Host & Studio IDE** | **Next.js / Vite (React + TypeScript)**, Tailwind CSS, Monaco Editor, PWA + Service Worker | Dapat berjalan baik sebagai Web App *self-hosted* maupun dibundel lokal di Desktop/Offline PWA. |
| **Core Sync, Crypto & Sandbox Engine** | **Rust** (dikompilasi ke Native FFI untuk Flutter & WASM untuk Web) | Satu mesin inti (*shared core*) untuk kriptografi E2EE, verifikasi Ed25519, mesin CRDT, parser `.mapp`, dan keamanan sandbox di seluruh platform. |
| **Local Embedded Database** | **SQLite 3** (`cr-sqlite` / Yjs + `FTS5` + `sqlite-vec` + `SQLCipher`) | Standar emas *offline-first*: berkas tunggal, sangat cepat, tahan korup, mendukung pencarian teks, pencarian vektor AI, enkripsi, dan sinkronisasi CRDT. |
| **Micro-App JS/WASM Runtime** | **QuickJS / Wasmtime** (Mobile/Desktop) & **Sandboxed Iframe + WebWorker** (Web) | Ringan, startup instan, isolasi memori ketat, dan bebas ketergantungan *runtime* proprietary. |
| **Self-Hosted Backend Server** | **Go** atau **Rust** (atau **Node.js/Fastify** dibundel) dengan dual DB driver (**SQLite** & **PostgreSQL**) | Mampu dikompilasi menjadi *single binary* rendah memori untuk Homelab sekaligus *scale-out* horizontal untuk Cluster K8s. |
| **Local AI & BYOK Gateway** | **Ollama / llama.cpp** (Desktop/Self-Host), **WebLLM / ONNX Runtime** (Web/Mobile), OpenAI-Compatible Adapter | Menjamin fitur AI Studio & AI micro-app tetap 100% gratis dan bekerja tanpa internet. |
| **Workflow Engine** | **Embedded Durable SQLite Queue** (Mode Lokal/Lite) + **NATS JetStream / Temporal** (Mode Cluster) | Otomasi berjalan andal bahkan di ponsel *offline* maupun di server skala besar. |

### 4.3 Format Paket Portabel `.mapp` & Manifest (`microapp.manifest.json`)

Berkas `.mapp` adalah arsip ZIP/Zstd deterministik yang berisi seluruh aset *offline* sehingga micro-app langsung jalan tanpa mengunduh apa pun dari CDN eksternal.

```json
{
  "schemaVersion": "2.0-open",
  "id": "org.reinvy.kas-offline",
  "name": "KasLokal",
  "version": "1.3.0",
  "license": "MIT",
  "repository": "https://github.com/Reinvy/kas-lokal-microapp",
  "reproducibleBuild": {
    "commitHash": "a94f2c8d1e7b...",
    "builderImage": "ghcr.io/reinvy/mapp-builder:2.0"
  },
  "entry": {
    "bundle": "dist/app.bundle.js",
    "assetsDir": "assets/",
    "uiEngine": "hybrid-native",
    "integrity": "sha384-...",
    "signature": "ed25519-..."
  },
  "offline": {
    "mode": "offline-first",
    "requiresInternet": false,
    "localDbSchema": "db/migrations/",
    "syncStrategy": "crdt-hlc"
  },
  "runtime": {
    "isolation": "strict-sandbox",
    "maxMemoryMb": 128,
    "supportedViewports": ["mobile", "tablet", "desktop", "widget"]
  },
  "permissions": {
    "required": ["storage.local.sqlite"],
    "optional": ["camera.qr", "notifications.local", "local_ai.inference"],
    "networkAllowlist": []
  },
  "localAi": {
    "optionalCapabilities": ["text-classification", "receipt-ocr"],
    "recommendedModelSize": "small-3b"
  },
  "capabilities": {
    "intentsIn": ["image.receipt", "csv.import"],
    "intentsOut": ["document.pdf", "data.csv"],
    "widgets": [
      { "id": "daily-balance", "sizes": ["2x1", "2x2"] }
    ]
  }
}

```

*Catatan Penting:* Karena `networkAllowlist` kosong (`[]`), Host Runtime menampilkan lencana **100% Offline Verified** di halaman micro-app dan memblokir total segala upaya panggilan jaringan keluar di level engine.

### 4.4 Skema Data Inti (Local-First & Self-Hosted Sync)

| Entitas / Tabel | Lokasi Utama | Kolom Kunci & Peran |
| --- | --- | --- |
| `local_identity` | Perangkat (OS Keystore + DB) | `device_id`, `public_key_ed25519`, `enc_key_x25519`, `recovery_key_hash`, `workspaces_json` |
| `registries` | Lokal + Sync Opsional | `id`, `name`, `url`, `public_signing_key`, `cached_index_json`, `last_fetched_at`, `trust_level` |
| `installed_microapps` | Lokal + Sync Opsional | `app_id`, `version`, `previous_version`, `bundle_path`, `manifest_json`, `granted_permissions`, `offline_cage_enabled`, `pinned_version` |
| `crdt_change_log` | Lokal & Sync Server | `site_id`, `db_version`, `hlc_timestamp`, `table_name`, `pk_hash`, `encrypted_payload`, `synced_peers_bitmask` |
| `workflow_outbox` | Lokal & Self-Host Worker | `job_id`, `app_id`, `workflow_id`, `status` (`queued`/`waiting_network`/`running`/`failed`/`done`), `retry_count`, `next_run_at`, `payload_json` |
| `sync_peers` | Lokal | `peer_device_id`, `peer_name`, `peer_public_key`, `last_seen_lan_ip`, `sync_server_url`, `last_synced_hlc` |
| `server_tenants_rbac` | Khusus Self-Hosted Server | `workspace_id`, `user_id`, `oidc_sub`, `role`, `policy_json` (100% fitur gratis tanpa tabel billing/subscription) |
| `audit_log_chain` | Lokal & Self-Hosted Server | `seq_id`, `actor`, `action`, `target`, `metadata_json`, `prev_hash`, `entry_hash`, `created_at` |

---

## 5. Keamanan Zero-Trust, Privasi & Penanganan Edge Cases

### 5.1 Threat Model Khusus Open-Source, Offline & Self-Hosted

| Risiko Keamanan | Skenario Ancaman | Mitigasi Mutlak |
| --- | --- | --- |
| **Micro-App Komunitas Berbahaya** | Penyerang merilis micro-app gratis untuk mencuri data dari micro-app lain atau memanen data pribadi | Isolasi database SQLite per `app_id`, *Strict Sandbox*, *Offline Cage* (blokir jaringan default), dan verifikasi izin granular di Host Bridge. |
| **Registry Hijacking / Supply Chain** | Server registry komunitas diretas dan paket `.mapp` diganti versi malware | Verifikasi **Ed25519 Signature** terpisah antara *Registry Key* dan *Author Key*, *Trust On First Use (TOFU)* pinning untuk kunci author, serta peringatan keras jika *signing key* berubah saat update. |
| **Kompromi Server Self-Hosted** | Server pribadi atau VPS pengguna diretas pihak ketiga | Seluruh data sinkronisasi pengguna dienkripsi **E2EE di sisi klien** sebelum dikirim ke server; peretas server hanya melihat *ciphertext* acak tanpa kunci dekripsi. |
| **Serangan LAN / Evil Twin Wi-Fi pada P2P Sync** | Penyerang di Wi-Fi publik mencoba menyadap atau menyuntik data ke sinkronisasi LAN | Pemasangan perangkat (*device pairing*) wajib melalui pertukaran kunci publik via QR Code / SAS (*Short Authentication String*), dilanjutkan kanal **Mutual TLS / Noise Protocol** terenkripsi. |
| **SSRF pada Self-Hosted Workflow** | Micro-app di server kantor mencoba memindai jaringan internal server | Pemblokiran CIDR privat default pada HTTP node server, dapat dibuka hanya secara eksplisit oleh Admin Self-Host pada konfigurasi `allow_private_egress`. |

### 5.2 Matriks Edge Cases Offline-First & Solusinya

| Skenario Edge Case | Strategi Penanganan Tanpa Kendala |
| --- | --- |
| **Pengguna mengedit record yang sama di HP & Laptop saat keduanya offline selama 7 hari** | Mesin CRDT menggabungkan perubahan secara *column-level* menggunakan *Hybrid Logical Clock* (HLC) sehingga perubahan pada kolom berbeda menyatu otomatis. Jika kolom identik berubah, sistem memilih nilai deterministik sekaligus menyimpan nilai konflik ke tabel `conflict_history` agar pengguna dapat meninjau atau memulihkannya kapan saja. |
| **Perangkat mati total / hilang sementara data terenkripsi E2EE** | Pengguna cukup memasukkan **24-kata Recovery Phrase** (atau memindai *Encrypted Paper Backup QR* / Passkey Backup) di perangkat baru untuk mendekripsi seluruh data dari server *self-hosted*, perangkat *peer* lain, atau berkas backup BYOS. |
| **Update micro-app membawa migrasi skema SQLite saat perangkat offline** | Paket `.mapp` membawa skrip migrasi inkremental terverifikasi. Sebelum menjalankan migrasi, Host otomatis membuat *atomic snapshot* DB lokal; jika migrasi gagal, DB dan versi aplikasi langsung di-*rollback* otomatis tanpa kehilangan satu byte data pun. |
| **Penyimpanan perangkat hampir penuh** | Host memantau ruang disk secara proaktif; tidak pernah menghapus database pengguna. Sistem hanya memotong cache aset sementara yang bisa diunduh ulang dan menampilkan panduan pembersihan penyimpanan yang jelas. |
| **Perbedaan versi aplikasi antara perangkat P2P** | Protokol sinkronisasi menukar *capability version header* saat *handshake*. Mutasi dengan kolom/skema lebih baru disimpan aman di *staging log* hingga perangkat yang lebih lama diperbarui, mencegah korupsi skema. |
| **Self-Hosted Server mati listrik saat menjalankan workflow** | Karena seluruh state eksekusi disimpan dalam *Write-Ahead Log* SQLite / Durable Queue, begitu server menyala kembali, seluruh *workflow* yang terhenti otomatis dilanjutkan dari *checkpoint* terakhir secara idempoten. |

---

## 6. Non-Functional Requirements (NFR) & Standar Open-Source

| Aspek | Standar Kuantitatif & Kualitatif |
| --- | --- |
| **Performa Offline & UI** | 60–120 FPS konsisten pada antarmuka Host dan transisi micro-app; waktu render pertama aplikasi Host di bawah 500 ms. |
| **Jejak Ukuran & Memori** | Ukuran installer Host App Mobile di bawah 35 MB, Desktop di bawah 45 MB, Server Single Binary di bawah 30 MB. |
| **Zero External Runtime Dependency** | Host App tidak boleh memuat Google Fonts CDN, skrip analitik, atau aset eksternal saat *runtime*; seluruh aset UI inti dibundel lokal agar lolos uji **100% Air-Gapped**. |
| **Aksesibilitas (a11y)** | Kepatuhan penuh **WCAG 2.2 Level AA** (navigasi keyboard penuh di Studio & Host, *screen reader labels*, dukungan *reduced motion*). |
| **Internasionalisasi (i18n)** | Sistem lokalisasi terbuka berbasis JSON/ARB dengan integrasi Weblate/Crowdin komunitas; dukungan penuh bahasa Indonesia, Inggris, dan tata letak **RTL**. |
| **Kepatuhan Transparansi & Supply Chain** | Setiap rilis resmi menyertakan **SBOM** (*Software Bill of Materials* format CycloneDX/SPDX), checksum SHA-256, dan *SLSA Build Provenance* agar dapat diaudit independen. |

---

## 7. Struktur Monorepo, Tata Kelola & Ekosistem Komunitas

### 7.1 Arsitektur Monorepo Terbuka

Memudahkan kontributor memahami, mengompilasi, dan memelihara seluruh ekosistem dari satu repositori:

```text
microapp-studio/
├── apps/
│   ├── host-flutter/           # Super App Native (Android, iOS, Linux, Windows, macOS)
│   ├── studio-web/             # Web Super App & Hybrid Visual/Code Studio IDE (PWA)
│   └── selfhost-server/        # Single-Binary / Docker Self-Hosted Sync, Registry & Auth Server
├── packages/
│   ├── core-rust/              # Shared Rust Core (E2EE Crypto, CRDT Sync, .mapp Parser, Sandbox Guard)
│   ├── runtime-web/            # Sandboxed Iframe + Worker + WASM Execution Engine
│   ├── runtime-native/         # QuickJS/WASM Bridge untuk Flutter Host
│   ├── sdk/                    # @microapp/sdk (TypeScript/WASM API untuk kreator)
│   ├── ui-kit/                 # 120+ Komponen Open-Source & Design Tokens (MADS)
│   ├── ai-bridge/              # Adapter Ollama, llama.cpp, WebLLM & BYOK OpenAI-Compatible
│   └── cli/                    # microapp-cli (init, dev, test, pack, sign, publish)
├── deploy/
│   ├── docker/                 # Dockerfile multi-arch (amd64 & arm64) + docker-compose.yml
│   ├── helm/                   # Kubernetes Helm Chart untuk skala besar
│   └── airgap/                 # Skrip pembuat offline bundle instalasi Air-Gapped
├── templates/                  # Koleksi Starter Micro-App (CRUD, Kasir POS, Notes, AI Chat, IoT)
└── docs/                       # Dokumentasi lengkap, Spesifikasi Manifest & Panduan Self-Host

```

### 7.2 Tata Kelola Open-Source & Keberlanjutan

* **Tanpa Open-Core Trap:** Tidak ada pemisahan "Community Edition vs Enterprise Edition". Seluruh kode berada di repositori publik utama dengan lisensi terbuka penuh.
* **RFC (Request for Comments) Terbuka:** Perubahan pada spesifikasi `microapp.manifest.json`, protokol Host Bridge, atau protokol CRDT wajib melalui proses RFC publik agar kompatibilitas ekosistem terjaga.
* **Pendanaan Sukarela Komunitas (Opsional & Non-Intrusif):** Keberlanjutan proyek murni didukung melalui donasi sukarela (GitHub Sponsors, Open Collective, Saweria) atau layanan konsultasi/dukungan teknis opsional tanpa pernah mengunci satu fitur pun di dalam perangkat lunak.

---

## 8. Roadmap Konstruksi Full-Scale (5 Fase Eksekusi)

Seluruh fitur di atas dibangun secara utuh dan terukur tanpa meninggalkan utang teknis:

| Fase | Fokus Konstruksi & Deliverable Utuh | Kriteria Lulus Gerbang (Exit Gate) |
| --- | --- | --- |
| **Fase 1: Offline-First Host Shell, Core Rust & Sandbox Runtime** | Local Cryptographic Identity (Zero-Login), Format paket `.mapp` & Manifest v2-open, Shared Core Rust (Ed25519 + SQLCipher), Web & Flutter Sandbox Runtime, Capability Permission Broker + Offline Cage, Error Boundary & Watchdog. | Host App berjalan 100% *offline* di Web/Desktop/Mobile, mampu memasang & menjalankan file `.mapp` lokal secara terisolasi, lolos audit *sandbox escape*. |
| **Fase 2: Hybrid Studio IDE, Embedded SQLite & Developer CLI** | Visual Drag-and-Drop Canvas, 120+ UI Kit Components, Offline Monaco Editor + Two-Way AST Sync, Embedded SQLite + FTS5 + `sqlite-vec` per micro-app, Git-Native Integration, LAN QR Hot-Reload, dan `microapp-cli`. | Developer maupun non-teknis dapat membuat micro-app *full-stack offline* di perangkat sendiri, mengekspor `.mapp`, dan langsung mengujinya di ponsel tanpa internet. |
| **Fase 3: Local/BYOK AI Studio, Offline Workflow & P2P Sync Mesh** | Integrasi Ollama/llama.cpp/WebLLM + BYOK Adapter (Prompt-to-MicroApp & Self-Healing Debugger), CRDT Sync Engine (`cr-sqlite`/Yjs), E2EE LAN/mDNS & WebRTC P2P Sync, BYOS (WebDAV/S3/Syncthing), dan Offline Durable Workflow Engine. | Dua perangkat yang diedit terpisah saat *offline* berhasil sinkronisasi otomatis lewat Wi-Fi lokal dengan E2EE tanpa konflik; fitur AI & otomasi berjalan penuh tanpa internet. |
| **Fase 4: Federated Open Registry & Reproducible Security Pipeline** | Multi-Source Registry Client, Direct Git Install, Official Community Registry berbasis Git, Reproducible Build Verification, Automated Open Security Scanner (SAST/SCA/Permission Check), Delta Updates, Version Pinning & Rollback. | Siapa pun dapat membuat Registry sendiri, merilis micro-app lewat Git, dan pengguna lain dapat memverifikasi tanda tangan kriptografi serta memasangnya dalam 1 klik. |
| **Fase 5: One-Click Self-Hosting Suite, Air-Gapped & Free Governance** | Single-Binary Server (SQLite), Docker Compose Multi-Arch (`amd64`/`arm64`), Kubernetes Helm Chart, Air-Gapped Offline Installer, Free OIDC/SAML/LDAP SSO, RBAC/ABAC, Hash-Chained Audit Logs, White-Label `branding.yaml`, dan Host Plugin SDK. | Instalasi *self-host* selesai di bawah 2 menit pada VPS 512MB RAM maupun cluster K8s; pengujian *air-gapped* berjalan 100% tanpa koneksi keluar; SBOM & dokumentasi publik lengkap. |

