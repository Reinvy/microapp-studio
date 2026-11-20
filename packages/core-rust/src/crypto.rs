//! Cryptographic primitives: BIP39 recovery phrase, HKDF subkeys, Ed25519,
//! X25519, AES-256-GCM envelopes, JCS canonical JSON, and constant-time
//! comparison.
//!
//! Nothing here is re-implemented in TypeScript or Dart. The web runtime calls
//! these functions through `wasm-bindgen`; the Flutter host calls them through
//! `flutter_rust_bridge`.

use aes_gcm::aead::{Aead, KeyInit, Payload};
use aes_gcm::{Aes256Gcm, Nonce};
use bip39::{Language, Mnemonic};
use ed25519_dalek::{Signature, Signer, SigningKey, Verifier, VerifyingKey};
use hkdf::Hkdf;
use rand::rngs::OsRng;
use rand::RngCore;
use sha2::{Digest, Sha256};
use subtle::ConstantTimeEq;
use x25519_dalek::{PublicKey as X25519Public, StaticSecret};
use zeroize::Zeroize;

use crate::error::{CoreError, CoreResult};

pub const MNEMONIC_WORDS: usize = 24;
pub const KEY_LEN: usize = 32;
pub const SITE_ID_LEN: usize = 16;
pub const SIGNATURE_LEN: usize = 64;
pub const ENVELOPE_VERSION: u8 = 1;

/// Envelope field widths (bytes): version, key_id, nonce, tag.
pub const ENVELOPE_HEADER_LEN: usize = 1 + 16 + 12;
pub const GCM_TAG_LEN: usize = 16;

/// Subkey labels from `identity-crypto.md` §2.
pub const LABEL_MASTER: &str = "microapp/v1/master";
pub const LABEL_SYNC: &str = "microapp/v1/sync";
pub const LABEL_VAULT: &str = "microapp/v1/vault";
pub const LABEL_BACKUP: &str = "microapp/v1/backup";
pub const LABEL_IDENTITY_SIGN: &str = "microapp/v1/identity-sign";

/// Argon2id parameters for vault/backup passphrase wrapping.
pub const ARGON2_MEMORY_KIB: u32 = 65_536;
pub const ARGON2_ITERATIONS: u32 = 3;
pub const ARGON2_PARALLELISM: u32 = 1;
pub const ARGON2_SALT_LEN: usize = 16;

/// Deterministic subkeys derived from a BIP39 seed.
#[derive(Clone)]
pub struct SubKeys {
    pub master: [u8; KEY_LEN],
    pub sync: [u8; KEY_LEN],
    pub vault: [u8; KEY_LEN],
    pub backup: [u8; KEY_LEN],
    pub identity_seed: [u8; KEY_LEN],
}

impl Drop for SubKeys {
    fn drop(&mut self) {
        self.master.zeroize();
        self.sync.zeroize();
        self.vault.zeroize();
        self.backup.zeroize();
        self.identity_seed.zeroize();
    }
}

fn random_bytes<const N: usize>() -> [u8; N] {
    let mut out = [0u8; N];
    OsRng.fill_bytes(&mut out);
    out
}

/// Generate a 24-word English BIP39 phrase with 256 bits of entropy.
pub fn generate_mnemonic() -> CoreResult<String> {
    let mnemonic = Mnemonic::generate_in(Language::English, MNEMONIC_WORDS)
        .map_err(|e| CoreError::Crypto(format!("mnemonic generation failed: {e}")))?;
    Ok(mnemonic.to_string())
}

/// Validate a phrase: 24 words, English wordlist, checksum valid.
pub fn validate_mnemonic(phrase: &str) -> CoreResult<Mnemonic> {
    let normalized = normalize_phrase(phrase);
    let mnemonic = Mnemonic::parse_in_normalized(Language::English, &normalized)
        .map_err(|e| CoreError::Identity(format!("invalid recovery phrase: {e}")))?;
    if mnemonic.word_count() != MNEMONIC_WORDS {
        return Err(CoreError::Identity("recovery phrase must be 24 words".into()));
    }
    Ok(mnemonic)
}

