-- Probo Prints integratie velden
ALTER TABLE app_settings
  ADD COLUMN IF NOT EXISTS probo_api_key TEXT,
  ADD COLUMN IF NOT EXISTS probo_enabled BOOLEAN DEFAULT false;
