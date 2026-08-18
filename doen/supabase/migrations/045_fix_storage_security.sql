-- ============================================================
-- 045: Fix storage bucket security policies
--
-- Problemen:
-- 1. project-fotos bucket: DELETE policy te breed (elke authenticated user)
-- 2. documenten bucket portaal subfolder: publiek leesbaar zonder token check
-- 3. briefpapier bucket: geen ownership check op DELETE
--
-- portaal-bestanden bucket BLIJFT publiek — klanten moeten bestanden
-- kunnen bekijken via hun portaal token zonder login.
-- ============================================================

-- ── 1. Project-fotos: fix oude brede DELETE policy ──
-- De 028 migratie had: auth.uid() IS NOT NULL (te breed)
-- De 035 migratie voegde ownership check toe maar dropt niet de oude policy
DROP POLICY IF EXISTS "Users delete own project fotos" ON storage.objects;

-- Ownership-based delete (als 035 policy al bestaat, skip)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Users can delete own project-fotos'
    AND tablename = 'objects' AND schemaname = 'storage'
  ) THEN
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
  END IF;
END $$;

-- ── 2. Documenten bucket: restrictievere portaal read ──
-- Oude policy: iedereen kan portaal subfolder lezen
-- Nieuwe policy: alleen als het portaal actief is (via token lookup)
DROP POLICY IF EXISTS "Public read portaal bestanden" ON storage.objects;

CREATE POLICY "Read portaal bestanden via actief portaal" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'documenten'
    AND (storage.foldername(name))[2] = 'portaal'
    AND (
      -- Eigenaar mag altijd
      auth.uid() IS NOT NULL
      OR
      -- Publiek: alleen als er een actief portaal bestaat voor deze user folder
      EXISTS (
        SELECT 1 FROM project_portalen pp
        WHERE pp.user_id::text = (storage.foldername(name))[1]
          AND pp.actief = true
      )
    )
  );

-- ── 3. Briefpapier bucket: ownership check op alle operaties ──
-- Briefpapier is per user, nooit publiek
DO $$ BEGIN
  -- Drop oude brede policies als ze bestaan
  DROP POLICY IF EXISTS "Users upload briefpapier" ON storage.objects;
  DROP POLICY IF EXISTS "Users read briefpapier" ON storage.objects;
  DROP POLICY IF EXISTS "Users delete briefpapier" ON storage.objects;
END $$;

-- Alleen eigen briefpapier folder
CREATE POLICY "Users manage own briefpapier" ON storage.objects
  FOR ALL USING (
    bucket_id = 'briefpapier'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ── 4. Offerte-bijlagen: ownership check ──
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users upload offerte-bijlagen" ON storage.objects;
  DROP POLICY IF EXISTS "Users read offerte-bijlagen" ON storage.objects;
END $$;

CREATE POLICY "Users manage own offerte-bijlagen" ON storage.objects
  FOR ALL USING (
    bucket_id = 'documenten'
    AND (storage.foldername(name))[2] = 'offerte-bijlagen'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
