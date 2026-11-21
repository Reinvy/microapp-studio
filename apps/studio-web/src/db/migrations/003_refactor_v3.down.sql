-- Rollback for 003_refactor_v3.
--
-- Recreates the dropped native-era tables exactly as 001 defined them so a
-- rollback leaves a schema the older code can read. Version history and the dev
-- log are additive, so they are simply dropped.

DROP INDEX IF EXISTS dev_log_kind_idx;
DROP TABLE IF EXISTS dev_log;
DROP INDEX IF EXISTS app_versions_app_idx;
DROP TABLE IF EXISTS app_versions;
ALTER TABLE installed_microapps DROP COLUMN package_path;
ALTER TABLE installed_microapps DROP COLUMN display_name;

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
      THEN RAISE(ABORT, 'E-DATA-002 dock limit reached')
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

CREATE TABLE runtime_sessions_legacy (
  session_id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  app_install_id TEXT NOT NULL REFERENCES installed_microapps(id) ON DELETE CASCADE,
  engine TEXT NOT NULL CHECK (engine IN ('web-iframe', 'native-quickjs', 'native-wasmtime')),
  state TEXT NOT NULL CHECK (state IN ('starting', 'running', 'background', 'hibernated', 'crashed', 'stopped')),
  memory_bytes INTEGER NOT NULL DEFAULT 0,
  started_at_ms INTEGER NOT NULL,
  updated_at_ms INTEGER NOT NULL
);
INSERT INTO runtime_sessions_legacy
  (session_id, workspace_id, app_install_id, engine, state, memory_bytes, started_at_ms, updated_at_ms)
  SELECT session_id, workspace_id, app_install_id, engine, state, memory_bytes, started_at_ms, updated_at_ms
  FROM runtime_sessions;
DROP INDEX IF EXISTS runtime_sessions_active_uq;
DROP TABLE runtime_sessions;
ALTER TABLE runtime_sessions_legacy RENAME TO runtime_sessions;
CREATE UNIQUE INDEX runtime_sessions_active_uq
  ON runtime_sessions (workspace_id, app_install_id)
  WHERE state IN ('starting', 'running', 'background');
