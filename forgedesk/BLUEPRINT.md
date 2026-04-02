# doen. — App Blueprint (april 2026)

## Overzicht
**doen.** is een Vite + React 18 SaaS app voor interne bedrijfsvoering van een signing/reclame bedrijf. Stack: TypeScript, Tailwind CSS, Shadcn/UI, Supabase (auth + database), Trigger.dev (achtergrondtaken).

**AI-assistent:** Daan
**Locatie:** `forgedesk/` subfolder
**Data-isolatie:** `organisatie_id` (niet user_id) — teamleden delen data

---

## Tech Stack
- **Frontend:** Vite, React 18, TypeScript, Tailwind CSS, Shadcn/UI (Radix)
- **Backend:** Supabase (PostgreSQL + Auth + RLS + Storage)
- **Payments:** Stripe (abonnementen), Mollie (facturen)
- **Email:** IMAP/Gmail integratie, Resend (transactioneel)
- **AI:** Anthropic Claude (Daan assistent), FAL AI (mockups)
- **Background jobs:** Trigger.dev v4
- **Accounting:** Exact Online koppeling
- **Deployment:** Vercel

---

## Routes

### Publiek (geen auth)
| Route | Component | Doel |
|-------|-----------|------|
| `/login` | LoginPage | Inloggen |
| `/register` | RegisterPage | Registreren |
| `/wachtwoord-vergeten` | ForgotPasswordPage | Wachtwoord reset |
| `/boeken/:userId` | PublicBookingPage | Klant boekt afspraak |
| `/betalen/:token` | BetaalPagina | Mollie betaling |
| `/offerte-bekijken/:token` | OffertePubliekPagina | Klant bekijkt offerte |
| `/formulier/:token` | LeadFormulierPubliek | Lead formulier |
| `/portaal/:token` | PortaalPagina | Klantportaal |

### Beveiligd (auth vereist)
| Route | Component | Doel |
|-------|-----------|------|
| `/` | FORGEdeskDashboard | Dashboard |
| `/projecten` | ProjectsList | Projectenlijst (drag columns, team toewijzing, snelle taak) |
| `/projecten/nieuw` | ProjectCreate | Nieuw project |
| `/projecten/:id` | ProjectDetail | Project cockpit (taken, portaal, acties) |
| `/projecten/:id/tijdregistratie` | TijdregistratieLayout | Tijdregistratie |
| `/projecten/:id/nacalculatie` | NacalculatieLayout | Nacalculatie |
| `/klanten` | ClientsLayout | Klantenlijst |
| `/klanten/:id` | ClientProfile | Klantprofiel |
| `/deals` | DealsLayout | Deals/opportunities |
| `/offertes` | QuotesPipeline | Offerte pipeline |
| `/offertes/nieuw` | QuoteCreation | Offerte maken |
| `/offertes/:id/preview` | ForgeQuotePreview | Offerte preview |
| `/planning` | PlanningLayout | Kalender + montage planning |
| `/planning?modus=montage` | MontagePlanningLayout | Montage weekview |
| `/taken` | TasksLayout | Taken beheer (week + maand) |
| `/email` | EmailLayout | Email hub |
| `/facturen` | FacturenLayout | Facturen overzicht |
| `/facturen/nieuw` | FactuurEditor | Factuur maken |
| `/werkbonnen` | WerkbonnenLayout | Werkbonnen overzicht |
| `/werkbonnen/:id` | WerkbonDetail | Werkbon detail |
| `/bestelbonnen` | BestelbonnenLayout | Bestelbonnen |
| `/leveringsbonnen` | LeveringsbonnenLayout | Leveringsbonnen/pakbonnen |
| `/financieel` | FinancialLayout | Financieel overzicht |
| `/voorraad` | VoorraadLayout | Voorraad beheer |
| `/rapportages` | RapportagesLayout | Rapportages |
| `/forecast` | ForecastLayout | Forecast |
| `/documenten` | DocumentsLayout | Documenten |
| `/leads` | LeadCaptureLayout | Leads |
| `/portalen` | PortalenOverzicht | Portalen beheer |
| `/instellingen` | SettingsLayout | Instellingen |
| `/team` | TeamLayout | Team beheer |
| `/ai` | FORGEdeskAIChat | AI chat |
| `/forgie` | ForgieChatPage | Daan assistent |
| `/kennisbank` | KennisbankPage | Kennisbank |
| `/booking` | BookingBeheer | Booking slots beheer |
| `/visualizer` | VisualizerLayout | Signing visualizer |

---

## Modules & Features

