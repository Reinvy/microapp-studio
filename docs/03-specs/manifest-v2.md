---
id: SPEC-MANIFEST
title: Manifest v2
status: accepted
owner: registry
prd_refs: ["§4.3", "§3 Modul 5"]
---

# Manifest v2

## 1. Tujuan dan Ruang Lingkup

Dokumen ini adalah kontrak normatif `microapp.manifest.json` versi `2.0-open` dan layout paket `.mapp`. Parser, verifier, Host, Studio, dan CLI MUST mengikuti aturan ini. Perubahan apa pun yang tidak kompatibel wajib melalui RFC dan menaikkan major.

Di luar lingkup: format indeks registry (lihat [registry-supply-chain.md](../01-architecture/registry-supply-chain.md)), protokol UI (lihat [ui-protocol.md](ui-protocol.md)).

## 2. Aktor dan Prasyarat

| Aktor | Prasyarat |
|---|---|
| Author | Kunci Ed25519 author; sumber di Git |
| Builder | Builder image tercatat; akses ke `core-rust` packer |
| Host | Parser manifest v2 dan verifier signature |
| Registry | Indeks bertanda tangan yang merujuk `contentHash` |

## 3. Requirement

| Aturan | Level | Ketentuan | Verifikasi |
|---|---|---|---|
| M-01 | MUST | `manifest.json` berada di root `.mapp`, dikodekan UTF-8, dan tidak memuat komentar. | Parser menolak JSON dengan komentar atau BOM ganda. |
| M-02 | MUST | Field wajib: `schemaVersion`, `id`, `name`, `version`, `license`, `repository`, `publisher`, `minHostVersion`, `contentHash`, `entry`, `offline`, `runtime`, `permissions`, `capabilities`. | Manifest tanpa salah satu field ditolak dengan daftar field. |
| M-03 | MUST | `schemaVersion` bernilai `2.0-open` untuk major 2. Nilai lain ditolak oleh host v2. | `2.1-open` ditolak sebagai minor tak dikenal; `1.x` ditolak. |
| M-04 | MUST | `id` cocok dengan `^[a-z][a-z0-9]*(\.[a-z][a-z0-9-]*)+$` dan minimal dua segmen reverse-DNS. | `org.reinvy.kas-offline` valid; `Org.Reinvy` dan `kas` ditolak. |
| M-05 | MUST | `version` adalah semver `MAJOR.MINOR.PATCH` tanpa prefix `v`; prerelease hanya `-beta.N` atau `-rc.N`. | `1.3.0` valid; `v1.3` dan `1.3.0-alpha` ditolak. |
| M-06 | MUST | `license` adalah SPDX identifier valid dari daftar yang di-embed di `core-rust`; `repository` adalah URL HTTPS, dan boleh string kosong hanya bila `publisher.source` = `local`. | `MIT` valid; `Proprietary` ditolak untuk registry publik; `repository: ""` tanpa `publisher.source: local` ditolak. |
| M-07 | MUST | `publisher` memuat `keyId` (16 hex pertama SHA-256 public key author) dan `fingerprint` (64 hex penuh hash yang sama); keduanya MUST cocok dengan signature author. | Fingerprint tidak cocok memblokir instalasi. |
| M-08 | MUST | `minHostVersion` adalah semver dan Host MUST menolak instalasi bila versinya lebih rendah. | Host v1 menolak paket dengan `minHostVersion: 2.0.0`. |
| M-09 | MUST | `contentHash` berformat `sha256-<hex>` dan dihitung atas ZIP kanonik **tanpa** `signatures/`, dengan nilai `manifest.json.contentHash` diganti sementara `sha256-` + 64 karakter `0`; verifier mengulang prosedur yang sama sebelum membandingkan. Hash MUST diverifikasi sebelum ekstraksi. | Hash tidak cocok menolak paket; dua pack dari commit sama menghasilkan hash identik. |
| M-10 | MUST | `entry.bundle` dan `entry.assetsDir` adalah path relatif tanpa `..`, tanpa leading `/`, dan tanpa backslash; `entry.uiEngine` MUST `hybrid-native`. | `dist/app.bundle.js` valid; `../x.js` dan `C:\\x` ditolak. |
| M-11 | MUST | `offline.mode` MUST `offline-first`; `offline.syncStrategy` MUST `crdt-hlc`; `offline.requiresInternet` MUST `false` untuk paket yang dapat dipasang offline. | Nilai lain ditolak dengan pesan enum. |
| M-12 | MUST | `runtime.isolation` MUST `strict-sandbox`; `runtime.maxMemoryMb` berada pada 64–512; `runtime.supportedViewports` ⊆ `mobile`, `tablet`, `desktop`, `widget` dan tidak kosong; `runtime.secureDisplay` boolean opsional default `false`, dan bila `true` app MUST NOT muncul di screenshot, preview app switcher, atau Media Capture. | `maxMemoryMb: 1024` ditolak; viewport kosong ditolak; `secureDisplay: true` memaksa Host menampilkan placeholder. |
| M-13 | MUST | `permissions.required` dan `permissions.optional` hanya memuat permission ID dari katalog resmi, tanpa duplikasi antar kedua daftar; `permissions.quotas.storageMb` integer 1–1024 dengan default 10 dan berlaku untuk `storage.local`. | Permission tak dikenal ditolak; duplikat ditolak; kuota tanpa field memakai 10 MB. |
| M-14 | MUST | `permissions.networkAllowlist` berupa array domain exact atau wildcard `*.example.com`; IP literal dan CIDR ditolak; array kosong berarti offline-only. | `10.0.0.1` ditolak; `[]` valid dan menandai 100% Offline Verified. |
| M-15 | MUST | `localAi.optionalCapabilities` hanya memuat nilai yang dikenal (`text-classification`, `receipt-ocr`, `summarization`, `embedding`); `recommendedModelSize` ∈ `small-3b`, `medium-7b`, `large-13b`. | Nilai tak dikenal ditolak. |
| M-16 | MUST | `capabilities.intentsIn` dan `intentsOut` hanya memuat intent ID yang terdaftar; `capabilities.widgets[].id` unik dan `sizes` ⊆ `1x1`, `2x1`, `2x2`, `3x2`, `4x2`. | Intent tak dikenal ditolak; widget duplikat ditolak. |
| M-17 | MUST | `reproducibleBuild.commitHash` adalah 40 hex dan `builderImage` adalah referensi image dengan digest `@sha256:`. | Tag tanpa digest ditolak untuk publikasi. |
| M-18 | MUST | `entry.integrity` menggunakan format SRI `sha384-<base64>` dan MUST cocok dengan hash bundle. | Integritas tidak cocok menolak eksekusi. |
| M-19 | MUST | Layout `.mapp` MUST berisi `manifest.json`, `dist/`, `assets/`, `db/migrations/`, dan `signatures/`; direktori boleh kosong hanya bila tidak relevan dan dinyatakan di manifest. | Paket tanpa `dist/` ditolak; `db/migrations/` kosong valid bila `offline.localDbSchema` tidak dipakai. |
| M-20 | MUST | ZIP MUST deterministik: entry terurut, timestamp `1980-01-01`, deflate level 9, tanpa extra field, tanpa komentar, permission konstan. | Dua build menghasilkan `contentHash` identik. |
| M-21 | MUST | Signature detached `signatures/author.ed25519` dan `signatures/registry.ed25519` berisi 64 byte signature mentah atas 32 byte digest SHA-256 ZIP kanonik (bukan atas string hex); key registry dan author MUST berbeda bila keduanya ada. Instalasi lokal wajib signature author valid dan signature registry opsional-tetapi-wajib-valid bila ada; instalasi dari registry wajib keduanya; instalasi dari Git tanpa signature hanya dengan peringatan eksplisit dan trust `community`/`local`. | Signature valid tetapi kunci sama ditolak; paket lokal tanpa `signatures/registry.ed25519` diterima; instalasi Git tanpa peringatan ditolak. |
| M-22 | MUST | Parser MUST menolak path absolut, `..`, backslash, symlink, entry duplikat, dekompresi melebihi 256 MiB, arsip terkompresi melebihi 64 MiB, dan lebih dari 10.000 entry. | Fixture zip bomb dan traversal ditolak. |
| M-23 | MUST | Kompatibilitas: host major saat ini dan major sebelumnya didukung 12 bulan; field baru hanya aditif dalam major yang sama dan MUST diabaikan bila tidak dikenal oleh parser. Schema authoring tetap `additionalProperties: false`, sehingga field aditif harus dideklarasikan lebih dulu; `schemaVersion` wajib tepat `2.0-open`. | Host v2 membuka paket 2.x dengan field baru; paket 3.x ditolak; field tak dikenal gagal di schema authoring tetapi diabaikan parser. |
| M-24 | MUST | Manifest MUST NOT memuat field rahasia (token, kunci privat, kredensial); nilai sensitif hanya berupa referensi Vault. | Pemindaian manifest tidak menemukan pola kredensial. |

