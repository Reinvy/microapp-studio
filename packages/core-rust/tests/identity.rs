//! Identity creation, recovery verification, and device certificates.

use microapp_core::crypto::random_32;
use microapp_core::identity::{
    device_cert_create, device_cert_verify, identity_create, identity_from_phrase,
    identity_record, identity_verify, identity_verify_recovery, site_id_base32,
    validate_recovery_hint,
};

#[test]
fn site_id_base32_is_26_chars_and_stable() {
    let site_id = [0u8; 16];
    assert_eq!(site_id_base32(&site_id), "AAAAAAAAAAAAAAAAAAAAAAAAAA");
    let site_id = [0xffu8; 16];
    let encoded = site_id_base32(&site_id);
    assert_eq!(encoded.len(), 26);
    // 128 bits = 25 full base32 chars + 3 bits, so the final char is padded
    // with two zero bits: 11111 => 28 ('4') rather than 31 ('7').
    assert_eq!(encoded, "77777777777777777777777774");
    // Deterministic mapping per byte value.
    let mut other = [0u8; 16];
    other[0] = 1;
    assert_ne!(site_id_base32(&other), site_id_base32(&site_id));
}

#[test]
fn identity_create_returns_recoverable_phrase() {
    let (phrase, identity) = identity_create().unwrap();
    assert_eq!(phrase.split_whitespace().count(), 24);
    // Recovery with the same phrase + salt reproduces the identity key.
    identity_verify_recovery(&phrase, "", &identity.hkdf_salt, &identity.identity_pubkey).unwrap();
}

#[test]
fn wrong_phrase_fails_with_generic_error() {
    let (phrase, identity) = identity_create().unwrap();
    let mut words: Vec<&str> = phrase.split_whitespace().collect();
    words[5] = "abandon";
    let tampered = words.join(" ");
    let error = identity_verify_recovery(&tampered, "", &identity.hkdf_salt, &identity.identity_pubkey)
        .expect_err("wrong phrase must fail");
    assert_eq!(error.code(), "E-AUTH-006");
    // The message must not disclose which word was wrong.
    assert!(!error.to_string().contains("word 6"));
}

#[test]
fn wrong_passphrase_fails_recovery() {
    let identity = identity_from_phrase(
        "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art",
        "optional-passphrase",
        None,
    )
    .unwrap();
    assert!(identity_verify_recovery(
        "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art",
        "different-passphrase",
        &identity.hkdf_salt,
        &identity.identity_pubkey,
    )
    .is_err());
    identity_verify_recovery(
        "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art",
        "optional-passphrase",
        &identity.hkdf_salt,
        &identity.identity_pubkey,
    )
    .unwrap();
}

#[test]
fn device_cert_signs_device_keys_and_expires() {
    let (_phrase, identity) = identity_create().unwrap();
    let device_sign = random_32();
    let device_ecdh = random_32();
    let cert = device_cert_create(
        &identity,
        &device_sign,
        &device_ecdh,
        1_000,
        2_000,
        vec!["sync".to_string(), "pairing".to_string()],
    )
    .unwrap();
    let parsed = device_cert_verify(&cert, 1_500).unwrap();
    assert_eq!(parsed.site_id, identity.site_id);
    assert_eq!(parsed.device_sign_pubkey, device_sign);
    assert_eq!(parsed.device_ecdh_pubkey, device_ecdh);
    assert_eq!(parsed.capabilities, vec!["sync", "pairing"]);
    identity_verify(&parsed, &identity.identity_pubkey).unwrap();

    // Expired certificate is rejected.
    assert!(device_cert_verify(&cert, 2_001).is_err());
    // Tampered certificate is rejected.
    let mut tampered = cert.clone();
    let last = tampered.len() - 1;
    tampered[last] ^= 0xff;
    assert!(device_cert_verify(&tampered, 1_500).is_err());
    // Validity above one year is rejected.
    assert!(device_cert_create(&identity, &device_sign, &device_ecdh, 0, 400 * 24 * 3600 * 1000, vec![])
        .is_err());
}

#[test]
fn identity_record_matches_acceptance_names() {
    let (_phrase, identity) = identity_create().unwrap();
    let record = identity_record(&identity, &random_32(), &random_32());
    assert_eq!(record.site_id, identity.site_id);
    assert_eq!(record.identity_pubkey, identity.identity_pubkey);
    assert_eq!(record.hkdf_salt, identity.hkdf_salt);
    assert_eq!(record.site_id_base32.len(), 26);
}

#[test]
fn recovery_hint_rejects_mnemonic_words() {
    assert!(validate_recovery_hint("bank card pin at home").is_ok());
    assert!(validate_recovery_hint("abandon abandon abandon abandon").is_err());
}
