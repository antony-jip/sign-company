-- A/B-test op de onderwerpregel en herzenden naar wie niet opende.
--
-- WAAROM A/B. Het onderwerp bepaalt of een mail geopend wordt en er was geen
-- enkele manier om te weten welk onderwerp werkt. Een test op een deel van de
-- lijst, daarna het winnende onderwerp naar de rest, is de goedkoopste
-- structurele verbetering die er is.
--
-- WAAROM HERZENDEN. Zeventig tot tachtig procent opent een nieuwsbrief niet.
-- Diezelfde brief een paar dagen later met een ander onderwerp naar precies die
-- groep levert er opens bij zonder dat er iets geschreven hoeft te worden. De
-- herzending is een eigen rij en geen tweede verzending van dezelfde: anders
-- lopen de cijfers van beide door elkaar.

BEGIN;

ALTER TABLE nieuwsbrieven ADD COLUMN IF NOT EXISTS onderwerp_b TEXT;
ALTER TABLE nieuwsbrieven ADD COLUMN IF NOT EXISTS preheader_b TEXT;
ALTER TABLE nieuwsbrieven ADD COLUMN IF NOT EXISTS ab_actief BOOLEAN NOT NULL DEFAULT false;
-- Percentage van de selectie dat de test krijgt, in twee gelijke helften
-- gesplitst. De rest wacht op de winnaar.
ALTER TABLE nieuwsbrieven ADD COLUMN IF NOT EXISTS ab_testdeel INTEGER NOT NULL DEFAULT 30;
ALTER TABLE nieuwsbrieven ADD COLUMN IF NOT EXISTS ab_wachttijd_uren INTEGER NOT NULL DEFAULT 4;
ALTER TABLE nieuwsbrieven ADD COLUMN IF NOT EXISTS ab_winnaar TEXT;
ALTER TABLE nieuwsbrieven ADD COLUMN IF NOT EXISTS ab_beslist_op TIMESTAMPTZ;
ALTER TABLE nieuwsbrieven ADD COLUMN IF NOT EXISTS ab_rest_verstuurd INTEGER;
-- De volledig opgemaakte mail zoals hij de deur uit ging, inclusief shell en
-- UTM's. De rest van de lijst moet exact dezelfde mail krijgen als de
-- testgroep, anders test je niet alleen het onderwerp. nieuwsbrieven.html is
-- alleen de body en de opmaak zit in de client-stijl, dus die volstaat niet.
ALTER TABLE nieuwsbrieven ADD COLUMN IF NOT EXISTS verzend_html TEXT;

ALTER TABLE nieuwsbrieven DROP CONSTRAINT IF EXISTS nieuwsbrieven_ab_testdeel_check;
ALTER TABLE nieuwsbrieven ADD CONSTRAINT nieuwsbrieven_ab_testdeel_check
  CHECK (ab_testdeel BETWEEN 10 AND 50);
ALTER TABLE nieuwsbrieven DROP CONSTRAINT IF EXISTS nieuwsbrieven_ab_wachttijd_check;
ALTER TABLE nieuwsbrieven ADD CONSTRAINT nieuwsbrieven_ab_wachttijd_check
  CHECK (ab_wachttijd_uren BETWEEN 1 AND 48);
ALTER TABLE nieuwsbrieven DROP CONSTRAINT IF EXISTS nieuwsbrieven_ab_winnaar_check;
ALTER TABLE nieuwsbrieven ADD CONSTRAINT nieuwsbrieven_ab_winnaar_check
  CHECK (ab_winnaar IS NULL OR ab_winnaar IN ('a', 'b'));

-- Wie na de test het winnende onderwerp krijgt hoort niet in de vergelijking
-- tussen a en b thuis, anders verschuift de uitslag achteraf nog.
ALTER TABLE nieuwsbrief_ontvangers DROP CONSTRAINT IF EXISTS nieuwsbrief_ontvangers_variant_check;
ALTER TABLE nieuwsbrief_ontvangers ADD CONSTRAINT nieuwsbrief_ontvangers_variant_check
  CHECK (variant IN ('a', 'b', 'rest'));

-- Een herzending wijst terug naar het origineel, zodat het overzicht ze bij
-- elkaar kan tonen zonder de cijfers van de eerste verzending te vervuilen.
ALTER TABLE nieuwsbrieven ADD COLUMN IF NOT EXISTS herzending_van UUID REFERENCES nieuwsbrieven(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_nieuwsbrieven_herzending ON nieuwsbrieven(herzending_van) WHERE herzending_van IS NOT NULL;

-- De cron zoekt hierop: openstaande A/B-tests waarvan de wachttijd om is.
CREATE INDEX IF NOT EXISTS idx_nieuwsbrieven_ab_open ON nieuwsbrieven(verzonden_op)
  WHERE ab_actief AND ab_winnaar IS NULL;

COMMIT;

NOTIFY pgrst, 'reload schema';

INSERT INTO doen_migraties (bestand) VALUES ('226_nieuwsbrief_ab_herzenden.sql') ON CONFLICT DO NOTHING;

-- Controle:
--   SELECT id, onderwerp, onderwerp_b, ab_actief, ab_winnaar, ab_beslist_op
--     FROM nieuwsbrieven WHERE ab_actief;
--   SELECT n.onderwerp, o.variant, count(*) FROM nieuwsbrief_ontvangers o
--     JOIN nieuwsbrieven n ON n.id = o.nieuwsbrief_id GROUP BY 1, 2;
