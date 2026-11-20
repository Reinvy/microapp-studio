---
id: SKILL-WRITE-DB-MIGRATION
title: Menulis Migrasi Database
status: accepted
owner: dx
prd_refs: ["§3 Modul 4"]
name: write-db-migration
description: "Menulis migrasi schema forward dan rollback dengan snapshot, ledger versi, serta test terhadap fixture database lama."
when_to_use: "Dipakai saat schema database micro-app atau database Host berubah dan memerlukan migrasi yang aman serta dapat dibatalkan."
required_docs: ["docs/01-architecture/data-model.md", "docs/03-specs/04-data-automation.md", "docs/01-architecture/monorepo.md", "docs/00-foundation/sdd-workflow.md", "docs/07-rules/data-migrations.md", "docs/04-flows/02-install-update-rollback.md"]
---

# Menulis Migrasi Database

## Kapan Digunakan

Dipakai ketika tabel, kolom, index, constraint, atau data turunan pada database micro-app berubah, atau ketika database Host sendiri memerlukan evolusi schema. Migrasi harus aman untuk data pengguna yang sudah ada, dapat dibatalkan, dan tidak pernah menghapus data tanpa ekspor.

Di luar cakupan: perubahan kontrak manifest (gunakan [extend-manifest](../extend-manifest/SKILL.md)) dan perubahan algoritma CRDT, yang tetap berada di `packages/core-rust` dan memerlukan RFC.

## Prasyarat

- [01-architecture/data-model.md](../../01-architecture/data-model.md) dibaca: tipe, primary key, aturan UUIDv7, `PRAGMA user_version`, dan ledger migrasi.
- [03-specs/04-data-automation.md](../../03-specs/04-data-automation.md) requirement migrasi dan snapshot dibaca.
- ADR-0002 tentang SQLite WASM + OPFS dipahami: web memakai SQLite WASM di Worker, native memakai SQLite native.
- Fixture database versi sebelumnya tersedia atau dapat dibuat dengan build lama.

## Input

| Input | Wajib | Contoh |
|---|---|---|
| Perubahan schema | ya | Menambah tabel `receipts` dengan index tanggal |
| Versi schema baru | ya | `user_version` naik dari 6 ke 7 |
| Rencana rollback | ya | Drop tabel baru atau pulihkan snapshot |
| Fixture lama | ya | Database versi 6 berisi 500 record |
| Dampak index | ya | FTS5 dan sqlite-vec perlu rebuild |

## Prosedur

1. Baca [01-architecture/data-model.md](../../01-architecture/data-model.md) dan [03-specs/04-data-automation.md](../../03-specs/04-data-automation.md) bagian 3–4; catat tabel, kolom, dan index yang terdampak.
2. Tentukan versi schema baru dan tulis pasangan migrasi forward serta rollback yang bernomor di `db/migrations/` pada paket micro-app. Setiap migrasi harus idempoten dan dijalankan dalam satu transaksi.
3. Implementasikan runner migrasi di `packages/runtime-web` untuk web dan `packages/runtime-native` untuk native, dengan ledger versi di `packages/core-rust`. Ledger mencatat versi, waktu, dan hash migrasi, dan `PRAGMA user_version` diperbarui setelah migrasi sukses.
4. Tambahkan snapshot atomik sebelum migrasi dijalankan dan catat hash snapshot tersebut. Bila migrasi gagal, database MUST dipulihkan dari snapshot dan micro-app kembali ke versi sebelumnya tanpa interaksi pengguna.
5. Jangan mencampur perubahan schema dan pembersihan data destruktif dalam satu langkah. Data yang tidak lagi dipakai harus dipertahankan atau diekspor lebih dulu; migrasi tidak boleh menjadi jalur penghapusan diam-diam.
6. Sediakan fixture database versi lama yang realistis. Test harus menjalankan migrasi naik, rollback, dan kegagalan di tengah migrasi, lalu memeriksa jumlah record dan hash per tabel.
7. Bila kolom teks atau vektor berubah, jalankan rebuild indeks FTS5 dan `sqlite-vec` setelah migrasi, dan verifikasi hasil pencarian tetap benar.
8. Perbarui [01-architecture/data-model.md](../../01-architecture/data-model.md) untuk tabel/kolom baru dan sesuaikan versi schema yang dideklarasikan paket pada manifest serta contoh di [03-specs/manifest-v2.md](../../03-specs/manifest-v2.md) bila relevan.
9. Tambahkan atau sesuaikan baris [prd-compliance-matrix.md](../../00-foundation/prd-compliance-matrix.md) dan flow [02-install-update-rollback.md](../../04-flows/02-install-update-rollback.md).
10. Jalankan blok verifikasi, lalu perbarui [implementation-status.md](../../00-foundation/implementation-status.md) hanya setelah migrasi dan rollback terbukti pada fixture.

## Verifikasi

```bash
npm test -w @microapp/runtime-web
cargo test -p microapp-core migration
sqlite3 /tmp/migration-fixture.db "PRAGMA user_version;"
npm run docs:check
```

Uji manual: buka database fixture versi lama melalui Host, jalankan update, lalu periksa bahwa `PRAGMA user_version` bernilai versi baru, jumlah record setiap tabel tidak berkurang, dan snapshot tersedia di Storage Manager sebelum migrasi.

## Kesalahan Umum

| Kesalahan | Perbaikan |
|---|---|
| Menulis migrasi forward tanpa rollback | Setiap migrasi wajib memiliki rollback yang diuji |
| Menjalankan migrasi tanpa snapshot | Buat snapshot atomik dan catat hash sebelum migrasi |
| Mengubah file migrasi yang sudah dirilis | Tambah migrasi baru; file lama bersifat tetap |
| Menghapus data pengguna saat migrasi | Pertahankan atau ekspor data; hapus hanya dengan konfirmasi eksplisit |
| Melewatkan rebuild FTS5 atau sqlite-vec | Rebuild index setelah perubahan kolom dan verifikasi hasil pencarian |
| Mengandalkan `PRAGMA user_version` tanpa ledger | Catat versi, waktu, dan hash migrasi di ledger |

## Definition of Done

- Migrasi forward dan rollback bernomor tersedia dan dijalankan dalam transaksi.
- Snapshot dan hash tercatat sebelum migrasi; kegagalan memulihkan database dan versi app.
- Ledger migrasi dan `PRAGMA user_version` konsisten.
- Fixture database lama berhasil dimigrasikan tanpa kehilangan record.
- FTS5 dan sqlite-vec dibangun ulang bila diperlukan.
- Data model, matriks, dan flow diperbarui; `npm run docs:check` bersih.
