-- 068: Email-bijlagen write RLS — user-level isolatie
-- Path structuur: email-bijlagen/{user_id}/{timestamp}-{random}.{ext}
-- foldername(name)[1] = 'email-bijlagen', foldername(name)[2] = user_id
-- Bestanden leven ~30 seconden (upload → send-email → verwijder via service role)

DROP POLICY IF EXISTS "email_bijlagen_insert_own" ON storage.objects;
DROP POLICY IF EXISTS "email_bijlagen_delete_own" ON storage.objects;

CREATE POLICY "email_bijlagen_insert_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'documenten'
    AND (storage.foldername(name))[1] = 'email-bijlagen'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

CREATE POLICY "email_bijlagen_delete_own" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'documenten'
    AND (storage.foldername(name))[1] = 'email-bijlagen'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );
