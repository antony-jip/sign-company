-- Workmate Database Schema for Supabase
-- Voer dit uit in de Supabase SQL Editor

-- ============================================================
-- TABELLEN
-- ============================================================

-- Users profile (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  voornaam TEXT,
  achternaam TEXT,
  email TEXT,
  telefoon TEXT,
  avatar_url TEXT,
  logo_url TEXT,
  bedrijfsnaam TEXT,
  bedrijfs_adres TEXT,
  kvk_nummer TEXT,
  btw_nummer TEXT,
  taal TEXT DEFAULT 'nl',
  theme TEXT DEFAULT 'light',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Klanten
CREATE TABLE IF NOT EXISTS klanten (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  bedrijfsnaam TEXT NOT NULL,
  contactpersoon TEXT,
  email TEXT,
  telefoon TEXT,
  adres TEXT,
  postcode TEXT,
  stad TEXT,
  land TEXT DEFAULT 'Nederland',
  website TEXT,
  kvk_nummer TEXT,
  btw_nummer TEXT,
  status TEXT DEFAULT 'actief' CHECK (status IN ('actief', 'inactief', 'prospect')),
  tags TEXT[] DEFAULT '{}',
  notities TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Projecten
CREATE TABLE IF NOT EXISTS projecten (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  klant_id UUID REFERENCES klanten ON DELETE SET NULL,
  naam TEXT NOT NULL,
  beschrijving TEXT,
  status TEXT DEFAULT 'gepland' CHECK (status IN ('gepland', 'actief', 'in-review', 'afgerond', 'on-hold')),
  prioriteit TEXT DEFAULT 'medium' CHECK (prioriteit IN ('laag', 'medium', 'hoog', 'kritiek')),
  start_datum DATE,
  eind_datum DATE,
  budget DECIMAL(10,2),
  besteed DECIMAL(10,2) DEFAULT 0,
  voortgang INTEGER DEFAULT 0 CHECK (voortgang >= 0 AND voortgang <= 100),
  team_leden TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Taken
CREATE TABLE IF NOT EXISTS taken (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES projecten ON DELETE CASCADE,
  titel TEXT NOT NULL,
  beschrijving TEXT,
  status TEXT DEFAULT 'todo' CHECK (status IN ('todo', 'bezig', 'review', 'klaar')),
  prioriteit TEXT DEFAULT 'medium' CHECK (prioriteit IN ('laag', 'medium', 'hoog', 'kritiek')),
  toegewezen_aan TEXT,
  deadline DATE,
  geschatte_tijd DECIMAL(5,2),
  bestede_tijd DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Offertes
CREATE TABLE IF NOT EXISTS offertes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  klant_id UUID REFERENCES klanten ON DELETE SET NULL,
  nummer TEXT NOT NULL,
  titel TEXT NOT NULL,
  status TEXT DEFAULT 'concept' CHECK (status IN ('concept', 'verzonden', 'bekeken', 'goedgekeurd', 'afgewezen')),
  subtotaal DECIMAL(10,2) DEFAULT 0,
  btw_bedrag DECIMAL(10,2) DEFAULT 0,
  totaal DECIMAL(10,2) DEFAULT 0,
  geldig_tot DATE,
  notities TEXT,
  voorwaarden TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Offerte items
CREATE TABLE IF NOT EXISTS offerte_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  offerte_id UUID REFERENCES offertes ON DELETE CASCADE,
  beschrijving TEXT NOT NULL,
  aantal DECIMAL(10,2) DEFAULT 1,
  eenheidsprijs DECIMAL(10,2) NOT NULL,
  btw_percentage DECIMAL(5,2) DEFAULT 21,
  korting_percentage DECIMAL(5,2) DEFAULT 0,
  totaal DECIMAL(10,2),
  volgorde INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Documenten
CREATE TABLE IF NOT EXISTS documenten (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES projecten ON DELETE SET NULL,
  klant_id UUID REFERENCES klanten ON DELETE SET NULL,
  naam TEXT NOT NULL,
  type TEXT,
  grootte BIGINT,
  map TEXT DEFAULT 'Alle',
  storage_path TEXT,
  status TEXT DEFAULT 'concept' CHECK (status IN ('concept', 'review', 'definitief', 'gearchiveerd')),
  tags TEXT[] DEFAULT '{}',
  gedeeld_met TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Emails (lokale cache van Gmail)
CREATE TABLE IF NOT EXISTS emails (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  gmail_id TEXT,
  van TEXT,
  aan TEXT,
  onderwerp TEXT,
  inhoud TEXT,
  datum TIMESTAMPTZ,
  gelezen BOOLEAN DEFAULT FALSE,
  starred BOOLEAN DEFAULT FALSE,
  labels TEXT[] DEFAULT '{}',
  bijlagen INTEGER DEFAULT 0,
  map TEXT DEFAULT 'inbox',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Kalender events
CREATE TABLE IF NOT EXISTS events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES projecten ON DELETE SET NULL,
  titel TEXT NOT NULL,
  beschrijving TEXT,
  start_datum TIMESTAMPTZ NOT NULL,
  eind_datum TIMESTAMPTZ,
  type TEXT DEFAULT 'meeting' CHECK (type IN ('meeting', 'deadline', 'herinnering', 'persoonlijk')),
  locatie TEXT,
  deelnemers TEXT[] DEFAULT '{}',
  kleur TEXT DEFAULT '#2563EB',
  herhaling TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Grootboekrekeningen
CREATE TABLE IF NOT EXISTS grootboek (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  code TEXT NOT NULL,
  naam TEXT NOT NULL,
  categorie TEXT CHECK (categorie IN ('activa', 'passiva', 'omzet', 'kosten')),
  saldo DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- BTW codes
CREATE TABLE IF NOT EXISTS btw_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  code TEXT NOT NULL,
  omschrijving TEXT NOT NULL,
  percentage DECIMAL(5,2) NOT NULL,
  actief BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Kortingen
CREATE TABLE IF NOT EXISTS kortingen (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  naam TEXT NOT NULL,
  type TEXT CHECK (type IN ('percentage', 'vast_bedrag')),
  waarde DECIMAL(10,2) NOT NULL,
  voorwaarden TEXT,
  actief BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI Chat geschiedenis
CREATE TABLE IF NOT EXISTS ai_chats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  rol TEXT CHECK (rol IN ('user', 'assistant')),
  bericht TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Enable RLS on ALL tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE klanten ENABLE ROW LEVEL SECURITY;
ALTER TABLE projecten ENABLE ROW LEVEL SECURITY;
ALTER TABLE taken ENABLE ROW LEVEL SECURITY;
ALTER TABLE offertes ENABLE ROW LEVEL SECURITY;
ALTER TABLE offerte_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE documenten ENABLE ROW LEVEL SECURITY;
ALTER TABLE emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE grootboek ENABLE ROW LEVEL SECURITY;
ALTER TABLE btw_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE kortingen ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_chats ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- RLS Policies for klanten
CREATE POLICY "Users can view own klanten" ON klanten FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own klanten" ON klanten FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own klanten" ON klanten FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own klanten" ON klanten FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for projecten
CREATE POLICY "Users can view own projecten" ON projecten FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own projecten" ON projecten FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own projecten" ON projecten FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own projecten" ON projecten FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for taken
CREATE POLICY "Users can view own taken" ON taken FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own taken" ON taken FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own taken" ON taken FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own taken" ON taken FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for offertes
CREATE POLICY "Users can view own offertes" ON offertes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own offertes" ON offertes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own offertes" ON offertes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own offertes" ON offertes FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for offerte_items (via offerte ownership)
CREATE POLICY "Users can view own offerte_items" ON offerte_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM offertes WHERE offertes.id = offerte_items.offerte_id AND offertes.user_id = auth.uid())
);
CREATE POLICY "Users can insert own offerte_items" ON offerte_items FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM offertes WHERE offertes.id = offerte_items.offerte_id AND offertes.user_id = auth.uid())
);
CREATE POLICY "Users can update own offerte_items" ON offerte_items FOR UPDATE USING (
  EXISTS (SELECT 1 FROM offertes WHERE offertes.id = offerte_items.offerte_id AND offertes.user_id = auth.uid())
);
CREATE POLICY "Users can delete own offerte_items" ON offerte_items FOR DELETE USING (
  EXISTS (SELECT 1 FROM offertes WHERE offertes.id = offerte_items.offerte_id AND offertes.user_id = auth.uid())
);

-- RLS Policies for documenten
CREATE POLICY "Users can view own documenten" ON documenten FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own documenten" ON documenten FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own documenten" ON documenten FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own documenten" ON documenten FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for emails
CREATE POLICY "Users can view own emails" ON emails FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own emails" ON emails FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own emails" ON emails FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own emails" ON emails FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for events
CREATE POLICY "Users can view own events" ON events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own events" ON events FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own events" ON events FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own events" ON events FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for grootboek
CREATE POLICY "Users can view own grootboek" ON grootboek FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own grootboek" ON grootboek FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own grootboek" ON grootboek FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own grootboek" ON grootboek FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for btw_codes
CREATE POLICY "Users can view own btw_codes" ON btw_codes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own btw_codes" ON btw_codes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own btw_codes" ON btw_codes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own btw_codes" ON btw_codes FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for kortingen
CREATE POLICY "Users can view own kortingen" ON kortingen FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own kortingen" ON kortingen FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own kortingen" ON kortingen FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own kortingen" ON kortingen FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for ai_chats
CREATE POLICY "Users can view own ai_chats" ON ai_chats FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own ai_chats" ON ai_chats FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own ai_chats" ON ai_chats FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- TRIGGERS & FUNCTIONS
-- ============================================================

-- Trigger to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, voornaam, achternaam)
  VALUES (NEW.id, NEW.email, '', '');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger to auto-update updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_klanten_updated_at BEFORE UPDATE ON klanten FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_projecten_updated_at BEFORE UPDATE ON projecten FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_taken_updated_at BEFORE UPDATE ON taken FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_offertes_updated_at BEFORE UPDATE ON offertes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_documenten_updated_at BEFORE UPDATE ON documenten FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- STORAGE
-- ============================================================

-- Create storage bucket for documents
INSERT INTO storage.buckets (id, name, public) VALUES ('documenten', 'documenten', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Users can upload documenten" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'documenten' AND auth.uid()::text = (storage.foldername(name))[1]
);
CREATE POLICY "Users can view own documenten" ON storage.objects FOR SELECT USING (
  bucket_id = 'documenten' AND auth.uid()::text = (storage.foldername(name))[1]
);
CREATE POLICY "Users can delete own documenten" ON storage.objects FOR DELETE USING (
  bucket_id = 'documenten' AND auth.uid()::text = (storage.foldername(name))[1]
);
