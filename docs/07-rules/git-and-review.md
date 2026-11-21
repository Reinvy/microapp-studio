---
id: RULE-GIT
title: Rules Git dan Review
status: accepted
owner: dx
prd_refs: ["§12"]
---

# Rules Git dan Review

Aturan ini mengatur alur perubahan dari branch sampai merge. Tujuannya menjaga riwayat yang dapat dibaca, memastikan dokumen mendahului kode, dan membuat setiap perubahan dapat dibatalkan dengan aman.

## 1. Tujuan dan Ruang Lingkup

| Aspek | Kontrak |
|---|---|
| Branch dasar | `development`; rilis dari `main` setelah gate lulus. |
| Commit | Conventional commit, satu tujuan per commit. |
| Pull request | Wajib untuk semua perubahan, termasuk dokumen. |
| Rollback | Revert commit; riwayat bersama tidak ditulis ulang. |

Di luar cakupan: kebijakan rilis (lihat [release-gates.md](../08-quality/release-gates.md)) dan tata kelola (lihat [governance.md](../10-contributing/governance.md)).

## 2. Prinsip

1. **Docs-first.** Spec dan flow diperbarui sebelum kode perilaku, dalam branch yang sama.
2. **Kecil dan fokus.** PR besar menyembunyikan bug dan sulit ditinjau.
3. **Dapat dibatalkan.** Setiap perubahan punya rencana rollback sebelum merge.
4. **Tanpa rahasia.** Riwayat git bersifat permanen; secret yang masuk harus dirotasi.

## 3. Aturan

| ID | Level | Aturan | Verifikasi |
|---|---|---|---|
| RULE-GIT-001 | MUST | Branch dibuat dari `development` dengan nama `feat/`, `fix/`, `docs/`, `chore/`, `refactor/`, atau `test/` diikuti slug pendek, misalnya `docs/web-only-clay`. | Pemeriksaan nama branch |
| RULE-GIT-002 | MUST | Satu branch menyelesaikan satu tujuan. Perubahan tak terkait dipisah ke branch lain. | Review diff |
| RULE-GIT-003 | MUST | Perubahan perilaku MUST memperbarui spec/flow terkait lebih dulu atau dalam commit pertama branch (docs-first). Kode tanpa spec yang sesuai ditolak. | Review commit |
| RULE-GIT-004 | MUST | Pesan commit memakai format `type(scope): ringkasan` dengan tipe `feat`, `fix`, `docs`, `refactor`, `test`, `chore`; subjek imperatif dan ≤ 72 karakter. | Pemeriksaan commit |
| RULE-GIT-005 | MUST | Push langsung ke `main` atau `development` dilarang. Semua perubahan melewati pull request. | Proteksi branch |
| RULE-GIT-006 | MUST | PR dijaga ≤ 400 baris perubahan di luar lockfile dan berkas generated. Bila lebih, pecah menjadi PR berurutan yang masing-masing dapat merge sendiri. | Statistik PR |
| RULE-GIT-007 | MUST | Deskripsi PR memuat: tujuan, requirement/spec yang dirujuk, cara verifikasi yang dijalankan, risiko, dan rencana rollback. | Template PR |
| RULE-GIT-008 | MUST | Minimal satu reviewer. Perubahan pada sandbox, permission, kripto, migrasi, atau token clay memerlukan reviewer pemilik area. | Aturan review |
| RULE-GIT-009 | MUST | Reviewer memeriksa kebenaran, kepatuhan rules, test yang memadai, aksesibilitas, dan tidak ada scope creep. Komentar tanpa bukti dapat ditolak dengan penjelasan. | Review |
| RULE-GIT-010 | MUST | Setelah review dimulai, branch tidak di-force-push. Perbaikan ditambahkan sebagai commit baru; penyatuan dilakukan saat merge sesuai kebijakan repo. | Riwayat PR |
| RULE-GIT-011 | MUST | Setiap perubahan skema, format package, atau kontrak data menyertakan rencana rollback yang diuji atau dinyatakan eksplisit. Pembatalan memakai revert commit, bukan penulisan ulang riwayat. | Review, uji rollback |
| RULE-GIT-012 | MUST | Secret, kunci, atau data pribadi MUST NOT masuk commit. Bila terjadi, commit diperbaiki sebelum push dan kunci dirotasi; riwayat yang sudah dibagikan tidak ditulis ulang tanpa persetujuan maintainer. | Secret scan, review |

## 4. Alur Kerja

1. Sinkronkan `development`, lalu buat branch sesuai RULE-GIT-001.
2. Tulis atau perbarui dokumen (PRD tidak berubah tanpa RFC; spec/flow/rules sesuai kebutuhan).
3. Implementasikan perubahan terkecil yang memenuhi acceptance.
4. Jalankan gate lokal: `npm run typecheck`, `npm run lint`, `npm test`, dan `node scripts/check-docs.mjs --strict` bila menyentuh `docs/`.
5. Buka PR dengan deskripsi lengkap, lampirkan hasil verifikasi.
6. Tanggapi review dengan commit tambahan; jangan menulis ulang riwayat yang sedang ditinjau.
7. Merge setelah disetujui dan gate lulus; hapus branch.

## 5. Anti-pola

| Anti-pola | Alasan |
|---|---|
| Commit "wip" atau "fix" tanpa konteks | Riwayat tidak dapat ditelusuri. |
| Menyisipkan perubahan format besar di PR fitur | Menutupi diff sebenarnya. |
| `push --force` ke branch yang sedang ditinjau | Menghilangkan jejak review. |
| Menggabungkan dokumen dan perubahan runtime yang belum disetujui | Melanggar docs-first. |
| Menyimpan `.env` atau kunci di repo | Tidak dapat dihapus dari riwayat. |

## 6. Verifikasi

| Langkah | Perintah | Lulus bila |
|---|---|---|
| Dokumen | `node scripts/check-docs.mjs --strict` | 0 error, 0 warning. |
| Kode | `npm run typecheck && npm run lint && npm test` | Exit 0. |
| E2E (bila alur berubah) | `npm run e2e` | Flow terkait lulus. |
| Riwayat | Pemeriksaan pesan commit | Format sesuai RULE-GIT-004. |

## 7. Pengecualian

Pengecualian pada RULE-GIT-005 dan RULE-GIT-012 tidak diberikan. Pengecualian lain mengikuti [README.md](README.md) dan dicatat di deskripsi PR.
