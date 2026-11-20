---
id: SPEC-HOST
title: Host Shell
status: accepted
owner: product
prd_refs: ["§3 Modul 1", "§1.2", "§5.2"]
---

# 01. Host Shell

## 1. Tujuan dan Ruang Lingkup

Host Shell adalah aplikasi induk yang memberi pengalaman "sistem operasi micro-app": launch tanpa akun, home yang dapat dikustomisasi, pencarian lokal, multitasking, intent bus, vault, notifikasi, dan pengelolaan penyimpanan. Semua operasi inti MUST bekerja tanpa jaringan.

Di luar lingkup: pembangunan micro-app (spec 02), eksekusi micro-app (spec 03), sinkronisasi (spec 06), server (spec 07).

## 2. Aktor dan Prasyarat

| Aktor | Prasyarat |
|---|---|
| Pengguna baru | Perangkat dengan penyimpanan lokal; tanpa akun dan tanpa jaringan |
| Pengguna lanjutan | Local Identity sudah ada; workspace minimal satu |
| Micro-app | Terpasang, manifest valid, permission sudah diminta saat runtime |
| Host | Akses Keychain/Keystore/WebCrypto; OPFS untuk persistensi penuh |

### 2.1 Rute Host Fase 1

Host Shell fase 1 MUST mengekspos tepat rute berikut; rute lain MUST NOT dirender.

| Rute | Isi |
|---|---|
| `/` | First run, Home, folder (`?folder=`), dan widget board (`?widgets=1`) |
| `/app/:id` | Surface sandbox satu micro-app terpasang |
| `/settings/permissions` | Daftar grant per app, revoke, mock, dan toggle Offline Cage |
| `/settings/sync` | Status antrean, peer, dan konfigurasi kanal (antrean nol sampai fase 3) |
| `/settings/vault` | Buat, buka, kunci, grant per item, dan auto-lock |
| `/settings/storage` | Ukuran per kategori, pin forever, dan pembersihan cache |
| `/settings/general` | Locale, tema, workspace default, dan identitas |
| `/registry` | Sumber registry lokal dan penawaran instalasi |
| `/studio/:id` | Project draft Studio (editor penuh menyusul fase 2) |
| `/dev/tools` | DevTools lokal, hanya dengan flag developer |
| `/admin` | Fail closed: menolak akses tanpa peran server sampai fase 5 |

`/dashboard` MUST dialihkan permanen ke `/`. Rute `/login`, `/register`, dan `/run/:id` dari Phase 0 MUST dihapus, bukan dipertahankan sebagai alias.

### 2.2 Pemisahan Proses dan Penyimpanan

- Kriptografi identitas dan Vault MUST berjalan di dedicated Worker (`identity.worker.ts`); main thread hanya menerima public key, signature, atau plaintext yang diminta. WebCrypto `CryptoKey` MUST non-extractable dan disimpan di IndexedDB.
- Bila penyimpanan non-extractable tidak tersedia, identitas hanya hidup di memori sesi, status degradasi MUST terlihat, dan pengguna MUST diminta recovery setelah reload; tidak ada plaintext sebagai kompensasi.
- State launcher (`last_app_id`, `home_scroll`, `filters_json`, workspace aktif) MUST disimpan di `workspace_state` dan dipulihkan saat cold start.
- Auto-lock Vault MUST 300.000 ms idle; status lock hanya di memori. Offline Cage MUST aktif secara default (`app_policy.offline_cage = 1`).

## 3. Requirement

