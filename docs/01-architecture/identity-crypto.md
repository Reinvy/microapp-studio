---
id: ARCH-IDENTITY
title: Identitas dan Kriptografi
status: accepted
owner: security
prd_refs: ["§3 Modul 1", "§3 Modul 6", "§5.1"]
---

# Identitas dan Kriptografi

Dokumen ini menetapkan identitas lokal tanpa akun, hierarki kunci, format amplop terenkripsi, penyimpanan kunci, pairing perangkat, rotasi, dan verifikasi signature. Implementasi kriptografi berada di crate `microapp-core` (Rust) dan dipakai ulang lewat `wasm-bindgen` serta `flutter_rust_bridge`; tidak ada implementasi kripto kedua di TypeScript atau Dart.

## 1. Prinsip

| Prinsip | Konsekuensi |
|---|---|
| Tanpa akun | Identitas dibuat di perangkat; tidak ada pendaftaran, email, atau telepon. |
| Tanpa plaintext saat istirahat | Kunci privat dan mnemonic tidak pernah ditulis sebagai plaintext ke disk, log, atau crash report. |
| Deterministik dan dapat dipulihkan | Seluruh kunci simetris dan kunci tanda identitas diturunkan dari satu recovery phrase. |
| Pemisahan tugas kunci | Kunci tanda, kunci kesepakatan, kunci sync, kunci vault, dan kunci backup berbeda dan tidak saling menggantikan. |
| Fail closed | Bila secure storage, isolate, atau CSP tidak tersedia, operasi ditolak; tidak ada fallback ke penyimpanan longgar. |
| Minimalkan kebocoran | Pesan galat tidak membedakan "frasa salah" dari "ciphertext rusak"; keduanya gagal dengan cara yang sama. |

## 2. Hierarki Kunci

```text
BIP39 24 kata (entropy 256 bit, checksum 8 bit)
  │  PBKDF2-HMAC-SHA512, 2048 iterasi, salt = "mnemonic" || passphrase
  ▼
seed 64 byte
  │  HKDF-SHA256, salt = hkdf_salt 32 byte, info = "microapp/v1/master"
  ▼
master key 32 byte
  ├── info "microapp/v1/sync"          → sync key   (AES-256-GCM)
  ├── info "microapp/v1/vault"         → vault key  (AES-256-GCM)
  ├── info "microapp/v1/backup"        → backup key (AES-256-GCM)
  └── info "microapp/v1/identity-sign" → seed Ed25519 32 byte → identity signing key
```

| Kunci | Algoritma | Sumber | Masa Hidup | Penyimpanan |
|---|---|---|---|---|
| Recovery phrase | BIP39 24 kata | Dibuat saat first run | Sampai pengguna mengganti identitas | Ditampilkan sekali; pengguna menyimpan sendiri |
| Seed | 64 byte | PBKDF2 dari phrase | Sesi derivasi | Memori saja, di-zeroize setelah derivasi |
| Master key | 32 byte | HKDF dari seed | Sesi derivasi | Memori saja |
| Identity signing key | Ed25519 | HKDF `identity-sign` | Seumur identitas | Secure storage, non-extractable bila platform memungkinkan |
| Device signing key | Ed25519 | Dibuat acak di perangkat | Sampai rotasi/revokasi | Secure storage perangkat |
| Device agreement key | X25519 | Dibuat acak di perangkat | Sampai rotasi/revokasi | Secure storage perangkat |
| Sync key | AES-256-GCM | HKDF `sync` | Sampai rotasi | Secure storage, dibuka saat sync aktif |
| Vault key | AES-256-GCM | HKDF `vault` | Sampai rotasi | Dibuka setelah biometrik/PIN; dibungkus KEK di `vault_key_wraps` |
| Vault KEK | Argon2id + AES-256-GCM | PIN/passphrase pengguna, `m = 64 MiB`, `t = 3`, `p = 1`, salt 16 byte acak | Sampai PIN/passphrase berubah | Diturunkan saat unlock, hanya di memori Worker |
| Backup key | AES-256-GCM | HKDF `backup` | Sampai rotasi | Diturunkan saat ekspor, tidak disimpan permanen |

