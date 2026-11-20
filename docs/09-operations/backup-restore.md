---
id: OPS-BACKUP
title: Backup dan Restore
status: accepted
owner: ops
prd_refs: ["§3 Modul 6"]
---

# Backup dan Restore

## 1. Tujuan dan Ruang Lingkup

Dokumen ini menetapkan prosedur backup, retensi, enkripsi, restore, dan uji restore untuk data lokal pengguna, server self-host, dan penyimpanan BYOS. Target: tidak ada kehilangan data yang dapat dicegah, dan setiap backup dapat dipulihkan pada instance bersih.

Kontrak sync, snapshot, dan portabilitas ada di [03-specs/06-sync-backup.md](../03-specs/06-sync-backup.md); kontrak server ada di [03-specs/07-selfhost.md](../03-specs/07-selfhost.md); hierarki kunci ada di [01-architecture/identity-crypto.md](../01-architecture/identity-crypto.md). Runbook server ada di [selfhost-runbook.md](selfhost-runbook.md).

## 2. Aset yang Dicadangkan

| Aset | Lokasi | Isi | Kunci |
|---|---|---|---|
| Database lokal | Perangkat | SQLite/OPFS per workspace dan per app | SQLCipher native; field-level AES-256-GCM di web |
| Vault | Perangkat | Kredensial, token BYOK, item sensitif | Vault key dari master key |
| Manifest dan `.mapp` terpasang | Perangkat | Metadata app, versi, signature | Publik; signature diverifikasi |
| Encrypted Snapshot Archive | Perangkat/BYOS | Database, manifest, metadata, checksum per bagian | Backup key atau passphrase |
| Database server | Server | `server_users`, sesi, RBAC, registry index, audit | Enkripsi backup operator |
| Object storage server | Server | Blob registry, lampiran | Enkripsi backup operator |
| Konfigurasi server | Server | `microapp.yaml`, `branding.yaml` non-rahasia | Rahasia di secret manager terpisah |
| Audit server | Server | Rantai hash event sensitif | Ikut backup database |

Data pengguna yang disinkronkan **MUST** tetap berupa ciphertext bagi server; backup server tidak boleh menjadi jalur untuk membaca plaintext.

## 3. RPO dan RTO

| Profil | RPO default | RTO default | Mekanisme minimum |
|---|---|---|---|
| Perangkat pengguna | ≤ 1 jam | ≤ 15 menit | Snapshot otomatis pra-migrasi + snapshot harian + sync |
| Lite | ≤ 24 jam | ≤ 30 menit | Dump SQLite konsisten + salinan blob + konfigurasi, harian |
| Standard | ≤ 15 menit | ≤ 60 menit | `pg_dump` harian + arsip WAL untuk PITR + object storage |
| Cluster | ≤ 5 menit | ≤ 30 menit | PostgreSQL HA + PITR + replikasi object storage |
| BYOS | Mengikuti interval sync | ≤ 60 menit | Snapshot terenkripsi ke WebDAV/S3/Git |

Angka di atas adalah default operasional. Perubahan target RPO/RTO untuk kebutuhan organisasi **MUST** dicatat pada konfigurasi operator dan diuji dengan skenario restore.

## 4. Jenis Backup dan Format

| Jenis | Cakupan | Format | Dapat dipulihkan tanpa produk |
|---|---|---|---|
| Snapshot terenkripsi | Database, manifest, metadata | Encrypted Snapshot Archive, AES-256-GCM, checksum per bagian (`FR-SYNC-021`) | Tidak; memerlukan backup key |
| Ekspor SQLite | Satu app atau workspace | `.db` yang dapat dibuka alat SQLite standar (`FR-SYNC-019`) | Ya |
| Ekspor data | Per app atau seluruh workspace | JSONL, CSV, Markdown, UTF-8 (`FR-SYNC-020`) | Ya |
| Backup server | Database, object storage, konfigurasi, audit | Dump native + arsip objek + manifest checksum (`FR-SRV-023`) | Ya untuk database; blob registry dapat dibaca sebagai berkas |
| Backup BYOS | Snapshot terenkripsi | Objek terenkripsi di WebDAV/S3/Git | Tidak; memerlukan kunci |

