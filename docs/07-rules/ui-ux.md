---
id: RULE-UI
title: Aturan UI dan UX
status: accepted
owner: dx
prd_refs: ["§2.1", "§6"]
---

# Aturan UI dan UX

Aturan ini berlaku untuk seluruh permukaan Host, Studio, komponen `@microapp/ui-kit`, renderer MUIP web, dan widget Flutter. Sumber visual kanonik adalah MADS di [design-system.md](../02-design/design-system.md); katalog komponen dan ID `MADS-<CAT>-<NN>` ada di [component-catalog.md](../02-design/component-catalog.md).

## 1. Cakupan

| Area | Kewajiban utama |
|---|---|
| Token | Tanpa nilai visual hardcoded |
| Komponen | Katalog 120 komponen, state lengkap |
| Responsif | Breakpoint dan window mode |
| Motion | Durasi/easing token, reduced motion |
| Consent | Default deny, tanpa pre-check |
| Destruktif | Konfirmasi dan undo |
| Offline | Status offline sebagai state normal |
| Aksesibilitas | WCAG 2.2 AA, keyboard, screen reader |
| Internasionalisasi | ARB/JSON, RTL, pseudo-locale |

## 2. Aturan

### 2.1 Token dan Komponen

| ID | Level | Aturan | Konsekuensi |
|---|---|---|---|
| RULE-UI-001 | MUST | Warna, tipografi, spacing, radius, shadow, durasi, dan z-index MUST memakai token MADS; nilai hardcoded pada komponen, layar, atau micro-app dilarang. | Tema dan high-contrast rusak; review UI menolak. |
| RULE-UI-002 | MUST | Komponen baru MUST ditambahkan ke katalog 120 terlebih dahulu (ID, anatomi, varian, state, token, a11y), lalu diimplementasikan di web dan Flutter dengan perilaku setara. | Komponen liar tidak dapat diuji dan tidak konsisten; PR ditolak. |
| RULE-UI-003 | MUST | Setiap komponen interaktif MUST mendefinisikan state default, hover, focus, active, disabled, loading, error, dan empty bila relevan; state yang hilang dianggap bug. | Pengguna tidak mendapat umpan balik; test state gagal. |
| RULE-UI-004 | MUST | Setiap layar MUST menangani loading, empty, error, offline, dan permission-denied; state kosong MUST menawarkan aksi berikutnya, bukan hanya teks kosong. | Layar buntu saat offline atau error; acceptance tidak terpenuhi. |
| RULE-UI-005 | MUST | Ikon status MUST disertai label atau teks; warna MUST NOT menjadi satu-satunya pembeda status. | Buta warna dan high-contrast gagal; NFR-A11Y-004 dilanggar. |

### 2.2 Layout dan Motion

| ID | Level | Aturan | Konsekuensi |
|---|---|---|---|
| RULE-UI-006 | MUST | Layout MUST mengikuti breakpoint compact <600, medium 600–1023, expanded 1024–1439, dan large ≥1440 px, serta MUST NOT menghasilkan horizontal scroll pada lebar 320 px. | Layout rusak di perangkat kecil; uji responsif gagal. |
| RULE-UI-007 | MUST | Desktop MUST mendukung sidebar 280 px dan rail 72 px; mobile MUST memakai tab bar; peralihan window mode (split, tab, PiP) MUST mempertahankan state. | Navigasi tidak konsisten; flow multitasking gagal. |
| RULE-UI-008 | MUST | Motion MUST memakai durasi 120/180/240/320 ms dan easing `cubic-bezier(0.2,0,0,1)`; dengan `prefers-reduced-motion` atau `disableAnimations`, durasi MUST menjadi 0 tanpa kehilangan informasi. | NFR-A11Y-005 dilanggar; audit motion gagal. |
| RULE-UI-009 | MUST | Animasi dekoratif berulang, parallax, autoplay, dan getaran tanpa aksi pengguna dilarang. | Distraksi dan konsumsi baterai; review design menolak. |

### 2.3 Consent, Destruktif, dan Dark Pattern

