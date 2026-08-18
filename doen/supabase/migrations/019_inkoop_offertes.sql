-- Inkoop offertes en regels tabellen

CREATE TABLE IF NOT EXISTS inkoop_offertes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  leverancier_naam text NOT NULL,
  project_id uuid REFERENCES projecten(id) ON DELETE SET NULL,
  bestand_url text,
  datum date NOT NULL DEFAULT CURRENT_DATE,
  totaal numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS inkoop_regels (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  inkoop_offerte_id uuid NOT NULL REFERENCES inkoop_offertes(id) ON DELETE CASCADE,
  omschrijving text NOT NULL,
  aantal numeric(12,4) NOT NULL DEFAULT 1,
  eenheid text,
  prijs_per_stuk numeric(12,2) NOT NULL DEFAULT 0,
  totaal numeric(12,2) NOT NULL DEFAULT 0,
  twijfelachtig boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_inkoop_offertes_user_id ON inkoop_offertes(user_id);
CREATE INDEX IF NOT EXISTS idx_inkoop_offertes_project_id ON inkoop_offertes(project_id);
CREATE INDEX IF NOT EXISTS idx_inkoop_regels_offerte_id ON inkoop_regels(inkoop_offerte_id);

-- RLS
ALTER TABLE inkoop_offertes ENABLE ROW LEVEL SECURITY;
ALTER TABLE inkoop_regels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own inkoop_offertes"
  ON inkoop_offertes FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own inkoop_regels"
  ON inkoop_regels FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
