---
id: SPEC-SBX
title: Sandbox Runtime
status: accepted
owner: runtime
prd_refs: ["§3 Modul 3", "§1.2", "§5.1"]
---

# 03. Sandbox Runtime

## 1. Tujuan dan Ruang Lingkup

Sandbox Runtime mengeksekusi micro-app dengan isolasi setara kontainer di web dan native, memberi akses Host hanya melalui capability broker, dan menjamin kegagalan satu micro-app tidak memengaruhi Host atau micro-app lain.

Di luar lingkup: pembangunan UI micro-app (spec 02), data layer (spec 04), distribusi paket (spec 05).

## 2. Aktor dan Prasyarat

| Aktor | Prasyarat |
|---|---|
| Host | Runtime web/native tersedia; core Rust untuk guard |
| Micro-app | Manifest v2 valid; signature terverifikasi; permission dideklarasikan |
| Pengguna | Dapat memberi atau menolak permission saat runtime |

## 3. Requirement

| ID | Level | Requirement | Acceptance |
|---|---|---|---|
| FR-SBX-001 | MUST | Runtime web MUST mengeksekusi setiap micro-app di `iframe` dengan atribut `sandbox="allow-scripts"` dan MUST NOT menyertakan `allow-same-origin`, sehingga origin bersifat opaque. | `iframe.sandbox` hanya `allow-scripts`; akses `document.cookie`, `localStorage` Host, dan `window.parent` gagal. |
| FR-SBX-002 | MUST | Dokumen sandbox MUST memakai CSP `default-src 'none'` dengan pengecualian eksplisit hanya untuk blob/worker/wasm yang dibutuhkan, tanpa `unsafe-eval`. | Pelanggaran CSP tercatat; `eval` diblokir; tidak ada request jaringan dari dokumen sandbox. |
| FR-SBX-003 | MUST | Eksekusi logika micro-app MUST berjalan di Dedicated Worker di dalam sandbox, tanpa akses DOM Host. | Worker tidak memiliki `document`; percobaan akses DOM gagal tanpa menjatuhkan Host. |
| FR-SBX-004 | MUST | Runtime web MUST mendukung modul WASM yang disertakan paket, dimuat dari blob URL dengan verifikasi hash, dan MUST menolak modul yang hash-nya tidak cocok. | Modul valid berjalan; modul yang diubah gagal dimuat. |
| FR-SBX-005 | MUST | Runtime native MUST mengeksekusi bundle JavaScript di QuickJS isolate tanpa akses ambient (tanpa filesystem, network, atau FFI langsung). | Bundle uji tidak dapat membuka file atau socket; seluruh akses gagal. |
| FR-SBX-006 | MUST | Runtime native MUST mengeksekusi modul WASM di Wasmtime dengan WASI dibatasi dan tanpa preopen direktori. | Modul yang mencoba membuka path gagal; modul murni komputasi berjalan. |
| FR-SBX-007 | MUST | Komunikasi micro-app dengan Host MUST hanya melalui Host Bridge (postMessage web, binary FFI native); tidak ada channel lain yang diizinkan. | Pemindaian runtime menemukan satu channel; micro-app tidak dapat memanggil API Host langsung. |
| FR-SBX-008 | MUST | Micro-app MUST berjalan dengan zero privilege: tanpa jaringan, kamera, mikrofon, lokasi, filesystem, sensor, atau AI kecuali dideklarasikan di manifest dan disetujui pengguna. | Manifest tanpa permission tidak dapat mengakses resource apa pun; setiap percobaan ditolak dan diaudit. |
| FR-SBX-009 | MUST | Setiap permission yang diminta MUST divalidasi terhadap manifest sebelum consent ditampilkan; permission di luar manifest MUST ditolak tanpa dialog. | Manifest tanpa `camera` yang meminta kamera menerima penolakan langsung, tanpa prompt. |
| FR-SBX-010 | MUST | Capability broker MUST memeriksa permission pada setiap panggilan bridge, bukan hanya saat mount, dan MUST menolak panggilan yang tidak sesuai grant aktif. | Cabut grant saat app berjalan; panggilan berikutnya gagal. |
| FR-SBX-011 | MUST | `network.allowlist` MUST mendukung domain exact dan wildcard subdomain; allowlist kosong MUST berarti micro-app 100% offline dan Host MUST memblokir seluruh koneksi keluar di level engine. | Allowlist `[]` memblokir semua request; `*.example.com` mengizinkan subdomain tetapi bukan domain lain. |
| FR-SBX-012 | MUST | Pengguna MUST dapat mengaktifkan Offline Cage per micro-app, yang memblokir seluruh jaringan meskipun allowlist berisi domain. | Cage aktif: request ke domain allowlist gagal; status terlihat di UI. |
| FR-SBX-013 | SHOULD | Host MUST menyediakan mode mock/spoof untuk permission tertentu (kamera, lokasi, mikrofon) yang mengembalikan data sintetis dan ditandai di audit. | Mock kamera mengembalikan frame uji; app tidak dapat membedakan dari UI, audit menandai mock. |
| FR-SBX-014 | MUST | Runtime MUST menegakkan kuota memori 128 MB per micro-app di mobile dan 512 MB di desktop, dan MUST mematikan isolate yang melewati batas. | Alokasi melebihi kuota memicu penghentian dengan kode yang jelas; Host tetap berjalan. |
| FR-SBX-015 | MUST | Saat pemakaian memori mencapai 80% kuota, Host MUST memanggil `onMemoryWarning` tepat satu kali per siklus pemakaian dan menampilkan indikator. | Lonjakan ke 85% memicu satu panggilan; turun lalu naik lagi memicu siklus baru. |
| FR-SBX-016 | MUST | Watchdog MUST mendeteksi freeze atau infinite loop dalam 5 detik dan MUST menghentikan isolate tanpa membekukan UI Host. | Loop tak terbatas dihentikan pada ≤ 5 detik; UI tetap responsif dan error boundary tampil. |
| FR-SBX-017 | MUST | Error boundary MUST menampilkan kode error, ringkasan aman, dan tombol Restart yang memulai isolate baru tanpa kehilangan data persisten. | Restart memulihkan micro-app; data SQLite tidak berubah. |
| FR-SBX-018 | MUST | Error boundary MUST menyediakan Inspect Error Log yang menampilkan stack trace teredaksi (tanpa PII atau rahasia) dan dapat diekspor lokal. | Log tidak memuat token/kunci; ekspor menghasilkan berkas lokal. |
| FR-SBX-019 | MUST | Error boundary MUST menyediakan Rollback ke versi sebelumnya bila versi lama masih tersimpan, dengan snapshot database sebelum rollback. | Rollback mengembalikan bundle dan skema versi sebelumnya; snapshot dibuat sebelum eksekusi. |
| FR-SBX-020 | MUST | Error boundary MUST menyediakan Export Data Lokal yang menghasilkan ekspor database micro-app dalam format terbuka tanpa memerlukan micro-app berjalan. | Ekspor berhasil saat isolate mati; berkas dapat dibuka di SQLite. |
| FR-SBX-021 | MUST | Lifecycle MUST memanggil hook dalam urutan `onInstall`, `onMount`, `onFocus`, `onBlur`, `onBackground`, `onSync`, `onMemoryWarning`, `onUpdate`, `onUninstall`, masing-masing paling banyak sekali per transisi. | Log urutan sesuai; tidak ada hook ganda pada transisi yang sama. |
| FR-SBX-022 | MUST | Micro-app yang berada di background lebih dari 30 detik MUST dihibernasi (isolate dihentikan, state diserialisasi) dan MUST dipulihkan saat `onFocus` tanpa kehilangan data persisten. | Setelah 30 detik, memori isolate dilepas; kembali ke app memulihkan route dan state. |
| FR-SBX-023 | MUST | Crash atau freeze satu micro-app MUST NOT menghentikan Host atau micro-app lain; runtime MUST mencatat insiden dan menyediakan restart per app. | Dua micro-app berjalan; satu crash; yang lain tetap berfungsi dan Host tidak reload. |
| FR-SBX-024 | MUST | Setiap penggunaan permission, penolakan, percobaan jaringan yang diblokir, dan penghentian isolate MUST dicatat pada audit lokal dengan `app_id`, `action`, dan `result`. | Audit memuat keempat jenis peristiwa dengan timestamp dan app id. |
| FR-SBX-025 | MUST | Bila isolate tidak tersedia (platform tidak mendukung atau gagal inisialisasi), runtime MUST gagal tertutup dan MUST NOT menjalankan micro-app melalui `eval`, `new Function`, atau WebView tanpa sandbox. | Simulasi isolate gagal: micro-app tidak dijalankan dan menampilkan kode error; tidak ada eksekusi alternatif. |

