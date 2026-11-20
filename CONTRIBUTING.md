# Berkontribusi

Terima kasih telah berkontribusi. Proyek ini memakai **Spec-Driven Development (SDD)**: dokumen adalah sumber kebenaran, kode mengikuti dokumen.

## 1. Sebelum Menulis Kode

1. Baca [docs/05-agents/AGENTS.md](docs/05-agents/AGENTS.md) dan [docs/00-foundation/sdd-workflow.md](docs/00-foundation/sdd-workflow.md).
2. Cari spec untuk area yang ingin diubah di [docs/03-specs](docs/03-specs/01-host-shell.md).
3. Bila perilaku belum ada di spec, tulis spec/flow terlebih dahulu. Jangan menebak.
4. Perubahan kontrak (manifest, host bridge, sync/CRDT, permission, crypto, registry) wajib melalui [RFC](docs/10-contributing/rfc-process.md).

## 2. Urutan Commit

Satu PR boleh memuat beberapa commit, tetapi urutannya wajib:

```text
docs: <spec/flow/acceptance yang berubah>
feat|fix: <implementasi>
docs(status): <status implementasi dan matriks>
```

## 3. Branch dan Commit

| Branch | Pola |
|---|---|
| Fitur | `feat/<area>-<slug>` |
| Perbaikan | `fix/<area>-<slug>` |
| Dokumentasi | `docs/<area>-<slug>` |

Format commit:

```text
type(scope): ringkasan imperatif

Spec: docs/03-specs/03-sandbox-runtime.md#FR-SBX-016
```

Tipe: `feat`, `fix`, `docs`, `test`, `refactor`, `perf`, `security`, `chore`. Sertakan `Signed-off-by` (DCO).

## 4. Checklist PR

- [ ] `Spec:` menautkan requirement, atau `docs-not-needed` beserta alasan.
- [ ] Acceptance criteria yang terdampak dijalankan dan hasilnya dicatat.
- [ ] `npm run docs:check` lulus.
- [ ] `npm test` lulus; test baru menangkap bug yang mungkin terlihat pengguna.
- [ ] Tidak ada `new Function`, `eval`, atau HTML mentah pada runtime produksi.
- [ ] Tidak ada secret, token, atau data pengguna pada diff.
- [ ] a11y dan i18n dipertimbangkan untuk perubahan UI.
- [ ] Risiko dan rollback dijelaskan.

Template PR: [.github/pull_request_template.md](.github/pull_request_template.md).

## 5. Perintah

```bash
npm install
npm run dev
npm test
npm run build
npm run docs:check
node scripts/check-docs.mjs --strict
```

## 6. Review

- Minimal satu reviewer untuk perubahan non-kontrak, dua untuk kontrak.
- Reviewer menolak PR tanpa spec atau dengan klaim fitur yang belum terverifikasi.
- Merge memakai squash; branch harus up to date dengan `development`.

## 7. Lisensi dan Kode Etik

- Core, Host, Studio, server, dan runtime: Apache-2.0.
- SDK, CLI, UI kit, dan template: MIT.
- Dengan berkontribusi, Anda menyetujui [DCO](https://developercertificate.org/) dan [Kode Etik](CODE_OF_CONDUCT.md).

## 8. Keamanan

Jangan membuka issue publik untuk kerentanan. Ikuti [SECURITY.md](SECURITY.md).
