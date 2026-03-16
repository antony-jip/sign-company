-- Add UNIQUE constraint on user_id for upsert support
-- First remove any duplicates (keep newest)
DELETE FROM user_email_settings a
  USING user_email_settings b
  WHERE a.user_id = b.user_id
    AND a.updated_at < b.updated_at;

ALTER TABLE user_email_settings
  ADD CONSTRAINT user_email_settings_user_id_key UNIQUE (user_id);
