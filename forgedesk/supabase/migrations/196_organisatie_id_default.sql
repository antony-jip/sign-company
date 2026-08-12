BEGIN;

-- ============================================================
-- 196: organisatie_id krijgt een default in plaats van NOT NULL
--
-- Het probleem:
--   getOrgId() (src/services/supabaseHelpers.ts:67) geeft na één retry van
--   250 ms `undefined` terug als het profiel nog niet gelezen kon worden, en
--   createFactuur (factuurService.ts:51) schrijft dat ongefilterd door als
--   `organisatie_id: _orgId`. JSON.stringify laat een undefined-key weg, dus de
--   kolom komt niet mee in de insert en de rij landt met NULL. Zo'n rij is
--   onzichtbaar voor elke org-gescopete policy: hij bestaat, maar niemand ziet
--   hem. Geen foutmelding.
--
-- Waarom GEEN NOT NULL, wat het oorspronkelijke plan was:
--   Dat zou insert-paden breken die de kolom bewust niet zetten. Gemeten:
--   9 van de 12 bestanden die in `notificaties` inserten zetten organisatie_id
--   niet, waaronder mollie-webhook, portaal-reactie, offerte-accepteren en
--   goedkeuring-reactie. Een blanket NOT NULL had het hele klantportaal- en
--   betalingsmeldingspad omgelegd.
--
-- Wat dit in plaats daarvan doet:
--   DEFAULT auth_organisatie_id() op de kolom. Die functie bestaat al sinds
--   migratie 048 (`SELECT organisatie_id FROM profiles WHERE id = auth.uid()`,
--   STABLE SECURITY DEFINER) en is precies de bron die de RLS-policies ook
--   gebruiken. Laat een client de kolom weg, dan vult Postgres hem nu met de
--   organisatie van de ingelogde gebruiker in plaats van met NULL.
--
--   Strikt beter dan NOT NULL:
--     · geen enkel insert-pad gaat stuk, want er wordt niets verplicht
--     · de orphan-route is dicht voor alles wat via de client inserteert
--     · service-role-inserts (api/*) hebben geen auth.uid(); daar geeft de
--       functie NULL en is het gedrag exact als vandaag, dus geen regressie
--
-- Wat dit NIET dekt, bewust:
--   Een insert die EXPLICIET `organisatie_id: null` meestuurt. Een expliciete
--   NULL overrulet een default; dat is Postgres-gedrag en geen tekortkoming van
--   deze migratie. De code doet dat nergens.
--
--   Ook niet: bestaande NULL-rijen. Die zijn met 192 gebackfild voor zover ze
--   aan een profiel met organisatie hingen. Wat overbleef zijn 481 e-mails van
--   demo@forgedesk.nl (auth-account zonder profiel) en 84 notificaties van
--   verdwenen gebruikers.
--
-- Alleen de tabellen die vandaag nul NULL-rijen hebben (gemeten 12 aug).
-- `emails` en `notificaties` blijven er bewust buiten: daar inserteert de
-- service-role legitiem zonder organisatie, dus een default doet daar niets en
-- suggereert een garantie die er niet is.
--
-- DRAAI DIT HANDMATIG in de Supabase SQL Editor.
-- Veilig om opnieuw te draaien (idempotent).
-- ============================================================

DO $$
DECLARE
  t        text;
  tabellen text[] := ARRAY[
    'app_settings','bedrijfssluitingsdagen','bestelbonnen','calculatie_producten',
    'calculatie_templates','deals','document_styles','documenten',
    'facturen','herinnering_templates','klanten','leveranciers','leveringsbonnen',
    'medewerkers','montage_afspraken','offertes','project_portalen',
    'projecten','taken','tijdregistraties','uitgaven','verlof','voorraad_artikelen',
    'werkbonnen'
  ];
BEGIN
  -- auth_organisatie_id() moet bestaan; zonder die functie zou de default een
  -- lege verwijzing zijn en elke insert falen.
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'auth_organisatie_id'
  ) THEN
    RAISE EXCEPTION 'auth_organisatie_id() bestaat niet; draai eerst migratie 048';
  END IF;

  FOREACH t IN ARRAY tabellen LOOP
    IF to_regclass('public.' || t) IS NULL THEN
      RAISE NOTICE 'overgeslagen, tabel bestaat niet: %', t;
      CONTINUE;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = t AND column_name = 'organisatie_id'
    ) THEN
      RAISE NOTICE 'overgeslagen, geen kolom organisatie_id: %', t;
      CONTINUE;
    END IF;

    EXECUTE format(
      'ALTER TABLE public.%I ALTER COLUMN organisatie_id SET DEFAULT public.auth_organisatie_id()', t);
  END LOOP;
END $$;

COMMIT;

-- ============================================================
-- VERIFICATIE — plak de output terug.
--
-- Verwacht: 24 rijen, elk met auth_organisatie_id() als default.
-- Ontbreekt er een, kijk dan naar de NOTICE-regels hierboven.
-- ============================================================

SELECT
  c.table_name                                          AS tabel,
  c.column_default                                      AS default_waarde,
  c.is_nullable                                         AS nullable,
  (c.column_default LIKE '%auth_organisatie_id%')       AS default_staat_goed
FROM information_schema.columns c
WHERE c.table_schema = 'public'
  AND c.column_name = 'organisatie_id'
  AND c.table_name = ANY (ARRAY[
    'app_settings','bedrijfssluitingsdagen','bestelbonnen','calculatie_producten',
    'calculatie_templates','deals','document_styles','documenten',
    'facturen','herinnering_templates','klanten','leveranciers','leveringsbonnen',
    'medewerkers','montage_afspraken','offertes','project_portalen',
    'projecten','taken','tijdregistraties','uitgaven','verlof','voorraad_artikelen',
    'werkbonnen'])
ORDER BY default_staat_goed, tabel;
