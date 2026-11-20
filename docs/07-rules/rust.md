---
id: RULE-RS
title: Aturan Rust
status: accepted
owner: dx
prd_refs: ["§7.1", "§5.1"]
---

# Aturan Rust

Aturan ini berlaku untuk crate `microapp-core` di `packages/core-rust` yang menyediakan kriptografi, verifikasi signature, parser `.mapp`, HLC/CRDT, dan sandbox guard. Crate ini adalah satu-satunya implementasi logika tersebut; binding WASM dan FFI tidak boleh menduplikasi perilakunya.

## 1. Cakupan

| Area | Kewajiban utama |
|---|---|
| Keselamatan | Larangan `unsafe` di luar FFI terdokumentasi; tanpa panic lintas boundary |
| Error | `thiserror`, error typed, tanpa `unwrap` pada input tidak tepercaya |
| Rahasia | `zeroize`, tanpa log/Debug rahasia |
| Kontrak | serde ketat, JSON kanonik, versioning |
| WASM/FFI | Tanpa ambient capability, ABI stabil, buffer aman |
| Kualitas | clippy, fuzz, test vector kriptografi, property test |

## 2. Aturan

### 2.1 Keselamatan dan Error

| ID | Level | Aturan | Konsekuensi |
|---|---|---|---|
| RULE-RS-001 | MUST | Crate root MUST memakai `#![deny(unsafe_code)]`; satu-satunya pengecualian adalah modul FFI yang didokumentasikan, memiliki `// SAFETY:` pada setiap blok, dan ditinjau reviewer security. | `cargo clippy` gagal; PR dengan `unsafe` tanpa justifikasi ditolak. |
| RULE-RS-002 | MUST | Tidak ada panic yang boleh menyeberangi FFI, WASM, atau callback Flutter/Dart; boundary MUST menangkap panic (`catch_unwind`) dan mengembalikan kode error terstruktur. | Panic yang menyeberang boundary adalah undefined behavior; library dianggap tidak dapat dipakai. |
| RULE-RS-003 | MUST | `unwrap()` dan `expect()` MUST NOT dipakai pada input dari manifest, paket, jaringan, atau database; `expect()` hanya boleh untuk invariant internal dengan pesan yang menjelaskan invariant tersebut. | Input jahat dapat menghentikan proses; test fuzz menemukan panic dan PR diblokir. |
| RULE-RS-004 | MUST | Setiap error MUST memakai tipe `thiserror` dengan varian spesifik dan MUST dipetakan ke kode `E-*` di boundary; error tidak boleh dikembalikan sebagai string bebas. | Pesan tidak stabil dan tidak dapat dipetakan ke UI; reviewer menolak. |
| RULE-RS-005 | MUST | Overflow aritmetika pada HLC, ukuran, dan offset parser MUST memakai operasi checked atau `saturating_*` yang eksplisit; mode `release` tidak boleh menyembunyikan overflow. | Overflow menghasilkan timestamp/offset salah; test property gagal. |

### 2.2 Rahasia dan Kriptografi

| ID | Level | Aturan | Konsekuensi |
|---|---|---|---|
| RULE-RS-006 | MUST | Seed, passphrase, master key, subkey, dan kunci privat MUST dibungkus `zeroize::Zeroizing` atau tipe yang mengimplementasikan `ZeroizeOnDrop`; tipe rahasia MUST NOT mengimplementasikan `Debug`, `Display`, `Clone`, atau `Serialize`. | Kunci dapat muncul di log atau bertahan di memori; audit keamanan gagal. |
| RULE-RS-007 | MUST | Implementasi kriptografi MUST memakai primitive yang disetujui: Ed25519 (RFC 8032), X25519 (RFC 7748), AES-256-GCM, SHA-256, HKDF-SHA256, PBKDF2-HMAC-SHA512; algoritma atau konstruksi baru MUST NOT ditambahkan tanpa ADR dan RFC. | Kriptografi buatan sendiri dianggap blocker keamanan. |
| RULE-RS-008 | MUST | Nonce AES-GCM MUST 96 bit acak kriptografis dan unik per pasangan (key, plaintext); nonce MUST NOT dihasilkan dari counter yang tidak persisten. | Nonce reuse membocorkan plaintext; insiden SEV-1. |
| RULE-RS-009 | MUST | Verifikasi signature MUST dilakukan sebelum parsing payload lebih lanjut, dan kegagalan verifikasi MUST mengembalikan error tanpa membocorkan detail kunci. | Payload tidak tepercaya masuk ke parser; PR ditolak. |
| RULE-RS-010 | MUST | Test vector known-answer untuk Ed25519, X25519, HKDF, AES-256-GCM, BIP39, dan `.mapp` MUST ada dan MUST dipakai bersama oleh binding TypeScript dan Dart. | Perbedaan hasil antar-platform tidak terdeteksi; rilis diblokir. |

