---
id: ADR-0020
title: "ADR-0020: Format Paket .mapp dan Signature"
status: accepted
owner: architecture
prd_refs: ["§5", "§8"]
---

# ADR-0020: Format Paket .mapp dan Signature

## Konteks

Micro-app dibagikan sebagai berkas, bukan melalui marketplace atau server publikasi. Penerima harus dapat memverifikasi asal dan integritas paket sebelum memasangnya, tanpa menghubungi layanan pusat. Format harus deterministik agar digest stabil, dapat diperiksa ulang, dan kompatibel dengan verifikasi di WASM.

Kebutuhan yang mengikat:

1. Paket adalah satu berkas yang dapat diunduh, disimpan, dan dipindahkan.
2. Integritas isi dan identitas penanda tangan dapat diverifikasi secara offline.
3. Instalasi tidak pernah menjalankan isi paket sebelum verifikasi selesai.
4. Tidak ada publish pipeline, akun, atau server registry wajib.

## Keputusan

1. Paket memakai ekstensi **`.mapp`** dengan isi **ZIP deterministik**: urutan entri tetap, timestamp dinormalkan, mode berkas tetap, dan tidak ada entri direktori opsional.
2. Setiap paket memuat `microapp.manifest.json` versi **schema v2** dengan field wajib `schemaVersion`, `id`, `name`, `version`, `entry.bundle`, `assetsDir`, `integrity`, `signature`, `offline`, `permissions`, `capabilities`, dan `ui`. Nilai `ui.engine` adalah `muip-web`.
3. **Signature Ed25519 detached** dihitung atas digest manifest yang sudah final. Public key pengirim disertakan pada manifest sebagai referensi; verifikasi memakai implementasi di `packages/core-rust` yang dikompilasi ke WASM.
4. **Digest dan content hash** diverifikasi untuk setiap berkas yang dideklarasikan. Berkas di luar manifest, path traversal, dan duplikat entri ditolak.
5. Alur distribusi hanya **impor dan ekspor**. Ekspor membungkus project menjadi `.mapp` bertanda tangan; impor memverifikasi manifest, signature, dan hash sebelum menampilkan pratinjau permission.
6. **Static index read-only bersifat opsional**: satu berkas JSON berisi daftar paket dengan `url`, `sha256`, `signature`, dan permission. Index tidak memberikan kepercayaan otomatis; verifikasi tetap dilakukan lokal.
7. Perubahan public key untuk `id` yang sama memicu **peringatan keras** dan memerlukan konfirmasi eksplisit; paket tidak dipasang diam-diam.
8. Tidak ada federated registry, publish pipeline, reproducible build service, delta update, atau marketplace. Ketidakcocokan versi ditangani lewat update dan rollback lokal.

Rujukan kontrak: [package-distribution](../package-distribution.md), [spec packages](../../03-specs/05-packages.md), [manifest](../../03-specs/manifest.md), [schema manifest](../../03-specs/schemas/microapp.manifest.v2.schema.json).

## Konsekuensi

- Pembuatan paket harus melalui satu implementasi deterministik; dua cara packing akan menghasilkan digest berbeda.
- Kunci penanda tangan adalah identitas pengguna; kehilangannya berarti tidak dapat menerbitkan update dengan identitas yang sama.
- Verifikasi menambah waktu impor, tetapi terjadi sekali dan tidak memblokir UI karena berjalan di worker.
- Static index hanya mempermudah penemuan; tidak menghapus kebutuhan verifikasi.
- Uninstall harus menawarkan ekspor data agar paket dan data pengguna tidak hilang bersamaan.

## Alternatif

| Alternatif | Alasan ditolak |
|---|---|
| ZIP biasa tanpa normalisasi | Digest berubah hanya karena timestamp; verifikasi tidak stabil. |
| Signature di dalam arsip | Sulit memisahkan isi yang ditandatangani dari pembungkusnya. |
| Registry server dengan publish | Menambah backend, akun, dan permukaan serangan. |
| Model kepercayaan TOFU tanpa peringatan | Perubahan kunci penyerang tidak terlihat. |
| Paket berisi skrip instalasi | Melanggar prinsip tidak mengeksekusi isi paket sebelum verifikasi. |

## Verifikasi

1. Uji determinisme memastikan dua packing dari isi yang sama menghasilkan digest identik.
2. Uji verifikasi menolak signature salah, hash tidak cocok, entri ekstra, dan path traversal.
3. Uji impor memastikan pratinjau permission muncul sebelum instalasi.
4. Uji perubahan public key memastikan peringatan keras dan konfirmasi diperlukan.
5. Uji ekspor-impor round trip mempertahankan manifest, aset, dan data yang dideklarasikan.
