//! `microapp.manifest.json` v2 validation.
//!
//! The web-only schema from `docs/03-specs/manifest.md` is the single contract:
//! there is no native engine, no `dist/` layout, no SRI, and no
//! `permissions.required/optional`. Unknown fields are rejected rather than
//! ignored, so a v1/native manifest fails loudly with `E-PACK-001`.
//!
//! The parser accepts *unfilled* authoring fields (`integrity.contentHash` and
//! `signature.value` may be empty, `integrity.files` may be empty) because the
//! packer fills them. Verification still compares the computed values, so an
//! unfilled package can never pass.

use std::collections::{BTreeMap, HashSet};
use std::sync::LazyLock;

use base64::Engine;
use regex::Regex;
use serde::{Deserialize, Serialize};

use crate::error::{CoreError, CoreResult};

pub const SCHEMA_VERSION: u32 = 2;
pub const UI_ENGINE: &str = "muip-web";
pub const UI_PROTOCOL: u32 = 1;
pub const MAX_NETWORK_ALLOWLIST: usize = 16;
pub const MAX_NAME_CHARS: usize = 80;

/// The eight documented web permission IDs (`docs/03-specs/permissions.md`).
pub const PERMISSION_CATALOG: &[&str] = &[
    "clipboard.read",
    "clipboard.write",
    "notifications.local",
    "files.pick",
    "network.fetch",
    "storage.app",
    "vault.read",
    "share.export",
];

/// The only capabilities a web manifest may declare.
pub const CAPABILITY_CATALOG: &[&str] = &["ui.muip", "storage.app"];

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct Issue {
    pub rule: &'static str,
    pub field: String,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct Entry {
    pub bundle: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct Integrity {
    pub algorithm: String,
    #[serde(rename = "contentHash")]
    pub content_hash: String,
    pub files: BTreeMap<String, String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct SignatureBlock {
    pub algorithm: String,
    #[serde(rename = "keyId")]
    pub key_id: String,
    pub value: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct Signature {
    pub algorithm: String,
    #[serde(rename = "keyId")]
    pub key_id: String,
    pub value: String,
    /// Registry co-signature, present only for registry/enterprise packages.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub registry: Option<SignatureBlock>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct Ui {
    pub engine: String,
    pub protocol: u32,
}

fn default_assets_dir() -> String {
    "assets/".to_string()
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct Manifest {
    #[serde(rename = "schemaVersion")]
    pub schema_version: u32,
    pub id: String,
    pub name: String,
    pub version: String,
    pub entry: Entry,
    #[serde(rename = "assetsDir", default = "default_assets_dir")]
    pub assets_dir: String,
    pub integrity: Integrity,
    pub signature: Signature,
    pub offline: bool,
    pub permissions: Vec<String>,
    #[serde(rename = "networkAllowlist", default, skip_serializing_if = "Option::is_none")]
    pub network_allowlist: Option<Vec<String>>,
    #[serde(default)]
    pub capabilities: Vec<String>,
    pub ui: Ui,
}

impl Manifest {
    /// Declared permissions as a slice (the old required/optional split is gone).
    pub fn permissions(&self) -> &[String] {
        &self.permissions
    }

    pub fn network_allowlist(&self) -> &[String] {
        self.network_allowlist.as_deref().unwrap_or(&[])
    }

    pub fn has_permission(&self, permission: &str) -> bool {
        self.permissions.iter().any(|candidate| candidate == permission)
    }

    /// Manifest with the digest and every signature value empty: the input to
    /// `contentHash` computation.
    ///
    /// The registry block's `value` is cleared too. A registry co-signature is
    /// produced over the same message as the author signature, so its bytes
    /// cannot be part of the digest or of the message it signs.
    pub fn canonical_hash_manifest(&self) -> Manifest {
        let mut clone = self.clone();
        clone.integrity.content_hash = String::new();
        clone.clear_signature_values();
        clone
    }

    /// Manifest with every signature value empty: the message both keys sign.
    pub fn signature_manifest(&self) -> Manifest {
        let mut clone = self.clone();
        clone.clear_signature_values();
        clone
    }

    fn clear_signature_values(&mut self) {
        self.signature.value.clear();
        if let Some(registry) = &mut self.signature.registry {
            registry.value.clear();
        }
    }
}

static ID_REGEX: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"^[a-z][a-z0-9]*(\.[a-z0-9]+){1,4}$").expect("valid id regex")
});
static VERSION_REGEX: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$")
        .expect("valid version regex")
});
static BUNDLE_REGEX: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"^bundle/[A-Za-z0-9._-]+\.js$").expect("valid bundle regex")
});
static ASSETS_DIR_REGEX: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"^[A-Za-z0-9._-]+/$").expect("valid assets dir regex")
});
static FILE_PATH_REGEX: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"^(bundle|assets)/[A-Za-z0-9._/-]+$").expect("valid file path regex")
});
static HEX64_REGEX: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"^[0-9a-f]{64}$").expect("valid hex regex"));
static KEY_ID_REGEX: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"^ed25519:[0-9a-f]{64}$").expect("valid key id regex")
});

