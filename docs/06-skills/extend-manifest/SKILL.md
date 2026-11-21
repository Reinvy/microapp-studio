---
id: SKILL-MANIFEST
title: Memperluas Manifest
status: accepted
owner: architecture
prd_refs: ["§5 F5", "§7"]
name: extend-manifest
description: "Memperluas kontrak microapp.manifest.json melalui RFC, schema, parser Rust/WASM, aturan kompatibilitas, dan fixture."
when_to_use: "Dipakai saat field manifest, enum permission, capability, atau aturan validasi perlu berubah."
required_docs: ["docs/03-specs/manifest.md", "docs/03-specs/schemas/microapp.manifest.v2.schema.json", "docs/10-contributing/rfc-process.md", "docs/templates/rfc.md", "docs/01-architecture/package-distribution.md"]
---

# Memperluas Manifest

## Kapan Digunakan

Dipakai ketika kontrak `microapp.manifest.json` berubah: menambah field opsional, mengubah arti field, menambah nilai enum, atau mengubah aturan validasi. Perubahan yang menghapus atau mengganti arti field wajib menaikkan `schemaVersion` dan melewati RFC.

Di luar cakupan: menambah permission baru tanpa perubahan format (gunakan [add-permission](../add-permission/SKILL.md)), mengubah layout `.mapp` (gunakan [add-package-source](../add-package-source/SKILL.md)), dan mengubah format node UI (gunakan [ui-protocol.md](../../03-specs/ui-protocol.md) dan RFC).

## Prasyarat

- [manifest.md](../../03-specs/manifest.md) dibaca: field wajib/opsional, aturan validasi, dan contoh.
- Schema [microapp.manifest.v2.schema.json](../../03-specs/schemas/microapp.manifest.v2.schema.json) dan parser `packages/core-rust/src/manifest.rs` dibandingkan; keduanya harus setuju.
- [rfc-process.md](../../10-contributing/rfc-process.md) dipahami dan RFC draf tersedia.
- `cargo test --manifest-path packages/core-rust/Cargo.toml` lulus pada baseline.
- `node scripts/make-fixtures.mjs` menghasilkan fixture yang valid.

## Input

| Input | Wajib | Contoh |
|---|---|---|
| Perubahan kontrak | ya | Menambah field `homepage` opsional |
| Alasan | ya | Detail package menampilkan tautan dokumentasi |
| Kompatibilitas | ya | Field opsional, manifest lama tetap valid |
| Fixture | ya | Manifest dengan dan tanpa `homepage` |
| RFC | ya | `docs/templates/rfc.md` terisi dan disetujui |

## Prosedur

1. Tulis RFC dari [templates/rfc.md](../../templates/rfc.md): motivasi, bentuk field, default, aturan validasi, dampak kompatibilitas, dan rencana migrasi. Simpan di `docs/10-contributing/` sesuai proses.
2. Putuskan kompatibilitas: field opsional dengan default aman boleh tetap `schemaVersion: 2`; perubahan yang memecah manifest lama MUST menaikkan versi dan menambah jalur parser baru.
3. Perbarui schema `docs/03-specs/schemas/microapp.manifest.v2.schema.json`: tipe, `pattern`, `enum`, `required`, dan `additionalProperties: false`. Jangan melonggarkan validasi permission.
4. Perbarui tabel field dan aturan di `docs/03-specs/manifest.md`, termasuk contoh JSON dan daftar field yang ditolak.
5. Implementasikan parsing dan validasi di `packages/core-rust/src/manifest.rs`. Parser MUST menolak field yang tidak dikenal dan field platform lama, bukan mengabaikannya.
6. Pastikan WASM yang dibangun dari core dipakai host: jalankan `npm run build:core` dan periksa ekspor yang berubah di `packages/core-rust/src/lib.rs`.
7. Tambahkan test positif dan negatif di `packages/core-rust/tests/`: manifest valid, field hilang, tipe salah, field asing, dan enum di luar daftar.
8. Perbarui `scripts/make-fixtures.mjs` bila fixture E2E memakai field baru, lalu regenerasi fixture.
9. Periksa bahwa `docs/01-architecture/package-distribution.md` dan `docs/03-specs/05-packages.md` tetap konsisten dengan field baru.
10. Commit berurutan: `docs(rfc)`, `docs(spec)`, lalu implementasi parser; jalankan verifikasi.

## Verifikasi

```bash
node scripts/make-fixtures.mjs
cargo test --manifest-path packages/core-rust/Cargo.toml
cargo clippy --manifest-path packages/core-rust/Cargo.toml --all-targets -- -D warnings
npm run build:core
npm test -w @microapp/studio-web
node scripts/check-docs.mjs --strict
```

Fixture hasil regenerasi harus lolos impor di E2E. Test negatif harus gagal dengan kode `E-PACK-001` untuk manifest tidak valid.

## Kesalahan Umum

| Kesalahan | Perbaikan |
|---|---|
| Mengubah schema tanpa RFC | Tulis RFC lebih dulu dan tautkan di PR |
| Schema menerima field, parser menolak | Samakan keduanya dan tambahkan test kontrak |
| Menambah field wajib pada versi yang sama | Naikkan `schemaVersion` atau beri default |
| Parser mengabaikan field asing | Tolak secara eksplisit |
| Fixture lama tidak diregenerasi | Jalankan `make-fixtures.mjs` dan commit |

## Definition of Done

- RFC disetujui dan tertaut.
- Schema, spesifikasi, dan parser konsisten.
- Kompatibilitas dinyatakan eksplisit dan diuji.
- Fixture diperbarui dan E2E lulus.
