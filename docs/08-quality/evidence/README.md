---
id: QA-EVIDENCE-0
title: Evidence Verifikasi Fase
status: accepted
owner: qa
prd_refs: ["§8"]
---

# Evidence Verifikasi Fase

Direktori ini menyimpan bukti verifikasi per fase. Bukti adalah satu-satunya dasar untuk menaikkan status di [prd-compliance-matrix.md](../../00-foundation/prd-compliance-matrix.md).

## 1. Struktur

| Berkas | Isi |
|---|---|
| `phase-<n>.json` | Ditulis `scripts/verify-phase-<n>.mjs`: daftar perintah, commit SHA, timestamp, hasil, requirement yang dibuktikan, suite keamanan, dan gate manual |
| `phase-<n>.md` | Ringkasan terbaca manusia dari JSON yang sama, ditulis skrip yang sama |

JSON dan Markdown wajib konsisten: Markdown dihasilkan dari JSON, bukan diedit manual.

## 2. Skema JSON

```json
{
  "phase": 1,
  "commit": "0123456789abcdef0123456789abcdef01234567",
  "generatedAt": "2026-01-01T00:00:00.000Z",
  "environment": {
    "node": "24.19.0",
    "rust": "1.99.0",
    "flutter": "3.47.1",
    "go": "1.27.1",
    "chrome": "playwright-chrome"
  },
  "commands": [
    { "cmd": "npm test", "exitCode": 0, "durationMs": 41230 }
  ],
  "requirements": [
    { "id": "FR-HOST-001", "status": "implemented", "evidence": "npm test -t identity" }
  ],
  "securitySuites": [
    { "id": "R-15", "status": "implemented", "evidence": "e2e/sandbox-limits.spec.ts" }
  ],
  "manualGates": [
    { "id": "ios-build", "status": "blocked", "reason": "toolchain tidak tersedia di lingkungan ini" }
  ],
  "result": "pass"
}
```

## 3. Aturan

1. Status per requirement hanya `implemented`, `partial`, atau `blocked`. `missing` tidak boleh muncul pada evidence fase yang dinyatakan lulus.
2. Setiap entri wajib memuat `evidence` berupa perintah, nama test, atau berkas bukti yang dapat dijalankan ulang.
3. Gate manual yang tidak dapat dijalankan di lingkungan verifikasi dicatat `blocked` atau `partial` beserta alasannya; tidak boleh dihilangkan dari daftar.
4. `scripts/apply-status.mjs --evidence docs/08-quality/evidence/phase-<n>.json` adalah satu-satunya cara memperbarui kolom Status matriks. Skrip menolak ID yang tidak dikenal dan status tanpa bukti.
5. Evidence tidak boleh memuat secret, token, path pengguna, atau data pribadi.
6. Evidence fase lama tidak dihapus; bila gate diulang, JSON ditimpa dan riwayat commit mempertahankan versi sebelumnya.

## 4. Daftar Fase

| Fase | Record |
|---|---|
| 1 | [phase-1.md](phase-1.md) |
| 2 | [phase-2.md](phase-2.md) |
| 3 | [phase-3.md](phase-3.md) |
| 4 | [phase-4.md](phase-4.md) |
| 5 | [phase-5.md](phase-5.md) |

## 5. Referensi

- [release-gates.md](../release-gates.md) — perintah gate per fase.
- [refactor-roadmap.md](../../00-foundation/refactor-roadmap.md) — langkah dan status.
- [definition-of-done.md](../definition-of-done.md) — arti "selesai".
