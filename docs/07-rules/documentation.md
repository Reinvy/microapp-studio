---
id: RULE-DOC
title: Aturan Dokumentasi
status: accepted
owner: dx
prd_refs: ["§7.2"]
---

# Aturan Dokumentasi

Aturan ini mengatur penulisan dan pemeliharaan dokumen di `docs/`, template, dan root policy files. Dokumentasi adalah sumber kebenaran; pelanggaran aturan ini membuat dokumen tidak dapat dipercaya dan wajib diperbaiki sebelum PR perilaku dapat merge.

## 1. Cakupan

| Area | Kewajiban utama |
|---|---|
| Frontmatter | Field wajib, nilai valid, ID unik |
| Judul | H1 pertama sama dengan `title` |
| Requirement | ID tidak diciptakan, rentang sesuai |
| Section | Urutan dan section wajib per jenis dokumen |
| Tautan | Relatif, target ada, tanpa anchor rusak |
| SDD | Dokumen dulu, status jujur |
| Matriks | Setiap requirement tercakup |
| Checker | `npm run docs:check` lulus |

## 2. Aturan

### 2.1 Frontmatter dan Judul

| ID | Level | Aturan | Konsekuensi |
|---|---|---|---|
| RULE-DOC-001 | MUST | Setiap file `.md` di `docs/` (kecuali `docs/templates/**` dan `docs/archive/**`) MUST memiliki frontmatter `id`, `title`, `status`, `owner`, dan `prd_refs`. | Checker menggagalkan file; PR ditolak. |
| RULE-DOC-002 | MUST | `status` MUST salah satu dari `draft`, `accepted`, `implemented`, `deprecated`; paket final MUST NOT memuat `draft` di luar template. | Checker `--strict` gagal; rilis dokumentasi ditahan. |
| RULE-DOC-003 | MUST | `owner` MUST salah satu dari `product`, `architecture`, `design`, `runtime`, `data`, `sync`, `registry`, `server`, `dx`, `qa`, `ops`, `security`, `governance`. | Checker gagal; dokumen tidak memiliki penanggung jawab. |
| RULE-DOC-004 | MUST | `id` MUST unik dan memakai prefix yang diizinkan: `DOC-`, `FOUND-`, `ARCH-`, `DESIGN-`, `SPEC-`, `FLOW-`, `AGENT-`, `SKILL-`, `RULE-`, `QA-`, `OPS-`, `GOV-`, `TPL-`, atau `ADR-`. | Duplikasi ID menggagalkan checker; rujukan menjadi ambigu. |
| RULE-DOC-005 | MUST | H1 pertama MUST sama dengan `title` (case-insensitive setelah prefix nomor diabaikan). | Checker gagal; navigasi dokumen tidak konsisten. |
| RULE-DOC-006 | MUST | `prd_refs` MUST array tidak kosong dan setiap entri MUST dimulai dengan `§`; nilai yang mengandung `:` atau `#` MUST dikutip. | Checker gagal; keterlacakan PRD hilang. |

### 2.2 Requirement, Section, dan ID

| ID | Level | Aturan | Konsekuensi |
|---|---|---|---|
| RULE-DOC-007 | MUST | ID requirement MUST mengikuti pola `FR-<DOMAIN>-<NNN>`, `NFR-<KATEGORI>-<NNN>`, `SEC-<NNN>`, `FLOW-<NN>`, `ADR-<NNNN>`, atau `E-<DOMAIN>-<NNN>` dan MUST berada dalam rentang yang dialokasikan. | ID bentrok atau tidak dapat dirujuk; checker gagal. |
| RULE-DOC-008 | MUST | ID MUST NOT diciptakan untuk area yang belum memiliki requirement; dokumen MUST merujuk ID yang sudah terdefinisi di file sumbernya. | Referensi yatim menggagalkan checker. |
| RULE-DOC-009 | MUST | Spec MUST memuat urutan section `1. Tujuan dan Ruang Lingkup`, `2. Aktor dan Prasyarat`, `3. Requirement`, `4. Model Data dan State`, `5. Error dan Recovery`, `6. Keamanan dan Privasi`, `7. Acceptance Criteria`, `8. Verifikasi`, `9. Referensi`. | Checker gagal; spec tidak dapat direview atau diuji. |
| RULE-DOC-010 | MUST | Flow MUST memuat `Trigger`, `Aktor`, `Prasyarat`, `Alur Utama`, `Cabang Gagal`, `Data dan State`, `Izin dan Keamanan`, `Perilaku Offline`, `Acceptance Criteria`, `Verifikasi`, dan `Referensi`. | Checker gagal; flow tidak lengkap. |
| RULE-DOC-011 | MUST | ADR MUST memuat `Konteks`, `Keputusan`, `Konsekuensi`, `Alternatif`, dan `Status`; ADR yang diterima MUST dicerminkan ke spec terkait. | Checker gagal; keputusan arsitektur tidak dapat ditelusuri. |
| RULE-DOC-012 | MUST | Requirement table MUST memakai kolom `ID | Level | Requirement | Acceptance`, dengan `Level` bernilai `MUST`, `SHOULD`, atau `MAY`, dan setiap requirement MUST memiliki minimal satu acceptance criterion. | Requirement tidak dapat diuji; matriks dan checker gagal. |

