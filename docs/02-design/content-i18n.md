---
id: DESIGN-I18N
title: Konten dan Internasionalisasi
status: accepted
owner: design
prd_refs: ["§4", "§6"]
---

# Konten dan Internasionalisasi

## 1. Tujuan dan Ruang Lingkup

Dokumen ini menetapkan voice, tone, copy kanonik, formula pesan error, struktur kunci locale, pluralisasi, format tanggal/angka, dan aturan RTL untuk produk web-only MicroApp Studio. Copy yang dirujuk layar ada di [screen-specs.md](screen-specs.md); aturan tampilan ada di [accessibility.md](accessibility.md) dan [design-system.md](design-system.md).

Locale wajib: `id-ID` (default) dan `en-US` (FR-SET-002, NFR-I18N-001). Tidak ada locale lain yang dirilis tanpa pembaruan dokumen ini.

## 2. Prinsip

| Prinsip | Konsekuensi |
|---|---|
| Jelas sebelum ringkas | Kalimat pendek yang utuh lebih baik daripada singkatan yang membingungkan. |
| Tenang | Tidak ada tanda seru berlebihan, humor pada error, atau kata yang menyalahkan pengguna. |
| Spesifik | Sebut apa yang terjadi, apa akibatnya, dan apa langkah berikutnya. |
| Konsisten | Satu istilah untuk satu konsep di seluruh layar, dokumen, dan pesan error. |
| Dapat diterjemahkan | Tidak ada string yang dirangkai dari potongan kalimat; tidak ada teks di dalam gambar. |
| Tanpa klaim berlebih | Tidak menjanjikan sinkronisasi, akun, atau penyimpanan cloud yang tidak ada. |

## 3. Voice dan Tone

| Aspek | Aturan | Contoh benar | Contoh salah |
|---|---|---|---|
| Sapa | Netral, tanpa "Anda" berulang; gunakan "kamu" pada `id-ID` dan "you" pada `en-US` untuk petunjuk langsung | "Pilih template untuk memulai." | "Anda harus memilih template terlebih dahulu." |
| Nada error | Membantu dan factful | "File tidak dapat diverifikasi. Coba unduh ulang." | "Oops! Terjadi kesalahan fatal!" |
| Nada sukses | Rendah hati, singkat | "Tersimpan." | "Yeay! Berhasil luar biasa!" |
| Aksi | Kata kerja di awal, konsisten | "Buat micro-app" | "Pembuatan micro-app" |
| Teknis | Hanya bila pengguna membutuhkannya | "Signature tidak cocok" | "Ed25519 verify failed at offset 0x2f" |
| Kapitalisasi | Sentence case untuk judul dan tombol | "Buat backup" | "BUAT BACKUP" |

Panjang maksimum: judul layar 48 karakter, label tombol 24 karakter, deskripsi empty state 140 karakter, pesan error 180 karakter. Teks yang lebih panjang dipindahkan ke panel bantuan, bukan dialog.

## 4. Copy Utama

### 4.1 Create

| Kunci | id-ID | en-US |
|---|---|---|
| `create.title` | Buat micro-app | Create a micro-app |
| `create.ai.label` | Ceritakan app yang kamu butuhkan | Describe the app you need |
| `create.ai.placeholder` | Contoh: kasir untuk warung, bisa tambah produk dan cetak struk | Example: a till for my shop, with products and receipts |
| `create.ai.action` | Buat | Create |
| `create.ai.noKey` | AI belum diatur. Kamu tetap bisa memakai template atau mulai kosong. | AI is not set up. You can still use a template or start blank. |
| `create.ai.planTitle` | Rencana | Plan |
| `create.ai.apply` | Buat aplikasi | Create app |
| `create.ai.revise` | Ubah | Revise |
| `create.template.action` | Pakai template | Use template |
| `create.blank.title` | Pilih titik awal | Choose a starting point |
| `create.blank.form` | Form | Form |
| `create.blank.list` | List | List |
| `create.blank.dashboard` | Dashboard | Dashboard |
| `create.name.default` | Micro-app Baru | New Micro-app |

### 4.2 Empty state

