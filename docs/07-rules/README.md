---
id: RULE-INDEX
title: Indeks Rules
status: accepted
owner: governance
prd_refs: ["§7.2"]
---

# Indeks Rules

Rules menetapkan **cara menulis dan mengubah kode** agar sesuai dengan kontrak yang sudah ditetapkan spec. Rules bukan pengganti spec: bila sebuah aturan bertentangan dengan spec, spec menang dan aturan wajib direvisi. Setiap aturan memiliki ID, level normatif, dan konsekuensi konkret bila dilanggar.

## 1. Cakupan dan Presedensi

Presedensi berlaku penuh: **PRD > ADR accepted > spec > rules > kode**. Rules mengatur implementasi pada `apps/studio-web`, `apps/host-flutter`, `apps/selfhost-server`, `packages/core-rust`, `packages/runtime-web`, `packages/runtime-native`, `packages/sdk`, `packages/ui-kit`, `packages/ai-bridge`, dan `packages/cli`.

| Prinsip | Konsekuensi |
|---|---|
| Spec lebih dulu | Perubahan perilaku MUST mengubah spec/flow/acceptance sebelum kode; lihat [sdd-workflow.md](../00-foundation/sdd-workflow.md). |
| Satu sumber kebenaran | Rules MUST NOT menyalin isi spec; rules hanya menautkan dan menegakkan cara implementasi. |
| Konsekuensi nyata | Setiap aturan MUST dapat diperiksa oleh tool, checker, atau reviewer; aturan tanpa konsekuensi tidak boleh ditambahkan. |
| Default aman | Bila ragu, pilih perilaku yang gagal tertutup, offline, dan tanpa privilege. |

## 2. Level Normatif

| Level | Arti | Konsekuensi pelanggaran |
|---|---|---|
| **MUST** | Wajib. Tidak ada implementasi yang boleh merge tanpa memenuhinya. | PR ditolak reviewer; build/checker wajib gagal bila dapat diperiksa otomatis. |
| **SHOULD** | Sangat dianjurkan. Penyimpangan memerlukan alasan tertulis di PR dan persetujuan reviewer area. | PR dapat diterima hanya dengan justifikasi dan risiko yang dicatat. |
| **MAY** | Opsional; tidak boleh dijadikan syarat kelulusan. | Tidak ada. |

Kata "wajib" dalam prosa menjelaskan, bukan menggantikan level. Level pada tabel aturan adalah sumber normatif.

## 3. Indeks Rules

| File | Area | Owner | Fokus | Jumlah aturan |
|---|---|---|---|---|
| [typescript.md](typescript.md) | `RULE-TS-*` | dx | TypeScript, React 19, Next.js 16, boundary client/server, performa, a11y | 22 |
| [rust.md](rust.md) | `RULE-RS-*` | dx | Rust core, crypto, FFI/WASM, parser, CRDT, fuzz | 20 |
| [dart.md](dart.md) | `RULE-DART-*` | dx | Flutter host, FFI, state, golden test, a11y | 16 |
| [go.md](go.md) | `RULE-GO-*` | dx | Server Go, HTTP, auth, RBAC, SSRF, migrasi, observability | 21 |
| [ui-ux.md](ui-ux.md) | `RULE-UI-*` | dx | Token MADS, state wajib, consent, dark pattern, a11y, i18n | 20 |
| [security.md](security.md) | `RULE-SEC-*` | security | Zero trust, kriptografi, CSP, SSRF, supply chain, insiden | 20 |
| [data-migrations.md](data-migrations.md) | `RULE-DATA-*` | data | ID, HLC, SQLite, migrasi, snapshot, enkripsi, indeks turunan | 26 |
| [testing.md](testing.md) | `RULE-TEST-*` | dx | Piramida test, determinisme, offline, CRDT, sandbox, coverage | 22 |
| [git-and-review.md](git-and-review.md) | `RULE-GIT-*` | dx | Branch, commit, PR, review, merge, rollback | 15 |
| [documentation.md](documentation.md) | `RULE-DOC-*` | dx | Frontmatter, ID, section, tautan, SDD, checker, bahasa | 23 |

Total 205 aturan. Setiap aturan MUST memiliki ID unik di area-nya dan nomor berurutan tanpa gap.

## 4. Pemetaan Enforcement

| Mekanisme | Cakupan | Waktu | Catatan |
|---|---|---|---|
| `npm run docs:check` | RULE-DOC, struktur frontmatter, tautan, ID, placeholder | Setiap perubahan `docs/` | Sumber tunggal gate dokumentasi; lihat [check-docs.mjs](../../scripts/check-docs.mjs). |
| Type check dan lint per bahasa | RULE-TS, RULE-RS, RULE-DART, RULE-GO | Sebelum PR | `tsc`, `clippy`, `flutter analyze`, `go vet`; hasil dilampirkan di PR. |
| Test suite | RULE-TEST dan acceptance spec | Sebelum PR | Perintah dan gate ada di [test-strategy.md](../08-quality/test-strategy.md). |
| Review PR | Seluruh rules | Setiap PR | Checklist di [git-and-review.md](git-and-review.md); reviewer area untuk perubahan sensitif. |
| Security review | RULE-SEC, RULE-RS, kriptografi, FFI, sandbox | Perubahan kontrak keamanan | Prosedur di [security-review](../06-skills/security-review/SKILL.md). |
| Profiling | RULE-UI, RULE-TS, RULE-DATA | Fitur yang menyentuh render, query, atau sync | Anggaran di [performance-budgets.md](../08-quality/performance-budgets.md). |
| Release gate | Seluruh rules dan NFR | Setiap rilis | [release-gates.md](../08-quality/release-gates.md). |

CI belum menjadi gate pada Phase 0. Bila CI ditambahkan, CI MUST memanggil perintah yang sama dengan gate lokal dan MUST NOT menjadi satu-satunya tempat aturan ditegakkan; kegagalan lokal tetap menjadi tanggung jawab penulis PR.

## 5. Pengecualian

1. Pengecualian MUST dicatat di deskripsi PR: aturan yang dilanggar, alasan teknis, dampak keamanan/data, dan batas waktu peninjauan ulang.
2. Pengecualian pada RULE-SEC, RULE-RS, dan RULE-DATA MUST disetujui reviewer `security` atau `data`.
3. Pengecualian MUST NOT dipakai untuk melewati acceptance criteria, sandbox, signature, enkripsi, atau consent.
4. Pelanggaran yang sudah ada di Phase 0 dicatat di [implementation-status.md](../00-foundation/implementation-status.md); menambah pelanggaran baru tetap dilarang meskipun yang lama belum diperbaiki.
5. Perubahan rules yang mengubah kontrak perilaku MUST melalui RFC di [rfc-process.md](../10-contributing/rfc-process.md) sebelum diterapkan.

## 6. Hubungan dengan Spec, Skill, dan Quality

- Spec menentukan **apa** yang harus benar; rules menentukan **bagaimana** mencapainya.
- Skill menentukan **urutan kerja** untuk perubahan tertentu; lihat [06-skills/README.md](../06-skills/README.md).
- Quality menentukan **bukti** yang harus ada; lihat [definition-of-done.md](../08-quality/definition-of-done.md).
- Bila sebuah PR menyentuh lebih dari satu area, seluruh rules area terkait berlaku sekaligus; tidak ada aturan yang boleh diabaikan karena area lain lebih dominan.
