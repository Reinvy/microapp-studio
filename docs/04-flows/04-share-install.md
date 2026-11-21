---
id: FLOW-04
title: Share dan Install
status: accepted
owner: registry
prd_refs: ["§4 User Journey", "§5 F5"]
---

# Share dan Install

## 1. Tujuan

Menetapkan alur berbagi micro-app sebagai file `.mapp` bertanda tangan dan pemasangannya di perangkat lain, tanpa server, akun, atau publish pipeline.

Requirement utama: `FR-PACK-005`.

## 2. Aktor dan Prasyarat

Aktor: Template Author (pembuat) dan Reviewer (penerima). Prasyarat: draft valid dan signing key tersedia. Untuk instalasi: file `.mapp` atau URL index statis.

## Alur Utama

### 3.1 Berbagi

1. Pengguna menekan **Bagikan** di builder.
2. Sheet menampilkan nama, versi, ikon, ringkasan permission, ukuran, dan checksum.
3. Aksi utama **Unduh .mapp** membuat ZIP deterministik dengan manifest v2 dan signature Ed25519.
4. Aksi sekunder: **Salin link** bila index statis dikonfigurasi, dan **Ekspor JSON** untuk inspeksi.
5. File terunduh; checksum ditampilkan untuk verifikasi manual.

### 3.2 Instalasi

1. Penerima membuka `/packages` dan memilih **Impor .mapp** atau men-drop file.
2. Host memvalidasi layout, manifest, digest, dan signature.
3. Ringkasan package dan preview permission ditampilkan.
4. Penerima menekan **Pasang**.
5. App ditulis ke OPFS dan muncul di Home.
6. Penerima dapat langsung membuka app; consent JIT berjalan saat permission pertama dipakai.

### 3.3 Index Statis Opsional

1. Di Settings → Packages, penerima menambahkan URL index dan public key.
2. Host memuat index read-only dan menampilkan daftar app.
3. Setiap instalasi tetap memverifikasi file secara lokal.

## Cabang Gagal

| Kondisi | Perilaku |
|---|---|
| Signing key tidak tersedia | `E-PACK-002`, tombol **Atur identitas**. |
| Manifest/layout invalid | `E-PACK-001`, field bermasalah disebutkan. |
| Digest mismatch | `E-PACK-003`, sarankan unduh ulang. |
| Public key berubah | Peringatan keras, impor diblokir sampai disetujui. |
| Versi lebih rendah | `E-PACK-004`, konfirmasi eksplisit diperlukan. |
| Kuota penuh | `E-DATA-002`, tawarkan ekspor dan bersihkan cache. |
| Index tidak dapat dimuat | Tetap dapat impor file manual; index bukan prasyarat. |

## Acceptance Criteria

1. Pack deterministik: dua unduhan dari draft sama menghasilkan hash sama.
2. File tanpa signature valid tidak dapat dipasang.
3. Preview permission tampil sebelum instalasi dan dapat dibatalkan.
4. Tidak ada upload ke server dan tidak ada akun.
5. Index statis tidak memberi hak tulis atau kepercayaan otomatis.

## Verifikasi

| Pemeriksaan | Cara |
|---|---|
| Pack | `mapp-tool pack` dua kali, bandingkan hash. |
| Verifikasi | `mapp-tool verify` pada fixture valid dan rusak. |
| Install | Playwright: impor fixture, preview, pasang, app muncul. |
| Key mismatch | Vitest: key berbeda, impor diblokir. |
| Tanpa jaringan | Playwright: impor file lokal tanpa request. |
| Index | Vitest: index valid dimuat; URL invalid diabaikan. |

## 7. Referensi

- [05-packages.md](../03-specs/05-packages.md)
- [package-distribution.md](../01-architecture/package-distribution.md)
- [package-policy.md](../10-contributing/package-policy.md)
