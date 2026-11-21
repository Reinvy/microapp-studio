//! `.mapp` v2 package format: deterministic ZIP writer, verifier, and extractor.
//!
//! Format (`docs/03-specs/05-packages.md`):
//!
//! - roots: `microapp.manifest.json`, `signature.ed25519`, `LICENSE`,
//!   `bundle/*.js`, `assets/**`;
//! - payload files are every file except the manifest and the detached
//!   signature;
//! - `contentHash` is the SHA-256 of a deterministic ZIP holding the payload
//!   plus the *canonical hash manifest* (`contentHash` and `signature.value`
//!   empty);
//! - the signature message is the JCS bytes of the final manifest with
//!   `signature.value` empty, and `signature.ed25519` must carry exactly the
//!   same 64 bytes as `signature.value`.

use std::collections::{BTreeMap, HashSet};
use std::io::{Cursor, Read, Write};

use base64::Engine;
use ed25519_dalek::SigningKey;
use serde::{Deserialize, Serialize};
use zip::write::SimpleFileOptions;
use zip::{CompressionMethod, DateTime, ZipArchive, ZipWriter};

use crate::crypto::{ed25519_verify, hex_lower, sha256, KEY_LEN, SIGNATURE_LEN};
use crate::error::{CoreError, CoreResult};
use crate::guard;
use crate::manifest::{self, Manifest};

pub const MAX_DECOMPRESSED_BYTES: u64 = 256 * 1024 * 1024;
pub const MAX_COMPRESSED_BYTES: u64 = 64 * 1024 * 1024;
pub const MAX_ENTRIES: usize = 10_000;
pub const MANIFEST_PATH: &str = "microapp.manifest.json";
pub const SIGNATURE_PATH: &str = "signature.ed25519";
pub const LICENSE_PATH: &str = "LICENSE";

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
    pub fn parse(value: &str) -> CoreResult<Self> {
        match value {
            "local" => Ok(InstallSource::Local),
            "registry" => Ok(InstallSource::Registry),
            "enterprise" => Ok(InstallSource::Enterprise),
            "git" => Ok(InstallSource::Git),
            other => Err(CoreError::Package(format!("unknown source {other}"))),
        }
    }

    pub fn as_str(&self) -> &'static str {
        match self {
            InstallSource::Local => "local",
            InstallSource::Registry => "registry",
            InstallSource::Enterprise => "enterprise",
            InstallSource::Git => "git",
        }
    }

    /// Registry/enterprise installs carry a registry co-signature.
    pub fn requires_registry_signature(&self) -> bool {
        matches!(self, InstallSource::Registry | InstallSource::Enterprise)
    }
}

