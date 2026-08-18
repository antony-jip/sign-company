-- Leads: outbound prospectlijst (SIBON-campagne 2026 als eerste vulling).
-- Bewuste afwijking van de organisatie_id-conventie: outreach is persoonlijk
-- voor de eigenaar (zoals de nieuwsbrief-module), dus RLS op user_id.
-- user_id is daarmee tegelijk de toewijzing - een apart toegewezen_aan-veld
-- zou dezelfde waarde dupliceren.

CREATE TABLE IF NOT EXISTS leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  naam TEXT NOT NULL DEFAULT '',
  bedrijf TEXT NOT NULL DEFAULT '',
  telefoon TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  provincie TEXT NOT NULL DEFAULT '',
  plaats TEXT NOT NULL DEFAULT '',

  -- Kanaal-onafhankelijk: geldt voor WhatsApp (handmatig afvinken) en mail.
  status TEXT NOT NULL DEFAULT 'benaderd'
    CHECK (status IN ('benaderd', 'gereageerd', 'geen_interesse', 'follow-up_later')),
  status_sinds TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Hoe het contact gevonden is (WhatsApp, Web-search match, ...).
  bron TEXT NOT NULL DEFAULT '',
  -- Datakwaliteitslabel uit het bronbestand ("bevestigd", "voornaam alleen").
  -- Bewust los van status: dat zegt iets over de data, niet over de opvolging.
  bron_status TEXT NOT NULL DEFAULT '',
  tags TEXT[] NOT NULL DEFAULT '{}',

  -- Extra contactpersonen bij hetzelfde bedrijf, vorm van Contactpersoon.
  contactpersonen JSONB NOT NULL DEFAULT '[]',
  notities TEXT NOT NULL DEFAULT '',

  import_bron TEXT NOT NULL DEFAULT '',
  import_datum TIMESTAMPTZ,
  -- Genormaliseerde sleutel (bedrijfsnaam, of naam+telefoon zonder bedrijf),
  -- zodat de import opnieuw gedraaid kan worden zonder dubbelen.
  import_sleutel TEXT NOT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (user_id, import_sleutel)
);

CREATE INDEX IF NOT EXISTS idx_leads_user ON leads(user_id);
CREATE INDEX IF NOT EXISTS idx_leads_user_status ON leads(user_id, status);

DROP TRIGGER IF EXISTS update_leads_updated_at ON leads;
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Eigenaar ziet eigen leads" ON leads;
CREATE POLICY "Eigenaar ziet eigen leads"
  ON leads FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Eigenaar maakt leads" ON leads;
CREATE POLICY "Eigenaar maakt leads"
  ON leads FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Eigenaar updatet leads" ON leads;
CREATE POLICY "Eigenaar updatet leads"
  ON leads FOR UPDATE
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Eigenaar verwijdert leads" ON leads;
CREATE POLICY "Eigenaar verwijdert leads"
  ON leads FOR DELETE
  USING (user_id = auth.uid());
