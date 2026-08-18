-- 131: Sync-state per gebruiker per map — basis voor UID-incrementele sync
-- en historie-backfill (Outlook-niveau: door jaren mail kunnen bladeren).
--
-- last_seen_uid groeit omhoog bij elke incrementele sync; backfill_low_uid
-- kruipt omlaag terwijl de backfill oudere mail binnenhaalt. Verandert
-- UIDVALIDITY op de server, dan zijn alle UIDs ongeldig en bootstrapt de
-- sync opnieuw.
--
-- RLS: user_id-scoped — persoonlijke mailbox, zelfde uitzondering als
-- emails/user_email_settings (zie CLAUDE.md §2).

CREATE TABLE IF NOT EXISTS email_sync_state (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  folder TEXT NOT NULL,
  imap_folder TEXT,
  uidvalidity BIGINT,
  last_seen_uid BIGINT NOT NULL DEFAULT 0,
  backfill_low_uid BIGINT,
  backfill_done BOOLEAN NOT NULL DEFAULT FALSE,
  backfill_target TEXT NOT NULL DEFAULT '1jaar'
    CHECK (backfill_target IN ('1jaar', '5jaar', 'alles')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, folder)
);

CREATE INDEX IF NOT EXISTS idx_email_sync_state_user ON email_sync_state(user_id);

ALTER TABLE email_sync_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "email_sync_state_select_own" ON email_sync_state;
DROP POLICY IF EXISTS "email_sync_state_insert_own" ON email_sync_state;
DROP POLICY IF EXISTS "email_sync_state_update_own" ON email_sync_state;
DROP POLICY IF EXISTS "email_sync_state_delete_own" ON email_sync_state;

CREATE POLICY "email_sync_state_select_own" ON email_sync_state
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "email_sync_state_insert_own" ON email_sync_state
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "email_sync_state_update_own" ON email_sync_state
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "email_sync_state_delete_own" ON email_sync_state
  FOR DELETE USING (user_id = auth.uid());

-- Paginatie/backfill bladeren queries op (user_id, map, datum) — keyset-index.
CREATE INDEX IF NOT EXISTS idx_emails_user_map_datum
  ON emails (user_id, map, datum DESC, id DESC);
