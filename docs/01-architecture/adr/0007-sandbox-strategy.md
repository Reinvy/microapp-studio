---
id: ADR-0007
title: ADR-0007 Strategi Sandbox dan MUIP
status: accepted
owner: architecture
prd_refs: ["§3 Modul 3", "§1.2"]
---

# ADR-0007 Strategi Sandbox dan MUIP

## Konteks

Micro-app dari komunitas harus dapat berjalan di web, mobile, dan desktop dengan jaminan isolasi setara kontainer, tanpa memberi akses ke DOM, filesystem, atau jaringan Host. Phase 0 mengeksekusi kode dengan `new Function` di konteks Host, yang tidak memenuhi syarat apa pun.

## Keputusan

1. **Web:** `iframe` dengan `sandbox="allow-scripts"` **tanpa** `allow-same-origin` sehingga origin opaque, ditambah Dedicated Worker, WASM, dan CSP `default-src 'none'`. Bundle dimuat dari blob URL yang dibuat Host.
2. **Native:** **QuickJS** untuk bundle JavaScript dan **Wasmtime** untuk modul WASM, dijalankan di isolate tanpa akses ambient; komunikasi lewat binary bridge.
3. **UI micro-app memakai MUIP v1**, protokol deklaratif node `{type,id,props,children,events,style}`. Web merender MUIP di dalam iframe; native merender MUIP menjadi widget Flutter. Renderer tidak menerima HTML atau JavaScript mentah.
4. **Host tidak pernah menyuntikkan DOM/Widget micro-app ke dokumen/aplikasi induk.** Micro-app tidak memiliki referensi ke `window.parent`, `document` Host, atau FFI langsung.
5. **`new Function` dan `eval` dilarang pada runtime produksi.** Tidak ada fallback eksekusi di luar sandbox; bila isolate tidak tersedia, micro-app gagal tertutup.
6. Kuota default: 128 MB mobile, 512 MB desktop; watchdog mematikan isolate setelah freeze 5 detik; hibernasi setelah 30 detik tanpa interaksi.
7. Semua akses ke Host melalui capability broker dan Host Bridge, dengan permission manifest dan consent pengguna.

## Konsekuensi

- Micro-app harus ditulis terhadap MUIP dan SDK, bukan DOM langsung; ini biaya adopsi yang disengaja.
- Dua renderer (web dan Flutter) wajib berperilaku semantik identik; test kontrak bersama diperlukan.
- Performa render MUIP lebih rendah dibanding DOM native, tetapi dapat diprediksi dan aman.
- Ukuran runtime bertambah; aset dibundel lokal.
- Debug micro-app memerlukan protokol log terstruktur melalui bridge.

## Alternatif

| Alternatif | Alasan ditolak |
|---|---|
| Iframe dengan `allow-same-origin` | Memberi akses ke origin Host dan storage; membatalkan isolasi. |
| WebView per micro-app di native | Overhead memori besar dan permukaan serangan luas. |
| `new Function` dengan proxy | Bukan batas keamanan; dapat dilewati. |
| Server-side rendering micro-app | Melanggar offline-first. |
| HTML/CSS mentah di MUIP | Membuka XSS dan membuat renderer native tidak mungkin konsisten. |

## Status

`accepted`. Kontrak ada di [03-specs/ui-protocol.md](../../03-specs/ui-protocol.md) dan [03-specs/host-bridge.md](../../03-specs/host-bridge.md).