| Kunci | id-ID | en-US |
|---|---|---|
| `home.empty.title` | Belum ada micro-app | No micro-apps yet |
| `home.empty.body` | Mulai dari template, ceritakan idemu, atau buat kosong. | Start from a template, describe your idea, or start blank. |
| `home.empty.template` | Template | Templates |
| `home.empty.ai` | Magic Create | Magic Create |
| `home.empty.blank` | Mulai kosong | Start blank |
| `templates.empty` | Tidak ada template di kategori ini. | No templates in this category. |
| `packages.empty` | Belum ada package terpasang. | No installed packages yet. |
| `backup.empty` | Belum ada backup. | No backups yet. |
| `search.empty` | Tidak ada hasil. Coba kata lain atau buat app baru. | No results. Try another word or create a new app. |

Empty state selalu memiliki satu aksi utama dan tidak menampilkan kode error.

### 4.3 Error

| Kunci | id-ID | en-US |
|---|---|---|
| `error.generic` | Terjadi masalah. Coba lagi. | Something went wrong. Try again. |
| `error.retry` | Coba lagi | Try again |
| `error.export` | Ekspor data | Export data |
| `error.home` | Kembali ke Home | Back to Home |
| `error.pack.signature` | File tidak dapat diverifikasi. Periksa file atau minta ulang ke pengirim. | The file could not be verified. Check it or ask the sender for a new copy. |
| `error.pack.digest` | Isi file berubah setelah ditandatangani. Unduh ulang file aslinya. | The file changed after signing. Download the original again. |
| `error.backup.passphrase` | Passphrase salah. Periksa ejaan lalu coba lagi. | Wrong passphrase. Check the spelling and try again. |
| `error.storage.full` | Penyimpanan hampir penuh. Ekspor data atau bersihkan cache. | Storage is almost full. Export data or clear the cache. |
| `error.network.cage` | Akses jaringan diblokir oleh Offline Cage. Kamu dapat mengubahnya di Settings. | Network access is blocked by Offline Cage. You can change it in Settings. |
| `error.ai.noKey` | AI belum diatur. Tambahkan kunci di Settings atau pakai template. | AI is not set up. Add a key in Settings or use a template. |

Pesan error tidak pernah memuat stack trace, path absolut, nama token, kunci, atau detail kripto.

### 4.4 Consent

| Kunci | id-ID | en-US |
|---|---|---|
| `consent.title` | {app} meminta akses | {app} is asking for access |
| `consent.permission.storage` | Penyimpanan lokal - baca dan tulis | Local storage - read and write |
| `consent.reason.storage` | Untuk menyimpan daftar produk dan transaksi. | To save products and transactions. |
| `consent.risk.low` | Risiko rendah - data tetap di perangkat ini. | Low risk - data stays on this device. |
| `consent.risk.medium` | Risiko sedang - data tetap di perangkat ini. | Medium risk - data stays on this device. |
| `consent.risk.high` | Risiko tinggi - app dapat mengirim data keluar perangkat. | High risk - the app can send data off this device. |
| `consent.deny` | Tolak | Deny |
| `consent.once` | Izinkan sekali | Allow once |
| `consent.always` | Selalu izinkan | Always allow |
| `consent.audit` | Pilihan ini dicatat di perangkatmu. | This choice is recorded on your device. |

Alasan consent memakai kalimat pengguna, bukan nama method internal seperti `storage.write`. Risk tier selalu disertai teks.

### 4.5 Aksi dan Hasil

| Kunci | id-ID | en-US |
|---|---|---|
| `action.share` | Bagikan | Share |
| `action.export` | Unduh .mapp | Download .mapp |
| `action.import` | Impor .mapp | Import .mapp |
| `action.install` | Pasang | Install |
| `action.save` | Simpan | Save |
| `status.saving` | Menyimpan... | Saving... |
| `status.saved` | Tersimpan | Saved |
| `status.offline` | Offline - data lokal | Offline - local data |
| `status.ephemeral` | Mode sementara - data belum dapat dipulihkan | Ephemeral mode - data cannot be recovered yet |
| `toast.undone` | Dibatalkan: {action} | Undone: {action} |
| `toast.installed` | {app} terpasang. | {app} installed. |
| `toast.backupCreated` | Backup dibuat. Simpan file dan passphrase-mu. | Backup created. Keep the file and your passphrase safe. |

