---
id: OPS-INCIDENT
title: Respons Insiden Web
status: accepted
owner: security
prd_refs: ["§8", "§11"]
---

# Respons Insiden Web

Dokumen ini menetapkan cara mendeteksi, membatasi, mengomunikasikan, dan menutup insiden pada MicroApp Studio sebagai PWA web-only. Karena produk tidak memiliki akun, telemetry, maupun backend data, sebagian besar bukti hidup di perangkat pengguna; prosedur di bawah **MUST** dirancang untuk bekerja tanpa akses ke data pengguna.

## 1. Tujuan dan Ruang Lingkup

- Menetapkan severity, peran, dan batas waktu respons untuk insiden web.
- Menyediakan playbook containment untuk paket `.mapp` berbahaya, kompromi kunci, kehilangan data lokal, deploy rusak, regresi CSP, dan supply chain npm.
- Menetapkan komunikasi pengguna yang tidak bergantung pada telemetry atau milis.
- Menetapkan bukti, postmortem, dan tindak lanjut.

Di luar cakupan: insiden server produksi, basis data terpusat, jaringan internal, dan orkestrasi container. Ketiganya **tidak ada** pada arsitektur ini. Kontrol keamanan yang relevan dirujuk dari [threat model](../01-architecture/threat-model.md).

## 2. Prinsip

| Prinsip | Konsekuensi |
|---|---|
| Selamatkan data pengguna lebih dulu | Jangan pernah menyarankan hapus data sebelum ekspor tersedia |
| Jangan menambah kerusakan | Jangan menimpa log, jangan rotasi kunci tanpa catatan, jangan deploy perbaikan tanpa review |
| Fail closed | Bila verifikasi tidak bisa dijalankan, blokir impor/eksekusi, bukan melanjutkan |
| Bukti minimal tapi cukup | Simpan hash artefak, waktu, dan langkah reproduksi; jangan minta data pribadi |
| Satu komandan | Satu incident commander memutuskan; satu kanal komunikasi |
| Transparan setelah aman | Advisori publik terbit setelah mitigasi tersedia, tanpa spekulasi |

## 3. Severity

| Severity | Definisi | Contoh web | Respons awal | Irama pembaruan |
|---|---|---|---|---|
| SEV-1 | Kompromi kunci, eksekusi kode di luar sandbox, paket berbahaya yang tersebar luas, kehilangan data massal | Private key signing bocor; escape iframe; `.mapp` menyebar lewat index statis populer | 1 jam | 60 menit |
| SEV-2 | Paket berbahaya terbatas, data pengguna hilang pada satu perangkat, deploy produksi rusak, CSP melemah | Signature bypass pada satu versi; eviction OPFS tanpa peringatan; shell gagal boot | 4 jam | 4 jam |
| SEV-3 | Fitur rusak tanpa dampak keamanan langsung atau data | Builder gagal drag pada satu breakpoint; toast salah; route 404 | 1 hari kerja | 2 hari kerja |

- Waktu respons dihitung dari verifikasi laporan pertama, bukan dari pembuatan tiket.
- Ragu antara dua level → pilih yang lebih tinggi sampai triage selesai; penurunan severity **MUST** dicatat dengan alasan.
- Insiden yang melibatkan secret nyata **MUST** diperlakukan minimal SEV-2.

## 4. Peran

| Peran | Tanggung jawab |
|---|---|
| Incident commander | Menetapkan severity, memimpin triage, memutuskan containment dan rollback |
| Security lead | Menganalisis akar masalah, menentukan cakupan kunci dan paket terdampak |
| Release owner | Menyiapkan patch, menjalankan deploy/rollback sesuai [deployment](deployment.md) |
| Scribe | Mencatat timeline UTC, keputusan, hash artefak, dan tautan bukti |
| Communications lead | Menyusun advisori dan banner dalam aplikasi |
| Support liaison | Menjawab laporan pengguna tanpa meminta secret atau isi vault |

