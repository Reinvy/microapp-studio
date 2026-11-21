//! `.mapp-backup` v2 container: round trip, AAD separation, and error codes.

use base64::Engine;
use microapp_core::backup::{self, BACKUP_FORMAT_VERSION, BACKUP_MAGIC, MIN_PASSPHRASE_CHARS};
use serde_json::{json, Value};

const PASSPHRASE: &str = "correct horse battery staple";

fn sections() -> String {
    let encode =
        |value: Value| base64::engine::general_purpose::STANDARD.encode(value.to_string().as_bytes());
    json!([
        { "name": "identity", "plaintextBase64": encode(json!({ "row": null, "mnemonic": null })) },
        { "name": "host", "plaintextBase64": encode(json!({ "workspaces": [] })) }
    ])
    .to_string()
}

fn open_json(passphrase: &str, bytes: &[u8]) -> Result<Value, microapp_core::CoreError> {
    backup::open(passphrase, bytes).and_then(|json| {
        serde_json::from_str(&json).map_err(|error| microapp_core::CoreError::Serde(error.to_string()))
    })
}

fn code(err: microapp_core::CoreError) -> &'static str {
    err.code()
}

#[derive(Debug)]
struct Offsets {
    manifest_start: usize,
    first_section: usize,
    first_cipher_start: usize,
    first_len: usize,
    second_cipher_start: usize,
    second_len: usize,
}

fn layout_of(bytes: &[u8]) -> Offsets {
    let manifest_len = u32::from_be_bytes([bytes[52], bytes[53], bytes[54], bytes[55]]) as usize;
    let manifest_start = 56;
    let mut cursor = manifest_start + manifest_len;
    let first_section = cursor;
    let name_len = bytes[cursor] as usize;
    cursor += 1 + name_len;
    let len = u32::from_be_bytes([bytes[cursor], bytes[cursor + 1], bytes[cursor + 2], bytes[cursor + 3]])
        as usize;
    cursor += 4;
    let first_cipher_start = cursor + 12;
    cursor += 12 + len;
    let second_name_len = bytes[cursor] as usize;
    cursor += 1 + second_name_len;
    let second_len =
        u32::from_be_bytes([bytes[cursor], bytes[cursor + 1], bytes[cursor + 2], bytes[cursor + 3]])
            as usize;
    cursor += 4;
    let second_cipher_start = cursor + 12;
    Offsets {
        manifest_start,
        first_section,
        first_cipher_start,
        first_len: len,
        second_cipher_start,
        second_len,
    }
}

#[test]
fn round_trips_two_sections() {
    let sealed = backup::seal(PASSPHRASE, &sections(), 1_700_000_000_000.0).unwrap();
    assert_eq!(&sealed[0..8], BACKUP_MAGIC);
    assert_eq!(u16::from_be_bytes([sealed[8], sealed[9]]), BACKUP_FORMAT_VERSION);
    assert_eq!(u16::from_be_bytes([sealed[10], sealed[11]]), 2, "sectionCount excludes the manifest");
    assert_eq!(u32::from_be_bytes([sealed[28], sealed[29], sealed[30], sealed[31]]), 65_536);
    assert_eq!(u32::from_be_bytes([sealed[32], sealed[33], sealed[34], sealed[35]]), 3);
    assert_eq!(u32::from_be_bytes([sealed[36], sealed[37], sealed[38], sealed[39]]), 1);

    let opened = open_json(PASSPHRASE, &sealed).unwrap();
    assert_eq!(opened["manifest"]["formatVersion"], 2);
    assert_eq!(opened["createdAt"], 1_700_000_000_000i64);
    assert_eq!(opened["workspace"], Value::Null);
    assert_eq!(opened["sections"].as_array().unwrap().len(), 2);
    assert_eq!(opened["sections"][0]["name"], "identity");
    assert_eq!(opened["sections"][1]["name"], "host");
    let checksum = opened["manifest"]["sections"][0]["sha256"].as_str().unwrap();
    assert_eq!(checksum.len(), 64);
    let plaintext = base64::engine::general_purpose::STANDARD
        .decode(opened["sections"][1]["plaintextBase64"].as_str().unwrap())
        .unwrap();
    let decoded: Value = serde_json::from_slice(&plaintext).unwrap();
    assert_eq!(decoded["workspaces"], json!([]));

    // The manifest is sealed first: its ciphertext precedes the section table.
    let offsets = layout_of(&sealed);
    assert!(offsets.manifest_start < offsets.first_section);
}

#[test]
fn stores_the_workspace_wrapper_form() {
    let inner = sections();
    let list: Value = serde_json::from_str(&inner).unwrap();
    let wrapper = json!({ "workspace": "Rumah", "sections": list }).to_string();
    let sealed = backup::seal(PASSPHRASE, &wrapper, 5.0).unwrap();
    let opened = open_json(PASSPHRASE, &sealed).unwrap();
    assert_eq!(opened["workspace"], "Rumah");
    assert_eq!(opened["manifest"]["workspace"], "Rumah");
}

#[test]
fn rejects_a_wrong_passphrase_with_backup_001() {
    let sealed = backup::seal(PASSPHRASE, &sections(), 1.0).unwrap();
    let error = backup::open("not the right passphrase", &sealed).unwrap_err();
    assert_eq!(code(error), "E-BACKUP-001");
}