## 5. Formula Pesan Error

Setiap error mengikuti urutan:

```text
<apa yang terjadi> <apa langkah berikutnya> Kode: <E-DOMAIN-NNN>
```

Aturan:

1. Ringkasan maksimum 120 karakter, satu kalimat.
2. Langkah pemulihan berupa satu aksi konkret, bukan "hubungi administrator".
3. Kode selalu ditampilkan di akhir dengan format `E-<DOMAIN>-<NNN>` dan tidak dijadikan label tombol.
4. Tidak ada istilah internal, stack trace, path, atau detail kripto.
5. Nada tidak menyalahkan pengguna dan tidak memakai humor.
6. Setiap kode memiliki padanan `id-ID` dan `en-US` ([error-codes.md](../03-specs/error-codes.md)).

Contoh penerapan:

| Kode | Pesan id-ID |
|---|---|
| `E-SHELL-001` | Data lokal tidak dapat dibuka. Coba muat ulang. Kode: E-SHELL-001 |
| `E-CREATE-002` | AI belum diatur. Tambahkan kunci di Settings atau pakai template. Kode: E-CREATE-002 |
| `E-STUDIO-003` | Komponen tidak dapat diletakkan di sana. Pilih area lain. Kode: E-STUDIO-003 |
| `E-RUN-001` | Aplikasi berhenti merespons. Muat ulang app. Kode: E-RUN-001 |
| `E-PACK-003` | Isi file berubah setelah ditandatangani. Unduh ulang file aslinya. Kode: E-PACK-003 |
| `E-DATA-002` | Penyimpanan hampir penuh. Ekspor data atau bersihkan cache. Kode: E-DATA-002 |
| `E-BACKUP-002` | File backup rusak. Coba file lain. Kode: E-BACKUP-002 |
| `E-AUTH-002` | Frasa pemulihan tidak cocok. Periksa tiga kata yang diminta. Kode: E-AUTH-002 |
| `E-SET-001` | Nilai tidak valid. Kembalikan ke nilai sebelumnya. Kode: E-SET-001 |
| `E-NET-001` | Akses jaringan diblokir oleh Offline Cage. Kamu dapat mengubahnya di Settings. Kode: E-NET-001 |

## 6. Terminologi

| Istilah kanonik | Definisi untuk pengguna | Jangan dipakai |
|---|---|---|
| micro-app | Aplikasi kecil yang berjalan di dalam Studio | "program", "modul" |
| package | File `.mapp` bertanda tangan yang dapat dipasang | "bundle", "installer" |
| template | Kerangka micro-app siap pakai | "starter", "boilerplate" |
| project | Draft yang sedang dibangun | "workspace", "repo" |
| workspace | Kumpulan app dan data lokal pada perangkat | "akun", "tenant" |
| identitas lokal | Kunci yang dibuat di perangkat, tanpa akun | "profil", "login" |
| frasa pemulihan | 24 kata untuk memulihkan akses ke data | "seed", "mnemonic" |
| backup | Salinan terenkripsi data lokal | "snapshot", "cloud backup" |
| Offline Cage | Pengaturan yang memblokir jaringan untuk app | "firewall", "sandbox jaringan" |
| DevTools | Panel diagnostik lokal | "console", "debugger" |

Istilah teknis seperti `manifest`, `signature`, `checksum`, dan `OPFS` hanya muncul di layar lanjutan atau DevTools, dengan penjelasan singkat saat pertama muncul.

## 7. Struktur Kunci dan Berkas Locale

Berkas locale dibundel lokal sebagai JSON dan tidak diambil dari jaringan saat runtime.

```text
apps/studio-web/locales/
  id-ID/
    common.json
    create.json
    studio.json
    packages.json
    settings.json
    errors.json
  en-US/
    common.json
    create.json
    studio.json
    packages.json
    settings.json
    errors.json
```

Aturan kunci:

