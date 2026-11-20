---
id: SKILL-ADD-PERMISSION
title: Menambah Permission
status: accepted
owner: dx
prd_refs: ["§3 Modul 3", "§5.1"]
name: add-permission
description: "Menambah atau memperluas permission dari katalog sampai broker, consent, audit, dan test penolakan akses."
when_to_use: "Dipakai saat micro-app membutuhkan akses baru, risk tier berubah, atau semantik allowlist dan consent perlu diperluas."
required_docs: ["docs/03-specs/permissions.md", "docs/01-architecture/sandbox-capabilities.md", "docs/03-specs/host-bridge.md", "docs/03-specs/manifest-v2.md", "docs/01-architecture/threat-model.md", "docs/07-rules/security.md"]
---

# Menambah Permission

## Kapan Digunakan

Dipakai ketika sebuah micro-app memerlukan akses yang belum tercakup katalog permission, ketika risk tier sebuah permission berubah, atau ketika semantik consent, mock, allowlist, dan audit perlu diperluas. Perubahan permission selalu menyentuh manifest, broker sandbox, Host Bridge, UI consent, dan audit sekaligus.

Di luar cakupan: menambah method bridge tanpa permission baru (tetap memerlukan perubahan [host-bridge.md](../../03-specs/host-bridge.md)) dan menambah field manifest non-permission (gunakan [extend-manifest](../extend-manifest/SKILL.md)).

## Prasyarat

- [03-specs/permissions.md](../../03-specs/permissions.md) bagian 3–7 dibaca, termasuk seluruh `SEC-` yang sudah ada dan risk tier-nya.
- [01-architecture/sandbox-capabilities.md](../../01-architecture/sandbox-capabilities.md) dipahami: broker zero-privilege, kuota, dan lifecycle.
- [03-specs/host-bridge.md](../../03-specs/host-bridge.md) dipahami: envelope, namespace, error, dan pembatasan akses langsung.
- [01-architecture/threat-model.md](../../01-architecture/threat-model.md) dibaca untuk ancaman capability bypass dan eskalasi izin.
- Tidak ada grant lama yang akan diam-diam diperluas tanpa consent baru.

## Input

| Input | Wajib | Contoh |
|---|---|---|
| Permission ID | ya | `camera.qr` atau ID baru berformat lowercase bertitik |
| Risk tier | ya | `low`, `medium`, atau `high` |
| Alasan yang ditampilkan | ya | Alasan yang berasal dari manifest dan dapat dipahami pengguna |
| Method bridge | ya | Namespace dan method yang dilindungi permission tersebut |
| Perilaku mock | tidak | Data sintetis untuk `camera`, `location`, `microphone`, atau `biometrics` |

## Prosedur

1. Baca [03-specs/permissions.md](../../03-specs/permissions.md) dan [03-specs/manifest-v2.md](../../03-specs/manifest-v2.md) aturan M-13 dan M-14; catat permission yang sudah ada agar tidak menduplikasi kemampuan.
2. Tetapkan permission ID lowercase bertitik dan risk tier. Gunakan `low` hanya untuk akses lokal tanpa data pribadi, `medium` untuk sensor dan data pribadi, dan `high` untuk jaringan atau akses yang dapat mengeksfiltrasi data.
3. Alokasikan nomor `SEC-` berikutnya yang belum terpakai pada katalog. Bila seluruh rentang `SEC-001`–`SEC-020` sudah terpakai, hentikan dan ajukan RFC untuk memperluas katalog; jangan memakai nomor di luar rentang yang disetujui.
4. Tambahkan baris requirement pada tabel `## 3. Requirement` di `docs/03-specs/permissions.md`: ID, level `MUST`/`SHOULD`, perilaku yang diizinkan dan dilarang, serta acceptance yang dapat diuji.
5. Perbarui konsen dan audit pada spec yang sama: teks dialog, opsi `Allow once`/`Allow`/`Deny`, pencabutan, perubahan izin saat update, dan event audit yang wajib dicatat.
6. Perbarui kontrak manifest: tambahkan ID permission ke enum pada `docs/03-specs/schemas/microapp.manifest.v2.schema.json` dan aturan validasi di spec manifest. Permission di luar katalog MUST ditolak sebelum consent.
7. Implementasikan pemeriksaan di broker: `packages/core-rust` memegang guard, sedangkan `packages/runtime-web` dan `packages/runtime-native` memanggil guard pada setiap panggilan bridge. Tanpa grant aktif, panggilan MUST gagal; jangan mengecek permission hanya saat mount.
8. Tambahkan atau perbarui method pada [03-specs/host-bridge.md](../../03-specs/host-bridge.md) dengan parameter, hasil, error, timeout, dan permission yang diperlukan, lalu implementasikan di Host web dan native.
9. Implementasikan UI consent memakai dialog permission MADS: tampilkan nama app, permission ID, risk tier, alasan, dan tiga opsi keputusan. Simpan copy pada `locales/id-ID/permissions.json` dan `locales/en-US/permissions.json`.
10. Implementasikan pencabutan dari Pengaturan dan detail app, perilaku `Allow once` yang berakhir saat app ditutup, consent ulang saat update menambah permission atau menaikkan risk tier, serta mock/spoof dan Offline Cage bila relevan.
11. Tulis test: grant, deny, revoke, allow-once, update consent, mock, pemanggilan tanpa grant yang harus gagal, dan baris audit yang harus tertulis tanpa data sensitif.
12. Perbarui [prd-compliance-matrix.md](../../00-foundation/prd-compliance-matrix.md) untuk `SEC-` baru, lalu jalankan verifikasi dan perbarui [implementation-status.md](../../00-foundation/implementation-status.md).

## Verifikasi

```bash
npm test
microapp test --sandbox
cargo test -p microapp-core
npm run docs:check
```

Uji manual tambahan: buka micro-app yang meminta permission `medium`, pilih `Allow once`, tutup app, lalu buka kembali; panggilan harus ditolak sampai pengguna memberi grant baru, dan audit harus memuat keputusan sebelumnya.

## Kesalahan Umum

| Kesalahan | Perbaikan |
|---|---|
| Memberi grant default agar fitur langsung berjalan | Zero-privilege default wajib; tanpa grant, panggilan harus gagal |
| Memakai ulang nomor `SEC-` yang sudah ada | Alokasikan nomor berikutnya; perluas katalog lewat RFC bila habis |
| Memeriksa permission hanya saat mount | Periksa pada setiap panggilan bridge di broker |
| Menulis teks consent hardcoded di komponen | Tambahkan kunci pada `locales/id-ID` dan `locales/en-US` |
| Tidak mencatat penolakan akses | Setiap grant, deny, revoke, dan penolakan wajib masuk audit lokal |
| Menambah permission di manifest tanpa memperbarui schema | Perbarui schema dan spec dalam commit yang sama |

## Definition of Done

- Permission ID, risk tier, dan nomor `SEC-` baru tercatat di katalog permission.
- Manifest dan JSON Schema menerima ID baru dan menolak ID tak dikenal.
- Broker menolak panggilan tanpa grant dan mencatat setiap keputusan.
- Consent menampilkan alasan, risk tier, dan tiga opsi; copy tersedia untuk `id-ID` dan `en-US`.
- Revoke, allow-once, update consent, mock, dan Offline Cage diuji.
- Test broker, bridge, dan UI lulus; `npm run docs:check` bersih.
