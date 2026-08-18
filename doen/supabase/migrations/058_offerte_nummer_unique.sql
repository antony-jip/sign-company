-- ============================================================
-- 058: Offerte nummer bescherming
-- 1. Verwijder offertes zonder nummer (test/autosave rommel)
-- 2. Voorkom lege nummers in de toekomst
-- 3. Unique constraint per organisatie
-- ============================================================

-- Stap 1: Ruim offertes zonder nummer op
DELETE FROM offertes WHERE nummer IS NULL OR TRIM(nummer) = '';

-- Stap 2: Voorkom lege nummers
ALTER TABLE offertes ADD CONSTRAINT offertes_nummer_not_empty CHECK (TRIM(nummer) <> '');

-- Stap 3: Unique nummer per organisatie
CREATE UNIQUE INDEX idx_offertes_nummer_org_unique ON offertes (organisatie_id, nummer);
