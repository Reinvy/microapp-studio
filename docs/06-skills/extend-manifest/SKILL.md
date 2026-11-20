---
id: SKILL-EXTEND-MANIFEST
title: Memperluas Manifest
status: accepted
owner: dx
prd_refs: ["§3 Modul 5"]
name: extend-manifest
description: "Mengubah kontrak manifest melalui RFC, memperbarui JSON Schema dan parser Rust, serta menjaga kompatibilitas paket lama."
when_to_use: "Dipakai saat menambah field, enum, atau aturan validasi manifest, atau saat mengubah layout dan signature paket .mapp."
required_docs: ["docs/03-specs/manifest-v2.md", "docs/03-specs/schemas/microapp.manifest.v2.schema.json", "docs/01-architecture/registry-supply-chain.md", "docs/01-architecture/monorepo.md", "docs/01-architecture/adr/0006-mapp-package-format.md", "docs/07-rules/rust.md"]
---

# Memperluas Manifest

## Kapan Digunakan

Dipakai ketika kontrak `microapp.manifest.json` atau layout `.mapp` perlu berubah: field baru, enum baru, aturan validasi baru, perubahan cakupan signature, atau perubahan format paket. Manifest adalah kontrak yang dipakai Host, Studio, CLI, registry, dan verifier Rust, sehingga setiap perubahan menyentuh banyak komponen sekaligus.

Di luar cakupan: menambah permission ke katalog (gunakan [add-permission](../add-permission/SKILL.md)) dan mengubah tipe node MUIP (kontrak terpisah di [ui-protocol.md](../../03-specs/ui-protocol.md)).

## Prasyarat

- [03-specs/manifest-v2.md](../../03-specs/manifest-v2.md) bagian 3–6 dibaca, termasuk aturan M-01 sampai M-24 dan aturan kompatibilitas.
- [01-architecture/monorepo.md](../../01-architecture/monorepo.md) bagian 6 dipahami: manifest memakai versi `2.0-open` dan host mendukung major saat ini serta major sebelumnya selama 12 bulan.
- ADR-0006 tentang format `.mapp` sudah dibaca.
- RFC untuk perubahan kontrak sudah `accepted`; tanpa itu implementasi MUST NOT dimulai.

## Input

| Input | Wajib | Contoh |
|---|---|---|
| Kebutuhan kontrak | ya | Menambah field `compatibility.minHostBridge` |
| Klasifikasi perubahan | ya | Aditif dalam major yang sama, atau breaking (major baru) |
| Nomor RFC | ya | RFC yang disetujui di `docs/10-contributing/rfc-process.md` |
| Fixture | ya | Manifest valid dan tidak valid untuk setiap aturan baru |
| Dampak kompatibilitas | ya | Paket lama tetap dapat dipasang atau memerlukan repack |

## Prosedur

