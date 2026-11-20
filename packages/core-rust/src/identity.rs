//! Local identity: Site ID, recovery verification, and device certificates.
//!
//! The identity has no account and no server. A 24-word BIP39 phrase is the only
//! recoverable secret; the Site ID and device keys are created per installation.

use ed25519_dalek::SigningKey;
use serde::{Deserialize, Serialize};

use crate::crypto::{
    derive_seed, derive_subkeys, ed25519_public, ed25519_sign, ed25519_verify, random_16,
    random_32, signing_key_from_seed, validate_mnemonic, SubKeys, KEY_LEN, SITE_ID_LEN,
};
use crate::error::{CoreError, CoreResult};

/// Base32 (RFC 4648, no padding) rendering of a 16-byte Site ID (26 chars).
pub fn site_id_base32(site_id: &[u8; SITE_ID_LEN]) -> String {
    const ALPHABET: &[u8; 32] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    let mut out = String::with_capacity(26);
    let mut buffer: u32 = 0;
    let mut bits: u32 = 0;
    for byte in site_id {
        buffer = (buffer << 8) | u32::from(*byte);
        bits += 8;
        while bits >= 5 {
            bits -= 5;
            let index = ((buffer >> bits) & 0x1f) as usize;
            out.push(ALPHABET[index] as char);
        }
    }
    if bits > 0 {
        let index = ((buffer << (5 - bits)) & 0x1f) as usize;
        out.push(ALPHABET[index] as char);
    }
    out
}

/// Identity material derived from a recovery phrase.
pub struct DerivedIdentity {
    pub site_id: [u8; SITE_ID_LEN],
    pub hkdf_salt: [u8; KEY_LEN],
    pub identity_pubkey: [u8; KEY_LEN],
    keys: SubKeys,
}

impl DerivedIdentity {
    pub fn signing_key(&self) -> SigningKey {
        signing_key_from_seed(&self.keys.identity_seed)
    }

    pub fn vault_key(&self) -> [u8; KEY_LEN] {
        self.keys.vault
    }

    pub fn backup_key(&self) -> [u8; KEY_LEN] {
        self.keys.backup
    }

    pub fn sync_key(&self) -> [u8; KEY_LEN] {
        self.keys.sync
    }
}

/// Create a new identity from a fresh 24-word phrase.
pub fn identity_create() -> CoreResult<(String, DerivedIdentity)> {
    let phrase = crate::crypto::generate_mnemonic()?;
    let identity = identity_from_phrase(&phrase, "", None)?;
    Ok((phrase, identity))
}

/// Re-derive an identity from a phrase and optional passphrase.
///
/// `hkdf_salt` is stored in `local_identity` (non-secret). When it is `None`
/// (fresh identity) a new random salt is generated.
pub fn identity_from_phrase(
    phrase: &str,
    passphrase: &str,
    hkdf_salt: Option<[u8; KEY_LEN]>,
) -> CoreResult<DerivedIdentity> {
    let seed = derive_seed(phrase, passphrase)?;
    let salt = hkdf_salt.unwrap_or_else(random_32);
    let keys = derive_subkeys(&seed, &salt)?;
    let identity_pubkey = ed25519_public(&signing_key_from_seed(&keys.identity_seed));
    Ok(DerivedIdentity {
        site_id: random_16(),
        hkdf_salt: salt,
        identity_pubkey,
        keys,
    })
}

/// Recovery verification: re-derive the identity public key from the phrase and
/// compare it with the stored one in constant time.
///
/// There is no mnemonic hash on disk; a wrong phrase simply derives a different
/// key. The caller enforces the 10 attempts/minute rate limit.
pub fn identity_verify_recovery(
    phrase: &str,
    passphrase: &str,
    hkdf_salt: &[u8; KEY_LEN],
    expected_identity_pubkey: &[u8; KEY_LEN],
) -> CoreResult<()> {
    validate_mnemonic(phrase)?;
    let seed = derive_seed(phrase, passphrase)?;
    let keys = derive_subkeys(&seed, hkdf_salt)?;
    let derived = ed25519_public(&signing_key_from_seed(&keys.identity_seed));
    if crate::crypto::ct_eq(&derived, expected_identity_pubkey) {
        Ok(())
    } else {
        // Generic failure: never reveal which word or the passphrase was wrong.
        Err(CoreError::Identity("recovery phrase does not match identity".into()))
    }
}

/// Device certificate payload, CBOR-encoded and signed by the identity key.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct DeviceCert {
    pub version: u8,
    pub site_id: [u8; SITE_ID_LEN],
    pub identity_pubkey: [u8; KEY_LEN],
    pub device_sign_pubkey: [u8; KEY_LEN],
    pub device_ecdh_pubkey: [u8; KEY_LEN],
    pub issued_at_ms: u64,
    pub expires_at_ms: u64,
    pub capabilities: Vec<String>,
}

const DEVICE_CERT_VERSION: u8 = 1;
const MAX_CERT_VALIDITY_MS: u64 = 365 * 24 * 60 * 60 * 1000;

