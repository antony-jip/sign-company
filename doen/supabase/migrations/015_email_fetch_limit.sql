-- Add missing email_fetch_limit column to app_settings
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS email_fetch_limit INTEGER DEFAULT 200;
