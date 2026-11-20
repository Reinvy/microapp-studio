---
id: SKILL-SECURITY-REVIEW
title: Security Review
status: accepted
owner: dx
prd_refs: ["§5.1", "§5.2"]
name: security-review
description: "Meninjau perubahan terhadap threat model, sandbox, kripto, otorisasi, SSRF, dan supply chain dengan temuan ber-severity dan test regresi."
when_to_use: "Dipakai sebelum merge untuk perubahan yang menyentuh sandbox, kriptografi, permission, auth, jaringan, registry, atau dependensi."
required_docs: ["docs/01-architecture/threat-model.md", "docs/03-specs/permissions.md", "docs/01-architecture/identity-crypto.md", "docs/01-architecture/sandbox-capabilities.md", "docs/08-quality/security-test-plan.md", "docs/07-rules/security.md"]
---

# Security Review

## Kapan Digunakan

Dipakai untuk setiap perubahan yang menyentuh sandbox dan capability broker, kriptografi dan penyimpanan kunci, autentikasi dan otorisasi, jaringan keluar, registry dan signature, workflow dan webhook, atau dependensi baru. Review ini menghasilkan temuan yang dapat ditindaklanjuti, bukan opini umum.

Di luar cakupan: audit kode menyeluruh tanpa perubahan (tetap dapat memakai prosedur ini dengan seluruh repo sebagai scope) dan pen-test eksternal.

## Prasyarat

- [01-architecture/threat-model.md](../../01-architecture/threat-model.md) dibaca: aset, aktor, trust boundary, tabel STRIDE, dan lima risiko utama PRD §5.1.
- [03-specs/permissions.md](../../03-specs/permissions.md) dan [01-architecture/sandbox-capabilities.md](../../01-architecture/sandbox-capabilities.md) dipahami.
- [01-architecture/identity-crypto.md](../../01-architecture/identity-crypto.md) dipahami: hierarki kunci, envelope, AAD, nonce, dan zeroize.
- [security-test-plan.md](../../08-quality/security-test-plan.md) dan [07-rules/security.md](../../07-rules/security.md) tersedia sebagai acuan mitigasi dan test.

## Input

| Input | Wajib | Contoh |
|---|---|---|
| Scope review | ya | Diff PR yang menambah connector HTTP baru |
| Aset terdampak | ya | Vault, database micro-app, kunci sync |
| Trust boundary yang berubah | ya | micro-app ke Host, server ke jaringan privat |
| Dependensi baru | tidak | Paket npm atau crate yang ditambahkan |
| Temuan sebelumnya | tidak | Temuan terbuka dari review terakhir |

## Prosedur

1. Tetapkan scope: baca diff, daftar file yang berubah, dan komponen arsitektur yang terlibat. Petakan setiap perubahan ke aset dan aktor pada [threat-model.md](../../01-architecture/threat-model.md).
2. Periksa sandbox: `iframe` memakai `sandbox="allow-scripts"` tanpa `allow-same-origin`, CSP `default-src 'none'` dengan pengecualian eksplisit, eksekusi di Worker atau isolate QuickJS/Wasmtime tanpa akses ambient, dan kegagalan inisialisasi bersifat fail closed. Cari `new Function`, `eval`, `innerHTML` tanpa sanitasi, dan akses DOM induk.
3. Periksa kriptografi dan kunci: envelope `version|key_id|nonce|ciphertext|tag`, nonce unik per kunci, AAD header kanonik, verifikasi signature di `packages/core-rust`, kunci non-extractable di Keychain/Keystore/WebCrypto, dan zeroize setelah pemakaian. Tandai setiap plaintext yang tersimpan atau terlog.
4. Periksa otorisasi: RBAC per peran server, evaluasi ABAC sebelum aksi, pemeriksaan permission pada setiap panggilan bridge, sesi akses 15 menit dengan rotasi refresh, dan pencabutan perangkat yang benar-benar menolak `AUTH`.
5. Periksa jaringan keluar: SSRF guard memblokir CIDR privat dan loopback secara default untuk workflow, webhook, plugin, dan connector; allowlist memakai domain, bukan IP; egress yang diblokir tercatat.
6. Periksa supply chain: signature author dan registry terpisah, `contentHash` dan signature diverifikasi sebelum ekstraksi, TOFU dipertahankan, reproducible build diverifikasi, dan dependensi baru memiliki lisensi serta asal yang jelas.
7. Jalankan pemindaian dependensi dan rahasia: `npm audit`, `cargo audit`, `govulncheck`, serta pencarian pola kredensial pada diff. Konfirmasi tidak ada secret yang masuk log, fixture, atau pesan error.
8. Catat setiap temuan dengan format: ID temuan, severity (`critical`, `high`, `medium`, `low`), komponen, bukti, dampak, mitigasi yang diusulkan, dan test regresi. Severity mengikuti dampak nyata, bukan kemudahan perbaikan.
9. Tambahkan test regresi untuk setiap temuan `critical` dan `high`, lalu perbarui [security-test-plan.md](../../08-quality/security-test-plan.md) dan residual risk pada [threat-model.md](../../01-architecture/threat-model.md).
10. Hentikan merge bila masih ada temuan `critical` atau `high` tanpa mitigasi dan test. Temuan `medium` dan `low` boleh dilanjutkan dengan pemilik dan tenggat yang tercatat.
11. Jalankan blok verifikasi, lalu catat ringkasan temuan pada deskripsi PR beserta tautan bukti.

## Verifikasi

```bash
grep -rn "new Function\|eval(" apps packages --include=*.ts --include=*.tsx
npm audit --audit-level=high
cargo audit
cd apps/selfhost-server && govulncheck ./...
npm test
npm run docs:check
```

Perintah audit dan test harus exit `0`; hasil pencarian pola dianalisis manual dan setiap kecocokan harus dijelaskan atau diperbaiki. Test regresi baru harus gagal pada kode sebelum perbaikan dan lulus setelahnya.

## Kesalahan Umum

| Kesalahan | Perbaikan |
|---|---|
| Hanya membaca diff tanpa memetakan ke threat model | Petakan ke aset, aktor, dan trust boundary; tambahkan baris STRIDE bila perlu |
| Menerima residual risk tanpa test | Setiap risiko yang diterima wajib memiliki test atau alasan tertulis |
| Menurunkan severity agar PR cepat merge | Gunakan dampak nyata dan kriteria severity yang konsisten |
| Mengandalkan pemindaian dependensi saja | Periksa desain sandbox, kripto, otorisasi, dan alur data |
| Memperbaiki temuan tanpa test regresi | Tambahkan test yang gagal sebelum perbaikan |
| Melewatkan manifest dan permission dalam review | Periksa juga permission, allowlist, dan signature paket |

## Definition of Done

- Scope, aset, dan trust boundary yang terdampak tercatat.
- Pemeriksaan sandbox, kripto, otorisasi, SSRF, dan supply chain selesai.
- Setiap temuan memiliki severity, bukti, dampak, mitigasi, dan test.
- Tidak ada temuan `critical` atau `high` yang belum dimitigasi.
- Security test plan dan residual risk diperbarui.
- Audit dependensi dan `npm run docs:check` lulus.
