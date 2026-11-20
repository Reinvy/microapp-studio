---
id: SPEC-BRIDGE
title: Host Bridge
status: accepted
owner: runtime
prd_refs: ["§3 Modul 1", "§3 Modul 3"]
---

# Host Bridge

## 1. Tujuan dan Ruang Lingkup

Host Bridge adalah satu-satunya kanal antara sandbox micro-app dan Host. Bridge menegakkan permission, validasi parameter, timeout, pembatalan, rate limit, dan audit. Micro-app MUST NOT mengakses database, filesystem, kamera, jaringan, atau API Host secara langsung.

Di luar lingkup: transport fisik (lihat [host-bridge-intents.md](../01-architecture/host-bridge-intents.md)), MUIP (lihat [ui-protocol.md](ui-protocol.md)).

## 2. Aktor dan Prasyarat

| Aktor | Prasyarat |
|---|---|
| Micro-app | Sandbox aktif; manifest tervalidasi; grant permission |
| Host | Broker dan validator aktif |
| Pengguna | Consent untuk permission yang diminta |

## 3. Requirement

| Aturan | Level | Ketentuan | Verifikasi |
|---|---|---|---|
| B-01 | MUST | Request berbentuk `{v, id, ns, method, params, timeoutMs}`; `v` adalah versi bridge (`1`), `id` unik per sesi, `ns` dan `method` terdaftar. | Request tanpa `id` atau dengan `ns` tak dikenal ditolak. |
| B-02 | MUST | Respons sukses berbentuk `{id, ok: true, result}`; error berbentuk `{id, ok: false, error: {code, message, details, retryable}}` dengan `code` dari katalog error. | Respons selalu memuat `id` yang sama; error memuat `retryable`. |
| B-03 | MUST | Urutan validasi broker MUST mengikat: versi → ukuran frame → permission → parameter → rate limit → eksekusi. Permission MUST diperiksa sebelum validasi parameter dan penolakan tidak boleh membocorkan detail resource. Urutan ini menang atas urutan arsitektur lama (`SEC-014` dan B-03 adalah kontrak). | Tanpa grant, respons `E-SBX-005` dan audit denial; parameter invalid pada method tanpa grant tetap menghasilkan `E-SBX-005`, bukan error parameter. |
| B-04 | MUST | Parameter divalidasi terhadap skema per method; field tak dikenal ditolak. | `camera.capture` dengan `facing: "sideways"` ditolak. |
| B-05 | MUST | Timeout default 10 detik; transfer berkas 60 detik; AI inference 120 detik. Timeout menghasilkan error `retryable: true` bila operasi idempoten. | Operasi lambat dihentikan dan mengembalikan timeout. |
| B-06 | MUST | Pembatalan MUST didukung melalui `bridge.cancel(id)`; Host MUST menghentikan operasi dan membebaskan resource, dan MUST NOT mengirim hasil setelah pembatalan. | Cancel saat kamera aktif menutup kamera; tidak ada respons terlambat. |
| B-07 | MUST | Saat micro-app masuk background, Host MUST membatalkan operasi yang tidak tahan background (kamera, mikrofon, AI) dan memberi tahu micro-app. | App background menutup kamera dan mengirim event cancel. |
| B-08 | MUST | Streaming MUST memakai event bertipe `{id, seq, chunk}` dengan urutan monoton dan penutup `{id, done: true}`; chunk hilang terdeteksi dari `seq`. | Stream 100 chunk tanpa gap; gap memicu error. |
| B-09 | MUST | Transfer biner MUST memakai chunk maksimum 256 KiB dengan hash SHA-256 per berkas dan total ukuran; Host memverifikasi hash sebelum menyerahkan. | Berkas 2 MiB terkirim dalam 8 chunk; hash diverifikasi. |
| B-10 | MUST | Rate limit MUST 100 panggilan/detik per app; melebihi batas menghasilkan `E-SBX-005` dengan `retryable: true` dan audit. | 150 panggilan/detik memicu penolakan setelah 100. |
| B-11 | MUST | Bridge MUST menegosiasikan versi saat mount; Host mendukung `1` dan menolak mayor lain dengan error yang jelas. | Client `v: 2` menerima error versi. |
| B-12 | MUST | Setiap panggilan yang mengubah data atau mengakses resource MUST dicatat di audit: `app_id`, `ns.method`, `result`, `duration_ms`; payload sensitif diredaksi. | Audit memuat metadata; tidak ada isi file atau token. |
| B-13 | MUST | Method `db.*` MUST hanya mengakses database milik `app_id`; tidak ada parameter yang memungkinkan memilih database lain. | `db.query` dengan `appId` lain ditolak. |
| B-14 | MUST | Method `fs.*` MUST hanya melalui file picker atau sandbox storage; path absolut, `..`, dan akses di luar root ditolak. | `fs.read("/etc/passwd")` ditolak. |
| B-15 | MUST | Method `network.*` MUST memeriksa `network.allowlist` dan Offline Cage pada setiap request; domain di luar allowlist ditolak sebelum koneksi dibuat. | Request ke domain terlarang tidak menghasilkan koneksi. |
| B-16 | MUST | Method `intents.*` MUST memerlukan consent pengguna untuk setiap transfer lintas app dan MUST menyertakan pengirim serta tipe payload. | Transfer tanpa consent ditolak. |
| B-17 | SHOULD | Bridge MUST menyediakan `log.*` dengan level dan redaksi otomatis untuk pola token/kunci; log tidak boleh memuat isi Vault. | Log dengan token diredaksi. |
| B-18 | MUST | Method yang tidak ada MUST menghasilkan `not_found` dan MUST NOT memicu fallback ke API lain. | `camera.unknown` ditolak. |
| B-19 | MUST | Bridge MUST NOT mengekspos objek Host, referensi DOM, `window`, `document`, `globalThis` Host, atau fungsi FFI mentah kepada micro-app. | Pemindaian objek yang diterima micro-app tidak menemukan referensi Host. |
| B-20 | MUST | Semua error bridge MUST memakai kode dari [error-codes.md](error-codes.md) dan MUST NOT memuat stack trace internal Host. | Error hanya memuat kode, pesan aman, dan detail non-sensitif. |