| ID | Level | Aturan | Konsekuensi |
|---|---|---|---|
| RULE-UI-010 | MUST | Dialog permission MUST dirender Host, menampilkan nama app, permission ID, risk tier, alasan, dan opsi `Allow once`/`Allow`/`Deny`; default MUST `Deny` dan tanpa pre-check. | Consent tidak sah; SEC-015 dilanggar dan PR keamanan ditolak. |
| RULE-UI-011 | MUST | Aksi destruktif MUST meminta konfirmasi eksplisit dengan label aksi, menampilkan toast undo 10 detik, dan setelah itu aksi bersifat final serta tercatat di audit. | Kehilangan data tanpa pemulihan; flow destruktif gagal. |
| RULE-UI-012 | MUST | Dark pattern MUST NOT dipakai: tanpa countdown palsu, tombol menipu, pre-checked consent, unsubscribe tersembunyi, atau konfirmasi ganda yang mengarahkan. | Pelanggaran etika produk; PR ditolak. |
| RULE-UI-013 | MUST | Status offline MUST ditampilkan sebagai state normal yang tenang, bukan error, dan MUST menjelaskan fitur yang tetap berjalan serta yang tertunda. | Pengguna mengira aplikasi rusak; flow offline gagal. |

### 2.4 Aksesibilitas dan Keyboard

| ID | Level | Aturan | Konsekuensi |
|---|---|---|---|
| RULE-UI-014 | MUST | Seluruh alur inti MUST dapat diselesaikan hanya dengan keyboard; focus MUST terlihat, urutan focus logis, dan focus MUST kembali ke pemicu setelah dialog ditutup. | NFR-A11Y-002 dilanggar; audit keyboard gagal. |
| RULE-UI-015 | MUST | Setiap kontrol MUST memiliki nama, role, dan state yang terbaca screen reader; perubahan status MUST diumumkan via live region; heading MUST hierarkis. | NFR-A11Y-003 dilanggar; uji NVDA/VoiceOver gagal. |
| RULE-UI-016 | MUST | Rasio kontras MUST ≥ 4,5:1 untuk teks dan ≥ 3:1 untuk komponen non-teks pada seluruh tema, termasuk dark, AMOLED, dan high-contrast. | NFR-A11Y-004 dilanggar; alat kontras gagal. |
| RULE-UI-017 | MUST | Target sentuh MUST minimal 24×24 px dan SHOULD 44×44 px pada aksi utama; zoom 200% MUST tidak memotong konten atau kontrol. | Pengguna motorik terhambat; audit a11y gagal. |

### 2.5 Internasionalisasi dan Konten

| ID | Level | Aturan | Konsekuensi |
|---|---|---|---|
| RULE-UI-018 | MUST | String UI MUST berasal dari locale resource (`locales/<locale>/<namespace>.json` atau ARB), tanpa konkatenasi kalimat; `id-ID` dan `en-US` MUST lengkap dan RTL MUST tercermin benar. | NFR-I18N-001/002 dilanggar; pseudo-locale test gagal. |
| RULE-UI-019 | MUST | Pesan error MUST mengikuti formula "apa yang terjadi + mengapa + langkah berikut", memakai kode `E-*`, tanpa jargon internal dan tanpa menyalahkan pengguna. | Pengguna tidak dapat memulihkan diri; content review menolak. |
| RULE-UI-020 | SHOULD | Data padat MUST memakai tabel, filter, dan saved view; empty state MUST menawarkan pembuatan data atau impor; angka dan tanggal MUST diformat sesuai locale. | Alur kerja lambat dan tidak konsisten antar-locale. |

## 3. Pengecualian dan Penegakan

1. Setiap layar baru MUST melewati review design dan a11y sebelum merge; screenshot atau rekaman wajib dilampirkan pada PR.
2. Perubahan token MUST mengubah [design-system.md](../02-design/design-system.md) lebih dulu; token baru tanpa dokumentasi ditolak.
3. Micro-app MUST NOT mengganti chrome, dialog consent, atau indikator keamanan Host; tema micro-app hanya berlaku di dalam renderer-nya.
4. Audit axe dan keyboard-only dijalankan pada setiap PR UI; temuan serius/kritis adalah blocker.

## 4. Referensi

- [design-system.md](../02-design/design-system.md) — token, tema, breakpoint.
- [component-catalog.md](../02-design/component-catalog.md) — 120 komponen dan anatomi.
- [screen-specs.md](../02-design/screen-specs.md) — 22 layar dan state.
- [interaction-patterns.md](../02-design/interaction-patterns.md) — DnD, palette, gesture, toast.
- [accessibility.md](../02-design/accessibility.md) — checklist WCAG 2.2 AA.
- [content-i18n.md](../02-design/content-i18n.md) — voice, tone, dan struktur locale.
