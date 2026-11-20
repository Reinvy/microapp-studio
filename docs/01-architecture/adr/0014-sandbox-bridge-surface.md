---
id: ADR-0014
title: ADR-0014 Sandbox Opaque Origin dan Permukaan Bridge
status: accepted
owner: runtime
prd_refs: ["§3 Modul 2", "§3 Modul 3", "§5.1"]
---

# ADR-0014 Sandbox Opaque Origin dan Permukaan Bridge

## Konteks

Spesifikasi lama membuat Host merender node MUIP yang diterima dari micro-app, sehingga node tidak tepercaya masuk ke dokumen induk dan `ui.render`/`ui.patch` muncul sebagai method bridge. Itu membatalkan isolasi: satu validasi yang salah berarti XSS di origin Host. Bridge juga belum memiliki permukaan tertutup: `bridge.cancel` dan akses Vault tidak didefinisikan, urutan validasi berbeda antar dokumen, dan kode error untuk pembatalan, transfer tidak lengkap, duplikasi request, serta intent invalid tidak ada.

## Keputusan

1. **Renderer di dalam iframe.** Setiap micro-app web berjalan di `<iframe sandbox="allow-scripts">` tanpa `allow-same-origin`. Logika berjalan di Dedicated Worker di dalam iframe tersebut, dan renderer MUIP berjalan di iframe yang sama. Host hanya menerima event terstruktur dan tidak menyisipkan node ke dokumen induk.
2. **`ui.render`, `ui.patch`, `ui.focus`, dan `ui.toast` bukan method Host Bridge.** Keempatnya adalah API internal renderer di dalam iframe dan dihapus dari tabel namespace bridge.
3. **CSP dokumen sandbox** tepat: `default-src 'none'; script-src blob: 'wasm-unsafe-eval'; worker-src blob:; style-src blob: 'unsafe-inline'; img-src blob: data:; media-src blob:; font-src blob:; connect-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'`. Tidak ada `unsafe-eval`. Bootstrap dimuat dari blob URL, bukan inline script; font MADS dikirim Host sebagai blob, bukan CDN.
4. **MUIP** node `{type, id, props, children, events, style, a11y}` dengan `a11y` top-level `{label, description, role, live, disabled, required}`; `props` divalidasi per komponen dari `componentCatalog` dan `additionalProps` default `false`; `events` hanya `{action, intent, params}` dari enum. Tipe di katalog yang belum didukung versi Host dirender placeholder berlabel; tipe di luar katalog ditolak dan diaudit.
5. **Bridge kanonik** = tabel [03-specs/host-bridge.md](../../03-specs/host-bridge.md) §4.2 tanpa namespace `ui`, ditambah `bridge.cancel` (level envelope, tanpa permission) dan `vault.read` (butuh grant item). Urutan validasi mengikat: versi → ukuran frame → permission → parameter → rate limit → eksekusi. `SEC-014` dan B-03 menang atas urutan arsitektur lama.
6. **Kode error baru** ditambahkan ke katalog: `E-SBX-006` (cancelled), `E-SBX-007` (transfer incomplete), `E-SBX-008` (duplicate request), `E-SBX-009` (invalid intent), `E-HOST-006` (audit chain invalid), `E-HOST-007` (workspace isolation violation), `E-AUTH-006` (recovery mismatch), `E-DATA-006` (quota exceeded).
7. **Fitur fase lanjut gagal tertutup.** `ai.*` dan `workflow.run` mengembalikan `E-SBX-005` sampai fase 3; renderer menampilkan placeholder aksi, bukan no-op. Aksi fase 1: `open.route`, `navigate.back`, `submit`, `reset`, `refresh`, `intent.send`, `close`.
8. **Streaming** memakai `{id, seq, chunk}` monoton dan penutup `{id, done: true}`; chunk biner maksimal 256 KiB dengan SHA-256 per berkas dan total, diverifikasi sebelum diserahkan. Rate limit 100 panggilan/detik/app.
9. **Permission mockable kanonik**: `camera`, `camera.qr`, `microphone`, `location`, `biometrics`. Offline Cage default aktif (`1`) dan dapat dimatikan pengguna lewat Pengaturan. `permissions.quotas.storageMb` default 10 MB.
10. **State grant**: `requested → granted | denied`; `granted → revoked | mocked`; `revoked` final untuk sesi itu. `Allow once` disimpan di `permission_sessions` dan berakhir saat sesi app ditutup.
11. **Widget board tanpa bridge.** Host membaca DB app secara langsung dengan rate limit satu query per 5 detik per widget dan audit; micro-app tidak dapat memicu query widget.
12. **Intent bus** membatasi payload 64 KiB, meminta consent per transfer yang menampilkan `(source, target, type, route)`, mensyaratkan target mendeklarasikan intent di `capabilities.intentsIn`, tidak menambah permission ID, tidak menyimpan grant intent persisten, dan mengaudit setiap transfer atau penolakan. Payload tidak disimpan setelah dikonsumsi.
13. **Kuota memori efektif** = `min(manifest.runtime.maxMemoryMb, platformCap)` dengan platform cap 128 MB mobile dan 512 MB desktop; manifest di atas cap diterima dengan peringatan lalu di-clamp, di bawah 64 ditolak. Web memakai `performance.measureUserAgentSpecificMemory` bila tersedia ditambah watchdog; native menegakkan ketat.
14. **Watchdog**: maksimum dua auto-restart dalam 60 detik, kegagalan ketiga menampilkan error boundary persisten. Lifecycle transition-scoped: `onInstall`, `onMount`, `onFocus`, `onBlur`, `onBackground`, `onUpdate`, `onUninstall`; event-scoped: `onSync`, `onMemoryWarning` (sekali per siklus penggunaan).
15. **Notifikasi lokal** dijadwalkan ulang saat launch; browser memakai Notification Triggers bila tersedia dan batasnya didokumentasikan, native memakai local notifications.