## 4. Model Data dan State

### 4.1 Contoh valid

```json
{
  "schemaVersion": "2.0-open",
  "id": "org.reinvy.kas-offline",
  "name": "KasLokal",
  "version": "1.3.0",
  "license": "MIT",
  "repository": "https://github.com/Reinvy/kas-lokal-microapp",
  "publisher": {
    "keyId": "9f2c1d4e8a7b3c50",
    "fingerprint": "b6f1c0d2e3a4958671f0a1b2c3d4e5f60718293a4b5c6d7e8f9012345678abcd",
    "source": "registry"
  },
  "minHostVersion": "2.0.0",
  "contentHash": "sha256-3f7a1c9d2e4b6a8c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c",
  "reproducibleBuild": {
    "commitHash": "a94f2c8d1e7b0a3c5d6e7f8091a2b3c4d5e6f708",
    "builderImage": "ghcr.io/reinvy/mapp-builder@sha256:1a2b3c4d5e6f708192a3b4c5d6e7f8091a2b3c4d5e6f708192a3b4c5d6e7f809"
  },
  "entry": {
    "bundle": "dist/app.bundle.js",
    "assetsDir": "assets/",
    "uiEngine": "hybrid-native",
    "integrity": "sha384-1B2c3D4e5F6g7H8i9J0kLmNoPqRsTuVwXyZaBcDeFgHiJkLmNoPqRsTuVwX",
    "signature": "ed25519-9f2c1d4e8a7b3c50"
  },
  "offline": {
    "mode": "offline-first",
    "requiresInternet": false,
    "localDbSchema": "db/migrations/",
    "syncStrategy": "crdt-hlc"
  },
  "runtime": {
    "isolation": "strict-sandbox",
    "maxMemoryMb": 128,
    "supportedViewports": ["mobile", "tablet", "desktop", "widget"],
    "secureDisplay": false
  },
  "permissions": {
    "required": ["storage.local.sqlite"],
    "optional": ["camera.qr", "notifications.local", "local_ai.inference"],
    "networkAllowlist": [],
    "quotas": { "storageMb": 10 }
  },
  "localAi": {
    "optionalCapabilities": ["receipt-ocr", "text-classification"],
    "recommendedModelSize": "small-3b"
  },
  "capabilities": {
    "intentsIn": ["image.receipt", "data.csv"],
    "intentsOut": ["document.pdf", "json.structured"],
    "widgets": [{ "id": "daily-balance", "sizes": ["2x1", "2x2"] }]
  }
}
```

