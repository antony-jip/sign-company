-- Add IMAP settings columns to user_email_settings
ALTER TABLE user_email_settings ADD COLUMN IF NOT EXISTS imap_host TEXT DEFAULT 'imap.gmail.com';
ALTER TABLE user_email_settings ADD COLUMN IF NOT EXISTS imap_port INTEGER DEFAULT 993;
ALTER TABLE user_email_settings ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;
ALTER TABLE user_email_settings ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMPTZ;
