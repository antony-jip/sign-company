# FORGEdesk - Complete App Blueprint

## Project Overview

**FORGEdesk** is een Vite + React + Supabase SaaS applicatie voor interne bedrijfsvoering van een signing/reclame bedrijf (sinds 1983). Het is een compleet CRM- en projectmanagement platform met gespecialiseerde features voor de sign-industrie.

**Tech Stack:**
- Frontend: Vite + React 18 + TypeScript 5.3
- Styling: Tailwind CSS 3.4 + Radix UI components
- Database: Supabase (PostgreSQL + Auth)
- Backend: Vercel Serverless Functions (Node.js)
- AI: Anthropic Claude (server-side via API)
- Overig: React Router v6, Recharts, jsPDF, Stripe, Mollie, FAL-AI

---

## 1. Directory Structure

```
forgedesk/
├── index.html                  # HTML entry point
├── package.json                # Dependencies & scripts
├── vite.config.ts              # Vite config met @ alias
├── tsconfig.json               # Strict mode, ES2020 target
├── tailwind.config.js          # Custom design system
├── postcss.config.js           # PostCSS setup
├── vercel.json                 # Deployment config
├── .env.example                # Environment variables template
│
├── src/                        # Frontend Application
│   ├── main.tsx                # React entry point met error boundary
│   ├── App.tsx                 # Router setup met 50+ routes
│   ├── index.css               # Global styles (Tailwind)
│   │
│   ├── components/             # 44 subdirectories, 170+ components
│   │   ├── ai/                 # AI text generator, Forgie chat
│   │   ├── approval/           # Klant goedkeuringsworkflow
│   │   ├── auth/               # Login, register, protected routes
│   │   ├── bestelbonnen/       # Bestelbonnen (purchase orders)
│   │   ├── betaling/           # Betaalpagina's (Mollie/Stripe)
│   │   ├── booking/            # Publiek boekingssysteem
│   │   ├── calendar/           # Dag/week/maand views
│   │   ├── clients/            # Klantbeheer + import
│   │   ├── dashboard/          # 15 dashboard widgets
│   │   ├── deals/              # Deal pipeline
│   │   ├── documents/          # Documentbeheer
│   │   ├── email/              # E-mail client met hooks
│   │   ├── financial/          # Financiele instellingen (BTW, grootboek)
│   │   ├── forecast/           # Sales forecast
│   │   ├── forgie/             # AI assistent widget
│   │   ├── import/             # Data import
│   │   ├── invoices/           # Factuur aanmaak/bewerking
│   │   ├── landing/            # Landing page (publiek)
│   │   ├── layouts/            # AppLayout, Sidebar, Header
│   │   ├── leads/              # Lead capture formulieren
│   │   ├── leveringsbonnen/    # Leveringsbonnen
│   │   ├── montage/            # Montage planning
│   │   ├── nacalculatie/       # Nacalculatie
│   │   ├── newsletter/         # Nieuwsbrief builder
│   │   ├── notifications/      # Notificatie centrum
│   │   ├── offerte/            # Publieke offerte viewer
│   │   ├── planning/           # Planning/scheduling
│   │   ├── portaal/            # Klantportaal
│   │   ├── projects/           # Projectbeheer
│   │   ├── quotes/             # Offerte aanmaak & pipeline
│   │   ├── reports/            # Rapportages/analytics
│   │   ├── settings/           # App instellingen
│   │   ├── shared/             # Global search, command palette
│   │   ├── tabs/               # Tab bar component
│   │   ├── tasks/              # Takenbeheer
│   │   ├── team/               # Teambeheer
│   │   ├── timetracking/       # Tijdregistratie
│   │   ├── ui/                 # Radix UI component library (20+)
│   │   ├── uitgaven/           # Uitgaven/leveranciers
│   │   ├── visualizer/         # Sign design AI visualizer
│   │   └── voorraad/           # Voorraadbeheer
│   │
│   ├── contexts/               # Global state (7 providers)
│   │   ├── AppSettingsContext.tsx
│   │   ├── AuthContext.tsx
│   │   ├── LanguageContext.tsx
│   │   ├── PaletteContext.tsx
│   │   ├── SidebarContext.tsx
│   │   ├── TabsContext.tsx
│   │   └── ThemeContext.tsx
│   │
│   ├── hooks/                  # Custom React hooks (10)
│   │   ├── useData.ts
│   │   ├── useDataInit.ts      # localStorage seeding
│   │   ├── useDebounce.ts
│   │   ├── useDocumentStyle.ts
│   │   ├── useLocalStorage.ts
│   │   ├── useNavigateWithTab.ts
│   │   ├── usePortaalHerinnering.ts
│   │   ├── useSidebarLayout.ts
│   │   ├── useTabDirtyState.ts
│   │   └── useTabShortcuts.ts
│   │
│   ├── services/               # API & business logic (13 files)
│   │   ├── aiRewriteService.ts     # Text rewriting met Anthropic
│   │   ├── aiService.ts            # Chat completion, context retrieval
│   │   ├── authService.ts          # Supabase auth (demo mode fallback)
│   │   ├── emailTemplateService.ts
│   │   ├── forgieChatService.ts    # Forgie AI chat
│   │   ├── forgieService.ts
│   │   ├── gmailService.ts         # Gmail integratie
│   │   ├── importService.ts
│   │   ├── pdfService.ts           # PDF generatie
│   │   ├── storageService.ts       # Supabase storage
│   │   ├── supabaseClient.ts       # Client init
│   │   ├── supabaseService.ts      # 5340 regels - complete data layer
│   │   └── werkbonPdfService.ts
│   │
│   ├── types/                  # TypeScript interfaces
│   │   ├── index.ts            # 50+ entity types
│   │   ├── fal-ai-client.d.ts
│   │   └── visualizer.ts
│   │
│   ├── lib/                    # Utilities
│   │   ├── briefpapierGenerator.ts
│   │   ├── documentTemplates.ts
│   │   ├── export.ts
│   │   └── utils.ts
│   │
│   └── utils/                  # Helper functions
│       ├── autofillUtils.ts
│       ├── budgetUtils.ts
│       ├── emailUtils.ts
│       ├── forgieMarkdown.tsx
│       ├── localStorageUtils.ts
│       ├── logger.ts
│       ├── statusColors.ts
│       ├── visualizerDefaults.ts
│       └── zipBuilder.ts
│
├── api/                        # Vercel Serverless Functions (35 routes)
│   ├── ai.ts                       # AI chat endpoint met usage tracking
│   ├── ai-chat.ts                  # Context-aware chat
│   ├── ai-email.ts                 # Email draft generatie
│   ├── ai-rewrite.ts               # Text rewriting
│   ├── exact-auth.ts               # Exact Online OAuth
│   ├── exact-callback.ts           # OAuth callback
│   ├── exact-refresh.ts            # Token refresh
│   ├── exact-sync-factuur.ts       # Factuur sync
│   ├── kvk-zoeken.ts               # KVK bedrijfsregister zoeken
│   ├── kvk-basisprofiel.ts         # Bedrijfsprofiel opvragen
│   ├── probo-*.ts                  # Probo integratie (productcatalogus)
│   ├── analyze-inkoop-offerte.ts   # Inkoopofferte analyse
│   ├── mollie-*.ts                 # Mollie payment gateway
│   ├── stripe-webhook.ts           # Stripe payment webhook
│   ├── create-checkout-session.ts  # Checkout session
│   ├── fetch-emails.ts             # Gmail sync
│   ├── send-email.ts               # Email verzenden
│   ├── email-settings.ts           # SMTP configuratie
│   ├── read-email.ts               # Email parsing
│   ├── offerte-accepteren.ts       # Offerte acceptatie
│   ├── offerte-publiek.ts          # Publieke offerte view
│   ├── offerte-wijziging.ts        # Offerte wijzigingen
│   ├── goedkeuring-reactie.ts      # Goedkeuring feedback
│   ├── portaal-*.ts                # Klantportaal endpoints
│   ├── generate-signing-mockup.ts  # Design visualisatie
│   └── test-email-connection.ts    # SMTP validatie
│
└── supabase/                   # Database Configuration
    ├── schema.sql              # Hoofdschema (13 core tabellen)
    ├── rls_policies.sql        # Row-level security (49 tabellen)
    ├── seed.sql                # Demo data
    └── migrations/             # 26 migratie bestanden
        ├── 001_initial_tables.sql
        ├── 002_add_missing_tables.sql
        ├── ...
        └── 026_add_vervolgpapier.sql
```

