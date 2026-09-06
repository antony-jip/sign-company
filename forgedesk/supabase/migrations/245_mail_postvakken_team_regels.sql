-- Mail-ombouw, stap 2 van het datamodel (golf 3: fase 4).
-- Zie docs/mail-ombouw/CONTRACT.md en LOGBOEK.md.
--
-- 1. Meerdere postvakken per gebruiker: emails en email_sync_state krijgen
--    account_id (verwijzing naar user_email_settings.id). De oude unieke
--    sleutels op user_id BLIJVEN staan: zolang iedereen één postvak heeft zijn
--    (user_id, message_id) en (account_id, message_id) gelijk. Migratie 246
--    haalt ze weg op het moment dat het eerste tweede postvak gekoppeld wordt.
-- 2. Gedeeld postvak (team-inbox): user_email_settings.soort 'gedeeld' met
--    organisatie_id; leden lezen en bewerken de mail van dat postvak. Toewijzen
--    en interne notities per gesprek.
-- 3. Regels: automatisch archiveren, labelen, verplaatsen of koppelen.
-- 4. Eigen labels met kleur.
-- 5. Outbox-status 'verzenden' en email_id op ingeplande_berichten.
-- 6. IDLE-werker: tijdstip van het laatste IDLE-event per postvak.
--
-- Veilig om vóór of na de deploy van branch mail-outlook te draaien.

BEGIN;

-- 1. Postvakken
ALTER TABLE user_email_settings ADD COLUMN IF NOT EXISTS naam TEXT;
ALTER TABLE user_email_settings ADD COLUMN IF NOT EXISTS is_standaard BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE user_email_settings ADD COLUMN IF NOT EXISTS handtekening_html TEXT;
ALTER TABLE user_email_settings ADD COLUMN IF NOT EXISTS soort TEXT NOT NULL DEFAULT 'persoonlijk';
ALTER TABLE user_email_settings ADD COLUMN IF NOT EXISTS organisatie_id UUID REFERENCES organisaties(id);
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_email_settings_soort_check') THEN
    ALTER TABLE user_email_settings ADD CONSTRAINT user_email_settings_soort_check CHECK (soort IN ('persoonlijk', 'gedeeld'));
  END IF;
END $$;
UPDATE user_email_settings s SET organisatie_id = p.organisatie_id
FROM profiles p WHERE p.id = s.user_id AND s.organisatie_id IS NULL;

ALTER TABLE emails ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES user_email_settings(id) ON DELETE SET NULL;
UPDATE emails e SET account_id = s.id
FROM user_email_settings s WHERE s.user_id = e.user_id AND e.account_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_emails_account_datum ON emails (account_id, datum DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_emails_account_message ON emails (account_id, message_id)
  WHERE account_id IS NOT NULL AND message_id IS NOT NULL;

ALTER TABLE email_sync_state ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES user_email_settings(id) ON DELETE CASCADE;
UPDATE email_sync_state st SET account_id = s.id
FROM user_email_settings s WHERE s.user_id = st.user_id AND st.account_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_email_sync_state_account_folder ON email_sync_state (account_id, folder)
  WHERE account_id IS NOT NULL;
ALTER TABLE email_sync_state ADD COLUMN IF NOT EXISTS idle_laatst_op TIMESTAMPTZ;

ALTER TABLE mailsync_taken ADD COLUMN IF NOT EXISTS account_id UUID;

-- 2. Gedeeld postvak: leden van de organisatie lezen en bewerken de mail van
--    een postvak met soort 'gedeeld'. Persoonlijke postvakken blijven user-only.
DROP POLICY IF EXISTS "Team leest gedeeld postvak" ON emails;
CREATE POLICY "Team leest gedeeld postvak" ON emails
  FOR SELECT TO authenticated
  USING (
    account_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM user_email_settings s
      WHERE s.id = emails.account_id AND s.soort = 'gedeeld'
        AND s.organisatie_id = auth_organisatie_id()
    )
  );
DROP POLICY IF EXISTS "Team wijzigt gedeeld postvak" ON emails;
CREATE POLICY "Team wijzigt gedeeld postvak" ON emails
  FOR UPDATE TO authenticated
  USING (
    account_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM user_email_settings s
      WHERE s.id = emails.account_id AND s.soort = 'gedeeld'
        AND s.organisatie_id = auth_organisatie_id()
    )
  )
  WITH CHECK (
    account_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM user_email_settings s
      WHERE s.id = emails.account_id AND s.soort = 'gedeeld'
        AND s.organisatie_id = auth_organisatie_id()
    )
  );
