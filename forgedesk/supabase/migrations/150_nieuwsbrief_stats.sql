-- Preheader (inbox-previewtekst) op nieuwsbrieven + events-tabel voor statistieken.
ALTER TABLE nieuwsbrieven ADD COLUMN IF NOT EXISTS preheader TEXT;

-- Eén rij per contact per event-type (UNIQUE) → unieke opens/clicks i.p.v.
-- opgeblazen totalen. Gevuld door de Resend-webhook (service role).
CREATE TABLE IF NOT EXISTS nieuwsbrief_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nieuwsbrief_id UUID NOT NULL REFERENCES nieuwsbrieven(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('delivered', 'opened', 'clicked', 'bounced', 'complained')),
  link TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (nieuwsbrief_id, email, type)
);

CREATE INDEX IF NOT EXISTS idx_nieuwsbrief_events_nb ON nieuwsbrief_events(nieuwsbrief_id);

ALTER TABLE nieuwsbrief_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Eigenaar ziet eigen events" ON nieuwsbrief_events;
CREATE POLICY "Eigenaar ziet eigen events"
  ON nieuwsbrief_events FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM nieuwsbrieven n
    WHERE n.id = nieuwsbrief_events.nieuwsbrief_id AND n.user_id = auth.uid()
  ));

NOTIFY pgrst, 'reload schema';
