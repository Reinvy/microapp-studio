---
id: SKILL-{{NAMA}}
title: "{{TITLE}}"
status: draft
owner: dx
prd_refs: ["§{{SECTION}}"]
name: "{{nama-skill}}"
description: "{{Satu kalimat: kemampuan yang dihasilkan skill ini}}"
when_to_use: "{{Pemicu konkret; sebut tugas dan path yang memicunya}}"
required_docs: ["docs/03-specs/{{SPEC}}.md", "docs/07-rules/{{RULE}}.md"]
---

# {{TITLE}}

Ganti setiap placeholder `{{...}}` dan hapus baris panduan ini. Skill adalah prosedur yang dapat dijalankan agen tanpa menebak; semua path, perintah, dan kriteria harus exact.

## Kapan Digunakan

{{Pemicu konkret dan tugas yang tercakup. Sebutkan kasus serupa yang tidak tercakup agar agen tidak memakai skill ini di luar batas.}}

## Prasyarat

- Baca dokumen di `required_docs` sampai selesai sebelum mengubah file.
- {{State repo yang harus benar: branch, instalasi dependensi, atau fixture.}}
- {{Tool yang harus tersedia: `node`, `npm`, `cargo` untuk WASM, atau browser untuk E2E.}}

## Input

| Input | Wajib | Contoh |
|---|---|---|
| {{INPUT}} | {{ya/tidak}} | {{nilai contoh}} |
| {{INPUT_LAIN}} | {{ya/tidak}} | {{nilai contoh}} |

## Prosedur

1. {{Langkah satu dengan path exact dan hasil yang diharapkan.}}
2. {{Langkah dua; sebutkan file yang dibuat atau diubah.}}
3. {{Langkah tiga; sebutkan test atau fixture yang ditambahkan.}}
4. {{Langkah empat; sebutkan pembaruan dokumen yang menyertai perubahan.}}

## Verifikasi

| Perintah | Kriteria lulus |
|---|---|
| `npm test -- {{filter}}` | {{test yang relevan lulus}} |
| `npm run typecheck` | tanpa error tipe baru |
| `node scripts/check-docs.mjs --strict` | 0 error, 0 warning |
| `node scripts/generate-catalog.mjs --check` | hanya bila skill menyentuh katalog komponen |

## Kesalahan Umum

| Kesalahan | Perbaikan |
|---|---|
| {{KESALAHAN}} | {{PERBAIKAN}} |
| {{KESALAHAN_DUA}} | {{PERBAIKAN_DUA}} |

## Definition of Done

- {{Perilaku baru tercakup test atau alasan tertulis mengapa tidak.}}
- {{Dokumen, schema, atau katalog yang terdampak sudah diperbarui.}}
- {{Tidak ada placeholder, nilai hardcoded di luar token `--mads-*`, atau referensi platform yang tidak ada.}}