---

## 2. Database Schema

### Core Tabellen (13 hoofd + 36 uitgebreid)

**Master Data:**
| Tabel | Doel |
|-------|------|
| `profiles` | Gebruikersprofielen (naam, bedrijfsinfo, instellingen) |
| `klanten` | Klanten (bedrijfsinfo, contactpersonen) |
| `projecten` | Projecten (gekoppeld aan klanten, budgettracking) |
| `taken` | Taken (projectgerelateerd, statustracking) |

**Offertes & Facturen:**
| Tabel | Doel |
|-------|------|
| `offertes` | Verkoopoffertes (concept → goedgekeurd → gefactureerd) |
| `offerte_items` | Offerte regelitems |
| `facturen` | Facturen (status, betalingstracking) |
| `factuur_items` | Factuur regelitems |

**Communicatie:**
| Tabel | Doel |
|-------|------|
| `emails` | E-mail cache (Gmail sync) |
| `events` | Kalender events |
| `ai_chats` | AI gesprekshistorie |

**Boekhouding:**
| Tabel | Doel |
|-------|------|
| `grootboek` | Grootboekrekeningen |
| `btw_codes` | BTW codes |

**Uitgebreide Tabellen (36 extra):**
- `werkbonnen`, `werkbon_items`, `werkbon_foto`
- `bestelbonnen`, `bestelbon_regel`
- `leveringsbonnen`, `leveringsbon_regel`
- `projecten_foto`, `projecten_toewijzing`
- `montage_afspraken`, `verlof`, `bedrijfssluitingsdag`
- `documenten` (met storage)
- `ai_usage` (tracking & limieten)
- `visualizer_credits`, `visualizer_instellingen`
- `signing_visualisaties`, `visualizer_api_log`, `visualizer_stats`
- `deal`, `deal_activiteit`
- `lead_formulier`, `lead_inzending`
- `nieuwsbrief`, `app_settings`
- `berichten` (interne notities)
- `inkoop_offerte`, `inkoop_regel`
- `klant_portaal`, `portaal_item`, `portaal_bestand`, `portaal_reactie`
- `voorraad_artikel`, `voorraad_mutatie`
- `leverancier`, `uitgaven`
- `booking_slot`, `booking_afspraak`
- `herinnering_template`
- `notificatie`, `app_notificatie`
- `intern_email_notitie`
- `exact_factuur_sync`
- `email_template`

