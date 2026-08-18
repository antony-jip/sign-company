-- ROLLBACK van 072_rls_batch2_referentie.sql
-- Herstelt de oorspronkelijke user_id / USING(true) policies.

-- ── btw_codes ────────────────────────────────────────────────
DROP POLICY IF EXISTS "btw_codes_org_members" ON btw_codes;

CREATE POLICY "Users see own data" ON btw_codes
  FOR ALL USING (user_id = auth.uid());

-- ── kortingen ────────────────────────────────────────────────
DROP POLICY IF EXISTS "kortingen_org_members" ON kortingen;

CREATE POLICY "Users see own data" ON kortingen
  FOR ALL USING (user_id = auth.uid());

-- ── grootboek ────────────────────────────────────────────────
DROP POLICY IF EXISTS "grootboek_org_members" ON grootboek;

CREATE POLICY "Users see own data" ON grootboek
  FOR ALL USING (user_id = auth.uid());

-- ── kostenplaatsen ──────────────────────────────────────────
DROP POLICY IF EXISTS "kostenplaatsen_org_members" ON kostenplaatsen;

CREATE POLICY "Users can view kostenplaatsen" ON kostenplaatsen
  FOR SELECT USING (true);

CREATE POLICY "Users can insert kostenplaatsen" ON kostenplaatsen
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update kostenplaatsen" ON kostenplaatsen
  FOR UPDATE USING (true);

CREATE POLICY "Users can delete kostenplaatsen" ON kostenplaatsen
  FOR DELETE USING (true);
