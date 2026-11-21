---
id: ARCH-ADR-INDEX
title: Indeks Architecture Decision Records
status: accepted
owner: architecture
prd_refs: ["§2", "§7"]
---

# Indeks Architecture Decision Records

ADR merekam keputusan arsitektur yang mengikat. ADR berstatus `accepted` menang atas spec sampai spec diperbarui, dan wajib dicerminkan ke spec pada PR yang sama atau PR lanjutan yang segera menyusul. Ruang lingkup produk adalah web-only PWA; ADR dalam indeks ini menggantikan seluruh keputusan platform lama.

## 1. Daftar ADR

| ADR | Judul | Status | Dampak utama |
|---|---|---|---|
| [ADR-0017](0017-web-only-nextjs-pwa.md) | Web-Only Next.js PWA | accepted | Satu codebase Next.js 16, tanpa native dan tanpa server wajib |
| [ADR-0018](0018-browser-local-first-data.md) | Data Local-First di Browser | accepted | SQLite WASM + OPFS via worker; IndexedDB hanya kunci/metadata |
| [ADR-0019](0019-iframe-sandbox-muip.md) | Sandbox Iframe Opaque Origin dan MUIP | accepted | Isolasi iframe, renderer MUIP, satu bridge, fail closed |
| [ADR-0020](0020-mapp-package-signing.md) | Format Paket `.mapp` dan Signature | accepted | Manifest v2, ZIP deterministik, signature Ed25519 detached |
| [ADR-0021](0021-claymorphism-design-system.md) | MADS v3 Claymorphism Design System | accepted | Token berlapis, prefiks `--mads-*`, aksesibilitas dan motion |
| [ADR-0022](0022-deferred-recovery-onboarding.md) | Onboarding Identitas dengan Recovery Ditunda | accepted | Identitas otomatis, frasa pemulihan ditunda, Home tidak diblokir |

ADR bernomor 0001 sampai 0016 telah dihapus karena mendokumentasikan platform native, server, CRDT, P2P, dan registry terfederasi yang tidak lagi ada. Git history adalah arsipnya; tidak ada alias atau dokumen `deprecated` yang ditautkan dari indeks aktif.

## 2. Format

Setiap ADR memuat frontmatter `id`, `title`, `status`, `owner`, dan `prd_refs`, lalu bagian:

1. `Konteks` — masalah, batasan, dan kekuatan yang membentuk keputusan.
2. `Keputusan` — pilihan yang mengikat, termasuk default dan versi.
3. `Konsekuensi` — dampak, biaya, dan larangan.
4. `Alternatif` — pilihan yang ditolak dan alasannya.
5. `Verifikasi` — cara membuktikan keputusan diterapkan.

Status yang sah: `accepted`, `implemented`, `deprecated`, atau `superseded by ADR-NNNN`.

## 3. Aturan Supersede

1. ADR yang sudah `accepted` tidak diedit untuk mengubah keputusan. Buat ADR baru dengan nomor berikutnya, lalu tandai ADR lama `superseded by ADR-NNNN` dan tautkan penggantinya.
2. ADR baru wajib menyebut ADR yang digantikan, alasan penggantian, dan langkah migrasi bagi spec serta implementasi.
3. Perubahan kontrak—manifest, bridge, permission, token, package, atau kriptografi—wajib melalui [RFC](../../10-contributing/rfc-process.md) sebelum ADR baru diterima.
4. Spec dan flow yang terdampak wajib diperbarui pada PR yang sama. ADR tanpa pembaruan spec dianggap belum selesai.
5. ADR yang tidak lagi relevan menjadi `deprecated`, bukan dihapus. Penghapusan hanya dilakukan untuk ADR yang mendokumentasikan platform yang sudah tidak ada, dan keputusan itu dicatat pada indeks ini.

## 4. Penomoran

1. Nomor ADR berurutan empat digit dan tidak pernah dipakai ulang.
2. ADR berikutnya memakai nomor urut 0023, yaitu nomor setelah 0022, dan belum boleh dipakai sebelum diterima.
3. ADR baru harus memiliki satu keputusan utama yang dapat diuji, bukan kumpulan preferensi.
4. Judul ADR berupa frasa keputusan, bukan nama teknologi saja.
5. Setiap ADR baru wajib menambahkan satu baris pada tabel di bagian 1.

## 5. Keputusan yang Memerlukan Tinjauan Khusus

Keputusan yang menyentuh data pengguna, kunci, isolasi sandbox, atau distribusi paket memerlukan tinjauan keamanan sebelum diterima. Minimal mencakup ADR-0018, ADR-0019, dan ADR-0020. Perubahan pada keputusan tersebut tidak boleh dilakukan lewat commit langsung; gunakan RFC dan ADR pengganti.