Ekspor portabel **MUST** tetap tersedia agar pengguna tidak terkunci pada produk. Format ekspor dan snapshot **MUST** stabil; perubahan format **MUST** menaikkan versi dan mempertahankan pembaca versi lama minimal 12 bulan (`FR-SYNC-025`).

## 5. Enkripsi dan Kunci

- Snapshot lokal **MUST** dienkripsi AES-256-GCM dengan backup key yang diturunkan dari master key via HKDF label `microapp/v1/backup`, atau dengan passphrase yang diturunkan melalui hierarki yang sama.
- Backup key **MUST NOT** disimpan permanen; kunci diturunkan saat ekspor dan di-zeroize setelahnya.
- Server **MUST NOT** menyimpan kunci dekripsi data pengguna. Backup server dienkripsi dengan kunci operator (KMS atau kunci offline) di luar database.
- Setiap bagian snapshot **MUST** memiliki checksum SHA-256; verifikasi dilakukan sebelum menerapkan data.
- Recovery Phrase 24 kata atau passkey PRF **MUST** cukup untuk menurunkan kembali kunci pada perangkat baru.
- Frasa dan passphrase **MUST NOT** ditulis di tiket, chat, commit, atau dokumen; hanya di media offline pengguna.

Envelope backup mengikuti format `version(1) | key_id(16) | nonce(12) | ciphertext | tag(16)` dengan AAD header kanonik. Nonce **MUST** unik per (key, plaintext); nonce reuse adalah insiden kritis (`E-CRYPTO-003`).

## 6. Backup Lokal dan Perangkat

1. Host **MUST** membuat snapshot sebelum setiap migrasi skema; snapshot disimpan sampai migrasi dinyatakan sukses.
2. Snapshot harian **SHOULD** dibuat saat perangkat idle dan tersambung ke daya.
3. Pengguna **MUST** dapat memicu ekspor manual kapan saja dari Storage Manager.
4. Lokasi snapshot **MUST** berada di luar direktori database aktif dan tidak ikut terhapus saat cache dibersihkan.
5. Bila ruang penyimpanan menipis, Host **MUST** memangkas cache yang dapat diunduh ulang, bukan database pengguna.
6. Ekspor manual **MUST** menampilkan estimasi ukuran, tujuan, dan status enkripsi sebelum dimulai.

## 7. Backup Server

### 7.1 Lite

```bash
# 1. Dump SQLite konsisten tanpa menghentikan layanan
sqlite3 /var/lib/microapp/microapp.db \
  ".backup '/backup/microapp-$(date -u +%Y%m%dT%H%M%SZ).db'"

# 2. Verifikasi integritas dump
sqlite3 /backup/microapp-*.db "PRAGMA integrity_check;"

# 3. Arsipkan blob dan konfigurasi non-rahasia
tar --sort=name -czf /backup/blobs-$(date -u +%Y%m%d).tar.gz \
  -C /var/lib/microapp blobs
tar --sort=name -czf /backup/config-$(date -u +%Y%m%d).tar.gz \
  -C /etc/microapp microapp.yaml branding.yaml

# 4. Checksum dan enkripsi
sha256sum /backup/microapp-*.db /backup/*.tar.gz > /backup/SHA256SUMS
```

Enkripsi arsip **MUST** dilakukan sebelum berkas meninggalkan host. Gunakan kunci backup operator (AES-256-GCM) melalui KMS atau kunci offline; kunci **MUST NOT** disimpan di mesin yang sama dengan backup.

### 7.2 Standard dan Cluster

```bash
# Dump logis
pg_dump -Fc -f /backup/microapp-$(date -u +%Y%m%d).dump "$DATABASE_URL"

# Verifikasi dapat dibaca
pg_restore --list /backup/microapp-$(date -u +%Y%m%d).dump | head

# Object storage
mc mirror --overwrite minio/microapp-blobs /backup/blobs

# Konfigurasi non-rahasia
tar --sort=name -czf /backup/config-$(date -u +%Y%m%d).tar.gz \
  -C /etc/microapp microapp.yaml branding.yaml

sha256sum /backup/* > /backup/SHA256SUMS
```

Untuk PITR, aktifkan arsip WAL dan simpan ke lokasi terpisah. Restore PITR **MUST** diuji dengan `recovery_target_time` pada instance latihan sebelum dipakai pada insiden nyata.

Aturan backup server:

