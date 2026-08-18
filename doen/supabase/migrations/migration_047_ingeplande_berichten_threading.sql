-- Voeg threading-kolommen en bcc toe aan ingeplande_berichten
-- zodat scheduled replies correct threaden bij de ontvanger.
ALTER TABLE ingeplande_berichten
  ADD COLUMN IF NOT EXISTS bcc TEXT,
  ADD COLUMN IF NOT EXISTS in_reply_to TEXT,
  ADD COLUMN IF NOT EXISTS thread_id TEXT;