- Kanal insiden **MUST** privat dan terekam; kerentanan **MUST NOT** dilaporkan lewat issue publik.
- Pelapor eksternal diarahkan ke [SECURITY.md](../../SECURITY.md); jangan meminta mereka mengunggah backup atau frasa pemulihan.

## 5. Tiga Puluh Menit Pertama

| Menit | Tindakan | Keluaran |
|---|---|---|
| 0–5 | Konfirmasi laporan, buka kanal, tunjuk commander dan scribe | Severity awal, tiket privat |
| 5–10 | Reproduksi di build yang sama dengan laporan; catat SHA dan header respons | Fakta terverifikasi atau laporan ditolak dengan bukti |
| 10–20 | Tentukan blast radius: versi paket, route, key, atau dependency | Daftar artefak terdampak dan hash-nya |
| 20–30 | Containment awal: tarik index, blokir versi, rollback deploy, atau nonaktifkan fitur | Keputusan tertulis + pemilik aksi |
| 30 | Update pertama ke pengguna bila SEV-1/SEV-2 | Banner atau advisori awal |

Selama 30 menit pertama, **MUST NOT**: menghapus artefak bukti, memaksa update service worker, atau meminta pengguna membersihkan data.

## 6. Playbook Containment

### 6.1 Paket `.mapp` Berbahaya

1. Hentikan distribusi: hapus entri dari index statis yang dikelola proyek (bila ada) dan terbitkan peringatan versi.
2. Identifikasi `id`, `version`, `sha256`, dan public key yang menandatangani.
3. Tambahkan pola deteksi ke verifikasi impor bila celahnya di verifier; bila celah di manifest, percepat patch mengikuti [kebijakan paket](../10-contributing/package-policy.md).
4. Pengguna yang sudah memasang **MUST** mendapat banner dalam aplikasi dengan aksi **Nonaktifkan app** dan **Ekspor data**; uninstall tidak boleh menghapus data sebelum ekspor.
5. Bila paket memanfaatkan bridge, audit grant permission terkait dan revoke default.

### 6.2 Kompromi Kunci

| Kunci | Tindakan |
|---|---|
| Signing key author | Terbitkan peringatan key mismatch; pengguna yang memegang public key lama melihat blokir sampai menyetujui key baru (FR-PACK-011) |
| Kunci identitas pengguna | Tidak ada akses pusat; sarankan buat identitas baru dan ekspor data; jelaskan bahwa backup lama tetap dapat dibuka dengan passphrase |
| Kunci backup | Wajib ganti passphrase pada backup berikutnya; backup lama tidak dapat diselamatkan bila passphrase hilang |

- Rotasi kunci **MUST** dicatat dengan waktu, alasan, dan sidik jari kunci lama/baru.
- Tidak ada mekanisme pencabutan terpusat; komunikasi dan verifikasi lokal adalah kontrol yang tersedia.

### 6.3 Kehilangan Data Lokal atau Eviction

1. Minta pengguna menghentikan pemakaian app terkait dan mengekspor yang tersisa.
2. Periksa apakah penyebabnya eviction browser, migrasi gagal, atau bug tulis; cek migrasi 001/002 dan snapshot pra-migrasi.
3. Pulihkan dari backup `.mapp-backup` sesuai [flow backup](../04-flows/05-backup-recovery.md); jangan menjanjikan pemulihan data yang tidak pernah dibackup.
4. Bila penyebabnya kuota, perbaiki estimasi penyimpanan dan peringatan sebelum menutup insiden.

### 6.4 Deploy Rusak

1. Rollback dengan promote deployment sebelumnya; jangan build ulang.
2. Naikkan versi cache service worker agar klien tidak terjebak aset rusak.
3. Verifikasi empat route smoke test dan header wajib.
4. Bila regresi disebabkan header, perlakukan sebagai insiden keamanan pada §6.5.

### 6.5 Regresi CSP atau Isolasi

