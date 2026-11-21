---
id: FOUND-GLOSSARY
title: Glosarium
status: accepted
owner: product
prd_refs: ["§2 Ruang Lingkup", "§5 Fitur"]
---

# Glosarium

## 1. Tujuan

Menetapkan istilah kanonik yang dipakai di seluruh dokumen, kode, dan UI. Istilah di luar daftar ini tidak boleh dipakai untuk arti yang sama.

## 2. Istilah Produk

| Istilah | Arti |
|---|---|
| **Micro-app** | Aplikasi kecil yang berjalan di dalam MicroApp Studio, dirender lewat MUIP. |
| **Host** | Aplikasi Next.js yang menyediakan shell, library, builder, runner, settings, dan DevTools. |
| **Studio** | Bagian host untuk membuat dan mengedit micro-app. |
| **Builder** | Editor visual di `/studio/[projectId]`. |
| **Draft** | Dokumen project yang belum diekspor menjadi package. |
| **Template** | Draft awal dengan layar dan data contoh. |
| **Package** | File `.mapp` bertanda tangan yang dapat dipasang. |
| **Registry** | Tidak ada server registry; yang ada hanya index statis read-only opsional. |
| **Workspace** | Ruang isolasi data lokal. Default satu workspace. |
| **Library** | Daftar app terpasang dan draft di Home. |
| **Runner** | Halaman `/app/[appId]` yang mengeksekusi app di sandbox. |
| **Consent** | Persetujuan pengguna atas satu permission, sekali atau selalu. |
| **Offline Cage** | Pembatas yang memblokir network app secara default. |
| **Permission** | Hak yang dideklarasikan manifest dan disetujui pengguna. |
| **Bridge** | Satu-satunya kanal pesan antara app dan host. |

## 3. Istilah Teknis

| Istilah | Arti |
|---|---|
| **PWA** | Progressive Web App; shell dapat dipasang dan dibuka offline. |
| **Service worker** | Worker browser yang menyajikan cache shell dan aset. |
| **OPFS** | Origin Private File System; tempat file SQLite WASM disimpan. |
| **SQLite WASM** | SQLite yang dikompilasi ke WebAssembly dan berjalan di worker. |
| **Worker** | Web Worker yang menjalankan database atau logika app. |
| **Iframe sandbox** | Iframe dengan atribut `sandbox="allow-scripts"` dan origin opaque. |
| **Opaque origin** | Origin tanpa akses ke storage atau DOM host. |
| **MUIP** | MicroApp UI Protocol; bahasa node UI v1. |
| **MADS** | MicroApp Design System, versi 3 "Clay". |
| **Clay token** | Variabel `--mads-*` untuk warna, radius, shadow, spacing, dan motion. |
| **Manifest v2** | `microapp.manifest.json` yang mendeklarasikan entry, integritas, signature, permission, dan UI. |
| **Content hash** | SHA-256 atas isi package. |
| **Signature Ed25519** | Tanda tangan detached atas manifest dan digest bundle. |
| **`.mapp-backup`** | File backup terenkripsi dengan header `MAPPBK01`. |
| **Argon2id** | Fungsi derivasi kunci untuk passphrase backup. |
| **AES-256-GCM** | Cipher terautentikasi untuk backup. |
| **Local identity** | Pasangan kunci yang dibuat otomatis di perangkat. |
| **Recovery phrase** | 24 kata BIP39 opsional untuk memulihkan identitas; ditunda sampai dibutuhkan. |
| **BYOK** | Bring Your Own Key; endpoint AI milik pengguna, disimpan di vault. |
| **Vault** | Penyimpanan lokal terenkripsi untuk secret. |
| **Audit chain** | Log lokal dengan rantai hash untuk aksi sensitif. |
| **DevTools** | Panel diagnostik lokal di `/settings/dev`. |
| **Baseline evidence** | Catatan hasil verifikasi nyata di `docs/08-quality/evidence/baseline.md`. |

## 4. Istilah yang Tidak Dipakai

Istilah berikut tidak memiliki arti di produk ini dan MUST NOT muncul sebagai fitur, mode, atau requirement:

- Host native, Flutter, Dart, runtime native, desktop bundle.
- Self-host server, Go server, Helm, Kubernetes, air-gap.
- CRDT, P2P, sync transport, mutation log, conflict history.
- Federated registry, publish pipeline, marketplace, delta update.
- CLI, SDK publik, plugin API.
- Workflow engine, outbox, connector, LAN hot reload, multiplayer.

Istilah tersebut hanya boleh muncul dalam pernyataan eksplisit bahwa hal itu tidak ada atau di luar ruang lingkup.

## 5. Aturan Penulisan

1. Gunakan "micro-app" (dengan tanda hubung) untuk produk; "app" hanya dalam konteks UI yang sudah jelas.
2. Gunakan "package" untuk `.mapp`; jangan menyebutnya "plugin".
3. Gunakan "permission" untuk hak app; "consent" untuk tindakan pengguna.
4. Gunakan "local identity" untuk identitas perangkat; jangan "akun".
5. Gunakan "backup" untuk `.mapp-backup`; "ekspor" untuk data terbuka.

## 6. Verifikasi

| Pemeriksaan | Cara |
|---|---|
| Konsistensi istilah | Sweep istilah terlarang pada dokumen aktif |
| Tidak ada sinonim liar | Review istilah baru di PR |
