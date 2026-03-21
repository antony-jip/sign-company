-- 040: Storage policies voor montage-bijlagen in de documenten bucket
-- Montage bijlagen worden opgeslagen als: montage-bijlagen/{id}.{ext}
-- DRAAI DIT HANDMATIG in de Supabase SQL Editor

-- Zorg dat documenten bucket bestaat
INSERT INTO storage.buckets (id, name, public)
VALUES ('documenten', 'documenten', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Upload: ingelogde gebruikers mogen montage-bijlagen uploaden
CREATE POLICY "Users can upload montage-bijlagen"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'documenten'
    AND (storage.foldername(name))[1] = 'montage-bijlagen'
    AND auth.role() = 'authenticated'
  );

-- Read: iedereen mag montage-bijlagen lezen (public bucket)
CREATE POLICY "Public read montage-bijlagen"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'documenten'
    AND (storage.foldername(name))[1] = 'montage-bijlagen'
  );

-- Delete: ingelogde gebruikers mogen montage-bijlagen verwijderen
CREATE POLICY "Users can delete montage-bijlagen"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'documenten'
    AND (storage.foldername(name))[1] = 'montage-bijlagen'
    AND auth.role() = 'authenticated'
  );
