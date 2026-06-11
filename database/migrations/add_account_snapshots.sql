CREATE TABLE IF NOT EXISTS account_snapshots (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  month         TEXT NOT NULL UNIQUE,
  impressions   INTEGER DEFAULT 0,
  followers     INTEGER DEFAULT 0,
  profile_views INTEGER DEFAULT 0,
  post_views    INTEGER DEFAULT 0,
  likes         INTEGER DEFAULT 0,
  comments      INTEGER DEFAULT 0,
  shares        INTEGER DEFAULT 0,
  updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_snapshot_month ON account_snapshots(month);
