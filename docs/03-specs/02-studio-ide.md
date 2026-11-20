---
id: SPEC-STU
title: Studio IDE
status: accepted
owner: design
prd_refs: ["§3 Modul 2", "§4.2"]
---

# 02. Studio IDE

## 1. Tujuan dan Ruang Lingkup

Studio adalah IDE hybrid di dalam ekosistem: canvas visual, pro-code editor, AI copilot lokal/BYOK, Git, multiplayer, dan live preview LAN. Studio MUST bekerja penuh secara lokal tanpa server.

Di luar lingkup: eksekusi micro-app saat runtime (spec 03), skema database runtime (spec 04), distribusi paket (spec 05).

## 2. Aktor dan Prasyarat

| Aktor | Prasyarat |
|---|---|
| Maker | Workspace aktif; tanpa pengetahuan kode |
| Developer | Akses pro-code, Git, dan CLI |
| Reviewer desain | Akses read-only ke project dan riwayat |
| Studio | Monaco dan aset editor tersedia lokal; core Rust untuk validasi |

## 3. Requirement

| ID | Level | Requirement | Acceptance |
|---|---|---|---|
| FR-STU-001 | MUST | Studio MUST membuka project sebagai draft lokal di workspace aktif tanpa memerlukan server, akun, atau jaringan. | Dengan jaringan dimatikan, project baru dibuat, diedit, disimpan, dan dibuka kembali. |
| FR-STU-002 | MUST | Canvas MUST mendukung layout Flexbox dengan operasi tambah, hapus, reorder, nest, dan ubah arah/alignment yang menghasilkan model layout kanonik, bukan CSS arbitrer. | Susun tiga container bersarang; model layout tersimpan dan render identik setelah reload. |
| FR-STU-003 | MUST | Canvas MUST mendukung layout Grid dengan definisi kolom/baris, span, dan gap, serta konversi antara Flexbox dan Grid tanpa kehilangan children. | Konversi Flex→Grid mempertahankan semua children dan urutan; tidak ada node hilang. |
| FR-STU-004 | MUST | Studio MUST menyediakan breakpoint `mobile`, `tablet`, `desktop`, dan `widget` dengan override properti per breakpoint dan indikator properti yang diwarisi. | Ubah padding pada `desktop`; breakpoint lain tidak berubah; indikator menunjukkan warisan. |
| FR-STU-005 | MUST | Component palette MUST menyediakan seluruh 120 komponen MADS dengan pencarian, kategori, dan pratinjau, serta MUST menolak komponen di luar katalog. | Pencarian "table" menemukan DataTable; menyisipkan tipe tak dikenal ditolak dengan pesan validasi. |
| FR-STU-006 | MUST | Properties panel MUST mengedit props sesuai skema komponen, memvalidasi tipe dan enum, dan menampilkan error field tanpa merusak nilai lain. | Nilai enum tidak valid ditolak; field lain tetap; error tampil di field. |
| FR-STU-007 | MUST | Theme Studio MUST mengedit token MADS (warna, tipografi, spacing, radius) dan menghasilkan theme yang diwarisi Host; micro-app MUST NOT mendefinisikan warna arbitrer di luar token yang diizinkan. | Theme baru berlaku di preview dan export; nilai warna non-token ditolak. |
| FR-STU-008 | MUST | Monaco Editor MUST dibundel lokal dan berfungsi penuh offline, termasuk syntax highlight, bracket matching, dan pencarian dalam file. | Mode pesawat: editor terbuka < 1 detik dan fitur dasar berfungsi; tidak ada request CDN. |
| FR-STU-009 | MUST | Editor MUST menyediakan diagnostik TypeScript strict untuk project micro-app dan menampilkan error/warning pada gutter serta panel masalah. | Kode dengan tipe salah menampilkan diagnostik; tidak ada `any` implisit yang lolos tanpa warning. |
| FR-STU-010 | MUST | Editor MUST menyediakan lint dan format on save dengan konfigurasi project; hasil format MUST deterministik. | Dua kali format menghasilkan output identik; simpan memicu lint. |
| FR-STU-011 | MUST | Perubahan visual MUST menghasilkan patch AST dan source code yang bersih (format stabil, tanpa node duplikat) dalam < 100 ms untuk 200 node. | Tambah node di canvas mengubah source dengan diff minimal; format tetap. |
| FR-STU-012 | MUST | Perubahan kode yang valid MUST tercermin di canvas tanpa menghapus formatting; kode tidak valid MUST menampilkan error dan MUST NOT merusak canvas atau source tersimpan. | Edit props di kode mengubah canvas; sintaks rusak menampilkan error dan canvas tetap pada versi valid terakhir. |
| FR-STU-013 | MUST | AST inspector MUST memungkinkan navigasi dua arah antara node canvas, AST, dan baris kode. | Klik node menyorot baris; klik baris menyorot node; posisi tetap setelah scroll. |
| FR-STU-014 | MUST | Undo/redo MUST mencakup edit visual dan kode dalam satu riwayat, dengan minimal 100 langkah dan label aksi. | Edit visual lalu kode, undo dua kali mengembalikan kedua perubahan dalam urutan benar. |
| FR-STU-015 | MUST | AI copilot MUST mendukung provider lokal (Ollama, llama.cpp, vLLM, LM Studio, WebLLM) dan MUST memilih provider secara eksplisit; provider terakhir yang berhasil menjadi default, tanpa perpindahan otomatis. | Provider lokal dipilih; mematikan provider menampilkan error dan tidak beralih ke cloud. |
| FR-STU-016 | MUST | BYOK adapter MUST mendukung endpoint OpenAI-compatible dan MUST menyimpan kunci hanya di Vault, tidak di project, log, atau source control. | Kunci tidak muncul di file project, log, atau Git; menghapus item Vault memutus akses. |
| FR-STU-017 | MUST | Prompt-to-micro-app MUST menghasilkan UI MUIP, skema database, validasi, logika, dan dummy data dalam satu rencana yang dapat ditinjau sebelum diterapkan. | Prompt "kasir sederhana" menghasilkan project yang lolos validasi manifest dan dapat dipreview; pengguna dapat menolak rencana. |
| FR-STU-018 | SHOULD | Studio MUST mendukung impor screenshot/Figma sebagai referensi canvas dan menghasilkan draft layout yang dapat diedit, dengan sumber gambar disimpan lokal. | Impor gambar menghasilkan draft node; tidak ada unggahan ke layanan eksternal. |
| FR-STU-019 | MUST | Self-healing error fixer MUST mengusulkan patch untuk error runtime/build yang terdeteksi, menampilkan diff, dan MUST menerapkan hanya setelah persetujuan pengguna. | Error disimulasikan; patch diusulkan sebagai diff; menolak tidak mengubah kode. |
| FR-STU-020 | MUST | Security/permission linter MUST menandai `eval`, `new Function`, HTML mentah, permission berisiko tinggi, dan network allowlist kosong yang tidak sesuai, sebelum export. | Project dengan `new Function` gagal lint dan export diblokir sampai diperbaiki. |
| FR-STU-021 | MUST | Git integration MUST mendukung commit, branch, diff, push, dan pull ke GitHub, GitLab, Gitea, Forgejo, atau folder lokal, dengan kredensial dari Vault. | Commit lokal dan push ke remote uji berhasil; kredensial tidak tersimpan di config project. |
| FR-STU-022 | SHOULD | Studio MUST menyediakan visual UI diff yang menampilkan perubahan props, struktur, dan token secara berdampingan dengan diff kode. | Diff dua revisi menampilkan perubahan visual dan kode yang konsisten. |
| FR-STU-023 | MUST | Multiplayer MUST mendukung sesi kolaborasi berbasis Yjs melalui WebRTC P2P tanpa server, dengan presence dan cursor. | Dua instance bergabung via WebRTC; edit terlihat < 300 ms; tidak ada server. |
| FR-STU-024 | MUST | Multiplayer MUST dapat memakai self-host sync server sebagai transport alternatif dengan dokumen tetap E2EE. | Sesi via server self-host berhasil; server hanya menyimpan ciphertext. |
| FR-STU-025 | MUST | QR LAN hot reload MUST menghubungkan Host mobile ke Studio desktop/web melalui WebSocket lokal dengan pairing TLS dan sesi berbatas waktu. | Scan QR menghubungkan perangkat; QR kedaluwarsa setelah 120 detik dan ditolak. |
| FR-STU-026 | MUST | Perubahan kode MUST ter-reload di perangkat terhubung dalam < 1 detik pada LAN yang sama, tanpa mengunggah kode ke internet. | Edit disimpan; perangkat menampilkan perubahan < 1 detik; trafik hanya LAN. |
| FR-STU-027 | MUST | Studio MUST dapat mengekspor project menjadi `.mapp` bertanda tangan melalui alur pack, dengan validasi manifest dan linter sebelum pack. | Export menghasilkan `.mapp` yang lolos verifikasi signature dan instalasi lokal. |
| FR-STU-028 | MUST | Studio MUST dapat mengimpor `.mapp` atau repositori Git sebagai draft project, bukan sebagai micro-app terpasang otomatis. | Impor `.mapp` membuka project draft; tidak ada instalasi otomatis ke Home. |
| FR-STU-029 | MUST | Studio MUST menyediakan schema designer yang menghasilkan migrasi forward dan rollback serta tipe TypeScript yang sinkron dengan skema. | Tambah kolom menghasilkan migrasi dan tipe; rollback mengembalikan skema sebelumnya. |
| FR-STU-030 | MUST | Seluruh alur build inti MUST dapat diselesaikan dengan keyboard, dengan shortcut terdokumentasi dan fokus yang terlihat. | Audit keyboard-only menyelesaikan buat project, tambah komponen, edit props, preview, dan export. |

