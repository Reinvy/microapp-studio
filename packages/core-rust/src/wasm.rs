//! wasm-bindgen surface consumed by `packages/runtime-web`.
//!
//! Binary payloads cross as `Vec<u8>` (Uint8Array); structured values cross as
//! JSON strings so no Rust type definitions leak into the web runtime.

use wasm_bindgen::prelude::*;

use crate::audit::{audit_hash, verify_chain, AuditEntry, AuditLog, AuditPayload};
use crate::crypto::{
    ed25519_public, ed25519_verify, envelope_open, envelope_seal, hex_decode, hex_lower,
    key_id, signing_key_from_seed, EnvelopeAad, KEY_LEN, SITE_ID_LEN,
};
use crate::guard;
use crate::hlc::Hlc;
use crate::identity;
use crate::manifest;
use crate::mapp::{self, InstallSource, MappEntry};

fn err_to_js(err: crate::CoreError) -> JsValue {
    JsValue::from_str(&format!("{}|{}", err.code(), err))
}

fn parse_hex32(value: &str) -> Result<[u8; KEY_LEN], JsValue> {
    let bytes = hex_decode(value).map_err(err_to_js)?;
    if bytes.len() != KEY_LEN {
        return Err(JsValue::from_str("E-CRYPTO-001|expected 32-byte hex value"));
    }
    let mut out = [0u8; KEY_LEN];
    out.copy_from_slice(&bytes);
    Ok(out)
}

fn parse_hex16(value: &str) -> Result<[u8; SITE_ID_LEN], JsValue> {
    let bytes = hex_decode(value).map_err(err_to_js)?;
    if bytes.len() != SITE_ID_LEN {
        return Err(JsValue::from_str("E-CRYPTO-001|expected 16-byte hex value"));
    }
    let mut out = [0u8; SITE_ID_LEN];
    out.copy_from_slice(&bytes);
    Ok(out)
}

/// Create a new identity; returns `{mnemonic, record}` JSON.
#[wasm_bindgen]
pub fn identity_create() -> Result<String, JsValue> {
    let (phrase, identity) = identity::identity_create().map_err(err_to_js)?;
    let device_sign = crate::crypto::random_32();
    let device_ecdh = crate::crypto::random_32();
    let record = identity::identity_record(&identity, &device_sign, &device_ecdh);
    let value = serde_json::json!({
        "mnemonic": phrase,
        "record": {
            "siteId": hex_lower(&record.site_id),
            "siteIdBase32": record.site_id_base32,
            "hkdfSalt": hex_lower(&record.hkdf_salt),
            "identityPubkey": hex_lower(&record.identity_pubkey),
            "deviceSignPubkey": hex_lower(&record.device_sign_pubkey),
            "deviceEcdhPubkey": hex_lower(&record.device_ecdh_pubkey),
        }
    });
    Ok(value.to_string())
}

/// Re-derive an identity and verify it matches the stored public key.
#[wasm_bindgen]
pub fn identity_recover(
    phrase: &str,
    passphrase: &str,
    hkdf_salt_hex: &str,
    expected_pubkey_hex: &str,
) -> Result<String, JsValue> {
    let salt = parse_hex32(hkdf_salt_hex)?;
    let expected = parse_hex32(expected_pubkey_hex)?;
    identity::identity_verify_recovery(phrase, passphrase, &salt, &expected).map_err(err_to_js)?;
    let identity = identity::identity_from_phrase(phrase, passphrase, Some(salt)).map_err(err_to_js)?;
    Ok(serde_json::json!({
        "identityPubkey": hex_lower(&identity.identity_pubkey),
        "hkdfSalt": hex_lower(&identity.hkdf_salt),
        "vaultKeyId": hex_lower(&key_id(crate::crypto::LABEL_VAULT, &identity.vault_key())),
    })
    .to_string())
}

