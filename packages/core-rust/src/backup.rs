//! `.mapp-backup` v2 sectioned container.
//!
//! Layout (all integers big-endian):
//!
//! ```text
//! "MAPPBK01" | u16 version = 2 | u16 sectionCount | salt[16] |
//! m: u32 | t: u32 | p: u32 | manifestNonce[12] | u32 manifestLen | manifestCiphertext |
//! repeated { u8 nameLen | name UTF-8 | u32 len | nonce[12] | ciphertext }
//! ```
//!
//! The manifest is sealed first so a host can verify every section checksum
//! before decrypting or exposing any data. `sectionCount` counts non-manifest
//! sections only. Every section is AES-256-GCM with
//! `MAPPBK01|v2|<sectionName>` as the AAD, which binds ciphertext to its slot.
//!
//! Errors are deliberately coarse: authentication failures (including a wrong
//! passphrase) are `E-BACKUP-001`; malformed headers and checksum mismatches are
//! `E-BACKUP-002`. Cryptography is never re-implemented in TypeScript.

use std::collections::HashSet;

use aes_gcm::aead::{Aead, KeyInit, Payload};
use aes_gcm::{Aes256Gcm, Nonce};
use argon2::{Algorithm, Argon2, Params, Version};
use base64::Engine;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use zeroize::Zeroize;

use crate::crypto::{
    hex_lower, random_16, random_nonce, sha256, ARGON2_ITERATIONS, ARGON2_MEMORY_KIB,
    ARGON2_PARALLELISM, ARGON2_SALT_LEN, KEY_LEN,
};
use crate::error::{CoreError, CoreResult};

pub const BACKUP_MAGIC: &[u8; 8] = b"MAPPBK01";
pub const BACKUP_FORMAT_VERSION: u16 = 2;
pub const MIN_PASSPHRASE_CHARS: usize = 12;

const MANIFEST_SECTION: &str = "manifest";
const MAX_SECTION_NAME: usize = 255;
const MAX_MANIFEST_LEN: usize = 4 * 1024 * 1024;
const MAX_SECTION_LEN: usize = 64 * 1024 * 1024;
const MAX_SECTIONS: usize = 4096;

#[derive(Debug, Clone, Deserialize)]
pub struct SectionInput {
    pub name: String,
    #[serde(rename = "plaintextBase64")]
    pub plaintext_base64: String,
}

#[derive(Debug, Deserialize)]
#[serde(untagged)]
enum SectionsEnvelope {
    List(Vec<SectionInput>),
    Wrapped {
        #[serde(default)]
        workspace: Value,
        sections: Vec<SectionInput>,
    },
}

