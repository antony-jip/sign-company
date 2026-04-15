-- ============================================================
-- 059: visualizer_credits + credit_transacties op organisatie-niveau
--
-- Doel: alle members van een organisatie putten uit één gedeelde
-- credit-pool, ipv per gebruiker een eigen saldo.
--
-- DRAAI DIT HANDMATIG in de Supabase SQL Editor.
-- Veilig om meerdere keren uit te voeren (idempotent).
-- ============================================================

-- ── STAP 1: Backfill organisatie_id vanuit profiles ──
-- (kolom bestaat al via een eerdere migratie)

UPDATE visualizer_credits vc
SET organisatie_id = p.organisatie_id
FROM profiles p
WHERE p.id = vc.user_id
  AND vc.organisatie_id IS NULL;

UPDATE credit_transacties ct
SET organisatie_id = p.organisatie_id
FROM profiles p
WHERE p.id = ct.user_id
  AND ct.organisatie_id IS NULL;

-- ── STAP 2: UNIQUE constraint verplaatsen van user_id naar organisatie_id ──
-- LET OP: dit faalt als er meerdere rijen per org bestaan. Verifieer eerst met:
--   SELECT organisatie_id, COUNT(*) FROM visualizer_credits
--   WHERE organisatie_id IS NOT NULL GROUP BY organisatie_id HAVING COUNT(*) > 1;

ALTER TABLE visualizer_credits DROP CONSTRAINT IF EXISTS visualizer_credits_user_id_key;
ALTER TABLE visualizer_credits
  DROP CONSTRAINT IF EXISTS visualizer_credits_organisatie_id_key;
ALTER TABLE visualizer_credits
  ADD CONSTRAINT visualizer_credits_organisatie_id_key UNIQUE (organisatie_id);

-- ── STAP 3: Indexen ──

CREATE INDEX IF NOT EXISTS idx_visualizer_credits_org ON visualizer_credits(organisatie_id);
CREATE INDEX IF NOT EXISTS idx_credit_transacties_org ON credit_transacties(organisatie_id);

-- ── STAP 4: Oude (per-user) RLS policies droppen ──

DROP POLICY IF EXISTS "Users can view own credits" ON visualizer_credits;
DROP POLICY IF EXISTS "Users can insert own credits" ON visualizer_credits;
DROP POLICY IF EXISTS "Users can update own credits" ON visualizer_credits;
DROP POLICY IF EXISTS "Users can view own transactions" ON credit_transacties;
DROP POLICY IF EXISTS "Users can insert own transactions" ON credit_transacties;

-- ── STAP 5: Nieuwe (per-organisatie) RLS policies ──
-- Alle members van een org zien en wijzigen de gedeelde credit-pool.

CREATE POLICY "Org members view credits" ON visualizer_credits
  FOR SELECT
  USING (organisatie_id IN (SELECT organisatie_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Org members update credits" ON visualizer_credits
  FOR UPDATE
  USING (organisatie_id IN (SELECT organisatie_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Org members insert credits" ON visualizer_credits
  FOR INSERT
  WITH CHECK (organisatie_id IN (SELECT organisatie_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Org members view transactions" ON credit_transacties
  FOR SELECT
  USING (organisatie_id IN (SELECT organisatie_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Org members insert transactions" ON credit_transacties
  FOR INSERT
  WITH CHECK (organisatie_id IN (SELECT organisatie_id FROM profiles WHERE id = auth.uid()));

-- ── VERIFICATIE ──
-- SELECT organisatie_id, saldo, totaal_gekocht, totaal_gebruikt FROM visualizer_credits;
-- SELECT type, aantal, organisatie_id FROM credit_transacties ORDER BY created_at DESC LIMIT 10;
