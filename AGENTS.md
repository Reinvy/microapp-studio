<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# AGENTS.md — Titik Masuk Agen

## Documentation-first (SDD)

Wajib baca [docs/05-agents/AGENTS.md](docs/05-agents/AGENTS.md) sebelum menyentuh kode.

- Dokumen dulu, kode kemudian. Perubahan perilaku wajib mengubah spec/flow/acceptance lebih dulu.
- Jika spec belum ada, tulis spec atau RFC lebih dulu dan jangan menebak.
- PR tanpa `Spec:` (atau alasan `docs-not-needed`) ditolak reviewer.
- Urutan commit dalam satu PR: `docs:` → `feat:`/`fix:` → `docs(status):`.

## Documentation map

| Area | Mulai dari |
|---|---|
| Peta lengkap | [docs/README.md](docs/README.md) |
| Fondasi produk, SDD, glosarium, status | [docs/00-foundation/product-foundation.md](docs/00-foundation/product-foundation.md) |
| Arsitektur dan ADR | [docs/01-architecture/system-overview.md](docs/01-architecture/system-overview.md) |
| Design system | [docs/02-design/design-system.md](docs/02-design/design-system.md) |
| Spec normatif | [docs/03-specs/01-host-shell.md](docs/03-specs/01-host-shell.md) |
| Flow | [docs/04-flows/README.md](docs/04-flows/README.md) |
| Peran dan alur kerja agen | [docs/05-agents/roles.md](docs/05-agents/roles.md), [docs/05-agents/workflow.md](docs/05-agents/workflow.md) |
| Skill | [docs/06-skills/README.md](docs/06-skills/README.md) |
| Rules | [docs/07-rules/README.md](docs/07-rules/README.md) |
| Quality gate | [docs/08-quality/release-gates.md](docs/08-quality/release-gates.md) |
| Operasi | [docs/09-operations/selfhost-runbook.md](docs/09-operations/selfhost-runbook.md) |
| Governance dan RFC | [docs/10-contributing/rfc-process.md](docs/10-contributing/rfc-process.md) |

## Source of truth

```
PRD > ADR accepted > spec > rules > kode
```

- PRD: [docs/00-foundation/PRD-v2.0.md](docs/00-foundation/PRD-v2.0.md) (salinan; PRD asli di root workspace menang bila berbeda).
- ADR yang diterima wajib dicerminkan ke spec.
- Status implementasi hanya di [docs/00-foundation/implementation-status.md](docs/00-foundation/implementation-status.md) dan [docs/00-foundation/prd-compliance-matrix.md](docs/00-foundation/prd-compliance-matrix.md).
- Jangan mengklaim fitur PRD sudah ada. Gunakan `missing`/`partial`.

## Commands

```bash
npm run docs:check      # validasi dokumentasi (wajib sebelum PR)
node scripts/check-docs.mjs --strict
npm test                # Vitest
npm run build           # Next.js build
```

## Non-negotiable invariants

1. Offline-first: tidak ada operasi inti yang bergantung pada jaringan.
2. Zero telemetry: tidak ada pengiriman data otomatis.
3. Zero privilege: micro-app tidak mendapat akses tanpa manifest + consent.
4. Tanpa `new Function`/`eval`/HTML mentah pada runtime produksi.
5. Tanpa secret pada kode, log, fixture, atau dokumen.
6. Tanpa klaim yang belum diverifikasi.
