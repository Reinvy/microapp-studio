---
id: DOC-ARCHIVE
title: Arsip Phase 0
status: accepted
owner: governance
prd_refs: ["§8"]
---

# Arsip Phase 0

Folder ini menyimpan dokumen prototipe Phase 0 untuk sejarah. **Arsip bukan normatif**: tidak boleh dijadikan acuan implementasi baru, tidak dipakai untuk klaim status, dan tidak diperbarui mengikuti keputusan baru.

## 1. Isi

| Berkas | Asal | Catatan |
|---|---|---|
| [phase0/architecture.html](phase0/architecture.html) | `docs/architecture.html` (dipindah dengan `git mv`) | Diagram prototipe Prompt → Schema → Runner. Diberi banner legacy; isi lain tidak diubah. |
| [phase0/ops-report-2026-07-28.md](phase0/ops-report-2026-07-28.md) | `docs/devops/ops-report-20260728.md` (dipindah dengan `git mv`) | Laporan operasi 2026-07-28. Diberi header arsip; data historis tidak diubah. |

## 2. Dokumen Aktif

Dokumen aktif ada di:

- [docs/README.md](../README.md) — peta lengkap.
- [docs/00-foundation](../00-foundation/product-foundation.md) — niat produk, SDD, glosarium, status.
- [docs/01-architecture](../01-architecture/system-overview.md) — arsitektur dan ADR.
- [docs/03-specs](../03-specs/01-host-shell.md) — kontrak normatif.
- [docs/02-design](../02-design/design-system.md) — design system kanonik.

## 3. Aturan

1. Arsip **tidak** diperiksa frontmatter, section wajib, ID, dan placeholder oleh `scripts/check-docs.mjs`; hanya tautan yang divalidasi.
2. Arsip tidak boleh dikutip sebagai bukti status implementasi; gunakan [implementation-status.md](../00-foundation/implementation-status.md).
3. Klaim pada arsip (jumlah test, hasil deploy, versi framework) adalah snapshot historis dan tidak berlaku sekarang.
4. Penambahan arsip baru wajib melalui PR `docs:` yang menjelaskan alasan dan menautkan penggantinya.
