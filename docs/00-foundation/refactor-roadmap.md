---
id: FOUND-ROADMAP
title: Roadmap Refactor PRD v2.0
status: accepted
owner: governance
prd_refs: ["§8", "§7.2"]
---

# Roadmap Refactor PRD v2.0

Dokumen ini adalah peta eksekusi refactor dari prototipe Phase 0 ke target PRD v2.0. Status di sini diperbarui setiap gate fase dan hanya boleh berubah berdasarkan evidence di [08-quality/evidence](../08-quality/evidence/README.md). Requirement per requirement dilacak di [prd-compliance-matrix.md](prd-compliance-matrix.md).

## 1. Legenda Status

| Status | Arti |
|---|---|
| `pending` | Belum dikerjakan. |
| `in-progress` | Sedang dikerjakan pada branch `development`. |
| `done` | Seluruh acceptance langkah dijalankan dan evidence tercatat. |
| `partial` | Sebagian acceptance dapat diverifikasi di lingkungan ini; sisanya gate manual. |
| `blocked` | Prasyarat eksternal tidak tersedia; kode dan kontrak test tetap ditulis. |

## 2. Fase dan Gate

| Fase | Tujuan | Gate otomatis | Gate manual |
|---|---|---|---|
| 0 | Rekonsiliasi kontrak dokumen dan roadmap | `node scripts/check-docs.mjs --strict` | Review governance |
| 1 | Host Shell, Rust core, sandbox runtime | `scripts/verify-phase-1.mjs` | iOS/macOS/Windows/Linux desktop, perangkat Android fisik, sensor nyata |
| 2 | Studio IDE, data layer, CLI | `scripts/verify-phase-2.mjs` | Desktop Flutter memuat Studio lokal |
| 3 | AI lokal/BYOK, workflow, sync | `scripts/verify-phase-3.mjs` | Dua perangkat nyata, provider AI nyata |
| 4 | Registry terfederasi dan supply chain | `scripts/verify-phase-4.mjs` | Hosting registry nyata (Pages/MinIO) |
| 5 | Self-host, air-gap, governance | `scripts/verify-phase-5.mjs` | K8s/Helm, Let's Encrypt, VPS 512 MB, IdP nyata, SIEM |

## 3. Langkah Eksekusi

Setiap langkah wajib lulus: `node scripts/check-docs.mjs --strict`, `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`; untuk area Rust/Flutter/Go ditambah `cargo test`, `cargo clippy -- -D warnings`, `flutter analyze`, `flutter test`, `go test ./...`, `go vet ./...`.

### 3.1 Phase 0 — Rekonsiliasi dokumen

| Langkah | Isi | Status |
|---|---|---|
| P0.1 | ADR-0011…0016, pembaruan dokumen kanonik, roadmap, kolom Phase matriks | done |
| P0.2 | Template evidence fase dan tautan dari indeks serta release gates | done |

### 3.2 Phase 1 — Host Shell, Rust core, sandbox runtime

| Langkah | Isi | Status |
|---|---|---|
| P1.1 | Migrasi ke npm workspaces `apps/*`, `packages/*`, CI, gitignore | pending |
| P1.2 | `core-rust`: crypto, identity, manifest, `.mapp`, HLC, audit, guard | pending |
| P1.3 | `runtime-web`: sandbox opaque origin, bridge, MUIP, loader `.mapp` | pending |
| P1.4 | Host DB worker SQLite WASM, migrasi, repository, FTS5 | pending |
| P1.5 | Identitas lokal, onboarding, PWA, i18n, MADS shell | pending |
| P1.6 | Permission broker, Vault, audit, offline cage, storage manager | pending |
| P1.7 | Instalasi `.mapp`, runner app, error boundary | pending |
| P1.8 | Pencarian, widget, intent, deep link, launcher, command palette | pending |
| P1.9 | Migrasi Phase 0, backup terenkripsi, notifikasi lokal | pending |
| P1.10 | Host Flutter, `runtime-native`, MADS Flutter | pending |
| P1.11 | Gate fase 1, evidence, tag `v0.1.0-phase1` | pending |

