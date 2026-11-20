---
id: SKILL-ADD-HOST-FEATURE
title: Menambah Fitur Host
status: accepted
owner: dx
prd_refs: ["§3 Modul 1"]
name: add-host-feature
description: "Menambahkan atau mengubah fitur Host Shell dari requirement dan acceptance sampai implementasi web serta native yang terverifikasi."
when_to_use: "Dipakai saat menambah perilaku Home, workspace, intent, vault, notifikasi, storage, pencarian, atau launcher pada Host Shell."
required_docs: ["docs/03-specs/01-host-shell.md", "docs/01-architecture/system-overview.md", "docs/00-foundation/sdd-workflow.md", "docs/00-foundation/implementation-status.md", "docs/07-rules/typescript.md", "docs/07-rules/dart.md"]
---

# Menambah Fitur Host

## Kapan Digunakan

Dipakai ketika sebuah pekerjaan mengubah perilaku yang terlihat atau tersimpan pada Host Shell: Home dan folder, live widget, workspace, omni-search, multitasking, intent bus, deep link, Vault, notifikasi, Storage Manager, atau pemulihan launcher state. Skill ini mencakup seluruh siklus SDD: requirement, acceptance, matriks, implementasi, test, dan status.

Di luar cakupan: permission baru (gunakan [add-permission](../add-permission/SKILL.md)), perubahan kontrak manifest (gunakan [extend-manifest](../extend-manifest/SKILL.md)), dan perubahan transport sync (gunakan [add-sync-transport](../add-sync-transport/SKILL.md)).

## Prasyarat

- [03-specs/01-host-shell.md](../../03-specs/01-host-shell.md) bagian 1–8 sudah dibaca, termasuk requirement yang akan diubah.
- [01-architecture/system-overview.md](../../01-architecture/system-overview.md) dipahami: batas proses UI, DB worker, sync worker, dan sandbox.
- [00-foundation/sdd-workflow.md](../../00-foundation/sdd-workflow.md) dipahami: commit `docs:` mendahului commit implementasi.
- Repo sudah diinstal dengan `npm install` dan `npm test` berjalan pada baseline sebelum perubahan.
- Tidak ada perubahan belum ter-commit milik orang lain pada file yang akan disentuh.

## Input

| Input | Wajib | Contoh |
|---|---|---|
| Perilaku yang berubah | ya | Grid Home mendukung folder tiga level dan pinned dock |
| Requirement target | ya | `FR-HOST-005` yang sudah ada, atau FR baru dalam rentang `FR-HOST-001`–`FR-HOST-030` |
| Platform terdampak | ya | `apps/studio-web` (PWA/desktop webview) dan `apps/host-flutter` (native) |
| Flow terkait | tidak | `docs/04-flows/01-first-run.md` |
| Bukti verifikasi | ya | Keluaran perintah test dan hasil uji manual offline |

## Prosedur

