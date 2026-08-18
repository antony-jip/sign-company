BEGIN;

-- ============================================================
-- 195: legacy user_id-policies droppen
--
-- VOORWAARDEN, in deze volgorde:
--   1. 191 gedraaid en `rest_totaal` beoordeeld
--   2. 192 gedraaid, restant NULL-rijen bewust geaccepteerd of opgelost
--   3. 194 gedraaid en uitkomst 2 gecontroleerd: elke tabel houdt een org-policy
--   4. PITR aan (zie docs/RESTORE.md)
--
-- Waarom niet op naam maar op predikaat:
--   Er is geen schema_migrations, en de migratiemap loopt aantoonbaar uit de pas
--   met de database (072:62 maakt een policy op `grootboek`, 001:409 maakt
--   `grootboeken`; 047/078 noemen een tabel `events` die niemand aanmaakt).
--   Een lijst met beloofde policynamen droppen is precies de fout die 048:27-28
--   maakte: DROP POLICY IF EXISTS op een naam die niet bestaat slaagt stil.
--   Daarom leest deze migratie pg_policies en dropt wat er echt staat.
--
-- De harde veiligheidsgrens:
--   Een policy wordt alleen gedropt als dezelfde tabel daarna nog minstens één
--   permissieve policy met organisatie_id overhoudt. Zonder policy weigert RLS
--   alles en is de tabel onbereikbaar voor de app. Die controle staat vóór de
--   DROP, per tabel, en slaat de tabel over als hij niet slaagt.
--
-- Alles in één transactie. Klapt er iets, dan gaat de hele run terug.
--
-- DRAAI DIT HANDMATIG in de Supabase SQL Editor.
-- Veilig om opnieuw te draaien (de tweede keer vindt hij niets meer).
-- ============================================================

DROP TABLE IF EXISTS _policy_drop_log;
CREATE TEMP TABLE _policy_drop_log (
  tabel   text,
  policy  text,
  actie   text,
  reden   text
);

DO $$
DECLARE
  r            record;
  n_org        integer;
  tabellen     text[] := ARRAY[
    'klanten','projecten','taken','offertes','facturen','werkbonnen',
    'montage_afspraken','deals','uitgaven','documenten','medewerkers',
    'tijdregistraties','verlof','leveranciers','bestelbonnen','leveringsbonnen',
    'voorraad_artikelen','project_portalen','document_styles',
    'herinnering_templates','calculatie_producten','calculatie_templates',
    'factuur_items','tekening_goedkeuringen','emails'
  ];
BEGIN
  FOR r IN
    SELECT tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = ANY (tabellen)
      AND permissive = 'PERMISSIVE'
      AND qual IS NOT NULL
      AND qual LIKE '%user_id%'
      AND qual NOT LIKE '%organisatie_id%'
    ORDER BY tablename, policyname
  LOOP
    -- Blijft er een org-policy over op deze tabel? Zo niet: niet droppen.
    SELECT count(*) INTO n_org
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = r.tablename
      AND permissive = 'PERMISSIVE'
      AND (qual LIKE '%organisatie_id%' OR with_check LIKE '%organisatie_id%');

    IF n_org = 0 THEN
      INSERT INTO _policy_drop_log
        VALUES (r.tablename, r.policyname, 'OVERGESLAGEN',
                'geen org-policy op deze tabel; droppen zou hem onbereikbaar maken');
      CONTINUE;
    END IF;

    EXECUTE format('DROP POLICY %I ON public.%I', r.policyname, r.tablename);
    INSERT INTO _policy_drop_log
      VALUES (r.tablename, r.policyname, 'GEDROPT',
              format('org-policies die blijven: %s', n_org));
  END LOOP;
END $$;

COMMIT;

-- ============================================================
-- VERIFICATIE — plak alle drie terug.
-- ============================================================

-- 1. Wat is er gedropt, en wat is bewust overgeslagen?
--    Elke regel met OVERGESLAGEN vraagt aandacht: die tabel heeft geen
--    org-policy en is dus nog user-gescopet. Niet zelf droppen zonder eerst
--    een org-policy toe te voegen.
SELECT * FROM _policy_drop_log ORDER BY actie, tabel;

-- 2. Is er nog een legacy-policy over op de 25 tabellen? Verwacht: 0.
SELECT count(*) AS legacy_policies_over
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'klanten','projecten','taken','offertes','facturen','werkbonnen',
    'montage_afspraken','deals','uitgaven','documenten','medewerkers',
    'tijdregistraties','verlof','leveranciers','bestelbonnen','leveringsbonnen',
    'voorraad_artikelen','project_portalen','document_styles',
    'herinnering_templates','calculatie_producten','calculatie_templates',
    'factuur_items','tekening_goedkeuringen','emails'
  )
  AND permissive = 'PERMISSIVE'
  AND qual IS NOT NULL
  AND qual LIKE '%user_id%'
  AND qual NOT LIKE '%organisatie_id%';

-- 3. Heeft elke tabel nog minstens één policy? Verwacht: geen enkele rij.
--    Een rij hier betekent een tabel die de app niet meer kan lezen.
SELECT c.relname AS tabel_zonder_policy
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relrowsecurity = true
  AND c.relname IN (
    'klanten','projecten','taken','offertes','facturen','werkbonnen',
    'montage_afspraken','deals','uitgaven','documenten','medewerkers',
    'tijdregistraties','verlof','leveranciers','bestelbonnen','leveringsbonnen',
    'voorraad_artikelen','project_portalen','document_styles',
    'herinnering_templates','calculatie_producten','calculatie_templates',
    'factuur_items','tekening_goedkeuringen','emails'
  )
  AND NOT EXISTS (
    SELECT 1 FROM pg_policies p
    WHERE p.schemaname = 'public' AND p.tablename = c.relname
  );
