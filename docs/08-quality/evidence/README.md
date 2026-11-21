---
id: QA-EVIDENCE
title: Evidence Verifikasi
status: accepted
owner: qa
prd_refs: ["§9", "§12"]
---

# Evidence Verifikasi

Direktori ini menyimpan bukti verifikasi yang dihasilkan mesin. Evidence adalah satu-satunya dasar untuk menaikkan status requirement pada [prd-compliance-matrix.md](../../00-foundation/prd-compliance-matrix.md). Tidak ada status `implemented` yang boleh ditulis tanpa evidence yang menyebut perintah, status, timestamp, dan commit.

## 1. Berkas Wajib

| Berkas | Sumber | Isi |
|---|---|---|
| [baseline.json](baseline.json) | `npm run verify:web` | Data mentah hasil verifikasi |
| [baseline.md](baseline.md) | `npm run verify:web` | Ringkasan terbaca manusia dari JSON yang sama |
| `README.md` | Manual | Skema, aturan status, dan aturan klaim |

`baseline.md` MUST ditautkan dari dokumen ini dan dari [release-gates.md](../release-gates.md). Markdown dan JSON wajib konsisten; Markdown dihasilkan dari JSON, bukan diedit manual.

## 2. Skema JSON

```json
{
  "schemaVersion": 1,
  "timestamp": "2026-11-21T00:00:00.000Z",
  "commit": "0123456789abcdef0123456789abcdef01234567",
  "environment": {
    "node": "24.0.0",
    "os": "linux-x64",
    "browser": "chromium"
  },
  "commands": [
    {
      "name": "docs-check",
      "command": "node scripts/check-docs.mjs --strict",
      "status": "pass",
      "exitCode": 0,
      "durationMs": 1200
    },
    {
      "name": "unit",
      "command": "npm test",
      "status": "pass",
      "exitCode": 0,
      "durationMs": 45000
    }
  ],
  "result": "pass"
}
```

Aturan field:

| Field | Tipe | Wajib | Arti |
|---|---|---|---|
| `schemaVersion` | number | Ya | Versi skema; naikkan bila bentuk berubah |
| `timestamp` | string ISO 8601 | Ya | Waktu verifikasi selesai, zona UTC |
| `commit` | string SHA | Ya | Commit yang diverifikasi, bukan commit setelahnya |
| `environment` | object | Ya | Versi Node, OS, dan browser yang dipakai |
| `commands` | array | Ya | Satu entri per perintah yang benar-benar dijalankan |
| `commands[].command` | string | Ya | Perintah lengkap yang dijalankan |
| `commands[].status` | `pass`/`fail`/`skip`/`blocked` | Ya | Hasil perintah |
| `commands[].exitCode` | number | Ya bila dijalankan | Kode keluar proses |
| `commands[].durationMs` | number | Tidak | Durasi eksekusi |
| `result` | `pass`/`partial`/`fail` | Ya | Hasil agregat menurut §4 |

Field `requirements` bersifat opsional. Bila ada, setiap entri MUST merujuk ID yang terdefinisi di spec dan menyebut nama test atau perintah yang membuktikannya. Entri tanpa bukti tidak boleh ditulis.

## 3. Perintah yang Menghasilkan Evidence

| Nama | Perintah | Wajib |
|---|---|---|
| `docs-check` | `node scripts/check-docs.mjs --strict` | Ya |
| `catalog-check` | `node scripts/generate-catalog.mjs --check` | Ya |
| `unit` | `npm test` | Ya |
| `typecheck` | `npm run typecheck` | Ya |
| `lint` | `npm run lint` | Ya |
| `build` | `npm run build` | Ya |
| `e2e` | `npm run e2e` | Ya saat rilis |
| `rust-test` | `cargo test --manifest-path packages/core-rust/Cargo.toml` | Ya bila core Rust berubah |
| `rust-clippy` | `cargo clippy --manifest-path packages/core-rust/Cargo.toml --all-targets -- -D warnings` | Ya bila core Rust berubah |
| `deploy-smoke` | `node scripts/verify-deploy.mjs` | Ya sebelum rilis dinyatakan selesai |

`npm run verify:web` menjalankan rangkaian wajib dan menulis [baseline.json](baseline.json) serta [baseline.md](baseline.md). Evidence yang ditulis manual tidak sah.

## 4. Aturan Status

| Status perintah | Syarat |
|---|---|
| `pass` | Exit code 0 dan keluaran sesuai yang diharapkan (misalnya `docs check: OK`) |
| `fail` | Exit code bukan 0, crash, timeout, atau keluaran tidak sesuai |
| `skip` | Hanya untuk perintah opsional yang tidak dijalankan; alasan wajib dicatat |
| `blocked` | Perintah wajib tidak dapat dijalankan karena lingkungan tidak tersedia; alasan wajib dicatat |

Hasil agregat:

- `pass` hanya bila seluruh perintah wajib berstatus `pass`.
- `partial` hanya bila seluruh perintah wajib `pass` dan ada perintah opsional `skip` atau `blocked`.
- `fail` bila ada perintah wajib `fail` atau `blocked`, atau bila array `commands` tidak memuat perintah wajib.

Perintah yang tidak tercatat dianggap tidak dijalankan. Tidak ada `pass` yang disimpulkan dari dokumen, screenshot, atau pernyataan manusia.

## 5. Aturan Klaim

1. Evidence MUST NOT menyatakan fitur yang belum diimplementasikan sebagai selesai. Contoh: `npm test` yang lulus tidak membuktikan galeri template, Magic Create, builder visual, atau UI clay bila tidak ada test untuk itu.
2. Status pada [prd-compliance-matrix.md](../../00-foundation/prd-compliance-matrix.md) mengikuti cakupan test, bukan niat roadmap. Fitur tanpa test tetap `partial` atau `missing`.
3. Evidence tidak boleh menaikkan status requirement yang acceptance-nya tidak tercakup oleh perintah yang berjalan.
4. Perubahan commit membatalkan evidence untuk area yang berubah sampai `npm run verify:web` dijalankan ulang.
5. Evidence tidak boleh memuat secret, kunci AI, isi vault, data pengguna, atau path pribadi. Log yang diekspor MUST teredaksi.
6. Kegagalan yang diketahui tidak boleh disembunyikan dengan menghapus perintah, menurunkan cakupan, atau menandai `skip` pada perintah wajib.

## 6. Alur Verifikasi

```bash
npm ci
npm run verify:web
```

1. Skrip mencatat `timestamp` dan `commit` sebelum menjalankan perintah.
2. Setiap perintah dicatat dengan status dan exit code.
3. Skrip menulis JSON, lalu menghasilkan Markdown dari JSON yang sama.
4. Reviewer memeriksa `result` dan status perintah pada [baseline.md](baseline.md).
5. Hanya requirement yang benar-benar tercakup boleh diperbarui pada matrix dan [implementation-status.md](../../00-foundation/implementation-status.md).

## 7. Hubungan dengan Gate dan Status

- Gate rilis yang membutuhkan evidence: [release-gates.md](../release-gates.md).
- Cakupan test: [test-strategy.md](../test-strategy.md).
- Aturan dokumentasi dan status: [documentation.md](../../07-rules/documentation.md).
- Baseline terbaru: [baseline.md](baseline.md).

Bila evidence tidak ada atau kedaluwarsa, rilis tidak dapat dinyatakan selesai dan status requirement tidak boleh naik. Evidence adalah catatan apa yang benar-benar dijalankan, bukan ringkasan apa yang diharapkan.
