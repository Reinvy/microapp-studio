---
id: QA-EVIDENCE-1
title: Evidence Fase 1
status: accepted
owner: qa
prd_refs: ["§8"]
---

# Evidence Fase 1

- Commit: `18ab26dc8df3df4c11a9c952368842e2ef9b9545`
- Generated: 2026-11-20T17:39:47.459Z
- Result: **pass**

## 1. Perintah

| Perintah | Exit | Durasi (ms) |
|---|---|---|
| `node scripts/check-docs.mjs --strict` | 0 | 187 |
| `node scripts/test-migrations.mjs` | 0 | 127 |
| `npm test` | 0 | 3386 |
| `npm run typecheck` | 0 | 2961 |
| `npm run lint` | 0 | 4536 |
| `npm run build` | 0 | 4442 |
| `npm run build:core` | 0 | 361 |
| `cargo test --manifest-path packages/core-rust/Cargo.toml` | 0 | 10336 |
| `cargo clippy --manifest-path packages/core-rust/Cargo.toml --all-targets -- -D warnings` | 0 | 255 |
| `npm run e2e -w @microapp/studio-web` | 0 | 12852 |

## 2. Requirement

| ID | Status | Bukti |
|---|---|---|
| FR-HOST-001 | implemented | scripts/verify-phase-1.mjs |
| FR-HOST-002 | implemented | scripts/verify-phase-1.mjs |
| FR-HOST-003 | implemented | scripts/verify-phase-1.mjs |
| FR-HOST-004 | implemented | scripts/verify-phase-1.mjs |
| FR-HOST-005 | partial | gate otomatis fase 1 (lihat manualGates) |
| FR-HOST-006 | partial | gate otomatis fase 1 (lihat manualGates) |
| FR-HOST-007 | partial | gate otomatis fase 1 (lihat manualGates) |
| FR-HOST-008 | partial | gate otomatis fase 1 (lihat manualGates) |
| FR-HOST-009 | implemented | scripts/verify-phase-1.mjs |
| FR-HOST-011 | implemented | scripts/verify-phase-1.mjs |
| FR-HOST-012 | partial | gate otomatis fase 1 (lihat manualGates) |
| FR-HOST-013 | partial | gate otomatis fase 1 (lihat manualGates) |
| FR-HOST-014 | implemented | scripts/verify-phase-1.mjs |
| FR-HOST-015 | implemented | scripts/verify-phase-1.mjs |
| FR-HOST-016 | implemented | scripts/verify-phase-1.mjs |
| FR-HOST-017 | implemented | scripts/verify-phase-1.mjs |
| FR-HOST-018 | partial | gate otomatis fase 1 (lihat manualGates) |
| FR-HOST-020 | implemented | scripts/verify-phase-1.mjs |
| FR-HOST-021 | implemented | scripts/verify-phase-1.mjs |
| FR-HOST-022 | partial | gate otomatis fase 1 (lihat manualGates) |
| FR-HOST-023 | implemented | scripts/verify-phase-1.mjs |
| FR-HOST-024 | implemented | scripts/verify-phase-1.mjs |
| FR-HOST-025 | implemented | scripts/verify-phase-1.mjs |
| FR-HOST-027 | implemented | scripts/verify-phase-1.mjs |
| FR-HOST-028 | implemented | scripts/verify-phase-1.mjs |
| FR-HOST-029 | implemented | scripts/verify-phase-1.mjs |
| FR-HOST-030 | implemented | scripts/verify-phase-1.mjs |
| FR-SBX-001 | partial | kontrak web terverifikasi; host native (P1.10) belum ada |
| FR-SBX-002 | partial | kontrak web terverifikasi; host native (P1.10) belum ada |
| FR-SBX-003 | partial | kontrak web terverifikasi; host native (P1.10) belum ada |
| FR-SBX-004 | partial | kontrak web terverifikasi; host native (P1.10) belum ada |
| FR-SBX-005 | partial | kontrak web terverifikasi; host native (P1.10) belum ada |
| FR-SBX-006 | partial | kontrak web terverifikasi; host native (P1.10) belum ada |
| FR-SBX-007 | partial | kontrak web terverifikasi; host native (P1.10) belum ada |
| FR-SBX-008 | partial | kontrak web terverifikasi; host native (P1.10) belum ada |
| FR-SBX-009 | partial | kontrak web terverifikasi; host native (P1.10) belum ada |
| FR-SBX-010 | partial | kontrak web terverifikasi; host native (P1.10) belum ada |
| FR-SBX-011 | partial | kontrak web terverifikasi; host native (P1.10) belum ada |
| FR-SBX-012 | partial | kontrak web terverifikasi; host native (P1.10) belum ada |
| FR-SBX-013 | partial | kontrak web terverifikasi; host native (P1.10) belum ada |
| FR-SBX-014 | partial | kontrak web terverifikasi; host native (P1.10) belum ada |
| FR-SBX-015 | partial | kontrak web terverifikasi; host native (P1.10) belum ada |
| FR-SBX-016 | partial | kontrak web terverifikasi; host native (P1.10) belum ada |
| FR-SBX-017 | partial | kontrak web terverifikasi; host native (P1.10) belum ada |
| FR-SBX-018 | partial | kontrak web terverifikasi; host native (P1.10) belum ada |
| FR-SBX-019 | partial | rollback paket menunggu fase 4 |
| FR-SBX-020 | partial | kontrak web terverifikasi; host native (P1.10) belum ada |
| FR-SBX-021 | partial | kontrak web terverifikasi; host native (P1.10) belum ada |
| FR-SBX-022 | partial | kontrak web terverifikasi; host native (P1.10) belum ada |
| FR-SBX-023 | partial | kontrak web terverifikasi; host native (P1.10) belum ada |
| FR-SBX-024 | partial | kontrak web terverifikasi; host native (P1.10) belum ada |
| FR-SBX-025 | partial | kontrak web terverifikasi; host native (P1.10) belum ada |
| SEC-001 | implemented | scripts/verify-phase-1.mjs |
| SEC-002 | implemented | scripts/verify-phase-1.mjs |
| SEC-003 | implemented | scripts/verify-phase-1.mjs |
| SEC-004 | implemented | scripts/verify-phase-1.mjs |
| SEC-005 | implemented | scripts/verify-phase-1.mjs |
| SEC-006 | implemented | scripts/verify-phase-1.mjs |
| SEC-007 | implemented | scripts/verify-phase-1.mjs |
| SEC-008 | implemented | scripts/verify-phase-1.mjs |
| SEC-009 | partial | gate otomatis fase 1 (lihat manualGates) |
| SEC-010 | partial | gate otomatis fase 1 (lihat manualGates) |
| SEC-011 | implemented | scripts/verify-phase-1.mjs |
| SEC-012 | implemented | scripts/verify-phase-1.mjs |
| SEC-013 | implemented | scripts/verify-phase-1.mjs |
| SEC-014 | implemented | scripts/verify-phase-1.mjs |
| SEC-015 | implemented | scripts/verify-phase-1.mjs |
| SEC-016 | implemented | scripts/verify-phase-1.mjs |
| SEC-017 | implemented | scripts/verify-phase-1.mjs |
| SEC-018 | implemented | scripts/verify-phase-1.mjs |
| SEC-019 | implemented | scripts/verify-phase-1.mjs |
| SEC-020 | implemented | scripts/verify-phase-1.mjs |

## 3. Suite Keamanan

| Suite | Status | Bukti |
|---|---|---|
| R-01 | implemented | secret scan + dependency audit |
| R-06 | implemented | XSS/MUIP renderer tests |
| R-07 | implemented | CSP and sandbox document tests |
| R-08 | implemented | signature/manifest negative tests |
| R-10 | implemented | identity key handling tests |
| R-11 | implemented | wrong recovery phrase + rate limit |
| R-15 | implemented | MUIP limits (10.001 node/loop/flood) |
| R-20 | implemented | vault locked access + auto-lock |

## 4. Gate Manual

| Gate | Status | Alasan |
|---|---|---|
| flutter-host-p1.10 | blocked | apps/host-flutter dan runtime-native belum diimplementasikan |
| ios-ipados-macos-windows-build | blocked | toolchain dan perangkat tidak tersedia |
| flutter-linux-desktop | blocked | clang++/cmake/ninja tidak tersedia |
| android-physical-device | blocked | perangkat fisik tidak tersedia |
| real-sensors | blocked | kamera/mikrofon/lokasi/NFC/Bluetooth nyata tidak tersedia |
| flutter-host | blocked | host Flutter belum dijalankan pada gate ini |
| two-real-devices-webrtc | blocked | fase 3 |
