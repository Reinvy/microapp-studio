---
id: QA-EVIDENCE-3
title: Evidence Fase 3
status: accepted
owner: qa
prd_refs: ["§8"]
---

# Evidence Fase 3

Record bukti untuk AI lokal/BYOK, workflow offline, dan sync E2EE. Ditulis oleh `scripts/verify-phase-3.mjs`.

## 1. Cakupan

| Grup | Requirement | Catatan |
|---|---|---|
| AI dan Studio lanjutan | `FR-STU-015…020`, `FR-STU-021…027` | Provider nyata gate manual |
| Data dan workflow | `FR-DATA-013…030` | Workflow, outbox, connector, CRDT |
| Sync dan backup | `FR-SYNC-001…025` | `FR-SYNC-021` restore snapshot terenkripsi |
| Host | `FR-HOST-026` | Jumlah antrean sync |
| NFR | `NFR-PERF-005` | Sync batch dan latensi |
| Suite keamanan | `R-04`, `R-05`, `R-09`, `R-16`, `R-19` | E2EE, SSRF, kebocoran kunci, idempotensi |

## 2. Perintah Gate

```bash
node scripts/check-docs.mjs --strict
npm test
npm run typecheck
npm run lint
npm run build
cargo test --manifest-path packages/core-rust/Cargo.toml
npm run e2e
node scripts/verify-phase-3.mjs
```

## 3. Gate Manual

| Gate | Alasan |
|---|---|
| Ollama/llama.cpp/vLLM/LM Studio nyata | Butuh model dan layanan lokal nyata |
| WebLLM/WebGPU nyata | Butuh GPU yang mendukung WebGPU |
| Dua perangkat WebRTC/mDNS/SAS | Butuh dua perangkat nyata |
| QR LAN hot reload di perangkat fisik | Butuh kamera dan TLS pinning nyata |

## 4. Hasil

| Item | Nilai |
|---|---|
| Commit | ditulis skrip |
| Status | ditulis skrip |
| JSON | `phase-3.json` |

## 5. Referensi

- [README.md](README.md) — skema dan aturan evidence.
- [release-gates.md](../release-gates.md) — gate otomatis dan manual.