### 4.2 Contoh tidak valid

| Contoh | Alasan ditolak |
|---|---|
| `{"id": "kaslokal", ...}` | `id` tidak reverse-DNS (minimal dua segmen). |
| `{"version": "v1.3", ...}` | Bukan semver; prefix `v` dilarang. |
| `{"entry": {"bundle": "../app.js"}}` | Path traversal. |
| `{"permissions": {"networkAllowlist": ["10.0.0.1"]}}` | IP literal dilarang. |
| `{"offline": {"mode": "online-allowed"}}` | Enum tidak diizinkan. |
| `{"runtime": {"isolation": "none"}}` | Enum tidak diizinkan. |
| `{"reproducibleBuild": {"builderImage": "builder:latest"}}` | Image tanpa digest. |
| `{"permissions": {"required": ["camera"], "optional": ["camera"]}}` | Duplikasi required/optional. |

### 4.3 Layout `.mapp`

```text
app.mapp
├── manifest.json
├── dist/
│   ├── app.bundle.js
│   └── app.wasm
├── assets/
│   └── icon.png
├── db/
│   └── migrations/
│       ├── 001_init.up.sql
│       ├── 001_init.down.sql
│       └── ledger.json
└── signatures/
    ├── author.ed25519
    └── registry.ed25519
```

