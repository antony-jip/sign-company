CREATE TABLE IF NOT EXISTS ingeplande_berichten (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ontvanger TEXT NOT NULL,
  cc TEXT,
  onderwerp TEXT NOT NULL,
  body TEXT,
  html TEXT,
  bijlagen JSONB NOT NULL DEFAULT '[]'::jsonb,
  scheduled_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'wachtend' CHECK (status IN ('wachtend', 'verzonden', 'geannuleerd', 'mislukt')),
  trigger_run_id TEXT,
  foutmelding TEXT,
  verzonden_op TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ingeplande_berichten_user ON ingeplande_berichten(user_id);
CREATE INDEX IF NOT EXISTS idx_ingeplande_berichten_status ON ingeplande_berichten(status);
CREATE INDEX IF NOT EXISTS idx_ingeplande_berichten_scheduled ON ingeplande_berichten(scheduled_at);

ALTER TABLE ingeplande_berichten ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users zien eigen ingeplande berichten"
  ON ingeplande_berichten FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users maken eigen ingeplande berichten"
  ON ingeplande_berichten FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users updaten eigen ingeplande berichten"
  ON ingeplande_berichten FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users verwijderen eigen ingeplande berichten"
  ON ingeplande_berichten FOR DELETE
  USING (user_id = auth.uid());