/// Result of `prepare`: the manifest with digests filled and the message to sign.
#[derive(Debug, Clone)]
pub struct PreparedPackage {
    pub manifest: Manifest,
    pub manifest_json: String,
    pub signature_message: Vec<u8>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VerifiedPackage {
    pub manifest: Manifest,
    pub digest: [u8; 32],
    pub author_signature: Vec<u8>,
    pub registry_signature: Option<Vec<u8>>,
    pub entry_count: usize,
    pub decompressed_bytes: u64,
}

fn canonical_zip(mut files: Vec<(String, Vec<u8>)>) -> CoreResult<Vec<u8>> {
    files.sort_by(|a, b| a.0.as_bytes().cmp(b.0.as_bytes()));
    let mut writer = ZipWriter::new(Cursor::new(Vec::new()));
    let epoch = DateTime::default();
    for (path, data) in files {
        let options = SimpleFileOptions::default()
            .last_modified_time(epoch)
            .unix_permissions(0o644)
            .compression_method(CompressionMethod::Deflated)
            .compression_level(Some(9));
        writer.start_file(path, options)?;
        writer.write_all(&data)?;
    }
    let cursor = writer.finish()?;
    Ok(cursor.into_inner())
}

/// Validate every path and root before any bytes are hashed.
pub fn validate_entries(entries: &[MappEntry]) -> CoreResult<()> {
    let mut seen: HashSet<&str> = HashSet::new();
    for entry in entries {
        let trimmed = entry.path.trim_end_matches('/');
        if trimmed.is_empty() {
            return Err(CoreError::Package("empty entry name".into()));
        }
        if trimmed.contains('\\') {
            return Err(CoreError::Package(format!(
                "entry {trimmed} uses a backslash; only '/' is allowed"
            )));
        }
        guard::check_path(trimmed).map_err(|_| {
            CoreError::Package(format!("entry {trimmed} escapes the package root"))
        })?;
        if !seen.insert(entry.path.as_str()) {
            return Err(CoreError::Package(format!("duplicate entry {}", entry.path)));
        }
        if trimmed == MANIFEST_PATH || trimmed == SIGNATURE_PATH {
            return Err(CoreError::Package(format!(
                "entry {trimmed} is written by the packer"
            )));
        }
        check_layout_path(trimmed, entry.is_dir)?;
    }
    Ok(())
}

/// Allowed roots: `LICENSE`, `bundle/*.js`, `assets/**`.
fn check_layout_path(path: &str, is_dir: bool) -> CoreResult<()> {
    if is_dir {
        if path == "bundle" || path == "assets" || path.starts_with("assets/") {
            return Ok(());
        }
        return Err(CoreError::Package(format!("directory {path}/ is not part of the layout")));
    }
    if path == MANIFEST_PATH || path == SIGNATURE_PATH {
        // Written by the packer; `validate_entries` rejects caller-supplied
        // copies before this check runs.
        return Ok(());
    }
    if path == LICENSE_PATH {
        return Ok(());
    }
    if manifest::is_bundle_path(path) {
        return Ok(());
    }
    if path.starts_with("assets/") && path.len() > "assets/".len() {
        return Ok(());
    }
    if path == "manifest.json" || path.starts_with("dist/") || path.starts_with("signatures/") {
        return Err(CoreError::Package(format!(
            "entry {path} uses the removed v1 layout; the v2 package has no manifest.json, dist/, or signatures/"
        )));
    }
    Err(CoreError::Package(format!("entry {path} is outside the allowed package roots")))
}

fn payload_files(entries: &[MappEntry]) -> Vec<&MappEntry> {
    entries
        .iter()
        .filter(|entry| {
            !entry.is_dir
                && entry.path != MANIFEST_PATH
                && entry.path != SIGNATURE_PATH
        })
        .collect()
}

fn find_file<'a>(entries: &'a [MappEntry], path: &str) -> Option<&'a MappEntry> {
    entries.iter().find(|entry| !entry.is_dir && entry.path == path)
}

fn file_hashes(payload: &[&MappEntry]) -> BTreeMap<String, String> {
    payload
        .iter()
        .map(|entry| (entry.path.clone(), hex_lower(&sha256(&entry.data))))
        .collect()
}

/// Fill `integrity.files` and `integrity.contentHash` and return the message the
/// author must sign.
///
/// The input manifest may carry empty digests, so a caller can hand over a
/// template. The returned manifest is the final pre-signature form: the only
/// remaining change is `signature.value`.
pub fn prepare_manifest(manifest_json: &str, entries: &[MappEntry]) -> CoreResult<PreparedPackage> {
    let mut manifest = manifest::parse(manifest_json)?;
    validate_entries(entries)?;
    let payload = payload_files(entries);
    if payload.is_empty() {
        return Err(CoreError::Package("package must contain at least one payload file".into()));
    }
    if find_file(entries, &manifest.entry.bundle).is_none() {
        return Err(CoreError::Package(format!(
            "entry.bundle {} is missing from the package",
            manifest.entry.bundle
        )));
    }

    manifest.integrity.algorithm = "sha256".to_string();
    manifest.integrity.files = file_hashes(&payload);
    manifest.integrity.content_hash.clear();
    manifest.signature.value.clear();

    let hash_manifest = manifest::canonical_hash_jcs(&manifest)?;
    let mut zip_files: Vec<(String, Vec<u8>)> = payload
        .iter()
        .map(|entry| (entry.path.clone(), entry.data.clone()))
        .collect();
    zip_files.push((MANIFEST_PATH.to_string(), hash_manifest));
    let digest = sha256(&canonical_zip(zip_files)?);
    manifest.integrity.content_hash = hex_lower(&digest);

    let manifest_json = String::from_utf8(manifest::to_jcs(&manifest)?)
        .map_err(|_| CoreError::Package("manifest is not UTF-8".into()))?;
    let signature_message = manifest::signature_message(&manifest)?;
    let prepared_manifest: Manifest = serde_json::from_str(&manifest_json)?;

    Ok(PreparedPackage {
        manifest: prepared_manifest,
        manifest_json,
        signature_message,
    })
}

