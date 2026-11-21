//! `microapp-core` — shared Rust core for MicroApp Studio.
//!
//! Modules hold the only implementation of crypto, identity, manifest
//! validation, `.mapp` packing/verification, HLC, audit chaining, and guards.
//! Web (wasm-bindgen), Flutter (flutter_rust_bridge), the CLI, and the Go server
//! verification tooling all call into this crate.

pub mod audit;
pub mod backup;
pub mod crypto;
pub mod error;
pub mod guard;
pub mod hlc;
pub mod identity;
pub mod manifest;
pub mod mapp;

#[cfg(target_arch = "wasm32")]
pub mod wasm;

pub use error::{CoreError, CoreResult};

/// Crate version, surfaced to hosts for `minHostVersion` comparisons.
pub const CORE_VERSION: &str = env!("CARGO_PKG_VERSION");
