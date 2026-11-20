---
id: ADR-0016
title: ADR-0016 Rekonsiliasi Dokumen, Fase, dan Bukti Status
status: accepted
owner: governance
prd_refs: ["§1", "§7.2", "§8"]
---

# ADR-0016 Rekonsiliasi Dokumen, Fase, dan Bukti Status

## Konteks

Audit paket dokumen menemukan 52 titik pertentangan antar dokumen: nama tabel dan field ganda, kontrak yang belum tertutup, requirement yang dijadwalkan pada fase berbeda, dan klaim status yang tidak dapat diverifikasi. Presedensi sudah ditetapkan di [docs/README.md](../../README.md) §2, tetapi belum ada mekanisme yang memaksa status matriks hanya berubah berdasarkan bukti yang dijalankan.

## Keputusan

1. **Presedensi mengikat.** PRD > ADR `accepted` > `03-specs` > `07-rules` > kode. Bila dua spec bertentangan, requirement yang lebih spesifik menang; arsitektur di `01-architecture` yang bertentangan dengan spec diperbaiki, bukan diabaikan.
2. **Satu paket ADR rekonsiliasi.** ADR-0011 sampai ADR-0015 menetapkan kontrak kanonik untuk database host, identitas/Vault, manifest dan signature, sandbox/bridge, serta backup/workflow/CRDT/registry/RBAC. Seluruh dokumen pada [refactor-roadmap.md](../../00-foundation/refactor-roadmap.md) §3 wajib mencerminkannya pada commit yang sama.
3. **Fase requirement dikoreksi.** `FR-HOST-019` (WebPush/UnifiedPush) dijadwalkan fase 5 karena bergantung pada server; `FR-HOST-010` (pencarian semantik `sqlite-vec`) fase 2 karena bergantung pada schema designer dan data layer; `FR-HOST-026` (jumlah antrean sync) fase 3 karena bergantung pada sync. `FR-HOST-021`, `FR-HOST-009`, dan `FR-HOST-006` tetap fase 1 karena dependensinya ditarik maju secara minimal.
4. **Status hanya dari bukti.** Status matriks hanya dinaikkan oleh `scripts/apply-status.mjs` yang membaca evidence JSON produksi `scripts/verify-phase-<n>.mjs`. Skrip menolak ID yang tidak dikenal dan status tanpa bukti. Gate perangkat atau layanan yang tidak tersedia di lingkungan verifikasi dicatat `partial` atau `blocked` dengan bukti manual, tidak pernah `implemented`.
5. **Setiap fase punya evidence record.** `docs/08-quality/evidence/phase-<n>.json` dan `.md` memuat perintah, SHA commit, timestamp, hasil, serta daftar requirement dan suite keamanan yang dibuktikan. Template dan aturan pengisian ada di [evidence/README.md](../../08-quality/evidence/README.md).
6. **Tidak ada klaim tanpa eksekusi.** Dokumen, README, PR, dan materi rilis wajib merujuk evidence yang ada. Klaim "sudah ada" untuk fitur yang belum dijalankan adalah pelanggaran [definition-of-done.md](../../08-quality/definition-of-done.md).
7. **Amandemen kontrak baru.** Keputusan kontrak yang ditemukan saat implementasi wajib menjadi commit `docs:` plus ADR sebelum kode; keputusan tidak boleh hidup hanya di kode.

## Konsekuensi

- Perubahan kontrak menjadi lebih lambat karena selalu melewati dokumen dan ADR, tetapi mencegah divergensi yang sudah terjadi sebelumnya.
- Matriks menjadi satu-satunya sumber status; dokumen spec tidak boleh menyatakan tingkat implementasi.
- Roadmap harus diperbarui setiap gate fase karena skrip verifikasi membaca dan menulis evidence dengan format tetap.
- Review wajib menolak PR yang mengubah perilaku tanpa memperbarui dokumen pada commit yang sama.

## Alternatif

| Alternatif | Alasan ditolak |
|---|---|
| Mempercayai status manual di matriks | Sudah terbukti menghasilkan klaim tanpa bukti. |
| Menyatukan semua keputusan dalam satu ADR besar | Sulit ditautkan per domain dan sulit disupersede sebagian. |
| Menunda rekonsiliasi sampai kode fase 1 selesai | Kode akan dibangun di atas kontrak yang saling bertentangan. |
| Menandai gate perangkat yang tidak tersedia sebagai `implemented` | Melanggar definition of done dan menyesatkan pengguna. |

## Status

`accepted`. Roadmap eksekusi dan status per langkah ada di [refactor-roadmap.md](../../00-foundation/refactor-roadmap.md); template bukti ada di [evidence/README.md](../../08-quality/evidence/README.md).