/// Finalize a prepared manifest with an externally produced signature.
///
/// `signature_base64` must verify over the signature message with
/// `author_pubkey_hex`; a mismatch is `E-PACK-002`.
pub fn finalize_with_signature(
    manifest_json: &str,
    entries: &[MappEntry],
    signature_base64: &str,
    author_pubkey_hex: &str,
) -> CoreResult<Vec<u8>> {
    let author = parse_pubkey(author_pubkey_hex)?;
    let key_id = format!("ed25519:{}", hex_lower(&author));

    // Fill `keyId` *before* hashing: `keyId` is part of the canonical hash
    // manifest, so filling it afterwards would change the digest.
    let mut manifest = manifest::parse(manifest_json)?;
    if manifest.signature.key_id.is_empty() {
        manifest.signature.key_id = key_id;
    } else if manifest.signature.key_id != key_id {
        return Err(CoreError::Signature(
            "manifest signature.keyId does not match the author key".into(),
        ));
    }
    let manifest_json = String::from_utf8(manifest::to_jcs(&manifest)?)
        .map_err(|_| CoreError::Package("manifest is not UTF-8".into()))?;

    let prepared = prepare_manifest(&manifest_json, entries)?;
    let mut final_manifest = prepared.manifest;

    let signature = manifest::decode_signature_base64(signature_base64)?;
    ed25519_verify(&author, &prepared.signature_message, &signature).map_err(|_| {
        CoreError::Signature("author signature does not verify against the package".into())
    })?;
    final_manifest.signature.value = base64::engine::general_purpose::STANDARD.encode(signature);

    let manifest_bytes = manifest::to_jcs(&final_manifest)?;
    let mut zip_files: Vec<(String, Vec<u8>)> = payload_files(entries)
        .iter()
        .map(|entry| (entry.path.clone(), entry.data.clone()))
        .collect();
    zip_files.push((MANIFEST_PATH.to_string(), manifest_bytes));
    zip_files.push((SIGNATURE_PATH.to_string(), signature.to_vec()));
    canonical_zip(zip_files)
}

/// Build an unsigned package. Only `make-fixtures.mjs` uses this to exercise the
/// "signature missing" path; normal packing goes through
/// `prepare` → sign → `finalize_with_signature`.
pub fn build_unsigned(manifest_json: &str, entries: &[MappEntry]) -> CoreResult<Vec<u8>> {
    let prepared = prepare_manifest(manifest_json, entries)?;
    let manifest_bytes = manifest::to_jcs(&prepared.manifest)?;
    let mut zip_files: Vec<(String, Vec<u8>)> = payload_files(entries)
        .iter()
        .map(|entry| (entry.path.clone(), entry.data.clone()))
        .collect();
    zip_files.push((MANIFEST_PATH.to_string(), manifest_bytes));
    canonical_zip(zip_files)
}

