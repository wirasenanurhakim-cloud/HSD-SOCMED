CREATE TABLE IF NOT EXISTS account_snapshot_history (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  month         TEXT NOT NULL,
  brand_id      INTEGER REFERENCES brands(id) ON DELETE SET NULL,
  impressions   INTEGER DEFAULT 0,
  followers     INTEGER DEFAULT 0,
  profile_views INTEGER DEFAULT 0,
  post_views    INTEGER DEFAULT 0,
  likes         INTEGER DEFAULT 0,
  comments      INTEGER DEFAULT 0,
  shares        INTEGER DEFAULT 0,
  created_at    DATETIME DEFAULT (datetime('now', 'localtime'))
);

CREATE INDEX IF NOT EXISTS idx_account_snapshot_history_month ON account_snapshot_history(month, brand_id);
