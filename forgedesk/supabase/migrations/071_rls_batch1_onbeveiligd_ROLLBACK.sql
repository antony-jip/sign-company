-- ROLLBACK van 071_rls_batch1_onbeveiligd.sql

DROP POLICY IF EXISTS "email_opvolgingen_org_members" ON email_opvolgingen;
ALTER TABLE email_opvolgingen DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "klant_historie_org_members" ON klant_historie;
ALTER TABLE klant_historie DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "import_logs_org_members" ON import_logs;
ALTER TABLE import_logs DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "app_notificaties_own_user" ON app_notificaties;
ALTER TABLE app_notificaties DISABLE ROW LEVEL SECURITY;