| ID | Level | Requirement | Acceptance |
|---|---|---|---|
| FR-HOST-001 | MUST | Pada launch pertama tanpa Local Identity, Host MUST membuat pasangan kunci Ed25519 (signing) dan X25519 (ECDH) di perangkat sebelum Home dirender, tanpa panggilan jaringan dan tanpa formulir akun. | Launch pada perangkat kosong menghasilkan `local_identity` berisi `site_id`, `identity_pubkey`, `key_agreement_pubkey`, `hkdf_salt`, `device_sign_pubkey`, dan `device_ecdh_pubkey` (nama acceptance `device_id`/`public_key_ed25519`/`enc_key_x25519`); tidak ada request jaringan; Home tampil. |
| FR-HOST-002 | MUST | Private key MUST disimpan melalui Keychain/Keystore/WebCrypto sebagai non-extractable di dedicated Worker; Host MUST NOT menulis private key ke localStorage, IndexedDB biasa, file log, atau backup plaintext. | Pemindaian storage dan log tidak menemukan material private key; derivasi dan signature hanya terjadi di `identity.worker.ts`; export kunci hanya tersedia sebagai Recovery Phrase terenkripsi. |
| FR-HOST-003 | MUST | Host MUST menghasilkan Recovery Phrase 24 kata BIP-39 dan meminta konfirmasi tiga kata acak sebelum pengguna menyimpan data sensitif pertama. | Frasa ditampilkan sekali; konfirmasi salah menolak penyimpanan rahasia; frasa benar membuka pembuatan Vault. |
| FR-HOST-004 | MUST | Host web MUST installable sebagai PWA dengan manifest, ikon, dan Service Worker yang menyimpan shell serta aset lokal sehingga launch berikutnya dan seluruh navigasi inti bekerja offline. | Setelah satu kunjungan, mode pesawat tetap membuka Home, micro-app terpasang, dan pencarian; audit cache menunjukkan tidak ada aset runtime eksternal. |
| FR-HOST-005 | MUST | Home MUST menyediakan grid micro-app dengan urutan kustom, folder bertingkat minimal tiga level, dan pinned dock; perubahan urutan persisten setelah restart. | Drag ke folder level 3, restart, urutan dan keanggotaan folder identik. |
| FR-HOST-006 | MUST | Live widget MUST membaca database lokal micro-app dan menampilkan data terbaru tanpa jaringan, dengan interval refresh yang ditentukan widget dan batas 1 query per widget per 5 detik. | Widget saldo menampilkan nilai terbaru setelah record berubah; mencabut jaringan tidak mengubah nilai; Host membaca `app_databases` milik app tersebut langsung tanpa bridge; query tercatat ≤ 12 per menit per widget dan setiap query diaudit. |
| FR-HOST-007 | MUST | Workspace Switcher MUST memisahkan konteks (mis. Personal Offline, Keluarga, Kantor) dengan isolasi data absolut: database, cache, registry, dan permission terpisah per workspace. | Micro-app yang sama di dua workspace tidak dapat membaca data satu sama lain; query atau grant lintas workspace ditolak dengan `E-HOST-007`. |
| FR-HOST-008 | MUST | Pengguna MUST dapat membuat, mengganti nama, dan menghapus workspace; penghapusan MUST menawarkan ekspor dan MUST NOT menghapus data tanpa konfirmasi eksplisit. | Hapus workspace menampilkan dialog dengan opsi ekspor; membatalkan dialog tidak mengubah data. |
| FR-HOST-009 | MUST | Omni-search MUST memakai FTS5 lokal untuk mencari nama micro-app, judul record, isi catatan, dan nilai formulir dalam satu daftar hasil dengan urutan relevansi dan filter per workspace. | Query dua kata menemukan record dari dua micro-app berbeda; hasil muncul < 100 ms untuk 100.000 record pada perangkat referensi. |
| FR-HOST-010 | SHOULD | Bila `sqlite-vec` tersedia dan pengguna mengaktifkannya, pencarian semantik lokal MUST dapat diaktifkan per workspace; bila tidak tersedia, fitur MUST menampilkan status tidak tersedia tanpa menurunkan fitur FTS5. | Mengaktifkan pencarian vektor tanpa ekstensi menampilkan status eksplisit; FTS5 tetap berfungsi. |
| FR-HOST-011 | MUST | Command Palette MUST terbuka dengan `Cmd/Ctrl+K`, menyediakan aksi navigasi, pembuatan micro-app, pengaturan, dan pencarian, serta dapat dioperasikan penuh dengan keyboard. | `Cmd/Ctrl+K` membuka palette dalam < 100 ms; `Esc` menutup; `Enter` menjalankan aksi terpilih; fokus kembali ke elemen sebelumnya. |
| FR-HOST-012 | MUST | App Switcher MUST mempertahankan state penuh micro-app (route, form, scroll, state runtime) saat berpindah, tanpa memuat ulang bundle. | Berpindah A→B→A mengembalikan posisi scroll dan isi form yang belum disimpan; waktu switch < 50 ms; app dengan `runtime.secureDisplay = true` menampilkan placeholder berlabel dan MUST NOT menghasilkan screenshot atau preview di app switcher. |
| FR-HOST-013 | SHOULD | Pada desktop dan tablet, Host MUST mendukung split-screen dua micro-app, tabbed workspace, dan floating Picture-in-Picture dengan satu sumber state per micro-app. | Dua micro-app tampil berdampingan; menutup PiP tidak menghentikan state; tidak ada duplikasi instance state. |
| FR-HOST-014 | MUST | Intent bus MUST meneruskan teks, berkas, gambar, dan JSON terstruktur antar micro-app melalui dialog consent lokal yang menampilkan pengirim, tujuan, dan tipe data, serta MUST menolak intent tanpa persetujuan. | Kirim gambar A→B menampilkan dialog; menolak menghentikan pengiriman; menerima menyerahkan payload tanpa akses lain. |
| FR-HOST-015 | MUST | Deep link `microapp://<registry-or-local>/<app-id>/<route>?params=...` MUST membuka salinan lokal bila terpasang, dan MUST menampilkan penawaran instalasi bila belum, seluruhnya offline bila paket tersedia lokal. | Deep link ke app terpasang membuka route yang benar; ke app tidak terpasang menampilkan penawaran install, bukan error jaringan. |
| FR-HOST-016 | MUST | Vault MUST menyimpan item dengan AES-256-GCM, kunci vault = `HKDF(master, info = "microapp/v1/vault")` yang dibungkus KEK PIN/passphrase dengan Argon2id (m=64 MiB, t=3, p=1, salt 16 byte) di `vault_key_wraps`, dan MUST terkunci otomatis setelah 300.000 ms idle; membuka Vault MUST memerlukan biometrik, PIN, atau passphrase. | Setelah 5 menit idle, item tidak dapat dibaca tanpa unlock; ciphertext di disk tidak memuat plaintext; pembungkus kunci tersimpan di `vault_key_wraps` dan kunci vault tidak pernah ditulis plaintext. |
| FR-HOST-017 | MUST | Setiap pembagian item Vault ke micro-app MUST memerlukan grant eksplisit per item dan per micro-app di `vault_grants`, dapat dicabut, dan MUST tercatat di audit lokal. | Grant `api_key` ke app A tidak memberi akses ke app B; `vault.read` tanpa grant aktif ditolak; revoke langsung menghentikan akses; audit memuat kedua peristiwa. |
| FR-HOST-018 | MUST | Host MUST menjadwalkan notifikasi dan pengingat lokal yang tetap berbunyi saat offline dan setelah restart, dengan izin `notifications.local`. | Reminder 2 menit ke depan berbunyi dalam mode pesawat; saat launch, scheduler memuat ulang `notifications` berstatus `scheduled` dan menjadwalkannya kembali (Notification Triggers bila tersedia, selain itu pengingat saat app aktif). |
| FR-HOST-019 | SHOULD | Notifikasi push MUST mendukung UnifiedPush dan WebPush untuk instance self-host tanpa mewajibkan FCM/APNs; bila tidak tersedia, notifikasi lokal tetap berfungsi. | Instance self-host mengirim push melalui UnifiedPush; tanpa layanan push, aplikasi menampilkan status dan notifikasi lokal tetap jalan. Push dijadwalkan pada fase 5 karena bergantung pada server; notifikasi lokal fase 1 tetap menjadi fallback. |
| FR-HOST-020 | MUST | Storage Manager MUST menampilkan ukuran per micro-app untuk bundle, database, cache media, dan total, serta ruang yang dapat direbut kembali. | Angka total sama dengan jumlah komponen dalam toleransi 1%; daftar diurutkan berdasarkan ukuran; laporan memuat byte per kategori dan status pin forever per aset. |
| FR-HOST-021 | MUST | Export Backup MUST menghasilkan berkas `.mapp-backup` terenkripsi dengan header ASCII `MAPPBK01` yang memuat workspace, database, manifest terpasang, dan metadata, dengan passphrase yang diturunkan dari master key atau passphrase pengguna. | Berkas tidak dapat dibaca tanpa passphrase; header, versi, parameter KDF, nonce, dan tag sesuai kontrak; restore pada perangkat lain memulihkan jumlah record identik setelah verifikasi checksum. |
| FR-HOST-022 | MUST | Pin Forever MUST mencegah pembersihan otomatis aset micro-app dan MUST bertahan setelah restart serta sinkronisasi. | Tandai pin (`storage_pins`), jalankan pembersihan cache, aset tetap ada; status pin terlihat di Storage Manager. |
| FR-HOST-023 | MUST | Pembersihan cache MUST NOT menghapus database pengguna, Vault, atau berkas yang di-pin; Host hanya boleh memotong cache yang dapat diunduh ulang dan MUST menjelaskan dampaknya sebelum eksekusi. | Pembersihan pada perangkat penuh tidak mengubah jumlah record database; laporan menunjukkan byte yang dibebaskan per kategori. |
| FR-HOST-024 | MUST | Launcher state (micro-app terakhir, posisi scroll Home, workspace aktif, filter) MUST dipulihkan setelah cold start. | Tutup paksa lalu buka kembali memulihkan workspace, `last_app_id`, `home_scroll`, dan `filters_json` dari `workspace_state`. |
| FR-HOST-025 | MUST | Home, pencarian, widget, dan folder MUST memiliki empty state yang menjelaskan kondisi dan menyediakan aksi berikutnya. | Workspace kosong menampilkan empty state dengan aksi "Buka Registry" dan "Buat micro-app". |
| FR-HOST-026 | MUST | Host MUST menampilkan indikator offline global dan jumlah operasi yang tertunda (sync/outbox) tanpa menghalangi navigasi. | Mode pesawat menampilkan banner offline; antrean 3 job menampilkan angka 3; banner tidak menutupi konten. |
| FR-HOST-027 | MUST | Kegagalan Host MUST ditampilkan melalui error surface yang memuat kode error, langkah pemulihan, dan tombol retry yang aman, tanpa kehilangan data pengguna. | Simulasi kegagalan DB worker menampilkan kode dan tombol restart; data tetap utuh setelah restart. |
| FR-HOST-028 | MUST | Seluruh alur Host di desktop dan web MUST dapat diselesaikan hanya dengan keyboard, termasuk membuka app, berpindah workspace, dan menutup dialog. | Audit keyboard-only menyelesaikan 10 tugas inti tanpa mouse; fokus tidak terperangkap. |
| FR-HOST-029 | MUST | Launcher, dialog consent, dan error surface MUST memiliki label/role screen reader yang benar dan mengumumkan perubahan status melalui live region. | Uji dengan NVDA/VoiceOver: nama app, status offline, dan hasil pencarian terbaca; dialog mengumumkan judul dan fokus masuk. |
| FR-HOST-030 | MUST | Host MUST mengikuti locale sistem (`id-ID`, `en-US`) dan MUST mencerminkan layout untuk bahasa RTL tanpa memotong teks atau kontrol. | Set locale `ar` menampilkan layout RTL; tidak ada elemen terpotong pada 200% zoom. |

