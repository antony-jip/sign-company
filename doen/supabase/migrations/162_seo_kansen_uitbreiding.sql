-- ============================================================
-- 162: seo_kansen — nieuwe kanssoorten + details
--
-- Uitbreiding op 152. Het dashboard op signcompany.nl/admin kende
-- vier soorten kansen, allemaal uit Search Console. Die voorraad
-- droogt op: als je de sterkste twaalf per soort hebt afgewerkt,
-- is er geen nieuw werk meer, terwijl er wel degelijk pagina's zijn
-- die niets doen.
--
-- Deze migratie voegt vier bronnen toe:
--
--   snippet_steal  — je staat op plek 1-3 en krijgt tóch geen klik;
--                    Google's snippet of AI Overview pikt hem. Het
--                    advies bij 'lage_ctr' (titel klikwaardiger) is
--                    hier juist het verkeerde antwoord, dus eigen soort.
--   daler          — pagina die meetbaar verkeer verliest tegenover de
--                    vorige periode. Verval afvangen is goedkoper dan
--                    nieuwe posities veroveren, en deze soort vernieuwt
--                    zichzelf elke periode.
--   onzichtbaar    — staat in sitemap.xml, maar Google heeft hem in
--                    30 dagen aan niemand getoond.
--   onpage         — bevinding uit de nachtelijke crawl (titel, meta,
--                    H1, dunne inhoud, geen interne links, ...). Voor
--                    deze soort staat de bevindingscode in `zoekterm`
--                    en de meetwaarden in `details`.
--
-- `details` is nieuw omdat on-page-kansen niet live herrekend worden:
-- het dashboard leest ze uit deze tabel en heeft de gemeten waarde
-- (de titel van 78 tekens, de partnerpagina bij een dubbele titel)
-- dus nodig zonder zelf te crawlen.
-- ============================================================

ALTER TABLE seo_kansen
  ADD COLUMN IF NOT EXISTS details JSONB;

COMMENT ON COLUMN seo_kansen.details IS
  'Gemeten waarden bij de bevinding, alleen gevuld voor soort=onpage: {waarde, lengte, aantal, woorden, ook[]}.';

-- Bij soort=onpage is `zoekterm` geen zoekwoord maar de bevindingscode
-- (titel_te_lang, meta_ontbreekt, geen_interne_links, ...). De sleutel
-- blijft soort|zoekterm|pagina, dus per pagina per bevinding één rij.
--
-- 152 zette die CHECK inline neer, zonder naam, dus Postgres heeft hem zelf
-- genoemd. Op naam droppen is daarom een gok: zit hij anders in de database,
-- dan doet DROP ... IF EXISTS niets en blijft de oude constraint de nieuwe
-- soorten weigeren. Dus zoeken we hem op z'n definitie op. Dat maakt deze
-- migratie ook idempotent: de nieuwe constraint noemt 'lage_ctr' ook, dus een
-- tweede run ruimt z'n eigen vorige poging op.
DO $$
DECLARE naam text;
BEGIN
  FOR naam IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    WHERE rel.relname = 'seo_kansen'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) LIKE '%lage_ctr%'
  LOOP
    EXECUTE format('ALTER TABLE seo_kansen DROP CONSTRAINT %I', naam);
  END LOOP;
END $$;

ALTER TABLE seo_kansen ADD CONSTRAINT seo_kansen_soort_check
  CHECK (soort IN (
    'lage_ctr',
    'bijna_pagina1',
    'kannibalisatie',
    'duplicaat',
    'snippet_steal',
    'daler',
    'onzichtbaar',
    'onpage'
  ));

-- De crawl beoordeelt z'n bevindingen per pagina ("heb ik deze pagina
-- vannacht gezien?"), dus daar wordt op gefilterd.
CREATE INDEX IF NOT EXISTS idx_seo_kansen_org_soort_pagina
  ON seo_kansen(organisatie_id, soort, pagina);
