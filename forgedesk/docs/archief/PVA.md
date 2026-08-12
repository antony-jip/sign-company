# Plan van Aanpak (PVA) - FORGEdesk CRM

## 1. Projectoverzicht

**Project:** FORGEdesk - Business Management CRM voor Sign Company
**Doel:** Een volledig functionerend CRM-systeem dat alle bedrijfsprocessen van Sign Company ondersteunt: klantenbeheer, offertes, projecten, facturatie, email, en meer.

---

## 2. Huidige Status

### Volledig Werkend
| Module | Status | Wat werkt |
|--------|--------|-----------|
| Authenticatie | Werkend | Login, registratie, logout (Supabase + demo modus) |
| Dashboard | Werkend | Statistieken, prioriteitstaken, follow-ups, kalender widget |
| Projecten | Werkend | Aanmaken, bewerken, status, voortgang, teamleden |
| Klanten | Werkend | CRUD, tagging, status, zoeken/filteren |
| Offertes | Werkend | Pipeline, aanmaken, preview, PDF export |
| Taken | Werkend | CRUD, status, prioriteit, deadline |
| Kalender | Werkend | Events aanmaken, bewerken, maand/week/dag view |
| Financieel | Werkend | Grootboek, BTW-codes, kortingen |
| Data Import | Werkend | CSV parsing, kolom mapping, klanten importeren |
| Instellingen | Werkend | Profiel, bedrijf, aanpassingen, meldingen, weergave |
| Settings Context | **NIEUW** | Alle instellingen worden nu globaal doorgevoerd |

### Nu Gekoppeld (was losse elementen)
| Koppeling | Wat is gedaan |
|-----------|---------------|
| Instellingen -> Offertes | Pipeline stappen, prefix, geldigheidsdagen, BTW% uit settings |
| Instellingen -> PDF | Bedrijfsnaam, adres, KVK, BTW, branding kleur in PDFs |
| Instellingen -> Quote Preview | Bedrijfsgegevens, branding kleur in offerte preview |
| Instellingen -> Email | Email handtekening wordt automatisch toegevoegd |
| Instellingen -> Dashboard | Follow-up widget respecteert weergave-instellingen |
| Instellingen -> Valuta | formatCurrency accepteert nu dynamische valuta |
| Beveiliging tab | Wachtwoord wijzigen werkt nu (Supabase + demo modus) |
| Integraties tab | Anthropic API key wordt veilig server-side geconfigureerd |

---

## 3. Wat JIJ Zelf Moet Doen

### HOGE PRIORITEIT - Nodig voor productie