## 4. Model Data dan State

| Entitas | Field kunci | Invariant |
|---|---|---|
| `local_identity` | `site_id`, `identity_pubkey`, `key_agreement_pubkey`, `hkdf_salt`, `device_sign_pubkey`, `device_ecdh_pubkey`, `recovery_hint`, `created_at_ms` | Satu identity per instalasi; tidak ada `recovery_key_hash` atau hash mnemonic; private key tidak pernah disimpan di tabel |
| `workspaces` | `id` (UUIDv7), `name`, `slug`, `is_default`, `created_at_ms`, `last_opened_at_ms` | Minimal satu workspace; slug unik; satu default |
| `workspace_state` | `workspace_id` (PK), `last_app_id`, `home_scroll`, `filters_json`, `updated_at_ms` | Dipulihkan saat cold start; milik satu workspace |
| `installed_microapps` | `id`, `workspace_id`, `app_id`, `version`, `content_hash`, `install_source`, `bundle_path`, `state` | Grant tidak disimpan di sini; sumber kebenaran grant adalah `permission_grants` |
| `app_databases` | `id`, `workspace_id`, `app_install_id`, `relative_path`, `schema_version` | Satu database per app per workspace |
| `runtime_sessions` | `session_id` (PK), `workspace_id`, `app_install_id`, `engine`, `state`, `memory_bytes` | Satu sesi aktif per app per workspace |
| `permission_grants` | `id`, `workspace_id`, `app_install_id`, `permission_id`, `scope`, `mocked`, `granted_at_ms`, `revoked_at_ms` | Partial unique index untuk grant aktif; `scope` ∈ `persistent/session/once` |
| `notifications` | `id`, `workspace_id`, `app_install_id`, `title`, `body`, `deep_link`, `scheduled_at_ms`, `fired_at_ms`, `read_at_ms`, `state` | `state` ∈ `scheduled/fired/cancelled`; field acceptance `app_id`/`scheduled_at` dipetakan ke `app_install_id`/`scheduled_at_ms` |
| `audit_log_chain` | `seq_id`, `actor`, `action`, `target`, `metadata`, `prev_hash`, `entry_hash`, `created_at_ms` | `entry_hash = SHA-256(prev_hash ‖ u64_be(seq_id) ‖ JCS(payload))`; `sandbox_audit` adalah VIEW, bukan tabel |
| `vault_items` | `id`, `workspace_id`, `label`, `ciphertext`, `key_id`, `nonce`, `created_at_ms` | `ciphertext` memuat envelope lengkap; `key_id` dan `nonce` wajib cocok dengan envelope |
| `vault_grants` | `id`, `workspace_id`, `vault_item_id`, `app_install_id`, `granted_at_ms`, `revoked_at_ms` | Grant per item per app; revoke menghentikan `vault.read` |
| `vault_key_wraps` | `id`, `workspace_id`, `kdf`, `salt`, `memory_kib`, `iterations`, `parallelism`, `nonce`, `wrapped_key`, `retired_at_ms` | Tepat satu pembungkus aktif per workspace; kunci vault tidak pernah plaintext |
| `storage_pins` | `workspace_id`, `app_install_id`, `relative_path`, `pinned_at_ms` | Pin bertahan setelah restart dan pembersihan cache |
| `app_policy` | `workspace_id`, `app_install_id`, `offline_cage`, `mock_permissions_json` | `offline_cage` default `1` (aktif) |

