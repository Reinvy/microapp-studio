---
id: FOUND-STATUS
title: Status Implementasi
status: accepted
owner: product
prd_refs: ["§5 Fitur", "§10 Roadmap"]
---

# Status Implementasi

Dokumen ini mencatat **fakta kode saat ini** dan jaraknya terhadap PRD v3.0. Status di sini dan di [prd-compliance-matrix.md](prd-compliance-matrix.md) adalah satu-satunya tempat yang boleh menyatakan tingkat implementasi.

## 1. Ringkasan Terverifikasi

| Aspek | Fakta |
|---|---|
| Repo | `microapp-studio`, npm workspaces (`apps/*`, `packages/*`) |
| Stack | Next.js 16 App Router, React 19, TypeScript, Tailwind v4 |
| Paket nyata | `apps/studio-web`, `packages/runtime-web`, `packages/ui-kit`, `packages/core-rust` (WASM) |
| Route nyata | `/`, `/app/[appId]`, `/studio`, `/studio/[projectId]`, `/registry`, `/settings`, `/settings/permissions`, `/settings/storage`, `/settings/vault`, `/settings/sync`, `/settings/backup`, `/settings/notifications`, `/dev/tools`, `/admin` |
| Route target belum ada | `/templates`, `/packages`, `/packages/import`, `/create`, `/settings/general`, `/settings/ai`, `/settings/about`, `/settings/dev`, `/settings/data` |
| Shell | App Router, PWA/service worker, i18n `id-ID`/`en-US`, workspace switcher, pencarian FTS5, notifikasi, storage pins |
| Identitas | 24 kata BIP39 dengan konfirmasi 3 kata sebagai gate; `CryptoKey` non-extractable; identity worker |
| Data | SQLite WASM + OPFS lewat worker, migrasi 001/002, FTS5; DB per app belum dibuka di runner |
| Sandbox | Iframe `sandbox="allow-scripts"`, MUIP renderer, bridge broker, watchdog, crash isolation |
| Package | Verifikasi/instalasi `.mapp` lokal dengan signature dan contentHash; registry baru menyimpan sumber, belum ada cache/install dari index |
| Backup | `.mapp-backup` header `MAPPBK01`, AES-256-GCM + Argon2id, checksum per section |
| Permission/Vault | Broker, consent, grant/revoke, vault Argon2id wrap, auto-lock, audit chain |
| Studio | Draft project (create/list/detail); visual builder, template, AI, preview builder belum ada |
| Design | Token MADS lama (teal/neutral); komponen ui-kit terbatas; claymorphism belum diterapkan |
| Test | Vitest 15 berkas/153 test (`apps/studio-web`), 7/69 (`packages/runtime-web`), 1/33 (`packages/ui-kit`); Rust 53 test; Playwright 5 E2E |
| Tidak ada | `apps/host-flutter`, `apps/selfhost-server`, `packages/runtime-native`, `packages/sdk`, `packages/ai-bridge`, `packages/cli`, `deploy/`; tidak ada CRDT/P2P/sync/workflow |

Angka test berasal dari `npm test` dan `cargo test` pada baseline refactor ini. Bila berbeda saat dijalankan ulang, perbaiki dokumen ini lebih dulu.

## 2. Status per Area

| Area | Status | Gap |
|---|---|---|
| Boot dan shell | partial | Boot belum diukur < 1 s; skeleton belum lengkap. |
| Local identity otomatis | partial | Identitas ada, tetapi onboarding masih meminta 24 kata sebelum Home. |
| Home dan library | partial | Library dan pencarian ada; empty state tiga jalur belum ada. |
| Create (template/AI/blank) | missing | Belum ada galeri template, Magic Create, atau blank flow. |
| Visual builder | missing | Hanya draft create/list/detail; canvas, palette, inspector belum ada. |
| Preview/runner | partial | Runner sandbox ada; preview builder belum memakai draft. |
| Data | partial | Host DB dan migrasi ada; DB per app belum dibuka di runner. |
| Package | partial | Import/verifikasi lokal ada; index statis dan update/rollback belum. |
| Backup | partial | Backup/restore ada; recovery phrase belum ditunda sesuai target. |
| Permission | implemented | Zero privilege, consent, revoke, cage, audit. |
| Settings | partial | Sebagian route target belum ada; tema clay belum. |
| DevTools | partial | Panel status ada; inspeksi package/bridge/error belum lengkap. |
| Clay design system | missing | Token dan komponen clay belum diimplementasikan. |
| i18n dan a11y | partial | id/en ada; audit axe dan RTL belum lengkap. |

## 3. Yang Tidak Boleh Diklaim

Daftar berikut wajib dipakai reviewer untuk menolak klaim palsu pada README, dokumen, PR, atau materi promosi:

- Visual builder, template gallery, Magic Create, AI assist, atau preview builder yang sudah berjalan.
- Claymorphism yang sudah diterapkan di UI produksi.
- DB per app yang benar-benar dibuka di runner.
- Index package statis dengan cache/install otomatis.
- Update/rollback package, publish pipeline, atau marketplace.
- Akun, cloud sync, CRDT, P2P, atau multiplayer.
- Aplikasi native, Flutter, self-host server, CLI, atau SDK.
- Telemetry atau analytics.
- Isolasi memori tingkat OS pada iframe; yang ada adalah origin isolation.

## 4. Utang Keamanan yang Sudah Dihapus

| Item | Status |
|---|---|
| JWT hardcoded + auth localStorage | Dihapus; route login/register dan dependency terkait dihapus. |
| `new Function` untuk logika micro-app | Dihapus; bundle berjalan di iframe opaque origin. |
| `innerHTML` pada render | Dihapus; renderer MUIP memakai `textContent`. |
| Backup plaintext | Diganti `.mapp-backup` AES-256-GCM + Argon2id. |
| CSP longgar | Diganti CSP ketat + COOP/COEP pada host dan sandbox. |
| Dexie v6 | Dipertahankan sebagai sumber migrasi read-only. |

## 5. Peta ke Target

| Langkah | Dari | Ke | Flow |
|---|---|---|---|
| 1 | Identitas dengan gate mnemonic | Identitas otomatis, frasa ditunda | [FLOW-01](../04-flows/01-first-run.md) |
| 2 | Draft tanpa builder | Create + visual builder | [FLOW-02](../04-flows/02-create-app.md) |
| 3 | Runner tanpa preview draft | Preview di sandbox yang sama | [FLOW-03](../04-flows/03-edit-preview.md) |
| 4 | Import package lokal | Share/install dengan verifikasi penuh | [FLOW-04](../04-flows/04-share-install.md) |
| 5 | Backup tanpa frasa ditunda | Backup + recovery opsional | [FLOW-05](../04-flows/05-backup-recovery.md) |
| 6 | Dexie v6 | Impor read-only idempoten | [FLOW-08](../04-flows/08-migration.md) |

## 6. Aturan Pembaruan

1. Status naik hanya setelah verifikasi pada spec dijalankan dan hasilnya dicatat di [baseline.md](../08-quality/evidence/baseline.md).
2. Setiap kenaikan status disertai commit `docs(status):` dan pembaruan baris matriks.
3. Status tidak boleh turun tanpa catatan alasan pada PR.
4. Angka pada §1 wajib diverifikasi ulang setiap rilis.