- Format `domain.subjek.aksi` dengan `camelCase` pada segmen; contoh `create.ai.apply`.
- Kunci identik di kedua locale; tidak ada kunci yang hanya ada di satu bahasa.
- Tidak ada string yang dirangkai dengan `+`; gunakan interpolation atau plural.
- Placeholder memakai nama bermakna: `{app}`, `{count}`, `{action}`, bukan `{0}`.
- Kunci tidak boleh memuat teks yang terlihat; nilai tidak boleh memuat HTML.
- Perubahan nilai tidak boleh mengubah nama kunci; kunci yang dihapus harus dihapus dari kedua locale dan dari kode.

Contoh:

```json
{
  "home.empty.title": "Belum ada micro-app",
  "home.empty.body": "Mulai dari template, ceritakan idemu, atau buat kosong.",
  "consent.title": "{app} meminta akses",
  "packages.count": "{count, plural, other {# package}}"
}
```

## 8. Pluralisasi dan Pemilihan

- Gunakan ICU MessageFormat untuk jumlah, gender, dan pilihan; jangan menyusun bentuk jamak manual.
- `id-ID` tidak membedakan tunggal/jamak secara gramatikal; tetap gunakan kategori `other` dan hindari `one` yang tidak perlu.
- `en-US` wajib memiliki `one` dan `other`.
- Angka di dalam pesan plural memakai `#` agar mengikuti format locale.
- Jangan memakai plural untuk nilai yang tidak dihitung (misalnya "1 pengaturan" yang selalu tunggal).

Contoh:

```text
id-ID: {count, plural, other {# app}}
en-US: {count, plural, one {# app} other {# apps}}
```

Pilihan berbasis nilai memakai `select`, bukan if/else di komponen:

```text
{risk, select,
  low {Risiko rendah}
  medium {Risiko sedang}
  high {Risiko tinggi}
  other {Risiko tidak diketahui}}
```

## 9. Format Tanggal, Angka, Ukuran, dan Mata Uang

| Nilai | id-ID | en-US | API |
|---|---|---|---|
| Tanggal pendek | 21 Nov 2026 | Nov 21, 2026 | `Intl.DateTimeFormat` |
| Tanggal dan waktu | 21 Nov 2026, 14.05 | Nov 21, 2026, 2:05 PM | `Intl.DateTimeFormat` |
| Waktu relatif | 3 hari lalu | 3 days ago | `Intl.RelativeTimeFormat` |
| Angka | 1.234,56 | 1,234.56 | `Intl.NumberFormat` |
| Persen | 62% | 62% | `Intl.NumberFormat` dengan `style: "percent"` |
| Ukuran file | 1,4 MB | 1.4 MB | `Intl.NumberFormat` + satuan biner |
| Checksum | 9c1e4b... | 9c1e4b... | Teks LTR, mono, tidak dipisah ribuan |

Aturan:

- Jangan menulis tanggal atau angka secara hardcoded di komponen.
- Ukuran file memakai basis 1024 dengan label KB, MB, GB; angka mengikuti locale.
- Mata uang hanya ditampilkan bila micro-app mendefinisikannya; Host tidak mengasumsikan IDR.
- Zona waktu mengikuti perangkat; label zona hanya muncul bila relevan.
- Rentang tanggal memakai `formatRange` agar tidak menghindari pemisah yang salah.

## 10. RTL dan Teks Campuran

- `dir` ditentukan oleh locale atau konten; `id-ID` dan `en-US` memakai `ltr`, tetapi komponen harus siap `rtl` untuk konten yang minta.
- Gunakan properti logis CSS; jangan memakai `left`/`right` untuk layout.
- Ikon arah (kembali, chevron, panah) dibalik; ikon media, centang, dan jam tidak dibalik.
- Nama package, versi, checksum, dan ID dibungkus `<bdi>` agar tidak mengacaukan arah kalimat.
- Jangan menggabungkan fragmen kalimat yang diterjemahkan; kirim satu pesan utuh dengan placeholder.
- Teks campuran Latin dan Arab tetap terbaca; tidak ada clipping pada 320 px.
- Angka dan tanda baca mengikuti locale, bukan arah teks.

## 11. Resolusi Locale dan Fallback

Urutan resolusi:

