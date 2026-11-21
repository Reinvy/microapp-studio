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
| `npm run e2e` | Playwright (CSP, install, runner, builder, a11y, perf, RTL). |
| `npm run docs:check` | Checker dokumentasi strict. |
| `npm run tokens:check` | Tidak ada nilai visual literal di luar `tokens.css`. |
| `npm run errors:check` | Hanya 27 kode katalog yang boleh muncul. |
| `npm run security:check` | Tidak ada `eval`, `new Function`, atau HTML mentah. |
| `npm run budget:check` | JS per rute ≤ 250 KiB gzip. |
| `npm run migrations:test` | Migrasi forward + rollback di SQLite asli. |
| `npm run verify:web` | Semua gate + baseline evidence. |

## Rute

| Rute | Permukaan |
|---|---|
| `/` | Home/Library, welcome overlay, search lintas app/project/record, pengingat recovery dan backup |
| `/templates` | Galeri 8 template dengan preview, data contoh, dan izin |
| `/create?mode=ai\|blank` | Magic Create (BYOK) dan empat layout kosong |
| `/studio/[projectId]` | Builder: palette 48 core/120 advanced, layer tree, inspector, undo 100, autosave 500 ms |
| `/studio/[projectId]?preview=1` | Preview di sandbox yang sama dengan runner |
| `/app/[appId]` | Runner: consent JIT, watchdog 3/5 menit, hibernasi, boundary crash |
| `/packages` | Package terpasang dan sumber index statis |
| `/packages/import` | Verifikasi manifest/signature/digest lalu instalasi |
| `/settings` | Overview grup pengaturan |
| `/settings/general` | Tema, locale, skala teks, reduced motion, identitas, workspace |
| `/settings/permissions` | Izin per app, pencabutan, Offline Cage |
| `/settings/ai` | Endpoint, model, dan kunci BYOK di vault |
| `/settings/data` | Penyimpanan, backup, restore, reset, ekspor/impor data app |
| `/settings/about` | Versi, commit, lisensi, kebijakan |
| `/settings/dev` | DevTools lokal di balik flag |

Rute lama (`/registry`, `/admin`, `/dev/tools`, `/settings/vault`, `/settings/sync`, `/settings/notifications`, `/settings/storage`, `/settings/backup`, `/dashboard`, `/studio`) dialihkan ke padanan kanoniknya di `next.config.ts`.

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
