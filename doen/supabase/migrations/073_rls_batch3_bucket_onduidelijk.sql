-- ============================================================
-- Migration 073: RLS Batch 3 — bucket-onduidelijke tabellen
--
-- Tabellen met user_id policies die naar org-level moeten:
--   - contactpersonen   (2933 rijen, org_id gevuld)
--   - offerte_items     (19 rijen, eigen org_id kolom — direct check,
--                        niet via parent join)
--   - offerte_templates (1 rij, org_id gevuld)
--
-- calendar_events is dode tabel (frontend gebruikt `events`),
-- bewust overgeslagen.
-- ============================================================

-- ── contactpersonen ──────────────────────────────────────────
DROP POLICY IF EXISTS "Users see own data" ON contactpersonen;
DROP POLICY IF EXISTS "Users see own contactpersonen" ON contactpersonen;

CREATE POLICY "contactpersonen_org_members" ON contactpersonen
  FOR ALL TO authenticated
  USING (
    organisatie_id IN (
      SELECT organisatie_id FROM profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    organisatie_id IN (
      SELECT organisatie_id FROM profiles WHERE id = auth.uid()
    )
  );

-- ── offerte_items ────────────────────────────────────────────
-- Eigen organisatie_id kolom: direct check (sneller dan EXISTS join).
DROP POLICY IF EXISTS "Users see own data" ON offerte_items;
DROP POLICY IF EXISTS "Users can view own offerte_items" ON offerte_items;
DROP POLICY IF EXISTS "Users can insert own offerte_items" ON offerte_items;
DROP POLICY IF EXISTS "Users can update own offerte_items" ON offerte_items;
DROP POLICY IF EXISTS "Users can delete own offerte_items" ON offerte_items;
DROP POLICY IF EXISTS "Org members manage offerte_items" ON offerte_items;

CREATE POLICY "offerte_items_org_members" ON offerte_items
  FOR ALL TO authenticated
  USING (
    organisatie_id IN (
      SELECT organisatie_id FROM profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    organisatie_id IN (
      SELECT organisatie_id FROM profiles WHERE id = auth.uid()
    )
  );

-- ── offerte_templates ───────────────────────────────────────
DROP POLICY IF EXISTS "Users see own data" ON offerte_templates;
DROP POLICY IF EXISTS "Users can view own offerte_templates" ON offerte_templates;
DROP POLICY IF EXISTS "Users can insert own offerte_templates" ON offerte_templates;
DROP POLICY IF EXISTS "Users can update own offerte_templates" ON offerte_templates;
DROP POLICY IF EXISTS "Users can delete own offerte_templates" ON offerte_templates;

CREATE POLICY "offerte_templates_org_members" ON offerte_templates
  FOR ALL TO authenticated
  USING (
    organisatie_id IN (
      SELECT organisatie_id FROM profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    organisatie_id IN (
      SELECT organisatie_id FROM profiles WHERE id = auth.uid()
    )
  );
