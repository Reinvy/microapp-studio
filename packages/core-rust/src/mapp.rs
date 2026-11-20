//! `.mapp` package format: deterministic ZIP writer, verifier, and extractor.
//!
//! Digest rule (ADR-0013, `manifest-v2.md` §4.5): `contentHash` and both
//! signatures cover the canonical ZIP built **without** `signatures/` and with
//! `manifest.json.contentHash` replaced by `sha256-` + 64 zeros.

use std::collections::BTreeMap;
use std::collections::HashSet;
use std::io::{Cursor, Read, Write};

use ed25519_dalek::SigningKey;
use serde::{Deserialize, Serialize};
use zip::write::SimpleFileOptions;
use zip::{CompressionMethod, DateTime, ZipArchive, ZipWriter};

use crate::crypto::{ct_eq, ed25519_public, ed25519_sign, ed25519_verify, sha256, KEY_LEN, SIGNATURE_LEN};
use crate::error::{CoreError, CoreResult};
use crate::guard;
use crate::manifest::{self, Manifest};

pub const MAX_DECOMPRESSED_BYTES: u64 = 256 * 1024 * 1024;
pub const MAX_COMPRESSED_BYTES: u64 = 64 * 1024 * 1024;
pub const MAX_ENTRIES: usize = 10_000;
pub const AUTHOR_SIGNATURE_PATH: &str = "signatures/author.ed25519";
pub const REGISTRY_SIGNATURE_PATH: &str = "signatures/registry.ed25519";
pub const MANIFEST_PATH: &str = "manifest.json";

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct MappEntry {
    pub path: String,
    pub is_dir: bool,
    pub data: Vec<u8>,
}

impl MappEntry {
    pub fn file(path: impl Into<String>, data: impl Into<Vec<u8>>) -> Self {
        Self { path: path.into(), is_dir: false, data: data.into() }
    }

    pub fn dir(path: impl Into<String>) -> Self {
        let mut path = path.into();
        if !path.ends_with('/') {
            path.push('/');
        }
        Self { path, is_dir: true, data: Vec::new() }
    }
}

/// Where a package came from; decides which signatures are mandatory.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum InstallSource {
    Local,
    Registry,
    Enterprise,
    Git,
}

