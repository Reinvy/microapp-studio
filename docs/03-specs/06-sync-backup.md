---
id: SPEC-SYNC
title: Sinkronisasi dan Backup
status: accepted
owner: sync
prd_refs: ["§3 Modul 6", "§5.2"]
---

# 06. Sinkronisasi dan Backup

## 1. Tujuan dan Ruang Lingkup

Sinkronisasi memindahkan mutasi antar perangkat secara E2EE melalui LAN, WebRTC, server self-host, atau BYOS, dengan penggabungan deterministik. Backup menyediakan snapshot terenkripsi dan ekspor terbuka untuk mencegah lock-in.

Di luar lingkup: skema data per app (spec 04), server deployment (spec 07), kebijakan registry (spec 05).

## 2. Aktor dan Prasyarat

| Aktor | Prasyarat |
|---|---|
| Pengguna | Local Identity dan Recovery Phrase tersimpan |
| Peer | Sudah dipasangkan (pairing) dengan kunci publik terverifikasi |
| Server | Sync hub aktif; tidak memiliki kunci dekripsi |
| BYOS | Kredensial penyimpanan di Vault |

## 3. Requirement

| ID | Level | Requirement | Acceptance |
|---|---|---|---|
| FR-SYNC-001 | MUST | Seluruh payload sinkronisasi MUST dienkripsi di klien sebelum meninggalkan perangkat menggunakan subkey turunan master key; plaintext MUST NOT dikirim ke peer, server, atau BYOS. | Trafik dan berkas server hanya berisi ciphertext; dekripsi tanpa kunci gagal. |
| FR-SYNC-002 | MUST | Kunci sync MUST diturunkan dari Recovery Phrase 24 kata atau passkey PRF melalui hierarki kunci yang sama dengan Vault dan backup. | Frasa yang sama pada perangkat baru menghasilkan kunci yang dapat mendekripsi data lama. |
| FR-SYNC-003 | MUST | Server dan relay MUST bersifat zero-knowledge: tidak menyimpan kunci, tidak mendekripsi, dan tidak mengindeks isi. | Audit server tidak menemukan jalur dekripsi; metadata terbatas pada ukuran dan waktu. |
| FR-SYNC-004 | MUST | Sinkronisasi LAN MUST memakai penemuan mDNS dan kanal TLS lokal, dan MUST menolak peer yang belum dipasangkan. | Peer belum dipasangkan tidak dapat terhubung; peer sah sync < 100 ms per mutasi. |
| FR-SYNC-005 | MUST | Sinkronisasi WebRTC MUST mendukung koneksi langsung antar perangkat melalui STUN/signaling ringan, dengan DTLS dan verifikasi fingerprint kunci. | Dua perangkat di jaringan berbeda tersambung; fingerprint diverifikasi saat pairing. |
| FR-SYNC-006 | MUST | Sinkronisasi self-host MUST memakai WebSocket atau HTTP2 ke server milik pengguna, dengan envelope E2EE yang sama seperti transport lain. | Server menerima batch ciphertext; perangkat lain menerima dan mendekripsi. |
| FR-SYNC-007 | MUST | Sinkronisasi BYOS MUST mendukung WebDAV, S3/MinIO, Google Drive/Dropbox (opsional), Git repo privat, dan folder lokal yang disinkronkan Syncthing. | Berkas snapshot/cursor tersinkron melalui WebDAV dan S3; Git menerima commit ciphertext. |
| FR-SYNC-008 | MUST | Pemilihan transport MUST deterministik: LAN mDNS+TLS → WebRTC direct → self-host WS/HTTP2 → BYOS; BYOS hanya dipakai bila tidak ada peer maupun server. | Dengan LAN tersedia, LAN dipakai; mematikan LAN memilih WebRTC; tanpa keduanya memilih server. |
| FR-SYNC-009 | MUST | Bila LAN atau WebRTC gagal dalam 5 detik, client MUST beralih ke self-host tanpa interaksi pengguna dan MUST mencatat alasan fallback. | Simulasi kegagalan LAN beralih ≤ 5 detik; audit mencatat alasan. |
| FR-SYNC-010 | MUST | Handshake MUST menukar versi protokol, `site_id`, capability, dan cursor, dengan urutan `HELLO`, `AUTH`, `MANIFEST`, `MUTATION_BATCH`, `ACK`, `CONFLICT`, `BYE`. | Log handshake sesuai urutan; versi tidak kompatibel ditolak dengan kode jelas. |
| FR-SYNC-011 | MUST | Batch mutasi MUST dibatasi 500 mutation atau 8 MiB ciphertext, whichever lebih dulu tercapai. | Batch 501 dipecah; batch 8 MiB dipecah; tidak ada batch melebihi batas. |
| FR-SYNC-012 | MUST | Setiap batch MUST memiliki idempotency key dan cursor sehingga pengiriman ulang setelah putus koneksi tidak menggandakan mutasi. | Putus koneksi di tengah batch; reconnect; tidak ada mutasi ganda. |
| FR-SYNC-013 | MUST | Reconnect MUST memakai backoff 1/2/5/10/30/60 detik dengan jitter 20% dan MUST berhenti setelah 60 detik sampai ada perubahan jaringan atau aksi pengguna. | Log interval sesuai; tidak ada loop tanpa batas. |
| FR-SYNC-014 | MUST | Konflik kolom identik MUST diselesaikan deterministik dan nilai kalah MUST muncul di `conflict_history` serta dapat ditinjau dan dipulihkan di UI. | Dua edit kolom sama menghasilkan satu pemenang; nilai lain tersedia dan dapat dipulihkan. |
| FR-SYNC-015 | MUST | Mutasi dengan schema version lebih baru MUST disimpan di staging sampai perangkat diperbarui, dan UI MUST menampilkan status "perlu update" tanpa memblokir data lain. | Perangkat lama menerima mutasi baru; tabel aktif tidak berubah; status tampil. |
| FR-SYNC-016 | MUST | Pairing perangkat MUST memakai QR Code dan SAS 6 digit yang harus dikonfirmasi kedua pihak sebelum kunci dipertukarkan. | QR dipindai; SAS berbeda pada salah satu pihak membatalkan pairing. |
| FR-SYNC-017 | MUST | Pengguna MUST dapat melihat daftar perangkat, status terakhir sync, dan mencabut perangkat; pencabutan MUST menghentikan sync dan menghapus kunci sesi perangkat tersebut. | Cabut perangkat; sync berikutnya ditolak; perangkat lain tidak terdampak. |
| FR-SYNC-018 | MUST | Status sync MUST menampilkan peer, transport aktif, cursor, antrean, dan error terakhir tanpa menampilkan isi data. | UI menampilkan transport dan antrean; tidak ada payload di UI. |
| FR-SYNC-019 | MUST | Ekspor SQLite `.db` MUST menghasilkan berkas yang dapat dibuka alat SQLite standar, dengan opsi menyertakan atau mengecualikan kolom sensitif. | Berkas terbuka di `sqlite3`; kolom sensitif mengikuti pilihan. |
| FR-SYNC-020 | MUST | Ekspor JSONL, CSV, dan Markdown MUST tersedia per micro-app dan untuk seluruh workspace, dengan skema terdokumentasi dan encoding UTF-8. | Ekspor dapat diimpor kembali; CSV lolos validasi parser standar. |
| FR-SYNC-021 | MUST | FR-HOST-021 dan FR-SYNC-021 MUST memakai satu format kontainer `.mapp-backup`: header ASCII `MAPPBK01`, `version` u16, parameter KDF (Argon2id `m = 64 MiB`, `t = 3`, `p = 1`, salt 16 byte) atau penanda kunci turunan master, `nonce` 12 byte, ciphertext AES-256-GCM, dan tag 16 byte. Plaintext MUST berupa JSON kanonik JCS `{workspace, hostDb, appDbs (base64), manifests, checksums per section, createdAt, formatVersion}`. | Snapshot tidak dapat dibuka tanpa passphrase/kunci yang benar; checksum gagal pada berkas yang diubah; berkas yang sama dapat dipulihkan host web, Flutter, dan server. |
| FR-SYNC-022 | MUST | Restore MUST dapat mengambil sumber dari peer, server, atau BYOS, dan MUST memverifikasi checksum per section, jumlah record, serta signature manifest sebelum menulis apa pun. | Restore dari ketiga sumber berhasil; snapshot rusak, jumlah record tidak cocok, atau signature tidak valid ditolak tanpa mengubah data lokal. |
| FR-SYNC-023 | MUST | Setelah restore, Host MUST memverifikasi jumlah record dan hash per tabel, lalu menampilkan ringkasan verifikasi kepada pengguna. | Ringkasan menunjukkan jumlah dan status cocok/tidak cocok per tabel. |
| FR-SYNC-024 | MUST | Restore MUST NOT menimpa workspace yang sudah berisi data tanpa konfirmasi eksplisit; konflik digabung atau disimpan sebagai salinan, bukan dihapus. | Restore snapshot lama ke workspace berisi data meminta konfirmasi; menolak konfirmasi membiarkan data lokal utuh; menerima menyimpan data baru sebagai salinan/konflik. |
| FR-SYNC-025 | MUST | Format ekspor dan snapshot MUST stabil serta terdokumentasi; perubahan format MUST menaikkan versi dan mempertahankan pembaca versi lama minimal 12 bulan. | Snapshot versi lama dapat dibaca host baru; dokumen format memuat versi. |

