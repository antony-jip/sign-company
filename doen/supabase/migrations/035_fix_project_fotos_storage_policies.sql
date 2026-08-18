-- 035: Fix project-fotos storage policies
-- Probleem: upload/update/delete policies waren te breed — elke ingelogde user kon
-- bestanden uploaden/wijzigen/verwijderen in alle project-mappen.
-- Fix: Controleer via de projecten tabel dat de gebruiker eigenaar is van het project.
--
-- DRAAI DIT HANDMATIG in de Supabase SQL Editor

-- Verwijder oude policies
DROP POLICY IF EXISTS "Authenticated users can upload project-fotos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own project-fotos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own project-fotos" ON storage.objects;

-- Upload: alleen als het project van de gebruiker is
CREATE POLICY "Users can upload to own project-fotos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'project-fotos'
    AND auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM projecten
      WHERE projecten.id::text = (storage.foldername(name))[1]
        AND projecten.user_id = auth.uid()
    )
  );

-- Update: alleen als het project van de gebruiker is
CREATE POLICY "Users can update own project-fotos"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'project-fotos'
    AND auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM projecten
      WHERE projecten.id::text = (storage.foldername(name))[1]
        AND projecten.user_id = auth.uid()
    )
  );

-- Delete: alleen als het project van de gebruiker is
CREATE POLICY "Users can delete own project-fotos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'project-fotos'
    AND auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM projecten
      WHERE projecten.id::text = (storage.foldername(name))[1]
        AND projecten.user_id = auth.uid()
    )
  );

-- Read policy blijft open (public bucket, nodig voor portaal/delen)
