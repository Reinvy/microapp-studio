---
id: ADR-0003
title: ADR-0003 Rust Shared Core
status: accepted
owner: architecture
prd_refs: ["§4.2", "§3 Modul 3"]
---

# ADR-0003 Rust Shared Core

## Konteks

Crypto E2EE, verifikasi signature Ed25519, parser `.mapp`, CRDT/HLC, dan sandbox guard harus berperilaku identik di web, mobile, dan desktop. Implementasi ganda di TypeScript dan Dart berisiko divergen dan menciptakan bug keamanan.

## Keputusan

1. **`packages/core-rust` (crate `microapp-core`) adalah satu-satunya implementasi** untuk:
   - turunan kunci (BIP39, PBKDF2, HKDF), Ed25519, X25519, AES-256-GCM;
   - verifikasi signature manifest, registry, dan `.mapp`;
   - parser dan writer `.mapp` deterministik;
   - CRDT/HLC dan penggabungan kolom;
   - guard sandbox (batas memori, watchdog, validasi MUIP).
2. Diekspos ke web lewat **`wasm-bindgen`** (target `wasm32-unknown-unknown`) dan ke Flutter lewat **`flutter_rust_bridge`**.
3. Logika tersebut **tidak diduplikasi** di TypeScript atau Dart. TypeScript/Dart hanya membungkus API core.
4. `#![deny(unsafe_code)]` kecuali modul FFI yang didokumentasikan dan diuji; tidak ada panic yang menyeberang FFI.
5. Test vector crypto dan property test CRDT wajib ada di crate, bukan di binding.

## Konsekuensi

- Satu titik audit untuk keamanan.
- Build pipeline menambah langkah Cargo/WASM; artefak generated tidak di-commit kecuali fixture.
- Debug lintas bahasa lebih sulit; bridge wajib punya test kontrak.
- Ukuran WASM harus dijaga; modul dipisah agar Host web tidak memuat seluruh core bila tidak perlu.
- Kegagalan core adalah kegagalan fail-closed: micro-app tidak dijalankan.

## Alternatif

| Alternatif | Alasan ditolak |
|---|---|
| Implementasi TypeScript + Dart terpisah | Divergensi perilaku dan bug crypto; dua kali audit. |
| Crypto di server | Melanggar E2EE dan offline-first. |
| WASM saja untuk native | Flutter butuh FFI native untuk performa dan akses SQLite/QuickJS. |
| Library JS pihak ketiga untuk signature | Tidak dapat dipakai di native dan menambah permukaan supply chain. |

## Status

`accepted`. Penambahan modul baru ke core wajib disertai test vector dan pembaruan [data-model.md](../data-model.md) bila menyentuh skema.
