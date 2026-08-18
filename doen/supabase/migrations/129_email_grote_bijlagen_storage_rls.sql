-- 129: Storage RLS voor grote mailbijlagen (downloadlink-route)
-- Path structuur: email-bijlagen-groot/{user_id}/{uuid}-{naam}
-- foldername(name)[1] = 'email-bijlagen-groot', foldername(name)[2] = user_id
--
-- Anders dan email-bijlagen/ (068) leven deze bestanden 35 dagen: de mail
-- bevat een signed downloadlink (30 dagen geldig) i.p.v. een SMTP-attachment.
-- SELECT is nodig zodat de uploader zelf de signed URL kan aanmaken;
-- ontvangers downloaden via de signed URL (gaat buiten RLS om).
-- Opruimen gebeurt door de attachment-cleanup-cron via service role.

DROP POLICY IF EXISTS "email_grote_bijlagen_insert_own" ON storage.objects;
DROP POLICY IF EXISTS "email_grote_bijlagen_select_own" ON storage.objects;
DROP POLICY IF EXISTS "email_grote_bijlagen_delete_own" ON storage.objects;

CREATE POLICY "email_grote_bijlagen_insert_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'documenten'
    AND (storage.foldername(name))[1] = 'email-bijlagen-groot'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

CREATE POLICY "email_grote_bijlagen_select_own" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'documenten'
    AND (storage.foldername(name))[1] = 'email-bijlagen-groot'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

CREATE POLICY "email_grote_bijlagen_delete_own" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'documenten'
    AND (storage.foldername(name))[1] = 'email-bijlagen-groot'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );
