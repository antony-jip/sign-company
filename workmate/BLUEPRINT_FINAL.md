# WORKMATE — Technisch Blueprint (Final)

## Architectuur

| Laag | Technologie | Versie |
|------|------------|--------|
| Frontend | React + TypeScript | 18.x |
| Bundler | Vite | 5.x |
| Styling | Tailwind CSS + shadcn/ui | 3.x |
| Backend | Supabase (met localStorage fallback) | — |
| Charts | Recharts | 2.x |
| PDF | jsPDF + jspdf-autotable | — |
| Icons | Lucide React | — |
| Routing | React Router DOM | 6.x |
| State | React Context + useState/useMemo | — |
| Auth | Supabase Auth (met mock fallback) | — |

## Projectstructuur

```
workmate/
├── src/
│   ├── components/          # Feature-gebaseerde componentmappen
│   │   ├── ai/              # AI Assistent chat
│   │   ├── auth/             # Login, Registratie
│   │   ├── bestelbonnen/     # Bestelbonnen CRUD + detail
│   │   ├── betaling/         # Publieke betaalpagina
│   │   ├── booking/          # Booking beheer + publieke pagina
│   │   ├── calendar/         # Planning/kalender
│   │   ├── clients/          # Klanten CRUD + 360° profiel
│   │   ├── dashboard/        # Dashboard widgets (8 stuks)
│   │   ├── deals/            # Sales pipeline + deal detail
│   │   ├── documents/        # Documenten beheer
│   │   ├── email/            # Email (inbox, compose, reader, sequences, team inbox)
│   │   ├── financial/        # Financieel overzicht + instellingen
│   │   ├── forecast/         # Sales forecasting
│   │   ├── import/           # Data import
│   │   ├── invoices/         # Facturen + creditnota's + voorschotten
│   │   ├── layouts/          # Sidebar + AppLayout
│   │   ├── leads/            # Lead capture + formulieren + inzendingen
│   │   ├── leveringsbonnen/  # Leveringsbonnen CRUD
│   │   ├── montage/          # Montage planning
│   │   ├── nacalculatie/     # Nacalculatie
│   │   ├── newsletters/      # Nieuwsbrief builder
│   │   ├── notifications/    # Notificatiecentrum
│   │   ├── offerte/          # Publieke offerte pagina
│   │   ├── projects/         # Projecten CRUD + detail + offerte editor
│   │   ├── quotes/           # Offerte wizard + pipeline + calculator
│   │   ├── reports/          # Rapportages (omzet, medewerkers, voorraad)
│   │   ├── settings/         # Instellingen (profiel, bedrijf, calculatie, etc.)
│   │   ├── shared/           # Gedeelde componenten (KvK zoeken)
│   │   ├── tasks/            # Takenbeheer
│   │   ├── team/             # Teambeheer
│   │   ├── timetracking/     # Tijdregistratie + timer
│   │   ├── ui/               # shadcn/ui primitieven
│   │   ├── uitgaven/         # Uitgavenbeheer
│   │   ├── voorraad/         # Voorraadbeheer
│   │   └── werkbonnen/       # Werkbonnen CRUD + detail
│   ├── contexts/             # React contexts (Auth, AppSettings, Theme, etc.)
│   ├── hooks/                # Custom hooks (useData, useDebounce, etc.)
│   ├── lib/                  # Utility libraries (utils, export)
│   ├── services/             # Backend services (supabase, auth, gmail, pdf, ai)
│   ├── types/                # TypeScript types (index.ts — 67+ interfaces)
│   └── utils/                # Utilities (logger, budgetUtils, emailUtils)
├── public/                   # Statische bestanden
└── package.json
```

## Datamodel (Kerntypes)

