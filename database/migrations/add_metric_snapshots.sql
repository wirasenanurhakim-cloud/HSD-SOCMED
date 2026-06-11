CREATE TABLE IF NOT EXISTS metric_snapshots (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  publish_id    INTEGER NOT NULL,
  capture_date  TEXT NOT NULL,
  snapshot_date TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  views         INTEGER DEFAULT 0,
  likes         INTEGER DEFAULT 0,
  comments      INTEGER DEFAULT 0,
  shares        INTEGER DEFAULT 0,
  reach         INTEGER DEFAULT 0,
  saves         INTEGER DEFAULT 0,
  followers     INTEGER,
  watch_time    INTEGER,
  retention     REAL
);

CREATE INDEX IF NOT EXISTS idx_snapshot_publish ON metric_snapshots(publish_id);