### 1. Projecten
- Projectenlijst met versleepbare kolommen (project/klant), keyboard shortcuts (N, /)
- Team-kolom met inline medewerker toewijzing (popover)
- Snelle taak dialog vanuit projectrij (titel, deadline snelknoppen, toewijzing)
- Actie-iconen tussen project en klant kolom (camera, taak+, dropdown)
- Project cockpit: taken checklist, activiteitenfeed, portaal, fase-indicator
- Acties: taak, offerte, werkbon, pakbon, montage, factuur
- Tijdregistratie, nacalculatie, foto's

### 2. Offertes
- Pipeline view met drag & drop
- Offerte editor met calculatie, templates, versioning
- Smart calculator, autofill
- Publieke offerte pagina voor klanten
- Follow-up automatisering (Trigger.dev)
- PDF generatie + preview

### 3. Planning & Montage
- **Kalender modus:** Week time-grid (06:00-19:00) met sidebar, mini-kalender
- **Montage modus:** 5-kolommen weekview met drag & drop
- **Multi-monteur timeline:** Horizontale banen per monteur bij "Overzicht"
- **Drag-to-resize:** Sleep onderkant kaart om duur aan te passen (15 min stappen)
- **Feestdagen:** Visueel gemarkeerd (rood) + drop geblokkeerd + waarschuwing in dialog
- **Weer-strip:** Open-Meteo API (temp, neerslag per dag)
- **Conflict detectie:** Overlappende montages per monteur
- **Print:** Weekoverzicht (alle dagen, per monteur filterbaar)
- **Taken view:** Week + maand, prioriteiten, deadlines, zoom

### 4. Klantportaal
- Per-project portaal met unieke token
- Feed: berichten, documenten, goedkeuringen
- Klant kan reageren, bestanden uploaden, goedkeuren/revisie
- Email notificaties + herinneringen (Trigger.dev)
- Uitschakelbaar via `portaal_module_actief` setting (verbergt uit cockpit)

### 5. Facturatie
- Factuur editor met items, BTW, kortingen
- Mollie betaallinks
- Stripe abonnementen
- Exact Online sync
- Herinnering templates, UBL export

### 6. Werkbonnen
- Aanmaken vanuit project (met of zonder offerte items)
- Monteur feedback, klanthandtekening
- Foto's (voor/na), tekeningen
- PDF export met briefpapier optie

### 7. Pakbonnen / Leveringsbonnen
- **Vanuit offerte:** Items overnemen met afmetingen en aantallen
- **Losse pakbon:** Zelf regels toevoegen
- **Leeg invulformulier:** 8 lege regels, ter plaatse invullen bij aflevering
- Klanthandtekening, locatiegegevens

### 8. Email
- IMAP/Gmail integratie
- Templates, sequences
- CRM sidebar met klantcontext
- AI-assisted schrijven
- Interne notities

### 9. AI (Daan)
- Chat assistent
- Tekst genereren/herschrijven
- Email drafting
- Briefings (kort + bullets)

### 10. Leads
- Formulier builder
- Publieke formulier pagina
- Inzendingen beheer
- KVK lookup

---

## Services (src/services/)

| Service | Doel |
|---------|------|
| `supabaseService.ts` | Core CRUD (5700+ regels — **altijd grep, nooit cat**) |
| `klantService.ts` | Klanten CRUD |
| `offerteService.ts` | Offertes, items, calculatie, templates |
| `projectService.ts` | Projecten, taken, foto's |
| `factuurService.ts` | Facturen, herinneringen |
| `werkbonService.ts` | Werkbonnen, items, afbeeldingen |
| `boekhoudingService.ts` | Boekhouding, leveringsbonnen, bestelbonnen, uitgaven |
| `emailService.ts` | Email CRUD, notities, bijlagen |
| `portaalService.ts` | Portaal CRUD, instellingen |
| `storageService.ts` | File upload/download (Supabase Storage) |
| `authService.ts` | Auth (signIn, signUp, signOut, resetPassword) |
| `aiService.ts` | AI integraties |
| `forgieChatService.ts` | Daan chat |
| `pdfService.ts` | PDF generatie |
| `profielService.ts` | Profiel, medewerkers, audit |
| `tijdregistratieService.ts` | Tijdregistratie |
| `voorraadService.ts` | Voorraad, mutaties |
| `bookingService.ts` | Booking slots |
| `importService.ts` | Data import |
| `kbService.ts` | Kennisbank |

---

## Types (src/types/index.ts) — 60+ interfaces

**Domein:** `Klant` · `Contactpersoon` · `Vestiging` · `Medewerker` · `Project` · `Taak` · `Offerte` · `OfferteItem` · `Factuur` · `FactuurItem` · `Deal`

**Documenten:** `Werkbon` · `WerkbonItem` · `Leveringsbon` · `LeveringsbonRegel` · `Bestelbon` · `BestelbonRegel` · `Document`

**Planning:** `MontageAfspraak` · `CalendarEvent` · `BookingSlot` · `BookingAfspraak` · `Feestdag` · `Tijdregistratie`