**Key Relationships:**
```
profiles (user)
  └── klanten (clients)
        └── projecten (projects)
              ├── taken (tasks)
              ├── montage_afspraken (installations)
              └── projecten_foto (photos)
        └── offertes (quotes)
              └── offerte_items
              └── facturen (invoices)
                    └── factuur_items
```

**Security:** Alle tabellen hebben RLS (Row Level Security) met `user_id` scope voor multi-tenancy.

---

## 3. Architecture Patterns

### Routing (React Router v6)

```
/ (Dashboard)
├── /projecten, /klanten, /deals          # CRM core
├── /offertes, /inkoopoffertes            # Quoting
├── /facturen                              # Facturering
├── /planning, /montage, /kalender        # Scheduling
├── /email, /forgie                        # Communicatie
├── /visualizer                            # AI design tool
├── /portalen                              # Klantportaal
├── /team, /instellingen                   # Admin
├── /werkbonnen, /bestelbonnen            # Operationeel
├── /leveringsbonnen, /nacalculatie       # Operationeel
├── /voorraad, /uitgaven                   # Inventaris
├── /taken, /tijdregistratie              # Taakbeheer
├── /rapporten, /forecast                  # Analytics
├── /leads, /nieuwsbrieven                # Marketing
└── (publieke routes: /offerte, /portaal, /betaling, /booking)
```

### Component Layout Hierarchy

```
App (Router + Context Providers)
  ├── AppLayout (Sidebar + Header + TabBar)
  │   └── [Feature Layout]
  │       └── [List/Detail/Form Components]
  └── Public Routes (Portal, Payment, Booking, Landing)
```

### Context Providers (7 totaal)

| Context | Doel | Key State |
|---------|------|-----------|
| `AuthContext` | Authenticatie | user, session, isAuthenticated |
| `AppSettingsContext` | Profiel & settings | profile, app_settings |
| `ThemeContext` | Light/dark mode | theme, toggleTheme |
| `PaletteContext` | Kleur customisatie | palette, setPalette |
| `SidebarContext` | Sidebar state | isCollapsed, layoutMode |
| `TabsContext` | Open tabs beheer | activeTabs, currentTab |
| `LanguageContext` | I18n | language (nl/en) |

### Data Flow Pattern

```
Component → supabaseService (CRUD) → Supabase DB
                ↓ (fallback)
            localStorage (demo mode)
```

**`supabaseService.ts` (5340 regels):**
- Complete CRUD voor alle entiteiten
- Supabase + localStorage adapter pattern
- Safe date handling (`sanitizeDates`)
- JSON array parsing voor array velden

### Demo Mode

- Auto-creates demo user als Supabase niet geconfigureerd is
- Volledige app functionaliteit met localStorage backend
- Seeded demo data: 5 klanten, 3 projecten, 4 offertes, 15+ emails, 3 facturen
- Perfect voor testen en onboarding

---

## 4. Features & Modules

### CRM Core
- **Klanten:** Contactbeheer, adressen, KVK nummers, tags
- **Projecten:** Project lifecycle, budgettracking, teamtoewijzingen
- **Taken:** Takenbeheer met status (todo → bezig → review → klaar)
- **Deals:** Deal pipeline met meerdere fases

