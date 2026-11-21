---
id: TPL-SPEC
title: "{{TITLE}}"
status: draft
owner: "{{OWNER}}"
prd_refs: ["§{{SECTION}}"]
---

# {{TITLE}}

Ganti setiap placeholder `{{...}}` sebelum dokumen menjadi `accepted`. Hapus baris panduan ini. Spec web-only: seluruh perilaku berjalan di browser (PWA Next.js 16), tanpa server wajib dan tanpa akun.

## 1. Tujuan

{{Satu paragraf: masalah yang diselesaikan spec ini dan hasil yang dapat diamati pengguna. Sebutkan route, layar `SCR-{{NN}}`, atau worker yang terlibat.}}

## 2. Ruang Lingkup

Di dalam: {{daftar perilaku, route, dan state yang diikat spec ini}}.

Di luar: {{perilaku yang diikat spec lain; sebutkan nama spec, bukan detailnya}}.

## 3. Requirement

Setiap baris memakai ID nyata dari alokasi 140 requirement (`FR-*`, `NFR-*`, `SEC-*`) dan level RFC 2119. ID wajib berada di sel pertama tanpa backtick agar checker mendefinisikannya.

| ID | Level | Requirement | Acceptance |
|---|---|---|---|
| FR-{{DOMAIN}}-{{NNN}} | MUST | {{perilaku tunggal yang dapat diuji}} | {{kondisi terukur yang dapat diverifikasi}} |
| FR-{{DOMAIN}}-{{NNN}} | SHOULD | {{perilaku opsional yang terukur}} | {{kondisi terukur}} |

Aturan penulisan requirement:

- Satu baris = satu perilaku yang dapat diuji; jangan gabungkan dua kemampuan.
- Acceptance menyebut angka, state, atau elemen yang terlihat, bukan "berfungsi baik".
- Perilaku visual merujuk token clay `--mads-*`; jangan menulis nilai hex di spec.
- Perilaku keamanan merujuk `SEC-{{NNN}}` dan menyatakan fail-closed bila ragu.

## 4. Model Data dan State

{{Entitas, field, dan state machine. Tuliskan invariant yang harus selalu benar. Data lokal memakai SQLite WASM + OPFS melalui worker; `CryptoKey` non-extractable disimpan di IndexedDB. Jangan memperkenalkan Dexie untuk data baru.}}

| State | Masuk dari | Keluar ke | Efek samping |
|---|---|---|---|
| {{STATE}} | {{STATE_ASAL}} | {{STATE_TUJUAN}} | {{efek}} |

## 5. Error dan Recovery

Gunakan hanya kode dari `docs/03-specs/error-codes.md` (27 kode terdaftar).

| Kode | Kondisi | Perilaku pengguna | Recovery |
|---|---|---|---|
| E-{{DOMAIN}}-{{NNN}} | {{kondisi pemicu}} | {{pesan singkat yang terlihat}} | {{langkah pemulihan atau retry}} |

## 6. Keamanan dan Privasi

{{Permission yang diperiksa broker, data sensitif yang tidak boleh masuk log, dan audit lokal. Nyatakan bila fitur berjalan offline dan tidak mengirim data keluar. Tidak ada telemetry default.}}

## 7. Acceptance Criteria

- **Given** {{konteks awal}} **When** {{aksi pengguna}} **Then** {{hasil teramati}}.
- **Given** {{konteks kedua}} **When** {{aksi kedua}} **Then** {{hasil kedua}}, termasuk jalur keyboard dan `prefers-reduced-motion`.

## 8. Verifikasi

| Perintah / Artefak | Bukti yang dicatat | Status |
|---|---|---|
| `npm test` | {{nama test unit/komponen yang menutup requirement}} | {{lulus/gagal}} |
| `npm run typecheck` | {{file yang diperiksa}} | {{lulus/gagal}} |
| `npx playwright test {{spec}}` | {{skenario E2E}} | {{lulus/gagal}} |
| `node scripts/check-docs.mjs --strict` | spesifikasi ini dan tautannya | {{lulus/gagal}} |

## 9. Referensi

- `docs/README.md` — indeks dan presedensi.
- `docs/03-specs/{{SPEC_TERKAIT}}.md` — kontrak terkait.
- `docs/04-flows/{{FLOW}}.md` — alur yang memakai requirement ini.
- `docs/02-design/design-system.md` — token dan komponen yang dirujuk.
