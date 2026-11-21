---
id: FLOW-01
title: First Run
status: accepted
owner: product
prd_refs: ["§4 User Journey", "§5 F1"]
---

# First Run

## 1. Tujuan

Menetapkan alur dari membuka situs sampai Home siap dipakai: identitas lokal otomatis, Home langsung tampil, recovery phrase ditunda, dan tidak ada request jaringan. Alur ini menggantikan gate mnemonic 24 kata.

Requirement utama: `FR-SHELL-002`.

## 2. Aktor dan Prasyarat

Aktor: pengguna baru tanpa akun. Prasyarat: browser modern dengan OPFS dan WebCrypto. Tidak ada prasyarat jaringan, undangan, atau konfigurasi.

## Alur Utama

1. Pengguna membuka `/`. Service worker menyajikan shell dari cache atau jaringan pertama.
2. Worker database membuka host DB di OPFS dan memvalidasi schema.
3. Identity worker memeriksa `local_identity`. Jika kosong, ia membuat pasangan kunci Ed25519/X25519 di WebCrypto dan menyimpan private key sebagai `CryptoKey` non-extractable.
4. Home tampil segera. Pada instalasi baru, empty state menampilkan hero dan tiga kartu: Template, Magic Create, Mulai kosong.
5. Banner kecil "Amankan data" muncul dengan aksi **Atur nanti** dan **Buat frasa pemulihan**. Banner tidak menghalangi dan tidak memblokir.
6. Jika pengguna memilih membuat frasa, sheet menampilkan 24 kata, meminta konfirmasi tiga kata, lalu menyimpan frasa terenkripsi. Sheet dapat ditutup kapan saja.
7. Pengguna memilih salah satu kartu create dan masuk ke builder.

Total klik dari buka situs ke builder pada jalur terpendek: dua (kartu Template, lalu Pakai template).

## Cabang Gagal

| Kondisi | Perilaku |
|---|---|
| Host DB gagal dibuka | Home tampil mode terbatas, kode `E-SHELL-001`, aksi retry dan ekspor. |
| Identity gagal dibuat | Mode `ephemeral` dengan badge jelas, `E-SHELL-002`; create tetap bisa, data dapat diekspor. |
| Private key tidak dapat dibuka | `E-AUTH-001`; tawarkan buat identitas baru atau coba lagi. |
| Konfirmasi frasa salah | `E-AUTH-002`; ulangi tanpa membocorkan kata. |
| Service worker gagal | Shell tetap berjalan online dengan `E-SHELL-003` dan badge offline tidak tersedia. |
| Browser tanpa OPFS | Home tampil dengan peringatan kompatibilitas; create dinonaktifkan dengan penjelasan. |

Tidak ada cabang yang menampilkan layar error penuh atau memaksa login.

## Acceptance Criteria

1. Tidak ada dialog identitas, form, atau mnemonic sebelum Home tampil.
2. `local_identity` ada setelah first load, atau mode `ephemeral` ditandai jelas.
3. Tidak ada request jaringan yang berasal dari alur ini.
4. Dari buka situs ke builder ≤ 3 klik.
5. Banner "Amankan data" dapat ditutup dan tidak muncul lagi sampai 7 hari atau sampai pengguna membuka Backup.

## Verifikasi

| Pemeriksaan | Cara |
|---|---|
| Tanpa jaringan | Playwright: context offline dengan cache shell, buka `/`. |
| Identitas otomatis | Vitest: `ensureLocalIdentity()` dipanggil sekali, tidak ada modal. |
| Klik ke builder | Playwright: hitung klik dari `/` ke `/studio/[projectId]`. |
| Frasa ditunda | Playwright: tidak ada kata BIP39 di DOM sebelum banner dipilih. |
| Mode ephemeral | Vitest: mock WebCrypto gagal, cek `E-SHELL-002` dan ekspor. |

## 7. Referensi

- [01-app-shell.md](../03-specs/01-app-shell.md)
- [identity-crypto.md](../01-architecture/identity-crypto.md)
- [ADR-0022](../01-architecture/adr/0022-deferred-recovery-onboarding.md)
