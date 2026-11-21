---
id: SKILL-PACKAGE
title: Menambah Sumber Package
status: accepted
owner: registry
prd_refs: ["§5 F5", "§8"]
name: add-package-source
description: "Menambah sumber distribusi berupa file .mapp atau index statis read-only, dengan verifikasi signature lokal dan tanpa server registry."
when_to_use: "Dipakai saat menambah cara memperoleh package: impor file lokal, drag-drop, atau index statis opsional yang dibaca dari URL."
required_docs: ["docs/03-specs/05-packages.md", "docs/01-architecture/package-distribution.md", "docs/10-contributing/package-policy.md", "docs/03-specs/schemas/registry-index.v1.schema.json", "docs/04-flows/04-share-install.md"]
---

# Menambah Sumber Package

## Kapan Digunakan

Dipakai ketika produk perlu menerima package dari sumber baru: file `.mapp` lokal, drag-drop di `/packages`, atau index statis read-only yang menautkan file `.mapp`. Skill ini tidak membangun registry yang dapat ditulis, publish pipeline, atau marketplace.

Di luar cakupan: mengubah format manifest (gunakan [extend-manifest](../extend-manifest/SKILL.md)), menambah permission yang diminta package (gunakan [add-permission](../add-permission/SKILL.md)), dan membuat package baru dari project (gunakan alur bagikan di [FLOW-04](../../04-flows/04-share-install.md)).

## Prasyarat

- [05-packages.md](../../03-specs/05-packages.md) dibaca: layout `.mapp`, verifikasi, impor, install, update, rollback, index statis.
- [package-distribution.md](../../01-architecture/package-distribution.md) dibaca: signature, digest, dan batas distribusi web-only.
- [package-policy.md](../../10-contributing/package-policy.md) dibaca: kebijakan signature dan delisting.
- Schema [registry-index.v1.schema.json](../../03-specs/schemas/registry-index.v1.schema.json) dipahami.
- `node scripts/make-fixtures.mjs` menghasilkan fixture `.mapp` bertanda tangan untuk test.

## Input

| Input | Wajib | Contoh |
|---|---|---|
| Jenis sumber | ya | File lokal, drag-drop, atau URL index statis |
| URL index | kondisional | `https://contoh.example/apps/index.json` |
| Public key | ya | Kunci Ed25519 pemilik package |
| Perilaku verifikasi | ya | Manifest → digest → signature → permission preview |
| Bukti test | ya | Fixture valid dan fixture rusak |

## Prosedur

1. Pilih bentuk sumber yang paling sederhana: file `.mapp` tunggal lebih dulu; index statis hanya jika pengguna perlu menjelajah banyak package.
2. Untuk index, validasi JSON terhadap `registry-index.v1.schema.json` dengan field `schemaVersion`, `name`, `updatedAt`, dan `apps[]` berisi `id`, `version`, `url`, `sha256`, `signature`, dan `permissions`. Tidak ada field tulis, akun, atau metadata penggunaan.
3. Implementasikan pembacaan index sebagai GET read-only tanpa cookie dan tanpa kredensial. Index hanya menyediakan tautan; tidak ada endpoint lain yang dipanggil.
4. Verifikasi setiap unduhan secara lokal di `packages/core-rust/src/mapp.rs`: baca ZIP, tolak path traversal dan entri duplikat, validasi manifest, hitung digest tiap entri, verifikasi signature Ed25519, lalu tampilkan permission preview.
5. Jangan menulis apa pun ke sumber. Instalasi menulis ke OPFS dan mendaftarkan app di Home hanya setelah verifikasi penuh lulus.
6. Tangani kegagalan dengan kode yang tepat: `E-PACK-001` manifest/layout, `E-PACK-002` signature atau key tidak tersedia, `E-PACK-003` digest mismatch, `E-PACK-004` versi/rollback tidak valid.
7. Jika `keyId` untuk app yang sama berubah, blokir impor dan tampilkan peringatan keras sampai pengguna menyetujui key baru (`SEC-006`).
8. Tambahkan sumber pada Settings → Packages hanya setelah pengguna memasukkan URL; simpan konfigurasi lokal dan tampilkan status baca.
9. Tambahkan test: fixture valid, signature salah, digest berubah satu byte, key berubah, dan index invalid. Sertakan E2E impor dari `/packages`.
10. Perbarui `03-specs/05-packages.md` bila bentuk index berubah, lalu jalankan verifikasi.

## Verifikasi

```bash
node scripts/make-fixtures.mjs
cargo test --manifest-path packages/core-rust/Cargo.toml
npm test -w @microapp/studio-web
npm run e2e
node scripts/check-docs.mjs --strict
```

Fixture rusak harus ditolak sebelum ada penulisan ke OPFS. Index statis harus tetap berfungsi saat offline setelah di-cache, dan tidak boleh mengirim request otomatis ke sumber lain.

## Kesalahan Umum

| Kesalahan | Perbaikan |
|---|---|
| Menambah endpoint tulis atau publish | Hapus; distribusi hanya file dan index read-only |
| Mempercayai hash dari index | Verifikasi ulang digest dan signature secara lokal |
| Install sebelum verifikasi selesai | Jalankan verifikasi penuh lebih dulu |
| Key baru diterima diam-diam | Blokir dan minta persetujuan eksplisit |
| Index menyimpan token atau kredensial | Hapus; index hanya berisi tautan publik |

## Definition of Done

- Sumber baru read-only dan tidak menambah server.
- Manifest, digest, dan signature diverifikasi lokal.
- Permission preview muncul sebelum instalasi.
- Perubahan key diblokir sampai disetujui.
- Test negatif dan E2E lulus.
