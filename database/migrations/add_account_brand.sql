ALTER TABLE account_snapshots ADD COLUMN brand_id INTEGER REFERENCES brands(id) ON DELETE CASCADE;

DROP TABLE IF EXISTS account_snapshots_tmp;
CREATE TABLE account_snapshots_tmp (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  month         TEXT NOT NULL,
  brand_id      INTEGER REFERENCES brands(id) ON DELETE CASCADE,
  impressions   INTEGER DEFAULT 0,
  followers     INTEGER DEFAULT 0,
  profile_views INTEGER DEFAULT 0,
  post_views    INTEGER DEFAULT 0,
  likes         INTEGER DEFAULT 0,
  comments      INTEGER DEFAULT 0,
  shares        INTEGER DEFAULT 0,
  updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(month, brand_id)
);

INSERT OR IGNORE INTO account_snapshots_tmp (id, month, brand_id, impressions, followers, profile_views, post_views, likes, comments, shares, updated_at)
  SELECT id, month, brand_id, impressions, followers, profile_views, post_views, likes, comments, shares, updated_at FROM account_snapshots;

DROP TABLE IF EXISTS account_snapshots_old;
ALTER TABLE account_snapshots RENAME TO account_snapshots_old;
ALTER TABLE account_snapshots_tmp RENAME TO account_snapshots;
DROP TABLE IF EXISTS account_snapshots_old;
