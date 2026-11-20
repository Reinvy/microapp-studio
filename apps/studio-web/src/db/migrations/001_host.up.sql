PRAGMA foreign_keys = ON;

CREATE TABLE local_identity (
  id TEXT PRIMARY KEY,
  site_id BLOB NOT NULL UNIQUE CHECK (length(site_id) = 16),
  identity_pubkey BLOB NOT NULL UNIQUE CHECK (length(identity_pubkey) = 32),
  key_agreement_pubkey BLOB NOT NULL CHECK (length(key_agreement_pubkey) = 32),
  hkdf_salt BLOB NOT NULL CHECK (length(hkdf_salt) = 32),
  device_sign_pubkey BLOB NOT NULL CHECK (length(device_sign_pubkey) = 32),
  device_ecdh_pubkey BLOB NOT NULL CHECK (length(device_ecdh_pubkey) = 32),
  device_cert BLOB,
  device_cert_expires_ms INTEGER,
  display_name TEXT,
  recovery_hint TEXT,
  created_at_ms INTEGER NOT NULL,
  rotated_at_ms INTEGER,
  CHECK (rotated_at_ms IS NULL OR rotated_at_ms >= created_at_ms)
);
CREATE UNIQUE INDEX local_identity_singleton ON local_identity ((1));

CREATE TABLE workspaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE CHECK (length(slug) BETWEEN 1 AND 48),
  theme TEXT NOT NULL DEFAULT 'studio',
  locale TEXT NOT NULL,
  is_default INTEGER NOT NULL DEFAULT 0 CHECK (is_default IN (0, 1)),
  created_at_ms INTEGER NOT NULL,
  updated_at_ms INTEGER NOT NULL,
  last_opened_at_ms INTEGER,
  deleted_at_ms INTEGER
);
CREATE UNIQUE INDEX workspaces_default_uq ON workspaces (is_default) WHERE is_default = 1;
CREATE INDEX workspaces_deleted_idx ON workspaces (deleted_at_ms);

CREATE TABLE workspace_state (
  workspace_id TEXT PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
  last_app_id TEXT,
  home_scroll REAL NOT NULL DEFAULT 0,
  filters_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(filters_json)),
  updated_at_ms INTEGER NOT NULL
);

CREATE TABLE registry_sources (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('http', 'git', 'local', 'enterprise')),
  trust_level TEXT NOT NULL CHECK (trust_level IN ('official', 'community', 'internal', 'local')),
  public_signing_key BLOB NOT NULL CHECK (length(public_signing_key) = 32),
  key_fingerprint TEXT NOT NULL,
  cached_index_json TEXT CHECK (cached_index_json IS NULL OR json_valid(cached_index_json)),
  last_fetched_at_ms INTEGER,
  cache_ttl_s INTEGER NOT NULL DEFAULT 86400 CHECK (cache_ttl_s > 0),
  priority INTEGER NOT NULL DEFAULT 100,
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
  UNIQUE (workspace_id, url),
  UNIQUE (workspace_id, key_fingerprint)
);
CREATE INDEX registry_sources_priority_idx ON registry_sources (workspace_id, priority);

CREATE TABLE registry_pins (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  scope TEXT NOT NULL CHECK (scope IN ('author', 'registry')),
  key_fingerprint TEXT NOT NULL,
  app_id TEXT,
  registry_id TEXT REFERENCES registry_sources(id) ON DELETE SET NULL,
  first_seen_at_ms INTEGER NOT NULL,
  approved_at_ms INTEGER,
  approved_by TEXT CHECK (approved_by IS NULL OR approved_by IN ('user', 'policy')),
  UNIQUE (workspace_id, scope, key_fingerprint, app_id)
);
CREATE INDEX registry_pins_app_idx ON registry_pins (workspace_id, app_id);

CREATE TABLE folders (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  parent_id TEXT REFERENCES folders(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 64),
  depth INTEGER NOT NULL CHECK (depth BETWEEN 1 AND 3),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at_ms INTEGER NOT NULL,
  updated_at_ms INTEGER NOT NULL,
  UNIQUE (workspace_id, parent_id, name)
);
CREATE INDEX folders_tree_idx ON folders (workspace_id, parent_id, sort_order);

