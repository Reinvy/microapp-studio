//! Manifest v2 validation.
//!
//! Rules M-01 … M-24 from `docs/03-specs/manifest-v2.md` are enforced here. The
//! parser is deliberately permissive about unknown *additive* fields inside
//! major 2 (M-23) while the authoring JSON Schema stays strict
//! (`additionalProperties: false`).

use regex::Regex;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::sync::LazyLock;

use crate::error::{CoreError, CoreResult};
use crate::guard;

pub const SCHEMA_VERSION: &str = "2.0-open";
pub const MAX_MEMORY_MB: u32 = 512;
pub const MIN_MEMORY_MB: u32 = 64;
pub const DEFAULT_STORAGE_QUOTA_MB: u32 = 10;

/// Permission IDs from `docs/03-specs/permissions.md` §4.1.
pub const PERMISSION_CATALOG: &[&str] = &[
    "storage.local",
    "storage.local.sqlite",
    "camera",
    "camera.qr",
    "microphone",
    "location",
    "biometrics",
    "filesystem.picker",
    "bluetooth",
    "nfc",
    "notifications.local",
    "local_ai.inference",
    "network.allowlist",
];

/// Intent IDs accepted by the intent bus.
pub const INTENT_CATALOG: &[&str] = &[
    "text.plain",
    "json.structured",
    "image.photo",
    "image.receipt",
    "document.pdf",
    "data.csv",
    "url.open",
    "file.any",
];

/// SPDX identifiers embedded in the core so validation works offline.
pub const SPDX_ALLOWLIST: &[&str] = &[
    "0BSD",
    "AGPL-3.0-only",
    "Apache-2.0",
    "BSD-2-Clause",
    "BSD-3-Clause",
    "BSL-1.0",
    "CC-BY-4.0",
    "CC0-1.0",
    "EPL-2.0",
    "GPL-2.0-only",
    "GPL-3.0-only",
    "ISC",
    "LGPL-2.1-only",
    "LGPL-3.0-only",
    "MIT",
    "MPL-2.0",
    "Unlicense",
    "Zlib",
];

