-- Nieuwsbrief meetbaar maken.
--
-- WAAROM. De module verstuurde wel maar mat niets bruikbaars:
--   1. nieuwsbrief_events had UNIQUE (nieuwsbrief_id, email, type) en de webhook
--      schreef met ignoreDuplicates. Alleen de eerste klik van iemand werd
--      bewaard, met de link die hij toen aanklikte. Welke knop werkte was dus
--      niet te achterhalen, en herhaald openen telde nergens.
--   2. Events kenden alleen een e-mailadres. Geen koppeling naar klanten, dus
--      "wie opende dit" was onbeantwoordbaar en niets kon door naar verkoop.
--   3. Afmeldingen waren lijst-breed zonder nieuwsbrief_id: geen afmeldpercentage
--      per verzending, terwijl dat het cijfer is dat zegt of je te vaak mailt.
--   4. Bounces en klachten kwamen binnen en verdwenen. Een adres dat hard bounct
--      bleef in elke volgende verzending zitten, wat de deliverability sloopt.
--
-- Alles blijft user-scoped zoals in 149: nieuwsbrieven zijn persoonlijk voor de
-- eigenaar, niet org-breed.

BEGIN;

-- ── 1. Ontvanger-snapshot per verzending ──────────────────────────────────
-- Vastgelegd op het moment van verzenden. Zonder deze tabel is een event een
-- e-mailadres zonder gezicht; met deze tabel hangt elke open en klik aan een
-- klant in doen. Snapshot en niet een join op klanten: als iemand later van
-- bedrijf wisselt of verwijderd wordt, blijft de historie kloppen.
CREATE TABLE IF NOT EXISTS nieuwsbrief_ontvangers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nieuwsbrief_id UUID NOT NULL REFERENCES nieuwsbrieven(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  klant_id UUID,
  contactpersoon_id UUID,
  naam TEXT,
  bedrijfsnaam TEXT,
  bron TEXT NOT NULL DEFAULT 'klant' CHECK (bron IN ('klant', 'contactpersoon')),
  variant TEXT NOT NULL DEFAULT 'a' CHECK (variant IN ('a', 'b')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (nieuwsbrief_id, email)
);

CREATE INDEX IF NOT EXISTS idx_nb_ontvangers_nb ON nieuwsbrief_ontvangers(nieuwsbrief_id);
CREATE INDEX IF NOT EXISTS idx_nb_ontvangers_klant ON nieuwsbrief_ontvangers(klant_id) WHERE klant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_nb_ontvangers_email ON nieuwsbrief_ontvangers(email);

ALTER TABLE nieuwsbrief_ontvangers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Eigenaar ziet eigen nieuwsbrief-ontvangers" ON nieuwsbrief_ontvangers;
CREATE POLICY "Eigenaar ziet eigen nieuwsbrief-ontvangers"
  ON nieuwsbrief_ontvangers FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM nieuwsbrieven n
    WHERE n.id = nieuwsbrief_ontvangers.nieuwsbrief_id AND n.user_id = auth.uid()
  ));

-- ── 2. Elke klik apart, met de link erbij ─────────────────────────────────
-- nieuwsbrief_events blijft "eerste keer per type" (unieke opens, unieke
-- klikkers). Deze tabel houdt élke klik vast, zodat je per link kunt tellen.
CREATE TABLE IF NOT EXISTS nieuwsbrief_kliks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nieuwsbrief_id UUID NOT NULL REFERENCES nieuwsbrieven(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  link TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_nb_kliks_nb ON nieuwsbrief_kliks(nieuwsbrief_id);
CREATE INDEX IF NOT EXISTS idx_nb_kliks_email ON nieuwsbrief_kliks(email);

ALTER TABLE nieuwsbrief_kliks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Eigenaar ziet eigen nieuwsbrief-kliks" ON nieuwsbrief_kliks;
CREATE POLICY "Eigenaar ziet eigen nieuwsbrief-kliks"
  ON nieuwsbrief_kliks FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM nieuwsbrieven n
    WHERE n.id = nieuwsbrief_kliks.nieuwsbrief_id AND n.user_id = auth.uid()
  ));

-- ── 3. Events: herhaling tellen, afmelding als type ───────────────────────
ALTER TABLE nieuwsbrief_events ADD COLUMN IF NOT EXISTS aantal INTEGER NOT NULL DEFAULT 1;
ALTER TABLE nieuwsbrief_events ADD COLUMN IF NOT EXISTS laatst_op TIMESTAMPTZ;

ALTER TABLE nieuwsbrief_events DROP CONSTRAINT IF EXISTS nieuwsbrief_events_type_check;
ALTER TABLE nieuwsbrief_events ADD CONSTRAINT nieuwsbrief_events_type_check
  CHECK (type IN ('sent', 'delivered', 'opened', 'clicked', 'bounced', 'complained', 'unsubscribed'));

