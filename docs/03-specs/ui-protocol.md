---
id: SPEC-MUIP
title: UI Protocol MUIP v1
status: accepted
owner: runtime
prd_refs: ["§3 Modul 2", "§3 Modul 3"]
---

# UI Protocol MUIP v1

## 1. Tujuan dan Ruang Lingkup

MUIP (Micro-App UI Protocol) adalah satu-satunya cara micro-app menyatakan UI. Micro-app mengirim pohon node deklaratif; Host merender di iframe (web) atau menjadi widget Flutter (native). MUIP MUST NOT memuat HTML, CSS arbitrer, atau JavaScript yang dieksekusi renderer.

Di luar lingkup: styling detail komponen (lihat [component-catalog.md](../02-design/component-catalog.md)), transport bridge (lihat [host-bridge.md](host-bridge.md)).

## 2. Aktor dan Prasyarat

| Aktor | Prasyarat |
|---|---|
| Micro-app | Runtime sandbox aktif; versi MUIP dinegosiasikan |
| Renderer web | iframe opaque origin; CSP ketat |
| Renderer native | Widget Flutter dari token MADS |
| Host | Validator skema dan batas ukuran |

## 3. Requirement

| Aturan | Level | Ketentuan | Verifikasi |
|---|---|---|---|
| U-01 | MUST | Node berbentuk `{type, id, props, children, events, style}`. `type` dan `id` wajib; `children` array node; `style` hanya token MADS. | Node tanpa `id` ditolak; `style` dengan warna arbitrer ditolak. |
| U-02 | MUST | `type` MUST berasal dari daftar 120 komponen MADS; tipe tak dikenal ditolak tanpa fallback diam. | `type: "iframe"` ditolak; `type: "DataTable"` valid. |
| U-03 | MUST | `id` unik dalam satu dokumen dan stabil antar patch; duplikat menyebabkan dokumen ditolak. | Dua node dengan id sama ditolak. |
| U-04 | MUST | `props` divalidasi terhadap skema per tipe; properti tak dikenal ditolak kecuali dideklarasikan `additionalProps: true` pada komponen tersebut. | Prop `onClick` mentah ditolak; prop `label` valid. |
| U-05 | MUST | `events` memetakan nama event ke `intent` atau `action` terdaftar; handler berupa kode JavaScript mentah ditolak. | `events: {onPress: "alert(1)"}` ditolak; `events: {onPress: {action: "submit"}}` valid. |
| U-06 | MUST | `style` hanya memuat token: spacing, radius, warna token, tipografi, dan alignment; nilai CSS arbitrer dan `url()` ditolak. | `style: {color: "#ff0000"}` ditolak; `style: {color: "fg"}` valid. |
| U-07 | MUST | Kedalaman pohon maksimum 64, jumlah node maksimum 10.000, ukuran payload maksimum 1 MiB, dan panjang string maksimum 64 KiB. | Melebihi batas menghasilkan error validasi, bukan crash renderer. |
| U-08 | MUST | Patch dikirim sebagai batch operasi `insert`, `update`, `remove`, `move` dengan `id` target; patch MUST diterapkan atomik. | Patch dengan satu operasi invalid ditolak seluruhnya. |
| U-09 | MUST | Renderer MUST mempertahankan identitas node berdasarkan `id` sehingga state lokal (fokus, scroll, seleksi) bertahan antar patch. | Update props tidak kehilangan fokus input. |
| U-10 | MUST | Event dari renderer ke micro-app MUST memuat `type`, `id`, `event`, `payload`, dan `timestamp`, dengan payload tervalidasi per event. | Payload tak dikenal ditolak dan dicatat. |
| U-11 | MUST | Negosiasi versi MUST terjadi saat mount: micro-app mengirim `muipVersion`, Host merespons versi yang didukung; ketidakcocokan menghasilkan error yang jelas. | Micro-app v2 pada Host v1 menerima error dan tidak dirender. |
| U-12 | MUST | Renderer MUST menyediakan fallback untuk komponen yang tidak didukung versi Host: node diganti placeholder dengan label dan aksi, bukan dihilangkan diam-diam. | Host lama merender placeholder untuk komponen baru. |
| U-13 | MUST | Properti aksesibilitas (`label`, `description`, `role`, `live`, `disabled`, `required`) MUST didukung pada setiap node dan dipetakan ke ARIA (web) serta `Semantics` (Flutter). | axe tidak menemukan kontrol tanpa nama; screen reader membaca label. |
| U-14 | MUST | MUIP MUST NOT memuat HTML mentah, `innerHTML`, `<script>`, `javascript:` URL, atau event handler string. | Validator menolak seluruh pola tersebut. |
| U-15 | MUST | Renderer web dan Flutter MUST identik secara semantik: tipe, props, event, dan a11y menghasilkan perilaku yang sama; perbedaan visual diperbolehkan hanya pada token platform. | Test kontrak yang sama lulus di kedua renderer. |
| U-16 | MUST | Renderer MUST menolak node dengan `type` yang tidak ada di katalog versi aktif dan mencatat audit, tanpa mengeksekusi apa pun. | Node berbahaya tidak dirender dan tercatat. |
| U-17 | SHOULD | Renderer MUST mengirim metrik sederhana (jumlah node, waktu render) ke DevTools lokal untuk profiling, tanpa payload data pengguna. | DevTools menampilkan jumlah node; tidak ada data nilai field. |