fn cbor_encode(cert: &DeviceCert) -> CoreResult<Vec<u8>> {
    let mut out = Vec::new();
    ciborium::into_writer(cert, &mut out)
        .map_err(|e| CoreError::Serde(format!("cbor encode failed: {e}")))?;
    Ok(out)
}

fn cbor_decode(bytes: &[u8]) -> CoreResult<DeviceCert> {
    ciborium::from_reader(bytes)
        .map_err(|e| CoreError::Serde(format!("cbor decode failed: {e}")))
}

/// Create a signed device certificate for `site_id` and device public keys.
pub fn device_cert_create(
    identity: &DerivedIdentity,
    device_sign_pubkey: &[u8; KEY_LEN],
    device_ecdh_pubkey: &[u8; KEY_LEN],
    issued_at_ms: u64,
    expires_at_ms: u64,
    capabilities: Vec<String>,
) -> CoreResult<Vec<u8>> {
    if expires_at_ms <= issued_at_ms {
        return Err(CoreError::Identity("certificate expiry must be after issue".into()));
    }
    if expires_at_ms - issued_at_ms > MAX_CERT_VALIDITY_MS {
        return Err(CoreError::Identity("certificate validity exceeds 365 days".into()));
    }
    let cert = DeviceCert {
        version: DEVICE_CERT_VERSION,
        site_id: identity.site_id,
        identity_pubkey: identity.identity_pubkey,
        device_sign_pubkey: *device_sign_pubkey,
        device_ecdh_pubkey: *device_ecdh_pubkey,
        issued_at_ms,
        expires_at_ms,
        capabilities,
    };
    let payload = cbor_encode(&cert)?;
    let signature = ed25519_sign(&identity.signing_key(), &payload);
    let mut out = Vec::with_capacity(4 + payload.len() + 64);
    out.extend_from_slice(&(payload.len() as u32).to_be_bytes());
    out.extend_from_slice(&payload);
    out.extend_from_slice(&signature);
    Ok(out)
}

/// Verify a device certificate against the identity key it names, plus expiry.
pub fn device_cert_verify(blob: &[u8], now_ms: u64) -> CoreResult<DeviceCert> {
    if blob.len() < 4 + 64 {
        return Err(CoreError::Identity("certificate too short".into()));
    }
    let payload_len = u32::from_be_bytes([blob[0], blob[1], blob[2], blob[3]]) as usize;
    if blob.len() != 4 + payload_len + 64 {
        return Err(CoreError::Identity("certificate length mismatch".into()));
    }
    let payload = &blob[4..4 + payload_len];
    let signature = &blob[4 + payload_len..];
    let cert = cbor_decode(payload)?;
    if cert.version != DEVICE_CERT_VERSION {
        return Err(CoreError::Identity("unsupported certificate version".into()));
    }
    ed25519_verify(&cert.identity_pubkey, payload, signature)?;
    if now_ms >= cert.expires_at_ms {
        return Err(CoreError::Identity("certificate expired".into()));
    }
    if cert.expires_at_ms - cert.issued_at_ms > MAX_CERT_VALIDITY_MS {
        return Err(CoreError::Identity("certificate validity exceeds 365 days".into()));
    }
    Ok(cert)
}

/// Verify that a certificate was signed by a specific identity key.
pub fn identity_verify(cert: &DeviceCert, expected_identity_pubkey: &[u8; KEY_LEN]) -> CoreResult<()> {
    if crate::crypto::ct_eq(&cert.identity_pubkey, expected_identity_pubkey) {
        Ok(())
    } else {
        Err(CoreError::Identity("certificate identity does not match".into()))
    }
}

/// Serialize identity metadata for the host `local_identity` row.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IdentityRecord {
    pub site_id: [u8; SITE_ID_LEN],
    pub site_id_base32: String,
    pub hkdf_salt: [u8; KEY_LEN],
    pub identity_pubkey: [u8; KEY_LEN],
    pub device_sign_pubkey: [u8; KEY_LEN],
    pub device_ecdh_pubkey: [u8; KEY_LEN],
}

/// Build the values a host stores in `local_identity` after first run.
pub fn identity_record(
    identity: &DerivedIdentity,
    device_sign_pubkey: &[u8; KEY_LEN],
    device_ecdh_pubkey: &[u8; KEY_LEN],
) -> IdentityRecord {
    IdentityRecord {
        site_id: identity.site_id,
        site_id_base32: site_id_base32(&identity.site_id),
        hkdf_salt: identity.hkdf_salt,
        identity_pubkey: identity.identity_pubkey,
        device_sign_pubkey: *device_sign_pubkey,
        device_ecdh_pubkey: *device_ecdh_pubkey,
    }
}

/// Reject `recovery_hint` values that contain too many BIP39 words.
pub fn validate_recovery_hint(hint: &str) -> CoreResult<()> {
    use bip39::Language;
    let wordlist = Language::English.word_list();
    let hit = hint
        .split_whitespace()
        .filter(|word| {
            let lower = word.trim_matches(|c: char| !c.is_ascii_alphabetic()).to_ascii_lowercase();
            wordlist.binary_search(&lower.as_str()).is_ok()
        })
        .count();
    if hit > 3 {
        return Err(CoreError::Identity("recovery hint must not contain mnemonic words".into()));
    }
    Ok(())
}
