---
id: RULE-GO
title: Aturan Go
status: accepted
owner: dx
prd_refs: ["§7.1", "§3 Modul 7"]
---

# Aturan Go

Aturan ini berlaku untuk `apps/selfhost-server`, binary tunggal yang menyediakan sync relay, registry internal, workflow runner, autentikasi, RBAC, dan audit. Server adalah komponen opsional; seluruh fitur inti Host tetap berjalan tanpanya.

## 1. Cakupan

| Area | Kewajiban utama |
|---|---|
| Struktur | `cmd/`, `internal/`, tanpa logika di `main` |
| Konkurensi | `context.Context` dan shutdown yang terkendali |
| Error | Wrapping, tanpa panic pada request |
| HTTP | Timeout, body limit, header aman, rate limit |
| Otorisasi | Auth middleware, RBAC/ABAC, audit |
| Jaringan keluar | SSRF guard dan allowlist eksplisit |
| Data | Migrasi bernomor, query parameterized |
| Observability | `log/slog` terstruktur dan redaksi |

## 2. Aturan

### 2.1 Struktur dan Konkurensi

| ID | Level | Aturan | Konsekuensi |
|---|---|---|---|
| RULE-GO-001 | MUST | Layout MUST memisahkan `cmd/<binary>/main.go` dan `internal/`; `main` hanya memuat wiring, flag, dan lifecycle, tanpa logika bisnis. | Kode tidak dapat diuji dan dipakai ulang; review arsitektur menolak. |
| RULE-GO-002 | MUST | Setiap fungsi yang melakukan I/O, query, atau panggilan jaringan MUST menerima `context.Context` sebagai parameter pertama dan MUST meneruskannya; `context.Background()` di jalur request dilarang. | Pembatalan dan timeout tidak bekerja; test timeout gagal. |
| RULE-GO-003 | MUST | Goroutine MUST memiliki pemilik, kondisi berhenti, dan cara menunggu; goroutine tanpa `ctx` atau `WaitGroup` dilarang. | Kebocoran goroutine saat shutdown; race detector/test gagal. |
| RULE-GO-004 | MUST | `panic` MUST NOT dipakai untuk error request; satu middleware recover MUST menangkap panic, mencatat stack teredaksi, dan mengembalikan 500 tanpa detail internal. | Satu input jahat menjatuhkan proses; PR ditolak. |

### 2.2 Error dan Data

| ID | Level | Aturan | Konsekuensi |
|---|---|---|---|
| RULE-GO-005 | MUST | Error MUST dibungkus dengan `%w` dan diperiksa memakai `errors.Is`/`errors.As`; perbandingan string error dilarang. | Error tidak dapat dipetakan ke kode `E-SRV-*`; test gagal. |
| RULE-GO-006 | MUST | Query SQL MUST memakai parameter binding; konkatenasi string dengan input pengguna dilarang, termasuk untuk `ORDER BY` dan nama tabel (gunakan allowlist). | SQL injection adalah blocker keamanan. |
| RULE-GO-007 | MUST | Migrasi MUST bernomor, memiliki ledger versi, dijalankan sebelum server menerima trafik, dan MUST gagal tertutup bila migrasi gagal. | Skema tidak konsisten dan server melayani data rusak; deploy gagal. |
| RULE-GO-008 | MUST | Migrasi MUST NOT menghapus data pengguna tanpa prosedur eksplisit dan backup; operasi destruktif MUST memiliki rollback yang diuji. | Kehilangan data permanen; PR data ditolak. |
| RULE-GO-009 | MUST | Transaksi database MUST memiliki timeout dan `defer rollback`; commit hanya setelah seluruh langkah berhasil. | Transaksi menggantung dan koneksi habis; uji beban gagal. |

### 2.3 HTTP, Auth, dan Otorisasi

