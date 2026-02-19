-- ============================================================
-- Migration 001: Ontbrekende tabellen toevoegen
-- Voer dit uit in Supabase SQL Editor NA schema.sql
-- ============================================================

-- ============================================================
-- NIEUWE TABELLEN
-- ============================================================

-- Facturen
CREATE TABLE IF NOT EXISTS facturen (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  klant_id UUID REFERENCES klanten ON DELETE SET NULL,
  offerte_id UUID REFERENCES offertes ON DELETE SET NULL,
  project_id UUID REFERENCES projecten ON DELETE SET NULL,
  nummer TEXT NOT NULL,
  titel TEXT NOT NULL,
  status TEXT DEFAULT 'concept' CHECK (status IN ('concept', 'verzonden', 'betaald', 'vervallen', 'gecrediteerd')),
  subtotaal DECIMAL(10,2) DEFAULT 0,
  btw_bedrag DECIMAL(10,2) DEFAULT 0,
  totaal DECIMAL(10,2) DEFAULT 0,
  betaald_bedrag DECIMAL(10,2) DEFAULT 0,
  factuurdatum DATE DEFAULT CURRENT_DATE,
  vervaldatum DATE,
  betaaldatum DATE,
  betalingsherinnering_verzonden BOOLEAN DEFAULT FALSE,
  notities TEXT,
  voorwaarden TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Factuur items
CREATE TABLE IF NOT EXISTS factuur_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  factuur_id UUID REFERENCES facturen ON DELETE CASCADE NOT NULL,
  beschrijving TEXT NOT NULL,
  aantal DECIMAL(10,2) DEFAULT 1,
  eenheidsprijs DECIMAL(10,2) NOT NULL,
  btw_percentage DECIMAL(5,2) DEFAULT 21,
  korting_percentage DECIMAL(5,2) DEFAULT 0,
  totaal DECIMAL(10,2),
  volgorde INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tijdregistraties
CREATE TABLE IF NOT EXISTS tijdregistraties (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES projecten ON DELETE SET NULL,
  taak_id UUID REFERENCES taken ON DELETE SET NULL,
  medewerker_id UUID,
  omschrijving TEXT,
  datum DATE DEFAULT CURRENT_DATE,
  start_tijd TIME,
  eind_tijd TIME,
  duur_minuten INTEGER DEFAULT 0,
  uurtarief DECIMAL(10,2) DEFAULT 0,
  facturabel BOOLEAN DEFAULT TRUE,
  gefactureerd BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Medewerkers
CREATE TABLE IF NOT EXISTS medewerkers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  naam TEXT NOT NULL,
  email TEXT,
  telefoon TEXT,
  functie TEXT,
  afdeling TEXT,
  avatar_url TEXT,
  uurtarief DECIMAL(10,2) DEFAULT 0,
  status TEXT DEFAULT 'actief' CHECK (status IN ('actief', 'inactief')),
  rol TEXT DEFAULT 'medewerker' CHECK (rol IN ('admin', 'medewerker', 'monteur', 'verkoop', 'productie')),
  vaardigheden TEXT[] DEFAULT '{}',
  start_datum DATE,
  notities TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Montage afspraken
CREATE TABLE IF NOT EXISTS montage_afspraken (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES projecten ON DELETE SET NULL,
  klant_id UUID REFERENCES klanten ON DELETE SET NULL,
  titel TEXT NOT NULL,
  beschrijving TEXT,
  datum DATE NOT NULL,
  start_tijd TIME,
  eind_tijd TIME,
  locatie TEXT,
  monteurs TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'gepland' CHECK (status IN ('gepland', 'onderweg', 'bezig', 'afgerond', 'uitgesteld')),
  materialen TEXT[] DEFAULT '{}',
  notities TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Nieuwsbrieven
CREATE TABLE IF NOT EXISTS nieuwsbrieven (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  naam TEXT NOT NULL,
  onderwerp TEXT,
  html_inhoud TEXT,
  ontvangers TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'concept' CHECK (status IN ('concept', 'gepland', 'verzonden')),
  verzonden_op TIMESTAMPTZ,
  gepland_op TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notificaties
CREATE TABLE IF NOT EXISTS notificaties (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  type TEXT DEFAULT 'algemeen' CHECK (type IN (
    'offerte_bekeken', 'offerte_verlopen', 'factuur_vervallen',
    'deadline_nadert', 'nieuwe_email', 'taak_voltooid',
    'montage_gepland', 'betaling_ontvangen', 'algemeen'
  )),
  titel TEXT NOT NULL,
  bericht TEXT,
  link TEXT,
  gelezen BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- App instellingen (per user)
CREATE TABLE IF NOT EXISTS app_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL UNIQUE,
  branche TEXT DEFAULT '',
  branche_preset TEXT DEFAULT 'sign_company',
  valuta TEXT DEFAULT 'EUR',
  valuta_symbool TEXT DEFAULT '€',
  standaard_btw DECIMAL(5,2) DEFAULT 21,
  pipeline_stappen JSONB DEFAULT '[]',
  offerte_geldigheid_dagen INTEGER DEFAULT 30,
  offerte_prefix TEXT DEFAULT 'OFF-',
  offerte_volgnummer INTEGER DEFAULT 1,
  auto_follow_up BOOLEAN DEFAULT FALSE,
  follow_up_dagen INTEGER DEFAULT 7,
  melding_follow_up BOOLEAN DEFAULT TRUE,
  melding_verlopen BOOLEAN DEFAULT TRUE,
  melding_nieuwe_offerte BOOLEAN DEFAULT TRUE,
  melding_status_wijziging BOOLEAN DEFAULT TRUE,
  email_handtekening TEXT DEFAULT '',
  primaire_kleur TEXT DEFAULT '#2563EB',
  secundaire_kleur TEXT DEFAULT '#7C3AED',
  toon_conversie_rate BOOLEAN DEFAULT TRUE,
  toon_dagen_open BOOLEAN DEFAULT TRUE,
  toon_follow_up_indicatoren BOOLEAN DEFAULT TRUE,
  dashboard_widgets TEXT[] DEFAULT '{}',
  sidebar_items TEXT[] DEFAULT '{}',
  calculatie_categorieen TEXT[] DEFAULT ARRAY['Materiaal', 'Arbeid', 'Transport'],
  calculatie_eenheden TEXT[] DEFAULT ARRAY['m²', 'stuks', 'uur', 'meter'],
  calculatie_standaard_marge DECIMAL(5,2) DEFAULT 35,
  calculatie_toon_inkoop_in_offerte BOOLEAN DEFAULT FALSE,
  offerte_regel_velden TEXT[] DEFAULT ARRAY['Materiaal', 'Lay-out', 'Montage', 'Opmerking'],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Calculatie producten (productcatalogus)
CREATE TABLE IF NOT EXISTS calculatie_producten (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  naam TEXT NOT NULL,
  categorie TEXT DEFAULT '',
  eenheid TEXT DEFAULT 'stuks',
  inkoop_prijs DECIMAL(10,2) DEFAULT 0,
  verkoop_prijs DECIMAL(10,2) DEFAULT 0,
  standaard_marge DECIMAL(5,2) DEFAULT 35,
  btw_percentage DECIMAL(5,2) DEFAULT 21,
  actief BOOLEAN DEFAULT TRUE,
  notitie TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Calculatie templates
CREATE TABLE IF NOT EXISTS calculatie_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  naam TEXT NOT NULL,
  beschrijving TEXT,
  regels JSONB DEFAULT '[]',
  actief BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Offerte templates
CREATE TABLE IF NOT EXISTS offerte_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  naam TEXT NOT NULL,
  beschrijving TEXT,
  regels JSONB DEFAULT '[]',
  actief BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tekening goedkeuringen
CREATE TABLE IF NOT EXISTS tekening_goedkeuringen (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES projecten ON DELETE SET NULL,
  klant_id UUID REFERENCES klanten ON DELETE SET NULL,
  document_ids UUID[] DEFAULT '{}',
  offerte_id UUID REFERENCES offertes ON DELETE SET NULL,
  token TEXT NOT NULL UNIQUE,
  status TEXT DEFAULT 'verzonden' CHECK (status IN ('verzonden', 'bekeken', 'goedgekeurd', 'revisie')),
  email_aan TEXT,
  email_onderwerp TEXT,
  email_bericht TEXT,
  revisie_opmerkingen TEXT,
  goedgekeurd_door TEXT,
  goedgekeurd_op TIMESTAMPTZ,
  revisie_nummer INTEGER DEFAULT 1,
  vorige_goedkeuring_id UUID REFERENCES tekening_goedkeuringen ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User email instellingen (SMTP credentials per user)
CREATE TABLE IF NOT EXISTS user_email_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL UNIQUE,
  gmail_address TEXT NOT NULL,
  encrypted_app_password TEXT NOT NULL,
  smtp_host TEXT DEFAULT 'smtp.gmail.com',
  smtp_port INTEGER DEFAULT 587,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Kolom toevoegen aan emails tabel voor scheduling
ALTER TABLE emails ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE facturen ENABLE ROW LEVEL SECURITY;
ALTER TABLE factuur_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE tijdregistraties ENABLE ROW LEVEL SECURITY;
ALTER TABLE medewerkers ENABLE ROW LEVEL SECURITY;
ALTER TABLE montage_afspraken ENABLE ROW LEVEL SECURITY;
ALTER TABLE nieuwsbrieven ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificaties ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE calculatie_producten ENABLE ROW LEVEL SECURITY;
ALTER TABLE calculatie_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE offerte_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE tekening_goedkeuringen ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_email_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies: facturen
CREATE POLICY "Users can view own facturen" ON facturen FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own facturen" ON facturen FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own facturen" ON facturen FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own facturen" ON facturen FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies: factuur_items (via factuur ownership)
CREATE POLICY "Users can view own factuur_items" ON factuur_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM facturen WHERE facturen.id = factuur_items.factuur_id AND facturen.user_id = auth.uid())
);
CREATE POLICY "Users can insert own factuur_items" ON factuur_items FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM facturen WHERE facturen.id = factuur_items.factuur_id AND facturen.user_id = auth.uid())
);
CREATE POLICY "Users can update own factuur_items" ON factuur_items FOR UPDATE USING (
  EXISTS (SELECT 1 FROM facturen WHERE facturen.id = factuur_items.factuur_id AND facturen.user_id = auth.uid())
);
CREATE POLICY "Users can delete own factuur_items" ON factuur_items FOR DELETE USING (
  EXISTS (SELECT 1 FROM facturen WHERE facturen.id = factuur_items.factuur_id AND facturen.user_id = auth.uid())
);

-- RLS Policies: tijdregistraties
CREATE POLICY "Users can view own tijdregistraties" ON tijdregistraties FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own tijdregistraties" ON tijdregistraties FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tijdregistraties" ON tijdregistraties FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own tijdregistraties" ON tijdregistraties FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies: medewerkers
CREATE POLICY "Users can view own medewerkers" ON medewerkers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own medewerkers" ON medewerkers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own medewerkers" ON medewerkers FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own medewerkers" ON medewerkers FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies: montage_afspraken
CREATE POLICY "Users can view own montage_afspraken" ON montage_afspraken FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own montage_afspraken" ON montage_afspraken FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own montage_afspraken" ON montage_afspraken FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own montage_afspraken" ON montage_afspraken FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies: nieuwsbrieven
CREATE POLICY "Users can view own nieuwsbrieven" ON nieuwsbrieven FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own nieuwsbrieven" ON nieuwsbrieven FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own nieuwsbrieven" ON nieuwsbrieven FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own nieuwsbrieven" ON nieuwsbrieven FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies: notificaties
CREATE POLICY "Users can view own notificaties" ON notificaties FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own notificaties" ON notificaties FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own notificaties" ON notificaties FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own notificaties" ON notificaties FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies: app_settings
CREATE POLICY "Users can view own app_settings" ON app_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own app_settings" ON app_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own app_settings" ON app_settings FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies: calculatie_producten
CREATE POLICY "Users can view own calculatie_producten" ON calculatie_producten FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own calculatie_producten" ON calculatie_producten FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own calculatie_producten" ON calculatie_producten FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own calculatie_producten" ON calculatie_producten FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies: calculatie_templates
CREATE POLICY "Users can view own calculatie_templates" ON calculatie_templates FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own calculatie_templates" ON calculatie_templates FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own calculatie_templates" ON calculatie_templates FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own calculatie_templates" ON calculatie_templates FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies: offerte_templates
CREATE POLICY "Users can view own offerte_templates" ON offerte_templates FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own offerte_templates" ON offerte_templates FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own offerte_templates" ON offerte_templates FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own offerte_templates" ON offerte_templates FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies: tekening_goedkeuringen
CREATE POLICY "Users can view own tekening_goedkeuringen" ON tekening_goedkeuringen FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own tekening_goedkeuringen" ON tekening_goedkeuringen FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tekening_goedkeuringen" ON tekening_goedkeuringen FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own tekening_goedkeuringen" ON tekening_goedkeuringen FOR DELETE USING (auth.uid() = user_id);
-- Klanten kunnen hun eigen goedkeuring bekijken via token (public access)
CREATE POLICY "Public can view by token" ON tekening_goedkeuringen FOR SELECT USING (true);

-- RLS Policies: user_email_settings
CREATE POLICY "Users can view own email_settings" ON user_email_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own email_settings" ON user_email_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own email_settings" ON user_email_settings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own email_settings" ON user_email_settings FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- TRIGGERS: updated_at
-- ============================================================

CREATE TRIGGER update_facturen_updated_at BEFORE UPDATE ON facturen FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tijdregistraties_updated_at BEFORE UPDATE ON tijdregistraties FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_medewerkers_updated_at BEFORE UPDATE ON medewerkers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_montage_afspraken_updated_at BEFORE UPDATE ON montage_afspraken FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_nieuwsbrieven_updated_at BEFORE UPDATE ON nieuwsbrieven FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_app_settings_updated_at BEFORE UPDATE ON app_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_calculatie_producten_updated_at BEFORE UPDATE ON calculatie_producten FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_calculatie_templates_updated_at BEFORE UPDATE ON calculatie_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_offerte_templates_updated_at BEFORE UPDATE ON offerte_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tekening_goedkeuringen_updated_at BEFORE UPDATE ON tekening_goedkeuringen FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_email_settings_updated_at BEFORE UPDATE ON user_email_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- INDEXES voor performance
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_facturen_user_id ON facturen(user_id);
CREATE INDEX IF NOT EXISTS idx_facturen_klant_id ON facturen(klant_id);
CREATE INDEX IF NOT EXISTS idx_facturen_status ON facturen(status);
CREATE INDEX IF NOT EXISTS idx_factuur_items_factuur_id ON factuur_items(factuur_id);
CREATE INDEX IF NOT EXISTS idx_tijdregistraties_user_id ON tijdregistraties(user_id);
CREATE INDEX IF NOT EXISTS idx_tijdregistraties_project_id ON tijdregistraties(project_id);
CREATE INDEX IF NOT EXISTS idx_tijdregistraties_datum ON tijdregistraties(datum);
CREATE INDEX IF NOT EXISTS idx_medewerkers_user_id ON medewerkers(user_id);
CREATE INDEX IF NOT EXISTS idx_montage_afspraken_user_id ON montage_afspraken(user_id);
CREATE INDEX IF NOT EXISTS idx_montage_afspraken_datum ON montage_afspraken(datum);
CREATE INDEX IF NOT EXISTS idx_nieuwsbrieven_user_id ON nieuwsbrieven(user_id);
CREATE INDEX IF NOT EXISTS idx_notificaties_user_id ON notificaties(user_id);
CREATE INDEX IF NOT EXISTS idx_notificaties_gelezen ON notificaties(gelezen);
CREATE INDEX IF NOT EXISTS idx_calculatie_producten_user_id ON calculatie_producten(user_id);
CREATE INDEX IF NOT EXISTS idx_tekening_goedkeuringen_token ON tekening_goedkeuringen(token);
CREATE INDEX IF NOT EXISTS idx_emails_scheduled_at ON emails(scheduled_at);
