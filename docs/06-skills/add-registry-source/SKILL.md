---
id: SKILL-ADD-REGISTRY-SOURCE
title: Menambah Sumber Registry
status: accepted
owner: dx
prd_refs: ["§3 Modul 5"]
name: add-registry-source
description: "Menambahkan jenis sumber registry dengan cache offline, verifikasi signature setiap load, dan penanganan key mismatch yang keras."
when_to_use: "Dipakai saat menambah sumber registry baru, mengubah format indeks, atau memperluas perilaku cache, TOFU, dan trust level."
required_docs: ["docs/03-specs/05-registry.md", "docs/01-architecture/registry-supply-chain.md", "docs/03-specs/schemas/registry-index.v1.schema.json", "docs/01-architecture/threat-model.md", "docs/04-flows/09-publish-verify.md"]
---

# Menambah Sumber Registry

## Kapan Digunakan

Dipakai ketika Host atau Studio perlu mendukung jenis sumber registry baru, misalnya indeks statis di HTTPS, repositori Git, registry internal organisasi, atau cermin offline. Setiap sumber registry adalah input yang tidak dipercaya sampai signature dan hash-nya diverifikasi.

Di luar cakupan: menambah pemindaian malware di sisi registry (kebijakan di `docs/10-contributing/registry-policy.md`) dan mengubah format paket `.mapp` (gunakan [extend-manifest](../extend-manifest/SKILL.md)).

## Prasyarat

- [03-specs/05-registry.md](../../03-specs/05-registry.md) bagian 3–7 dibaca, termasuk `FR-REG-001` sampai `FR-REG-025`.
- [01-architecture/registry-supply-chain.md](../../01-architecture/registry-supply-chain.md) dipahami: pemisahan registry key dan author key, TOFU, reproducible build, serta delisting.
- [01-architecture/threat-model.md](../../01-architecture/threat-model.md) dibaca untuk ancaman registry hijacking dan supply chain.
- [03-specs/permissions.md](../../03-specs/permissions.md) dipahami: `network.allowlist` bukan mekanisme kepercayaan registry.

## Input

| Input | Wajib | Contoh |
|---|---|---|
| Jenis sumber | ya | Indeks JSON statis HTTPS, Git, atau registry internal |
| `publicKey` registry | ya | Kunci Ed25519 pemilik indeks |
| Kebijakan cache | ya | 24 jam untuk kesegaran, tetap dipakai offline tanpa kedaluwarsa |
| Trust level | ya | `official`, `community`, `internal`, atau `local` |
| Skenario kegagalan | ya | Signature salah, key mismatch, key dicabut, JSON korup |

## Prosedur

1. Baca [03-specs/05-registry.md](../../03-specs/05-registry.md) dan [01-architecture/registry-supply-chain.md](../../01-architecture/registry-supply-chain.md); tentukan bagaimana sumber baru memetakan ke trust level dan urutan prioritas sumber aktif.
2. Pastikan indeks mengikuti `docs/03-specs/schemas/registry-index.v1.schema.json`: `schemaVersion`, `name`, `url`, `publicKey`, `updatedAt`, dan array `apps[]` dengan `id`, `version`, `size`, `sha256`, `signature`, `minHostVersion`, dan `permissions`.
3. Implementasikan pengambilan indeks melalui HTTPS dengan timeout eksplisit, dukungan `ETag`/`If-None-Match`, dan cache lokal 24 jam. Saat offline, cache tetap dipakai tanpa kedaluwarsa dan UI menandainya sebagai data lama.
4. Verifikasi setiap load, bukan hanya saat pertama: parse terhadap schema, cocokkan `publicKey` dengan kunci yang disimpan pengguna, lalu verifikasi signature Ed25519 di `packages/core-rust`. Jangan memverifikasi di TypeScript atau Dart.
5. Periksa `revokedKeys` dan tolak setiap artefak yang ditandatangani kunci dicabut. Tolak juga indeks yang signature-nya valid tetapi memakai kunci author yang sama dengan kunci registry.
6. Terapkan TOFU per author: pin kunci author pada instalasi pertama, bandingkan pada setiap update, dan tampilkan peringatan keras yang memblokir update sampai pengguna menyetujui ulang.
7. Implementasikan pengelolaan sumber di UI registry: tambah, hapus, nonaktifkan, ubah prioritas, dan tampilkan trust level. Urutan sumber menentukan pemenang bila satu `id` muncul di beberapa registry; jangan memilih acak.
8. Catat setiap operasi registry (fetch, verifikasi, install, update, rollback, penolakan) pada audit lokal tanpa menyimpan isi rahasia.
9. Tulis test untuk JSON korup, schema salah, signature salah, key mismatch, kunci dicabut, cache kedaluwarsa, mode offline, dan perubahan prioritas sumber.
10. Perbarui requirement dan bagian data pada [03-specs/05-registry.md](../../03-specs/05-registry.md), flow [09-publish-verify.md](../../04-flows/09-publish-verify.md), dan baris [prd-compliance-matrix.md](../../00-foundation/prd-compliance-matrix.md).
11. Jalankan verifikasi, lalu perbarui [implementation-status.md](../../00-foundation/implementation-status.md) untuk modul registry bila seluruh skenario lulus.

## Verifikasi

```bash
node -e "JSON.parse(require('fs').readFileSync('docs/03-specs/schemas/registry-index.v1.schema.json','utf8')); console.log('schema ok')"
cargo test -p microapp-core registry
npm test
npm run docs:check
```

Uji manual: tambahkan dua sumber dengan `id` yang sama dan prioritas berbeda, lalu pastikan sumber berprioritas lebih tinggi menang; matikan jaringan dan pastikan indeks cache masih dapat dibuka tetapi instalasi baru diverifikasi terhadap signature cache.

## Kesalahan Umum

| Kesalahan | Perbaikan |
|---|---|
| Memverifikasi signature hanya saat fetch pertama | Verifikasi setiap load, termasuk dari cache |
| Memakai kunci registry untuk memverifikasi author | Registry key dan author key wajib terpisah dan diperiksa keduanya |
| Menghapus cache saat offline | Cache tetap dipakai tanpa kedaluwarsa; tandai sebagai data lama |
| Memilih sumber secara acak saat ada duplikat `id` | Gunakan urutan prioritas sumber yang ditetapkan pengguna |
| Menyimpan indeks tanpa validasi schema | Parse terhadap schema resmi sebelum indeks dipakai |
| Menelan key mismatch sebagai warning | Blokir update dan minta persetujuan ulang pengguna |

## Definition of Done

- Jenis sumber baru terdaftar dengan trust level dan prioritas yang jelas.
- Indeks divalidasi terhadap schema dan signature diverifikasi setiap load di `packages/core-rust`.
- TOFU author, kunci dicabut, dan key mismatch diblokir dengan peringatan keras.
- Cache 24 jam dan mode offline berfungsi tanpa kehilangan verifikasi.
- Test kegagalan (JSON korup, schema salah, signature salah, key mismatch) lulus.
- Spec, flow, matriks, dan status diperbarui; `npm run docs:check` bersih.
