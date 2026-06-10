-- 130: Outbox-gedrag voor ingeplande_berichten
-- Mislukte verzendingen (SMTP/netwerk) komen terug in de wachtrij met een
-- oplopende backoff i.p.v. direct 'mislukt'. Direct-verzenden dat faalt wordt
-- door de frontend als outbox-rij ge-enqueued (bron='outbox'), zodat één
-- pijplijn (cron-verzend-geplande-berichten) alle aflevering doet.
--
-- RLS: tabel is bewust user_id-scoped (persoonlijke mailbox, zelfde
-- uitzondering als emails/user_email_settings — zie CLAUDE.md §2).

ALTER TABLE ingeplande_berichten
  ADD COLUMN IF NOT EXISTS retry_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bron TEXT NOT NULL DEFAULT 'ingepland';

-- Snelle cron-scan op wachtende rijen die "due" zijn.
CREATE INDEX IF NOT EXISTS idx_ingeplande_berichten_due
  ON ingeplande_berichten (scheduled_at)
  WHERE status = 'wachtend';
