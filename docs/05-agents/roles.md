---
id: AGENT-ROLES
title: Peran dan Batas Path
status: accepted
owner: dx
prd_refs: ["§1", "§12"]
---

# Peran dan Batas Path

Dokumen ini menetapkan sembilan peran kerja, path yang boleh diubah, artefak yang dimiliki, tugas review, dan arah handoff. Aturan operasional ada di [AGENTS.md](AGENTS.md); prosedur PR ada di [workflow.md](workflow.md).

## 1. Model Peran

- Satu PR MUST memiliki satu peran utama; perubahan lintas peran dipecah menjadi PR terpisah.
- Path milik peran adalah hak edit eksklusif. Peran lain membaca dan mengusulkan lewat handoff.
- Reviewer MUST berbeda dari penulis dan memeriksa acceptance, bukan selera gaya.
- Perubahan kontrak (manifest, MUIP, host bridge, permission, token, skema data) MUST melalui peran architecture dan RFC, siapa pun penulisnya.
- Nilai `owner` pada frontmatter dokumen mengikuti enum yang sudah ada. Peran `docs` dan `frontend` memakai nilai `dx`.

| Peran | Nilai `owner` frontmatter |
|---|---|
| product | `product` |
| architecture | `architecture` |
| design | `design` |
| frontend | `dx` |
| runtime | `runtime` |
| data | `data` |
| security | `security` |
| qa | `qa` |
| docs | `dx` |

## 2. Ringkasan

| Peran | Fokus | Reviewer utama | Handoff ke |
|---|---|---|---|
| product | Niat produk, cakupan, matriks kepatuhan, status | architecture | architecture, design |
| architecture | Arsitektur, ADR, kontrak lintas modul, RFC | security | frontend, runtime, data |
| design | Design system clay, katalog komponen, layar, copy | qa | frontend, docs |
| frontend | Shell, Home, builder, layar, ui-kit web | design, qa | runtime, docs |
| runtime | Iframe sandbox, MUIP renderer, bridge, watchdog | security, qa | frontend, data |
| data | SQLite WASM/OPFS, migrasi, backup, ekspor | architecture, qa | runtime, docs |
| security | Threat model, permission, CSP, signature, vault | architecture | runtime, qa |
| qa | Test strategy, evidence, gate rilis, aksesibilitas | product | docs |
| docs | Checker, tautan, matriks, konsistensi istilah | product | product, architecture |

## 3. product

**Lingkup.** Menjaga niat produk, ruang lingkup, persona, metrik, dan urutan fase. Memastikan setiap requirement dapat dilacak ke PRD dan setiap klaim status punya bukti.

**Artefak yang dimiliki.** [PRD v3.0](../00-foundation/PRD-v3.0.md), [product-foundation.md](../00-foundation/product-foundation.md), [prd-compliance-matrix.md](../00-foundation/prd-compliance-matrix.md), [refactor-roadmap.md](../00-foundation/refactor-roadmap.md), [implementation-status.md](../00-foundation/implementation-status.md), dan baris status pada [README.md](../../README.md).

**Tugas review.** Menolak requirement tanpa acceptance terukur, klaim `implemented` tanpa evidence, dan fitur yang menambah akun, cloud sync, atau telemetri.

**Handoff.** Serahkan requirement siap-spec ke architecture dan alur layar ke design; sertakan ID requirement, fase, dan definisi selesai.

## 4. architecture

**Lingkup.** Batas komponen web, aliran data lokal, ADR, kontrak manifest/MUIP/bridge, dan RFC. Menjaga agar solusi tetap client-first dan tanpa backend wajib.

**Artefak yang dimiliki.** `docs/01-architecture/**` termasuk [ADR index](../01-architecture/adr/README.md), [manifest.md](../03-specs/manifest.md), [ui-protocol.md](../03-specs/ui-protocol.md), [host-bridge.md](../03-specs/host-bridge.md), [error-codes.md](../03-specs/error-codes.md), [nfr.md](../03-specs/nfr.md), `docs/03-specs/schemas/**`, dan `docs/10-contributing/**`.

**Tugas review.** Memeriksa kompatibilitas kontrak, determinisme paket, dan konsekuensi ADR. Menolak desain yang memerlukan server, proses native, atau API di luar browser.

**Handoff.** Serahkan kontrak final ke frontend, runtime, dan data, disertai path spec dan catatan kompatibilitas.

## 5. design

**Lingkup.** Bahasa visual claymorphism, token `--mads-*`, katalog komponen, information architecture, layar, pola interaksi, aksesibilitas, dan copy.

**Artefak yang dimiliki.** [DESIGN.md](../../DESIGN.md) dan `docs/02-design/**`: [design-system.md](../02-design/design-system.md), [component-catalog.md](../02-design/component-catalog.md), [information-architecture.md](../02-design/information-architecture.md), [screen-specs.md](../02-design/screen-specs.md), [interaction-patterns.md](../02-design/interaction-patterns.md), [accessibility.md](../02-design/accessibility.md), [content-i18n.md](../02-design/content-i18n.md).

**Tugas review.** Menolak nilai visual hardcoded, state komponen yang tidak lengkap, kontras di bawah ambang, dan motion yang mengabaikan `prefers-reduced-motion`.