/// NFKD-normalize and collapse whitespace, as BIP39 requires.
pub fn normalize_phrase(phrase: &str) -> String {
    use unicode_normalization::UnicodeNormalization;
    phrase.nfkd().collect::<String>().split_whitespace().collect::<Vec<_>>().join(" ")
}

/// Derive the 64-byte BIP39 seed (PBKDF2-HMAC-SHA512, 2048 iterations).
pub fn derive_seed(phrase: &str, passphrase: &str) -> CoreResult<[u8; 64]> {
    let mnemonic = validate_mnemonic(phrase)?;
    Ok(mnemonic.to_seed_normalized(&normalize_phrase(passphrase)))
}

/// Derive every subkey from the seed using HKDF-SHA256 with the identity salt.
pub fn derive_subkeys(seed: &[u8], hkdf_salt: &[u8; KEY_LEN]) -> CoreResult<SubKeys> {
    let hk = Hkdf::<Sha256>::new(Some(hkdf_salt), seed);
    let expand = |label: &str| -> CoreResult<[u8; KEY_LEN]> {
        let mut out = [0u8; KEY_LEN];
        hk.expand(label.as_bytes(), &mut out)
            .map_err(|e| CoreError::Crypto(format!("hkdf expand failed: {e}")))?;
        Ok(out)
    };
    Ok(SubKeys {
        master: expand(LABEL_MASTER)?,
        sync: expand(LABEL_SYNC)?,
        vault: expand(LABEL_VAULT)?,
        backup: expand(LABEL_BACKUP)?,
        identity_seed: expand(LABEL_IDENTITY_SIGN)?,
    })
}

/// Build an HKDF-derived key for an arbitrary label (used by tests and hosts).
pub fn hkdf_key(secret: &[u8], salt: &[u8], label: &str) -> CoreResult<[u8; KEY_LEN]> {
    let hk = Hkdf::<Sha256>::new(Some(salt), secret);
    let mut out = [0u8; KEY_LEN];
    hk.expand(label.as_bytes(), &mut out)
        .map_err(|e| CoreError::Crypto(format!("hkdf expand failed: {e}")))?;
    Ok(out)
}

/// Ed25519 signing key from a 32-byte seed (identity key).
pub fn signing_key_from_seed(seed: &[u8; KEY_LEN]) -> SigningKey {
    SigningKey::from_bytes(seed)
}

/// Public Ed25519 key bytes.
pub fn ed25519_public(signing: &SigningKey) -> [u8; KEY_LEN] {
    signing.verifying_key().to_bytes()
}

/// Sign a message with Ed25519, returning the 64 raw bytes.
pub fn ed25519_sign(signing: &SigningKey, message: &[u8]) -> [u8; SIGNATURE_LEN] {
    signing.sign(message).to_bytes()
}

/// Verify a raw Ed25519 signature.
pub fn ed25519_verify(
    public: &[u8; KEY_LEN],
    message: &[u8],
    signature: &[u8],
) -> CoreResult<()> {
    if signature.len() != SIGNATURE_LEN {
        return Err(CoreError::Crypto("signature length must be 64".into()));
    }
    let key = VerifyingKey::from_bytes(public)
        .map_err(|e| CoreError::Crypto(format!("invalid public key: {e}")))?;
    let sig = Signature::from_slice(signature)
        .map_err(|e| CoreError::Crypto(format!("invalid signature: {e}")))?;
    key.verify(message, &sig)
        .map_err(|_| CoreError::Crypto("signature verification failed".into()))
}

/// X25519 keypair used for pairing and transport handshakes.
pub struct DeviceAgreement {
    secret: StaticSecret,
    public: X25519Public,
}

impl DeviceAgreement {
    pub fn generate() -> Self {
        let secret = StaticSecret::random_from_rng(OsRng);
        let public = X25519Public::from(&secret);
        Self { secret, public }
    }

    pub fn public_bytes(&self) -> [u8; KEY_LEN] {
        self.public.to_bytes()
    }

    pub fn diffie_hellman(&self, peer: &[u8; KEY_LEN]) -> [u8; KEY_LEN] {
        self.secret.diffie_hellman(&X25519Public::from(*peer)).to_bytes()
    }
}

/// 32 random bytes, used for salts and Site IDs.
pub fn random_32() -> [u8; KEY_LEN] {
    random_bytes::<KEY_LEN>()
}

