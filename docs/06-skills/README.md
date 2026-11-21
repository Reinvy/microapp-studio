---
id: SKILL-INDEX
title: Indeks Skill
status: accepted
owner: dx
prd_refs: ["§1", "§5"]
name: index
description: "Indeks 10 skill operasional web-only beserta urutan pemakaian, owner, dan dokumen wajib."
when_to_use: "Dipakai saat memilih skill yang tepat sebelum mengerjakan perubahan shell, layar, komponen, permission, data, manifest, package, keamanan, dokumentasi, atau rilis."
required_docs: ["docs/00-foundation/sdd-workflow.md", "docs/07-rules/documentation.md", "docs/templates/skill.md"]
---

# Indeks Skill

Skill adalah prosedur operasional yang dapat dieksekusi untuk pekerjaan berulang pada satu PWA Next.js. Skill **tidak** menetapkan perilaku produk dan **tidak** menggantikan spec. Jika isi skill berbeda dengan spec, spec menang dan skill wajib diperbaiki.

Seluruh skill mengasumsikan alur SDD: dokumen lebih dulu, kode kemudian, dengan commit `docs:` terpisah dari implementasi. Rujukan perilaku tetap PRD v3.0, spec, dan rules; skill hanya menjabarkan langkah kerja.

## 1. Urutan Pemakaian

Urutan berikut adalah urutan default saat beberapa skill terlibat dalam satu pekerjaan. Skill sebelumnya menghasilkan kontrak yang dibaca skill berikutnya.

1. [add-shell-feature](add-shell-feature/SKILL.md) — perilaku shell, Home, library, pencarian, launcher.
2. [add-screen](add-screen/SKILL.md) — layar baru dari information architecture sampai screen spec.
3. [add-ui-component](add-ui-component/SKILL.md) — komponen dari katalog 120 ID dan token clay.
4. [add-permission](add-permission/SKILL.md) — permission baru dari manifest sampai audit.
5. [write-db-migration](write-db-migration/SKILL.md) — perubahan schema SQLite WASM/OPFS.
6. [extend-manifest](extend-manifest/SKILL.md) — perubahan kontrak manifest melalui RFC.
7. [add-package-source](add-package-source/SKILL.md) — sumber `.mapp` atau index statis read-only.
8. [security-review](security-review/SKILL.md) — tinjauan keamanan sebelum merge perubahan sensitif.
9. [docs-maintenance](docs-maintenance/SKILL.md) — pemeriksaan dokumen, matriks, status, dan tautan.
10. [release-web](release-web/SKILL.md) — build, budget bundle, deploy, dan rollback.

Aturan urutan: skill yang mengubah kontrak (permission, manifest, schema) MUST selesai dan direview sebelum skill yang memakainya (package, layar, rilis). `docs-maintenance` dijalankan sebelum `security-review` pada PR yang menyentuh dokumen, dan `release-web` selalu terakhir.

## 2. Indeks Skill

| # | Skill | Kapan digunakan | Owner | Dokumen wajib utama |
|---|---|---|---|---|
| 1 | [add-shell-feature](add-shell-feature/SKILL.md) | Menambah atau mengubah perilaku Home, library, pencarian, offline, workspace, atau launcher | dx | `03-specs/01-app-shell.md`, `01-architecture/system-overview.md` |
| 2 | [add-screen](add-screen/SKILL.md) | Menambah layar baru dari IA, screen spec, komponen katalog, state, dan test | design | `02-design/information-architecture.md`, `02-design/screen-specs.md` |
| 3 | [add-ui-component](add-ui-component/SKILL.md) | Menambah atau mengubah komponen dari 120 ID katalog tanpa mengubah jumlahnya | design | `02-design/component-catalog.md`, `02-design/design-system.md` |
| 4 | [add-permission](add-permission/SKILL.md) | Menambah permission, menaikkan risk tier, atau mengubah consent dan audit | security | `03-specs/permissions.md`, `03-specs/host-bridge.md` |
| 5 | [write-db-migration](write-db-migration/SKILL.md) | Mengubah schema host DB atau app DB SQLite WASM di OPFS | data | `01-architecture/data-model.md`, `03-specs/04-data.md` |
| 6 | [extend-manifest](extend-manifest/SKILL.md) | Mengubah kontrak `microapp.manifest.json` melalui RFC dan schema | architecture | `03-specs/manifest.md`, `10-contributing/rfc-process.md` |
| 7 | [add-package-source](add-package-source/SKILL.md) | Menambah sumber `.mapp` lokal atau index statis read-only | registry | `03-specs/05-packages.md`, `01-architecture/package-distribution.md` |
| 8 | [security-review](security-review/SKILL.md) | Meninjau perubahan sandbox, CSP, signature, vault, BYOK, atau dependency | security | `01-architecture/threat-model.md`, `07-rules/security.md` |
| 9 | [docs-maintenance](docs-maintenance/SKILL.md) | Menjaga frontmatter, ID, tautan, matriks, dan status tetap konsisten | dx | `00-foundation/sdd-workflow.md`, `07-rules/documentation.md` |
| 10 | [release-web](release-web/SKILL.md) | Menaikkan versi, build PWA, memeriksa budget bundle, deploy, dan rollback | ops | `08-quality/release-gates.md`, `08-quality/performance-budgets.md` |

