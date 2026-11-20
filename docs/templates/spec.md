---
id: TPL-SPEC
title: "{{judul spec}}"
status: draft
owner: dx
prd_refs: ["§{{n}}"]
---

# {{judul spec}}

## 1. Tujuan dan Ruang Lingkup

{{tujuan}}. Di luar lingkup: {{batas}}.

## 2. Aktor dan Prasyarat

| Aktor | Prasyarat |
|---|---|
| {{aktor}} | {{prasyarat}} |

## 3. Requirement

| ID | Level | Requirement | Acceptance |
|---|---|---|---|
| FR-{{DOMAIN}}-{{NNN}} | MUST | {{perilaku yang dapat diuji}} | {{kondisi terukur}} |

## 4. Model Data dan State

{{entitas, field, state machine, invariant}}.

## 5. Error dan Recovery

| Kode | Kondisi | Recovery |
|---|---|---|
| E-{{DOMAIN}}-{{NNN}} | {{kondisi}} | {{langkah}} |

## 6. Keamanan dan Privasi

{{permission, data sensitif, audit}}.

## 7. Acceptance Criteria

- **Given** {{konteks}} **When** {{aksi}} **Then** {{hasil}}.

## 8. Verifikasi

{{perintah dan bukti yang harus dijalankan}}.

## 9. Referensi

- [docs/README.md](../README.md)
- {{tautan spec/flow/ADR terkait}}
