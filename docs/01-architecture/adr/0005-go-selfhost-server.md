---
id: ADR-0005
title: ADR-0005 Server Self-Host Go
status: accepted
owner: architecture
prd_refs: ["§3 Modul 7", "§4.2"]
---

# ADR-0005 Server Self-Host Go

## Konteks

Server harus dapat berjalan sebagai satu binary di perangkat 512 MB RAM sekaligus scale-out di Kubernetes, dengan driver SQLite dan PostgreSQL, serta tanpa ketergantungan runtime proprietary.

## Keputusan

1. **Bahasa: Go.** Satu binary statis, startup cepat, footprint memori kecil, dan dukungan lintas arsitektur (`amd64`, `arm64`).
2. **Profil:**
   - Lite: SQLite WAL, local disk, auto-HTTPS.
   - Standard: PostgreSQL 16 + pgvector, Valkey/Redis, MinIO/S3.
   - Cluster: tambah NATS JetStream, HA PostgreSQL, OpenTelemetry.
3. **Modul server:** sync hub (WebSocket/HTTP2, ciphertext-only), registry internal, auth (OIDC/OAuth2/SAML2/LDAP/passkey/magic link), RBAC/ABAC, workflow runner, audit chain, branding.
4. **Batas memori Lite:** 1 vCPU dan 512 MB RAM untuk 1–20 pengguna; deploy < 2 menit.
5. **Tidak ada tabel billing atau lisensi.** Semua fitur tersedia tanpa seat limit.
6. **Konfigurasi tunggal `microapp.yaml`** dan `branding.yaml`; tidak perlu fork untuk white-label.

## Konsekuensi

- Satu binary memudahkan distribusi air-gap dan homelab.
- Dua driver database menambah matriks test; query wajib portabel.
- Fitur cluster bergantung pada layanan eksternal; Lite tidak boleh membutuhkannya.
- Server tidak dapat membaca data pengguna (E2EE); dukungan troubleshooting terbatas pada metadata.

## Alternatif

| Alternatif | Alasan ditolak |
|---|---|
| Node.js/Fastify | Footprint lebih besar dan distribusi binary lebih rumit. |
| Rust | Cocok secara performa, tetapi ekosistem server/SSO/queue lebih matang di Go dan menambah waktu ke rilis. |
| Elixir/Phoenix | Kuat untuk realtime, tetapi menambah runtime dan toolchain baru. |
| Server wajib terpisah per profil | Duplikasi kode dan risiko drift perilaku. |
| Billing opsional | Bertentangan dengan prinsip tanpa paywall. |

## Status

`accepted`. Perubahan bahasa, profil, atau penambahan komponen wajib melalui RFC.
