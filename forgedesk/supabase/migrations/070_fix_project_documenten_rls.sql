-- 070: Project documenten storage RLS — organisatie-level isolatie
--
-- NIEUW path: projects/{organisatie_id}/{project_id}/{uuid}.{ext}
-- OUD path:  projects/{project_id}/{filename}
--
-- Policies ondersteunen BEIDE paden:
-- - Nieuw: foldername[2] = organisatie_id → org check via profiles
-- - Oud:   foldername[2] = project_id → ownership check via projecten tabel
-- INSERT alleen voor nieuwe paden (met org_id).

-- Drop oude policies uit migratie 046
DROP POLICY IF EXISTS "Upload project documenten" ON storage.objects;
DROP POLICY IF EXISTS "Read project documenten" ON storage.objects;
DROP POLICY IF EXISTS "Delete project documenten" ON storage.objects;

-- INSERT: alleen nieuwe paden met org_id
CREATE POLICY "project_documenten_insert_org" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'documenten'
    AND (storage.foldername(name))[1] = 'projects'
    AND (storage.foldername(name))[2] IN (
      SELECT organisatie_id::text FROM profiles WHERE id = auth.uid()
    )
  );

-- SELECT: nieuw pad (org check) OF oud pad (project ownership check)
CREATE POLICY "project_documenten_select_org" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'documenten'
    AND (storage.foldername(name))[1] = 'projects'
    AND (
      -- Nieuw pad: projects/{org_id}/...
      (storage.foldername(name))[2] IN (
        SELECT organisatie_id::text FROM profiles WHERE id = auth.uid()
      )
      OR
      -- Oud pad: projects/{project_id}/... (backward compat)
      EXISTS (
        SELECT 1 FROM projecten
        WHERE projecten.id::text = (storage.foldername(name))[2]
          AND projecten.organisatie_id IN (
            SELECT organisatie_id FROM profiles WHERE id = auth.uid()
          )
      )
    )
  );

-- DELETE: zelfde dual-check als SELECT
CREATE POLICY "project_documenten_delete_org" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'documenten'
    AND (storage.foldername(name))[1] = 'projects'
    AND (
      -- Nieuw pad
      (storage.foldername(name))[2] IN (
        SELECT organisatie_id::text FROM profiles WHERE id = auth.uid()
      )
      OR
      -- Oud pad
      EXISTS (
        SELECT 1 FROM projecten
        WHERE projecten.id::text = (storage.foldername(name))[2]
          AND projecten.organisatie_id IN (
            SELECT organisatie_id FROM profiles WHERE id = auth.uid()
          )
      )
    )
  );
