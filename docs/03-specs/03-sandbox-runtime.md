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
| FR-SBX-013 | SHOULD | Host MUST menyediakan mode mock/spoof untuk tepat `camera`, `camera.qr`, `microphone`, `location`, dan `biometrics` yang mengembalikan data sintetis dan ditandai di audit; permission lain MUST NOT dapat di-mock. | Mock kamera mengembalikan frame uji; app tidak dapat membedakan dari UI, audit menandai mock; permission lain tidak menampilkan opsi mock. |
| FR-SBX-014 | MUST | Kuota memori efektif per micro-app MUST `min(manifest.runtime.maxMemoryMb, platformCap)` dengan `platformCap` 128 MB di mobile dan 512 MB di desktop. Manifest di atas cap diterima dengan peringatan eksplisit lalu di-clamp ke cap; nilai di bawah 64 MB ditolak saat instalasi. Isolate yang melewati kuota efektif MUST dimatikan. | Manifest 256 MB di mobile berjalan dengan kuota 128 MB dan peringatan; manifest 32 MB ditolak; alokasi melebihi kuota memicu penghentian dengan kode jelas dan Host tetap berjalan. |
| FR-SBX-015 | MUST | Saat pemakaian memori mencapai 80% kuota, Host MUST memanggil `onMemoryWarning` tepat satu kali per siklus pemakaian dan menampilkan indikator. | Lonjakan ke 85% memicu satu panggilan; turun lalu naik lagi memicu siklus baru. |
| FR-SBX-016 | MUST | Watchdog MUST mendeteksi freeze atau infinite loop dalam 5 detik dan MUST menghentikan isolate tanpa membekukan UI Host. Auto-restart MUST dibatasi maksimum 2 kali dalam 60 detik; kegagalan ketiga MUST menampilkan error boundary persisten tanpa restart otomatis. | Loop tak terbatas dihentikan pada ≤ 5 detik; setelah dua restart dalam 60 detik, restart ketiga tidak otomatis dan boundary persisten tampil. |
| FR-SBX-017 | MUST | Error boundary MUST menampilkan kode error, ringkasan aman, dan tombol Restart yang memulai isolate baru tanpa kehilangan data persisten. | Restart memulihkan micro-app; data SQLite tidak berubah. |
| FR-SBX-018 | MUST | Error boundary MUST menyediakan Inspect Error Log yang menampilkan stack trace teredaksi (tanpa PII atau rahasia) dan dapat diekspor lokal. | Log tidak memuat token/kunci; ekspor menghasilkan berkas lokal. |
| FR-SBX-019 | MUST | Error boundary MUST menyediakan Rollback ke versi sebelumnya bila versi lama masih tersimpan, dengan snapshot database sebelum rollback. | Rollback mengembalikan bundle dan skema versi sebelumnya; snapshot dibuat sebelum eksekusi. |
| FR-SBX-020 | MUST | Error boundary MUST menyediakan Export Data Lokal yang menghasilkan ekspor database micro-app dalam format terbuka tanpa memerlukan micro-app berjalan. | Ekspor berhasil saat isolate mati; berkas dapat dibuka di SQLite. |
| FR-SBX-021 | MUST | Lifecycle MUST dibagi dua kelas. Transition-scoped: `onInstall`, `onMount`, `onFocus`, `onBlur`, `onBackground`, `onUpdate`, `onUninstall`, masing-masing paling banyak sekali per transisi. Event-scoped: `onSync` dan `onMemoryWarning`, dipicu oleh kejadian dan bukan transisi. | Log urutan sesuai; tidak ada hook ganda pada transisi yang sama; `onSync` tidak dipanggil saat mount. |
| FR-SBX-022 | MUST | Micro-app yang berada di background lebih dari 30 detik MUST dihibernasi (isolate dihentikan, state diserialisasi) dan MUST dipulihkan saat `onFocus` tanpa kehilangan data persisten. | Setelah 30 detik, memori isolate dilepas; kembali ke app memulihkan route dan state. |
| FR-SBX-023 | MUST | Crash atau freeze satu micro-app MUST NOT menghentikan Host atau micro-app lain; runtime MUST mencatat insiden dan menyediakan restart per app. | Dua micro-app berjalan; satu crash; yang lain tetap berfungsi dan Host tidak reload. |
| FR-SBX-024 | MUST | Setiap penggunaan permission, penolakan, percobaan jaringan yang diblokir, dan penghentian isolate MUST dicatat pada audit lokal dengan `app_id`, `action`, dan `result`. | Audit memuat keempat jenis peristiwa dengan timestamp dan app id. |
| FR-SBX-025 | MUST | Bila isolate tidak tersedia (platform tidak mendukung atau gagal inisialisasi), runtime MUST gagal tertutup dan MUST NOT menjalankan micro-app melalui `eval`, `new Function`, atau WebView tanpa sandbox. | Simulasi isolate gagal: micro-app tidak dijalankan dan menampilkan kode error; tidak ada eksekusi alternatif. |

