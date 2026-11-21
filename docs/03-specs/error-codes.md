---
id: SPEC-ERROR
title: Kode Error
status: accepted
owner: qa
prd_refs: ["§5 Fitur", "§11 Risiko"]
---

# Kode Error

## 1. Tujuan

Menetapkan 27 kode error kanonik yang dipakai shell, builder, runtime, data, package, backup, identitas, settings, network, dan DevTools. Setiap kode MUST dipakai minimal satu spec atau flow, memiliki pesan aman, dan langkah pemulihan yang dapat dilakukan pengguna.

## 2. Ruang Lingkup

Di dalam: format kode, katalog, pemetaan ke pemulihan, aturan pesan. Di luar: pesan UI lengkap ([content-i18n.md](../02-design/content-i18n.md)), log internal ([08-devtools.md](08-devtools.md)).

## 3. Requirement

Format kode: `E-<DOMAIN>-<NNN>`. Domain tidak boleh ditambah tanpa memperbarui katalog ini dan spec terkait. Kode tidak boleh dipakai untuk dua arti berbeda.

| ID | Domain | Arti | Pemulihan |
|---|---|---|---|
| E-SHELL-001 | Shell | Host database tidak dapat dibuka | Tampilkan mode terbatas, retry, tautan diagnostik |
| E-SHELL-002 | Shell | Local identity gagal dibuat | Mode `ephemeral`, retry, buka Settings |
| E-SHELL-003 | Shell | Service worker gagal memasang cache shell | Jalan tanpa cache, tampilkan badge offline |
| E-CREATE-001 | Create | Prompt kosong atau melebihi batas | Tampilkan batas, fokus textarea |
| E-CREATE-002 | Create | Provider AI belum dikonfigurasi | Tawarkan Atur AI atau template/blank |
| E-CREATE-003 | Create | Generate gagal dan tidak dapat di-retry otomatis | Tampilkan fallback dan coba lagi manual |
| E-STUDIO-001 | Studio | Dokumen draft rusak atau tidak valid | Muat versi terakhir yang valid, tawarkan ekspor |
| E-STUDIO-002 | Studio | Autosave gagal | Pertahankan antrean, banner retry, salinan lokal |
| E-STUDIO-003 | Studio | Operasi drop tidak valid | Tolak drop, toast, kembalikan node |
| E-RUN-001 | Runtime | Watchdog timeout atau loop tak berujung | Hentikan app, tampilkan boundary, muat ulang |
| E-RUN-002 | Runtime | Sandbox tidak tersedia | Fail closed, jelaskan browser tidak didukung |
| E-RUN-003 | Runtime | Pelanggaran bridge atau permission | Tolak panggilan, audit, tawarkan consent bila relevan |
| E-RUN-004 | Runtime | Renderer crash | Boundary, reload app, ekspor data |
| E-PACK-001 | Package | Manifest atau layout `.mapp` tidak valid | Tampilkan field yang salah, tolak impor |
| E-PACK-002 | Package | Signature tidak valid atau key tidak tersedia | Blokir impor, tawarkan Atur identitas |
| E-PACK-003 | Package | Digest atau content hash tidak cocok | Tolak file, sarankan unduh ulang |
| E-PACK-004 | Package | Versi tidak valid atau rollback tidak tersedia | Tampilkan versi tersedia |
| E-DATA-001 | Data | Buka atau migrasi database gagal | Rollback, pulihkan snapshot, retry |
| E-DATA-002 | Data | Kuota penuh atau tulis ditolak | Tawarkan ekspor dan bersihkan cache |
| E-BACKUP-001 | Backup | Passphrase salah atau autentikasi gagal | Minta passphrase lagi, tanpa detail kripto |
| E-BACKUP-002 | Backup | File atau checksum rusak | Tolak restore, sarankan file lain |
| E-AUTH-001 | Auth | Private key tidak dapat dibuka | Mode `ephemeral`, buat identitas baru |
| E-AUTH-002 | Auth | Recovery phrase tidak cocok | Coba lagi, jelaskan tanpa membocorkan kata |
| E-SET-001 | Settings | Nilai settings tidak valid | Kembalikan nilai sebelumnya, tandai field |
| E-SET-002 | Settings | Gagal menyimpan preferensi | Simpan lokal sementara, retry |
| E-NET-001 | Network | Permintaan jaringan diblokir Offline Cage | Jelaskan cage, tawarkan buka Settings |
| E-DEV-001 | DevTools | Data diagnostik gagal dimuat | Tampilkan panel kosong dengan retry |

## 4. Aturan Pesan

1. Pesan memuat kode, ringkasan satu kalimat, dan satu aksi utama.
2. Tidak ada stack trace, path absolut, token, atau detail kripto.
3. Kode tidak boleh dipakai sebagai teks tombol.
4. Pesan mengikuti nada di [content-i18n.md](../02-design/content-i18n.md).
5. Setiap kode memiliki terjemahan `id-ID` dan `en-US`.

## 5. Pemetaan ke Spec dan Flow

| Domain | Spec | Flow |
|---|---|---|
| `E-SHELL`, `E-AUTH` | [01-app-shell.md](01-app-shell.md) | FLOW-01 |
| `E-CREATE`, `E-STUDIO` | [02-studio.md](02-studio.md) | FLOW-02, FLOW-03 |
| `E-RUN` | [03-sandbox-runtime.md](03-sandbox-runtime.md) | FLOW-07 |
| `E-DATA` | [04-data.md](04-data.md) | FLOW-08 |
| `E-PACK` | [05-packages.md](05-packages.md) | FLOW-04 |
| `E-BACKUP` | [06-backup.md](06-backup.md) | FLOW-05 |
| `E-SET` | [07-settings.md](07-settings.md) | FLOW-05 |
| `E-NET` | [permissions.md](permissions.md) | FLOW-06 |
| `E-DEV` | [08-devtools.md](08-devtools.md) | — |

## 6. Konsistensi Katalog

1. Katalog berisi tepat 27 kode dan tidak ada kode ganda.
2. Setiap kode muncul di minimal satu spec atau flow di luar katalog ini.
3. Setiap kode memiliki pesan `id-ID` dan `en-US`.
4. Tidak ada pesan yang memuat stack trace atau secret.

## 7. Acceptance Criteria

1. UI menampilkan kode dan aksi pemulihan untuk setiap error yang diuji.
2. Kode yang tidak dikenal jatuh ke `E-DEV-001` dengan pesan generik.

## 8. Verifikasi

| Pemeriksaan | Cara |
|---|---|
| Kelengkapan | `node scripts/check-docs.mjs --strict` memastikan setiap kode direferensikan. |
| Pesan | Vitest: kamus memuat 27 kode untuk dua locale. |
| Redaksi | Vitest: pesan error tidak memuat path absolut. |
