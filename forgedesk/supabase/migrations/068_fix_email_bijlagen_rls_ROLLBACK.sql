-- ROLLBACK 068: Verwijder email-bijlagen storage policies
-- NIET AUTOMATISCH UITVOEREN — alleen bij problemen na migratie 068

DROP POLICY IF EXISTS "email_bijlagen_insert_own" ON storage.objects;
DROP POLICY IF EXISTS "email_bijlagen_delete_own" ON storage.objects;
