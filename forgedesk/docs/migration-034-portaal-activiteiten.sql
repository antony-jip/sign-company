-- Migration 034: portaal_activiteiten tabel
-- Draai handmatig in Supabase SQL Editor
-- Doel: activiteiten logging voor het klantportaal (Trigger.dev integratie)

CREATE TABLE IF NOT EXISTS portaal_activiteiten (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portaal_id UUID REFERENCES project_portalen(id) ON DELETE CASCADE,
  actie TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes voor queries
CREATE INDEX IF NOT EXISTS idx_portaal_activiteiten_portaal
  ON portaal_activiteiten(portaal_id);
CREATE INDEX IF NOT EXISTS idx_portaal_activiteiten_created
  ON portaal_activiteiten(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_portaal_activiteiten_actie
  ON portaal_activiteiten(actie);

-- RLS: service_role heeft altijd toegang (Trigger.dev tasks draaien met service_role)
ALTER TABLE portaal_activiteiten ENABLE ROW LEVEL SECURITY;

-- Gebruikers kunnen hun eigen portaal activiteiten lezen
CREATE POLICY "Users can read own portaal activiteiten"
  ON portaal_activiteiten FOR SELECT
  USING (
    portaal_id IN (
      SELECT id FROM project_portalen WHERE user_id = auth.uid()
    )
  );

-- Service role (Trigger.dev) kan alles inserten
CREATE POLICY "Service role can insert portaal activiteiten"
  ON portaal_activiteiten FOR INSERT
  WITH CHECK (true);
