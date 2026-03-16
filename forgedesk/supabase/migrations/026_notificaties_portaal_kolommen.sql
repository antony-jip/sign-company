-- ============================================================
-- 026: Notificaties — portaal kolommen toevoegen
-- De notificaties tabel miste project_id, klant_id, offerte_id
-- en actie_genomen waardoor portaal-reactie inserts faalden.
-- ============================================================

ALTER TABLE notificaties ADD COLUMN IF NOT EXISTS project_id UUID;
ALTER TABLE notificaties ADD COLUMN IF NOT EXISTS klant_id UUID;
ALTER TABLE notificaties ADD COLUMN IF NOT EXISTS offerte_id UUID;
ALTER TABLE notificaties ADD COLUMN IF NOT EXISTS actie_genomen BOOLEAN DEFAULT false;

-- Index voor snel filteren op ongelezen + actie
CREATE INDEX IF NOT EXISTS idx_notificaties_user_gelezen ON notificaties(user_id, gelezen);
