-- 062: Email threading — ontbrekende kolommen + indexes voor
-- conversatie-historie en thread-koppeling.

ALTER TABLE emails ADD COLUMN IF NOT EXISTS in_reply_to TEXT;
ALTER TABLE emails ADD COLUMN IF NOT EXISTS "references" TEXT;

-- Indexes voor snelle thread lookups
CREATE INDEX IF NOT EXISTS idx_emails_thread_id ON emails(thread_id);
CREATE INDEX IF NOT EXISTS idx_emails_message_id ON emails(message_id);
CREATE INDEX IF NOT EXISTS idx_emails_in_reply_to ON emails(in_reply_to);

-- Herlaad PostgREST schema cache
NOTIFY pgrst, 'reload schema';
