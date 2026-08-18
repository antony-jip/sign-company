-- 046: Maak documenten storage bucket aan + policies voor project bestanden
-- DRAAI DIT IN DE SUPABASE SQL EDITOR

-- Bucket aanmaken (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('documenten', 'documenten', false)
ON CONFLICT (id) DO NOTHING;

-- Authenticated users kunnen uploaden in projects/ subfolder
DROP POLICY IF EXISTS "Upload project documenten" ON storage.objects;
CREATE POLICY "Upload project documenten" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'documenten'
    AND (storage.foldername(name))[1] = 'projects'
    AND auth.role() = 'authenticated'
  );

-- Authenticated users kunnen project documenten lezen (voor signed URLs)
DROP POLICY IF EXISTS "Read project documenten" ON storage.objects;
CREATE POLICY "Read project documenten" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'documenten'
    AND (storage.foldername(name))[1] = 'projects'
    AND auth.role() = 'authenticated'
  );

-- Authenticated users kunnen project documenten verwijderen
DROP POLICY IF EXISTS "Delete project documenten" ON storage.objects;
CREATE POLICY "Delete project documenten" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'documenten'
    AND (storage.foldername(name))[1] = 'projects'
    AND auth.role() = 'authenticated'
  );
