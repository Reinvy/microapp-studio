---
id: QA-PERF
title: Budget Performa
status: accepted
owner: qa
prd_refs: ["§1.3", "§6"]
---

# Budget Performa

Dokumen ini menetapkan budget performa yang mengikat, metode pengukuran, perangkat referensi, dan ambang CI. Angka pada [03-specs/nfr.md](../03-specs/nfr.md) adalah kontrak produk; dokumen ini menambahkan prosedur dan budget internal yang diperlukan agar kontrak tersebut dapat dibuktikan sebelum rilis.

## 1. Tujuan dan Ruang Lingkup

- Menjadikan setiap target PRD §1.3 dan §6 dapat diukur dengan prosedur yang sama di lokal, CI, dan perangkat referensi.
- Mencegah regresi performa masuk melalui PR tanpa terdeteksi.
- Menetapkan budget query SQLite, memori server, dan ukuran bundle yang tidak dinyatakan sebagai NFR terpisah tetapi memengaruhi target pengguna.

Di luar lingkup: kapasitas cluster skala besar dan benchmark hardware di luar perangkat referensi.

## 2. Perangkat Referensi dan Build

| Konteks | Perangkat referensi | Build |
|---|---|---|
| Mobile | Android mid-range, 4 GB RAM, penyimpanan UFS 2.2, layar 60 Hz | Release, R8/minify aktif, tanpa debugger |
| Desktop | Laptop 8 GB RAM, 4 core, SSD | Release |
| Web | Chromium stabil terbaru pada laptop referensi, profil bersih, tanpa ekstensi | Production build, service worker aktif |
| Server | VPS 1 vCPU, 512 MB RAM, SSD | Binary Go release, SQLite WAL |

Aturan:

- Pengukuran MUST memakai build release/production; hasil build debug tidak boleh diklaim sebagai bukti.
- Perangkat MUST dalam keadaan dingin setelah reboot atau force-stop, kecuali untuk pengukuran warm.
- Thermal throttling MUST dicatat; bila terjadi, ulangi setelah perangkat dingin.
- Setiap hasil MUST menyertakan versi commit, versi host, model perangkat, dan konfigurasi.

## 3. Budget

| Metrik | Target | Requirement | Metode | Ambang CI |
|---|---|---|---|---|
| Cold start micro-app | p95 < 150 ms | NFR-PERF-001 | Tap ikon sampai frame pertama, 20 run | Gagal bila p95 > 150 ms |
| Warm switch | p95 < 50 ms | NFR-PERF-002 | Pindah antar dua app dengan state, 20 run | Gagal bila p95 > 50 ms |
| First render Host | p95 < 500 ms | NFR-PERF-003 | Launch sampai frame Home, 20 run | Gagal bila p95 > 500 ms |
| Frame time | p99 < 16,7 ms (60 FPS) atau < 8,3 ms (120 FPS) | NFR-PERF-004 | Profiler frame timeline pada interaksi umum | Gagal bila ada frame > 32 ms berulang |
| Sync latency | p95 < 100 ms per mutasi, LAN/self-host | NFR-PERF-005 | 1.000 mutasi, timestamp kirim sampai ACK | Gagal bila p95 > 100 ms |
| Server Lite | 20 pengguna aktif, RSS < 512 MB | NFR-PERF-006 | Beban 1 jam pada 1 vCPU/512 MB | Gagal bila OOM atau RSS ≥ 512 MB |
| Installer mobile | < 35 MB per arsitektur | NFR-SIZE-001 | Ukuran artefak rilis `arm64-v8a`, `armeabi-v7a` | Gagal bila melebihi |
| Installer desktop | < 45 MB per platform | NFR-SIZE-002 | Ukuran artefak Linux/Windows/macOS | Gagal bila melebihi |
| Binary server | < 30 MB | NFR-SIZE-003 | Ukuran binary Go terkompilasi | Gagal bila melebihi |
| Deploy self-host | < 2 menit | PRD §8 Fase 5 | Waktu dari perintah mulai sampai health check hijau di VPS 512 MB | Gagal bila > 2 menit |
| Kuota memori micro-app | 128 MB mobile, 512 MB desktop | FR-SBX-014 | RSS isolate saat beban sintetis | Gagal bila kuota tidak ditegakkan |
| Watchdog freeze | Deteksi ≤ 5 detik | FR-SBX-016 | Loop tak terbatas buatan | Gagal bila isolate tidak dihentikan |

