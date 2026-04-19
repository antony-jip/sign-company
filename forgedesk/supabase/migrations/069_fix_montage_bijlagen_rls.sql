-- 069: Montage-bijlagen write RLS — organisatie-level isolatie
-- Path structuur: montage-bijlagen/{organisatie_id}/{uuid}.{ext}
-- foldername(name)[1] = 'montage-bijlagen', foldername(name)[2] = organisatie_id
-- SELECT blijft publiek (jsPDF werkbon PDF laadt afbeeldingen via public URL)

-- Drop oude policies
DROP POLICY IF EXISTS "Users can upload montage-bijlagen" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete montage-bijlagen" ON storage.objects;

-- Nieuwe policies met org check
CREATE POLICY "montage_bijlagen_insert_org" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'documenten'
    AND (storage.foldername(name))[1] = 'montage-bijlagen'
    AND (storage.foldername(name))[2] IN (
      SELECT organisatie_id::text FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "montage_bijlagen_delete_org" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'documenten'
    AND (storage.foldername(name))[1] = 'montage-bijlagen'
    AND (storage.foldername(name))[2] IN (
      SELECT organisatie_id::text FROM profiles WHERE id = auth.uid()
    )
  );
