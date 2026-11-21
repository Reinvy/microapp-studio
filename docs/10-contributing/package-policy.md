---
id: GOV-PACKAGE
title: Kebijakan Paket
status: accepted
owner: governance
prd_refs: ["§8", "§11"]
---

# Kebijakan Paket

Dokumen ini menetapkan aturan penerimaan, penandatanganan, rotasi kunci, penarikan, dan banding untuk paket `.mapp` serta index statis opsional. Tidak ada marketplace, publish server, atau registry terfederasi; distribusi terjadi lewat berkas yang dipertukarkan pengguna dan index statis read-only yang dikelola pihak yang mempercayakannya.

## 1. Tujuan dan Ruang Lingkup

- Menetapkan syarat minimum agar sebuah `.mapp` boleh dianggap layak dipasang.
- Menjaga agar verifikasi tetap lokal dan tidak bergantung pada layanan pusat.
- Menetapkan penanganan kunci yang berubah dan paket yang harus ditarik.
- Menetapkan jalur banding yang adil bagi author.

Format dan verifikasi teknis dirujuk dari [package distribution](../01-architecture/package-distribution.md), [ADR-0020](../01-architecture/adr/0020-mapp-package-signing.md), dan [package spec](../03-specs/05-packages.md). Insiden aktif mengikuti [incident response](../09-operations/incident-response.md).

## 2. Model Distribusi

| Komponen | Sifat | Dikelola oleh |
|---|---|---|
| Berkas `.mapp` | Berkas mandiri, ditandatangani, diverifikasi saat impor | Author |
| Index statis | JSON read-only di URL publik, opsional | Siapa pun yang meng-host |
| Verifikasi | Selalu di browser pengguna, sebelum instalasi | Host MicroApp Studio |

- Proyek **MUST NOT** menjalankan layanan publish, unggah, atau moderasi terpusat.
- Index statis hanya menyimpan metadata (`id`, `version`, `url`, `sha256`, `signature`, `permissions`); isi paket tetap diunduh dari URL yang dicantumkan dan diverifikasi ulang secara lokal.
- Micro-app **MUST NOT** mengambil kode dari jaringan saat runtime; seluruh logika berada di dalam paket yang sudah diverifikasi.
- Penarikan paket **TIDAK** menghapus paket yang sudah terpasang di perangkat pengguna; tindakan pengguna tetap diperlukan.

## 3. Syarat Penerimaan

Paket yang didaftarkan di index statis yang dikelola proyek **MUST** memenuhi seluruh syarat:

| # | Syarat | Bukti |
|---|---|---|
| P1 | Manifest v2 valid terhadap schema dan `schemaVersion` didukung | Validasi schema |
| P2 | ZIP deterministik, `microapp.manifest.json` di root, tanpa entri di luar layout | Dua pack dari input sama menghasilkan hash sama |
| P3 | Signature Ed25519 detached valid dan public key dapat diverifikasi | Verifikasi lokal |
| P4 | Digest tiap entri dan content hash keseluruhan cocok | Verifikasi lokal |
| P5 | Permission yang diminta minimal dan sesuai fungsi | Daftar permission di manifest |
| P6 | Berfungsi offline setelah dipasang; tidak ada panggilan wajib ke host pihak ketiga | Uji offline |
| P7 | Tidak memuat HTML/CSS/JS arbitrer di luar MUIP; tidak ada `eval` atau `new Function` | Pemeriksaan statis |
| P8 | Tidak memuat secret, endpoint pribadi, atau data pengguna | Pemeriksaan isi paket |
| P9 | Nama, ikon, dan deskripsi tidak menyesatkan atau meniru paket lain | Review manual |
| P10 | Versi mengikuti semver dan naik untuk setiap perubahan | Riwayat versi |

Kegagalan P1–P4 adalah kegagalan keras: paket ditolak tanpa pengecualian. Kegagalan P5–P10 dapat diperbaiki dan diajukan ulang.

## 4. Signature

- Setiap `.mapp` **MUST** membawa signature Ed25519 detached yang dibuat author dengan private key lokalnya.
- Public key **MUST** disertakan dalam metadata index atau dikirim bersama paket; pengguna memverifikasi tanpa jaringan.
- Host **MUST** memblokir instalasi bila signature tidak valid atau key tidak tersedia (FR-PACK-005) dan menampilkan `E-PACK-002`.
- Paket tanpa signature **MUST NOT** dipasang, termasuk paket "dev mode"; tidak ada bypass tersembunyi.
- Tanda tangan ulang oleh pihak ketiga tidak diakui sebagai bukti authorship; identitas ditentukan oleh kunci, bukan nama di manifest.

