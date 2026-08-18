-- Full-text search kolom op emails tabel voor snelle zoekresultaten.
-- Combineert onderwerp, van, aan en body_text in één tsvector.
ALTER TABLE emails ADD COLUMN IF NOT EXISTS fts tsvector
  GENERATED ALWAYS AS (
    to_tsvector('dutch', coalesce(onderwerp, '') || ' ' || coalesce(van, '') || ' ' || coalesce(aan, '') || ' ' || coalesce(body_text, ''))
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_emails_fts ON emails USING GIN (fts);
