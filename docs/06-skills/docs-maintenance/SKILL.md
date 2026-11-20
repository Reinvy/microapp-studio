---
id: SKILL-DOCS-MAINTENANCE
title: Memelihara Dokumentasi
status: accepted
owner: dx
prd_refs: ["§7.1", "§7.2"]
name: docs-maintenance
description: "Menjaga frontmatter, ID, link, matriks, dan status implementasi tetap konsisten serta lulus pemeriksaan dokumentasi."
when_to_use: "Dipakai saat menambah atau mengubah dokumen, memperbarui matriks kepatuhan, atau memperbaiki kegagalan npm run docs:check."
required_docs: ["docs/README.md", "docs/00-foundation/sdd-workflow.md", "docs/00-foundation/prd-compliance-matrix.md", "docs/00-foundation/implementation-status.md", "docs/07-rules/documentation.md"]
---

# Memelihara Dokumentasi

## Kapan Digunakan

Dipakai untuk setiap perubahan dokumentasi: dokumen baru, revisi spec atau flow, penambahan requirement, pembaruan matriks kepatuhan, perubahan status implementasi, atau perbaikan kegagalan checker. Dokumentasi adalah sumber kebenaran, sehingga kesalahan ID atau link adalah cacat kontrak, bukan sekadar kosmetik.

Di luar cakupan: mengubah PRD asli (hanya product owner) dan menulis konten teknis baru yang seharusnya berada di spec modul.

## Prasyarat

- [docs/README.md](../../README.md) dibaca: peta dokumen, presedensi, legenda status, dan protokol pembaruan.
- [00-foundation/sdd-workflow.md](../../00-foundation/sdd-workflow.md) dipahami: commit `docs:` mendahului implementasi, dan status hanya naik setelah verifikasi.
- [07-rules/documentation.md](../../07-rules/documentation.md) dipahami: frontmatter, kata normatif, section wajib, dan larangan duplikasi.
- `scripts/check-docs.mjs` dijalankan pada baseline agar kegagalan lama tidak tertukar dengan kegagalan baru.

## Input

| Input | Wajib | Contoh |
|---|---|---|
| Dokumen yang berubah | ya | `docs/03-specs/05-registry.md` dan flow terkait |
| Requirement terkait | tidak | `FR-REG-025` yang diperbarui |
| Status implementasi | tidak | `missing` menjadi `partial` |
| Keluaran checker | ya | Pesan error yang harus diperbaiki |

## Prosedur

1. Jalankan `npm run docs:check` pada baseline dan catat kegagalan yang sudah ada agar tidak dikaitkan dengan perubahan baru.
2. Untuk setiap dokumen yang berubah, periksa frontmatter: `id` dengan prefix yang diizinkan, `title`, `status` (`accepted` atau `implemented`), `owner` yang valid, dan `prd_refs` berupa array yang setiap elemennya diawali `§`.
3. Pastikan H1 pertama sama dengan `title` dan section wajib ada sesuai jenis dokumen: spec memuat bagian 1, 3, 7, dan 8; flow memuat `Alur Utama`, `Cabang Gagal`, `Acceptance Criteria`, `Verifikasi`; skill memuat `Kapan Digunakan`, `Prosedur`, `Verifikasi`; ADR memuat `Konteks`, `Keputusan`, `Konsekuensi`.
4. Periksa ID: `FR-*` dan `NFR-*` hanya didefinisikan di `docs/03-specs/`, `SEC-*` hanya di [permissions.md](../../03-specs/permissions.md), `ADR-*` di frontmatter ADR, dan kode error di [error-codes.md](../../03-specs/error-codes.md). Setiap referensi harus menunjuk ID yang sudah didefinisikan; jangan mengarang ID.
5. Sinkronkan [prd-compliance-matrix.md](../../00-foundation/prd-compliance-matrix.md): setiap requirement baru mendapat satu baris, kolom `Spec` dan `Flow` menautkan file yang ada, dan kolom `Status` memakai `implemented`, `partial`, `missing`, atau `blocked`.
6. Perbarui [implementation-status.md](../../00-foundation/implementation-status.md) hanya untuk perubahan yang benar-benar diverifikasi; hapus klaim yang tidak lagi benar dan jangan menyatakan fitur yang belum ada sebagai sudah jadi.
7. Periksa link relatif dan anchor: setiap target file harus ada, dan anchor harus cocok dengan heading. Hindari anchor pada ID requirement bila heading tidak memuat ID tersebut.
8. Pastikan setiap file baru tertaut dari [docs/README.md](../../README.md) agar dapat dijangkau melalui penelusuran link, termasuk README folder, ADR, dan skill.
9. Hapus placeholder dan sisa draf di luar `docs/templates/` dan `docs/archive/`; ganti dengan isi nyata atau hapus bagian yang tidak relevan.
10. Jalankan `node scripts/check-docs.mjs --strict` dan perbaiki setiap error maupun warning yang menyebut file yang Anda ubah. Jangan mengubah file di luar cakupan hanya untuk membuat checker lulus.
11. Commit dengan urutan `docs:` untuk kontrak, lalu `docs(status):` setelah verifikasi implementasi tercatat.

## Verifikasi

```bash
npm run docs:check
node scripts/check-docs.mjs --strict
```

Kedua perintah checker harus exit `0` tanpa warning. Mode `--strict` menggagalkan status draf di luar `docs/templates/` dan juga menolak placeholder di luar `docs/templates/` dan `docs/archive/`.

## Kesalahan Umum

| Kesalahan | Perbaikan |
|---|---|
| Menambah requirement tanpa baris matriks | Tambahkan baris dengan `Spec`, `Flow`, `Phase`, `Status`, dan `Verification` yang benar |
| Menulis status draf di luar template | Gunakan `accepted`, atau selesaikan dokumen sebelum merge |
| Menautkan file yang belum ada | Buat file lebih dulu atau gunakan teks biasa sampai file tersedia |
| Memperbaiki link dengan mengubah file di luar cakupan | Perbaiki hanya file yang menjadi tanggung jawab perubahan |
| Menaikkan status tanpa menjalankan verifikasi | Pertahankan `partial` sampai bukti verifikasi dicatat |
| Mengarang ID requirement atau flow | Gunakan ID yang sudah didefinisikan; ID baru dialokasikan dalam rentang yang disetujui |

## Definition of Done

- Frontmatter, H1, dan section wajib benar untuk setiap dokumen yang diubah.
- Seluruh referensi ID menunjuk definisi yang ada; tidak ada ID baru di luar rentang.
- Matriks dan status implementasi konsisten dengan bukti verifikasi.
- Semua file baru tertaut dari `docs/README.md`.
- `node scripts/check-docs.mjs --strict` lulus tanpa warning.
- Tidak ada status draf atau placeholder di luar template dan arsip.