## 4. Model Data dan State

| Entitas | Field kunci | Invariant |
|---|---|---|
| `sync_peers` | `id`, `peer_site_id`, `peer_name`, `peer_identity_pubkey`, `device_cert`, `transport`, `last_seen_lan_ip`, `sync_server_url`, `trust_state`, `paired_at_ms`, `revoked_at_ms` | `peer_site_id` unik; kunci tidak berubah tanpa pairing ulang |
| `sync_cursors` | `id`, `peer_id`, `app_install_id`, `last_acked_hlc`, `last_batch_id`, `updated_at_ms` | Cursor monoton naik per peer |
| `conflict_history` | `conflict_id`, `table_name`, `row_id`, `column_name`, `losing_value_json`, `losing_hlc`, `losing_site`, `winning_hlc`, `resolution`, `resolved_by` | Tidak dihapus sebelum retensi |
| `sync_sessions` | `session_id`, `peer_id`, `transport`, `state`, `started_at_ms` | Satu sesi aktif per peer+transport |

State sesi: `idle → discovering → handshaking → syncing → idle`, dengan `syncing → backoff → syncing` dan `* → failed`. `failed` MUST menyimpan alasan dan tidak melakukan retry diam-diam.

### 4.1 Kontainer `.mapp-backup`

| Bagian | Ukuran/Nilai | Aturan |
|---|---|---|
| Header | 8 byte ASCII | `MAPPBK01`; header lain ditolak sebelum dekripsi |
| `version` | u16 big-endian | Versi saat ini `1`; pembaca lama wajib dipertahankan minimal 12 bulan |
| KDF | parameter atau penanda | Argon2id `m = 64 MiB`, `t = 3`, `p = 1`, salt 16 byte acak; atau penanda `master-key` bila kunci diturunkan dari master |
| `nonce` | 12 byte | Unik per kunci; pengulangan nonce adalah kegagalan fatal |
| Ciphertext | variabel | AES-256-GCM atas plaintext JSON kanonik |
| `tag` | 16 byte | Verifikasi sebelum plaintext diparse |
| Plaintext | JSON JCS | `{workspace, hostDb, appDbs, manifests, checksums, createdAt, formatVersion}` |

