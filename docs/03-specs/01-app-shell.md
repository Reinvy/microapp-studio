---
id: SPEC-SHELL
title: App Shell
status: accepted
owner: product
prd_refs: ["§4 User Journey", "§5 F1"]
---

# App Shell

## 1. Tujuan

Menetapkan kontrak shell web: boot PWA, identitas lokal otomatis, Home/Library, pencarian, workspace, indikator offline, dan permukaan error. Shell adalah satu-satunya jalan masuk ke seluruh produk dan MUST bisa dipakai tanpa akun, tanpa jaringan, dan tanpa konfigurasi awal.

## 2. Ruang Lingkup

Di dalam: route `/`, boot sequence, library, search, workspace, install entry, offline state, launcher state, error surface, aksesibilitas, locale. Di luar: builder ([02-studio.md](02-studio.md)), runtime ([03-sandbox-runtime.md](03-sandbox-runtime.md)), package ([05-packages.md](05-packages.md)), settings ([07-settings.md](07-settings.md)).

## 3. Requirement

| ID | Level | Requirement | Acceptance |
|---|---|---|---|
| FR-SHELL-001 | MUST | Shell merender skeleton non-blocking dan menggantinya dengan konten tanpa layout shift besar. | First paint < 1 s pada perangkat referensi; CLS < 0.1; tidak ada spinner penuh layar. |
| FR-SHELL-002 | MUST | Local identity dibuat otomatis pada first load tanpa modal, tanpa form, dan tanpa mnemonic. | `local_identity` ada setelah load; tidak ada dialog identitas; FLOW-01 selesai tanpa jaringan. |
| FR-SHELL-003 | MUST | Home tampil penuh tanpa jaringan dan tanpa akun. | Airplane mode: Home, library, search, dan app terpasang tetap terbuka. |
| FR-SHELL-004 | MUST | Library menyediakan tampilan grid dan list dengan ikon, nama, versi, dan status app. | Setiap kartu menampilkan empat field; toggle tampilan tersimpan. |
| FR-SHELL-005 | MUST | Pencarian lokal FTS5 mencakup app, project, dan record dalam satu query. | Query satu kata mengembalikan hasil dari ketiga jenis; hasil dikelompokkan. |
| FR-SHELL-006 | MUST | Filter dan sort menyediakan terbaru, nama, tipe, dan favorit. | Setiap opsi mengubah urutan/himpunan; pilihan bertahan setelah reload. |
| FR-SHELL-007 | MUST | Empty state menawarkan tiga jalur create: Template, Magic Create, Mulai kosong. | Ketiga aksi terlihat tanpa scroll pada viewport 360x640 dan menuju FLOW-02. |
| FR-SHELL-008 | MUST | Entry impor/install `.mapp` tersedia dari Home dan Packages. | Kedua entry membuka layar verifikasi yang sama; drag-drop diterima di Packages. |
| FR-SHELL-009 | MUST | Membuka app menjalankan route `/app/[appId]` di sandbox. | Navigasi memuat runner; app tampil tanpa reload penuh shell. |
| FR-SHELL-010 | MUST | Context menu app menyediakan buka, rename, duplikat, ekspor, uninstall. | Setiap aksi berfungsi; uninstall meminta konfirmasi dan menawarkan ekspor data. |
| FR-SHELL-011 | MUST | Indikator offline global menunjukkan status jaringan dan status cache shell. | Badge muncul < 2 s setelah koneksi hilang; tooltip menjelaskan mode offline. |
| FR-SHELL-012 | MUST | Badge penyimpanan menampilkan estimasi pemakaian dan peringatan kuota. | Angka berasal dari `navigator.storage.estimate()`; peringatan muncul > 80%. |
| FR-SHELL-013 | MUST | Shell menawarkan prompt update saat versi package lebih baru terdeteksi dari index statis. | Prompt memuat versi lama/baru dan tombol Tinjau; tidak memasang otomatis. |
| FR-SHELL-014 | MUST | App dapat di-pin atau difavoritkan dan tampil lebih dulu di Home. | Pin tersimpan lokal; urutan berubah setelah reload. |
| FR-SHELL-015 | MUST | Workspace default tunggal dibuat otomatis; create/switch hanya muncul setelah pengguna menambah workspace. | Workspace switcher tidak tampil pada instalasi baru. |
| FR-SHELL-016 | MUST | Launcher memulihkan app terakhir, posisi scroll, dan filter setelah reload. | Reload mengembalikan state yang sama dalam < 1 s. |
| FR-SHELL-017 | MUST | Error surface menampilkan kode, ringkasan aman, langkah pemulihan, dan retry. | Kode mengikuti [error-codes.md](error-codes.md); tidak ada stack trace mentah. |
| FR-SHELL-018 | MUST | Seluruh alur shell dapat diselesaikan dengan keyboard saja. | Tab/Shift+Tab, Enter, Space, Esc mencapai semua aksi; urutan fokus logis. |
| FR-SHELL-019 | MUST | Shell memberi label/role yang benar dan live region untuk perubahan status. | axe tanpa pelanggaran serius; pencarian dan status simpan diumumkan. |
| FR-SHELL-020 | MUST | Shell mendukung locale `id-ID` dan `en-US` serta layout RTL. | String berubah tanpa reload; `dir=rtl` tidak memotong layout. |

