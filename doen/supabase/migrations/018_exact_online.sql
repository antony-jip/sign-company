-- ============================================================
-- 018: Exact Online integratie
-- ============================================================
-- OPMERKING: Deze SQL is al handmatig uitgevoerd in het Supabase dashboard.
-- Dit bestand dient als documentatie en voor toekomstige deployments.
-- ============================================================

-- Voeg Exact Online velden toe aan app_settings
ALTER TABLE app_settings
  ADD COLUMN IF NOT EXISTS exact_online_client_id text,
  ADD COLUMN IF NOT EXISTS exact_online_client_secret text,
  ADD COLUMN IF NOT EXISTS exact_online_connected boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS exact_administratie_id text,
  ADD COLUMN IF NOT EXISTS exact_verkoopboek text DEFAULT '80',
  ADD COLUMN IF NOT EXISTS exact_grootboek text DEFAULT '8090',
  ADD COLUMN IF NOT EXISTS exact_btw_hoog text DEFAULT '2',
  ADD COLUMN IF NOT EXISTS exact_btw_laag text,
  ADD COLUMN IF NOT EXISTS exact_btw_nul text;

-- Tabel voor Exact Online tokens (gescheiden van app_settings voor veiligheid)
CREATE TABLE IF NOT EXISTS exact_tokens (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  expires_at timestamptz NOT NULL,
  division integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE exact_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own exact_tokens"
  ON exact_tokens FOR ALL
  USING (user_id = auth.uid());

-- Voeg exact velden toe aan facturen tabel
ALTER TABLE facturen
  ADD COLUMN IF NOT EXISTS exact_entry_id text,
  ADD COLUMN IF NOT EXISTS exact_synced_at timestamptz;