| ID | Level | Aturan | Konsekuensi |
|---|---|---|---|
| RULE-GO-010 | MUST | `http.Server` MUST menetapkan `ReadHeaderTimeout`, `ReadTimeout`, `WriteTimeout`, `IdleTimeout`, dan batas ukuran body; nilai default tanpa timeout dilarang. | Slowloris dan body raksasa menghabiskan resource; security test gagal. |
| RULE-GO-011 | MUST | Route non-publik MUST melewati auth middleware yang memvalidasi sesi/token dan MUST gagal tertutup bila verifikasi tidak tersedia; route publik MUST didaftarkan eksplisit. | Bypass autentikasi; PR keamanan ditolak. |
| RULE-GO-012 | MUST | Otorisasi MUST diperiksa di handler/service dengan default deny dan MUST memakai RBAC/ABAC; UI MUST NOT menjadi satu-satunya pemeriksa izin. | Privilege escalation; security review memblokir. |
| RULE-GO-013 | MUST | Aksi sensitif (login, perubahan role, perubahan konfigurasi, publish, pencabutan perangkat, perubahan kunci) MUST menghasilkan audit hash-chained sebelum respons sukses dikirim. | Aksi tidak dapat diaudit; compliance gate gagal. |
| RULE-GO-014 | MUST | Rate limit MUST diterapkan pada endpoint auth, publish, workflow, dan pencarian publik; respons MUST `429` dengan `Retry-After`. | Brute force dan DoS; uji beban gagal. |

### 2.4 Jaringan Keluar dan SSRF

| ID | Level | Aturan | Konsekuensi |
|---|---|---|---|
| RULE-GO-015 | MUST | Klien HTTP workflow MUST memblokir IP privat, loopback, link-local, dan metadata endpoint secara default; hanya `security.allowPrivateEgress: true` yang boleh membukanya dan perubahan itu MUST diaudit. | SSRF ke jaringan internal; security test gagal. |
| RULE-GO-016 | MUST | Resolusi DNS MUST divalidasi ulang setelah redirect, alamat IP yang dilarang MUST ditolak pada dial, dan jumlah redirect MUST dibatasi. | DNS rebinding melewati guard; PR ditolak. |
| RULE-GO-017 | MUST | Timeout, ukuran respons maksimum, dan jumlah koneksi per host MUST dibatasi untuk seluruh egress. | Server menjadi relay amplifikasi; uji chaos gagal. |

### 2.5 Observability, Shutdown, dan Test

| ID | Level | Aturan | Konsekuensi |
|---|---|---|---|
| RULE-GO-018 | MUST | Log MUST memakai `log/slog` terstruktur dengan request id, route, status, dan durasi; token, cookie, kunci, isi prompt, dan PII MUST diredaksi. | Data sensitif bocor ke log; audit gagal. |
| RULE-GO-019 | MUST | Shutdown MUST menangkap `SIGTERM`/`SIGINT`, berhenti menerima koneksi baru, menyelesaikan request dengan batas waktu, lalu menutup database dan queue. | Request terpotong dan data tidak konsisten saat upgrade; runbook gagal. |
| RULE-GO-020 | MUST | Setiap paket MUST memiliki test table-driven; handler diuji dengan `httptest`; `go test -race ./...` MUST lulus. | Race condition dan regresi tidak terdeteksi; PR ditolak. |
| RULE-GO-021 | MUST | Binary MUST tetap single binary tanpa runtime eksternal wajib; dependency baru MUST melewati `govulncheck` dan kebijakan lisensi Apache-2.0/MIT. | Deployment 512 MB gagal dan risiko supply chain meningkat; release gate menolak. |

## 3. Pengecualian dan Penegakan

1. Perubahan pada auth, RBAC, audit, SSRF, atau migrasi MUST ditinjau reviewer `security` dan `server`.
2. `_ =` untuk mengabaikan error hanya boleh pada operasi yang secara eksplisit tidak dapat gagal; selain itu error MUST ditangani.
3. Endpoint baru MUST memiliki test authz (tanpa sesi, role salah, tenant salah), rate limit, dan batas body.
4. `go vet`, `go test -race`, dan `govulncheck` MUST dijalankan sebelum PR.

## 4. Referensi

- [07-selfhost.md](../03-specs/07-selfhost.md) — kontrak server, config, auth, audit.
- [selfhost.md](../01-architecture/selfhost.md) — profil Lite/Standard/Cluster dan port.
- [ai-workflow.md](../01-architecture/ai-workflow.md) — SSRF dan workflow runner.
- [threat-model.md](../01-architecture/threat-model.md) — ancaman server dan insider.
- [security.md](security.md) — kebijakan keamanan.
- [data-migrations.md](data-migrations.md) — aturan migrasi.