| Type | Kernvelden | Relaties |
|------|-----------|----------|
| Klant | bedrijfsnaam, email, contactpersonen[] | → Projecten, Deals, Offertes, Facturen |
| Project | naam, status, budget, voortgang | → Klant, Taken, Tijdregistraties |
| Deal | titel, fase, verwachte_waarde, kans% | → Klant, Offerte(s), Project |
| Offerte | nummer, titel, status, totaal | → Klant, Deal, Project, Items |
| Factuur | nummer, status, totaal, btw | → Klant, Project, Offerte, Items |
| Werkbon | nummer, status, regelitems[] | → Project, Klant |
| Tijdregistratie | datum, uren, project_id | → Project, Medewerker |
| Email | onderwerp, van, aan, inhoud | → Labels, Bijlagen, Notities |
| Medewerker | naam, functie, uurtarief | → Projecten, Tijdregistraties |

## Data Ketens

### Keten 1: Lead → Klant → Deal → Offerte → Factuur
1. LeadFormulierPubliek vangt lead op → maakt automatisch Klant + Deal
2. DealDetail → "Maak offerte" → QuoteCreation (met deal_id + klant_id)
3. Offerte goedgekeurd → Converteer naar Project + Factuur

### Keten 2: Voorschot Flow
1. Maak voorschotfactuur (% van offerte totaal)
2. Bij eindafrekening: betaalde voorschotten worden afgetrokken
3. Verrekende voorschotten worden gemarkeerd

### Keten 3: Tijd → Factuur
1. Tijdregistratie per project per medewerker
2. Handmatige factuur aanmaken vanuit tijdregistratie

### Keten 4: Uitgaven → Nacalculatie
1. Uitgaven gekoppeld aan projecten
2. Nacalculatie berekent: budget vs werkelijk (uren + uitgaven)

### Keten 5: Klant 360° View
ClientProfile toont: Projecten, Deals, Offertes, Facturen, Tijdregistratie, Email, Documenten

## Nummering

| Document | Format | Methode |
|----------|--------|---------|
| Offerte | `{PREFIX}-{JAAR}-{NNN}` | Sequentieel (hoogste + 1) |
| Factuur | `FAC-{JAAR}-{NNN}` | Sequentieel (hoogste + 1) |
| Werkbon | `WB-{JAAR}-{NNN}` | Sequentieel (hoogste + 1) |
| Bestelbon | `BST-{JAAR}-{NNN}` | Sequentieel (hoogste + 1) |
| Leveringsbon | `LB-{JAAR}-{NNN}` | Sequentieel (hoogste + 1) |
| Uitgave | `UIT-{JAAR}-{NNN}` | Sequentieel (hoogste + 1) |

## Financiële Berekeningen

- **round2()**: Centrale functie in `@/utils/budgetUtils.ts` — `Math.round((n + Number.EPSILON) * 100) / 100`
- **BTW**: Standaard 21%, instelbaar per regel
- **Subtotaal**: Som van (aantal × eenheidsprijs − korting), per regel afgerond
- **BTW bedrag**: Som van (regelsubtotaal × btw%), per regel afgerond
- **Totaal**: `round2(subtotaal + btwBedrag)`
- **formatCurrency()**: `Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' })`

## Publieke Routes (buiten auth)

| Route | Component | Beveiliging |
|-------|-----------|------------|
| `/formulier/:token` | LeadFormulierPubliek | Token-validatie |
| `/betalen/:token` | BetaalPagina | Token-validatie |
| `/offerte-bekijken/:token` | OffertePubliekPagina | Token-validatie |
| `/boeken/:userId` | PublicBookingPage | User-ID validatie |
| `/goedkeuring/:token` | ClientApprovalPage | Token-validatie |

## Feature Completeness

### Basis (8 features) ✅
Dashboard, Projecten, Klanten, Offertes, Facturen, Kalender, Documenten, Taken

### Tier 1 (4 features) ✅
Werkbonnen+Factuurkoppeling, Betalingsherinneringen, Budget-meldingen, Creditnota's+Voorschotten

### Tier 2 (5 features) ✅
Online Betaling, Offerte Tracking, Bestelbonnen, Leveringsbonnen, Voorraad

### Tier 3 (7 features) ✅
Sales Pipeline, Lead Capture, Gedeelde Inbox, KvK Opzoeken, Sales Forecasting, Kant-en-klare Rapporten

### Nice-to-Have (8 features) ✅
Email Sequencing, Montage Planning, Financieel Dashboard, Booking, Nieuwsbrieven, Data Import, AI Chat, Notificaties
