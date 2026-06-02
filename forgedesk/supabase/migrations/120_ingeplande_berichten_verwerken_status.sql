-- Migration: add 'verwerken' status to ingeplande_berichten so the cron can
-- atomically claim a message (wachtend -> verwerken) before sending. This
-- prevents double-send when cron runs overlap or when the post-send status
-- update fails (the row is no longer 'wachtend', so it is not re-picked).

ALTER TABLE ingeplande_berichten DROP CONSTRAINT IF EXISTS ingeplande_berichten_status_check;
ALTER TABLE ingeplande_berichten ADD CONSTRAINT ingeplande_berichten_status_check
  CHECK (status IN ('wachtend', 'verwerken', 'verzonden', 'geannuleerd', 'mislukt'));
