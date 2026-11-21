---
id: DESIGN-A11Y
title: Aksesibilitas
status: accepted
owner: design
prd_refs: ["§4", "§6"]
---

# Aksesibilitas

## 1. Tujuan dan Ruang Lingkup

Dokumen ini menetapkan kontrak aksesibilitas untuk 12 layar, komponen clay, builder, runtime sandbox, dan dialog consent. Target wajib adalah **WCAG 2.2 Level AA** (NFR-A11Y-001) dan seluruh alur inti dapat diselesaikan dengan keyboard (NFR-A11Y-002).

Di dalam: kontras, fokus, target sentuh, peta keyboard, struktur semantik, status tanpa warna, reduced motion, RTL, form, media, dan matriks uji. Di luar: token visual ([design-system.md](design-system.md)), perilaku gerak ([interaction-patterns.md](interaction-patterns.md)), dan copy ([content-i18n.md](content-i18n.md)).

## 2. Standar dan Prinsip

| Prinsip | Konsekuensi yang mengikat |
|---|---|
| Dapat dipersepsikan | Semua informasi memiliki padanan teks; warna bukan satu-satunya pembeda. |
| Dapat dioperasikan | Semua fungsi tersedia lewat keyboard; tidak ada jebakan fokus yang tidak dapat keluar. |
| Dapat dipahami | Label, instruksi, dan pesan error memakai bahasa pengguna; perubahan status diumumkan. |
| Robust | Markup semantik, nama/role/state yang benar, dan kompatibel dengan pembaca layar utama. |
| Setara di semua tema | Light, dark, dan high-contrast memenuhi ambang yang sama. |

## 3. Kontras

### 3.1 Ambang wajib

| Pasangan | Ambang | Aturan |
|---|---|---|
| `--mads-color-fg` pada `--mads-color-bg` / `--mads-color-surface` | ≥ 4,5:1 | Teks normal dan placeholder yang informatif |
| `--mads-color-muted` pada `--mads-color-surface` | ≥ 4,5:1 | Teks sekunder |
| `--mads-color-muted` pada `--mads-color-bg` | ≥ 4,5:1 hanya untuk teks besar | Teks kecil MUST memakai `surface` atau `fg` |
| `--mads-color-on-primary` pada `--mads-color-primary` | ≥ 4,5:1 | Label tombol utama |
| `--mads-color-accent` pada `surface` | ≥ 3:1 untuk grafik | `accent` MUST NOT dipakai untuk teks kecil |
| `--mads-color-border-strong` pada `surface` | ≥ 3:1 | Batas kontrol; `border` dekoratif tidak boleh menjadi satu-satunya batas |
| `--mads-color-focus` pada permukaan | ≥ 3:1 | Cincin fokus |
| Teks status pada status surface | ≥ 4,5:1 | Status surface dihitung, bukan hardcoded |

Teks besar berarti ≥ 24 px regular atau ≥ 18,66 px bold. Di bawah ambang itu, `muted` di atas `bg` dan `accent` sebagai warna teks MUST NOT dipakai. Gunakan `fg`, `surface`, atau `warning`/`error` sesuai makna.

### 3.2 Status surface

Status surface dihitung dengan:

```css
--mads-color-success-surface: color-mix(
  in srgb,
  var(--mads-color-success) 12%,
  var(--mads-color-surface)
);
```

Teks di atas status surface memakai `--mads-color-fg`; border memakai `--mads-color-border-strong`. Pada tema high-contrast, status surface memakai `#E0E0E0` dengan teks `#000000`, dan setiap status tetap disertai ikon serta label.

### 3.3 Verifikasi kontras

- Uji otomatis menghitung seluruh pasangan token pada light, dark, dan high-contrast.
- Gate gagal bila ada pasangan teks di bawah 4,5:1 atau batas kontrol/fokus di bawah 3:1.
- Hasil uji disimpan sebagai bukti; tidak ada warna baru yang boleh masuk tanpa melewati gate.
- Komponen tidak boleh menulis hex, `rgb()`, atau `color-mix` sendiri di luar token; status surface hanya didefinisikan di lapisan token.

## 4. Fokus