#[derive(Debug, Serialize, Deserialize)]
struct ManifestSection {
    name: String,
    sha256: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct Manifest {
    #[serde(rename = "formatVersion")]
    format_version: u16,
    #[serde(rename = "createdAt")]
    created_at: i64,
    workspace: Value,
    sections: Vec<ManifestSection>,
}

struct SealedSection {
    name: String,
    nonce: [u8; 12],
    ciphertext: Vec<u8>,
}

fn corrupt(message: impl Into<String>) -> CoreError {
    CoreError::BackupCorrupt(message.into())
}

fn auth(message: impl Into<String>) -> CoreError {
    CoreError::BackupAuth(message.into())
}

fn aad(name: &str) -> Vec<u8> {
    format!("{}|v{}|{}", "MAPPBK01", BACKUP_FORMAT_VERSION, name).into_bytes()
}

fn validate_name(name: &str) -> CoreResult<()> {
    if name.is_empty() || name.len() > MAX_SECTION_NAME {
        return Err(corrupt("invalid section name length"));
    }
    if name == MANIFEST_SECTION {
        return Err(corrupt("manifest is a reserved section name"));
    }
    if name.chars().any(|ch| ch == '\0' || ch == '|') {
        return Err(corrupt("invalid section name"));
    }
    Ok(())
}

fn derive_key(passphrase: &str, salt: &[u8; ARGON2_SALT_LEN], m: u32, t: u32, p: u32) -> CoreResult<[u8; KEY_LEN]> {
    if m == 0 || t == 0 || p == 0 || m > 2_097_152 || t > 32 || p > 8 {
        return Err(corrupt("invalid Argon2id parameters"));
    }
    let params = Params::new(m, t, p, Some(KEY_LEN)).map_err(|_| corrupt("invalid Argon2id parameters"))?;
    let argon = Argon2::new(Algorithm::Argon2id, Version::V0x13, params);
    let mut key = [0u8; KEY_LEN];
    argon
        .hash_password_into(passphrase.as_bytes(), salt, &mut key)
        .map_err(|_| corrupt("Argon2id derivation failed"))?;
    Ok(key)
}

fn encrypt(key: &[u8; KEY_LEN], name: &str, plaintext: &[u8]) -> CoreResult<([u8; 12], Vec<u8>)> {
    let nonce = random_nonce();
    let cipher = Aes256Gcm::new_from_slice(key).map_err(|_| corrupt("invalid backup key"))?;
    let ciphertext = cipher
        .encrypt(
            Nonce::from_slice(&nonce),
            Payload {
                msg: plaintext,
                aad: &aad(name),
            },
        )
        .map_err(|_| corrupt("backup encryption failed"))?;
    Ok((nonce, ciphertext))
}

fn decrypt(
    key: &[u8; KEY_LEN],
    name: &str,
    nonce: &[u8; 12],
    ciphertext: &[u8],
) -> CoreResult<Vec<u8>> {
    let cipher = Aes256Gcm::new_from_slice(key).map_err(|_| corrupt("invalid backup key"))?;
    cipher
        .decrypt(
            Nonce::from_slice(nonce),
            Payload {
                msg: ciphertext,
                aad: &aad(name),
            },
        )
        .map_err(|_| auth(format!("section {name} authentication failed")))
}

/// Seal a v2 backup.
///
/// `sections_json` is either `[{name, plaintextBase64}]` or
/// `{workspace, sections: [...]}`. The manifest is generated here from the
/// sealed section ciphertexts; a caller never supplies it.
pub fn seal(passphrase: &str, sections_json: &str, created_at_ms: f64) -> CoreResult<Vec<u8>> {
    if passphrase.chars().count() < MIN_PASSPHRASE_CHARS {
        return Err(CoreError::BackupPassphrase(format!(
            "backup passphrase must be at least {MIN_PASSPHRASE_CHARS} characters"
        )));
    }
    if !created_at_ms.is_finite() || created_at_ms < 0.0 || created_at_ms > i64::MAX as f64 {
        return Err(corrupt("invalid backup timestamp"));
    }

    let parsed: SectionsEnvelope =
        serde_json::from_str(sections_json).map_err(|e| corrupt(format!("invalid sections json: {e}")))?;
    let (workspace, inputs) = match parsed {
        SectionsEnvelope::List(list) => (Value::Null, list),
        SectionsEnvelope::Wrapped { workspace, sections } => (workspace, sections),
    };
    if inputs.len() > MAX_SECTIONS {
        return Err(corrupt("too many backup sections"));
    }

    let mut names = HashSet::new();
    let mut material = Vec::with_capacity(inputs.len());
    for input in inputs {
        validate_name(&input.name)?;
        if !names.insert(input.name.clone()) {
            return Err(corrupt(format!("duplicate section {}", input.name)));
        }
        let plaintext = base64::engine::general_purpose::STANDARD
            .decode(input.plaintext_base64.as_bytes())
            .map_err(|_| corrupt(format!("invalid base64 in section {}", input.name)))?;
        material.push((input.name, plaintext));
    }

    let salt = random_16();
    let mut key = derive_key(
        passphrase,
        &salt,
        ARGON2_MEMORY_KIB,
        ARGON2_ITERATIONS,
        ARGON2_PARALLELISM,
    )?;

    let mut sealed: Vec<SealedSection> = Vec::with_capacity(material.len());
    let mut manifest_sections: Vec<ManifestSection> = Vec::with_capacity(material.len());
    for (name, plaintext) in material {
        let (nonce, ciphertext) = encrypt(&key, &name, &plaintext)?;
        manifest_sections.push(ManifestSection {
            name: name.clone(),
            sha256: hex_lower(&sha256(&ciphertext)),
        });
        sealed.push(SealedSection {
            name,
            nonce,
            ciphertext,
        });
    }

    let manifest = Manifest {
        format_version: BACKUP_FORMAT_VERSION,
        created_at: created_at_ms.round() as i64,
        workspace,
        sections: manifest_sections,
    };
    let manifest_plaintext = serde_json::to_vec(&manifest).map_err(|e| corrupt(format!("manifest: {e}")))?;
    let (manifest_nonce, manifest_ciphertext) = encrypt(&key, MANIFEST_SECTION, &manifest_plaintext)?;
    key.zeroize();

    let mut out = Vec::with_capacity(
        8 + 2 + 2 + ARGON2_SALT_LEN
            + 12
            + 4
            + manifest_ciphertext.len()
            + sealed.iter().map(|section| section.name.len() + 1 + 4 + 12 + section.ciphertext.len()).sum::<usize>(),
    );
    out.extend_from_slice(BACKUP_MAGIC);
    out.extend_from_slice(&BACKUP_FORMAT_VERSION.to_be_bytes());
    out.extend_from_slice(&(sealed.len() as u16).to_be_bytes());
    out.extend_from_slice(&salt);
    out.extend_from_slice(&ARGON2_MEMORY_KIB.to_be_bytes());
    out.extend_from_slice(&ARGON2_ITERATIONS.to_be_bytes());
    out.extend_from_slice(&ARGON2_PARALLELISM.to_be_bytes());
    out.extend_from_slice(&manifest_nonce);
    out.extend_from_slice(&(manifest_ciphertext.len() as u32).to_be_bytes());
    out.extend_from_slice(&manifest_ciphertext);
    for section in sealed {
        let name_bytes = section.name.as_bytes();
        out.push(name_bytes.len() as u8);
        out.extend_from_slice(name_bytes);
        out.extend_from_slice(&(section.ciphertext.len() as u32).to_be_bytes());
        out.extend_from_slice(&section.nonce);
        out.extend_from_slice(&section.ciphertext);
    }
    Ok(out)
}

struct Reader<'a> {
    bytes: &'a [u8],
    offset: usize,
}