## 4. Model Data dan State

### 4.1 Envelope

```json
{
  "v": 1,
  "id": "req-7f3a",
  "ns": "camera",
  "method": "capture",
  "params": { "facing": "environment", "format": "jpeg" },
  "timeoutMs": 60000
}
```

```json
{ "id": "req-7f3a", "ok": true, "result": { "blobId": "blob-1", "width": 1920, "height": 1080 } }
```

```json
{
  "id": "req-7f3a",
  "ok": false,
  "error": { "code": "E-SBX-005", "message": "Permission denied", "details": { "permission": "camera" }, "retryable": false }
}
```

### 4.2 Namespace dan Method

| Namespace | Method | Permission | Timeout | Result |
|---|---|---|---|---|
| `bridge` | `cancel` | — (level envelope) | 10 s | `{cancelled}` |
| `vault` | `read` | grant per item Vault | 10 s | `{itemId, plaintextBlobId}` |
| `db` | `query`, `exec`, `transaction`, `migrate` | `storage.local.sqlite` | 10 s | `{rows, changes}` |
| `storage` | `get`, `set`, `remove`, `keys` | `storage.local` | 10 s | `{value}` |
| `fs` | `pick`, `read`, `write`, `stat` | `filesystem.picker` | 60 s | `{handle, size, sha256}` |
| `camera` | `capture`, `scanQr`, `scanBarcode` | `camera`, `camera.qr` | 60 s | `{blobId, format}` |
| `notifications` | `schedule`, `cancel`, `list` | `notifications.local` | 10 s | `{id}` |
| `ai` | `infer`, `embed`, `classify` | `local_ai.inference` | 120 s | `{output, model}` |
| `network` | `fetch`, `subscribe` | `network.allowlist` | 60 s | `{status, headers, bodyBlobId}` |
| `intents` | `send`, `receive`, `list` | sesuai intent | 10 s | `{accepted}` |
| `device` | `info`, `biometrics`, `location`, `bluetooth`, `nfc` | `biometrics`, `location`, `bluetooth`, `nfc` | 10 s | `{value}` |
| `sync` | `status`, `request`, `cancel` | — | 10 s | `{state, cursor}` |
| `log` | `write`, `flush` | — | 10 s | `{accepted}` |

Catatan permukaan bridge:

- `ui.render`, `ui.patch`, `ui.focus`, dan `ui.toast` BUKAN method Host Bridge. Keempatnya adalah API internal renderer MUIP di dalam iframe sandbox; Host tidak menerima node MUIP dan tidak menyisipkan node ke dokumen induk.
- `bridge.cancel` beroperasi pada level envelope: memakai `id` request yang sedang berjalan, tidak membutuhkan permission, dan tidak boleh mengubah hasil request lain.
- `vault.read` MUST memerlukan grant per item (`vault_grants`) untuk `app_install_id` pemanggil; tidak ada grant level Vault atau level app. Item tanpa grant ditolak `E-SBX-005` sebelum parameter diperiksa.
- `ai.*` dan `workflow.run` (aksi MUIP) MUST gagal tertutup dengan `E-SBX-005` sampai fase 3 diaktifkan; renderer menampilkan placeholder aksi, bukan no-op, dan micro-app tidak menerima hasil palsu.
- Rate limit tetap 100 panggilan/detik per app; chunk biner maksimum 256 KiB dengan SHA-256 per berkas dan total.

### 4.3 Matriks Error Umum

