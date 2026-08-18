-- ============================================================
-- Migration 074: RLS Batch 4 — AI tabellen (user-level)
--
-- Tabellen die tot nu toe GEEN RLS hadden:
--   - ai_imported_data  (4824 rijen, user_id NOT NULL)
--   - ai_chat_history   (18 rijen, user_id NOT NULL)
--   - ai_usage          (5 rijen, user_id NOT NULL)
--
-- AI data is persoonlijk per user, niet per organisatie.
-- Backend schrijft via service_role (bypasst RLS).
-- Frontend leest ai_usage met filter op user_id — werkt onder
-- de nieuwe policy.
--
-- rate_limits tabel bestaat niet in productie; overgeslagen.
-- ============================================================

-- ── ai_imported_data ────────────────────────────────────────
ALTER TABLE ai_imported_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_imported_data_own_user" ON ai_imported_data
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ── ai_chat_history ─────────────────────────────────────────
ALTER TABLE ai_chat_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_chat_history_own_user" ON ai_chat_history
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ── ai_usage ────────────────────────────────────────────────
ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_usage_own_user" ON ai_usage
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
