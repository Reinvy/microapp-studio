---
id: AGENT-HANDOFF
title: Prompt Handoff
status: accepted
owner: dx
prd_refs: ["§1", "§12"]
---

# Prompt Handoff

Dokumen ini menyediakan context package dan prompt siap pakai untuk menyerahkan pekerjaan antar peran atau dari agen ke manusia. Prompt MUST dapat dijalankan tanpa akses ke percakapan sebelumnya.

## 1. Prinsip

1. **Mandiri.** Penerima menyelesaikan tugas hanya dari prompt dan berkas yang ditunjuk.
2. **Berbasis path.** Rujukan memakai path repo; kutipan isi hanya bila berkas tidak dapat diakses.
3. **Dapat diverifikasi.** Acceptance ditulis sebagai hasil yang dapat diamati dan perintah yang harus dijalankan.
4. **Minimal.** Context package muat dalam satu halaman; detail dipindahkan ke dokumen hulu yang ditautkan.
5. **Tanpa keputusan tersembunyi.** Pertanyaan terbuka ditulis eksplisit, bukan diserahkan pada tebakan penerima.

## 2. Context Package

Setiap handoff MUST memuat field berikut.

| Field | Isi | Aturan |
|---|---|---|
| Tujuan | Satu kalimat hasil akhir | Kata kerja dan objek terukur |
| Path | Berkas yang boleh diubah dan yang hanya dibaca | Relatif dari root repo |
| Kontrak | Requirement, acceptance, interface | Tautkan spec dan flow |
| Acceptance | Kondisi lulus yang dapat diamati | Minimal satu, daftar periksa |
| Verifikasi | Perintah yang harus lulus | Perintah nyata, bukan "test manual" |
| Batasan | Invariant yang tidak boleh dilanggar | Tanpa native/server, token clay, a11y |
| Terbuka | Pertanyaan yang belum dijawab | Kosongkan hanya bila benar-benar tidak ada |

Aturan umum untuk semua handoff:

- Micro-app berjalan di iframe sandbox; tidak ada eksekusi kode arbitrer, `eval`, atau HTML mentah.
- Tidak ada akun, cloud sync, telemetri, atau layanan pihak ketiga.
- Warna, bayangan, radius, spacing, dan motion hanya dari token `--mads-*`; sumber visual adalah `DESIGN.md`.
- Target aksesibilitas WCAG 2.2 AA dan alur inti selesai dengan keyboard.

## 3. Template Frontend

```text
KONTEKS
Repo: microapp-studio (web-only PWA Next.js 16 App Router, React 19, TypeScript strict).
Baca dulu: docs/README.md → docs/00-foundation/PRD-v3.0.md → docs/00-foundation/implementation-status.md.

TUJUAN
<isi: satu kalimat, mis. "Tambahkan empty state Home dengan tiga jalur create".>

PATH
Boleh diubah:
- apps/studio-web/src/app/**
- apps/studio-web/src/components/**
- packages/ui-kit/src/**
- docs/04-flows/<flow>.md (hanya jika alur berubah)
Hanya dibaca:
- docs/03-specs/01-app-shell.md
- docs/02-design/screen-specs.md
- docs/02-design/component-catalog.md
- docs/07-rules/typescript.md
- docs/07-rules/ui-ux.md
- DESIGN.md

KONTRAK
- Spec: docs/03-specs/01-app-shell.md (FR-SHELL-007 untuk empty state; FR-SHELL-004 untuk grid).
- Layar: docs/02-design/screen-specs.md SCR-02 Home/Library.
- Komponen core: EmptyState (FBK), Card (LAY), Button (INP).
- Flow: docs/04-flows/01-first-run.md.

ACCEPTANCE
- Empty state menampilkan tiga jalur: Template, Magic Create, Mulai kosong.
- Setiap jalur dapat dicapai dengan Tab dan Enter; tidak ada modal nama project.
- State loading, error, dan offline tampil sesuai screen spec.
- Tidak ada warna, bayangan, atau radius hardcoded di luar token --mads-*.
- Layout tidak pecah pada 360 px, 768 px, dan 1440 px.

VERIFIKASI
- npm test
- npm run typecheck
- npm run lint
- npm run docs:check

BATASAN
- Tanpa akun, cloud sync, telemetri, atau panggilan jaringan baru.
- Tanpa eval, new Function, innerHTML, atau CSS mentah.
- Jangan mengubah package.json atau skrip build.

TERBUKA
<kosongkan atau tulis pertanyaan yang belum terjawab.>
```

## 4. Template Runtime