**Portaal:** `ProjectPortaal` · `PortaalItem` · `PortaalReactie` · `PortaalInstellingen`

**Email:** `Email` · `EmailTracking` · `EmailSequence` · `IngeplandEmail`

**Systeem:** `Profile` · `Organisatie` · `AppSettings` · `AuditLogEntry` · `Notificatie`

---

## Trigger.dev Tasks (src/trigger/)

| Task | Doel |
|------|------|
| `offerte-opvolging.ts` | Automatische offerte follow-up |
| `email-opvolging.ts` | Email follow-up sequenties |
| `portaal-notificatie.ts` | Portaal email notificaties |
| `portaal-herinnering.ts` | Portaal herinneringen |
| `portaal-activiteit-log.ts` | Portaal activiteit logging |
| `onboarding-sequence.ts` | Onboarding emails |
| `database-backup.ts` | Database backup |
| `weekly-digest.ts` | Wekelijkse samenvatting |

---

## API Routes (api/) — 50+ endpoints

**Email:** `send-email`, `read-email`, `fetch-emails`
**AI:** `ai`, `ai-chat`, `ai-email`, `ai-rewrite`, `ai-followup-email`, `generate-signing-mockup`
**Exact Online:** `exact-auth`, `exact-callback`, `exact-sync-factuur`, `exact-dagboeken`, `exact-btw-codes`, `exact-grootboeken`
**Portaal:** `portaal-create`, `portaal-get`, `portaal-items-get`, `portaal-upload`, `portaal-reactie`, `portaal-bekeken`
**Betaling:** `mollie-create-payment`, `mollie-webhook`, `stripe-webhook`, `create-checkout-session`
**Team:** `invite-team-member`, `manage-team-member`
**Leads:** `kvk-zoeken`, `kvk-basisprofiel`

---

## Contexts (7 providers)
`AuthProvider` · `AppSettingsProvider` · `ThemeProvider` · `PaletteProvider` · `LanguageProvider` · `SidebarProvider` · `TabsProvider`

## Hooks (20 custom hooks)
**Data:** `useData` · `useDataInit` · `useLocalStorage`
**UI:** `useDebounce` · `useCountUp` · `useOnlineStatus` · `useUnsavedWarning`
**Business:** `useContactManagement` · `useEmailCompose` · `useQuoteClipboard` · `useQuoteVersioning` · `usePortaalHerinnering` · `useTrialGuard`
**Navigation:** `useNavigateWithTab` · `useTabShortcuts` · `useSidebarLayout`

## Utils (14 bestanden)
`feestdagen.ts` · `auditLogger.ts` · `projectFases.ts` · `statusColors.ts` · `logger.ts` · `emailUtils.ts` · `budgetUtils.ts` · `zipBuilder.ts` · `localStorageUtils.ts` · `forgieMarkdown.tsx`

---

## Database (46 migrations, 40+ tabellen)

**Kern:** organisaties, profiles, klanten, contactpersonen, vestigingen, medewerkers
**Sales:** offertes, offerte_items, offerte_versies, calculatie_products, deals
**Projecten:** projecten, project_toewijzingen, taken, montage_afspraken
**Financieel:** facturen, factuur_items, kostenplaatsen, grootboeken, btw_codes
**Documenten:** werkbonnen, werkbon_items, bestelbonnen, leveringsbonnen
**Planning:** calendar_events, booking_slots, booking_afspraken
**Portaal:** project_portalen, portaal_items, portaal_reacties, portaal_bestanden
**Email:** emails, email_sequences
**Systeem:** app_settings, notificaties, import_logs

**RLS:** Alle tabellen hebben Row Level Security op `organisatie_id`

---

## Bekende beperkingen

- `supabaseService.ts` is 5700+ regels — **altijd grep gebruiken, nooit volledig lezen**
- `types/index.ts` is 1700+ regels — zelfde aanpak
- Vercel serverless functions kunnen geen lokale modules importeren — alles inline
- `audit_log` tabel is gestubbed maar nog niet geïmplementeerd
- `PlanningInstellingen` type bestaat maar wordt nog niet gebruikt

---

## Coderegels

- **Nederlandse** variabelen en functies: klant, offerte, werkbon, medewerker
- **PascalCase** voor types/interfaces: Klant, Offerte, FactuurItem
- **PascalCase** voor componenten, **camelCase** voor services/utils
- **Engelse** commit messages, één concern per commit
- **Tailwind** voor styling, geen CSS modules
- **TypeScript strict** mode
- Geen nieuwe npm packages zonder goedkeuring
- Geen overbodige comments — code moet zelfverklarend zijn
- Niet refactoren tenzij expliciet gevraagd
- Bij grote taken (>3 bestanden, >100 regels): eerst analyseren, dan rapporteren
- `npm run build` na elke wijziging
