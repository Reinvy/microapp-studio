---
id: SPEC-BACKUP
title: Backup dan Restore
status: accepted
owner: data
prd_refs: ["§5 F6", "§8 Data dan Privasi"]
---

# Backup dan Restore

## 1. Tujuan

Menetapkan kontrak backup lokal terenkripsi: header `MAPPBK01`, AES-256-GCM dengan Argon2id, checksum per section, passphrase, restore terverifikasi, mode gabung/ganti, pengingat, dan larangan upload cloud.

## 2. Ruang Lingkup

Di dalam: pembuatan `.mapp-backup`, derivasi kunci, enkripsi, checksum, restore, merge/replace, recovery phrase opsional, pengingat. Di luar: sinkronisasi (tidak ada), ekspor data app ([04-data.md](04-data.md)), identitas ([identity-crypto.md](../01-architecture/identity-crypto.md)).

## 3. Requirement

| ID | Level | Requirement | Acceptance |
|---|---|---|---|
| FR-BACKUP-001 | MUST | Backup dibuat sebagai satu file `.mapp-backup` terenkripsi. | File tidak memuat plaintext record; header `MAPPBK01` terverifikasi. |
| FR-BACKUP-002 | MUST | Kunci diturunkan dari passphrase dengan Argon2id dan parameter tercatat. | Parameter (m, t, p, salt) tersimpan di header; passphrase tidak disimpan. |
| FR-BACKUP-003 | MUST | Setiap section memiliki checksum yang diverifikasi saat restore. | Section rusak menggagalkan restore sebelum apply. |
| FR-BACKUP-004 | MUST | Restore memverifikasi header, checksum, dan autentikasi GCM sebelum menulis. | Tidak ada penulisan parsial saat verifikasi gagal. |
| FR-BACKUP-005 | MUST | Restore menawarkan mode Gabung dan Ganti dengan konsekuensi jelas. | Gabung mempertahankan data lokal; Ganti meminta konfirmasi kedua. |
| FR-BACKUP-006 | MUST | Recovery phrase bersifat opsional dan ditunda sampai backup, share, atau pilihan pengguna. | Home tidak pernah diblokir oleh permintaan frasa. |
| FR-BACKUP-007 | MUST | Pengingat backup muncul setiap 7 hari dan dapat ditutup. | Banner muncul setelah 7 hari; dismiss tersimpan 7 hari. |
| FR-BACKUP-008 | MUST | Tidak ada upload otomatis ke cloud atau server. | Tidak ada request jaringan pada pembuatan maupun restore. |

Error yang mengikat: `E-BACKUP-001` untuk passphrase salah atau autentikasi gagal, `E-BACKUP-002` untuk file/checksum rusak.

## 4. Format File

| Bagian | Isi |
|---|---|
| Header | Magic `MAPPBK01`, versi, algoritma, parameter Argon2id, salt, nonce. |
| Section `manifest` | Versi backup, timestamp, daftar section, checksum. |
| Section `identity` | Wrapped private key dan metadata kunci. |
| Section `host` | Workspace, app terpasang, grant, settings, audit ringkas. |
| Section `apps` | Satu section per app berisi schema version dan data. |
| Footer | Checksum gabungan dan penanda akhir. |

Setiap section dienkripsi dengan AES-256-GCM dan AAD yang mengikat nama section. Checksum per section dihitung atas ciphertext sehingga dapat diverifikasi sebelum dekripsi.

## 5. Prosedur

Pembuatan:

1. Kumpulkan snapshot konsisten dari worker database.
2. Turunkan kunci dari passphrase (minimal 12 karakter) dan salt acak.
3. Enkripsi setiap section; hitung checksum.
4. Tulis header, section, footer; hasilkan blob dan tampilkan checksum file.
5. Unduh sebagai `.mapp-backup`.

Restore:

1. Baca header dan validasi magic/versi.
2. Turunkan kunci dari passphrase.
3. Verifikasi checksum per section.
4. Dekripsi dan autentikasi tiap section.
5. Tampilkan preview: workspace, jumlah app, jumlah record.
6. Pilih Gabung atau Ganti; jalankan dalam transaksi.
7. Catat hasil di audit; tampilkan ringkasan.

## 6. Recovery Phrase

Frasa 24 kata hanya dibuat saat pengguna memilih Amankan data, membuka Backup, atau akan mengekspor backup. Konfirmasi tiga kata dipakai sebagai gate. Frasa tidak pernah ditampilkan otomatis di Home dan tidak pernah dikirim keluar perangkat.

## 7. Acceptance Criteria

1. Backup tidak memuat plaintext dan dapat direstore dengan passphrase benar.
2. Passphrase salah menghasilkan `E-BACKUP-001` tanpa membocorkan detail.
3. Satu byte rusak menghasilkan `E-BACKUP-002` sebelum apply.
4. Gabung/Ganti berperilaku sesuai label dan tidak menimpa tanpa konfirmasi.
5. Tidak ada request jaringan selama backup dan restore.

## 8. Verifikasi

| Pemeriksaan | Cara |
|---|---|
| Round-trip | Vitest: buat backup, restore ke DB kosong, bandingkan jumlah record. |
| Passphrase salah | Vitest: harapkan `E-BACKUP-001`, tidak ada perubahan. |
| Checksum | Vitest: rusak satu section, harapkan `E-BACKUP-002`. |
| Merge/replace | Vitest: data lokal berbeda, cek hasil kedua mode. |
| Offline | Playwright: block semua request, backup dan restore tetap jalan. |
| Pengingat | Vitest: fake waktu 7 hari, banner muncul dan dismiss tersimpan. |
