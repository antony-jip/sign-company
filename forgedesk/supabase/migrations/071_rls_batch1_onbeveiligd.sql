-- ============================================================
-- Migration 071: RLS Batch 1 — 4 onbeveiligde tabellen
--
-- Tabellen die tot nu toe GEEN RLS hadden:
--   - email_opvolgingen  (org-owned)
--   - klant_historie     (org-owned)
--   - import_logs        (org-owned)
--   - app_notificaties   (user-owned, geen org_id)
--
-- Service-role bypasst RLS (backend API routes werken door).
-- ============================================================

-- ── email_opvolgingen ────────────────────────────────────────
ALTER TABLE email_opvolgingen ENABLE ROW LEVEL SECURITY;

CREATE POLICY "email_opvolgingen_org_members" ON email_opvolgingen
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

-- ── klant_historie ──────────────────────────────────────────
ALTER TABLE klant_historie ENABLE ROW LEVEL SECURITY;

CREATE POLICY "klant_historie_org_members" ON klant_historie
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

-- ── import_logs ─────────────────────────────────────────────
ALTER TABLE import_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "import_logs_org_members" ON import_logs
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

-- ── app_notificaties ────────────────────────────────────────
ALTER TABLE app_notificaties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "app_notificaties_own_user" ON app_notificaties
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
