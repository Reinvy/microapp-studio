---
id: ADR-0013
title: ADR-0013 Digest Manifest, Determinisme mapp, dan Signature
status: accepted
owner: registry
prd_refs: ["§4.3", "§3 Modul 5", "§5.1"]
---

# ADR-0013 Digest Manifest, Determinisme mapp, dan Signature

## Konteks

`contentHash` didefinisikan "atas ZIP kanonik" sementara field `contentHash` berada di dalam `manifest.json` yang ikut di-ZIP, sehingga hash bergantung pada dirinya sendiri. Format signature tidak menetapkan apakah yang ditandatangani adalah string atau digest, dan `keyId` disebut "16 byte hex" padahal fingerprint adalah 64 hex. Beberapa field operasional (sumber publisher, kuota storage, secure display) dibutuhkan Host fase 1 tetapi belum ada di schema, sementara aturan M-23 (field additive diabaikan) bertentangan dengan schema authoring yang strict.

## Keputusan

1. **Placeholder digest.** `contentHash` dihitung atas ZIP kanonik **tanpa** direktori `signatures/`, dengan nilai `manifest.json.contentHash` diganti sementara menjadi `sha256-` + 64 karakter `0` sebelum hashing. Nilai asli ditulis setelah hash dihitung. Verifier mem-parse manifest, mengganti field dengan placeholder yang sama, men-serialisasi ulang JCS, membangun ulang ZIP kanonik, lalu membandingkan hash.
2. **Signature menandatangani 32 byte digest mentah** yang sama dengan digest `contentHash` (ZIP kanonik dengan placeholder), bukan string hex dan bukan ZIP yang sudah memuat nilai akhir. `signatures/author.ed25519` dan `signatures/registry.ed25519` berisi 64 byte signature mentah tanpa header.
3. **Identitas kunci.** `publisher.keyId` = 16 hex pertama `SHA-256(public key author)`; `publisher.fingerprint` = 64 hex penuh hash yang sama; `entry.signature` = `ed25519-<keyId>`.
4. **Matriks kepercayaan instalasi.**
   - `.mapp` lokal: signature author wajib valid; `signatures/registry.ed25519` opsional, bila ada wajib valid.
   - Instalasi dari registry: author + registry wajib dan kunci keduanya berbeda.
   - Instalasi dari Git tanpa signature: hanya diizinkan dengan peringatan eksplisit yang menyebut ketiadaan signature dan trust `community`/`local`; tidak boleh terjadi diam-diam.
5. **Schema authoring vs parser.** Schema JSON authoring tetap `additionalProperties: false`. Parser menerima field additive yang tidak dikenal dalam major 2 dan mengabaikannya, tetapi `schemaVersion` wajib tepat `2.0-open`. M-23 diperjelas agar tidak bertentangan dengan schema.
6. **Field baru.** `publisher.source` enum `registry|git|local|enterprise` opsional dengan default `registry`; `repository` boleh string kosong hanya bila `publisher.source` = `local`; `license` divalidasi terhadap daftar SPDX identifier yang di-embed di core; `runtime.secureDisplay` boolean opsional default `false`; `permissions.quotas.storageMb` integer default 10.
7. **Determinisme ZIP.** Entry terurut bytewise, timestamp `1980-01-01T00:00:00`, deflate level 9, tanpa extra field/komentar/data descriptor, permission `0644` file dan `0755` direktori. Batas: 256 MiB dekompresi, 10.000 entry, 64 MiB terkompresi; symlink, entry duplikat, path absolut, `..`, dan backslash ditolak.
8. **Versi Host.** Host Shell memakai semver `2.0.0`; fixture `.mapp` memakai `minHostVersion: "2.0.0"`. Prerelease `-phase` dilarang karena M-05 hanya mengizinkan `-beta.N` dan `-rc.N`.

## Konsekuensi

- Packer dan verifier wajib berbagi satu implementasi di `core-rust`; implementasi ZIP kedua di TypeScript atau Dart dilarang.
- Perubahan apa pun pada `manifest.json` membatalkan hash dan signature; tidak ada field yang boleh diisi setelah signing.
- `signatures/` tidak dicakup signature, sehingga registry dapat menambahkan signature tanpa mengubah digest author; verifier wajib memeriksa bahwa `contentHash` di manifest cocok dengan digest ZIP tanpa `signatures/`.
- `permissions.quotas.storageMb` tanpa field memakai 10 MB; Host menolak manifest dengan nilai di luar 1–1024 MB.
- Paket lama tanpa `publisher.source` diterima sebagai `registry`; instalasi lokal tanpa `publisher.source` dan `repository` kosong tetap valid karena default hanya berlaku saat field tidak ada.

## Alternatif

| Alternatif | Alasan ditolak |
|---|---|
| Hash dihitung atas ZIP final termasuk nilai `contentHash` | Tidak dapat diselesaikan; hash bergantung pada dirinya sendiri. |
| Signature atas string hex digest | Menambah satu lapis encoding yang mudah salah dan tidak kompatibel dengan implementasi Ed25519 standar. |
| Signature tunggal author+registry | Menghilangkan pemisahan kepercayaan; registry terkompromi dapat menyamar sebagai author. |
| Schema permisif untuk authoring | Tooling authoring kehilangan validasi awal dan kesalahan baru terdeteksi saat publikasi. |
| `keyId` 32 hex | Bertentangan dengan `entry.signature: ed25519-<keyId>` pada contoh kontrak yang sudah dipublikasikan. |

## Status

`accepted`. Kontrak field ada di [03-specs/manifest-v2.md](../../03-specs/manifest-v2.md); verifikasi signature di [identity-crypto.md](../identity-crypto.md) §10 dan [registry-supply-chain.md](../registry-supply-chain.md).
