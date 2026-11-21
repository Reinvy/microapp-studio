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
| Waktu | 2026-11-21T02:35:49.118Z |
| Commit | `e8cc58408b5b23d5aba1d6b69eac3d05877d585b` |
| Hasil | `pass` |
| Requirement terpetakan | 0 |

## 2. Perintah

| Nama | Perintah | Status | Exit |
|---|---|---|---|
| docs-check | `node scripts/check-docs.mjs --strict` | pass | 0 |
| catalog-check | `node scripts/generate-catalog.mjs --check` | pass | 0 |
| test | `npm test` | pass | 0 |
| typecheck | `npm run typecheck` | pass | 0 |
| lint | `npm run lint` | pass | 0 |
| build | `npm run build` | pass | 0 |
| cargo-test | `cargo test --manifest-path packages/core-rust/Cargo.toml` | pass | 0 |
| cargo-clippy | `cargo clippy --manifest-path packages/core-rust/Cargo.toml --all-targets -- -D warnings` | pass | 0 |
| e2e | `npm run e2e` | pass | 0 |

## 3. Batasan

Tidak ada perintah yang dilewati.

## 4. Aturan

1. `result` hanya `pass` bila seluruh perintah wajib lulus dan tidak ada yang dilewati.
2. `partial` berarti ada verifikasi opsional yang tidak dijalankan; tidak boleh dipakai untuk menaikkan status requirement.
3. `fail` memblokir rilis.
4. File ini ditulis oleh `node scripts/verify-web.mjs`, bukan diedit manual.
