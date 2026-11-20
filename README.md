# MicroApp Studio

Platform micro-app open-source, offline-first, dan self-hostable. Repo ini saat ini berisi **prototipe Phase 0** (web) dan **paket dokumentasi SDD** yang menjadi kontrak untuk target PRD v2.0.

> Status: prototipe web. Local Identity, sandbox, SQLite/OPFS, CRDT, registry, AI lokal, dan server self-host **belum ada**. Lihat [implementation-status.md](docs/00-foundation/implementation-status.md) sebelum mengklaim kemampuan apa pun.

## 1. Apa yang Benar-Benar Ada

| Area | Kondisi saat ini |
|---|---|
| Web app | Next.js 16 App Router, React 19, TypeScript, Tailwind v4 |
| Halaman | `/`, `/app`, `/builder`, `/dev`, `/login`, `/register`, `/run/[id]` |
| Builder | Canvas drag-and-drop (`@dnd-kit`) untuk 9 tipe field + properties panel |
| Prompt parser | Pola terbatas (calculator, form, survey, todo, budget, counter, validator) |
| Runner | Render form dari JSON schema, validasi, eksekusi node logika |
| Editor | Monaco di halaman `/dev` (tanpa LSP) |
| Penyimpanan | Dexie/IndexedDB `MicroAppStudio` v6: `apps`, `content`, `runHistory` |
| Backup | JSON `microapp-studio-backup` v1 (belum terenkripsi) |
| Auth | Akun lokal di localStorage + JWT (utang keamanan, akan dihapus) |
| Test | Vitest |

Tidak ada: server, Rust core, Flutter host, sandbox, permission broker, sinkronisasi, registry, workflow engine, CLI, SDK.

## 2. Quick Start (Phase 0)

```bash
git clone https://github.com/Reinvy/microapp-studio.git
cd microapp-studio
npm install
npm run dev      # http://localhost:3000
npm test
npm run build
```

## 3. Dokumentasi

Dokumen adalah sumber kebenaran. Mulai dari [docs/README.md](docs/README.md).

| Topik | Dokumen |
|---|---|
| Visi, prinsip, persona, mode operasi | [docs/00-foundation/product-foundation.md](docs/00-foundation/product-foundation.md) |
| SDD dan status implementasi | [docs/00-foundation/sdd-workflow.md](docs/00-foundation/sdd-workflow.md), [docs/00-foundation/implementation-status.md](docs/00-foundation/implementation-status.md) |
| Arsitektur dan ADR | [docs/01-architecture/system-overview.md](docs/01-architecture/system-overview.md) |
| Design system dan 120 komponen | [docs/02-design/design-system.md](docs/02-design/design-system.md) |
| Spec normatif (FR/NFR/SEC) | [docs/03-specs/01-host-shell.md](docs/03-specs/01-host-shell.md) |
| Flow | [docs/04-flows/README.md](docs/04-flows/README.md) |
| Aturan agen dan kontribusi | [AGENTS.md](AGENTS.md), [CONTRIBUTING.md](CONTRIBUTING.md) |
| Keamanan | [SECURITY.md](SECURITY.md) |

## 4. Target PRD v2.0

Target: Host Shell offline-first (Flutter + PWA), Studio IDE hybrid, sandbox QuickJS/WASM dengan permission broker, SQLite per micro-app + CRDT, registry terfederasi dengan reproducible build, sync E2EE, dan server self-host Lite/Standard/Cluster. Roadmap dan exit gate ada di [docs/00-foundation/product-foundation.md](docs/00-foundation/product-foundation.md).

Deployment web saat ini hanya untuk demo prototipe; target distribusi adalah PWA self-host dan bundel desktop. Tidak ada URL produksi yang dijanjikan oleh dokumen ini.

## 5. Lisensi

- Apache-2.0 untuk core, Host, Studio, server, dan runtime ([LICENSE](LICENSE)).
- MIT untuk SDK, CLI, UI kit, dan template micro-app (dokumen lisensi ditambahkan saat paket di-scaffold).
