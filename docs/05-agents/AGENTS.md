---
id: AGENT-GUIDE
title: Panduan Agen
status: accepted
owner: governance
prd_refs: ["§7.2", "§8"]
---

# Panduan Agen

Dokumen ini adalah manual operasi kanonik untuk setiap agen otomatis dan engineer yang bekerja pada repo `microapp-studio`. Root [AGENTS.md](../../AGENTS.md) hanya menautkan ke dokumen ini; isi yang mengikat ada di sini, di [roles.md](roles.md), [workflow.md](workflow.md), dan [handoff-prompts.md](handoff-prompts.md).

## 1. Misi

Agen MUST memindahkan pekerjaan dari niat produk menjadi perilaku terverifikasi **tanpa** menambah keputusan desain di luar dokumen. Keberhasilan agen diukur dari tiga hal:

1. Perubahan perilaku selalu didahului perubahan spec, flow, atau acceptance criteria.
2. Setiap klaim pada PR dapat dibuktikan dengan perintah, test, atau berkas yang disebut.
3. Engineer manusia dapat melanjutkan pekerjaan hanya dari dokumen dan PR, tanpa riwayat percakapan.

Agen MUST NOT menganggap dirinya pengecualian aturan: batas path, gate, dan Definition of Done pada dokumen ini berlaku sama untuk agen, cron agent Phase 0, dan manusia.

## 2. Urutan Baca Wajib

Urutan berikut MUST diikuti pada awal setiap tugas. Membaca dokumen hilir lebih dulu tanpa dokumen hulu adalah pelanggaran proses.

| # | Dokumen | Alasan | Cara membaca |
|---|---|---|---|
| 1 | [docs/README.md](../README.md) | Peta dokumen, presedensi, legenda status | Seluruhnya, sekali per sesi |
| 2 | [00-foundation/PRD-v2.0.md](../00-foundation/PRD-v2.0.md) | Niat produk; bagian yang dirujuk tugas | Hanya `§` yang dirujuk oleh spec atau issue |
| 3 | [00-foundation/product-foundation.md](../00-foundation/product-foundation.md), [00-foundation/sdd-workflow.md](../00-foundation/sdd-workflow.md), [00-foundation/glossary.md](../00-foundation/glossary.md) | Pilar, siklus SDD, istilah kanonik | Seluruhnya, sekali per sesi |
| 4 | [00-foundation/implementation-status.md](../00-foundation/implementation-status.md) | Fakta kode saat ini dan daftar "jangan diklaim" | Seluruhnya sebelum menyentuh kode |
| 5 | [01-architecture/system-overview.md](../01-architecture/system-overview.md) dan dokumen arsitektur modul | Batas komponen, process model, trust boundary | Bagian yang relevan dengan modul tugas |
| 6 | Spec modul di `03-specs/` — mis. [03-specs/03-sandbox-runtime.md](../03-specs/03-sandbox-runtime.md) | Requirement dan acceptance yang mengikat | `## 3. Requirement`, `## 7`, `## 8` |
| 7 | Flow terkait di [04-flows/README.md](../04-flows/README.md) | Urutan interaksi, cabang gagal, izin | Seluruh flow yang memuat alur tugas |
| 8 | Rules bahasa di [07-rules/README.md](../07-rules/README.md) — mis. `07-rules/typescript.md` | Cara menulis kode yang diterima | Seluruh file yang relevan |
| 9 | Skill di [06-skills/README.md](../06-skills/README.md) — `06-skills/<nama>/SKILL.md` | Prosedur langkah-demi-langkah untuk kelas tugas | Skill yang paling spesifik |

Aturan pembacaan:

- Agen MUST membaca ADR yang mengikat modul sebelum menulis spec atau kode; ADR berada di [01-architecture/adr/README.md](../01-architecture/adr/README.md).
- Agen MUST NOT membaca seluruh PRD untuk tugas satu modul; baca `§` yang dirujuk, lalu lanjutkan.
- Bila spec dan flow bertentangan, hentikan implementasi dan ikuti §6 (Presedensi).
- Bila dokumen yang diwajibkan tidak ada, itu blocker; agen MUST melaporkannya, bukan mengarang isi.

## 3. Peta Repo

Phase 0 saat ini adalah monolit Next.js di `src/`; target PRD adalah monorepo npm workspaces. Agen MUST membedakan keduanya dan tidak menulis path target seolah sudah ada.

| Area | Keadaan Phase 0 | Target (lihat [01-architecture/monorepo.md](../01-architecture/monorepo.md)) |
|---|---|---|
| Web app | `src/app` — route `/`, `/app`, `/builder`, `/dev`, `/login`, `/register`, `/run/[id]` | `apps/studio-web` (PWA) |
| Komponen | `src/components/{auth,builder,dashboard,dev,landing,runner,ui}` | `apps/studio-web` + `packages/ui-kit` |
| State | `src/store/appStore.ts` (Zustand) | Store per domain; core state di core Rust |
| Persistence | Dexie/IndexedDB v6: `apps`, `content`, `runHistory` | SQLite WASM + OPFS; jembatan impor Dexie dihapus |
| Eksekusi logika | `src/engine/evaluator.ts` dengan `new Function` | `packages/runtime-web` + `packages/core-rust`; dilarang `new Function` |
| Auth | `src/lib/auth.ts` (localStorage + JWT secret hardcoded) | Local Identity Ed25519 di core; auth lokal dihapus |
| Native | tidak ada | `apps/host-flutter`, `packages/runtime-native` |
| Server | tidak ada | `apps/selfhost-server` (Go) |
| Deploy | tidak ada | `deploy/{docker,helm,airgap}` |

Peta path milik peran ada di [roles.md](roles.md). Agen MUST NOT menyentuh path di luar peran yang sedang dijalankan.

## 4. Perintah

Perintah berikut adalah satu-satunya perintah gate yang boleh diklaim lulus. Agen MUST menjalankan perintah yang relevan dan mencatat hasil apa adanya.

| Perintah | Kegunaan | Wajib untuk |
|---|---|---|
| `npm install` | Memasang dependency sesuai lockfile | Perubahan dependency |
| `npm run dev` | Next.js dev server lokal (port default 3000) | Verifikasi manual UI |
| `npm run lint` | ESLint | Setiap perubahan TypeScript/React |
| `npm test` | Vitest sekali jalan | Setiap perubahan kode |
| `npm run build` | Build produksi Next.js | Setiap PR kode |
| `npm run docs:check` | Checker dokumen (mode peringatan) | Setiap PR yang menyentuh `docs/` |
| `node scripts/check-docs.mjs --strict` | Gate dokumen final; gagal pada warning | Sebelum merge PR `docs:` |
| `node -e "for (const f of require('fs').readdirSync('docs/03-specs/schemas')) JSON.parse(require('fs').readFileSync('docs/03-specs/schemas/'+f,'utf8')); console.log('schemas ok')"` | Validasi JSON Schema di `03-specs/schemas/` | Perubahan schema |

Larangan perintah:

- Agen MUST NOT mengklaim lulus untuk perintah yang tidak dijalankan, atau menyembunyikan kegagalan dengan menonaktifkan test/lint.
- Agen MUST NOT menambah dependency untuk menyelesaikan masalah dokumentasi atau menjalankan checker.
- Tidak ada CI workflow pada eksekusi ini; enforcement bersifat manual: PR template, checker, dan reviewer. Agen MUST NOT mengarang status CI.

## 5. SDD Gate

Gate ini berlaku sebelum baris kode pertama ditulis.

1. **Dokumen dulu.** Agen MUST menemukan requirement dan acceptance yang berlaku. Bila belum ada, agen MUST menulis spec/flow terlebih dahulu dan membukanya sebagai PR `docs:`; menebak perilaku dilarang.
2. **Kelas perubahan.** Agen MUST mengklasifikasikan pekerjaan memakai tabel kelas pada [00-foundation/sdd-workflow.md](../00-foundation/sdd-workflow.md): docs-only, perilaku, atau kontrak. Kelas kontrak (manifest, MUIP, host bridge, sync/CRDT, permission, crypto, registry, skema DB) MUST melalui RFC sebelum implementasi.
3. **ID.** Requirement baru MUST memakai ID dari rentang yang dialokasikan, berurutan tanpa celah, dan MUST mendapat baris di [00-foundation/prd-compliance-matrix.md](../00-foundation/prd-compliance-matrix.md).
4. **Acceptance.** Setiap requirement MUST memiliki minimal satu acceptance criterion yang dapat diuji; acceptance tanpa cara verifikasi dianggap belum selesai.
5. **Urutan commit.** Dalam satu PR, commit `docs:` mendahului `feat:`/`fix:`; commit `docs(status):` menyusul setelah verifikasi.
6. **Status.** Status `implemented` hanya boleh dinaikkan setelah perintah pada `## 8. Verifikasi` benar-benar dijalankan dan hasilnya dicatat.
7. **PR tanpa spec ditolak.** PR implementasi MUST memuat baris `Spec: docs/<path>.md` beserta ID requirement, atau `Spec: docs-not-needed` dengan alasan yang dapat diverifikasi reviewer.

Pengecualian hotfix keamanan atau kehilangan data diatur di [workflow.md](workflow.md) §9: mitigasi minimal boleh mendahului dokumen, dengan dokumen retro dalam 24 jam.

## 6. Presedensi dan Konflik

Urutan otoritas: **PRD > ADR `accepted` > spec > rules > kode**. Konsekuensi operasional:

| Situasi | Tindakan agen | Pemilik perbaikan |
|---|---|---|
| PRD berubah | Hentikan pekerjaan yang bertentangan; ADR terdampak disupersede | architect |
| ADR vs spec | Ikuti ADR; catat deviasi pada spec dan buka PR perbaikan spec | architect |
| Spec vs kode | Anggap kode bug; perbaiki kode, atau revisi spec lewat PR `docs:` dengan alasan | pemilik modul |
| Dua spec bertentangan | Requirement yang lebih spesifik menang; laporkan ke architect | architect |
| Spec vs flow | Spec menang untuk kontrak; flow diperbaiki | pemilik flow |
| Kode vs test | Test mengikuti spec; test yang mengunci perilaku keliru dihapus | qa |

Agen MUST NOT menyelesaikan konflik dengan memilih interpretasi paling mudah. Bila keputusan tidak dapat diturunkan dari dokumen, agen MUST mengeskalasi (§12), bukan mengarang keputusan.

## 7. Invariant

Invariant berikut tidak boleh dilanggar oleh perubahan apa pun, termasuk perubahan yang tampak kecil.

| Invariant | Arti operasional | Bukti yang diminta |
|---|---|---|
| **Offline-first** | Fitur inti berjalan tanpa jaringan; jaringan hanya menambah kemampuan | Uji mode pesawat pada acceptance |
| **Zero telemetry** | Tidak ada pengiriman data keluar secara default; analitik hanya opt-in di instance sendiri | Audit request jaringan pada test |
| **Zero privilege** | Micro-app tidak punya akses ambient; setiap kapabilitas lewat broker dan consent | Manifest, permission test, audit log |
| **Docs-first** | Perilaku berubah hanya setelah dokumen berubah | Urutan commit dan baris `Spec:` |
| **No fabrication** | Tidak ada klaim fitur, status, atau hasil verifikasi yang belum ada | Status merujuk `implementation-status.md` |
| **Rahasia tidak pernah plaintext** | Kunci dan item Vault tidak ditulis ke localStorage, IndexedDB biasa, log, atau backup plaintext | Pemindaian storage/log; review crypto |
| **Tanpa eksekusi dinamis** | `new Function` dan `eval` dilarang di runtime produksi; eksekusi hanya di isolate | Grep pada diff; test sandbox |
| **Server buta isi** | Server sync/registry tidak mendekripsi payload pengguna | Desain envelope; test server |
| **Tanpa paywall** | Tidak ada fitur yang dikunci di balik edisi atau lisensi | Review manifest fitur |
| **Data pengguna tidak dihapus** | Penghapusan selalu butuh konfirmasi eksplisit dan menawarkan ekspor | Acceptance Storage Manager |

Agen MUST menolak tugas yang secara inheren melanggar invariant dan MUST melaporkan konflik kepada pemilik dokumen.

## 8. Batas Path per Peran

Agen MUST bekerja dalam satu peran pada satu waktu dan hanya mengubah path milik peran tersebut. Ringkasan berikut adalah kontrak; rincian dan kolom skill/reviewer ada di [roles.md](roles.md).