```text
KONTEKS
Repo: microapp-studio. Micro-app berjalan di iframe sandbox="allow-scripts" dengan renderer MUIP dan bridge broker.
Baca dulu: docs/01-architecture/sandbox-runtime.md → docs/03-specs/03-sandbox-runtime.md → docs/03-specs/host-bridge.md.

TUJUAN
<isi, mis. "Tambahkan watchdog yang menghentikan iframe setelah 5 detik tanpa heartbeat".>

PATH
Boleh diubah:
- packages/runtime-web/src/sandbox/**
- packages/runtime-web/src/bridge/**
- packages/runtime-web/src/muip/**
Hanya dibaca:
- docs/03-specs/03-sandbox-runtime.md
- docs/03-specs/permissions.md
- docs/03-specs/error-codes.md
- docs/01-architecture/host-bridge-intents.md
- docs/07-rules/security.md

KONTRAK
- Requirement: FR-RUN-008 (watchdog), FR-RUN-009 (error boundary), FR-RUN-010 (restart budget).
- Bridge: dokumentasi metode, parameter, timeout, dan rate limit di docs/03-specs/host-bridge.md.
- Kode error yang dipakai harus terdaftar di docs/03-specs/error-codes.md.

ACCEPTANCE
- Freeze atau loop tak berujung terdeteksi dan iframe dihentikan tanpa memblokir Host.
- Boundary menawarkan muat ulang, ekspor data, dan kembali ke Home.
- Maksimal 3 restart per 5 menit; setelah itu tombol muat ulang nonaktif dengan penjelasan.
- Permission diperiksa pada setiap panggilan bridge; tidak ada jalur bypass.
- Bila sandbox tidak tersedia, runtime gagal tertutup, bukan menjalankan alternatif.

VERIFIKASI
- npm test
- npm run typecheck
- npm run lint
- npm run build

BATASAN
- Tidak ada eksekusi di DOM Host dan tidak ada HTML/CSS/JS arbitrer.
- Tidak menambah permission baru tanpa spec dan RFC.
- Log tidak memuat data pengguna atau secret.

TERBUKA
<...>
```

## 5. Template Data

```text
KONTEKS
Repo: microapp-studio. Data lokal memakai SQLite WASM di OPFS melalui worker; IndexedDB hanya untuk CryptoKey dan metadata.
Baca dulu: docs/01-architecture/data-model.md → docs/03-specs/04-data.md → docs/07-rules/data-migrations.md.

TUJUAN
<isi, mis. "Tambahkan DB terisolasi per app untuk runner".>

PATH
Boleh diubah:
- apps/studio-web/src/db/**
- apps/studio-web/src/workers/**
- packages/core-rust/src/storage/** (bila parser atau format ikut berubah)
Hanya dibaca:
- docs/03-specs/04-data.md
- docs/03-specs/06-backup.md
- docs/01-architecture/data-model.md
- docs/07-rules/data-migrations.md

KONTRAK
- Requirement: FR-DATA-001, FR-DATA-002, FR-DATA-004, FR-DATA-005.
- Nama DB deterministik dari app_id dan workspace_id.
- Migrasi bernomor dengan snapshot sebelum apply dan rollback yang diuji.

ACCEPTANCE
- DB per app dibuat dan dibuka hanya untuk app pemiliknya.
- Migrasi forward dan rollback lulus pada fixture.
- Query lintas workspace ditolak.
- Ekspor JSON/CSV tetap dapat dibaca setelah migrasi.
- Tidak ada penggunaan Dexie untuk data baru.

VERIFIKASI
- npm test
- npm run typecheck
- npm run lint
- npm run e2e (bila alur runner tersentuh)

BATASAN
- Tidak ada sinkronisasi cloud atau antar-perangkat.
- Tidak ada penghapusan data tanpa konfirmasi eksplisit.
- Tidak mengubah format .mapp-backup tanpa versi baru.
```

## 6. Template Design

```text
KONTEKS
Repo: microapp-studio. Bahasa visual adalah claymorphism MADS v3; token CSS berprefix --mads-.
Baca dulu: DESIGN.md → docs/02-design/design-system.md → docs/02-design/component-catalog.md.

TUJUAN
<isi, mis. "Spesifikasikan komponen core ConfirmDialog".>

PATH
Boleh diubah:
- DESIGN.md
- docs/02-design/design-system.md
- docs/02-design/component-catalog.md
- docs/02-design/interaction-patterns.md
Hanya dibaca:
- docs/02-design/accessibility.md
- docs/02-design/screen-specs.md
- docs/03-specs/01-app-shell.md

KONTRAK
- Token kanonik: bg, surface, surface-raised, fg, muted, border, border-strong, primary, on-primary, accent, success, warning, error, info, focus.
- Radius clay-sm 14px, md 20px, lg 28px, xl 36px, full 9999px.
- Motion 120/180/240/320 ms dengan easing cubic-bezier(.34,1.56,.64,1).
- Katalog harus tetap 120 komponen; 48 core dispesifikasikan penuh.

ACCEPTANCE
- Anatomi, props, dan state lengkap: default, hover, focus-visible, pressed, disabled, loading, error.
- Setiap nilai visual menunjuk token, bukan hex atau nilai bebas.
- Kontras teks >= 4.5:1, focus ring 3 px, target sentuh >= 44 px.
- Contoh copy Bahasa Indonesia dan Inggris konsisten dengan docs/02-design/content-i18n.md.
- Tidak ada perubahan jumlah atau ID komponen.

VERIFIKASI
- npm run docs:check
- node scripts/generate-catalog.mjs --check
```