## 4. Model Data dan State

| Entitas | Field kunci | Invariant |
|---|---|---|
| `project` | `id`, `workspace_id`, `name`, `manifest_draft`, `created_at`, `updated_at` | Satu project satu manifest draft |
| `document` | `project_id`, `yjs_doc_id`, `revision`, `updated_at` | `revision` monoton naik |
| `layout_node` | `id`, `parent_id`, `kind`, `props`, `breakpoint_overrides` | Tidak ada siklus parent; id unik |
| `ai_session` | `id`, `provider_id`, `model`, `started_at`, `state` | Provider eksplisit; tidak ada fallback diam |

State editor: `clean → dirty → validating → valid/invalid`. Edit invalid MUST NOT mengganti `document` tersimpan; snapshot terakhir yang valid dipertahankan.

## 5. Error dan Recovery

| Kode | Kondisi | Recovery |
|---|---|---|
| E-STU-001 | Kode micro-app gagal parse | Tampilkan lokasi error, pertahankan canvas pada revisi valid terakhir |
| E-STU-002 | Provider AI tidak tersedia | Tampilkan status, tawarkan provider lain secara manual atau mode manual |
| E-STU-003 | Kunci BYOK tidak ada atau ditolak | Arahkan ke Vault, jangan ulangi otomatis |
| E-STU-004 | Konflik multiplayer pada dokumen | Tampilkan diff dan pilihan merge, jangan menimpa |
| E-STU-005 | Pack/export gagal validasi | Blokir export, tampilkan daftar field/berkas yang gagal |
| E-AUTH-004 | Kredensial Git tidak valid | Minta ulang, hapus dari memori, jangan tulis ke config |

