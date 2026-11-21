---
id: SPEC-MUIP
title: UI Protocol
status: accepted
owner: runtime
prd_refs: ["§5 F4", "§7 Arsitektur Web"]
---

# UI Protocol

## 1. Tujuan

Menetapkan MUIP v1 untuk web: tipe node, props, event, batas, dan kontrak renderer. MUIP adalah satu-satunya bahasa UI micro-app; renderer menolak HTML, CSS, atau JavaScript arbitrer.

## 2. Ruang Lingkup

Di dalam: bentuk dokumen, node, props, event, batas ukuran, validasi, kontrak renderer. Di luar: katalog komponen ([component-catalog.md](../02-design/component-catalog.md)), bridge ([host-bridge.md](host-bridge.md)), skema JSON ([ui-node.v1.schema.json](schemas/ui-node.v1.schema.json)).

## 3. Requirement

| Aturan | Level | Acceptance |
|---|---|---|
| Dokumen berupa array node dengan satu root. | MUST | Renderer menolak dokumen tanpa root atau dengan root ganda. |
| Setiap `type` harus ada di 120 komponen katalog. | MUST | Tipe tidak dikenal ditolak, bukan dipetakan. |
| Props hanya boleh dari allowlist per komponen. | MUST | Prop asing ditolak dengan path node. |
| Event hanya boleh `press`, `change`, `submit`, `focus`, `blur`, `longPress`. | MUST | Event lain diabaikan dan dicatat. |
| Tidak ada HTML, CSS, atau JS di dalam node. | MUST | Field `html`, `css`, `style`, `script` ditolak. |
| Teks dirender dengan `textContent`. | MUST | Tidak ada `innerHTML` pada renderer. |
| Kedalaman maksimum 32 dan 2000 node per dokumen. | MUST | Dokumen melebihi batas ditolak dengan `E-RUN-004`. |
| Ukuran dokumen maksimum 512 KB. | MUST | Payload lebih besar ditolak sebelum parse penuh. |

## 4. Bentuk Node

```json
{
  "type": "Card",
  "id": "card_1",
  "props": { "tone": "surface", "padding": "md" },
  "children": [
    { "type": "Text", "id": "title_1", "props": { "value": "Kasir", "variant": "title" } }
  ],
  "on": { "press": { "action": "navigate", "target": "screen_checkout" } }
}
```

Aturan field:

| Field | Wajib | Catatan |
|---|---|---|
| `type` | Ya | Nama komponen katalog, case-sensitive. |
| `id` | Ya | Unik dalam dokumen, `^[a-zA-Z][a-zA-Z0-9_-]{0,63}$`. |
| `props` | Tidak | Objek; nilai skalar, array skalar, atau objek terbatas. |
| `children` | Tidak | Array node; hanya komponen yang mengizinkan children. |
| `on` | Tidak | Peta event ke aksi deklaratif. |

Aksi yang diizinkan: `navigate`, `setState`, `callBridge`, `openSheet`, `closeSheet`, `toast`. Aksi `callBridge` wajib menyebut method yang dideklarasikan manifest.

## 5. Kontrak Renderer

1. Validasi dokumen terhadap schema dan allowlist.
2. Buat elemen DOM dari komponen, bukan dari string HTML.
3. Set teks dengan `textContent`; set atribut dari allowlist.
4. Pasang listener untuk event yang dideklarasikan.
5. Laporkan error validasi ke host dengan path node dan kode.
6. Jangan mengeksekusi nilai props sebagai kode.

Renderer tidak menyediakan akses ke `window.parent`, cookie, storage host, atau `fetch` langsung. Semua akses keluar melalui bridge.

## 6. Batas dan Kegagalan

| Kondisi | Hasil |
|---|---|
| Tipe tidak dikenal | Tolak node, `E-RUN-004`, tampilkan boundary |
| Props invalid | Tolak node, catat path |
| Dokumen terlalu besar | Tolak sebelum parse, `E-RUN-004` |
| Event tidak dikenal | Abaikan, catat di audit |
| Aksi bridge tanpa permission | `E-RUN-003` |

## 7. Acceptance Criteria

1. Dokumen valid dirender tanpa HTML mentah.
2. Tipe dan props invalid ditolak dengan path.
3. Batas node, kedalaman, dan ukuran berlaku.
4. Renderer tidak pernah memanggil `innerHTML`, `eval`, atau `new Function`.

## 8. Verifikasi

| Pemeriksaan | Cara |
|---|---|
| Schema | Vitest: ajv terhadap `ui-node.v1.schema.json`. |
| Allowlist | Vitest: props asing ditolak. |
| Batas | Vitest: 2001 node dan 33 level ditolak. |
| XSS | Vitest: teks berisi `<img onerror>` dirender sebagai teks. |
| Event | Vitest: event asing tidak memanggil handler. |
