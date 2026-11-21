---
id: SPEC-STU
title: Studio
status: accepted
owner: design
prd_refs: ["§4 User Journey", "§5 F2", "§5 F3"]
---

# Studio

## 1. Tujuan

Menetapkan kontrak pembuatan micro-app dan visual builder: tiga jalur create (template, Magic Create, blank), auto-name, autosave, palette, canvas, inspector, undo/redo, preview responsif, JSON advanced, dan aksi package. Semua jalur MUST berakhir di builder dengan draft tersimpan dan tanpa wizard multi-langkah.

## 2. Ruang Lingkup

Di dalam: route `/templates`, `/create`, `/studio/[projectId]`, state draft, operasi builder, preview. Di luar: verifikasi package ([05-packages.md](05-packages.md)), sandbox execution ([03-sandbox-runtime.md](03-sandbox-runtime.md)), AI transport ([ai-assist.md](../01-architecture/ai-assist.md)).

## 3. Requirement

### 3.1 Create

| ID | Level | Requirement | Acceptance |
|---|---|---|---|
| FR-CREATE-001 | MUST | Galeri template menampilkan kategori dan pencarian. | Minimal tiga kategori; query menyaring kartu tanpa reload. |
| FR-CREATE-002 | MUST | Preview template menampilkan layar contoh, data contoh, dan permission yang diminta. | Ketiga bagian terlihat sebelum aksi Pakai template. |
| FR-CREATE-003 | MUST | Memakai template membuat draft dengan nama otomatis dan sample data terisi. | Draft tersimpan; nama dapat diubah inline; sample data terlihat di canvas. |
| FR-CREATE-004 | MUST | Magic Create menerima satu prompt pada satu textarea. | Tidak ada wizard; `Cmd/Ctrl+Enter` memicu pembuatan. |
| FR-CREATE-005 | MUST | Ketersediaan provider AI diperiksa tanpa memblokir; fallback template/blank selalu ditawarkan. | Tanpa API key, dua tombol fallback tampil dan tetap dapat membuat app. |
| FR-CREATE-006 | MUST | Rencana AI (layar, data, aksi) ditampilkan untuk ditinjau sebelum apply. | Rencana berupa ringkasan terstruktur; ada aksi Ubah dan Buat aplikasi. |
| FR-CREATE-007 | MUST | Menyetujui rencana menghasilkan draft yang dapat diedit di builder. | Draft berisi node MUIP valid dan sample data. |
| FR-CREATE-008 | MUST | Blank create memilih layout Form, List, atau Dashboard. | Setiap pilihan membuat satu layar contoh yang dapat diedit. |
| FR-CREATE-009 | MUST | Jalur create mencapai builder dalam maksimal tiga klik dari Home. | Dihitung pada empty state dan pada library berisi. |
| FR-CREATE-010 | MUST | Nama project dibuat otomatis dan dapat diubah inline tanpa modal. | Rename commit dengan Enter, batal dengan Esc. |
| FR-CREATE-011 | MUST | Membatalkan create kembali ke Home dengan draft tetap tersimpan. | Draft muncul di daftar terbaru setelah Esc. |
| FR-CREATE-012 | MUST | Kegagalan AI tidak memblokir jalur template dan blank. | Timeout/401 menampilkan pesan dan fallback; tidak ada layar buntu. |

Error yang mengikat: `E-CREATE-001` untuk prompt kosong atau melebihi batas, `E-CREATE-002` untuk provider AI tidak terkonfigurasi, `E-CREATE-003` untuk kegagalan generate yang tidak dapat di-retry otomatis.

### 3.2 Builder

