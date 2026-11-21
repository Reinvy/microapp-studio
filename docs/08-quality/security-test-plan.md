---
id: QA-SEC
title: Rencana Test Keamanan
status: accepted
owner: qa
prd_refs: ["§9", "§12"]
---

# Rencana Test Keamanan

Dokumen ini menetapkan test keamanan yang wajib dijalankan untuk MicroApp Studio web-only. Cakupan mengikuti aset dan ancaman pada [threat-model.md](../01-architecture/threat-model.md), requirement [SEC-001 sampai SEC-014](../03-specs/permissions.md), serta kontrak [03-sandbox-runtime.md](../03-specs/03-sandbox-runtime.md) dan [05-packages.md](../03-specs/05-packages.md). Test keamanan bersifat fail closed: bila kontrol tidak tersedia, hasil yang diharapkan adalah penolakan, bukan fallback.

## 1. Aset yang Dilindungi

| Aset | Lokasi | Dampak bila bocor atau rusak |
|---|---|---|
| Data micro-app | SQLite WASM di OPFS | Kehilangan data, kebocoran lintas app |
| Identitas lokal dan kunci tanda tangan | WebCrypto non-extractable | Package palsu, identitas tidak dapat dipulihkan |
| Vault dan BYOK | Vault lokal terenkripsi | Biaya AI, kebocoran kunci pengguna |
| Package `.mapp` | Impor/ekspor lokal | Eksekusi kode berbahaya, supply chain |
| Backup `.mapp-backup` | Berkas unduhan pengguna | Kebocoran seluruh data |
| Audit chain | SQLite host | Aktivitas sensitif tidak dapat dipercaya |
| DOM dan origin host | Halaman Next.js | XSS, pencurian sesi, aksi atas nama pengguna |

## 2. Aturan Eksekusi

1. Test berjalan pada origin lokal dengan build produksi. Tidak ada data, kunci, atau endpoint produksi.
2. Setiap test memakai konteks browser bersih dan storage terisolasi.
3. Kunci tanda tangan fixture diberi label `test-only` dan tidak boleh sama dengan kunci rilis.
4. Semua request eksternal diblokir; test yang membutuhkan endpoint lokal memakai server mock.
5. Bukti temuan disimpan di issue privat, bukan di PR publik atau dokumen ini. Dokumen ini hanya memuat skenario, bukan data sensitif.
6. Test keamanan tidak boleh dihapus atau di-skip untuk membuat gate hijau. Perbaikan dilakukan pada kode atau kontrak, bukan pada test.
7. Setiap test mencetak hasil yang dapat diperiksa: lolos, gagal, atau tidak dapat dijalankan beserta alasannya.

## 3. Matriks Test Keamanan

| # | Ancaman | Skenario uji | Ekspektasi | Requirement |
|---|---|---|---|---|
| 1 | Escape sandbox ke DOM induk | App di iframe memanggil `window.parent.document`, `top.location`, `window.opener`, dan mengirim `postMessage` palsu ke host | Akses lintas origin ditolak; DOM host tidak berubah; pesan tanpa protokol dan nonce diabaikan; app diisolasi | SEC-011 |
| 2 | Iframe mendapat origin host | Periksa atribut `sandbox`, akses cookie, `document.domain`, dan parameter URL yang membawa token | Iframe tetap opaque origin; cookie dan storage host tidak terbaca; token tidak ada di URL | SEC-010, SEC-011 |
| 3 | Bypass izin bridge | App memanggil method yang tidak dideklarasikan, belum di-grant, dan setelah revoke | Setiap panggilan ditolak sebelum efek samping; tidak ada data yang dikembalikan; percobaan tercatat di audit | SEC-001, SEC-003 |
| 4 | Pemalsuan consent | App merender dialog consent tiruan atau memanggil bridge saat overlay consent tidak aktif | Hanya overlay host yang menghasilkan grant; token consent sekali pakai; panggilan dari UI tiruan ditolak | SEC-003, SEC-014 |
| 5 | Bypass Offline Cage | Setelah cage aktif, app mencoba `fetch`, `XMLHttpRequest`, `WebSocket`, `sendBeacon`, dan `<img>` ke host eksternal | Semua kanal jaringan gagal dengan `E-NET-001`; tidak ada request keluar; UI menampilkan status offline | SEC-004 |
| 6 | Signature package dipalsukan | Ubah satu byte pada bundle, manifest, atau signature `.mapp` | Verifikasi gagal sebelum instalasi; tidak ada file yang ditulis ke OPFS; pengguna melihat alasan penolakan | SEC-005 |
| 7 | Public key berubah | Impor versi baru dengan `id` sama tetapi public key berbeda | Peringatan keras dan konfirmasi eksplisit; update tidak berjalan diam-diam; versi lama tetap dapat dipakai | SEC-006 |
| 8 | Zip traversal dan zip bomb | Arsip berisi `../../`, path absolut, backslash, entri duplikat, dan rasio dekompresi ekstrem | Arsip ditolak; tidak ada penulisan di luar direktori sementara; batas ukuran dan jumlah entri berlaku | SEC-005 |
| 9 | XSS melalui MUIP | Props teks berisi HTML, URL `javascript:`, SVG dengan script, dan style yang disuntikkan | Renderer meng-escape teks, menolak skema berbahaya, dan tidak mengeksekusi script; CSP memblokir sisanya | SEC-009, SEC-010 |
| 10 | Bypass CSP dan isolasi | Coba inline script, `eval`, `new Function`, `data:` script, dan komunikasi lintas origin tanpa header | Semua eksekusi ditolak; tidak ada `unsafe-inline` atau `unsafe-eval`; COOP/COEP tetap aktif | SEC-009, SEC-010 |
| 11 | Exfiltration storage | App membuka nama database app lain, memindai OPFS, dan membaca `localStorage` host | Hanya database miliknya yang dapat dibuka; OPFS host tidak terlihat; akses ditolak dan diaudit | SEC-001, SEC-014 |
| 12 | Kebocoran BYOK | Cari kunci AI di console, pesan error, audit, file ekspor, IndexedDB plaintext, dan request ke host di luar konfigurasi | Kunci hanya ada di vault terenkripsi; log dan error teredaksi; tidak ada request ke host tak dikenal | SEC-008 |
| 13 | Audit chain dirusak | Ubah, hapus, atau urutkan ulang entri audit, lalu jalankan verifikasi | Verifikasi rantai gagal dan UI menandai audit tidak valid; operasi sensitif berikutnya tetap tercatat | SEC-014 |
| 14 | Backup dibuka paksa | Passphrase salah, ciphertext diubah, checksum rusak, dan file terpotong | Dekripsi ditolak tanpa kebocoran; tidak ada restore sebagian; checksum dilaporkan | SEC-012 |
| 15 | Revoke saat app berjalan | Cabut izin ketika app sedang aktif, lalu panggil bridge lagi | Panggilan berikutnya langsung ditolak; app tidak mempertahankan akses lama | SEC-003, SEC-014 |
| 16 | Manifest berbahaya | Manifest memuat permission tidak dikenal, `assetsDir` dengan traversal, dan ukuran ekstrem | Manifest ditolak atau dinormalisasi; path keluar ditolak; permission tidak dikenal tidak pernah di-grant | SEC-002, SEC-005 |

