//! `.mapp` determinism, guards, and signature policy.

use std::io::{Cursor, Write};

use microapp_core::crypto::{ed25519_public, hex_lower, sha256, signing_key_from_seed};
use microapp_core::mapp::{
    self, InstallSource, MappEntry, AUTHOR_SIGNATURE_PATH, REGISTRY_SIGNATURE_PATH,
};
use microapp_core::manifest;
use zip::write::SimpleFileOptions;
use zip::{CompressionMethod, ZipWriter};

const AUTHOR_SEED: [u8; 32] = [1u8; 32];
const REGISTRY_SEED: [u8; 32] = [2u8; 32];

fn author_public() -> [u8; 32] {
    ed25519_public(&signing_key_from_seed(&AUTHOR_SEED))
}

fn registry_public() -> [u8; 32] {
    ed25519_public(&signing_key_from_seed(&REGISTRY_SEED))
}

fn manifest_json() -> String {
    serde_json::to_string(&manifest::Manifest {
        ..mapp::manifest_template(
            "org.reinvy.kas-offline",
            "KasLokal",
            "1.3.0",
            &author_public(),
            &format!("sha256-{}", "0".repeat(64)),
        )
    })
    .unwrap()
}

fn entries() -> Vec<MappEntry> {
    vec![
        MappEntry::file("dist/app.bundle.js", "console.log('hi');".as_bytes().to_vec()),
        MappEntry::file("assets/icon.txt", b"icon".to_vec()),
        MappEntry::dir("db/migrations/"),
    ]
}

fn pack_local() -> Vec<u8> {
    let author = signing_key_from_seed(&AUTHOR_SEED);
    mapp::pack(&manifest_json(), entries(), Some(&author), None).unwrap()
}

#[test]
fn packing_is_deterministic() {
    let first = pack_local();
    let second = pack_local();
    assert_eq!(first, second, "two packs of identical input must be byte-identical");
}

#[test]
fn local_pack_verifies_with_author_signature() {
    let bytes = pack_local();
    let verified =
        mapp::verify(&bytes, InstallSource::Local, Some(&author_public()), None).unwrap();
    assert_eq!(verified.manifest.id, "org.reinvy.kas-offline");
    assert!(verified.author_signature.is_some());
    assert!(verified.registry_signature.is_none());
    // dist bundle + asset + db dir + manifest + author signature
    assert_eq!(verified.entry_count, 5);
    assert_eq!(
        verified.manifest.content_hash,
        format!("sha256-{}", hex_lower(&verified.digest))
    );
}

#[test]
fn registry_install_requires_both_distinct_keys() {
    let author = signing_key_from_seed(&AUTHOR_SEED);
    let registry = signing_key_from_seed(&REGISTRY_SEED);
    let bytes = mapp::pack(&manifest_json(), entries(), Some(&author), Some(&registry)).unwrap();
    let verified = mapp::verify(
        &bytes,
        InstallSource::Registry,
        Some(&author_public()),
        Some(&registry_public()),
    )
    .unwrap();
    assert!(verified.author_signature.is_some());
    assert!(verified.registry_signature.is_some());

    // Registry install without an author key is rejected.
    assert!(mapp::verify(&bytes, InstallSource::Registry, None, Some(&registry_public())).is_err());
    // Registry install with the same key for both roles is rejected.
    assert!(mapp::verify(
        &bytes,
        InstallSource::Registry,
        Some(&author_public()),
        Some(&author_public())
    )
    .is_err());

    // Packing with the same key twice is rejected outright.
    assert!(mapp::pack(&manifest_json(), entries(), Some(&author), Some(&author)).is_err());
}

#[test]
fn local_pack_with_registry_signature_present_must_verify() {
    let author = signing_key_from_seed(&AUTHOR_SEED);
    let registry = signing_key_from_seed(&REGISTRY_SEED);
    let bytes = mapp::pack(&manifest_json(), entries(), Some(&author), Some(&registry)).unwrap();
    // Valid registry signature: local install verifies.
    mapp::verify(
        &bytes,
        InstallSource::Local,
        Some(&author_public()),
        Some(&registry_public()),
    )
    .unwrap();
    // Wrong registry key: rejected.
    assert!(mapp::verify(
        &bytes,
        InstallSource::Local,
        Some(&author_public()),
        Some(&[9u8; 32])
    )
    .is_err());
}

#[test]
fn git_install_allows_unsigned_with_warning_surface() {
    let bytes = mapp::pack(&manifest_json(), entries(), None, None).unwrap();
    let verified = mapp::verify(&bytes, InstallSource::Git, None, None).unwrap();
    assert!(verified.author_signature.is_none());
    // But local install of the same unsigned package is rejected.
    assert!(mapp::verify(&bytes, InstallSource::Local, Some(&author_public()), None).is_err());
}