## 6. Keamanan dan Privasi

- Preview micro-app MUST berjalan di sandbox yang sama dengan runtime produksi; tidak ada preview di konteks Host.
- AI MUST NOT menerima isi Vault; rahasia diredaksi sebelum prompt dikirim.
- Prompt dan respons AI MUST NOT dikirim ke penyedia selain yang dipilih pengguna, dan MUST NOT di-log ke server.
- Kunci Git dan BYOK hanya dari Vault; tidak pernah ditulis ke `.env` project atau output CLI.

## 7. Acceptance Criteria

- **Given** project 200 node **When** pengguna mengubah satu prop di canvas **Then** source berubah < 100 ms dengan diff minimal dan format stabil.
- **Given** kode tidak valid **When** pengguna menyimpan **Then** error tampil, canvas tetap, dan versi valid terakhir dapat dipulihkan.
- **Given** provider AI lokal mati **When** pengguna menjalankan prompt **Then** tidak ada perpindahan otomatis ke cloud dan opsi manual ditawarkan.
- **Given** project memakai `new Function` **When** pengguna mencoba export **Then** linter memblokir dan menunjukkan lokasi.
- **Given** dua instance Studio di LAN **When** QR dipindai **Then** hot reload bekerja < 1 detik tanpa trafik internet.

## 8. Verifikasi

| Bukti | Perintah/Prosedur |
|---|---|
| Unit/contract | `npm test` untuk `packages/ui-kit`, `packages/runtime-web`, `apps/studio-web` |
| Two-way sync | Test round-trip canvas↔AST pada fixture 200 node; ukur waktu patch |
| Offline | Playwright dengan route diblokir; pastikan editor dan palette berfungsi |
| AI | Test provider stub lokal dan BYOK; pastikan tidak ada fallback otomatis |
| A11y | axe + keyboard-only pada canvas, palette, properties, editor |

## 9. Referensi

- [03-specs/ui-protocol.md](ui-protocol.md), [03-specs/manifest-v2.md](manifest-v2.md), [03-specs/08-devtools-cli-sdk.md](08-devtools-cli-sdk.md)
- [02-design/component-catalog.md](../02-design/component-catalog.md), [04-flows/03-build-with-ai.md](../04-flows/03-build-with-ai.md), [04-flows/04-visual-code-sync.md](../04-flows/04-visual-code-sync.md)
