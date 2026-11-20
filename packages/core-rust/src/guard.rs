//! Guards shared by the bridge broker, the SQLite worker, and the network layer.
//!
//! Web hosts cannot resolve-then-connect, so the SQL and path guards run in the
//! host worker while the domain guard runs before every fetch. Native and server
//! hosts re-run the domain guard after DNS resolution.

use std::net::IpAddr;

use crate::error::{CoreError, CoreResult};

/// SQL keywords that would escape the per-app database boundary.
const SQL_FORBIDDEN: &[&str] = &[
    "attach",
    "detach",
    "pragma",
    "load_extension",
    "sqlite_master",
    "sqlite_schema",
    "sqlite_temp_master",
    "vacuum into",
];

/// Strip string literals and comments so keywords inside data do not trigger a
/// false rejection while obfuscated keywords still do.
fn strip_sql_noise(sql: &str) -> String {
    let mut out = String::with_capacity(sql.len());
    let mut chars = sql.chars().peekable();
    while let Some(ch) = chars.next() {
        match ch {
            '\'' | '"' | '`' => {
                let quote = ch;
                while let Some(nested) = chars.next() {
                    if nested == quote {
                        // Handle doubled quote escape ('' inside a literal).
                        if chars.peek() == Some(&quote) {
                            chars.next();
                            continue;
                        }
                        break;
                    }
                }
                out.push(' ');
            }
            '-' => {
                if chars.peek() == Some(&'-') {
                    for nested in chars.by_ref() {
                        if nested == '\n' {
                            break;
                        }
                    }
                    out.push(' ');
                } else {
                    out.push('-');
                }
            }
            '/' => {
                if chars.peek() == Some(&'*') {
                    chars.next();
                    let mut prev = '\0';
                    for nested in chars.by_ref() {
                        if prev == '*' && nested == '/' {
                            break;
                        }
                        prev = nested;
                    }
                    out.push(' ');
                } else {
                    out.push('/');
                }
            }
            _ => out.push(ch),
        }
    }
    out
}

/// Reject SQL that could escape the app database: `ATTACH`, `DETACH`, `PRAGMA`,
/// extension loading, direct `sqlite_*` catalog access, and multiple statements.
pub fn check_sql(sql: &str) -> CoreResult<()> {
    if sql.trim().is_empty() {
        return Err(CoreError::Guard("empty SQL".into()));
    }
    let lowered = strip_sql_noise(sql).to_ascii_lowercase();
    // Collapse whitespace so `attach  database` and `VACUUM   INTO` still match.
    let collapsed = lowered.split_whitespace().collect::<Vec<_>>().join(" ");
    for needle in SQL_FORBIDDEN {
        if collapsed.contains(needle) {
            return Err(CoreError::Guard(format!("forbidden SQL construct: {needle}")));
        }
    }
    if collapsed.contains("into outfile") || collapsed.contains("into dumpfile") {
        return Err(CoreError::Guard("forbidden SQL file export".into()));
    }
    let statements = collapsed
        .split(';')
        .filter(|part| !part.trim().is_empty())
        .count();
    if statements > 1 {
        return Err(CoreError::Guard("multiple statements are not allowed".into()));
    }
    Ok(())
}

/// Validate a relative POSIX path: no absolute paths, no `..`, no backslash,
/// no NUL, no empty segments, and a bounded length.
pub fn check_path(path: &str) -> CoreResult<()> {
    if path.is_empty() {
        return Err(CoreError::Guard("empty path".into()));
    }
    if path.len() > 1024 {
        return Err(CoreError::Guard("path too long".into()));
    }
    if path.contains('\0') {
        return Err(CoreError::Guard("path contains NUL".into()));
    }
    if path.contains('\\') {
        return Err(CoreError::Guard("path contains backslash".into()));
    }
    if path.starts_with('/') {
        return Err(CoreError::Guard("absolute path rejected".into()));
    }
    if path.len() >= 2 && path.as_bytes()[1] == b':' && path.as_bytes()[0].is_ascii_alphabetic() {
        return Err(CoreError::Guard("drive-letter path rejected".into()));
    }
    for segment in path.split('/') {
        if segment.is_empty() {
            return Err(CoreError::Guard("empty path segment".into()));
        }
        if segment == "." || segment == ".." {
            return Err(CoreError::Guard("path traversal rejected".into()));
        }
        if segment.chars().any(|c| c.is_control()) {
            return Err(CoreError::Guard("control character in path".into()));
        }
    }
    Ok(())
}

