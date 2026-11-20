---
id: QA-EVIDENCE-5
title: Evidence Fase 5
status: accepted
owner: qa
prd_refs: ["§8"]
---

# Evidence Fase 5

Record bukti untuk self-host, air-gap, dan audit akhir. Ditulis oleh `scripts/verify-phase-5.mjs`.

## 1. Cakupan

| Grup | Requirement | Catatan |
|---|---|---|
| Server | `FR-SRV-001…030` | Profil Lite/Standard/Cluster, auth, RBAC, audit, branding, backup |
| Host | `FR-HOST-019` | WebPush/UnifiedPush tanpa FCM/APNs |
| Plugin/SDK | `FR-DEV-015…020` | Plugin host, capability, SDK typed |
| Suite keamanan | `R-01…R-20` | Seluruh suite, termasuk `R-17` audit dependency |
| Supply chain | SBOM CycloneDX, checksum, air-gap | Gate rilis |

## 2. Perintah Gate

```bash
node scripts/check-docs.mjs --strict
npm test
npm run typecheck
npm run lint
npm run build
cargo test --manifest-path packages/core-rust/Cargo.toml
go test ./...
go vet ./...
npm run e2e
node scripts/verify-phase-5.mjs
```

## 3. Gate Manual

| Gate | Alasan |
|---|---|
| K8s/Helm nyata dan HPA | Cluster tidak tersedia |
| Let's Encrypt dan domain nyata | Butuh DNS dan jaringan publik |
| VPS 512 MB, 20 pengguna, RSS 1 jam | Butuh host nyata |
| OIDC/SAML/LDAP/WebAuthn/SIEM nyata | Butuh IdP dan SIEM eksternal |
| Air-gap network namespace penuh | Butuh isolasi jaringan host |

## 4. Hasil

| Item | Nilai |
|---|---|
| Commit | ditulis skrip |
| Status | ditulis skrip |
| JSON | `phase-5.json` |

## 5. Referensi

- [README.md](README.md) — skema dan aturan evidence.
- [release-gates.md](../release-gates.md) — gate otomatis dan manual.
