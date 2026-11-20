//! Audit chain, HLC ordering, and SQL/path/domain guards.

use microapp_core::audit::{audit_hash, verify_chain, AuditLog, AuditPayload};
use microapp_core::guard::{
    check_domain, check_path, check_resolved_ip, check_sql, domain_allowed, check_sql as sql,
};
use microapp_core::hlc::Hlc;
use serde_json::json;

fn payload(action: &str) -> AuditPayload {
    AuditPayload {
        actor: "user".to_string(),
        action: action.to_string(),
        target: Some("org.reinvy.kas".to_string()),
        metadata: json!({ "permission": "camera" }),
        created_at_ms: 1_700_000_000_000,
    }
}

#[test]
fn audit_chain_appends_and_verifies() {
    let mut log = AuditLog::new();
    log.append(payload("app.install")).unwrap();
    log.append(payload("permission.grant")).unwrap();
    log.append(payload("permission.revoke")).unwrap();
    assert_eq!(log.entries().len(), 3);
    assert_eq!(log.entries()[0].prev_hash, [0u8; 32]);
    assert_eq!(log.entries()[1].prev_hash, log.entries()[0].entry_hash);
    assert_eq!(log.entries()[2].seq_id, 3);
    verify_chain(log.entries()).unwrap();
}

#[test]
fn audit_chain_detects_tamper_and_gaps() {
    let mut log = AuditLog::new();
    log.append(payload("app.install")).unwrap();
    log.append(payload("permission.grant")).unwrap();

    let mut tampered = log.entries().to_vec();
    tampered[1].payload.action = "permission.grant.silent".to_string();
    assert!(verify_chain(&tampered).is_err());

    let mut gap = log.entries().to_vec();
    gap[1].seq_id = 5;
    assert!(verify_chain(&gap).is_err());

    let mut reordered = log.entries().to_vec();
    reordered.swap(0, 1);
    assert!(verify_chain(&reordered).is_err());
}

#[test]
fn audit_hash_is_sequence_sensitive() {
    let payload = payload("app.install");
    let prev = [0u8; 32];
    let first = audit_hash(&prev, 1, &payload).unwrap();
    let second = audit_hash(&prev, 2, &payload).unwrap();
    assert_ne!(first, second);
    let chained = audit_hash(&first, 2, &payload).unwrap();
    assert_ne!(chained, second);
}

#[test]
fn hlc_ticks_are_monotonic_and_merge() {
    let site = [7u8; 16];
    let mut clock = Hlc::new(1_000, site);
    clock.tick(1_000);
    let first = clock.encode();
    clock.tick(1_000);
    let second = clock.encode();
    assert!(first < second, "same-ms tick must increase the counter");

    // Wall clock going backwards never lowers the HLC.
    clock.tick(900);
    let third = clock.encode();
    assert!(third > second);

    // Observing a remote clock ahead of local time adopts its physical time.
    let remote = Hlc { physical_ms: 5_000, counter: 2, site_id: [9u8; 16] };
    clock.observe(remote, 2_000);
    assert_eq!(clock.physical_ms, 5_000);
    assert_eq!(clock.counter, 3);

    // Round-trip encoding preserves ordering.
    let decoded = Hlc::decode(&third).unwrap();
    assert_eq!(decoded.encode(), third);
    assert!(Hlc::decode(&[0u8; 23]).is_none());
}

#[test]
fn sql_guard_blocks_escape_hatches() {
    for statement in [
        "ATTACH DATABASE 'other.db' AS other",
        "PRAGMA writable_schema = 1",
        "SELECT load_extension('evil')",
        "SELECT * FROM sqlite_master",
        "VACUUM INTO 'copy.db'",
        "SELECT 1; DROP TABLE apps",
    ] {
        assert!(check_sql(statement).is_err(), "must reject: {statement}");
    }
    // Normal app queries and literals containing keywords pass.
    check_sql("SELECT * FROM notes WHERE body = 'please attach the file'").unwrap();
    check_sql("INSERT INTO notes (id, title) VALUES (?, ?)").unwrap();
    check_sql("-- comment with attach word\nSELECT 1").unwrap();
    assert!(check_sql("   ").is_err());
}

#[test]
fn path_guard_blocks_traversal_and_absolute_paths() {
    for path in ["../x", "/etc/passwd", "a/../../b", "C:\\x", "a//b", "a/./b", "a\0b"] {
        assert!(check_path(path).is_err(), "must reject: {path}");
    }
    check_path("workspaces/ws1/apps/org.reinvy/001_init.sql").unwrap();
    check_path("dist/app.bundle.js").unwrap();
    assert!(check_path("").is_err());
    assert!(check_path(&"a".repeat(2000)).is_err());
}

#[test]
fn domain_guard_blocks_ssrf_targets() {
    for host in [
        "10.0.0.1",
        "127.0.0.1",
        "169.254.169.254",
        "localhost",
        "api.local",
        "metadata.google.internal",
        "Example.com",
        "api.example.com.",
        "api.example.com:443",
        "https://api.example.com",
        "intranet",
    ] {
        assert!(check_domain(host).is_err(), "must reject: {host}");
    }
    check_domain("api.example.com").unwrap();
    check_domain("*.example.com").unwrap();
    check_domain("sub.api.example.co.id").unwrap();
}

#[test]
fn resolved_private_addresses_are_blocked() {
    assert!(check_resolved_ip("10.1.2.3".parse().unwrap()).is_err());
    assert!(check_resolved_ip("192.168.1.1".parse().unwrap()).is_err());
    assert!(check_resolved_ip("100.64.0.1".parse().unwrap()).is_err());
    assert!(check_resolved_ip("::1".parse().unwrap()).is_err());
    assert!(check_resolved_ip("fd00::1".parse().unwrap()).is_err());
    assert!(check_resolved_ip("fe80::1".parse().unwrap()).is_err());
    assert!(check_resolved_ip("93.184.216.34".parse().unwrap()).is_ok());
}

#[test]
fn allowlist_matching_is_exact_or_single_level_wildcard() {
    let allowlist = vec!["api.example.com".to_string(), "*.shop.example".to_string()];
    assert!(domain_allowed("api.example.com", &allowlist));
    assert!(!domain_allowed("evil.api.example.com", &allowlist));
    assert!(domain_allowed("cart.shop.example", &allowlist));
    assert!(!domain_allowed("shop.example", &allowlist));
    assert!(!domain_allowed("a.b.shop.example", &allowlist));
    let _ = sql("SELECT 1");
}
