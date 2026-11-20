---
id: ADR-0002
title: ADR-0002 SQLite WASM dan OPFS
status: accepted
owner: architecture
prd_refs: ["§3 Modul 4", "§4.2"]
---

# ADR-0002 SQLite WASM dan OPFS

## Konteks

Phase 0 menyimpan seluruh data di IndexedDB melalui Dexie dengan tabel `apps`, `content`, dan `runHistory`. Target PRD membutuhkan SQLite per micro-app, FTS5, `sqlite-vec`, migrasi skema, dan sinkronisasi CRDT. Dexie tidak menyediakan SQL, FTS5, vector index, atau CRDT.

## Keputusan

1. **Web memakai `@sqlite.org/sqlite-wasm` resmi di Web Worker dengan OPFS** untuk seluruh data baru (Host, Studio, dan database per micro-app).
2. **Dexie hanya jembatan impor Phase 0.** Data lama dibaca sekali, diekspor, lalu diimpor ke SQLite; setelah migrasi selesai, Dexie dihapus. Tidak ada dua sumber data.
3. **Tidak ada fallback ke Dexie untuk data baru.** Bila OPFS tidak tersedia (mis. private mode), Host berjalan dengan database in-memory dan menandai status degradasi `ephemeral`; pengguna hanya dapat mengekspor, bukan mengandalkan persistensi.
4. **Enkripsi:** SQLCipher full-file hanya untuk native (Android/iOS/desktop). Web memakai **AES-256-GCM field-level untuk data sensitif dan Vault** karena SQLCipher WASM bukan jalur yang didukung. Batasan ini dinyatakan eksplisit pada UI dan spec; bukan diklaim setara.
5. Database per micro-app berada pada file terpisah yang dinamai dari `app_id`; Host memegang database sistem untuk identitas, workspace, registry, dan outbox.

## Konsekuensi

- Satu mesin query untuk lokal dan server (SQLite/Postgres), memudahkan pemetaan tipe.
- Worker menjadi wajib; UI tidak boleh menyentuh SQL langsung.
- Migrasi memakai `PRAGMA user_version` dan ledger migrasi; snapshot wajib sebelum migrasi.
- Ukuran WASM menambah payload web; aset dibundel lokal dan di-cache Service Worker.
- Data sensitif web tidak terenkripsi seluruh file; threat model mencatat residual risk dan mewajibkan enkripsi field-level untuk Vault dan token.

## Alternatif

| Alternatif | Alasan ditolak |
|---|---|
| Lanjut Dexie | Tidak ada SQL, FTS5, vector, migrasi, dan CRDT; utang akan tumbuh. |
| SQLite WASM tanpa Worker | Memblokir UI thread dan melanggar budget frame. |
| SQLCipher WASM | Tidak didukung sebagai jalur resmi; risiko korupsi dan klaim keamanan palsu. |
| IndexedDB dengan wrapper SQL-like | Mengulang implementasi query engine dan tetap tanpa FTS5/vector. |
| OPFS + `localStorage` untuk metadata | Dua sumber data dan rawan inkonsistensi. |

## Status

`accepted`. Perubahan pada butir 1, 3, atau 4 wajib melalui RFC.
