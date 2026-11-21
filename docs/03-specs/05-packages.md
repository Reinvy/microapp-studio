---
id: SPEC-PACK
title: Packages
status: accepted
owner: registry
prd_refs: ["§5 F5", "§8 Data dan Privasi"]
---

# Packages

## 1. Tujuan

Menetapkan kontrak distribusi micro-app: layout `.mapp`, manifest v2, signature Ed25519, verifikasi digest, impor, instalasi, update, rollback, index statis opsional, preview permission, dan uninstall. Distribusi web-only tanpa server registry, publish pipeline, atau marketplace.

## 2. Ruang Lingkup

Di dalam: format `.mapp`, manifest, signature, verifikasi, import/install, update/rollback, index statis, uninstall. Di luar: backup ([06-backup.md](06-backup.md)), sandbox ([03-sandbox-runtime.md](03-sandbox-runtime.md)), kebijakan komunitas ([package-policy.md](../10-contributing/package-policy.md)).

## 3. Requirement

| ID | Level | Requirement | Acceptance |
|---|---|---|---|
| FR-PACK-001 | MUST | Manifest v2 divalidasi terhadap schema sebelum langkah lain. | Manifest invalid ditolak dengan field yang salah disebutkan. |
| FR-PACK-002 | MUST | `.mapp` adalah ZIP deterministik dengan `microapp.manifest.json` di root. | Dua pack dari input sama menghasilkan hash sama. |
| FR-PACK-003 | MUST | Signature Ed25519 detached disertakan dan diverifikasi dengan public key. | Signature salah menggagalkan impor. |
| FR-PACK-004 | MUST | Digest setiap entri dan content hash keseluruhan diverifikasi. | Perubahan satu byte menggagalkan verifikasi. |
| FR-PACK-005 | MUST | File `.mapp` diverifikasi penuh sebelum instalasi dijalankan. | Tidak ada eksekusi node sebelum verifikasi selesai. |
| FR-PACK-006 | MUST | Preview permission ditampilkan sebelum instalasi. | Daftar permission dan risk tier terlihat; pengguna dapat batal. |
| FR-PACK-007 | MUST | Instalasi menulis manifest dan asset ke OPFS lalu mendaftarkan app di Home. | App muncul setelah instalasi tanpa reload. |
| FR-PACK-008 | MUST | Update memeriksa versi dan menolak downgrade tanpa konfirmasi eksplisit. | Versi lebih rendah meminta konfirmasi. |
| FR-PACK-009 | MUST | Rollback mengembalikan versi sebelumnya yang tersimpan lokal. | Dua versi terakhir dapat dipilih. |
| FR-PACK-010 | MUST | Index statis read-only opsional dapat ditambahkan lewat Settings. | Index dimuat, ditampilkan, dan tidak menulis apa pun ke sumber. |
| FR-PACK-011 | MUST | Perubahan public key untuk app yang sama memicu peringatan keras. | Impor diblokir sampai pengguna menyetujui key baru. |
| FR-PACK-012 | MUST | Uninstall menghapus app dan menawarkan ekspor data sebelum hapus. | Ekspor tersedia; hapus data hanya setelah konfirmasi. |

Error yang mengikat: `E-PACK-001` untuk manifest/layout invalid, `E-PACK-002` untuk signature atau key tidak tersedia, `E-PACK-003` untuk digest mismatch, `E-PACK-004` untuk versi/rollback yang tidak valid.

## 4. Layout `.mapp`

| Entri | Wajib | Aturan |
|---|---|---|
| `microapp.manifest.json` | Ya | Manifest v2 tervalidasi. |
| `bundle/index.js` | Ya | Entry yang dideklarasikan manifest; tanpa import eksternal. |
| `assets/` | Tidak | Hanya aset statis; tidak ada HTML yang dieksekusi. |
| `signature.ed25519` | Ya | Signature detached atas canonical manifest + digest bundle. |
| `LICENSE` | Tidak | Ditampilkan di detail package bila ada. |

ZIP deterministik: urutan entri stabil, timestamp tetap `1980-01-01T00:00:00Z`, mode file konstan, tanpa komentar arsip, dan kompresi deflate level tetap.

## 5. Alur Verifikasi

1. Baca ZIP dan tolak path traversal, entri duplikat, atau entri di luar layout.
2. Parse manifest dan validasi schema.
3. Hitung digest tiap entri dan bandingkan dengan manifest `integrity`.
4. Verifikasi signature dengan public key yang tersimpan atau yang disetujui pengguna.
5. Tampilkan preview permission dan ukuran.
6. Tulis ke OPFS secara atomik lalu daftarkan app.

Setiap langkah gagal menutup alur tanpa menulis apa pun. Kode error dipetakan ke langkah yang gagal dan ditampilkan bersama aksi pemulihan.

## 6. Index Statis

Index adalah JSON read-only berisi `id`, `version`, `url`, `sha256`, `signature`, dan `permissions`. Menambahkan index tidak memberi hak istimewa: setiap unduhan tetap diverifikasi lokal. Tidak ada endpoint tulis, tidak ada akun, dan tidak ada metadata penggunaan yang dikirim.

## 7. Acceptance Criteria

1. Pack deterministik menghasilkan hash identik pada dua mesin.
2. Manifest invalid, signature salah, dan digest mismatch masing-masing ditolak dengan kode yang tepat.
3. Permission preview muncul sebelum instalasi dan dapat dibatalkan.
4. Update menolak downgrade tanpa konfirmasi; rollback berhasil.
5. Perubahan public key memblokir impor sampai disetujui.

## 8. Verifikasi

| Pemeriksaan | Cara |
|---|---|
| Determinisme | `mapp-tool pack` dua kali, bandingkan SHA-256. |
| Signature | `mapp-tool verify` pada fixture valid dan rusak. |
| Digest | Vitest: ubah satu byte bundle, harapkan `E-PACK-003`. |
| Permission preview | Playwright: impor fixture, cek sheet sebelum install. |
| Rollback | Vitest: install v2, rollback ke v1, cek manifest aktif. |
| Key mismatch | Vitest: public key berbeda, harapkan blokir dan peringatan. |
