-- Persistent cache voor IMAP-attachment-binaries.
-- Voorkomt herhaalde IMAP-roundtrips bij elke open / preview / download
-- van dezelfde mail. 30-dagen TTL via dagelijkse cleanup-cron.
-- RLS op user_id consistent met de emails-tabel (mailboxen zijn
-- persoonlijk, niet org-gedeeld).

CREATE TABLE IF NOT EXISTS email_attachment_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email_uuid UUID NOT NULL REFERENCES emails(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  content_type TEXT NOT NULL,
  size INTEGER NOT NULL,
  storage_path TEXT NOT NULL,
  cached_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Lookup index: per email + filename voor cache-hit checks
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_attachment_cache_lookup
  ON email_attachment_cache (email_uuid, filename);

-- Cleanup-cron scant op cached_at
CREATE INDEX IF NOT EXISTS idx_email_attachment_cache_cached_at
  ON email_attachment_cache (cached_at);

-- RLS: alleen owner mag lezen en schrijven
ALTER TABLE email_attachment_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users select own attachment cache" ON email_attachment_cache;
CREATE POLICY "Users select own attachment cache" ON email_attachment_cache
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own attachment cache" ON email_attachment_cache;
CREATE POLICY "Users insert own attachment cache" ON email_attachment_cache
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own attachment cache" ON email_attachment_cache;
CREATE POLICY "Users update own attachment cache" ON email_attachment_cache
  FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own attachment cache" ON email_attachment_cache;
CREATE POLICY "Users delete own attachment cache" ON email_attachment_cache
  FOR DELETE
  USING (auth.uid() = user_id);

-- Storage bucket: private (geen public access)
INSERT INTO storage.buckets (id, name, public)
VALUES ('email-attachments', 'email-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies op storage.objects voor de bucket.
-- Path-structuur: {user_id}/{email_uuid}/{filename}
-- auth.uid() check tegen het eerste path-segment.

DROP POLICY IF EXISTS "Users select own email attachments" ON storage.objects;
CREATE POLICY "Users select own email attachments" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'email-attachments'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users insert own email attachments" ON storage.objects;
CREATE POLICY "Users insert own email attachments" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'email-attachments'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users update own email attachments" ON storage.objects;
CREATE POLICY "Users update own email attachments" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'email-attachments'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users delete own email attachments" ON storage.objects;
CREATE POLICY "Users delete own email attachments" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'email-attachments'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
