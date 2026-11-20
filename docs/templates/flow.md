---
id: TPL-FLOW
title: "FLOW-{{NN}} {{judul flow}}"
status: draft
owner: dx
prd_refs: ["§{{n}}"]
---

# FLOW-{{NN}} {{judul flow}}

## Trigger

{{kejadian pemicu}}.

## Aktor

{{aktor dan sistem yang terlibat}}.

## Prasyarat

{{state awal yang harus benar}}.

## Alur Utama

```mermaid
sequenceDiagram
    participant U as Pengguna
    participant H as Host
    U->>H: {{aksi}}
    H-->>U: {{hasil}}
```

## Cabang Gagal

| Kondisi | Kode | Perilaku |
|---|---|---|
| {{kondisi}} | E-{{DOMAIN}}-{{NNN}} | {{recovery}} |

## Data dan State

{{tabel/field yang berubah, invariant}}.

## Izin dan Keamanan

{{permission dan audit}}.

## Perilaku Offline

{{perilaku saat tanpa jaringan}}.

## Acceptance Criteria

- **Given** {{konteks}} **When** {{aksi}} **Then** {{hasil}}.

## Verifikasi

{{perintah dan bukti}}.

## Referensi

- [04-flows/README.md](../04-flows/README.md)
- {{FR/SEC terkait}}
