-- Nieuwsbrief-module. Bewuste afwijking van de organisatie_id-conventie:
-- nieuwsbrieven zijn persoonlijk voor de eigenaar (zoals e-mail-credentials),
-- dus RLS op user_id in plaats van organisatie_id. Alleen de eigenaar
-- (ADMIN_USER_ID) gebruikt de module; verzending loopt via Resend.

CREATE TABLE IF NOT EXISTS nieuwsbrieven (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  onderwerp TEXT NOT NULL DEFAULT '',
  html TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'concept' CHECK (status IN ('concept', 'gepland', 'verzonden')),
  resend_broadcast_id TEXT,
  aantal_ontvangers INTEGER,
  gepland_op TIMESTAMPTZ,
  verzonden_op TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_nieuwsbrieven_user ON nieuwsbrieven(user_id);

ALTER TABLE nieuwsbrieven ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Eigenaar ziet eigen nieuwsbrieven" ON nieuwsbrieven;
CREATE POLICY "Eigenaar ziet eigen nieuwsbrieven"
  ON nieuwsbrieven FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Eigenaar maakt nieuwsbrieven" ON nieuwsbrieven;
CREATE POLICY "Eigenaar maakt nieuwsbrieven"
  ON nieuwsbrieven FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Eigenaar updatet nieuwsbrieven" ON nieuwsbrieven;
CREATE POLICY "Eigenaar updatet nieuwsbrieven"
  ON nieuwsbrieven FOR UPDATE
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Eigenaar verwijdert nieuwsbrieven" ON nieuwsbrieven;
CREATE POLICY "Eigenaar verwijdert nieuwsbrieven"
  ON nieuwsbrieven FOR DELETE
  USING (user_id = auth.uid());

-- Uitschrijvingen die via de Resend-webhook binnenkomen, zodat een afgemeld
-- contact bij een volgende audience-sync overgeslagen wordt en de eigenaar
-- ziet wie zich heeft afgemeld. Schrijven gebeurt server-side (service role,
-- omzeilt RLS); de eigenaar leest alleen.
CREATE TABLE IF NOT EXISTS nieuwsbrief_afmeldingen (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  reden TEXT,
  afgemeld_op TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, email)
);

CREATE INDEX IF NOT EXISTS idx_nieuwsbrief_afmeldingen_user ON nieuwsbrief_afmeldingen(user_id);

ALTER TABLE nieuwsbrief_afmeldingen ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Eigenaar ziet eigen afmeldingen" ON nieuwsbrief_afmeldingen;
CREATE POLICY "Eigenaar ziet eigen afmeldingen"
  ON nieuwsbrief_afmeldingen FOR SELECT
  USING (user_id = auth.uid());