| Peran | Path utama yang boleh diubah |
|---|---|
| product | `docs/00-foundation/**` kecuali isi PRD; `README.md` bagian status produk |
| architect | `docs/01-architecture/**`; `docs/03-specs/*.md` untuk kontrak; `docs/10-contributing/rfc-process.md` |
| host-runtime | `apps/studio-web` (permukaan Host), `packages/runtime-web` |
| studio-web | `apps/studio-web` (Studio IDE), `packages/ui-kit` sisi web |
| native | `apps/host-flutter`, `packages/runtime-native`, `packages/ui-kit` sisi Flutter |
| data-sync | `packages/core-rust` (storage/CRDT/parser), `apps/studio-web/src/db`, transport sync |
| registry | `packages/core-rust` (paket/verifikasi), klien registry, `03-specs/05-registry.md` |
| server | `apps/selfhost-server`, `deploy/**`, `09-operations/**` |
| design | `docs/02-design/**`, token MADS |
| qa | test suite, `08-quality/**` |
| security | `threat-model.md`, `security-test-plan.md`, `permissions.md`, review modul crypto |
| docs/release | `docs/**` lintas peran, `scripts/check-docs.mjs`, `.github/**`, root policy files, rilis |

Bila satu perubahan membutuhkan dua peran, agen MUST memecah PR dan menyerahkan bagian kedua lewat [handoff-prompts.md](handoff-prompts.md); agen MUST NOT melebarkan batas path sendiri.

## 9. Larangan

| Larangan | Alasan |
|---|---|
| Menulis secret, token, kunci, atau kredensial ke repo, test fixture, log, atau contoh dokumen | Kebocoran tidak dapat ditarik kembali; melanggar invariant |
| Memakai `new Function`, `eval`, atau eksekusi kode dinamis di jalur produksi | Sandbox escape; lihat [01-architecture/sandbox-capabilities.md](../01-architecture/sandbox-capabilities.md) |
| Menyatakan fitur belum ada sebagai "sudah selesai" pada dokumen, PR, komentar, atau changelog | Melanggar SDD dan menyesatkan reviewer |
| Mengubah isi PRD salinan atau menghapus requirement karena sulit | PRD adalah niat produk; gunakan status `blocked` + ADR deviasi |
| Melewati acceptance criteria, menandai test `skip`, atau melonggarkan assertion agar lulus | Menghapus bukti, bukan menyelesaikan masalah |
| Mengarang ID requirement, flow, ADR, atau kode error | Checker menolak referensi tak terdefinisi |
| Menambah warna, ukuran, atau string hardcoded di luar token MADS dan key i18n | Melanggar design system dan a11y |
| Mengubah kontrak (manifest, MUIP, host bridge, sync, permission, crypto, registry) tanpa RFC | Merusak kompatibilitas ekosistem |
| Menambah dependency tanpa justifikasi dan review supply chain | Memperluas permukaan serangan |
| Membuka issue publik untuk kerentanan keamanan | Prosedur ada di `SECURITY.md` (private advisory) |
| Melaporkan hasil verifikasi yang tidak dijalankan | Melanggar no fabrication |

## 10. Definition of Done

Agen MUST NOT menyebut pekerjaan "selesai" hanya karena kode dikompilasi. DoD minimum per artefak:

| Artefak | Baru selesai bila |
|---|---|
| Spec | Requirement ber-ID, acceptance terukur, `## 8. Verifikasi` berisi perintah, baris matriks kepatuhan ditambahkan |
| Flow | Alur utama, cabang gagal, izin, perilaku offline, acceptance, dan referensi spec terisi |
| Kode | Lint bersih, tidak memakai API terlarang, test relevan lulus, tidak ada dead code yang ditinggalkan |
| Test | Deterministik, menguji acceptance, tidak bergantung jaringan, tidak `skip` |
| Dokumentasi | `node scripts/check-docs.mjs --strict` lulus; tidak ada placeholder; tautan valid |
| Keamanan | Permission/crypto terdampak dianalisis, baris threat model diperbarui bila perlu, test keamanan disebut |
| Desain | Token-only, seluruh state wajib ada, key i18n tersedia, jalur keyboard diuji |
| Operasi | Runbook, backup/restore, dan langkah air-gap diperbarui bila perilaku server berubah |

DoD global: seluruh acceptance criterion yang terdampak dijalankan dan buktinya dicatat; risiko dan rollback ditulis di PR; status di [00-foundation/implementation-status.md](../00-foundation/implementation-status.md) diperbarui hanya bila verifikasi nyata sudah dijalankan. Rincian DoD per artefak ada di [08-quality/definition-of-done.md](../08-quality/definition-of-done.md).

## 11. PR dan Commit

Ringkasan yang mengikat; prosedur lengkap ada di [workflow.md](workflow.md).

