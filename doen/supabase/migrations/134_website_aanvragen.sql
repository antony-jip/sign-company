-- ============================================================
-- 134: website_aanvragen — chat-aanvragen vanaf signcompany.nl
--
-- Losse inbox, bewust niet gekoppeld aan de Leads-module.
-- Inserts komen binnen via de website-serverless functie
-- (/api/chat-aanvraag op het website-project) met de service-role
-- key; die bypasst RLS. In de app is alles org-scoped.
--
--
-- Je organisatie_id voor de DOEN_ORGANISATIE_ID env-var op het
-- website-project vind je met:
--   SELECT organisatie_id FROM profiles WHERE email = 'antony@signcompany.nl';
-- ============================================================

CREATE TABLE IF NOT EXISTS website_aanvragen (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisatie_id UUID NOT NULL,
  naam TEXT NOT NULL,
  email TEXT NOT NULL,
  telefoon TEXT,
  dienst TEXT,
  bericht TEXT NOT NULL,
  pagina_url TEXT,
  ip_adres TEXT,
  browser TEXT,
  status TEXT NOT NULL DEFAULT 'nieuw' CHECK (status IN ('nieuw', 'bekeken', 'afgehandeld')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE website_aanvragen ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'website_aanvragen' AND policyname = 'Org members manage website_aanvragen'
  ) THEN
    CREATE POLICY "Org members manage website_aanvragen" ON website_aanvragen
      FOR ALL USING (organisatie_id = auth_organisatie_id())
      WITH CHECK (organisatie_id = auth_organisatie_id());
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_website_aanvragen_org_status
  ON website_aanvragen(organisatie_id, status, created_at DESC);
