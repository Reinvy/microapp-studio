---
id: FLOW-07
title: Crash Recovery
status: accepted
owner: runtime
prd_refs: ["§5 F4", "§11 Risiko"]
---

# Crash Recovery

## 1. Tujuan

Menetapkan alur ketika micro-app freeze, crash, atau melanggar batas: watchdog menghentikan eksekusi, boundary menampilkan pilihan aman, draft dan app lain tetap utuh, dan restart dibatasi.

Requirement utama: `FR-RUN-008`.

## 2. Aktor dan Prasyarat

Aktor: pengguna yang sedang menjalankan app. Prasyarat: app berjalan di iframe sandbox dengan heartbeat aktif.

## Alur Utama

1. App mengirim heartbeat setiap 1 detik.
2. Watchdog menghitung heartbeat yang hilang. Tiga kegagalan berturut-turut (5 detik) memicu penghentian.
3. Runtime menghentikan iframe/worker, mencatat `E-RUN-001`, dan menampilkan boundary card.
4. Boundary menampilkan kode error, ringkasan aman, dan tiga aksi: **Muat ulang app**, **Ekspor data**, **Kembali ke Home**.
5. Pengguna memilih muat ulang. Runtime membuat iframe baru dan memulihkan state tersimpan.
6. Jika crash berulang, restart budget 3 kali per 5 menit menonaktifkan tombol dengan penjelasan.
7. Draft builder dan app lain tidak terpengaruh.

## Cabang Gagal

| Kondisi | Perilaku |
|---|---|
| Renderer crash | `E-RUN-004`, boundary yang sama, reload app. |
| Sandbox tidak tersedia | `E-RUN-002`, fail closed, tidak ada eksekusi alternatif. |
| Pelanggaran bridge | `E-RUN-003`, panggilan ditolak, audit, app tetap jalan bila aman. |
| Restart budget habis | Tombol reload disabled dengan penjelasan dan waktu tunggu. |
| Ekspor gagal | `E-DATA-002`, tawarkan bersihkan cache. |
| Pengguna kembali ke Home | App dihentikan; state tersimpan dipulihkan saat dibuka lagi. |

## Acceptance Criteria

1. Freeze terdeteksi dalam ≤ 8 detik dan boundary muncul.
2. Tiga aksi boundary tersedia dan berfungsi.
3. App lain dan draft builder tidak kehilangan data.
4. Restart keempat dalam 5 menit ditolak.
5. Log crash teredaksi tanpa PII atau secret.

## Verifikasi

| Pemeriksaan | Cara |
|---|---|
| Watchdog | Vitest: worker tanpa heartbeat, fake timer 5 s, `E-RUN-001`. |
| Boundary | Playwright: picu crash, cek tiga aksi. |
| Budget | Vitest: empat restart, keempat ditolak. |
| Isolasi | Playwright: app kedua tetap berjalan saat app pertama crash. |
| Redaksi | Vitest: log crash tanpa token/path absolut. |

## 7. Referensi

- [03-sandbox-runtime.md](../03-specs/03-sandbox-runtime.md)
- [08-devtools.md](../03-specs/08-devtools.md)
- [ADR-0019](../01-architecture/adr/0019-iframe-sandbox-muip.md)
