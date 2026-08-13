-- ============================================================
-- 191: DIAGNOSE — hoeveel rijen missen organisatie_id?
--
-- Dit bestand WIJZIGT NIETS. Het leest alleen en maakt een tijdelijke tabel.
-- Draai het, plak de uitkomst terug, en pas daarna 192/193/194.
--
-- Waarom dit eerst moet:
--   Migratie 047 voegde organisatie_id toe aan 27 tabellen, allemaal NULLABLE.
--   getOrgId() (src/services/supabaseHelpers.ts:67) geeft na één retry van
--   250 ms `undefined` terug, en createFactuur (factuurService.ts:51) schrijft
--   dat ongefilterd door. Een rij met organisatie_id = NULL is onzichtbaar voor
--   elke org-gescopete policy.
--
--   Op dit moment ziet de aanmaker zulke rijen nog wél, omdat er op 25 tabellen
--   een legacy-policy `USING (user_id = auth.uid())` overleeft die met de
--   org-policy OR't (zie 194 voor de oorzaak). Zodra die legacy-policy weg is,
--   verdwijnen NULL-rijen voor iedereen, zonder foutmelding.
--
--   Daarom is de volgorde niet vrij:
--     191 (dit)  tellen
--     192        backfillen via profiles.organisatie_id
--     193        NOT NULL afdwingen  <- pas als 192 nul restant laat
--     194        legacy-policies droppen  <- pas na 193
--
-- Kolommen in de uitkomst:
--   zonder_org      rijen met organisatie_id IS NULL
--   te_backfillen   daarvan: rijen waarvan user_id een profiel met een
--                   organisatie heeft, dus door 192 op te lossen
--   rest            daarvan: rijen die 192 NIET oplost. Die moeten met de hand
--                   beoordeeld worden. Meestal rijen van een verwijderde
--                   gebruiker of uit de demo-modus.
--
-- Veilig om zo vaak te draaien als je wilt.
-- ============================================================

DROP TABLE IF EXISTS _org_diagnose;
CREATE TEMP TABLE _org_diagnose (
  tabel         text,
  zonder_org    bigint,
  te_backfillen bigint,
  rest          bigint
);

DO $$
DECLARE
  t            text;
  n_null       bigint;
  n_fix        bigint;
  heeft_user   boolean;
  tabellen     text[] := ARRAY[
    'app_settings','bedrijfssluitingsdagen','bestelbonnen','calculatie_producten',
    'calculatie_templates','deals','document_styles','documenten','emails','events',
    'facturen','herinnering_templates','klanten','leveranciers','leveringsbonnen',
    'medewerkers','montage_afspraken','notificaties','offertes','project_portalen',
    'projecten','taken','tijdregistraties','uitgaven','verlof','voorraad_artikelen',
    'werkbonnen'
  ];
BEGIN
  FOREACH t IN ARRAY tabellen LOOP
    -- Tabel kan ontbreken: 047 en 078 verwijzen naar `events`, maar geen enkele
    -- migratie maakt die tabel aan. Overslaan in plaats van de hele run laten
    -- klappen.
    IF to_regclass('public.' || t) IS NULL THEN
      CONTINUE;
    END IF;

    -- Kolom kan ontbreken als 047 in deze database niet volledig gedraaid is.
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = t AND column_name = 'organisatie_id'
    ) THEN
      CONTINUE;
    END IF;

    EXECUTE format('SELECT count(*) FROM public.%I WHERE organisatie_id IS NULL', t)
      INTO n_null;

    IF n_null = 0 THEN
      CONTINUE;
    END IF;

    -- Niet elke tabel heeft user_id; zonder die kolom kan 192 niets backfillen.
    heeft_user := EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = t AND column_name = 'user_id'
    );

    IF heeft_user THEN
      EXECUTE format(
        'SELECT count(*) FROM public.%I x
           JOIN public.profiles p ON p.id = x.user_id
          WHERE x.organisatie_id IS NULL AND p.organisatie_id IS NOT NULL', t)
        INTO n_fix;
    ELSE
      n_fix := 0;
    END IF;

    INSERT INTO _org_diagnose VALUES (t, n_null, n_fix, n_null - n_fix);
  END LOOP;
END $$;

-- ============================================================
-- UITKOMST 1: per tabel. Leeg resultaat = niets te doen, 192 en 193 kunnen
-- meteen. Anders: kijk naar de kolom `rest`.
-- ============================================================
SELECT * FROM _org_diagnose ORDER BY zonder_org DESC;

-- ============================================================
-- UITKOMST 2: totalen.
-- Is `rest_totaal` 0, dan lost 192 alles op en kan 193 daarna.
-- Is `rest_totaal` > 0, plak dan ook uitkomst 3 terug.
-- ============================================================
SELECT
  coalesce(sum(zonder_org), 0)    AS zonder_org_totaal,
  coalesce(sum(te_backfillen), 0) AS te_backfillen_totaal,
  coalesce(sum(rest), 0)          AS rest_totaal
FROM _org_diagnose;

-- ============================================================
-- UITKOMST 3: alleen nodig als rest_totaal > 0. Welke tabellen houden rijen
-- over die 192 niet kan oplossen?
-- ============================================================
SELECT tabel, rest FROM _org_diagnose WHERE rest > 0 ORDER BY rest DESC;
