---
id: DOC-README
title: MicroApp Studio
status: accepted
owner: product
prd_refs: ["§1 Visi dan Prinsip", "§2 Ruang Lingkup"]
---

# MicroApp Studio

Satu situs untuk membuat, menjalankan, dan membagikan micro-app. **Web-only PWA**: desktop, tablet, dan mobile browser. Tanpa akun, tanpa server wajib, tanpa telemetry.

## Status

Dokumen di repo ini adalah kontrak untuk implementasi berikutnya. Banyak fitur target belum ada; lihat [status implementasi](docs/00-foundation/implementation-status.md) dan [matriks kepatuhan](docs/00-foundation/prd-compliance-matrix.md). Jangan mengklaim fitur yang belum terverifikasi.

## Stack

| Lapisan | Teknologi |
|---|---|
| App | Next.js 16 App Router, React 19, TypeScript, Tailwind v4 |
| Runtime | Iframe `sandbox="allow-scripts"`, MUIP renderer, bridge broker, watchdog |
| Data | SQLite WASM + OPFS lewat worker, FTS5 |
| Core | `packages/core-rust` dikompilasi ke WASM untuk kripto dan package |
| UI | `packages/ui-kit` dengan token MADS v3 Clay |

## Quick Start

```bash
npm install
npm run dev:setup
npm run dev
```

Buka `http://localhost:3000`. Tidak ada akun, environment variable wajib, atau database eksternal.

## Perintah

| Perintah | Kegunaan |
|---|---|
| `npm run dev` | Jalankan studio-web. |
| `npm test` | Vitest semua workspace. |
| `npm run typecheck` | TypeScript strict. |
| `npm run lint` | ESLint. |
| `npm run build` | Build sandbox, SQLite WASM, dan semua workspace. |
| `npm run e2e` | Playwright. |
| `npm run docs:check` | Checker dokumentasi strict. |
| `npm run verify:web` | Semua gate + baseline evidence. |

## Peta Dokumen

- [PRD v3.0](docs/00-foundation/PRD-v3.0.md)
- [DESIGN.md](DESIGN.md) — claymorphism kanonik
- [Indeks dokumentasi](docs/README.md)
- [Arsitektur](docs/01-architecture/system-overview.md)
- [Spec](docs/03-specs/01-app-shell.md)
- [Flow](docs/04-flows/README.md)
- [Rules](docs/07-rules/README.md)
- [Quality](docs/08-quality/test-strategy.md)

## Batas Klaim

Produk ini **tidak** memiliki aplikasi native, Flutter, Go/self-host server, desktop bundle, akun, cloud sync, CRDT/P2P, marketplace, publish pipeline, CLI, atau SDK. AI bersifat opsional dengan BYOK; template dan builder tetap berfungsi offline.

## Lisensi

Apache-2.0. Lihat [LICENSE](LICENSE).
