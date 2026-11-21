---
id: RULE-DOC
title: Rules Dokumentasi
status: accepted
owner: dx
prd_refs: ["§12"]
---

# Rules Dokumentasi

Aturan ini mengikat seluruh berkas di `docs/`, `DESIGN.md`, dan dokumen kebijakan akar repo. Dokumentasi adalah kontrak: checker memperlakukannya seperti kode, dan status di dalamnya harus dapat dibuktikan.

## 1. Tujuan dan Ruang Lingkup

| Aspek | Kontrak |
|---|---|
| Format | Markdown dengan frontmatter YAML dan H1 tunggal. |
| Identitas | ID unik berprefiks, requirement dengan nomor tetap. |
| Tautan | Relatif, menuju berkas yang ada, tanpa anchor rusak. |
| Bukti | Status requirement mengacu test atau artefak nyata. |
| Gate | `node scripts/check-docs.mjs --strict` wajib bersih. |

Di luar cakupan: isi keputusan arsitektur (lihat [adr/README.md](../01-architecture/adr/README.md)) dan proses rilis (lihat [deployment.md](../09-operations/deployment.md)).

## 2. Prinsip

1. **Satu sumber kebenaran.** Setiap klaim ada di satu dokumen kanonik; dokumen lain menautkan, bukan menyalin nilai.
2. **Dapat diperiksa mesin.** Aturan yang bisa dicek otomatis harus dicek otomatis.
3. **Jujur soal status.** Dokumen target tidak boleh berbunyi seolah fitur sudah ada.
4. **Ringkas dan spesifik.** Kalimat pendek, istilah konsisten, tanpa pemasaran.

## 3. Aturan

| ID | Level | Aturan | Verifikasi |
|---|---|---|---|
| RULE-DOC-001 | MUST | Setiap berkas markdown kanonik diawali frontmatter berisi `id`, `title`, `status`, `owner`, dan `prd_refs`; `prd_refs` berisi minimal satu rujukan `§`. | `node scripts/check-docs.mjs --strict` |
| RULE-DOC-002 | MUST | `id` unik, memakai prefiks yang diizinkan (`RULE-`, `SPEC-`, `ARCH-`, `DESIGN-`, `FLOW-`, `QA-`, `OPS-`, `GOV-`, `ADR-`, dan sejenisnya) dan tidak dipakai ulang setelah berkas dihapus. | Checker |
| RULE-DOC-003 | MUST | `status` hanya `accepted` untuk dokumen kanonik; `draft` hanya di `docs/templates/`. `implemented` hanya untuk requirement dengan bukti test. | Checker dan review |
| RULE-DOC-004 | MUST | H1 sama dengan `title` setelah normalisasi; H1 tidak diberi nomor dan hanya ada satu per berkas. | Checker |
| RULE-DOC-005 | MUST | Spec memuat section `1. Tujuan`, `3. Requirement`, `7. Acceptance Criteria`, dan `8. Verifikasi`. Flow memuat `Alur Utama`, `Cabang Gagal`, `Acceptance Criteria`, dan `Verifikasi`. ADR memuat `Konteks`, `Keputusan`, `Konsekuensi`. Skill memuat `Kapan Digunakan`, `Prosedur`, `Verifikasi`. | Checker |
| RULE-DOC-006 | MUST | Setiap requirement didefinisikan tepat satu kali di spec kanoniknya, pada sel pertama tabel, memakai format `FR-*`, `NFR-*`, `SEC-*`, atau `E-*` yang terdaftar. ID di luar daftar resmi dilarang. | Checker |
| RULE-DOC-007 | MUST | Tautan internal bersifat relatif, menunjuk berkas yang ada, dan anchor harus cocok dengan heading tujuan. Tautan ke berkas yang dihapus dilarang. | Checker |
| RULE-DOC-008 | MUST | Setiap requirement memiliki satu baris di [prd-compliance-matrix.md](../00-foundation/prd-compliance-matrix.md) dengan `PRD Ref` berisi `§`, spec, flow, fase, status, dan cara verifikasi. | Checker dan review |
| RULE-DOC-009 | MUST | Status `implemented` hanya diberikan bila ada test yang lulus dan dapat dijalankan ulang; selain itu `partial` atau `missing`. Tidak ada klaim tanpa bukti. | Review matrix |
| RULE-DOC-010 | MUST | `node scripts/check-docs.mjs --strict` lulus dengan 0 error dan 0 warning sebelum PR dokumen di-merge. | Checker |
| RULE-DOC-011 | MUST | Tidak ada penanda placeholder, teks contoh tanpa isi, atau pernyataan bahwa bagian akan dilengkapi nanti di dokumen kanonik. | Checker |
| RULE-DOC-012 | MUST | Bahasa utama adalah Bahasa Indonesia teknis yang ringkas; istilah produk mengikuti [glossary.md](../00-foundation/glossary.md). Klaim yang belum terbukti dilarang. | Review |
| RULE-DOC-013 | MUST | Blok kode seimbang, diberi tag bahasa, dan tidak memuat output palsu. Diagram Mermaid harus berisi dan memakai sintaks sederhana. | Checker |
| RULE-DOC-014 | MUST | ADR yang sudah `accepted` tidak diedit isinya. Perubahan keputusan dibuat sebagai ADR baru yang menyatakan supersede, dengan pembaruan indeks. | Review |
| RULE-DOC-015 | MUST | Perubahan perilaku, kontrak, atau status MUST disertai pembaruan dokumen terkait dalam PR yang sama. | Review |
| RULE-DOC-016 | MUST | Setiap berkas kanonik dapat dicapai dari [docs/README.md](../README.md) melalui tautan; dokumen yatim dilarang. | Checker reachability |

## 4. Format Requirement

```markdown
| ID | Level | Requirement | Acceptance |
|---|---|---|---|
| FR-SHELL-001 | MUST | Shell merender skeleton non-blocking. | Shell tampil < 1 s pada perangkat referensi. |
```

- ID di sel pertama tanpa backtick agar checker mendefinisikannya.
- Satu requirement menyatakan satu perilaku yang dapat diuji.
- Acceptance menyebut kondisi, aksi, dan hasil yang teramati.
- Requirement yang dihapus juga dihapus dari matrix dan rujukannya di flow.

## 5. Anti-pola

| Anti-pola | Alasan |
|---|---|
| Menyalin tabel token lengkap ke banyak dokumen | Nilai dapat menyimpang; tautkan ke sumber kanonik. |
| Menulis "sudah diimplementasikan" tanpa test | Melanggar RULE-DOC-009. |
| Menautkan path absolut atau URL lokal pengembang | Rusak di mesin lain. |
| Menyisipkan HTML mentah untuk tata letak | Sulit dicek dan tidak portabel. |
| Mempertahankan dokumen lama sebagai alias | Menciptakan dua kebenaran. |

## 6. Verifikasi

| Langkah | Perintah | Lulus bila |
|---|---|---|
| Struktur dan tautan | `node scripts/check-docs.mjs --strict` | 0 error, 0 warning. |
| Katalog komponen sinkron | `node scripts/generate-catalog.mjs --check` | Laporan `catalog up to date`. |
| Matrix | Pemeriksaan manual matrix terhadap spec | Semua requirement tercakup tepat satu baris. |
| Bukti | `npm run verify:web` | Status terekam di [baseline.md](../08-quality/evidence/baseline.md). |

## 7. Pengecualian

Pengecualian pada RULE-DOC-008, RULE-DOC-009, dan RULE-DOC-010 tidak diberikan. Pengecualian format lain mengikuti [README.md](README.md) dan harus dicatat di PR dengan alasan yang dapat diverifikasi.
