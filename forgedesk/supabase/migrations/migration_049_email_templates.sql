-- Email templates tabel zodat gebruikers eigen templates kunnen beheren.
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organisatie_id UUID NOT NULL REFERENCES organisaties(id) ON DELETE CASCADE,
  naam TEXT NOT NULL,
  onderwerp TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_templates_org ON email_templates(organisatie_id);

ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org leden zien eigen templates"
  ON email_templates FOR SELECT
  USING (organisatie_id IN (SELECT organisatie_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Org leden maken templates"
  ON email_templates FOR INSERT
  WITH CHECK (organisatie_id IN (SELECT organisatie_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Org leden updaten templates"
  ON email_templates FOR UPDATE
  USING (organisatie_id IN (SELECT organisatie_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Org leden verwijderen templates"
  ON email_templates FOR DELETE
  USING (organisatie_id IN (SELECT organisatie_id FROM profiles WHERE id = auth.uid()));
