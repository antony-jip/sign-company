-- ============================================================
-- 027: project_nummer kolom toevoegen + storage policy voor bijlagen
-- Fix: project aanmaken faalt omdat project_nummer niet bestaat
-- Fix: situatiefoto uploads geblokkeerd door ontbrekende storage policy
-- ============================================================

-- Project nummer kolom
ALTER TABLE projecten ADD COLUMN IF NOT EXISTS project_nummer TEXT;

-- Storage policy voor offerte-bijlagen (situatiefoto's)
-- Staat uploads toe in de documenten bucket voor offerte-bijlagen pad
CREATE POLICY "Users upload offerte bijlagen" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'documenten'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users read own documenten" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'documenten'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