pub const WIDGET_SIZES: &[&str] = &["1x1", "2x1", "2x2", "3x2", "4x2"];
pub const VIEWPORTS: &[&str] = &["mobile", "tablet", "desktop", "widget"];
pub const PUBLISHER_SOURCES: &[&str] = &["registry", "git", "local", "enterprise"];

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct Issue {
    pub rule: &'static str,
    pub field: String,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct Publisher {
    #[serde(rename = "keyId")]
    pub key_id: String,
    pub fingerprint: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub source: Option<String>,
}

impl Publisher {
    pub fn source(&self) -> &str {
        self.source.as_deref().unwrap_or("registry")
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ReproducibleBuild {
    #[serde(rename = "commitHash")]
    pub commit_hash: String,
    #[serde(rename = "builderImage")]
    pub builder_image: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct Entry {
    pub bundle: String,
    #[serde(rename = "assetsDir")]
    pub assets_dir: String,
    #[serde(rename = "uiEngine")]
    pub ui_engine: String,
    pub integrity: String,
    pub signature: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct Offline {
    pub mode: String,
    #[serde(rename = "requiresInternet")]
    pub requires_internet: bool,
    #[serde(rename = "localDbSchema")]
    pub local_db_schema: String,
    #[serde(rename = "syncStrategy")]
    pub sync_strategy: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct Runtime {
    pub isolation: String,
    #[serde(rename = "maxMemoryMb")]
    pub max_memory_mb: u32,
    #[serde(rename = "supportedViewports")]
    pub supported_viewports: Vec<String>,
    #[serde(rename = "secureDisplay", default)]
    pub secure_display: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Default)]
pub struct Quotas {
    #[serde(rename = "storageMb", default)]
    pub storage_mb: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct Permissions {
    pub required: Vec<String>,
    pub optional: Vec<String>,
    #[serde(rename = "networkAllowlist")]
    pub network_allowlist: Vec<String>,
    #[serde(default)]
    pub quotas: Option<Quotas>,
}

impl Permissions {
    pub fn storage_quota_mb(&self) -> u32 {
        self.quotas
            .as_ref()
            .and_then(|q| q.storage_mb)
            .unwrap_or(DEFAULT_STORAGE_QUOTA_MB)
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct LocalAi {
    #[serde(rename = "optionalCapabilities")]
    pub optional_capabilities: Vec<String>,
    #[serde(rename = "recommendedModelSize")]
    pub recommended_model_size: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct Widget {
    pub id: String,
    pub sizes: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct Capabilities {
    #[serde(rename = "intentsIn")]
    pub intents_in: Vec<String>,
    #[serde(rename = "intentsOut")]
    pub intents_out: Vec<String>,
    pub widgets: Vec<Widget>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct Manifest {
    #[serde(rename = "schemaVersion")]
    pub schema_version: String,
    pub id: String,
    pub name: String,
    pub version: String,
    pub license: String,
    pub repository: String,
    pub publisher: Publisher,
    #[serde(rename = "minHostVersion")]
    pub min_host_version: String,
    #[serde(rename = "contentHash")]
    pub content_hash: String,
    #[serde(rename = "reproducibleBuild", default)]
    pub reproducible_build: Option<ReproducibleBuild>,
    pub entry: Entry,
    pub offline: Offline,
    pub runtime: Runtime,
    pub permissions: Permissions,
    #[serde(rename = "localAi", default)]
    pub local_ai: Option<LocalAi>,
    pub capabilities: Capabilities,
}

static ID_REGEX: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"^[a-z][a-z0-9]*(\.[a-z][a-z0-9-]*)+$").expect("valid id regex")
});
static HEX16_REGEX: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"^[0-9a-f]{16}$").expect("valid hex regex"));
static HEX40_REGEX: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"^[0-9a-f]{40}$").expect("valid hex regex"));
static HEX64_REGEX: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"^[0-9a-f]{64}$").expect("valid hex regex"));

fn id_regex() -> &'static Regex {
    &ID_REGEX
}

fn hex16(value: &str) -> bool {
    HEX16_REGEX.is_match(value)
}

fn hex40(value: &str) -> bool {
    HEX40_REGEX.is_match(value)
}

fn hex64(value: &str) -> bool {
    HEX64_REGEX.is_match(value)
}

fn push(issues: &mut Vec<Issue>, rule: &'static str, field: &str, message: impl Into<String>) {
    issues.push(Issue { rule, field: field.to_string(), message: message.into() });
}

/// Validate `version` as semver with only `-beta.N` / `-rc.N` prereleases (M-05).
pub fn validate_version(version: &str) -> CoreResult<()> {
    if version.starts_with('v') {
        return Err(CoreError::Manifest("version must not start with 'v'".into()));
    }
    let parsed = semver::Version::parse(version)
        .map_err(|e| CoreError::Manifest(format!("version is not semver: {e}")))?;
    let pre = parsed.pre.as_str();
    if !pre.is_empty() {
        let ok = (pre.starts_with("beta.") || pre.starts_with("rc."))
            && pre
                .split_once('.')
                .map(|(_, n)| !n.is_empty() && n.chars().all(|c| c.is_ascii_digit()) && !n.starts_with('0'))
                .unwrap_or(false);
        if !ok {
            return Err(CoreError::Manifest(
                "prerelease must be -beta.N or -rc.N".into(),
            ));
        }
    }
    Ok(())
}

/// Host-version gate: the host version must be >= `minHostVersion` (M-08).
pub fn host_supports(host_version: &str, min_host_version: &str) -> CoreResult<bool> {
    let host = semver::Version::parse(host_version)
        .map_err(|e| CoreError::Manifest(format!("host version invalid: {e}")))?;
    let min = semver::Version::parse(min_host_version)
        .map_err(|e| CoreError::Manifest(format!("minHostVersion invalid: {e}")))?;
    Ok(host >= min)
}

/// Presence/absence check for the sensitive fields banned by M-24.
fn scan_secrets(value: &Value, path: &str, issues: &mut Vec<Issue>) {
    match value {
        Value::Object(map) => {
            for (key, nested) in map {
                let lower = key.to_ascii_lowercase().replace(['_', '-'], "");
                let sensitive = matches!(
                    lower.as_str(),
                    "token"
                        | "apitoken"
                        | "authtoken"
                        | "sessiontoken"
                        | "accesstoken"
                        | "refreshtoken"
                        | "secret"
                        | "clientsecret"
                        | "secretkey"
                        | "privatekey"
                        | "password"
                        | "apikey"
                        | "credential"
                        | "credentials"
                );
                let nested_path = if path.is_empty() {
                    key.clone()
                } else {
                    format!("{path}.{key}")
                };
                if sensitive && !nested.is_null() && nested != &Value::String(String::new()) {
                    push(
                        issues,
                        "M-24",
                        &nested_path,
                        "manifest must not carry secrets; reference Vault instead",
                    );
                }
                scan_secrets(nested, &nested_path, issues);
            }
        }
        Value::Array(items) => {
            for (index, nested) in items.iter().enumerate() {
                scan_secrets(nested, &format!("{path}[{index}]"), issues);
            }
        }
        _ => {}
    }
}

/// Parse and validate a manifest, returning every violation instead of the first.
pub fn validate(json: &str) -> Vec<Issue> {
    let mut issues = Vec::new();
    if json.starts_with('\u{feff}') {
        push(&mut issues, "M-01", "manifest.json", "UTF-8 BOM is not allowed");
        return issues;
    }
    let value: Value = match serde_json::from_str(json) {
        Ok(value) => value,
        Err(err) => {
            push(&mut issues, "M-01", "manifest.json", format!("invalid JSON: {err}"));
            return issues;
        }
    };
    scan_secrets(&value, "", &mut issues);
    let manifest: Manifest = match serde_json::from_value(value.clone()) {
        Ok(manifest) => manifest,
        Err(err) => {
            let field = serde_error_field(&err.to_string());
            push(&mut issues, "M-02", &field, err.to_string());
            return issues;
        }
    };
    validate_manifest(&manifest, &mut issues);
    issues
}

fn serde_error_field(message: &str) -> String {
    // serde reports `missing field \`name\`` or `invalid type: ... for key \`k\``.
    if let Some(start) = message.find('`') {
        if let Some(end) = message[start + 1..].find('`') {
            return message[start + 1..start + 1 + end].to_string();
        }
    }
    "manifest".to_string()
}

fn validate_manifest(m: &Manifest, issues: &mut Vec<Issue>) {
    if m.schema_version != SCHEMA_VERSION {
        push(&mut *issues, "M-03", "schemaVersion", format!("must be {SCHEMA_VERSION}"));
    }
    if !id_regex().is_match(&m.id) {
        push(&mut *issues, "M-04", "id", "must be reverse-DNS with at least two segments");
    }
    if let Err(err) = validate_version(&m.version) {
        push(&mut *issues, "M-05", "version", err.to_string());
    }
    if !SPDX_ALLOWLIST.contains(&m.license.as_str()) {
        push(&mut *issues, "M-06", "license", "not an embedded SPDX identifier");
    }
    let source = m.publisher.source();
    if !PUBLISHER_SOURCES.contains(&source) {
        push(&mut *issues, "M-06", "publisher.source", "unknown publisher source");
    }
    if m.repository.is_empty() {
        if source != "local" {
            push(
                issues,
                "M-06",
                "repository",
                "empty repository is only valid when publisher.source is local",
            );
        }
    } else if !(m.repository.starts_with("https://") || m.repository.starts_with("http://localhost")) {
        push(&mut *issues, "M-06", "repository", "must be an https URL");
    }
    if !hex16(&m.publisher.key_id) {
        push(&mut *issues, "M-07", "publisher.keyId", "must be 16 lowercase hex characters");
    }
    if !hex64(&m.publisher.fingerprint) {
        push(&mut *issues, "M-07", "publisher.fingerprint", "must be 64 lowercase hex characters");
    }
    if let Err(err) = semver::Version::parse(&m.min_host_version) {
        push(&mut *issues, "M-08", "minHostVersion", format!("not semver: {err}"));
    }
    if let Some(hash) = m.content_hash.strip_prefix("sha256-") {
        if !hex64(hash) {
            push(&mut *issues, "M-09", "contentHash", "must be sha256-<64 hex>");
        }
    } else {
        push(&mut *issues, "M-09", "contentHash", "must start with sha256-");
    }
    for (field, value) in [
        ("entry.bundle", &m.entry.bundle),
        ("entry.assetsDir", &m.entry.assets_dir),
        ("offline.localDbSchema", &m.offline.local_db_schema),
    ] {
        let trimmed = value.trim_end_matches('/');
        if trimmed.is_empty() {
            push(&mut *issues, "M-10", field, "path must not be empty");
            continue;
        }
        if let Err(err) = guard::check_path(trimmed) {
            push(&mut *issues, "M-10", field, err.to_string());
        }
    }
    if m.entry.ui_engine != "hybrid-native" {
        push(&mut *issues, "M-10", "entry.uiEngine", "must be hybrid-native");
    }
    if m.offline.mode != "offline-first" {
        push(&mut *issues, "M-11", "offline.mode", "must be offline-first");
    }
    if m.offline.sync_strategy != "crdt-hlc" {
        push(&mut *issues, "M-11", "offline.syncStrategy", "must be crdt-hlc");
    }
    if m.offline.requires_internet {
        push(&mut *issues, "M-11", "offline.requiresInternet", "must be false");
    }
    if m.runtime.isolation != "strict-sandbox" {
        push(&mut *issues, "M-12", "runtime.isolation", "must be strict-sandbox");
    }
    if !(MIN_MEMORY_MB..=MAX_MEMORY_MB).contains(&m.runtime.max_memory_mb) {
        push(
            issues,
            "M-12",
            "runtime.maxMemoryMb",
            format!("must be between {MIN_MEMORY_MB} and {MAX_MEMORY_MB}"),
        );
    }
    if m.runtime.supported_viewports.is_empty() {
        push(&mut *issues, "M-12", "runtime.supportedViewports", "must not be empty");
    }
    for viewport in &m.runtime.supported_viewports {
        if !VIEWPORTS.contains(&viewport.as_str()) {
            push(&mut *issues, "M-12", "runtime.supportedViewports", format!("unknown viewport {viewport}"));
        }
    }
    for permission in m.permissions.required.iter().chain(m.permissions.optional.iter()) {
        if !PERMISSION_CATALOG.contains(&permission.as_str()) {
            push(&mut *issues, "M-13", "permissions", format!("unknown permission {permission}"));
        }
    }
    for permission in &m.permissions.required {
        if m.permissions.optional.contains(permission) {
            push(
                issues,
                "M-13",
                "permissions",
                format!("{permission} appears in both required and optional"),
            );
        }
    }
    let quota = m.permissions.storage_quota_mb();
    if !(1..=1024).contains(&quota) {
        push(&mut *issues, "M-13", "permissions.quotas.storageMb", "must be 1..=1024");
    }
    for entry in &m.permissions.network_allowlist {
        if let Err(err) = guard::check_domain(entry) {
            push(&mut *issues, "M-14", "permissions.networkAllowlist", err.to_string());
        }
    }
    if let Some(local_ai) = &m.local_ai {
        for capability in &local_ai.optional_capabilities {
            if !matches!(
                capability.as_str(),
                "text-classification" | "receipt-ocr" | "summarization" | "embedding"
            ) {
                push(
                    issues,
                    "M-15",
                    "localAi.optionalCapabilities",
                    format!("unknown capability {capability}"),
                );
            }
        }
        if !matches!(
            local_ai.recommended_model_size.as_str(),
            "small-3b" | "medium-7b" | "large-13b"
        ) {
            push(
                issues,
                "M-15",
                "localAi.recommendedModelSize",
                "unknown model size",
            );
        }
    }
    for intent in m.capabilities.intents_in.iter().chain(m.capabilities.intents_out.iter()) {
        if !INTENT_CATALOG.contains(&intent.as_str()) {
            push(&mut *issues, "M-16", "capabilities", format!("unknown intent {intent}"));
        }
    }
    let mut widget_ids = std::collections::HashSet::new();
    for widget in &m.capabilities.widgets {
        if !widget_ids.insert(widget.id.clone()) {
            push(&mut *issues, "M-16", "capabilities.widgets", format!("duplicate widget {}", widget.id));
        }
        if widget.sizes.is_empty() {
            push(&mut *issues, "M-16", "capabilities.widgets", "sizes must not be empty");
        }
        for size in &widget.sizes {
            if !WIDGET_SIZES.contains(&size.as_str()) {
                push(&mut *issues, "M-16", "capabilities.widgets", format!("unknown size {size}"));
            }
        }
    }
    if let Some(build) = &m.reproducible_build {
        if !hex40(&build.commit_hash) {
            push(&mut *issues, "M-17", "reproducibleBuild.commitHash", "must be 40 hex");
        }
        let digest_ok = build
            .builder_image
            .rsplit_once("@sha256:")
            .map(|(reference, digest)| !reference.is_empty() && hex64(digest))
            .unwrap_or(false);
        if !digest_ok {
            push(
                issues,
                "M-17",
                "reproducibleBuild.builderImage",
                "must be image@sha256:<64 hex>",
            );
        }
    }
    if !m.entry.integrity.starts_with("sha384-") || m.entry.integrity.len() <= 7 {
        push(&mut *issues, "M-18", "entry.integrity", "must be sha384-<base64>");
    }
    if !m.entry.signature.starts_with("ed25519-") {
        push(&mut *issues, "M-18", "entry.signature", "must be ed25519-<keyId>");
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

/// Serialize a manifest as canonical JCS bytes without a trailing newline (M-01)
/// with `contentHash` replaced by the digest placeholder (M-09).
pub fn jcs_with_placeholder(manifest: &Manifest) -> CoreResult<Vec<u8>> {
    let mut value = serde_json::to_value(manifest)?;
    if let Value::Object(map) = &mut value {
        map.insert(
            "contentHash".to_string(),
            Value::String(format!("sha256-{}", "0".repeat(64))),
        );
    }
    crate::crypto::jcs(&value)
}

/// Serialize a manifest as canonical JCS bytes without a trailing newline.
pub fn jcs_manifest(manifest: &Manifest) -> CoreResult<Vec<u8>> {
    let value = serde_json::to_value(manifest)?;
    crate::crypto::jcs(&value)
}