Budget internal (bukan requirement produk, tetapi mengikat untuk PR):

| Metrik | Budget | Alasan |
|---|---|---|
| Initial JS route Host | ≤ 300 KiB gzip | Menjaga first render < 500 ms pada jaringan lambat |
| Bundle route Studio | ≤ 600 KiB gzip, dimuat lazy | Monaco dan editor tidak boleh membebani Home |
| Font UI | Subset Latin + Latin Extended, ≤ 120 KiB total | Font dibundel lokal, tanpa CDN |
| Query SQLite point lookup | p95 < 5 ms | Interaksi daftar dan detail |
| Query SQLite range 1.000 baris | p95 < 20 ms | Scroll dan filter |
| Query SQLite agregat 100.000 baris | p95 < 50 ms | Laporan dan widget |
| Query FTS5 | p95 < 50 ms untuk 50.000 dokumen | Omni-search |
| Query lambat | > 50 ms dicatat di DevTools | Sesuai FR-DEV-003 |
| Migrasi schema per app | p95 < 2 detik, di luar snapshot | Startup tidak terasa menggantung |
| RSS server idle | < 64 MB | Memberi ruang untuk beban dan cache |

## 4. Prosedur Pengukuran

### 4.1 Cold dan warm start

1. Force-stop aplikasi dan bersihkan cache proses (bukan data).
2. Catat timestamp sebelum tap ikon dan timestamp frame pertama yang dirender.
3. Ulangi 20 kali; buang 3 pengukuran pertama sebagai pemanasan.
4. Laporkan p50, p95, dan p99. Gate memakai p95.
5. Untuk warm switch, buka app A, pindah ke app B, kembali ke A, dan ukur restore state.

### 4.2 FPS dan frame drop

1. Aktifkan frame timeline (Chrome DevTools atau Flutter DevTools).
2. Jalankan skenario interaksi: scroll daftar panjang, buka dialog, drag di canvas, animasi transisi.
3. Kumpulkan frame time minimal 10 detik per skenario.
4. Laporkan p99 frame time dan jumlah frame > 32 ms.
5. Uji ulang dengan `prefers-reduced-motion` aktif; animasi menjadi 0 ms tanpa kehilangan informasi.

### 4.3 Latensi sync

1. Siapkan dua peer pada LAN referensi atau satu peer + server Lite.
2. Hasilkan 1.000 mutasi CRDT dari satu peer.
3. Catat waktu enqueue, waktu ciphertext dikirim, dan waktu ACK diterima.
4. Laporkan p50/p95 dan jumlah retry. Gate memakai p95 < 100 ms.
5. Ulangi dengan packet loss 5% untuk memastikan backoff tidak menggandakan mutasi.

### 4.4 Memori dan ukuran

- Memori micro-app diukur dari RSS isolate setelah 60 detik beban sintetis dan saat mendekati kuota; peringatan 80% MUST muncul tepat satu kali per siklus.
- Memori server diukur dengan `ps`/cgroup selama uji beban 20 pengguna; nilai puncak dan p95 dicatat.
- Ukuran artefak diukur dari file rilis final, bukan dari folder build.
- Bundle web diukur dengan laporan build production (gzip dan brotli).

### 4.5 Deploy dan health

1. Sediakan VPS 1 vCPU/512 MB bersih.
2. Jalankan prosedur instalasi yang didokumentasikan di [selfhost-runbook](../09-operations/selfhost-runbook.md) setelah dokumen tersebut tersedia.
3. Catat waktu sampai endpoint health melaporkan seluruh dependency siap.
4. Ulangi tiga kali; gate memakai median dan maksimum < 2 menit.

## 5. Budget Query SQLite

| Operasi | Budget p95 | Indeks wajib |
|---|---|---|
| Point lookup berdasarkan primary key | < 5 ms | PK |
| Range 1.000 baris dengan filter | < 20 ms | Index pada kolom filter + urutan |
| Agregat 100.000 baris | < 50 ms | Index covering bila memungkinkan |
| FTS5 50.000 dokumen | < 50 ms | FTS5 |
| Pencarian vektor 10.000 vektor | < 100 ms | `sqlite-vec` |
| Tulis satu baris + mutation log | < 10 ms | PK + index HLC |