CREATE TABLE installed_microapps (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  app_id TEXT NOT NULL,
  version TEXT NOT NULL,
  manifest_json TEXT NOT NULL CHECK (json_valid(manifest_json)),
  content_hash BLOB NOT NULL CHECK (length(content_hash) = 32),
  signature BLOB NOT NULL CHECK (length(signature) = 64),
  author_key_fingerprint TEXT NOT NULL,
  registry_id TEXT REFERENCES registry_sources(id) ON DELETE SET NULL,
  install_source TEXT NOT NULL CHECK (install_source IN ('registry', 'git', 'enterprise', 'local')),
  bundle_path TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('installed', 'running', 'hibernated', 'disabled', 'quarantined')),
  pinned_version TEXT,
  update_mode TEXT NOT NULL DEFAULT 'notify' CHECK (update_mode IN ('auto', 'notify', 'manual')),
  previous_version TEXT,
  previous_content_hash BLOB,
  installed_at_ms INTEGER NOT NULL,
  updated_at_ms INTEGER NOT NULL,
  last_launched_at_ms INTEGER,
  UNIQUE (workspace_id, app_id),
  CHECK (update_mode <> 'auto' OR pinned_version IS NULL),
  CHECK (state <> 'quarantined' OR pinned_version IS NOT NULL)
);
CREATE INDEX installed_microapps_state_idx ON installed_microapps (workspace_id, state);
CREATE INDEX installed_microapps_lru_idx ON installed_microapps (workspace_id, last_launched_at_ms);

CREATE TABLE app_placements (
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  app_install_id TEXT NOT NULL REFERENCES installed_microapps(id) ON DELETE CASCADE,
  folder_id TEXT REFERENCES folders(id) ON DELETE SET NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  pinned INTEGER NOT NULL DEFAULT 0 CHECK (pinned IN (0, 1)),
  PRIMARY KEY (workspace_id, app_install_id)
);
CREATE INDEX app_placements_order_idx ON app_placements (workspace_id, folder_id, sort_order);

CREATE TABLE dock_items (
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  app_install_id TEXT NOT NULL REFERENCES installed_microapps(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (workspace_id, app_install_id)
);
CREATE TRIGGER dock_items_limit BEFORE INSERT ON dock_items
BEGIN
  SELECT CASE
    WHEN (SELECT COUNT(*) FROM dock_items WHERE workspace_id = NEW.workspace_id) >= 8
      THEN RAISE(ABORT, 'E-DATA-006 dock limit reached')
  END;
END;

CREATE TABLE widgets (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  app_install_id TEXT NOT NULL REFERENCES installed_microapps(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  config_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(config_json)),
  sort_order INTEGER NOT NULL DEFAULT 0,
  refresh_interval_ms INTEGER NOT NULL DEFAULT 5000 CHECK (refresh_interval_ms >= 5000),
  UNIQUE (workspace_id, app_install_id, kind)
);
CREATE INDEX widgets_order_idx ON widgets (workspace_id, sort_order);

CREATE TABLE app_databases (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  app_install_id TEXT NOT NULL REFERENCES installed_microapps(id) ON DELETE CASCADE,
  relative_path TEXT NOT NULL CHECK (relative_path NOT LIKE '%..%' AND relative_path NOT LIKE '/%'),
  schema_version INTEGER NOT NULL,
  encryption TEXT NOT NULL CHECK (encryption IN ('sqlcipher', 'field-aes-gcm', 'none')),
  size_bytes INTEGER NOT NULL DEFAULT 0,
  created_at_ms INTEGER NOT NULL,
  updated_at_ms INTEGER NOT NULL,
  UNIQUE (app_install_id, relative_path)
);
CREATE INDEX app_databases_ws_idx ON app_databases (workspace_id);

CREATE TABLE permission_grants (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  app_install_id TEXT NOT NULL REFERENCES installed_microapps(id) ON DELETE CASCADE,
  permission_id TEXT NOT NULL,
  scope TEXT NOT NULL CHECK (scope IN ('persistent', 'session', 'once')),
  mocked INTEGER NOT NULL DEFAULT 0 CHECK (mocked IN (0, 1)),
  granted_at_ms INTEGER NOT NULL,
  revoked_at_ms INTEGER,
  CHECK (revoked_at_ms IS NULL OR revoked_at_ms >= granted_at_ms)
);
CREATE UNIQUE INDEX permission_grants_active_uq
  ON permission_grants (workspace_id, app_install_id, permission_id)
  WHERE revoked_at_ms IS NULL;

CREATE TABLE permission_sessions (
  session_id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  app_install_id TEXT NOT NULL REFERENCES installed_microapps(id) ON DELETE CASCADE,
  permission_id TEXT NOT NULL,
  granted_at_ms INTEGER NOT NULL,
  expires_at_ms INTEGER,
  CHECK (expires_at_ms IS NULL OR expires_at_ms > granted_at_ms)
);

CREATE TABLE app_policy (
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  app_install_id TEXT NOT NULL REFERENCES installed_microapps(id) ON DELETE CASCADE,
  offline_cage INTEGER NOT NULL DEFAULT 1 CHECK (offline_cage IN (0, 1)),
  mock_permissions_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(mock_permissions_json)),
  updated_at_ms INTEGER NOT NULL,
  PRIMARY KEY (workspace_id, app_install_id)
);

