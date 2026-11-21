---
id: ADR-0022
title: "ADR-0022: Onboarding Identitas dengan Recovery Ditunda"
status: accepted
owner: product
prd_refs: ["§4", "§8"]
---

# ADR-0022: Onboarding Identitas dengan Recovery Ditunda

## Konteks

Tujuan produk adalah dari membuka situs sampai micro-app pertama berjalan dalam hitungan menit, tanpa akun dan tanpa konfigurasi awal yang berat. Identitas lokal dibutuhkan untuk menandatangani paket dan mengenkripsi backup, tetapi bukan prasyarat untuk membuat atau menjalankan micro-app. Alur lama memaksa pengguna mencatat dan mengonfirmasi 24 kata sebelum dapat mencapai Home; langkah itu menambah friksi, meningkatkan salah paham, dan membuat pengguna baru berhenti sebelum merasakan nilai produk.

Kebutuhan yang mengikat:

1. Home tidak pernah diblokir oleh modal onboarding.
2. Identitas dibuat otomatis pada first load.
3. Frasa pemulihan tetap tersedia sebelum aksi yang membutuhkannya.
4. Pengguna yang belum mengamankan data diberi status yang jelas, bukan rasa aman palsu.

## Keputusan

1. Saat first load, host membuat **local identity otomatis** di WebCrypto/worker: pasangan kunci Ed25519 untuk tanda tangan dan X25519 untuk enkripsi. Kunci privat disimpan non-extractable pada IndexedDB. Tidak ada modal, tidak ada form, dan tidak ada mnemonic pada langkah ini.
2. **Home langsung tampil** setelah identitas siap. Jika pembuatan identitas gagal, Home tetap tampil dalam mode `ephemeral`: badge jelas, fitur tanda tangan dan backup dinonaktifkan, dan tombol ekspor data tersedia.
3. **Frasa pemulihan 24 kata ditunda**. Frasa hanya ditampilkan ketika pengguna memilih banner "Amankan data", membuka Backup, atau akan mengekspor backup. Konfirmasi tiga kata merupakan gate untuk menyelesaikan pembuatan frasa, bukan gate untuk masuk ke aplikasi.
4. Banner "Amankan data" bersifat non-blocking dengan aksi **Atur nanti** dan **Buat frasa pemulihan**. Banner tidak menutupi konten dan dapat ditutup.
5. Aksi yang memerlukan identitas yang dapat dipulihkan—ekspor `.mapp`, backup terenkripsi, dan pemulihan—memeriksa status pengamanan. Jika belum diamankan, pengguna diberi penjelasan singkat dan opsi melanjutkan dengan risiko yang dinyatakan, kecuali untuk operasi yang secara teknis mustahil tanpa kunci.
6. Tidak ada request jaringan pada alur first run. Tidak ada login, registrasi, verifikasi email, atau telemetri.
7. Identitas bersifat perangkat. Tidak ada pairing, sinkronisasi, atau pemulihan lintas perangkat selain lewat frasa atau backup terenkripsi.

Rujukan kontrak: [identity-crypto](../identity-crypto.md), [app shell](../../03-specs/01-app-shell.md), [backup](../../03-specs/06-backup.md), [FLOW-01](../../04-flows/01-first-run.md).

## Konsekuensi

- Sebagian pengguna akan membuat micro-app tanpa pernah mengamankan data; produk harus mengingatkan secara berkala tanpa memblokir.
- Kehilangan storage sebelum pembuatan frasa berarti identitas dan data tidak dapat dipulihkan; ini dinyatakan jelas pada banner dan Settings.
- Mode `ephemeral` harus diuji karena menjadi jalur nyata, bukan keadaan sementara yang tersembunyi.
- FR-SHELL-002 dan FR-BACKUP-002 menjadi acuan perilaku; keduanya harus konsisten dengan keputusan ini.
- Onboarding tidak lagi menjadi layar tersendiri; SCR-01 adalah overlay informatif di atas Home.

## Alternatif

| Alternatif | Alasan ditolak |
|---|---|
| Gate 24 kata sebelum Home | Menambah friksi dan menghentikan pengguna sebelum nilai pertama. |
| Akun cloud untuk pemulihan | Melanggar zero-account dan local-first. |
| Tanpa identitas sampai dibutuhkan | Ekspor dan backup menjadi tidak konsisten; identitas lebih baik dibuat sekali di awal. |
| Frasa wajib saat first run dengan opsi lewati tersembunyi | Tetap memaksa modal dan menunda Home. |
| Identitas yang dapat diekspor sebagai kunci mentah | Mengurangi jaminan WebCrypto non-extractable. |

## Verifikasi

1. Uji first run memastikan Home tampil tanpa modal, tanpa jaringan, dan tanpa mnemonic.
2. Uji jalur create memastikan builder tercapai dalam maksimal tiga klik dari Home.
3. Uji mode `ephemeral` memastikan badge, pembatasan fitur, dan ekspor bekerja.
4. Uji banner memastikan dapat ditutup dan tidak menghalangi konten.
5. Uji backup/ekspor memastikan frasa diminta atau risiko dinyatakan sebelum operasi.
