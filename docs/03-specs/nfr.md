---
id: SPEC-NFR
title: Non-Functional Requirements
status: accepted
owner: qa
prd_refs: ["§9 Non-Functional"]
---

# Non-Functional Requirements

## 1. Tujuan

Menetapkan 12 target non-fungsional yang terukur untuk produk web-only: performa, aksesibilitas, internasionalisasi, reliabilitas offline, dan pemeliharaan dokumentasi. Angka di sini adalah kontrak final; PRD hanya menyebut target produk.

## 2. Ruang Lingkup

Di dalam: LCP, INP, CLS, ukuran JS awal, latensi builder, WCAG, keyboard, reduced motion, locale, RTL, offline shell, docs check. Di luar: budget server (tidak ada server wajib) dan benchmark native (tidak ada native).

## 3. Requirement

| ID | Level | Requirement | Acceptance |
|---|---|---|---|
| NFR-PERF-001 | MUST | LCP halaman `/` < 2.0 s pada perangkat referensi (Moto G4 setara, Fast 3G). | Lighthouse CI mengukur p75 < 2.0 s pada tiga run. |
| NFR-PERF-002 | MUST | INP < 200 ms untuk interaksi shell dan builder. | Web Vitals lab: p75 < 200 ms pada skenario uji. |
| NFR-PERF-003 | MUST | CLS < 0.1 pada semua layar utama. | Tidak ada pergeseran skeleton ke konten > 0.1. |
| NFR-PERF-004 | MUST | Initial JS < 250 KB gzip untuk route `/` dan runner. | `next build` report dan budget check gagal bila melebihi. |
| NFR-PERF-005 | MUST | Operasi builder (tambah, pindah, ubah properti) < 50 ms per operasi. | Profil React DevTools: commit < 50 ms pada 200 node. |
| NFR-A11Y-001 | MUST | Seluruh layar memenuhi WCAG 2.2 AA. | axe tanpa pelanggaran serius; audit manual kontras dan fokus. |
| NFR-A11Y-002 | MUST | Seluruh alur inti dapat diselesaikan keyboard-only. | Uji manual dan Playwright keyboard untuk create, edit, install, consent. |
| NFR-A11Y-003 | MUST | `prefers-reduced-motion: reduce` menghapus transform dan durasi animasi menjadi 0 ms. | Computed style: tidak ada transition/animation transform. |
| NFR-I18N-001 | MUST | String tersedia lengkap untuk `id-ID` dan `en-US`. | Kunci kamus identik; tidak ada string hardcoded di komponen. |
| NFR-I18N-002 | MUST | Layout RTL tidak terpotong dan arah ikon mengikuti. | Snapshot RTL untuk 12 layar tanpa overflow. |
| NFR-REL-001 | MUST | Shell dan app terpasang dapat dibuka offline setelah satu kunjungan. | Playwright offline: reload, buka app, data terbaca. |
| NFR-MAINT-001 | MUST | `npm run docs:check` lulus tanpa error dan tanpa warning. | CI job docs menjalankan `--strict` dan exit 0. |

## 4. Metode Ukur

| Kelas | Alat | Kondisi |
|---|---|---|
| LCP/CLS/INP | Lighthouse CI dan Web Vitals di Playwright | Build produksi, throttle Fast 3G, CPU 4x. |
| Ukuran JS | `next build` manifest + skrip budget | Gzip, route per route. |
| Builder latency | React Profiler | Dokumen 200 node, 20 operasi. |
| A11y | axe-core + audit manual | Light, dark, high-contrast, RTL. |
| Offline | Playwright context offline | Setelah satu kunjungan sukses. |
| Docs | `node scripts/check-docs.mjs --strict` | Repository bersih. |

## 5. Anggaran dan Konsekuensi

Melebihi budget memblokir rilis. Pengecualian harus dicatat di PR dengan alasan, pengukuran sebelum/sesudah, dan rencana perbaikan. Tidak ada pengecualian permanen untuk NFR-A11Y-001 dan NFR-MAINT-001.

## 7. Acceptance Criteria

1. Semua angka pada §3 diukur pada build produksi dan dicatat di baseline evidence.
2. Tidak ada route yang melebihi budget JS tanpa pengecualian tertulis.
3. axe bersih pada 12 layar di tiga tema.
4. Offline reload berhasil untuk shell dan minimal satu app terpasang.
5. Docs check strict lulus di CI.

### 7.1 Catatan Baseline

1. Baseline evidence memuat hasil per NFR dengan status pass/fail.
2. Setiap kegagalan memiliki issue atau pengecualian yang disetujui.

## 8. Verifikasi

| Pemeriksaan | Cara |
|---|---|
| Lighthouse | `npm run e2e` dengan proyek lighthouse, ambil p75. |
| Bundle | `next build` dan skrip budget pada CI. |
| axe | Playwright + `@axe-core/playwright` untuk 12 layar. |
| Reduced motion | Playwright `emulateMedia({ reducedMotion: 'reduce' })`. |
| Offline | Playwright context offline. |
| Docs | `npm run docs:check`. |
