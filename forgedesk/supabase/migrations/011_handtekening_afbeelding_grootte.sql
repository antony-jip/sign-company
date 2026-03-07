-- ============================================================
-- Migration 011: Afbeelding grootte voor email handtekening
-- + Storage bucket publiek maken voor handtekening-afbeeldingen
-- ============================================================

-- Nieuwe kolom voor de afbeelding grootte instelling
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS handtekening_afbeelding_grootte integer DEFAULT 64;

-- Maak de documenten bucket publiek zodat handtekening-afbeeldingen
-- zichtbaar zijn in uitgaande e-mails (anders verlopen signed URLs)
UPDATE storage.buckets SET public = true WHERE id = 'documenten';

-- Publieke leestoegang voor handtekening-afbeeldingen
CREATE POLICY "Public read handtekeningen" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'documenten'
    AND (storage.foldername(name))[2] = 'handtekeningen'
  );
