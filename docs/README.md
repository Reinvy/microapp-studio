---
id: DOC-INDEX
title: Dokumentasi MicroApp Studio
status: accepted
owner: governance
prd_refs: ["§1", "§7.1", "§7.2"]
---

# Dokumentasi MicroApp Studio

Dokumentasi ini adalah **sumber kebenaran normatif** untuk seluruh ekosistem MicroApp Studio: Host Shell, Studio IDE, sandbox runtime, data layer, sync, registry, server self-hosted, DevTools/CLI/SDK, serta proses kontribusi. Kode yang berperilaku berbeda dari dokumen dianggap bug.

Dokumen ditulis dalam Bahasa Indonesia. Identifier, nama file, API, field JSON, enum, perintah CLI, dan tipe data tetap Bahasa Inggris.

## 1. Cara Membaca

| Pembaca | Urutan baca |
|---|---|
| **Agen baru** | [docs/README.md](README.md) → [05-agents/AGENTS.md](05-agents/AGENTS.md) → [00-foundation/product-foundation.md](00-foundation/product-foundation.md) → [00-foundation/sdd-workflow.md](00-foundation/sdd-workflow.md) → [01-architecture/system-overview.md](01-architecture/system-overview.md) → spec modul tugas → [07-rules/README.md](07-rules/README.md) → skill terkait |
| **Implementer per modul** | [01-architecture/system-overview.md](01-architecture/system-overview.md) → spec modul di [03-specs](03-specs/01-host-shell.md) → flow terkait di [04-flows](04-flows/README.md) → [07-rules/README.md](07-rules/README.md) → [06-skills/README.md](06-skills/README.md) |
| **Reviewer** | Spec + acceptance (`## 7`/`## 8`) → [08-quality/definition-of-done.md](08-quality/definition-of-done.md) → [08-quality/release-gates.md](08-quality/release-gates.md) → [05-agents/workflow.md](05-agents/workflow.md) → [07-rules/git-and-review.md](07-rules/git-and-review.md) |
| **Designer** | [02-design/design-system.md](02-design/design-system.md) → [02-design/information-architecture.md](02-design/information-architecture.md) → [02-design/screen-specs.md](02-design/screen-specs.md) → [02-design/interaction-patterns.md](02-design/interaction-patterns.md) → [02-design/accessibility.md](02-design/accessibility.md) → [02-design/content-i18n.md](02-design/content-i18n.md) |
| **Operator self-host** | [03-specs/07-selfhost.md](03-specs/07-selfhost.md) → [01-architecture/selfhost.md](01-architecture/selfhost.md) → [09-operations/selfhost-runbook.md](09-operations/selfhost-runbook.md) → [09-operations/backup-restore.md](09-operations/backup-restore.md) → [09-operations/incident-response.md](09-operations/incident-response.md) |

## 2. Presedensi dan Sumber Kebenaran

Urutan presedensi saat dua dokumen berbeda:

1. **PRD** (`../PRD.MD`, salinan di [00-foundation/PRD-v2.0.md](00-foundation/PRD-v2.0.md)) — niat produk.
2. **ADR berstatus `accepted`** di [01-architecture/adr](01-architecture/adr/README.md) — keputusan arsitektur yang mengikat.
3. **Spec** di [03-specs](03-specs/01-host-shell.md) beserta JSON Schema di [03-specs/schemas](03-specs/schemas/microapp.manifest.v2.schema.json).
4. **Rules** di [07-rules](07-rules/README.md).
5. **Kode** dan test.

ADR yang diterima **wajib segera dicerminkan ke spec**. Selama spec belum direvisi, ADR menang dan spec harus diperbaiki, bukan diabaikan. PRD yang berubah menang atas ADR; ADR yang terdampak wajib disupersede.

Status implementasi **tidak** dinyatakan di spec; status ada di [00-foundation/implementation-status.md](00-foundation/implementation-status.md) dan [00-foundation/prd-compliance-matrix.md](00-foundation/prd-compliance-matrix.md).

