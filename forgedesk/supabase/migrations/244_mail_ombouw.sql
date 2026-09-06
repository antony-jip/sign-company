-- Mail-ombouw naar Outlook-niveau (6 sep 2026), stap 1 van het datamodel.
-- Zie docs/mail-ombouw/CONTRACT.md sectie 2.
--
-- 1. email_bodies: de html van een mail uit de emails-tabel halen. Rijen van
--    meerdere MB maakten elke brede lezer en elke realtime-UPDATE duur.
-- 2. emails.concept: concepten als rijen, zodat ze op elk apparaat staan.
-- 3. email_koppelingen: mail aan klant, project, offerte, factuur, aanvraag,
--    taak of lead, org-breed zichtbaar. email_project_koppelingen (108/109)
--    blijft bestaan als bron van de team-leesrechten.
-- 4. email_sync_state: gezondheid per mailbox, leesbaar voor de gebruiker.
-- 5. email_threads_view: threading van de server, de client groepeert niet meer.
-- 6. user_email_settings: OAuth-kolommen voor Google en Microsoft (golf 3).
--
-- Deze migratie is licht: alleen structuur, geen data. Het overzetten van de
-- bestaande mailteksten gebeurt daarna met 244b, in blokken.

-- Wacht nooit lang op een slot. De mailsync raakt `emails` elke minuut, en een
-- ALTER TABLE die op zijn beurt wacht, blokkeert ondertussen élke lezer van die
-- tabel: de hele mailmodule staat dan stil. Liever meteen falen en het opnieuw
-- proberen dan minuten wachten.
SET lock_timeout = '4s';
SET statement_timeout = '120s';

BEGIN;

-- 1. Bodies apart
CREATE TABLE IF NOT EXISTS email_bodies (
  email_id UUID PRIMARY KEY REFERENCES emails(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  body_html TEXT,
  body_text TEXT,
  quoted_html TEXT,
  bijgewerkt_op TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_email_bodies_user ON email_bodies (user_id);
ALTER TABLE email_bodies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Eigenaar leest eigen bodies" ON email_bodies;
CREATE POLICY "Eigenaar leest eigen bodies" ON email_bodies
  FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Team leest bodies via projectkoppeling" ON email_bodies;
CREATE POLICY "Team leest bodies via projectkoppeling" ON email_bodies
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM emails e
      JOIN email_project_koppelingen epk ON epk.thread_id = e.thread_id
      WHERE e.id = email_bodies.email_id
        AND e.thread_id IS NOT NULL
        AND epk.organisatie_id = auth_organisatie_id()
    )
  );
DROP POLICY IF EXISTS "Eigenaar schrijft eigen bodies" ON email_bodies;
CREATE POLICY "Eigenaar schrijft eigen bodies" ON email_bodies
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Eigenaar wijzigt eigen bodies" ON email_bodies;
CREATE POLICY "Eigenaar wijzigt eigen bodies" ON email_bodies
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Eigenaar verwijdert eigen bodies" ON email_bodies;
CREATE POLICY "Eigenaar verwijdert eigen bodies" ON email_bodies
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- De kopie van de bestaande teksten staat NIET in deze migratie. Bij 24.000
-- mails is dat honderden MB in één transactie en loopt de SQL-editor in een
-- time-out. Draai daarvoor 244b_mail_bodies_kopieren.sql, zo vaak tot hij 0
-- meldt. Tot die tijd leest de app gewoon uit emails.body_html; de terugval
-- daarop zit in src/services/emailService.ts.

-- 2. Concepten als rijen
ALTER TABLE emails ADD COLUMN IF NOT EXISTS concept JSONB;
CREATE INDEX IF NOT EXISTS idx_emails_concepten ON emails (user_id, datum DESC) WHERE map = 'concepten';

