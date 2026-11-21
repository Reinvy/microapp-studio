---
id: QA-EVIDENCE-BASELINE
title: Baseline Evidence
status: accepted
owner: qa
prd_refs: ["§9 Non-Functional", "§12 Definisi Selesai"]
---

# Baseline Evidence

Baseline ini mencatat hasil verifikasi nyata setelah refactor dokumen web-only. Evidence tidak mengklaim requirement apa pun sebagai `implemented`; daftar `requirements` sengaja kosong sampai ada pemetaan test per requirement.

## 1. Ringkasan

| Field | Nilai |
|---|---|
| Waktu | 2026-11-21T08:00:59.323Z |
| Commit | `d8dc98bff338d0042b2366b31672889da867f672` |
| Hasil | `pass` |
| Requirement terpetakan | 9/9 |

## 2. Perintah

| Nama | Perintah | Status | Exit |
|---|---|---|---|
| docs-check | `node scripts/check-docs.mjs --strict` | pass | 0 |
| catalog-check | `node scripts/generate-catalog.mjs --check` | pass | 0 |
| tokens-check | `node scripts/check-tokens.mjs` | pass | 0 |
| migrations-check | `node scripts/generate-migrations.mjs --check` | pass | 0 |
| migrations-test | `node scripts/test-migrations.mjs` | pass | 0 |
| error-codes | `node scripts/check-error-codes.mjs` | pass | 0 |
| security-scan | `node scripts/check-security.mjs` | pass | 0 |
| test | `npm test` | pass | 0 |
| typecheck | `npm run typecheck` | pass | 0 |
| lint | `npm run lint` | pass | 0 |
| build | `npm run build` | pass | 0 |
| budget | `node scripts/check-budget.mjs` | pass | 0 |
| cargo-test | `cargo test --manifest-path packages/core-rust/Cargo.toml` | pass | 0 |
| cargo-clippy | `cargo clippy --manifest-path packages/core-rust/Cargo.toml --all-targets -- -D warnings` | pass | 0 |
| e2e | `npm run e2e` | pass | 0 |

## 3. Requirement yang terbukti

| ID | Klaim | Gate | Status |
|---|---|---|---|
| SEC-009 | no eval/new Function/innerHTML | `security-scan` | proven |
| SEC-010 | CSP + COOP/COEP headers | `e2e` | proven |
| SEC-012 | backup container is sealed | `cargo-test` | proven |
| U-01 | MUIP limits and catalog | `test` | proven |
| NFR-03 | route JS budget | `budget` | proven |
| NFR-04 | a11y sweep | `e2e` | proven |
| FR-DATA-002 | migrations forward/rollback | `migrations-test` | proven |
| DESIGN-CLAY | token-only stylesheets | `tokens-check` | proven |
| SPEC-ERROR | 27-code catalog only | `error-codes` | proven |

## 4. Batasan

Tidak ada perintah yang dilewati.

## 5. Aturan

1. `result` hanya `pass` bila seluruh perintah wajib lulus dan tidak ada yang dilewati.
2. `partial` berarti ada verifikasi opsional yang tidak dijalankan; tidak boleh dipakai untuk menaikkan status requirement.
3. `fail` memblokir rilis.
4. File ini ditulis oleh `node scripts/verify-web.mjs`, bukan diedit manual.
