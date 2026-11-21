---
id: GOV-MAINTAINERS
title: Tata Kelola
status: accepted
owner: governance
prd_refs: ["§10", "§11"]
---

# Tata Kelola

Dokumen ini menetapkan cara proyek MicroApp Studio mengambil keputusan, memelihara cakupan web-only, merilis, mengelola lisensi dan pendanaan, serta menangani konflik kepentingan. Tata kelola **MUST** menjaga proyek tetap terbuka, netral, dan bebas dari edisi berbayar.

## 1. Tujuan dan Ruang Lingkup

- Menetapkan struktur maintainer dan batas kewenangannya.
- Menetapkan proses keputusan biasa dan keputusan struktural.
- Mengunci cakupan produk: satu PWA Next.js 16 untuk browser desktop, tablet, dan mobile.
- Menetapkan irama rilis, lisensi, pendanaan, dan pengungkapan konflik kepentingan.

Di luar cakupan dokumen ini: detail teknis kontrak (lihat [rfc-process.md](rfc-process.md)), kebijakan paket (lihat [package-policy.md](package-policy.md)), dan gate rilis (lihat [release gates](../08-quality/release-gates.md)).

## 2. Cakupan yang Tidak Dapat Diubah Lewat Konsensus Biasa

Perubahan berikut **MUST** melalui RFC dan ADR baru, bukan sekadar persetujuan maintainer:

| Area | Batas |
|---|---|
| Platform | Web-only PWA. Tidak ada aplikasi native, Flutter, desktop bundle, atau webview native. |
| Backend | Tidak ada server aplikasi wajib, akun, atau cloud sync. |
| Identitas | Local identity otomatis; tidak ada login/register. |
| Data | SQLite WASM + OPFS di browser; tidak ada basis data server. |
| Distribusi | `.mapp` bertanda tangan; tidak ada marketplace, publish server, atau registry terfederasi. |
| Privasi | Tidak ada telemetry default; tidak ada upload tanpa aksi pengguna. |
| Desain | MADS v3 Clay; token `--mads-*` adalah kontrak. |

Menambahkan platform atau backend baru bukan keputusan rilis; itu perubahan produk yang mengubah PRD dan memerlukan ADR baru sesuai [ADR index](../01-architecture/adr/README.md).

## 3. Maintainer

### 3.1 Komposisi

- Council terdiri dari **3–7** maintainer aktif.
- Komposisi **MUST** mencakup minimal satu maintainer dengan fokus keamanan dan satu dengan fokus rilis.
- Masa jabatan 12 bulan, dapat diperpanjang; komposisi ditinjau setiap tahun dan dicatat di repositori.
- Maintainer yang tidak aktif selama 90 hari berturut-turut tanpa pemberitahuan dipindahkan ke status emeritus setelah satu kali konfirmasi.

### 3.2 Tanggung jawab

| Peran | Tanggung jawab |
|---|---|
| Release manager | Menjaga gate rilis, menjadwalkan rilis, memimpin rollback |
| Security maintainer | Menangani laporan privat, menyetujui perubahan CSP/sandbox/kripto |
| Docs maintainer | Menjaga checker dokumentasi, matrix, dan status implementasi |
| Design maintainer | Menjaga DESIGN.md, token clay, dan katalog komponen |
| Maintainer umum | Review PR, triage issue, kurasi template dan index statis |

### 3.3 Menjadi maintainer

Kandidat **MUST** memenuhi seluruh syarat:

1. Minimal 10 kontribusi bermakna yang sudah di-merge dalam 6 bulan terakhir.
2. Riwayat review yang menunjukkan pemahaman kontrak web-only.
3. Nominasi oleh satu maintainer dan persetujuan 2/3 council.
4. Tidak ada konflik kepentingan yang tidak diungkap.

Pencabutan status dilakukan lewat 2/3 suara council dengan alasan tertulis dan hak tanggapan.

## 4. Proses Keputusan

| Jenis keputusan | Mekanisme | Kuorum |
|---|---|---|
| Rutin (review, triage, patch) | Lazy consensus 72 jam; satu approval reviewer di luar penulis | Tidak ada |
| Perubahan perilaku terbatas | Lazy consensus 72 jam + minimal satu reviewer area | 2 maintainer |
| Struktural (platform, data, keamanan, lisensi, cakupan) | RFC + ADR + 2/3 suara council aktif | Mayoritas council |
| Darurat keamanan | Security maintainer + commander insiden; ratifikasi 72 jam | 1 security + 1 release |