### 3.3 Phase 2 — Studio IDE, data layer, CLI

| Langkah | Isi | Status |
|---|---|---|
| P2.1 | Model project Studio, shell, mesin AST dua arah | pending |
| P2.2 | Canvas Flex/Grid, breakpoint, properties panel | pending |
| P2.3 | MADS 120 komponen web dan Flutter | pending |
| P2.4 | Monaco offline, diagnostik, linter keamanan, DevTools | pending |
| P2.5 | Schema designer, migrasi, FTS5 dan `sqlite-vec` | pending |
| P2.6 | Integrasi Git dan visual diff | pending |
| P2.7 | Export/import `.mapp`, CLI, template | pending |
| P2.8 | Gate fase 2, evidence, tag `v0.2.0-phase2` | pending |

### 3.4 Phase 3 — AI, workflow, sync

| Langkah | Isi | Status |
|---|---|---|
| P3.1 | Adapter AI lokal/BYOK dan pengaturan | pending |
| P3.2 | Workflow engine offline dan editor graph | pending |
| P3.3 | CRDT/HLC, mutation log, konflik, schema staging | pending |
| P3.4 | Pairing, transport, protokol sync, restore snapshot | pending |
| P3.5 | Multiplayer Yjs dan LAN QR hot reload | pending |
| P3.6 | Gate fase 3, evidence, tag `v0.3.0-phase3` | pending |

### 3.5 Phase 4 — Registry terfederasi

| Langkah | Isi | Status |
|---|---|---|
| P4.1 | Index registry, sumber, cache, pencarian | pending |
| P4.2 | Signature, TOFU, reproducible build, scanner, rollback | pending |
| P4.3 | Publish CLI, instalasi Git, template registry statis | pending |
| P4.4 | Gate fase 4, evidence, tag `v0.4.0-phase4` | pending |

### 3.6 Phase 5 — Self-host, air-gap, governance

| Langkah | Isi | Status |
|---|---|---|
| P5.1 | Server Go Lite dan sync hub | pending |
| P5.2 | Profil Standard/Cluster, SSO, RBAC, plugin host | pending |
| P5.3 | Deploy Compose/Helm/air-gap, SBOM | pending |
| P5.4 | Gate fase 5, audit akhir, tag `v2.0.0-rc.1` | pending |

## 4. Urutan Commit dan Push

1. Commit `docs:` lebih dulu bila langkah mengubah perilaku atau kontrak.
2. Satu commit satu tujuan atomik, format `type(scope): summary` dengan summary ≤ 72 karakter.
3. Setiap commit menyebut spec: `Spec: docs/<path>#<ID>`.
4. Push ke `development` setelah gate langkah hijau; tidak menumpuk lebih dari satu langkah tanpa push.
5. Tag annotated hanya dibuat setelah evidence fase ditulis dan status matriks diperbarui.

## 5. Aturan Status

- Status langkah dan fase hanya berubah setelah `scripts/verify-phase-<n>.mjs` menulis `docs/08-quality/evidence/phase-<n>.json` dan `.md`.
- `scripts/apply-status.mjs --evidence <file>` adalah satu-satunya cara mengubah kolom Status matriks; skrip menolak ID tak dikenal dan status tanpa bukti.
- Gate perangkat atau layanan yang tidak tersedia dicatat `partial` atau `blocked` beserta bukti manual; tidak pernah `implemented`.
- Status tidak boleh diturunkan tanpa catatan alasan pada PR.

## 6. Referensi

- [PRD v2.0](PRD-v2.0.md) §8 — fase dan gate produk.
- [implementation-status.md](implementation-status.md) — fakta kode saat ini.
- [prd-compliance-matrix.md](prd-compliance-matrix.md) — status per requirement.
- [08-quality/release-gates.md](../08-quality/release-gates.md) — perintah gate per fase.
- [08-quality/evidence](../08-quality/evidence/README.md) — record bukti per fase.