1. Baca [03-specs/01-host-shell.md](../../03-specs/01-host-shell.md) bagian `## 3. Requirement`, `## 4. Model Data dan State`, `## 7. Acceptance Criteria`, dan `## 8. Verifikasi`; baca juga flow terkait di [04-flows](../../04-flows/README.md) bila ada.
2. Tentukan apakah pekerjaan mengubah requirement yang ada atau menambah requirement baru. Requirement baru memakai nomor berikutnya yang belum terpakai dalam rentang `FR-HOST-001`–`FR-HOST-030`; bila seluruh nomor dalam rentang sudah terpakai, revisi requirement yang ada atau ajukan alokasi rentang baru lewat RFC. Nomor yang sudah dipakai tidak boleh dipakai ulang atau dihapus.
3. Ubah tabel `## 3. Requirement` di `docs/03-specs/01-host-shell.md`: kolom `ID`, `Level` (`MUST`/`SHOULD`/`MAY`), `Requirement`, dan `Acceptance`. Acceptance harus dapat diuji tanpa menebak.
4. Tambah atau sesuaikan skenario Given/When/Then pada `## 7. Acceptance Criteria`, lalu tambahkan baris metode dan bukti pada `## 8. Verifikasi`.
5. Perbarui `docs/00-foundation/prd-compliance-matrix.md`: satu baris baru dengan kolom `PRD Ref`, `Requirement` (ID), `Spec` (link relatif), `Flow`, `Phase`, `Status`, dan `Verification`. Status awal `missing` atau `partial`, bukan `implemented`.
6. Implementasikan perilaku web/PWA di `apps/studio-web/src/` dengan memakai [01-architecture/monorepo.md](../../01-architecture/monorepo.md) sebagai peta path. Akses data, bridge, dan intent hanya melalui `packages/sdk` atau `packages/runtime-web`; jangan mengakses database atau filesystem langsung dari komponen UI.
7. Implementasikan padanan native di `apps/host-flutter/lib/` bila requirement menyebut desktop/mobile. Kedua platform harus memenuhi acceptance yang sama; perbedaan perilaku wajib dicatat di spec.
8. Tambahkan test di samping kode: unit untuk logika state, integration untuk alur lintas worker, dan test offline tanpa jaringan. Untuk perilaku yang menyentuh data, sertakan test pemulihan setelah restart.
9. Jalankan blok `## Verifikasi` di bawah dan simpan keluarannya sebagai bukti PR.
10. Setelah seluruh acceptance benar-benar lulus, ubah status baris matriks menjadi `implemented` dan perbarui [00-foundation/implementation-status.md](../../00-foundation/implementation-status.md) pada modul Host. Jika verifikasi belum dijalankan, status tetap `partial`.
11. Jalankan `npm run docs:check`, lalu commit dengan urutan `docs:` (spec, flow, matriks) → `feat:`/`fix:` (kode dan test) → `docs(status):`.

## Verifikasi

```bash
npm run docs:check
npx tsc --noEmit
npm test
npm run build
cd apps/host-flutter && flutter analyze && flutter test
```

Seluruh perintah harus exit `0`. Untuk perubahan UI, tambahkan uji manual dengan jaringan dimatikan: Home, pencarian, dan pemulihan launcher state harus tetap berfungsi, dan indikator offline global (bila relevan) harus tampil.

## Kesalahan Umum

| Kesalahan | Perbaikan |
|---|---|
| Menambah kode tanpa requirement atau acceptance baru | Tulis requirement dan acceptance lebih dulu di `docs/03-specs/01-host-shell.md`; PR tanpa `Spec:` ditolak |
| Memakai ulang atau menghapus nomor `FR-HOST-*` yang sudah ada | Pertahankan nomor lama; tambah nomor berikutnya dalam rentang, atau tandai requirement usang lewat revisi spec |
| Menulis status `implemented` sebelum verifikasi dijalankan | Biarkan `partial` sampai keluaran perintah dan uji manual dicatat |
| Mengakses SQLite, Vault, atau filesystem langsung dari komponen UI | Gunakan `packages/sdk`, `packages/runtime-web`, atau Host Bridge sesuai [03-specs/host-bridge.md](../../03-specs/host-bridge.md) |
| Hanya mengimplementasikan web dan meninggalkan native | Implementasikan kedua platform atau nyatakan batasan platform secara eksplisit di spec |
| Menambah dependency jaringan atau telemetry | Hapus; Host wajib berfungsi offline dan tanpa telemetry |

## Definition of Done

- Requirement dan acceptance diperbarui di `docs/03-specs/01-host-shell.md` sebelum kode ditulis.
- Baris matriks kepatuhan menunjuk spec dan flow yang benar dengan status sesuai bukti.
- Implementasi web dan native memenuhi acceptance yang sama, atau batasan platform tercatat di spec.
- Test unit dan integration lulus, termasuk skenario offline dan restart.
- `npm run docs:check` lulus dan tidak ada warning.
- `implementation-status.md` diperbarui hanya setelah verifikasi dijalankan.
