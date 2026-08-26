-- Eigen blokken uit localStorage naar de database.
--
-- WAAROM. Een bewaard blok (vaste footer, vast actieblok) stond in
-- localStorage onder doen_nieuwsbrief_eigen_blokken. Dat betekent: weg bij een
-- andere browser, weg bij een andere computer, weg als de browserdata wordt
-- geleegd. Voor gereedschap dat je bewust opbouwt is dat de verkeerde bewaarplek.
--
-- User-scoped zoals de rest van de module (zie 149): het is persoonlijk palet,
-- geen organisatiedata.

BEGIN;

CREATE TABLE IF NOT EXISTS nieuwsbrief_eigen_blokken (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  naam TEXT NOT NULL,
  blok JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, naam)
);

CREATE INDEX IF NOT EXISTS idx_nieuwsbrief_eigen_blokken_user ON nieuwsbrief_eigen_blokken(user_id);

ALTER TABLE nieuwsbrief_eigen_blokken ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Eigenaar ziet eigen blokken" ON nieuwsbrief_eigen_blokken;
CREATE POLICY "Eigenaar ziet eigen blokken"
  ON nieuwsbrief_eigen_blokken FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Eigenaar maakt eigen blokken" ON nieuwsbrief_eigen_blokken;
CREATE POLICY "Eigenaar maakt eigen blokken"
  ON nieuwsbrief_eigen_blokken FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Eigenaar updatet eigen blokken" ON nieuwsbrief_eigen_blokken;
CREATE POLICY "Eigenaar updatet eigen blokken"
  ON nieuwsbrief_eigen_blokken FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Eigenaar verwijdert eigen blokken" ON nieuwsbrief_eigen_blokken;
CREATE POLICY "Eigenaar verwijdert eigen blokken"
  ON nieuwsbrief_eigen_blokken FOR DELETE USING (user_id = auth.uid());

COMMIT;

NOTIFY pgrst, 'reload schema';

INSERT INTO doen_migraties (bestand) VALUES ('228_nieuwsbrief_eigen_blokken.sql') ON CONFLICT DO NOTHING;

-- Controle:
--   SELECT naam, created_at FROM nieuwsbrief_eigen_blokken ORDER BY naam;
