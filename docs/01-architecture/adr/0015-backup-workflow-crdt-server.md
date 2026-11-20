---
id: ADR-0015
title: ADR-0015 Backup, Workflow, CRDT, Registry, dan RBAC Server
status: accepted
owner: sync
prd_refs: ["§4.4", "§3 Modul 4", "§3 Modul 6", "§3 Modul 7"]
---

# ADR-0015 Backup, Workflow, CRDT, Registry, dan RBAC Server

## Konteks

Empat kontrak lintas fase masih ganda atau belum tertutup. Backup muncul dua kali dengan format berbeda (FR-HOST-021 dan FR-SYNC-021). Status workflow memakai `succeeded` di dokumen data dan `done` di dokumen automation. Strategi CRDT menyebut `cr-sqlite` tanpa jalur alternatif meskipun build WASM-nya belum terbukti dapat dimuat di `@sqlite.org/sqlite-wasm`. RBAC server memakai `curator` dan `auditor` sementara PRD FR-SRV-016 menetapkan lima role lain. Kepemilikan paket untuk workflow, sync, registry, dan plugin belum ditetapkan sehingga kode berisiko tersebar di tiga tempat.

## Keputusan

1. **Satu format backup.** FR-HOST-021 dan FR-SYNC-021 memakai satu kontainer `.mapp-backup`: header ASCII `MAPPBK01`, `version` u16, parameter KDF (Argon2id `m = 64 MiB`, `t = 3`, `p = 1`, salt 16 byte) atau penanda kunci turunan master, `nonce` 12 byte, ciphertext AES-256-GCM, tag 16 byte. Plaintext adalah JSON kanonik JCS berisi `workspace`, `hostDb` per tabel, `appDbs` (base64), `manifests`, `checksums` SHA-256 per section, `createdAt`, dan `formatVersion`.
2. **Restore aman.** Restore memverifikasi checksum dan jumlah record per section sebelum menulis apa pun, meminta konfirmasi bila workspace tujuan sudah berisi data, dan tidak pernah menimpa tanpa persetujuan eksplisit.
3. **Status workflow kanonik** di DB: `queued`, `running`, `waiting_network`, `waiting_hitl`, `done`, `failed`, `dead`. UI memetakan label tampilan; `succeeded` dan `awaiting_hitl` bukan nilai penyimpanan. `attempt` maksimum 8, backoff `1s × 2^n` dengan cap 1 jam dan jitter 20%, idempotency key UUIDv7.
4. **CRDT kolom-level.** `row_id` UUIDv7 plaintext, `pk_hash BLOB(32)` = SHA-256 primary key untuk log, nilai sensitif disimpan sebagai `value_ciphertext` per kolom; HLC `{physical_ms, counter, site_id}`; LWW per kolom; `conflict_history` menyimpan nilai kalah; `crdt_schema_staging` menampung versi skema lebih baru. Retensi log minimal 90 hari lokal dan 180 hari server.
5. **Jalur cadangan CRDT.** Bila `cr-sqlite` tidak dapat dimuat di `@sqlite.org/sqlite-wasm`, implementasi mutation log kolom-level sesuai §4 di `core-rust` dan ADR supersede terhadap ADR-0004 dibuat. Fase 3 tidak ditunda karena ketergantungan ekstensi.
6. **RBAC kanonik** = `owner`, `admin`, `maintainer`, `member`, `viewer` (FR-SRV-016), ditambah atribut ABAC JSON. Audit chain server memakai algoritma hash yang sama dengan host lokal (ADR-0011) sehingga rantai dapat diverifikasi dengan tool yang sama.
7. **Kepemilikan paket tanpa paket baru.** Workflow runner: `apps/studio-web/src/workers/workflow` + `apps/selfhost-server`. Sync worker/protokol: `packages/core-rust` + `packages/runtime-web` + `apps/studio-web`. Registry client: `apps/studio-web/src/features/registry` dengan verifier di `core-rust`. Plugin host: `apps/studio-web` + `apps/selfhost-server` dengan kontrak di `packages/sdk`.
8. **Taksonomi template.** `templates/` berisi starter use-case (CRUD, POS, Notes, AI Chat, IoT). CLI `microapp init --framework react|svelte|vue|solid|vanilla|wasm` memakai template use-case ditambah adapter framework; tidak ada direktori template per framework.
9. **Supply chain per fase.** Setiap rilis fase mengirim SBOM CycloneDX dan checksum SHA-256; SLSA provenance baru wajib pada fase 5. Gate keamanan fase 1 menjalankan suite R-01, R-06, R-07, R-08, ditambah R-10 dan R-20 untuk identitas dan Vault.
10. **Fitur FR-HOST yang ditarik maju ke fase 1** seminimal mungkin: pencarian FTS5, backup terenkripsi, jumlah antrean outbox (0 sampai sync tersedia), query widget ke DB app, dan project draft Studio untuk FLOW-13. Ini bukan klaim fitur fase 2–5: tabel dan skema disiapkan, UI lanjutan menyusul pada fasenya.

## Konsekuensi

- Satu implementasi backup dipakai host web, Flutter, dan server; tidak ada dua dialek yang harus diuji silang.
- Nilai status `succeeded`/`awaiting_hitl` pada dokumen lama wajib diperbaiki; test yang memakai nilai lama dianggap bug.
- Deteksi `cr-sqlite` tidak tersedia menjadi jalur yang diuji, bukan kegagalan yang menunda fase.
- Plugin dan connector server berjalan pada host WASM (`wazero`) dengan deklarasi capability; kontrak input/output sama dengan implementasi JavaScript agar workflow portabel.
- SBOM dan checksum menjadi artefak rilis wajib; rilis tanpa SBOM tidak boleh diberi tag.

## Alternatif

| Alternatif | Alasan ditolak |
|---|---|
| Dua format backup (host dan sync) | Restore lintas kanal gagal dan verifikasi harus digandakan. |
| Menyimpan `succeeded` sebagai status | Bertentangan dengan FR-DATA dan membuat pemetaan UI wajib di setiap pembaca. |
| Menunda fase 3 sampai `cr-sqlite` terbukti | Ketergantungan eksternal menjadi blocker rilis; spesifikasi sudah menyediakan log kolom-level. |
| Role `curator`/`auditor` | Bertentangan dengan FR-SRV-016 dan matriks RBAC server. |
| Paket baru `@microapp/workflow` | Menambah permukaan paket tanpa manfaat; runner hanya dipakai dua app. |
| Template per framework | Menggandakan use-case dan memecah pemeliharaan. |

## Status

`accepted`. Format backup ada di [03-specs/06-sync-backup.md](../../03-specs/06-sync-backup.md); status workflow di [03-specs/04-data-automation.md](../../03-specs/04-data-automation.md); RBAC di [03-specs/07-selfhost.md](../../03-specs/07-selfhost.md); kepemilikan paket di [monorepo.md](../monorepo.md).
