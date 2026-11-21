//! Error type shared by every `microapp-core` module.
//!
//! Every variant maps to a catalog code from `docs/03-specs/error-codes.md`.
//! The `code()` string is what bridge responses, CLI exit paths, and audit
//! entries use, so a new variant MUST come with a catalog entry first.

use thiserror::Error;

#[derive(Debug, Error, Clone, PartialEq, Eq)]
pub enum CoreError {
    #[error("invalid manifest: {0}")]
    Manifest(String),
    #[error("invalid package: {0}")]
    Package(String),
    #[error("signature rejected: {0}")]
    Signature(String),
    #[error("digest mismatch: {0}")]
    Digest(String),
    #[error("cryptographic failure: {0}")]
    Crypto(String),
    #[error("identity failure: {0}")]
    Identity(String),
    #[error("guard rejected input: {0}")]
    Guard(String),
    #[error("audit chain invalid: {0}")]
    Audit(String),
    #[error("backup authentication failed: {0}")]
    BackupAuth(String),
    #[error("backup file is corrupt: {0}")]
    BackupCorrupt(String),
    #[error("invalid backup passphrase: {0}")]
    BackupPassphrase(String),
    #[error("serialization failure: {0}")]
    Serde(String),
}

impl CoreError {
    /// Catalog error code used by hosts, CLI, and audit entries.
    pub fn code(&self) -> &'static str {
        match self {
            // A malformed manifest, layout, or ZIP is always `E-PACK-001`;
            // signature and digest failures have their own codes so the host can
            // offer a distinct recovery action.
            CoreError::Manifest(_) | CoreError::Package(_) => "E-PACK-001",
            CoreError::Signature(_) => "E-PACK-002",
            CoreError::Digest(_) => "E-PACK-003",
            CoreError::BackupAuth(_) => "E-BACKUP-001",
            CoreError::BackupCorrupt(_) => "E-BACKUP-002",
            CoreError::BackupPassphrase(_) => "E-SET-001",
            CoreError::Crypto(_) => "E-CRYPTO-001",
            CoreError::Identity(_) => "E-AUTH-006",
            CoreError::Guard(_) => "E-SBX-005",
            CoreError::Audit(_) => "E-HOST-006",
            CoreError::Serde(_) => "E-CLI-001",
        }
    }
}

pub type CoreResult<T> = Result<T, CoreError>;

impl From<serde_json::Error> for CoreError {
    fn from(value: serde_json::Error) -> Self {
        CoreError::Serde(value.to_string())
    }
}

impl From<zip::result::ZipError> for CoreError {
    fn from(value: zip::result::ZipError) -> Self {
        CoreError::Package(format!("zip: {value}"))
    }
}

impl From<std::io::Error> for CoreError {
    fn from(value: std::io::Error) -> Self {
        CoreError::Package(format!("io: {value}"))
    }
}