## 4. Model Data dan State

| Entitas | Field kunci | Invariant |
|---|---|---|
| `runtime_session` | `session_id`, `app_id`, `engine`, `started_at`, `state`, `memory_bytes` | Satu sesi aktif per app per workspace |
| `permission_grant` | `app_id`, `permission_id`, `scope`, `granted_at`, `revoked_at` | Grant aktif unik per app+permission |
| `sandbox_audit` | `id`, `app_id`, `action`, `result`, `metadata_json`, `created_at` | Append-only |

State machine: `created → mounting → active ⇄ background → hibernated → active`, dan `* → crashed → restarting → active`. Transisi ilegal MUST ditolak dan dicatat.

## 5. Error dan Recovery

| Kode | Kondisi | Recovery |
|---|---|---|
| E-SBX-001 | Isolate gagal dibuat | Fail closed, tampilkan error, tawarkan retry; jangan eksekusi di Host |
| E-SBX-002 | Kuota memori terlampaui | Hentikan isolate, tampilkan error boundary, tawarkan restart |
| E-SBX-003 | Freeze/infinite loop terdeteksi | Hentikan isolate setelah 5 detik, tampilkan error boundary |
| E-SBX-004 | Watchdog timeout saat startup | Batalkan mount, tawarkan restart atau rollback |
| E-SBX-005 | Bridge call ditolak (permission/channel) | Kembalikan error terstruktur ke micro-app, catat audit |