/// Create a signed CBOR device certificate; returns the raw certificate bytes.
#[wasm_bindgen]
pub fn device_cert_create(
    phrase: &str,
    passphrase: &str,
    hkdf_salt_hex: &str,
    device_sign_pubkey_hex: &str,
    device_ecdh_pubkey_hex: &str,
    issued_at_ms: f64,
    expires_at_ms: f64,
    capabilities_json: &str,
) -> Result<Vec<u8>, JsValue> {
    let salt = parse_hex32(hkdf_salt_hex)?;
    let identity = identity::identity_from_phrase(phrase, passphrase, Some(salt)).map_err(err_to_js)?;
    let device_sign = parse_hex32(device_sign_pubkey_hex)?;
    let device_ecdh = parse_hex32(device_ecdh_pubkey_hex)?;
    let capabilities: Vec<String> = serde_json::from_str(capabilities_json)
        .map_err(|e| JsValue::from_str(&format!("E-CLI-001|{e}")))?;
    identity::device_cert_create(
        &identity,
        &device_sign,
        &device_ecdh,
        issued_at_ms as u64,
        expires_at_ms as u64,
        capabilities,
    )
    .map_err(err_to_js)
}

/// Verify that a certificate binds the expected identity key.
#[wasm_bindgen]
pub fn identity_verify(cert_bytes: &[u8], expected_identity_pubkey_hex: &str) -> Result<String, JsValue> {
    let expected = parse_hex32(expected_identity_pubkey_hex)?;
    let cert = identity::device_cert_verify(cert_bytes, u64::MAX / 2).map_err(err_to_js)?;
    identity::identity_verify(&cert, &expected).map_err(err_to_js)?;
    Ok(serde_json::json!({
        "siteId": hex_lower(&cert.site_id),
        "issuedAtMs": cert.issued_at_ms,
        "expiresAtMs": cert.expires_at_ms,
        "capabilities": cert.capabilities,
    })
    .to_string())
}

fn aad_from_json(value: &str) -> Result<EnvelopeAad, JsValue> {
    let parsed: serde_json::Value = serde_json::from_str(value)
        .map_err(|e| JsValue::from_str(&format!("E-CLI-001|{e}")))?;
    let site_hex = parsed
        .get("siteId")
        .and_then(|v| v.as_str())
        .ok_or_else(|| JsValue::from_str("E-CLI-001|siteId missing"))?;
    let record_type = parsed
        .get("recordType")
        .and_then(|v| v.as_str())
        .ok_or_else(|| JsValue::from_str("E-CLI-001|recordType missing"))?;
    let record_id = parsed
        .get("recordId")
        .and_then(|v| v.as_str())
        .ok_or_else(|| JsValue::from_str("E-CLI-001|recordId missing"))?;
    let schema_version = parsed
        .get("schemaVersion")
        .and_then(|v| v.as_u64())
        .ok_or_else(|| JsValue::from_str("E-CLI-001|schemaVersion missing"))?;
    Ok(EnvelopeAad {
        site_id: parse_hex16(site_hex)?,
        record_type: record_type.to_string(),
        record_id: record_id.to_string(),
        schema_version: schema_version as u32,
    })
}

/// Seal a plaintext with an AES-256-GCM envelope bound to its record metadata.
#[wasm_bindgen]
pub fn envelope_seal_js(key_hex: &str, label: &str, aad_json: &str, plaintext: &[u8]) -> Result<Vec<u8>, JsValue> {
    let key = parse_hex32(key_hex)?;
    let aad = aad_from_json(aad_json)?;
    envelope_seal(&key, label, &aad, plaintext).map_err(err_to_js)
}

/// Open an envelope, failing closed on any AAD, nonce, or key mismatch.
#[wasm_bindgen]
pub fn envelope_open_js(key_hex: &str, label: &str, aad_json: &str, envelope: &[u8]) -> Result<Vec<u8>, JsValue> {
    let key = parse_hex32(key_hex)?;
    let aad = aad_from_json(aad_json)?;
    envelope_open(&key, label, &aad, envelope).map_err(err_to_js)
}

/// Validate a manifest and return `{ok, issues}`.
#[wasm_bindgen]
pub fn manifest_validate(json: &str) -> Result<String, JsValue> {
    let issues = manifest::validate(json);
    let value = serde_json::json!({ "ok": issues.is_empty(), "issues": issues });
    Ok(value.to_string())
}

