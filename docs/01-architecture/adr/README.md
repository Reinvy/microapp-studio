---
id: ARCH-ADR-INDEX
title: Indeks Architecture Decision Records
status: accepted
owner: architecture
prd_refs: ["§4.2", "§7.2"]
---

# Indeks Architecture Decision Records

ADR merekam keputusan arsitektur yang mengikat. ADR yang berstatus `accepted` menang atas spec sampai spec diperbarui, dan wajib segera dicerminkan ke spec.

## 1. Daftar ADR

| ADR | Judul | Status | Dampak utama |
|---|---|---|---|
| [ADR-0001](0001-monorepo-web-stack.md) | Monorepo, npm Workspaces, dan Web Stack | accepted | Struktur repo, Next.js + Flutter |
| [ADR-0002](0002-sqlite-wasm-opfs.md) | SQLite WASM dan OPFS | accepted | Persistence web |
| [ADR-0003](0003-rust-shared-core.md) | Rust Shared Core | accepted | Crypto, CRDT, parser, guard |
| [ADR-0004](0004-crdt-strategy.md) | Strategi CRDT | accepted | `cr-sqlite` + Yjs |
| [ADR-0005](0005-go-selfhost-server.md) | Server Self-Host Go | accepted | Server, database, queue |
| [ADR-0006](0006-mapp-package-format.md) | Format Paket `.mapp` | accepted | Distribusi dan signature |
| [ADR-0007](0007-sandbox-strategy.md) | Strategi Sandbox dan MUIP | accepted | Isolasi runtime dan UI |
| [ADR-0008](0008-identity-auth.md) | Identitas dan Auth | accepted | Local Identity, SSO server |
| [ADR-0009](0009-license-governance.md) | Lisensi dan Tata Kelola | accepted | Apache-2.0 + MIT |
| [ADR-0010](0010-design-system.md) | Design System MADS | accepted | Token dan komponen |

## 2. Format

Setiap ADR memuat:

1. `Konteks` — masalah, batasan, kekuatan.
2. `Keputusan` — pilihan yang mengikat, termasuk default dan versi.
3. `Konsekuensi` — dampak, biaya, larangan.
4. `Alternatif` — pilihan yang ditolak dan alasannya.
5. `Status` — `accepted`, `deprecated`, atau `superseded by ADR-NNNN`.

## 3. Aturan Supersede

1. ADR tidak diedit untuk mengubah keputusan; buat ADR baru dan tandai yang lama `superseded by ADR-NNNN`.
2. ADR baru wajib menautkan ADR yang digantikan dan menjelaskan migrasi.
3. Spec yang terdampak wajib diperbarui pada PR yang sama atau PR lanjutan yang segera menyusul.
4. Perubahan kontrak (manifest, bridge, sync, permission, crypto, registry) wajib melalui [RFC](../../10-contributing/rfc-process.md) sebelum ADR baru diterima.
5. ADR yang tidak lagi relevan menjadi `deprecated`, bukan dihapus.

## 4. Keputusan yang Tidak Boleh Diubah Tanpa RFC

Keputusan pada ADR-0002 sampai ADR-0009 menyentuh data pengguna atau kontrak ekosistem. Perubahannya wajib melalui RFC dan analisis kompatibilitas; tanpa itu, reviewer wajib menolak PR.
