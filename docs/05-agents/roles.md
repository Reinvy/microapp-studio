---
id: AGENT-ROLES
title: Peran dan Batas Path
status: accepted
owner: governance
prd_refs: ["§7.2"]
---

# Peran dan Batas Path

Dokumen ini menetapkan 12 peran kerja, path yang boleh diubah, dokumen dan skill wajib, reviewer, serta output yang diharapkan. Aturan operasional agen ada di [AGENTS.md](AGENTS.md); prosedur PR ada di [workflow.md](workflow.md).

## 1. Model Peran

- Satu PR MUST memiliki satu peran utama; perubahan lintas peran dipecah menjadi PR terpisah.
- Path milik peran adalah **hak edit eksklusif**; peran lain hanya membaca dan mengusulkan lewat handoff.
- Peran reviewer MUST berbeda dari peran penulis dan MUST memeriksa acceptance, bukan gaya penulisan.
- Peran mengikuti nilai `owner` pada frontmatter dokumen; `governance` menjadi pemilik proses, bukan pemilik seluruh isi.
- Perubahan kontrak arsitektur (ADR, manifest, MUIP, host bridge, sync, permission, crypto, registry, skema DB) MUST melalui peran architect dan RFC, apa pun peran penulisnya.

## 2. Daftar Peran

| Peran | Fokus | Path yang boleh diubah | Dokumen wajib | Skill wajib | Reviewer | Output |
|---|---|---|---|---|---|---|
| product | Niat produk, cakupan, matriks kepatuhan, status fase | `docs/00-foundation/**` (kecuali isi PRD), baris status pada `README.md` | PRD salinan, product-foundation, sdd-workflow, prd-compliance-matrix, implementation-status | docs-maintenance | architect | Requirement siap-spec, matriks kepatuhan terbarui, status fase akurat |
| architect | Arsitektur, ADR, kontrak lintas modul, RFC | `docs/01-architecture/**`, `docs/03-specs/{manifest-v2,ui-protocol,host-bridge,error-codes,nfr}.md`, `docs/03-specs/schemas/**`, `docs/10-contributing/**` | system-overview, monorepo, seluruh arsitektur modul, adr/README, sdd-workflow, rfc-process | extend-manifest, security-review | security, maintainer council untuk kontrak | ADR/RFC, spec kontrak, schema, catatan kompatibilitas |
| host-runtime | Host Shell dan sandbox runtime web | `apps/studio-web` (permukaan Host), `packages/runtime-web/**`, `docs/03-specs/{01-host-shell,03-sandbox-runtime}.md` | 01-host-shell, 03-sandbox-runtime, host-bridge, permissions, error-codes, sandbox-capabilities, host-bridge-intents, `04-flows/01-first-run.md`, `04-flows/11-permission-consent.md`, `04-flows/12-crash-recovery.md` | add-host-feature, add-permission | qa; security untuk permission/sandbox | Fitur Host terisolasi, broker permission, error boundary, test offline |
| studio-web | Studio IDE, ui-kit web, SDK/CLI TypeScript, AI bridge | `apps/studio-web` (Studio), `packages/ui-kit` sisi web, `packages/sdk/**`, `packages/cli/**`, `packages/ai-bridge/**`, `docs/03-specs/{02-studio-ide,08-devtools-cli-sdk}.md` | 02-studio-ide, ui-protocol, manifest-v2, 08-devtools-cli-sdk, design-system, component-catalog, `07-rules/typescript.md`, `07-rules/ui-ux.md` | add-ui-component, add-host-feature | design + qa | Canvas, editor, AI flow, CLI/SDK dengan exit code terdokumentasi |
| native | Host Flutter dan runtime native | `apps/host-flutter/**`, `packages/runtime-native/**`, `packages/ui-kit` sisi Flutter, `docs/03-specs/01-host-shell.md` bagian native | 01-host-shell, 03-sandbox-runtime, ui-protocol, host-bridge, nfr, `07-rules/dart.md`, design-system | add-ui-component, add-permission | host-runtime + design | Host mobile/desktop, bridge FFI, golden test, paritas perilaku dengan web |
| data-sync | SQLite, migrasi, CRDT, transport sync, backup, workflow engine | `packages/core-rust` (storage, CRDT, parser), `apps/studio-web/src/db/**`, transport sync, `docs/03-specs/{04-data-automation,06-sync-backup}.md` | 04-data-automation, 06-sync-backup, data-model, sync-crdt, `07-rules/data-migrations.md`, `07-rules/rust.md` | write-db-migration, add-sync-transport, add-workflow-node | architect + qa | Migrasi forward/rollback, mutation log, handshake sync, ekspor/restore |
| registry | Registry client, signature, supply chain, publikasi | `packages/core-rust` (paket, verifikasi), klien registry di `apps/studio-web`, `docs/03-specs/05-registry.md`, `docs/03-specs/schemas/registry-index.v1.schema.json` | 05-registry, manifest-v2, registry-supply-chain, registry-index schema, `10-contributing/registry-policy.md`, `07-rules/security.md` | add-registry-source | security + architect | Sumber registry, verifikasi signature/TOFU, delta update, rollback |
| server | Server self-host, deploy, operasi | `apps/selfhost-server/**`, `deploy/**`, `docs/03-specs/07-selfhost.md`, `docs/09-operations/**`, `01-architecture/selfhost.md` | 07-selfhost, selfhost, nfr, selfhost-runbook, backup-restore, `07-rules/go.md`, `07-rules/security.md` | release-selfhost | security + qa | Binary/Compose/Helm, auth, RBAC, audit chain, runbook |
| design | MADS, layar, interaksi, a11y, i18n | `docs/02-design/**`, token MADS di `packages/ui-kit` (definisi token, bukan komponen) | design-system, component-catalog, information-architecture, screen-specs, accessibility, content-i18n, ADR-0010 | add-ui-component | studio-web + native | Token, spesifikasi layar, pola interaksi, checklist a11y/i18n |
| qa | Strategi test, gate rilis, verifikasi acceptance | test suite (`**/__tests__/**`, `tests/**`, `e2e/**`), `docs/08-quality/**` | test-strategy, performance-budgets, security-test-plan, release-gates, definition-of-done, `07-rules/testing.md` | security-review | pemilik modul | Test plan, fixture, laporan gate, bukti acceptance |
| security | Threat model, permission, crypto, review | `docs/01-architecture/threat-model.md`, `docs/03-specs/permissions.md`, `docs/08-quality/security-test-plan.md`, `SECURITY.md`, review modul crypto di `packages/core-rust` | threat-model, identity-crypto, permissions, sandbox-capabilities, security-test-plan, `07-rules/security.md` | security-review, add-permission | architect | Temuan ber-severity, baris threat model, test keamanan, rotasi kunci |
| docs/release | Integritas dokumen, checker, root policy, rilis | `docs/README.md`, lintas `docs/**` untuk perbaikan tautan/format, `scripts/check-docs.mjs`, `.github/**`, root policy files, `package.json` (scripts), `CHANGELOG.md` | docs/README, sdd-workflow, `07-rules/documentation.md`, `07-rules/git-and-review.md`, governance, rfc-process, release-gates | docs-maintenance, release-selfhost | product + architect | Docs check hijau, PR template, release notes, tag bertanda tangan |

