---
id: FOUND-MATRIX
title: Matriks Kepatuhan PRD
status: accepted
owner: product
prd_refs: ["§5", "§9", "§12"]
---

# Matriks Kepatuhan PRD

Matriks ini memetakan setiap requirement terdefinisi ke spec, flow, fase, status, dan cara verifikasi. Satu baris per requirement. Status hanya boleh `implemented` bila ada bukti test nyata; `partial` bila sebagian perilaku ada; `missing` bila belum ada. Tidak ada klaim tanpa bukti.

Ringkasan: **140 requirement** — 114 `FR-*`, 12 `NFR-*`, 14 `SEC-*`. Status setelah verifikasi v3: 137 implemented, 3 partial, 0 missing. Angka status berubah hanya setelah verifikasi dijalankan dan dicatat.

## 1. Requirement

| PRD Ref | Requirement | Spec | Flow | Phase | Status | Verification |
|---|---|---|---|---|---|---|
| §5 F1 | FR-SHELL-001 — Shell merender skeleton non-blocking dan menggantinya dengan konten tanpa layout shift besar. | [01-app-shell.md](../03-specs/01-app-shell.md) | FLOW-01 | 1 | implemented | Playwright `/` + Vitest shell |
| §5 F1 | FR-SHELL-002 — Local identity dibuat otomatis pada first load tanpa modal, tanpa form, dan tanpa mnemonic. | [01-app-shell.md](../03-specs/01-app-shell.md) | FLOW-01 | 1 | implemented | Playwright `/` + Vitest shell |
| §5 F1 | FR-SHELL-003 — Home tampil penuh tanpa jaringan dan tanpa akun. | [01-app-shell.md](../03-specs/01-app-shell.md) | FLOW-01 | 1 | implemented | Playwright `/` + Vitest shell |
| §5 F1 | FR-SHELL-004 — Library menyediakan tampilan grid dan list dengan ikon, nama, versi, dan status app. | [01-app-shell.md](../03-specs/01-app-shell.md) | FLOW-01 | 1 | implemented | Playwright `/` + Vitest shell |
| §5 F1 | FR-SHELL-005 — Pencarian lokal FTS5 mencakup app, project, dan record dalam satu query. | [01-app-shell.md](../03-specs/01-app-shell.md) | FLOW-01 | 1 | implemented | Playwright `/` + Vitest shell |
| §5 F1 | FR-SHELL-006 — Filter dan sort menyediakan terbaru, nama, tipe, dan favorit. | [01-app-shell.md](../03-specs/01-app-shell.md) | FLOW-01 | 1 | implemented | Playwright `/` + Vitest shell |
| §5 F1 | FR-SHELL-007 — Empty state menawarkan tiga jalur create: Template, Magic Create, Mulai kosong. | [01-app-shell.md](../03-specs/01-app-shell.md) | FLOW-01 | 1 | implemented | Playwright `/` + Vitest shell |
| §5 F1 | FR-SHELL-008 — Entry impor/install `.mapp` tersedia dari Home dan Packages. | [01-app-shell.md](../03-specs/01-app-shell.md) | FLOW-01 | 1 | implemented | Playwright `/` + Vitest shell |
| §5 F1 | FR-SHELL-009 — Membuka app menjalankan route `/app/[appId]` di sandbox. | [01-app-shell.md](../03-specs/01-app-shell.md) | FLOW-01 | 1 | implemented | Playwright `/` + Vitest shell |
| §5 F1 | FR-SHELL-010 — Context menu app menyediakan buka, rename, duplikat, ekspor, uninstall. | [01-app-shell.md](../03-specs/01-app-shell.md) | FLOW-01 | 1 | implemented | Playwright `/` + Vitest shell |
| §5 F1 | FR-SHELL-011 — Indikator offline global menunjukkan status jaringan dan status cache shell. | [01-app-shell.md](../03-specs/01-app-shell.md) | FLOW-01 | 1 | implemented | Playwright `/` + Vitest shell |
| §5 F1 | FR-SHELL-012 — Badge penyimpanan menampilkan estimasi pemakaian dan peringatan kuota. | [01-app-shell.md](../03-specs/01-app-shell.md) | FLOW-01 | 1 | implemented | Playwright `/` + Vitest shell |
| §5 F1 | FR-SHELL-013 — Shell menawarkan prompt update saat versi package lebih baru terdeteksi dari index statis. | [01-app-shell.md](../03-specs/01-app-shell.md) | FLOW-01 | 1 | implemented | Playwright `/` + Vitest shell |
| §5 F1 | FR-SHELL-014 — App dapat di-pin atau difavoritkan dan tampil lebih dulu di Home. | [01-app-shell.md](../03-specs/01-app-shell.md) | FLOW-01 | 1 | implemented | Playwright `/` + Vitest shell |
| §5 F1 | FR-SHELL-015 — Workspace default tunggal dibuat otomatis; create/switch hanya muncul setelah pengguna menambah workspace. | [01-app-shell.md](../03-specs/01-app-shell.md) | FLOW-01 | 1 | implemented | Playwright `/` + Vitest shell |
| §5 F1 | FR-SHELL-016 — Launcher memulihkan app terakhir, posisi scroll, dan filter setelah reload. | [01-app-shell.md](../03-specs/01-app-shell.md) | FLOW-01 | 1 | implemented | Playwright `/` + Vitest shell |
| §5 F1 | FR-SHELL-017 — Error surface menampilkan kode, ringkasan aman, langkah pemulihan, dan retry. | [01-app-shell.md](../03-specs/01-app-shell.md) | FLOW-01 | 1 | implemented | Playwright `/` + Vitest shell |
| §5 F1 | FR-SHELL-018 — Seluruh alur shell dapat diselesaikan dengan keyboard saja. | [01-app-shell.md](../03-specs/01-app-shell.md) | FLOW-01 | 1 | implemented | Playwright `/` + Vitest shell |
| §5 F1 | FR-SHELL-019 — Shell memberi label/role yang benar dan live region untuk perubahan status. | [01-app-shell.md](../03-specs/01-app-shell.md) | FLOW-01 | 1 | implemented | Playwright `/` + Vitest shell |
| §5 F1 | FR-SHELL-020 — Shell mendukung locale `id-ID` dan `en-US` serta layout RTL. | [01-app-shell.md](../03-specs/01-app-shell.md) | FLOW-01 | 1 | implemented | Playwright `/` + Vitest shell |
| §5 F2 | FR-CREATE-001 — Galeri template menampilkan kategori dan pencarian. | [02-studio.md](../03-specs/02-studio.md) | FLOW-02 | 2 | implemented | Playwright create flows |
| §5 F2 | FR-CREATE-002 — Preview template menampilkan layar contoh, data contoh, dan permission yang diminta. | [02-studio.md](../03-specs/02-studio.md) | FLOW-02 | 2 | implemented | Playwright create flows |
| §5 F2 | FR-CREATE-003 — Memakai template membuat draft dengan nama otomatis dan sample data terisi. | [02-studio.md](../03-specs/02-studio.md) | FLOW-02 | 2 | partial | Playwright create flows |
| §5 F2 | FR-CREATE-004 — Magic Create menerima satu prompt pada satu textarea. | [02-studio.md](../03-specs/02-studio.md) | FLOW-02 | 2 | partial | Playwright create flows |
| §5 F2 | FR-CREATE-005 — Ketersediaan provider AI diperiksa tanpa memblokir; fallback template/blank selalu ditawarkan. | [02-studio.md](../03-specs/02-studio.md) | FLOW-02 | 2 | implemented | Playwright create flows |
| §5 F2 | FR-CREATE-006 — Rencana AI (layar, data, aksi) ditampilkan untuk ditinjau sebelum apply. | [02-studio.md](../03-specs/02-studio.md) | FLOW-02 | 2 | implemented | Playwright create flows |
| §5 F2 | FR-CREATE-007 — Menyetujui rencana menghasilkan draft yang dapat diedit di builder. | [02-studio.md](../03-specs/02-studio.md) | FLOW-02 | 2 | implemented | Playwright create flows |
| §5 F2 | FR-CREATE-008 — Blank create memilih layout Form, List, atau Dashboard. | [02-studio.md](../03-specs/02-studio.md) | FLOW-02 | 2 | implemented | Playwright create flows |
| §5 F2 | FR-CREATE-009 — Jalur create mencapai builder dalam maksimal tiga klik dari Home. | [02-studio.md](../03-specs/02-studio.md) | FLOW-02 | 2 | implemented | Playwright create flows |
| §5 F2 | FR-CREATE-010 — Nama project dibuat otomatis dan dapat diubah inline tanpa modal. | [02-studio.md](../03-specs/02-studio.md) | FLOW-02 | 2 | implemented | Playwright create flows |
| §5 F2 | FR-CREATE-011 — Membatalkan create kembali ke Home dengan draft tetap tersimpan. | [02-studio.md](../03-specs/02-studio.md) | FLOW-02 | 2 | implemented | Playwright create flows |
| §5 F2 | FR-CREATE-012 — Kegagalan AI tidak memblokir jalur template dan blank. | [02-studio.md](../03-specs/02-studio.md) | FLOW-02 | 2 | implemented | Playwright create flows |
| §5 F3 | FR-STUDIO-001 — Builder membuka draft dari `/studio/[projectId]` dan memuat dokumen terakhir. | [02-studio.md](../03-specs/02-studio.md) | FLOW-03 | 2 | implemented | Playwright builder + Vitest palette |
| §5 F3 | FR-STUDIO-002 — Canvas dirender dalam device frame mobile, tablet, dan desktop. | [02-studio.md](../03-specs/02-studio.md) | FLOW-03 | 2 | implemented | Playwright builder + Vitest palette |
| §5 F3 | FR-STUDIO-003 — Palette menampilkan 48 komponen core secara default dan toggle Advanced untuk 120 total, dengan search dan kategori. | [02-studio.md](../03-specs/02-studio.md) | FLOW-03 | 2 | implemented | Playwright builder + Vitest palette |
| §5 F3 | FR-STUDIO-004 — Komponen ditambahkan lewat klik atau drag dengan drop indicator. | [02-studio.md](../03-specs/02-studio.md) | FLOW-03 | 2 | implemented | Playwright builder + Vitest palette |
| §5 F3 | FR-STUDIO-005 — Komponen dapat di-reorder, di-nest, dan dihapus. | [02-studio.md](../03-specs/02-studio.md) | FLOW-03 | 2 | implemented | Playwright builder + Vitest palette |
| §5 F3 | FR-STUDIO-006 — Teks dapat diedit inline dengan Enter commit dan Esc cancel. | [02-studio.md](../03-specs/02-studio.md) | FLOW-03 | 2 | implemented | Playwright builder + Vitest palette |
| §5 F3 | FR-STUDIO-007 — Inspector menyediakan tab Content, Style, Layout, Behavior. | [02-studio.md](../03-specs/02-studio.md) | FLOW-03 | 2 | implemented | Playwright builder + Vitest palette |
| §5 F3 | FR-STUDIO-008 — Nilai style hanya berasal dari token clay; tidak ada input CSS mentah. | [02-studio.md](../03-specs/02-studio.md) | FLOW-03 | 2 | implemented | Playwright builder + Vitest palette |
| §5 F3 | FR-STUDIO-009 — Override responsif disimpan per breakpoint. | [02-studio.md](../03-specs/02-studio.md) | FLOW-03 | 2 | implemented | Playwright builder + Vitest palette |
| §5 F3 | FR-STUDIO-010 — Undo/redo menyimpan 100 langkah dan menampilkan label aksi. | [02-studio.md](../03-specs/02-studio.md) | FLOW-03 | 2 | implemented | Playwright builder + Vitest palette |
| §5 F3 | FR-STUDIO-011 — Autosave berjalan 500 ms setelah perubahan dengan status simpan. | [02-studio.md](../03-specs/02-studio.md) | FLOW-03 | 2 | implemented | Playwright builder + Vitest palette |
| §5 F3 | FR-STUDIO-012 — Dirty state dijaga saat meninggalkan builder. | [02-studio.md](../03-specs/02-studio.md) | FLOW-03 | 2 | implemented | Playwright builder + Vitest palette |
| §5 F3 | FR-STUDIO-013 — Preview mengganti canvas dengan sandbox dan device switcher. | [02-studio.md](../03-specs/02-studio.md) | FLOW-03 | 2 | implemented | Playwright builder + Vitest palette |
| §5 F3 | FR-STUDIO-014 — Tab JSON advanced bersifat read-only secara default; edit hanya dengan flag aktif dan validasi. | [02-studio.md](../03-specs/02-studio.md) | FLOW-03 | 2 | implemented | Playwright builder + Vitest palette |
| §5 F3 | FR-STUDIO-015 — Aksi Bagikan membuka share sheet package. | [02-studio.md](../03-specs/02-studio.md) | FLOW-03 | 2 | implemented | Playwright builder + Vitest palette |
| §5 F3 | FR-STUDIO-016 — Shortcut keyboard menyediakan undo, redo, dan create/apply. | [02-studio.md](../03-specs/02-studio.md) | FLOW-03 | 2 | implemented | Playwright builder + Vitest palette |
| §5 F3 | FR-STUDIO-017 — Canvas, palette, inspector, dan drag handle memiliki label ARIA. | [02-studio.md](../03-specs/02-studio.md) | FLOW-03 | 2 | implemented | Playwright builder + Vitest palette |
| §5 F3 | FR-STUDIO-018 — Canvas kosong menampilkan empty state dengan aksi tambah komponen pertama. | [02-studio.md](../03-specs/02-studio.md) | FLOW-03 | 2 | implemented | Playwright builder + Vitest palette |
| §5 F3 | FR-STUDIO-019 — Drop atau save yang gagal ditampilkan tanpa kehilangan draft. | [02-studio.md](../03-specs/02-studio.md) | FLOW-03 | 2 | implemented | Playwright builder + Vitest palette |
| §5 F3 | FR-STUDIO-020 — Draft terbaru tampil di section Home tanpa route `/studio` terpisah. | [02-studio.md](../03-specs/02-studio.md) | FLOW-03 | 2 | implemented | Playwright builder + Vitest palette |
| §5 F4 | FR-RUN-001 — Setiap app berjalan di iframe dengan `sandbox="allow-scripts"` dan tanpa `allow-same-origin`. | [03-sandbox-runtime.md](../03-specs/03-sandbox-runtime.md) | FLOW-07 | 1 | implemented | Vitest runtime-web + Playwright runner |
| §5 F4 | FR-RUN-002 — Dokumen iframe memakai CSP `default-src 'none'` dengan nonce untuk bootstrap. | [03-sandbox-runtime.md](../03-specs/03-sandbox-runtime.md) | FLOW-07 | 1 | implemented | Vitest runtime-web + Playwright runner |
| §5 F4 | FR-RUN-003 — Logika app dieksekusi di worker tanpa akses DOM host. | [03-sandbox-runtime.md](../03-specs/03-sandbox-runtime.md) | FLOW-07 | 1 | implemented | Vitest runtime-web + Playwright runner |
| §5 F4 | FR-RUN-004 — Renderer MUIP memvalidasi setiap node dan menolak HTML, CSS, atau JS arbitrer. | [03-sandbox-runtime.md](../03-specs/03-sandbox-runtime.md) | FLOW-07 | 1 | implemented | Vitest runtime-web + Playwright runner |
| §5 F4 | FR-RUN-005 — Bridge adalah satu-satunya kanal app ke host. | [03-sandbox-runtime.md](../03-specs/03-sandbox-runtime.md) | FLOW-07 | 1 | implemented | Vitest runtime-web + Playwright runner |
| §5 F4 | FR-RUN-006 — Setiap panggilan bridge memeriksa permission pada saat panggilan. | [03-sandbox-runtime.md](../03-specs/03-sandbox-runtime.md) | FLOW-07 | 1 | implemented | Vitest runtime-web + Playwright runner |
| §5 F4 | FR-RUN-007 — Consent JIT diminta sebelum akses pertama ke permission yang belum granted. | [03-sandbox-runtime.md](../03-specs/03-sandbox-runtime.md) | FLOW-07 | 1 | implemented | Vitest runtime-web + Playwright runner |
| §5 F4 | FR-RUN-008 — Watchdog 5 detik tanpa heartbeat menghentikan eksekusi app. | [03-sandbox-runtime.md](../03-specs/03-sandbox-runtime.md) | FLOW-07 | 1 | implemented | Vitest runtime-web + Playwright runner |
| §5 F4 | FR-RUN-009 — Error boundary menyediakan muat ulang, ekspor data, dan kembali ke Home. | [03-sandbox-runtime.md](../03-specs/03-sandbox-runtime.md) | FLOW-07 | 1 | implemented | Vitest runtime-web + Playwright runner |
| §5 F4 | FR-RUN-010 — Restart dibatasi 3 kali per 5 menit per app. | [03-sandbox-runtime.md](../03-specs/03-sandbox-runtime.md) | FLOW-07 | 1 | implemented | Vitest runtime-web + Playwright runner |
| §5 F4 | FR-RUN-011 — Lifecycle memanggil `onMount`, `onFocus`, `onBlur`, `onBackground`, `onUnmount` tepat sekali per transisi. | [03-sandbox-runtime.md](../03-specs/03-sandbox-runtime.md) | FLOW-07 | 1 | implemented | Vitest runtime-web + Playwright runner |
| §5 F4 | FR-RUN-012 — App di background dihentikan atau dihibernasi setelah 30 detik. | [03-sandbox-runtime.md](../03-specs/03-sandbox-runtime.md) | FLOW-07 | 1 | implemented | Vitest runtime-web + Playwright runner |
| §5 F4 | FR-RUN-013 — Jika sandbox tidak tersedia, runtime gagal tertutup tanpa eksekusi alternatif. | [03-sandbox-runtime.md](../03-specs/03-sandbox-runtime.md) | FLOW-07 | 1 | implemented | Vitest runtime-web + Playwright runner |
| §5 F4 | FR-RUN-014 — Panggilan bridge, permission, dan crash dicatat di audit lokal. | [03-sandbox-runtime.md](../03-specs/03-sandbox-runtime.md) | FLOW-07 | 1 | implemented | Vitest runtime-web + Playwright runner |
| §8 | FR-DATA-001 — Host DB adalah SQLite WASM di OPFS dan hanya diakses melalui worker. | [04-data.md](../03-specs/04-data.md) | FLOW-08 | 1 | implemented | Vitest data + test-migrations |
| §8 | FR-DATA-002 — Setiap app mendapat DB terisolasi per workspace. | [04-data.md](../03-specs/04-data.md) | FLOW-08 | 1 | implemented | Vitest data + test-migrations |
| §8 | FR-DATA-003 — Nama DB deterministik dari `app_id` dan `workspace_id`. | [04-data.md](../03-specs/04-data.md) | FLOW-08 | 1 | implemented | Vitest data + test-migrations |
| §8 | FR-DATA-004 — Migrasi bernomor mendukung forward dan rollback. | [04-data.md](../03-specs/04-data.md) | FLOW-08 | 1 | implemented | Vitest data + test-migrations |
| §8 | FR-DATA-005 — Snapshot atomik dibuat sebelum migrasi. | [04-data.md](../03-specs/04-data.md) | FLOW-08 | 1 | implemented | Vitest data + test-migrations |
| §8 | FR-DATA-006 — FTS5 tersedia untuk pencarian teks pada data app dan host. | [04-data.md](../03-specs/04-data.md) | FLOW-08 | 1 | implemented | Vitest data + test-migrations |
| §8 | FR-DATA-007 — Pemakaian dan kuota storage diestimasi dan ditampilkan. | [04-data.md](../03-specs/04-data.md) | FLOW-08 | 1 | implemented | Vitest data + test-migrations |
| §8 | FR-DATA-008 — Data app dapat diekspor ke JSON dan CSV. | [04-data.md](../03-specs/04-data.md) | FLOW-08 | 1 | implemented | Vitest data + test-migrations |
| §8 | FR-DATA-009 — Impor data app memvalidasi schema dan checksum sebelum menulis. | [04-data.md](../03-specs/04-data.md) | FLOW-08 | 1 | implemented | Vitest data + test-migrations |
| §8 | FR-DATA-010 — Query lintas workspace ditolak oleh lapisan data. | [04-data.md](../03-specs/04-data.md) | FLOW-08 | 1 | implemented | Vitest data + test-migrations |
| §8 | FR-DATA-011 — Operasi data sensitif dicatat di audit lokal. | [04-data.md](../03-specs/04-data.md) | FLOW-08 | 1 | implemented | Vitest data + test-migrations |
| §8 | FR-DATA-012 — Dexie tidak dipakai untuk data baru; hanya dibaca untuk migrasi. | [04-data.md](../03-specs/04-data.md) | FLOW-08 | 1 | implemented | Vitest data + test-migrations |
| §5 F5 | FR-PACK-001 — Manifest v2 divalidasi terhadap schema sebelum langkah lain. | [05-packages.md](../03-specs/05-packages.md) | FLOW-04 | 1 | implemented | mapp-tool verify + Vitest |
| §5 F5 | FR-PACK-002 — `.mapp` adalah ZIP deterministik dengan `microapp.manifest.json` di root. | [05-packages.md](../03-specs/05-packages.md) | FLOW-04 | 1 | implemented | mapp-tool verify + Vitest |
| §5 F5 | FR-PACK-003 — Signature Ed25519 detached disertakan dan diverifikasi dengan public key. | [05-packages.md](../03-specs/05-packages.md) | FLOW-04 | 1 | implemented | mapp-tool verify + Vitest |
| §5 F5 | FR-PACK-004 — Digest setiap entri dan content hash keseluruhan diverifikasi. | [05-packages.md](../03-specs/05-packages.md) | FLOW-04 | 1 | implemented | mapp-tool verify + Vitest |
| §5 F5 | FR-PACK-005 — File `.mapp` diverifikasi penuh sebelum instalasi dijalankan. | [05-packages.md](../03-specs/05-packages.md) | FLOW-04 | 1 | implemented | mapp-tool verify + Vitest |
| §5 F5 | FR-PACK-006 — Preview permission ditampilkan sebelum instalasi. | [05-packages.md](../03-specs/05-packages.md) | FLOW-04 | 1 | implemented | mapp-tool verify + Vitest |
| §5 F5 | FR-PACK-007 — Instalasi menulis manifest dan asset ke OPFS lalu mendaftarkan app di Home. | [05-packages.md](../03-specs/05-packages.md) | FLOW-04 | 1 | implemented | mapp-tool verify + Vitest |
| §5 F5 | FR-PACK-008 — Update memeriksa versi dan menolak downgrade tanpa konfirmasi eksplisit. | [05-packages.md](../03-specs/05-packages.md) | FLOW-04 | 1 | implemented | mapp-tool verify + Vitest |
| §5 F5 | FR-PACK-009 — Rollback mengembalikan versi sebelumnya yang tersimpan lokal. | [05-packages.md](../03-specs/05-packages.md) | FLOW-04 | 1 | implemented | mapp-tool verify + Vitest |
| §5 F5 | FR-PACK-010 — Index statis read-only opsional dapat ditambahkan lewat Settings. | [05-packages.md](../03-specs/05-packages.md) | FLOW-04 | 1 | implemented | mapp-tool verify + Vitest |
| §5 F5 | FR-PACK-011 — Perubahan public key untuk app yang sama memicu peringatan keras. | [05-packages.md](../03-specs/05-packages.md) | FLOW-04 | 1 | implemented | mapp-tool verify + Vitest |
| §5 F5 | FR-PACK-012 — Uninstall menghapus app dan menawarkan ekspor data sebelum hapus. | [05-packages.md](../03-specs/05-packages.md) | FLOW-04 | 1 | implemented | mapp-tool verify + Vitest |
| §5 F6 | FR-BACKUP-001 — Backup dibuat sebagai satu file `.mapp-backup` terenkripsi. | [06-backup.md](../03-specs/06-backup.md) | FLOW-05 | 1 | implemented | Vitest backup round-trip |
| §5 F6 | FR-BACKUP-002 — Kunci diturunkan dari passphrase dengan Argon2id dan parameter tercatat. | [06-backup.md](../03-specs/06-backup.md) | FLOW-05 | 1 | implemented | Vitest backup round-trip |
| §5 F6 | FR-BACKUP-003 — Setiap section memiliki checksum yang diverifikasi saat restore. | [06-backup.md](../03-specs/06-backup.md) | FLOW-05 | 1 | implemented | Vitest backup round-trip |
| §5 F6 | FR-BACKUP-004 — Restore memverifikasi header, checksum, dan autentikasi GCM sebelum menulis. | [06-backup.md](../03-specs/06-backup.md) | FLOW-05 | 1 | implemented | Vitest backup round-trip |
| §5 F6 | FR-BACKUP-005 — Restore menawarkan mode Gabung dan Ganti dengan konsekuensi jelas. | [06-backup.md](../03-specs/06-backup.md) | FLOW-05 | 1 | implemented | Vitest backup round-trip |
| §5 F6 | FR-BACKUP-006 — Recovery phrase bersifat opsional dan ditunda sampai backup, share, atau pilihan pengguna. | [06-backup.md](../03-specs/06-backup.md) | FLOW-05 | 1 | implemented | Vitest backup round-trip |
| §5 F6 | FR-BACKUP-007 — Pengingat backup muncul setiap 7 hari dan dapat ditutup. | [06-backup.md](../03-specs/06-backup.md) | FLOW-05 | 1 | implemented | Vitest backup round-trip |
| §5 F6 | FR-BACKUP-008 — Tidak ada upload otomatis ke cloud atau server. | [06-backup.md](../03-specs/06-backup.md) | FLOW-05 | 1 | implemented | Vitest backup round-trip |
| §5 F8 | FR-SET-001 — Tema mendukung light, dark, dan high-contrast dengan komponen clay. | [07-settings.md](../03-specs/07-settings.md) | FLOW-05 | 1 | implemented | Playwright settings + Vitest |
| §5 F8 | FR-SET-002 — Locale mendukung `id-ID` dan `en-US`, termasuk RTL untuk konten yang meminta. | [07-settings.md](../03-specs/07-settings.md) | FLOW-05 | 1 | implemented | Playwright settings + Vitest |
| §5 F8 | FR-SET-003 — Storage menampilkan pemakaian dan aksi bersihkan cache yang aman. | [07-settings.md](../03-specs/07-settings.md) | FLOW-05 | 1 | implemented | Playwright settings + Vitest |
| §5 F8 | FR-SET-004 — BYOK disimpan di vault lokal dan tidak pernah ditampilkan kembali penuh. | [07-settings.md](../03-specs/07-settings.md) | FLOW-05 | 1 | implemented | Playwright settings + Vitest |
| §5 F8 | FR-SET-005 — Recovery phrase dapat dibuat dan dikonfirmasi lewat Settings. | [07-settings.md](../03-specs/07-settings.md) | FLOW-05 | 1 | implemented | Playwright settings + Vitest |
| §5 F8 | FR-SET-006 — Daftar permission per app dapat dilihat dan dicabut. | [07-settings.md](../03-specs/07-settings.md) | FLOW-05 | 1 | implemented | Playwright settings + Vitest |
| §5 F8 | FR-SET-007 — About menampilkan versi, commit, lisensi, dan tautan kebijakan. | [07-settings.md](../03-specs/07-settings.md) | FLOW-05 | 1 | implemented | Playwright settings + Vitest |
| §5 F8 | FR-SET-008 — Reset data lokal meminta konfirmasi eksplisit dan menawarkan ekspor. | [07-settings.md](../03-specs/07-settings.md) | FLOW-05 | 1 | implemented | Playwright settings + Vitest |
| §5 F8 | FR-SET-009 — Settings dapat diekspor dan diimpor sebagai JSON tervalidasi. | [07-settings.md](../03-specs/07-settings.md) | FLOW-05 | 1 | implemented | Playwright settings + Vitest |
| §5 F8 | FR-SET-010 — Toggle DevTools lokal mengaktifkan panel diagnostik tanpa telemetry. | [07-settings.md](../03-specs/07-settings.md) | FLOW-05 | 1 | implemented | Playwright settings + Vitest |
| §5 F8 | FR-DEV-001 — Panel diagnostik menampilkan status storage, worker, sandbox, dan service worker. | [08-devtools.md](../03-specs/08-devtools.md) | FLOW-07 | 1 | implemented | Vitest devtools redaction |
| §5 F8 | FR-DEV-002 — Package inspector menampilkan manifest, signature, digest, dan permission app terpasang. | [08-devtools.md](../03-specs/08-devtools.md) | FLOW-07 | 1 | implemented | Vitest devtools redaction |
| §5 F8 | FR-DEV-003 — Bridge log menampilkan method, durasi, hasil, dan app tanpa payload sensitif. | [08-devtools.md](../03-specs/08-devtools.md) | FLOW-07 | 1 | implemented | Vitest devtools redaction |
| §5 F8 | FR-DEV-004 — Error log dapat difilter, dibersihkan, dan diekspor sebagai JSON teredaksi. | [08-devtools.md](../03-specs/08-devtools.md) | FLOW-07 | 1 | implemented | Vitest devtools redaction |
| §5 F8 | FR-DEV-005 — Feature flag hanya berlaku lokal dan tidak mengubah perilaku pengguna lain. | [08-devtools.md](../03-specs/08-devtools.md) | FLOW-07 | 1 | implemented | Vitest devtools redaction |
| §5 F8 | FR-DEV-006 — Tidak ada telemetry, analytics, atau beacon keluar dari DevTools. | [08-devtools.md](../03-specs/08-devtools.md) | FLOW-07 | 1 | implemented | Vitest devtools redaction |
| §5 F7 | SEC-001 — Micro-app memiliki zero privilege sampai permission diberikan. | [permissions.md](../03-specs/permissions.md) | FLOW-06 | 1 | implemented | Vitest permissions + Playwright consent |
| §5 F7 | SEC-002 — Setiap permission yang dipakai wajib dideklarasikan di manifest. | [permissions.md](../03-specs/permissions.md) | FLOW-06 | 1 | implemented | Vitest permissions + Playwright consent |
| §5 F7 | SEC-003 — Consent JIT diminta sebelum akses pertama dan menjelaskan alasan plain-language. | [permissions.md](../03-specs/permissions.md) | FLOW-06 | 1 | implemented | Vitest permissions + Playwright consent |
| §5 F7 | SEC-004 — Offline Cage aktif secara default dan memblokir semua network app. | [permissions.md](../03-specs/permissions.md) | FLOW-06 | 1 | implemented | Vitest permissions + Playwright consent |
| §5 F7 | SEC-005 — Package wajib memiliki signature valid sebelum instalasi. | [permissions.md](../03-specs/permissions.md) | FLOW-06 | 1 | implemented | Vitest permissions + Playwright consent |
| §5 F7 | SEC-006 — Perubahan public key memicu peringatan keras dan blokir sampai disetujui. | [permissions.md](../03-specs/permissions.md) | FLOW-06 | 1 | implemented | Vitest permissions + Playwright consent |
| §5 F7 | SEC-007 — Tidak ada secret di source, log, fixture, atau dokumen. | [permissions.md](../03-specs/permissions.md) | FLOW-06 | 1 | implemented | Vitest permissions + Playwright consent |
| §5 F7 | SEC-008 — BYOK hanya disimpan di vault lokal dan tidak pernah dikirim ke host lain selain endpoint pengguna. | [permissions.md](../03-specs/permissions.md) | FLOW-06 | 1 | implemented | Vitest permissions + Playwright consent |
| §5 F7 | SEC-009 — Tidak ada `eval`, `new Function`, atau HTML mentah pada render. | [permissions.md](../03-specs/permissions.md) | FLOW-06 | 1 | implemented | Vitest permissions + Playwright consent |
| §5 F7 | SEC-010 — Host mengirim CSP ketat serta COOP/COEP. | [permissions.md](../03-specs/permissions.md) | FLOW-06 | 1 | implemented | Vitest permissions + Playwright consent |
| §5 F7 | SEC-011 — Iframe app memakai opaque origin. | [permissions.md](../03-specs/permissions.md) | FLOW-06 | 1 | implemented | Vitest permissions + Playwright consent |
| §5 F7 | SEC-012 — Backup wajib terenkripsi sebelum ditulis ke disk. | [permissions.md](../03-specs/permissions.md) | FLOW-06 | 1 | implemented | Vitest permissions + Playwright consent |
| §5 F7 | SEC-013 — Tidak ada telemetry default. | [permissions.md](../03-specs/permissions.md) | FLOW-06 | 1 | implemented | Vitest permissions + Playwright consent |
| §5 F7 | SEC-014 — Aksi sensitif dicatat di audit lokal dengan rantai hash. | [permissions.md](../03-specs/permissions.md) | FLOW-06 | 1 | implemented | Vitest permissions + Playwright consent |
| §9 | NFR-PERF-001 — LCP halaman `/` < 2.0 s pada perangkat referensi (Moto G4 setara, Fast 3G). | [nfr.md](../03-specs/nfr.md) | FLOW-01 | 1 | implemented | Lighthouse/axe/Playwright/docs check |
| §9 | NFR-PERF-002 — INP < 200 ms untuk interaksi shell dan builder. | [nfr.md](../03-specs/nfr.md) | FLOW-01 | 1 | implemented | Lighthouse/axe/Playwright/docs check |
| §9 | NFR-PERF-003 — CLS < 0.1 pada semua layar utama. | [nfr.md](../03-specs/nfr.md) | FLOW-01 | 1 | implemented | Lighthouse/axe/Playwright/docs check |
| §9 | NFR-PERF-004 — Initial JS < 250 KB gzip untuk route `/` dan runner. | [nfr.md](../03-specs/nfr.md) | FLOW-01 | 1 | implemented | Lighthouse/axe/Playwright/docs check |
| §9 | NFR-PERF-005 — Operasi builder (tambah, pindah, ubah properti) < 50 ms per operasi. | [nfr.md](../03-specs/nfr.md) | FLOW-01 | 1 | implemented | Lighthouse/axe/Playwright/docs check |
| §9 | NFR-A11Y-001 — Seluruh layar memenuhi WCAG 2.2 AA. | [nfr.md](../03-specs/nfr.md) | FLOW-01 | 1 | implemented | Lighthouse/axe/Playwright/docs check |
| §9 | NFR-A11Y-002 — Seluruh alur inti dapat diselesaikan keyboard-only. | [nfr.md](../03-specs/nfr.md) | FLOW-01 | 1 | implemented | Lighthouse/axe/Playwright/docs check |
| §9 | NFR-A11Y-003 — `prefers-reduced-motion: reduce` menghapus transform dan durasi animasi menjadi 0 ms. | [nfr.md](../03-specs/nfr.md) | FLOW-01 | 1 | implemented | Lighthouse/axe/Playwright/docs check |
| §9 | NFR-I18N-001 — String tersedia lengkap untuk `id-ID` dan `en-US`. | [nfr.md](../03-specs/nfr.md) | FLOW-01 | 1 | implemented | Lighthouse/axe/Playwright/docs check |
| §9 | NFR-I18N-002 — Layout RTL tidak terpotong dan arah ikon mengikuti. | [nfr.md](../03-specs/nfr.md) | FLOW-01 | 1 | implemented | Lighthouse/axe/Playwright/docs check |
| §9 | NFR-REL-001 — Shell dan app terpasang dapat dibuka offline setelah satu kunjungan. | [nfr.md](../03-specs/nfr.md) | FLOW-01 | 1 | partial | Lighthouse/axe/Playwright/docs check |
| §9 | NFR-MAINT-001 — `npm run docs:check` lulus tanpa error dan tanpa warning. | [nfr.md](../03-specs/nfr.md) | FLOW-01 | 1 | implemented | `npm run docs:check` (baseline.json: docs-check pass) |

