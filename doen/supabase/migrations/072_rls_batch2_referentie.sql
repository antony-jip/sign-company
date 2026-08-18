-- ============================================================
-- Migration 072: RLS Batch 2 — referentie-tabellen naar org-level
--
-- Deze tabellen zijn bedrijfsspecifiek (Scenario B), niet globaal.
--   - btw_codes     (RLS was user_id → nu organisatie_id)
--   - kortingen     (RLS was user_id → nu organisatie_id)
--   - grootboek     (RLS was user_id → nu organisatie_id)
--   - kostenplaatsen (RLS was USING (true) → nu organisatie_id)
--
-- Bevestigd: organisatie_id kolom bestaat op alle 4 tabellen.
-- btw_codes/kortingen/grootboek zijn leeg — geen backfill nodig.
-- kostenplaatsen heeft 2 rijen, organisatie_id al gevuld.
-- ============================================================

-- ── btw_codes ────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users see own data" ON btw_codes;
DROP POLICY IF EXISTS "Users can view own btw_codes" ON btw_codes;
DROP POLICY IF EXISTS "Users can insert own btw_codes" ON btw_codes;
DROP POLICY IF EXISTS "Users can update own btw_codes" ON btw_codes;
DROP POLICY IF EXISTS "Users can delete own btw_codes" ON btw_codes;

CREATE POLICY "btw_codes_org_members" ON btw_codes
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

-- ── kortingen ────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users see own data" ON kortingen;
DROP POLICY IF EXISTS "Users can view own kortingen" ON kortingen;
DROP POLICY IF EXISTS "Users can insert own kortingen" ON kortingen;
DROP POLICY IF EXISTS "Users can update own kortingen" ON kortingen;
DROP POLICY IF EXISTS "Users can delete own kortingen" ON kortingen;

CREATE POLICY "kortingen_org_members" ON kortingen
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

-- ── grootboek ────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users see own data" ON grootboek;
DROP POLICY IF EXISTS "Users can view own grootboek" ON grootboek;
DROP POLICY IF EXISTS "Users can insert own grootboek" ON grootboek;
DROP POLICY IF EXISTS "Users can update own grootboek" ON grootboek;
DROP POLICY IF EXISTS "Users can delete own grootboek" ON grootboek;

CREATE POLICY "grootboek_org_members" ON grootboek
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

-- ── kostenplaatsen ──────────────────────────────────────────
DROP POLICY IF EXISTS "Users can view kostenplaatsen" ON kostenplaatsen;
DROP POLICY IF EXISTS "Users can insert kostenplaatsen" ON kostenplaatsen;
DROP POLICY IF EXISTS "Users can update kostenplaatsen" ON kostenplaatsen;
DROP POLICY IF EXISTS "Users can delete kostenplaatsen" ON kostenplaatsen;

CREATE POLICY "kostenplaatsen_org_members" ON kostenplaatsen
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