| Aturan | Nilai |
|---|---|
| Cincin fokus | `outline: 3px solid var(--mads-color-focus)` |
| Offset | `outline-offset: 2px` |
| Halo (dark) | `box-shadow: 0 0 0 2px #FFFFFF` di luar outline |
| Bentuk | Mengikuti radius komponen; tidak memotong sudut |
| Visibilitas | Hanya `:focus-visible`; klik mouse tidak menampilkan cincin kecuali pada input |
| Urutan | Mengikuti urutan DOM; `tabindex` positif MUST NOT dipakai |

Aturan tambahan:

- Fokus tidak boleh hilang saat konten berubah; jika node yang difokus dihapus, fokus pindah ke induk terdekat dan diumumkan.
- Modal, sheet, dan command palette memerangkap fokus dan mengembalikannya ke pemicu.
- Backdrop tidak dapat difokus.
- Iframe sandbox memiliki `title`; saat masuk, fokus berada di elemen pertama app dan `Esc` mengembalikan fokus ke header runner dengan konfirmasi bila perlu.
- Skip link "Lewati ke konten" adalah elemen pertama yang dapat difokus dan terlihat saat difokus.
- Fokus tidak boleh bergantung pada animasi; reduced motion tidak menghilangkan cincin.

## 5. Target Sentuh

| Target | Minimum | Catatan |
|---|---|---|
| Kontrol utama | 44 × 44 px | Tombol, tab, item dock, FAB |
| Kontrol sekunder | 24 × 24 px efektif | Dengan padding di sekitar; jarak antar-target ≥ 8 px |
| Ikon di dalam teks | 24 × 24 px | Bukan target sentuh tunggal |
| Drag handle | 44 × 44 px | Dapat dioperasikan keyboard |
| Baris tabel | Tinggi ≥ 44 px | Di mobile menjadi 56 px |

Target yang lebih kecil dari 24 px MUST NOT ada. Kontrol yang berdekatan tidak boleh berbagi area sentuh; gap minimal 8 px mencegah salah tekan.

## 6. Peta Keyboard per Layar

| Layar | Navigasi | Aksi | Keluar |
|---|---|---|---|
| SCR-01 Welcome | `Tab` antar tiga aksi | `Enter` memilih | `Esc` = lewati |
| SCR-02 Home | `Tab` ke search, grid, sidebar; panah dalam grid | `Enter` buka app; `Shift+F10` context menu | `Esc` tutup menu/search |
| SCR-03 Templates | Panah kiri/kanan pada tab kategori; `Tab` ke kartu | `Enter` pilih kartu; `Esc` tutup preview | `Esc` kembali ke daftar |
| SCR-04 Create | `Tab` textarea → chip → tombol | `Cmd/Ctrl+Enter` buat; `Esc` kembali | `Esc` ke Home |
| SCR-05 Builder | `Tab` top bar → palette → kanvas → inspector | `Cmd/Ctrl+Z`, `Cmd/Ctrl+Shift+Z`; `Alt+Panah` pindah node | `Esc` tutup panel/deselect |
| SCR-06 Preview | `Tab` ke device switcher dan tombol Edit | Panah pada radio device; `Enter` memilih | `Esc` keluar saat fokus di luar iframe |
| SCR-07 Runner | `Tab` header → menu → iframe | `Enter` buka menu; boundary menerima fokus | `Esc` tutup menu |
| SCR-08 Packages | `Tab` tab dan baris; `Enter` detail | `Enter` buka detail/sheet | `Esc` tutup sheet |
| SCR-09 Import | `Tab` dropzone → tombol | `Enter` pilih file; `Esc` batal | `Esc` tutup modal |
| SCR-10 Backup | `Tab` meter → tombol backup → restore | `Enter` buka dialog; `Esc` batal | `Esc` tutup dialog |
| SCR-11 Settings | `Tab` navigasi grup → kontrol | Panah pada radio; `Space` pada switch | `Esc` tidak meninggalkan halaman |
| SCR-12 Consent | `Tab` hanya di dalam sheet | `Enter`/`Space` memilih; `Esc` = Tolak | `Esc` menolak |

Shortcut global: `Cmd/Ctrl+K` command palette, `Esc` menutup lapisan teratas, `?` membuka daftar shortcut. Setiap aksi juga tersedia lewat tombol yang terlihat.

## 7. Struktur Semantik dan Label