Aturan:

- Query di atas 50 ms MUST muncul di DevTools dengan durasi, tabel, dan rencana query (FR-DEV-003).
- Query tanpa index yang menyentuh lebih dari 10.000 baris MUST ditolak pada review.
- `EXPLAIN QUERY PLAN` MUST disertakan pada PR yang menambah query baru di jalur panas.
- Budget diukur pada database dengan ukuran realistis (minimal 100.000 baris untuk tabel utama), bukan database kosong.
- Rebuild index FTS5 atau vektor MUST diuji pada dataset referensi dan tidak boleh memblokir UI lebih dari 2 detik; bila lebih, jalankan di Worker.

## 6. Budget Server

| Metrik | Budget | Catatan |
|---|---|---|
| RSS Lite, 20 pengguna, 1 jam | < 512 MB (NFR-PERF-006) | Tanpa OOM; GC Go tidak boleh menyebabkan lonjakan > 20% |
| RSS idle | < 64 MB | Setelah warm-up dan tanpa beban |
| Waktu respons API p95 | < 100 ms | Endpoint metadata, bukan transfer blob |
| Waktu unggah blob 8 MiB | < 2 detik pada LAN | Termasuk checksum |
| Waktu mulai server | < 3 detik | Tanpa migrasi tertunda |
| Waktu migrasi DB | < 60 detik | Dengan rollback tersedia |
| Koneksi DB | ≤ 20 pada Lite | Menghindari kehabisan file descriptor |
| Throughput sync | ≥ 500 mutasi/batch, 8 MiB | Sesuai FR-SYNC-011 |

Server MUST menolak unggahan baru dan melaporkan degraded saat storage penuh, bukan crash (E-SRV-003).

## 7. CI dan Regresi

- Benchmark performa berjalan pada runner khusus dengan spesifikasi tetap; runner umum hanya untuk smoke.
- Setiap hasil disimpan sebagai JSON (commit, metrik, p50/p95/p99, perangkat) selama 90 hari.
- Gate PR: regresi p95 > 10% terhadap baseline cabang utama menghasilkan warning wajib dijawab; regresi > 20% atau melewati target absolut menggagalkan gate.
- Gate nightly: seluruh metrik target diukur; kegagalan membuat issue otomatis ke pemilik modul.
- Gate rilis: seluruh metrik wajib lulus pada perangkat referensi, dan hasilnya dilampirkan pada catatan rilis.
- Perubahan yang mengubah baseline MUST dijelaskan di PR dan disetujui `qa`; baseline tidak boleh diperbarui hanya agar gate hijau.

## 8. Profiling dan Artefak

| Kebutuhan | Alat | Artefak |
|---|---|---|
| Web start/render | Chrome DevTools Performance, Lighthouse | Trace JSON + screenshot timeline |
| Flutter | Flutter DevTools, `flutter drive` timeline | Timeline JSON + log |
| Rust core | `criterion` | Laporan benchmark HTML/JSON |
| Go server | `pprof` (CPU, heap, goroutine) | Profil + grafik RSS |
| SQLite | `EXPLAIN QUERY PLAN`, DevTools query inspector | Rencana query + durasi |
| Memori isolate | Profiler platform | Grafik RSS + waktu peringatan |

Prosedur umum:

1. Reproduksi dengan skenario yang tercatat (langkah, data, perangkat).
2. Ambil profil sebelum perubahan sebagai baseline.
3. Identifikasi bottleneck terbesar (bukan yang paling mudah diperbaiki).
4. Perbaiki satu variabel, ukur ulang dengan prosedur yang sama.
5. Lampirkan sebelum/sesudah pada PR. Klaim perbaikan tanpa pengukuran ulang ditolak.

## 9. Referensi

- [03-specs/nfr.md](../03-specs/nfr.md), [03-specs/08-devtools-cli-sdk.md](../03-specs/08-devtools-cli-sdk.md)
- [01-architecture/system-overview.md](../01-architecture/system-overview.md), [01-architecture/sandbox-capabilities.md](../01-architecture/sandbox-capabilities.md)
- [test-strategy.md](test-strategy.md), [release-gates.md](release-gates.md), [definition-of-done.md](definition-of-done.md)
