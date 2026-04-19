-- ROLLBACK van 074_rls_batch4_ai_tabellen.sql

DROP POLICY IF EXISTS "ai_imported_data_own_user" ON ai_imported_data;
ALTER TABLE ai_imported_data DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_chat_history_own_user" ON ai_chat_history;
ALTER TABLE ai_chat_history DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_usage_own_user" ON ai_usage;
ALTER TABLE ai_usage DISABLE ROW LEVEL SECURITY;
