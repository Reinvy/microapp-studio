//! Manifest v2 schema, permissions, and layout rules.

use microapp_core::manifest;
use serde_json::{json, Value};

fn base_manifest() -> Value {
    json!({
        "schemaVersion": 2,
        "id": "studio.p0123456789ab",
        "name": "Kasir Warung",
        "version": "1.0.0",
        "entry": { "bundle": "bundle/index.js" },
        "assetsDir": "assets/",
        "integrity": {
            "algorithm": "sha256",
            "contentHash": "",
            "files": {}
        },
        "signature": { "algorithm": "ed25519", "keyId": "", "value": "" },
        "offline": true,
        "permissions": ["storage.app"],
        "capabilities": ["ui.muip", "storage.app"],
        "ui": { "engine": "muip-web", "protocol": 1 }
    })
}

fn issues(value: &Value) -> Vec<manifest::Issue> {
    manifest::validate(&value.to_string())
}

fn reject(value: &Value) -> bool {
    !issues(value).is_empty()
}

#[test]
fn accepts_the_documented_manifest() {
    assert_eq!(issues(&base_manifest()), Vec::<manifest::Issue>::new());
    let parsed = manifest::parse(&base_manifest().to_string()).expect("typed manifest");
    assert_eq!(parsed.schema_version, 2);
    assert_eq!(parsed.entry.bundle, "bundle/index.js");
    assert_eq!(parsed.assets_dir, "assets/");
    assert_eq!(parsed.ui.engine, "muip-web");
    assert!(parsed.has_permission("storage.app"));
    assert!(parsed.network_allowlist().is_empty());
}

#[test]
fn accepts_network_allowlist_only_with_network_fetch() {
    let mut value = base_manifest();
    value["permissions"] = json!(["storage.app", "network.fetch"]);
    value["networkAllowlist"] = json!(["https://api.example.com", "https://api.example.com:8443"]);
    assert_eq!(issues(&value), Vec::<manifest::Issue>::new());
    assert_eq!(
        manifest::parse(&value.to_string()).unwrap().network_allowlist(),
        ["https://api.example.com", "https://api.example.com:8443"]
    );

    value["permissions"] = json!(["storage.app"]);
    assert!(reject(&value), "allowlist requires network.fetch");
}

#[test]
fn rejects_malformed_network_origins() {
    for origin in [
        "http://api.example.com",
        "https://api.example.com/v1",
        "https://user:pass@api.example.com",
        "https://api.example.com?x=1",
        "https://api.example.com#frag",
        "api.example.com",
        "https://",
        "https://api example.com",
    ] {
        let mut value = base_manifest();
        value["permissions"] = json!(["network.fetch"]);
        value["networkAllowlist"] = json!([origin]);
        assert!(reject(&value), "origin {origin} must be rejected");
    }

    let mut value = base_manifest();
    value["permissions"] = json!(["network.fetch"]);
    value["networkAllowlist"] = json!(
        (0..17).map(|index| format!("https://api{index}.example.com")).collect::<Vec<_>>()
    );
    assert!(reject(&value), "more than 16 origins must be rejected");
}

#[test]
fn rejects_schema_version_one_and_native_fields() {
    let mut value = base_manifest();
    value["schemaVersion"] = json!(1);
    assert!(reject(&value));

    for (field, nested) in [
        ("uiEngine", json!("hybrid-native")),
        ("minHostVersion", json!("2.0.0")),
        ("runtime", json!({ "maxMemoryMb": 128 })),
        ("publisher", json!({ "keyId": "abc" })),
        ("license", json!("MIT")),
    ] {
        let mut value = base_manifest();
        value[field] = nested;
        assert!(reject(&value), "field {field} must be rejected");
    }

    let mut value = base_manifest();
    value["entry"]["uiEngine"] = json!("hybrid-native");
    assert!(reject(&value));

    let mut value = base_manifest();
    value["integrity"]["algorithm"] = json!("sha384");
    assert!(reject(&value));
}

