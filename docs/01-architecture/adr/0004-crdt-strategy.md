---
id: ADR-0004
title: ADR-0004 Strategi CRDT
status: accepted
owner: architecture
prd_refs: ["§3 Modul 4", "§3 Modul 6", "§5.2"]
---

# ADR-0004 Strategi CRDT

## Konteks

Data micro-app berbentuk tabel relasional dan harus digabung antar perangkat yang offline berhari-hari. Dokumen Studio (canvas, kode, komentar) bersifat tekstual dan kolaboratif real-time. Keduanya memiliki pola konflik berbeda.

## Keputusan

1. **Data micro-app memakai `cr-sqlite`** dengan mutation log HLC. Penggabungan bersifat **column-level LWW**; nilai yang kalah disimpan di `conflict_history`.
2. **Dokumen Studio memakai Yjs** untuk multiplayer dan riwayat edit, dengan transport WebRTC atau self-host.
3. **Tidak ada dua mekanisme untuk data yang sama.** `cr-sqlite` tidak dipakai untuk dokumen teks Studio; Yjs tidak dipakai untuk tabel micro-app.
4. Mutasi membawa `hlc_timestamp` (48-bit ms + 16-bit counter + Site ID), `table_name`, `pk_hash`, dan payload terenkripsi. Perangkat yang belum mendukung skema baru menyimpan mutasi di `crdt_schema_staging`.
5. Server merupakan **relay ciphertext**; ia tidak menjalankan merge dan tidak mendekripsi.

## Konsekuensi

- Konflik kolom berbeda otomatis menyatu; konflik kolom identik deterministik dan dapat ditinjau.
- Skema tabel wajib kompatibel dengan `cr-sqlite` (primary key stabil, tanpa mutasi schema di luar migrasi).
- Ukuran mutation log tumbuh; retensi dan kompaksi wajib.
- Yjs menambah dependensi pada Studio dan membutuhkan signaling; tidak memengaruhi micro-app runtime.

## Alternatif

| Alternatif | Alasan ditolak |
|---|---|
| Yjs untuk semua data | Model dokumen tidak cocok untuk query relasional dan FTS5. |
| Last-write-wins per baris | Menghilangkan perubahan kolom lain saat dua perangkat mengedit kolom berbeda. |
| Server otoritatif | Melanggar offline-first dan E2EE. |
| Operasional transform (OT) | Butuh server pusat dan state terpusat. |
| Custom CRDT | Biaya implementasi dan audit terlalu tinggi. |

## Status

`accepted`. Perubahan pada butir 1–3 wajib melalui RFC dan ADR baru.