## 4. Model Data dan State

### 4.1 Bentuk node

```json
{
  "type": "Card",
  "id": "card-1",
  "props": { "title": "Saldo" },
  "children": [
    {
      "type": "StatCard",
      "id": "stat-1",
      "props": { "label": "Hari ini", "value": "Rp120.000" },
      "events": { "onPress": { "action": "open.route", "params": { "route": "/detail" } } },
      "style": { "padding": "md", "color": "fg" }
    }
  ],
  "events": {},
  "style": { "gap": "sm" }
}
```

### 4.2 Operasi patch

| Operasi | Field | Semantik |
|---|---|---|
| `insert` | `parentId`, `index`, `node` | Menyisipkan node baru; `id` harus belum ada |
| `update` | `id`, `props`, `style`, `events` | Mengganti subset properti; properti yang tidak dikirim tidak berubah |
| `remove` | `id` | Menghapus node beserta subtree |
| `move` | `id`, `parentId`, `index` | Memindahkan node; tidak boleh membentuk siklus |

### 4.3 Batas dan versi

| Batas | Nilai | Perilaku saat dilanggar |
|---|---|---|
| Kedalaman | 64 | Tolak dokumen, error validasi |
| Jumlah node | 10.000 | Tolak dokumen |
| Ukuran payload | 1 MiB | Tolak patch |
| Panjang string | 64 KiB | Tolak node |
| Versi | `1` | Negosiasi; mayor lain ditolak bila tidak didukung |

## 5. Error dan Recovery

| Kode | Kondisi | Recovery |
|---|---|---|
| E-SBX-005 | Patch/event ditolak validator | Kirim error terstruktur ke micro-app; renderer tetap pada state valid terakhir |
| E-SBX-002 | Render melebihi kuota memori | Hentikan isolate, tampilkan error boundary |

## 6. Keamanan dan Privasi

- MUIP tidak memiliki escape hatch ke HTML/JS; renderer tidak pernah mengeksekusi string dari micro-app.
- Semua teks dirender sebagai teks, bukan markup; URL divalidasi terhadap skema yang diizinkan (`https`, `microapp`).
- Properti `src` untuk media hanya menerima aset paket atau blob lokal, bukan URL eksternal kecuali diizinkan `networkAllowlist` dan permission terkait.
- Event tidak boleh memicu aksi Host tanpa permission; aksi divalidasi terhadap allowlist.

## 7. Acceptance Criteria

- **Given** dokumen MUIP dengan 10.001 node **When** dikirim **Then** ditolak dan renderer tetap stabil.
- **Given** patch `remove` pada parent **When** diterapkan **Then** subtree hilang dan fokus berpindah ke elemen logis berikutnya.
- **Given** node dengan `events.onPress` berupa string JS **When** divalidasi **Then** ditolak.
- **Given** komponen baru pada Host lama **When** dirender **Then** placeholder tampil dengan label.
- **Given** dokumen yang sama **When** dirender di web dan Flutter **Then** event dan a11y identik.

## 8. Verifikasi

| Bukti | Perintah/Prosedur |
|---|---|
| Schema | Validasi contoh terhadap `schemas/ui-node.v1.schema.json` |
| Contract | Jalankan suite kontrak yang sama pada renderer web dan Flutter |
| Limits | Fixture kedalaman, jumlah node, ukuran, dan string |
| XSS | Fixture HTML/JS mentah; pastikan ditolak |
| A11y | axe pada renderer web; semantics tree pada Flutter |

## 9. Referensi

- [03-specs/schemas/ui-node.v1.schema.json](schemas/ui-node.v1.schema.json), [03-specs/host-bridge.md](host-bridge.md)
- [02-design/component-catalog.md](../02-design/component-catalog.md), [01-architecture/sandbox-capabilities.md](../01-architecture/sandbox-capabilities.md)
