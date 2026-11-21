---
id: ADR-0017
title: "ADR-0017: Web-Only Next.js PWA"
status: accepted
owner: architecture
prd_refs: ["§2", "§7"]
---

# ADR-0017: Web-Only Next.js PWA

## Konteks

MicroApp Studio harus dapat dipakai tanpa instalasi, tanpa akun, dan tanpa server wajib. Sasaran perangkat adalah browser desktop, tablet, dan mobile modern. Sebelumnya ruang lingkup mencakup aplikasi native, webview native, server self-host, dan bundel desktop; variasi itu melipatgandakan permukaan uji, distribusi, dan kriptografi tanpa menambah nilai bagi pembuatan micro-app.

Kebutuhan produk yang mengikat:

1. Satu codebase, satu rilis, satu jalur distribusi.
2. Buka URL, langsung dapat membuat micro-app; tidak ada login.
3. Shell dan micro-app terpasang tetap dapat dibuka offline setelah satu kunjungan.
4. Tidak ada data pengguna yang dikirim ke backend milik proyek.

## Keputusan

1. Produk adalah **PWA web-only** yang dibangun dengan Next.js 16 App Router, React 19, TypeScript strict, dan Tailwind v4.
2. Seluruh logika produk berjalan client-side. Tidak ada backend wajib, tidak ada akun, tidak ada cloud sync, dan tidak ada API milik proyek.
3. Deployment memakai Vercel atau Node host untuk serving aset, atau static export bila semua fitur terpenuhi client-side. Tidak ada container, cluster, atau database server.
4. Shell memakai route App Router: `/`, `/app/[appId]`, `/studio/[projectId]`, `/templates`, `/packages`, `/settings/*`, dan `/dev/tools`. Route adalah lapisan navigasi; data tetap lokal di browser.
5. Service worker menyimpan app shell dan aset statis dengan strategi cache-first untuk aset berversi dan network-first untuk dokumen HTML. Micro-app terpasang memakai aset dari OPFS.
6. Responsif adalah satu layout adaptif: sidebar 264 px pada desktop, rail 80 px pada tablet, bottom dock pada mobile. Tidak ada aplikasi terpisah per platform.
7. Batas platform ditulis eksplisit: tidak ada Flutter, aplikasi Android/iOS, bundel desktop, webview native, Go server, CRDT, atau P2P. Istilah tersebut hanya boleh muncul sebagai pernyataan di luar ruang lingkup.
8. Fitur browser yang tidak tersedia (misalnya OPFS pada konteks privat tertentu) menyebabkan mode terdegradasi yang terlihat, bukan fallback diam-diam ke backend.

Rujukan kontrak: [system-overview](../system-overview.md), [monorepo](../monorepo.md), [app shell](../../03-specs/01-app-shell.md).

## Konsekuensi

- Satu pipeline build, satu matriks uji browser (Chromium, Firefox, WebKit), dan satu jalur rollback.
- Ukuran bundle menjadi anggaran produk, bukan detail implementasi; initial JS dibatasi pada [NFR](../../03-specs/nfr.md).
- Kemampuan yang bergantung pada API browser harus dijaga dengan feature detection dan pesan yang jelas.
- Tidak ada sinkronisasi antar perangkat; pemindahan data dilakukan lewat ekspor/impor `.mapp` dan `.mapp-backup`.
- Tim tidak memelihara SDK, CLI, atau host native; seluruh kontribusi diarahkan ke `apps/studio-web` dan package web.
- Kinerja pada perangkat kelas menengah menjadi kriteria rilis, bukan optimasi lanjutan.

## Alternatif

| Alternatif | Alasan ditolak |
|---|---|
| Aplikasi native + web | Dua codebase, dua rilis, dan perilaku sandbox yang berbeda; tidak sejalan dengan zero-install. |
| Web shell + server wajib | Melanggar zero-account dan menambah permukaan serangan serta biaya operasi. |
| Bundel desktop (Electron/Tauri) | Distribusi dan update lebih berat; tidak memberi kemampuan baru yang dibutuhkan. |
| Static export murni tanpa App Router | Kehilangan routing, streaming, dan segmentasi yang dipakai shell. |

## Verifikasi

1. `node scripts/check-docs.mjs --strict` tidak menemukan path atau istilah platform lama pada dokumen aktif.
2. Build menghasilkan output App Router tanpa route server yang wajib.
3. Audit route memastikan tidak ada endpoint API milik proyek.
4. Uji offline memastikan shell dan app terpasang terbuka setelah satu kunjungan.
5. Tinjauan rilis memastikan tidak ada dependensi native atau server yang ditambahkan.
