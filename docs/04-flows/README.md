---
id: FLOW-INDEX
title: Indeks Flow
status: accepted
owner: architecture
prd_refs: ["§3 Modul 1", "§3 Modul 6"]
---

# Indeks Flow

Flow mendeskripsikan perilaku lintas komponen yang tidak dapat dijelaskan oleh satu spec saja: urutan panggilan, state yang berubah, cabang gagal, dan bukti verifikasi. Flow bersifat normatif untuk urutan dan perilaku gagal; kontrak field, method, dan kode error tetap berada di [03-specs](../03-specs/01-host-shell.md).

## 1. Tujuan dan Ruang Lingkup

- Menjadi rujukan tunggal untuk urutan operasi yang menyentuh Host, Studio, runtime, data, sync, dan registry.
- Menjaga konsistensi kode error: setiap cabang gagal menunjuk kode yang terdaftar di [03-specs/error-codes.md](../03-specs/error-codes.md).
- Menjadi dasar test integrasi dan E2E: setiap acceptance criteria flow MUST memiliki bukti di `## Verifikasi`.

Di luar ruang lingkup: detail parameter bridge (lihat [03-specs/host-bridge.md](../03-specs/host-bridge.md)), katalog komponen (lihat [02-design/design-system.md](../02-design/design-system.md)), dan prosedur operator (lihat [09-operations/selfhost-runbook.md](../09-operations/selfhost-runbook.md)).

## 2. Indeks Flow

| Flow | Berkas | Modul PRD | Spec normatif | Layar utama |
|---|---|---|---|---|
| FLOW-01 | [01-first-run.md](01-first-run.md) | §3 Modul 1 | [03-specs/01-host-shell.md](../03-specs/01-host-shell.md) | `SCR-01`, `SCR-02` |
| FLOW-02 | [02-install-update-rollback.md](02-install-update-rollback.md) | §3 Modul 5 | [03-specs/05-registry.md](../03-specs/05-registry.md) | `SCR-13`, `SCR-14` |
| FLOW-03 | [03-build-with-ai.md](03-build-with-ai.md) | §3 Modul 2 | [03-specs/02-studio-ide.md](../03-specs/02-studio-ide.md) | `SCR-07`, `SCR-12` |
| FLOW-04 | [04-visual-code-sync.md](04-visual-code-sync.md) | §3 Modul 2 | [03-specs/02-studio-ide.md](../03-specs/02-studio-ide.md) | `SCR-08`, `SCR-09` |
| FLOW-05 | [05-lan-hot-reload.md](05-lan-hot-reload.md) | §3 Modul 2 | [03-specs/02-studio-ide.md](../03-specs/02-studio-ide.md) | `SCR-08`, `SCR-20` |
| FLOW-06 | [06-p2p-sync.md](06-p2p-sync.md) | §3 Modul 6 | [03-specs/06-sync-backup.md](../03-specs/06-sync-backup.md) | `SCR-16` |
| FLOW-07 | [07-backup-recovery.md](07-backup-recovery.md) | §3 Modul 6 | [03-specs/06-sync-backup.md](../03-specs/06-sync-backup.md) | `SCR-17`, `SCR-19` |
| FLOW-08 | [08-workflow-outbox.md](08-workflow-outbox.md) | §3 Modul 4 | [03-specs/04-data-automation.md](../03-specs/04-data-automation.md) | `SCR-11` |
| FLOW-09 | [09-publish-verify.md](09-publish-verify.md) | §3 Modul 5 | [03-specs/05-registry.md](../03-specs/05-registry.md) | `SCR-14` |
| FLOW-10 | [10-selfhost-airgap.md](10-selfhost-airgap.md) | §3 Modul 7 | [03-specs/07-selfhost.md](../03-specs/07-selfhost.md) | `SCR-21` |
| FLOW-11 | [11-permission-consent.md](11-permission-consent.md) | §3 Modul 3 | [03-specs/permissions.md](../03-specs/permissions.md) | `SCR-15` |
| FLOW-12 | [12-crash-recovery.md](12-crash-recovery.md) | §3 Modul 3 | [03-specs/03-sandbox-runtime.md](../03-specs/03-sandbox-runtime.md) | `SCR-22` |
| FLOW-13 | [13-phase0-migration.md](13-phase0-migration.md) | §8 Fase 1 | [00-foundation/implementation-status.md](../00-foundation/implementation-status.md) | `SCR-18` |

