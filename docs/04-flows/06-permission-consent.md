---
id: FLOW-06
title: Permission Consent
status: accepted
owner: security
prd_refs: ["§5 F7", "§8 Data dan Privasi"]
---

# Permission Consent

## 1. Tujuan

Menetapkan alur consent just-in-time saat micro-app meminta permission pertama kali, termasuk pilihan allow once/always/deny, revoke, offline cage, dan audit.

Requirement utama: `SEC-003`.

## 2. Aktor dan Prasyarat

Aktor: pengguna yang menjalankan app terpasang. Prasyarat: app memiliki manifest dengan permission yang dideklarasikan.

## Alur Utama

1. App memanggil method bridge.
2. Broker memvalidasi asal pesan, bentuk amplop, allowlist manifest, dan rate limit.
3. Broker memeriksa grant. Jika sudah `always`, panggilan dilanjutkan tanpa dialog.
4. Jika belum, clay bottom sheet tampil berisi nama app, permission, alasan plain-language, dan risk tier.
5. Fokus awal berada pada **Tolak**; `Esc` sama dengan Tolak.
6. Pengguna memilih **Izinkan sekali**, **Selalu izinkan**, atau **Tolak**.
7. Grant disimpan dengan scope dan waktu; audit mencatat hasil.
8. Panggilan dilanjutkan atau ditolak sesuai pilihan.
9. Pengguna dapat mencabut grant kapan saja di Settings → Permissions; revoke berlaku pada panggilan berikutnya.
10. Jika Offline Cage aktif dan app meminta `network.fetch`, panggilan ditolak sebelum consent.

## Cabang Gagal

| Kondisi | Perilaku |
|---|---|
| Permission tidak ada di manifest | `E-RUN-003`, tanpa dialog consent. |
| Rate limit terlampaui | `E-RUN-003`, cooldown singkat. |
| Offline Cage aktif | `E-NET-001`, jelaskan cage dan tawarkan Settings. |
| Pengguna menutup sheet | Dianggap Tolak; tidak ada grant tersimpan. |
| Grant dicabut saat app berjalan | Panggilan berikutnya memicu consent lagi. |
| Payload melebihi batas | Ditolak sebelum handler, `E-RUN-003`. |

## Acceptance Criteria

1. Dialog hanya muncul untuk permission yang dideklarasikan dan belum granted.
2. Default fokus pada Tolak dan Esc menolak.
3. Grant `always` tidak memunculkan dialog berulang.
4. Revoke langsung berlaku tanpa reload.
5. Offline Cage memblokir network sebelum consent.
6. Setiap grant, deny, dan revoke tercatat di audit.

## Verifikasi

| Pemeriksaan | Cara |
|---|---|
| Consent JIT | Playwright: panggilan pertama, sheet, fokus Tolak. |
| Allow once | Vitest: grant sekali, panggilan kedua meminta lagi. |
| Allow always | Vitest: dialog tidak muncul lagi. |
| Revoke | Vitest: revoke, panggilan gagal. |
| Cage | Vitest: `network.fetch` → `E-NET-001`. |
| Audit | Vitest: tiga entri grant/deny/revoke. |

## 7. Referensi

- [permissions.md](../03-specs/permissions.md)
- [host-bridge.md](../03-specs/host-bridge.md)
- [threat-model.md](../01-architecture/threat-model.md)
