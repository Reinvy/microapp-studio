---
id: FOUND-INDEX
title: Indeks Dokumentasi
status: accepted
owner: dx
prd_refs: ["§1 Visi dan Prinsip", "§12 Definisi Selesai"]
---

# Indeks Dokumentasi

## 1. Tujuan

Indeks kanonik untuk seluruh dokumentasi MicroApp Studio. Semua dokumen aktif harus dapat dijangkau dari halaman ini. Dokumen yang tidak tertaut dianggap tidak aktif.

## 2. Presedensi

1. [PRD v3.0](00-foundation/PRD-v3.0.md) — sumber kebenaran produk.
2. [DESIGN.md](../DESIGN.md) — sumber visual kanonik.
3. Spec di `03-specs/` — kontrak requirement.
4. Flow di `04-flows/` — perilaku yang terlihat pengguna.
5. Rules di `07-rules/` — aturan implementasi.
6. Dokumen lain melengkapi, tidak bertentangan.

Jika dua dokumen bertentangan, PRD menang untuk ruang lingkup, DESIGN.md menang untuk nilai visual, dan spec menang untuk acceptance.

## 3. Fondasi

| Dokumen | Isi |
|---|---|
| [PRD v3.0](00-foundation/PRD-v3.0.md) | Visi, ruang lingkup, persona, journey, fitur, arsitektur, risiko, DoD. |
| [Product Foundation](00-foundation/product-foundation.md) | Lima pilar, metrik, mode operasi, batas produk. |
| [Glosarium](00-foundation/glossary.md) | Istilah kanonik dan istilah terlarang. |
| [Status Implementasi](00-foundation/implementation-status.md) | Fakta kode dan klaim yang dilarang. |
| [Matriks Kepatuhan](00-foundation/prd-compliance-matrix.md) | 140 requirement dengan status dan verifikasi. |
| [Roadmap Refactor](00-foundation/refactor-roadmap.md) | Tiga fase web dan gate. |
| [SDD Workflow](00-foundation/sdd-workflow.md) | Alur PRD → spec → flow → rules → kode → bukti. |

## 4. Arsitektur

| Dokumen | Isi |
|---|---|
| [System Overview](01-architecture/system-overview.md) | C4 web: browser, Next.js, worker, iframe, WASM, OPFS, service worker. |
| [Monorepo](01-architecture/monorepo.md) | Workspace nyata dan batas paket. |
| [Data Model](01-architecture/data-model.md) | Tabel host dan target DB per app. |
| [Identity & Crypto](01-architecture/identity-crypto.md) | Local identity, WebCrypto, signature, backup key. |
| [Sandbox Runtime](01-architecture/sandbox-runtime.md) | Iframe opaque origin, CSP, bridge, watchdog. |
| [Package Distribution](01-architecture/package-distribution.md) | `.mapp`, signature, index statis. |
| [Host Bridge & Intents](01-architecture/host-bridge-intents.md) | Namespace bridge, intent, deep link. |
| [Threat Model](01-architecture/threat-model.md) | Aset web dan STRIDE. |
| [AI Assist](01-architecture/ai-assist.md) | BYOK, prompt-to-draft, tanpa telemetry. |
| [ADR Index](01-architecture/adr/README.md) | Enam keputusan arsitektur aktif. |

### 4.1 ADR

| ADR | Keputusan |
|---|---|
| [ADR-0017](01-architecture/adr/0017-web-only-nextjs-pwa.md) | Web-only Next.js PWA. |
| [ADR-0018](01-architecture/adr/0018-browser-local-first-data.md) | Data lokal browser: SQLite WASM/OPFS. |
| [ADR-0019](01-architecture/adr/0019-iframe-sandbox-muip.md) | Iframe sandbox + MUIP + bridge. |
| [ADR-0020](01-architecture/adr/0020-mapp-package-signing.md) | Manifest v2 + ZIP deterministik + signature. |
| [ADR-0021](01-architecture/adr/0021-claymorphism-design-system.md) | MADS v3 Clay. |
| [ADR-0022](01-architecture/adr/0022-deferred-recovery-onboarding.md) | Recovery phrase ditunda. |

