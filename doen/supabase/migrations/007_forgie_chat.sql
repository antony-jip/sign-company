-- ============================================================
-- Migration 007: Forgie Chat — imported data + chat history
-- ============================================================

-- Geïmporteerde bedrijfsdata (CSV/XLSX) voor Forgie
CREATE TABLE IF NOT EXISTS ai_imported_data (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  bestandsnaam text,
  bron text DEFAULT 'csv',
  data jsonb NOT NULL,
  zoek_tekst text NOT NULL,
  created_at timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_imported_data_user ON ai_imported_data(user_id);
CREATE INDEX IF NOT EXISTS ai_imported_data_search ON ai_imported_data USING gin(to_tsvector('dutch', zoek_tekst));

-- Chat history voor Forgie conversaties
CREATE TABLE IF NOT EXISTS ai_chat_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  role text NOT NULL,
  content text NOT NULL,
  created_at timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_chat_user ON ai_chat_history(user_id, created_at DESC);

-- Voeg bedrijfscontext toe aan app_settings (voor Forgie system prompt)
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS forgie_bedrijfscontext text DEFAULT '';