CREATE TABLE runtime_sessions (
  session_id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  app_install_id TEXT NOT NULL REFERENCES installed_microapps(id) ON DELETE CASCADE,
  engine TEXT NOT NULL CHECK (engine IN ('web-iframe', 'native-quickjs', 'native-wasmtime')),
  state TEXT NOT NULL CHECK (state IN ('starting', 'running', 'background', 'hibernated', 'crashed', 'stopped')),
  memory_bytes INTEGER NOT NULL DEFAULT 0,
  started_at_ms INTEGER NOT NULL,
  updated_at_ms INTEGER NOT NULL
);
CREATE UNIQUE INDEX runtime_sessions_active_uq
  ON runtime_sessions (workspace_id, app_install_id)
  WHERE state IN ('starting', 'running', 'background');

CREATE TABLE audit_log_chain (
  id TEXT PRIMARY KEY,
  seq_id INTEGER NOT NULL UNIQUE,
  prev_hash BLOB NOT NULL CHECK (length(prev_hash) = 32),
  entry_hash BLOB NOT NULL UNIQUE CHECK (length(entry_hash) = 32),
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  target TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(metadata_json)),
  created_at_ms INTEGER NOT NULL
);
CREATE INDEX audit_log_chain_action_idx ON audit_log_chain (action, created_at_ms);
CREATE VIEW sandbox_audit AS
  SELECT id, seq_id, prev_hash, entry_hash, actor, action, target, metadata_json, created_at_ms
  FROM audit_log_chain
  WHERE action LIKE 'sandbox.%'
     OR action LIKE 'permission.%'
     OR action LIKE 'bridge.%'
     OR action LIKE 'network.%'
     OR action LIKE 'vault.%';

CREATE TABLE vault_items (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('api_key', 'password', 'note', 'certificate')),
  label TEXT NOT NULL,
  ciphertext BLOB NOT NULL,
  key_id BLOB NOT NULL CHECK (length(key_id) = 16),
  nonce BLOB NOT NULL CHECK (length(nonce) = 12),
  created_at_ms INTEGER NOT NULL,
  updated_at_ms INTEGER NOT NULL,
  deleted_at_ms INTEGER,
  UNIQUE (key_id, nonce)
);
CREATE INDEX vault_items_kind_idx ON vault_items (workspace_id, kind);

CREATE TABLE vault_grants (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  vault_item_id TEXT NOT NULL REFERENCES vault_items(id) ON DELETE CASCADE,
  app_install_id TEXT NOT NULL REFERENCES installed_microapps(id) ON DELETE CASCADE,
  granted_at_ms INTEGER NOT NULL,
  revoked_at_ms INTEGER
);
CREATE UNIQUE INDEX vault_grants_active_uq
  ON vault_grants (workspace_id, vault_item_id, app_install_id)
  WHERE revoked_at_ms IS NULL;

CREATE TABLE vault_key_wraps (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  kdf TEXT NOT NULL CHECK (kdf IN ('argon2id', 'master-hkdf')),
  salt BLOB NOT NULL CHECK (length(salt) = 16),
  memory_kib INTEGER NOT NULL DEFAULT 65536 CHECK (memory_kib >= 65536),
  iterations INTEGER NOT NULL DEFAULT 3 CHECK (iterations >= 3),
  parallelism INTEGER NOT NULL DEFAULT 1 CHECK (parallelism >= 1),
  nonce BLOB NOT NULL CHECK (length(nonce) = 12),
  wrapped_key BLOB NOT NULL,
  created_at_ms INTEGER NOT NULL,
  retired_at_ms INTEGER
);
CREATE UNIQUE INDEX vault_key_wraps_active_uq
  ON vault_key_wraps (workspace_id) WHERE retired_at_ms IS NULL;