## 5. Design

| Dokumen | Isi |
|---|---|
| [DESIGN.md](../DESIGN.md) | Sumber visual kanonik claymorphism. |
| [Design System](02-design/design-system.md) | Kontrak token `--mads-*`, tema, breakpoint. |
| [Katalog Komponen](02-design/component-catalog.md) | 120 komponen, 48 core dispesifikasikan penuh. |
| [Information Architecture](02-design/information-architecture.md) | Sitemap 12 layar dan navigasi. |
| [Screen Specs](02-design/screen-specs.md) | SCR-01..SCR-12 dengan wireframe dan state. |
| [Interaction Patterns](02-design/interaction-patterns.md) | Hover, press, drag, autosave, undo, consent. |
| [Accessibility](02-design/accessibility.md) | WCAG 2.2 AA, fokus, kontras, reduced motion. |
| [Content & i18n](02-design/content-i18n.md) | Voice, copy, locale, RTL. |

## 6. Spec

| Dokumen | Requirement |
|---|---|
| [01 App Shell](03-specs/01-app-shell.md) | FR-SHELL-001..020 |
| [02 Studio](03-specs/02-studio.md) | FR-CREATE-001..012, FR-STUDIO-001..020 |
| [03 Sandbox Runtime](03-specs/03-sandbox-runtime.md) | FR-RUN-001..014 |
| [04 Data](03-specs/04-data.md) | FR-DATA-001..012 |
| [05 Packages](03-specs/05-packages.md) | FR-PACK-001..012 |
| [06 Backup](03-specs/06-backup.md) | FR-BACKUP-001..008 |
| [07 Settings](03-specs/07-settings.md) | FR-SET-001..010 |
| [08 DevTools](03-specs/08-devtools.md) | FR-DEV-001..006 |
| [Permissions](03-specs/permissions.md) | SEC-001..014 |
| [NFR](03-specs/nfr.md) | NFR-PERF/A11Y/I18N/REL/MAINT |
| [Error Codes](03-specs/error-codes.md) | 27 kode error |
| [Manifest v2](03-specs/manifest.md) | Kontrak `microapp.manifest.json` |
| [UI Protocol](03-specs/ui-protocol.md) | MUIP v1 |
| [Host Bridge](03-specs/host-bridge.md) | Namespace dan method bridge |

Schema: [manifest v2](03-specs/schemas/microapp.manifest.v2.schema.json), [registry index v1](03-specs/schemas/registry-index.v1.schema.json), [ui node v1](03-specs/schemas/ui-node.v1.schema.json).

## 7. Flow

| Flow | Judul |
|---|---|
| [Indeks Flow](04-flows/README.md) | Notasi dan konvensi error. |
| [FLOW-01](04-flows/01-first-run.md) | First Run. |
| [FLOW-02](04-flows/02-create-app.md) | Create App. |
| [FLOW-03](04-flows/03-edit-preview.md) | Edit dan Preview. |
| [FLOW-04](04-flows/04-share-install.md) | Share dan Install. |
| [FLOW-05](04-flows/05-backup-recovery.md) | Backup dan Recovery. |
| [FLOW-06](04-flows/06-permission-consent.md) | Permission Consent. |
| [FLOW-07](04-flows/07-crash-recovery.md) | Crash Recovery. |
| [FLOW-08](04-flows/08-migration.md) | Migrasi Phase 0. |

## 8. Agen dan Skill

| Dokumen | Isi |
|---|---|
| [AGENTS](05-agents/AGENTS.md) | Misi, urutan baca, invariant, DoD. |
| [Roles](05-agents/roles.md) | Sembilan peran. |
| [Workflow](05-agents/workflow.md) | Issue sampai PR. |
| [Handoff Prompts](05-agents/handoff-prompts.md) | Template konteks. |
| [Indeks Skill](06-skills/README.md) | Sepuluh skill. |