| Wilayah | Markup | Aturan |
|---|---|---|
| Header aplikasi | `<header>` dengan `role="banner"` | Nama app atau judul layar sebagai `h1` halaman |
| Navigasi utama | `<nav aria-label="Navigasi utama">` | Item aktif memakai `aria-current="page"` |
| Konten | `<main id="konten">` | Satu `main` per layar |
| Panel kanan | `<aside aria-label="Inspector">` | Hanya di builder/preview |
| Dialog | `role="dialog"` atau `role="alertdialog"` | `aria-modal`, `aria-labelledby`, `aria-describedby` |
| Live region | `role="status"` atau `aria-live` | Satu region `polite` untuk status, satu `assertive` untuk crash |
| Tabel | `<table>` dengan `<th scope>` | Tidak memakai div-grid untuk data tabular |
| Daftar app | `role="list"` / `listitem` | Kartu memiliki nama aksesibel lengkap |

Label wajib:

- Tombol ikon memiliki `aria-label` yang menyebut aksi, bukan nama ikon ("Hapus komponen", bukan "trash").
- Input memiliki `<label>` terlihat; placeholder bukan pengganti label.
- Gambar dekoratif memakai `alt=""`; gambar informatif memiliki `alt` yang menjelaskan tujuan.
- Badge status dibacakan sebagai teks lengkap ("Penyimpanan 82 persen, hampir penuh").
- Perubahan bahasa mengubah atribut `lang` pada elemen yang relevan.
- Nama project pada builder adalah teks yang dapat diedit; pembaca layar mengumumkan "Nama project, dapat diedit".

## 8. Status Tanpa Warna

| Status | Ikon | Label wajib | Warna pendukung |
|---|---|---|---|
| Sukses | Centang | "Berhasil" atau "Tersimpan" | `--mads-color-success` |
| Peringatan | Segitiga | "Perlu perhatian" | `--mads-color-warning` |
| Error | Lingkaran seru | Kode `E-*` + ringkasan | `--mads-color-error` |
| Info | Huruf i | "Informasi" | `--mads-color-info` |
| Offline | Awan coret | "Offline" | `--mads-color-muted` |
| Online | Titik | "Online" | `--mads-color-success` |

Setiap status MUST memiliki ikon dan teks. Badge tanpa teks hanya diizinkan bila memiliki `aria-label` lengkap. Grafik memakai pola, label langsung, atau tabel alternatif; bukan hanya perbedaan warna.

## 9. Gerak dan Preferensi

- `prefers-reduced-motion: reduce` memaksa durasi transform 0 ms dan menghapus blob animation, confetti, parallax, serta slide/scale.
- Tersisa hanya perubahan opacity ≤ 120 ms; tidak ada pergeseran posisi.
- Preferensi **Kurangi animasi** di Settings menghasilkan perilaku yang sama.
- Animasi tidak boleh berkedip lebih dari 3 kali per detik.
- Tidak ada konten informatif yang bergerak otomatis lebih dari 5 detik tanpa kontrol pause; blob latar dekoratif tidak membawa informasi dan berhenti saat reduced motion.
- Cincin fokus dan perubahan status tetap terlihat tanpa animasi.

## 10. RTL dan Internasionalisasi Layout

- `dir="rtl"` dipasang pada `<html>` saat locale atau konten meminta; komponen memakai properti logis (`margin-inline-start`, `padding-inline`, `inset-inline`).
- Sidebar, dock, breadcrumb, dan chevron dibalik; ikon pemutar media, centang, dan jam tidak dibalik.
- Angka, kode, checksum, dan ID tetap LTR memakai `dir="ltr"` pada elemen terkait.
- Teks campuran memakai isolasi bidi (`<bdi>`) untuk nama package dan versi.
- Layout tidak terpotong pada lebar 320 px; tidak ada `overflow: hidden` yang menyembunyikan kontrol.
- Toast dan dialog tetap berada di dalam viewport; posisi mengikuti arah baca.
- Snapshot RTL wajib ada untuk 12 layar (NFR-I18N-002).

## 11. Form, Error, dan Validasi

| Aturan | Implementasi |
|---|---|
| Label | Label terlihat dan terhubung dengan `for`/`id` |
| Bantuan | `aria-describedby` untuk batas karakter, format, atau konsekuensi |
| Error | Pesan di dekat field, `aria-invalid="true"`, fokus pindah ke field pertama yang gagal |
| Error global | Ringkasan di atas form dengan tautan ke field; kode `E-*` ditampilkan |
| Waktu | Tidak ada batas waktu yang memaksa pengisian ulang; sesi panjang tetap aman |
| Autofill | `autocomplete` yang tepat; tidak memblokir password manager |
| Konfirmasi | Aksi destruktif meminta konfirmasi eksplisit dan menyebut akibatnya |
| Pengulangan | Input yang sama tidak diminta dua kali tanpa alasan |