State machine launcher: `cold → restoring → ready` dan `ready → background → ready`. Kegagalan restore MUST jatuh ke `ready` dengan state default, bukan crash.

## 5. Error dan Recovery

| Kode | Kondisi | Recovery |
|---|---|---|
| E-HOST-001 | Keychain/Keystore tidak tersedia saat first run | Tawarkan passphrase-derived key dengan peringatan; blokir data sensitif sampai berhasil |
| E-HOST-002 | OPFS tidak tersedia (mis. private mode) | Jalankan mode `ephemeral`, tampilkan status, izinkan ekspor saja |
| E-HOST-003 | Deep link tidak dapat diselesaikan | Tampilkan penawaran instalasi atau pesan route tidak dikenal |
| E-HOST-004 | Vault gagal unlock | Tetap terkunci, hitung percobaan, tawarkan recovery phrase |
| E-HOST-005 | Pembersihan penyimpanan gagal sebagian | Laporkan kategori yang gagal, jangan hapus database, sediakan retry |
| E-HOST-006 | Rantai audit tidak valid (celah `seq_id`, urutan salah, atau hash tidak cocok) | Hentikan aksi sensitif, tawarkan ekspor audit dan verifikasi ulang |
| E-HOST-007 | Query atau grant melintasi `workspace_id` | Tolak operasi, audit, tampilkan error generik |
| E-AUTH-001 | Signature device certificate tidak valid | Tolak operasi, minta pairing ulang |
| E-AUTH-002 | Recovery Phrase salah saat konfirmasi onboarding | Tolak tanpa membocorkan kata mana yang salah, batasi percobaan |
| E-AUTH-003 | Sesi perangkat dicabut | Hentikan sync, tampilkan status, minta pairing ulang |
| E-AUTH-006 | Frasa pemulihan tidak menurunkan `identity_pubkey` yang sama | Kegagalan generik tanpa petunjuk kata; batasi 10 percobaan per menit per perangkat |