/// Sign a prepared package with a seed-backed key and finalize it.
///
/// This is the CLI path: `prepare` → `ed25519_sign` → `finalize_with_signature`.
pub fn pack_with_key(
    manifest_json: &str,
    entries: &[MappEntry],
    author: &SigningKey,
) -> CoreResult<Vec<u8>> {
    let public = crate::crypto::ed25519_public(author);
    let key_id = format!("ed25519:{}", hex_lower(&public));

    // `keyId` is part of the digest and of the signed message, so it must be
    // filled before the message is produced.
    let mut manifest = manifest::parse(manifest_json)?;
    if manifest.signature.key_id.is_empty() {
        manifest.signature.key_id = key_id;
    } else if manifest.signature.key_id != key_id {
        return Err(CoreError::Signature(
            "manifest signature.keyId does not match the author key".into(),
        ));
    }
    let manifest_json = String::from_utf8(manifest::to_jcs(&manifest)?)
        .map_err(|_| CoreError::Package("manifest is not UTF-8".into()))?;

    let prepared = prepare_manifest(&manifest_json, entries)?;
    let signature = crate::crypto::ed25519_sign(author, &prepared.signature_message);
    let signature_base64 = base64::engine::general_purpose::STANDARD.encode(signature);
    finalize_with_signature(
        &manifest_json,
        entries,
        &signature_base64,
        &hex_lower(&public),
    )
}