#[test]
fn rejects_permissions_outside_the_catalog() {
    let mut value = base_manifest();
    value["permissions"] = json!(["camera", "storage.local"]);
    assert!(reject(&value));

    let mut value = base_manifest();
    value["permissions"] = json!({ "required": ["storage.app"], "optional": [] });
    assert!(reject(&value));

    let mut value = base_manifest();
    value["permissions"] = json!(["storage.app", "storage.app"]);
    assert!(reject(&value));
}

#[test]
fn rejects_invalid_identity_fields() {
    for id in ["Studio.App", "studio", "studio.", ".studio.app", "studio.APP"] {
        let mut value = base_manifest();
        value["id"] = json!(id);
        assert!(reject(&value), "id {id} must be rejected");
    }

    let mut value = base_manifest();
    value["name"] = json!("");
    assert!(reject(&value));

    for version in ["1.0", "v1.0.0", "1.0.0-beta.1", "01.0.0"] {
        let mut value = base_manifest();
        value["version"] = json!(version);
        assert!(reject(&value), "version {version} must be rejected");
    }

    let mut value = base_manifest();
    value["ui"]["engine"] = json!("hybrid-native");
    assert!(reject(&value));

    let mut value = base_manifest();
    value["ui"]["protocol"] = json!(2);
    assert!(reject(&value));

    let mut value = base_manifest();
    value["capabilities"] = json!(["ui.muip", "native.android"]);
    assert!(reject(&value));
}

#[test]
fn rejects_path_traversal_in_bundle_and_files() {
    for bundle in ["../evil.js", "bundle/../../evil.js", "/bundle/index.js", "dist/index.js"] {
        let mut value = base_manifest();
        value["entry"]["bundle"] = json!(bundle);
        assert!(reject(&value), "bundle {bundle} must be rejected");
    }

    let mut value = base_manifest();
    value["integrity"]["files"] = json!({ "../evil.js": "0".repeat(64) });
    assert!(reject(&value));
}

#[test]
fn rejects_unknown_signature_key_id_and_value() {
    let mut value = base_manifest();
    value["signature"]["keyId"] = json!("did:key:z6MkExample");
    assert!(reject(&value));

    let mut value = base_manifest();
    value["signature"]["value"] = json!("not-base64");
    assert!(reject(&value));

    let mut value = base_manifest();
    value["signature"]["algorithm"] = json!("rsa");
    assert!(reject(&value));
}

#[test]
fn fills_the_default_assets_dir() {
    let mut value = base_manifest();
    value.as_object_mut().unwrap().remove("assetsDir");
    assert_eq!(issues(&value), Vec::<manifest::Issue>::new());
    assert_eq!(manifest::parse(&value.to_string()).unwrap().assets_dir, "assets/");
}

#[test]
fn rejects_bom_and_malformed_json() {
    let bom = format!("\u{feff}{}", base_manifest());
    assert_eq!(manifest::validate(&bom)[0].rule, "encoding");
    assert!(!manifest::validate("{ not json").is_empty());
}

#[test]
fn content_hash_and_signature_projections_clear_values() {
    let mut value = base_manifest();
    value["signature"]["keyId"] = json!(format!("ed25519:{}", "1".repeat(64)));
    value["signature"]["value"] = json!(base64(&[7u8; 64]));
    value["integrity"]["contentHash"] = json!("a".repeat(64));
    let parsed = manifest::parse(&value.to_string()).unwrap();

    let canonical = parsed.canonical_hash_manifest();
    assert!(canonical.integrity.content_hash.is_empty());
    assert!(canonical.signature.value.is_empty());
    assert_eq!(canonical.signature.key_id, parsed.signature.key_id);

    let message = parsed.signature_manifest();
    assert!(message.signature.value.is_empty());
    assert_eq!(message.integrity.content_hash, parsed.integrity.content_hash);
}

fn base64(bytes: &[u8]) -> String {
    use base64::Engine;
    base64::engine::general_purpose::STANDARD.encode(bytes)
}