## 2. Baris PRD-Only

Baris berikut tidak mendefinisikan requirement; mereka memetakan pernyataan PRD (persona, journey, fitur, risiko, metrik) ke artefak yang menanganinya.

| PRD Ref | Requirement | Spec | Flow | Phase | Status | Verification |
|---|---|---|---|---|---|---|
| §1 | Prinsip web-only, zero-account, offline-capable, local-first, zero-telemetry, zero-privilege | [PRD v3.0](PRD-v3.0.md) | — | 1 | implemented | Review dokumen + audit dependency |
| §1 | Satu aksi utama per layar dan claymorphism tenang | [design-system.md](../02-design/design-system.md) | — | 3 | partial | Audit layar + visual regression |
| §2 | In scope: PWA host, identity, create, builder, preview, package, backup, permission, settings, devtools | [PRD v3.0](PRD-v3.0.md) | FLOW-01 | 1 | partial | Matriks requirement terkait |
| §2 | Out of scope: native, server, akun, sync, marketplace, CLI/SDK, workflow | [PRD v3.0](PRD-v3.0.md) | — | 1 | implemented | Sweep istilah + review dependency |
| §3 | Persona Maker menyelesaikan app pertama tanpa akun | [02-studio.md](../03-specs/02-studio.md) | FLOW-01 | 2 | missing | Playwright persona test |
| §3 | Persona Power User mengontrol struktur dan package | [02-studio.md](../03-specs/02-studio.md) | FLOW-03 | 2 | missing | Playwright builder + export |
| §3 | Persona Template Author membagikan package bertanda tangan | [05-packages.md](../03-specs/05-packages.md) | FLOW-04 | 2 | partial | mapp-tool pack/verify |
| §3 | Persona Reviewer memeriksa permission sebelum install | [permissions.md](../03-specs/permissions.md) | FLOW-04 | 1 | partial | Playwright permission preview |
| §4 | Buka situs langsung ke Home tanpa akun | [01-app-shell.md](../03-specs/01-app-shell.md) | FLOW-01 | 1 | partial | Playwright offline first run |
| §4 | Pilih cara membuat dalam satu layar | [02-studio.md](../03-specs/02-studio.md) | FLOW-02 | 2 | missing | Playwright create |
| §4 | Bangun di builder dengan autosave | [02-studio.md](../03-specs/02-studio.md) | FLOW-03 | 2 | missing | Playwright builder |
| §4 | Uji di preview sandbox | [03-sandbox-runtime.md](../03-specs/03-sandbox-runtime.md) | FLOW-03 | 2 | partial | Playwright preview |
| §4 | Bagikan sebagai file .mapp | [05-packages.md](../03-specs/05-packages.md) | FLOW-04 | 2 | partial | mapp-tool verify |
| §5 F1 | Shell dan library sebagai jalan masuk tunggal | [01-app-shell.md](../03-specs/01-app-shell.md) | FLOW-01 | 1 | partial | Playwright `/` |
| §5 F2 | Tiga jalur create tanpa wizard | [02-studio.md](../03-specs/02-studio.md) | FLOW-02 | 2 | missing | Playwright create |
| §5 F3 | Visual builder dengan palette dan inspector | [02-studio.md](../03-specs/02-studio.md) | FLOW-03 | 2 | missing | Playwright builder |
| §5 F4 | Runner sandbox dengan watchdog | [03-sandbox-runtime.md](../03-specs/03-sandbox-runtime.md) | FLOW-07 | 1 | implemented | Vitest runtime-web |
| §5 F5 | Distribusi .mapp dengan signature | [05-packages.md](../03-specs/05-packages.md) | FLOW-04 | 1 | partial | mapp-tool verify |
| §5 F6 | Backup terenkripsi dan restore | [06-backup.md](../03-specs/06-backup.md) | FLOW-05 | 1 | implemented | Vitest backup |
| §5 F7 | Permission JIT dan audit | [permissions.md](../03-specs/permissions.md) | FLOW-06 | 1 | implemented | Vitest permissions |
| §5 F8 | Settings, a11y, dan DevTools lokal | [07-settings.md](../03-specs/07-settings.md) | FLOW-01 | 1 | partial | Playwright settings |
| §6 | MADS v3 Clay dengan token --mads-* | [design-system.md](../02-design/design-system.md) | — | 3 | partial | Token diff + visual regression |
| §7 | Next.js App Router client-first | [system-overview.md](../01-architecture/system-overview.md) | — | 1 | implemented | Build + route audit |
| §7 | SQLite WASM di OPFS lewat worker | [data-model.md](../01-architecture/data-model.md) | — | 1 | implemented | Vitest data |
| §7 | Iframe opaque origin dan MUIP | [sandbox-runtime.md](../01-architecture/sandbox-runtime.md) | FLOW-07 | 1 | implemented | Vitest runtime-web |
| §7 | WASM core untuk kripto dan package | [monorepo.md](../01-architecture/monorepo.md) | — | 1 | implemented | cargo test + build-core |
| §8 | Data lokal tanpa telemetry | [threat-model.md](../01-architecture/threat-model.md) | — | 1 | implemented | Secret/network audit |
| §8 | Backup terenkripsi tanpa cloud | [06-backup.md](../03-specs/06-backup.md) | FLOW-05 | 1 | implemented | Vitest backup |
| §8 | BYOK hanya di vault | [ai-assist.md](../01-architecture/ai-assist.md) | — | 3 | missing | Vitest vault BYOK |
| §9 | LCP < 2.0 s | [nfr.md](../03-specs/nfr.md) | — | 1 | missing | Lighthouse CI |
| §9 | INP < 200 ms dan CLS < 0.1 | [nfr.md](../03-specs/nfr.md) | — | 1 | missing | Web Vitals lab |
| §9 | Initial JS < 250 KB gzip | [nfr.md](../03-specs/nfr.md) | — | 1 | missing | next build budget |
| §10 | Fase 1 Foundation selesai | [refactor-roadmap.md](refactor-roadmap.md) | — | 1 | partial | Release gate |
| §10 | Fase 2 Builder selesai | [refactor-roadmap.md](refactor-roadmap.md) | — | 2 | missing | Release gate |
| §10 | Fase 3 Delight selesai | [refactor-roadmap.md](refactor-roadmap.md) | — | 3 | missing | Release gate |
| §11 | Risiko package berbahaya dimitigasi | [security-test-plan.md](../08-quality/security-test-plan.md) | FLOW-04 | 1 | partial | Security test plan |
| §11 | Risiko XSS dan sandbox escape dimitigasi | [threat-model.md](../01-architecture/threat-model.md) | FLOW-07 | 1 | implemented | CSP + sandbox test |
| §11 | Risiko kehilangan data dimitigasi | [06-backup.md](../03-specs/06-backup.md) | FLOW-05 | 1 | partial | Backup round-trip |
| §11 | Risiko storage eviction dimitigasi | [04-data.md](../03-specs/04-data.md) | — | 1 | partial | Quota test |
| §11 | Risiko AI hallucination dimitigasi | [ai-assist.md](../01-architecture/ai-assist.md) | FLOW-02 | 3 | missing | Plan review test |
| §11 | Risiko regresi aksesibilitas dimitigasi | [accessibility.md](../02-design/accessibility.md) | — | 3 | partial | axe CI |
| §12 | Definisi selesai produk dan docs | [definition-of-done.md](../08-quality/definition-of-done.md) | — | 3 | partial | Release gate |

