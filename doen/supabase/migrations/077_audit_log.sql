-- ============================================================
-- Migration 077: audit_log tabel
--
-- Centrale log voor gevoelige team- en security-events die vanuit
-- de backend API endpoints gelogd worden. Dekt:
--   - team.member_invited / role_changed / deactivated / reactivated
--   - integration.exact_connected
--   - integration.mollie_connected / mollie_disconnected
--
-- Schema bewust flexibel (action TEXT, metadata JSONB) zodat nieuwe
-- event-types erbij kunnen zonder migratie.
--
-- RLS:
--   SELECT: alleen admins binnen dezelfde organisatie
--   INSERT/UPDATE/DELETE: service_role only (immutable voor users)
--
-- Bestaande stubs in src/utils/auditLogger.ts (domain-level) blijven
-- ongemoeid; die loggen nu nog niks maar kunnen later naar deze
-- tabel schrijven met een passende action-naam.
-- ============================================================

CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  organisatie_id UUID,
  actor_user_id UUID,
  actor_email TEXT,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_hash TEXT
);

CREATE INDEX IF NOT EXISTS idx_audit_log_organisatie_created_at
  ON audit_log(organisatie_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_log_actor_user_id
  ON audit_log(actor_user_id);

CREATE INDEX IF NOT EXISTS idx_audit_log_action
  ON audit_log(action);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- SELECT: admins binnen eigen organisatie
CREATE POLICY "audit_log_select_admin_own_org" ON audit_log
  FOR SELECT TO authenticated
  USING (
    organisatie_id IN (
      SELECT organisatie_id FROM profiles
      WHERE id = auth.uid() AND rol = 'admin'
    )
  );

-- Geen INSERT/UPDATE/DELETE policies: audit log is immutable voor
-- app users. Backend endpoints gebruiken service_role die RLS omzeilt.
