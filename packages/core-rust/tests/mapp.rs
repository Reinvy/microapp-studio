//! `.mapp` v2 determinism, layout guards, signatures, and digest rules.

use std::io::{Cursor, Write};

use base64::Engine;
use ed25519_dalek::SigningKey;
use microapp_core::crypto::{ed25519_public, ed25519_sign, hex_lower, signing_key_from_seed};
use microapp_core::manifest;
use microapp_core::mapp::{
    self, InstallSource, MappEntry, MANIFEST_PATH, SIGNATURE_PATH,
};
use serde_json::{json, Value};
use zip::write::SimpleFileOptions;
use zip::{CompressionMethod, DateTime, ZipWriter};

const AUTHOR_SEED: [u8; 32] = [1u8; 32];
const REGISTRY_SEED: [u8; 32] = [2u8; 32];
const OTHER_SEED: [u8; 32] = [3u8; 32];

fn author_key() -> SigningKey {
    signing_key_from_seed(&AUTHOR_SEED)
}

fn author_public_hex() -> String {
    hex_lower(&ed25519_public(&author_key()))
}

fn registry_public_hex() -> String {
    hex_lower(&ed25519_public(&signing_key_from_seed(&REGISTRY_SEED)))
}

fn manifest_value() -> Value {
    json!({
        "schemaVersion": 2,
        "id": "studio.p0123456789ab",
        "name": "Kasir Warung",
        "version": "1.0.0",
        "entry": { "bundle": "bundle/index.js" },
        "assetsDir": "assets/",
        "integrity": { "algorithm": "sha256", "contentHash": "", "files": {} },
        "signature": { "algorithm": "ed25519", "keyId": "", "value": "" },
        "offline": true,
        "permissions": ["storage.app", "network.fetch"],
        "networkAllowlist": ["https://api.example.com"],
        "capabilities": ["ui.muip", "storage.app"],
        "ui": { "engine": "muip-web", "protocol": 1 }
    })
}

fn manifest_json() -> String {
    manifest_value().to_string()
}

fn entries() -> Vec<MappEntry> {
    vec![
        MappEntry::file("bundle/index.js", b"export async function mount(api){api.render({type:'Card',id:'x'})}".to_vec()),
        MappEntry::file("assets/icon.txt", b"icon".to_vec()),
        MappEntry::file("LICENSE", b"Apache-2.0".to_vec()),
    ]
}

fn pack() -> Vec<u8> {
    mapp::pack_with_key(&manifest_json(), &entries(), &author_key()).unwrap()
}

fn code(err: microapp_core::CoreError) -> &'static str {
    err.code()
}

fn zip_of(entries: &[MappEntry]) -> Vec<u8> {
    let mut sorted: Vec<&MappEntry> = entries.iter().filter(|entry| !entry.is_dir).collect();
    sorted.sort_by(|a, b| a.path.as_bytes().cmp(b.path.as_bytes()));
    let mut writer = ZipWriter::new(Cursor::new(Vec::new()));
    for entry in sorted {
        let options = SimpleFileOptions::default()
            .last_modified_time(DateTime::default())
            .unix_permissions(0o644)
            .compression_method(CompressionMethod::Deflated)
            .compression_level(Some(9));
        writer.start_file(entry.path.as_str(), options).unwrap();
        writer.write_all(&entry.data).unwrap();
    }
    writer.finish().unwrap().into_inner()
}

fn verify_local(bytes: &[u8]) -> microapp_core::CoreResult<mapp::VerifiedPackage> {
    let key = mapp::parse_pubkey(&author_public_hex()).unwrap();
    mapp::verify(bytes, InstallSource::Local, Some(&key), None)
}

fn b64(bytes: &[u8]) -> String {
    base64::engine::general_purpose::STANDARD.encode(bytes)
}

fn mutate_entry(entries: &mut [MappEntry], path: &str, mutate: impl FnOnce(&mut Vec<u8>)) {
    let entry = entries.iter_mut().find(|entry| entry.path == path).expect("entry");
    mutate(&mut entry.data);
}

#[test]
fn packing_is_deterministic_and_order_independent() {
    let first = pack();
    let second = pack();
    assert_eq!(first, second, "two packs of identical input must be byte-identical");

    let mut reversed = entries();
    reversed.reverse();
    let reordered = mapp::pack_with_key(&manifest_json(), &reversed, &author_key()).unwrap();
    assert_eq!(first, reordered, "entry order must not change the archive");
}