1. Preferensi pengguna di Settings.
2. `navigator.language` yang cocok dengan `id-ID` atau `en-US`.
3. Default `id-ID`.

Aturan:

- Perubahan locale berlaku tanpa reload dan tidak menghapus state layar.
- Kamus dimuat dari bundel lokal; tidak ada request jaringan untuk terjemahan.
- Bila kunci hilang, tampilkan kunci `en-US`; bila tetap hilang, tampilkan kunci mentah hanya di build pengembangan dan catat peringatan.
- Tidak ada fallback otomatis ke bahasa ketiga.
- Tanggal, angka, dan arah teks dihitung ulang saat locale berubah.

## 12. Istilah yang Tidak Dipakai

Produk ini web-only dan berjalan di browser. Copy tidak boleh menyiratkan hal yang tidak ada:

- Tidak ada akun, login, atau sinkronisasi antarperangkat.
- Tidak ada server aplikasi, unggahan otomatis, atau penyimpanan cloud.
- Tidak ada aplikasi desktop, pemasangan dari toko aplikasi, atau bundel platform.
- Tidak ada marketplace, publikasi otomatis, atau pendapatan dari penjualan.
- Tidak ada kolaborasi real-time atau pengeditan bersama.

Frasa seperti "tersinkron", "di cloud", "akunmu", "unduh dari store", dan "kolaborasi tim" MUST NOT muncul di UI. Bila pengguna membutuhkan pemindahan data, gunakan **backup**, **ekspor `.mapp`**, dan **impor**.

## 13. Checklist Review Copy

- [ ] Tidak ada string hardcoded di komponen; semua lewat kamus.
- [ ] Kunci identik di `id-ID` dan `en-US`.
- [ ] Tidak ada placeholder-only label.
- [ ] Pesan error memuat kode dan satu langkah pemulihan.
- [ ] Tidak ada istilah terlarang atau klaim platform yang tidak ada.
- [ ] Panjang teks muat pada 320 px tanpa terpotong.
- [ ] Plural dan tanggal memakai ICU/Intl, bukan logika manual.
- [ ] Nada konsisten: tenang, spesifik, tidak menyalahkan.
- [ ] Placeholder `{app}`, `{count}`, `{action}` terisi di semua jalur.
- [ ] Teks tidak memuat HTML atau markup yang dapat disisipkan.

## 14. Acceptance Criteria

- [ ] Seluruh layar menampilkan copy `id-ID` dan `en-US` dari kamus yang sama.
- [ ] Setiap pesan error memiliki kode `E-*` dan satu aksi pemulihan.
- [ ] Dialog consent memakai alasan plain-language dan label tombol yang konsisten.
- [ ] Tanggal, angka, dan ukuran file mengikuti locale tanpa hardcode.
- [ ] Tidak ada istilah akun, cloud, server, atau platform non-web di UI.
- [ ] Layout RTL dan teks campuran tidak terpotong.

## 15. Verifikasi

| Pemeriksaan | Cara |
|---|---|
| Kelengkapan kunci | Skrip membandingkan kunci `id-ID` dan `en-US`; gagal bila berbeda |
| String hardcoded | ESLint aturan i18n pada komponen |
| Placeholder | Vitest: setiap kunci yang memakai `{app}`/`{count}` diisi |
| Panjang teks | Snapshot 320 px untuk copy terpanjang |
| Error | Vitest: 27 kode memiliki pesan di dua locale, tanpa path/token |
| RTL | Playwright dengan `dir="rtl"` pada 12 layar |
| Istilah terlarang | Pencarian otomatis pada kamus untuk daftar istilah §12 |

## 16. Referensi

- [screen-specs.md](screen-specs.md)
- [accessibility.md](accessibility.md)
- [interaction-patterns.md](interaction-patterns.md)
- [design-system.md](design-system.md)
- [error-codes.md](../03-specs/error-codes.md)
- [07-settings.md](../03-specs/07-settings.md)
- [nfr.md](../03-specs/nfr.md)
- [FLOW-02 Create App](../04-flows/02-create-app.md)
- [FLOW-06 Permission Consent](../04-flows/06-permission-consent.md)