| # | Taak | Waarom | Geschatte tijd |
|---|------|--------|----------------|
| 1 | **Supabase project aanmaken** | Database backend, authenticatie, file storage | 30 min |
|   | - Ga naar [supabase.com](https://supabase.com) | | |
|   | - Maak een nieuw project aan | | |
|   | - Kopieer de URL en Anon Key | | |
|   | - Vul in: `forgedesk/.env` met `VITE_SUPABASE_URL` en `VITE_SUPABASE_ANON_KEY` | | |
| 2 | **Database tabellen aanmaken in Supabase** | Data persistentie | 45 min |
|   | - Maak tabellen aan: profiles, klanten, projecten, taken, offertes, offerte_items, documenten, emails, events, grootboek, btw_codes, kortingen, ai_chats, nieuwsbrieven, app_settings | | |
|   | - Stel Row Level Security (RLS) in zodat users alleen hun eigen data zien | | |
| 3 | **Supabase Storage bucket aanmaken** | Bestanden opslaan (documenten, logo's, avatars) | 15 min |
|   | - Maak buckets aan: `avatars`, `logos`, `documenten` | | |
|   | - Stel policies in voor upload/download | | |
| 4 | **Domein + hosting regelen** | Live gaan | 30 min |
|   | - Deploy via Vercel, Netlify of eigen server | | |
|   | - Koppel je domein | | |
| 5 | **SSL certificaat** | Veilige verbinding | 10 min |
|   | - Wordt automatisch geregeld bij Vercel/Netlify | | |

### MEDIUM PRIORITEIT - Uitbreidingen

| # | Taak | Waarom | Geschatte tijd |
|---|------|--------|----------------|
| 6 | **Gmail OAuth2 koppeling** | Email synchronisatie | 2-3 uur |
|   | - Google Cloud Console -> nieuw project | | |
|   | - OAuth2 credentials aanmaken | | |
|   | - Gmail API activeren | | |
|   | - Redirect URI instellen | | |
|   | - Client ID + Secret invullen in `.env` | | |
| 7 | **Anthropic API key aanschaffen** | AI-functionaliteit via Forgie (tekst generatie, analyse) | 15 min |
|   | - Ga naar [console.anthropic.com](https://console.anthropic.com) | | |
|   | - Maak een API key aan | | |
|   | - Voeg toe als ANTHROPIC_API_KEY environment variable op Vercel | | |
| 8 | **SMTP server voor email verzending** | Daadwerkelijk emails versturen | 30 min |
|   | - Kies provider: SendGrid, Mailgun, of eigen SMTP | | |
|   | - Configureer als Supabase Edge Function of aparte backend | | |
| 9 | **Stripe/Mollie koppeling** | Online betalingen, facturatie | 2-3 uur |
|   | - Account aanmaken bij betaalprovider | | |
|   | - API keys instellen | | |
|   | - Webhook endpoints configureren | | |

### LAGE PRIORITEIT - Nice to have

| # | Taak | Waarom | Geschatte tijd |
|---|------|--------|----------------|
| 10 | **Push notificaties** | Real-time meldingen | 2 uur |
|    | - Service Worker registreren | | |
|    | - Web Push API configureren | | |
| 11 | **Google Calendar sync** | Agenda synchronisatie | 2-3 uur |
|    | - Google Calendar API activeren | | |
|    | - OAuth2 scope toevoegen | | |
| 12 | **Backups instellen** | Data veiligheid | 30 min |
|    | - Supabase dagelijkse backups activeren | | |
|    | - Optioneel: export script schrijven | | |
| 13 | **Custom domein email** | Professionele emails (@jouwbedrijf.nl) | 1 uur |
|    | - MX records instellen | | |
|    | - SPF/DKIM/DMARC configureren | | |

---

## 4. Technische Architectuur

```
Browser (React + Vite)
    |
    |-- AppSettingsContext (globale instellingen)
    |-- AuthContext (authenticatie status)
    |-- ThemeContext (light/dark mode)
    |-- LanguageContext (NL/EN)
    |
    |-- Services Layer
    |   |-- supabaseService.ts (CRUD operaties)
    |   |-- authService.ts (login/registratie)
    |   |-- pdfService.ts (PDF generatie)
    |   |-- aiService.ts (Anthropic Claude integratie)
    |   |-- forgieService.ts (Forgie AI email functies)
    |   |-- storageService.ts (bestanden)
    |
    v
Supabase (of localStorage in demo modus)
    |-- PostgreSQL (database)
    |-- Auth (JWT authenticatie)
    |-- Storage (bestanden)
    |-- Edge Functions (optioneel, voor server-side logica)
```

---

## 5. Omgevingsvariabelen (.env)

Maak een bestand `forgedesk/.env` aan met:

```env
# Supabase (VERPLICHT voor productie)
VITE_SUPABASE_URL=https://jouw-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...

# Anthropic (SERVER-SIDE ONLY - GEEN VITE_ prefix!)
ANTHROPIC_API_KEY=sk-ant-...

# Gmail (OPTIONEEL - voor email integratie)
VITE_GMAIL_CLIENT_ID=...
VITE_GMAIL_CLIENT_SECRET=...
```

---

## 6. Stappenplan voor Live Gang

### Fase 1: Basis (Week 1)
- [ ] Supabase project aanmaken
- [ ] Database tabellen en RLS instellen
- [ ] Storage buckets aanmaken
- [ ] `.env` bestand invullen
- [ ] Test: login, klant aanmaken, offerte maken, PDF downloaden

### Fase 2: Communicatie (Week 2)
- [ ] Gmail OAuth2 koppeling
- [ ] SMTP voor email verzending
- [ ] Anthropic API key (voor Forgie)
- [ ] Test: email versturen, AI chat, templates

### Fase 3: Uitbreiding (Week 3-4)
- [ ] Betaalintegratie (Stripe/Mollie)
- [ ] Push notificaties
- [ ] Google Calendar sync
- [ ] Hosting + domein

### Fase 4: Go Live
- [ ] Finale tests
- [ ] Backup strategie
- [ ] Monitoring instellen
- [ ] Go live!

---

## 7. Database Schema (SQL voor Supabase)

Voer dit uit in de Supabase SQL Editor:

```sql
-- Profiles (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  voornaam TEXT DEFAULT '',
  achternaam TEXT DEFAULT '',
  email TEXT DEFAULT '',
  telefoon TEXT DEFAULT '',
  avatar_url TEXT DEFAULT '',
  bedrijfsnaam TEXT DEFAULT '',
  bedrijfs_adres TEXT DEFAULT '',
  kvk_nummer TEXT DEFAULT '',
  btw_nummer TEXT DEFAULT '',
  taal TEXT DEFAULT 'nl',
  theme TEXT DEFAULT 'light',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Klanten
CREATE TABLE klanten (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  bedrijfsnaam TEXT NOT NULL,
  contactpersoon TEXT DEFAULT '',
  email TEXT DEFAULT '',
  telefoon TEXT DEFAULT '',
  adres TEXT DEFAULT '',
  postcode TEXT DEFAULT '',
  stad TEXT DEFAULT '',
  land TEXT DEFAULT 'Nederland',
  website TEXT DEFAULT '',
  kvk_nummer TEXT DEFAULT '',
  btw_nummer TEXT DEFAULT '',
  status TEXT DEFAULT 'prospect' CHECK (status IN ('actief', 'inactief', 'prospect')),
  tags TEXT[] DEFAULT '{}',
  notities TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Projecten
CREATE TABLE projecten (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  klant_id UUID REFERENCES klanten,
  naam TEXT NOT NULL,
  beschrijving TEXT DEFAULT '',
  status TEXT DEFAULT 'gepland' CHECK (status IN ('gepland', 'actief', 'in-review', 'afgerond', 'on-hold')),
  prioriteit TEXT DEFAULT 'medium' CHECK (prioriteit IN ('laag', 'medium', 'hoog', 'kritiek')),
  start_datum DATE,
  eind_datum DATE,
  budget NUMERIC DEFAULT 0,
  besteed NUMERIC DEFAULT 0,
  voortgang INTEGER DEFAULT 0,
  team_leden TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Taken
CREATE TABLE taken (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  project_id UUID REFERENCES projecten,
  titel TEXT NOT NULL,
  beschrijving TEXT DEFAULT '',
  status TEXT DEFAULT 'todo' CHECK (status IN ('todo', 'bezig', 'review', 'klaar')),
  prioriteit TEXT DEFAULT 'medium' CHECK (prioriteit IN ('laag', 'medium', 'hoog', 'kritiek')),
  toegewezen_aan TEXT DEFAULT '',
  deadline DATE,
  geschatte_tijd NUMERIC DEFAULT 0,
  bestede_tijd NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Offertes
CREATE TABLE offertes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  klant_id UUID REFERENCES klanten,
  nummer TEXT NOT NULL,
  titel TEXT DEFAULT '',
  status TEXT DEFAULT 'concept' CHECK (status IN ('concept', 'verzonden', 'bekeken', 'goedgekeurd', 'afgewezen')),
  subtotaal NUMERIC DEFAULT 0,
  btw_bedrag NUMERIC DEFAULT 0,
  totaal NUMERIC DEFAULT 0,
  geldig_tot DATE,
  notities TEXT DEFAULT '',
  voorwaarden TEXT DEFAULT '',
  follow_up_datum DATE,
  follow_up_notitie TEXT,
  laatste_contact TIMESTAMPTZ,
  follow_up_status TEXT DEFAULT 'geen',
  contact_pogingen INTEGER DEFAULT 0,
  prioriteit TEXT DEFAULT 'medium',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Offerte Items
CREATE TABLE offerte_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  offerte_id UUID REFERENCES offertes ON DELETE CASCADE,
  beschrijving TEXT DEFAULT '',
  aantal INTEGER DEFAULT 1,
  eenheidsprijs NUMERIC DEFAULT 0,
  btw_percentage NUMERIC DEFAULT 21,
  korting_percentage NUMERIC DEFAULT 0,
  totaal NUMERIC DEFAULT 0,
  volgorde INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Documenten
CREATE TABLE documenten (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  project_id UUID REFERENCES projecten,
  klant_id UUID REFERENCES klanten,
  naam TEXT NOT NULL,
  type TEXT DEFAULT '',
  grootte INTEGER DEFAULT 0,
  map TEXT DEFAULT 'algemeen',
  storage_path TEXT DEFAULT '',
  status TEXT DEFAULT 'concept',
  tags TEXT[] DEFAULT '{}',
  gedeeld_met TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Emails
CREATE TABLE emails (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  gmail_id TEXT DEFAULT '',
  van TEXT DEFAULT '',
  aan TEXT DEFAULT '',
  onderwerp TEXT DEFAULT '',
  inhoud TEXT DEFAULT '',
  datum TIMESTAMPTZ DEFAULT NOW(),
  gelezen BOOLEAN DEFAULT FALSE,
  starred BOOLEAN DEFAULT FALSE,
  labels TEXT[] DEFAULT '{}',
  bijlagen INTEGER DEFAULT 0,
  map TEXT DEFAULT 'inbox',
  scheduled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Calendar Events
CREATE TABLE events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  project_id UUID REFERENCES projecten,
  titel TEXT NOT NULL,
  beschrijving TEXT DEFAULT '',
  start_datum TIMESTAMPTZ NOT NULL,
  eind_datum TIMESTAMPTZ NOT NULL,
  type TEXT DEFAULT 'meeting',
  locatie TEXT DEFAULT '',
  deelnemers TEXT[] DEFAULT '{}',
  kleur TEXT DEFAULT '#2563eb',
  herhaling TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Grootboek
CREATE TABLE grootboek (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  code TEXT NOT NULL,
  naam TEXT NOT NULL,
  categorie TEXT CHECK (categorie IN ('activa', 'passiva', 'omzet', 'kosten')),
  saldo NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- BTW Codes
CREATE TABLE btw_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  code TEXT NOT NULL,
  omschrijving TEXT DEFAULT '',
  percentage NUMERIC DEFAULT 21,
  actief BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Kortingen
CREATE TABLE kortingen (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  naam TEXT NOT NULL,
  type TEXT DEFAULT 'percentage' CHECK (type IN ('percentage', 'vast_bedrag')),
  waarde NUMERIC DEFAULT 0,
  voorwaarden TEXT DEFAULT '',
  actief BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI Chats
CREATE TABLE ai_chats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  rol TEXT CHECK (rol IN ('user', 'assistant')),
  bericht TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Nieuwsbrieven
CREATE TABLE nieuwsbrieven (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  naam TEXT DEFAULT '',
  onderwerp TEXT DEFAULT '',
  html_inhoud TEXT DEFAULT '',
  ontvangers TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'concept',
  verzonden_op TIMESTAMPTZ,
  gepland_op TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- App Settings
CREATE TABLE app_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users UNIQUE NOT NULL,
  branche TEXT DEFAULT 'sign_company',
  branche_preset TEXT DEFAULT 'sign_company',
  valuta TEXT DEFAULT 'EUR',
  valuta_symbool TEXT DEFAULT '€',
  standaard_btw NUMERIC DEFAULT 21,
  pipeline_stappen JSONB DEFAULT '[]',
  offerte_geldigheid_dagen INTEGER DEFAULT 30,
  offerte_prefix TEXT DEFAULT 'OFF',
  offerte_volgnummer INTEGER DEFAULT 1,
  auto_follow_up BOOLEAN DEFAULT TRUE,
  follow_up_dagen INTEGER DEFAULT 7,
  melding_follow_up BOOLEAN DEFAULT TRUE,
  melding_verlopen BOOLEAN DEFAULT TRUE,
  melding_nieuwe_offerte BOOLEAN DEFAULT TRUE,
  melding_status_wijziging BOOLEAN DEFAULT TRUE,
  email_handtekening TEXT DEFAULT '',
  primaire_kleur TEXT DEFAULT '#2563eb',
  secundaire_kleur TEXT DEFAULT '#7c3aed',
  toon_conversie_rate BOOLEAN DEFAULT TRUE,
  toon_dagen_open BOOLEAN DEFAULT TRUE,
  toon_follow_up_indicatoren BOOLEAN DEFAULT TRUE,
  dashboard_widgets TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security (RLS)
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
ALTER TABLE nieuwsbrieven ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies (users can only access their own data)
CREATE POLICY "Users can view own profile" ON profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "Users can manage own klanten" ON klanten FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own projecten" ON projecten FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own taken" ON taken FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own offertes" ON offertes FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own offerte_items" ON offerte_items FOR ALL USING (
  offerte_id IN (SELECT id FROM offertes WHERE user_id = auth.uid())
);
CREATE POLICY "Users can manage own documenten" ON documenten FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own emails" ON emails FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own events" ON events FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own grootboek" ON grootboek FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own btw_codes" ON btw_codes FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own kortingen" ON kortingen FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own ai_chats" ON ai_chats FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own nieuwsbrieven" ON nieuwsbrieven FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own app_settings" ON app_settings FOR ALL USING (auth.uid() = user_id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
```

---

## 8. Contactinformatie

Voor technische vragen over de code, open een issue in de repository of neem contact op met het ontwikkelteam.
