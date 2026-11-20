---
id: RULE-TS
title: Aturan TypeScript
status: accepted
owner: dx
prd_refs: ["§7.1", "§7.2"]
---

# Aturan TypeScript

Aturan ini berlaku untuk seluruh kode TypeScript: `apps/studio-web` (Next.js 16 App Router), `packages/runtime-web`, `packages/sdk`, `packages/ui-kit`, `packages/ai-bridge`, dan `packages/cli`. Tujuannya adalah type safety di boundary, isolasi kode micro-app, dan performa UI yang terukur.

## 1. Cakupan

| Area | Contoh kepatuhan |
|---|---|
| Type system | `strict`, `unknown` di boundary, tanpa cast pada input eksternal |
| Keamanan runtime | Tanpa `eval`/`new Function`, tanpa HTML mentah dari micro-app |
| Arsitektur | Boundary client/server, tanpa duplikasi core Rust |
| React 19 | Hooks, state minimal, error boundary |
| Performa | Virtualisasi, lazy loading, memo berbasis bukti |
| Aksesibilitas | Komponen MADS, keyboard, live region |
| Test | Unit dan komponen yang deterministik |

## 2. Aturan

### 2.1 Bahasa dan Tipe

| ID | Level | Aturan | Konsekuensi |
|---|---|---|---|
| RULE-TS-001 | MUST | `tsconfig.json` MUST menetapkan `strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`, dan `noImplicitOverride: true`; `// @ts-nocheck` dilarang. | `tsc --noEmit` gagal; PR ditolak karena type safety tidak dapat diverifikasi. |
| RULE-TS-002 | MUST | Tipe `any` eksplisit MUST NOT muncul di API publik, parameter, atau state; data yang belum diketahui bertipe `unknown` dan MUST dipersempit sebelum dipakai. | Lint gagal; reviewer menolak cast yang memindahkan risiko ke runtime. |
| RULE-TS-003 | MUST | Data eksternal (manifest, registry index, MUIP, respons bridge, respons HTTP) MUST divalidasi terhadap JSON Schema di `03-specs/schemas/` sebelum dipakai; `as` pada data belum tervalidasi dilarang. | Payload cacat dapat menjatuhkan UI atau melewati validasi; PR diblokir. |
| RULE-TS-004 | MUST | `eval`, `new Function`, `setTimeout`/`setInterval` berbentuk string, dan `import()` dengan specifier dinamis MUST NOT dipakai pada runtime produksi; logika micro-app hanya berjalan di sandbox. | Pelanggaran adalah blocker keamanan; `src/engine/evaluator.ts` Phase 0 adalah contoh yang wajib dihapus, bukan dipertahankan. |
| RULE-TS-005 | MUST | `dangerouslySetInnerHTML` dan `innerHTML` MUST NOT dipakai untuk konten micro-app atau input pengguna; UI micro-app dirender dari MUIP. HTML hanya boleh dirender melalui sanitizer allowlist yang disetujui security untuk Markdown viewer. | XSS pada Host dianggap SEV-1; PR ditolak. |
| RULE-TS-006 | MUST | Kriptografi, verifikasi signature, parser `.mapp`, HLC/CRDT, dan guard sandbox MUST NOT diimplementasikan ulang di TypeScript; kode MUST memanggil `@microapp/core` (WASM). | Dua implementasi menghasilkan perilaku berbeda; PR ditolak oleh reviewer arsitektur. |

### 2.2 Boundary Client/Server dan Rahasia

| ID | Level | Aturan | Konsekuensi |
|---|---|---|---|
| RULE-TS-007 | MUST | Komponen Next.js MUST default menjadi Server Component; `'use client'` hanya pada leaf yang benar-benar memakai browser API, event handler, atau state lokal. Modul server-only MUST NOT masuk graph client. | Bundle membesar dan modul sensitif bocor ke browser; build/review memblokir. |
| RULE-TS-008 | MUST | Rahasia (kunci tanda, kunci enkripsi, token server, kredensial BYOK) MUST NOT berada di bundle client atau variabel `NEXT_PUBLIC_*`; rahasia hanya dibaca di server atau Vault. `SECRET` hardcoded di `src/lib/auth.ts` adalah pelanggaran Phase 0 yang wajib dihapus. | Kebocoran kunci tidak dapat ditarik kembali; PR keamanan ditolak. |
| RULE-TS-009 | MUST | Password, token sesi, kunci privat, dan recovery phrase MUST NOT disimpan di `localStorage` atau `sessionStorage`; penyimpanan memakai WebCrypto non-extractable, Vault, atau secure storage platform. Autentikasi localStorage di `src/lib/auth.ts` adalah utang Phase 0 yang wajib dimigrasikan ke Local Identity. | XSS atau ekstensi jahat dapat mencuri sesi; PR diblokir. |
| RULE-TS-010 | MUST | Kode client MUST NOT mengandalkan pemeriksaan otorisasi di browser; setiap keputusan izin ditegakkan ulang di broker/server. | UI dapat dimanipulasi; akses tanpa grant tetap harus gagal. |

### 2.3 React 19 dan State