## 4. Perilaku Boot

Urutan boot yang mengikat:

1. Service worker menyajikan shell dari cache.
2. Worker database membuka host DB di OPFS.
3. Identity worker memuat `local_identity`; jika kosong, membuat pasangan kunci baru.
4. Shell merender Home dari cache lokal, lalu memvalidasi schema.
5. Jika langkah 2 atau 3 gagal, shell tetap tampil dalam mode `ephemeral` dengan badge dan aksi ekspor.

Kegagalan boot tidak boleh berupa layar error penuh. Kode `E-SHELL-001` dipakai untuk database tidak dapat dibuka, `E-SHELL-002` untuk identity gagal dibuat, dan `E-SHELL-003` untuk service worker gagal memasang cache shell. Ketiganya mempertahankan Home dalam mode terbatas dan menawarkan retry.

Kegagalan identitas yang lebih spesifik memakai `E-AUTH-001` (private key tidak dapat dibuka) atau `E-AUTH-002` (recovery phrase tidak cocok). Keduanya tidak boleh memblokir Home; pengguna dapat memakai mode `ephemeral`, membuat identitas baru, atau mencoba frasa lagi.

## 5. Pencarian dan Workspace

Pencarian memakai indeks FTS5 host dengan kolom `kind`, `title`, `snippet`, `ref`. Query kosong menampilkan riwayat terakhir, bukan seluruh isi database. Workspace kedua hanya dibuat lewat Settings dan tidak pernah diminta saat onboarding. Isolasi query lintas workspace adalah tanggung jawab lapisan data ([04-data.md](04-data.md)).

## 6. Ketergantungan

- [identity-crypto.md](../01-architecture/identity-crypto.md) untuk pembuatan kunci.
- [04-data.md](04-data.md) untuk host DB, FTS5, dan storage pins.
- [07-settings.md](07-settings.md) untuk locale dan tema.
- [UI protocol](ui-protocol.md) untuk render konten library bila memakai komponen MUIP.

## 7. Acceptance Criteria

1. Fresh profile, offline: `/` menampilkan Home dengan empty state tiga jalur dalam < 1 s setelah shell cache tersedia.
2. Tidak ada request jaringan dan tidak ada dialog identitas pada FLOW-01.
3. Library, search, filter, pin, dan context menu berfungsi setelah reload.
4. Mode `ephemeral` dapat diekspor dan di-retry tanpa kehilangan data lain.
5. Keyboard-only dan axe bersih untuk Home, search, dan context menu.

## 8. Verifikasi

| Pemeriksaan | Cara |
|---|---|
| Boot dan offline | Playwright: block network, reload, pastikan Home dan empty state tampil. |
| Identitas otomatis | Vitest: `ensureLocalIdentity()` dipanggil sekali, tidak membuka modal. |
| FTS5 | Vitest: seed app/project/record, query tunggal mengembalikan tiga kind. |
| Launcher state | Playwright: ubah filter, reload, nilai sama. |
| Aksesibilitas | axe pada `/` untuk light, dark, high-contrast, dan RTL. |
| Error surface | Vitest: paksa DB gagal, pastikan `E-SHELL-001` tampil dengan retry. |
