-- ============================================================
-- Migration 009: AI tone of voice per gebruiker
-- ============================================================

ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS ai_tone_of_voice text DEFAULT '';