impl InstallSource {
    pub fn as_str(&self) -> &'static str {
        match self {
            InstallSource::Local => "local",
            InstallSource::Registry => "registry",
            InstallSource::Enterprise => "enterprise",
            InstallSource::Git => "git",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VerifiedMapp {
    pub manifest: Manifest,
    pub digest: [u8; 32],
    pub author_signature: Option<Vec<u8>>,
    pub registry_signature: Option<Vec<u8>>,
    pub entry_count: usize,
    pub decompressed_bytes: u64,
}

fn canonical_zip(entries: &[MappEntry]) -> CoreResult<Vec<u8>> {
    let mut sorted: Vec<&MappEntry> = entries.iter().collect();
    sorted.sort_by(|a, b| a.path.as_bytes().cmp(b.path.as_bytes()));
    let mut writer = ZipWriter::new(Cursor::new(Vec::new()));
    let epoch = DateTime::default();
    for entry in sorted {
        let mut options = SimpleFileOptions::default()
            .last_modified_time(epoch)
            .unix_permissions(if entry.is_dir { 0o755 } else { 0o644 });
        if entry.is_dir {
            options = options.compression_method(CompressionMethod::Stored);
            writer.add_directory(entry.path.trim_end_matches('/'), options)?;
        } else {
            options = options
                .compression_method(CompressionMethod::Deflated)
                .compression_level(Some(9));
            writer.start_file(entry.path.as_str(), options)?;
            writer.write_all(&entry.data)?;
        }
    }
    let cursor = writer.finish()?;
    Ok(cursor.into_inner())
}

fn ensure_layout(entries: &[MappEntry]) -> CoreResult<()> {
    let mut has_dist = false;
    for entry in entries {
        if entry.is_dir {
            continue;
        }
        if let Some(rest) = entry.path.strip_prefix("dist/") {
            if !rest.is_empty() {
                has_dist = true;
            }
        }
    }
    if !has_dist {
        return Err(CoreError::Package("package must contain dist/ files".into()));
    }
    Ok(())
}

fn assert_entries_safe(entries: &[MappEntry]) -> CoreResult<()> {
    let mut seen: HashSet<&str> = HashSet::new();
    for entry in entries {
        guard::check_path(entry.path.trim_end_matches('/'))?;
        if !seen.insert(entry.path.as_str()) {
            return Err(CoreError::Package(format!("duplicate entry {}", entry.path)));
        }
        if entry.path == MANIFEST_PATH || entry.path.starts_with("signatures/") {
            return Err(CoreError::Package(format!(
                "entry {} is managed by the packer",
                entry.path
            )));
        }
    }
    Ok(())
}

/// Build a signed `.mapp` package.
///
/// `author_key` is required for every install source except `git`; whenever both
/// keys are supplied they MUST differ (M-21).
pub fn pack(
    manifest_json: &str,
    mut entries: Vec<MappEntry>,
    author_key: Option<&SigningKey>,
    registry_key: Option<&SigningKey>,
) -> CoreResult<Vec<u8>> {
    let manifest = manifest::parse(manifest_json)?;
    if let (Some(author), Some(registry)) = (author_key, registry_key) {
        if ct_eq(&ed25519_public(author), &ed25519_public(registry)) {
            return Err(CoreError::Package("author and registry keys must differ".into()));
        }
    }
    assert_entries_safe(&entries)?;
    entries.retain(|entry| !(entry.path == MANIFEST_PATH || entry.path.starts_with("signatures/")));
    ensure_layout(&entries)?;

    // Digest over canonical ZIP with the placeholder manifest.
    let placeholder = manifest::jcs_with_placeholder(&manifest)?;
    let mut placeholder_entries = entries.clone();
    placeholder_entries.push(MappEntry::file(MANIFEST_PATH, placeholder));
    let placeholder_zip = canonical_zip(&placeholder_entries)?;
    let digest = sha256(&placeholder_zip);

    // Final manifest carries the real contentHash.
    let mut final_manifest = manifest;
    final_manifest.content_hash = format!("sha256-{}", crate::crypto::hex_lower(&digest));
    validate_bundle(&final_manifest)?;

    let mut final_entries = entries;
    final_entries.push(MappEntry::file(
        MANIFEST_PATH,
        manifest::jcs_manifest(&final_manifest)?,
    ));
    if let Some(author) = author_key {
        let signature = ed25519_sign(author, &digest);
        if let Some(entry) = final_entries
            .iter_mut()
            .find(|entry| entry.path == AUTHOR_SIGNATURE_PATH)
        {
            entry.data = signature.to_vec();
        } else {
            final_entries.push(MappEntry::file(AUTHOR_SIGNATURE_PATH, signature.to_vec()));
        }
    }
    if let Some(registry) = registry_key {
        let signature = ed25519_sign(registry, &digest);
        final_entries.push(MappEntry::file(REGISTRY_SIGNATURE_PATH, signature.to_vec()));
    }
    canonical_zip(&final_entries)
}

/// Re-validate the final manifest after the hash is filled in.
fn validate_bundle(manifest: &Manifest) -> CoreResult<()> {
    let json = serde_json::to_string(manifest)?;
    let issues = manifest::validate(&json);
    if issues.is_empty() {
        Ok(())
    } else {
        let summary = issues
            .iter()
            .map(|issue| format!("{} {}: {}", issue.rule, issue.field, issue.message))
            .collect::<Vec<_>>()
            .join("; ");
        Err(CoreError::Manifest(summary))
    }
}

/// Extract every entry while enforcing size, count, path, and symlink guards.
pub fn extract_entries(bytes: &[u8]) -> CoreResult<Vec<MappEntry>> {
    if bytes.len() as u64 > MAX_COMPRESSED_BYTES {
        return Err(CoreError::Package("archive exceeds 64 MiB compressed".into()));
    }
    let mut archive = ZipArchive::new(Cursor::new(bytes))?;
    if archive.len() > MAX_ENTRIES {
        return Err(CoreError::Package(format!(
            "archive has {} entries, limit {MAX_ENTRIES}",
            archive.len()
        )));
    }
    let mut total: u64 = 0;
    let mut entries = Vec::with_capacity(archive.len());
    let mut seen: HashSet<String> = HashSet::new();
    for index in 0..archive.len() {
        let mut file = archive.by_index(index)?;
        let name = file.name().to_string();
        let is_dir = file.is_dir();
        let trimmed = name.trim_end_matches('/').to_string();
        guard::check_path(&trimmed)?;
        if trimmed.is_empty() {
            return Err(CoreError::Package("empty entry name".into()));
        }
        if !seen.insert(name.clone()) {
            return Err(CoreError::Package(format!("duplicate entry {name}")));
        }
        if file.is_symlink() {
            return Err(CoreError::Package(format!("symlink entry rejected: {name}")));
        }
        if let Some(mode) = file.unix_mode() {
            let file_type = mode & 0o170000;
            if file_type == 0o120000 {
                return Err(CoreError::Package(format!("symlink entry rejected: {name}")));
            }
        }
        let declared = file.size();
        total = total.saturating_add(declared);
        if total > MAX_DECOMPRESSED_BYTES {
            return Err(CoreError::Package("archive exceeds 256 MiB decompressed".into()));
        }
        let mut data = Vec::with_capacity(declared as usize);
        if !is_dir {
            file.by_ref()
                .take(MAX_DECOMPRESSED_BYTES + 1)
                .read_to_end(&mut data)?;
            if data.len() as u64 != declared {
                return Err(CoreError::Package(format!("entry {name} size mismatch")));
            }
        }
        entries.push(MappEntry { path: name, is_dir, data });
    }
    Ok(entries)
}

/// Verify a package: guards → manifest → digest → signatures per install source.
pub fn verify(
    bytes: &[u8],
    source: InstallSource,
    author_pubkey: Option<&[u8; KEY_LEN]>,
    registry_pubkey: Option<&[u8; KEY_LEN]>,
) -> CoreResult<VerifiedMapp> {
    let entries = extract_entries(bytes)?;
    let manifest_raw = entries
        .iter()
        .find(|entry| entry.path == MANIFEST_PATH && !entry.is_dir)
        .ok_or_else(|| CoreError::Package("manifest.json missing".into()))?;
    let manifest_json = String::from_utf8(manifest_raw.data.clone())
        .map_err(|_| CoreError::Package("manifest.json is not UTF-8".into()))?;
    let manifest = manifest::parse(&manifest_json)?;
    ensure_layout(&entries)?;

    let signature_at = |path: &str| -> Option<[u8; SIGNATURE_LEN]> {
        entries
            .iter()
            .find(|entry| entry.path == path && !entry.is_dir)
            .and_then(|entry| {
                if entry.data.len() == SIGNATURE_LEN {
                    let mut out = [0u8; SIGNATURE_LEN];
                    out.copy_from_slice(&entry.data);
                    Some(out)
                } else {
                    None
                }
            })
    };
    let author_signature = signature_at(AUTHOR_SIGNATURE_PATH);
    let registry_signature = signature_at(REGISTRY_SIGNATURE_PATH);

    // Rebuild the canonical placeholder ZIP from extracted entries.
    let mut placeholder_entries: Vec<MappEntry> = entries
        .iter()
        .filter(|entry| entry.path != MANIFEST_PATH && !entry.path.starts_with("signatures/"))
        .cloned()
        .collect();
    placeholder_entries.push(MappEntry::file(
        MANIFEST_PATH,
        manifest::jcs_with_placeholder(&manifest)?,
    ));
    let rebuilt = canonical_zip(&placeholder_entries)?;
    let digest = sha256(&rebuilt);
    let expected = format!("sha256-{}", crate::crypto::hex_lower(&digest));
    if manifest.content_hash != expected {
        return Err(CoreError::Package("contentHash does not match canonical ZIP".into()));
    }

    match source {
        InstallSource::Local => {
            let signature = author_signature
                .ok_or_else(|| CoreError::Package("author signature required for local install".into()))?;
            let key = author_pubkey.ok_or_else(|| {
                CoreError::Package("author public key required for local install".into())
            })?;
            ed25519_verify(key, &digest, &signature)?;
            check_publisher(&manifest, key)?;
            if let (Some(registry_signature), Some(registry_key)) = (registry_signature, registry_pubkey)
            {
                ed25519_verify(registry_key, &digest, &registry_signature)?;
            }
        }
        InstallSource::Registry | InstallSource::Enterprise => {
            let author_signature = author_signature.ok_or_else(|| {
                CoreError::Package("author signature required for registry install".into())
            })?;
            let registry_signature = registry_signature.ok_or_else(|| {
                CoreError::Package("registry signature required for registry install".into())
            })?;
            let author_key = author_pubkey
                .ok_or_else(|| CoreError::Package("author public key required".into()))?;
            let registry_key = registry_pubkey
                .ok_or_else(|| CoreError::Package("registry public key required".into()))?;
            if ct_eq(author_key, registry_key) {
                return Err(CoreError::Package("author and registry keys must differ".into()));
            }
            ed25519_verify(author_key, &digest, &author_signature)?;
            ed25519_verify(registry_key, &digest, &registry_signature)?;
            check_publisher(&manifest, author_key)?;
        }
        InstallSource::Git => {
            // Unsigned Git installs are allowed only with an explicit warning
            // surfaced by the host; signatures, when present, must still verify.
            if let Some(signature) = author_signature {
                let key = author_pubkey.ok_or_else(|| {
                    CoreError::Package("author signature present but no author key supplied".into())
                })?;
                ed25519_verify(key, &digest, &signature)?;
                check_publisher(&manifest, key)?;
            }
            if let Some(signature) = registry_signature {
                let key = registry_pubkey.ok_or_else(|| {
                    CoreError::Package("registry signature present but no registry key supplied".into())
                })?;
                ed25519_verify(key, &digest, &signature)?;
            }
        }
    }

    Ok(VerifiedMapp {
        manifest,
        digest,
        author_signature: author_signature.map(|s| s.to_vec()),
        registry_signature: registry_signature.map(|s| s.to_vec()),
        entry_count: entries.len(),
        decompressed_bytes: entries.iter().map(|e| e.data.len() as u64).sum(),
    })
}

/// Cross-check `publisher` fields against the author public key (M-07).
pub fn check_publisher(manifest: &Manifest, author_pubkey: &[u8; KEY_LEN]) -> CoreResult<()> {
    let digest = sha256(author_pubkey);
    let fingerprint = crate::crypto::hex_lower(&digest);
    let key_id = &fingerprint[..16];
    if manifest.publisher.fingerprint != fingerprint {
        return Err(CoreError::Package("publisher fingerprint does not match author key".into()));
    }
    if manifest.publisher.key_id != key_id {
        return Err(CoreError::Package("publisher keyId does not match author key".into()));
    }
    let expected_entry = format!("ed25519-{key_id}");
    if manifest.entry.signature != expected_entry {
        return Err(CoreError::Package("entry.signature does not match publisher keyId".into()));
    }
    Ok(())
}

/// Build a manifest JSON string for a package with a freshly signed contentHash.
///
/// Callers (CLI, tests) use this to produce the file that `pack` consumes.
pub fn manifest_template(
    id: &str,
    name: &str,
    version: &str,
    author_pubkey: &[u8; KEY_LEN],
    content_hash: &str,
) -> Manifest {
    let digest = sha256(author_pubkey);
    let fingerprint = crate::crypto::hex_lower(&digest);
    let key_id = fingerprint[..16].to_string();
    Manifest {
        schema_version: manifest::SCHEMA_VERSION.to_string(),
        id: id.to_string(),
        name: name.to_string(),
        version: version.to_string(),
        license: "MIT".to_string(),
        repository: "https://example.com/repo".to_string(),
        publisher: manifest::Publisher {
            key_id: key_id.clone(),
            fingerprint,
            source: Some("local".to_string()),
        },
        min_host_version: "2.0.0".to_string(),
        content_hash: content_hash.to_string(),
        reproducible_build: None,
        entry: manifest::Entry {
            bundle: "dist/app.bundle.js".to_string(),
            assets_dir: "assets/".to_string(),
            ui_engine: "hybrid-native".to_string(),
            integrity: "sha384-AAAA".to_string(),
            signature: format!("ed25519-{key_id}"),
        },
        offline: manifest::Offline {
            mode: "offline-first".to_string(),
            requires_internet: false,
            local_db_schema: "db/migrations/".to_string(),
            sync_strategy: "crdt-hlc".to_string(),
        },
        runtime: manifest::Runtime {
            isolation: "strict-sandbox".to_string(),
            max_memory_mb: 128,
            supported_viewports: vec!["mobile".to_string(), "tablet".to_string(), "desktop".to_string()],
            secure_display: false,
        },
        permissions: manifest::Permissions {
            required: vec!["storage.local.sqlite".to_string()],
            optional: vec![],
            network_allowlist: vec![],
            quotas: None,
        },
        local_ai: None,
        capabilities: manifest::Capabilities {
            intents_in: vec![],
            intents_out: vec![],
            widgets: vec![],
        },
    }
}

/// Group entries by top-level directory for inspection output.
pub fn layout_summary(entries: &[MappEntry]) -> BTreeMap<String, usize> {
    let mut summary = BTreeMap::new();
    for entry in entries {
        let top = entry.path.split('/').next().unwrap_or("").to_string();
        *summary.entry(top).or_insert(0usize) += 1;
    }
    summary
}