## 3. Legenda Status

| Status | Arti |
|---|---|
| `draft` | Belum disetujui; tidak boleh dipakai sebagai dasar implementasi. Hanya dipakai oleh [templates](templates/spec.md). |
| `accepted` | Disetujui dan mengikat. Perubahan perilaku wajib mengubah dokumen ini lebih dulu. |
| `implemented` | Seluruh acceptance criteria sudah diverifikasi pada kode dan bukti verifikasi dicatat di spec `## 8. Verifikasi`. |
| `deprecated` | Dipertahankan untuk sejarah; tidak boleh dirujuk untuk pekerjaan baru. |

Paket dokumen ini tidak memuat status `draft`.

## 4. Peta Dokumen

### 4.1 Indeks dan fondasi

| Dokumen | Isi |
|---|---|
| [README.md](README.md) | Indeks ini: peta dokumen, presedensi, indeks ID, protokol pembaruan. |
| [00-foundation/PRD-v2.0.md](00-foundation/PRD-v2.0.md) | Salinan referensi PRD v2.0 (verbatim). |
| [00-foundation/product-foundation.md](00-foundation/product-foundation.md) | Visi, pilar, prinsip, persona, mode operasi, metrik, batas produk. |
| [00-foundation/sdd-workflow.md](00-foundation/sdd-workflow.md) | Spec-Driven Development: siklus, kelas perubahan, commit docs-first, review. |
| [00-foundation/glossary.md](00-foundation/glossary.md) | Istilah kanonik dan sinonim terlarang. |
| [00-foundation/implementation-status.md](00-foundation/implementation-status.md) | Status nyata kode Phase 0 versus target PRD, utang keamanan. |
| [00-foundation/prd-compliance-matrix.md](00-foundation/prd-compliance-matrix.md) | Matriks setiap requirement dan setiap bagian PRD ke spec, flow, fase, status, verifikasi. |

### 4.2 Arsitektur dan ADR

| Dokumen | Isi |
|---|---|
| [01-architecture/system-overview.md](01-architecture/system-overview.md) | Konteks C4, container, mode runtime, process model, trust boundary, port. |
| [01-architecture/monorepo.md](01-architecture/monorepo.md) | Struktur monorepo target, paket, aturan dependency, versioning kontrak. |
| [01-architecture/data-model.md](01-architecture/data-model.md) | ERD, tabel lokal dan server, tipe, index, migrasi, enkripsi. |
| [01-architecture/identity-crypto.md](01-architecture/identity-crypto.md) | Hierarki kunci, envelope, penyimpanan kunci, pairing, rotasi. |
| [01-architecture/sandbox-capabilities.md](01-architecture/sandbox-capabilities.md) | Runtime web/native, capability broker, kuota, lifecycle, error boundary. |
| [01-architecture/sync-crdt.md](01-architecture/sync-crdt.md) | HLC, mutation log, handshake, transport, konflik, schema staging. |
| [01-architecture/threat-model.md](01-architecture/threat-model.md) | Aset, aktor, STRIDE, mitigasi, residual risk. |
| [01-architecture/registry-supply-chain.md](01-architecture/registry-supply-chain.md) | Registry terfederasi, signature, TOFU, reproducible build, delta update. |
| [01-architecture/host-bridge-intents.md](01-architecture/host-bridge-intents.md) | Envelope bridge, namespace, intent, deep link. |
| [01-architecture/ai-workflow.md](01-architecture/ai-workflow.md) | Adapter AI lokal/BYOK, pipeline prompt-to-app, workflow, outbox, SSRF. |
| [01-architecture/selfhost.md](01-architecture/selfhost.md) | Profil Lite/Standard/Cluster, komponen, auth, RBAC, branding, air-gap. |
| [01-architecture/adr/README.md](01-architecture/adr/README.md) | Indeks ADR, status, aturan supersede. |
| [01-architecture/adr/0001-monorepo-web-stack.md](01-architecture/adr/0001-monorepo-web-stack.md) | Monorepo, npm workspaces, Next.js + Flutter. |
| [01-architecture/adr/0002-sqlite-wasm-opfs.md](01-architecture/adr/0002-sqlite-wasm-opfs.md) | SQLite WASM + OPFS menggantikan Dexie. |
| [01-architecture/adr/0003-rust-shared-core.md](01-architecture/adr/0003-rust-shared-core.md) | Rust shared core. |
| [01-architecture/adr/0004-crdt-strategy.md](01-architecture/adr/0004-crdt-strategy.md) | `cr-sqlite` untuk data, Yjs untuk dokumen Studio. |
| [01-architecture/adr/0005-go-selfhost-server.md](01-architecture/adr/0005-go-selfhost-server.md) | Server Go single binary. |
| [01-architecture/adr/0006-mapp-package-format.md](01-architecture/adr/0006-mapp-package-format.md) | `.mapp` ZIP deterministik + signature detached. |
| [01-architecture/adr/0007-sandbox-strategy.md](01-architecture/adr/0007-sandbox-strategy.md) | Iframe opaque origin + QuickJS/Wasmtime + MUIP. |
| [01-architecture/adr/0008-identity-auth.md](01-architecture/adr/0008-identity-auth.md) | Local Identity dan penghapusan auth localStorage. |
| [01-architecture/adr/0009-license-governance.md](01-architecture/adr/0009-license-governance.md) | Apache-2.0 core, MIT paket. |
| [01-architecture/adr/0010-design-system.md](01-architecture/adr/0010-design-system.md) | MADS token CSS + Flutter `ThemeExtension`. |