### 4.4 Cakupan Signature

| Berkas | Dicakup signature | Catatan |
|---|---|---|
| `manifest.json` | Ya (lewat digest ZIP) | Field `contentHash` dihitung dari ZIP kanonik tanpa `signatures/` |
| `dist/**` | Ya | Hash bundle juga dicatat di `entry.integrity` |
| `assets/**` | Ya | — |
| `db/migrations/**` | Ya | Migrasi tidak boleh diubah setelah publikasi |
| `signatures/**` | Tidak | Signature tidak menandatangani dirinya sendiri |

`entry.signature` adalah **label** `ed25519-<keyId>` yang menunjuk `signatures/author.ed25519`; ia tidak membawa byte signature. Pada indeks registry, signature per entri berbentuk objek `{keyId, value}` yang membawa byte signature (lihat [schemas/registry-index.v1.schema.json](schemas/registry-index.v1.schema.json)). Kedua bentuk tidak saling menggantikan.

### 4.5 Prosedur Digest dan Signature

1. Susun ZIP kanonik tanpa `signatures/` (entry terurut bytewise, timestamp `1980-01-01`, deflate level 9, permission `0644`/`0755`).
2. Tulis `manifest.json` dengan `contentHash` sementara `sha256-` + 64 karakter `0`, serialisasi JCS UTF-8 tanpa BOM dan tanpa newline akhir.
3. Hitung `digest = SHA-256(ZIP kanonik)`; digest ini adalah satu-satunya nilai yang dipakai `contentHash` **dan** kedua signature.
4. Tulis ulang `manifest.json` dengan `contentHash = "sha256-" || hex(digest)` dan serialisasi ulang JCS, lalu bangun ZIP final.
5. Tandatangani 32 byte `digest` dari langkah 3 dengan Ed25519 author, tulis `signatures/author.ed25519` (64 byte mentah). Registry melakukan hal yang sama dengan kunci berbeda ke `signatures/registry.ed25519`.
6. Verifier mem-parse manifest, mengganti `contentHash` dengan placeholder, men-serialisasi ulang JCS, membangun ulang ZIP kanonik dengan placeholder, menghitung digest, lalu membandingkan `contentHash` dan kedua signature terhadap digest itu.
7. Karena `signatures/` tidak ikut di-ZIP-kan pada langkah 1–3, penambahan signature tidak mengubah digest; isi selain signature yang berubah selalu membatalkan `contentHash`.

### 4.6 Matriks Kepercayaan Instalasi

| Sumber | Signature author | Signature registry | Kunci berbeda | Peringatan |
|---|---|---|---|---|
| `.mapp` lokal (file picker/USB) | Wajib valid | Opsional; wajib valid bila ada | Wajib bila registry ada | Tidak ada |
| Registry | Wajib valid | Wajib valid | Wajib | Tidak ada |
| Git tanpa signature | Tidak ada | Tidak ada | Tidak berlaku | Wajib eksplisit; trust `community`/`local` |
| Enterprise (internal) | Wajib valid | Wajib valid | Wajib | Tidak ada |

