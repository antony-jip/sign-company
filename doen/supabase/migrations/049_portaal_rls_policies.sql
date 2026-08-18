-- ============================================================
-- 049: RLS policies voor portaal tabellen
-- Zorgt dat de eigenaar klantreacties en bestanden kan lezen
-- ============================================================

-- Enable RLS (idempotent — geen effect als al ingeschakeld)
ALTER TABLE project_portalen ENABLE ROW LEVEL SECURITY;
ALTER TABLE portaal_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE portaal_bestanden ENABLE ROW LEVEL SECURITY;
ALTER TABLE portaal_reacties ENABLE ROW LEVEL SECURITY;

-- ── project_portalen ─────────────────────────────────────────
DROP POLICY IF EXISTS "users_own_portalen" ON project_portalen;
CREATE POLICY "users_own_portalen" ON project_portalen
  FOR ALL USING (user_id = auth.uid());

-- ── portaal_items ────────────────────────────────────────────
DROP POLICY IF EXISTS "users_own_portaal_items" ON portaal_items;
CREATE POLICY "users_own_portaal_items" ON portaal_items
  FOR ALL USING (user_id = auth.uid());

-- ── portaal_bestanden (geen user_id → join via portaal_items) ─
DROP POLICY IF EXISTS "users_own_portaal_bestanden" ON portaal_bestanden;
CREATE POLICY "users_own_portaal_bestanden" ON portaal_bestanden
  FOR ALL USING (
    portaal_item_id IN (SELECT id FROM portaal_items WHERE user_id = auth.uid())
  );

-- ── portaal_reacties (geen user_id → join via portaal_items) ──
DROP POLICY IF EXISTS "users_own_portaal_reacties" ON portaal_reacties;
CREATE POLICY "users_own_portaal_reacties" ON portaal_reacties
  FOR ALL USING (
    portaal_item_id IN (SELECT id FROM portaal_items WHERE user_id = auth.uid())
  );
