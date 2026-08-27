-- Losse adreslijsten: ontvangers die géén klant in doen. zijn.
--
-- WAAROM. verzamelOntvangers kende maar één bron: klanten en contactpersonen.
-- Wie een lijst van buiten wilde mailen (beursbezoekers, een branchelijst, een
-- eigen bestand met signmakers) moest die eerst als klant importeren. Dan staan
-- ze in Klanten, in Leads en in elke telling, en glippen ze mee in de eerste de
-- beste "Iedereen"-verzending. Precies wat je niet wilt bij een lijst die met
-- je klantenbestand niets te maken heeft.
--
-- Een lijst staat daarom volledig los van klanten. Hij levert alleen adressen
-- voor een verzending; er hangt geen klant, project of factuur aan.
--
-- Afmeldingen en bounces werken al op e-mailadres (nieuwsbrief_afmeldingen,
-- nieuwsbrief_adres_problemen), dus die gelden hier ongewijzigd. Een adres dat
-- zich afmeldt blijft in de lijst staan maar valt bij het verzamelen af: zo
-- weet je bij een volgende import nog dat het adres bestond en waarom het niet
-- meegaat.

BEGIN;

CREATE TABLE IF NOT EXISTS nieuwsbrief_lijsten (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  naam TEXT NOT NULL,
  omschrijving TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, naam)
);

CREATE INDEX IF NOT EXISTS idx_nieuwsbrief_lijsten_user ON nieuwsbrief_lijsten(user_id);

CREATE TABLE IF NOT EXISTS nieuwsbrief_lijst_adressen (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lijst_id UUID NOT NULL REFERENCES nieuwsbrief_lijsten(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  naam TEXT NOT NULL DEFAULT '',
  bedrijfsnaam TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Adressen worden altijd als kleine letters weggeschreven, zodat deze
  -- constraint een dubbele import ook echt tegenhoudt.
  UNIQUE (lijst_id, email)
);

CREATE INDEX IF NOT EXISTS idx_nieuwsbrief_lijst_adressen_lijst ON nieuwsbrief_lijst_adressen(lijst_id);
CREATE INDEX IF NOT EXISTS idx_nieuwsbrief_lijst_adressen_user ON nieuwsbrief_lijst_adressen(user_id);

ALTER TABLE nieuwsbrief_lijsten ENABLE ROW LEVEL SECURITY;
ALTER TABLE nieuwsbrief_lijst_adressen ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Eigenaar ziet eigen lijsten" ON nieuwsbrief_lijsten;
CREATE POLICY "Eigenaar ziet eigen lijsten"
  ON nieuwsbrief_lijsten FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Eigenaar maakt lijsten" ON nieuwsbrief_lijsten;
CREATE POLICY "Eigenaar maakt lijsten"
  ON nieuwsbrief_lijsten FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Eigenaar updatet lijsten" ON nieuwsbrief_lijsten;
CREATE POLICY "Eigenaar updatet lijsten"
  ON nieuwsbrief_lijsten FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Eigenaar verwijdert lijsten" ON nieuwsbrief_lijsten;
CREATE POLICY "Eigenaar verwijdert lijsten"
  ON nieuwsbrief_lijsten FOR DELETE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Eigenaar ziet eigen lijstadressen" ON nieuwsbrief_lijst_adressen;
CREATE POLICY "Eigenaar ziet eigen lijstadressen"
  ON nieuwsbrief_lijst_adressen FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Eigenaar maakt lijstadressen" ON nieuwsbrief_lijst_adressen;
CREATE POLICY "Eigenaar maakt lijstadressen"
  ON nieuwsbrief_lijst_adressen FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Eigenaar updatet lijstadressen" ON nieuwsbrief_lijst_adressen;
CREATE POLICY "Eigenaar updatet lijstadressen"
  ON nieuwsbrief_lijst_adressen FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Eigenaar verwijdert lijstadressen" ON nieuwsbrief_lijst_adressen;
CREATE POLICY "Eigenaar verwijdert lijstadressen"
  ON nieuwsbrief_lijst_adressen FOR DELETE USING (user_id = auth.uid());

-- De ontvanger-snapshot uit migratie 225 kende alleen 'klant' en
-- 'contactpersoon'. Een adres uit een losse lijst is geen van beide; zonder
-- deze derde waarde faalt het vastleggen stilletjes en verliest de verzending
-- haar meting, haar herzend-mogelijkheid en haar afmeldherkomst.
ALTER TABLE nieuwsbrief_ontvangers DROP CONSTRAINT IF EXISTS nieuwsbrief_ontvangers_bron_check;
ALTER TABLE nieuwsbrief_ontvangers
  ADD CONSTRAINT nieuwsbrief_ontvangers_bron_check
  CHECK (bron IN ('klant', 'contactpersoon', 'lijst'));

COMMIT;

NOTIFY pgrst, 'reload schema';

INSERT INTO doen_migraties (bestand) VALUES ('229_nieuwsbrief_lijsten.sql') ON CONFLICT DO NOTHING;

-- Controle:
--   SELECT l.naam, count(a.id) AS adressen
--     FROM nieuwsbrief_lijsten l
--     LEFT JOIN nieuwsbrief_lijst_adressen a ON a.lijst_id = l.id
--    GROUP BY l.naam ORDER BY l.naam;
