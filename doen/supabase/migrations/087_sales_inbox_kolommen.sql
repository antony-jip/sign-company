-- 087: Sales Inbox v1 — kolommen voor "wacht op reactie" / "beantwoord"
-- UX-laag op bestaande emails-tabel. Geen nieuwe RLS-policies nodig:
-- bestaande user-scoped policies (auth.uid() = user_id) beschermen alle
-- nieuwe kolommen automatisch.

ALTER TABLE emails ADD COLUMN IF NOT EXISTS wacht_op_reactie BOOLEAN DEFAULT FALSE;
ALTER TABLE emails ADD COLUMN IF NOT EXISTS beantwoord BOOLEAN DEFAULT FALSE;
ALTER TABLE emails ADD COLUMN IF NOT EXISTS beantwoord_door_email_id UUID NULL REFERENCES emails(id) ON DELETE SET NULL;
ALTER TABLE emails ADD COLUMN IF NOT EXISTS vervangen_door_email_id UUID NULL REFERENCES emails(id) ON DELETE SET NULL;
ALTER TABLE emails ADD COLUMN IF NOT EXISTS wacht_op_reactie_uitgezet_op TIMESTAMPTZ NULL;
ALTER TABLE emails ADD COLUMN IF NOT EXISTS niet_match_email_ids UUID[] DEFAULT '{}';

-- Partial index voor de hot path: Sales Inbox "Wacht op reactie" tab + auto-match query
CREATE INDEX IF NOT EXISTS idx_emails_wacht_open
  ON emails(user_id, datum DESC)
  WHERE wacht_op_reactie = TRUE AND beantwoord = FALSE;

-- Partial index voor Sales Inbox "Beantwoord" tab
CREATE INDEX IF NOT EXISTS idx_emails_wacht_beantwoord
  ON emails(user_id, datum DESC)
  WHERE wacht_op_reactie = TRUE AND beantwoord = TRUE;

NOTIFY pgrst, 'reload schema';
