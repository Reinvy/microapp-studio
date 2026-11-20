---
id: FOUND-STATUS
title: Status Implementasi
status: accepted
owner: product
prd_refs: ["§2.1", "§3 Modul 1", "§8"]
---

# Status Implementasi

Dokumen ini mencatat **fakta kode saat ini** dan jaraknya terhadap target PRD. Status di sini adalah satu-satunya tempat selain [prd-compliance-matrix.md](prd-compliance-matrix.md) yang boleh menyatakan tingkat implementasi.

## 1. Ringkasan Eksekusi

| Aspek | Fakta terverifikasi |
|---|---|
| Repo | `microapp-studio`, branch `development`, npm workspaces (`apps/*`, `packages/*`) |
| Kontrak target | ADR-0011…ADR-0016 (database host, identitas/Vault, manifest/signature, sandbox/bridge, backup/workflow/CRDT/server, fase dan bukti) |
| Paket | `apps/studio-web` (Next.js 16 App Router, React 19), `packages/core-rust` (`microapp-core`), `packages/runtime-web`, `packages/ui-kit` |
| Route host | `/`, `/app/[appId]`, `/settings/{permissions,storage,vault,sync,backup}`, `/registry`, `/studio`, `/studio/[projectId]`, `/dev/tools`, `/admin` |
| Persistence | SQLite WASM di OPFS lewat worker (`journal_mode=TRUNCATE`), DDL kanonik §5 `data-model.md`, FTS5 `search_index` |
| Identitas | 24 kata BIP39, verifikasi pemulihan tanpa hash mnemonic, frasa disimpan terenkripsi dengan `CryptoKey` non-extractable di IndexedDB |
| Sandbox | Iframe `sandbox="allow-scripts"` + MUIP renderer di dalam iframe, bootstrap inline ber-nonce, broker bridge, watchdog |
| Eksekusi logika | Tidak ada `eval`/`new Function`/`innerHTML` di runtime produksi; ESLint menolak polanya |
| Backup | `.mapp-backup` (`MAPPBK01`) AES-256-GCM + Argon2id, checksum per section, restore tidak menimpa tanpa konfirmasi |
| Migrasi Phase 0 | Dexie v6 dibaca read-only, app menjadi `studio_project` draft, `legacy_record_map` idempoten |
| Test | Vitest 15 berkas / 152 test (`apps/studio-web`), 7 berkas / 69 test (`packages/runtime-web`), 1 berkas / 33 test (`packages/ui-kit`); Rust 52 test; Playwright 5 E2E |
| Server/Flutter/CLI | Belum ada (`apps/selfhost-server`, `apps/host-flutter`, `packages/cli` belum dibuat) |
| Sync/CRDT/AI/Registry install | Belum ada; registry baru menyimpan sumber, sinkronisasi fase 3, AI fase 3, instalasi registry fase 4 |

## 2. Status per Modul PRD

Status: `implemented` (acceptance verifikasi lulus), `partial` (sebagian ada, belum sesuai kontrak), `missing` (belum ada), `blocked` (butuh keputusan atau prasyarat).

| Modul PRD | Target | Current | Gap | Blocking | Phase |
|---|---|---|---|---|---|
| **§3 Modul 1** Host Shell | Local Identity, PWA offline, home grid/folder/dock/widget, omni-search FTS5, multitasking, intent bus, vault, notifikasi lokal, storage manager | Identity + recovery, PWA + service worker, home + FTS + command palette + deep link, permission broker, vault (Argon2id wrap + auto-lock), notifikasi lokal, storage manager, backup | Widget board UI, folder/dock UI, split-screen/PiP, `sqlite-vec` | — | 1 |
| **§3 Modul 2** Studio IDE | Canvas Flexbox/Grid, 120 komponen, token/theme, Monaco + LSP, two-way AST sync, AI lokal/BYOK, Git, Yjs multiplayer, QR LAN | Draft project + daftar; editor visual/AI belum ada | Seluruh editor, AST, AI, Git, multiplayer | Fase 2–3 | 2–3 |
| **§3 Modul 3** Sandbox Runtime | Iframe opaque origin + Worker + WASM, QuickJS/Wasmtime native, capability broker, offline cage, kuota, watchdog 5 detik, lifecycle | Web: opaque-origin iframe, renderer + validator MUIP, broker dengan urutan validasi, watchdog, crash isolation, CSP ketat. Native: belum ada | Host Flutter + engine QuickJS/Wasmtime | `apps/host-flutter`, `runtime-native` | 1 |
| **§3 Modul 4** Data & Automation | SQLite per micro-app, FTS5, sqlite-vec, SQLCipher, schema designer, migrasi, CRDT HLC, functions, workflow graph, outbox, connector | Host SQLite + FTS5 + migrasi forward/rollback; DB per app belum dibuka di runner; tanpa workflow/CRDT | App DB runtime, schema designer, workflow, CRDT | Fase 2–3 | 2–3 |
| **§3 Modul 5** Registry | Multi-source registry, cache offline, 4 cara install, reproducible build, scanner, signature, TOFU, delta, pin, rollback | Instalasi `.mapp` lokal bertanda tangan + verifikasi contentHash/signature di Rust; sumber registry dapat didaftarkan | Cache index, TOFU, scanner, delta, rollback, publish | Fase 4 | 4 |
| **§3 Modul 6** Sync & Backup | E2EE, 4 transport, conflict history, schema staging, export SQLite/JSONL/CSV/Markdown/snapshot, restore, revoke | Backup `.mapp-backup` terenkripsi + restore terverifikasi | Seluruh sync dan transport | Fase 3 | 3 |
| **§3 Modul 7** Self-Host | Lite/Standard/Cluster, auto-HTTPS, Compose, Helm, air-gap, OIDC/SAML/LDAP, RBAC/ABAC, audit chain, branding | Tidak ada | Seluruh server dan operasi | Fase 5 | 5 |
| **§3 Modul 8** DevTools/CLI/SDK | Profiler lokal, analytics opt-in, `microapp` CLI, plugin/driver API, SDK | `/dev/tools` status lokal; `mapp-tool` (Rust) untuk pack/verify/keygen/inspect; tanpa CLI `microapp`, SDK, plugin | CLI, SDK, profiler | Fase 2–5 | 2–4 |

