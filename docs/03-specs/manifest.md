---
id: SPEC-MANIFEST
title: Manifest v2
status: accepted
owner: architecture
prd_refs: ["§5 F5", "§7 Arsitektur Web"]
---

# Manifest v2

## 1. Tujuan

Menetapkan kontrak `microapp.manifest.json` versi 2 untuk web-only: identitas package, entry bundle, integritas, signature, permission, capability, dan UI. Manifest adalah satu-satunya deklarasi yang dibaca host sebelum verifikasi dan instalasi.

## 2. Ruang Lingkup

Di dalam: field wajib/opsional, aturan validasi, kompatibilitas versi, contoh. Di luar: layout ZIP ([05-packages.md](05-packages.md)), skema node UI ([ui-protocol.md](ui-protocol.md)), bridge ([host-bridge.md](host-bridge.md)).

## 3. Requirement

| Field | Wajib | Tipe | Aturan |
|---|---|---|---|
| `schemaVersion` | Ya | integer | Harus `2`. Versi lain ditolak dengan `E-PACK-001`. |
| `id` | Ya | string | `^[a-z][a-z0-9]*(\\.[a-z0-9]+){1,4}$`, unik per workspace. |
| `name` | Ya | string | 1..80 karakter, ditampilkan di Home. |
| `version` | Ya | string | Semver `MAJOR.MINOR.PATCH`. |
| `entry.bundle` | Ya | string | Path relatif `bundle/…js`; tidak boleh keluar dari arsip. |
| `assetsDir` | Tidak | string | Default `assets/`; hanya aset statis. |
| `integrity` | Ya | object | `algorithm` (`sha256`), `contentHash`, dan `files` map path→hash. |
| `signature` | Ya | object | `algorithm` (`ed25519`), `keyId`, `value` base64. |
| `offline` | Ya | boolean | `true` bila app berfungsi tanpa network. |
| `permissions` | Ya | array | Subset daftar permission web; kosong bila tidak ada. |
| `capabilities` | Tidak | array | `ui.muip`, `storage.app`; tidak ada capability native. |
| `ui` | Ya | object | `engine` harus `muip-web`, `protocol` harus `1`. |

Field native (`uiEngine: hybrid-native`, `android`, `ios`, `windows`, `macos`, `linux`, `ffi`, `engine.quickjs`, `engine.wasmtime`) MUST NOT ada. Manifest yang memuat field tersebut ditolak, bukan diabaikan diam-diam.

## 4. Contoh

```json
{
  "schemaVersion": 2,
  "id": "app.example.cashier",
  "name": "Kasir Warung",
  "version": "1.2.0",
  "entry": { "bundle": "bundle/index.js" },
  "assetsDir": "assets/",
  "integrity": {
    "algorithm": "sha256",
    "contentHash": "b3f1c0f0f4b7a1c6f0f6f4f0f9a2b7c1d3e5f7a9b1c3d5e7f9a1b3c5d7e9f1a3",
    "files": { "bundle/index.js": "b3f1c0f0f4b7a1c6f0f6f4f0f9a2b7c1d3e5f7a9b1c3d5e7f9a1b3c5d7e9f1a3" }
  },
  "signature": {
    "algorithm": "ed25519",
    "keyId": "did:key:z6MkExample",
    "value": "base64-signature"
  },
  "offline": true,
  "permissions": ["clipboard.read", "notifications.local"],
  "capabilities": ["ui.muip", "storage.app"],
  "ui": { "engine": "muip-web", "protocol": 1 }
}
```

## 5. Validasi

1. Parse JSON; error sintaks → `E-PACK-001`.
2. Validasi schema dan field wajib; field asing yang tidak dikenal ditolak.
3. Pastikan `entry.bundle` dan setiap path di `integrity.files` berada di dalam arsip.
4. Pastikan setiap permission ada di daftar permission web.
5. Pastikan `ui.engine` adalah `muip-web` dan `ui.protocol` adalah `1`.
6. Verifikasi `integrity` dan `signature` sebelum langkah lain ([05-packages.md](05-packages.md)).

## 6. Kompatibilitas

Host mendukung `schemaVersion` 2 saja. Manifest v1 dianggap legacy dan hanya dapat dibaca oleh flow migrasi sebagai data, bukan dijalankan. Perubahan field wajib memerlukan ADR baru dan kenaikan versi schema.

## 7. Acceptance Criteria

1. Manifest valid lolos validasi dan instalasi.
2. Field native atau permission tidak dikenal ditolak dengan pesan field.
3. Path traversal pada `entry.bundle` ditolak.
4. Contoh pada dokumen lolos schema.

## 8. Verifikasi

| Pemeriksaan | Cara |
|---|---|
| Schema | Vitest: ajv terhadap [schema](schemas/microapp.manifest.v2.schema.json). |
| Field native | Vitest: fixture dengan `uiEngine: hybrid-native` ditolak. |
| Path traversal | Vitest: `../evil.js` ditolak. |
| Permission | Vitest: permission di luar daftar ditolak. |