`Vault key` = `HKDF-SHA256(master, salt = hkdf_salt, info = "microapp/v1/vault")` berukuran 32 byte. Saat Vault pertama kali dibuat, vault key MUST dibungkus KEK yang diturunkan dari PIN/passphrase pengguna dengan Argon2id (`m = 64 MiB`, `t = 3`, `p = 1`, salt 16 byte acak) dan AES-256-GCM (`nonce` 12 byte), lalu disimpan di `vault_key_wraps(id, workspace_id, kdf, salt, memory_kib, iterations, parallelism, nonce, wrapped_key, created_at_ms, retired_at_ms)`. Tepat satu pembungkus aktif per workspace; pembungkus lama ditandai `retired_at_ms` saat PIN/passphrase berubah. Item Vault tidak dienkripsi ulang karena vault key tidak berubah. Status lock Vault hanya di memori dan auto-lock MUST 300.000 ms idle.

`hkdf_salt` adalah 32 byte acak yang dibuat bersama identitas dan disimpan sebagai nilai non-rahasia di `local_identity`; salt mencegah pemakaian ulang material kunci yang sama pada konteks berbeda. Passphrase BIP39 bersifat opsional dan tidak pernah disimpan; bila kosong, salt adalah `"mnemonic"` sesuai BIP39.

### 2.1 Kolom Kanonik `local_identity` dan Nama Acceptance

Tabel `local_identity` MUST memakai kolom kanonik berikut. Tidak ada kolom hash mnemonic, `recovery_key_hash`, atau turunannya.

| Kolom kanonik | Tipe | Keterangan | Nama pada acceptance criteria |
|---|---|---|---|
| `id` | TEXT | PK UUIDv7 | — |
| `site_id` | BLOB(16) | UNIQUE; Site ID perangkat | `device_id` (ditampilkan base32) |
| `identity_pubkey` | BLOB(32) | Ed25519 identity key | `public_key_ed25519` |
| `key_agreement_pubkey` | BLOB(32) | X25519 identity agreement key | `enc_key_x25519` |
| `hkdf_salt` | BLOB(32) | Salt HKDF-SHA256 untuk seluruh subkey | — |
| `device_sign_pubkey` | BLOB(32) | Ed25519 perangkat | — |
| `device_ecdh_pubkey` | BLOB(32) | X25519 perangkat | — |
| `device_cert` | BLOB | Sertifikat CBOR yang ditandatangani identity key | — |
| `device_cert_expires_ms` | INTEGER | Masa berlaku sertifikat | — |
| `display_name` | TEXT | Nama tampilan opsional | — |
| `recovery_hint` | TEXT | Pengingat non-rahasia; dilarang memuat kata wordlist BIP39 | — |
| `created_at_ms` | INTEGER | Waktu pembuatan | — |
| `rotated_at_ms` | INTEGER | Waktu rotasi identitas | — |

Pemetaan nama acceptance bersifat tetap: Site ID = `site_id`, `public_key_ed25519` = `identity_pubkey`, `enc_key_x25519` = `key_agreement_pubkey`, dan `device_id` adalah Site ID yang ditampilkan base32. `device_sign_pubkey`/`device_ecdh_pubkey` adalah kunci perangkat yang disertifikasi oleh identity key, bukan kunci identitas.

Catatan keamanan: 2048 iterasi PBKDF2 adalah ketetapan BIP39 dan bukan penguat passphrase. Kekuatan berasal dari entropy 24 kata (256 bit). Passphrase tambahan hanya berguna bila dipilih dengan entropy tinggi; UI wajib menyatakan ini dan tidak menyebut passphrase sebagai "lapisan enkripsi tambahan yang kuat".

Kunci perangkat tidak diturunkan dari recovery phrase. Akibatnya, pemulihan di perangkat baru menghasilkan identity key yang sama tetapi perangkat baru selalu memerlukan sertifikat perangkat baru yang ditandatangani identity key.

## 3. Algoritma dan Parameter

