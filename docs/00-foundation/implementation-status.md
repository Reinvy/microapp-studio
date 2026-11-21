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
| Rute | `/`, `/templates`, `/create?mode=ai\|blank`, `/studio/[projectId]` (+`?preview=1`), `/app/[appId]`, `/packages`, `/packages/import`, `/settings`, `/settings/{general,permissions,ai,data,about,dev}` |
| Rute lama | Dialihkan di `next.config.ts` (`/registry`, `/admin`, `/dev/tools`, `/settings/{vault,sync,notifications,storage,backup}`, `/studio`, `/dashboard`) |
| Shell | App Shell clay, sidebar 264 px / rail 80 px / dock 64 px, command palette `Cmd/Ctrl+K`, badge offline+cache terpisah, banner recovery/backup 7 hari, not-found in-shell |
| Identitas | Dibuat otomatis saat boot (tanpa modal), frasa 24 kata hanya di `RecoverySheet`, provisi Argon2id berjalan di latar agar Home tidak diblokir |
| Preferensi | `settings.preferences` + mirror `localStorage`, `theme-init.js` pra-paint, tema system/light/dark/high-contrast, locale, skala teks 1/1.125/1.25, reduced motion |
| Data | SQLite WASM + OPFS (pool SAH) dengan fallback memori eksplisit, migrasi 001–003 + rollback, snapshot pra-migrasi, DB per app `workspaces/<slug>/apps/<appId>.db`, FTS5 |
| Sandbox | Iframe `sandbox="allow-scripts"` opaque origin, MUIP props-only, broker 14 metode, consent JIT, watchdog 3 restart/5 menit, hibernasi 30 s, boundary crash |
| Package | `.mapp` v2 (`microapp.manifest.json` + `signature.ed25519`), hash kanonik JCS, ZIP deterministik, verifikasi manifest/signature/digest, key-change & downgrade gate, rollback, uninstall dengan ekspor |
| Backup | `.mapp-backup` v2 bersection (identity/host/app/bundles/settings), Argon2id + AES-GCM per section, preview + merge/replace, restore all-or-nothing |
| Permission/Vault | 8 permission katalog, grant/revoke, Offline Cage, BYOK di vault (AAD `settings.ai.api_key`), audit chain |
| Studio | 8 template, Magic Create dua langkah (rencana → draft), 4 layout kosong, builder palette 48 core/120 advanced, layer tree, inspector token, undo 100, autosave 500 ms + mirror, preview sandbox, share `.mapp` |
| Design | Token clay kanonik (DESIGN.md §2), font lokal (Plus Jakarta Sans/Fraunces/JetBrains Mono), 69 komponen ui-kit |
| Test | Vitest 22 berkas/158 test (`apps/studio-web`), 7/94 (`packages/runtime-web`), 1/69 (`packages/ui-kit`); Rust 58 test; Playwright 71 E2E |
| Tidak ada | `apps/host-flutter`, `apps/selfhost-server`, `packages/runtime-native`, `packages/sdk`, `packages/ai-bridge`, `packages/cli`, `deploy/`; tidak ada CRDT/P2P/sync/workflow |

Angka test berasal dari `npm test`, `cargo test`, dan `npm run e2e` pada tree ini. Bila berbeda saat dijalankan ulang, perbaiki dokumen ini lebih dulu.

## 2. Status per Area

| Area | Status | Bukti |
|---|---|---|
| Boot dan shell | implemented | `e2e/host.spec.ts`, `e2e/security.spec.ts`, `e2e/perf.spec.ts` |
| Local identity otomatis | implemented | `e2e/host.spec.ts` (tanpa modal/mnemonic), `features/identity/ensureIdentity.ts` |
| Home dan library | implemented | `e2e/host.spec.ts` (kartu create 360×640), `features/home/libraryState.ts` |
| Create (template/AI/blank) | implemented | `e2e/builder.spec.ts`, `features/templates/__tests__`, `features/ai/__tests__` |
| Visual builder | implemented | `e2e/builder.spec.ts`, `features/studio/__tests__` (history, autosave, tree, palette, benchmark) |
| Preview/runner | implemented | `e2e/packages.spec.ts`, `features/runner/__tests__` |
| Data | implemented | `src/db/__tests__`, `scripts/test-migrations.mjs` |
| Package | implemented | `e2e/packages.spec.ts`, `cargo test` (v2 pack/verify) |
| Backup | implemented | `cargo test` (backup v2), `src/features/backup/__tests__` |
| Permission | implemented | `packages/runtime-web` broker tests, `e2e/packages.spec.ts` (consent) |
| Settings | implemented | route `/settings/*`, `features/settings/__tests__` (transfer preferensi) |
| DevTools | implemented | `/settings/dev` di balik flag, `db/repositories/devLog.ts` + tes redaksi |
| Clay design system | implemented | `packages/ui-kit` (69 test, axe, kontras), `scripts/check-tokens.mjs` |
| i18n dan a11y | implemented | `src/__tests__/i18n.test.ts`, `error-copy.test.ts`, `e2e/a11y.spec.ts`, `e2e/rtl.spec.ts` |

## 3. Yang Tidak Boleh Diklaim

Daftar berikut wajib dipakai reviewer untuk menolak klaim palsu pada README, dokumen, PR, atau materi promosi:

- Sinkronisasi, akun, cloud, CRDT, P2P, multiplayer, atau telemetry.
- Aplikasi native, Flutter, self-host server, CLI, atau SDK.
- Marketplace, publish pipeline, atau server registry (yang ada hanya index statis read-only).
- Isolasi memori tingkat OS pada iframe; yang ada adalah origin isolation.
- Bahwa data lokal tidak dapat dihapus oleh peramban; user wajib membuat backup.
- Perbaikan otomatis atas kegagalan AI lintas provider; Magic Create hanya mencoba ulang secara manual.
- Klaim performa pada perangkat nyata selain throttle yang didokumentasikan (Fast 3G + 4× CPU).

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