/// Hostnames that must never be contacted, even when the manifest allowlists
/// them: loopback, metadata services, and private suffixes.
const FORBIDDEN_HOSTS: &[&str] = &[
    "localhost",
    "localhost.localdomain",
    "metadata",
    "metadata.google.internal",
    "instance-data",
];

const FORBIDDEN_SUFFIXES: &[&str] = &[".local", ".localhost", ".internal", ".home.arpa"];

fn is_private_v4(ip: std::net::Ipv4Addr) -> bool {
    ip.is_private()
        || ip.is_loopback()
        || ip.is_link_local()
        || ip.is_broadcast()
        || ip.is_unspecified()
        || ip.is_documentation()
        || ip.octets()[0] == 100 && ip.octets()[1] & 0b1100_0000 == 64 // 100.64/10 CGNAT
}

fn is_private_v6(ip: std::net::Ipv6Addr) -> bool {
    ip.is_loopback()
        || ip.is_unspecified()
        || ip.is_unique_local()
        || ip.is_unicast_link_local()
        || (ip.segments()[0] & 0xffc0) == 0xfe80
        || ip.to_ipv4_mapped().map(is_private_v4).unwrap_or(false)
}

/// Validate an outbound host before any connection is attempted.
///
/// Rejects IP literals (any address, public or private), private suffixes,
/// metadata hosts, embedded schemes/ports/paths, and uppercase or trailing dots.
pub fn check_domain(host: &str) -> CoreResult<()> {
    if host.is_empty() || host.len() > 253 {
        return Err(CoreError::Guard("invalid host length".into()));
    }
    if host != host.to_ascii_lowercase() {
        return Err(CoreError::Guard("host must be lowercase".into()));
    }
    if host.contains(':') || host.contains('/') || host.contains('@') || host.contains('\\') {
        return Err(CoreError::Guard("host contains scheme, port, or path".into()));
    }
    if host.ends_with('.') {
        return Err(CoreError::Guard("host must not end with a dot".into()));
    }
    let candidate = host.strip_prefix("*.").unwrap_or(host);
    if let Ok(ip) = candidate.parse::<IpAddr>() {
        let _ = ip;
        return Err(CoreError::Guard("IP literal rejected".into()));
    }
    if candidate.split('.').count() < 2 {
        return Err(CoreError::Guard("host must be fully qualified".into()));
    }
    for forbidden in FORBIDDEN_HOSTS {
        if candidate == *forbidden {
            return Err(CoreError::Guard(format!("host {candidate} is blocked")));
        }
    }
    for suffix in FORBIDDEN_SUFFIXES {
        if candidate.ends_with(suffix) {
            return Err(CoreError::Guard(format!("suffix {suffix} is blocked")));
        }
    }
    for label in candidate.split('.') {
        if label.is_empty() || label.len() > 63 {
            return Err(CoreError::Guard("invalid label length".into()));
        }
        if !label
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || c == '-')
        {
            return Err(CoreError::Guard("invalid host character".into()));
        }
    }
    Ok(())
}

/// Reject an address that resolved into a private or link-local range.
pub fn check_resolved_ip(ip: IpAddr) -> CoreResult<()> {
    let private = match ip {
        IpAddr::V4(v4) => is_private_v4(v4),
        IpAddr::V6(v6) => is_private_v6(v6),
    };
    if private {
        Err(CoreError::Guard("resolved address is private or link-local".into()))
    } else {
        Ok(())
    }
}

/// Test whether a host matches a manifest allowlist entry (exact or wildcard).
pub fn domain_allowed(host: &str, allowlist: &[String]) -> bool {
    allowlist.iter().any(|entry| {
        if let Some(suffix) = entry.strip_prefix("*.") {
            host.len() > suffix.len() + 1
                && host.ends_with(suffix)
                && host[..host.len() - suffix.len() - 1].rsplit('.').count() == 1
        } else {
            host == entry
        }
    })
}