- Segera rollback, lalu bandingkan header produksi dengan tabel header di [deployment](deployment.md#5-header-wajib).
- Regresi `frame-ancestors`, `sandbox`, atau COOP/COEP adalah SEV-1 bila membuka jalan eksekusi kode atau pembacaan origin lain.
- Tambahkan uji regresi header ke [security test plan](../08-quality/security-test-plan.md) sebelum menutup insiden.

### 6.6 Supply Chain npm

1. Bekukan deploy; jangan promosikan artefak yang memuat versi terdampak.
2. Petakan dependency terdampak dari lockfile dan hasil `npm ci` deterministik; cari pemakaian pada build dan runtime.
3. Ganti versi atau paket, jalankan ulang seluruh gate, lalu rilis patch.
4. Bila secret terekspos lewat paket, rotasi semua kunci yang dapat dijangkau dan catat di postmortem.

## 7. Komunikasi Pengguna

Karena tidak ada akun, milis, atau telemetry, satu-satunya kanal langsung adalah **banner dalam aplikasi** yang dimuat dari build terbaru dan advisori di repositori.

| Situasi | Kanal | Isi |
|---|---|---|
| Paket berbahaya | Banner + advisori | Nama app/versi, risiko satu kalimat, aksi nonaktifkan/ekspor |
| Kunci berubah | Dialog verifikasi lokal | Sidik jari baru, alasan, tombol tolak |
| Deploy rusak sebentar | Status page statis (opsional) | Waktu, dampak, perkiraan pulih |
| Kehilangan data | Banner + panduan restore | Langkah restore, batas pemulihan yang jujur |

Aturan pesan:

- Bahasa Indonesia dan Inggris, sesuai locale pengguna.
- Tanpa menyalahkan pengguna, tanpa klaim pemulihan yang belum terbukti.
- Tidak ada tautan ke berkas yang meminta secret.
- Banner **MUST** dapat ditutup, kecuali risiko aktif yang belum dimitigasi.

## 8. Postmortem

Postmortem **MUST** ditulis untuk SEV-1 dan SEV-2 dalam 5 hari kerja, bersifat blameless, dan memuat:

1. Ringkasan satu paragraf dan severity akhir.
2. Timeline UTC dengan keputusan dan pelaksana.
3. Dampak terukur: versi terdampak, jumlah laporan, data yang tidak dapat dipulihkan.
4. Akar masalah dan faktor kontribusi.
5. Apa yang berhasil dan apa yang memperlambat.
6. Aksi perbaikan dengan pemilik, tenggat, dan bukti verifikasi.
7. Perubahan dokumen/spec yang diperlukan.

Aksi perbaikan **MUST** ditautkan ke PR; postmortem tanpa aksi tertutup tidak boleh ditutup sebagai selesai.

## 9. Bukti

| Artefak | Cara menyimpan |
|---|---|
| Hash paket terdampak | Catat `sha256` dan signature di tiket privat |
| Header respons produksi | Salin keluaran `curl -I` dengan timestamp |
| Log build/deploy | Simpan log dengan SHA commit |
| Laporan pengguna | Ringkas tanpa data pribadi; jangan simpan vault/backup |
| Tangkapan layar | Hanya bila tidak memuat data pribadi atau secret |

Bukti disimpan minimal 1 tahun untuk SEV-1/SEV-2, atau sampai aksi perbaikan ditutup, mana yang lebih lama.

## 10. Verifikasi

| # | Pemeriksaan | Bukti |
|---|---|---|
| 1 | Severity dan commander tercatat ≤ 15 menit | Timeline |
| 2 | Containment dijalankan dan diverifikasi | Catatan aksi + smoke test |
| 3 | Banner/advisori terbit untuk SEV-1/SEV-2 | Tautan atau tangkapan tanpa data pribadi |
| 4 | Postmortem selesai ≤ 5 hari kerja | Dokumen postmortem |
| 5 | Uji regresi ditambahkan untuk akar masalah | PR yang ditautkan |
| 6 | Tidak ada secret di tiket, chat, atau commit | Pemeriksaan scribe (SEC-007) |
