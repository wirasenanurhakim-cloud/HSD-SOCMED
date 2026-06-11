-- Add thumbnail caching columns to publish_instances
ALTER TABLE publish_instances ADD COLUMN thumbnail_url TEXT;
ALTER TABLE publish_instances ADD COLUMN last_thumbnail_update DATETIME;
