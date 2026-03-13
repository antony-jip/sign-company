-- 030: Organisaties en uitnodigingen tabellen + eigenaar_id kolom
-- DRAAI DIT HANDMATIG in de Supabase SQL Editor
-- Veilig om meerdere keren uit te voeren (IF NOT EXISTS / IF EXISTS checks)

-- Voeg eigenaar_id toe als die ontbreekt (tabel bestaat mogelijk al)
ALTER TABLE organisaties
  ADD COLUMN IF NOT EXISTS eigenaar_id UUID;

-- Vul eigenaar_id in voor bestaande rijen (op basis van profiles)
UPDATE organisaties o
SET eigenaar_id = p.user_id
FROM profiles p
WHERE p.organisatie_id = o.id
  AND o.eigenaar_id IS NULL;

-- RLS policy voor organisaties
ALTER TABLE organisaties ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Eigenaar ziet eigen organisatie" ON organisaties;
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

DROP POLICY IF EXISTS "Org eigenaar beheert uitnodigingen" ON uitnodigingen;
CREATE POLICY "Org eigenaar beheert uitnodigingen"
  ON uitnodigingen FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM organisaties
      WHERE organisaties.id = uitnodigingen.organisatie_id
        AND organisaties.eigenaar_id = auth.uid()
    )
  );