pub fn is_valid_id(id: &str) -> bool {
    id.len() <= 128 && ID_REGEX.is_match(id)
}

pub fn is_hex64(value: &str) -> bool {
    HEX64_REGEX.is_match(value)
}

pub fn is_key_id(value: &str) -> bool {
    KEY_ID_REGEX.is_match(value)
}

pub fn is_bundle_path(value: &str) -> bool {
    BUNDLE_REGEX.is_match(value)
}

pub fn is_allowed_file_path(value: &str) -> bool {
    // LICENSE is a payload file too: it is not a bundle/asset, but the v2
    // layout allows it at the package root.
    (value == "LICENSE" || FILE_PATH_REGEX.is_match(value))
        && !value.split('/').any(|segment| segment == "..")
}

fn push(issues: &mut Vec<Issue>, rule: &'static str, field: &str, message: impl Into<String>) {
    issues.push(Issue { rule, field: field.to_string(), message: message.into() });
}

/// Validate `version` as the strict `MAJOR.MINOR.PATCH` the schema allows.
pub fn validate_version(version: &str) -> CoreResult<()> {
    if VERSION_REGEX.is_match(version) {
        Ok(())
    } else {
        Err(CoreError::Manifest("version must be MAJOR.MINOR.PATCH".into()))
    }
}

/// Validate a base64 Ed25519 signature value.
pub fn decode_signature_base64(value: &str) -> CoreResult<[u8; crate::crypto::SIGNATURE_LEN]> {
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(value)
        .map_err(|_| CoreError::Signature("signature is not valid base64".into()))?;
    if bytes.len() != crate::crypto::SIGNATURE_LEN {
        return Err(CoreError::Signature("signature must be 64 bytes".into()));
    }
    let mut out = [0u8; crate::crypto::SIGNATURE_LEN];
    out.copy_from_slice(&bytes);
    Ok(out)
}

/// An `https://` origin only: no credentials, path, query, or fragment.
fn check_https_origin(origin: &str) -> Result<(), &'static str> {
    if origin.len() > 2048 {
        return Err("allowlist entry is too long");
    }
    let rest = origin.strip_prefix("https://").ok_or("must start with https://")?;
    if rest.contains('@') {
        return Err("credentials are not allowed in an origin");
    }
    if rest.contains('?') || rest.contains('#') {
        return Err("query and fragment are not allowed in an origin");
    }
    let authority = match rest.split_once('/') {
        Some((authority, path)) => {
            if !path.is_empty() {
                return Err("must be an origin without a path");
            }
            authority
        }
        None => rest,
    };
    let (host, port) = match authority.rsplit_once(':') {
        Some((host, port)) => (host, Some(port)),
        None => (authority, None),
    };
    if host.is_empty() || host.starts_with('.') || host.ends_with('.') {
        return Err("origin host is invalid");
    }
    for label in host.split('.') {
        if label.is_empty()
            || !label.chars().all(|ch| ch.is_ascii_alphanumeric() || ch == '-')
            || label.starts_with('-')
            || label.ends_with('-')
        {
            return Err("origin host is invalid");
        }
    }
    if let Some(port) = port {
        if port.is_empty() || !port.chars().all(|ch| ch.is_ascii_digit()) {
            return Err("origin port is invalid");
        }
    }
    Ok(())
}

