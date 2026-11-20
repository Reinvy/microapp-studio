//! Crypto vectors and envelope guarantees.

use microapp_core::crypto::{
    derive_seed, derive_subkeys, ed25519_public, ed25519_sign, ed25519_verify, envelope_open,
    envelope_seal, hex_lower, key_id, normalize_phrase, random_16, random_32, sha256,
    signing_key_from_seed, unwrap_key, validate_mnemonic, wrap_key, EnvelopeAad, LABEL_SYNC,
    LABEL_VAULT, ARGON2_SALT_LEN,
};

const VECTOR_PHRASE: &str = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art";

#[test]
fn bip39_seed_uses_pbkdf2_hmac_sha512_2048_iterations() {
    // Independent computation of the documented KDF: PBKDF2-HMAC-SHA512 over the
    // normalized phrase with salt "mnemonic" + passphrase, 2048 iterations.
    let mut expected = [0u8; 64];
    pbkdf2::pbkdf2_hmac::<sha2::Sha512>(
        VECTOR_PHRASE.as_bytes(),
        b"mnemonic",
        2048,
        &mut expected,
    );
    let seed = derive_seed(VECTOR_PHRASE, "").expect("valid phrase");
    assert_eq!(hex_lower(&seed), hex_lower(&expected));

    // Determinism across calls.
    assert_eq!(derive_seed(VECTOR_PHRASE, "").unwrap(), seed);

    // A passphrase changes the seed (BIP39 optional passphrase).
    assert_ne!(derive_seed(VECTOR_PHRASE, "trezor").unwrap(), seed);
}

#[test]
fn normalize_phrase_collapses_whitespace_and_case_preserves_words() {
    let messy = format!("  {}  abandon ", VECTOR_PHRASE);
    let normalized = normalize_phrase(&messy);
    assert_eq!(normalized, format!("{VECTOR_PHRASE} abandon"));
    assert!(validate_mnemonic(VECTOR_PHRASE).is_ok());
}

#[test]
fn mnemonic_rejects_short_phrase() {
    assert!(validate_mnemonic("abandon abandon").is_err());
}

#[test]
fn subkeys_are_label_separated() {
    let seed = derive_seed(VECTOR_PHRASE, "").unwrap();
    let salt = random_32();
    let keys = derive_subkeys(&seed, &salt).unwrap();
    assert_ne!(keys.sync, keys.vault);
    assert_ne!(keys.master, keys.sync);
    assert_ne!(keys.identity_seed, keys.backup);
    // Deterministic for the same seed + salt.
    let again = derive_subkeys(&seed, &salt).unwrap();
    assert_eq!(keys.identity_seed, again.identity_seed);
    // Different salt ⇒ different subkeys.
    let other = derive_subkeys(&seed, &random_32()).unwrap();
    assert_ne!(keys.identity_seed, other.identity_seed);
}

#[test]
fn ed25519_sign_and_verify_roundtrip() {
    let seed = random_32();
    let signing = signing_key_from_seed(&seed);
    let public = ed25519_public(&signing);
    let message = b"microapp manifest digest";
    let signature = ed25519_sign(&signing, message);
    assert!(ed25519_verify(&public, message, &signature).is_ok());
    // Any bit flip breaks verification.
    let mut tampered = signature;
    tampered[0] ^= 0x01;
    assert!(ed25519_verify(&public, message, &tampered).is_err());
    assert!(ed25519_verify(&public, b"other message", &signature).is_err());
    assert!(ed25519_verify(&public, message, &signature[..63]).is_err());
}

#[test]
fn envelope_roundtrip_and_aad_binding() {
    let key = random_32();
    let site_id = random_16();
    let aad = EnvelopeAad {
        site_id,
        record_type: "vault_item".to_string(),
        record_id: "0190a5b2-0000-7000-8000-000000000001".to_string(),
        schema_version: 3,
    };
    let plaintext = b"super secret api key";
    let envelope = envelope_seal(&key, LABEL_VAULT, &aad, plaintext).unwrap();
    assert_eq!(&envelope[..1], &[1u8]);
    assert_eq!(envelope.len(), 1 + 16 + 12 + plaintext.len() + 16);
    assert_eq!(envelope_open(&key, LABEL_VAULT, &aad, &envelope).unwrap(), plaintext);

    // Different record id ⇒ AAD mismatch.
    let mut other_aad = aad.clone();
    other_aad.record_id = "0190a5b2-0000-7000-8000-000000000002".to_string();
    assert!(envelope_open(&key, LABEL_VAULT, &other_aad, &envelope).is_err());

    // Different label ⇒ unknown key_id.
    assert!(envelope_open(&key, LABEL_SYNC, &aad, &envelope).is_err());

    // Tampered nonce/ciphertext/tag fail.
    for index in [17usize, 29, envelope.len() - 1] {
        let mut tampered = envelope.clone();
        tampered[index] ^= 0xff;
        assert!(envelope_open(&key, LABEL_VAULT, &aad, &tampered).is_err());
    }

    // Truncated envelope fails closed.
    assert!(envelope_open(&key, LABEL_VAULT, &aad, &envelope[..20]).is_err());
}

#[test]
fn key_id_is_first_16_bytes_of_sha256_label_and_key() {
    let key = random_32();
    let mut material = LABEL_VAULT.as_bytes().to_vec();
    material.extend_from_slice(&key);
    let digest = sha256(&material);
    assert_eq!(key_id(LABEL_VAULT, &key), digest[..16]);
}

#[test]
fn vault_key_wrap_roundtrip_and_wrong_passphrase() {
    let vault_key = random_32();
    let salt = [7u8; ARGON2_SALT_LEN];
    let (nonce, wrapped) = wrap_key(&vault_key, "correct horse battery staple", &salt).unwrap();
    let unwrapped = unwrap_key(&wrapped, "correct horse battery staple", &salt, &nonce).unwrap();
    assert_eq!(unwrapped, vault_key);
    assert!(unwrap_key(&wrapped, "wrong passphrase", &salt, &nonce).is_err());
    let mut tampered = wrapped.clone();
    tampered[0] ^= 0xff;
    assert!(unwrap_key(&tampered, "correct horse battery staple", &salt, &nonce).is_err());
}
