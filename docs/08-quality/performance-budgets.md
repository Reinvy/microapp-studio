---
id: QA-PERF
title: Budget Performa
status: accepted
owner: qa
prd_refs: ["§9", "§12"]
---

# Budget Performa

Dokumen ini menetapkan budget performa yang mengikat untuk PWA MicroApp Studio dan cara mengukurnya. Budget diturunkan dari requirement [NFR-PERF-001 sampai NFR-PERF-005](../03-specs/nfr.md) dan [NFR-REL-001](../03-specs/nfr.md). Angka di dokumen ini adalah kontrak; implementasi yang melewati budget tidak boleh dinyatakan selesai.

## 1. Prinsip

1. **Ukur di browser nyata.** Budget berlaku pada Chromium stabil dengan build produksi, bukan dev server.
2. **Mobile-first.** Angka utama diukur dengan preset mobile Lighthouse dan throttling jaringan/CPU, karena mayoritas pengguna membuka dari ponsel.
3. **p75, bukan rata-rata.** Kelulusan memakai persentil ke-75 dari beberapa run agar satu run cepat tidak menutupi regresi.
4. **Tidak ada animasi layout mahal.** Efek clay hanya `box-shadow`, `transform`, `opacity`, dan `filter` ringan; animasi yang memicu layout atau paint luas dianggap regresi.
5. **Offline setara online.** Shell yang tersimpan di cache tidak boleh lebih lambat dari batas yang sama.
6. **Budget tidak dinaikkan diam-diam.** Perubahan angka MUST melalui PR yang menyebut alasan, dampak, dan persetujuan pada [governance.md](../10-contributing/governance.md).

## 2. Perangkat dan Kondisi Ukur

| Parameter | Nilai |
|---|---|
| Browser | Chromium stabil yang dipakai Playwright |
| Build | `npm run build` mode produksi |
| Jaringan | Lighthouse mobile preset: latensi 150 ms, throughput 1.6 Mbps, cache kosong |
| CPU | Throttle 4× untuk pengukuran mobile |
| Cache | Cold cache untuk kunjungan pertama; warm cache untuk pengukuran shell offline |
| Viewport | Mobile 390×844, tablet 834×1112, desktop 1440×900 |
| Lokasi | Origin lokal; tidak ada CDN, font, atau gambar eksternal |

Perangkat referensi rendah MUST diuji sebelum rilis: emulasi CPU 4× dan memori terbatas. Hasil pada perangkat ini tidak boleh melewati budget yang sama.

## 3. Budget Inti

| Metrik | Budget | Cakupan | Metode | Gate |
|---|---|---|---|---|
| LCP | < 2.0 s | Route `/`, `/templates`, `/packages`, `/settings` | Lighthouse CI, p75 mobile | Blokir rilis |
| INP | < 200 ms | Interaksi Home, create, builder, consent | PerformanceObserver di Playwright + Lighthouse timespan | Blokir rilis |
| CLS | < 0.1 | Semua route shell dan builder | Lighthouse CI, p75 | Blokir rilis |
| Initial JS | < 250 KB gzip | JavaScript awal untuk route pertama | Laporan `next build` + analisis chunk | Blokir rilis |
| Builder interaction | < 50 ms | Tambah, pilih, pindah, edit teks, undo/redo | React Profiler commit + long task | Blokir rilis |
| Offline shell start | Setelah satu kunjungan, tanpa jaringan; LCP offline < 2.0 s | `/`, `/settings`, app terpasang | Playwright offline context | Blokir rilis |

Angka ini konsisten dengan [nfr.md](../03-specs/nfr.md). Bila ada perbedaan, `nfr.md` adalah sumber requirement dan dokumen ini adalah metode pengukurannya; keduanya MUST diperbarui bersamaan.

## 4. Metode Pengukuran

### 4.1 Lighthouse CI

- Jalankan lima kali per route, ambil p75 untuk LCP dan CLS.
- Assertion memakai budget pada §3; kegagalan assertion memblokir.
- Lighthouse dijalankan pada build produksi yang dilayani origin lokal, bukan `next dev`.
- Cache dan service worker dinonaktifkan untuk pengukuran kunjungan pertama; pengukuran offline memakai konteks terpisah.
- Hasil disimpan sebagai artefak CI dan dirangkum pada [baseline.md](evidence/baseline.md).

### 4.2 Laporan `next build`

- `npm run build` mencetak ukuran First Load JS per route. Angka yang dihitung adalah JavaScript awal yang diunduh untuk route pertama, sudah digzip.
- Chunk builder dan editor JSON dimuat lazy dan tidak dihitung sebagai initial JS, tetapi tetap memiliki batas terpisah: tidak boleh dimuat pada Home.
- Setiap PR yang menambah dependensi MUST menyertakan selisih ukuran pada deskripsi PR.
- Analisis bundle memakai laporan bawaan Next.js; tidak ada alat yang mengunggah data keluar.

### 4.3 React Profiler

