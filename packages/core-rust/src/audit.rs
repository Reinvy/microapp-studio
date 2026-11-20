//! Append-only audit hash chain.
//!
//! `entry_hash = SHA-256(prev_hash || u64_be(seq_id) || JCS(payload))` with a
//! 32-byte zero `prev_hash` for the genesis entry. The same formula is used by
//! the host DB, the Flutter host, and the Go server so one verifier covers all
//! three.

use serde::{Deserialize, Serialize};
use serde_json::Value;
use sha2::{Digest, Sha256};

use crate::error::{CoreError, CoreResult};

pub const GENESIS_PREV: [u8; 32] = [0u8; 32];

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct AuditPayload {
    pub actor: String,
    pub action: String,
    pub target: Option<String>,
    pub metadata: Value,
    pub created_at_ms: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct AuditEntry {
    pub seq_id: u64,
    pub prev_hash: [u8; 32],
    pub entry_hash: [u8; 32],
    pub payload: AuditPayload,
}

/// Hash one audit entry from its predecessor, sequence number, and payload.
pub fn audit_hash(prev_hash: &[u8; 32], seq_id: u64, payload: &AuditPayload) -> CoreResult<[u8; 32]> {
    let payload_bytes = crate::crypto::jcs(payload)?;
    let mut hasher = Sha256::new();
    hasher.update(prev_hash);
    hasher.update(seq_id.to_be_bytes());
    hasher.update(&payload_bytes);
    let digest = hasher.finalize();
    let mut out = [0u8; 32];
    out.copy_from_slice(&digest);
    Ok(out)
}

/// Append-only in-memory audit log used by the core and by tests.
#[derive(Debug, Default)]
pub struct AuditLog {
    entries: Vec<AuditEntry>,
}

impl AuditLog {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn entries(&self) -> &[AuditEntry] {
        &self.entries
    }

    pub fn last_hash(&self) -> [u8; 32] {
        self.entries.last().map(|e| e.entry_hash).unwrap_or(GENESIS_PREV)
    }

    pub fn next_seq(&self) -> u64 {
        self.entries.last().map(|e| e.seq_id + 1).unwrap_or(1)
    }

    /// Append an entry, allocating `seq_id` and `prev_hash` from the chain.
    pub fn append(&mut self, payload: AuditPayload) -> CoreResult<&AuditEntry> {
        let seq_id = self.next_seq();
        let prev_hash = self.last_hash();
        let entry_hash = audit_hash(&prev_hash, seq_id, &payload)?;
        self.entries.push(AuditEntry { seq_id, prev_hash, entry_hash, payload });
        Ok(self.entries.last().expect("entry just pushed"))
    }
}

/// Verify a full chain: genesis prev hash, contiguous `seq_id`, recomputed hash.
pub fn verify_chain(entries: &[AuditEntry]) -> CoreResult<()> {
    let mut expected_prev = GENESIS_PREV;
    for (index, entry) in entries.iter().enumerate() {
        let expected_seq = index as u64 + 1;
        if entry.seq_id != expected_seq {
            return Err(CoreError::Audit(format!(
                "seq gap: expected {expected_seq}, found {}",
                entry.seq_id
            )));
        }
        if entry.prev_hash != expected_prev {
            return Err(CoreError::Audit(format!("prev_hash mismatch at seq {}", entry.seq_id)));
        }
        let recomputed = audit_hash(&entry.prev_hash, entry.seq_id, &entry.payload)?;
        if recomputed != entry.entry_hash {
            return Err(CoreError::Audit(format!("entry_hash mismatch at seq {}", entry.seq_id)));
        }
        expected_prev = entry.entry_hash;
    }
    Ok(())
}
