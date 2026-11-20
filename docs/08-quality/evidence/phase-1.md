---
id: QA-EVIDENCE-1
title: Evidence Fase 1
status: accepted
owner: qa
prd_refs: ["§8"]
---

# Evidence Fase 1

Record bukti untuk Host Shell, Rust core, dan sandbox runtime. Ditulis oleh `scripts/verify-phase-1.mjs`.

## 1. Cakupan

| Grup | Requirement | Catatan |
|---|---|---|
| Host Shell | `FR-HOST-001…018`, `FR-HOST-020…030` | `FR-HOST-019` (WebPush/UnifiedPush) partial sampai fase 5 |
| Sandbox | `FR-SBX-001…025` | `FR-SBX-014`/`FR-SBX-015` memory quota web partial; `FR-SBX-019` rollback partial sampai fase 4 |
| Permission | `SEC-001…020` | Bluetooth/NFC web fail-closed; native adapter manual gate |
| Manifest | `M-01…M-24` | Divalidasi `core-rust` dan fixture CLI |
| Bridge | `B-01…B-20` | Kontrak broker dan error katalog |
| MUIP | `U-01…U-16` | `U-15` parity web/Flutter partial sampai fase 2; `U-17` partial sampai fase 2 |
| NFR terukur | Performa, ukuran, offline | Hanya metrik yang dapat dijalankan di lingkungan ini |
| Suite keamanan | `R-01`, `R-06`, `R-07`, `R-08`, `R-10`, `R-11`, `R-15`, `R-20` | `R-11` salah frasa + rate limit; `R-15` 10.001 node/loop/flood; `R-20` baca DB/Vault tanpa kunci + auto-lock |

## 2. Perintah Gate

```bash
node scripts/check-docs.mjs --strict
npm test
npm run typecheck
npm run lint
npm run build
npm run build:core
cargo test --manifest-path packages/core-rust/Cargo.toml
cargo clippy --manifest-path packages/core-rust/Cargo.toml --all-targets -- -D warnings
npm run e2e
node scripts/verify-phase-1.mjs
```

Tambahan Flutter: `flutter analyze`, `flutter test`, `flutter build apk --debug`.

## 3. Gate Manual

| Gate | Alasan |
|---|---|
| Build iOS/iPadOS/macOS/Windows | Toolchain dan perangkat tidak tersedia |
| Linux desktop Flutter | `clang++`, `cmake`, `ninja` tidak tersedia |
| Perangkat Android fisik, biometrik, Keychain/Keystore | Butuh perangkat nyata |
| Kamera, mikrofon, lokasi, NFC, Bluetooth nyata | Butuh sensor nyata |

## 4. Hasil

| Item | Nilai |
|---|---|
| Commit | ditulis skrip |
| Status | ditulis skrip |
| JSON | `phase-1.json` |

## 5. Referensi

- [README.md](README.md) — skema dan aturan evidence.
- [release-gates.md](../release-gates.md) — gate otomatis dan manual.
