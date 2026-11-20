---
id: SPEC-DEV
title: DevTools, CLI, dan SDK
status: accepted
owner: dx
prd_refs: ["§3 Modul 8", "§7.1"]
---

# 08. DevTools, CLI, dan SDK

## 1. Tujuan dan Ruang Lingkup

DevTools memberi visibilitas lokal tanpa telemetry, CLI memberi alur build/pack/publish yang dapat direproduksi, dan SDK/Plugin API memungkinkan komunitas memperluas Host tanpa mengubah inti.

Di luar lingkup: runtime sandbox (spec 03), registry server (spec 05/07), manifest (spec 08 kontrak manifest).

## 2. Aktor dan Prasyarat

| Aktor | Prasyarat |
|---|---|
| Developer | Node.js LTS, akses project dan kunci signing |
| Plugin author | SDK dan izin plugin eksplisit |
| Admin self-host | Analytics opt-in dan akses instance |
| QA | Build reproducible dan fixture |

## 3. Requirement

| ID | Level | Requirement | Acceptance |
|---|---|---|---|
| FR-DEV-001 | MUST | DevTools MUST menampilkan pemakaian RAM per micro-app secara real-time dengan riwayat 60 detik dan penanda kuota. | Dua app berjalan menampilkan angka terpisah; penanda 80% muncul. |
| FR-DEV-002 | MUST | DevTools MUST menampilkan FPS Host dan micro-app aktif, termasuk frame drop, tanpa mengirim data keluar. | Grafik FPS tampil; tidak ada request jaringan dari panel. |
| FR-DEV-003 | MUST | DevTools MUST menampilkan query SQLite lambat (> 50 ms) dengan durasi, tabel, dan rencana query yang aman. | Query lambat tercatat dengan durasi; data sensitif tidak ditampilkan. |
| FR-DEV-004 | MUST | DevTools MUST menampilkan antrean sinkronisasi (peer, transport, cursor, antrean, error) dan mengizinkan retry manual. | Antrean tampil; retry memicu pengiriman ulang tanpa duplikasi. |
| FR-DEV-005 | MUST | DevTools MUST menampilkan panggilan Host Bridge (namespace, method, durasi, hasil) dan mengizinkan filter per app. | Panggilan tampil; filter app bekerja; payload sensitif diredaksi. |
| FR-DEV-006 | MUST | DevTools MUST menampilkan console log micro-app yang terisolasi per app, dengan level, timestamp, dan ekspor lokal. | Log app A tidak bercampur dengan app B; ekspor menghasilkan berkas lokal. |
| FR-DEV-007 | SHOULD | Analytics self-host MUST opt-in, menampilkan jumlah pengguna aktif dan error rate, disimpan di instance sendiri, dan MUST dapat dimatikan total tanpa memengaruhi fitur. | Instance tanpa opt-in tidak mengumpulkan data; opt-in menampilkan dashboard; mematikan menghentikan pengumpulan. |
| FR-DEV-008 | MUST | CLI MUST menyediakan `microapp init <template> [--dir] [--no-install]` dengan template React, Svelte, Vue, Solid, Flutter-Schema, dan Vanilla TS/WASM. | Setiap template menghasilkan project yang lolos `microapp test`. |
| FR-DEV-009 | MUST | CLI MUST menyediakan `microapp dev [--lan] [--port 5173]` yang menjalankan dev server lokal dan, dengan `--lan`, menampilkan QR hot reload. | `--lan` menampilkan QR; port dapat diubah; tanpa jaringan tetap berjalan lokal. |
| FR-DEV-010 | MUST | CLI MUST menyediakan `microapp test [--sandbox] [--watch] [--coverage]` yang menjalankan unit test, simulasi offline, dan audit kepatuhan permission. | `--sandbox` menjalankan audit permission; `--coverage` menghasilkan laporan; `--watch` memantau perubahan. |
| FR-DEV-011 | MUST | CLI MUST menyediakan `microapp pack [--sign <key>] [--out <file>] [--reproducible]` yang menghasilkan `.mapp` deterministik dan signature detached. | Dua pack dari commit sama menghasilkan hash identik; signature terverifikasi. |
| FR-DEV-012 | MUST | CLI MUST menyediakan `microapp publish [--registry <url\|git>] [--tag] [--dry-run]` yang memverifikasi signature dan hash sebelum publikasi. | `--dry-run` tidak mengubah registry; publish menolak artefak tanpa signature. |
| FR-DEV-013 | MUST | CLI MUST memakai exit code `0` sukses, `1` validasi, `2` jaringan, `3` signature/permission, dan MUST mendokumentasikannya. | Setiap kondisi menghasilkan exit code yang dijanjikan pada test. |
| FR-DEV-014 | MUST | Semua perintah CLI MUST mendukung `--json` dengan output terstruktur stabil dan tanpa warna/ANSI. | Output `--json` dapat diparse; tidak ada escape ANSI. |
| FR-DEV-015 | MUST | Host Plugin API MUST memungkinkan penambahan sync connector dengan kontrak transport, test, dan izin eksplisit. | Plugin connector uji tersambung dan lulus test kontrak. |
| FR-DEV-016 | MUST | Host Plugin API MUST memungkinkan adapter LLM lokal baru dengan antarmuka yang sama seperti adapter bawaan. | Adapter plugin muncul di pemilih provider dan berfungsi. |
| FR-DEV-017 | MUST | Host Plugin API MUST memungkinkan theme global yang tervalidasi terhadap token MADS tanpa warna arbitrer di luar token yang diizinkan. | Theme plugin lolos validasi token; nilai tidak valid ditolak. |
| FR-DEV-018 | SHOULD | Host Plugin API MUST memungkinkan native capability bridge (mis. serial/USB/printer) dengan permission dan audit. | Plugin printer mengakses perangkat hanya setelah consent; audit tercatat. |
| FR-DEV-019 | MUST | SDK MUST menyediakan API TypeScript/WASM untuk data, bridge, intent, dan UI MUIP dengan tipe lengkap dan versi yang eksplisit. | Project contoh dikompilasi tanpa `any`; versi SDK tercatat di manifest. |
| FR-DEV-020 | MUST | SDK MUST menyertakan dokumentasi API, contoh, dan compatibility matrix; perubahan breaking MUST menaikkan major dan melalui RFC. | Docs API lengkap; breaking change memiliki catatan migrasi. |