### 4.3 Desain

| Dokumen | Isi |
|---|---|
| [02-design/design-system.md](02-design/design-system.md) | Prinsip MADS, token warna/tipografi/spacing/motion, breakpoint, mapping Flutter. |
| [02-design/component-catalog.md](02-design/component-catalog.md) | 120 komponen `MADS-<CAT>-<NN>` dan spesifikasi 20 komponen inti. |
| [02-design/information-architecture.md](02-design/information-architecture.md) | Sitemap, route, model workspace, 22 layar, matriks responsive. |
| [02-design/screen-specs.md](02-design/screen-specs.md) | `SCR-01`…`SCR-22`: wireframe ASCII, state, interaksi, a11y, acceptance. |
| [02-design/interaction-patterns.md](02-design/interaction-patterns.md) | DnD, command palette, shortcut, gesture, consent, destructive action. |
| [02-design/accessibility.md](02-design/accessibility.md) | Checklist WCAG 2.2 AA, keyboard path, contrast, screen reader, RTL. |
| [02-design/content-i18n.md](02-design/content-i18n.md) | Voice/tone, formula error, struktur locale, pluralization, review copy. |

### 4.4 Spesifikasi normatif

| Dokumen | Isi |
|---|---|
| [03-specs/01-host-shell.md](03-specs/01-host-shell.md) | `FR-HOST-001…030`: identity, PWA, home, search, multitasking, vault, notifikasi, storage. |
| [03-specs/02-studio-ide.md](03-specs/02-studio-ide.md) | `FR-STU-001…030`: canvas, komponen, code sync, AI, Git, multiplayer, hot reload. |
| [03-specs/03-sandbox-runtime.md](03-specs/03-sandbox-runtime.md) | `FR-SBX-001…025`: isolasi, broker, kuota, watchdog, lifecycle, audit. |
| [03-specs/04-data-automation.md](03-specs/04-data-automation.md) | `FR-DATA-001…030`: SQLite per app, migrasi, CRDT, functions, workflow, connector. |
| [03-specs/05-registry.md](03-specs/05-registry.md) | `FR-REG-001…025`: multi-source, cache, install, scanner, signature, delta, rollback. |
| [03-specs/06-sync-backup.md](03-specs/06-sync-backup.md) | `FR-SYNC-001…025`: E2EE, transport, konflik, export, restore, revoke. |
| [03-specs/07-selfhost.md](03-specs/07-selfhost.md) | `FR-SRV-001…030`: profil deploy, auth, RBAC, audit, branding, air-gap, backup. |
| [03-specs/08-devtools-cli-sdk.md](03-specs/08-devtools-cli-sdk.md) | `FR-DEV-001…020`: profiler, analytics opt-in, CLI, plugin API, SDK. |
| [03-specs/manifest-v2.md](03-specs/manifest-v2.md) | Kontrak `microapp.manifest.json` v2, validasi, layout `.mapp`. |
| [03-specs/ui-protocol.md](03-specs/ui-protocol.md) | Kontrak MUIP v1 untuk renderer web dan Flutter. |
| [03-specs/host-bridge.md](03-specs/host-bridge.md) | Kontrak normatif Host Bridge per namespace. |
| [03-specs/permissions.md](03-specs/permissions.md) | `SEC-001…020`: katalog permission, risk tier, consent, mock, audit. |
| [03-specs/error-codes.md](03-specs/error-codes.md) | Katalog `E-<DOMAIN>-<NNN>`, severity, recovery, retryability. |
| [03-specs/nfr.md](03-specs/nfr.md) | `NFR-*`: performa, ukuran, a11y, i18n, supply chain, reliabilitas. |
| [03-specs/schemas/microapp.manifest.v2.schema.json](03-specs/schemas/microapp.manifest.v2.schema.json) | JSON Schema manifest v2. |
| [03-specs/schemas/registry-index.v1.schema.json](03-specs/schemas/registry-index.v1.schema.json) | JSON Schema indeks registry v1. |
| [03-specs/schemas/ui-node.v1.schema.json](03-specs/schemas/ui-node.v1.schema.json) | JSON Schema node MUIP v1. |

