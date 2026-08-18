-- ROLLBACK van 073_rls_batch3_bucket_onduidelijk.sql
-- Herstelt de oorspronkelijke user_id policies.
-- Voor offerte_items wordt de 057 parent-join policy hersteld.

-- ── contactpersonen ──────────────────────────────────────────
DROP POLICY IF EXISTS "contactpersonen_org_members" ON contactpersonen;

CREATE POLICY "Users see own contactpersonen" ON contactpersonen
  FOR ALL USING (user_id = auth.uid());

-- ── offerte_items ────────────────────────────────────────────
DROP POLICY IF EXISTS "offerte_items_org_members" ON offerte_items;

CREATE POLICY "Org members manage offerte_items" ON offerte_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM offertes
      WHERE offertes.id = offerte_items.offerte_id
        AND offertes.organisatie_id = auth_organisatie_id()
    )
  );

-- ── offerte_templates ───────────────────────────────────────
DROP POLICY IF EXISTS "offerte_templates_org_members" ON offerte_templates;

CREATE POLICY "Users can view own offerte_templates" ON offerte_templates
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own offerte_templates" ON offerte_templates
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own offerte_templates" ON offerte_templates
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own offerte_templates" ON offerte_templates
  FOR DELETE USING (auth.uid() = user_id);