## 3. Batas Path Rinci

Tabel berikut menyelesaikan sengketa path. Semua peran boleh membaca seluruh repo; yang dibatasi adalah hak edit.

| Prefix path | Pemilik edit | Catatan |
|---|---|---|
| `docs/00-foundation/PRD-v2.0.md` | product | Hanya sinkronisasi verbatim dengan PRD asli; isi tidak boleh diubah |
| `docs/00-foundation/product-foundation.md`, `glossary.md` | product | Perubahan istilah wajib disinkronkan ke glossary sebelum dipakai di spec |
| `docs/00-foundation/sdd-workflow.md`, `prd-compliance-matrix.md` | product | Matriks diperbarui setiap requirement ditambah atau status berubah |
| `docs/00-foundation/implementation-status.md` | product | Angka dan fakta wajib diverifikasi ulang; bukan tempat klaim |
| `docs/01-architecture/**` | architect | `threat-model.md` ditulis bersama security; security memegang konten ancaman |
| `docs/02-design/**` | design | Perubahan token wajib melalui ADR-0010 |
| `docs/03-specs/01-host-shell.md` | host-runtime | |
| `docs/03-specs/02-studio-ide.md` | studio-web | |
| `docs/03-specs/03-sandbox-runtime.md` | host-runtime | |
| `docs/03-specs/04-data-automation.md` | data-sync | |
| `docs/03-specs/05-registry.md` | registry | |
| `docs/03-specs/06-sync-backup.md` | data-sync | |
| `docs/03-specs/07-selfhost.md` | server | |
| `docs/03-specs/08-devtools-cli-sdk.md` | studio-web | |
| `docs/03-specs/manifest-v2.md`, `ui-protocol.md`, `host-bridge.md`, `error-codes.md`, `nfr.md` | architect | Kontrak lintas modul; perubahan wajib RFC |
| `docs/03-specs/permissions.md` | security | Perubahan katalog permission wajib review architect |
| `docs/03-specs/schemas/**` | architect | Schema registry boleh diusulkan registry, diedit architect |
| `docs/04-flows/**` | peran modul terkait | Flow lintas modul ditulis bersama; spec menang saat konflik |
| `docs/05-agents/**` | docs/release | Perubahan peran wajib review product |
| `docs/06-skills/**` | docs/release | Isi prosedur divalidasi pemilik modul |
| `docs/07-rules/**` | architect + docs/release | Rules bahasa dimiliki architect; format checker dimiliki docs/release |
| `docs/08-quality/**` | qa | `security-test-plan.md` dimiliki security |
| `docs/09-operations/**` | server | Insiden dan backup wajib review security |
| `docs/10-contributing/**` | architect | Governance dan kebijakan registry wajib review product |
| `docs/templates/**` | docs/release | Template memakai placeholder dan status `draft` |
| `apps/studio-web/**` | host-runtime dan studio-web | Dibagi per permukaan: Host vs Studio; sengketa diputuskan architect |
| `apps/host-flutter/**` | native | |
| `apps/selfhost-server/**` | server | |
| `packages/core-rust/**` | data-sync, registry, security | Modul storage/CRDT/parser milik data-sync; paket/verifikasi milik registry; crypto milik security |
| `packages/runtime-web/**` | host-runtime | |
| `packages/runtime-native/**` | native | |
| `packages/sdk/**`, `packages/cli/**`, `packages/ai-bridge/**` | studio-web | Perubahan kontrak SDK wajib review architect |
| `packages/ui-kit/**` | studio-web dan native | Token dimiliki design; komponen web dan Flutter dimiliki peran platform |
| `deploy/**` | server | |
| `scripts/check-docs.mjs` | docs/release | Perubahan perilaku checker wajib test fixture |
| `package.json` | docs/release (scripts), architect (dependency) | Dependency baru wajib review supply chain |
| `.github/**` | docs/release | |
| `AGENTS.md`, `README.md`, `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`, `DESIGN.md`, `LICENSE`, `CHANGELOG.md` | docs/release | `LICENSE` dan lisensi paket mengikuti ADR-0009; `SECURITY.md` ditinjau security; `DESIGN.md` ditinjau design; baris status produk pada `README.md` disetujui product |

