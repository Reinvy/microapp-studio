---
id: RULE-DART
title: Aturan Flutter
status: accepted
owner: dx
prd_refs: ["§7.1", "§3 Modul 1"]
---

# Aturan Flutter

Aturan ini berlaku untuk `apps/host-flutter` (Host native Android, iOS, Linux, Windows, macOS), `packages/runtime-native` (binding QuickJS/Wasmtime), dan bagian Flutter dari `packages/ui-kit`. Host mobile tidak memuat Studio; desktop memuat build Studio lokal di webview ter-hardening.

## 1. Cakupan

| Area | Kewajiban utama |
|---|---|
| Lint | `flutter_lints`, analyzer tanpa warning |
| Arsitektur | State terpisah dari widget, tanpa duplikasi core |
| FFI | Binding generated, isolate untuk kerja berat |
| UI | Token MADS, golden test, a11y, i18n |
| Keamanan | Tanpa rahasia di Dart, tanpa log sensitif |

## 2. Aturan

### 2.1 Lint dan Struktur

| ID | Level | Aturan | Konsekuensi |
|---|---|---|---|
| RULE-DART-001 | MUST | `analysis_options.yaml` MUST menyertakan `flutter_lints` dan aturan tambahan proyek; `flutter analyze` MUST selesai tanpa warning atau error. | Analyzer gagal; PR ditolak. |
| RULE-DART-002 | MUST | Widget MUST NOT memuat logika bisnis, akses database, atau panggilan FFI langsung; widget hanya membaca state dan mengirim intent ke controller/service. | Logika tidak dapat diuji dan UI terikat platform; review arsitektur menolak. |
| RULE-DART-003 | MUST | State yang hanya memengaruhi satu widget MUST memakai `setState`; state lintas widget MUST berada di controller/notifier terpisah dan tidak boleh disimpan sebagai field global yang dapat berubah. | Rebuild berlebih dan state tidak sinkron; test widget gagal. |
| RULE-DART-004 | MUST | Navigasi MUST memakai satu tabel route dan deep link yang sama dengan skema `microapp://`; navigasi ad hoc melalui `Navigator.push` dengan string route bebas dilarang. | Deep link tidak konsisten dan state tidak dapat dipulihkan; test flow gagal. |

### 2.2 Core, FFI, dan Isolate

| ID | Level | Aturan | Konsekuensi |
|---|---|---|---|
| RULE-DART-005 | MUST | Kriptografi, verifikasi signature, parser `.mapp`, HLC/CRDT, dan guard sandbox MUST NOT diimplementasikan di Dart; seluruhnya MUST memanggil `microapp-core` melalui `flutter_rust_bridge`. | Dua implementasi menyimpang; PR ditolak. |
| RULE-DART-006 | MUST | Binding FFI MUST dihasilkan dari crate dan MUST dipatok ke versi crate; marshaling manual untuk tipe kontrak dilarang. | ABI mismatch menyebabkan crash; build native gagal. |
| RULE-DART-007 | MUST | Pekerjaan yang berpotensi melebihi satu frame (parsing paket, hashing, query besar, AI) MUST dijalankan di isolate atau worker, bukan di UI isolate. | UI freeze melanggar NFR-PERF-004; profiling gagal. |
| RULE-DART-008 | MUST | Platform channel hanya boleh dipakai bila FFI atau plugin resmi tidak tersedia; channel MUST bertipe, berversi, dan memetakan error platform ke kode `E-*`. | Error platform tidak tertangani dan bocor ke UI; review menolak. |
| RULE-DART-009 | MUST | Isolate, stream subscription, timer, dan controller MUST dihentikan pada `dispose`; listener global MUST memiliki pemilik yang jelas. | Kebocoran memori dan callback setelah dispose; test lifecycle gagal. |

### 2.3 UI, Tema, dan Aksesibilitas

| ID | Level | Aturan | Konsekuensi |
|---|---|---|---|
| RULE-DART-010 | MUST | Warna, ukuran font, spacing, radius, shadow, dan durasi MUST berasal dari token MADS melalui `ThemeExtension`; nilai hardcoded dilarang. | Tema tidak konsisten dan high-contrast gagal; review UI menolak. |
| RULE-DART-011 | MUST | Setiap komponen MADS MUST memiliki golden test untuk varian dan state wajib (default, focus, disabled, loading, error, dark, high-contrast); golden diperbarui hanya melalui perintah yang ditinjau. | Perubahan visual tidak terdeteksi; PR UI ditolak. |
| RULE-DART-012 | MUST | Setiap layar MUST memiliki widget test untuk state loading, empty, error, dan offline; flow kritis MUST memiliki integration test. | Regresi UI tidak tertangkap; acceptance tidak terpenuhi. |
| RULE-DART-013 | MUST | Kontrol MUST memiliki `Semantics` label/role/state, target minimal 24×24 px, dukungan text scale 200%, focus keyboard, dan urutan baca yang benar. | Audit TalkBack/VoiceOver gagal; PR a11y ditolak. |
| RULE-DART-014 | MUST | String UI MUST berasal dari ARB; string hardcoded, penggabungan kalimat manual, dan format tanggal/angka lokal dilarang. | Terjemahan tidak lengkap dan RTL rusak; test i18n gagal. |
| RULE-DART-015 | MUST | Animasi MUST memakai durasi dan easing token serta MUST menghormati `MediaQuery.disableAnimations`; animasi dekoratif berulang dilarang. | Reduced motion dilanggar; NFR-A11Y-005 gagal. |
| RULE-DART-016 | SHOULD | Build list besar MUST memakai `ListView.builder`/`SliverList`; widget `const` dan `RepaintBoundary` dipakai pada hotspot yang terukur. | Frame drop pada daftar panjang. |

## 3. Pengecualian dan Penegakan

1. Perubahan yang menyentuh bridge native MUST menjalankan test pada minimal satu perangkat/emulator Android dan satu iOS atau desktop; hasil dicatat di PR.
2. Golden test yang berubah karena perubahan token MUST disertai perubahan dokumen design system.
3. Rahasia MUST NOT berada di kode Dart, asset, atau log; kredensial hanya dibaca dari secure storage atau Vault.
4. Pelanggaran RULE-DART-005, RULE-DART-006, RULE-DART-010, atau RULE-DART-013 MUST NOT diberi pengecualian sementara.

## 4. Referensi

- [monorepo.md](../01-architecture/monorepo.md) — batas paket dan lisensi.
- [sandbox-capabilities.md](../01-architecture/sandbox-capabilities.md) — runtime native QuickJS/Wasmtime.
- [design-system.md](../02-design/design-system.md) — token dan pemetaan `ThemeExtension`.
- [accessibility.md](../02-design/accessibility.md) — kriteria WCAG per layar.
- [security.md](security.md) — kebijakan rahasia dan kriptografi.