/// 16 random bytes (Site ID).
pub fn random_16() -> [u8; SITE_ID_LEN] {
    random_bytes::<SITE_ID_LEN>()
}

/// 12 random bytes (AES-GCM nonce).
pub fn random_nonce() -> [u8; 12] {
    random_bytes::<12>()
}

/// `key_id` = first 16 bytes of SHA-256(`label || key`).
pub fn key_id(label: &str, key: &[u8]) -> [u8; 16] {
    let mut hasher = Sha256::new();
    hasher.update(label.as_bytes());
    hasher.update(key);
    let digest = hasher.finalize();
    let mut out = [0u8; 16];
    out.copy_from_slice(&digest[..16]);
    out
}

/// SHA-256 helper.
pub fn sha256(data: &[u8]) -> [u8; 32] {
    let digest = Sha256::digest(data);
    let mut out = [0u8; 32];
    out.copy_from_slice(&digest);
    out
}

/// Constant-time equality for secrets and digests.
pub fn ct_eq(a: &[u8], b: &[u8]) -> bool {
    if a.len() != b.len() {
        return false;
    }
    a.ct_eq(b).into()
}

/// Metadata bound to an envelope via AES-GCM AAD.
#[derive(Debug, Clone)]
pub struct EnvelopeAad {
    pub site_id: [u8; SITE_ID_LEN],
    pub record_type: String,
    pub record_id: String,
    pub schema_version: u32,
}

impl EnvelopeAad {
    fn encode(&self, version: u8, key_id: &[u8; 16]) -> Vec<u8> {
        let mut out = Vec::with_capacity(64 + self.record_type.len() + self.record_id.len());
        out.push(version);
        out.extend_from_slice(key_id);
        out.extend_from_slice(&self.site_id);
        out.extend_from_slice(&(self.record_type.len() as u32).to_be_bytes());
        out.extend_from_slice(self.record_type.as_bytes());
        out.extend_from_slice(&(self.record_id.len() as u32).to_be_bytes());
        out.extend_from_slice(self.record_id.as_bytes());
        out.extend_from_slice(&self.schema_version.to_be_bytes());
        out
    }
}

/// AES-256-GCM envelope: `version(1) | key_id(16) | nonce(12) | ciphertext | tag(16)`.
pub fn envelope_seal(
    key: &[u8; KEY_LEN],
    label: &str,
    aad: &EnvelopeAad,
    plaintext: &[u8],
) -> CoreResult<Vec<u8>> {
    let cipher = Aes256Gcm::new_from_slice(key)
        .map_err(|e| CoreError::Crypto(format!("invalid key: {e}")))?;
    let kid = key_id(label, key);
    let nonce_bytes = random_nonce();
    let header_aad = aad.encode(ENVELOPE_VERSION, &kid);
    let ciphertext = cipher
        .encrypt(
            Nonce::from_slice(&nonce_bytes),
            Payload { msg: plaintext, aad: &header_aad },
        )
        .map_err(|_| CoreError::Crypto("encryption failed".into()))?;
    let mut out = Vec::with_capacity(ENVELOPE_HEADER_LEN + ciphertext.len());
    out.push(ENVELOPE_VERSION);
    out.extend_from_slice(&kid);
    out.extend_from_slice(&nonce_bytes);
    out.extend_from_slice(&ciphertext);
    Ok(out)
}

/// Open an envelope and verify its AAD binding.
pub fn envelope_open(
    key: &[u8; KEY_LEN],
    label: &str,
    aad: &EnvelopeAad,
    envelope: &[u8],
) -> CoreResult<Vec<u8>> {
    if envelope.len() < ENVELOPE_HEADER_LEN + GCM_TAG_LEN {
        return Err(CoreError::Crypto("envelope too short".into()));
    }
    let version = envelope[0];
    if version != ENVELOPE_VERSION {
        return Err(CoreError::Crypto(format!("unsupported envelope version {version}")));
    }
    let mut kid = [0u8; 16];
    kid.copy_from_slice(&envelope[1..17]);
    let expected = key_id(label, key);
    if !ct_eq(&kid, &expected) {
        return Err(CoreError::Crypto("unknown key_id".into()));
    }
    let nonce_bytes = &envelope[17..29];
    let ciphertext = &envelope[29..];
    let cipher = Aes256Gcm::new_from_slice(key)
        .map_err(|e| CoreError::Crypto(format!("invalid key: {e}")))?;
    let header_aad = aad.encode(version, &kid);
    cipher
        .decrypt(
            Nonce::from_slice(nonce_bytes),
            Payload { msg: ciphertext, aad: &header_aad },
        )
        .map_err(|_| CoreError::Crypto("decryption failed".into()))
}