| Parameter | Nilai | Catatan |
|---|---|---|
| Mnemonic | BIP39, 24 kata, wordlist English | Normalisasi NFKD sebelum derivasi |
| KDF seed | PBKDF2-HMAC-SHA512, 2048 iterasi, output 64 byte | Salt `"mnemonic"` + passphrase |
| KDF turunan | HKDF-SHA256 | `salt` = `hkdf_salt`, `info` = label per subkey |
| Tanda tangan | Ed25519 (RFC 8032), 32 byte public, 64 byte signature | Identity dan device signing |
| Kesepakatan kunci | X25519 (RFC 7748) | Device ECDH, pairing, transport |
| Enkripsi | AES-256-GCM, nonce 96 bit, tag 128 bit | Satu nonce per (key, plaintext) |
| Hash | SHA-256 | Fingerprint kunci, hash konten, rantai audit |
| Site ID | 16 byte acak, ditampilkan base32 (26 karakter) | Tidak diturunkan dari kunci |
| Fingerprint kunci | SHA-256 atas public key, ditampilkan hex berkelompok | Dasar TOFU |
| Sanitasi JSON | RFC 8785 (JCS) | Byte kanonik untuk signature |

Nonce 96-bit dibuat acak kriptografis dan disimpan bersama ciphertext; penghitung nonce tidak dipakai karena tidak ada jaminan persistensi lintas restart. Kunci tidak boleh dipakai lebih dari 2^32 pesan; rotasi dijadwalkan jauh sebelum batas itu.

## 4. Sertifikat Perangkat

Sertifikat perangkat adalah CBOR kanonik yang ditandatangani identity key, berisi:

| Field | Tipe | Keterangan |
|---|---|---|
| `version` | uint | `1` |
| `site_id` | bytes(16) | Site ID perangkat |
| `identity_pubkey` | bytes(32) | Kunci identitas yang menandatangani |
| `device_sign_pubkey` | bytes(32) | Ed25519 perangkat |
| `device_ecdh_pubkey` | bytes(32) | X25519 perangkat |
| `issued_at_ms` | uint | Waktu terbit |
| `expires_at_ms` | uint | Maksimum 365 hari |
| `capabilities` | array of text | `sync`, `pairing`, `vault`, `workflow`, `server-session` |
| `signature` | bytes(64) | Ed25519 oleh identity key |

Peer dan server memverifikasi sertifikat terhadap identity key yang dipin atau terdaftar. Sertifikat kedaluwarsa memaksa re-sertifikasi; sertifikat tidak pernah diperpanjang otomatis tanpa kehadiran kunci identity di perangkat.

## 5. Amplop AES-256-GCM

Setiap nilai terenkripsi memakai format biner berikut, tanpa padding dan tanpa header tambahan:

| Offset | Panjang | Field | Isi |
|---|---|---|---|
| 0 | 1 | `version` | `0x01` |
| 1 | 16 | `key_id` | 16 byte pertama SHA-256 dari `label || key` |
| 17 | 12 | `nonce` | Nonce 96-bit acak |
| 29 | n | `ciphertext` | Panjang sama dengan plaintext |
| 29 + n | 16 | `tag` | Tag GCM 128 bit |

AAD kanonik dibangun dari metadata dan **tidak** disimpan di dalam amplop, sehingga pemindahan ciphertext ke baris lain membuat dekripsi gagal:

```text
aad = version(1)
    || key_id(16)
    || site_id(16)
    || u32_be(len(record_type)) || record_type
    || u32_be(len(record_id))   || record_id
    || u32_be(schema_version)
```

Aturan tambahan: `record_type` dan `record_id` adalah string UTF-8 (misalnya `vault_item` dan UUID baris); `schema_version` adalah versi skema database saat enkripsi; panjang field selalu big-endian; tidak ada field opsional. `key_id` yang tidak dikenal diperlakukan sebagai ciphertext tidak dapat didekripsi, bukan sebagai petunjuk untuk mencoba semua kunci.

## 6. Penyimpanan Kunci