## 4. Model Data dan State

| Entitas | Field kunci | Invariant |
|---|---|---|
| `runtime_sessions` | `session_id`, `workspace_id`, `app_install_id`, `engine`, `state`, `memory_bytes`, `started_at_ms`, `updated_at_ms` | Satu sesi aktif per app per workspace via partial unique index |
| `permission_grants` | `id`, `workspace_id`, `app_install_id`, `permission_id`, `scope`, `mocked`, `granted_at_ms`, `revoked_at_ms` | Grant aktif unik per `(workspace_id, app_install_id, permission_id)` |
| `audit_log_chain` | `seq_id`, `workspace_id`, `actor`, `action`, `target`, `metadata_json`, `created_at_ms`, `prev_hash`, `entry_hash` | Satu-satunya tabel audit append-only; `entry_hash = SHA-256(prev_hash || u64_be(seq_id) || JCS(payload))` |
| `sandbox_audit` (VIEW) | `seq_id`, `workspace_id`, `app_install_id`, `action`, `result`, `metadata_json`, `created_at_ms` | VIEW filter atas `audit_log_chain`; bukan tabel terpisah dan tidak dapat ditulis langsung |

State machine: `created → mounting → active ⇄ background → hibernated → active`, dan `* → crashed → restarting → active`. Transisi ilegal MUST ditolak dan dicatat.

### 4.1 Runtime secure display

- `runtime.secureDisplay` (boolean, default `false`) pada manifest menandai app yang tidak boleh muncul di screenshot, preview app switcher, atau thumbnail OS.
- Untuk app dengan `secureDisplay: true`, Host MUST menampilkan placeholder berlabel pada app switcher dan Media Capture, MUST NOT mengambil atau menyimpan gambar preview, dan MUST mencatat upaya screenshot yang terdeteksi di audit.
- Flag ini berlaku di web (halaman tidak menyediakan preview) dan native (secure window flag platform); bila platform tidak menyediakan mekanisme secure window, Host MUST menampilkan placeholder dan mencatat status `partial`, bukan mengklaim perlindungan penuh.

### 4.2 Notifikasi lokal

- Jadwal notifikasi lokal disimpan di `notifications` dan MUST dijadwalkan ulang saat launch (cold start) karena antrean platform dapat hilang setelah reboot atau pembaruan aplikasi.
- Web memakai Notification Triggers bila tersedia; bila tidak, jadwal dipulihkan saat halaman dibuka dan batas tersebut didokumentasikan. Native memakai local notifications platform.
- Notifikasi app lain MUST NOT terbaca; kuota dan rate limit mengikuti `notifications.local`.

### 4.3 Platform tanpa Bluetooth/NFC

- Web MUST NOT menyediakan akses Bluetooth atau NFC; panggilan `device.bluetooth`/`device.nfc` di web gagal tertutup dengan `E-SBX-005`, bukan no-op dan bukan dialog izin palsu.
- Native hanya menyediakan akses tersebut bila platform dan izin OS tersedia; bila tidak, kegagalan yang sama berlaku.

