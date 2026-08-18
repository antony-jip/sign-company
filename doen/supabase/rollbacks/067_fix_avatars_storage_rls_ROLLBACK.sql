-- ROLLBACK 067: Verwijder avatars storage policies
-- NIET AUTOMATISCH UITVOEREN — alleen bij problemen na migratie 067

DROP POLICY IF EXISTS "avatars_insert_own" ON storage.objects;
DROP POLICY IF EXISTS "avatars_update_own" ON storage.objects;
DROP POLICY IF EXISTS "avatars_delete_own" ON storage.objects;