| ID | Level | Aturan | Konsekuensi |
|---|---|---|---|
| RULE-TS-011 | MUST | Hooks MUST dipanggil di top level komponen/hook, tidak di kondisi atau loop; setiap effect MUST membersihkan listener, timer, subscription, dan abort controller. | Kebocoran memori dan update setelah unmount; test kebocoran gagal. |
| RULE-TS-012 | MUST | State MUST minimal dan diturunkan bila memungkinkan; data yang sudah ada di SQLite/store MUST NOT disalin menjadi state React kedua yang dapat menyimpang. Zustand MUST diakses via selector. | Render berlebih dan data tidak konsisten; reviewer menolak duplikasi state. |
| RULE-TS-013 | MUST | Setiap route dan setiap screen micro-app MUST dibungkus error boundary yang menampilkan kode error, pesan aman, dan aksi pemulihan; `catch` kosong dan penelanan error dilarang. | Satu error merusak seluruh aplikasi; error boundary yang hilang adalah blocker. |
| RULE-TS-014 | MUST | `key` list MUST stabil dan unik; indeks array MUST NOT dipakai untuk list yang dapat diurutkan ulang, difilter, atau disisipi. | State komponen berpindah ke item salah; test interaksi gagal. |
| RULE-TS-015 | SHOULD | Operasi async yang dapat dibatalkan (AI, sync, pencarian) MUST memakai `AbortController` dan MUST mengabaikan hasil yang sudah tidak relevan. | Hasil lama menimpa state baru; race condition sulit direproduksi. |

### 2.4 Performa

| ID | Level | Aturan | Konsekuensi |
|---|---|---|---|
| RULE-TS-016 | MUST | List lebih dari 100 baris MUST memakai virtualisasi atau paginasi; tabel dan grid MUST NOT merender seluruh dataset. | Frame drop melampaui NFR-PERF-004; profiling PR gagal. |
| RULE-TS-017 | SHOULD | `React.memo`, `useMemo`, dan `useCallback` hanya dipakai pada hotspot yang terukur; optimasi MUST disertai bukti profiler, bukan diterapkan seragam. | Memo berlebihan menambah biaya dan kompleksitas tanpa manfaat terukur. |
| RULE-TS-018 | MUST | Modul berat (Monaco, chart, runtime AI, PDF viewer) MUST di-lazy-load dan MUST memakai dynamic import; bundle awal MUST berada dalam anggaran di [performance-budgets.md](../08-quality/performance-budgets.md). | First render melewati NFR-PERF-003; build budget gagal. |

### 2.5 Import, Aksesibilitas, dan Test

| ID | Level | Aturan | Konsekuensi |
|---|---|---|---|
| RULE-TS-019 | MUST | Import di dalam app MUST memakai alias `@/`; lintas paket MUST memakai nama paket `@microapp/*`; relative import yang menembus batas paket dan dependency cycle dilarang. | Struktur paket rusak dan build workspace gagal. |
| RULE-TS-020 | MUST | UI MUST memakai komponen MADS dari `@microapp/ui-kit`, elemen semantik, label/role/state yang benar, focus visible, dan target minimal 24×24 px; `div` atau `span` dengan `onClick` tanpa role/keyboard dilarang. | Audit axe/keyboard gagal; PR a11y ditolak. |
| RULE-TS-021 | MUST | Perubahan status async (loading, sukses, error, offline) MUST diumumkan melalui live region; dialog MUST menahan focus dan mengembalikannya; navigasi route MUST memindahkan focus ke heading utama. | Screen reader kehilangan konteks; uji NVDA/VoiceOver gagal. |
| RULE-TS-022 | MUST | Logika murni MUST memiliki unit test; komponen interaktif MUST memiliki test perilaku (Testing Library) untuk state loading/error/empty; snapshot-satunya test tidak memenuhi acceptance. | Perilaku tidak terlindungi; reviewer menolak test yang hanya mengunci markup. |

## 3. Pengecualian dan Penegakan

1. Pelanggaran RULE-TS-004, RULE-TS-005, RULE-TS-008, RULE-TS-009, atau RULE-TS-020 MUST NOT diberi pengecualian sementara; perbaiki sebelum merge.
2. `@ts-expect-error` hanya boleh dipakai dengan komentar alasan dan tipe yang diharapkan; `@ts-ignore` dilarang.
3. Utang Phase 0 dicatat di [implementation-status.md](../00-foundation/implementation-status.md) dan wajib dihapus pada Phase 1; menambah pemakaian baru dilarang.
4. Type check, lint, dan test MUST dijalankan sebelum PR; hasilnya dilampirkan pada bagian Verifikasi PR.

## 4. Referensi

- [02-studio-ide.md](../03-specs/02-studio-ide.md) — perilaku Studio dan editor.
- [ui-protocol.md](../03-specs/ui-protocol.md) — kontrak MUIP yang menggantikan HTML mentah.
- [host-bridge.md](../03-specs/host-bridge.md) — envelope dan method bridge.
- [data-model.md](../01-architecture/data-model.md) — model data dan SQLite.
- [testing.md](testing.md) — gate test dan coverage.
- [security.md](security.md) — aturan keamanan yang berlaku bersamaan.
