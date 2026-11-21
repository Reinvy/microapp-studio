---
id: FOUND-PRODUCT
title: Product Foundation
status: accepted
owner: product
prd_refs: ["§1 Visi dan Prinsip", "§2 Ruang Lingkup"]
---

# Product Foundation

## 1. Visi

MicroApp Studio adalah satu situs tempat siapa pun dapat membuat, menjalankan, dan membagikan micro-app tanpa akun, tanpa server, dan tanpa pengetahuan deployment. Produk ini menggantikan ekosistem multi-platform dengan satu PWA responsif yang bekerja di desktop, tablet, dan mobile browser.

## 2. Lima Pilar

| Pilar | Janji | Bukti yang harus ada |
|---|---|---|
| **Shell** | Buka situs, Home langsung siap, identitas dibuat otomatis. | Boot < 1 s, tidak ada modal identitas, offline shell. |
| **Create** | Tiga jalur membuat app tanpa wizard. | Template, Magic Create, blank semuanya mencapai builder ≤ 3 klik. |
| **Builder** | Susun app secara visual dengan token clay. | Canvas, palette 48/120, inspector token, autosave, undo. |
| **Package** | Bagikan dan pasang `.mapp` bertanda tangan. | Pack deterministik, verifikasi signature, permission preview. |
| **Trust** | Zero privilege, zero telemetry, backup terenkripsi. | Consent JIT, offline cage, audit lokal, restore terverifikasi. |

## 3. Persona

| Persona | Kebutuhan utama | Ukuran keberhasilan |
|---|---|---|
| Maker | Membuat app berguna tanpa belajar kode. | App pertama berjalan ≤ 3 menit. |
| Power User | Kontrol struktur, data, dan package. | Dapat menginspeksi JSON dan mengekspor `.mapp`. |
| Template Author | Membagikan app yang dapat diverifikasi. | Penerima dapat memeriksa permission dan signature. |
| Reviewer | Menilai keamanan sebelum memasang. | Permission preview dan key mismatch terlihat jelas. |

## 4. Metrik Produk

| Metrik | Target | Sumber |
|---|---|---|
| Time to first running app | ≤ 3 menit | Instrumentasi lokal E2E, bukan telemetry. |
| Klik Home → builder | ≤ 3 | Playwright. |
| Offline start | Shell dan app terpasang terbuka tanpa jaringan | Playwright offline. |
| Consent clarity | 100% permission berisiko tinggi memiliki alasan plain-language | Audit konten. |
| Data safety | Backup round-trip berhasil 100% pada fixture | Vitest. |
| Accessibility | 0 pelanggaran serius axe pada 12 layar | axe CI. |

Tidak ada metrik yang dikumpulkan dari pengguna secara otomatis. Semua angka berasal dari pengujian lokal dan build, bukan telemetry.

## 5. Mode Operasi

Hanya ada dua mode yang didukung:

1. **Browser online** — shell dan aset dapat dimuat dari jaringan; data tetap lokal.
2. **Browser offline** — shell dan app terpasang dimuat dari cache; tidak ada sinkronisasi.

Tidak ada mode server, mode desktop native, mode LAN, atau mode pairing. Dokumen dan UI MUST NOT menyiratkan mode lain.

## 6. Batas Produk

- Tidak ada akun, cloud sync, atau pemulihan akun.
- Tidak ada backend wajib; deploy dapat berupa host statis/Node.
- Tidak ada marketplace atau publish pipeline.
- Tidak ada akses privilege di luar permission yang dideklarasikan.
- Tidak ada AI wajib; Magic Create opsional dengan BYOK.
- Tidak ada jaminan bahwa browser tidak akan mengusir storage; produk menyediakan ekspor dan backup.

## 7. Prinsip Keputusan

Saat ragu, pilih opsi yang: (1) mengurangi langkah pengguna, (2) menjaga data tetap lokal, (3) gagal tertutup, (4) dapat diuji tanpa jaringan, dan (5) tidak menambah platform baru.

## 8. Verifikasi

| Pemeriksaan | Cara |
|---|---|
| Tidak ada mode terlarang | Sweep istilah dan review dokumen |
| Metrik dapat diuji | Setiap metrik memiliki alat di tabel §4 |
| Batas produk konsisten | Matriks dan spec merujuk batas yang sama |
