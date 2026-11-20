//! `mapp-tool` — fixture and developer CLI for `.mapp` packages.
//!
//! Commands: `keygen`, `pack`, `verify`, `inspect`. It is used by tests, by
//! `scripts/build-core.mjs` smoke checks, and by developers producing signed
//! fixtures without the full Studio.

use std::fs;
use std::path::{Path, PathBuf};
use std::process::ExitCode;

use microapp_core::crypto::{ed25519_public, hex_lower, sha256};
use microapp_core::manifest;
use microapp_core::mapp::{self, InstallSource, MappEntry};
use microapp_core::CoreResult;

fn usage() -> &'static str {
    "usage:
  mapp-tool keygen [--seed <64 hex>] [--json]
  mapp-tool pack <manifest.json> <dir> -o <out.mapp> [--author-seed <hex>] [--registry-seed <hex>]
  mapp-tool verify <file.mapp> [--author-pub <hex>] [--registry-pub <hex>] [--source local|registry|git|enterprise]
  mapp-tool inspect <file.mapp>"
}

fn arg_value<'a>(args: &'a [String], flag: &str) -> Option<&'a str> {
    args.iter()
        .position(|arg| arg == flag)
        .and_then(|index| args.get(index + 1))
        .map(|value| value.as_str())
}

fn walk(dir: &Path, prefix: &Path, entries: &mut Vec<MappEntry>) -> CoreResult<()> {
    let mut children: Vec<PathBuf> = fs::read_dir(dir)?.filter_map(|e| e.ok()).map(|e| e.path()).collect();
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
        } else if normalized != "manifest.json" && !normalized.starts_with("signatures/") {
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
                Some(value) => {
                    let bytes = microapp_core::crypto::hex_decode(value)?;
                    if bytes.len() != 32 {
                        return Err(microapp_core::CoreError::Crypto("seed must be 32 bytes".into()));
                    }
                    let mut out = [0u8; 32];
                    out.copy_from_slice(&bytes);
                    out
                }
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
            let manifest_path = args.get(1).ok_or_else(|| {
                microapp_core::CoreError::Package("manifest path required".into())
            })?;
            let dir = args.get(2).ok_or_else(|| {
                microapp_core::CoreError::Package("package directory required".into())
            })?;
            let output = arg_value(&args, "-o").ok_or_else(|| {
                microapp_core::CoreError::Package("output path (-o) required".into())
            })?;
            let manifest_json = fs::read_to_string(manifest_path)?;
            let mut entries = Vec::new();
            walk(Path::new(dir), Path::new(dir), &mut entries)?;
            let author_key = match arg_value(&args, "--author-seed") {
                Some(value) => {
                    let bytes = microapp_core::crypto::hex_decode(value)?;
                    let mut seed = [0u8; 32];
                    if bytes.len() != 32 {
                        return Err(microapp_core::CoreError::Crypto("author seed must be 32 bytes".into()));
                    }
                    seed.copy_from_slice(&bytes);
                    Some(microapp_core::crypto::signing_key_from_seed(&seed))
                }
                None => None,
            };
            let registry_key = match arg_value(&args, "--registry-seed") {
                Some(value) => {
                    let bytes = microapp_core::crypto::hex_decode(value)?;
                    let mut seed = [0u8; 32];
                    if bytes.len() != 32 {
                        return Err(microapp_core::CoreError::Crypto("registry seed must be 32 bytes".into()));
                    }
                    seed.copy_from_slice(&bytes);
                    Some(microapp_core::crypto::signing_key_from_seed(&seed))
                }
                None => None,
            };
            let bytes = mapp::pack(&manifest_json, entries, author_key.as_ref(), registry_key.as_ref())?;
            fs::write(output, &bytes)?;
            println!("packed {} ({} bytes)", output, bytes.len());
            Ok(0)
        }
        "verify" => {
            let file = args.get(1).ok_or_else(|| microapp_core::CoreError::Package("file required".into()))?;
            let source = match arg_value(&args, "--source").unwrap_or("local") {
                "local" => InstallSource::Local,
                "registry" => InstallSource::Registry,
                "enterprise" => InstallSource::Enterprise,
                "git" => InstallSource::Git,
                other => {
                    return Err(microapp_core::CoreError::Package(format!("unknown source {other}")))
                }
            };
            let parse_key = |value: Option<&str>| -> CoreResult<Option<[u8; 32]>> {
                match value {
                    Some(hex) => {
                        let bytes = microapp_core::crypto::hex_decode(hex)?;
                        if bytes.len() != 32 {
                            return Err(microapp_core::CoreError::Crypto("public key must be 32 bytes".into()));
                        }
                        let mut out = [0u8; 32];
                        out.copy_from_slice(&bytes);
                        Ok(Some(out))
                    }
                    None => Ok(None),
                }
            };
            let author = parse_key(arg_value(&args, "--author-pub"))?;
            let registry = parse_key(arg_value(&args, "--registry-pub"))?;
            let bytes = fs::read(file)?;
            let verified = mapp::verify(&bytes, source, author.as_ref(), registry.as_ref())?;
            println!(
                "verified {} {} ({} entries, {} bytes decompressed, digest sha256-{})",
                verified.manifest.id,
                verified.manifest.version,
                verified.entry_count,
                verified.decompressed_bytes,
                hex_lower(&verified.digest)
            );
            Ok(0)
        }
        "inspect" => {
            let file = args.get(1).ok_or_else(|| microapp_core::CoreError::Package("file required".into()))?;
            let bytes = fs::read(file)?;
            let entries = mapp::extract_entries(&bytes)?;
            let manifest_entry = entries
                .iter()
                .find(|entry| entry.path == mapp::MANIFEST_PATH)
                .ok_or_else(|| microapp_core::CoreError::Package("manifest.json missing".into()))?;
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
                    "contentHash": manifest.content_hash,
                    "minHostVersion": manifest.min_host_version,
                    "secureDisplay": manifest.runtime.secure_display,
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