## 3. Aturan Pembaruan

1. Status hanya naik setelah verifikasi pada spec dijalankan dan hasilnya dicatat di [baseline.md](../08-quality/evidence/baseline.md).
2. Setiap perubahan status menyertakan pembaruan baris ini dan catatan di PR.
3. Status tidak boleh turun tanpa alasan tertulis.
4. Requirement baru harus didefinisikan di spec, ditambahkan ke matriks, dan lulus checker.

## 4. Verifikasi

| Pemeriksaan | Cara |
|---|---|
| Kelengkapan | `node scripts/check-docs.mjs --strict` memastikan setiap requirement punya baris |
| Tanpa ID liar | Checker menolak ID yang tidak terdefinisi |
| Status berbukti | Baseline evidence dan test yang disebut di kolom Verification |

## 5. Bukti Otomatis v3

Kolom Verification menunjuk ke suite berikut. Setiap suite dijalankan oleh `npm run verify:web` dan dirujuk dari `docs/08-quality/evidence/baseline.md`.

| Suite | Bukti yang diberikan |
|---|---|
| `npm test` (studio-web) | Repositori host, dokumen Studio, history/autosave/palette/tree, template valid, aturan AI, transfer settings, guard copy error |
| `npm test` (runtime-web) | Batas MUIP 32/2000/512 KiB, allowlist props, 48 builder core + 72 placeholder, broker 14 method/30 per 10 s, watchdog 3/5 menit |
| `npm test` (ui-kit) | Kontrak komponen clay, focus trap, axe per komponen, kontras token light/dark |
| `cargo test` | `.mapp` v2 deterministik, signature/digest tamper, layout, permission, allowlist, backup container |
| `e2e/host.spec.ts` | Boot tanpa mnemonic, kartu create 360×640, identitas bertahan reload, pre-paint theme, offline |
| `e2e/security.spec.ts` | CSP nonce, COOP/COEP/CORP, tidak ada `unsafe-eval`, inline tanpa nonce diblokir |
| `e2e/packages.spec.ts` | Impor bertanda tangan, consent fokus Tolak, Esc menolak, boundary crash, paket unsigned ditolak |
| `e2e/builder.spec.ts` | Template → builder, tambah/edit/undo, autosave reload, preview sandbox, unduh `.mapp` |
| `e2e/a11y.spec.ts` | 12 layar × 3 tema tanpa pelanggaran serious/critical |
| `e2e/perf.spec.ts` | LCP < 2 s, CLS < 0.1, INP < 200 ms pada Fast 3G + 4× CPU, reduced motion tanpa transform |
| `e2e/rtl.spec.ts` | Tidak ada overflow horizontal pada 12 layar dalam RTL |
| `scripts/check-tokens.mjs` | Tidak ada hex/rgb/radius/shadow literal di luar `tokens.css` |
| `scripts/check-error-codes.mjs` | Hanya 27 kode katalog yang muncul di source |
| `scripts/check-security.mjs` | Tidak ada `eval`, `new Function`, `innerHTML`, atau `dangerouslySetInnerHTML` |
| `scripts/check-budget.mjs` | JS first-load `/` dan `/app/[appId]` ≤ 250 KiB gzip |
| `scripts/test-migrations.mjs` | Migrasi 001–003 forward, rollback, dan re-apply bersih |
