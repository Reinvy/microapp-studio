---
id: DOC-CONTRIBUTING
title: Contributing
status: accepted
owner: dx
prd_refs: ["§10 Roadmap", "§12 Definisi Selesai"]
---

# Contributing

## Sebelum Mulai

Baca [AGENTS.md](AGENTS.md), [PRD v3.0](docs/00-foundation/PRD-v3.0.md), dan rules yang relevan. Produk ini web-only; jangan menambahkan platform native, server wajib, akun, atau telemetry.

## Alur

1. Buka issue dengan masalah, persona, dan dampak.
2. Perbarui spec/flow lebih dulu bila perilaku berubah.
3. Branch dari `development`: `docs/*`, `feat/*`, `fix/*`, atau `sec/*`.
4. Commit dokumen terpisah dari commit kode.
5. Jalankan gate verifikasi.
6. Buka PR dengan bukti dan risiko.

## Gate

```bash
node scripts/check-docs.mjs --strict
node scripts/generate-catalog.mjs --check
npm test
npm run typecheck
npm run lint
npm run build
```

`RUN_E2E=1 npm run e2e` untuk perubahan UI atau runtime. `npm run verify:web` menjalankan semua gate wajib dan menulis baseline evidence.

## Aturan Commit

| Tipe | Dipakai untuk |
|---|---|
| `docs(scope):` | Dokumen, spec, flow, rules |
| `feat(scope):` | Fitur baru |
| `fix(scope):` | Perbaikan bug |
| `sec(scope):` | Perbaikan keamanan |
| `test(scope):` | Test |
| `chore(scope):` | Tooling |

Satu commit satu tujuan. Jangan mencampur refactor dokumen dengan perubahan runtime.

## Review

- Dua reviewer untuk perubahan keamanan, kripto, manifest, atau permission.
- Satu reviewer untuk perubahan UI; design memeriksa token dan a11y.
- Reviewer menolak klaim status tanpa bukti.
- Reviewer menolak dependency yang memerlukan server, telemetry, atau akun.

## Definisi Selesai

Lihat [definition-of-done.md](docs/08-quality/definition-of-done.md) dan [release-gates.md](docs/08-quality/release-gates.md). PR tidak digabung bila gate wajib gagal.

## Lisensi

Dengan berkontribusi, kamu menyetujui lisensi Apache-2.0 dan DCO pada [governance.md](docs/10-contributing/governance.md).
