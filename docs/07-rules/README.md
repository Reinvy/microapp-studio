---
id: RULE-INDEX
title: Indeks Rules
status: accepted
owner: dx
prd_refs: ["§2", "§12"]
---

# Indeks Rules

Rules menetapkan **cara** menulis dan mengubah kode agar sesuai kontrak yang sudah ditetapkan spec. Rules tidak menggantikan spec: bila aturan bertentangan dengan spec, spec menang dan aturan wajib direvisi. Setiap aturan memiliki ID unik, level normatif, dan cara verifikasi yang dapat diperiksa reviewer atau tool.

## 1. Tujuan dan Ruang Lingkup

Rules berlaku untuk seluruh kode yang dikirim dan dijalankan di browser:

| Area | Lokasi | Rules utama |
|---|---|---|
| Aplikasi web | `apps/studio-web` (Next.js 16 App Router, React 19) | [typescript.md](typescript.md), [ui-ux.md](ui-ux.md) |
| Runtime sandbox | `packages/runtime-web` (iframe, MUIP, bridge) | [security.md](security.md), [typescript.md](typescript.md) |
| Komponen visual | `packages/ui-kit` | [ui-ux.md](ui-ux.md) |
| Inti WASM | `packages/core-rust` (kriptografi, verifikasi, format `.mapp`) | [rust.md](rust.md) |
| Data lokal | SQLite WASM + OPFS di worker | [data-migrations.md](data-migrations.md) |
| Bukti dan proses | Test, commit, dokumen | [testing.md](testing.md), [git-and-review.md](git-and-review.md), [documentation.md](documentation.md) |

Di luar cakupan: isi PRD dan spec (lihat [PRD-v3.0.md](../00-foundation/PRD-v3.0.md)), kode micro-app pihak ketiga (diatur [manifest.md](../03-specs/manifest.md) dan [permissions.md](../03-specs/permissions.md)), serta konfigurasi hosting (lihat [deployment.md](../09-operations/deployment.md)). Tidak ada runtime di luar browser yang diatur oleh rules ini.

## 2. Presedensi

1. Urutan otoritas: PRD v3.0 → ADR accepted → spec → rules → kode. Dokumen yang lebih tinggi menang saat terjadi konflik.
2. Bila dua aturan bertabrakan, prioritas: **keamanan > data > aturan lain**. Aturan keamanan dan data tidak boleh dilonggarkan oleh aturan UI, performa, atau gaya kode.
3. Bila tidak ada aturan yang mencakup kasus baru, pilih perilaku yang gagal tertutup, bekerja offline, tanpa privilege tambahan, dan dapat diverifikasi dengan test.
4. Perubahan yang mengubah kontrak perilaku (manifest, bridge, permission, token, format package) MUST melewati [rfc-process.md](../10-contributing/rfc-process.md) dan memperbarui spec terkait sebelum kode.

## 3. Level Normatif

| Level | Arti | Konsekuensi pelanggaran |
|---|---|---|
| MUST | Wajib. Tidak ada implementasi yang boleh merge tanpa memenuhinya. | PR ditolak reviewer; gate otomatis (typecheck, test, checker) wajib gagal bila dapat diperiksa mesin. |
| SHOULD | Sangat dianjurkan. Penyimpangan memerlukan alasan tertulis di PR dan persetujuan reviewer area. | PR diterima hanya dengan justifikasi, risiko, dan rencana perbaikan yang dicatat. |
| MAY | Opsional; tidak boleh dijadikan syarat kelulusan. | Tidak ada. |

Kata "wajib" dalam prosa menjelaskan maksud aturan; level pada kolom tabel adalah sumber normatif.

## 4. Indeks Rules

| File | Area | Owner | Fokus | Jumlah aturan |
|---|---|---|---|---|
| [README.md](README.md) | `RULE-INDEX` | dx | Presedensi, level, enforcement, pengecualian | — |
| [typescript.md](typescript.md) | `RULE-TS-*` | runtime | Strict TypeScript, batas server/client App Router, keamanan rendering, async, performa, a11y, i18n | 20 |
| [ui-ux.md](ui-ux.md) | `RULE-UI-*` | design | Token clay, state lengkap, motion, kontras, fokus, sentuh, consent, empty state | 20 |
| [security.md](security.md) | `RULE-SEC-*` | security | Zero trust, CSP, sandbox, signature, WebCrypto, BYOK, telemetry, dependensi, insiden | 16 |
| [data-migrations.md](data-migrations.md) | `RULE-DATA-*` | data | UUIDv7, SQLite WASM/OPFS, DB per app, migrasi bernomor, snapshot, FTS5, ekspor | 14 |
| [testing.md](testing.md) | `RULE-TEST-*` | qa | Vitest, Playwright, axe, regresi visual clay, offline/PWA, determinisme, coverage | 14 |
| [git-and-review.md](git-and-review.md) | `RULE-GIT-*` | dx | Branch, commit docs-first, conventional commit, ukuran PR, review, rollback | 12 |
| [documentation.md](documentation.md) | `RULE-DOC-*` | dx | Frontmatter, H1, ID, tautan, matrix, bukti status, checker, bahasa | 16 |
| [rust.md](rust.md) | `RULE-RS-*` | runtime | WASM-only, tanpa FFI, panic di boundary, package deterministik, crypto review, clippy | 8 |