### 4.5 Flows

| Dokumen | Isi |
|---|---|
| [04-flows/README.md](04-flows/README.md) | Indeks 13 flow, notasi, konvensi error. |
| [04-flows/01-first-run.md](04-flows/01-first-run.md) | `FLOW-01` First run dan pembentukan Local Identity. |
| [04-flows/02-install-update-rollback.md](04-flows/02-install-update-rollback.md) | `FLOW-02` Instalasi, update, rollback. |
| [04-flows/03-build-with-ai.md](04-flows/03-build-with-ai.md) | `FLOW-03` Prompt-to-app dengan provider eksplisit. |
| [04-flows/04-visual-code-sync.md](04-flows/04-visual-code-sync.md) | `FLOW-04` Sinkronisasi canvas ↔ kode. |
| [04-flows/05-lan-hot-reload.md](04-flows/05-lan-hot-reload.md) | `FLOW-05` QR LAN hot reload. |
| [04-flows/06-p2p-sync.md](04-flows/06-p2p-sync.md) | `FLOW-06` Pairing dan sinkronisasi P2P. |
| [04-flows/07-backup-recovery.md](04-flows/07-backup-recovery.md) | `FLOW-07` Backup dan recovery. |
| [04-flows/08-workflow-outbox.md](04-flows/08-workflow-outbox.md) | `FLOW-08` Workflow offline dan outbox. |
| [04-flows/09-publish-verify.md](04-flows/09-publish-verify.md) | `FLOW-09` Publish, verifikasi, install. |
| [04-flows/10-selfhost-airgap.md](04-flows/10-selfhost-airgap.md) | `FLOW-10` Self-host dan air-gap. |
| [04-flows/11-permission-consent.md](04-flows/11-permission-consent.md) | `FLOW-11` Consent, grant, revoke permission. |
| [04-flows/12-crash-recovery.md](04-flows/12-crash-recovery.md) | `FLOW-12` Watchdog, crash, recovery. |
| [04-flows/13-phase0-migration.md](04-flows/13-phase0-migration.md) | `FLOW-13` Migrasi prototipe Phase 0. |

### 4.6 Agen, skill, dan rules

