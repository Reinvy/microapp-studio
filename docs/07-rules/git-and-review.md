---
id: RULE-GIT
title: Aturan Git dan Review
status: accepted
owner: dx
prd_refs: ["§7.2"]
---

# Aturan Git dan Review

Aturan ini mengatur branch, commit, pull request, review, dan merge agar setiap perubahan dapat dilacak ke spec, direview dengan risiko yang jelas, dan dapat di-rollback. Alur kerja lengkap ada di [workflow.md](../05-agents/workflow.md); template PR ada di [.github/pull_request_template.md](../../.github/pull_request_template.md).

## 1. Cakupan

| Area | Kewajiban utama |
|---|---|
| Branch | Nama berpola dan berumur pendek |
| Commit | Atomik, konvensional, docs-first |
| PR | Kecil, satu tujuan, menyebut spec |
| Review | Checklist dan reviewer area |
| Merge | Squash, linear, tanpa bypass |
| Rollback | Revert dan catatan risiko |
| Rilis | Changelog hanya melalui release gate |

## 2. Aturan

### 2.1 Branch dan Commit

| ID | Level | Aturan | Konsekuensi |
|---|---|---|---|
| RULE-GIT-001 | MUST | Branch MUST mengikuti pola `feat/<area>-<slug>`, `fix/<area>-<slug>`, atau `docs/<area>-<slug>` dengan slug kebab-case; branch `main` MUST dilindungi dari push langsung. | Riwayat tidak dapat diaudit; push ditolak. |
| RULE-GIT-002 | MUST | Commit MUST mengikuti `type(scope): summary` dengan tipe `feat`, `fix`, `docs`, `test`, `refactor`, `perf`, `security`, atau `chore`; summary imperatif dan ≤ 72 karakter. | Changelog dan audit otomatis tidak dapat dibuat; PR ditolak. |
| RULE-GIT-003 | MUST | Setiap commit MUST atomik: satu tujuan, build/test pada titik itu tidak sengaja rusak, dan tanpa perubahan tak terkait. | Bisect dan revert tidak dapat diandalkan; reviewer meminta commit dipecah. |
| RULE-GIT-004 | MUST | Urutan commit dalam satu PR MUST `docs:` (spec/flow/acceptance) → `feat`/`fix` (implementasi) → `docs(status):` (status dan bukti verifikasi). | Perubahan perilaku tanpa spec dianggap bug; PR ditolak. |
| RULE-GIT-005 | MUST | Commit MUST NOT memuat rahasia, kunci, token, data pengguna, atau file generated yang tidak disepakati; lockfile MUST ikut commit bila dependency berubah. | Kebocoran tidak dapat ditarik dari riwayat; PR diblokir dan kunci wajib dirotasi. |

### 2.2 Pull Request

| ID | Level | Aturan | Konsekuensi |
|---|---|---|---|
| RULE-GIT-006 | MUST | PR MUST kecil dan satu tujuan; perubahan yang menyentuh lebih dari satu area MUST dipecah kecuali saling bergantung dan dijelaskan. | Review dangkal dan risiko meningkat; PR diminta dipecah. |
| RULE-GIT-007 | MUST | Deskripsi PR MUST menyertakan `Spec: <path>#<FR-ID>` untuk perubahan perilaku, atau alasan eksplisit `docs-not-needed` untuk perubahan yang tidak mengubah perilaku. | PR tanpa jejak spec ditolak reviewer. |
| RULE-GIT-008 | MUST | Deskripsi PR MUST memuat Perubahan, Verifikasi (perintah dan hasil), Risiko/Rollback, serta checklist SDD, a11y, i18n, security, dan test. | Reviewer tidak dapat menilai kesiapan; PR dikembalikan. |
| RULE-GIT-009 | MUST | PR MUST lulus `npm run docs:check` (dengan `--strict` pada gate rilis) dan seluruh test/typecheck area terkait sebelum meminta review final. | Gate dokumentasi gagal; merge diblokir. |
| RULE-GIT-010 | MUST | Perubahan kontrak (manifest, bridge, MUIP, sync/CRDT, permission, crypto, registry, schema DB) MUST menyertakan link RFC yang diterima dan menaikkan versi kontrak. | Perubahan kontrak tanpa RFC ditolak. |

### 2.3 Review dan Merge

| ID | Level | Aturan | Konsekuensi |
|---|---|---|---|
| RULE-GIT-011 | MUST | Setiap PR MUST direview minimal satu reviewer; perubahan keamanan, kriptografi, sandbox, auth, data, atau kontrak MUST direview reviewer dari owner area terkait. | Risiko tinggi lolos tanpa ahli; merge diblokir. |
| RULE-GIT-012 | MUST | Reviewer MUST memeriksa: kesesuaian spec/acceptance, pelanggaran rules, test yang membuktikan perilaku, risiko keamanan/data, a11y/i18n, dan rollback. | Review kosmetik tidak memenuhi kewajiban; PR dikembalikan. |
| RULE-GIT-013 | MUST | Merge MUST memakai squash merge ke `main` dengan pesan `type(scope): summary` dan nomor PR; merge commit dan force-push ke branch bersama dilarang. | Riwayat linear dan changelog dapat dihasilkan; merge ditolak. |
| RULE-GIT-014 | MUST | Perubahan yang berisiko MUST memiliki rencana rollback: revert commit, feature flag, atau restore snapshot; rollback MUST diuji bila menyentuh data. | Kegagalan produksi tidak dapat dipulihkan; PR ditolak. |
| RULE-GIT-015 | MUST | Changelog dan catatan rilis MUST hanya diperbarui melalui release gate, bukan pada setiap PR fitur; hotfix MUST menyertakan dokumen retro dalam 24 jam. | Changelog tidak konsisten dan hotfix meninggalkan dokumen basi. |

## 3. Pengecualian dan Penegakan

1. Hotfix keamanan MAY melewati urutan docs-first hanya untuk menutup eksploit aktif; dokumen retro dan test regresi MUST menyusul dalam 24 jam dan dicatat di PR.
2. PR MUST NOT di-merge dengan status check yang gagal, konflik belum diselesaikan, atau diskusi reviewer yang belum dijawab.
3. Perubahan pada `main` yang tidak melalui PR MUST di-revert, kecuali operasi rilis yang terdokumentasi.
4. Branch yang sudah di-merge MUST dihapus; branch stale lebih dari 30 hari MUST ditutup atau di-rebase.

## 4. Referensi

- [sdd-workflow.md](../00-foundation/sdd-workflow.md) — docs-first dan kelas perubahan.
- [workflow.md](../05-agents/workflow.md) — alur issue sampai rilis.
- [rfc-process.md](../10-contributing/rfc-process.md) — kapan RFC diperlukan.
- [definition-of-done.md](../08-quality/definition-of-done.md) — kelengkapan bukti.
- [documentation.md](documentation.md) — aturan checker dan status.
