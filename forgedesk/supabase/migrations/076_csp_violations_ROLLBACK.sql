-- ROLLBACK van 076_csp_violations.sql

DROP INDEX IF EXISTS idx_csp_violations_directive;
DROP INDEX IF EXISTS idx_csp_violations_created_at;
DROP TABLE IF EXISTS csp_violations;
