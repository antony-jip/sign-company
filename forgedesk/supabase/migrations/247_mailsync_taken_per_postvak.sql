-- Sync-taken per postvak in plaats van per gebruiker.
--
-- `mailsync_taken_open_unique` uit migratie 202 staat maar één open taak per
-- (user_id, folder, soort) toe. Met een tweede postvak betekent dat: postvak 2
-- krijgt nooit een sync-taak, want postvak 1 heeft de enige plek al bezet.
-- De kolom account_id komt uit 245; die wordt nu ook echt gebruikt.
--
-- Draai dit vóór het eerste tweede postvak, en vóór migratie 246.
-- Veilig om opnieuw te draaien.

-- SET LOCAL binnen de transactie, niet SET erbuiten: via een pooler in
-- transaction mode landt een SET erbuiten op een andere verbinding dan de
-- BEGIN erna, en dan draait dit zonder lock_timeout.
BEGIN;
SET LOCAL lock_timeout = '4s';
SET LOCAL statement_timeout = '60s';

ALTER TABLE mailsync_taken ADD COLUMN IF NOT EXISTS account_id UUID;

-- is_standaard komt uit 245. Deze migratie mag ook vóór 245 draaien, dus zet de
-- kolom hier desnoods zelf neer; het statement is hetzelfde en idempotent.
ALTER TABLE user_email_settings ADD COLUMN IF NOT EXISTS is_standaard BOOLEAN NOT NULL DEFAULT true;

-- Bestaande taken horen bij het standaardpostvak van die gebruiker. Zonder de
-- is_standaard-voorwaarde kiest Postgres bij meerdere rijen willekeurig een
-- postvak; 246 doet het om die reden ook zo.
UPDATE mailsync_taken t
   SET account_id = s.id
  FROM user_email_settings s
 WHERE s.user_id = t.user_id
   AND s.is_standaard
   AND t.account_id IS NULL;

-- COALESCE zodat een taak zonder account_id (oude code, of een gebruiker zonder
-- postvakrij) nog steeds op user_id ontdubbelt in plaats van door de index te
-- glippen: NULL is in een unieke index namelijk distinct.
DROP INDEX IF EXISTS mailsync_taken_open_unique;
CREATE UNIQUE INDEX IF NOT EXISTS mailsync_taken_open_unique
  ON mailsync_taken (user_id, COALESCE(account_id, user_id), folder, soort)
  WHERE status IN ('wachtend', 'verwerken');

CREATE INDEX IF NOT EXISTS idx_mailsync_taken_account ON mailsync_taken (account_id);

COMMIT;

NOTIFY pgrst, 'reload schema';

INSERT INTO doen_migraties (bestand) VALUES ('247_mailsync_taken_per_postvak.sql') ON CONFLICT DO NOTHING;
