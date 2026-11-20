---
id: QA-EVIDENCE-4
title: Evidence Fase 4
status: accepted
owner: qa
prd_refs: ["§8"]
---

# Evidence Fase 4

Record bukti untuk registry terfederasi dan supply chain. Ditulis oleh `scripts/verify-phase-4.mjs`.

## 1. Cakupan

| Grup | Requirement | Catatan |
|---|---|---|
| Registry | `FR-REG-001…025` | Sumber, cache, signature, TOFU, scanner, delta, pin, rollback |
| Sandbox | `FR-SBX-019` | Rollback versi paket dan snapshot DB |
| CLI | `FR-DEV-013…014` | Publish dan registri Git |
| Suite keamanan | `R-02`, `R-14`, `R-18` | Signature, TOFU, reproducible build |

## 2. Perintah Gate

```bash
node scripts/check-docs.mjs --strict
npm test
npm run typecheck
npm run lint
npm run build
cargo test --manifest-path packages/core-rust/Cargo.toml
npm run e2e
node scripts/verify-phase-4.mjs
```

## 3. Gate Manual

| Gate | Alasan |
|---|---|
| Registry statis di GitHub Pages/GitLab/MinIO/Nginx | Butuh hosting nyata |
| Reproducible build lintas mesin | Butuh builder kedua di CI |

## 4. Hasil

| Item | Nilai |
|---|---|
| Commit | ditulis skrip |
| Status | ditulis skrip |
| JSON | `phase-4.json` |

## 5. Referensi

- [README.md](README.md) — skema dan aturan evidence.
- [release-gates.md](../release-gates.md) — gate otomatis dan manual.