| Dokumen | Isi |
|---|---|
| [05-agents/AGENTS.md](05-agents/AGENTS.md) | Manual operasi agen: misi, urutan baca, SDD gate, invariant, DoD, eskalasi. |
| [05-agents/roles.md](05-agents/roles.md) | 12 peran, path yang boleh diubah, dokumen dan skill wajib. |
| [05-agents/workflow.md](05-agents/workflow.md) | Issue → spec → branch → implementasi → PR → merge → release. |
| [05-agents/handoff-prompts.md](05-agents/handoff-prompts.md) | Template context package dan prompt siap pakai. |
| [06-skills/README.md](06-skills/README.md) | Format skill, frontmatter, indeks 11 skill. |
| [06-skills/add-host-feature/SKILL.md](06-skills/add-host-feature/SKILL.md) | Menambah fitur Host Shell. |
| [06-skills/add-ui-component/SKILL.md](06-skills/add-ui-component/SKILL.md) | Menambah komponen MADS web + Flutter. |
| [06-skills/extend-manifest/SKILL.md](06-skills/extend-manifest/SKILL.md) | Mengubah kontrak manifest via RFC. |
| [06-skills/add-permission/SKILL.md](06-skills/add-permission/SKILL.md) | Menambah permission end-to-end. |
| [06-skills/add-sync-transport/SKILL.md](06-skills/add-sync-transport/SKILL.md) | Menambah transport sync. |
| [06-skills/add-registry-source/SKILL.md](06-skills/add-registry-source/SKILL.md) | Menambah sumber registry. |
| [06-skills/write-db-migration/SKILL.md](06-skills/write-db-migration/SKILL.md) | Menulis migrasi database. |
| [06-skills/add-workflow-node/SKILL.md](06-skills/add-workflow-node/SKILL.md) | Menambah node workflow. |
| [06-skills/release-selfhost/SKILL.md](06-skills/release-selfhost/SKILL.md) | Merilis server self-host. |
| [06-skills/security-review/SKILL.md](06-skills/security-review/SKILL.md) | Security review menyeluruh. |
| [06-skills/docs-maintenance/SKILL.md](06-skills/docs-maintenance/SKILL.md) | Memelihara dokumentasi dan checker. |
| [07-rules/README.md](07-rules/README.md) | Indeks rules, level, enforcement. |
| [07-rules/typescript.md](07-rules/typescript.md) | Aturan TypeScript/React/Next.js. |
| [07-rules/rust.md](07-rules/rust.md) | Aturan Rust core dan FFI/WASM. |
| [07-rules/dart.md](07-rules/dart.md) | Aturan Flutter host. |
| [07-rules/go.md](07-rules/go.md) | Aturan server Go. |
| [07-rules/ui-ux.md](07-rules/ui-ux.md) | Aturan UI/UX dan token. |
| [07-rules/security.md](07-rules/security.md) | Aturan keamanan dan kriptografi. |
| [07-rules/data-migrations.md](07-rules/data-migrations.md) | Aturan data dan migrasi. |
| [07-rules/testing.md](07-rules/testing.md) | Aturan test. |
| [07-rules/git-and-review.md](07-rules/git-and-review.md) | Aturan Git dan review. |
| [07-rules/documentation.md](07-rules/documentation.md) | Aturan dokumentasi dan checker. |

### 4.7 Kualitas, operasi, dan tata kelola

