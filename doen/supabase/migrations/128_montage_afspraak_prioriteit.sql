-- ============================================================
-- Migration 128: montage_afspraken — prioriteit
-- Voer dit uit in Supabase SQL Editor.
--
-- Vlag om een montage-afspraak als prioriteit te markeren (flame), zodat
-- monteurs zien dat dit belangrijk is en niet zomaar verschoven moet worden.
-- ============================================================

ALTER TABLE montage_afspraken ADD COLUMN IF NOT EXISTS prioriteit BOOLEAN NOT NULL DEFAULT false;
