---
id: ADR-0006
title: ADR-0006 Format Paket mapp
status: accepted
owner: architecture
prd_refs: ["§4.3", "§3 Modul 5"]
---

# ADR-0006 Format Paket mapp

## Konteks

Distribusi offline membutuhkan satu berkas yang dapat diverifikasi bit-per-bit, dibagikan lewat USB/AirDrop/QR, dan dipasang tanpa jaringan. PRD §4.3 menetapkan arsip ZIP/Zstd deterministik dengan manifest dan signature.

## Keputusan

1. **`.mapp` adalah ZIP deterministik:**
   - entry diurutkan berdasarkan nama (byte order, case-sensitive);
   - timestamp entry tetap `1980-01-01 00:00:00`;
   - kompresi deflate level 9;
   - tanpa extra field, tanpa komentar arsip, tanpa data descriptor;
   - permission entry konstan (`0644` file, `0755` direktori).
2. **Zstd hanya wrapper transport**, bukan format kanonik. Verifikasi dilakukan pada ZIP.
3. **Layout:** `manifest.json`, `dist/`, `assets/`, `db/migrations/`, `signatures/`.
4. **Signature Ed25519 detached** atas digest kanonik ZIP; `signatures/author.ed25519` dan `signatures/registry.ed25519` terpisah. Registry key dan author key tidak boleh sama.
5. **`contentHash`** dihitung dari ZIP kanonik dan dicatat di manifest serta indeks registry.
6. Parser **menolak** entry dengan path absolut, `..`, symlink, entry duplikat, ukuran dekompresi melebihi batas, dan jumlah entry melebihi batas (zip bomb guard).
7. Reproducible build diverifikasi dengan membangun ulang dari commit dan membandingkan `contentHash`.

## Konsekuensi

- Dua build dari commit yang sama menghasilkan hash identik; perbedaan berarti non-determinisme yang harus diperbaiki.
- Tooling pack wajib menormalkan metadata; library ZIP default yang menulis timestamp lokal tidak boleh dipakai.
- Signature harus dihitung setelah ZIP final; perubahan apa pun membatalkan signature.
- Guard parser menjadi bagian core Rust dan diuji dengan fixture berbahaya.

## Alternatif

| Alternatif | Alasan ditolak |
|---|---|
| TAR/Zstd | Kurang universal untuk ekstraksi di browser dan alat pengguna. |
| ZIP dengan timestamp nyata | Tidak reproducible. |
| Signature embedded di manifest saja | Manifest dapat diubah; signature harus detached atas artefak penuh. |
| Satu kunci untuk author dan registry | Menghilangkan pemisahan kepercayaan yang diminta PRD §5.1. |
| OCI image | Terlalu berat untuk micro-app dan tidak ramah dibagikan offline. |

## Status

`accepted`. Detail field dan validasi ada di [03-specs/manifest-v2.md](../../03-specs/manifest-v2.md).