## 3. Yang Tidak Boleh Diklaim Sudah Ada

Daftar berikut wajib dipakai reviewer untuk menolak klaim palsu pada README, dokumen, PR, atau materi promosi:

- Host Flutter native, engine QuickJS/Wasmtime, dan MADS Flutter.
- CRDT, HLC runtime, mutation log, conflict history, sinkronisasi apa pun.
- Registry remote, cache index, TOFU, scanner, reproducible build, delta update, publish.
- Workflow engine, outbox runtime, connector.
- AI lokal/WebLLM/Ollama maupun BYOK.
- Server self-hosted, SSO, RBAC, audit chain server, branding.
- CLI `microapp`, SDK, plugin API.
- Multiplayer, Git integration, LAN hot reload.
- DB per app yang benar-benar dibuka di runner; widget board; `sqlite-vec`.
- Klaim memory isolation yang ketat di web (lihat `FR-SBX-014`/`FR-SBX-015` partial).

## 4. Utang Keamanan yang Sudah Dihapus dan Sisa

| Item | Status |
|---|---|
| JWT hardcoded + auth localStorage | Dihapus; route login/register dan dependency `jose`/`bcryptjs` dihapus. |
| `new Function` untuk logika micro-app | Dihapus; bundle berjalan di iframe opaque origin. |
| `innerHTML`/HTML mentah pada render | Dihapus; renderer MUIP hanya `textContent`, ESLint menolak `innerHTML`. |
| Backup plaintext | Diganti `.mapp-backup` AES-256-GCM + Argon2id dengan checksum per section. |
| CSP longgar | Host memakai header keamanan + COOP/COEP; sandbox memakai CSP `default-src 'none'` dengan nonce. |
| Dexie v6 lama | Masih ada sebagai sumber migrasi read-only; dihapus hanya oleh pengguna setelah migrasi sukses. |

## 5. Peta Migrasi ke Target

| Langkah | Dari | Ke | Flow |
|---|---|---|---|
| 1 | `src/` monolit | `apps/studio-web/src` dalam npm workspaces | [13-phase0-migration](../04-flows/13-phase0-migration.md) |
| 2 | Dexie `apps`/`content`/`runHistory` | SQLite WASM + OPFS, skema per micro-app | [13-phase0-migration](../04-flows/13-phase0-migration.md) |
| 3 | `AppSchema` + `new Function` | Manifest v2, project draft Studio, modul sandbox | [04-visual-code-sync](../04-flows/04-visual-code-sync.md) |
| 4 | Auth localStorage | Local Identity + pairing | [01-first-run](../04-flows/01-first-run.md) |
| 5 | Backup JSON v1 | Snapshot terenkripsi + ekspor terbuka | [07-backup-recovery](../04-flows/07-backup-recovery.md) |
| 6 | Deploy Vercel | PWA self-host + desktop bundle | [10-selfhost-airgap](../04-flows/10-selfhost-airgap.md) |

## 6. Aturan Pembaruan Status

1. Status hanya dinaikkan setelah `## 8. Verifikasi` pada spec terkait dijalankan dan hasilnya dicatat.
2. Setiap kenaikan status wajib disertai commit `docs(status):` dan pembaruan baris matriks.
3. Status tidak boleh diturunkan tanpa catatan alasan pada PR.
4. Angka dan fakta pada §1 wajib diverifikasi ulang setiap release; bila berbeda, perbaiki dokumen ini lebih dulu.