impl<'a> Reader<'a> {
    fn new(bytes: &'a [u8]) -> Self {
        Self { bytes, offset: 0 }
    }

    fn take(&mut self, len: usize) -> CoreResult<&'a [u8]> {
        let end = self
            .offset
            .checked_add(len)
            .ok_or_else(|| corrupt("backup length overflow"))?;
        if end > self.bytes.len() {
            return Err(corrupt("truncated backup"));
        }
        let slice = &self.bytes[self.offset..end];
        self.offset = end;
        Ok(slice)
    }

    fn u16(&mut self) -> CoreResult<u16> {
        let bytes = self.take(2)?;
        Ok(u16::from_be_bytes([bytes[0], bytes[1]]))
    }

    fn u32(&mut self) -> CoreResult<u32> {
        let bytes = self.take(4)?;
        Ok(u32::from_be_bytes([bytes[0], bytes[1], bytes[2], bytes[3]]))
    }

    fn array<const N: usize>(&mut self) -> CoreResult<[u8; N]> {
        let bytes = self.take(N)?;
        let mut out = [0u8; N];
        out.copy_from_slice(bytes);
        Ok(out)
    }

    fn remaining(&self) -> usize {
        self.bytes.len() - self.offset
    }
}

/// Open and fully verify a v2 backup.
///
/// Every section checksum is verified against the sealed manifest before any
/// plaintext is returned. A wrong passphrase and a corrupt file are distinct
/// error codes (`E-BACKUP-001` / `E-BACKUP-002`).
pub fn open(passphrase: &str, bytes: &[u8]) -> CoreResult<String> {
    let mut reader = Reader::new(bytes);
    let magic = reader.take(BACKUP_MAGIC.len())?;
    if magic != BACKUP_MAGIC {
        return Err(corrupt("not a .mapp-backup container"));
    }
    let version = reader.u16()?;
    if version != BACKUP_FORMAT_VERSION {
        // v1 files share the magic but have no section table; no migration.
        return Err(corrupt(format!("unsupported backup format version {version}")));
    }
    let section_count = reader.u16()? as usize;
    if section_count > MAX_SECTIONS {
        return Err(corrupt("too many backup sections"));
    }
    let salt = reader.array::<ARGON2_SALT_LEN>()?;
    let m = reader.u32()?;
    let t = reader.u32()?;
    let p = reader.u32()?;
    let manifest_nonce = reader.array::<12>()?;
    let manifest_len = reader.u32()? as usize;
    if manifest_len == 0 || manifest_len > MAX_MANIFEST_LEN {
        return Err(corrupt("invalid manifest length"));
    }
    let manifest_ciphertext = reader.take(manifest_len)?;

    let mut key = derive_key(passphrase, &salt, m, t, p)?;
    let manifest_plaintext = decrypt(&key, MANIFEST_SECTION, &manifest_nonce, manifest_ciphertext)?;
    let manifest: Manifest =
        serde_json::from_slice(&manifest_plaintext).map_err(|e| corrupt(format!("manifest JSON: {e}")))?;
    if manifest.format_version != BACKUP_FORMAT_VERSION {
        return Err(corrupt("manifest formatVersion mismatch"));
    }
    if manifest.sections.len() != section_count {
        return Err(corrupt("section count does not match the manifest"));
    }

    let mut seen: HashSet<String> = HashSet::new();
    let mut sections: Vec<SealedSection> = Vec::with_capacity(section_count);
    for _ in 0..section_count {
        let name_len = reader.take(1)?[0] as usize;
        if name_len == 0 || name_len > MAX_SECTION_NAME {
            return Err(corrupt("invalid section name length"));
        }
        let name_bytes = reader.take(name_len)?;
        let name = std::str::from_utf8(name_bytes)
            .map_err(|_| corrupt("section name is not UTF-8"))?
            .to_owned();
        validate_name(&name)?;
        let len = reader.u32()? as usize;
        if len == 0 || len > MAX_SECTION_LEN {
            return Err(corrupt(format!("invalid ciphertext length for section {name}")));
        }
        let nonce = reader.array::<12>()?;
        let ciphertext = reader.take(len)?.to_vec();
        if !seen.insert(name.clone()) {
            return Err(corrupt(format!("duplicate section {name}")));
        }
        sections.push(SealedSection {
            name,
            nonce,
            ciphertext,
        });
    }
    if reader.remaining() != 0 {
        return Err(corrupt("trailing bytes after the last section"));
    }

    let mut plaintexts = Vec::with_capacity(sections.len());
    for expected in &manifest.sections {
        let section = sections
            .iter()
            .find(|candidate| candidate.name == expected.name)
            .ok_or_else(|| corrupt(format!("missing section {}", expected.name)))?;
        let actual = hex_lower(&sha256(&section.ciphertext));
        if actual != expected.sha256 {
            return Err(corrupt(format!("checksum mismatch in section {}", expected.name)));
        }
        let plaintext = decrypt(&key, &section.name, &section.nonce, &section.ciphertext)?;
        plaintexts.push(json!({
            "name": section.name,
            "plaintextBase64": base64::engine::general_purpose::STANDARD.encode(plaintext),
        }));
    }
    if plaintexts.len() != sections.len() {
        return Err(corrupt("manifest does not list every section"));
    }
    key.zeroize();

    let created_at = manifest.created_at;
    let workspace = manifest.workspace.clone();
    serde_json::to_string(&json!({
        "manifest": manifest,
        "sections": plaintexts,
        "createdAt": created_at,
        "workspace": workspace,
    }))
    .map_err(|e| corrupt(format!("backup output: {e}")))
}
