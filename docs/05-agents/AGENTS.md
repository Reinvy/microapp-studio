---
id: AGENT-INDEX
title: Panduan Agen
status: accepted
owner: product
prd_refs: ["§1", "§12"]
---

# Panduan Agen

Dokumen ini adalah manual operasi untuk agen otomatis dan engineer pada repo `microapp-studio`. Isi yang mengikat dibagi ke [roles.md](roles.md) (peran dan batas path), [workflow.md](workflow.md) (issue sampai merge), dan [handoff-prompts.md](handoff-prompts.md) (template serah terima). Root [AGENTS.md](../../AGENTS.md) hanya menautkan ke sini.

## 1. Misi Web-Only

MicroApp Studio adalah satu PWA Next.js 16 + React 19 + TypeScript untuk browser desktop, tablet, dan mobile. Pengguna membuka situs, membuat micro-app, menjalankannya di sandbox, lalu membagikannya sebagai file `.mapp`. Tidak ada langkah yang membutuhkan akun, server wajib, atau layanan cloud.

Agen MUST memindahkan pekerjaan dari niat produk menjadi perilaku terverifikasi tanpa menambah keputusan di luar dokumen. Misi dijaga oleh tiga ukuran:

1. Perubahan perilaku selalu didahului pembaruan spec, flow, atau acceptance criteria.
2. Setiap klaim pada PR dapat dibuktikan dengan perintah, test, atau berkas yang disebut.
3. Engineer manusia dapat melanjutkan hanya dari dokumen dan PR, tanpa riwayat percakapan.

Ruang lingkup produk, persona, dan batas fitur ada di [PRD v3.0](../00-foundation/PRD-v3.0.md). Dokumen tersebut adalah sumber kebenaran; dokumen lain yang bertentangan dianggap bug dokumen.

## 2. Urutan Baca Wajib

Urutan berikut MUST diikuti pada awal setiap tugas. Membaca dokumen hilir sebelum dokumen hulu adalah pelanggaran proses.

| # | Dokumen | Alasan | Cara membaca |
|---|---|---|---|
| 1 | [docs/README.md](../README.md) | Peta dokumen, presedensi, status | Seluruhnya, sekali per sesi |
| 2 | [PRD v3.0](../00-foundation/PRD-v3.0.md) | Niat produk, ruang lingkup, definisi selesai | `§` yang dirujuk issue, lalu `§1` dan `§12` |
| 3 | [product-foundation.md](../00-foundation/product-foundation.md), [sdd-workflow.md](../00-foundation/sdd-workflow.md), [glossary.md](../00-foundation/glossary.md) | Pilar produk, siklus SDD, istilah kanonik | Seluruhnya, sekali per sesi |
| 4 | [implementation-status.md](../00-foundation/implementation-status.md) | Fakta kode saat ini dan daftar yang tidak boleh diklaim | Seluruhnya sebelum menyentuh kode |
| 5 | [system-overview.md](../01-architecture/system-overview.md) dan arsitektur modul | Batas komponen, worker, iframe, OPFS | Bagian yang relevan dengan tugas |
| 6 | Spec di `03-specs/` — mulai [01-app-shell.md](../03-specs/01-app-shell.md) | Requirement dan acceptance yang mengikat | `## 3. Requirement`, `## 7`, `## 8` |
| 7 | Flow terkait di [04-flows/README.md](../04-flows/README.md) | Urutan interaksi, cabang gagal, konsen | Seluruh flow yang memuat alur tugas |
| 8 | [07-rules/README.md](../07-rules/README.md) dan rules bahasa | Cara menulis kode yang diterima | File rules yang relevan |
| 9 | [06-skills/README.md](../06-skills/README.md) | Prosedur langkah-demi-langkah per kelas tugas | Skill paling spesifik |
| 10 | [definition-of-done.md](../08-quality/definition-of-done.md) | Syarat selesai dan bukti | Seluruhnya sebelum membuka PR |

Aturan pembacaan:

- Dokumen hulu menang atas dokumen hilir. PRD menang atas spec; spec menang atas komentar kode.
- Bila spec dan flow bertentangan, hentikan implementasi dan perbaiki dokumen lebih dulu.
- Angka status hanya boleh diambil dari [baseline evidence](../08-quality/evidence/baseline.md); ingatan atau asumsi bukan bukti.

## 3. Gate SDD

Alur wajib: **issue → PRD/spec → branch → docs commit → implementasi → verifikasi → PR**.

| Tahap | Gate yang harus lulus |
|---|---|
| Sebelum menulis kode | Requirement atau acceptance sudah ada di spec, atau ditambahkan pada commit `docs:` pertama |
| Sebelum commit implementasi | Spec dan flow yang berubah sudah di-commit pada PR yang sama |
| Sebelum PR | Perintah verifikasi relevan dijalankan dan hasilnya dicatat |
| Sebelum merge | `npm run docs:check` lulus, review peran lain selesai, tidak ada klaim tanpa bukti |

Pekerjaan yang tidak dapat ditautkan ke spec MUST dihentikan dan dikembalikan sebagai pertanyaan produk, bukan diimplementasikan berdasarkan tebakan.