/// Canonical JSON (RFC 8785) serialization.
pub fn jcs<T: serde::Serialize>(value: &T) -> CoreResult<Vec<u8>> {
    Ok(serde_jcs::to_vec(value)?)
}

/// Wrap a 32-byte key with Argon2id + AES-256-GCM using a user passphrase.
pub fn wrap_key(
    key_to_wrap: &[u8; KEY_LEN],
    passphrase: &str,
    salt: &[u8; ARGON2_SALT_LEN],
) -> CoreResult<([u8; 12], Vec<u8>)> {
    use argon2::Argon2;
    let params = argon2::Params::new(
        ARGON2_MEMORY_KIB,
        ARGON2_ITERATIONS,
        ARGON2_PARALLELISM,
        Some(KEY_LEN),
    )
    .map_err(|e| CoreError::Crypto(format!("argon2 params: {e}")))?;
    let argon = Argon2::new(argon2::Algorithm::Argon2id, argon2::Version::V0x13, params);
    let mut kek = [0u8; KEY_LEN];
    argon
        .hash_password_into(passphrase.as_bytes(), salt, &mut kek)
        .map_err(|e| CoreError::Crypto(format!("argon2 failed: {e}")))?;
    let nonce = random_nonce();
    let cipher = Aes256Gcm::new_from_slice(&kek)
        .map_err(|e| CoreError::Crypto(format!("invalid kek: {e}")))?;
    let wrapped = cipher
        .encrypt(Nonce::from_slice(&nonce), key_to_wrap.as_ref())
        .map_err(|_| CoreError::Crypto("key wrap failed".into()))?;
    kek.zeroize();
    Ok((nonce, wrapped))
}

/// Unwrap a 32-byte key previously produced by [`wrap_key`].
pub fn unwrap_key(
    wrapped: &[u8],
    passphrase: &str,
    salt: &[u8; ARGON2_SALT_LEN],
    nonce: &[u8; 12],
) -> CoreResult<[u8; KEY_LEN]> {
    use argon2::Argon2;
    let params = argon2::Params::new(
        ARGON2_MEMORY_KIB,
        ARGON2_ITERATIONS,
        ARGON2_PARALLELISM,
        Some(KEY_LEN),
    )
    .map_err(|e| CoreError::Crypto(format!("argon2 params: {e}")))?;
    let argon = Argon2::new(argon2::Algorithm::Argon2id, argon2::Version::V0x13, params);
    let mut kek = [0u8; KEY_LEN];
    argon
        .hash_password_into(passphrase.as_bytes(), salt, &mut kek)
        .map_err(|e| CoreError::Crypto(format!("argon2 failed: {e}")))?;
    let cipher = Aes256Gcm::new_from_slice(&kek)
        .map_err(|e| CoreError::Crypto(format!("invalid kek: {e}")))?;
    let plaintext = cipher
        .decrypt(Nonce::from_slice(nonce), wrapped)
        .map_err(|_| CoreError::Crypto("key unwrap failed".into()))?;
    kek.zeroize();
    let mut out = [0u8; KEY_LEN];
    if plaintext.len() != KEY_LEN {
        return Err(CoreError::Crypto("wrapped key has wrong length".into()));
    }
    out.copy_from_slice(&plaintext);
    Ok(out)
}

/// Hex encode helper used by hosts and CLI output.
pub fn hex_lower(bytes: &[u8]) -> String {
    hex::encode(bytes)
}

/// Hex decode helper.
pub fn hex_decode(value: &str) -> CoreResult<Vec<u8>> {
    hex::decode(value).map_err(|e| CoreError::Crypto(format!("invalid hex: {e}")))
}

