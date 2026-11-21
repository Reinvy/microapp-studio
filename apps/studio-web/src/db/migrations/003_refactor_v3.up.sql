-- 003_refactor_v3 — PRD v3.0 surface.
--
-- Adds the local alias/package path columns, per-app version history, and the
-- DevTools log, and removes the native-era surfaces that the web-only product
-- does not expose (`outbox`, `widgets`, `dock_items`, `registry_pins`).
--
-- `app_placements` remains the single pin/order source; `folders` stays as an
-- inert optional grouping column; `notifications` and `runtime_sessions` stay
-- because `notify.local` and the iframe runner still use them.

ALTER TABLE installed_microapps ADD COLUMN display_name TEXT;
ALTER TABLE installed_microapps ADD COLUMN package_path TEXT;

CREATE TABLE app_versions (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  app_install_id TEXT NOT NULL REFERENCES installed_microapps(id) ON DELETE CASCADE,
  version TEXT NOT NULL,
  manifest_json TEXT NOT NULL CHECK (json_valid(manifest_json)),
  content_hash BLOB NOT NULL CHECK (length(content_hash) = 32),
  signature BLOB NOT NULL CHECK (length(signature) = 64),
  author_key_fingerprint TEXT NOT NULL,
  bundle_path TEXT NOT NULL,
  package_path TEXT,
  installed_at_ms INTEGER NOT NULL,
  UNIQUE (app_install_id, version)
);
CREATE INDEX app_versions_app_idx ON app_versions (app_install_id, installed_at_ms DESC);

CREATE TABLE dev_log (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('bridge','error','flag')),
  level TEXT NOT NULL CHECK (level IN ('debug','info','warn','error')),
  code TEXT,
  message TEXT NOT NULL,
  app_id TEXT,
  created_at_ms INTEGER NOT NULL
);
CREATE INDEX dev_log_kind_idx ON dev_log (workspace_id, kind, created_at_ms DESC);

DROP TRIGGER IF EXISTS dock_items_limit;
DROP TABLE IF EXISTS outbox;
DROP TABLE IF EXISTS widgets;
DROP TABLE IF EXISTS dock_items;
DROP TABLE IF EXISTS registry_pins;

-- Only the web iframe engine exists in this product; narrow the legacy CHECK by
-- rebuilding the table (SQLite cannot alter a constraint in place).
CREATE TABLE runtime_sessions_web (
  session_id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  app_install_id TEXT NOT NULL REFERENCES installed_microapps(id) ON DELETE CASCADE,
  engine TEXT NOT NULL CHECK (engine = 'web-iframe'),
  state TEXT NOT NULL CHECK (state IN ('starting', 'running', 'background', 'hibernated', 'crashed', 'stopped')),
  memory_bytes INTEGER NOT NULL DEFAULT 0,
  started_at_ms INTEGER NOT NULL,
  updated_at_ms INTEGER NOT NULL
);
INSERT INTO runtime_sessions_web
  (session_id, workspace_id, app_install_id, engine, state, memory_bytes, started_at_ms, updated_at_ms)
  SELECT session_id, workspace_id, app_install_id, 'web-iframe', state, memory_bytes, started_at_ms, updated_at_ms
  FROM runtime_sessions WHERE engine = 'web-iframe';
DROP INDEX IF EXISTS runtime_sessions_active_uq;
DROP TABLE runtime_sessions;
ALTER TABLE runtime_sessions_web RENAME TO runtime_sessions;
CREATE UNIQUE INDEX runtime_sessions_active_uq
  ON runtime_sessions (workspace_id, app_install_id)
  WHERE state IN ('starting', 'running', 'background');
