-- ============================================================
-- Migration 050: Inkoopfacturen Module
-- Totaal geisoleerd van bestaande email module (user_email_settings / emails)
-- ============================================================

-- pgcrypto nodig voor pgp_sym_encrypt/decrypt van IMAP wachtwoorden
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- 1. INBOX CONFIG — 1 per organisatie
-- ============================================================

CREATE TABLE IF NOT EXISTS inkoopfactuur_inbox_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organisatie_id UUID NOT NULL REFERENCES organisaties(id) ON DELETE CASCADE,
  imap_host TEXT NOT NULL DEFAULT 'imap.gmail.com',
  imap_port INTEGER NOT NULL DEFAULT 993,
  imap_user TEXT NOT NULL,
  imap_password_encrypted TEXT NOT NULL,
  gmail_label TEXT NOT NULL DEFAULT 'doen-inkoop',
  actief BOOLEAN NOT NULL DEFAULT true,
  laatst_gecheckt_op TIMESTAMPTZ,
  laatste_uid INTEGER NOT NULL DEFAULT 0,
  laatste_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT inkoopfactuur_inbox_config_org_unique UNIQUE (organisatie_id)
);

ALTER TABLE inkoopfactuur_inbox_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members manage inbox config"
  ON inkoopfactuur_inbox_config FOR ALL
  USING (organisatie_id = auth_organisatie_id());

-- ============================================================
-- 2. INKOOPFACTUREN
-- ============================================================

CREATE TABLE IF NOT EXISTS inkoopfacturen (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organisatie_id UUID NOT NULL REFERENCES organisaties(id) ON DELETE CASCADE,
  toegewezen_aan_id UUID REFERENCES medewerkers(id) ON DELETE SET NULL,
  leverancier_naam TEXT NOT NULL DEFAULT '',
  factuur_nummer TEXT,
  factuur_datum DATE,
  vervaldatum DATE,
  subtotaal NUMERIC(12,2) NOT NULL DEFAULT 0,
  btw_bedrag NUMERIC(12,2) NOT NULL DEFAULT 0,
  totaal NUMERIC(12,2) NOT NULL DEFAULT 0,
  valuta TEXT NOT NULL DEFAULT 'EUR',
  pdf_storage_path TEXT NOT NULL,
  email_subject TEXT,
  email_van TEXT,
  email_message_id TEXT,
  email_ontvangen_op TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'nieuw'
    CHECK (status IN ('nieuw', 'verwerkt', 'toegewezen', 'goedgekeurd', 'afgewezen')),
  extractie_vertrouwen TEXT
    CHECK (extractie_vertrouwen IN ('hoog', 'midden', 'laag')),
  extractie_opmerkingen TEXT,
  afgewezen_reden TEXT,
  goedgekeurd_door_id UUID REFERENCES medewerkers(id) ON DELETE SET NULL,
  goedgekeurd_op TIMESTAMPTZ,
  raw_extractie_json JSONB,
  uitgave_id UUID REFERENCES uitgaven(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS inkoopfacturen_org_factuurnummer_unique
  ON inkoopfacturen (organisatie_id, leverancier_naam, factuur_nummer)
  WHERE factuur_nummer IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS inkoopfacturen_org_message_id_unique
  ON inkoopfacturen (organisatie_id, email_message_id)
  WHERE email_message_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_inkoopfacturen_org_status
  ON inkoopfacturen (organisatie_id, status);

ALTER TABLE inkoopfacturen ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members manage inkoopfacturen"
  ON inkoopfacturen FOR ALL
  USING (organisatie_id = auth_organisatie_id());

-- ============================================================
-- 3. INKOOPFACTUUR REGELS
-- ============================================================

CREATE TABLE IF NOT EXISTS inkoopfactuur_regels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  inkoopfactuur_id UUID NOT NULL REFERENCES inkoopfacturen(id) ON DELETE CASCADE,
  volgorde INTEGER NOT NULL DEFAULT 0,
  omschrijving TEXT NOT NULL DEFAULT '',
  aantal NUMERIC(10,2) NOT NULL DEFAULT 1,
  eenheidsprijs NUMERIC(12,2) NOT NULL DEFAULT 0,
  btw_tarief NUMERIC(5,2) NOT NULL DEFAULT 21,
  regel_totaal NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inkoopfactuur_regels_factuur
  ON inkoopfactuur_regels (inkoopfactuur_id);

ALTER TABLE inkoopfactuur_regels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members manage inkoopfactuur regels"
  ON inkoopfactuur_regels FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM inkoopfacturen
      WHERE inkoopfacturen.id = inkoopfactuur_regels.inkoopfactuur_id
        AND inkoopfacturen.organisatie_id = auth_organisatie_id()
    )
  );

-- ============================================================
-- 4. MEDEWERKERS — toegang veld
-- ============================================================

ALTER TABLE medewerkers
  ADD COLUMN IF NOT EXISTS inkoopfacturen_toegang BOOLEAN NOT NULL DEFAULT false;

UPDATE medewerkers SET inkoopfacturen_toegang = true WHERE rol = 'admin';

-- ============================================================
-- 5. APP_NOTIFICATIES — type 'inkoopfactuur' toevoegen
-- ============================================================

ALTER TABLE app_notificaties DROP CONSTRAINT IF EXISTS app_notificaties_type_check;
ALTER TABLE app_notificaties
  ADD CONSTRAINT app_notificaties_type_check
  CHECK (type IN ('goedkeuring', 'revisie', 'bericht', 'betaling', 'bekeken', 'herinnering', 'systeem', 'inkoopfactuur'));

-- ============================================================
-- 6. STORAGE BUCKET
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('inkoopfacturen', 'inkoopfacturen', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Org members upload inkoopfactuur PDFs"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'inkoopfacturen'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Org members read inkoopfactuur PDFs"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'inkoopfacturen'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Org members delete inkoopfactuur PDFs"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'inkoopfacturen'
    AND auth.role() = 'authenticated'
  );
