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
| Repo | `microapp-studio`, branch `development`, prototipe Phase 0 |
| Framework | Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4 |
| Route halaman | 7 halaman: `/`, `/app`, `/builder`, `/dev`, `/login`, `/register`, `/run/[id]`; ditambah 2 layout (`app/layout.tsx`, `app/app/layout.tsx`) |
| State | Zustand store tunggal (`src/store/appStore.ts`) |
| Editor kode | Monaco via `@monaco-editor/react` |
| Drag and drop | `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` |
| Persistence | Dexie/IndexedDB `MicroAppStudio` versi skema 6, tabel `apps`, `content`, `runHistory` |
| Test | Vitest, 33 berkas test; 581 test lulus pada verifikasi paket |
| Backup | JSON format `microapp-studio-backup` versi 1 (`src/lib/backup.ts`) |
| Auth | localStorage `microapp_users` + JWT `jose` dengan secret hardcoded (`src/lib/auth.ts`) |
| Eksekusi logika | `new Function` pada `src/engine/evaluator.ts` |
| Server/Rust/Flutter | Tidak ada |
| Sandbox nyata | Tidak ada; micro-app dirender di dokumen Host |
| CRDT/sync | Tidak ada |
| Registry | Tidak ada; hanya impor/ekspor JSON lokal |

## 2. Status per Modul PRD

Status: `implemented` (acceptance verifikasi lulus), `partial` (sebagian ada, belum sesuai kontrak), `missing` (belum ada), `blocked` (butuh keputusan atau prasyarat).

| Modul PRD | Target | Current | Gap | Blocking | Phase |
|---|---|---|---|---|---|
| **§3 Modul 1** Host Shell | Local Identity, PWA offline, home grid/folder/dock/widget, omni-search FTS5, multitasking, intent bus, vault, notifikasi lokal, storage manager | Dashboard grid sederhana, pencarian nama di memori, tanpa identity, tanpa vault, tanpa notifikasi | Seluruh kapabilitas Host Shell | Core Rust, SQLite WASM, sandbox | 1 |
| **§3 Modul 2** Studio IDE | Canvas Flexbox/Grid, 120 komponen, token/theme, Monaco + LSP, two-way AST sync, AI lokal/BYOK, Git, Yjs multiplayer, QR LAN | Canvas drag-and-drop 9 tipe field, properties panel, Monaco tanpa LSP, prompt parser pola terbatas | Komponen, layout engine, AST sync, AI, Git, multiplayer, hot reload | Schema v2, MADS, AI bridge | 2–3 |
| **§3 Modul 3** Sandbox Runtime | Iframe opaque origin + Worker + WASM, QuickJS/Wasmtime native, capability broker, offline cage, kuota, watchdog 5 detik, lifecycle | Eksekusi `new Function` di konteks Host; tanpa isolasi, tanpa permission, tanpa watchdog | Seluruh runtime dan broker | Core Rust, runtime-web, runtime-native | 1 |
| **§3 Modul 4** Data & Automation | SQLite per micro-app, FTS5, sqlite-vec, SQLCipher, schema designer, migrasi, CRDT HLC, functions, workflow graph, outbox, connector | IndexedDB global, tanpa SQL, tanpa migrasi, tanpa workflow, tanpa connector | Seluruh data layer dan automation | Core Rust, SQLite WASM/OPFS, cr-sqlite | 2–3 |
| **§3 Modul 5** Registry | Multi-source registry, cache offline, 4 cara install, reproducible build, scanner, signature, TOFU, delta, pin, rollback | Tidak ada | Seluruh registry dan supply chain | Manifest v2, core verify, registry index | 4 |
| **§3 Modul 6** Sync & Backup | E2EE, 4 transport, conflict history, schema staging, export SQLite/JSONL/CSV/Markdown/snapshot, restore, revoke | Backup JSON v1 lokal, tanpa enkripsi, tanpa sync | Seluruh sync dan portability | Identity, crypto core, CRDT | 3 |
| **§3 Modul 7** Self-Host | Lite/Standard/Cluster, auto-HTTPS, Compose, Helm, air-gap, OIDC/SAML/LDAP, RBAC/ABAC, audit chain, branding | Tidak ada | Seluruh server dan operasi | Go server, kontrak sync | 5 |
| **§3 Modul 8** DevTools/CLI/SDK | Profiler lokal, analytics opt-in, `microapp` CLI, plugin/driver API, SDK | Dev playground Monaco untuk node JS, tanpa profiler, tanpa CLI, tanpa SDK | Seluruh tooling developer | CLI, SDK, runtime | 2–4 |

## 3. Yang Tidak Boleh Diklaim Sudah Ada

Daftar berikut wajib dipakai reviewer untuk menolak klaim palsu pada README, dokumen, PR, atau materi promosi:

- Local Identity, device certificate, recovery phrase.
- Sandbox, capability broker, permission consent, offline cage.
- Enkripsi at-rest maupun E2EE; vault.
- SQLite/SQLCipher/OPFS, FTS5, `sqlite-vec`.
- CRDT, HLC, mutation log, conflict history, sinkronisasi apa pun.
- Registry, signature verification, TOFU, reproducible build, delta update.
- Workflow engine, outbox, connector.
- AI lokal/WebLLM/Ollama maupun BYOK.
- Server self-hosted, SSO, RBAC, audit chain, branding.
- CLI `microapp`, SDK, plugin API.
- Multiplayer, Git integration, LAN hot reload.

## 4. Utang Keamanan Phase 0 yang Wajib Dihapus

| Utang | Lokasi | Dampak | Rencana |
|---|---|---|---|
| JWT secret hardcoded | `src/lib/auth.ts` (`SECRET`) | Siapa pun dapat memalsukan token; secret bocor di bundle klien. | Dihapus pada Phase 1; diganti Local Identity Ed25519. |
| Kredensial di localStorage | `src/lib/auth.ts` (`microapp_users`, `microapp_session`) | Dapat dibaca skrip mana pun pada origin; tidak ada isolasi. | Password tidak dimigrasi; akun lokal dihapus. Lihat [FLOW-13](../04-flows/13-phase0-migration.md). |
| `new Function` untuk logika micro-app | `src/engine/evaluator.ts` | Eksekusi kode tanpa isolasi; sandbox escape sepele. | Diganti modul sandbox JS/WASM; dilarang di runtime produksi. |
| `innerHTML`/HTML mentah pada render | Komponen runner dan UI | Vektor XSS bila konten micro-app tidak tersanitasi. | MUIP tanpa HTML mentah; sanitasi di boundary. |
| Tanpa CSP ketat | `next.config.ts` | Tidak ada pertahanan berlapis terhadap injeksi. | CSP `default-src 'none'` pada iframe dan header Host. |
| Backup tanpa enkripsi | `src/lib/backup.ts` | Backup JSON memuat seluruh data plaintext. | Snapshot terenkripsi AES-256-GCM dengan passphrase. |

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