## 4. Invariant

Invariant berikut tidak dapat dinegosiasikan per tugas. Melanggarnya adalah blocker PR.

1. **Tanpa native atau server wajib.** Deployment hanya Next.js di Vercel/Node atau static export. Tidak ada backend, container, atau server aplikasi yang harus dijalankan pengguna.
2. **Tanpa akun dan cloud sync.** Identitas lokal dibuat otomatis saat first load. Tidak ada login, registrasi, atau sinkronisasi ke layanan pihak ketiga.
3. **Tanpa telemetri default.** Tidak ada analytics, crash reporting, atau beacon jaringan tanpa aksi eksplisit pengguna.
4. **Tanpa eksekusi kode arbitrer.** Dilarang `eval`, `new Function`, `innerHTML`, dan injeksi HTML mentah. Micro-app dirender lewat MUIP di iframe `sandbox="allow-scripts"`.
5. **Permission zero-trust.** Micro-app tidak punya privilege default. Permission dideklarasikan di manifest, diminta just-in-time, dan dapat dicabut seketika.
6. **Data tetap lokal.** SQLite WASM di OPFS melalui worker; IndexedDB hanya untuk `CryptoKey` dan metadata yang memang perlu. Backup selalu terenkripsi.
7. **Docs-first.** Tidak ada perubahan perilaku tanpa perubahan dokumen yang lebih dulu atau bersamaan dalam PR.
8. **Token clay.** Warna, bayangan, radius, spacing, dan motion hanya dari token `--mads-*`. Tidak ada hex, `box-shadow`, atau `border-radius` langsung di komponen.
9. **Aksesibilitas.** Target WCAG 2.2 AA, alur inti selesai dengan keyboard, dan `prefers-reduced-motion` menghapus animasi transform.
10. **Paket deterministik.** `.mapp` memakai manifest v2, ZIP deterministik, digest, dan signature Ed25519 yang diverifikasi sebelum instalasi.

## 5. Definisi Selesai

Definisi selesai per artefak ada di [definition-of-done.md](../08-quality/definition-of-done.md); gate rilis ada di [release-gates.md](../08-quality/release-gates.md). Agen MUST NOT menyatakan pekerjaan selesai bila salah satu gate gagal, meskipun fitur terlihat berjalan.

Ringkasnya, selesai berarti: requirement terpenuhi, acceptance terbukti, test relevan lulus, aksesibilitas diperiksa, dokumen dan matriks diperbarui, serta bukti tercatat.

## 6. Perintah Kerja

Jalankan dari root repo. Perintah yang membutuhkan jaringan hanya untuk memasang dependensi; build, test, dan pemeriksaan dokumen berjalan lokal.

| Perintah | Kegunaan |
|---|---|
| `npm run dev` | Studio web pada server pengembangan Next.js |
| `npm test` | Unit dan component test workspace (Vitest) |
| `npm run typecheck` | Pemeriksaan TypeScript strict seluruh workspace |
| `npm run lint` | ESLint seluruh workspace |
| `npm run build` | Build sandbox, SQLite WASM, dan seluruh workspace |
| `npm run docs:check` | Checker dokumentasi strict: frontmatter, tautan, ID, matriks |
| `npm run e2e` | Playwright end-to-end, termasuk alur PWA |
| `npm run verify:web` | Rangkaian verifikasi lengkap dan penulisan baseline evidence |

Aturan perintah:

- Jangan menonaktifkan aturan lint atau type untuk melewati gate; perbaiki kode atau perbarui dokumen.
- Bila perintah gagal karena lingkungan, catat alasan dan jalankan ulang setelah lingkungan diperbaiki.
- Hasil verifikasi ditulis apa adanya; kegagalan tidak boleh disembunyikan di ringkasan PR.

## 7. Eskalasi

| Situasi | Tindakan |
|---|---|
| Dua dokumen kanonik bertentangan | Berhenti; tentukan pemenang berdasarkan presedensi di [docs/README.md](../README.md), ajukan perbaikan dokumen |
| Requirement ambigu atau tidak ada | Kembalikan ke peran product dengan pertanyaan tertulis; jangan mengarang requirement |
| Perubahan kontrak (manifest, MUIP, bridge, permission, token, skema data) | Ajukan RFC lewat [rfc-process.md](../10-contributing/rfc-process.md) sebelum implementasi |
| Temuan keamanan pada sandbox, signature, vault, atau CSP | Hentikan pekerjaan fitur, laporkan ke peran security, jangan menulis detail eksploit ke dokumen publik |
| Data pengguna berisiko hilang | Hentikan migrasi, pastikan ekspor tersedia, eskalasi ke peran data |

## 8. Batas Path

Setiap perubahan MUST berada dalam path milik peran utama PR. Pemetaan peran, path, reviewer, dan handoff ada di [roles.md](roles.md). Perubahan lintas peran dipecah menjadi PR terpisah; agen MUST NOT menyentuh path peran lain tanpa persetujuan pemiliknya.