fn entries_from_json(json: &str) -> Result<Vec<MappEntry>, JsValue> {
    use base64::Engine;
    let parsed: Vec<serde_json::Value> = serde_json::from_str(json)
        .map_err(|e| JsValue::from_str(&format!("E-CLI-001|{e}")))?;
    let mut entries = Vec::with_capacity(parsed.len());
    for item in parsed {
        let path = item
            .get("path")
            .and_then(|v| v.as_str())
            .ok_or_else(|| JsValue::from_str("E-CLI-001|entry path missing"))?;
        let is_dir = item.get("isDir").and_then(|v| v.as_bool()).unwrap_or(false);
        let data = if is_dir {
            Vec::new()
        } else {
            let encoded = item
                .get("dataBase64")
                .and_then(|v| v.as_str())
                .ok_or_else(|| JsValue::from_str("E-CLI-001|entry data missing"))?;
            base64::engine::general_purpose::STANDARD
                .decode(encoded)
                .map_err(|e| JsValue::from_str(&format!("E-CLI-001|{e}")))?
        };
        entries.push(MappEntry { path: path.to_string(), is_dir, data });
    }
    Ok(entries)
}

/// Pack a `.mapp`; seeds are hex Ed25519 seeds (`authorSeedHex` is required).
#[wasm_bindgen]
pub fn mapp_pack(
    manifest_json: &str,
    entries_json: &str,
    author_seed_hex: &str,
    registry_seed_hex: &str,
) -> Result<Vec<u8>, JsValue> {
    let entries = entries_from_json(entries_json)?;
    let author_seed = parse_hex32(author_seed_hex)?;
    let author_key = signing_key_from_seed(&author_seed);
    let registry_key = if registry_seed_hex.is_empty() {
        None
    } else {
        let seed = parse_hex32(registry_seed_hex)?;
        Some(signing_key_from_seed(&seed))
    };
    mapp::pack(manifest_json, entries, Some(&author_key), registry_key.as_ref()).map_err(err_to_js)
}

/// Verify a `.mapp` and return the verified manifest plus digest.
#[wasm_bindgen]
pub fn mapp_verify(
    bytes: &[u8],
    source: &str,
    author_pubkey_hex: &str,
    registry_pubkey_hex: &str,
) -> Result<String, JsValue> {
    let source = match source {
        "local" => InstallSource::Local,
        "registry" => InstallSource::Registry,
        "enterprise" => InstallSource::Enterprise,
        "git" => InstallSource::Git,
        other => return Err(JsValue::from_str(&format!("E-CLI-001|unknown source {other}"))),
    };
    let author = if author_pubkey_hex.is_empty() {
        None
    } else {
        Some(parse_hex32(author_pubkey_hex)?)
    };
    let registry = if registry_pubkey_hex.is_empty() {
        None
    } else {
        Some(parse_hex32(registry_pubkey_hex)?)
    };
    let verified = mapp::verify(bytes, source, author.as_ref(), registry.as_ref()).map_err(err_to_js)?;
    Ok(serde_json::json!({
        "manifest": verified.manifest,
        "digest": hex_lower(&verified.digest),
        "entryCount": verified.entry_count,
        "decompressedBytes": verified.decompressed_bytes,
        "hasAuthorSignature": verified.author_signature.is_some(),
        "hasRegistrySignature": verified.registry_signature.is_some(),
    })
    .to_string())
}

/// Extract entries for the OPFS loader; data crosses as base64.
#[wasm_bindgen]
pub fn mapp_extract_entries(bytes: &[u8]) -> Result<String, JsValue> {
    use base64::Engine;
    let entries = mapp::extract_entries(bytes).map_err(err_to_js)?;
    let value = entries
        .iter()
        .map(|entry| {
            serde_json::json!({
                "path": entry.path,
                "isDir": entry.is_dir,
                "dataBase64": if entry.is_dir {
                    String::new()
                } else {
                    base64::engine::general_purpose::STANDARD.encode(&entry.data)
                },
                "size": entry.data.len(),
            })
        })
        .collect::<Vec<_>>();
    Ok(serde_json::Value::Array(value).to_string())
}

/// Compute an audit entry hash for the next chain entry.
#[wasm_bindgen]
pub fn audit_hash_js(prev_hash_hex: &str, seq_id: f64, payload_json: &str) -> Result<String, JsValue> {
    let prev_bytes = hex_decode(prev_hash_hex).map_err(err_to_js)?;
    if prev_bytes.len() != 32 {
        return Err(JsValue::from_str("E-HOST-006|prev_hash must be 32 bytes"));
    }
    let mut prev = [0u8; 32];
    prev.copy_from_slice(&prev_bytes);
    let payload: AuditPayload = serde_json::from_str(payload_json)
        .map_err(|e| JsValue::from_str(&format!("E-CLI-001|{e}")))?;
    let hash = audit_hash(&prev, seq_id as u64, &payload).map_err(err_to_js)?;
    Ok(hex_lower(&hash))
}