### 2.3 Tautan dan Isi

| ID | Level | Aturan | Konsekuensi |
|---|---|---|---|
| RULE-DOC-013 | MUST | Tautan internal MUST memakai path relatif terhadap file sumber, target MUST ada, dan anchor (bila dipakai) MUST cocok dengan heading yang ada. | Checker gagal; tautan mati membingungkan pembaca dan agen. |
| RULE-DOC-014 | MUST | Setiap file di `docs/` MUST dapat dijangkau dari [docs/README.md](../README.md) melalui tautan relatif; file yatim MUST ditautkan atau dihapus. | Checker reachability gagal; dokumen tidak ditemukan. |
| RULE-DOC-015 | MUST | Dokumen MUST NOT menduplikasi isi sumber lain; definisi, kontrak, dan angka MUST berada di satu file kanonik dan file lain MUST menautkannya. | Dua sumber menyimpang; reviewer menolak duplikasi. |
| RULE-DOC-016 | MUST | Dokumen MUST NOT menyatakan fitur yang belum ada sebagai sudah jadi; status implementasi MUST memakai `implemented`, `partial`, `missing`, atau `blocked` dan bukti verifikasi MUST dicatat. | Klaim palsu menyesatkan pengguna; PR ditolak. |
| RULE-DOC-017 | MUST | Placeholder pekerjaan tertunda atau teks pengisi (daftar token kanonik ditegakkan `scripts/check-docs.mjs`) MUST NOT muncul di luar `docs/templates/**` dan `docs/archive/**`; code fence MUST seimbang dan blok Mermaid MUST NOT kosong. | Checker gagal; dokumen dianggap belum selesai. |
| RULE-DOC-018 | MUST | Prosa MUST Bahasa Indonesia; identifier, API, field, enum, perintah CLI, dan tipe data MUST Bahasa Inggris; kata normatif MUST memakai `MUST`/`SHOULD`/`MAY` kapital sesuai RFC 2119. | Review bahasa menolak dokumen; istilah menjadi ambigu bagi implementer. |

### 2.4 SDD, Matriks, dan Checker

| ID | Level | Aturan | Konsekuensi |
|---|---|---|---|
| RULE-DOC-019 | MUST | Perubahan perilaku MUST mengubah spec/flow/acceptance lebih dulu, lalu kode, lalu status; urutan commit MUST docs-first. | Perubahan tanpa spec dianggap bug; PR ditolak. |
| RULE-DOC-020 | MUST | Setiap `FR-*`, `NFR-*`, dan `SEC-*` yang didefinisikan MUST memiliki baris di [prd-compliance-matrix.md](../00-foundation/prd-compliance-matrix.md) dengan spec, flow, fase, status, dan verifikasi. | Checker cakupan matriks gagal; requirement yatim. |
| RULE-DOC-021 | MUST | Status `implemented` MUST hanya dinaikkan setelah acceptance dijalankan dan bukti dicatat di `## Verifikasi`; tanpa bukti, status MUST tetap `partial` atau `missing`. | Klaim status palsu; release gate menolak. |
| RULE-DOC-022 | MUST | `npm run docs:check` MUST lulus sebelum PR; verifikasi rilis MUST memakai `node scripts/check-docs.mjs --strict`. | Gate dokumentasi gagal; merge diblokir. |
| RULE-DOC-023 | SHOULD | Dokumen MUST direview per release dan minimal setiap kuartal oleh owner; dokumen yang tidak lagi relevan MUST menjadi `deprecated`, bukan dihapus. | Dokumentasi basi; owner kehilangan kendali. |

## 3. Pengecualian dan Penegakan

1. `docs/templates/**` MAY memakai placeholder `{{...}}` dan frontmatter status `draft`; template MUST tetap memiliki code fence seimbang dan tautan valid.
2. `docs/archive/**` bukan normatif dan MUST NOT dijadikan acuan implementasi baru; arsip hanya wajib memiliki tautan valid.
3. Perubahan ID, rentang requirement, atau struktur section MUST melalui RFC dan pembaruan checker pada PR yang sama.
4. Checker bukan pengganti review: dokumen yang lulus checker tetapi bertentangan dengan PRD/ADR tetap ditolak.

## 4. Referensi

- [docs/README.md](../README.md) — peta dokumen dan presedensi.
- [sdd-workflow.md](../00-foundation/sdd-workflow.md) — siklus dan kelas perubahan.
- [prd-compliance-matrix.md](../00-foundation/prd-compliance-matrix.md) — cakupan requirement.
- [spec.md](../templates/spec.md) — kerangka spec.
- [flow.md](../templates/flow.md) — kerangka flow.
- [adr.md](../templates/adr.md) — kerangka ADR.
- [check-docs.mjs](../../scripts/check-docs.mjs) — implementasi checker.