## 4. Kewenangan Khusus

| Keputusan | Pemilik | Konsultasi wajib |
|---|---|---|
| Menambah atau mengubah requirement | peran modul | architect |
| Menambah ADR baru atau supersede | architect | security untuk keamanan, product untuk niat produk |
| Menaikkan versi kontrak (manifest, bridge, MUIP, registry index) | architect | registry, studio-web, native |
| Menambah permission atau risk tier | security | host-runtime, native, design |
| Menambah dependency runtime | architect | security |
| Mengubah lisensi | maintainer council | product, docs/release |
| Menetapkan status `implemented` | peran modul | qa |
| Menerbitkan rilis | docs/release | qa, security, server |
| Menghapus atau menggabungkan dokumen | docs/release | pemilik dokumen |

## 5. Cron Agent Phase 0 ke Peran Target

Lima cron agent Phase 0 MUST memakai batas peran di atas. Cron agent MUST NOT mendapat hak tambahan karena berjalan otomatis.

| Cron agent | Peran target | Batas tambahan |
|---|---|---|
| Feature | host-runtime atau studio-web | MUST membuka PR dengan baris `Spec:`; MUST NOT mengubah spec tanpa review; MUST NOT merge |
| UI/UX | design, dengan implementasi oleh studio-web | Token-only; MUST NOT menambah warna/ukuran di luar MADS; wajib menyertakan bukti a11y |
| Content/Seed | product untuk copy, studio-web untuk data seed | Seed MUST idempoten, tanpa secret, dan tidak menimpa data pengguna |
| Test | qa | MUST NOT menghapus atau `skip` test yang gagal; snapshot saja bukan bukti |
| Maintenance | docs/release | Hanya perubahan docs/format/tautan; perubahan perilaku wajib PR terpisah dengan peran modul |

Cron agent yang menemukan pekerjaan di luar peran targetnya MUST berhenti dan membuat handoff, bukan melanjutkan.

## 6. Aturan Serah Terima Lintas Peran

1. Penulis MUST menyiapkan context package sesuai [handoff-prompts.md](handoff-prompts.md); path dan acceptance disebut eksplisit.
2. Peran penerima MUST memverifikasi bahwa acceptance yang diminta tidak bertentangan dengan spec sebelum mulai.
3. Penulis MUST NOT mengedit path penerima "sementara"; perubahan parsial di dua peran menghasilkan review ganda.
4. Bila satu perubahan kontrak menyentuh banyak peran, architect memecah pekerjaan menjadi urutan PR: kontrak → implementasi web/native → dokumentasi status.
5. Konflik kepemilikan path diselesaikan oleh architect dan dicatat pada PR, bukan diselesaikan diam-diam dengan menimpa berkas.

## 7. Verifikasi

| Bukti | Prosedur |
|---|---|
| Kepatuhan frontmatter dan tautan | `node scripts/check-docs.mjs --strict` |
| Setiap peran punya dokumen dan skill wajib | Tabel §2 ditinjau setiap rilis oleh docs/release |
| Tidak ada PR lintas peran | Review PR: satu peran utama, handoff tertaut bila ada |
| Cron agent tidak melebihi batas | Audit commit per cron agent pada branch masing-masing |