- Branch: `feat/<area>-<slug>`, `fix/<area>-<slug>`, `docs/<slug>`.
- Commit: `type(scope): summary` dengan tipe `feat|fix|docs|test|refactor|perf|security|chore`.
- Urutan commit dalam satu PR: `docs:` → `feat:`/`fix:` → `docs(status):`.
- Isi PR: `Spec:` (path + ID) atau `docs-not-needed` + alasan, ringkasan perilaku, perintah verifikasi dan hasil, risiko/rollback, checklist SDD.
- Merge: squash, satu reviewer dari peran reviewer modul; perubahan kontrak butuh dua reviewer dan RFC.
- Agen MUST NOT merge PR-nya sendiri dan MUST NOT merge saat `npm run docs:check` gagal.

## 12. Eskalasi

Eskalasi berarti berhenti pada batas aman, menuliskan temuan, dan menyerahkan keputusan. Agen MUST NOT melanjutkan dengan asumsi diam-diam.

| Situasi | Tindakan | Pemilik keputusan |
|---|---|---|
| Spec tidak ada atau ambigu | Blokir pekerjaan, buat PR spec/RFC, tautkan pertanyaan terbuka | architect |
| Perubahan kontrak diperlukan | Hentikan implementasi, ajukan RFC | maintainer council |
| Kerentanan keamanan ditemukan | Laporkan lewat `SECURITY.md` (GitHub private advisory), jangan buka issue publik | security |
| Gate gagal karena masalah lama di luar scope | Catat output, jangan klaim sukses, jangan perbaiki diam-diam di PR yang sama | qa |
| Dua dokumen bertentangan | Terapkan §6, catat konflik, serahkan perbaikan ke pemilik | architect |
| Risiko kehilangan data pengguna | Hentikan aksi destruktif, wajibkan ekspor, eskalasi | product + security |
| Perubahan menyentuh path peran lain | Serahkan lewat handoff, jangan edit | peran pemilik path |
| Dependency baru diperlukan | Ajukan justifikasi dan review supply chain sebelum menambah | architect + security |
| Pelanggaran invariant | Tolak tugas, tulis alasan, eskalasi | governance |

SLA insiden mengikuti dokumen operasi (`09-operations/incident-response.md`); agen MUST NOT mengarang severity atau tenggat di luar dokumen itu.

## 13. Handoff

Agen MUST melakukan handoff ketika: pekerjaan berpindah peran, konteks mendekati batas, acceptance tidak dapat diverifikasi, atau ditemukan blocker yang butuh keputusan manusia. Handoff MUST memakai context package pada [handoff-prompts.md](handoff-prompts.md) dan MUST memuat path, kontrak, acceptance, larangan, status, artefak, pertanyaan terbuka, serta perintah verifikasi. Handoff yang merujuk "percakapan sebelumnya" tanpa path dianggap tidak lengkap.

## 14. Context Budget

Batas konteks adalah bagian dari kualitas, bukan sekadar biaya.

- Agen SHOULD berhenti membaca ketika keputusan implementasi sudah lengkap; membaca ulang dokumen yang sama dilarang.
- Agen MUST membaca bagian spec yang relevan, bukan seluruh paket dokumen, untuk tugas satu modul.
- Agen MUST memecah tugas yang menyentuh lebih dari tiga modul menjadi PR terpisah.
- Agen MUST merujuk berkas dengan path (dan nomor baris bila perlu), bukan menyalin isi berkas ke dalam prompt atau PR.
- Context package SHOULD muat dalam satu halaman; jika tidak, pecah menjadi beberapa handoff.
- Agen MUST mencatat keputusan yang diambil selama tugas ke dokumen atau PR, bukan menyimpannya di konteks.

## 15. Referensi

- [roles.md](roles.md) — 12 peran, batas path, skill dan reviewer.
- [workflow.md](workflow.md) — issue sampai rilis, branch, commit, PR, review, hotfix.
- [handoff-prompts.md](handoff-prompts.md) — template context package dan prompt siap pakai.
- [00-foundation/sdd-workflow.md](../00-foundation/sdd-workflow.md) — siklus SDD, kelas perubahan, review berkala.
- [00-foundation/implementation-status.md](../00-foundation/implementation-status.md) — fakta Phase 0 dan utang keamanan.
- [01-architecture/system-overview.md](../01-architecture/system-overview.md) — batas komponen dan process model.
- [03-specs/08-devtools-cli-sdk.md](../03-specs/08-devtools-cli-sdk.md) — perintah CLI dan exit code.
