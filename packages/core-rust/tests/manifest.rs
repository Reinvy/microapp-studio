//! Manifest v2 rules M-01 … M-24.

use microapp_core::crypto::{ed25519_public, sha256, signing_key_from_seed};
use microapp_core::manifest::{self, host_supports, validate_version};
use serde_json::{json, Value};

fn author_public() -> [u8; 32] {
    let seed = [9u8; 32];
    ed25519_public(&signing_key_from_seed(&seed))
}

fn base_manifest() -> Value {
    let public = author_public();
    let fingerprint = microapp_core::crypto::hex_lower(&sha256(&public));
    let key_id = &fingerprint[..16];
    json!({
        "schemaVersion": "2.0-open",
        "id": "org.reinvy.kas-offline",
        "name": "KasLokal",
        "version": "1.3.0",
        "license": "MIT",
        "repository": "https://github.com/reinvy/kas-lokal",
        "publisher": { "keyId": key_id, "fingerprint": fingerprint },
        "minHostVersion": "2.0.0",
        "contentHash": format!("sha256-{}", "0".repeat(64)),
        "entry": {
            "bundle": "dist/app.bundle.js",
            "assetsDir": "assets/",
            "uiEngine": "hybrid-native",
            "integrity": "sha384-1B2c3D4e5F6g7H8i9J0kLmNoPqRsTuVwXyZaBcDeFgHiJkLmNoPqRsTuVwX",
            "signature": format!("ed25519-{key_id}")
        },
        "offline": {
            "mode": "offline-first",
            "requiresInternet": false,
            "localDbSchema": "db/migrations/",
            "syncStrategy": "crdt-hlc"
        },
        "runtime": {
            "isolation": "strict-sandbox",
            "maxMemoryMb": 128,
            "supportedViewports": ["mobile", "tablet", "desktop"]
        },
        "permissions": {
            "required": ["storage.local.sqlite"],
            "optional": ["camera.qr"],
            "networkAllowlist": []
        },
        "capabilities": { "intentsIn": [], "intentsOut": [], "widgets": [] }
    })
}

fn issues_for(value: &Value) -> Vec<manifest::Issue> {
    manifest::validate(&value.to_string())
}

fn rules(value: &Value) -> Vec<&'static str> {
    issues_for(value).into_iter().map(|issue| issue.rule).collect()
}

#[test]
fn base_manifest_is_valid() {
    let value = base_manifest();
    assert_eq!(issues_for(&value), Vec::<manifest::Issue>::new());
    let parsed = manifest::parse(&value.to_string()).expect("typed manifest");
    assert_eq!(parsed.permissions.storage_quota_mb(), 10);
    assert!(!parsed.runtime.secure_display);
    assert_eq!(parsed.publisher.source(), "registry");
}

#[test]
fn rejects_unknown_schema_version() {
    let mut value = base_manifest();
    value["schemaVersion"] = json!("2.1-open");
    assert!(rules(&value).contains(&"M-03"));
}

#[test]
fn rejects_invalid_id_and_version() {
    let mut value = base_manifest();
    value["id"] = json!("Org.Reinvy");
    assert!(rules(&value).contains(&"M-04"));

    let mut value = base_manifest();
    value["version"] = json!("v1.3");
    assert!(rules(&value).contains(&"M-05"));

    assert!(validate_version("1.3.0").is_ok());
    assert!(validate_version("1.3.0-beta.2").is_ok());
    assert!(validate_version("1.3.0-rc.1").is_ok());
    assert!(validate_version("1.3.0-alpha").is_err());
    assert!(validate_version("1.3.0-beta.0").is_err());
}

#[test]
fn rejects_unknown_license_and_empty_repository_without_local_source() {
    let mut value = base_manifest();
    value["license"] = json!("Proprietary");
    assert!(rules(&value).contains(&"M-06"));

    let mut value = base_manifest();
    value["repository"] = json!("");
    assert!(rules(&value).contains(&"M-06"));

    let mut value = base_manifest();
    value["repository"] = json!("");
    value["publisher"]["source"] = json!("local");
    assert!(!rules(&value).contains(&"M-06"));
}

#[test]
fn rejects_publisher_and_content_hash_mismatch() {
    let mut value = base_manifest();
    value["publisher"]["fingerprint"] = json!("ab".repeat(64));
    assert!(rules(&value).contains(&"M-07"));

    let mut value = base_manifest();
    value["contentHash"] = json!("sha256-short");
    assert!(rules(&value).contains(&"M-09"));
}

#[test]
fn rejects_path_traversal_and_wrong_engine() {
    for path in ["../x.js", "/abs.js", "C:\\x.js", "a/../../b"] {
        let mut value = base_manifest();
        value["entry"]["bundle"] = json!(path);
        assert!(rules(&value).contains(&"M-10"), "path {path} must be rejected");
    }
    let mut value = base_manifest();
    value["entry"]["uiEngine"] = json!("host-html");
    assert!(rules(&value).contains(&"M-10"));
}

#[test]
fn rejects_offline_and_runtime_enum_violations() {
    let mut value = base_manifest();
    value["offline"]["mode"] = json!("online-allowed");
    assert!(rules(&value).contains(&"M-11"));

    let mut value = base_manifest();
    value["offline"]["requiresInternet"] = json!(true);
    assert!(rules(&value).contains(&"M-11"));

    let mut value = base_manifest();
    value["runtime"]["isolation"] = json!("none");
    assert!(rules(&value).contains(&"M-12"));

    let mut value = base_manifest();
    value["runtime"]["maxMemoryMb"] = json!(1024);
    assert!(rules(&value).contains(&"M-12"));

    let mut value = base_manifest();
    value["runtime"]["supportedViewports"] = json!([]);
    assert!(rules(&value).contains(&"M-12"));

    let mut value = base_manifest();
    value["runtime"]["supportedViewports"] = json!(["watch"]);
    assert!(rules(&value).contains(&"M-12"));
}

#[test]
fn accepts_secure_display_flag() {
    let mut value = base_manifest();
    value["runtime"]["secureDisplay"] = json!(true);
    assert!(issues_for(&value).is_empty());
    let parsed = manifest::parse(&value.to_string()).unwrap();
    assert!(parsed.runtime.secure_display);
}

#[test]
fn rejects_permission_catalog_violations() {
    let mut value = base_manifest();
    value["permissions"]["required"] = json!(["camera.raw"]);
    assert!(rules(&value).contains(&"M-13"));

    let mut value = base_manifest();
    value["permissions"]["optional"] = json!(["storage.local.sqlite"]);
    assert!(rules(&value).contains(&"M-13"));

    let mut value = base_manifest();
    value["permissions"]["quotas"] = json!({ "storageMb": 0 });
    assert!(rules(&value).contains(&"M-13"));

    let mut value = base_manifest();
    value["permissions"]["quotas"] = json!({ "storageMb": 64 });
    assert!(issues_for(&value).is_empty());
    let parsed = manifest::parse(&value.to_string()).unwrap();
    assert_eq!(parsed.permissions.storage_quota_mb(), 64);
}

#[test]
fn rejects_network_allowlist_violations() {
    for entry in ["10.0.0.1", "169.254.169.254", "localhost", "api.example.com.", "Example.com"] {
        let mut value = base_manifest();
        value["permissions"]["networkAllowlist"] = json!([entry]);
        assert!(rules(&value).contains(&"M-14"), "allowlist {entry} must be rejected");
    }
    let mut value = base_manifest();
    value["permissions"]["networkAllowlist"] = json!(["api.example.com", "*.example.com"]);
    assert!(issues_for(&value).is_empty());
}

#[test]
fn rejects_local_ai_and_capability_violations() {
    let mut value = base_manifest();
    value["localAi"] = json!({ "optionalCapabilities": ["vision-magic"], "recommendedModelSize": "small-3b" });
    assert!(rules(&value).contains(&"M-15"));

    let mut value = base_manifest();
    value["capabilities"]["intentsIn"] = json!(["unknown.intent"]);
    assert!(rules(&value).contains(&"M-16"));

    let mut value = base_manifest();
    value["capabilities"]["widgets"] = json!([
        { "id": "daily", "sizes": ["2x1"] },
        { "id": "daily", "sizes": ["2x2"] }
    ]);
    assert!(rules(&value).contains(&"M-16"));

    let mut value = base_manifest();
    value["capabilities"]["widgets"] = json!([{ "id": "daily", "sizes": ["9x9"] }]);
    assert!(rules(&value).contains(&"M-16"));

    let mut value = base_manifest();
    value["capabilities"]["widgets"] = json!([{ "id": "daily", "sizes": ["2x1", "4x2"] }]);
    value["capabilities"]["intentsIn"] = json!(["image.receipt"]);
    assert!(issues_for(&value).is_empty());
}

#[test]
fn rejects_unpinned_builder_image_and_bad_integrity() {
    let mut value = base_manifest();
    value["reproducibleBuild"] = json!({
        "commitHash": "a94f2c8d1e7b0a3c5d6e7f8091a2b3c4d5e6f708",
        "builderImage": "builder:latest"
    });
    assert!(rules(&value).contains(&"M-17"));

    let mut value = base_manifest();
    value["reproducibleBuild"] = json!({
        "commitHash": "a94f2c8d1e7b0a3c5d6e7f8091a2b3c4d5e6f708",
        "builderImage": format!("ghcr.io/reinvy/mapp-builder@sha256:{}", "1".repeat(64))
    });
    assert!(issues_for(&value).is_empty());

    let mut value = base_manifest();
    value["entry"]["integrity"] = json!("sha256-deadbeef");
    assert!(rules(&value).contains(&"M-18"));
}

#[test]
fn ignores_unknown_additive_fields_inside_major_two() {
    let mut value = base_manifest();
    value["futureField"] = json!({ "nested": true });
    value["runtime"]["futureCapability"] = json!("nothing");
    assert_eq!(issues_for(&value), Vec::<manifest::Issue>::new());
}

#[test]
fn rejects_bom_missing_fields_and_secrets() {
    let value = base_manifest();
    let with_bom = format!("\u{feff}{}", value);
    let issues = manifest::validate(&with_bom);
    assert_eq!(issues[0].rule, "M-01");

    let mut value = base_manifest();
    value.as_object_mut().unwrap().remove("license");
    assert!(rules(&value).contains(&"M-02"));

    let mut value = base_manifest();
    value["security"] = json!({ "apiToken": "sk-live-123" });
    assert!(rules(&value).contains(&"M-24"));
}

#[test]
fn host_version_gate_compares_semver() {
    assert!(host_supports("2.0.0", "2.0.0").unwrap());
    assert!(host_supports("2.1.3", "2.0.0").unwrap());
    assert!(!host_supports("1.9.9", "2.0.0").unwrap());
    assert!(host_supports("2.0.0", "not-semver").is_err());
}
