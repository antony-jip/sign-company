-- 030: Maak organisaties en uitnodigingen tabellen aan
-- DRAAI DIT HANDMATIG in de Supabase SQL Editor

CREATE TABLE IF NOT EXISTS organisaties (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  naam TEXT NOT NULL DEFAULT '',
  eigenaar_id UUID NOT NULL,
  logo_url TEXT,
  adres TEXT,
  postcode TEXT,
  plaats TEXT,
  telefoon TEXT,
  kvk_nummer TEXT,
  btw_nummer TEXT,
  trial_start TIMESTAMPTZ DEFAULT NOW(),
  trial_einde TIMESTAMPTZ DEFAULT NOW() + INTERVAL '30 days',
  is_betaald BOOLEAN DEFAULT FALSE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  abonnement_status TEXT DEFAULT 'trial',
  onboarding_compleet BOOLEAN DEFAULT FALSE,
  onboarding_stap INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE organisaties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Eigenaar ziet eigen organisatie"
  ON organisaties FOR ALL
  USING (eigenaar_id = auth.uid());

-- Uitnodigingen tabel

CREATE TABLE IF NOT EXISTS uitnodigingen (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organisatie_id UUID NOT NULL REFERENCES organisaties(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  rol TEXT NOT NULL DEFAULT 'medewerker',
  uitgenodigd_door UUID,
  status TEXT NOT NULL DEFAULT 'verstuurd',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days'
);

ALTER TABLE uitnodigingen ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org eigenaar beheert uitnodigingen"
  ON uitnodigingen FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM organisaties
      WHERE organisaties.id = uitnodigingen.organisatie_id
        AND organisaties.eigenaar_id = auth.uid()
    )
  );
