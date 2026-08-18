-- ============================================================
-- Visualizer chats — org-brede gespreksgeschiedenis
-- Elk gesprek (reeks visualisatie-berichten) is zichtbaar voor
-- de hele organisatie, conform doen.-transparantie.
-- ============================================================

CREATE TABLE IF NOT EXISTS visualizer_chats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organisatie_id UUID NOT NULL REFERENCES organisaties(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  titel TEXT NOT NULL DEFAULT 'Nieuwe visualisatie',
  berichten JSONB NOT NULL DEFAULT '[]'::jsonb,
  foto TEXT,
  foto_naam TEXT,
  logo_foto TEXT,
  ratio TEXT NOT NULL DEFAULT '4:3',
  resolutie TEXT NOT NULL DEFAULT '2K',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_visualizer_chats_org_updated
  ON visualizer_chats (organisatie_id, updated_at DESC);

ALTER TABLE visualizer_chats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members manage visualizer chats"
  ON visualizer_chats FOR ALL
  USING (organisatie_id = auth_organisatie_id())
  WITH CHECK (organisatie_id = auth_organisatie_id());