| Platform | Mekanisme | Aturan |
|---|---|---|
| iOS dan iPadOS | Keychain dengan `kSecAttrAccessibleWhenUnlockedThisDeviceOnly`, biometrik untuk vault | Tidak disinkronkan ke iCloud Keychain |
| Android | Keystore, StrongBox bila tersedia, fallback TEE | Kunci tidak dapat diekstrak; biometrik untuk vault |
| Desktop native (Linux, Windows, macOS) | OS keychain (Secret Service, DPAPI dengan TPM bila ada, macOS Keychain) | Tidak ada file kunci plaintext di `dataDir` |
| Web | WebCrypto `CryptoKey` non-extractable yang disimpan di IndexedDB | Kunci tidak pernah menjadi `ArrayBuffer` yang dapat dibaca JS |

Zeroize: seed, passphrase, dan master key dibersihkan dari memori Rust dengan `zeroize` segera setelah derivasi; buffer FFI tidak boleh menyalin kunci privat. Di web, kunci hidup sebagai handle non-extractable di dalam Worker sehingga skrip halaman tidak dapat mengekstraknya. Bila browser tidak dapat menyimpan `CryptoKey` non-extractable, kunci hanya berada di memori sesi dan vault wajib dibuka ulang setiap sesi; tidak ada penyimpanan plaintext sebagai kompensasi, dan status degradasi ditampilkan di UI.

Larangan: kunci tidak boleh masuk ke log, URL, nama file, clipboard, crash report, atau telemetri. Nilai rahasia di debug build tetap diredaksi.

## 7. Pairing, QR, dan SAS

Pairing memindahkan kepercayaan ke perangkat kedua tanpa server.

1. Perangkat A membuat sesi pairing berumur 120 detik dengan nonce acak satu kali pakai.
2. QR memuat CBOR: `version`, `site_id`, `identity_pubkey`, `device_sign_pubkey`, `device_ecdh_pubkey`, `nonce`, `endpoints`, `expires_at_ms`.
3. Perangkat B memindai QR, melakukan X25519 dengan kunci perangkat A, lalu menurunkan kunci sesi dari HKDF atas transcript pairing.
4. Kedua perangkat menampilkan SAS 6 digit: `SHA-256(transcript) mod 1_000_000`, dengan transcript berisi kedua public key dan kedua nonce dalam urutan terurut.
5. Pengguna membandingkan SAS dan menekan konfirmasi pada kedua perangkat; ketidakcocokan wajib membatalkan sesi dan menghapus material sementara.
6. Setelah konfirmasi, perangkat A menandatangani sertifikat perangkat B dan menyimpan fingerprint-nya.

SAS mencegah serangan MITM di LAN. Nonce satu kali pakai mencegah replay QR; QR kedaluwarsa ditolak sebelum pertukaran kunci. LAN memakai TLS dengan sertifikat self-signed yang dipin pada tingkat fingerprint, bukan CA publik.

## 8. TOFU, Rotasi, dan Revokasi

| Kejadian | Perilaku |
|---|---|
| Peer baru | Trust state `tofu`; fingerprint disimpan setelah SAS cocok |
| Author key baru | Fingerprint disimpan saat instalasi pertama; perubahan tanpa signature rotasi yang sah memicu peringatan keras dan instalasi diblokir |
| Rotasi kunci perangkat | Sertifikat baru ditandatangani identity key, disiarkan lewat sync, dan dicatat di audit |
| Rotasi identitas | Hanya lewat pembuatan mnemonic baru; identitas lama ditandai `deprecated`; data dienkripsi ulang dan manifest ditandatangani ulang sebelum kunci lama dihapus |
| Revokasi perangkat | Rekaman revokasi bertanda tangan identity key; peer menolak handshake dan cursor lama diabaikan |
| Perangkat hilang | Pengguna mencabut perangkat dari perangkat lain, lalu merotasi vault key dan backup key |
| Kunci server dilaporkan dicompromise | Revokasi massal, penerbitan kunci baru, dan pengumuman pada index registry |

Identity key tidak dapat dirotasi tanpa mnemonic baru karena berasal dari seed. Pergantian identitas adalah operasi eksplisit yang meminta ekspor penuh lebih dulu; tidak ada rotasi diam-diam.

## 9. Pemulihan

