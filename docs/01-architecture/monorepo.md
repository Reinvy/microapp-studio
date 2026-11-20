---
id: ARCH-MONOREPO
title: Monorepo dan Batas Paket
status: accepted
owner: architecture
prd_refs: ["§4.2", "§7.1"]
---

# Monorepo dan Batas Paket

## 1. Struktur Target

Struktur mengikuti PRD §7.1 dan mengikat seluruh pekerjaan implementasi.

```text
microapp-studio/
├── apps/
│   ├── host-flutter/           # Super App native: Android, iOS, Linux, Windows, macOS
│   ├── studio-web/             # Host web, PWA, dan Studio IDE (Next.js 16)
│   └── selfhost-server/        # Server Go: sync hub, registry, auth, workflow runner
├── packages/
│   ├── core-rust/              # Crypto, signature, .mapp parser, CRDT/HLC, sandbox guard
│   ├── runtime-web/            # iframe opaque origin + worker + WASM engine
│   ├── runtime-native/         # QuickJS/Wasmtime bridge untuk Flutter
│   ├── sdk/                    # @microapp/sdk: API TypeScript/WASM untuk kreator
│   ├── ui-kit/                 # 120 komponen MADS + token
│   ├── ai-bridge/              # Adapter Ollama, llama.cpp, WebLLM, BYOK OpenAI-compatible
│   └── cli/                    # microapp: init, dev, test, pack, sign, publish
├── deploy/
│   ├── docker/                 # Dockerfile multi-arch (amd64, arm64) + compose
│   ├── helm/                   # Helm chart
│   └── airgap/                 # Pembuat bundle offline
├── templates/                  # Starter micro-app: CRUD, POS, Notes, AI Chat, IoT
└── docs/                       # Dokumentasi ini
```

## 2. Nama Paket

| Path | Nama | Bahasa | Lisensi |
|---|---|---|---|
| `apps/studio-web` | `@microapp/studio-web` (private) | TypeScript | Apache-2.0 |
| `apps/host-flutter` | `microapp_host` | Dart | Apache-2.0 |
| `apps/selfhost-server` | `github.com/reinvy/microapp-studio/apps/selfhost-server` | Go | Apache-2.0 |
| `packages/core-rust` | crate `microapp-core` | Rust | Apache-2.0 |
| `packages/runtime-web` | `@microapp/runtime-web` | TypeScript/WASM | Apache-2.0 |
| `packages/runtime-native` | `@microapp/runtime-native` (binding Dart) | Dart/FFI | Apache-2.0 |
| `packages/sdk` | `@microapp/sdk` | TypeScript/WASM | MIT |
| `packages/ui-kit` | `@microapp/ui-kit` | TypeScript + Flutter | MIT |
| `packages/ai-bridge` | `@microapp/ai-bridge` | TypeScript | Apache-2.0 |
| `packages/cli` | `@microapp/cli` | TypeScript | MIT |
| `templates/*` | `@microapp/template-*` | TypeScript/Dart | MIT |

Root `LICENSE` berisi Apache-2.0. Paket MIT wajib membawa `LICENSE` sendiri saat scaffold dibuat. Lihat [ADR-0009](adr/0009-license-governance.md).

## 3. Workspace dan Perintah

- Manajer workspace: **npm workspaces** (`package.json` root dengan `workspaces: ["apps/*", "packages/*", "templates/*"]`).
- Satu lockfile di root. Tidak boleh ada `pnpm-lock.yaml`, `yarn.lock`, atau lockfile per paket.
- Perintah dari root: `npm install`, `npm run build --workspaces`, `npm test`, `npm run docs:check`.
- Perintah per paket: `npm run build -w @microapp/runtime-web`.
- Toolchain non-Node (Cargo, Flutter, Go) memakai perintahnya sendiri dan tidak dicampur ke npm script paket lain.

## 4. Aturan Dependency

```mermaid
flowchart LR
    APPS[apps/*] --> PKGS[packages/*]
    STUDIO[apps/studio-web] --> SDK[@microapp/sdk]
    STUDIO --> UIKIT[@microapp/ui-kit]
    STUDIO --> RTW[@microapp/runtime-web]
    HOST[apps/host-flutter] --> RTN[@microapp/runtime-native]
    SERVER[apps/selfhost-server] --> CONTRACT[Kontrak JSON/Schema]
    RTW --> CORE[core-rust via WASM]
    RTN --> CORE2[core-rust via FFI]
```