## 6. Keamanan dan Privasi

- Micro-app tidak pernah menerima kunci identity; semua operasi kripto terjadi di core dan dedicated Worker.
- Vault hanya dapat dibuka melalui faktor lokal; tidak ada endpoint jaringan untuk membuka Vault. Grant per item disimpan di `vault_grants`; `vault.read` tanpa grant aktif ditolak.
- Intent bus memakai allowlist tipe payload dan consent per transfer; payload tidak disimpan setelah dikonsumsi.
- Audit lokal mencatat pembukaan Vault, grant/revoke, dan percobaan akses yang ditolak dalam satu `audit_log_chain`; entri diverifikasi sebelum aksi sensitif dan pelanggaran menghasilkan `E-HOST-006`.
- Offline Cage MUST aktif secara default; hanya pengguna yang dapat mematikannya lewat Pengaturan.
- Tidak ada telemetry; seluruh data analitik produk berasal dari opt-in self-host, bukan dari Host.
- Screenshot dan preview app switcher atau Media Capture MUST dilarang untuk micro-app dengan `runtime.secureDisplay = true`; Host menampilkan placeholder berlabel dan tidak menyimpan screenshot.

## 7. Acceptance Criteria

- **Given** perangkat kosong tanpa jaringan **When** pengguna membuka Host **Then** Local Identity dibuat, Home tampil, dan tidak ada request keluar.
- **Given** dua workspace berisi micro-app yang sama **When** pengguna membuka micro-app di workspace A **Then** data workspace B tidak dapat dibaca.
- **Given** 100.000 record lokal **When** pengguna mencari dua kata **Then** hasil relevan muncul < 100 ms dan dapat dibuka tanpa jaringan.
- **Given** Vault tidak aktif selama 5 menit **When** pengguna membuka item **Then** unlock diminta dan isi tidak tampil sebelum berhasil.
- **Given** penyimpanan hampir penuh **When** pengguna membersihkan cache **Then** database, Vault, dan aset pinned tetap utuh.
- **Given** micro-app meminta intent ke app lain **When** pengguna menolak **Then** tidak ada payload yang dikirim dan penolakan tercatat.
- **Given** perangkat dengan build fase 1 **When** rute fase 1 dibuka **Then** `/`, `/app/:id`, `/settings/*`, `/registry`, `/studio/:id`, `/dev/tools` (flag), dan `/admin` merespons sesuai kontrak; `/dashboard` dialihkan ke `/`.
- **Given** browser tanpa penyimpanan `CryptoKey` non-extractable **When** first run selesai **Then** identitas hanya ada di memori sesi, status degradasi tampil, dan recovery diminta setelah reload tanpa plaintext.
- **Given** backup `.mapp-backup` **When** dibuka tanpa passphrase **Then** header `MAPPBK01` dikenali tetapi isi tidak dapat didekripsi.

