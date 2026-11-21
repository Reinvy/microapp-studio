---
id: SKILL-SHELL
title: Menambah Fitur Shell
status: accepted
owner: dx
prd_refs: ["§5 F1", "§4"]
name: add-shell-feature
description: "Menambah atau mengubah perilaku shell web: boot, Home, library, pencarian, workspace, offline, dan launcher state, dari requirement sampai test."
when_to_use: "Dipakai saat pekerjaan mengubah perilaku yang terlihat atau tersimpan pada App Shell: route `/`, kartu app, pencarian FTS5, filter, status offline, atau pemulihan launcher."
required_docs: ["docs/03-specs/01-app-shell.md", "docs/01-architecture/system-overview.md", "docs/02-design/screen-specs.md", "docs/07-rules/typescript.md", "docs/07-rules/ui-ux.md", "docs/00-foundation/implementation-status.md"]
---

# Menambah Fitur Shell

## Kapan Digunakan

Dipakai ketika sebuah pekerjaan mengubah perilaku App Shell: boot PWA, Home dan library, pencarian, filter dan sort, workspace default, entry impor, indikator offline, badge penyimpanan, atau pemulihan launcher state.

Di luar cakupan: layar baru (gunakan [add-screen](../add-screen/SKILL.md)), komponen baru (gunakan [add-ui-component](../add-ui-component/SKILL.md)), permission baru (gunakan [add-permission](../add-permission/SKILL.md)), dan perubahan schema data (gunakan [write-db-migration](../write-db-migration/SKILL.md)).

## Prasyarat

- [01-app-shell.md](../../03-specs/01-app-shell.md) bagian 1–8 dibaca, termasuk requirement yang diubah dan error code yang mengikat.
- [system-overview.md](../../01-architecture/system-overview.md) dipahami: batas route, worker database, service worker, dan sandbox.
- [screen-specs.md](../../02-design/screen-specs.md) untuk `SCR-01`, `SCR-02`, dan `SCR-11` dibaca bila perubahan menyentuh tampilan.
- [implementation-status.md](../../00-foundation/implementation-status.md) diperiksa agar tidak mengklaim perilaku yang belum ada.
- Baseline `npm test` lulus sebelum perubahan.

## Input

| Input | Wajib | Contoh |
|---|---|---|
| Perilaku yang berubah | ya | Home mendukung pin app dan urutan bertahan setelah reload |
| Requirement target | ya | `FR-SHELL-014`, atau requirement yang sudah ada di `01-app-shell.md` |
| Route terdampak | ya | `apps/studio-web/src/app/page.tsx` |
| Flow terkait | tidak | [FLOW-01](../../04-flows/01-first-run.md) |
| Bukti verifikasi | ya | Keluaran test dan hasil uji keyboard |

## Prosedur

1. Petakan requirement ke acceptance di `03-specs/01-app-shell.md`; jika acceptance belum menjelaskan perilaku baru, revisi spec lebih dulu dan commit sebagai `docs(spec):`.
2. Tentukan batas data: perilaku yang butuh persistensi MUST lewat repository di `apps/studio-web/src/db/repositories/`, bukan state komponen. Pencarian memakai `apps/studio-web/src/db/repositories/search.ts` dan indeks FTS5, bukan filter in-memory seluruh isi.
3. Implementasikan UI di `apps/studio-web/src/features/home/` dan route tipis di `apps/studio-web/src/app/page.tsx`; jangan menambah data fetching di komponen presentasional.
4. Gunakan token clay dari `--mads-*`; jangan menulis warna, radius, atau shadow langsung. Status offline dan error memakai permukaan status yang dihitung dari token.
5. Tangani seluruh state: loading skeleton (tanpa spinner penuh layar), empty dengan tiga jalur create, error dengan kode dan retry, serta offline dengan badge dan konten cache.
6. Pastikan keyboard: `Tab`/`Shift+Tab`, `Enter`, `Space`, `Esc` mencapai semua aksi; `Cmd/Ctrl+K` membuka command palette; fokus kembali ke pemicu setelah lapisan ditutup.
7. Tambahkan label ARIA dan live region untuk perubahan status (hasil pencarian, status simpan, koneksi).
8. Tambahkan string ke `apps/studio-web/src/i18n/id-ID.json` dan `en-US.json`; jangan menulis teks hardcoded di komponen.
9. Tambahkan unit test di `apps/studio-web/src/__tests__/` untuk logika repo dan komponen, serta perbarui `apps/studio-web/e2e/host.spec.ts` bila alur berubah.
10. Perbarui baris matriks di [prd-compliance-matrix.md](../../00-foundation/prd-compliance-matrix.md) dan status di [implementation-status.md](../../00-foundation/implementation-status.md) hanya setelah test nyata lulus.

## Verifikasi

```bash
npm test -w @microapp/studio-web
npm run typecheck
npm run lint
npm run e2e
node scripts/check-docs.mjs --strict
```

Uji manual wajib: buka `/` dalam mode offline setelah satu kunjungan, reload, dan selesaikan seluruh aksi dengan keyboard saja. Semua perintah harus exit `0`; axe tidak boleh melaporkan pelanggaran serius pada Home.

## Kesalahan Umum

| Kesalahan | Perbaikan |
|---|---|
| Menambah state global untuk data yang harus persisten | Simpan lewat repository dan migrasi, bukan context |
| Pencarian memfilter seluruh database di main thread | Gunakan query FTS5 di worker lewat repository search |
| Spinner penuh layar saat boot | Gunakan skeleton non-blocking sesuai `FR-SHELL-001` |
| Menulis warna dan shadow langsung | Ganti dengan token `--mads-*` |
| Menambah teks hanya di satu locale | Tambahkan kunci di `id-ID.json` dan `en-US.json` |

## Definition of Done

- Requirement dan acceptance di `01-app-shell.md` terpenuhi dan dapat diperiksa.
- State loading, empty, error, dan offline tertangani.
- Keyboard path dan label ARIA lengkap; axe bersih.
- String ada di kedua locale.
- Matriks dan status diperbarui dengan bukti test.