pub fn parse_pubkey(hex: &str) -> CoreResult<[u8; KEY_LEN]> {
    let bytes = crate::crypto::hex_decode(hex)
        .map_err(|_| CoreError::Signature("public key is not hex".into()))?;
    if bytes.len() != KEY_LEN {
        return Err(CoreError::Signature("public key must be 32 bytes".into()));
    }
    let mut out = [0u8; KEY_LEN];
    out.copy_from_slice(&bytes);
    Ok(out)
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
        if trimmed.is_empty() {
            return Err(CoreError::Package("empty entry name".into()));
        }
        if name.contains('\\') {
            return Err(CoreError::Package(format!("entry {name} uses a backslash")));
        }
        guard::check_path(&trimmed)
            .map_err(|_| CoreError::Package(format!("entry {name} escapes the package root")))?;
        if !seen.insert(name.clone()) {
            return Err(CoreError::Package(format!("duplicate entry {name}")));
        }
        if file.is_symlink() {
            return Err(CoreError::Package(format!("symlink entry rejected: {name}")));
        }
        if let Some(mode) = file.unix_mode() {
            let file_type = mode & 0o170000;
            // 0 means the writer did not record a type; accept it for
            // interoperability, reject devices/FIFOs/sockets.
            if file_type != 0 && file_type != 0o100000 && file_type != 0o040000 {
                return Err(CoreError::Package(format!(
                    "entry {name} is not a regular file or directory"
                )));
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

fn verify_key_id(manifest: &Manifest, key: &[u8; KEY_LEN], field: &str) -> CoreResult<()> {
    let expected = format!("ed25519:{}", hex_lower(key));
    if manifest.signature.key_id != expected {
        return Err(CoreError::Signature(format!(
            "{field} keyId does not match the supplied public key"
        )));
    }
    Ok(())
}

/// Verify a package: guards → manifest → layout → per-file digests → contentHash
/// → author signature (and registry co-signature for registry/enterprise).
pub fn verify(
    bytes: &[u8],
    source: InstallSource,
    author_pubkey: Option<&[u8; KEY_LEN]>,
    registry_pubkey: Option<&[u8; KEY_LEN]>,
) -> CoreResult<VerifiedPackage> {
    let entries = extract_entries(bytes)?;

    let manifest_entry = find_file(&entries, MANIFEST_PATH)
        .ok_or_else(|| CoreError::Package(format!("{MANIFEST_PATH} is missing")))?;
    let manifest_json = std::str::from_utf8(&manifest_entry.data)
        .map_err(|_| CoreError::Package("manifest is not UTF-8".into()))?;
    let manifest = manifest::parse(manifest_json)?;

    // Layout: every entry must be part of the v2 roots and the archive must
    // carry exactly one detached signature file.
    for entry in &entries {
        let trimmed = entry.path.trim_end_matches('/');
        check_layout_path(trimmed, entry.is_dir)?;
    }
    let signature_entry = find_file(&entries, SIGNATURE_PATH)
        .ok_or_else(|| CoreError::Signature(format!("{SIGNATURE_PATH} is missing")))?;
    if signature_entry.data.len() != SIGNATURE_LEN {
        return Err(CoreError::Signature(format!(
            "{SIGNATURE_PATH} must contain 64 raw bytes"
        )));
    }
    if find_file(&entries, &manifest.entry.bundle).is_none() {
        return Err(CoreError::Package(format!(
            "entry.bundle {} is missing from the package",
            manifest.entry.bundle
        )));
    }

    // Per-file digests: every payload file must have exactly one matching entry.
    let payload = payload_files(&entries);
    let declared = &manifest.integrity.files;
    if manifest.integrity.algorithm != "sha256" {
        return Err(CoreError::Digest("integrity.algorithm must be sha256".into()));
    }
    if payload.len() != declared.len() {
        return Err(CoreError::Digest(
            "integrity.files does not cover exactly the payload files".into(),
        ));
    }
    for entry in &payload {
        let expected = declared.get(&entry.path).ok_or_else(|| {
            CoreError::Digest(format!("integrity.files is missing {}", entry.path))
        })?;
        let actual = hex_lower(&sha256(&entry.data));
        if expected != &actual {
            return Err(CoreError::Digest(format!(
                "digest mismatch for {}",
                entry.path
            )));
        }
    }

    // contentHash over the canonical ZIP projection.
    let hash_manifest = manifest::canonical_hash_jcs(&manifest)?;
    let mut zip_files: Vec<(String, Vec<u8>)> = payload
        .iter()
        .map(|entry| (entry.path.clone(), entry.data.clone()))
        .collect();
    zip_files.push((MANIFEST_PATH.to_string(), hash_manifest));
    let digest = sha256(&canonical_zip(zip_files)?);
    let digest_hex = hex_lower(&digest);
    if manifest.integrity.content_hash != digest_hex {
        return Err(CoreError::Digest(
            "integrity.contentHash does not match the canonical ZIP".into(),
        ));
    }

    // Author signature: manifest value and detached file must be identical.
    let author_signature = manifest::decode_signature_base64(&manifest.signature.value)?;
    if author_signature.as_slice() != signature_entry.data.as_slice() {
        return Err(CoreError::Signature(
            "signature.ed25519 does not match signature.value".into(),
        ));
    }
    let author = author_pubkey.ok_or_else(|| {
        CoreError::Signature("author public key is required to verify the package".into())
    })?;
    let message = manifest::signature_message(&manifest)?;
    ed25519_verify(author, &message, &author_signature).map_err(|_| {
        CoreError::Signature("author signature does not verify against the manifest".into())
    })?;
    verify_key_id(&manifest, author, "signature")?;

    let mut registry_signature = None;
    if source.requires_registry_signature() {
        let registry_key = registry_pubkey.ok_or_else(|| {
            CoreError::Signature(format!(
                "registry public key is required for {} installs",
                source.as_str()
            ))
        })?;
        let block = manifest.signature.registry.as_ref().ok_or_else(|| {
            CoreError::Signature(format!(
                "signature.registry is required for {} installs",
                source.as_str()
            ))
        })?;
        if crate::crypto::ct_eq(author, registry_key) {
            return Err(CoreError::Signature(
                "author and registry keys must differ".into(),
            ));
        }
        let registry_bytes = manifest::decode_signature_base64(&block.value)?;
        ed25519_verify(registry_key, &message, &registry_bytes).map_err(|_| {
            CoreError::Signature("registry signature does not verify".into())
        })?;
        let expected = format!("ed25519:{}", hex_lower(registry_key));
        if block.key_id != expected {
            return Err(CoreError::Signature(
                "signature.registry.keyId does not match the registry key".into(),
            ));
        }
        registry_signature = Some(registry_bytes.to_vec());
    }

    let decompressed_bytes = entries
        .iter()
        .filter(|entry| !entry.is_dir)
        .map(|entry| entry.data.len() as u64)
        .sum();

    Ok(VerifiedPackage {
        manifest,
        digest,
        author_signature: author_signature.to_vec(),
        registry_signature,
        entry_count: entries.len(),
        decompressed_bytes,
    })
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