#[test]
fn local_pack_verifies_with_author_signature() {
    let bytes = pack();
    let verified = verify_local(&bytes).expect("valid package");
    assert_eq!(verified.manifest.id, "studio.p0123456789ab");
    assert_eq!(
        verified.manifest.signature.key_id,
        format!("ed25519:{}", author_public_hex())
    );
    assert_eq!(
        hex_lower(&verified.digest),
        verified.manifest.integrity.content_hash
    );
    assert_eq!(
        verified.manifest.integrity.files.keys().cloned().collect::<Vec<_>>(),
        vec!["LICENSE", "assets/icon.txt", "bundle/index.js"]
    );
    assert_eq!(verified.author_signature.len(), 64);
}

#[test]
fn identity_and_registry_signatures_cover_the_same_message() {
    // Build a registry co-signature over the prepare message.
    let mut value = manifest_value();
    value["signature"]["keyId"] = json!(format!("ed25519:{}", author_public_hex()));
    value["signature"]["registry"] = json!({
        "algorithm": "ed25519",
        "keyId": format!("ed25519:{}", registry_public_hex()),
        "value": ""
    });
    let prepared = mapp::prepare_manifest(&value.to_string(), &entries()).unwrap();
    let author_signature = ed25519_sign(&author_key(), &prepared.signature_message);
    let registry_key = signing_key_from_seed(&REGISTRY_SEED);
    let registry_signature = ed25519_sign(&registry_key, &prepared.signature_message);
    let mut prepared_value: Value = serde_json::from_str(&prepared.manifest_json).unwrap();
    prepared_value["signature"]["registry"]["value"] = json!(b64(&registry_signature));
    let bytes = mapp::finalize_with_signature(
        &prepared_value.to_string(),
        &entries(),
        &b64(&author_signature),
        &author_public_hex(),
    )
    .unwrap();

    let author = mapp::parse_pubkey(&author_public_hex()).unwrap();
    let registry = mapp::parse_pubkey(&registry_public_hex()).unwrap();
    let verified = mapp::verify(&bytes, InstallSource::Registry, Some(&author), Some(&registry)).unwrap();
    assert!(verified.registry_signature.is_some());

    // Registry installs without a registry signature or key fail closed.
    let local_only = pack();
    let err = mapp::verify(&local_only, InstallSource::Registry, Some(&author), Some(&registry))
        .expect_err("missing registry signature");
    assert_eq!(code(err), "E-PACK-002");

    let err = mapp::verify(&bytes, InstallSource::Registry, Some(&author), None)
        .expect_err("missing registry key");
    assert_eq!(code(err), "E-PACK-002");
}

#[test]
fn tampered_signature_fails_with_e_pack_002() {
    let bytes = pack();
    let mut extracted = mapp::extract_entries(&bytes).unwrap();
    mutate_entry(&mut extracted, SIGNATURE_PATH, |data| data[0] ^= 0x01);
    let err = verify_local(&zip_of(&extracted)).expect_err("tampered signature");
    assert_eq!(code(err), "E-PACK-002");

    // Dropping the detached signature is also a signature failure.
    let extracted: Vec<MappEntry> = mapp::extract_entries(&bytes)
        .unwrap()
        .into_iter()
        .filter(|entry| entry.path != SIGNATURE_PATH)
        .collect();
    let err = verify_local(&zip_of(&extracted)).expect_err("missing signature");
    assert_eq!(code(err), "E-PACK-002");
}

#[test]
fn unsigned_packages_are_rejected() {
    let bytes = mapp::build_unsigned(&manifest_json(), &entries()).unwrap();
    let err = verify_local(&bytes).expect_err("unsigned package");
    assert_eq!(code(err), "E-PACK-002");
}

#[test]
fn tampered_payload_and_content_hash_fail_with_e_pack_003() {
    let bytes = pack();
    let mut extracted = mapp::extract_entries(&bytes).unwrap();
    mutate_entry(&mut extracted, "bundle/index.js", |data| data.push(b'!'));
    let err = verify_local(&zip_of(&extracted)).expect_err("tampered payload");
    assert_eq!(code(err), "E-PACK-003");

    let mut extracted = mapp::extract_entries(&bytes).unwrap();
    mutate_entry(&mut extracted, MANIFEST_PATH, |data| {
        let mut value: Value = serde_json::from_slice(data).unwrap();
        value["integrity"]["contentHash"] = json!("0".repeat(64));
        *data = serde_json::to_vec(&value).unwrap();
    });
    let err = verify_local(&zip_of(&extracted)).expect_err("tampered content hash");
    assert_eq!(code(err), "E-PACK-003");
}

#[test]
fn rejects_unknown_and_native_manifest_fields() {
    let mut value = manifest_value();
    value["entry"]["uiEngine"] = json!("hybrid-native");
    let err = mapp::prepare_manifest(&value.to_string(), &entries()).expect_err("native field");
    assert_eq!(code(err), "E-PACK-001");

    let mut value = manifest_value();
    value["minHostVersion"] = json!("2.0.0");
    let err = mapp::prepare_manifest(&value.to_string(), &entries()).expect_err("v1 field");
    assert_eq!(code(err), "E-PACK-001");

    let mut value = manifest_value();
    value["schemaVersion"] = json!(1);
    let err = mapp::prepare_manifest(&value.to_string(), &entries()).expect_err("v1 manifest");
    assert_eq!(code(err), "E-PACK-001");
}

