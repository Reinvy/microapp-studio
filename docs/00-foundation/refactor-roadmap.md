---
id: FOUND-ROADMAP
title: Roadmap Refactor
status: accepted
owner: product
prd_refs: ["§10 Roadmap", "§12 Definisi Selesai"]
---

# Roadmap Refactor

## 1. Tujuan

Menetapkan tiga fase refactor web-only, langkah per fase, gate, dan status. Roadmap ini menggantikan fase Flutter/Go/server dan tidak boleh memuat pekerjaan platform yang tidak ada.

## 2. Ringkasan Fase

| Fase | Fokus | Gate keluar | Status |
|---|---|---|---|
| **Fase 1 Foundation** | Shell, identitas lokal, host DB, sandbox, package, backup, permission. | Test dan E2E fase 1 lulus; dokumen tidak mengklaim builder. | partial |
| **Fase 2 Builder** | Create (template/AI/blank), visual builder, preview draft, share. | Draft → preview → export `.mapp` berjalan end-to-end. | missing |
| **Fase 3 Delight** | Clay UI menyeluruh, AI assist, galeri template, polish a11y. | axe bersih, budget performa lulus, clay diterapkan. | missing |

## 3. Fase 1 Foundation

| Langkah | Pekerjaan | Bukti |
|---|---|---|
| 1.1 | Boot shell non-blocking, skeleton, offline indicator. | Playwright offline + LCP. |
| 1.2 | Identitas otomatis tanpa modal; frasa ditunda. | Vitest identity + FLOW-01. |
| 1.3 | Host DB SQLite WASM/OPFS, migrasi, FTS5. | Vitest data + test-migrations. |
| 1.4 | Sandbox iframe, MUIP, bridge, watchdog. | Vitest runtime-web. |
| 1.5 | Package import/verifikasi/signature. | mapp-tool verify + Vitest. |
| 1.6 | Backup/restore terenkripsi. | Vitest round-trip. |
| 1.7 | Permission JIT, cage, audit. | Vitest permissions. |
| 1.8 | Route target shell dan redirect settings lama. | Playwright route audit. |

## 4. Fase 2 Builder

| Langkah | Pekerjaan | Bukti |
|---|---|---|
| 2.1 | Galeri template dan preview template. | Playwright template flow. |
| 2.2 | Magic Create dengan BYOK dan fallback. | Playwright mock provider. |
| 2.3 | Blank create (Form/List/Dashboard). | Playwright blank flow. |
| 2.4 | Canvas, palette 48/120, inspector token. | Playwright builder + Vitest palette. |
| 2.5 | Autosave, undo/redo, guard. | Vitest fake timer. |
| 2.6 | Preview draft di sandbox. | Playwright preview. |
| 2.7 | Share sheet dan ekspor `.mapp`. | mapp-tool pack/verify. |

## 5. Fase 3 Delight

| Langkah | Pekerjaan | Bukti |
|---|---|---|
| 3.1 | Terapkan token clay dan komponen core. | Visual regression 3 tema. |
| 3.2 | Motion, reduced motion, blob latar. | Playwright reducedMotion. |
| 3.3 | AI assist dengan rencana yang ditinjau. | Playwright plan review. |
| 3.4 | Galeri template dan polish copy. | Review konten + i18n. |
| 3.5 | Audit aksesibilitas dan performa. | axe + Lighthouse. |

## 6. Gate per Fase

1. `node scripts/check-docs.mjs --strict` dan `node scripts/generate-catalog.mjs --check` lulus.
2. `npm test`, `npm run typecheck`, `npm run lint`, `npm run build` lulus.
3. E2E fase terkait lulus; axe bersih untuk layar yang berubah.
4. Tidak ada requirement fase tersebut berstatus `missing` tanpa pengecualian tertulis.
5. Baseline evidence diperbarui.

## 7. Status dan Pelaporan

- Status per requirement ada di [prd-compliance-matrix.md](prd-compliance-matrix.md).
- Fakta implementasi ada di [implementation-status.md](implementation-status.md).
- Roadmap tidak boleh dipakai untuk mengklaim fitur sudah ada; hanya urutan pekerjaan.

## 8. Verifikasi

| Pemeriksaan | Cara |
|---|---|
| Gate dokumen | `npm run docs:check` |
| Gate kode | `npm test`, `npm run typecheck`, `npm run lint`, `npm run build` |
| Gate rilis | [release-gates.md](../08-quality/release-gates.md) |
| Bukti | [baseline.md](../08-quality/evidence/baseline.md) |