DROP POLICY IF EXISTS "Team leest bodies gedeeld postvak" ON email_bodies;
CREATE POLICY "Team leest bodies gedeeld postvak" ON email_bodies
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM emails e JOIN user_email_settings s ON s.id = e.account_id
      WHERE e.id = email_bodies.email_id AND s.soort = 'gedeeld'
        AND s.organisatie_id = auth_organisatie_id()
    )
  );
-- Leden zien welke gedeelde postvakken er zijn (niet de wachtwoorden: SELECT op
-- de tabel is sinds 160 ingetrokken; dit gaat via de api-laag met deze policy
-- als documentatie van de bedoeling).
ALTER TABLE emails ADD COLUMN IF NOT EXISTS toegewezen_op TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_emails_toegewezen ON emails (toegewezen_aan) WHERE toegewezen_aan IS NOT NULL;

CREATE TABLE IF NOT EXISTS email_notities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisatie_id UUID NOT NULL REFERENCES organisaties(id),
  user_id UUID NOT NULL,
  email_id UUID REFERENCES emails(id) ON DELETE CASCADE,
  thread_id TEXT,
  tekst TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (email_id IS NOT NULL OR thread_id IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_email_notities_thread ON email_notities (organisatie_id, thread_id);
CREATE INDEX IF NOT EXISTS idx_email_notities_email ON email_notities (email_id);
ALTER TABLE email_notities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Org leest notities" ON email_notities;
CREATE POLICY "Org leest notities" ON email_notities
  FOR SELECT TO authenticated USING (organisatie_id = auth_organisatie_id());
DROP POLICY IF EXISTS "Org schrijft notities" ON email_notities;
CREATE POLICY "Org schrijft notities" ON email_notities
  FOR INSERT TO authenticated WITH CHECK (organisatie_id = auth_organisatie_id() AND user_id = auth.uid());
DROP POLICY IF EXISTS "Eigenaar verwijdert notitie" ON email_notities;
CREATE POLICY "Eigenaar verwijdert notitie" ON email_notities
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- 3. Regels
CREATE TABLE IF NOT EXISTS email_regels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisatie_id UUID NOT NULL REFERENCES organisaties(id),
  user_id UUID NOT NULL,
  account_id UUID REFERENCES user_email_settings(id) ON DELETE CASCADE,
  naam TEXT NOT NULL,
  volgorde INTEGER NOT NULL DEFAULT 0,
  actief BOOLEAN NOT NULL DEFAULT true,
  voorwaarden JSONB NOT NULL DEFAULT '{}'::jsonb,
  acties JSONB NOT NULL DEFAULT '{}'::jsonb,
  laatst_toegepast_op TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_email_regels_user ON email_regels (user_id, volgorde);
ALTER TABLE email_regels ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Eigenaar beheert regels" ON email_regels;
CREATE POLICY "Eigenaar beheert regels" ON email_regels
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid() AND organisatie_id = auth_organisatie_id());

-- 4. Eigen labels
CREATE TABLE IF NOT EXISTS email_labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisatie_id UUID NOT NULL REFERENCES organisaties(id),
  user_id UUID NOT NULL,
  naam TEXT NOT NULL,
  kleur TEXT NOT NULL DEFAULT '#1A535C',
  volgorde INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, naam)
);
ALTER TABLE email_labels ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Eigenaar beheert labels" ON email_labels;
CREATE POLICY "Eigenaar beheert labels" ON email_labels
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid() AND organisatie_id = auth_organisatie_id());
CREATE INDEX IF NOT EXISTS idx_emails_labels ON emails USING GIN (labels) WHERE labels IS NOT NULL;

-- 5. Outbox
ALTER TABLE ingeplande_berichten DROP CONSTRAINT IF EXISTS ingeplande_berichten_status_check;
ALTER TABLE ingeplande_berichten
  ADD CONSTRAINT ingeplande_berichten_status_check
  CHECK (status IN ('wachtend', 'verwerken', 'verzenden', 'verzonden', 'geannuleerd', 'mislukt'));
ALTER TABLE ingeplande_berichten ADD COLUMN IF NOT EXISTS email_id UUID REFERENCES emails(id) ON DELETE SET NULL;
ALTER TABLE ingeplande_berichten ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES user_email_settings(id) ON DELETE SET NULL;

COMMIT;

NOTIFY pgrst, 'reload schema';

INSERT INTO doen_migraties (bestand) VALUES ('245_mail_postvakken_team_regels.sql') ON CONFLICT DO NOTHING;