### Quoting & Sales
- **Offertes:** Volledige offerte aanmaak met regelitems
- **Pipeline:** Concept → Verzonden → Bekeken → Goedgekeurd → Gefactureerd
- **Publieke tokens** voor klantbeoordelingslinks
- **Smart Calculator:** Marge analyse, prijssuggesties
- **AI-assisted copy** voor productbeschrijvingen

### Facturering
- **Facturen:** Los of vanuit offertes
- **Betalingstracking:** Status (verzonden, betaald, vervallen)
- **Betaallinks:** Mollie/Stripe integratie
- **Herinneringstemplates:** Geautomatiseerde betalingsherinneringen
- **Exact Online export:** Boekhoudkoppeling

### E-mail & Communicatie
- **Gmail integratie** (fetch via IMAP)
- **E-mail reader** met volledige threading
- **Compose** met templates
- **Forgie:** Persistente AI assistent met projectcontext

### AI Features
- **Forgie Chat:** AI assistent met klant/project context
- **AI Text Generator:** Herschrijven, uitbreiden, vertalen
- **Email drafts:** AI-assisted compositie
- **Offerte suggesties:** AI-gegenereerde productbeschrijvingen
- **Usage tracking:** Maandelijkse kostenlimieten

### Visualizer (Sign Design AI)
- **AI-powered mockups** van signing designs
- **Credit systeem:** Prepaid credits voor generaties
- **FAL-AI backend** voor rendering

### Planning & Scheduling
- **Kalender views:** Dag, week, maand
- **Montage planning:** Gespecialiseerd voor sign installatie
- **Team scheduling** met beschikbaarheid

### Financieel
- **Grootboek:** Rekeningschema
- **BTW codes:** Belastingcodes
- **Forecast:** Omzetprognose
- **Rapportages:** Analytics dashboards

### Inventaris & Inkoop
- **Voorraad:** Voorraadniveaus tracking
- **Leveranciers:** Leveranciersbeheer
- **Uitgaven:** Kostentracking
- **Bestelbonnen:** Inkooporders
- **Probo integratie:** Materiaalcatalogus

### Operationeel
- **Werkbonnen:** Veldtechnicus documentatie
- **Leveringsbonnen:** Verzendingstracking
- **Nacalculatie:** Kostenbeoordeling na afronding
- **Tijdregistratie:** Urenregistratie

### Marketing
- **Lead Capture:** Publieke formulieren
- **Nieuwsbrief Builder:** E-mail campagnes
- **Klantportaal:** Veilige klanttoegang
- **Public Booking:** Afspraken inplannen

---

## 5. Integraties

| Integratie | Doel | Type |
|------------|------|------|
| **Supabase** | Database, Auth, Storage | Core |
| **Anthropic Claude** | AI text generatie | AI |
| **FAL-AI** | Sign design visualisatie | AI |
| **Exact Online** | Boekhoudkoppeling | OAuth |
| **Gmail** | E-mail inbox sync | IMAP |
| **Mollie** | Betalingsverwerking | Payment |
| **Stripe** | Alternatieve payment gateway | Payment |
| **Probo** | Signing materiaalcatalogus | API |
| **KVK** | Bedrijfsregister lookup | API |

---

## 6. Authenticatie

**Flow:**
1. Gebruiker registreert/logt in via Supabase Auth
2. `authService.ts` handelt auth methoden af
3. Demo mode fallback als Supabase niet geconfigureerd is
4. Session opgeslagen in Supabase session storage
5. `<ProtectedRoute>` wrapper checkt auth state

**Methoden:** signIn, signUp, signOut, getSession, resetPassword, onAuthStateChange

---

## 7. Styling System

**Tailwind Config:**
- **Pastel signature kleuren:** blush, sage, mist, cream, lavender, peach
- **Module accent kleuren:** Per-feature kleuren (mod-projecten, mod-offertes, etc.)
- **Animaties:** float, marquee, shimmer, orb-float, fade-up
- **Fonts:** Plus Jakarta Sans (display), DM Mono (mono), Outfit

---

## 8. Build & Deployment

```bash
# Development
npm run dev          # Vite dev server (http://localhost:5173)
npm run build        # Production build
npm run typecheck    # TypeScript validatie
npm run preview      # Preview production build
```

**Deployment (Vercel):**
- Frontend: Automatisch vanuit main branch
- API routes: Vercel serverless functions
- Database: Supabase managed PostgreSQL
- Storage: Supabase S3-compatible buckets

---

## 9. Environment Variables

**Frontend (VITE_ prefix):**
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

**Server-side (geen prefix):**
- `ANTHROPIC_API_KEY` - AI chat
- `SUPABASE_SERVICE_ROLE_KEY` - Admin database access
- `EMAIL_ENCRYPTION_KEY` - SMTP wachtwoord encryptie
- Mollie, Stripe, Exact Online, KVK, FAL-AI keys