-- 3. Koppelingen
CREATE TABLE IF NOT EXISTS email_koppelingen (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisatie_id UUID NOT NULL REFERENCES organisaties(id),
  user_id UUID NOT NULL,
  email_id UUID REFERENCES emails(id) ON DELETE CASCADE,
  thread_id TEXT,
  soort TEXT NOT NULL CHECK (soort IN ('klant', 'project', 'offerte', 'factuur', 'aanvraag', 'taak', 'lead')),
  doel_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (email_id IS NOT NULL OR thread_id IS NOT NULL)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_email_koppelingen_thread
  ON email_koppelingen (organisatie_id, thread_id, soort, doel_id) WHERE thread_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_email_koppelingen_email
  ON email_koppelingen (organisatie_id, email_id, soort, doel_id) WHERE email_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_email_koppelingen_doel ON email_koppelingen (organisatie_id, soort, doel_id);
CREATE INDEX IF NOT EXISTS idx_email_koppelingen_thread ON email_koppelingen (thread_id);
ALTER TABLE email_koppelingen ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Org leest koppelingen" ON email_koppelingen;
CREATE POLICY "Org leest koppelingen" ON email_koppelingen
  FOR SELECT TO authenticated USING (organisatie_id = auth_organisatie_id());
DROP POLICY IF EXISTS "Org maakt koppelingen" ON email_koppelingen;
CREATE POLICY "Org maakt koppelingen" ON email_koppelingen
  FOR INSERT TO authenticated WITH CHECK (organisatie_id = auth_organisatie_id() AND user_id = auth.uid());
DROP POLICY IF EXISTS "Org verwijdert koppelingen" ON email_koppelingen;
CREATE POLICY "Org verwijdert koppelingen" ON email_koppelingen
  FOR DELETE TO authenticated USING (organisatie_id = auth_organisatie_id());

-- 4. Gezondheid per mailbox
--
-- email_sync_state komt uit migratie 131, maar die is in deze database nooit
-- gedraaid (gecontroleerd op 6 sep 2026: de tabel bestond niet). De map loopt
-- vaker uit de pas met de database, zie CLAUDE.md sectie 3. Daarom eerst
-- aanmaken als hij ontbreekt, met dezelfde vorm als 131.
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
CREATE POLICY "email_sync_state_select_own" ON email_sync_state
  FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "email_sync_state_insert_own" ON email_sync_state;
CREATE POLICY "email_sync_state_insert_own" ON email_sync_state
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "email_sync_state_update_own" ON email_sync_state;
CREATE POLICY "email_sync_state_update_own" ON email_sync_state
  FOR UPDATE TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "email_sync_state_delete_own" ON email_sync_state;
CREATE POLICY "email_sync_state_delete_own" ON email_sync_state
  FOR DELETE TO authenticated USING (user_id = auth.uid());

ALTER TABLE email_sync_state ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'ok';
ALTER TABLE email_sync_state ADD COLUMN IF NOT EXISTS laatste_fout TEXT;
ALTER TABLE email_sync_state ADD COLUMN IF NOT EXISTS laatste_fout_op TIMESTAMPTZ;
ALTER TABLE email_sync_state ADD COLUMN IF NOT EXISTS laatste_succes_op TIMESTAMPTZ;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'email_sync_state_status_check') THEN
    ALTER TABLE email_sync_state ADD CONSTRAINT email_sync_state_status_check CHECK (status IN ('ok', 'fout', 'uitgezet'));
  END IF;
END $$;

-- 5. Threads van de server
CREATE INDEX IF NOT EXISTS idx_emails_user_thread_datum ON emails (user_id, thread_id, datum DESC) WHERE thread_id IS NOT NULL;
CREATE OR REPLACE VIEW email_threads_view
WITH (security_invoker = on) AS
SELECT
  user_id,
  thread_id,
  MAX(datum) AS laatste_datum,
  COUNT(*)::int AS aantal,
  COUNT(*) FILTER (WHERE NOT COALESCE(gelezen, false))::int AS ongelezen,
  (ARRAY_AGG(id ORDER BY datum DESC))[1] AS laatste_email_id,
  ARRAY_REMOVE(ARRAY_AGG(DISTINCT van), NULL) AS deelnemers
FROM emails
WHERE thread_id IS NOT NULL AND map NOT IN ('prullenbak', 'concepten')
GROUP BY user_id, thread_id;
GRANT SELECT ON email_threads_view TO authenticated;

-- Snooze-wekker
CREATE INDEX IF NOT EXISTS idx_emails_snoozed ON emails (user_id, snoozed_until) WHERE snoozed_until IS NOT NULL;

-- 6. OAuth (golf 3)
ALTER TABLE user_email_settings ADD COLUMN IF NOT EXISTS auth_type TEXT NOT NULL DEFAULT 'wachtwoord';
ALTER TABLE user_email_settings ADD COLUMN IF NOT EXISTS oauth_refresh_token_enc TEXT;
ALTER TABLE user_email_settings ADD COLUMN IF NOT EXISTS oauth_access_token_enc TEXT;
ALTER TABLE user_email_settings ADD COLUMN IF NOT EXISTS oauth_token_verloopt_op TIMESTAMPTZ;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_email_settings_auth_type_check') THEN
    ALTER TABLE user_email_settings ADD CONSTRAINT user_email_settings_auth_type_check CHECK (auth_type IN ('wachtwoord', 'google', 'microsoft'));
  END IF;
END $$;
-- Migratie 160 heeft SELECT op user_email_settings voor authenticated al
-- ingetrokken; de tokens zijn dus, net als het app-wachtwoord, alleen via de
-- api-laag bereikbaar.

COMMIT;

NOTIFY pgrst, 'reload schema';

INSERT INTO doen_migraties (bestand) VALUES ('244_mail_ombouw.sql') ON CONFLICT DO NOTHING;
