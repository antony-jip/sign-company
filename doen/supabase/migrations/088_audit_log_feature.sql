-- ============================================================
-- Migration 088: audit_log_feature tabel
--
-- Feature/UX history per record (taak, offerte, factuur, etc.) —
-- gelezen door AuditLogPanel, geschreven door logWijziging() helper
-- vanuit app-code met user-context. Distinct van 077 audit_log
-- (security/integratie events via service_role).
--
-- RLS:
--   SELECT: alle teamleden binnen eigen organisatie
--   INSERT: alle teamleden binnen eigen organisatie (org-check)
--   Geen UPDATE / DELETE policies — append-only
-- ============================================================

CREATE TABLE IF NOT EXISTS audit_log_feature (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  organisatie_id UUID NOT NULL REFERENCES organisaties(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  medewerker_id UUID REFERENCES medewerkers(id) ON DELETE SET NULL,
  medewerker_naam TEXT,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('taak','project','offerte','factuur','klant','werkbon')),
  entity_id UUID NOT NULL,
  actie TEXT NOT NULL CHECK (actie IN ('aangemaakt','gewijzigd','verwijderd','status_gewijzigd','verstuurd','goedgekeurd')),
  veld TEXT,
  oude_waarde TEXT,
  nieuwe_waarde TEXT,
  omschrijving TEXT
);

CREATE INDEX IF NOT EXISTS idx_audit_log_feature_entity
  ON audit_log_feature(entity_type, entity_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_log_feature_organisatie
  ON audit_log_feature(organisatie_id, created_at DESC);

ALTER TABLE audit_log_feature ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_log_feature_select_org" ON audit_log_feature
  FOR SELECT TO authenticated
  USING (
    organisatie_id IN (
      SELECT organisatie_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "audit_log_feature_insert_org" ON audit_log_feature
  FOR INSERT TO authenticated
  WITH CHECK (
    organisatie_id IN (
      SELECT organisatie_id FROM profiles WHERE id = auth.uid()
    )
  );
