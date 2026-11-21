---
id: ADR-0019
title: "ADR-0019: Sandbox Iframe Opaque Origin dan MUIP"
status: accepted
owner: architecture
prd_refs: ["§7", "§11"]
---

# ADR-0019: Sandbox Iframe Opaque Origin dan MUIP

## Konteks

Micro-app berasal dari pihak ketiga dan harus dianggap tidak tepercaya. Kode micro-app tidak boleh menyentuh DOM Host, cookie, storage, kunci, atau API bridge tanpa pemeriksaan. Browser menyediakan isolasi melalui iframe dengan atribut `sandbox`, ditambah CSP dan Web Worker. Setiap mekanisme isolasi memiliki batas: `allow-scripts` tanpa `allow-same-origin` menghasilkan opaque origin, tetapi tetap membutuhkan kanal komunikasi terkendali.

Kebutuhan yang mengikat:

1. Tidak ada akses langsung ke DOM atau storage Host.
2. Tidak ada `eval`, `new Function`, atau penyisipan HTML mentah.
3. Render UI hanya melalui protokol yang dapat divalidasi.
4. Kegagalan isolasi harus menutup akses, bukan membuka jalur alternatif.

## Keputusan

1. Micro-app berjalan di **iframe dengan `sandbox="allow-scripts"`** sehingga origin bersifat opaque. Atribut `allow-same-origin` tidak pernah ditambahkan.
2. Dokumen iframe dimuat dari `srcdoc`/blob dengan **CSP ketat**: `default-src 'none'`, `script-src` dengan nonce bootstrap, `connect-src 'none'` kecuali diizinkan broker, dan tanpa `unsafe-inline` untuk skrip.
3. Logika micro-app dijalankan di **Web Worker** di dalam iframe; worker tidak memiliki akses DOM Host.
4. UI dirender oleh **MUIP renderer** yang memvalidasi setiap node terhadap skema. Renderer menolak HTML, CSS, atau JavaScript arbitrer; hanya node, props, dan event yang dideklarasikan.
5. Komunikasi ke Host hanya melalui **satu bridge** berbasis `postMessage` dengan namespace, metode tertutup, validasi parameter, timeout, dan rate limit. Bridge adalah satu-satunya kanal; tidak ada akses jaringan langsung.
6. Setiap panggilan bridge memeriksa permission manifest dan grant aktif. Consent diminta just-in-time sebelum akses pertama.
7. **Watchdog 5 detik** tanpa heartbeat menghentikan iframe dan worker. Budget restart dibatasi tiga kali per lima menit; setelah itu tombol muat ulang dinonaktifkan dengan penjelasan.
8. Jika sandbox tidak tersedia atau inisialisasi gagal, runtime **fail closed**: micro-app tidak dijalankan dan pengguna melihat pesan yang dapat ditindaklanjuti.
9. Crash diisolasi pada satu app. Host, app lain, dan draft builder tetap berjalan; pengguna dapat memuat ulang, mengekspor data, atau kembali ke Home.

Rujukan kontrak: [sandbox-runtime](../sandbox-runtime.md), [spec runtime](../../03-specs/03-sandbox-runtime.md), [ui-protocol](../../03-specs/ui-protocol.md), [host-bridge](../../03-specs/host-bridge.md).

## Konsekuensi

- Semua interaksi micro-app harus dinyatakan dalam MUIP; komponen baru memerlukan entri katalog dan dukungan renderer.
- Debugging lebih sulit karena konteks terpisah; DevTools menyediakan bridge log teredaksi.
- Performa render bergantung pada validasi node; validasi harus murah dan dilakukan sekali per update.
- Bridge menjadi titik kritis keamanan dan harus diuji terhadap parameter malformed, replayed message, dan origin spoofing.
- Micro-app tidak dapat memakai library yang membutuhkan DOM langsung di worker; pola harus disesuaikan.

## Alternatif

| Alternatif | Alasan ditolak |
|---|---|
| Iframe dengan `allow-same-origin` | Membatalkan isolasi; micro-app dapat membaca storage dan DOM Host. |
| Evaluasi kode di Host dengan `eval` | Melanggar CSP dan membuka eksekusi penuh. |
| WebAssembly sandbox pihak ketiga | Menambah runtime dan tidak menyelesaikan isolasi DOM. |
| Render HTML micro-app di shadow DOM | XSS dan eksfiltrasi tetap mungkin; tidak dapat divalidasi. |
| Bridge per fitur tanpa broker | Pemeriksaan permission tersebar dan mudah terlewat. |

## Verifikasi

1. Uji E2E memastikan iframe berjalan pada opaque origin dan tidak dapat membaca `localStorage` Host.
2. Uji keamanan mencoba `eval`, HTML mentah, dan akses jaringan langsung; semuanya ditolak.
3. Uji watchdog memastikan iframe yang membeku dihentikan dalam 5 detik.
4. Uji budget restart memastikan tombol nonaktif setelah tiga restart dalam lima menit.
5. Uji bridge memastikan panggilan tanpa grant ditolak dan dicatat pada audit.
6. Uji fail-closed memastikan micro-app tidak berjalan saat sandbox gagal init.
