-- Werkbon storage RLS — folders werkbon-afbeeldingen/ en werkbon-fotos/
-- in bucket `documenten`.
--
-- DRAAI DIT IN DE SUPABASE SQL EDITOR vóór deploy van de werkbon-fix.
--
-- Achtergrond: bucket `documenten` heeft policies die alleen folder
-- `projects/` toelaten (zie migration_046_documenten_bucket.sql). Werkbon
-- uploads gebruiken paden `werkbon-afbeeldingen/<item_id>/...` en
-- `werkbon-fotos/<werkbon_id>/...`. Zonder onderstaande policies worden
-- die uploads en reads RLS-denied.
--
-- Patroon mirrort migration_046: authenticated users mogen INSERT/SELECT/
-- DELETE binnen deze folders. Per-werkbon-isolatie loopt via tabel-RLS
-- op `werkbon_afbeeldingen` en `werkbon_fotos` (user_id = auth.uid()).

-- ============ INSERT ============
DROP POLICY IF EXISTS "Upload werkbon bestanden" ON storage.objects;
CREATE POLICY "Upload werkbon bestanden" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'documenten'
    AND (storage.foldername(name))[1] IN ('werkbon-afbeeldingen', 'werkbon-fotos')
    AND auth.role() = 'authenticated'
  );

-- ============ SELECT ============
DROP POLICY IF EXISTS "Read werkbon bestanden" ON storage.objects;
CREATE POLICY "Read werkbon bestanden" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'documenten'
    AND (storage.foldername(name))[1] IN ('werkbon-afbeeldingen', 'werkbon-fotos')
    AND auth.role() = 'authenticated'
  );

-- ============ DELETE ============
DROP POLICY IF EXISTS "Delete werkbon bestanden" ON storage.objects;
CREATE POLICY "Delete werkbon bestanden" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'documenten'
    AND (storage.foldername(name))[1] IN ('werkbon-afbeeldingen', 'werkbon-fotos')
    AND auth.role() = 'authenticated'
  );
