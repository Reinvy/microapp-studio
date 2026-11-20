---
id: QA-EVIDENCE-2
title: Evidence Fase 2
status: accepted
owner: qa
prd_refs: ["§8"]
---

# Evidence Fase 2

Record bukti untuk Studio IDE, data layer, dan CLI. Ditulis oleh `scripts/verify-phase-2.mjs`.

## 1. Cakupan

| Grup | Requirement | Catatan |
|---|---|---|
| Studio | `FR-STU-001…030` | AI, Git, dan multiplayer pada fase 3 dicatat partial di sini |
| Data | `FR-DATA-001…012` | Schema designer, migrasi, FTS5, isolasi DB |
| DevTools/CLI | `FR-DEV-001…014` | Profiler, inspector, CLI, linter |
| NFR | Performa canvas, a11y, i18n | Metrik yang dapat dijalankan |
| Suite keamanan | `R-06`, `R-15`, `R-17`, `R-20` | `R-17` audit dependency fase 2 |

## 2. Perintah Gate

```bash
node scripts/check-docs.mjs --strict
npm test
npm run typecheck
npm run lint
npm run build
cargo test --manifest-path packages/core-rust/Cargo.toml
npm run e2e
node scripts/verify-phase-2.mjs
```

## 3. Gate Manual

| Gate | Alasan |
|---|---|
| Desktop Flutter memuat Studio lokal | Build desktop tidak tersedia di lingkungan ini |
| Instalasi `.mapp` hasil Studio di emulator Android | Butuh emulator dengan host terpasang |
| Push/pull Git ke GitHub/GitLab/Gitea/Forgejo nyata | Butuh kredensial nyata |

## 4. Hasil

| Item | Nilai |
|---|---|
| Commit | ditulis skrip |
| Status | ditulis skrip |
| JSON | `phase-2.json` |

## 5. Referensi

- [README.md](README.md) — skema dan aturan evidence.
- [release-gates.md](../release-gates.md) — gate otomatis dan manual.