| Dokumen | Isi |
|---|---|
| [08-quality/test-strategy.md](08-quality/test-strategy.md) | Lapisan test, matriks platform, coverage, gate. |
| [08-quality/performance-budgets.md](08-quality/performance-budgets.md) | Budget performa dan metode ukur. |
| [08-quality/security-test-plan.md](08-quality/security-test-plan.md) | Test keamanan per ancaman. |
| [08-quality/release-gates.md](08-quality/release-gates.md) | Gate per PR, fase, release. |
| [08-quality/definition-of-done.md](08-quality/definition-of-done.md) | DoD global dan per artefak. |
| [09-operations/selfhost-runbook.md](09-operations/selfhost-runbook.md) | Instalasi, upgrade, scaling, troubleshooting. |
| [09-operations/airgap-runbook.md](09-operations/airgap-runbook.md) | Bundle air-gap dan operasi tanpa egress. |
| [09-operations/observability.md](09-operations/observability.md) | Log, metrik, trace, audit export, retensi. |
| [09-operations/backup-restore.md](09-operations/backup-restore.md) | Backup, RPO/RTO, uji restore. |
| [09-operations/incident-response.md](09-operations/incident-response.md) | Severity, alur insiden, rotasi kunci, postmortem. |
| [10-contributing/governance.md](10-contributing/governance.md) | Maintainer council, rilis, pendanaan, lisensi. |
| [10-contributing/rfc-process.md](10-contributing/rfc-process.md) | Proses RFC dan kompatibilitas kontrak. |
| [10-contributing/registry-policy.md](10-contributing/registry-policy.md) | Kebijakan konten registry, delisting, banding. |

### 4.8 Arsip dan template

| Dokumen | Isi |
|---|---|
| [archive/README.md](archive/README.md) | Batas arsip Phase 0 dan alasan tidak normatif. |
| [archive/phase0/architecture.html](archive/phase0/architecture.html) | Diagram arsitektur prototipe Phase 0 (arsip). |
| [archive/phase0/ops-report-2026-07-28.md](archive/phase0/ops-report-2026-07-28.md) | Laporan ops Phase 0 (arsip). |
| [templates/spec.md](templates/spec.md) | Kerangka spec. |
| [templates/flow.md](templates/flow.md) | Kerangka flow. |
| [templates/adr.md](templates/adr.md) | Kerangka ADR. |
| [templates/rfc.md](templates/rfc.md) | Kerangka RFC. |
| [templates/skill.md](templates/skill.md) | Kerangka `SKILL.md`. |
| [templates/component-spec.md](templates/component-spec.md) | Kerangka spesifikasi komponen MADS. |

## 5. Indeks ID

| Keluarga | Pola | Sumber definisi | Jumlah |
|---|---|---|---|
| Functional requirement | `FR-<DOMAIN>-<NNN>` | [03-specs](03-specs/01-host-shell.md) | 215 |
| Non-functional requirement | `NFR-<KATEGORI>-<NNN>` | [03-specs/nfr.md](03-specs/nfr.md) | 20 |
| Keamanan | `SEC-<NNN>` | [03-specs/permissions.md](03-specs/permissions.md) | 20 |
| Flow | `FLOW-<NN>` | [04-flows](04-flows/README.md) | 13 |
| ADR | `ADR-<NNNN>` | [01-architecture/adr](01-architecture/adr/README.md) | 10 |
| Error | `E-<DOMAIN>-<NNN>` | [03-specs/error-codes.md](03-specs/error-codes.md) | 60 |
| Rule | `RULE-<AREA>-<NNN>` | [07-rules](07-rules/README.md) | per file |
| Layar | `SCR-<NN>` | [02-design/screen-specs.md](02-design/screen-specs.md) | 22 |
| Komponen | `MADS-<CAT>-<NN>` | [02-design/component-catalog.md](02-design/component-catalog.md) | 120 |

Alokasi domain FR: `HOST` (Host Shell), `STU` (Studio), `SBX` (sandbox), `DATA` (data & automation), `REG` (registry), `SYNC` (sync & backup), `SRV` (self-host), `DEV` (DevTools/CLI/SDK). Domain error menambahkan `AUTH`, `CRYPTO`, `NET`, `CLI`.

## 6. Owner Dokumen