- Pemulihan utama: 24 kata + passphrase (bila dipakai) di perangkat baru, lalu derivasi ulang seluruh subkey.
- Alternatif: passkey dengan ekstensi WebAuthn PRF; output PRF menjadi input HKDF untuk kunci pembungkus backup. Passkey tidak menggantikan mnemonic dan tidak disimpan server.
- Tidak ada escrow: server, registry, dan host lain tidak pernah menerima mnemonic atau kunci privat, sehingga tidak dapat memulihkan akun atas permintaan.
- Verifikasi frasa MUST dilakukan dengan menurunkan ulang `identity_pubkey` dari frasa yang dimasukkan lalu membandingkannya dengan `local_identity.identity_pubkey`; Host MUST NOT menyimpan hash mnemonic, `recovery_key_hash`, atau verifier offline lain di disk.
- Frasa salah, urutan salah, atau checksum salah menghasilkan kegagalan generik `E-AUTH-006` yang sama tanpa membocorkan kata mana yang salah.
- Percobaan pemulihan dibatasi maksimal 10 per menit per perangkat; kegagalan tidak menulis petunjuk apa pun ke disk.
- `recovery_hint` hanya teks pengingat buatan pengguna dan MUST NOT memuat kata dari wordlist BIP39; validasi menolak lebih dari tiga kata wordlist.
- Bila ciphertext lama tidak dapat didekripsi setelah pemulihan yang benar, data ditandai `unreadable` dan diekspor sebagai byte mentah untuk diagnosis; tidak ada penghapusan otomatis.

## 10. Verifikasi Signature

| Artefak | Yang ditandatangani | Kunci | Urutan Verifikasi |
|---|---|---|---|
| Paket `.mapp` | 32 byte digest mentah SHA-256 ZIP kanonik (bukan string hex); dua signature detached di `signatures/author.ed25519` dan `signatures/registry.ed25519`, masing-masing 64 byte | Author key dan registry key (wajib berbeda) | Batas ukuran → hash ZIP → verifikasi signature atas digest mentah → cek `publisher.keyId` (16 hex pertama SHA-256 public key) dan `publisher.fingerprint` (64 hex penuh) → cek `contentHash` → cek revocation |
| Index registry | JSON kanonik index tanpa field signature (signature detached) | Registry key (Ed25519) | Verifikasi signature index → cek `schemaVersion` → cek `revokedKeys` → baca entri |
| Entri registry per app | `id`, `version`, `sha256`, `minHostVersion`, `signature.value` | Author key | Verifikasi sebelum unduh artefak |
| Sertifikat perangkat | CBOR sertifikat | Identity key | Verifikasi sebelum handshake sync |
| Rekaman revokasi | CBOR revokasi | Identity key | Verifikasi sebelum memperbarui trust state |

Kunci author dan kunci registry **tidak boleh** dianggap setara: registry yang sah tidak dapat menandatangani ulang kode author, signature kedua-duanya wajib ada, dan signature author tetap diverifikasi meskipun registry bertanda tangan sah. Verifikasi dilakukan di Rust sebelum konten tidak tepercaya diekstrak atau diparse lebih jauh; kegagalan signature menghentikan instalasi dan tidak menyisakan state parsial.

`contentHash` dihitung atas ZIP kanonik tanpa `signatures/`, dengan field `manifest.json.contentHash` diganti sementara placeholder `sha256-` + 64 nol; setelah hash dihitung, manifest final ditulis dengan nilai asli. Verifier mengganti field dengan placeholder yang sama, men-serialisasi ulang JCS, membangun ulang ZIP kanonik, lalu membandingkan hash. Signature menandatangani 32 byte digest mentah hasil SHA-256, bukan representasi hex. `publisher.keyId` adalah 16 hex pertama `SHA-256(public key author)`, `publisher.fingerprint` adalah 64 hex penuh hash yang sama, dan `entry.signature` berbentuk `ed25519-<keyId>`. Kontrak field, layout `signatures/`, dan contoh ada di [../03-specs/manifest-v2.md](../03-specs/manifest-v2.md); keputusan lengkap ada di [adr/0013-manifest-digest-signature.md](adr/0013-manifest-digest-signature.md).

## 11. Penanganan Ketidakcocokan Kunci

