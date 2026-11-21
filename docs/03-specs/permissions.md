---
id: SPEC-PERM
title: Permission
status: accepted
owner: security
prd_refs: ["§5 F7", "§8 Data dan Privasi"]
---

# Permission

## 1. Tujuan

Menetapkan model izin micro-app: zero privilege, deklarasi manifest, consent JIT, grant/revoke, offline cage, mock/spoof opsional, dan audit. Permission adalah batas keamanan utama antara app pihak ketiga dan data pengguna di browser.

## 2. Ruang Lingkup

Di dalam: daftar permission, risk tier, consent, penyimpanan grant, revoke, offline cage, audit. Di luar: mekanisme broker ([host-bridge.md](host-bridge.md)), sandbox ([03-sandbox-runtime.md](03-sandbox-runtime.md)), threat model ([threat-model.md](../01-architecture/threat-model.md)).

## 3. Requirement

| ID | Level | Requirement | Acceptance |
|---|---|---|---|
| SEC-001 | MUST | Micro-app memiliki zero privilege sampai permission diberikan. | App baru tidak dapat memanggil bridge selain `ui.ready`. |
| SEC-002 | MUST | Setiap permission yang dipakai wajib dideklarasikan di manifest. | Method tanpa deklarasi ditolak sebelum consent. |
| SEC-003 | MUST | Consent JIT diminta sebelum akses pertama dan menjelaskan alasan plain-language. | Sheet memuat app, permission, alasan, risk tier; fokus default Tolak. |
| SEC-004 | MUST | Offline Cage aktif secara default dan memblokir semua network app. | Panggilan network menghasilkan `E-NET-001` saat cage aktif. |
| SEC-005 | MUST | Package wajib memiliki signature valid sebelum instalasi. | Impor tanpa signature ditolak. |
| SEC-006 | MUST | Perubahan public key memicu peringatan keras dan blokir sampai disetujui. | Key baru tidak otomatis dipercaya. |
| SEC-007 | MUST | Tidak ada secret di source, log, fixture, atau dokumen. | Pemindaian pola kunci bersih; fixture memakai nilai dummy yang ditandai. |
| SEC-008 | MUST | BYOK hanya disimpan di vault lokal dan tidak pernah dikirim ke host lain selain endpoint pengguna. | Key tidak muncul di log, ekspor settings, atau backup plaintext. |
| SEC-009 | MUST | Tidak ada `eval`, `new Function`, atau HTML mentah pada render. | ESLint dan review menolak pola; renderer memakai `textContent`. |
| SEC-010 | MUST | Host mengirim CSP ketat serta COOP/COEP. | Header terverifikasi pada respons dokumen. |
| SEC-011 | MUST | Iframe app memakai opaque origin. | `allow-same-origin` tidak ada pada atribut sandbox. |
| SEC-012 | MUST | Backup wajib terenkripsi sebelum ditulis ke disk. | Tidak ada file backup plaintext. |
| SEC-013 | MUST | Tidak ada telemetry default. | Tidak ada beacon/analytics pada build produksi. |
| SEC-014 | MUST | Aksi sensitif dicatat di audit lokal dengan rantai hash. | Grant, revoke, install, restore, dan reset tercatat. |

Risk tier: `low` (clipboard baca/tulis dengan consent), `medium` (notifikasi, file picker), `high` (network ke origin yang dideklarasikan, akses vault item), `critical` (tidak ada; permission semacam itu tidak disediakan).

## 4. Daftar Permission

| Permission | Risiko | Cakupan | Catatan |
|---|---|---|---|
| `clipboard.read` | low | Teks | Hanya saat fokus. |
| `clipboard.write` | low | Teks | Ditulis hanya lewat aksi pengguna. |
| `notifications.local` | medium | Notifikasi | Tanpa push server. |
| `files.pick` | medium | File yang dipilih | Tidak ada akses direktori. |
| `network.fetch` | high | Origin di manifest | Diblokir Offline Cage. |
| `storage.app` | low | DB app sendiri | Selalu aktif, bukan consent. |
| `vault.read` | high | Item yang dipilih | Consent per item. |
| `share.export` | low | File `.mapp` | Aksi pengguna. |

Tidak ada permission untuk Bluetooth, NFC, sensor native, kontak sistem, lokasi latar, atau akses filesystem bebas.

## 5. Consent dan Grant

1. Broker memvalidasi manifest dan method.
2. Jika grant `always` ada, panggilan dilanjutkan tanpa dialog.
3. Jika belum, sheet consent muncul dengan fokus pada Tolak, `Esc` = Tolak.
4. Pilihan: Izinkan sekali, Selalu izinkan, Tolak.
5. Grant disimpan dengan scope dan waktu; audit mencatat hasil.
6. Revoke dari Settings langsung berlaku; panggilan berikutnya memicu consent lagi.

## 6. Offline Cage

Cage aktif per app secara default. Saat aktif, `network.fetch` ditolak sebelum keluar dari browser dan menghasilkan `E-NET-001`. Pengguna dapat mematikan cage per app dengan konsekuensi yang dijelaskan. Mematikan cage tidak memberi permission network; consent tetap diperlukan.

## 6.1 Audit

Audit lokal memakai rantai hash: setiap entri memuat `prev_hash` dan `hash`, sehingga penghapusan atau penyisipan dapat dideteksi. Audit tidak memuat nilai record, token, atau passphrase. Ekspor audit tersedia lewat DevTools.

## 7. Acceptance Criteria

1. App baru tidak dapat memanggil method terlarang.
2. Consent muncul satu kali per grant `always` dan tidak berulang.
3. Revoke berlaku pada panggilan berikutnya tanpa reload.
4. Offline Cage memblokir network dengan `E-NET-001`.
5. Package tanpa signature atau dengan key berubah ditolak.
6. Audit mendeteksi perubahan urutan entri.

## 8. Verifikasi

| Pemeriksaan | Cara |
|---|---|
| Zero privilege | Vitest: app baru, panggilan bridge ditolak. |
| Consent JIT | Playwright: panggilan pertama, sheet muncul, fokus Tolak. |
| Revoke | Vitest: grant lalu revoke, panggilan gagal. |
| Offline Cage | Vitest: mock fetch, harapkan `E-NET-001`. |
| Signature/key | Vitest: fixture tanpa signature dan key mismatch. |
| Audit chain | Vitest: ubah entri, verifikasi gagal. |
| CSP/COOP | Playwright: cek header dan `sandbox` iframe. |
