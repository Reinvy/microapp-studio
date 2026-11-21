---
id: GOV-RFC-{{NNNN}}
title: "RFC-{{NNNN}} {{JUDUL}}"
status: draft
owner: governance
prd_refs: ["§{{SECTION}}"]
---

# RFC-{{NNNN}} {{JUDUL}}

Ganti setiap placeholder `{{...}}` dan hapus baris panduan ini. RFC dipakai untuk perubahan kontrak yang memengaruhi lebih dari satu spec: manifest, host bridge, permission, token clay, atau format package `.mapp`.

## Masalah

{{Masalah nyata, siapa yang terdampak, dan bukti bahwa masalah itu ada (kegagalan test, keluhan, atau batas browser). Nyatakan apa yang tidak dapat diselesaikan tanpa perubahan kontrak.}}

## Usulan

{{Bentuk solusi pada tingkat kontrak: field, method, enum, atau token baru. Tuliskan bentuk akhir yang diusulkan, bukan riwayat eksplorasi. Sertakan contoh payload atau potongan schema di dalam code fence.}}

```json
{
  "{{FIELD}}": "{{VALUE}}"
}
```

## Alternatif

| Alternatif | Alasan tidak dipilih |
|---|---|
| {{ALTERNATIF_SATU}} | {{alasan: biaya migrasi, keamanan, aksesibilitas, atau dukungan browser}} |
| {{ALTERNATIF_DUA}} | {{alasan}} |

## Dampak

| Area | Dampak | Kompatibilitas | Tindakan |
|---|---|---|---|
| Manifest | {{field/versi berubah}} | {{none / minor / major}} | {{perbarui schema + parser WASM}} |
| Host Bridge | {{method/namespace berubah}} | {{none / minor / major}} | {{perbarui broker + test}} |
| Permission | {{scope/tier berubah}} | {{none / minor / major}} | {{perbarui consent + audit}} |
| Token clay | {{token/komponen berubah}} | {{none / minor / major}} | {{perbarui `DESIGN.md` + design-system}} |
| Package `.mapp` | {{layout/signature berubah}} | {{none / minor / major}} | {{perbarui verifier + fixture}} |

Untuk setiap area yang berubah, sebutkan file spec dan schema yang wajib diperbarui pada PR yang sama. Tidak ada perubahan perilaku tanpa perubahan dokumen lebih dulu.

## Rollout

1. {{Langkah docs-first: perbarui spec/schema dan tambahkan fixture.}}
2. {{Langkah implementasi di paket nyata, dengan feature flag lokal bila perlu.}}
3. {{Langkah verifikasi: `npm test`, `npm run typecheck`, `node scripts/check-docs.mjs --strict`, dan E2E terkait.}}
4. {{Langkah rollback: cara mengembalikan perilaku lama tanpa kehilangan data pengguna.}}

## Keputusan

{{Diisi setelah review: `accepted`, `rejected`, atau `superseded`, beserta ADR yang mencatat keputusan final. Selama draft, tulis "Belum diputuskan" beserta pemilik review.}}