#[test]
fn tampered_content_breaks_content_hash() {
    let bytes = pack_local();
    // Flip a byte inside the deflated bundle payload by repacking with new data.
    let author = signing_key_from_seed(&AUTHOR_SEED);
    let mut changed = entries();
    changed[0].data = b"console.log('tampered');".to_vec();
    let repacked = mapp::pack(&manifest_json(), changed, Some(&author), None).unwrap();
    // Changing content changes contentHash, so the old manifest hash no longer matches.
    let verified = mapp::verify(&repacked, InstallSource::Local, Some(&author_public()), None).unwrap();
    assert_ne!(verified.digest, sha256(&pack_local()));
    assert_ne!(verified.manifest.content_hash, mapp::verify(&bytes, InstallSource::Local, Some(&author_public()), None).unwrap().manifest.content_hash);
}

#[test]
fn rejects_traversal_absolute_and_duplicate_entries_at_pack_time() {
    let author = signing_key_from_seed(&AUTHOR_SEED);
    for path in ["../evil.js", "/etc/passwd", "dist/../../x.js", "dist\\app.js"] {
        let mut bad = entries();
        bad.push(MappEntry::file(path, Vec::new()));
        assert!(
            mapp::pack(&manifest_json(), bad, Some(&author), None).is_err(),
            "pack must reject {path}"
        );
    }
    let mut duplicate = entries();
    duplicate.push(MappEntry::file("dist/app.bundle.js", b"dup".to_vec()));
    assert!(mapp::pack(&manifest_json(), duplicate, Some(&author), None).is_err());
}

fn raw_zip(entries: &[(&str, &[u8], u32)]) -> Vec<u8> {
    let mut writer = ZipWriter::new(Cursor::new(Vec::new()));
    for (name, data, mode) in entries {
        let options = SimpleFileOptions::default()
            .compression_method(CompressionMethod::Stored)
            .unix_permissions(*mode);
        writer.start_file(*name, options).unwrap();
        writer.write_all(data).unwrap();
    }
    writer.finish().unwrap().into_inner()
}

#[test]
fn extractor_rejects_traversal_symlink_and_duplicates() {
    let traversal = raw_zip(&[("manifest.json", b"{}", 0o644), ("../evil.js", b"x", 0o644)]);
    assert!(mapp::extract_entries(&traversal).is_err());

    // A symlink entry cannot be produced by the safe writer (it masks modes to
    // 0o777), so craft the raw ZIP structure with S_IFLNK external attributes.
    let symlink = raw_symlink_zip("dist/link.js", b"/etc/passwd");
    let error = mapp::extract_entries(&symlink).expect_err("symlink must be rejected");
    assert!(error.to_string().contains("symlink"));

    let absolute = raw_zip(&[("/abs.js", b"x", 0o644)]);
    assert!(mapp::extract_entries(&absolute).is_err());
}

/// Minimal single-entry stored ZIP with a POSIX symlink mode in external attrs.
fn raw_symlink_zip(name: &str, target: &[u8]) -> Vec<u8> {
    let name_bytes = name.as_bytes();
    let mut out: Vec<u8> = Vec::new();
    let crc: u32 = 0; // Data is rejected before CRC verification.
    let size = target.len() as u32;
    // Local file header.
    out.extend_from_slice(&0x0403_4b50u32.to_le_bytes());
    out.extend_from_slice(&20u16.to_le_bytes());
    out.extend_from_slice(&0u16.to_le_bytes());
    out.extend_from_slice(&0u16.to_le_bytes());
    out.extend_from_slice(&0u16.to_le_bytes());
    out.extend_from_slice(&0u16.to_le_bytes());
    out.extend_from_slice(&crc.to_le_bytes());
    out.extend_from_slice(&size.to_le_bytes());
    out.extend_from_slice(&size.to_le_bytes());
    out.extend_from_slice(&(name_bytes.len() as u16).to_le_bytes());
    out.extend_from_slice(&0u16.to_le_bytes());
    out.extend_from_slice(name_bytes);
    out.extend_from_slice(target);
    // Central directory header.
    let central_offset = 0u32;
    let mut central: Vec<u8> = Vec::new();
    central.extend_from_slice(&0x0201_4b50u32.to_le_bytes());
    central.extend_from_slice(&0x0314u16.to_le_bytes()); // made by UNIX, v2.0
    central.extend_from_slice(&20u16.to_le_bytes());
    central.extend_from_slice(&0u16.to_le_bytes());
    central.extend_from_slice(&0u16.to_le_bytes());
    central.extend_from_slice(&0u16.to_le_bytes());
    central.extend_from_slice(&0u16.to_le_bytes());
    central.extend_from_slice(&crc.to_le_bytes());
    central.extend_from_slice(&size.to_le_bytes());
    central.extend_from_slice(&size.to_le_bytes());
    central.extend_from_slice(&(name_bytes.len() as u16).to_le_bytes());
    central.extend_from_slice(&0u16.to_le_bytes());
    central.extend_from_slice(&0u16.to_le_bytes());
    central.extend_from_slice(&0u16.to_le_bytes());
    central.extend_from_slice(&0u16.to_le_bytes());
    central.extend_from_slice(&(0o120777u32 << 16).to_le_bytes());
    central.extend_from_slice(&central_offset.to_le_bytes());
    central.extend_from_slice(name_bytes);
    let central_size = central.len() as u32;
    out.extend_from_slice(&central);
    // End of central directory.
    let central_start = (out.len() - central_size as usize) as u32;
    out.extend_from_slice(&0x0605_4b50u32.to_le_bytes());
    out.extend_from_slice(&0u16.to_le_bytes());
    out.extend_from_slice(&0u16.to_le_bytes());
    out.extend_from_slice(&1u16.to_le_bytes());
    out.extend_from_slice(&1u16.to_le_bytes());
    out.extend_from_slice(&central_size.to_le_bytes());
    out.extend_from_slice(&central_start.to_le_bytes());
    out.extend_from_slice(&0u16.to_le_bytes());
    out
}