| ID | Level | Requirement | Acceptance |
|---|---|---|---|
| FR-STUDIO-001 | MUST | Builder membuka draft dari `/studio/[projectId]` dan memuat dokumen terakhir. | Reload mengembalikan node, nama, dan device terakhir. |
| FR-STUDIO-002 | MUST | Canvas dirender dalam device frame mobile, tablet, dan desktop. | Tiga breakpoint dapat dipilih; lebar frame sesuai token breakpoint. |
| FR-STUDIO-003 | MUST | Palette menampilkan 48 komponen core secara default dan toggle Advanced untuk 120 total, dengan search dan kategori. | Hitungan default 48; toggle menampilkan 120; search menyaring. |
| FR-STUDIO-004 | MUST | Komponen ditambahkan lewat klik atau drag dengan drop indicator. | Drop indicator 2 px terlihat; drop invalid ditolak dengan toast. |
| FR-STUDIO-005 | MUST | Komponen dapat di-reorder, di-nest, dan dihapus. | Tree order berubah; hapus dapat di-undo. |
| FR-STUDIO-006 | MUST | Teks dapat diedit inline dengan Enter commit dan Esc cancel. | Edit tidak membuka panel terpisah; nilai tersimpan di dokumen. |
| FR-STUDIO-007 | MUST | Inspector menyediakan tab Content, Style, Layout, Behavior. | Setiap tab menampilkan kontrol yang relevan untuk node terpilih. |
| FR-STUDIO-008 | MUST | Nilai style hanya berasal dari token clay; tidak ada input CSS mentah. | Tidak ada field bebas untuk warna, radius, atau shadow. |
| FR-STUDIO-009 | MUST | Override responsif disimpan per breakpoint. | Perubahan di mobile tidak mengubah desktop kecuali diwarisi. |
| FR-STUDIO-010 | MUST | Undo/redo menyimpan 100 langkah dan menampilkan label aksi. | `Cmd/Ctrl+Z` dan `Cmd/Ctrl+Shift+Z` bekerja; toast menyebut aksi. |
| FR-STUDIO-011 | MUST | Autosave berjalan 500 ms setelah perubahan dengan status simpan. | Status Menyimpan lalu Tersimpan; tidak ada tombol Save wajib. |
| FR-STUDIO-012 | MUST | Dirty state dijaga saat meninggalkan builder. | Guard muncul hanya bila autosave belum selesai; draft tidak hilang. |
| FR-STUDIO-013 | MUST | Preview mengganti canvas dengan sandbox dan device switcher. | Preview memakai iframe runtime yang sama; consent muncul JIT. |
| FR-STUDIO-014 | MUST | Tab JSON advanced bersifat read-only secara default; edit hanya dengan flag aktif dan validasi. | Tanpa flag, tombol edit tidak ada; JSON invalid ditolak sebelum apply. |
| FR-STUDIO-015 | MUST | Aksi Bagikan membuka share sheet package. | Sheet menampilkan nama, versi, permission, ukuran, checksum. |
| FR-STUDIO-016 | MUST | Shortcut keyboard menyediakan undo, redo, dan create/apply. | `Cmd/Ctrl+Z`, `Cmd/Ctrl+Shift+Z`, `Cmd/Ctrl+Enter` berfungsi. |
| FR-STUDIO-017 | MUST | Canvas, palette, inspector, dan drag handle memiliki label ARIA. | axe tanpa pelanggaran serius; drag dapat dilakukan via keyboard. |
| FR-STUDIO-018 | MUST | Canvas kosong menampilkan empty state dengan aksi tambah komponen pertama. | Empty state terlihat pada draft tanpa node. |
| FR-STUDIO-019 | MUST | Drop atau save yang gagal ditampilkan tanpa kehilangan draft. | Toast/banner retry; salinan lokal dipertahankan. |
| FR-STUDIO-020 | MUST | Draft terbaru tampil di section Home tanpa route `/studio` terpisah. | Home memuat maksimal lima draft dengan aksi lanjutkan. |

Error yang mengikat: `E-STUDIO-001` untuk dokumen draft rusak, `E-STUDIO-002` untuk kegagalan autosave, `E-STUDIO-003` untuk operasi drop yang tidak valid.

## 4. Model Dokumen

Draft disimpan sebagai dokumen JSON dengan bentuk:

| Field | Tipe | Aturan |
|---|---|---|
| `id` | UUIDv7 | Stabil selama umur project. |
| `name` | string | 1..80 karakter; auto-name dari template atau prompt. |
| `version` | integer | Naik setiap autosave yang sukses. |
| `device` | `mobile`/`tablet`/`desktop` | Preferensi tampilan, bukan data. |
| `nodes` | array | Node MUIP v1; divalidasi sebelum simpan. |
| `dataSample` | object | Data contoh untuk preview, tidak dipakai runtime produksi. |
| `permissions` | array | Dideklarasikan saat export, bukan saat create. |

## 5. Interaksi Builder

- Klik node memilih; klik kedua masuk inline edit untuk node teks.
- Drag dari palette menambah; drag di canvas memindahkan; garis drop menunjukkan posisi.
- Inspector mengubah token, bukan nilai mentah. Setiap perubahan menghasilkan satu entri undo.
- Autosave mengirim dokumen tervalidasi ke worker data; kegagalan mempertahankan antrean dan menampilkan `E-STUDIO-002`.
- Preview memakai manifest sementara dan tidak memasang package.

## 6. Batas

Builder MUST NOT menyediakan editor kode penuh, terminal, Git, multiplayer, atau hot reload jaringan lokal. Mode JSON adalah inspeksi dan koreksi terbatas, bukan alur utama.

## 7. Acceptance Criteria

1. Dari Home ke builder pada ketiga jalur create ≤ 3 klik dan draft sudah tersimpan.
2. Builder memuat 48 komponen core, toggle Advanced menampilkan 120.
3. Autosave 500 ms, undo 100 langkah, dan guard meninggalkan builder bekerja.
4. Preview menjalankan draft di iframe sandbox dengan consent JIT.
5. Tidak ada field CSS mentah dan tidak ada jalur yang membutuhkan akun atau jaringan.

## 8. Verifikasi

| Pemeriksaan | Cara |
|---|---|
| Tiga jalur create | Playwright: template, Magic Create dengan mock provider, blank. |
| Palette count | Vitest: hitung item default dan advanced dari katalog generated. |
| Autosave/undo | Vitest: fake timer, 500 ms, 100 entri, label undo. |
| Validasi dokumen | Vitest: dokumen invalid menghasilkan `E-STUDIO-001`. |
| Preview sandbox | Playwright: preview memuat iframe `sandbox="allow-scripts"`. |
| Aksesibilitas | axe pada builder desktop dan mobile; keyboard-only tambah node. |
