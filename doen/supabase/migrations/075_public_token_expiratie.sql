-- ============================================================
-- Migration 075: Publieke token expiratie
--
-- Voegt verloopkolommen toe aan publieke tokens zodat ze niet
-- eeuwig geldig blijven. TTL's:
--   - offertes.publiek_token_verloopt_op     : 6 maanden
--   - facturen.betaal_token_verloopt_op      : 3 maanden
--   - tekening_goedkeuringen.token_verloopt_op : 1 jaar
--
-- project_portalen.verloopt_op bestaat al (migratie 023).
--
-- Bestaande tokens krijgen backfill: NOW() + TTL vanaf vandaag.
-- Daarna enforce de publieke endpoints (410 Gone / status=verlopen).
-- ============================================================

-- ── offertes.publiek_token_verloopt_op ──────────────────────
ALTER TABLE offertes
  ADD COLUMN IF NOT EXISTS publiek_token_verloopt_op TIMESTAMPTZ;

UPDATE offertes
SET publiek_token_verloopt_op = NOW() + INTERVAL '6 months'
WHERE publiek_token IS NOT NULL
  AND publiek_token_verloopt_op IS NULL;

CREATE INDEX IF NOT EXISTS idx_offertes_publiek_token
  ON offertes(publiek_token)
  WHERE publiek_token IS NOT NULL;

-- ── facturen.betaal_token_verloopt_op ───────────────────────
ALTER TABLE facturen
  ADD COLUMN IF NOT EXISTS betaal_token_verloopt_op TIMESTAMPTZ;

UPDATE facturen
SET betaal_token_verloopt_op = NOW() + INTERVAL '3 months'
WHERE betaal_token IS NOT NULL
  AND betaal_token_verloopt_op IS NULL;

-- ── tekening_goedkeuringen ──────────────────────────────────
-- Veilige UNIQUE-check: faalt hard als er al duplicates zijn.
DO $$
DECLARE
  dup_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO dup_count FROM (
    SELECT token FROM tekening_goedkeuringen
    GROUP BY token HAVING COUNT(*) > 1
  ) dups;
  IF dup_count > 0 THEN
    RAISE EXCEPTION 'Duplicate tokens in tekening_goedkeuringen: % groepen. Migratie gestopt.', dup_count;
  END IF;
END $$;

ALTER TABLE tekening_goedkeuringen
  ADD COLUMN IF NOT EXISTS token_verloopt_op TIMESTAMPTZ
    DEFAULT (NOW() + INTERVAL '1 year');

UPDATE tekening_goedkeuringen
SET token_verloopt_op = NOW() + INTERVAL '1 year'
WHERE token_verloopt_op IS NULL;

ALTER TABLE tekening_goedkeuringen
  ADD CONSTRAINT tekening_goedkeuringen_token_unique UNIQUE (token);

CREATE INDEX IF NOT EXISTS idx_tekening_goedkeuringen_token
  ON tekening_goedkeuringen(token);