| Kondisi | Kode | Retryable |
|---|---|---|
| Permission tidak diberikan | `E-SBX-005` | Tidak |
| Parameter invalid | `E-SBX-005` | Tidak |
| Waktu operasi habis | `E-NET-003` | Ya |
| Rate limit | `E-SBX-005` | Ya |
| Resource tidak tersedia | `E-SBX-001` | Ya |
| Versi bridge tidak didukung | `E-SBX-001` | Tidak |
| Operasi dibatalkan `bridge.cancel` atau app ke background | `E-SBX-006` | Tidak |
| Transfer biner tidak lengkap atau SHA-256 tidak cocok | `E-SBX-007` | Ya |
| `id` request dipakai ulang dalam satu sesi | `E-SBX-008` | Tidak |
| Intent tidak dideklarasikan target atau payload > 64 KiB | `E-SBX-009` | Tidak |
| `workspace_id` pada request melintasi isolasi workspace | `E-HOST-007` | Tidak |
| Rantai audit tidak valid saat penulisan event bridge | `E-HOST-006` | Tidak |

Pemetaan ini mengikat. `E-SBX-006` dikirim untuk request yang berjalan ketika `bridge.cancel` diterima atau sandbox masuk background; tidak ada respons sukses setelah pembatalan. `E-SBX-007` dikirim setelah Host membuang seluruh chunk yang diterima. `E-SBX-008` dicatat di audit tanpa menjalankan method. `E-SBX-009` dikirim sebelum target menerima payload apa pun. `E-HOST-007` dan `E-HOST-006` adalah kegagalan kritis: operasi ditolak dan aksi sensitif dihentikan.


## 5. Error dan Recovery

| Kode | Kondisi | Recovery |
|---|---|---|
| E-SBX-005 | Permission/parameter/rate limit ditolak | Kembalikan error terstruktur; micro-app menampilkan pesan; audit |
| E-SBX-001 | Runtime/bridge tidak tersedia | Fail closed; micro-app tidak dijalankan |
| E-SBX-006 | Operasi dibatalkan | Hentikan operasi dan lepaskan resource; jangan kirim hasil |
| E-SBX-007 | Transfer tidak lengkap/hash gagal | Buang chunk; minta ulang seluruh berkas |
| E-SBX-008 | Request duplikat | Tolak request; audit; app memakai `id` baru |
| E-SBX-009 | Intent invalid | Tolak transfer sebelum payload dikirim; audit |
| E-HOST-006 | Audit chain invalid | Hentikan aksi sensitif; tawarkan ekspor audit |
| E-HOST-007 | Isolasi workspace dilanggar | Tolak dan audit; tampilkan error generik |
| E-NET-003 | Timeout jaringan | Retry dengan backoff bila idempoten |
| E-DATA-001 | Database tidak dapat dibuka | Tampilkan error; tawarkan restore snapshot |

## 6. Keamanan dan Privasi

- Broker memeriksa dalam urutan mengikat: versi → ukuran frame → permission → parameter → rate limit → konteks app, baru eksekusi. Permission selalu diperiksa sebelum parameter.
- Tidak ada objek Host yang menyeberang ke sandbox; hanya data terstruktur (JSON, blob terverifikasi).
- Path filesystem dinormalisasi dan dibatasi pada root yang diberikan picker.
- Network allowlist dan Offline Cage diperiksa sebelum koneksi; DNS rebinding dicegah dengan resolve-then-connect ke IP yang tervalidasi.
- Audit meredaksi nilai sensitif dan menyimpan hash untuk korelasi.

## 7. Acceptance Criteria

- **Given** micro-app tanpa grant kamera **When** memanggil `camera.capture` **Then** respons `E-SBX-005` dan tidak ada dialog.
- **Given** berkas 2 MiB **When** ditransfer **Then** terbagi ≤ 256 KiB per chunk dan hash cocok.
- **Given** `bridge.cancel` **When** operasi berjalan **Then** operasi berhenti dan tidak ada hasil terlambat.
- **Given** 150 panggilan dalam 1 detik **When** melewati 100 **Then** sisanya ditolak dengan `retryable: true`.
- **Given** `fs.read` ke path absolut **When** dipanggil **Then** ditolak dan diaudit.
- **Given** method tanpa grant **When** parameter juga invalid **Then** respons `E-SBX-005` (permission lebih dulu), bukan error parameter.
- **Given** app memanggil `ai.infer` pada fase 1 **When** diproses **Then** respons `E-SBX-005` dan renderer menampilkan placeholder aksi.
- **Given** `vault.read` pada item tanpa grant **When** dipanggil **Then** ditolak tanpa mengungkap keberadaan item.

## 8. Verifikasi

| Bukti | Perintah/Prosedur |
|---|---|
| Contract | Test tiap method: params valid/invalid, permission matrix |
| Timeout/cancel | Simulasi operasi lambat dan background |
| Binary | Transfer chunk dengan hash dan ukuran bervariasi |
| Rate limit | Test 100/150 panggilan per detik |
| Security | Fixture path traversal, domain terlarang, objek Host |

## 9. Referensi

- [03-specs/ui-protocol.md](ui-protocol.md), [03-specs/permissions.md](permissions.md), [03-specs/error-codes.md](error-codes.md)
- [01-architecture/host-bridge-intents.md](../01-architecture/host-bridge-intents.md)