- Backup **MUST** mencakup database, object storage, konfigurasi non-rahasia, dan audit (`FR-SRV-023`).
- Backup **MUST** dibuat sebelum upgrade yang menjalankan migrasi.
- Checksum **MUST** diverifikasi saat backup dibuat dan saat restore.
- Salinan **SHOULD** disimpan pada media yang tidak dapat ditulis dari server (object lock atau offline).
- Retensi minimum: 7 harian, 4 mingguan, 12 bulanan untuk Lite/Standard; Cluster mengikuti kebijakan organisasi.

## 8. Backup ke BYOS

| Penyedia | Cara | Catatan |
|---|---|---|
| WebDAV (Nextcloud) | Unggah snapshot terenkripsi | Kredensial dari Vault, bukan config |
| S3/MinIO | Unggah objek terenkripsi | Bucket privat, versioning, object lock bila tersedia |
| Git repo privat | Commit snapshot terenkripsi | Riwayat commit menjadi versi; jangan commit kunci |
| Folder Syncthing | Salin snapshot terenkripsi | Sinkronisasi berkas; konflik nama harus dihindari |

Aturan:

- BYOS **MUST** menerima ciphertext; tidak ada plaintext, nama tabel, atau metadata sensitif di nama berkas.
- Kredensial BYOS **MUST** disimpan di Vault dan tidak ditulis ke konfigurasi atau log.
- Kegagalan autentikasi BYOS memicu `E-NET-004`; pengguna diminta memperbarui kredensial.
- Snapshot **MUST** diverifikasi checksum setelah diunduh sebelum restore.

## 9. Restore Data Pengguna

Alur restore pada perangkat baru:

1. Pengguna memasukkan Recovery Phrase 24 kata atau memakai passkey PRF.
2. Host menurunkan master key dan subkey; tidak ada kunci yang dikirim ke server.
3. Host memilih sumber: peer, server self-host, atau BYOS.
4. Setiap bagian snapshot diverifikasi checksum dan signature manifest sebelum diterapkan (`FR-SYNC-022`).
5. Host memverifikasi jumlah record dan hash per tabel, lalu menampilkan ringkasan (`FR-SYNC-023`).
6. Data lokal yang lebih baru **MUST NOT** dihapus tanpa konfirmasi; konflik disimpan sebagai salinan atau digabung (`FR-SYNC-024`).

| Kegagalan | Kode | Tindakan |
|---|---|---|
| Frasa salah | `E-CRYPTO-004` | Batasi percobaan, tawarkan bantuan; jangan menghapus data lokal |
| Frasa tidak valid | `E-AUTH-002` | Batasi percobaan, verifikasi urutan kata |
| Checksum/signature gagal | `E-SYNC-004` atau `E-CRYPTO-005` | Batalkan restore, pertahankan data lokal, tampilkan bagian yang gagal |
| Kunci perangkat tidak cocok | `E-AUTH-005` | Tolak sesi, minta pairing ulang |

## 10. Restore Server

```bash
# 1. Siapkan instance baru dengan versi binary yang sama atau lebih baru
# 2. Hentikan penulisan sebelum menimpa data
systemctl stop microapp                 # Lite
docker compose stop core                # Standard, dari deploy/docker

# 3. Verifikasi checksum backup
cd /backup && sha256sum -c SHA256SUMS

# 4. Restore database
pg_restore --clean --if-exists -d "$DATABASE_URL" /backup/microapp.dump
# atau untuk Lite:
install -m 0640 /backup/microapp-*.db /var/lib/microapp/microapp.db

# 5. Restore blob dan konfigurasi
tar -xzf /backup/blobs.tar.gz -C /var/lib/microapp
mc mirror --overwrite /backup/blobs minio/microapp-blobs
tar -xzf /backup/config.tar.gz -C /etc/microapp

# 6. Mulai dan verifikasi
systemctl start microapp
curl -fsS https://microapp.example.org:8443/readyz
```

Aturan restore server:

- Binary **MUST NOT** lebih lama dari skema database; downgrade ditolak.
- Migrasi **MUST** berjalan setelah restore bila versi binary lebih baru; kegagalan memicu rollback (`E-SRV-001`).
- Rantai audit **MUST** diverifikasi setelah restore; kegagalan memicu `E-SRV-005` dan SEV-1.
- Sesi pengguna **SHOULD** dicabut setelah restore bencana dan pengguna diminta login ulang.
- Restore **MUST** diuji pada instance terpisah sebelum diterapkan pada instance produksi bila waktu memungkinkan.

