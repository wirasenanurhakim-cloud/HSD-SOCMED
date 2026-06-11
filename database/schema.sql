-- Social Analytics DB Schema
-- Run once on first launch

CREATE TABLE IF NOT EXISTS brands (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL UNIQUE,
  color      TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS content_assets (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  brand_id   INTEGER NOT NULL,
  title      TEXT NOT NULL,
  goal       TEXT NOT NULL,
  genre      TEXT NOT NULL,
  duration   INTEGER,
  status     TEXT DEFAULT 'PUBLISHED',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (brand_id) REFERENCES brands(id)
);

CREATE TABLE IF NOT EXISTS publish_instances (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  asset_id     INTEGER NOT NULL,
  platform     TEXT NOT NULL,
  origin       TEXT DEFAULT 'ORIGINAL',
  publish_date DATE NOT NULL,
  post_url     TEXT,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (asset_id) REFERENCES content_assets(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS metric_history (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  publish_id   INTEGER NOT NULL,
  capture_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  views        INTEGER DEFAULT 0,
  likes        INTEGER DEFAULT 0,
  comments     INTEGER DEFAULT 0,
  shares       INTEGER DEFAULT 0,
  reach        INTEGER DEFAULT 0,
  saves        INTEGER DEFAULT 0,
  followers    INTEGER,
  watch_time   INTEGER,
  retention    REAL,
  FOREIGN KEY (publish_id) REFERENCES publish_instances(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS monthly_reports (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  month      TEXT NOT NULL,
  summary    TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT
);

CREATE TABLE IF NOT EXISTS content_plan (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  brand_id     INTEGER,
  title        TEXT NOT NULL,
  type         TEXT NOT NULL,
  planned_date DATE NOT NULL,
  status       TEXT DEFAULT 'PLANNED',
  notes        TEXT,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (brand_id) REFERENCES brands(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_publish_asset    ON publish_instances(asset_id);
CREATE INDEX IF NOT EXISTS idx_metric_publish   ON metric_history(publish_id);
CREATE INDEX IF NOT EXISTS idx_metric_date      ON metric_history(capture_date);
CREATE INDEX IF NOT EXISTS idx_publish_date     ON publish_instances(publish_date);
CREATE INDEX IF NOT EXISTS idx_asset_brand      ON content_assets(brand_id);

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  username  TEXT NOT NULL UNIQUE,
  password  TEXT NOT NULL,
  role      TEXT DEFAULT 'admin',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
