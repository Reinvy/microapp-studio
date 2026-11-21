---
id: FLOW-INDEX
title: Indeks Flow
status: accepted
owner: product
prd_refs: ["§4 User Journey"]
---

# Indeks Flow

## 1. Tujuan

Menjadi indeks delapan flow produk web-only, notasi yang dipakai, konvensi error, dan tautan ke requirement terkait. Flow adalah jembatan antara requirement dan implementasi.

## 2. Daftar Flow

| Flow | Judul | Requirement utama | Artefak |
|---|---|---|---|
| FLOW-01 | [First Run](01-first-run.md) | FR-SHELL-002 | Identitas lokal, Home, banner amankan data |
| FLOW-02 | [Create App](02-create-app.md) | FR-CREATE-001 | Template, Magic Create, blank |
| FLOW-03 | [Edit dan Preview](03-edit-preview.md) | FR-STUDIO-001 | Builder, autosave, preview |
| FLOW-04 | [Share dan Install](04-share-install.md) | FR-PACK-005 | `.mapp`, signature, instalasi |
| FLOW-05 | [Backup dan Recovery](05-backup-recovery.md) | FR-BACKUP-001 | `.mapp-backup`, restore |
| FLOW-06 | [Permission Consent](06-permission-consent.md) | SEC-003 | Consent JIT, revoke, cage |
| FLOW-07 | [Crash Recovery](07-crash-recovery.md) | FR-RUN-008 | Watchdog, boundary, budget |
| FLOW-08 | [Migrasi Phase 0](08-migration.md) | FR-DATA-004 | Dexie read-only, idempoten |

## 3. Notasi

- Nomor langkah menunjukkan urutan yang terlihat pengguna, bukan urutan internal.
- Aksi pengguna ditulis **tebal**; status sistem ditulis `monospace`.
- Setiap flow memiliki tabel cabang gagal dengan kode error dari [error-codes.md](../03-specs/error-codes.md).
- Acceptance Criteria harus dapat diuji tanpa membaca kode.
- Verifikasi menyebut alat dan kondisi, bukan hasil yang diharapkan secara umum.

## 4. Konvensi Error

1. Setiap kegagalan yang terlihat pengguna memakai kode `E-*` yang terdaftar.
2. Flow tidak boleh menciptakan kode baru.
3. Cabang gagal harus menyebut pemulihan, bukan hanya penyebab.
4. Tidak ada flow yang berakhir di layar buntu tanpa aksi.

## 5. Acceptance Criteria

1. Setiap flow mereferensikan minimal satu requirement.
2. Setiap flow memiliki empat bagian wajib: Alur Utama, Cabang Gagal, Acceptance Criteria, Verifikasi.
3. Tidak ada flow yang membutuhkan akun, server, atau jaringan wajib.
4. Semua tautan flow valid dan dapat dijangkau dari indeks ini.

## 6. Verifikasi

| Pemeriksaan | Cara |
|---|---|
| Kelengkapan | `node scripts/check-docs.mjs --strict` |
| Requirement | Setiap flow memuat minimal satu ID FR/SEC. |
| Tautan | Checker memvalidasi link dan anchor. |