| Aturan | Penegakan |
|---|---|
| `apps/*` boleh bergantung pada `packages/*`; tidak sebaliknya | Review + lint import |
| Tidak ada import lintas `apps/*` | Review wajib |
| Kontrak antar-aplikasi hanya lewat SDK, JSON Schema, atau protokol wire | Review + fixture |
| `packages/*` tidak memuat kode UI Host | Review |
| Crypto/CRDT/parser `.mapp`/sandbox guard hanya di `core-rust` | Review + `rg` audit |
| Tidak ada `new Function`/`eval` pada runtime produksi | ESLint rule + review |
| Server Go tidak mengimpor kode TypeScript/Dart | Build terpisah |

## 5. Urutan Build

1. `packages/core-rust` → target `wasm32-unknown-unknown` dan native (cdylib).
2. `packages/runtime-web`, `packages/runtime-native`, `packages/sdk`, `packages/ui-kit`, `packages/ai-bridge`, `packages/cli` (bergantung pada artefak core).
3. `apps/studio-web` (Next.js build + bundel worker/WASM).
4. `apps/host-flutter` (Flutter build; memuat build Studio untuk desktop).
5. `apps/selfhost-server` (Go build; independen dari artefak JS).
6. `deploy/*` (image, chart, bundle air-gap) memakai artefak 3–5.

Artefak generated (WASM, `.d.ts` dari wasm-bindgen, hasil `flutter_rust_bridge`) **tidak** di-commit kecuali fixture kecil yang stabil; dibangun oleh pipeline dan diverifikasi checksum.

## 6. Versioning Kontrak

| Kontrak | Versi saat ini | Aturan |
|---|---|---|
| Manifest (`microapp.manifest.json`) | `2.0-open` (semver) | Breaking change = major baru + RFC; host mendukung major saat ini dan major sebelumnya |
| MUIP (`ui-node`) | `1` | Breaking change = `2`; renderer mendukung `1` selama 12 bulan setelah `2` |
| Host Bridge | `1` | Sama seperti MUIP; negosiasi versi saat handshake |
| Registry index | `1` | Aditif dalam major; field wajib tidak dihapus |
| Sync protocol | `1` | Handshake menukar versi; perangkat lama memakai schema staging |
| Backup format | `1` | Format baru wajib dapat dibaca host lama minimal 12 bulan |

Host mendukung **major saat ini + major sebelumnya selama 12 bulan**. Setelah itu, paket lama harus di-repack atau host menolak dengan `E-REG-*` yang jelas.

## 7. Pemetaan Phase 0

| Kode Phase 0 | Tujuan |
|---|---|
| `src/app/*` | `apps/studio-web/src/app/*` |
| `src/components/*` | `apps/studio-web/src/components/*` |
| `src/engine/*` | `packages/core-rust` (parser/validator) + `packages/runtime-web` (eksekusi) |
| `src/db/*` | `apps/studio-web/src/db` sebagai jembatan impor; target SQLite WASM + OPFS |
| `src/store/*` | `apps/studio-web/src/store/*` |
| `src/lib/auth.ts` | Dihapus; diganti Local Identity di `packages/core-rust` |
| `docs/devops/*` | `docs/archive/phase0/*` (sudah dipindah) |

Detail langkah migrasi ada di [04-flows/13-phase0-migration.md](../04-flows/13-phase0-migration.md).

## 8. Larangan

1. Menambah paket baru tanpa memperbarui dokumen ini dan ADR terkait.
2. Menyalin logika core ke TypeScript/Dart "sementara".
3. Menaruh UI Studio di `host-flutter`.
4. Memuat Studio dari URL remote pada desktop; build harus dibundel lokal.
5. Menambah dependency runtime eksternal (CDN, font, analytics) ke Host.
6. Mencampur lockfile atau manajer paket.

## 9. Referensi

- [system-overview.md](system-overview.md)
- [adr/0001-monorepo-web-stack.md](adr/0001-monorepo-web-stack.md), [adr/0003-rust-shared-core.md](adr/0003-rust-shared-core.md)
- [03-specs/08-devtools-cli-sdk.md](../03-specs/08-devtools-cli-sdk.md), [03-specs/manifest-v2.md](../03-specs/manifest-v2.md)
