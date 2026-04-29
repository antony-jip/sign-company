# DOEN — Plan van Aanpak: Production Ready

## Status: Pre-RLS, pre-launch
## Doel: Alles fixen voordat we live gaan met 100+ gebruikers

---

## Huidige Status — wat JIJ zelf moet doen

> Onderstaande lijst is overgenomen uit het oorspronkelijke PVA en gefilterd op multi-tenant context. Items die uitsluitend over een single-user setup gingen (eigen Supabase project per gebruiker, eigen `user_id` configureren, RLS "users see own data") zijn weggelaten — die worden in fase 3 op organisatie-niveau opgelost.

### HOGE PRIORITEIT — Nodig voor productie

| # | Taak | Waarom | Geschatte tijd |
|---|------|--------|----------------|
| 1 | **Supabase project verifiëren** | Database backend, authenticatie, file storage | 30 min |
|   | - Bevestig dat het centrale Supabase project actief en toegankelijk is | | |
|   | - Controleer dat `VITE_SUPABASE_URL` en `VITE_SUPABASE_ANON_KEY` correct in `forgedesk/.env` staan | | |
| 2 | **Supabase Storage buckets verifiëren** | Bestanden opslaan (documenten, logo's, avatars) | 15 min |
|   | - Controleer buckets: `avatars`, `logos`, `documenten`, `portaal-bestanden`, `project-fotos` | | |
|   | - Controleer policies: alle buckets moeten ownership-based / organisatie-scoped zijn (zie Fase 1.1) | | |
| 3 | **Domein + hosting regelen** | Live gaan | 30 min |
|   | - Deploy via Vercel, Netlify of eigen server | | |
|   | - Koppel je domein | | |
| 4 | **SSL certificaat** | Veilige verbinding | 10 min |
|   | - Wordt automatisch geregeld bij Vercel/Netlify | | |

### MEDIUM PRIORITEIT — Uitbreidingen

| # | Taak | Waarom | Geschatte tijd |
|---|------|--------|----------------|
| 5 | **Gmail OAuth2 koppeling** | Email synchronisatie | 2-3 uur |
|   | - Google Cloud Console → nieuw project | | |
|   | - OAuth2 credentials aanmaken | | |
|   | - Gmail API activeren | | |
|   | - Redirect URI instellen | | |
|   | - Client ID + Secret invullen in `.env` | | |
| 6 | **Anthropic API key aanschaffen** | AI-functionaliteit via Daan (tekst generatie, analyse) | 15 min |
|   | - Ga naar [console.anthropic.com](https://console.anthropic.com) | | |
|   | - Maak een API key aan | | |
|   | - Voeg toe als `ANTHROPIC_API_KEY` environment variable op Vercel | | |
| 7 | **SMTP server voor email verzending** | Daadwerkelijk emails versturen | 30 min |
|   | - Kies provider: SendGrid, Mailgun, of eigen SMTP | | |
|   | - Configureer als Supabase Edge Function of aparte backend | | |
| 8 | **Stripe/Mollie koppeling** | Online betalingen, facturatie | 2-3 uur |
|   | - Account aanmaken bij betaalprovider | | |
|   | - API keys instellen | | |
|   | - Webhook endpoints configureren | | |

### LAGE PRIORITEIT — Nice to have

| # | Taak | Waarom | Geschatte tijd |
|---|------|--------|----------------|
| 9  | **Push notificaties** | Real-time meldingen | 2 uur |
|    | - Service Worker registreren | | |
|    | - Web Push API configureren | | |
| 10 | **Google Calendar sync** | Agenda synchronisatie | 2-3 uur |
|    | - Google Calendar API activeren | | |
|    | - OAuth2 scope toevoegen | | |
| 11 | **Backups instellen** | Data veiligheid | 30 min |
|    | - Supabase dagelijkse backups activeren | | |
|    | - Optioneel: export script schrijven | | |
| 12 | **Custom domein email** | Professionele emails (@jouwbedrijf.nl) | 1 uur |
|    | - MX records instellen | | |
|    | - SPF/DKIM/DMARC configureren | | |

---

## FASE 1: Blokkerende security fixes (VANDAAG)
*Geschatte tijd: 2-3 uur*

### 1.1 Storage bucket policies fixen
- [ ] `portaal-bestanden` bucket: van PUBLIC naar ownership-based policy
- [ ] `project-fotos` bucket: DELETE policy moet ownership checken, niet alleen `auth.uid() IS NOT NULL`
- [ ] `documenten` bucket portaal subfolder: restrictievere SELECT policy
- **Bestanden**: `supabase/migrations/036_portaal_storage_policy.sql`, `028_project_fotos.sql`
- **Aanpak**: Nieuwe migratie `050_fix_storage_policies.sql`

### 1.2 File upload server-side validatie
- [ ] `DocumentUpload.tsx` → voeg MIME type validatie toe (zoals portaal-upload.ts al doet)
- [ ] `storageService.ts` → voeg file type check toe in `uploadFile()` functie
- [ ] Whitelist: image/jpeg, image/png, image/webp, application/pdf, alleen bekende types
- **Bestanden**: `src/services/storageService.ts`, `src/components/documents/DocumentUpload.tsx`

### 1.3 SECURITY DEFINER functies auditen
- [ ] `cleanup_old_data()` → voeg `user_id` check toe of maak `SECURITY INVOKER`
- [ ] `handle_new_user()` → is OK (moet bypassen bij user creation), documenteer waarom
- **Bestanden**: `supabase/migrations/034_retention_and_rls_optimization.sql`
- **Aanpak**: Nieuwe migratie `051_fix_security_definer.sql`

---

## FASE 2: Data integriteit & race conditions (DEZE WEEK)
*Geschatte tijd: 3-4 uur*

### 2.1 Soft-delete implementeren op kritieke tabellen
- [ ] Voeg `deleted_at TIMESTAMPTZ` kolom toe aan: klanten, projecten, offertes, facturen, werkbonnen
- [ ] Pas delete functies aan: `UPDATE SET deleted_at = now()` i.p.v. `.delete()`
- [ ] Pas alle SELECT queries aan: `.is('deleted_at', null)` filter
- [ ] Voeg "Prullenbak" sectie toe in instellingen (optioneel, later)
- **Bestanden**: Nieuwe migratie `052_soft_delete.sql`, `supabaseService.ts` (40+ functies)
- **Risico**: HOOG — raakt alle queries. Goed testen.

### 2.2 Database CASCADE constraints
- [ ] Voeg ON DELETE CASCADE toe aan foreign keys waar logisch:
  - offerte_items → offertes
  - factuur_items → facturen
  - werkbon_regels/fotos/items → werkbonnen
  - portaal_items/bestanden → project_portalen
- [ ] Verwijder client-side cascade delete code daarna
- **Bestanden**: Nieuwe migratie `053_cascade_constraints.sql`, `supabaseService.ts`

### 2.3 Realtime subscriptions filteren
- [ ] `ProjectPortaalTab.tsx` → filter op `portaal_id` in subscription
- [ ] `NotificatieCenter.tsx` → filter op `user_id` in subscription
- **Bestanden**: `src/components/projects/ProjectPortaalTab.tsx`, `src/components/notifications/NotificatieCenter.tsx`

---

## FASE 3: Multi-tenant migratie (VOLGENDE WEEK)
*Geschatte tijd: 8-12 uur — grootste klus*

### 3.1 Database migratie: organisatie_id op alle kerntabellen
- [ ] Nieuwe migratie `054_organisatie_id_kerntabellen.sql`:
  ```sql
  ALTER TABLE klanten ADD COLUMN organisatie_id UUID REFERENCES organisaties(id);
  ALTER TABLE projecten ADD COLUMN organisatie_id UUID REFERENCES organisaties(id);
  -- etc. voor alle kerntabellen
  ```
- [ ] Backfill: `UPDATE klanten SET organisatie_id = (SELECT organisatie_id FROM profiles WHERE id = klanten.user_id)`
- [ ] NOT NULL constraint toevoegen na backfill
- **Tabellen** (18): klanten, projecten, taken, offertes, offerte_items, facturen, factuur_items, documenten, werkbonnen, werkbon_items, werkbon_fotos, montage_afspraken, events, medewerkers, tijdregistraties, verlof, emails, notificaties

### 3.2 RLS policies updaten
- [ ] Nieuwe migratie `055_rls_organisatie.sql`:
  ```sql
  DROP POLICY IF EXISTS "Users CRUD own klanten" ON klanten;
  CREATE POLICY "Org members CRUD klanten" ON klanten
    FOR ALL USING (
      organisatie_id = (SELECT organisatie_id FROM profiles WHERE id = auth.uid())
    );
  ```
- [ ] Per tabel dezelfde policy
- [ ] Service role bypass policies voor API routes

### 3.3 supabaseService.ts aanpassen
- [ ] Voeg `getOrganisatieId()` helper toe die uit auth context haalt
- [ ] Pas alle create functies aan: voeg `organisatie_id` toe aan INSERT
- [ ] SELECT queries: RLS doet het werk, maar voeg `.eq('organisatie_id', orgId)` toe als defense-in-depth
- [ ] Test: teamlid A maakt klant → teamlid B moet die klant kunnen zien
- **Geschatte wijzigingen**: 50-80 functies

### 3.4 AuthContext / AppSettingsContext updaten
- [ ] `organisatieId` beschikbaar maken in AppSettingsContext
- [ ] Alle componenten die `user?.id` doorgeven aan service functies → check of `organisatieId` nodig is
- **Bestanden**: `src/contexts/AppSettingsContext.tsx`, `src/contexts/AuthContext.tsx`

---

## FASE 4: TypeScript opschonen (VOLGENDE WEEK)
*Geschatte tijd: 4-6 uur*

### 4.1 Type definities syncen met database
- [ ] `Werkbon` interface: voeg ontbrekende properties toe (kilometers, km_tarief, omschrijving, etc.)
- [ ] `DocumentStyle` interface: fix camelCase vs snake_case mismatch in werkbonPdfService.ts
- [ ] `Email` interface: sync met actual database kolommen
- **Doel**: Van 138 → 0 TypeScript errors

### 4.2 `as any` casts verwijderen
- [ ] `PortaalCompactBlock.tsx:399` → fix PortaalItem type
- [ ] `QuoteCreation.tsx:258` → fix offerte creation type
- [ ] `ProjectDetail.tsx:1024` → fix status type ('montage' is geen geldige status)
- [ ] `supabaseService.ts:4057-4077` → fix DocumentStyle upsert types
- **Doel**: Van 9 → 0 `as any` casts

### 4.3 Dead code opruimen
- [ ] Verwijder ongebruikte imports (build warnings)
- [ ] Verwijder `console.log` in productie code (2 stuks)
- [ ] Verwijder oude component referenties die niet meer gebruikt worden

---

## FASE 5: Branding afronden (WEEK 2)
*Geschatte tijd: 2-3 uur*

### 5.1 FORGEdesk/Forgie → doen./Daan
- [ ] User-visible strings: 277 referenties in 47 bestanden
- [ ] Prioriteit: demo email `demo@forgedesk.nl`, component namen, service bestanden
- [ ] localStorage keys: `forgedesk_*` → `doen_*` (met migratie script)
- [ ] Code identifiers: `forgieService.ts` → `daanService.ts` etc.

---

## FASE 6: Performance optimalisatie (WEEK 2)
*Geschatte tijd: 4-6 uur*

### 6.1 Pagination implementeren
- [ ] `getKlanten()`: van 50.000 default → 50 per pagina + server-side pagination
- [ ] `getFacturen()`: idem
- [ ] `getDocumenten()`: voeg LIMIT toe
- [ ] Frontend: infinite scroll of pagination UI

### 6.2 N+1 queries fixen
- [ ] `getWerkbonItemsMetAfbeeldingen()`: batch query i.p.v. loop
- [ ] `createFactuurFromOfferte()`: batch INSERT i.p.v. loop
- [ ] `createFactuurFromWerkbon()`: idem
- [ ] `createCreditnota()`: idem

### 6.3 Dashboard batching
- [ ] Eén RPC endpoint voor alle dashboard data
- [ ] Of: `useDataInit` hook optimaliseren met batching

---

## FASE 7: GDPR & compliance (WEEK 3)
*Geschatte tijd: 3-4 uur*

### 7.1 Data export endpoint
- [ ] `/api/user-data-export` → exporteert alle organisatie data als JSON
- [ ] UI: knop in Instellingen → Profiel → "Download mijn data"

### 7.2 Account verwijdering
- [ ] Endpoint om account + alle data te verwijderen
- [ ] UI: knop in Instellingen met bevestiging

### 7.3 Session management
- [ ] Cross-tab session invalidatie via localStorage events
- [ ] "Uitloggen op alle apparaten" knop

---

## PRIORITEIT MATRIX

| Fase | Urgentie | Impact | Risico | Wanneer |
|------|----------|--------|--------|---------|
| 1. Security | KRITIEK | Data lekken voorkomen | Laag (alleen policies) | Vandaag |
| 2. Data integriteit | HOOG | Data verlies voorkomen | Medium (raakt queries) | Deze week |
| 3. Multi-tenant | HOOG | Team samenwerking | HOOG (grootste wijziging) | Volgende week |
| 4. TypeScript | MEDIUM | Stabiliteit | Laag | Volgende week |
| 5. Branding | MEDIUM | Professioneel | Laag | Week 2 |
| 6. Performance | MEDIUM | Schaal | Medium | Week 2 |
| 7. GDPR | MEDIUM | Compliance | Laag | Week 3 |

---

## DEFINITION OF DONE per fase

- [ ] `npm run build` slaagt
- [ ] `npx tsc --noEmit` — geen NIEUWE errors
- [ ] Handmatig getest op localhost
- [ ] Geen regressie in bestaande functionaliteit
- [ ] Migraties getest op staging database

---

## Architectuur

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
    |   |-- forgieService.ts (Daan AI email functies)
    |   |-- storageService.ts (bestanden)
    |
    v
Supabase (of localStorage in demo modus)
    |-- PostgreSQL (database)
    |-- Auth (JWT authenticatie)
    |-- Storage (bestanden)
    |-- Edge Functions (optioneel, voor server-side logica)
```

> **Noot:** Het oorspronkelijke diagram is opgesteld in een single-user context. In productie is alle data gefilterd op `organisatie_id` — alle service-calls in `supabaseService.ts` opereren binnen de organisatie-scope van de ingelogde gebruiker (via RLS + defense-in-depth filters).

---

## Database Schema (referentie)

> **⚠️ Referentie-schema, geen authoritative source.** De daadwerkelijke schema is 46 migraties in `supabase/migrations/`. Bij conflict: migrations winnen.

```sql
-- Profiles (extends Supabase auth.users)
-- Per-user tabel; user_id (= id) is correct als isolatie-grens
-- organisatie_id koppelt de user aan een organisatie
CREATE TABLE profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  organisatie_id UUID REFERENCES organisaties(id),
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

-- Klanten (multi-tenant business-tabel)
CREATE TABLE klanten (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organisatie_id UUID NOT NULL REFERENCES organisaties(id),
  user_id UUID REFERENCES auth.users, -- aanmaker, niet isolatie-grens
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

-- Projecten (multi-tenant business-tabel)
CREATE TABLE projecten (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organisatie_id UUID NOT NULL REFERENCES organisaties(id),
  user_id UUID REFERENCES auth.users, -- aanmaker
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

-- Taken (multi-tenant business-tabel)
CREATE TABLE taken (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organisatie_id UUID NOT NULL REFERENCES organisaties(id),
  user_id UUID REFERENCES auth.users, -- aanmaker
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

-- Offertes (multi-tenant business-tabel)
CREATE TABLE offertes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organisatie_id UUID NOT NULL REFERENCES organisaties(id),
  user_id UUID REFERENCES auth.users, -- aanmaker
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

-- Offerte Items (geërft scope via offerte_id; geen eigen organisatie_id)
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

-- Documenten (multi-tenant business-tabel)
CREATE TABLE documenten (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organisatie_id UUID NOT NULL REFERENCES organisaties(id),
  user_id UUID REFERENCES auth.users, -- aanmaker
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

-- Emails (multi-tenant business-tabel)
CREATE TABLE emails (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organisatie_id UUID NOT NULL REFERENCES organisaties(id),
  user_id UUID REFERENCES auth.users, -- ontvanger/eigenaar van de mailbox-koppeling
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

-- Calendar Events (multi-tenant business-tabel)
CREATE TABLE events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organisatie_id UUID NOT NULL REFERENCES organisaties(id),
  user_id UUID REFERENCES auth.users, -- aanmaker
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

-- Grootboek (financieel, organisatie-scoped)
CREATE TABLE grootboek (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organisatie_id UUID NOT NULL REFERENCES organisaties(id),
  code TEXT NOT NULL,
  naam TEXT NOT NULL,
  categorie TEXT CHECK (categorie IN ('activa', 'passiva', 'omzet', 'kosten')),
  saldo NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- BTW Codes
-- TODO: tenant scope? Kan zowel systeem-tabel zijn (NL standaard 0/9/21%)
-- als per-organisatie configureerbaar (eigen codes per bedrijf).
-- Hieronder als per-organisatie aangenomen op basis van PVA-context.
CREATE TABLE btw_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organisatie_id UUID NOT NULL REFERENCES organisaties(id), -- TODO: tenant scope?
  code TEXT NOT NULL,
  omschrijving TEXT DEFAULT '',
  percentage NUMERIC DEFAULT 21,
  actief BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Kortingen (organisatie-eigen kortingsregels)
CREATE TABLE kortingen (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organisatie_id UUID NOT NULL REFERENCES organisaties(id),
  naam TEXT NOT NULL,
  type TEXT DEFAULT 'percentage' CHECK (type IN ('percentage', 'vast_bedrag')),
  waarde NUMERIC DEFAULT 0,
  voorwaarden TEXT DEFAULT '',
  actief BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI Chats
-- TODO: tenant scope? Chats kunnen per-user privé zijn (zoals nu single-user)
-- of organisatie-breed gedeeld. Voor nu beide kolommen — RLS bepaalt zichtbaarheid.
CREATE TABLE ai_chats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organisatie_id UUID NOT NULL REFERENCES organisaties(id), -- TODO: tenant scope?
  user_id UUID REFERENCES auth.users NOT NULL, -- privé per gebruiker
  rol TEXT CHECK (rol IN ('user', 'assistant')),
  bericht TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Nieuwsbrieven (multi-tenant business-tabel)
CREATE TABLE nieuwsbrieven (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organisatie_id UUID NOT NULL REFERENCES organisaties(id),
  user_id UUID REFERENCES auth.users, -- aanmaker
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
-- TODO: tenant scope? In single-user opzet was dit per-user.
-- In multi-tenant horen branding/pipeline/BTW% bij de organisatie,
-- terwijl persoonlijke voorkeuren (notificaties, theme) bij de user blijven.
-- Mogelijk uitsplitsen in `organisatie_settings` + `user_settings`.
CREATE TABLE app_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organisatie_id UUID NOT NULL REFERENCES organisaties(id), -- TODO: tenant scope?
  user_id UUID REFERENCES auth.users, -- TODO: per-user voorkeuren splitsen?
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

-- RLS Policies (organisatie-scoped — zie Fase 3.2 voor de definitieve versie)
CREATE POLICY "Users can view own profile" ON profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "Org members CRUD klanten" ON klanten FOR ALL USING (
  organisatie_id = (SELECT organisatie_id FROM profiles WHERE id = auth.uid())
);
CREATE POLICY "Org members CRUD projecten" ON projecten FOR ALL USING (
  organisatie_id = (SELECT organisatie_id FROM profiles WHERE id = auth.uid())
);
CREATE POLICY "Org members CRUD taken" ON taken FOR ALL USING (
  organisatie_id = (SELECT organisatie_id FROM profiles WHERE id = auth.uid())
);
CREATE POLICY "Org members CRUD offertes" ON offertes FOR ALL USING (
  organisatie_id = (SELECT organisatie_id FROM profiles WHERE id = auth.uid())
);
CREATE POLICY "Org members CRUD offerte_items" ON offerte_items FOR ALL USING (
  offerte_id IN (
    SELECT id FROM offertes
    WHERE organisatie_id = (SELECT organisatie_id FROM profiles WHERE id = auth.uid())
  )
);
CREATE POLICY "Org members CRUD documenten" ON documenten FOR ALL USING (
  organisatie_id = (SELECT organisatie_id FROM profiles WHERE id = auth.uid())
);
CREATE POLICY "Org members CRUD emails" ON emails FOR ALL USING (
  organisatie_id = (SELECT organisatie_id FROM profiles WHERE id = auth.uid())
);
CREATE POLICY "Org members CRUD events" ON events FOR ALL USING (
  organisatie_id = (SELECT organisatie_id FROM profiles WHERE id = auth.uid())
);
CREATE POLICY "Org members CRUD grootboek" ON grootboek FOR ALL USING (
  organisatie_id = (SELECT organisatie_id FROM profiles WHERE id = auth.uid())
);
CREATE POLICY "Org members CRUD btw_codes" ON btw_codes FOR ALL USING (
  organisatie_id = (SELECT organisatie_id FROM profiles WHERE id = auth.uid())
);
CREATE POLICY "Org members CRUD kortingen" ON kortingen FOR ALL USING (
  organisatie_id = (SELECT organisatie_id FROM profiles WHERE id = auth.uid())
);
CREATE POLICY "Users CRUD own ai_chats" ON ai_chats FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Org members CRUD nieuwsbrieven" ON nieuwsbrieven FOR ALL USING (
  organisatie_id = (SELECT organisatie_id FROM profiles WHERE id = auth.uid())
);
CREATE POLICY "Org members CRUD app_settings" ON app_settings FOR ALL USING (
  organisatie_id = (SELECT organisatie_id FROM profiles WHERE id = auth.uid())
);

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

## Contactinformatie

Voor technische vragen over de code, open een issue in de repository of neem contact op met het ontwikkelteam.
