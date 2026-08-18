-- ============================================================
-- 023: Klantportaal
-- Portaal per project, items, bestanden, reacties, notificaties
-- ============================================================

-- Portaal per project
CREATE TABLE IF NOT EXISTS project_portalen (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  project_id UUID NOT NULL,
  token VARCHAR(64) NOT NULL UNIQUE,
  actief BOOLEAN DEFAULT true,
  verloopt_op TIMESTAMPTZ NOT NULL,
  instructie_tekst TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_portalen_token ON project_portalen(token);
CREATE INDEX IF NOT EXISTS idx_portalen_project ON project_portalen(project_id);

-- Items op het portaal
CREATE TABLE IF NOT EXISTS portaal_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  project_id UUID NOT NULL,
  portaal_id UUID NOT NULL REFERENCES project_portalen(id) ON DELETE CASCADE,

  type VARCHAR(20) NOT NULL CHECK (type IN ('offerte', 'tekening', 'factuur', 'bericht')),

  -- Koppelingen
  offerte_id UUID,
  factuur_id UUID,

  titel VARCHAR(255) NOT NULL,
  omschrijving TEXT,
  label VARCHAR(100),

  -- Status
  status VARCHAR(20) DEFAULT 'verstuurd' CHECK (status IN ('verstuurd', 'bekeken', 'goedgekeurd', 'revisie', 'betaald', 'vervangen')),
  bekeken_op TIMESTAMPTZ,

  -- Betaling
  mollie_payment_url TEXT,
  bedrag DECIMAL(10,2),

  -- Visibility
  zichtbaar_voor_klant BOOLEAN DEFAULT true,

  volgorde INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_portaal_items_portaal ON portaal_items(portaal_id);

-- Bestanden bij portaal items
CREATE TABLE IF NOT EXISTS portaal_bestanden (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  portaal_item_id UUID NOT NULL REFERENCES portaal_items(id) ON DELETE CASCADE,
  bestandsnaam VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100),
  grootte INTEGER,
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  uploaded_by VARCHAR(20) DEFAULT 'bedrijf' CHECK (uploaded_by IN ('bedrijf', 'klant')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Klant reacties
CREATE TABLE IF NOT EXISTS portaal_reacties (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  portaal_item_id UUID NOT NULL REFERENCES portaal_items(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('goedkeuring', 'revisie', 'bericht')),
  bericht TEXT,
  klant_naam VARCHAR(255),
  klant_email VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notificaties
CREATE TABLE IF NOT EXISTS app_notificaties (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type VARCHAR(30) NOT NULL CHECK (type IN ('goedkeuring', 'revisie', 'bericht', 'betaling', 'bekeken', 'herinnering', 'systeem')),
  titel VARCHAR(255) NOT NULL,
  bericht TEXT,
  link TEXT,
  project_id UUID,
  offerte_id UUID,
  klant_id UUID,
  gelezen BOOLEAN DEFAULT false,
  actie_genomen BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notificaties_user ON app_notificaties(user_id, gelezen);

-- Portaal instellingen als JSON in app_settings
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS portaal_instellingen JSONB DEFAULT '{}'::jsonb;