Total **120 aturan**. ID unik per area dan bernomor berurutan tanpa gap; menambah aturan MUST memakai nomor berikutnya, bukan menyisipkan.

## 5. Enforcement

| Mekanisme | Cakupan | Waktu | Catatan |
|---|---|---|---|
| `node scripts/check-docs.mjs --strict` | RULE-DOC, frontmatter, tautan, ID, placeholder, reachability | Setiap perubahan `docs/` | 0 error dan 0 warning; lihat [documentation.md](documentation.md). |
| `npm run typecheck` + `npm run lint` | RULE-TS | Sebelum PR | `tsc --noEmit` dan ESLint tanpa warning baru. |
| `npm test` | RULE-TEST, RULE-DATA | Sebelum PR | Vitest per workspace. |
| `npm run e2e` | RULE-TEST, flow kritis | Sebelum PR yang menyentuh alur | Playwright pada build lokal. |
| `cargo test` + `cargo clippy -- -D warnings` | RULE-RS | Saat `packages/core-rust` berubah | Target `wasm32-unknown-unknown`. |
| Review PR | Seluruh rules | Setiap PR | Sensitif (security, data, token) memerlukan reviewer area. |
| Security review | RULE-SEC, RULE-RS | Perubahan sandbox, signature, crypto, BYOK | Prosedur di [security-review](../06-skills/security-review/SKILL.md). |
| Release gate | Seluruh rules dan NFR | Setiap rilis | [release-gates.md](../08-quality/release-gates.md). |

CI, bila aktif, MUST memanggil perintah yang sama dengan gate lokal dan MUST NOT menjadi satu-satunya tempat aturan ditegakkan.

## 6. Pengecualian

1. Pengecualian MUST dicatat di deskripsi PR: aturan yang dilanggar, alasan teknis, dampak keamanan/data, dan tanggal peninjauan ulang.
2. Pengecualian pada RULE-SEC, RULE-DATA, dan RULE-RS MUST disetujui reviewer `security`, `data`, atau `runtime` sesuai area.
3. Pengecualian MUST NOT dipakai untuk melewati acceptance criteria, sandbox, signature, enkripsi backup, atau consent.
4. Pelanggaran lama dicatat di [implementation-status.md](../00-foundation/implementation-status.md). Menambah pelanggaran baru tetap dilarang meskipun yang lama belum diperbaiki.
5. Pengecualian berlaku maksimal satu siklus rilis; perpanjangan memerlukan persetujuan ulang dengan rencana perbaikan.

## 7. Hubungan dengan Spec, Skill, dan Quality

- Spec menentukan **apa** yang harus benar; rules menentukan **bagaimana** mencapainya.
- Skill menentukan **urutan kerja** untuk perubahan tertentu; lihat [06-skills/README.md](../06-skills/README.md).
- Quality menentukan **bukti** yang harus ada; lihat [definition-of-done.md](../08-quality/definition-of-done.md) dan [test-strategy.md](../08-quality/test-strategy.md).
- Matrix menentukan **status** setiap requirement; lihat [prd-compliance-matrix.md](../00-foundation/prd-compliance-matrix.md).
- Bila sebuah PR menyentuh lebih dari satu area, seluruh rules area terkait berlaku sekaligus; tidak ada aturan yang boleh diabaikan karena area lain lebih dominan.

## 8. Verifikasi

| Langkah | Perintah | Lulus bila |
|---|---|---|
| Dokumentasi | `node scripts/check-docs.mjs --strict` | 0 error, 0 warning. |
| Kode web | `npm run typecheck && npm run lint && npm test` | Exit 0 tanpa warning baru. |
| Inti WASM | `cargo test --manifest-path packages/core-rust/Cargo.toml` | Seluruh test lulus. |
| Bukti rilis | `npm run verify:web` | Status terekam di [baseline.md](../08-quality/evidence/baseline.md). |