## 6. Keamanan dan Privasi

- Tidak ada akses DOM/Widget Host dari micro-app; renderer MUIP berjalan di dalam batas sandbox.
- `eval`, `new Function`, dan HTML mentah dilarang; pelanggaran memblokir build dan runtime.
- Payload bridge divalidasi terhadap skema per method; method tak dikenal ditolak.
- Rate limit bridge: 100 panggilan/detik per app; melebihi batas menghasilkan error dan audit.
- Audit tidak memuat isi payload sensitif; hanya metadata dan hash.

## 7. Acceptance Criteria

- **Given** micro-app berisi loop tak terbatas **When** dijalankan **Then** isolate dihentikan ≤ 5 detik dan Host tetap responsif.
- **Given** manifest tanpa permission kamera **When** micro-app memanggil kamera **Then** panggilan ditolak tanpa dialog dan audit mencatat penolakan.
- **Given** allowlist kosong **When** micro-app mencoba `fetch` **Then** request diblokir di engine dan UI menampilkan badge 100% Offline Verified.
- **Given** dua micro-app berjalan **When** satu crash **Then** yang lain tetap aktif dan dapat digunakan.
- **Given** isolate tidak tersedia **When** pengguna membuka micro-app **Then** eksekusi ditolak dan tidak ada fallback `new Function`.

## 8. Verifikasi

| Bukti | Perintah/Prosedur |
|---|---|
| Escape test | Fixture mencoba `parent.document`, cookie, `fetch`, `eval`; seluruhnya harus gagal |
| Quota/watchdog | Test beban memori dan loop; ukur waktu penghentian |
| Lifecycle | Log hook pada transisi install→uninstall; bandingkan dengan urutan yang diwajibkan |
| Bridge | Test permission matrix dan rate limit |
| Native | Test QuickJS/Wasmtime pada Android, iOS, Linux, Windows, macOS |

## 9. Referensi

- [03-specs/ui-protocol.md](ui-protocol.md), [03-specs/host-bridge.md](host-bridge.md), [03-specs/permissions.md](permissions.md)
- [01-architecture/sandbox-capabilities.md](../01-architecture/sandbox-capabilities.md), [04-flows/12-crash-recovery.md](../04-flows/12-crash-recovery.md)