/// Seal arbitrary bytes with a passphrase (Argon2id → AES-256-GCM).
///
/// Layout: `salt(16) | m_kib(u32 be) | t(u32 be) | p(u32 be) | nonce(12) | ciphertext`.
pub fn seal_with_passphrase(passphrase: &str, plaintext: &[u8]) -> CoreResult<Vec<u8>> {
    use argon2::Argon2;
    let salt = random_bytes::<ARGON2_SALT_LEN>();
    let params = argon2::Params::new(
        ARGON2_MEMORY_KIB,
        ARGON2_ITERATIONS,
        ARGON2_PARALLELISM,
        Some(KEY_LEN),
    )
    .map_err(|e| CoreError::Crypto(format!("argon2 params: {e}")))?;
    let argon = Argon2::new(argon2::Algorithm::Argon2id, argon2::Version::V0x13, params);
    let mut kek = [0u8; KEY_LEN];
    argon
        .hash_password_into(passphrase.as_bytes(), &salt, &mut kek)
        .map_err(|e| CoreError::Crypto(format!("argon2 failed: {e}")))?;
    let nonce = random_nonce();
    let cipher = Aes256Gcm::new_from_slice(&kek)
        .map_err(|e| CoreError::Crypto(format!("invalid kek: {e}")))?;
    let ciphertext = cipher
        .encrypt(Nonce::from_slice(&nonce), plaintext)
        .map_err(|_| CoreError::Crypto("encryption failed".into()))?;
    kek.zeroize();
    let mut out = Vec::with_capacity(16 + 12 + 12 + ciphertext.len());
    out.extend_from_slice(&salt);
    out.extend_from_slice(&ARGON2_MEMORY_KIB.to_be_bytes());
    out.extend_from_slice(&ARGON2_ITERATIONS.to_be_bytes());
    out.extend_from_slice(&ARGON2_PARALLELISM.to_be_bytes());
    out.extend_from_slice(&nonce);
    out.extend_from_slice(&ciphertext);
    Ok(out)
}

/// Open a passphrase-sealed blob produced by [`seal_with_passphrase`].
pub fn open_with_passphrase(passphrase: &str, blob: &[u8]) -> CoreResult<Vec<u8>> {
    use argon2::Argon2;
    if blob.len() < 16 + 12 + 12 + GCM_TAG_LEN {
        return Err(CoreError::Crypto("sealed blob too short".into()));
    }
    let mut salt = [0u8; ARGON2_SALT_LEN];
    salt.copy_from_slice(&blob[..16]);
    let memory_kib = u32::from_be_bytes([blob[16], blob[17], blob[18], blob[19]]);
    let iterations = u32::from_be_bytes([blob[20], blob[21], blob[22], blob[23]]);
    let parallelism = u32::from_be_bytes([blob[24], blob[25], blob[26], blob[27]]);
    if memory_kib < ARGON2_MEMORY_KIB || iterations < ARGON2_ITERATIONS || parallelism < ARGON2_PARALLELISM {
        return Err(CoreError::Crypto("sealed blob weakens the KDF floor".into()));
    }
    let mut nonce = [0u8; 12];
    nonce.copy_from_slice(&blob[28..40]);
    let ciphertext = &blob[40..];
    let params = argon2::Params::new(memory_kib, iterations, parallelism, Some(KEY_LEN))
        .map_err(|e| CoreError::Crypto(format!("argon2 params: {e}")))?;
    let argon = Argon2::new(argon2::Algorithm::Argon2id, argon2::Version::V0x13, params);
    let mut kek = [0u8; KEY_LEN];
    argon
        .hash_password_into(passphrase.as_bytes(), &salt, &mut kek)
        .map_err(|e| CoreError::Crypto(format!("argon2 failed: {e}")))?;
    let cipher = Aes256Gcm::new_from_slice(&kek)
        .map_err(|e| CoreError::Crypto(format!("invalid kek: {e}")))?;
    let plaintext = cipher
        .decrypt(Nonce::from_slice(&nonce), ciphertext)
        .map_err(|_| CoreError::Crypto("decryption failed".into()))?;
    kek.zeroize();
    Ok(plaintext)
}
