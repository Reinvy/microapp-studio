---
id: SKILL-DOCS
title: Memelihara Dokumentasi
status: accepted
owner: dx
prd_refs: ["§12", "§1"]
name: docs-maintenance
description: "Menjaga frontmatter, ID, tautan, matriks, status implementasi, dan checker dokumentasi tetap hijau tanpa placeholder."
when_to_use: "Dipakai setiap perubahan dokumen, penambahan requirement, perubahan status implementasi, rename file, atau sebelum merge."
required_docs: ["docs/07-rules/documentation.md", "docs/00-foundation/sdd-workflow.md", "docs/00-foundation/prd-compliance-matrix.md", "docs/00-foundation/implementation-status.md", "docs/README.md"]
---

# Memelihara Dokumentasi

## Kapan Digunakan

Dipakai ketika dokumen berubah: menambah atau mengubah spec, flow, ADR, rules, skill, template, atau indeks; saat requirement baru didefinisikan; saat status implementasi berubah; dan sebelum setiap merge.

Di luar cakupan: menulis kode fitur (gunakan skill modul terkait), menambah komponen katalog (gunakan [add-ui-component](../add-ui-component/SKILL.md)), dan menetapkan keputusan produk baru (gunakan RFC atau PRD).

## Prasyarat

- [documentation.md](../../07-rules/documentation.md) dibaca: frontmatter, H1, ID, tautan, matriks, status, bahasa.
- [sdd-workflow.md](../../00-foundation/sdd-workflow.md) dipahami: dokumen lebih dulu, commit `docs:` terpisah.
- [docs/README.md](../../README.md) dipahami sebagai akar keterjangkauan.
- `node scripts/check-docs.mjs --strict` lulus pada baseline.
- Tidak ada file dokumen yatim atau tautan ke path yang akan dihapus.

## Input

| Input | Wajib | Contoh |
|---|---|---|
| Perubahan dokumen | ya | Spec baru, rename, atau revisi requirement |
| ID baru | kondisional | `FR-CREATE-012` (hanya jika disetujui) |
| Perubahan status | kondisional | `partial` → `implemented` dengan bukti test |
| Perintah verifikasi | ya | `node scripts/check-docs.mjs --strict` |

## Prosedur

1. Setiap dokumen baru wajib diawali frontmatter dengan `id`, `title`, `status`, `owner`, dan `prd_refs`. `status` harus `accepted`; `prd_refs` berisi minimal satu entri yang diawali `§`. Skill juga wajib memuat `name`, `description`, `when_to_use`, dan `required_docs`.
2. H1 pertama harus sama dengan `title` setelah normalisasi (tanpa penomoran). Jangan menaruh ID requirement di H1 kecuali memang bagian dari judul yang disepakati.
3. Gunakan hanya ID yang sudah didefinisikan: `FR-*`, `NFR-*`, `SEC-*`, `FLOW-*`, `ADR-*`, dan `E-*` dari katalog resmi. ID baru hanya boleh lahir dari spec pemiliknya, bukan dari flow, rules, atau skill.
4. Tautkan dengan path relatif yang benar dan tanpa anchor yang tidak ada. Tautkan setiap dokumen baru dari [docs/README.md](../../README.md) agar checker menganggapnya terjangkau.
5. Setiap requirement baru wajib mendapat satu baris di [prd-compliance-matrix.md](../../00-foundation/prd-compliance-matrix.md) dengan kolom `PRD Ref`, `Requirement`, `Spec`, `Flow`, `Phase`, `Status`, `Verification`.
6. Ubah status implementasi hanya dengan bukti nyata. `implemented` memerlukan test yang lulus; `partial` untuk kemampuan yang baru sebagian; `missing` untuk target yang belum ada. Catat bukti di [implementation-status.md](../../00-foundation/implementation-status.md).
7. Hapus placeholder: tidak ada teks yang menjanjikan isi nanti. Jika bagian belum dapat ditulis, hapus bagian itu daripada meninggalkan janji.
8. Jaga code fence seimbang dan blok mermaid tidak kosong.
9. Saat rename atau hapus file, perbarui seluruh tautan dan indeks pada commit yang sama; jangan meninggalkan alias atau file `deprecated` yang masih tertaut.
10. Jalankan checker, perbaiki setiap error dan warning, lalu pastikan generator katalog tidak berubah.

## Verifikasi

```bash
node scripts/check-docs.mjs --strict
node scripts/generate-catalog.mjs --check
```

Checker harus melaporkan `docs check: OK` dengan 0 error dan 0 warning. Generator katalog harus melaporkan 120 komponen dan tidak menulis ulang file. Jika checker menyebut tautan mati, perbaiki path; jangan melemahkan aturan.

## Kesalahan Umum

| Kesalahan | Perbaikan |
|---|---|
| Menambah dokumen tanpa menautkannya dari indeks | Tambahkan tautan di `docs/README.md` |
| Memakai ID requirement yang belum didefinisikan | Definisikan di spec pemilik atau hapus referensi |
| Menandai `implemented` tanpa test | Turunkan ke `partial` sampai bukti ada |
| Meninggalkan file lama sebagai alias | Hapus dan perbarui semua tautan |
| Mengubah ambang checker agar lulus | Perbaiki dokumen, bukan aturannya |

## Definition of Done

- `docs check: OK` tanpa warning.
- Matriks dan status konsisten dengan bukti.
- Semua tautan relatif valid dan setiap dokumen terjangkau dari indeks.
- Tidak ada placeholder, ID liar, atau file yatim.
