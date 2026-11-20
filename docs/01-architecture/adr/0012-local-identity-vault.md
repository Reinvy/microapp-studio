---
id: ADR-0012
title: ADR-0012 Identitas Lokal, Vault, dan Verifikasi Pemulihan
status: accepted
owner: security
prd_refs: ["§3 Modul 1", "§5.1"]
---

# ADR-0012 Identitas Lokal, Vault, dan Verifikasi Pemulihan

## Konteks

Spec identitas memakai tiga nama berbeda untuk konsep yang sama: `device_id`/`public_key_ed25519`/`enc_key_x25519` pada acceptance criteria, `site_id`/`identity_pubkey`/`key_agreement_pubkey` pada data model, dan `identity_signing_key` pada hierarki kunci. Vault belum memiliki kontrak pembungkusan kunci, sehingga "vault key diturunkan dari master key" tidak dapat diuji dan tidak ada jalur pemulihan setelah perangkat hilang. Dua dokumen juga menyarankan menyimpan hash mnemonic di disk untuk verifikasi pemulihan, yang menambah oracle offline.

## Keputusan

1. **Kolom kanonik `local_identity`** mengikuti [data-model.md](../data-model.md) ditambah `hkdf_salt BLOB(32) NOT NULL`, `device_sign_pubkey BLOB(32) NOT NULL`, dan `device_ecdh_pubkey BLOB(32) NOT NULL`. Pemetaan nama acceptance: Site ID = `site_id`, `public_key_ed25519` = `identity_pubkey`, `enc_key_x25519` = `key_agreement_pubkey`, `device_id` = Site ID yang ditampilkan base32.
2. **Tidak ada `recovery_key_hash` dan tidak ada hash mnemonic di disk.** Verifikasi frasa dilakukan dengan menurunkan ulang `identity_pubkey` dari frasa yang dimasukkan lalu membandingkannya dengan `local_identity.identity_pubkey`. Frasa salah menghasilkan kegagalan generik `E-AUTH-006` tanpa membocorkan kata mana yang salah, dibatasi 10 percobaan per menit per perangkat.
3. **`recovery_hint`** hanya teks pengingat buatan pengguna dan tidak boleh memuat kata dari wordlist BIP39; validasi menolak lebih dari tiga kata wordlist.
4. **Vault key** = `HKDF-SHA256(master, salt = hkdf_salt, info = "microapp/v1/vault")`. Saat pembuatan Vault, vault key dibungkus KEK yang diturunkan dari PIN/passphrase pengguna dengan Argon2id (`m = 64 MiB`, `t = 3`, `p = 1`, salt 16 byte acak) dan AES-256-GCM (`nonce` 12 byte). Pembungkus disimpan di `vault_key_wraps(id, workspace_id, kdf, salt, memory_kib, iterations, parallelism, nonce, wrapped_key, created_at_ms, retired_at_ms)`.
5. **Pemulihan frasa** menurunkan ulang master key dan vault key; `vault_key_wraps` lama ditandai `retired_at_ms` dan pembungkus baru dibuat untuk PIN/passphrase baru. Tidak ada re-enkripsi item Vault karena vault key tidak berubah.
6. **Grant Vault per item.** `vault_grants(id, workspace_id, vault_item_id, app_install_id, granted_at_ms, revoked_at_ms)` menyimpan grant eksplisit per item per app; `vault.read` hanya mengembalikan item yang memiliki grant aktif dan diaudit setiap kali.
7. **Auto-lock** 300.000 ms idle (5 menit). Status lock hanya di memori; tidak ada penanda persistensi yang dapat dimanipulasi untuk melewati unlock.
8. **Kriptografi di Worker.** Semua derivasi kunci, signature, dan dekripsi berjalan di dedicated Worker (`identity.worker.ts`); WebCrypto `CryptoKey` non-extractable disimpan di IndexedDB dan main thread hanya menerima public key, signature, atau plaintext yang diminta. Bila penyimpanan non-extractable tidak tersedia, identitas hanya hidup di memori sesi, status degradasi ditampilkan, dan recovery diminta setelah reload.
9. **Envelope AAD** tetap seperti [identity-crypto.md](../identity-crypto.md) §5: `version || key_id || site_id || record_type || record_id || schema_version`. `key_id` pada `vault_items` dan `nonce` adalah salinan terindeks yang wajib cocok dengan envelope; ketidakcocokan menghasilkan `E-CRYPTO-001`.

## Konsekuensi

- Verifikasi frasa tidak dapat dilakukan tanpa menjalankan PBKDF2 penuh (~2048 iterasi HMAC-SHA512); ini disengaja dan dibatasi rate limit, bukan dioptimalkan dengan hash tersimpan.
- Perangkat baru selalu memerlukan sertifikat perangkat baru yang ditandatangani identity key; tidak ada jalur "salin kunci" antar perangkat.
- Pembungkus KEK bergantung pada PIN/passphrase pengguna; PIN lemah hanya melindungi terhadap penyerang tanpa akses perangkat, dan UI wajib menyatakan batas ini.
- `vault_key_wraps` menyimpan `workspace_id` agar satu instalasi dapat memisahkan Vault per workspace tanpa migrasi ulang; tepat satu pembungkus aktif per workspace.
- Test wajib mencakup: envelope tamper (AAD, nonce, key_id), frasa salah dengan rate limit, auto-lock, grant per item, dan penolakan `vault.read` tanpa grant.

## Alternatif

| Alternatif | Alasan ditolak |
|---|---|
| Menyimpan hash mnemonic untuk verifikasi cepat | Menjadi oracle offline dan menambah permukaan serangan tanpa manfaat keamanan. |
| Menurunkan vault key langsung dari PIN pengguna | Kehilangan properti "satu master, banyak subkey" dan memaksa re-enkripsi seluruh item saat PIN berubah. |
| Menyimpan vault key plaintext di IndexedDB untuk kenyamanan | Melanggar larangan plaintext saat istirahat. |
| Grant Vault per app (bukan per item) | Melanggar FR-HOST-017 yang menuntut grant per item dan per app. |
| Menyimpan status lock di localStorage | Dapat dimanipulasi skrip mana pun pada origin yang sama. |

## Status

`accepted`. Detail hierarki kunci dan envelope ada di [identity-crypto.md](../identity-crypto.md); DDL ada di [data-model.md](../data-model.md) §5.
