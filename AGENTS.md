---
id: DOC-AGENTS
title: AGENTS
status: accepted
owner: architecture
prd_refs: ["§1 Visi dan Prinsip", "§12 Definisi Selesai"]
---

# AGENTS

## Source of Truth

1. [docs/00-foundation/PRD-v3.0.md](docs/00-foundation/PRD-v3.0.md) — ruang lingkup dan produk.
2. [DESIGN.md](DESIGN.md) — nilai visual kanonik.
3. [docs/03-specs/](docs/03-specs/01-app-shell.md) — requirement dan acceptance.
4. [docs/04-flows/](docs/04-flows/README.md) — perilaku pengguna.
5. [docs/07-rules/](docs/07-rules/README.md) — aturan implementasi.

Jika dokumen bertentangan: PRD menang untuk ruang lingkup, DESIGN.md menang untuk visual, spec menang untuk acceptance.

## Commands

```bash
npm run dev
npm test
npm run typecheck
npm run lint
npm run build
npm run e2e
npm run docs:check
npm run verify:web
```

## Invariants

- **Web-only.** Tidak ada Flutter, native, desktop bundle, Go server, atau backend wajib.
- **Zero-account.** Tidak ada login, registrasi, atau cloud sync.
- **Zero-telemetry.** Tidak ada analytics, beacon, atau pelacakan.
- **Local-first.** Data di OPFS; IndexedDB hanya untuk `CryptoKey` dan metadata.
- **Zero-privilege.** Micro-app tidak mendapat akses sebelum consent JIT.
- **Satu kanal.** App berkomunikasi hanya lewat bridge.
- **Tanpa eksekusi dinamis.** Tidak ada `eval`, `new Function`, atau HTML mentah.
- **Clay tokens.** Komponen memakai `--mads-*`; tidak ada nilai visual literal.
- **A11y.** WCAG 2.2 AA, keyboard, fokus, reduced motion.
- **Docs-first.** Perubahan kontrak dimulai dari dokumen.

## SDD Gate

1. Requirement ada di spec.
2. Perilaku ada di flow.
3. Aturan ada di rules.
4. Test dan smoke dijalankan.
5. Status dicatat di evidence dan matriks.

Jangan menaikkan status menjadi `implemented` tanpa bukti di [baseline](docs/08-quality/evidence/baseline.md).

## Batas Kerja

- Jangan mengubah `packages/core-rust` tanpa review kripto.
- Jangan melonggarkan CSP, sandbox, atau permission.
- Jangan menambah dependency yang memerlukan server atau telemetry.
- Jangan membuat dokumen arsip baru; git history adalah arsip.
- Jangan menyentuh kode runtime saat tugas hanya dokumentasi.

## Verifikasi Sebelum PR

```bash
node scripts/check-docs.mjs --strict
node scripts/generate-catalog.mjs --check
npm test
npm run typecheck
npm run lint
npm run build
```

## Eskalasi

| Situasi | Tindakan |
|---|---|
| Perubahan manifest/bridge/permission | RFC + review security |
| Perubahan token/komponen core | Review design + a11y |
| Perubahan kripto/format package | Review security + architecture |
| Konflik dokumen | Perbaiki dokumen, jangan memilih diam-diam |
| Gate gagal | Blokir merge; perbaiki penyebab |