## Konsekuensi

- Host tidak pernah memegang DOM micro-app, sehingga kegagalan renderer tidak dapat merusak shell; harga yang dibayar adalah satu iframe per app aktif dan biaya handshake saat mount.
- Semua state UI (fokus, scroll) hidup di iframe; Host hanya menyimpan metadata sesi dan tidak dapat membaca isi form.
- Bridge tidak dapat diperluas tanpa memperbarui tabel kanonik dan katalog error; method liar ditolak `not_found`.
- Komponen katalog yang belum diimplementasikan tetap tampil sebagai placeholder sehingga paket baru tidak merusak Host lama, tetapi tidak boleh dipakai untuk mengklaim dukungan penuh.
- `E-SBX-005` untuk `ai.*`/`workflow.run` di fase 1 adalah perilaku yang diuji, bukan kekurangan yang disembunyikan.

## Alternatif

| Alternatif | Alasan ditolak |
|---|---|
| Host merender MUIP dari micro-app | Node tidak tepercaya masuk dokumen induk; satu bug validasi menjadi XSS di origin Host. |
| `iframe` dengan `allow-same-origin` | Membatalkan isolasi origin; cookie dan storage Host dapat diakses. |
| `ui.*` sebagai method bridge | Memberi micro-app kendali atas dokumen Host dan menggandakan jalur render. |
| Permission diperiksa setelah validasi parameter | Membocorkan keberadaan resource dan memperlambat penolakan. |
| Clamp diam-diam pada `maxMemoryMb` | Pengguna tidak tahu batas nyata; peringatan eksplisit wajib. |
| Intent grant persisten | Melanggar FR-HOST-014 yang menuntut consent per transfer. |

## Status

`accepted`. Kontrak per method ada di [03-specs/host-bridge.md](../../03-specs/host-bridge.md); keputusan runtime di [sandbox-capabilities.md](../sandbox-capabilities.md); protokol render di [03-specs/ui-protocol.md](../../03-specs/ui-protocol.md).
