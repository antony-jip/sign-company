BEGIN;

-- ============================================================
-- 203: zichtbaarheid van `emails` herstellen. SPOEDFIX.
--
-- Wat er misging.
--   Migratie 195 dropte de legacy-policy "Users see own data" op `emails`
--   (`FOR ALL USING (user_id = auth.uid())`). De guard in 195 dropte alleen
--   als de tabel daarna nog een permissieve policy met `organisatie_id`
--   overhield. Op `emails` was dat "Team-leden zien mails via
--   project-koppeling" — maar die policy is een SMALLE uitzondering: hij geeft
--   alleen SELECT, en alleen als `thread_id` aan een project gekoppeld is via
--   `email_project_koppelingen`.
--
--   De guard controleerde dus BESTAAN van een org-policy, niet DEKKING. Gevolg
--   op productie: van 13.982 inbox-rijen was alleen nog projectmail zichtbaar.
--   En omdat de gedropte policy `FOR ALL` was, verdwenen ook UPDATE en DELETE:
--   gelezen markeren, sterren, snoozen en weggooien faalden stil.
--
--   De sync bleef intact (die draait als service_role en omzeilt RLS), dus mail
--   kwam wél binnen en was alleen onzichtbaar. Dat maakte het lastig te zien.
--
-- Wat dit doet.
--   Zet de toegang terug zoals hij vóór 195 was: de eigenaar van een mailrij
--   mag hem lezen, wijzigen en verwijderen. Bewust NIET org-breed gemaakt:
--   `emails` hangt aan een persoonlijke mailbox (zelfde uitzondering als
--   `user_email_settings`, zie CLAUDE.md §2), en tijdens een storing hoor je
--   herstellen wat er was, niet iets anders bouwen. Org-breed delen is een
--   productbesluit en hoort in een eigen migratie met een eigen afweging.
--
--   Vier losse policies in plaats van één `FOR ALL`, zodat elke opdracht een
--   eigen `WITH CHECK` heeft. `FOR ALL` zonder `WITH CHECK` gebruikt de
--   `USING` als schrijfcheck, en dat is precies het soort verborgen gedrag dat
--   deze hele ronde heeft opgeruimd.
--
--   De bestaande project-policy blijft staan: die geeft teamleden inzage in
--   projectmail van een collega en dat is gewenst. Permissieve policies ORen,
--   dus de twee vullen elkaar aan.
--
-- DRAAI DIT ZO SNEL MOGELIJK. Veilig om opnieuw te draaien.
-- ============================================================

DROP POLICY IF EXISTS "Eigenaar leest eigen emails" ON emails;
CREATE POLICY "Eigenaar leest eigen emails" ON emails
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Eigenaar wijzigt eigen emails" ON emails;
CREATE POLICY "Eigenaar wijzigt eigen emails" ON emails
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Eigenaar verwijdert eigen emails" ON emails;
CREATE POLICY "Eigenaar verwijdert eigen emails" ON emails
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- De bestaande INSERT-policy "Users can insert own emails" heeft geen zichtbare
-- USING (dat hoort bij INSERT), maar het is niet af te lezen of zijn WITH CHECK
-- de gebruiker aan zijn eigen user_id bindt. Deze policy zet dat expliciet vast.
-- Twee INSERT-policies ORen, dus dit verruimt niets: het garandeert alleen dat
-- er in elk geval één pad is dat correct afbakent.
DROP POLICY IF EXISTS "Eigenaar voegt eigen emails toe" ON emails;
CREATE POLICY "Eigenaar voegt eigen emails toe" ON emails
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

COMMIT;

-- ============================================================
-- VERIFICATIE — plak de output terug.
--
-- Verwacht: de vier nieuwe policies plus de twee bestaande. In de kolom
-- `dekt_alles` hoort bij "Eigenaar leest eigen emails" true te staan.
-- ============================================================

SELECT
  policyname,
  cmd,
  roles::text                                        AS voor_rollen,
  (qual LIKE '%user_id = auth.uid()%')               AS dekt_alles,
  qual                                              AS voorwaarde
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'emails'
ORDER BY cmd, policyname;

-- ============================================================
-- TWEEDE CONTROLE, en dit is de belangrijkere van de twee.
--
-- 195 raakte 23 tabellen met dezelfde te naïeve guard. Deze query zoekt élke
-- tabel met RLS aan die GEEN algemene SELECT-policy meer heeft: een policy
-- waarvan de voorwaarde de rij aan de gebruiker of aan zijn organisatie bindt
-- zonder een extra koppeling te eisen. Hoort 0 rijen te geven.
--
-- Komt hier een tabel uit, dan is daar hetzelfde gebeurd als bij `emails` en
-- moet die ook herstellen.
-- ============================================================

SELECT
  c.relname AS tabel,
  count(p.policyname) FILTER (WHERE p.cmd = 'SELECT') AS select_policies,
  string_agg(p.policyname, ' | ') FILTER (WHERE p.cmd = 'SELECT') AS namen
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
LEFT JOIN pg_policies p ON p.schemaname = 'public' AND p.tablename = c.relname
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relrowsecurity
GROUP BY c.relname
HAVING NOT bool_or(
  p.cmd IN ('SELECT', 'ALL')
  AND (
    p.qual LIKE '%user_id = auth.uid()%'
    OR p.qual LIKE '%organisatie_id = auth_organisatie_id()%'
    OR p.qual LIKE '%organisatie_id IN ( SELECT profiles.organisatie_id%'
  )
  AND p.qual NOT LIKE '%EXISTS%'
)
ORDER BY c.relname;

INSERT INTO doen_migraties (bestand)
  VALUES ('203_emails_zichtbaarheid_herstellen.sql')
  ON CONFLICT DO NOTHING;
