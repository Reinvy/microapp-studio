//! `mapp-tool` — fixture and developer CLI for `.mapp` v2 packages.
//!
//! Commands: `keygen`, `pack`, `verify`, `inspect`. `pack` follows the same
//! two-step authoring path as the Studio: prepare (digests + contentHash), sign
//! the signature message, finalize. `verify` exits non-zero on any failure and
//! prints the manifest digest on success.

use std::fs;
use std::path::{Path, PathBuf};
use std::process::ExitCode;

use microapp_core::crypto::{ed25519_public, hex_lower, sha256};
use microapp_core::manifest;
use microapp_core::mapp::{self, InstallSource, MappEntry, MANIFEST_PATH, SIGNATURE_PATH};
use microapp_core::CoreResult;

fn usage() -> &'static str {
    "usage:
  mapp-tool keygen [--seed <64 hex>]
  mapp-tool pack <microapp.manifest.json> <dir> -o <out.mapp> [--author-seed <hex>] [--unsigned]
  mapp-tool verify <file.mapp> --author-pub <hex> [--registry-pub <hex>] [--source local|registry|git|enterprise]
  mapp-tool inspect <file.mapp>"
}

fn arg_value<'a>(args: &'a [String], flag: &str) -> Option<&'a str> {
    args.iter()
        .position(|arg| arg == flag)
        .and_then(|index| args.get(index + 1))
        .map(|value| value.as_str())
}

fn has_flag(args: &[String], flag: &str) -> bool {
    args.iter().any(|arg| arg == flag)
}

fn parse_seed(value: &str) -> CoreResult<[u8; 32]> {
    let bytes = microapp_core::crypto::hex_decode(value)?;
    if bytes.len() != 32 {
        return Err(microapp_core::CoreError::Crypto("seed must be 32 bytes".into()));
    }
    let mut out = [0u8; 32];
    out.copy_from_slice(&bytes);
    Ok(out)
}

fn parse_public(value: Option<&str>) -> CoreResult<Option<[u8; 32]>> {
    match value {
        Some(hex) => Ok(Some(mapp::parse_pubkey(hex)?)),
        None => Ok(None),
    }
}

fn walk(dir: &Path, prefix: &Path, entries: &mut Vec<MappEntry>) -> CoreResult<()> {
    let mut children: Vec<PathBuf> = fs::read_dir(dir)?
        .filter_map(|entry| entry.ok())
        .map(|entry| entry.path())
        .collect();
    children.sort();
    for child in children {
        let relative = child.strip_prefix(prefix).unwrap_or(&child).to_path_buf();
        let normalized = relative
            .components()
            .map(|component| component.as_os_str().to_string_lossy().to_string())
            .collect::<Vec<_>>()
            .join("/");
        if child.is_dir() {
            entries.push(MappEntry::dir(format!("{normalized}/")));
            walk(&child, prefix, entries)?;
        } else if normalized != MANIFEST_PATH && normalized != SIGNATURE_PATH {
            entries.push(MappEntry::file(normalized, fs::read(&child)?));
        }
    }
    Ok(())
}

fn run() -> CoreResult<i32> {
    let args: Vec<String> = std::env::args().skip(1).collect();
    let Some(command) = args.first() else {
        println!("{}", usage());
        return Ok(2);
    };
    match command.as_str() {
        "keygen" => {
            let seed = match arg_value(&args, "--seed") {
                Some(value) => parse_seed(value)?,
                None => microapp_core::crypto::random_32(),
            };
            let signing = microapp_core::crypto::signing_key_from_seed(&seed);
            let public = ed25519_public(&signing);
            let fingerprint = hex_lower(&sha256(&public));
            let payload = serde_json::json!({
                "seed": hex_lower(&seed),
                "publicKey": hex_lower(&public),
                "fingerprint": fingerprint,
                "keyId": &fingerprint[..16],
            });
            println!("{}", serde_json::to_string_pretty(&payload).unwrap());
            Ok(0)
        }
        "pack" => {
            let manifest_path = args
                .get(1)
                .ok_or_else(|| microapp_core::CoreError::Package("manifest path required".into()))?;
            let dir = args
                .get(2)
                .ok_or_else(|| microapp_core::CoreError::Package("package directory required".into()))?;
            let output = arg_value(&args, "-o")
                .ok_or_else(|| microapp_core::CoreError::Package("output path (-o) required".into()))?;
            let manifest_json = fs::read_to_string(manifest_path)?;
            let mut entries = Vec::new();
            walk(Path::new(dir), Path::new(dir), &mut entries)?;
            let bytes = match arg_value(&args, "--author-seed") {
                Some(value) if !has_flag(&args, "--unsigned") => {
                    let seed = parse_seed(value)?;
                    let signing = microapp_core::crypto::signing_key_from_seed(&seed);
                    mapp::pack_with_key(&manifest_json, &entries, &signing)?
                }
                Some(_) | None => mapp::build_unsigned(&manifest_json, &entries)?,
            };
            fs::write(output, &bytes)?;
            println!("packed {} ({} bytes)", output, bytes.len());
            Ok(0)
        }
        "verify" => {
            let file = args
                .get(1)
                .ok_or_else(|| microapp_core::CoreError::Package("file required".into()))?;
            let source = InstallSource::parse(arg_value(&args, "--source").unwrap_or("local"))?;
            let author = parse_public(arg_value(&args, "--author-pub"))?;
            let registry = parse_public(arg_value(&args, "--registry-pub"))?;
            if author.is_none() {
                return Err(microapp_core::CoreError::Signature(
                    "--author-pub <hex> is required to verify an author signature".into(),
                ));
            }
            let bytes = fs::read(file)?;
            let verified = mapp::verify(&bytes, source, author.as_ref(), registry.as_ref())?;
            println!(
                "verified {} {} ({} entries, {} bytes decompressed, digest {})",
                verified.manifest.id,
                verified.manifest.version,
                verified.entry_count,
                verified.decompressed_bytes,
                hex_lower(&verified.digest)
            );
            Ok(0)
        }
        "inspect" => {
            let file = args
                .get(1)
                .ok_or_else(|| microapp_core::CoreError::Package("file required".into()))?;
            let bytes = fs::read(file)?;
            let entries = mapp::extract_entries(&bytes)?;
            let manifest_entry = entries
                .iter()
                .find(|entry| entry.path == MANIFEST_PATH)
                .ok_or_else(|| microapp_core::CoreError::Package(format!("{MANIFEST_PATH} missing")))?;
            let manifest = manifest::parse(
                std::str::from_utf8(&manifest_entry.data)
                    .map_err(|_| microapp_core::CoreError::Package("manifest not UTF-8".into()))?,
            )?;
            let summary = mapp::layout_summary(&entries);
            println!(
                "{}",
                serde_json::to_string_pretty(&serde_json::json!({
                    "id": manifest.id,
                    "version": manifest.version,
                    "contentHash": manifest.integrity.content_hash,
                    "permissions": manifest.permissions,
                    "networkAllowlist": manifest.network_allowlist(),
                    "ui": manifest.ui,
                    "entries": entries.len(),
                    "topLevel": summary,
                }))
                .unwrap()
            );
            Ok(0)
        }
        other => {
            eprintln!("unknown command {other}\n{}", usage());
            Ok(2)
        }
    }
}

fn main() -> ExitCode {
    match run() {
        Ok(code) => ExitCode::from(code as u8),
        Err(err) => {
            eprintln!("error [{}]: {err}", err.code());
            ExitCode::from(1)
        }
    }
}