## 4. Model Data dan State

| Entitas | Field kunci | Invariant |
|---|---|---|
| `devtools_session` | `id`, `started_at`, `app_filter`, `state` | Hanya aktif saat mode developer |
| `plugin_manifest` | `id`, `version`, `capabilities`, `permissions`, `entry` | Capability ⊆ daftar resmi |
| `cli_run` | `command`, `exit_code`, `duration_ms`, `json_output` | Tidak menyimpan kredensial |

State CLI: `parse → validate → execute → report`. `validate` MUST berjalan sebelum aksi destruktif (`publish`, `pack`).

## 5. Error dan Recovery

| Kode | Kondisi | Recovery |
|---|---|---|
| E-DEV-001 | DevTools tidak dapat mengakses runtime | Tampilkan status, jangan fallback ke mode tanpa isolasi |
| E-DEV-002 | Query inspector gagal | Tampilkan error, pertahankan buffering, jangan blokir app |
| E-DEV-003 | Plugin gagal dimuat | Nonaktifkan plugin, tampilkan alasan, jangan menjatuhkan Host |
| E-DEV-004 | Plugin meminta capability di luar izin | Tolak, audit, minta consent ulang |
| E-DEV-005 | Analytics opt-in gagal | Matikan pengumpulan, tampilkan status, fitur inti tetap jalan |
| E-CLI-001 | Validasi manifest gagal | Exit 1, tampilkan field yang gagal |
| E-CLI-002 | Jaringan tidak tersedia | Exit 2, pertahankan artefak lokal, sarankan `--dry-run` |
| E-CLI-003 | Signature/permission tidak valid | Exit 3, tampilkan alasan, jangan publikasi |
| E-CLI-004 | Template tidak ditemukan | Exit 1, tampilkan daftar template yang tersedia |
| E-CLI-005 | Pack tidak reproducible | Exit 1, tampilkan perbedaan hash dan penyebab |

## 6. Keamanan dan Privasi

- DevTools hanya aktif dalam mode developer dan tidak mengirim data keluar.
- Log dan trace diredaksi; token, kunci, dan isi Vault tidak pernah tampil.
- Plugin berjalan dengan capability yang dideklarasikan dan disetujui; tidak ada akses implisit.
- CLI membaca kunci signing dari file/agent dengan izin ketat; tidak pernah menulis kunci ke output atau log.
- Analytics self-host menyimpan data di instance sendiri dan dapat dihapus admin.

## 7. Acceptance Criteria

- **Given** mode developer aktif **When** dua micro-app berjalan **Then** RAM dan FPS ditampilkan terpisah tanpa request keluar.
- **Given** project dengan permission berisiko **When** `microapp test --sandbox` **Then** audit menampilkan temuan dan exit code sesuai.
- **Given** dua kali `microapp pack --reproducible` **When** dibandingkan **Then** hash identik.
- **Given** `microapp publish` tanpa signature **When** dijalankan **Then** exit 3 dan registry tidak berubah.
- **Given** output `--json` **When** diparse **Then** tidak ada ANSI dan field stabil.

## 8. Verifikasi

| Bukti | Perintah/Prosedur |
|---|---|
| CLI | Test tiap perintah dan exit code; snapshot output `--json` |
| Reproducible | Pack dua kali; bandingkan hash |
| Plugin | Fixture plugin connector/LLM/theme; test izin dan crash isolation |
| DevTools | Ukur overhead panel; pastikan < 5% FPS drop |
| Privacy | Inspeksi jaringan saat DevTools aktif |

## 9. Referensi

- [03-specs/manifest-v2.md](manifest-v2.md), [03-specs/ui-protocol.md](ui-protocol.md), [03-specs/08-devtools-cli-sdk.md](08-devtools-cli-sdk.md)
- [01-architecture/ai-workflow.md](../01-architecture/ai-workflow.md), [06-skills/release-selfhost/SKILL.md](../06-skills/release-selfhost/SKILL.md)