#[test]
fn rejects_tampered_ciphertext_with_backup_002() {
    let mut sealed = backup::seal(PASSPHRASE, &sections(), 1.0).unwrap();
    let last = sealed.len() - 1;
    sealed[last] ^= 0xff;
    let error = backup::open(PASSPHRASE, &sealed).unwrap_err();
    assert_eq!(code(error), "E-BACKUP-002");
}

#[test]
fn rejects_a_corrupt_checksum_with_backup_002() {
    let sealed = backup::seal(PASSPHRASE, &sections(), 1.0).unwrap();
    let offsets = layout_of(&sealed);
    let mut swapped = sealed.clone();
    // Move the first ciphertext into the second slot. The manifest checksum for
    // that slot no longer matches, so this fails before any decryption.
    let first = &sealed[offsets.first_cipher_start..offsets.first_cipher_start + offsets.first_len];
    let copied = offsets.first_len.min(offsets.second_len);
    swapped[offsets.second_cipher_start..offsets.second_cipher_start + copied]
        .copy_from_slice(&first[..copied]);
    let error = backup::open(PASSPHRASE, &swapped).unwrap_err();
    assert_eq!(code(error), "E-BACKUP-002");
}

#[test]
fn rejects_a_v1_container_without_migration() {
    let mut legacy = Vec::new();
    legacy.extend_from_slice(BACKUP_MAGIC);
    legacy.extend_from_slice(&1u16.to_be_bytes());
    legacy.extend_from_slice(&[0u8; 64]);
    let error = backup::open(PASSPHRASE, &legacy).unwrap_err();
    assert_eq!(code(error), "E-BACKUP-002");
}

#[test]
fn rejects_a_short_or_empty_passphrase() {
    for passphrase in ["", "short", "12345678901"] {
        let error = backup::seal(passphrase, &sections(), 1.0).unwrap_err();
        assert_eq!(code(error), "E-SET-001");
    }
    assert!(backup::seal(&"a".repeat(MIN_PASSPHRASE_CHARS), &sections(), 1.0).is_ok());
}

#[test]
fn binds_each_section_to_its_name_with_aad() {
    let sealed = backup::seal(PASSPHRASE, &sections(), 1.0).unwrap();
    let offsets = layout_of(&sealed);
    let first = &sealed[offsets.first_cipher_start..offsets.first_cipher_start + offsets.first_len];
    let second =
        &sealed[offsets.second_cipher_start..offsets.second_cipher_start + offsets.second_len];
    assert_ne!(first, second, "same-key sections must not share ciphertext");

    // Because the AAD binds a ciphertext to its section name, moving bytes
    // between slots cannot authenticate as the target section.
    let moved = backup::seal(
        PASSPHRASE,
        &json!([
            { "name": "identity", "plaintextBase64": base64::engine::general_purpose::STANDARD.encode("{}") },
            { "name": "host", "plaintextBase64": base64::engine::general_purpose::STANDARD.encode("{}") }
        ])
        .to_string(),
        1.0,
    )
    .unwrap();
    let moved_offsets = layout_of(&moved);
    let mut crossed = moved.clone();
    let copy_len = moved_offsets.first_len.min(moved_offsets.second_len);
    crossed[moved_offsets.second_cipher_start..moved_offsets.second_cipher_start + copy_len]
        .copy_from_slice(&moved[moved_offsets.first_cipher_start..moved_offsets.first_cipher_start + copy_len]);
    assert_eq!(
        code(backup::open(PASSPHRASE, &crossed).unwrap_err()),
        "E-BACKUP-002"
    );
}

#[test]
fn same_plaintext_in_two_sections_yields_different_ciphertexts() {
    let encode = |value: &str| base64::engine::general_purpose::STANDARD.encode(value.as_bytes());
    let sealed = backup::seal(
        PASSPHRASE,
        &json!([
            { "name": "identity", "plaintextBase64": encode("same plaintext") },
            { "name": "host", "plaintextBase64": encode("same plaintext") }
        ])
        .to_string(),
        1.0,
    )
    .unwrap();
    let layout = layout_of(&sealed);
    let first = &sealed[layout.first_cipher_start..layout.first_cipher_start + layout.first_len];
    let second = &sealed[layout.second_cipher_start..layout.second_cipher_start + layout.second_len];
    assert_eq!(first.len(), second.len());
    assert_ne!(first, second, "per-section nonces must not produce equal ciphertexts");
    assert!(backup::open(PASSPHRASE, &sealed).is_ok());
}

#[test]
fn rejects_duplicate_and_reserved_section_names() {
    let encode = |value: &str| base64::engine::general_purpose::STANDARD.encode(value.as_bytes());
    let duplicate = json!([
        { "name": "host", "plaintextBase64": encode("{}") },
        { "name": "host", "plaintextBase64": encode("{}") }
    ])
    .to_string();
    assert_eq!(
        code(backup::seal(PASSPHRASE, &duplicate, 1.0).unwrap_err()),
        "E-BACKUP-002"
    );

    let reserved = json!([{ "name": "manifest", "plaintextBase64": encode("{}") }]).to_string();
    assert_eq!(
        code(backup::seal(PASSPHRASE, &reserved, 1.0).unwrap_err()),
        "E-BACKUP-002"
    );
}
