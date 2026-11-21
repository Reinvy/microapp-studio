---
id: SPEC-SET
title: Settings
status: accepted
owner: design
prd_refs: ["§5 F8", "§6 UX dan Design"]
---

# Settings

## 1. Tujuan

Menetapkan kontrak Settings: tema clay, locale, storage, BYOK, recovery phrase, permissions, about, reset, impor/ekspor settings, dan toggle DevTools. Settings adalah satu-satunya tempat perubahan preferensi global dan tidak boleh memblokir alur utama.

## 2. Ruang Lingkup

Di dalam: route `/settings/*`, preferensi tema/locale, storage, AI key, recovery, permissions, reset, settings portability. Di luar: backup ([06-backup.md](06-backup.md)), package ([05-packages.md](05-packages.md)), DevTools ([08-devtools.md](08-devtools.md)).

## 3. Requirement

| ID | Level | Requirement | Acceptance |
|---|---|---|---|
| FR-SET-001 | MUST | Tema mendukung light, dark, dan high-contrast dengan komponen clay. | Ketiga tema memakai token yang sama; tidak ada warna hardcoded. |
| FR-SET-002 | MUST | Locale mendukung `id-ID` dan `en-US`, termasuk RTL untuk konten yang meminta. | Perubahan locale langsung terlihat; layout RTL tidak terpotong. |
| FR-SET-003 | MUST | Storage menampilkan pemakaian dan aksi bersihkan cache yang aman. | Angka nyata; bersihkan cache tidak menghapus data app. |
| FR-SET-004 | MUST | BYOK disimpan di vault lokal dan tidak pernah ditampilkan kembali penuh. | Setelah simpan, hanya empat karakter terakhir terlihat. |
| FR-SET-005 | MUST | Recovery phrase dapat dibuat dan dikonfirmasi lewat Settings. | Konfirmasi tiga kata; frasa tidak muncul di log. |
| FR-SET-006 | MUST | Daftar permission per app dapat dilihat dan dicabut. | Revoke langsung berlaku pada panggilan berikutnya. |
| FR-SET-007 | MUST | About menampilkan versi, commit, lisensi, dan tautan kebijakan. | Versi berasal dari build, bukan hardcoded manual. |
| FR-SET-008 | MUST | Reset data lokal meminta konfirmasi eksplisit dan menawarkan ekspor. | Reset tidak dapat dijalankan tanpa mengetik konfirmasi. |
| FR-SET-009 | MUST | Settings dapat diekspor dan diimpor sebagai JSON tervalidasi. | Ekspor tidak memuat secret; impor menolak field tidak dikenal. |
| FR-SET-010 | MUST | Toggle DevTools lokal mengaktifkan panel diagnostik tanpa telemetry. | Toggle hanya mengubah preferensi lokal. |

Error yang mengikat: `E-SET-001` untuk nilai settings invalid, `E-SET-002` untuk kegagalan simpan preferensi.

## 4. Peta Route

| Route | Isi |
|---|---|
| `/settings` | Ringkasan dan navigasi ke subbagian. |
| `/settings/general` | Tema, locale, ukuran teks, reduced motion. |
| `/settings/permissions` | Daftar app dan grant, revoke. |
| `/settings/ai` | BYOK, model, status koneksi opsional. |
| `/settings/data` | Storage, backup, restore, reset. |
| `/settings/about` | Versi, lisensi, kebijakan. |
| `/settings/dev` | DevTools lokal. |

Route lama `/settings/{vault,sync,backup,notifications,storage}` MUST dialihkan ke route di atas tanpa kehilangan deep link yang masih dipakai.

## 5. Aturan Preferensi

1. Preferensi disimpan di host DB dan dicerminkan ke `localStorage` hanya untuk boot cepat.
2. Nilai yang tidak dikenal diabaikan, bukan diteruskan ke CSS.
3. Tema tinggi kontras tidak boleh menurunkan kontras teks.
4. Reset menghapus host DB, cache, dan preferensi, tetapi tidak menghapus file backup yang sudah diunduh.
5. Impor settings melakukan validasi penuh sebelum menulis dan menampilkan diff ringkas.

## 6. Kasus Tepi

1. Tema dan locale berubah tanpa reload dan bertahan.
2. BYOK tidak pernah ditampilkan penuh setelah disimpan.
3. Revoke permission berlaku pada panggilan berikutnya.
4. Reset membutuhkan konfirmasi dan menawarkan ekspor.
5. Impor settings invalid ditolak dengan `E-SET-001` tanpa perubahan.

## 7. Acceptance Criteria

1. Ketiga tema lolos axe dan tidak memakai hex di komponen.
2. Locale `en-US` dan `id-ID` lengkap untuk seluruh string Settings.
3. Tidak ada request jaringan yang berasal dari halaman Settings kecuali aksi pengguna.

## 8. Verifikasi

| Pemeriksaan | Cara |
|---|---|
| Tema | Playwright: ganti tema, cek computed token dan axe. |
| BYOK | Vitest: simpan key, baca ulang, pastikan masked. |
| Revoke | Vitest: grant, revoke, panggilan bridge gagal. |
| Reset | Playwright: dialog konfirmasi, ekspor tersedia. |
| Impor settings | Vitest: JSON invalid menghasilkan `E-SET-001`. |
| i18n | Vitest: kamus `id-ID` dan `en-US` memiliki kunci sama. |