## 5. Rotasi Kunci dan Key Mismatch

| Situasi | Perilaku wajib |
|---|---|
| Author merotasi kunci dan mengumumkannya | Metadata index memuat key baru; paket lama tetap dapat dipasang dengan key lamanya |
| Key berubah tanpa pengumuman untuk `id` yang sama | Peringatan keras dan instalasi diblokir sampai pengguna menyetujui key baru (FR-PACK-011) |
| Dua paket berbeda memakai nama yang sama | Dianggap paket berbeda; `id` adalah identitas, bukan nama |
| Kunci author diduga bocor | Rotasi wajib; pengguna diberi advisori dan pilihan mempertahankan versi lama yang sudah terpasang |

Aturan tambahan:

- Host **MUST** menyimpan sidik jari key per `id` (trust-on-first-use) dan menampilkan perbandingan sidik jari saat berubah.
- Persetujuan key baru bersifat perangkat; tidak ada sinkronisasi persetujuan.
- Author **MUST** mencantumkan alasan rotasi di catatan rilis paket; alasan tidak diverifikasi secara kriptografis.

## 6. Penarikan (Delisting) dari Index Statis

Penarikan hanya berlaku pada index yang dikelola proyek; paket yang sudah terpasang tetap ada di perangkat pengguna.

| Tingkat | Kondisi | Tindakan |
|---|---|---|
| Segera | Malware aktif, signature dipalsukan, eksekusi di luar sandbox | Hapus entri index, terbitkan advisori, banner dalam aplikasi |
| Cepat | Pelanggaran permission atau klaim menyesatkan | Hapus entri, minta perbaikan dalam 7 hari |
| Terjadwal | Kualitas rendah, metadata tidak lengkap | Tandai tidak tersedia sampai diperbaiki |

Prosedur:

1. Catat `id`, `version`, `sha256`, alasan, dan bukti.
2. Hapus atau tandai entri index; jangan mengubah berkas paket milik author.
3. Terbitkan advisori dengan dampak dan langkah pengguna.
4. Bila terkait keamanan, ikuti playbook paket berbahaya pada [incident response](../09-operations/incident-response.md).
5. Simpan catatan penarikan minimal 1 tahun.

Penarikan **MUST NOT** mengandalkan mekanisme jarak jauh di dalam aplikasi; tidak ada kill switch terpusat.

## 7. Banding

- Author dapat mengajukan banding tertulis dalam 14 hari sejak penarikan atau penolakan.
- Banding **MUST** menyebut bukti teknis: hash, signature, dan langkah reproduksi.
- Reviewer banding **MUST** berbeda dari pengambil keputusan awal; bila tidak tersedia, council menunjuk pengganti.
- Keputusan banding diberikan dalam 10 hari kerja dengan alasan tertulis.
- Selama banding, entri tetap ditarik untuk kasus keamanan; untuk kasus non-keamanan, entri boleh ditandai "dalam peninjauan".
- Keputusan banding bersifat final pada tingkat council; RFC baru hanya diperlukan bila mengubah kebijakan, bukan kasus individual.

## 8. Tanggung Jawab Author dan Pengguna

| Pihak | Kewajiban |
|---|---|
| Author | Menjaga private key, menaikkan versi, mendokumentasikan permission, memperbaiki laporan keamanan |
| Host | Memverifikasi sebelum instalasi, menampilkan permission, memblokir signature tidak valid, mencatat audit lokal |
| Pengguna | Meninjau permission sebelum memasang, menyimpan backup, tidak memasang paket dari sumber yang tidak dikenal |

- Author **MUST NOT** meminta pengguna menonaktifkan verifikasi atau memasang paket tanpa signature.
- Pengguna **MUST** dapat mengekspor data sebelum uninstall (FR-PACK-012).
- Laporan kerentanan paket pihak ketiga diarahkan ke author; proyek hanya menangani paket yang didistribusikan lewat index yang dikelolanya.

## 9. Verifikasi

| # | Pemeriksaan | Bukti |
|---|---|---|
| 1 | Paket di index lolos P1–P10 | Lembar review paket |
| 2 | Signature dan digest diverifikasi lokal saat impor | Test verifikasi + catatan manual |
| 3 | Key mismatch memblokir instalasi | Uji dengan key berbeda |
| 4 | Penarikan tercatat dan advisori terbit | Catatan penarikan |
| 5 | Banding dijawab ≤ 10 hari kerja oleh reviewer berbeda | Berkas banding |
| 6 | Tidak ada publish server, marketplace, atau kill switch | Pemeriksaan arsitektur dan build |