`hostDb` memuat tabel host per nama kanonik; `appDbs` memuat database app dalam base64; `checksums` memuat SHA-256 per section. Restore membaca header dan KDF, mendekripsi, memverifikasi checksum dan jumlah record per section, lalu meminta konfirmasi sebelum menulis. Retensi dan revokasi perangkat mengikuti `sync_peers` serta kebijakan pengguna; pencabutan perangkat tidak menghapus backup yang sudah diekspor.

## 5. Error dan Recovery

| Kode | Kondisi | Recovery |
|---|---|---|
| E-SYNC-001 | Handshake gagal karena versi | Tampilkan versi yang didukung, minta update, jangan menurunkan format |
| E-SYNC-002 | Batch ditolak (idempotency/cursor) | Kirim ulang dari cursor terakhir, verifikasi tidak ada duplikasi |
| E-SYNC-003 | Konflik tidak dapat digabung otomatis | Simpan di `conflict_history`, tampilkan UI review |
| E-SYNC-004 | Restore gagal verifikasi | Batalkan restore, pertahankan data lokal, tampilkan bagian yang gagal |
| E-SYNC-005 | Perangkat dicabut saat sesi aktif | Hentikan sesi, hapus kunci sesi, minta pairing ulang |
| E-CRYPTO-001 | Envelope rusak atau tag tidak cocok | Tolak payload, jangan simpan, catat audit |
| E-CRYPTO-002 | Key ID tidak dikenal | Minta kunci yang benar, jangan coba tebak |
| E-CRYPTO-003 | Nonce reuse terdeteksi | Hentikan enkripsi, laporkan sebagai insiden kritis |
| E-CRYPTO-004 | Kunci tidak dapat didekripsi (frasa salah) | Tolak, batasi percobaan, tawarkan pemulihan |
| E-CRYPTO-005 | Signature manifest/backup tidak valid | Tolak artefak, jangan restore |
| E-NET-001 | Peer tidak ditemukan di LAN | Fallback ke transport berikutnya, catat alasan |
| E-NET-002 | TLS pinning gagal | Batalkan koneksi, jangan turunkan ke plaintext |
| E-NET-003 | Server tidak terjangkau | Antre dan backoff, tampilkan status offline |
| E-NET-004 | BYOS menolak kredensial | Minta ulang kredensial dari Vault, jangan simpan di config |
| E-NET-005 | Kuota/rate limit terlampaui | Backoff, kecilkan batch, catat audit |
| E-AUTH-005 | Kunci perangkat tidak cocok dengan sertifikat | Tolak sesi, minta pairing ulang |

