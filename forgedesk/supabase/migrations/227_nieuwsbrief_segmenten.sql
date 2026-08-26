-- Segmenten: een opgeslagen ontvangerselectie, inclusief gedrag.
--
-- WAAROM. De selectie leefde in nieuwsbrieven.ontvangers, per brief. Wie
-- dezelfde groep twee keer wilde mailen, moest hem twee keer samenklikken, en
-- een groep op gedrag ("wie klikte er ooit", "wie opende de laatste drie niet")
-- was helemaal niet te maken, terwijl dat precies is waar het meten sinds
-- migratie 225 voor bedoeld was.
--
-- Het gedrag zit in dezelfde jsonb als de rest van de selectie, zodat een
-- nieuwsbrief die op een segment verstuurd wordt zijn eigen kopie van de
-- voorwaarden houdt. Verandert het segment later, dan verandert de geschiedenis
-- van die verzending niet mee.

BEGIN;

CREATE TABLE IF NOT EXISTS nieuwsbrief_segmenten (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  naam TEXT NOT NULL,
  omschrijving TEXT,
  selectie JSONB NOT NULL DEFAULT '{"type":"alle"}'::jsonb,
  laatst_gebruikt_op TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, naam)
);

CREATE INDEX IF NOT EXISTS idx_nieuwsbrief_segmenten_user ON nieuwsbrief_segmenten(user_id);

ALTER TABLE nieuwsbrief_segmenten ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Eigenaar ziet eigen segmenten" ON nieuwsbrief_segmenten;
CREATE POLICY "Eigenaar ziet eigen segmenten"
  ON nieuwsbrief_segmenten FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Eigenaar maakt segmenten" ON nieuwsbrief_segmenten;
CREATE POLICY "Eigenaar maakt segmenten"
  ON nieuwsbrief_segmenten FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Eigenaar updatet segmenten" ON nieuwsbrief_segmenten;
CREATE POLICY "Eigenaar updatet segmenten"
  ON nieuwsbrief_segmenten FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Eigenaar verwijdert segmenten" ON nieuwsbrief_segmenten;
CREATE POLICY "Eigenaar verwijdert segmenten"
  ON nieuwsbrief_segmenten FOR DELETE USING (user_id = auth.uid());

COMMIT;

NOTIFY pgrst, 'reload schema';

INSERT INTO doen_migraties (bestand) VALUES ('227_nieuwsbrief_segmenten.sql') ON CONFLICT DO NOTHING;

-- Controle:
--   SELECT naam, selectie FROM nieuwsbrief_segmenten ORDER BY naam;