## 3. Format Skill

Setiap skill berada di satu subfolder `docs/06-skills/` dengan berkas `SKILL.md`. Frontmatter wajib:

| Field | Aturan |
|---|---|
| `id` | Prefix `SKILL-` diikuti nama singkat kapital, unik di seluruh `docs/` |
| `title` | Judul Bahasa Indonesia; H1 pertama sama setelah normalisasi |
| `status` | `accepted` |
| `owner` | Salah satu owner yang diizinkan kontrak dokumen |
| `prd_refs` | Minimal satu, setiap entri diawali `§` |
| `name` | kebab-case, sama dengan nama folder |
| `description` | Satu kalimat tentang hasil akhir skill |
| `when_to_use` | Satu kalimat pemicu konkret |
| `required_docs` | Daftar path dokumen repo-relatif yang wajib dibaca |

Struktur bagian wajib: `## Kapan Digunakan`, `## Prosedur`, `## Verifikasi`. Bagian tambahan yang dianjurkan mengikuti [templates/skill.md](../templates/skill.md): `## Prasyarat`, `## Input`, `## Kesalahan Umum`, `## Definition of Done`.

Aturan isi:

- `## Prosedur` berupa daftar bernomor dengan path dan perintah exact, bukan ringkasan.
- `## Verifikasi` memuat blok `bash` yang benar-benar dijalankan setelah implementasi.
- Identifier, nama field JSON, nama perintah, dan path tetap Bahasa Inggris.
- Skill tidak boleh memperkenalkan requirement, error code, atau komponen baru.

## 4. Hubungan dengan Dokumen Lain

Presedensi tetap: PRD → ADR `accepted` → spec → rules → kode. Skill berada di bawah spec dan rules.

- Kontrak perilaku: [03-specs/01-app-shell.md](../03-specs/01-app-shell.md) dan spec modul lain di [03-specs](../03-specs/01-app-shell.md).
- Keputusan arsitektur: [01-architecture/system-overview.md](../01-architecture/system-overview.md).
- Alur lintas modul: [04-flows/README.md](../04-flows/README.md).
- Aturan implementasi: [07-rules/README.md](../07-rules/README.md).
- Gate kualitas dan rilis: [08-quality/release-gates.md](../08-quality/release-gates.md).
- Proses kontrak: [10-contributing/rfc-process.md](../10-contributing/rfc-process.md) dan [templates/rfc.md](../templates/rfc.md).

## 5. Menambah Skill Baru

1. Salin [templates/skill.md](../templates/skill.md) ke subfolder baru dengan nama kebab-case dan isi seluruh frontmatter.
2. Isi `required_docs` hanya dengan path yang ada dan benar-benar dibutuhkan.
3. Tulis prosedur yang dapat dijalankan tanpa keputusan tambahan; setiap langkah memuat path atau perintah.
4. Tambahkan baris pada tabel `## 2. Indeks Skill`, tempatkan pada urutan pemakaian yang benar, dan tautkan dari [docs/README.md](../README.md).
5. Jalankan verifikasi di bagian 6 dan perbaiki setiap error yang menyebut file skill.

## 6. Verifikasi

```bash
node scripts/check-docs.mjs --strict
node scripts/generate-catalog.mjs --check
```

Kedua perintah harus selesai dengan exit code `0` tanpa warning. Checker memvalidasi frontmatter skill (`name`, `description`, `when_to_use`, `required_docs`), H1, section wajib, keseimbangan code fence, tautan relatif, anchor, dan keterjangkauan setiap dokumen dari [docs/README.md](../README.md).