- Builder dibungkus `<Profiler>` pada canvas dan inspector.
- Operasi yang diukur: tambah komponen, pilih komponen, pindah urutan, edit teks inline, ubah style, undo, dan redo.
- Setiap operasi diulang minimal 20 kali; median dan p95 dicatat. Budget 50 ms berlaku pada p95.
- Profil yang melewati budget MUST disertai analisis penyebab (render berlebih, state global, atau layout sinkron).

### 4.4 Playwright dan PerformanceObserver

- INP diukur dari interaksi nyata di E2E: klik tombol Buat, ketik di search, tambah komponen, buka consent, dan tutup sheet.
- LCP dan CLS juga direkam lewat `PerformanceObserver` pada konteks E2E untuk memastikan nilai lab konsisten dengan build yang diuji.
- Offline shell start diukur dengan `context.setOffline(true)` setelah kunjungan pertama, lalu navigasi ke route shell; waktu dihitung sampai konten utama terlihat.
- Test performa tidak memakai `waitForTimeout`; semua pengukuran memakai performance entry.

## 5. Anggaran per Area

| Area | Aturan |
|---|---|
| Shell dan Home | Tidak memuat chunk builder, editor, atau media berat. Pencarian memakai indeks lokal, bukan request jaringan. |
| Builder | Canvas dan inspector dimuat setelah route builder dibuka. Drag dan edit tidak memicu render seluruh pohon. |
| Runtime app | Iframe dimuat hanya saat app dibuka. MUIP merender node ringan tanpa pustaka UI berat. |
| Package | Verifikasi signature dan hash berjalan di worker; UI tidak memblokir selama verifikasi. |
| Backup | Enkripsi dan kompresi berjalan di worker; progres ditampilkan tanpa membekukan halaman. |
| Pengaturan | Halaman sederhana tanpa dependensi baru; tema diterapkan lewat token, bukan render ulang penuh. |

Aturan implementasi yang mendukung budget ini ada di [design-system.md](../02-design/design-system.md) dan [interaction-patterns.md](../02-design/interaction-patterns.md).

## 6. Builder Interaction

Builder adalah permukaan paling interaktif, sehingga diukur terpisah:

- Setiap operasi wajib selesai < 50 ms pada p95 perangkat referensi.
- Autosave 500 ms MUST berjalan di luar commit render kritis; status simpan tidak boleh menyebabkan render canvas.
- Undo/redo 100 langkah MUST menyimpan snapshot ringan, bukan menyalin seluruh dokumen pada setiap ketikan.
- Preview di iframe tidak boleh menghambat input builder; pesan bridge diproses asinkron.
- Bila operasi melewati budget, ukur ulang dengan React Profiler sebelum menambah optimasi. Optimasi tanpa bukti pengukuran tidak diterima.

## 7. Enforcement di CI

| Tahap | Pemeriksaan | Sifat |
|---|---|---|
| PR | Laporan ukuran `next build`, perbandingan dengan baseline | Blokir bila melewati 250 KB gzip |
| PR | React Profiler untuk perubahan builder | Blokir bila p95 ≥ 50 ms |
| Nightly | Lighthouse CI untuk LCP, CLS, INP | Blokir merge rilis bila gagal |
| Nightly | Playwright offline start | Blokir merge rilis bila gagal |
| Release | Seluruh budget §3 pada build yang akan dideploy | Blokir |

Ambang diambil dari dokumen ini, bukan ditulis ulang di konfigurasi. CI membaca nilai yang sama atau memakai konstanta yang dirujuk ke dokumen ini. Perubahan ambang tanpa perubahan dokumen dianggap kegagalan review.

## 8. Regresi dan Pengecualian

- Regresi yang melewati budget memblokir. Tidak ada "lulus dengan catatan" untuk LCP, INP, CLS, initial JS, atau builder interaction.
- Pengecualian hanya untuk lingkungan pengukuran yang tidak representatif (misalnya runner CI kelebihan beban), dan MUST disertai run ulang pada perangkat referensi.
- Pengecualian dicatat di PR dengan angka sebelum/sesudah dan disetujui reviewer performa.
- Penurunan budget (angka diperketat) dipersilakan; kenaikan budget memerlukan persetujuan governance dan pembaruan [nfr.md](../03-specs/nfr.md).

## 9. Verifikasi

1. Jalankan `npm run build` dan catat ukuran initial JS.
2. Jalankan Lighthouse CI pada route shell dan builder.
3. Jalankan suite performa Playwright untuk INP dan offline start.
4. Jalankan React Profiler pada operasi builder yang berubah.
5. Tulis hasil ke evidence melalui `npm run verify:web`; lihat [evidence/README.md](evidence/README.md) dan [baseline.md](evidence/baseline.md).
6. Bandingkan dengan budget §3. Status `pass` hanya diberikan bila seluruh metrik wajib berada di bawah budget.

Gate rilis yang memakai budget ini didefinisikan di [release-gates.md](release-gates.md). Bukti performa bukan pengganti test fungsional; keduanya wajib ada sebelum status `implemented` diberikan pada [prd-compliance-matrix.md](../00-foundation/prd-compliance-matrix.md).