### 4.7 Registry Intent

`capabilities.intentsIn` dan `intentsOut` hanya boleh memuat ID berikut; daftar ini di-embed di `core-rust` dan diubah lewat RFC.

| Intent ID | Payload | Contoh penggunaan |
|---|---|---|
| `text.plain` | teks UTF-8 saja | Catatan, catatan tempel |
| `json.structured` | objek JSON ≤ 64 KiB | Pertukaran data antar-app |
| `image.photo` | blob gambar | Kirim foto ke app lain |
| `image.receipt` | blob gambar + metadata OCR opsional | Struk ke app keuangan |
| `document.pdf` | blob PDF | Ekspor dokumen |
| `data.csv` | blob CSV | Impor/ekspor tabel |
| `url.open` | URL HTTPS | Buka tautan di app target |
| `file.any` | blob dengan MIME terdeklarasi | Transfer file umum |

Intent di luar daftar ditolak saat validasi manifest (`M-16`) dan saat dispatch (`E-SBX-009`).

## 5. Error dan Recovery

| Kode | Kondisi | Recovery |
|---|---|---|
| E-REG-003 | `contentHash` tidak cocok | Tolak paket, hapus unduhan sementara, minta sumber ulang |
| E-REG-001 | Signature author/registry tidak valid | Blokir instalasi, tampilkan fingerprint |
| E-REG-002 | Kunci author berubah | Blokir update sampai persetujuan eksplisit |

## 6. Keamanan dan Privasi

- Parser berjalan di core Rust dengan batas ukuran dan jumlah entry; tidak ada ekstraksi ke path di luar direktori paket.
- Manifest tidak boleh memuat rahasia; kredensial hanya referensi Vault.
- `networkAllowlist` kosong adalah jaminan offline-only di level engine, bukan sekadar deklarasi.
- Signature author dan registry dipisahkan untuk mencegah registry yang dikompromikan menyamar sebagai author.

## 7. Acceptance Criteria

- **Given** manifest valid **When** divalidasi terhadap schema **Then** lolos tanpa error.
- **Given** manifest dengan `id` invalid **When** divalidasi **Then** ditolak dengan pesan field `id`.
- **Given** paket dengan entry `../etc/passwd` **When** diekstrak **Then** ekstraksi dibatalkan dan error dilaporkan.
- **Given** dua build dari commit sama **When** dipack **Then** `contentHash` identik.
- **Given** `contentHash` di manifest diubah satu hex **When** diverifikasi **Then** digest ZIP tidak cocok dan paket ditolak `E-REG-003`.
- **Given** paket lokal tanpa `signatures/registry.ed25519` **When** dipasang **Then** instalasi diterima setelah signature author valid.
- **Given** instalasi dari Git tanpa signature **When** pengguna tidak menyetujui peringatan **Then** instalasi dibatalkan dan audit mencatat penolakan.
- **Given** `runtime.secureDisplay: true` **When** app switcher dibuka **Then** preview diganti placeholder berlabel dan tidak ada gambar yang disimpan.
- **Given** `networkAllowlist: []` **When** paket dipasang **Then** Host menampilkan badge 100% Offline Verified.

## 8. Verifikasi

| Bukti | Perintah/Prosedur |
|---|---|
| Schema | `node -e` parse `schemas/microapp.manifest.v2.schema.json`; validasi contoh manual |
| Parser | Fixture valid/invalid di `packages/core-rust`; test traversal dan zip bomb |
| Reproducible | Pack dua kali; bandingkan hash |
| Signature | Verifikasi author dan registry; uji kunci sama |
| Offline | Instalasi `.mapp` dengan jaringan diblokir |

## 9. Referensi

- [03-specs/schemas/microapp.manifest.v2.schema.json](schemas/microapp.manifest.v2.schema.json)
- [01-architecture/registry-supply-chain.md](../01-architecture/registry-supply-chain.md), [04-flows/09-publish-verify.md](../04-flows/09-publish-verify.md)
