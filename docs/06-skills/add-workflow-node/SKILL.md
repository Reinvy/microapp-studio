---
id: SKILL-ADD-WORKFLOW-NODE
title: Menambah Node Workflow
status: accepted
owner: dx
prd_refs: ["§3 Modul 4"]
name: add-workflow-node
description: "Menambah node, trigger, atau connector workflow yang berjalan identik di runtime lokal dan server dengan outbox serta idempotency."
when_to_use: "Dipakai saat workflow membutuhkan node baru, trigger baru, atau connector eksternal yang harus tahan offline dan restart."
required_docs: ["docs/03-specs/04-data-automation.md", "docs/01-architecture/ai-workflow.md", "docs/03-specs/03-sandbox-runtime.md", "docs/01-architecture/threat-model.md", "docs/04-flows/08-workflow-outbox.md"]
---

# Menambah Node Workflow

## Kapan Digunakan

Dipakai ketika grafik workflow memerlukan node aksi baru, trigger baru, atau connector ke sistem eksternal. Node harus berperilaku sama di runtime lokal dan server, tahan terhadap offline dan restart, dan tidak pernah menjalankan aksi berisiko tanpa jejak.

Di luar cakupan: menambah provider AI (gunakan adapter di `packages/ai-bridge` sesuai [ai-workflow.md](../../01-architecture/ai-workflow.md)) dan mengubah format outbox (kontrak di [04-data-automation.md](../../03-specs/04-data-automation.md)).

## Prasyarat

- [03-specs/04-data-automation.md](../../03-specs/04-data-automation.md) bagian 3–5 dibaca, termasuk outbox, retry, idempotency, dan SSRF.
- [01-architecture/ai-workflow.md](../../01-architecture/ai-workflow.md) dipahami: node, trigger, HITL, dan batas server runner.
- [03-specs/03-sandbox-runtime.md](../../03-specs/03-sandbox-runtime.md) dipahami: setiap eksekusi kode berjalan di sandbox dengan permission yang berlaku.
- Akses ke instance server uji untuk menguji SSRF dan restart.

## Input

| Input | Wajib | Contoh |
|---|---|---|
| Jenis node | ya | Aksi HTTP, transformasi data, atau node AI agent |
| Skema konfigurasi | ya | URL, method, header referensi Vault, timeout |
| Input/output | ya | Port masuk `payload` dan port keluar `response` |
| Kebutuhan idempotency | ya | Kunci UUIDv7 per job |
| Perilaku offline | ya | Status `waiting_network` sampai koneksi kembali |

## Prosedur

1. Baca [03-specs/04-data-automation.md](../../03-specs/04-data-automation.md) dan [01-architecture/ai-workflow.md](../../01-architecture/ai-workflow.md); tentukan apakah node baru termasuk trigger, aksi lokal, aksi eksternal, atau node AI.
2. Definisikan skema node: `kind`, konfigurasi, port input/output, timeout, kebijakan error, permission yang dibutuhkan, dan apakah node memerlukan persetujuan manusia. Tambahkan definisi ini ke tabel node pada spec.
3. Implementasikan runtime lokal di `packages/runtime-web` dengan kontrak yang sama seperti server. Node yang mengeksekusi kode wajib berjalan di sandbox dengan permission yang dideklarasikan, bukan di konteks Host.
4. Implementasikan runtime server di `apps/selfhost-server/internal/workflow` dengan input/output dan perilaku identik. Perbedaan perilaku antara lokal dan server MUST NOT ada; bila platform tidak mendukung, node menolak dengan error yang jelas.
5. Untuk aksi eksternal, jangan memanggil jaringan langsung dari node. Masukkan job ke outbox persisten dengan status `queued`, `waiting_network`, `running`, `failed`, atau `done`, dan kirim idempotency key UUIDv7 ke endpoint.
6. Terapkan retry maksimal 8 attempt dengan backoff eksponensial 1 detik × 2^n (cap 1 jam) dan jitter 20%. Job yang menerima restart server harus dilanjutkan dari checkpoint terakhir tanpa duplikasi efek.
7. Terapkan SSRF guard di server: blokir CIDR privat dan loopback secara default, dan hanya izinkan pembukaan oleh admin dengan jejak audit. Connector MQTT, database, S3, WebDAV, CalDAV, CardDAV, dan chat mengikuti aturan yang sama.
8. Tambahkan human-in-the-loop untuk aksi berisiko: notifikasi lokal dengan aksi setuju/tolak, dan job berhenti sampai keputusan diterima.
9. Tambahkan node ke editor workflow Studio memakai komponen MADS yang sesuai, dengan validasi koneksi, deteksi siklus tak sah, dan pratinjau data per port.
10. Tulis test: eksekusi normal, offline menuju `waiting_network`, retry hingga batas, duplikasi idempotency, restart server, HITL, dan SSRF yang harus diblokir.
11. Perbarui [prd-compliance-matrix.md](../../00-foundation/prd-compliance-matrix.md) dan flow [08-workflow-outbox.md](../../04-flows/08-workflow-outbox.md), lalu perbarui [implementation-status.md](../../00-foundation/implementation-status.md) setelah verifikasi.

## Verifikasi

```bash
cd apps/selfhost-server && go test ./...
npm test
npm run docs:check
```

Uji manual: jalankan workflow dengan node HTTP saat jaringan dimatikan, lalu hidupkan jaringan. Job harus berpindah dari `waiting_network` ke `done` tepat satu kali, dan endpoint penerima harus menerima satu efek meskipun retry terjadi.

## Kesalahan Umum

| Kesalahan | Perbaikan |
|---|---|
| Memanggil jaringan langsung dari node | Masukkan job ke outbox dan biarkan pekerja outbox mengirim |
| Retry tanpa idempotency key | Setiap job memakai UUIDv7 dan endpoint harus menerima deduplikasi |
| Perilaku lokal dan server berbeda | Satukan kontrak input/output dan uji keduanya dengan fixture sama |
| Mengizinkan CIDR privat secara default | Blokir privat dan loopback; buka hanya oleh admin dengan audit |
| Menjalankan aksi berisiko tanpa HITL | Tambahkan approval sebelum aksi dieksekusi |
| Node tanpa timeout | Tetapkan timeout eksplisit dan perlakukan timeout sebagai kegagalan yang dapat di-retry |

## Definition of Done

- Skema node, port, timeout, error policy, dan permission tercatat di spec.
- Runtime lokal dan server berperilaku identik dan diuji dengan fixture yang sama.
- Job eksternal selalu melalui outbox dengan idempotency UUIDv7 dan retry sesuai batas.
- SSRF guard aktif dan HITL tersedia untuk aksi berisiko.
- Test offline, retry, duplikasi, restart, HITL, dan SSRF lulus.
- Matriks, flow, dan status diperbarui; `npm run docs:check` bersih.
