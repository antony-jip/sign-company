BEGIN;

-- ============================================================
-- 192: BACKFILL organisatie_id via profiles
--
-- Draai 191 eerst. Dit bestand vult organisatie_id waar hij NULL is en waar de
-- user_id van de rij naar een profiel met een organisatie wijst.
--
-- Wat dit doet:
--   UPDATE <tabel> SET organisatie_id = p.organisatie_id
--     FROM profiles p
--    WHERE <tabel>.user_id = p.id
--      AND <tabel>.organisatie_id IS NULL
--      AND p.organisatie_id IS NOT NULL
--
-- Wat dit NIET doet, bewust:
--   · rijen zonder user_id, of met een user_id zonder profiel, of met een
--     profiel zonder organisatie, blijven staan met NULL. Die zijn niet
--     automatisch toe te wijzen: een verkeerde gok plaatst bedrijfsdata in de
--     verkeerde organisatie, en dat is erger dan een onzichtbare rij.
--     Zie uitkomst 3 van 191 voor welke dat zijn.
--   · geen enkele bestaande organisatie_id wordt overschreven.
--   · geen kolom wordt NOT NULL gemaakt. Dat is 193.
--
-- Alles in één transactie. Klapt er één tabel, dan gaat de hele run terug.
--
-- DRAAI DIT HANDMATIG in de Supabase SQL Editor.
-- Veilig om opnieuw te draaien (idempotent: de tweede keer raakt 0 rijen).
-- ============================================================

DROP TABLE IF EXISTS _org_backfill_log;
CREATE TEMP TABLE _org_backfill_log (
  tabel      text,
  bijgewerkt bigint
);

DO $$
DECLARE
  t        text;
  n        bigint;
  tabellen text[] := ARRAY[
    'app_settings','bedrijfssluitingsdagen','bestelbonnen','calculatie_producten',
    'calculatie_templates','deals','document_styles','documenten','emails','events',
    'facturen','herinnering_templates','klanten','leveranciers','leveringsbonnen',
    'medewerkers','montage_afspraken','notificaties','offertes','project_portalen',
    'projecten','taken','tijdregistraties','uitgaven','verlof','voorraad_artikelen',
    'werkbonnen'
  ];
BEGIN
  FOREACH t IN ARRAY tabellen LOOP
    -- `events` bestaat niet in de migratiemap; overslaan in plaats van klappen.
    IF to_regclass('public.' || t) IS NULL THEN
      CONTINUE;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = t AND column_name = 'organisatie_id'
    ) THEN
      CONTINUE;
    END IF;

    -- Zonder user_id valt er niets te herleiden.
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = t AND column_name = 'user_id'
    ) THEN
      CONTINUE;
    END IF;

    EXECUTE format(
      'UPDATE public.%I x
          SET organisatie_id = p.organisatie_id
         FROM public.profiles p
        WHERE x.user_id = p.id
          AND x.organisatie_id IS NULL
          AND p.organisatie_id IS NOT NULL', t);

    GET DIAGNOSTICS n = ROW_COUNT;

    IF n > 0 THEN
      INSERT INTO _org_backfill_log VALUES (t, n);
    END IF;
  END LOOP;
END $$;

COMMIT;

-- ============================================================
-- VERIFICATIE — plak beide uitkomsten terug.
-- ============================================================

-- 1. Wat is er bijgewerkt? Leeg = er was niets te doen (of 192 draaide al eerder).
SELECT * FROM _org_backfill_log ORDER BY bijgewerkt DESC;

-- 2. Wat blijft er over met NULL? Dit is het restant dat met de hand moet.
--    Verwacht: gelijk aan `rest_totaal` uit 191.
DO $$
DECLARE
  t        text;
  n        bigint;
  totaal   bigint := 0;
  tabellen text[] := ARRAY[
    'app_settings','bedrijfssluitingsdagen','bestelbonnen','calculatie_producten',
    'calculatie_templates','deals','document_styles','documenten','emails','events',
    'facturen','herinnering_templates','klanten','leveranciers','leveringsbonnen',
    'medewerkers','montage_afspraken','notificaties','offertes','project_portalen',
    'projecten','taken','tijdregistraties','uitgaven','verlof','voorraad_artikelen',
    'werkbonnen'
  ];
BEGIN
  FOREACH t IN ARRAY tabellen LOOP
    IF to_regclass('public.' || t) IS NULL THEN CONTINUE; END IF;
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = t AND column_name = 'organisatie_id'
    ) THEN CONTINUE; END IF;

    EXECUTE format('SELECT count(*) FROM public.%I WHERE organisatie_id IS NULL', t) INTO n;
    totaal := totaal + n;
    IF n > 0 THEN
      RAISE NOTICE 'nog NULL: %  ->  % rijen', t, n;
    END IF;
  END LOOP;
  RAISE NOTICE 'TOTAAL nog NULL: %', totaal;
END $$;