## 6. Keamanan dan Privasi

- Server hanya melihat ciphertext, ukuran, dan waktu; tidak ada indeks isi.
- Kunci sesi perangkat dirotasi saat pairing dan dicabut saat revoke.
- Pairing memakai SAS untuk mencegah MITM; QR saja tidak cukup.
- Backup tidak pernah memuat private key plaintext; Recovery Phrase disimpan terpisah oleh pengguna.
- Log sync tidak memuat payload, hanya metadata dan hash.

## 7. Acceptance Criteria

- **Given** dua perangkat offline mengedit kolom berbeda **When** bertemu di LAN **Then** keduanya bergabung < 100 ms per mutasi tanpa konflik.
- **Given** LAN gagal **When** sync berjalan **Then** fallback ke self-host ≤ 5 detik dan audit mencatat.
- **Given** batch 600 mutation **When** dikirim **Then** dipecah menjadi batch ≤ 500 tanpa duplikasi.
- **Given** snapshot diubah satu byte **When** restore **Then** verifikasi gagal dan data lokal tidak berubah.
- **Given** perangkat dicabut **When** mencoba sync **Then** sesi ditolak dan kunci sesi dihapus.
- **Given** `.mapp-backup` dengan jumlah record tidak cocok **When** restore **Then** restore dibatalkan sebelum menulis dan data lokal utuh.
- **Given** passphrase salah **When** membuka `.mapp-backup` **Then** dekripsi gagal dengan kegagalan generik dan rate limit percobaan.

## 8. Verifikasi

| Bukti | Perintah/Prosedur |
|---|---|
| Convergence | Property test dua site, urutan acak, 10.000 mutasi |
| Transport | Test LAN, WebRTC, server, BYOS dengan jaringan disimulasikan |
| Batch | Test batas 500/8 MiB dan resumability |
| Restore | Test snapshot valid, rusak, versi lama, dan jumlah record tidak cocok |
| Format backup | Golden fixture `.mapp-backup` dibuka host web, Flutter, dan server; uji tamper header/KDF/nonce/tag |
| Crypto | Test vector envelope dan deteksi nonce reuse |

## 9. Referensi

- [03-specs/04-data-automation.md](04-data-automation.md), [03-specs/error-codes.md](error-codes.md)
- [01-architecture/sync-crdt.md](../01-architecture/sync-crdt.md), [04-flows/06-p2p-sync.md](../04-flows/06-p2p-sync.md), [04-flows/07-backup-recovery.md](../04-flows/07-backup-recovery.md)
