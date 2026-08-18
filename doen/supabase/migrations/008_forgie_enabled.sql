-- ============================================================
-- Migration 008: Add forgie_enabled column to app_settings
-- ============================================================

ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS forgie_enabled boolean DEFAULT true;