| Owner | Dokumen utama |
|---|---|
| `product` | `00-foundation/*` |
| `architecture` | `01-architecture/*`, ADR |
| `design` | `02-design/*` |
| `runtime` | `03-specs/03-sandbox-runtime.md`, `01-architecture/sandbox-capabilities.md` |
| `data` | `03-specs/04-data-automation.md`, `01-architecture/data-model.md` |
| `sync` | `03-specs/06-sync-backup.md`, `01-architecture/sync-crdt.md` |
| `registry` | `03-specs/05-registry.md`, `01-architecture/registry-supply-chain.md` |
| `server` | `03-specs/07-selfhost.md`, `01-architecture/selfhost.md` |
| `dx` | `03-specs/08-devtools-cli-sdk.md`, `06-skills/*` |
| `qa` | `08-quality/*` |
| `ops` | `09-operations/*` |
| `security` | `03-specs/permissions.md`, `01-architecture/threat-model.md`, `08-quality/security-test-plan.md` |
| `governance` | `10-contributing/*`, `README.md`, `AGENTS.md` |

## 7. Menjalankan Pemeriksaan Dokumen

```bash
npm run docs:check
node scripts/check-docs.mjs --strict
```

Checker memvalidasi frontmatter, H1, section wajib, link dan anchor relatif, definisi serta referensi ID, cakupan matriks, placeholder, code fence, JSON, dan keterjangkauan seluruh dokumen dari `docs/README.md`. Mode `--strict` menggagalkan warning, termasuk status `draft`.

## 8. Protokol Pembaruan (SDD)

1. Ubah dokumen lebih dulu: spec/flow/acceptance, lalu matriks.
2. Commit `docs:` berdiri sendiri agar review kontrak terpisah dari implementasi.
3. Implementasi mengikuti dokumen; PR wajib menautkan `Spec: docs/.../file.md#FR-...`.
4. Setelah verifikasi dijalankan, commit `docs(status):` menaikkan status di [00-foundation/implementation-status.md](00-foundation/implementation-status.md) dan [00-foundation/prd-compliance-matrix.md](00-foundation/prd-compliance-matrix.md).
5. Perubahan kontrak (manifest, host bridge, sync/CRDT, permission, crypto, registry) wajib melalui [RFC](10-contributing/rfc-process.md).

Detail siklus dan pengecualian hotfix ada di [00-foundation/sdd-workflow.md](00-foundation/sdd-workflow.md).

## 9. Aturan Penulisan

- Frontmatter wajib: `id`, `title`, `status`, `owner`, `prd_refs`.
- H1 pertama sama dengan `title`.
- Kata normatif `MUST`, `SHOULD`, `MAY` (RFC 2119) pada kolom `Level` dan kalimat requirement.
- Requirement didefinisikan pada sel pertama tabel section `3. Requirement`, tanpa backtick, agar dapat dipindai checker.
- Referensi ke requirement memakai backtick dan boleh berupa link anchor, misalnya `FR-HOST-001` atau [FR-HOST-001](03-specs/01-host-shell.md#FR-HOST-001).
- Tanpa placeholder pekerjaan tertunda atau teks pengisi di luar template dan arsip; daftar token kanonik ada pada `scripts/check-docs.mjs`.
- Tanpa klaim fitur yang belum ada; status implementasi hanya di dua dokumen status.

## 10. Kebijakan Root

| Berkas | Peran |
|---|---|
| [../AGENTS.md](../AGENTS.md) | Titik masuk agen: SDD gate, peta dokumentasi, presedensi, perintah. |
| [../README.md](../README.md) | Status proyek nyata dan target PRD. |
| [../DESIGN.md](../DESIGN.md) | Banner legacy; desain kanonik ada di [02-design/design-system.md](02-design/design-system.md). |
| [../CONTRIBUTING.md](../CONTRIBUTING.md) | Ringkasan alur kontribusi dan checklist PR. |
| [../SECURITY.md](../SECURITY.md) | Pelaporan kerentanan dan SLA. |
| [../CODE_OF_CONDUCT.md](../CODE_OF_CONDUCT.md) | Contributor Covenant 2.1. |
| [../LICENSE](../LICENSE) | Apache-2.0 untuk core/platform; MIT untuk paket SDK/CLI/UI kit/template. |
| [../.github/pull_request_template.md](../.github/pull_request_template.md) | Checklist SDD pada PR. |
