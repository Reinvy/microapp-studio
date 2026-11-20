---
id: SKILL-INDEX
title: Indeks Skill
status: accepted
owner: dx
prd_refs: ["§7.1"]
---

# Indeks Skill

Skill adalah prosedur operasional yang dapat dieksekusi untuk pekerjaan berulang: menambah fitur Host, memperluas manifest, menambah transport sync, hingga merilis server self-host. Skill **tidak** menetapkan perilaku produk dan **tidak** menggantikan spec. Jika isi skill berbeda dengan spec, spec menang dan skill wajib diperbaiki.

Setiap skill mengasumsikan pembaca sudah menjalankan SDD: dokumen lebih dulu, kode kemudian, dengan commit `docs:` terpisah dari implementasi.

## 1. Format Skill

Setiap skill berada di satu subfolder `docs/06-skills/` dengan berkas `SKILL.md` di dalamnya, ditambah frontmatter standar dan metadata pemakaian:

| Field | Wajib | Aturan |
|---|---|---|
| `id` | ya | Prefix `SKILL-` diikuti nama skill dalam huruf kapital dan tanda hubung, unik di seluruh `docs/` |
| `title` | ya | Judul Bahasa Indonesia; H1 pertama harus sama persis |
| `status` | ya | `accepted` untuk paket ini |
| `owner` | ya | `dx` untuk seluruh skill |
| `prd_refs` | ya | Minimal satu, diawali `§` |
| `name` | ya | kebab-case, sama dengan nama folder |
| `description` | ya | Satu kalimat tentang hasil akhir skill |
| `when_to_use` | ya | Satu kalimat pemicu konkret |
| `required_docs` | ya | Daftar path dokumen repo-relatif yang wajib dibaca sebelum eksekusi |

Struktur bagian wajib (urutan tetap): `## Kapan Digunakan`, `## Prasyarat`, `## Input`, `## Prosedur`, `## Verifikasi`, `## Kesalahan Umum`, `## Definition of Done`.

Aturan isi:

- `## Prosedur` adalah daftar bernomor dengan path dan perintah exact, bukan ringkasan.
- `## Verifikasi` memuat blok `bash` yang benar-benar dijalankan setelah implementasi.
- `## Kesalahan Umum` berupa tabel `Kesalahan` dan `Perbaikan`.
- Identifiers, field JSON, nama perintah, dan path tetap Bahasa Inggris.

## 2. Indeks Skill

| Skill | Judul | Kapan digunakan | Dokumen wajib utama |
|---|---|---|---|
| [add-host-feature](add-host-feature/SKILL.md) | Menambah Fitur Host | Menambah atau mengubah perilaku Host Shell lintas web/PWA dan native | `03-specs/01-host-shell.md`, `01-architecture/system-overview.md` |
| [add-ui-component](add-ui-component/SKILL.md) | Menambah Komponen MADS | Menambah komponen MADS ke katalog dan mengimplementasikannya di web serta Flutter | `02-design/design-system.md`, `03-specs/02-studio-ide.md` |
| [extend-manifest](extend-manifest/SKILL.md) | Memperluas Manifest | Mengubah kontrak manifest melalui RFC, dengan major baru bila breaking | `03-specs/manifest-v2.md`, `03-specs/schemas/microapp.manifest.v2.schema.json` |
| [add-permission](add-permission/SKILL.md) | Menambah Permission | Menambah permission baru atau menaikkan risk tier yang ada | `03-specs/permissions.md`, `01-architecture/sandbox-capabilities.md` |
| [add-sync-transport](add-sync-transport/SKILL.md) | Menambah Transport Sync | Menambah atau mengganti implementasi transport sinkronisasi | `03-specs/06-sync-backup.md`, `01-architecture/sync-crdt.md` |
| [add-registry-source](add-registry-source/SKILL.md) | Menambah Sumber Registry | Menambah jenis sumber registry, cache, atau verifikasi TOFU | `03-specs/05-registry.md`, `01-architecture/registry-supply-chain.md` |
| [write-db-migration](write-db-migration/SKILL.md) | Menulis Migrasi Database | Mengubah schema database micro-app atau database Host | `01-architecture/data-model.md`, `03-specs/04-data-automation.md` |
| [add-workflow-node](add-workflow-node/SKILL.md) | Menambah Node Workflow | Menambah node, trigger, atau connector workflow | `03-specs/04-data-automation.md`, `01-architecture/ai-workflow.md` |
| [release-selfhost](release-selfhost/SKILL.md) | Merilis Server Self-Host | Menerbitkan rilis server Lite/Standard/Cluster yang bertanda tangan | `03-specs/07-selfhost.md`, `01-architecture/selfhost.md` |
| [security-review](security-review/SKILL.md) | Security Review | Meninjau perubahan yang menyentuh sandbox, kripto, authz, SSRF, atau supply chain | `01-architecture/threat-model.md`, `03-specs/permissions.md` |
| [docs-maintenance](docs-maintenance/SKILL.md) | Memelihara Dokumentasi | Menjaga frontmatter, ID, link, matriks, dan status tetap konsisten | `00-foundation/sdd-workflow.md`, `README.md` |

## 3. Hubungan dengan Dokumen Lain

Urutan presedensi tetap: PRD → ADR `accepted` → spec → rules → kode. Skill berada di bawah spec dan rules; skill yang bertentangan dengan spec wajib diperbaiki, bukan diikuti.

- Kontrak perilaku: [03-specs](../03-specs/01-host-shell.md).
- Keputusan arsitektur: [01-architecture](../01-architecture/system-overview.md).
- Alur lintas modul: [04-flows](../04-flows/README.md).
- Aturan implementasi: [07-rules](../07-rules/README.md).
- Gate kualitas dan rilis: [08-quality](../08-quality/release-gates.md).
- Proses kontrak: [10-contributing/rfc-process.md](../10-contributing/rfc-process.md) dan [templates/rfc.md](../templates/rfc.md).

## 4. Menambah Skill Baru

1. Salin kerangka [templates/skill.md](../templates/skill.md) ke subfolder baru di `docs/06-skills/` dengan nama kebab-case; isi seluruh bagian kerangka dan set `status: accepted` sebelum merge.
2. Isi `required_docs` hanya dengan path yang ada di repo dan benar-benar dibutuhkan.
3. Tulis prosedur yang dapat dijalankan tanpa keputusan tambahan; setiap langkah memuat path atau perintah.
4. Tambahkan baris pada tabel `## 2. Indeks Skill` dan tautkan skill dari [docs/README.md](../README.md).
5. Jalankan verifikasi di bagian 5 dan perbaiki setiap error yang menyebut file skill.

## 5. Verifikasi

```bash
npm run docs:check
node scripts/check-docs.mjs --strict
```

Kedua perintah harus selesai dengan exit code `0` tanpa warning. Checker memvalidasi frontmatter skill (`name`, `description`, `when_to_use`, `required_docs`), H1, section wajib, keseimbangan code fence, link relatif, dan keterjangkauan file dari `docs/README.md`.