Aturan bacaan: flow dengan nomor lebih kecil tidak selalu prasyarat flow berikutnya, tetapi FLOW-01 MUST selesai sebelum flow yang membutuhkan Local Identity dan FLOW-11 MUST dipahami sebelum flow yang memunculkan consent.

## 3. Notasi

| Elemen | Konvensi |
|---|---|
| `## Alur Utama` | Diagram Mermaid `sequenceDiagram` untuk interaksi antaraktor, atau `flowchart` bila urutannya bercabang tanpa aktor bergantian. |
| Langkah bernomor | Satu baris per langkah setelah diagram, memakai MUST/SHOULD/MAY bila ada kewajiban. |
| `## Cabang Gagal` | Tabel `Kondisi` \| `Deteksi` \| `Kode` \| `Perilaku`; setiap baris MUST memiliki tepat satu kode terdaftar. |
| `## Data dan State` | Tabel entitas dan field kunci; state machine ditulis eksplisit dengan `→`. |
| `## Acceptance Criteria` | Format **Given** … **When** … **Then** …, satu baris per kriteria yang dapat diuji. |
| `## Verifikasi` | Tabel bukti dan prosedur; perintah CLI ditulis persis seperti di spec terkait. |
| `## Referensi` | Tautan relatif ke spec, arsitektur, dan flow lain; tanpa anchor. |

## 4. Konvensi Error

- Format kode: `E-<DOMAIN>-<NNN>` dengan domain `HOST`, `STU`, `SBX`, `DATA`, `REG`, `SYNC`, `SRV`, `DEV`, `AUTH`, `CRYPTO`, `NET`, `CLI`.
- Flow MUST NOT memakai kode yang tidak terdaftar di [03-specs/error-codes.md](../03-specs/error-codes.md). Kode baru ditambahkan ke katalog lebih dulu, lalu dipakai flow.
- Severity menentukan presentasi: `warning` memakai banner/toast, `error` memakai panel pada area terkait, `critical` memakai error boundary layar penuh.
- Retry hanya untuk operasi idempoten dan MUST memakai backoff; aksi destruktif tidak di-retry otomatis.
- Pesan pengguna diambil dari kunci locale `error.*`, bukan string bebas di kode; detail teknis hanya tersedia lokal.

## 5. Aturan Menulis Flow Baru

1. Pastikan perilaku sudah diatur spec; bila belum, revisi spec atau ajukan RFC lebih dulu.
2. Alokasikan `FLOW-<NN>` berikutnya dan pakai sebagai `id` frontmatter serta awalan judul.
3. Tulis seluruh bagian wajib dalam urutan baku: `Trigger`, `Aktor`, `Prasyarat`, `Alur Utama`, `Cabang Gagal`, `Data dan State`, `Izin dan Keamanan`, `Perilaku Offline`, `Acceptance Criteria`, `Verifikasi`, `Referensi`.
4. Rujuk minimal satu `FR-*` atau `SEC-*` yang sudah didefinisikan spec; jangan mendefinisikan ulang requirement di flow.
5. Tambahkan baris pada tabel §2 dan pastikan flow tertaut dari halaman ini agar dapat dijangkau dari [docs/README.md](../README.md).
6. Perbarui [00-foundation/prd-compliance-matrix.md](../00-foundation/prd-compliance-matrix.md) bila flow menjadi rujukan requirement baru.

## 6. Acceptance Criteria

- **Given** flow baru **When** diperiksa **Then** seluruh bagian wajib ada dalam urutan baku dan `## Alur Utama` memuat diagram Mermaid tidak kosong.
- **Given** tabel `## Cabang Gagal` **When** diaudit **Then** setiap baris memiliki kode `E-*` yang terdaftar dan sesuai penyebabnya.
- **Given** flow apa pun **When** `npm run docs:check` dijalankan **Then** tidak ada tautan rusak, kode tidak terdaftar, atau referensi requirement yang hilang.
- **Given** flow yang menyentuh consent atau kriptografi **When** ditinjau **Then** flow merujuk `SEC-*` yang relevan dan mencatat audit.

## 7. Verifikasi

| Bukti | Prosedur |
|---|---|
| Struktur | `npm run docs:check` memeriksa bagian wajib, Mermaid tidak kosong, dan kode fence seimbang |
| Referensi | Checker memastikan setiap `E-*`, `FR-*`, `SEC-*`, dan `FLOW-*` terdefinisi sebelum dipakai |
| Tautan | Checker menelusuri setiap tautan relatif dari [docs/README.md](../README.md) hingga flow ini dan seluruh berkas flow |
| Konsistensi | Review manual membandingkan urutan langkah flow dengan spec dan arsitektur terkait |
