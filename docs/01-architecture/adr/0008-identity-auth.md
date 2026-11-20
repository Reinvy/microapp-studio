---
id: ADR-0008
title: ADR-0008 Identitas dan Auth
status: accepted
owner: architecture
prd_refs: ["§3 Modul 1", "§3 Modul 7", "§5.1"]
---

# ADR-0008 Identitas dan Auth

## Konteks

PRD menuntut zero-account instant start dengan Local Cryptographic Identity, sekaligus SSO kelas enterprise pada server self-host. Phase 0 memakai auth lokal di localStorage dengan JWT secret hardcoded di `src/lib/auth.ts`; keduanya adalah utang keamanan yang tidak dapat dipertahankan.

## Keputusan

1. **Client tidak memakai akun.** First run membuat Ed25519 (signing) dan X25519 (ECDH) di perangkat; private key disimpan di Keychain/Keystore/WebCrypto non-extractable.
2. **Recovery Phrase 24 kata BIP-39** menurunkan master key; passkey PRF dapat menggantikan frasa. Tidak ada password akun pada mode lokal.
3. **Device certificate** ditandatangani identity key dan mengikat kunci ECDH perangkat; pairing memakai QR + SAS 6 digit dan TOFU.
4. **Server self-host memakai standar:** OIDC/OAuth2, SAML 2.0, LDAP, passkey/WebAuthn, magic link. Tidak ada implementasi password kustom.
5. **Sesi server:** access token 15 menit, refresh/session 30 hari, rotasi refresh, revoke per device.
6. **Auth localStorage Phase 0 dihapus** dan password tidak dimigrasi. Pengguna membuat Local Identity baru.
7. **Otorisasi server:** RBAC + ABAC dengan policy JSON per workspace; audit hash-chained untuk setiap perubahan grant.

## Konsekuensi

- Tidak ada permintaan jaringan saat first run; pengalaman zero-login terpenuhi.
- Kehilangan perangkat tanpa Recovery Phrase berarti data E2EE tidak dapat dipulihkan; UI wajib memaksa pengguna menyimpan frasa sebelum data sensitif dibuat.
- WebCrypto non-extractable membatasi beberapa operasi (mis. export key); core Rust menangani derivasi sehingga private key tidak perlu diekstrak.
- Server tidak dapat menjadi otoritas identitas tunggal untuk data pengguna.
- Migrasi menghapus sesi lama; pengguna harus diberi tahu.

## Alternatif

| Alternatif | Alasan ditolak |
|---|---|
| Akun cloud wajib | Bertentangan dengan zero-account dan offline-first. |
| Auth localStorage diperbaiki | Tidak ada isolasi; secret di klien selalu dapat dibaca. |
| Password + JWT buatan sendiri di server | Mengulang kesalahan kriptografi dan tidak memenuhi SSO. |
| Hanya passkey | Tidak tersedia di semua perangkat/OS target; frasa tetap diperlukan untuk recovery. |
| Identity key disimpan di server | Menghilangkan kedaulatan kunci dan melanggar E2EE. |

## Status

`accepted`. Detail ada di [identity-crypto.md](../identity-crypto.md), [03-specs/permissions.md](../../03-specs/permissions.md), dan [03-specs/07-selfhost.md](../../03-specs/07-selfhost.md).
