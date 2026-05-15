-- Idempotency-log voor uitgaande mail vanuit Trigger.dev-tasks.
-- Vóór elke send wordt (organisatie_id, idempotency_key) als nieuwe rij
-- gepoogd in te voegen. ON CONFLICT DO NOTHING geeft de caller een
-- "skip"-signaal terug, zodat dubbele triggers (retries, parallel runs,
-- handmatig getriggerde re-runs) niet leiden tot dubbele mails.
-- TTL-cleanup: zodra pg_cron beschikbaar is, periodieke DELETE op
-- sent_at < now() - interval '90 days'. Tot die tijd handmatig.

CREATE TABLE IF NOT EXISTS email_send_idempotency (
  organisatie_id uuid NOT NULL REFERENCES organisaties(id) ON DELETE CASCADE,
  idempotency_key text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organisatie_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_email_send_idempotency_sent_at
  ON email_send_idempotency (sent_at);

ALTER TABLE email_send_idempotency ENABLE ROW LEVEL SECURITY;

-- service_role (Trigger.dev getSupabaseAdmin) bypasst RLS al volledig,
-- dus de policies hieronder zijn alleen relevant voor auth-users die
-- via de app de log inzien (read-only) of een rij willen opruimen.
-- DROP IF EXISTS vóór CREATE houdt het script idempotent (CLAUDE.md §3).

DROP POLICY IF EXISTS "Org leden zien eigen idempotency" ON email_send_idempotency;
CREATE POLICY "Org leden zien eigen idempotency"
  ON email_send_idempotency FOR SELECT
  USING (organisatie_id IN (SELECT organisatie_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Org leden inserten eigen idempotency" ON email_send_idempotency;
CREATE POLICY "Org leden inserten eigen idempotency"
  ON email_send_idempotency FOR INSERT
  WITH CHECK (organisatie_id IN (SELECT organisatie_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Org leden updaten eigen idempotency" ON email_send_idempotency;
CREATE POLICY "Org leden updaten eigen idempotency"
  ON email_send_idempotency FOR UPDATE
  USING (organisatie_id IN (SELECT organisatie_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Org leden verwijderen eigen idempotency" ON email_send_idempotency;
CREATE POLICY "Org leden verwijderen eigen idempotency"
  ON email_send_idempotency FOR DELETE
  USING (organisatie_id IN (SELECT organisatie_id FROM profiles WHERE id = auth.uid()));