#[test]
fn rejects_path_traversal_and_disallowed_roots() {
    for path in ["../evil.js", "/etc/passwd", "bundle/../../x.js", "dist/app.js", "manifest.json"] {
        let mut bad = entries();
        bad.push(MappEntry::file(path, b"x".to_vec()));
        let err = mapp::prepare_manifest(&manifest_json(), &bad).expect_err(path);
        assert_eq!(code(err), "E-PACK-001", "path {path}");
    }

    let bad = vec![MappEntry::file("bundle/index.js", b"x".to_vec()), MappEntry::file("notes.txt", b"x".to_vec())];
    let err = mapp::prepare_manifest(&manifest_json(), &bad).expect_err("root");
    assert_eq!(code(err), "E-PACK-001");

    let duplicate = vec![
        MappEntry::file("bundle/index.js", b"x".to_vec()),
        MappEntry::file("bundle/index.js", b"y".to_vec()),
    ];
    let err = mapp::prepare_manifest(&manifest_json(), &duplicate).expect_err("duplicate");
    assert_eq!(code(err), "E-PACK-001");

    let err = mapp::prepare_manifest(&manifest_json(), &[]).expect_err("empty");
    assert_eq!(code(err), "E-PACK-001");
}

#[test]
fn rejects_permission_and_allowlist_violations() {
    let mut value = manifest_value();
    value["permissions"] = json!(["camera.raw"]);
    let err = mapp::prepare_manifest(&value.to_string(), &entries()).expect_err("permission");
    assert_eq!(code(err), "E-PACK-001");

    let mut value = manifest_value();
    value["permissions"] = json!(["storage.app"]);
    let err = mapp::prepare_manifest(&value.to_string(), &entries())
        .expect_err("allowlist requires network.fetch");
    assert_eq!(code(err), "E-PACK-001");

    let mut value = manifest_value();
    value["networkAllowlist"] = json!(["http://api.example.com"]);
    let err = mapp::prepare_manifest(&value.to_string(), &entries()).expect_err("http origin");
    assert_eq!(code(err), "E-PACK-001");

    let mut value = manifest_value();
    value["networkAllowlist"] = json!(["https://api.example.com/v1"]);
    let err = mapp::prepare_manifest(&value.to_string(), &entries()).expect_err("origin path");
    assert_eq!(code(err), "E-PACK-001");
}

#[test]
fn rejects_a_signature_from_the_wrong_key() {
    let mut value = manifest_value();
    value["signature"]["keyId"] = json!(format!("ed25519:{}", hex_lower(&ed25519_public(&signing_key_from_seed(&OTHER_SEED)))));
    let prepared = mapp::prepare_manifest(&value.to_string(), &entries()).unwrap();
    let signature = ed25519_sign(&author_key(), &prepared.signature_message);
    let err = mapp::finalize_with_signature(
        &prepared.manifest_json,
        &entries(),
        &b64(&signature),
        &author_public_hex(),
    )
    .expect_err("keyId mismatch");
    assert_eq!(code(err), "E-PACK-002");

    // A signature produced by another key never finalizes.
    let prepared = mapp::prepare_manifest(&manifest_json(), &entries()).unwrap();
    let foreign = ed25519_sign(&signing_key_from_seed(&OTHER_SEED), &prepared.signature_message);
    let err = mapp::finalize_with_signature(
        &prepared.manifest_json,
        &entries(),
        &b64(&foreign),
        &author_public_hex(),
    )
    .expect_err("foreign signature");
    assert_eq!(code(err), "E-PACK-002");
}

#[test]
fn missing_entry_bundle_is_rejected() {
    let mut value = manifest_value();
    value["entry"]["bundle"] = json!("bundle/missing.js");
    let err = mapp::prepare_manifest(&value.to_string(), &entries()).expect_err("bundle missing");
    assert_eq!(code(err), "E-PACK-001");
}

#[test]
fn prepare_fills_digests_and_reports_the_signature_message() {
    let prepared = mapp::prepare_manifest(&manifest_json(), &entries()).unwrap();
    assert!(manifest::is_hex64(&prepared.manifest.integrity.content_hash));
    assert_eq!(prepared.manifest.signature.value, "");
    for file in ["LICENSE", "assets/icon.txt", "bundle/index.js"] {
        assert!(manifest::is_hex64(
            prepared.manifest.integrity.files.get(file).expect(file)
        ));
    }
    assert!(!prepared.signature_message.is_empty());
}