## 8. Verifikasi

| Bukti | Perintah/Prosedur |
|---|---|
| Type check dan unit test | `npm test` (test Host di `apps/studio-web`) |
| Offline shell | Playwright: load sekali, set offline, reload, buka app terpasang; pastikan first run tidak menghasilkan request ke origin non-lokal |
| Rute | Kunjungi setiap rute fase 1; pastikan `/dashboard` redirect dan rute Phase 0 yang dihapus mengembalikan 404 |
| Worker dan kunci | Inspeksi IndexedDB dan log; pastikan `CryptoKey` non-extractable dan tidak ada material privat di main thread |
| Vault dan audit | Uji auto-lock 300.000 ms, grant per item, revoke, serta tamper rantai audit menghasilkan `E-HOST-006` |
| Isolasi workspace | Query dan grant lintas `workspace_id` ditolak dengan `E-HOST-007` |
| Backup | Ekspor `.mapp-backup`, verifikasi header `MAPPBK01`, restore dengan dan tanpa passphrase benar |
| A11y | `axe` pada Home, palette, dialog consent; audit keyboard-only |
| Performa | Ukur cold start dan warm switch pada perangkat referensi; catat di `08-quality/performance-budgets.md` |

## 9. Referensi

- [03-specs/permissions.md](permissions.md), [03-specs/host-bridge.md](host-bridge.md), [03-specs/error-codes.md](error-codes.md)
- [02-design/screen-specs.md](../02-design/screen-specs.md), [04-flows/01-first-run.md](../04-flows/01-first-run.md)
- [01-architecture/identity-crypto.md](../01-architecture/identity-crypto.md)
