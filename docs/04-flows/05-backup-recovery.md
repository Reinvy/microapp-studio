---
id: FLOW-05
title: Backup dan Recovery
status: accepted
owner: data
prd_refs: ["§5 F6", "§8 Data dan Privasi"]
---

# Backup dan Recovery

## 1. Tujuan

Menetapkan alur membuat backup terenkripsi, mengamankan identitas, dan memulihkan data tanpa cloud. Backup adalah satu-satunya cara memindahkan seluruh workspace antar perangkat.

Requirement utama: `FR-BACKUP-001`.

## 2. Aktor dan Prasyarat

Aktor: pengguna yang akan mengganti perangkat atau ingin mengamankan data. Prasyarat: host DB dapat dibuka. Passphrase minimal 12 karakter.

## Alur Utama

1. Pengguna membuka Settings → Data → **Buat backup**.
2. Jika recovery phrase belum ada, satu sheet menawarkan **Buat frasa sekarang** atau **Lewati** dengan peringatan bahwa restore lintas perangkat tidak dijamin.
3. Pengguna memilih passphrase dan mengonfirmasinya.
4. Host mengumpulkan snapshot konsisten, menurunkan kunci dengan Argon2id, dan mengenkripsi setiap section dengan AES-256-GCM.
5. File `.mapp-backup` dibuat dengan header `MAPPBK01`, checksum per section, dan checksum file.
6. File diunduh; checksum ditampilkan.
7. Untuk restore, pengguna membuka Settings → Data → **Restore**, memilih file, dan memasukkan passphrase.
8. Host memverifikasi header, checksum, dan autentikasi sebelum menampilkan preview isi.
9. Preview menampilkan workspace, jumlah app, dan jumlah record.
10. Pengguna memilih **Gabung** atau **Ganti** dan mengonfirmasi.
11. Restore dijalankan dalam transaksi; ringkasan hasil ditampilkan.

Pengingat backup muncul setiap 7 hari dan dapat ditutup.

## Cabang Gagal

| Kondisi | Perilaku |
|---|---|
| Passphrase salah | `E-BACKUP-001`, minta ulang tanpa detail kripto. |
| File atau checksum rusak | `E-BACKUP-002`, tolak sebelum apply. |
| Ruang tidak cukup | `E-DATA-002`, tawarkan bersihkan cache. |
| Restore terputus | Transaksi rollback; data lama utuh. |
| Frasa pemulihan dilewati | Peringatan ditampilkan; backup tetap dibuat. |
| Pengguna menutup sheet | Tidak ada backup dibuat; tidak ada perubahan data. |

## Acceptance Criteria

1. File backup tidak memuat plaintext dan hanya dapat dibuka dengan passphrase benar.
2. Checksum per section diverifikasi sebelum apply.
3. Mode Gabung dan Ganti berperilaku sesuai label dan tidak menimpa tanpa konfirmasi.
4. Tidak ada request jaringan selama backup maupun restore.
5. Pengingat 7 hari dapat ditutup dan kembali setelah 7 hari.

## Verifikasi

| Pemeriksaan | Cara |
|---|---|
| Round-trip | Vitest: backup lalu restore ke DB kosong, bandingkan jumlah record. |
| Passphrase | Vitest: salah passphrase → `E-BACKUP-001`. |
| Checksum | Vitest: rusak satu section → `E-BACKUP-002`. |
| Merge/replace | Vitest: dua mode, cek hasil. |
| Offline | Playwright: block network, backup dan restore tetap jalan. |
| Pengingat | Vitest: fake waktu, banner muncul dan dismiss tersimpan. |

## 7. Referensi

- [06-backup.md](../03-specs/06-backup.md)
- [07-settings.md](../03-specs/07-settings.md)
- [ADR-0022](../01-architecture/adr/0022-deferred-recovery-onboarding.md)
