---
id: SKILL-DB
title: Menulis Migrasi Database
status: accepted
owner: data
prd_refs: ["§8", "§5 F3"]
name: write-db-migration
description: "Menulis migrasi SQLite WASM/OPFS yang bernomor, punya rollback, snapshot sebelum jalan, fixture, dan idempoten."
when_to_use: "Dipakai saat schema host DB atau app DB berubah: tabel, kolom, indeks, FTS5, atau ledger migrasi."
required_docs: ["docs/01-architecture/data-model.md", "docs/03-specs/04-data.md", "docs/04-flows/08-migration.md", "docs/07-rules/data-migrations.md", "docs/07-rules/testing.md"]
---

# Menulis Migrasi Database

## Kapan Digunakan

Dipakai ketika schema SQLite berubah: menambah atau mengubah tabel, kolom, indeks, tabel FTS5, atau saat ledger migrasi perlu diperbaiki. Database hanya diakses lewat worker SQLite WASM di OPFS.

Di luar cakupan: mengubah format backup terenkripsi (gunakan [06-backup.md](../../03-specs/06-backup.md)), mengubah format `.mapp` (gunakan [add-package-source](../add-package-source/SKILL.md)), dan migrasi data dari Dexie lama (gunakan [FLOW-08](../../04-flows/08-migration.md)).

## Prasyarat

- [data-model.md](../../01-architecture/data-model.md) dibaca, khususnya §5 yang menjadi sumber DDL kanonik host DB.
- [04-data.md](../../03-specs/04-data.md) dibaca: worker, OPFS, snapshot, FTS5, kuota, isolasi, error code.
- [data-migrations.md](../../07-rules/data-migrations.md) dibaca: penomoran, larangan mengubah migrasi yang sudah diterapkan, dan aturan ekspor.
- `node scripts/test-migrations.mjs` lulus pada baseline.
- Tidak ada perubahan schema yang belum ter-commit pada file migrasi.

## Input

| Input | Wajib | Contoh |
|---|---|---|
| Perubahan schema | ya | Menambah kolom `pinned_at_ms` pada `installed_microapps` |
| Nomor migrasi | ya | `003` |
| Rollback | ya | `DROP COLUMN` setara atau tabel pengganti |
| Fixture versi lama | ya | Snapshot DB sebelum migrasi |
| Dampak data | ya | Baris lama memakai nilai default `NULL` |

## Prosedur

1. Ubah DDL kanonik di `docs/01-architecture/data-model.md` §5 lebih dulu. Untuk host DB, file `001_host.*.sql` dihasilkan dari dokumen ini, bukan diedit tangan.
2. Jalankan `node scripts/generate-migrations.mjs` untuk menghasilkan `001_host.up.sql`, `001_host.down.sql`, dan `apps/studio-web/src/db/migrations/index.generated.ts`. Commit hasilnya bersama dokumen.
3. Untuk migrasi baru, buat pasangan `apps/studio-web/src/db/migrations/003_<nama>.up.sql` dan `003_<nama>.down.sql`. Nomor harus berurutan tanpa celah; rollback harus mengembalikan schema ke kondisi sebelumnya.
4. Migrasi MUST idempoten terhadap ledger: gunakan `IF NOT EXISTS` hanya untuk objek baru, dan jangan pernah mengubah migrasi yang sudah tercatat di `schema_migrations`. Perubahan checksum ditolak dengan `E-DATA-002`.
5. Pastikan runner di `apps/studio-web/src/db/migrate.ts` membuat snapshot sebelum menjalankan migrasi (`FR-DATA-005`) dan membungkus setiap migrasi dalam transaksi `BEGIN IMMEDIATE`.
6. Untuk FTS5, buat tabel virtual, trigger sinkronisasi, dan query yang lewat repository search; jangan membaca seluruh tabel di main thread.
7. Jangan menambah tabel atau kolom untuk sinkronisasi jaringan, CRDT, atau workflow; model data web-only tidak memilikinya.
8. Tambahkan test di `apps/studio-web/src/db/__tests__/`: forward, rollback, idempoten, checksum mismatch, dan kegagalan di tengah transaksi.
9. Tambahkan fixture versi lama dengan `node scripts/make-fixtures.mjs` bila migrasi mengubah data yang dipakai E2E.
10. Perbarui `docs/03-specs/04-data.md` bila perilaku migrasi berubah, lalu jalankan verifikasi.

## Verifikasi

```bash
node scripts/generate-migrations.mjs --check
node scripts/test-migrations.mjs
npm test -w @microapp/studio-web
npm run typecheck
node scripts/check-docs.mjs --strict
```

`test-migrations.mjs` harus membuktikan urutan maju, `PRAGMA integrity_check`, rollback terbalik sampai schema kosong, dan pemasangan ulang yang bersih. Snapshot harus dapat dipulihkan bila migrasi gagal.

## Kesalahan Umum

| Kesalahan | Perbaikan |
|---|---|
| Mengedit `001_host.up.sql` langsung | Ubah `data-model.md` §5 lalu jalankan generator |
| Migrasi baru tanpa `down` | Tambahkan rollback yang benar dan uji |
| Mengubah migrasi yang sudah diterapkan | Buat migrasi baru; checksum lama tidak boleh berubah |
| Migrasi tanpa transaksi | Bungkus dengan `BEGIN IMMEDIATE` di runner |
| Query FTS5 dari main thread | Pindahkan ke worker lewat repository |

## Definition of Done

- DDL kanonik dan file generated konsisten; `--check` lulus.
- Migrasi bernomor, punya rollback, dan idempoten.
- Snapshot dan transaksi teruji, termasuk kegagalan di tengah.
- Fixture versi lama tersedia bila data berubah.
- Test dan docs check lulus.
