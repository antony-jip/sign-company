-- Signing visualisaties tabel
-- Slaat AI-gegenereerde mockups op met koppelingen naar offertes/projecten/klanten

CREATE TABLE IF NOT EXISTS signing_visualisaties (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Koppelingen (optioneel)
  offerte_id UUID REFERENCES offertes(id) ON DELETE SET NULL,
  project_id UUID REFERENCES projecten(id) ON DELETE SET NULL,
  klant_id UUID REFERENCES klanten(id) ON DELETE SET NULL,

  -- Input
  gebouw_foto_url TEXT NOT NULL DEFAULT '',
  logo_url TEXT,
  prompt_gebruikt TEXT NOT NULL DEFAULT '',
  aangepaste_prompt TEXT,

  -- Afmetingen
  breedte_cm NUMERIC,
  hoogte_cm NUMERIC,
  kleur_instelling TEXT NOT NULL DEFAULT 'auto',
  signing_type TEXT NOT NULL DEFAULT 'led_verlicht' CHECK (signing_type IN ('led_verlicht', 'neon', 'dag_onverlicht', 'dag_nacht')),
  resolutie TEXT NOT NULL DEFAULT '2K' CHECK (resolutie IN ('1K', '2K', '4K')),

  -- Output
  resultaat_url TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'klaar' CHECK (status IN ('wachten', 'genereren', 'klaar', 'fout')),

  -- Kosten tracking
  api_kosten_eur NUMERIC NOT NULL DEFAULT 0,
  wisselkoers_gebruikt NUMERIC NOT NULL DEFAULT 0.92,
  doorberekend_aan_klant BOOLEAN NOT NULL DEFAULT false,
  offerte_regel_id TEXT,

  -- Meta
  fal_request_id TEXT,
  generatie_tijd_ms INTEGER,
  notitie TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_signing_vis_user ON signing_visualisaties(user_id);
CREATE INDEX IF NOT EXISTS idx_signing_vis_offerte ON signing_visualisaties(offerte_id) WHERE offerte_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_signing_vis_project ON signing_visualisaties(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_signing_vis_klant ON signing_visualisaties(klant_id) WHERE klant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_signing_vis_created ON signing_visualisaties(created_at DESC);

-- RLS
ALTER TABLE signing_visualisaties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own visualisaties" ON signing_visualisaties
  FOR ALL USING (user_id = auth.uid());