**Handoff.** Serahkan spesifikasi layar dan komponen ke frontend; sertakan token, state, ukuran target sentuh, dan acceptance aksesibilitas.

## 6. frontend

**Lingkup.** Implementasi UI Next.js App Router: shell, Home/library, layar create, builder visual, preview, settings, dan komponen `ui-kit`. Menjaga interaksi tetap di bawah 50 ms per operasi builder.

**Artefak yang dimiliki.** `apps/studio-web/**` (permukaan UI dan route), `packages/ui-kit/**`, serta bagian UI pada [02-studio.md](../03-specs/02-studio.md) dan [01-app-shell.md](../03-specs/01-app-shell.md).

**Tugas review.** Memeriksa penggunaan token clay, state loading/empty/error, keyboard, i18n, dan tidak adanya `eval`, `innerHTML`, atau CSS mentah.

**Handoff.** Serahkan perubahan layar ke design untuk review visual dan ke qa untuk test komponen; sertakan screenshot atau rekaman interaksi bila diminta.

## 7. runtime

**Lingkup.** Eksekusi micro-app di browser: iframe opaque origin, CSP, worker, renderer MUIP, bridge broker, permission check per panggilan, watchdog, dan crash boundary.

**Artefak yang dimiliki.** `packages/runtime-web/**`, [sandbox-runtime.md](../01-architecture/sandbox-runtime.md), [03-sandbox-runtime.md](../03-specs/03-sandbox-runtime.md), [host-bridge-intents.md](../01-architecture/host-bridge-intents.md), dan bagian runtime pada [host-bridge.md](../03-specs/host-bridge.md).

**Tugas review.** Menolak jalur eksekusi alternatif saat sandbox gagal, pengecekan permission yang dilewati, dan pesan error yang membocorkan data host.

**Handoff.** Serahkan kontrak bridge dan perilaku lifecycle ke frontend serta data; sertakan kode error dan batas restart.

## 8. data

**Lingkup.** Penyimpanan lokal: host DB dan DB per app di SQLite WASM/OPFS, migrasi, FTS5, kuota, ekspor/impor, dan backup terenkripsi.

**Artefak yang dimiliki.** Worker database di `apps/studio-web/**`, `packages/core-rust/**` untuk parser dan kriptografi WASM, [data-model.md](../01-architecture/data-model.md), [04-data.md](../03-specs/04-data.md), dan [06-backup.md](../03-specs/06-backup.md).

**Tugas review.** Menolak migrasi tanpa snapshot, operasi lintas workspace tanpa isolasi, dan perubahan format backup tanpa versi serta checksum.

**Handoff.** Serahkan skema dan API data ke runtime dan frontend; sertakan langkah migrasi, rollback, dan fixture uji.

## 9. security

**Lingkup.** Threat model web, zero-trust permission, CSP/COOP/COEP, verifikasi signature paket, vault untuk BYOK, dan audit lokal.

**Artefak yang dimiliki.** [threat-model.md](../01-architecture/threat-model.md), [permissions.md](../03-specs/permissions.md), [security-test-plan.md](../08-quality/security-test-plan.md), [package-distribution.md](../01-architecture/package-distribution.md), dan [SECURITY.md](../../SECURITY.md).

**Tugas review.** Memeriksa setiap PR yang menyentuh sandbox, bridge, permission, kriptografi, import paket, dan penanganan secret. Menolak telemetri default dan penyimpanan secret di luar vault.

**Handoff.** Serahkan temuan dan mitigasi ke runtime, data, dan qa; jangan menulis detail eksploit ke dokumen publik.

## 10. qa

**Lingkup.** Strategi test, evidence, performance budget, gate rilis, dan pemeriksaan aksesibilitas. Menjaga agar status requirement hanya naik berdasarkan test nyata.

**Artefak yang dimiliki.** `docs/08-quality/**`: [test-strategy.md](../08-quality/test-strategy.md), [performance-budgets.md](../08-quality/performance-budgets.md), [security-test-plan.md](../08-quality/security-test-plan.md), [release-gates.md](../08-quality/release-gates.md), [definition-of-done.md](../08-quality/definition-of-done.md), dan `docs/08-quality/evidence/**`.

**Tugas review.** Menolak PR tanpa perintah verifikasi, test yang dinonaktifkan, dan evidence yang tidak dapat direproduksi.

**Handoff.** Serahkan status gate dan kegagalan yang tersisa ke docs untuk pembaruan matriks; sertakan perintah dan keluaran ringkas.

## 11. docs

**Lingkup.** Kesehatan dokumentasi: frontmatter, H1, tautan, anchor, ID, reachability, matriks, dan konsistensi istilah. Menjalankan checker dan menjaga indeks tetap akurat.

**Artefak yang dimiliki.** `docs/README.md`, `docs/templates/**`, [docs-maintenance skill](../06-skills/docs-maintenance/SKILL.md), dan perbaikan tautan lintas dokumen. Nilai `owner` untuk dokumen peran ini adalah `dx`.

**Tugas review.** Menolak tautan mati, ID duplikat, status tanpa bukti, istilah platform yang tidak ada, dan dokumen yang tidak terjangkau dari indeks.

**Handoff.** Serahkan ringkasan drift (dokumen versus kode) ke product dan architecture; sertakan file, baris, dan perbaikan yang diusulkan.
