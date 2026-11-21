---
id: RULE-RS
title: Rules Rust WASM
status: accepted
owner: runtime
prd_refs: ["§7"]
---

# Rules Rust WASM

Aturan ini mengikat `packages/core-rust` yang dikompilasi ke WebAssembly dan dimuat di browser untuk kriptografi, verifikasi manifest/signature, serta format `.mapp`. Target satu-satunya adalah `wasm32-unknown-unknown`; tidak ada FFI atau binding di luar WebAssembly.

## 1. Tujuan dan Ruang Lingkup

| Aspek | Kontrak |
|---|---|
| Target | `wasm32-unknown-unknown`, dimuat sebagai modul WASM. |
| Batas | `wasm-bindgen` untuk fungsi yang diekspor; tidak ada binding lain. |
| Peran | Verifikasi Ed25519, digest, parsing manifest, packing deterministik. |
| Error | Mengembalikan `Result` yang dipetakan ke kode error host. |

Di luar cakupan: kode TypeScript pemanggil (lihat [typescript.md](typescript.md)) dan kontrak package (lihat [05-packages.md](../03-specs/05-packages.md)).

## 2. Prinsip

1. **Sempit dan dapat diaudit.** Permukaan ekspor kecil; setiap fungsi punya kontrak jelas.
2. **Gagal tanpa panic.** Input tidak valid menghasilkan error, bukan abort yang mematikan instance.
3. **Deterministik.** Output byte identik untuk input identik.
4. **Kriptografi tidak ditulis sendiri.** Gunakan crate yang teraudit dan vektor uji resmi.

## 3. Aturan

| ID | Level | Aturan | Verifikasi |
|---|---|---|---|
| RULE-RS-001 | MUST | Build hanya untuk target `wasm32-unknown-unknown`; `Cargo.toml` tidak mendefinisikan target native sebagai artefak rilis. | `cargo build --target wasm32-unknown-unknown` |
| RULE-RS-002 | MUST | Tidak ada FFI, `extern "C"`, atau binding platform. Interaksi dengan host hanya melalui fungsi `wasm-bindgen` yang diekspor dan menerima/mengembalikan tipe primitif atau `Uint8Array`. | Review, `cargo tree` |
| RULE-RS-003 | MUST | Tidak ada panic yang melintasi boundary WASM. Fungsi ekspor memakai `Result` dan memetakan error ke kode stabil; `unwrap`/`expect` pada input eksternal dilarang. | Test input tidak valid |
| RULE-RS-004 | MUST | `unsafe` dilarang kecuali tercatat dengan alasan, invariant, dan reviewer `security`; crate memakai `#![deny(unsafe_code)]` bila memungkinkan. | Clippy, review |
| RULE-RS-005 | MUST | Output `.mapp` deterministik: entri ZIP diurutkan, timestamp tetap, dan hash stabil. Iterasi `HashMap`/`HashSet` tidak boleh menentukan urutan output. | Test hash berulang |
| RULE-RS-006 | MUST | Kriptografi hanya memakai crate yang disetujui (Ed25519, AES-GCM, Argon2) dengan vektor uji; perubahan algoritma atau parameter memerlukan review `security` dan pembaruan spec. | Vektor uji, review |
| RULE-RS-007 | MUST | `cargo clippy -- -D warnings` dan `cargo fmt --check` wajib bersih; ukuran WASM diukur dan tidak melebihi budget paket. | Clippy, pengukuran ukuran |
| RULE-RS-008 | MUST | Kode diuji pada host (`cargo test`) dan pada WASM (`wasm-bindgen-test`) untuk fungsi yang menyentuh I/O atau tipe JS. | `cargo test`, test WASM |

## 4. Contoh Boundary

```rust
#[wasm_bindgen]
pub fn verify_manifest(bytes: &[u8], signature: &[u8], key: &[u8]) -> Result<(), JsValue> {
    let manifest = parse_manifest(bytes).map_err(to_js_error)?;
    verify_signature(&manifest, signature, key).map_err(to_js_error)
}
```

Fungsi ekspor tidak boleh memanggil `panic!`, `unwrap`, atau `expect` pada data yang berasal dari package atau pengguna.

## 5. Anti-pola

| Anti-pola | Risiko |
|---|---|
| Menulis verifikasi signature sendiri | Kesalahan kriptografi yang tidak terlihat. |
| Menyimpan state global mutable antar panggilan | Hasil tidak deterministik dan bocor antar app. |
| Menggunakan `SystemTime` untuk timestamp ZIP | Output berubah setiap build. |
| Mengekspos struct internal ke JS | Memperbesar permukaan dan memaksa kompatibilitas. |
| Mengabaikan error dan mengembalikan nilai default | Verifikasi bisa lolos secara diam-diam. |

## 6. Verifikasi

| Langkah | Perintah | Lulus bila |
|---|---|---|
| Test | `cargo test --manifest-path packages/core-rust/Cargo.toml` | Seluruh test lulus. |
| Lint | `cargo clippy --manifest-path packages/core-rust/Cargo.toml --all-targets -- -D warnings` | Tanpa warning. |
| Build WASM | `cargo build --target wasm32-unknown-unknown` | Berhasil dan ukuran dalam budget. |
| Determinisme | Test packing dua kali | Hash identik. |

## 7. Pengecualian

Pengecualian pada RULE-RS-003, RULE-RS-004, dan RULE-RS-006 memerlukan persetujuan reviewer `security` dan `runtime`, serta catatan di PR. Pengecualian tidak boleh berlaku untuk kode yang memverifikasi signature.