CREATE TABLE notifications (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  app_install_id TEXT REFERENCES installed_microapps(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  deep_link TEXT,
  scheduled_at_ms INTEGER,
  fired_at_ms INTEGER,
  state TEXT NOT NULL CHECK (state IN ('scheduled', 'fired', 'cancelled')),
  read_at_ms INTEGER,
  created_at_ms INTEGER NOT NULL,
  CHECK (state <> 'fired' OR fired_at_ms IS NOT NULL)
);
CREATE INDEX notifications_schedule_idx ON notifications (state, scheduled_at_ms);
CREATE INDEX notifications_app_idx ON notifications (workspace_id, app_install_id);

CREATE TABLE storage_pins (
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  app_install_id TEXT NOT NULL REFERENCES installed_microapps(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('bundle', 'database', 'media', 'cache')),
  relative_path TEXT NOT NULL,
  pinned_at_ms INTEGER NOT NULL,
  PRIMARY KEY (workspace_id, app_install_id, category, relative_path)
);

CREATE TABLE outbox (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  workflow_id TEXT NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  payload_ciphertext BLOB NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('queued', 'running', 'waiting_network', 'waiting_hitl', 'done', 'failed', 'dead')),
  attempt INTEGER NOT NULL DEFAULT 0 CHECK (attempt BETWEEN 0 AND 8),
  next_attempt_at_ms INTEGER,
  last_error_code TEXT,
  created_at_ms INTEGER NOT NULL,
  updated_at_ms INTEGER NOT NULL,
  CHECK (state <> 'dead' OR attempt = 8)
);
CREATE INDEX outbox_schedule_idx ON outbox (state, next_attempt_at_ms);
CREATE INDEX outbox_ws_idx ON outbox (workspace_id, state);

CREATE TABLE crash_incident (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  app_install_id TEXT REFERENCES installed_microapps(id) ON DELETE SET NULL,
  error_code TEXT NOT NULL,
  signal TEXT,
  created_at_ms INTEGER NOT NULL,
  resolved_by TEXT CHECK (resolved_by IS NULL OR resolved_by IN ('user', 'restart', 'rollback', 'ignore'))
);
CREATE INDEX crash_incident_idx ON crash_incident (workspace_id, created_at_ms);

CREATE TABLE diagnostic_log (
  incident_id TEXT NOT NULL REFERENCES crash_incident(id) ON DELETE CASCADE,
  seq_id INTEGER NOT NULL,
  level TEXT NOT NULL CHECK (level IN ('debug', 'info', 'warn', 'error')),
  message TEXT NOT NULL,
  stack_redacted TEXT,
  PRIMARY KEY (incident_id, seq_id)
);

CREATE TABLE db_snapshot (
  snapshot_id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  app_install_id TEXT NOT NULL REFERENCES installed_microapps(id) ON DELETE CASCADE,
  relative_path TEXT NOT NULL,
  hash BLOB NOT NULL CHECK (length(hash) = 32),
  created_at_ms INTEGER NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('pre-migration', 'pre-update', 'manual', 'pre-restore'))
);
CREATE INDEX db_snapshot_app_idx ON db_snapshot (app_install_id, created_at_ms);

CREATE TABLE schema_migrations (
  version INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  checksum TEXT NOT NULL,
  applied_at_ms INTEGER NOT NULL,
  rollback_sql TEXT NOT NULL
);

CREATE TABLE migration_report (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL CHECK (source IN ('dexie-v6', 'json-v1')),
  started_at_ms INTEGER NOT NULL,
  finished_at_ms INTEGER,
  status TEXT NOT NULL CHECK (status IN ('running', 'done', 'failed')),
  counts_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(counts_json)),
  checksum TEXT,
  notes TEXT
);

CREATE TABLE legacy_record_map (
  legacy_store TEXT NOT NULL,
  legacy_id TEXT NOT NULL,
  new_table TEXT NOT NULL,
  new_id TEXT NOT NULL,
  migrated_at_ms INTEGER NOT NULL,
  PRIMARY KEY (legacy_store, legacy_id)
);

CREATE TABLE migration_backup (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  relative_path TEXT NOT NULL,
  hash BLOB NOT NULL CHECK (length(hash) = 32),
  created_at_ms INTEGER NOT NULL
);

CREATE TABLE studio_project (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  source_legacy_id TEXT,
  document_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(document_json)),
  revision INTEGER NOT NULL DEFAULT 0,
  created_at_ms INTEGER NOT NULL,
  updated_at_ms INTEGER NOT NULL
);
CREATE INDEX studio_project_ws_idx ON studio_project (workspace_id, status);

CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL CHECK (json_valid(value_json)),
  updated_at_ms INTEGER NOT NULL
);