## 5. Error dan Recovery

| Kode | Kondisi | Recovery |
|---|---|---|
| E-SBX-001 | Isolate gagal dibuat | Fail closed, tampilkan error, tawarkan retry; jangan eksekusi di Host |
| E-SBX-002 | Kuota memori terlampaui | Hentikan isolate, tampilkan error boundary, tawarkan restart |
| E-SBX-003 | Freeze/infinite loop terdeteksi | Hentikan isolate setelah 5 detik, tampilkan error boundary |
| E-SBX-004 | Watchdog timeout saat startup | Batalkan mount, tawarkan restart atau rollback |
| E-SBX-005 | Bridge call ditolak (permission/channel), termasuk `device.bluetooth`/`device.nfc` di web dan `ai.*`/`workflow.run` sebelum fase 3 | Kembalikan error terstruktur ke micro-app, catat audit |
| E-SBX-006 | Operasi dibatalkan lewat `bridge.cancel` atau app masuk background | Hentikan operasi dan lepaskan resource; tidak ada hasil setelah cancel |
| E-SBX-007 | Transfer biner tidak lengkap atau SHA-256 per berkas/total tidak cocok | Buang chunk, minta ulang berkas, catat audit |
| E-SBX-008 | `id` request dipakai ulang dalam satu sesi | Tolak request tanpa eksekusi, audit |
| E-SBX-009 | Intent tidak dideklarasikan target atau payload > 64 KiB | Tolak sebelum payload diterima target, audit |
| E-HOST-006 | Rantai audit tidak valid (celah/urutan/hash) | Hentikan aksi sensitif, tawarkan ekspor audit dan verifikasi ulang |
| E-HOST-007 | Operasi melintasi `workspace_id` | Tolak, audit, tampilkan error generik |

## 6. Keamanan dan Privasi

- Tidak ada akses DOM/Widget Host dari micro-app; renderer MUIP berjalan di dalam batas sandbox.
- `eval`, `new Function`, dan HTML mentah dilarang; pelanggaran memblokir build dan runtime.
- Payload bridge divalidasi terhadap skema per method; method tak dikenal ditolak. Urutan validasi mengikat: versi → ukuran frame → permission → parameter → rate limit → eksekusi.
- Rate limit bridge: 100 panggilan/detik per app; chunk biner maksimum 256 KiB dengan SHA-256 per berkas dan total; melebihi batas menghasilkan error dan audit.
- App dengan `runtime.secureDisplay: true` tidak muncul di screenshot, app switcher, atau preview; Host menampilkan placeholder berlabel dan tidak menyimpan gambar.
- Audit ditulis ke `audit_log_chain`; `sandbox_audit` adalah VIEW. Audit tidak memuat isi payload sensitif; hanya metadata dan hash.

## 7. Acceptance Criteria

- **Given** micro-app berisi loop tak terbatas **When** dijalankan **Then** isolate dihentikan ≤ 5 detik dan Host tetap responsif.
- **Given** manifest tanpa permission kamera **When** micro-app memanggil kamera **Then** panggilan ditolak tanpa dialog dan audit mencatat penolakan.
- **Given** allowlist kosong **When** micro-app mencoba `fetch` **Then** request diblokir di engine dan UI menampilkan badge 100% Offline Verified.
- **Given** dua micro-app berjalan **When** satu crash **Then** yang lain tetap aktif dan dapat digunakan.
- **Given** isolate tidak tersedia **When** pengguna membuka micro-app **Then** eksekusi ditolak dan tidak ada fallback `new Function`.
- **Given** manifest `maxMemoryMb` 256 pada perangkat mobile **When** app dipasang **Then** kuota efektif 128 MB dan peringatan tampil; manifest 32 MB ditolak.
- **Given** app `secureDisplay: true` **When** app switcher dibuka **Then** placeholder berlabel tampil dan tidak ada gambar preview tersimpan.
- **Given** app web memanggil `device.nfc` **When** diproses **Then** `E-SBX-005` dan tidak ada dialog izin.

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
