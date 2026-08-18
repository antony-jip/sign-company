-- ROLLBACK 070: Herstel originele project documenten policies (uit migratie 046)
-- NIET AUTOMATISCH UITVOEREN — alleen bij problemen na migratie 070

DROP POLICY IF EXISTS "project_documenten_insert_org" ON storage.objects;
DROP POLICY IF EXISTS "project_documenten_select_org" ON storage.objects;
DROP POLICY IF EXISTS "project_documenten_delete_org" ON storage.objects;

-- Restore oude policies (authenticated only, geen org check)
CREATE POLICY "Upload project documenten" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'documenten'
    AND (storage.foldername(name))[1] = 'projects'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Read project documenten" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'documenten'
    AND (storage.foldername(name))[1] = 'projects'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Delete project documenten" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'documenten'
    AND (storage.foldername(name))[1] = 'projects'
    AND auth.role() = 'authenticated'
  );