/// Parse and validate a manifest, returning every violation instead of the first.
pub fn validate(json: &str) -> Vec<Issue> {
    let mut issues = Vec::new();
    if json.starts_with('\u{feff}') {
        push(&mut issues, "encoding", "manifest", "UTF-8 BOM is not allowed");
        return issues;
    }
    let manifest: Manifest = match serde_json::from_str(json) {
        Ok(manifest) => manifest,
        Err(err) => {
            push(&mut issues, "schema", "manifest", err.to_string());
            return issues;
        }
    };
    validate_manifest(&manifest, &mut issues);
    issues
}

fn validate_manifest(m: &Manifest, issues: &mut Vec<Issue>) {
    if m.schema_version != SCHEMA_VERSION {
        push(
            &mut *issues,
            "schemaVersion",
            "schemaVersion",
            format!("must be {SCHEMA_VERSION}; v1 manifests are not migrated"),
        );
    }
    if !is_valid_id(&m.id) {
        push(&mut *issues, "id", "id", "must match ^[a-z][a-z0-9]*(\\.[a-z0-9]+){1,4}$");
    }
    let name_len = m.name.chars().count();
    if name_len == 0 || name_len > MAX_NAME_CHARS {
        push(
            &mut *issues,
            "name",
            "name",
            format!("must be 1..={MAX_NAME_CHARS} characters"),
        );
    }
    if let Err(err) = validate_version(&m.version) {
        push(&mut *issues, "version", "version", err.to_string());
    }
    if !is_bundle_path(&m.entry.bundle) {
        push(
            &mut *issues,
            "entry.bundle",
            "entry.bundle",
            "must match bundle/<name>.js under the package root",
        );
    }
    if !ASSETS_DIR_REGEX.is_match(&m.assets_dir) {
        push(
            &mut *issues,
            "assetsDir",
            "assetsDir",
            "must be a relative directory ending in '/'",
        );
    }
    if m.integrity.algorithm != "sha256" {
        push(&mut *issues, "integrity.algorithm", "integrity.algorithm", "must be sha256");
    }
    if !m.integrity.content_hash.is_empty() && !is_hex64(&m.integrity.content_hash) {
        push(
            &mut *issues,
            "integrity.contentHash",
            "integrity.contentHash",
            "must be 64 lowercase hex characters",
        );
    }
    for (path, digest) in &m.integrity.files {
        if !is_allowed_file_path(path) {
            push(
                &mut *issues,
                "integrity.files",
                "integrity.files",
                format!("path {path} is outside bundle/, assets/, and LICENSE"),
            );
        }
        if !digest.is_empty() && !is_hex64(digest) {
            push(
                &mut *issues,
                "integrity.files",
                "integrity.files",
                format!("digest for {path} must be 64 lowercase hex characters"),
            );
        }
    }
    if !m.integrity.files.is_empty() && !m.integrity.files.contains_key(&m.entry.bundle) {
        push(
            &mut *issues,
            "integrity.files",
            "integrity.files",
            "must include the declared entry bundle",
        );
    }
    if m.signature.algorithm != "ed25519" {
        push(&mut *issues, "signature.algorithm", "signature.algorithm", "must be ed25519");
    }
    if !m.signature.key_id.is_empty() && !is_key_id(&m.signature.key_id) {
        push(
            &mut *issues,
            "signature.keyId",
            "signature.keyId",
            "must be ed25519:<64 lowercase hex public key>",
        );
    }
    if !m.signature.value.is_empty() && decode_signature_base64(&m.signature.value).is_err() {
        push(
            &mut *issues,
            "signature.value",
            "signature.value",
            "must be a base64 64-byte signature",
        );
    }
    if let Some(registry) = &m.signature.registry {
        if registry.algorithm != "ed25519" {
            push(
                &mut *issues,
                "signature.registry.algorithm",
                "signature.registry.algorithm",
                "must be ed25519",
            );
        }
        if !is_key_id(&registry.key_id) {
            push(
                &mut *issues,
                "signature.registry.keyId",
                "signature.registry.keyId",
                "must be ed25519:<64 lowercase hex public key>",
            );
        }
        if !registry.value.is_empty() && decode_signature_base64(&registry.value).is_err() {
            push(
                &mut *issues,
                "signature.registry.value",
                "signature.registry.value",
                "must be a base64 64-byte signature",
            );
        }
    }
    let mut seen = HashSet::new();
    for permission in &m.permissions {
        if !PERMISSION_CATALOG.contains(&permission.as_str()) {
            push(
                &mut *issues,
                "permissions",
                "permissions",
                format!("unknown permission {permission}"),
            );
        }
        if !seen.insert(permission.as_str()) {
            push(
                &mut *issues,
                "permissions",
                "permissions",
                format!("duplicate permission {permission}"),
            );
        }
    }
    if let Some(allowlist) = &m.network_allowlist {
        if allowlist.len() > MAX_NETWORK_ALLOWLIST {
            push(
                &mut *issues,
                "networkAllowlist",
                "networkAllowlist",
                format!("must contain at most {MAX_NETWORK_ALLOWLIST} entries"),
            );
        }
        if !allowlist.is_empty() && !m.has_permission("network.fetch") {
            push(
                &mut *issues,
                "networkAllowlist",
                "networkAllowlist",
                "is only allowed when network.fetch is declared",
            );
        }
        let mut unique = HashSet::new();
        for origin in allowlist {
            if let Err(message) = check_https_origin(origin) {
                push(
                    &mut *issues,
                    "networkAllowlist",
                    "networkAllowlist",
                    format!("{origin}: {message}"),
                );
            }
            if !unique.insert(origin.as_str()) {
                push(
                    &mut *issues,
                    "networkAllowlist",
                    "networkAllowlist",
                    format!("duplicate origin {origin}"),
                );
            }
        }
    }
    let mut capability_seen = HashSet::new();
    for capability in &m.capabilities {
        if !CAPABILITY_CATALOG.contains(&capability.as_str()) {
            push(
                &mut *issues,
                "capabilities",
                "capabilities",
                format!("unknown capability {capability}"),
            );
        }
        if !capability_seen.insert(capability.as_str()) {
            push(
                &mut *issues,
                "capabilities",
                "capabilities",
                format!("duplicate capability {capability}"),
            );
        }
    }
    if m.ui.engine != UI_ENGINE {
        push(&mut *issues, "ui.engine", "ui.engine", format!("must be {UI_ENGINE}"));
    }
    if m.ui.protocol != UI_PROTOCOL {
        push(&mut *issues, "ui.protocol", "ui.protocol", format!("must be {UI_PROTOCOL}"));
    }
}

/// Validate and return the typed manifest, collapsing issues into one error.
pub fn parse(json: &str) -> CoreResult<Manifest> {
    let issues = validate(json);
    if !issues.is_empty() {
        let summary = issues
            .iter()
            .map(|issue| format!("{} {}: {}", issue.rule, issue.field, issue.message))
            .collect::<Vec<_>>()
            .join("; ");
        return Err(CoreError::Manifest(summary));
    }
    Ok(serde_json::from_str(json)?)
}

/// Serialize a manifest as canonical JCS bytes without a trailing newline.
pub fn to_jcs(manifest: &Manifest) -> CoreResult<Vec<u8>> {
    crate::crypto::jcs(manifest)
}

/// `contentHash` input: JCS bytes with the digest and signature placeholders empty.
pub fn canonical_hash_jcs(manifest: &Manifest) -> CoreResult<Vec<u8>> {
    to_jcs(&manifest.canonical_hash_manifest())
}

/// Signed message: JCS bytes of the final manifest with `signature.value` empty.
pub fn signature_message(manifest: &Manifest) -> CoreResult<Vec<u8>> {
    to_jcs(&manifest.signature_manifest())
}