| Kondisi | Tampilan | Tindakan |
|---|---|---|
| Fingerprint author berubah tanpa rotasi sah | Dialog keras: kunci berbeda, instalasi diblokir | Hanya lanjut setelah pengguna memverifikasi fingerprint dari kanal lain; hasil dicatat di audit |
| Signature registry tidak valid | Banner error pada sumber registry | Registry dinonaktifkan sampai kunci diperbarui; cache lama tetap dapat dipakai offline |
| Sertifikat perangkat kedaluwarsa | Notifikasi dan status peer | Re-sertifikasi dengan identity key; sync berhenti sampai selesai |
| Peer memakai Site ID sama | Handshake ditolak | Pengguna memilih salah satu perangkat; Site ID ganda tidak pernah digabung otomatis |
| `key_id` amplop tidak dikenal | Item ditandai tidak dapat dibuka | Tawarkan pemulihan dengan frasa; jangan mencoba kunci lain secara buta |
| Passkey PRF menghasilkan kunci berbeda | Pesan "kunci pemulihan tidak cocok" | Fallback ke mnemonic; passkey lama dicabut |

Semua peristiwa di atas masuk `audit_log_chain` dengan payload teredaksi.

## 12. Ancaman dan Mitigasi

| Ancaman | Dampak | Mitigasi | Residual |
|---|---|---|---|
| Micro-app berbahaya membaca kunci | Pencurian identitas atau data | Kunci tidak pernah masuk sandbox; bridge tidak mengekspos operasi kripto mentah; capability zero-privilege | Celah di broker tetap mungkin; diuji di security test plan |
| Registry dibajak dan menandatangani artefak jahat | Malware tersebar | Signature author terpisah, TOFU, reproducible build, scanner | Author key yang benar-benar dicuri tidak dapat dibedakan tanpa rotasi |
| Server dikompromikan | Kebocoran metadata dan sesi | Payload E2EE, token pendek, revokasi per perangkat, audit chain | Metadata koneksi tetap terlihat |
| Evil twin atau penyerang LAN | MITM saat pairing atau sync | SAS 6 digit, pinning fingerprint, TLS, nonce satu kali | Pengguna yang mengabaikan SAS membatalkan jaminan |
| SSRF dari workflow | Akses jaringan internal | Allowlist, blokir IP privat default, validasi URL di core Rust | Salah konfigurasi allowlist oleh admin |
| Ekstraksi kunci dari memori | Pencurian kunci | WebCrypto non-extractable, Keychain/Keystore, zeroize, isolasi Worker | Perangkat yang sudah di-root dapat menguasai memori proses |
| Brute force recovery phrase | Pengambilalihan identitas | Entropy 256 bit, rate limit, tanpa oracle galat | Tidak praktis secara komputasi |
| Replay nonce atau pesan sync | Duplikasi mutation atau pemalsuan sesi | Nonce satu kali, urutan HLC, idempotency key, transcript terikat | Kesalahan implementasi transport |
| Pencurian sesi server | Akses tenant | Access token 15 menit, refresh 30 hari dengan rotasi, revokasi per perangkat | Token yang dicuri sebelum revokasi berlaku |

Rincian STRIDE per komponen dan test yang membuktikan mitigasi ada di [threat-model.md](threat-model.md); rancangan test keamanan merujuk threat model tersebut pada tahap quality.

## 13. Referensi

- [data-model.md](data-model.md) — tabel `local_identity`, `sync_peers`, `vault_items`, `audit_log_chain`.
- [sync-crdt.md](sync-crdt.md) — penggunaan kunci sync dan envelope pada handshake.
- [threat-model.md](threat-model.md) — STRIDE dan trust boundary.
- [../03-specs/manifest-v2.md](../03-specs/manifest-v2.md) — cakupan signature manifest.
- [../03-specs/06-sync-backup.md](../03-specs/06-sync-backup.md) — backup terenkripsi dan passkey PRF.
- [../03-specs/permissions.md](../03-specs/permissions.md) — izin `biometrics` dan `local_ai.inference` yang menjaga kunci.
- [adr/0008-identity-auth.md](adr/0008-identity-auth.md) — keputusan identitas tanpa akun.