1. Baca [03-specs/manifest-v2.md](../../03-specs/manifest-v2.md) dan [01-architecture/registry-supply-chain.md](../../01-architecture/registry-supply-chain.md); catat aturan yang terdampak dan konsumen kontrak: Host, Studio, `packages/cli`, registry, dan `packages/core-rust`.
2. Klasifikasikan perubahan. Field opsional baru yang aditif tetap memakai `schemaVersion: 2.0-open`; penghapusan field, perubahan tipe, perubahan makna, atau nilai enum wajib yang tidak kompatibel adalah breaking dan memerlukan major baru.
3. Untuk perubahan breaking, tulis RFC memakai [templates/rfc.md](../../templates/rfc.md) dan proses di [rfc-process.md](../../10-contributing/rfc-process.md). RFC menyebut kompatibilitas manifest, dampak pada paket terpasang, dan rencana migrasi. Minimal dua maintainer harus menyetujui sebelum kode ditulis.
4. Ubah [03-specs/manifest-v2.md](../../03-specs/manifest-v2.md): perbarui tabel aturan pada `## 3. Requirement`, contoh pada `## 4.1` dan `## 4.2`, serta aturan kompatibilitas. Aturan baru memakai nomor `M-` berikutnya; aturan lama tidak dihapus tanpa RFC.
5. Perbarui `docs/03-specs/schemas/microapp.manifest.v2.schema.json`: tambahkan `properties`, `required`, dan `enum` yang eksplisit, tetap memakai Draft 2020-12 dan `additionalProperties: false` pada objek tertutup. Untuk major baru, buat file schema berdampingan dan pertahankan schema lama selama jendela kompatibilitas.
6. Implementasikan validasi di `packages/core-rust`: parser manifest, validasi field dan enum, verifikasi `contentHash`, serta guard ZIP. Logika ini MUST NOT diduplikasi di TypeScript atau Dart.
7. Tambahkan fixture valid dan tidak valid di test `packages/core-rust` untuk setiap aturan baru, termasuk field tak dikenal yang harus diabaikan pada major yang sama dan nilai enum salah yang harus ditolak.
8. Perbarui `packages/cli` pada alur `microapp pack` dan `microapp publish` agar menulis field baru dan tetap menghasilkan paket deterministik; jalankan `microapp pack --reproducible` dua kali dan bandingkan hash.
9. Perbarui registry index atau verifier bila perubahan memengaruhi signature, `contentHash`, atau metadata instalasi. Dokumentasikan apakah paket lama dapat dipasang langsung atau wajib di-repack.
10. Tambahkan baris matriks di [prd-compliance-matrix.md](../../00-foundation/prd-compliance-matrix.md) bila perubahan mewujudkan requirement baru, dan perbarui [implementation-status.md](../../00-foundation/implementation-status.md) setelah verifikasi.
11. Jalankan blok verifikasi di bawah, lalu commit `docs:` lebih dulu diikuti perubahan kode.

## Verifikasi

```bash
node -e "for (const f of require('fs').readdirSync('docs/03-specs/schemas')) JSON.parse(require('fs').readFileSync('docs/03-specs/schemas/'+f,'utf8')); console.log('schemas ok')"
cargo test -p microapp-core
cargo clippy -p microapp-core --all-targets -- -D warnings
npm run docs:check
```

Untuk perubahan format paket, jalankan juga `microapp pack --reproducible --out dist/app-a.mapp` dan `microapp pack --reproducible --out dist/app-b.mapp`, lalu bandingkan hash keduanya dengan `sha256sum dist/app-a.mapp dist/app-b.mapp`. Hash MUST identik.

## Kesalahan Umum

| Kesalahan | Perbaikan |
|---|---|
| Menaikkan `schemaVersion` untuk field opsional baru | Field aditif tetap pada `2.0-open`; host mengabaikan field tak dikenal (M-23) |
| Mengubah schema tanpa memperbarui spec atau sebaliknya | Keduanya wajib berubah dalam commit yang sama; spec adalah sumber kebenaran |
| Memakai `additionalProperties: true` atau enum terbuka | Tutup objek dan sebutkan enum eksplisit agar nilai liar ditolak |
| Mengimplementasikan parser di TypeScript atau Dart | Semua parsing dan verifikasi ada di `packages/core-rust` |
| Hanya menguji manifest valid | Tambahkan fixture untuk field hilang, tipe salah, enum salah, dan path traversal |
| Melewati RFC untuk perubahan breaking | Hentikan pekerjaan; tulis RFC dan tunggu persetujuan |

## Definition of Done

- RFC `accepted` tersedia untuk setiap perubahan breaking atau perubahan kontrak.
- Spec manifest dan JSON Schema konsisten, termasuk contoh valid dan tidak valid.
- Parser dan verifier Rust menegakkan seluruh aturan baru dan lulus test fixture.
- CLI dan registry memakai versi kontrak yang benar; paket lama tetap dapat dipasang sesuai jendela kompatibilitas.
- Pack reproducible menghasilkan hash identik.
- `npm run docs:check` lulus tanpa warning.
