-- ============================================================
-- Migration 093: ai_usage_org — org-level AI usage tracking
--
-- Telt AI-calls per (organisatie_id, route, maand) voor de
-- inkoop-routes. Parallel aan bestaande ai_usage (per user_id,
-- voor Daan-chat) — dit is org-cap voor inkoopfactuur-extract
-- en analyze-inkoop-offerte.
--
-- Backend schrijft via service_role (bypasst RLS).
-- Frontend leest met filter op organisatie_id voor banner-state.
--
-- maand-key in UTC (YYYY-MM), consistent met bestaande ai_usage.
-- ============================================================

CREATE TABLE IF NOT EXISTS ai_usage_org (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organisatie_id uuid NOT NULL REFERENCES organisaties(id) ON DELETE CASCADE,
  route text NOT NULL,
  maand text NOT NULL,
  aantal_calls integer NOT NULL DEFAULT 0,
  geschatte_kosten numeric(10,4) NOT NULL DEFAULT 0,
  eerste_cap_hit_op timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ai_usage_org_unique
  ON ai_usage_org(organisatie_id, route, maand);

CREATE INDEX IF NOT EXISTS ai_usage_org_org_maand
  ON ai_usage_org(organisatie_id, maand);

ALTER TABLE ai_usage_org ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_usage_org_select_org_leden"
  ON ai_usage_org
  FOR SELECT TO authenticated
  USING (organisatie_id = auth_organisatie_id());
