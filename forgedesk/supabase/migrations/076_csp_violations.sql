-- ============================================================
-- Migration 076: csp_violations tabel
--
-- Opslagplaats voor Content-Security-Policy violation reports.
-- Browsers sturen deze automatisch naar de report-uri wanneer een
-- resource door de CSP wordt geblokkeerd. Tijdens Report-Only
-- rollout gebruiken we deze logs om te zien wat we per ongeluk
-- zouden blokkeren, vóór we CSP enforcing maken.
--
-- Schrijf- en leesrechten uitsluitend voor service_role; de
-- /api/csp-report endpoint gebruikt de service key om te inserten
-- en een admin-UI (later) mag lezen. Geen policy voor authenticated
-- users — violations kunnen IP-hashes en paginainformatie bevatten
-- die we niet willen lekken naar andere tenants.
-- ============================================================

CREATE TABLE IF NOT EXISTS csp_violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  document_uri TEXT,
  blocked_uri TEXT,
  violated_directive TEXT,
  effective_directive TEXT,
  source_file TEXT,
  line_number INTEGER,
  column_number INTEGER,
  disposition TEXT,
  user_agent TEXT,
  ip_hash TEXT
);

CREATE INDEX IF NOT EXISTS idx_csp_violations_created_at
  ON csp_violations(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_csp_violations_directive
  ON csp_violations(violated_directive);

ALTER TABLE csp_violations ENABLE ROW LEVEL SECURITY;

-- Geen policies voor authenticated of anon; service_role omzeilt RLS
-- en is de enige rol die deze tabel moet kunnen benaderen.