- Lazy consensus berarti usul diterima bila tidak ada keberatan beralasan dalam 72 jam.
- Keberatan **MUST** menyebut risiko konkret dan usul alternatif; keberatan tanpa substansi dicatat tetapi tidak memblokir.
- Semua keputusan struktural dicatat dengan tautan diskusi, RFC, dan ADR.
- Bila suara seri, status quo dipertahankan sampai ada bukti atau RFC lanjutan.

## 5. Rilis

| Jenis | Irama | Syarat |
|---|---|---|
| Fitur (minor) | Setiap dua minggu | Seluruh gate rilis hijau, changelog terisi |
| Patch | Sesuai kebutuhan | Perbaikan terbatas, gate minimum hijau |
| Keamanan | Segera setelah verifikasi | Advisori, patch, dan uji regresi |

- Rilis **MUST** berasal dari commit di `main` dan artefak dipromosikan, bukan dibangun ulang, sesuai [deployment](../09-operations/deployment.md).
- Tidak ada hotfix langsung ke produksi tanpa commit di `main`.
- Versi mengikuti semver untuk paket `.mapp` dan manifest; versi aplikasi host dicatat di `/settings/about`.
- Setiap rilis mencantumkan SHA, perubahan yang terlihat pengguna, dan migrasi data bila ada.

## 6. Lisensi

- Proyek dilisensikan **Apache-2.0**. Berkas [LICENSE](../../LICENSE) adalah teks lisensi yang mengikat.
- Kontribusi **MUST** memakai DCO (`Signed-off-by`) untuk menyatakan hak kontribusi; tidak ada CLA.
- Tidak ada open-core, paywall, seat limit, atau fitur yang dikunci untuk edisi berbayar.
- Aset merek (nama, logo) tidak otomatis ikut lisensi kode; penggunaannya diatur kebijakan merek yang terpisah.
- Dependensi **MUST** kompatibel dengan Apache-2.0; lisensi kode sumber yang tidak kompatibel ditolak pada review.

## 7. Pendanaan

- Pendanaan diterima lewat sponsor individu/organisasi dan donasi umum; tidak ada sponsor yang mendapat fitur eksklusif, prioritas review, atau pengaruh atas keputusan keamanan.
- Penggunaan dana: biaya host, domain, sertifikat, alat CI, dan honor pemeliharaan.
- Laporan penggunaan dana diterbitkan setiap kuartal tanpa detail pribadi penyumbang.
- Sponsor **MUST NOT** diminta atau diizinkan menempatkan analitik, iklan, atau kode pelacakan di aplikasi.

## 8. Konflik Kepentingan

- Maintainer **MUST** mengungkap afiliasi komersial yang terkait paket, template, index statis, atau layanan AI.
- Maintainer yang memiliki kepentingan pada paket yang direview **MUST** mundur dari keputusan tersebut; pengganti ditunjuk council.
- Paket yang dibuat maintainer tidak mendapat perlakuan khusus pada review, verifikasi signature, atau kurasi index.
- Pengungkapan dicatat di repositori pada berkas kontributor; perubahan afiliasi dilaporkan dalam 30 hari.

## 9. Keamanan dan Pengungkapan

- Laporan kerentanan ditangani privat sesuai [SECURITY.md](../../SECURITY.md) dan [incident response](../09-operations/incident-response.md).
- Maintainer **MUST NOT** membuat pernyataan publik yang mengonfirmasi kerentanan sebelum mitigasi tersedia.
- Kredit pelapor diberikan bila diinginkan; pelapor tidak diminta menandatangani perjanjian kerahasiaan yang membatasi pengungkapan setelah perbaikan.

## 10. Verifikasi

| # | Pemeriksaan | Bukti |
|---|---|---|
| 1 | Komposisi council memenuhi 3–7 dan fokus keamanan/rilis | Catatan council |
| 2 | Setiap keputusan struktural memiliki RFC dan ADR | Tautan di tiket |
| 3 | Rilis berasal dari `main` dan memakai artefak yang dipromosikan | Catatan rilis |
| 4 | `LICENSE` Apache-2.0 dan commit membawa `Signed-off-by` | Pemeriksaan repo |
| 5 | Pengungkapan konflik kepentingan diperbarui ≤ 30 hari | Berkas kontributor |
| 6 | Tidak ada analitik/iklan pada build rilis | Pemeriksaan smoke test deploy |
