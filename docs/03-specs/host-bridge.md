---
id: SPEC-BRIDGE
title: Host Bridge
status: accepted
owner: runtime
prd_refs: ["§5 F7", "§7 Arsitektur Web"]
---

# Host Bridge

## 1. Tujuan

Menetapkan satu kanal komunikasi antara micro-app dan host: namespace, method, parameter, hasil, error, timeout, rate limit, consent, dan audit. Bridge adalah permukaan keamanan utama; tidak ada jalur lain dari app ke host.

## 2. Ruang Lingkup

Di dalam: protokol `postMessage`, namespace, daftar method, validasi, consent, timeout, rate limit, audit. Di luar: definisi permission ([permissions.md](permissions.md)), eksekusi sandbox ([03-sandbox-runtime.md](03-sandbox-runtime.md)), intent antar-app ([host-bridge-intents.md](../01-architecture/host-bridge-intents.md)).

## 3. Requirement

| Aturan | Level | Acceptance |
|---|---|---|
| Semua pesan memakai amplop `{ v, id, ns, method, params }`. | MUST | Pesan tanpa amplop ditolak. |
| Host memverifikasi `event.source` dan origin opaque. | MUST | Pesan dari frame lain diabaikan. |
| Method harus ada di allowlist dan manifest. | MUST | Method tidak dikenal → `E-RUN-003`. |
| Permission diperiksa per panggilan. | MUST | Grant dicabut → panggilan gagal. |
| Timeout default 10 s; operasi berat 30 s. | MUST | Timeout menghasilkan error terstruktur. |
| Rate limit 30 panggilan/10 s per app. | MUST | Kelebihan ditolak dengan `E-RUN-003`. |
| Payload maksimum 256 KB per panggilan. | MUST | Payload lebih besar ditolak sebelum handler. |
| Hasil dan error memakai bentuk yang sama. | MUST | `{ ok: true, result }` atau `{ ok: false, error }`. |

## 4. Namespace dan Method

| Namespace | Method | Permission | Hasil |
|---|---|---|---|
| `ui` | `ready` | — | `{ accepted: true }` |
| `ui` | `toast` | — | `{ shown: true }` |
| `storage` | `get` | `storage.app` | `{ value }` |
| `storage` | `set` | `storage.app` | `{ stored: true }` |
| `clipboard` | `read` | `clipboard.read` | `{ text }` |
| `clipboard` | `write` | `clipboard.write` | `{ written: true }` |
| `notify` | `local` | `notifications.local` | `{ scheduled: true }` |
| `files` | `pick` | `files.pick` | `{ name, size, handle }` |
| `net` | `fetch` | `network.fetch` | `{ status, headers, body }` |
| `vault` | `read` | `vault.read` | `{ value }` |
| `share` | `export` | `share.export` | `{ file }` |
| `app` | `getInfo` | — | `{ id, version, workspace }` |

Method di luar tabel MUST NOT ditambahkan tanpa memperbarui spec ini dan manifest allowlist.

## 5. Amplop

```json
{
  "v": 1,
  "id": "req_01HZ",
  "ns": "clipboard",
  "method": "read",
  "params": {}
}
```

Respons sukses:

```json
{ "v": 1, "id": "req_01HZ", "ok": true, "result": { "text": "halo" } }
```

Respons gagal:

```json
{
  "v": 1,
  "id": "req_01HZ",
  "ok": false,
  "error": { "code": "E-RUN-003", "message": "permission denied", "retryable": false }
}
```

## 6. Urutan Validasi

1. Cek versi amplop dan bentuk field.
2. Cek `event.source` adalah iframe app yang aktif.
3. Cek ukuran payload.
4. Cek rate limit.
5. Cek method ada di allowlist manifest.
6. Cek permission; jalankan consent JIT bila perlu.
7. Jalankan handler dengan timeout.
8. Audit hasil dan durasi.

Kegagalan langkah 1–6 tidak menjalankan handler dan tidak menulis data.

## 7. Timeout, Rate Limit, dan Audit

Timeout membatalkan handler secara logis; handler yang tidak dapat dibatalkan tetap diabaikan hasilnya. Rate limit dihitung per app per jendela 10 detik. Audit mencatat `app_id`, `ns`, `method`, `result`, `duration_ms`, dan `consent` tanpa parameter sensitif.

## 7. Acceptance Criteria

1. Hanya pesan dari iframe app aktif yang diproses.
2. Method tanpa deklarasi ditolak.
3. Permission dicabut menggagalkan panggilan berikutnya.
4. Timeout dan rate limit menghasilkan error terstruktur.
5. Audit tidak memuat nilai sensitif.

## 8. Verifikasi

| Pemeriksaan | Cara |
|---|---|
| Amplop | Vitest: pesan invalid ditolak. |
| Origin | Vitest: pesan dari window lain diabaikan. |
| Permission | Vitest: revoke lalu panggil, `E-RUN-003`. |
| Timeout | Vitest: handler lambat, fake timer 10 s. |
| Rate limit | Vitest: 31 panggilan, yang terakhir ditolak. |
| Audit | Vitest: entri tanpa params sensitif. |
