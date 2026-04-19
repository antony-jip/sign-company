-- 066: Fix inkoopfacturen storage RLS — organisatie-isolatie
-- Huidige policies checken alleen 'authenticated', niet welke org.
-- Path structuur: {organisatie_id}/{uuid}.pdf
-- foldername(name)[1] = organisatie_id

-- Drop oude policies
DROP POLICY IF EXISTS "Org members upload inkoopfactuur PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Org members read inkoopfactuur PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Org members delete inkoopfactuur PDFs" ON storage.objects;

-- Nieuwe policies met org_id check via folder path
CREATE POLICY "inkoopfacturen_select_org" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'inkoopfacturen'
    AND (storage.foldername(name))[1] IN (
      SELECT organisatie_id::text FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "inkoopfacturen_insert_org" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'inkoopfacturen'
    AND (storage.foldername(name))[1] IN (
      SELECT organisatie_id::text FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "inkoopfacturen_delete_org" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'inkoopfacturen'
    AND (storage.foldername(name))[1] IN (
      SELECT organisatie_id::text FROM profiles WHERE id = auth.uid()
    )
  );