-- created_at blijft "voor het eerst gezien", aantal telt de herhalingen.
-- Een gewone upsert kan dat niet: die overschrijft of negeert. Vandaar een
-- functie, aangeroepen door de webhook met de service role.
CREATE OR REPLACE FUNCTION nieuwsbrief_event_registreren(
  p_nieuwsbrief_id UUID,
  p_email TEXT,
  p_type TEXT,
  p_link TEXT DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO nieuwsbrief_events (nieuwsbrief_id, email, type, link, aantal, laatst_op)
  VALUES (p_nieuwsbrief_id, lower(trim(p_email)), p_type, p_link, 1, now())
  ON CONFLICT (nieuwsbrief_id, email, type) DO UPDATE
    SET aantal = nieuwsbrief_events.aantal + 1,
        laatst_op = now();
END;
$$;

REVOKE ALL ON FUNCTION nieuwsbrief_event_registreren(UUID, TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION nieuwsbrief_event_registreren(UUID, TEXT, TEXT, TEXT) FROM anon, authenticated;

-- ── 4. Afmelding hangt aan de nieuwsbrief die hem veroorzaakte ────────────
ALTER TABLE nieuwsbrief_afmeldingen ADD COLUMN IF NOT EXISTS nieuwsbrief_id UUID REFERENCES nieuwsbrieven(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_nb_afmeldingen_nb ON nieuwsbrief_afmeldingen(nieuwsbrief_id) WHERE nieuwsbrief_id IS NOT NULL;

-- ── 5. Adressen die problemen geven ───────────────────────────────────────
-- Een hard bounce betekent: dit adres bestaat niet. Blijf je er toch naartoe
-- sturen, dan daalt je reputatie en komt de rest van je post in spam. Deze
-- tabel wordt door verzamelOntvangers uitgesloten, net als afmeldingen.
-- Soft bounces (volle mailbox, tijdelijk) sluiten niet uit; die tellen alleen.
CREATE TABLE IF NOT EXISTS nieuwsbrief_adres_problemen (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  soort TEXT NOT NULL CHECK (soort IN ('bounce', 'klacht')),
  hard BOOLEAN NOT NULL DEFAULT false,
  reden TEXT,
  nieuwsbrief_id UUID REFERENCES nieuwsbrieven(id) ON DELETE SET NULL,
  aantal INTEGER NOT NULL DEFAULT 1,
  laatst_op TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, email, soort)
);

CREATE INDEX IF NOT EXISTS idx_nb_adres_problemen_user ON nieuwsbrief_adres_problemen(user_id);

ALTER TABLE nieuwsbrief_adres_problemen ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Eigenaar ziet eigen adresproblemen" ON nieuwsbrief_adres_problemen;
CREATE POLICY "Eigenaar ziet eigen adresproblemen"
  ON nieuwsbrief_adres_problemen FOR SELECT
  USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION nieuwsbrief_adresprobleem_registreren(
  p_user_id UUID,
  p_email TEXT,
  p_soort TEXT,
  p_hard BOOLEAN,
  p_reden TEXT,
  p_nieuwsbrief_id UUID DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO nieuwsbrief_adres_problemen (user_id, email, soort, hard, reden, nieuwsbrief_id, aantal, laatst_op)
  VALUES (p_user_id, lower(trim(p_email)), p_soort, p_hard, p_reden, p_nieuwsbrief_id, 1, now())
  ON CONFLICT (user_id, email, soort) DO UPDATE
    SET aantal = nieuwsbrief_adres_problemen.aantal + 1,
        hard = nieuwsbrief_adres_problemen.hard OR EXCLUDED.hard,
        reden = COALESCE(EXCLUDED.reden, nieuwsbrief_adres_problemen.reden),
        nieuwsbrief_id = COALESCE(EXCLUDED.nieuwsbrief_id, nieuwsbrief_adres_problemen.nieuwsbrief_id),
        laatst_op = now();
END;
$$;

REVOKE ALL ON FUNCTION nieuwsbrief_adresprobleem_registreren(UUID, TEXT, TEXT, BOOLEAN, TEXT, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION nieuwsbrief_adresprobleem_registreren(UUID, TEXT, TEXT, BOOLEAN, TEXT, UUID) FROM anon, authenticated;

COMMIT;

NOTIFY pgrst, 'reload schema';

INSERT INTO doen_migraties (bestand) VALUES ('225_nieuwsbrief_meten.sql') ON CONFLICT DO NOTHING;

-- Controle:
--   SELECT count(*) FROM nieuwsbrief_ontvangers;   -- vult zich bij de eerste verzending na deze migratie
--   SELECT type, sum(aantal) FROM nieuwsbrief_events GROUP BY type;
--   SELECT link, count(*) FROM nieuwsbrief_kliks GROUP BY link ORDER BY 2 DESC;
