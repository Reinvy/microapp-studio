---
id: SPEC-DEV
title: DevTools
status: accepted
owner: dx
prd_refs: ["§5 F8", "§9 Non-Functional"]
---

# DevTools

## 1. Tujuan

Menetapkan kontrak diagnostik lokal: panel storage/runtime, package inspector, bridge log teredaksi, error log teredaksi, feature flag lokal, dan larangan telemetry. DevTools adalah alat pengembang di perangkat yang sama, bukan layanan pengumpulan data.

## 2. Ruang Lingkup

Di dalam: route `/settings/dev`, panel diagnostik, inspeksi package, log bridge, log error, feature flag, ekspor log. Di luar: observability server, analytics, profiling produksi jarak jauh.

## 3. Requirement

| ID | Level | Requirement | Acceptance |
|---|---|---|---|
| FR-DEV-001 | MUST | Panel diagnostik menampilkan status storage, worker, sandbox, dan service worker. | Empat status terlihat dengan nilai nyata dan aksi refresh. |
| FR-DEV-002 | MUST | Package inspector menampilkan manifest, signature, digest, dan permission app terpasang. | Data berasal dari package nyata; mismatch ditandai. |
| FR-DEV-003 | MUST | Bridge log menampilkan method, durasi, hasil, dan app tanpa payload sensitif. | Tidak ada token, passphrase, atau isi vault di log. |
| FR-DEV-004 | MUST | Error log dapat difilter, dibersihkan, dan diekspor sebagai JSON teredaksi. | Ekspor memuat kode dan konteks aman; secret disaring. |
| FR-DEV-005 | MUST | Feature flag hanya berlaku lokal dan tidak mengubah perilaku pengguna lain. | Flag disimpan lokal; tidak ada endpoint penerima. |
| FR-DEV-006 | MUST | Tidak ada telemetry, analytics, atau beacon keluar dari DevTools. | Tidak ada request jaringan otomatis dari panel. |

Error yang mengikat: `E-DEV-001` untuk kegagalan memuat data diagnostik.

## 4. Panel

| Panel | Data | Batas |
|---|---|---|
| Storage | Estimasi, tabel host, ukuran app DB, pin | Tidak menampilkan nilai record. |
| Runtime | Worker state, sandbox availability, watchdog counter, restart budget | Tidak menampilkan isi pesan app. |
| Packages | Manifest, versi, signature, public key, digest | Tidak menandatangani ulang. |
| Bridge | Method, durasi, hasil, app | Payload diganti panjang/tipe. |
| Errors | Kode, pesan aman, waktu, app | Tidak ada stack dengan path absolut. |
| Flags | Nama, nilai, sumber | Hanya lokal. |

## 5. Redaksi

Redaksi dilakukan sebelum log ditulis, bukan saat ditampilkan. Aturan:

1. Field bernama `token`, `secret`, `passphrase`, `key`, `authorization`, `cookie` diganti `[redacted]`.
2. String dengan pola kunci (base64 panjang, PEM, JWT) diganti `[redacted]`.
3. Path absolut diganti nama file.
4. Isi record hanya dicatat sebagai jumlah dan hash pendek.

## 6. Akses dan Keamanan

1. Panel menampilkan empat status runtime tanpa error.
2. Package inspector menandai signature/digest mismatch.
3. Log tidak memuat nilai sensitif pada fixture yang sengaja berisi secret.
4. Ekspor log valid JSON dan dapat dibuka ulang.
5. Tidak ada request jaringan otomatis saat panel dibuka.

## 7. Acceptance Criteria

1. DevTools tidak dapat diakses tanpa mengaktifkan toggle di Settings.
2. Semua panel dapat dipakai dengan keyboard dan memiliki label.
3. Tidak ada data lintas pengguna karena produk tidak memiliki akun.

## 8. Verifikasi

| Pemeriksaan | Cara |
|---|---|
| Redaksi | Vitest: fixture dengan token/passphrase, assert `[redacted]`. |
| Package inspector | Vitest: manifest dengan digest salah, badge mismatch. |
| Bridge log | Vitest: dua panggilan, tidak ada payload penuh. |
| Offline | Playwright: panel terbuka tanpa request jaringan. |
| Aksesibilitas | axe pada `/settings/dev`. |
