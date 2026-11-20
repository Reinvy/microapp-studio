---
id: ADR-0001
title: ADR-0001 Monorepo, npm Workspaces, dan Web Stack
status: accepted
owner: architecture
prd_refs: ["§4.2", "§7.1"]
---

# ADR-0001 Monorepo, npm Workspaces, dan Web Stack

## Konteks

Ekosistem terdiri dari Host native (Flutter), Host web/PWA dan Studio (Next.js), server self-host (Go), serta core bersama (Rust). PRD §7.1 menetapkan struktur monorepo dengan `apps/`, `packages/`, `deploy/`, `templates/`, dan `docs/`. Prototipe Phase 0 sudah memakai Next.js 16 App Router, React 19, TypeScript, dan Tailwind CSS v4.

Kebutuhan: satu lockfile, build yang dapat direproduksi, batas paket yang jelas, dan tidak ada penulisan ulang UI yang sudah ada.

## Keputusan

1. **Monorepo dengan npm workspaces.** Root `package.json` memuat `workspaces: ["apps/*", "packages/*", "templates/*"]`. Satu `package-lock.json` di root; lockfile lain dilarang.
2. **`apps/studio-web` tetap Next.js 16 + React 19 + TypeScript strict + Tailwind v4.** Ini satu-satunya codebase Studio dan sekaligus Host web/PWA. Tidak ada migrasi ke Vite.
3. **`apps/host-flutter` adalah Flutter native** untuk Android, iOS, Linux, Windows, macOS. Desktop memuat build Studio yang **dibundel lokal** di webview ter-hardening, bukan URL remote. Mobile tidak memuat Studio.
4. **`apps/selfhost-server` adalah Go** (lihat [ADR-0005](0005-go-selfhost-server.md)).
5. **`packages/core-rust` adalah satu-satunya core** (lihat [ADR-0003](0003-rust-shared-core.md)).
6. Urutan build: core → runtime/sdk/ui-kit/ai-bridge/cli → studio-web → host-flutter → server → deploy.

## Konsekuensi

- Satu perintah install di root; CI dapat melakukan cache `node_modules` per workspace.
- Kontributor Flutter/Go tetap memakai toolchain masing-masing; npm script tidak membungkus Cargo/Flutter/Go.
- Build desktop membawa artefak Studio; ukuran installer desktop naik dan wajib dijaga di bawah 45 MB.
- Next.js tetap menjadi jalur web; tidak ada dua implementasi Studio yang harus disinkronkan.
- Menambah paket baru wajib memperbarui [monorepo.md](../monorepo.md).

## Alternatif

| Alternatif | Alasan ditolak |
|---|---|
| pnpm workspaces | Tidak ada kebutuhan yang tidak terpenuhi npm; menambah tooling dan lockfile baru. |
| Polyrepo | Kontrak dan versi sulit disinkronkan; PR lintas repo memperlambat perubahan kontrak. |
| Vite untuk Studio | Menulis ulang UI dan routing yang sudah berjalan; kehilangan RSC/App Router yang dipakai Phase 0. |
| Satu codebase Flutter untuk semua platform | Web/PWA butuh ekosistem web (Monaco, Service Worker, WebCrypto) yang tidak setara di Flutter web. |
| Studio dimuat dari URL remote di desktop | Melanggar offline-first dan memperluas permukaan serangan. |

## Status

`accepted`. Perubahan pada butir 1–5 wajib melalui RFC dan ADR baru yang menyupersede ADR ini.
