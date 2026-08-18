-- Koppel email-threads aan projecten zodat de project-cockpit de mail-
-- communicatie van het hele team toont. Eén thread = één project per
-- organisatie (gebruiker-keuze; multi-project per thread is uitzondering).
-- Email zelf blijft user-scoped (user_email_settings), maar de KOPPELING
-- is organisatie-zichtbaar zodat collega's elkaars klant-communicatie zien.
-- Past bij doen.'s radicale transparantie binnen de organisatie.

CREATE TABLE IF NOT EXISTS email_project_koppelingen (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisatie_id UUID NOT NULL REFERENCES organisaties(id) ON DELETE CASCADE,
  thread_id TEXT NOT NULL,
  project_id UUID NOT NULL REFERENCES projecten(id) ON DELETE CASCADE,
  gekoppeld_door UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  gekoppeld_op TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT email_project_thread_uniek UNIQUE (organisatie_id, thread_id)
);

-- Lookup: welke thread hangt aan welk project?
CREATE INDEX IF NOT EXISTS idx_email_project_thread
  ON email_project_koppelingen (thread_id, organisatie_id);

-- Lookup: welke threads heeft project X?
CREATE INDEX IF NOT EXISTS idx_email_project_project
  ON email_project_koppelingen (project_id);

ALTER TABLE email_project_koppelingen ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org leden zien email-project koppelingen" ON email_project_koppelingen;
CREATE POLICY "Org leden zien email-project koppelingen"
  ON email_project_koppelingen FOR SELECT
  USING (organisatie_id IN (SELECT organisatie_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Org leden maken email-project koppelingen" ON email_project_koppelingen;
CREATE POLICY "Org leden maken email-project koppelingen"
  ON email_project_koppelingen FOR INSERT
  WITH CHECK (organisatie_id IN (SELECT organisatie_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Org leden updaten email-project koppelingen" ON email_project_koppelingen;
CREATE POLICY "Org leden updaten email-project koppelingen"
  ON email_project_koppelingen FOR UPDATE
  USING (organisatie_id IN (SELECT organisatie_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Org leden verwijderen email-project koppelingen" ON email_project_koppelingen;
CREATE POLICY "Org leden verwijderen email-project koppelingen"
  ON email_project_koppelingen FOR DELETE
  USING (organisatie_id IN (SELECT organisatie_id FROM profiles WHERE id = auth.uid()));