/// Append an audit entry to an in-memory chain and return the new entry JSON.
#[wasm_bindgen]
pub fn audit_append(entries_json: &str, payload_json: &str) -> Result<String, JsValue> {
    let entries: Vec<AuditEntry> = serde_json::from_str(entries_json)
        .map_err(|e| JsValue::from_str(&format!("E-CLI-001|{e}")))?;
    let payload: AuditPayload = serde_json::from_str(payload_json)
        .map_err(|e| JsValue::from_str(&format!("E-CLI-001|{e}")))?;
    let mut log = AuditLog::new();
    for entry in entries {
        log.append(entry.payload).map_err(err_to_js)?;
    }
    let appended = log.append(payload).map_err(err_to_js)?.clone();
    Ok(serde_json::to_string(&appended).map_err(|e| JsValue::from_str(&format!("E-CLI-001|{e}")))?)
}

/// Verify an audit chain; returns `{ok, error}`.
#[wasm_bindgen]
pub fn audit_verify(entries_json: &str) -> Result<String, JsValue> {
    let entries: Vec<AuditEntry> = serde_json::from_str(entries_json)
        .map_err(|e| JsValue::from_str(&format!("E-CLI-001|{e}")))?;
    match verify_chain(&entries) {
        Ok(()) => Ok(serde_json::json!({ "ok": true }).to_string()),
        Err(err) => Ok(serde_json::json!({ "ok": false, "error": err.to_string() }).to_string()),
    }
}

/// Advance an HLC and return the encoded 24-byte value as hex.
#[wasm_bindgen]
pub fn hlc_tick(hlc_json: &str, now_ms: f64) -> Result<String, JsValue> {
    let mut value: Hlc = serde_json::from_str(hlc_json)
        .map_err(|e| JsValue::from_str(&format!("E-CLI-001|{e}")))?;
    value.tick(now_ms as u64);
    Ok(serde_json::json!({
        "hlc": value,
        "encoded": hex_lower(&value.encode()),
    })
    .to_string())
}

/// Guard an SQL statement against cross-database escapes.
#[wasm_bindgen]
pub fn guard_check_sql(sql: &str) -> Result<(), JsValue> {
    guard::check_sql(sql).map_err(err_to_js)
}

/// Guard a relative path against traversal and absolute paths.
#[wasm_bindgen]
pub fn guard_check_path(path: &str) -> Result<(), JsValue> {
    guard::check_path(path).map_err(err_to_js)
}

/// Guard an outbound domain against SSRF targets.
#[wasm_bindgen]
pub fn guard_check_domain(host: &str) -> Result<(), JsValue> {
    guard::check_domain(host).map_err(err_to_js)
}

/// Sign a 32-byte digest with an Ed25519 seed, returning 64 raw bytes.
#[wasm_bindgen]
pub fn ed25519_sign_seed(seed_hex: &str, digest: &[u8]) -> Result<Vec<u8>, JsValue> {
    let seed = parse_hex32(seed_hex)?;
    let key = signing_key_from_seed(&seed);
    Ok(crate::crypto::ed25519_sign(&key, digest).to_vec())
}

/// Verify an Ed25519 signature over a digest.
#[wasm_bindgen]
pub fn ed25519_verify_js(pubkey_hex: &str, digest: &[u8], signature: &[u8]) -> Result<(), JsValue> {
    let key = parse_hex32(pubkey_hex)?;
    ed25519_verify(&key, digest, signature).map_err(err_to_js)
}

/// Public key for a seed, plus fingerprint/keyId for manifest authoring.
#[wasm_bindgen]
pub fn ed25519_public_seed(seed_hex: &str) -> Result<String, JsValue> {
    let seed = parse_hex32(seed_hex)?;
    let key = signing_key_from_seed(&seed);
    let public = ed25519_public(&key);
    let digest = crate::crypto::sha256(&public);
    let fingerprint = hex_lower(&digest);
    Ok(serde_json::json!({
        "publicKey": hex_lower(&public),
        "fingerprint": fingerprint,
        "keyId": &fingerprint[..16],
    })
    .to_string())
}

/// SHA-256 of arbitrary bytes, hex encoded.
#[wasm_bindgen]
pub fn sha256_hex(bytes: &[u8]) -> String {
    hex_lower(&crate::crypto::sha256(bytes))
}