#[test]
fn extractor_enforces_entry_count_limit() {
    let mut writer = ZipWriter::new(Cursor::new(Vec::new()));
    let options = SimpleFileOptions::default().compression_method(CompressionMethod::Stored);
    for index in 0..(mapp::MAX_ENTRIES + 1) {
        writer.start_file(format!("dist/file-{index}.bin"), options).unwrap();
        writer.write_all(b"").unwrap();
    }
    let bytes = writer.finish().unwrap().into_inner();
    let error = mapp::extract_entries(&bytes).expect_err("entry limit must reject");
    assert!(error.to_string().contains("limit"));
}

#[test]
fn extractor_enforces_compressed_size_limit() {
    // 65 MiB of incompressible-ish zeros still compresses well; build raw bytes
    // larger than the limit directly to exercise the early guard.
    let oversized = vec![0u8; (mapp::MAX_COMPRESSED_BYTES + 1) as usize];
    let error = mapp::extract_entries(&oversized).expect_err("compressed limit must reject");
    assert!(error.to_string().contains("64 MiB"));
}

#[test]
fn missing_dist_is_rejected() {
    let author = signing_key_from_seed(&AUTHOR_SEED);
    let no_dist = vec![MappEntry::file("assets/icon.txt", b"icon".to_vec())];
    assert!(mapp::pack(&manifest_json(), no_dist, Some(&author), None).is_err());
}

#[test]
fn signature_files_are_not_part_of_the_digest() {
    let bytes = pack_local();
    let packed = mapp::extract_entries(&bytes).unwrap();
    assert!(packed.iter().any(|entry| entry.path == AUTHOR_SIGNATURE_PATH));
    assert!(!packed.iter().any(|entry| entry.path == REGISTRY_SIGNATURE_PATH));
    // Re-packing must not change the digest when only signatures differ.
    let author = signing_key_from_seed(&AUTHOR_SEED);
    let unsigned = mapp::pack(&manifest_json(), entries(), None, None).unwrap();
    let signed = mapp::pack(&manifest_json(), entries(), Some(&author), None).unwrap();
    let unsigned_verified = mapp::verify(&unsigned, InstallSource::Git, None, None).unwrap();
    let signed_verified =
        mapp::verify(&signed, InstallSource::Local, Some(&author_public()), None).unwrap();
    assert_eq!(unsigned_verified.manifest.content_hash, signed_verified.manifest.content_hash);
}

#[test]
fn publisher_fields_must_match_author_key() {
    let other_public = ed25519_public(&signing_key_from_seed(&[7u8; 32]));
    let mismatch = serde_json::to_string(&mapp::manifest_template(
        "org.reinvy.other",
        "Other",
        "1.0.0",
        &other_public,
        &format!("sha256-{}", "0".repeat(64)),
    ))
    .unwrap();
    let author = signing_key_from_seed(&AUTHOR_SEED);
    let bytes = mapp::pack(&mismatch, entries(), Some(&author), None).unwrap();
    let error = mapp::verify(&bytes, InstallSource::Local, Some(&author_public()), None)
        .expect_err("publisher fingerprint must match author key");
    assert!(error.to_string().contains("fingerprint"));
}
