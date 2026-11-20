-- Host search index (FTS5). Kept in its own migration so rebuild tooling can
-- drop and repopulate it without touching user data.
CREATE VIRTUAL TABLE search_index USING fts5(
  workspace_id UNINDEXED,
  kind UNINDEXED,
  ref_id UNINDEXED,
  app_install_id UNINDEXED,
  title,
  body,
  tokenize = 'unicode61 remove_diacritics 2'
);
