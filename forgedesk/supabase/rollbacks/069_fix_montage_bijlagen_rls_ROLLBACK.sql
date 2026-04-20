-- ROLLBACK 069: Herstel originele montage-bijlagen policies
-- NIET AUTOMATISCH UITVOEREN — alleen bij problemen na migratie 069

DROP POLICY IF EXISTS "montage_bijlagen_insert_org" ON storage.objects;
DROP POLICY IF EXISTS "montage_bijlagen_delete_org" ON storage.objects;

-- Restore oude policies (geen org check)
CREATE POLICY "Users can upload montage-bijlagen"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'documenten'
    AND (storage.foldername(name))[1] = 'montage-bijlagen'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Users can delete montage-bijlagen"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'documenten'
    AND (storage.foldername(name))[1] = 'montage-bijlagen'
    AND auth.role() = 'authenticated'
  );