## 11. Uji Restore

| Profil | Frekuensi minimum | Lingkup |
|---|---|---|
| Perangkat | Setiap rilis Host | Restore snapshot ke perangkat bersih dengan frasa uji |
| Lite | Kuartalan | Restore ke VPS 512 MB baru; ukur RTO |
| Standard | Bulanan | Restore database + blob ke stack bersih |
| Cluster | Bulanan | PITR ke namespace latihan; verifikasi failover |
| BYOS | Kuartalan | Unduh snapshot, verifikasi checksum, restore |

Kriteria lulus uji restore:

1. Checksum dan signature valid.
2. Jumlah record dan hash per tabel cocok.
3. Audit chain valid dan tidak ada entri hilang.
4. Login IdP dan RBAC berfungsi pada instance hasil restore.
5. Sync batch uji diterima dan ciphertext tetap tidak terbaca server.
6. RTO terukur berada di bawah target profil.

Hasil uji **MUST** dicatat: versi, profil, waktu mulai/selesai, RTO, masalah, dan tindakan. Uji yang gagal **MUST** menjadi blocker rilis.

## 12. Skenario Kehilangan

| Skenario | Dampak | Pemulihan |
|---|---|---|
| Perangkat hilang | Kunci perangkat hilang; ciphertext tetap ada di peer/server | Cabut perangkat, restore dengan frasa di perangkat baru |
| Server hilang | Sync hub dan registry internal tidak tersedia | Restore backup server; bila tidak ada, perangkat tetap memegang data dan dapat sync ulang |
| Server dan satu perangkat hilang | Sumber sync berkurang | Restore frasa di perangkat baru, ambil dari peer atau BYOS |
| Frasa hilang, perangkat hilang | Data terenkripsi tidak dapat didekripsi | Tidak ada pemulihan kriptografis; komunikasikan batas ini sebelum insiden |
| Ransomware pada server | Data server terenkripsi penyerang | Pulihkan dari backup immutable/offline; jangan bayar; buka SEV-1 |
| Backup korup | Restore gagal verifikasi | Gunakan salinan sebelumnya; uji checksum seluruh retensi |

Tim operasi **MUST** menyatakan batas pemulihan frasa kepada pengguna sejak first run; tidak boleh menjanjikan pemulihan data tanpa frasa atau passkey.

## 13. Larangan

- Backup **MUST NOT** disimpan hanya pada perangkat yang sama dengan data asli.
- Backup **MUST NOT** memuat kunci privat, frasa, atau token dalam bentuk apa pun.
- Server **MUST NOT** menghapus data pengguna karena kuota, retensi otomatis, atau kegagalan backup.
- Restore **MUST NOT** menimpa data lokal yang lebih baru tanpa konfirmasi.
- Backup **MUST NOT** diuji hanya dengan membaca checksum; restore nyata wajib dilakukan.

## 14. Verifikasi

| Bukti | Prosedur |
|---|---|
| Backup Lite | Dump SQLite, `PRAGMA integrity_check`, checksum, enkripsi |
| Backup Standard | `pg_dump`, PITR, mirror blob, checksum |
| Restore pengguna | Frasa benar memulihkan data; frasa salah ditolak dengan `E-CRYPTO-004` |
| Restore server | Instance baru pulih; record, blob, audit, dan login cocok |
| Data baru tidak hilang | Restore snapshot lama dengan data lokal lebih baru; konfirmasi muncul |
| Uji restore | Catat RTO di bawah target per profil |
| Format portabel | `.db` terbuka di `sqlite3`; JSONL/CSV/Markdown dapat diimpor kembali |
| Audit | Verifikasi rantai setelah restore berhasil |

## 15. Referensi

- [03-specs/06-sync-backup.md](../03-specs/06-sync-backup.md), [03-specs/07-selfhost.md](../03-specs/07-selfhost.md)
- [03-specs/error-codes.md](../03-specs/error-codes.md)
- [01-architecture/identity-crypto.md](../01-architecture/identity-crypto.md), [01-architecture/selfhost.md](../01-architecture/selfhost.md)
- [selfhost-runbook.md](selfhost-runbook.md), [incident-response.md](incident-response.md), [observability.md](observability.md)
