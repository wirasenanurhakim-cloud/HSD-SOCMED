CREATE TABLE IF NOT EXISTS csv_import_mapping (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  external_id TEXT,
  shortcode   TEXT,
  post_url    TEXT,
  platform    TEXT NOT NULL,
  publish_id  INTEGER,
  asset_id    INTEGER,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (publish_id) REFERENCES publish_instances(id) ON DELETE CASCADE,
  FOREIGN KEY (asset_id) REFERENCES content_assets(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_import_url ON csv_import_mapping(post_url);
CREATE INDEX IF NOT EXISTS idx_import_shortcode ON csv_import_mapping(shortcode);
CREATE INDEX IF NOT EXISTS idx_import_external ON csv_import_mapping(external_id);
