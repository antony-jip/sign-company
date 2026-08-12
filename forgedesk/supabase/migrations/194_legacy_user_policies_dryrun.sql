-- ============================================================
-- 194: DRY-RUN — welke legacy user_id-policies overleven er?
--
-- Dit bestand WIJZIGT NIETS. Het leest alleen pg_policies.
-- Draai het, plak de uitkomst terug, dan pas 195 (die dropt echt).
--
-- Het probleem, met bewijs:
--   001_create_all_tables.sql:91 maakte op klanten:
--     CREATE POLICY "Users see own data" ON klanten
--       FOR ALL USING (user_id = auth.uid());
--   Let op: FOR ALL zonder WITH CHECK. Postgres gebruikt de USING-expressie dan
--   ook als check voor INSERT en UPDATE.
--
--   048_rls_organisatie_policies.sql:27-28 wilde die opruimen:
--     DROP POLICY IF EXISTS "Users manage own klanten" ON klanten;
--     DROP POLICY IF EXISTS "Users CRUD own klanten"  ON klanten;
--   Die twee namen worden in geen van de 217 migraties aangemaakt. De echte
--   namen zijn "Users see own data" (54x in 001), "Users see own <tabel>"
--   (28x in 005) en "Users can view/insert/update/delete own <tabel>"
--   (52x in 001_missing). DROP POLICY IF EXISTS op een niet-bestaande naam
--   slaagt stil, dus de legacy-policy bleef staan. In totaal raken 71 van de
--   219 DROP-statements in de map geen enkele CREATE.
--
--   Postgres OR't permissieve policies. De effectieve regel op die tabellen is
--   dus `organisatie_id = auth_organisatie_id() OR user_id = auth.uid()`.
--
-- Wat dat concreet kost:
--   111_rls_trial_write_lock.sql zet auth_abonnement_actief() alleen in de
--   WITH CHECK van "Org members manage <tabel>". Een overlevende FOR ALL-policy
--   zonder eigen WITH CHECK laat een INSERT of UPDATE met user_id = auth.uid()
--   er langs. De abonnementsvergrendeling werkt daardoor niet.
--
-- Wat het NIET is:
--   Geen cross-org lek. De overlevende clausule is user_id = auth.uid(), dus de
--   extra rijen die iemand kan zien zijn rijen die hij zelf heeft aangemaakt.
--   Dat is ook precies wat rijen met organisatie_id IS NULL nu nog zichtbaar
--   maakt. Vandaar de volgorde: 191 tellen, 192 backfillen, dan pas droppen.
--
-- Veilig om zo vaak te draaien als je wilt.
-- ============================================================

-- ============================================================
-- UITKOMST 1: kandidaten om te droppen.
--
-- Predikaat: op een van de 25 tabellen die 048/078/082/109/111 org-scoped
-- hebben gemaakt, permissief, en een USING-expressie die user_id noemt maar
-- géén organisatie_id. Dat laatste sluit de correcte org-policies uit.
-- ============================================================
SELECT
  tablename                                  AS tabel,
  policyname                                 AS policy,
  cmd,
  permissive,
  roles,
  qual                                       AS using_expressie,
  with_check,
  (with_check IS NULL AND cmd = 'ALL')       AS using_geldt_ook_als_check
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
  AND qual NOT LIKE '%organisatie_id%'
ORDER BY tablename, policyname;

-- ============================================================
-- UITKOMST 2: alle policies op diezelfde 25 tabellen, zodat je ziet wat er
-- BLIJFT staan. Controleer dat elke tabel na 195 minstens één org-policy
-- overhoudt, anders is die tabel na het droppen onbereikbaar.
--
-- Dit is de belangrijkste controle van de twee.
-- ============================================================
SELECT
  tablename AS tabel,
  count(*)  AS policies_totaal,
  count(*) FILTER (
    WHERE qual LIKE '%organisatie_id%' OR with_check LIKE '%organisatie_id%'
  ) AS org_policies,
  count(*) FILTER (
    WHERE qual LIKE '%user_id%' AND qual NOT LIKE '%organisatie_id%'
  ) AS legacy_user_policies
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
GROUP BY tablename
ORDER BY legacy_user_policies DESC, tabel;

-- ============================================================
-- UITKOMST 3: staat de trial-lock er eigenlijk wel?
-- Verwacht: één rij per tabel uit 111, met auth_abonnement_actief() in
-- with_check. Ontbreekt dat, dan is 111 nooit gedraaid en heeft droppen geen
-- zin tot dat gebeurd is.
-- ============================================================
SELECT tablename AS tabel, policyname AS policy, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND with_check LIKE '%auth_abonnement_actief%'
ORDER BY tablename;
