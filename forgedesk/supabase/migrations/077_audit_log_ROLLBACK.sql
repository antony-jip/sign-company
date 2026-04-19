-- ROLLBACK van 077_audit_log.sql

DROP POLICY IF EXISTS "audit_log_select_admin_own_org" ON audit_log;
DROP INDEX IF EXISTS idx_audit_log_action;
DROP INDEX IF EXISTS idx_audit_log_actor_user_id;
DROP INDEX IF EXISTS idx_audit_log_organisatie_created_at;
DROP TABLE IF EXISTS audit_log;
