-- Wachtlijst signups voor doen. marketing website
CREATE TABLE IF NOT EXISTS wachtlijst (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  naam TEXT,
  bedrijfsnaam TEXT,
  bron TEXT DEFAULT 'website',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index voor snelle lookups
CREATE INDEX IF NOT EXISTS idx_wachtlijst_email ON wachtlijst(email);

-- RLS inschakelen
ALTER TABLE wachtlijst ENABLE ROW LEVEL SECURITY;

-- Iedereen mag inserten (publieke website)
CREATE POLICY "Iedereen mag zich inschrijven" ON wachtlijst
  FOR INSERT WITH CHECK (true);

-- Alleen service role mag lezen
CREATE POLICY "Service role mag lezen" ON wachtlijst
  FOR SELECT USING (auth.role() = 'service_role');