Test 1–16 adalah suite minimum. Penambahan test dipersilakan selama memetakan ke SEC atau ancaman pada threat model.

## 4. Fixture dan Harness

| Fixture | Isi | Lokasi |
|---|---|---|
| `sandbox-probe` | App MUIP yang mencoba akses parent, network, storage, dan bridge ilegal | `e2e/fixtures/sandbox-probe` |
| `.mapp` valid | Package bertanda tangan kunci uji dengan manifest v2 | `e2e/fixtures/packages` |
| `.mapp` rusak | Varian signature, digest, traversal, duplikat, dan ukuran ekstrem | `e2e/fixtures/packages/invalid` |
| `.mapp-backup` | Backup valid, passphrase salah, checksum rusak, dan file terpotong | `e2e/fixtures/backups` |
| Vault dan BYOK | Kunci palsu `test-only`, endpoint mock lokal | `e2e/fixtures/vault` |

Harness E2E membuka app di iframe yang sama dengan produksi, memasang listener `page.on('request')` untuk mendeteksi request eksternal, dan menangkap `console` serta `pageerror`. Kegagalan harness yang membuat test tidak dapat dijalankan dicatat sebagai `blocked`, bukan `pass`.

## 5. Frekuensi dan Gate

| Tahap | Suite | Sifat |
|---|---|---|
| PR yang menyentuh sandbox, bridge, permission, package, kriptografi, atau backup | Test 1–16 yang relevan | Blokir |
| PR UI | XSS melalui MUIP, CSP, dan consent | Blokir |
| Nightly | Seluruh test 1–16 + fuzz parser manifest, ZIP, dan backup | Blokir merge rilis |
| Release | Seluruh suite pada build yang akan dideploy | Blokir |
| Setelah insiden | Test regresi untuk akar masalah | Blokir sampai lulus |

Tidak ada pengecualian untuk gate keamanan. Bila lingkungan tidak mendukung sebuah test, statusnya `blocked` dan rilis ditahan sampai test dijalankan pada lingkungan yang valid.

## 6. Klasifikasi Temuan dan Respons

| Tingkat | Contoh | Respons |
|---|---|---|
| Kritis | Escape sandbox, eksekusi kode dari package, kebocoran kunci | Hentikan rilis, rotasi kunci, rollback deployment, buka insiden |
| Tinggi | Bypass izin, signature tidak diverifikasi, BYOK bocor | Blokir rilis; perbaiki sebelum merge |
| Sedang | Pesan error membocorkan path, audit tidak lengkap | Perbaiki dalam sprint berjalan; catat risiko |
| Rendah | Perbedaan pesan, hardening tambahan | Masuk backlog dengan alasan |

Pelaporan kerentanan dari luar mengikuti [SECURITY.md](../../SECURITY.md). Penanganan insiden mengikuti [incident-response.md](../09-operations/incident-response.md). Temuan tidak boleh ditutup tanpa test regresi yang gagal sebelum perbaikan dan lulus sesudahnya.

## 7. Verifikasi

1. Jalankan suite keamanan melalui `npm run e2e` dengan tag keamanan.
2. Jalankan `npm test` untuk unit kriptografi, validasi manifest, dan parser path.
3. Jalankan `cargo test --manifest-path packages/core-rust/Cargo.toml` untuk signature dan digest.
4. Jalankan fuzz parser pada nightly; kegagalan MUST menghasilkan fixture regresi.
5. Catat hasil pada [baseline.md](evidence/baseline.md) melalui `npm run verify:web`; lihat [evidence/README.md](evidence/README.md).
6. Periksa tidak ada request eksternal, secret di log, atau file di luar direktori sementara.

Hasil keamanan bukan bukti tunggal status `implemented`. Requirement tetap memerlukan test fungsional dan bukti pada [prd-compliance-matrix.md](../00-foundation/prd-compliance-matrix.md). Gate rilis yang memakai suite ini ada di [release-gates.md](release-gates.md).