## 7. Template Security

```text
KONTEKS
Repo: microapp-studio. Model ancaman web: XSS/CSP, sandbox escape, paket jahat, eksfiltrasi storage, supply chain, kebocoran BYOK.
Baca dulu: docs/01-architecture/threat-model.md → docs/03-specs/permissions.md → docs/07-rules/security.md.

TUJUAN
<isi, mis. "Tinjau jalur konsen permission untuk bridge intent".>

PATH
Boleh diubah:
- docs/01-architecture/threat-model.md
- docs/03-specs/permissions.md
- docs/08-quality/security-test-plan.md
- packages/runtime-web/src/bridge/** (hanya bila mitigasi memerlukan perubahan kode)
Hanya dibaca:
- docs/03-specs/host-bridge.md
- docs/01-architecture/package-distribution.md
- SECURITY.md

KONTRAK
- Zero privilege default; permission dideklarasikan di manifest dan diminta just-in-time.
- Consent menyediakan izinkan sekali, selalu izinkan, dan tolak; fokus awal pada tolak.
- CSP ketat + COOP/COEP; iframe memakai opaque origin.
- Package wajib signature valid; public key mismatch memicu peringatan keras.

ACCEPTANCE
- Setiap jalur baru memiliki mitigasi tertulis dan kode error yang sesuai.
- Tidak ada secret di source, log, fixture, atau dokumen.
- Audit lokal mencatat grant, revoke, dan penolakan.
- Tidak ada telemetri atau beacon jaringan default.

VERIFIKASI
- npm test
- npm run typecheck
- npm run build
- npm run docs:check
```

## 8. Template QA

```text
KONTEKS
Repo: microapp-studio. Test stack: Vitest untuk unit/component, Playwright untuk E2E, axe untuk aksesibilitas.
Baca dulu: docs/08-quality/test-strategy.md → docs/08-quality/definition-of-done.md → docs/08-quality/release-gates.md.

TUJUAN
<isi, mis. "Buktikan empty state Home memenuhi acceptance dan catat evidence".>

PATH
Boleh diubah:
- apps/studio-web/**/*.test.ts(x)
- apps/studio-web/e2e/**
- docs/08-quality/evidence/baseline.md dan baseline.json
Hanya dibaca:
- docs/03-specs/01-app-shell.md
- docs/04-flows/01-first-run.md
- docs/02-design/accessibility.md

KONTRAK
- Satu test per acceptance yang dapat diamati; jangan menguji detail implementasi.
- Test harus deterministik: tanpa jaringan eksternal, waktu tetap, dan data fixture lokal.
- Status di matriks hanya naik bila test nyata lulus.

ACCEPTANCE
- Acceptance yang diminta tercakup minimal satu test.
- Alur inti lulus keyboard-only dan lolos axe tanpa pelanggaran serius.
- Offline setelah satu kunjungan tetap membuka shell dan app terpasang.
- Evidence mencatat perintah, hasil, dan timestamp.

VERIFIKASI
- npm test
- npm run typecheck
- npm run e2e
- npm run verify:web
```

## 9. Template Docs

```text
KONTEKS
Repo: microapp-studio. Dokumentasi adalah kontrak; checker memvalidasi frontmatter, H1, tautan, ID, matriks, dan reachability.
Baca dulu: docs/README.md → docs/00-foundation/sdd-workflow.md → docs/07-rules/documentation.md.

TUJUAN
<isi, mis. "Selaraskan indeks dan matriks setelah perubahan flow create".>

PATH
Boleh diubah:
- docs/**
- docs/templates/**
Hanya dibaca:
- docs/00-foundation/PRD-v3.0.md
- docs/00-foundation/prd-compliance-matrix.md
- docs/08-quality/evidence/baseline.md

KONTRAK
- Setiap dokumen memiliki frontmatter id, title, status, owner, prd_refs; status accepted.
- H1 sama dengan title; tanpa nomor.
- Hanya ID requirement dan error code yang terdaftar yang boleh dirujuk.
- Setiap dokumen harus terjangkau dari docs/README.md.
- Istilah platform yang tidak ada hanya boleh muncul dalam pernyataan di luar cakupan.

ACCEPTANCE
- node scripts/check-docs.mjs --strict melaporkan 0 error dan 0 warning.
- Tidak ada tautan mati, anchor rusak, atau dokumen yatim.
- Matriks memuat satu baris per requirement dengan status sesuai evidence.
- Tidak ada placeholder terlarang di luar code fence.

VERIFIKASI
- npm run docs:check
- node scripts/generate-catalog.mjs --check
```

## 10. Penutup

Penerima handoff MUST membalas dengan: pemahaman satu paragraf, daftar path yang akan diubah, dan pertanyaan terbuka bila ada. Bila prompt tidak cukup untuk mulai, penerima mengembalikan pertanyaan spesifik ke pengirim; tidak menebak requirement baru.
