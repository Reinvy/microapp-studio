//! Hybrid Logical Clock (HLC) used by the CRDT mutation log.
//!
//! Encoding is 24 bytes, big-endian, so lexicographic byte order equals
//! chronological order: `physical_ms:48 | counter:16 | site_id:128`.

use serde::{Deserialize, Serialize};

use crate::crypto::SITE_ID_LEN;

pub const HLC_LEN: usize = 24;
const MAX_COUNTER: u16 = u16::MAX;

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
pub struct Hlc {
    pub physical_ms: u64,
    pub counter: u16,
    pub site_id: [u8; SITE_ID_LEN],
}

impl Hlc {
    pub fn new(physical_ms: u64, site_id: [u8; SITE_ID_LEN]) -> Self {
        Self { physical_ms, counter: 0, site_id }
    }

    /// Advance the clock for a local event. Wall clock going backwards never
    /// lowers the HLC; the counter absorbs equal or older timestamps.
    pub fn tick(&mut self, now_ms: u64) {
        if now_ms > self.physical_ms {
            self.physical_ms = now_ms;
            self.counter = 0;
        } else if self.counter == MAX_COUNTER {
            self.physical_ms = self.physical_ms.saturating_add(1);
            self.counter = 0;
        } else {
            self.counter += 1;
        }
    }

    /// Merge a remote HLC observed in an incoming mutation.
    pub fn observe(&mut self, remote: Hlc, now_ms: u64) {
        let max_physical = self.physical_ms.max(remote.physical_ms).max(now_ms);
        let next_counter = if max_physical == self.physical_ms && max_physical == remote.physical_ms {
            self.counter.max(remote.counter).saturating_add(1)
        } else if max_physical == self.physical_ms {
            self.counter.saturating_add(1)
        } else if max_physical == remote.physical_ms {
            remote.counter.saturating_add(1)
        } else {
            0
        };
        if next_counter == MAX_COUNTER {
            self.physical_ms = max_physical.saturating_add(1);
            self.counter = 0;
        } else {
            self.physical_ms = max_physical;
            self.counter = next_counter;
        }
    }

    pub fn encode(&self) -> [u8; HLC_LEN] {
        let mut out = [0u8; HLC_LEN];
        let ms = self.physical_ms & 0x0000_FFFF_FFFF_FFFF;
        out[0] = (ms >> 40) as u8;
        out[1] = (ms >> 32) as u8;
        out[2] = (ms >> 24) as u8;
        out[3] = (ms >> 16) as u8;
        out[4] = (ms >> 8) as u8;
        out[5] = ms as u8;
        out[6] = (self.counter >> 8) as u8;
        out[7] = self.counter as u8;
        out[8..].copy_from_slice(&self.site_id);
        out
    }

    pub fn decode(bytes: &[u8]) -> Option<Self> {
        if bytes.len() != HLC_LEN {
            return None;
        }
        let ms = (u64::from(bytes[0]) << 40)
            | (u64::from(bytes[1]) << 32)
            | (u64::from(bytes[2]) << 24)
            | (u64::from(bytes[3]) << 16)
            | (u64::from(bytes[4]) << 8)
            | u64::from(bytes[5]);
        let counter = (u16::from(bytes[6]) << 8) | u16::from(bytes[7]);
        let mut site_id = [0u8; SITE_ID_LEN];
        site_id.copy_from_slice(&bytes[8..24]);
        Some(Self { physical_ms: ms, counter, site_id })
    }
}