Pesan error tidak menyalahkan pengguna, menyebutkan cara memperbaiki, dan tidak membocorkan detail internal atau kripto.

## 12. Media dan Konten

- Video memiliki caption dan transkrip; audio memiliki transkrip.
- Gambar dalam micro-app mengikuti kontrak MUIP: `alt` wajib untuk gambar informatif.
- Konten yang dapat digulir memiliki fokus keyboard.
- Tidak ada autoplay audio/video dengan suara.
- Teks dapat diperbesar 200% tanpa kehilangan konten atau fungsi.
- Mode high-contrast mempertahankan ikon dan label; gambar dekoratif dihilangkan bila mengganggu.

## 13. Matriks Uji WCAG 2.2 AA

| Kriteria | Cara uji | Gate |
|---|---|---|
| 1.4.3 Kontras minimum | Uji token otomatis + axe | 0 pelanggaran serius |
| 1.4.4 Ubah ukuran teks | Zoom 200% pada 12 layar | Tidak ada konten terpotong |
| 1.4.11 Kontras non-teks | Uji batas kontrol, fokus, dan ikon | ≥ 3:1 |
| 2.1.1 Keyboard | Playwright keyboard untuk create, edit, install, consent | Semua alur selesai |
| 2.4.3 Urutan fokus | Tinjauan manual urutan DOM | Logis dan terlihat |
| 2.4.7 Fokus terlihat | Uji `:focus-visible` di semua tema | Cincin terlihat ≥ 3:1 |
| 2.4.11 Fokus tidak terhalang | Uji sticky header dan sheet | Fokus tidak tertutup |
| 2.5.8 Target minimum | Ukur kontrol | ≥ 24 px, utama ≥ 44 px |
| 3.2.6 Mekanisme bantuan konsisten | Tinjauan label dan posisi bantuan | Konsisten di 12 layar |
| 3.3.7 Redundant entry | Uji form create/import/backup | Tidak meminta ulang data yang sama |
| 4.1.2 Nama, peran, nilai | axe + pembaca layar | 0 pelanggaran serius |
| 4.1.3 Pesan status | Uji live region | Perubahan diumumkan |

Uji dijalankan pada light, dark, dan high-contrast, serta pada viewport 360 × 640, 768 × 1024, dan 1280 × 900.

## 14. Acceptance Criteria

- [ ] axe tidak menemukan pelanggaran serius pada 12 layar di tiga tema.
- [ ] Seluruh alur create, edit, preview, install, backup, dan consent selesai dengan keyboard saja.
- [ ] Setiap kontrol memiliki nama aksesibel dan setiap status memiliki ikon serta teks.
- [ ] Tidak ada teks kecil memakai `muted` di atas `bg` atau `accent` sebagai warna teks.
- [ ] `prefers-reduced-motion` menghasilkan 0 ms transform dan tidak menghilangkan informasi.
- [ ] Layout RTL tidak terpotong pada 320 px dan arah ikon mengikuti.

## 15. Verifikasi

| Pemeriksaan | Cara |
|---|---|
| axe | Playwright + `@axe-core/playwright` pada 12 layar, tiga tema |
| Keyboard | Playwright: tab sampai aksi selesai, tanpa mouse |
| Kontras | Uji token otomatis dan tinjauan snapshot |
| Reduced motion | Computed style: `transition-duration` dan `animation` nol |
| RTL | Snapshot 12 layar dengan `dir="rtl"` |
| Pembaca layar | Uji manual NVDA/Firefox dan VoiceOver/Safari untuk create, consent, crash |

## 16. Referensi

- [design-system.md](design-system.md)
- [interaction-patterns.md](interaction-patterns.md)
- [content-i18n.md](content-i18n.md)
- [screen-specs.md](screen-specs.md)
- [nfr.md](../03-specs/nfr.md)
- [01-app-shell.md](../03-specs/01-app-shell.md)
- [permissions.md](../03-specs/permissions.md)