### 2.3 Kontrak, WASM, dan FFI

| ID | Level | Aturan | Konsekuensi |
|---|---|---|---|
| RULE-RS-011 | MUST | Tipe kontrak (manifest, registry index, MUIP, envelope) MUST memakai serde dengan `deny_unknown_fields` dan enum eksplisit; JSON untuk signature MUST dikanonikalisasi sesuai RFC 8785. | Field tambahan lolos validasi dan signature berbeda; test kontrak gagal. |
| RULE-RS-012 | MUST | Target WASM (`wasm32-unknown-unknown`) MUST NOT mengakses filesystem, network, process, atau waktu ambient; seluruh input masuk melalui parameter dan seluruh output melalui return value. | Sandbox bocor melalui ambient capability; build WASM ditolak. |
| RULE-RS-013 | MUST | ABI FFI MUST memiliki versi eksplisit, panjang buffer yang selalu diteruskan, kepemilikan memori yang terdokumentasi, dan tanpa asumsi layout Rust; binding MUST dihasilkan oleh generator, bukan ditulis tangan. | ABI mismatch menyebabkan crash atau kebocoran memori; PR diblokir. |
| RULE-RS-014 | MUST | Parser `.mapp` MUST menegakkan batas ukuran total, jumlah entry, kedalaman, dan rasio kompresi, serta MUST menolak path traversal dan symlink. | Zip bomb atau path traversal mengancam Host; security test gagal. |
| RULE-RS-015 | MUST | Packer `.mapp` MUST deterministik: entry terurut, timestamp tetap `1980-01-01`, deflate level 9, tanpa extra field, dan hash konten dihitung atas byte final. | Dua build dari commit sama menghasilkan hash berbeda; reproducible build gagal. |

### 2.4 Kualitas dan Dependency

| ID | Level | Aturan | Konsekuensi |
|---|---|---|---|
| RULE-RS-016 | MUST | `cargo fmt --check` dan `cargo clippy -- -D warnings` MUST lulus; MSRV MUST dipatok di `rust-toolchain.toml`. | Gaya dan lint tidak konsisten; PR ditolak. |
| RULE-RS-017 | MUST | Modul parser, verifikasi signature, dan CRDT MUST memiliki target fuzz (`cargo-fuzz`) dan property test (`proptest`); crash atau panic dari fuzz adalah blocker. | Bug input jahat tidak ditemukan sebelum rilis; gate rilis gagal. |
| RULE-RS-018 | MUST | Dependency MUST melewati `cargo deny` untuk advisory, lisensi yang diizinkan (Apache-2.0/MIT), dan source registry; dependency dengan lisensi lain MUST NOT ditambahkan tanpa persetujuan governance. | Risiko hukum dan supply chain; build gate gagal. |
| RULE-RS-019 | SHOULD | Kode kriptografi dan sandbox MUST mencapai 90% line coverage dan MUST memiliki mutation/fuzz target; coverage tidak menggantikan test perilaku. | Modul paling sensitif tidak teruji; release gate menolak. |
| RULE-RS-020 | MUST | Perubahan perilaku core MUST disertai test yang gagal sebelum perbaikan dan lulus sesudahnya; test MUST deterministik dan tidak bergantung pada waktu nyata atau jaringan. | Regresi tidak terdeteksi; PR ditolak. |

## 3. Pengecualian dan Penegakan

1. `unsafe` baru MUST melalui review security dan MUST mencatat invariant, aliasing, dan masa hidup pointer pada komentar `// SAFETY:`.
2. Perubahan algoritma kriptografi, format envelope, atau layout `.mapp` MUST melalui RFC dan menaikkan versi kontrak.
3. Panic yang ditemukan fuzz MUST diperbaiki, bukan diabaikan dengan `#[ignore]`.
4. Coverage dan fuzz dijalankan pada crate sebelum rilis; hasilnya dilampirkan pada release gate.

## 4. Referensi

- [ADR-0003](../01-architecture/adr/0003-rust-shared-core.md) — keputusan shared core.
- [identity-crypto.md](../01-architecture/identity-crypto.md) — hierarki kunci dan envelope.
- [sync-crdt.md](../01-architecture/sync-crdt.md) — HLC dan mutation log.
- [manifest-v2.md](../03-specs/manifest-v2.md) — validasi manifest.
- [security.md](security.md) — kebijakan keamanan dan dependency.
- [testing.md](testing.md) — coverage, fuzz, dan test vector.