Skill: [add-shell-feature](06-skills/add-shell-feature/SKILL.md), [add-screen](06-skills/add-screen/SKILL.md), [add-ui-component](06-skills/add-ui-component/SKILL.md), [add-permission](06-skills/add-permission/SKILL.md), [write-db-migration](06-skills/write-db-migration/SKILL.md), [extend-manifest](06-skills/extend-manifest/SKILL.md), [add-package-source](06-skills/add-package-source/SKILL.md), [security-review](06-skills/security-review/SKILL.md), [docs-maintenance](06-skills/docs-maintenance/SKILL.md), [release-web](06-skills/release-web/SKILL.md).

## 9. Rules

| Dokumen | Fokus |
|---|---|
| [Indeks Rules](07-rules/README.md) | Presedensi dan enforcement. |
| [TypeScript](07-rules/typescript.md) | RULE-TS-001..020 |
| [UI/UX](07-rules/ui-ux.md) | RULE-UI-001..020 |
| [Security](07-rules/security.md) | RULE-SEC-001..016 |
| [Data Migrations](07-rules/data-migrations.md) | RULE-DATA-001..014 |
| [Testing](07-rules/testing.md) | RULE-TEST-001..014 |
| [Git & Review](07-rules/git-and-review.md) | RULE-GIT-001..012 |
| [Documentation](07-rules/documentation.md) | RULE-DOC-001..016 |
| [Rust](07-rules/rust.md) | RULE-RS-001..008 |

## 10. Quality dan Operations

| Dokumen | Isi |
|---|---|
| [Test Strategy](08-quality/test-strategy.md) | Piramida test web. |
| [Performance Budgets](08-quality/performance-budgets.md) | LCP, INP, CLS, JS, builder. |
| [Security Test Plan](08-quality/security-test-plan.md) | Sandbox, package, XSS, BYOK. |
| [Release Gates](08-quality/release-gates.md) | Gate blocking dan advisory. |
| [Definition of Done](08-quality/definition-of-done.md) | DoD per artefak. |
| [Evidence](08-quality/evidence/README.md) | Skema bukti dan aturan status. |
| [Baseline](08-quality/evidence/baseline.md) | Hasil verifikasi nyata. |
| [Deployment](09-operations/deployment.md) | Deploy Next.js/PWA, header, rollback. |
| [Incident Response](09-operations/incident-response.md) | Insiden web dan komunikasi. |

## 11. Kontribusi

| Dokumen | Isi |
|---|---|
| [Governance](10-contributing/governance.md) | Maintainer, rilis, lisensi. |
| [RFC Process](10-contributing/rfc-process.md) | Perubahan manifest, bridge, permission, token, package. |
| [Package Policy](10-contributing/package-policy.md) | Kebijakan `.mapp`, signature, delisting. |

## 12. Template

| Template | Dipakai untuk |
|---|---|
| [Spec](templates/spec.md) | Spec requirement baru. |
| [Flow](templates/flow.md) | Flow baru. |
| [ADR](templates/adr.md) | Keputusan arsitektur. |
| [RFC](templates/rfc.md) | Usulan perubahan kontrak. |
| [Skill](templates/skill.md) | Skill baru. |
| [Component Spec](templates/component-spec.md) | Komponen clay baru. |

## 13. Menjalankan Checker

```bash
cd microapp-studio
node scripts/check-docs.mjs --strict
node scripts/generate-catalog.mjs --check
npm run verify:web
```

Checker memvalidasi frontmatter, H1, section wajib, ID, tautan, anchor, cakupan matriks, JSON, dan keterjangkauan. `--strict` mengubah warning menjadi error.

## 14. Status

Dokumentasi ini adalah kontrak untuk pekerjaan implementasi berikutnya. Banyak requirement masih `partial` atau `missing`; lihat [matriks](00-foundation/prd-compliance-matrix.md) dan [status](00-foundation/implementation-status.md). Tidak ada dokumen aktif yang menyatakan fitur belum ada sebagai sudah ada.
