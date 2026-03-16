-- Email cache: voeg ontbrekende kolommen toe voor IMAP caching
-- Bestaande tabel gebruikt Nederlandse kolomnamen, we voegen cache-kolommen toe

-- IMAP UID voor snelle lookup
ALTER TABLE emails ADD COLUMN IF NOT EXISTS uid INTEGER;

-- Message-ID header (uniek per mail)
ALTER TABLE emails ADD COLUMN IF NOT EXISTS message_id TEXT;

-- Gestructureerde afzender/ontvanger data
ALTER TABLE emails ADD COLUMN IF NOT EXISTS from_name TEXT;
ALTER TABLE emails ADD COLUMN IF NOT EXISTS from_address TEXT;
ALTER TABLE emails ADD COLUMN IF NOT EXISTS to_addresses JSONB;
ALTER TABLE emails ADD COLUMN IF NOT EXISTS cc_addresses JSONB;

-- Body cache (bestaande 'inhoud' kolom wordt body_html, body_text apart)
ALTER TABLE emails ADD COLUMN IF NOT EXISTS body_html TEXT;
ALTER TABLE emails ADD COLUMN IF NOT EXISTS body_text TEXT;

-- Bijlage metadata (JSON, geen binaire data)
ALTER TABLE emails ADD COLUMN IF NOT EXISTS attachment_meta JSONB;

-- Cache timestamp
ALTER TABLE emails ADD COLUMN IF NOT EXISTS cached_at TIMESTAMPTZ DEFAULT now();

-- Folder (bestaande 'map' kolom is al aanwezig, maar we voegen imap folder toe)
ALTER TABLE emails ADD COLUMN IF NOT EXISTS imap_folder TEXT DEFAULT 'INBOX';

-- Unique constraint op user_id + message_id om duplicaten te voorkomen
-- Alleen als message_id niet null is
CREATE UNIQUE INDEX IF NOT EXISTS emails_user_message_id_unique
  ON emails (user_id, message_id) WHERE message_id IS NOT NULL;

-- Index voor snelle UID lookup per user
CREATE INDEX IF NOT EXISTS emails_user_uid_idx ON emails (user_id, uid);

-- Index voor datum sortering
CREATE INDEX IF NOT EXISTS emails_user_datum_idx ON emails (user_id, datum DESC);
