# doen. — Blueprint

Referentiedocument voor projectcontext. Bedoeld om in één keer in een Claude.ai-gesprek te uploaden, zodat de sparringpartner zonder verdere uitleg weet wat er in de app zit.

Bron: `~/sign-company/forgedesk/` — gegenereerd op basis van router, services, types, trigger-tasks, API-routes, components, migrations, CLAUDE.md, LOG.md, ANTONY_TODO.md.

---

## 1. Wat is doen.

**doen.** is een all-in-one bedrijfsplatform voor kleine creatieve tradespeople — primair signmakers en signing-bedrijven (drie tot dertig man). Het bundelt CRM (klanten, deals, leads), offerte- en factuurmodule, projectcockpit, montageplanning, werkbonnen, voorraad, inkoopfacturen, klantportaal, e-mail (IMAP/SMTP), AI-assistent ("Daan") en een 3D signing-visualizer in één SaaS. Concurrenten in dezelfde niche: JamesPro (incumbent, zwaar/oud), KraftWurx, BCS, losse werkbon-apps. doen. positioneert zich als modern, mobielvriendelijk en radicaal transparant (binnen één organisatie ziet iedereen alles). Naamgeving in app is Nederlands; AI heet **Daan** (intern oud: Forgie).

---

## 2. Tech stack

| Laag | Keuze |
|---|---|
| Frontend | React 18, TypeScript 5.3, Vite 5 |
| Routing | React Router DOM 6 (lazy-loaded routes) |
| UI | Tailwind 3.4, Radix UI (volledige suite), Shadcn-conventies, Framer Motion 12, Lucide icons, Sonner toasts, Recharts |
| Forms / validatie | Zod 3.22, zxcvbn (password strength) |
| Backend | Supabase (Postgres + Auth + Storage + RLS) |
| Serverless | Vercel Functions (`api/*.ts`, standalone — geen `src/` imports) |
| Background jobs | Trigger.dev SDK 4.4 |
| Rate limit / cache | Upstash Redis + Ratelimit |
| Payments | Mollie (abonnement + Studio-credits + klantbetalingen via API) |
| AI | Anthropic SDK (Claude) — Daan-assistent + email/PDF-extractie; FAL AI (image gen) |
| Email | Resend (transactioneel), Nodemailer + imapflow + mailparser (user-SMTP/IMAP) |
| PDF / docs | jsPDF + autotable, react-pdf, XLSX, DOMPurify |
| Errors | Sentry (React + Node) |
| Tests | Vitest 4 + coverage-v8 |
| Deploy | Vercel (statisch + serverless) |
| Node | 18+ (geen `engines` pin) |

---

## 3. Routes

Lazy-loaded via `React.lazy()`. Authentication via `<ProtectedRoute>`. Adaptive desktop/mobiel via `useMediaQuery()`.

### 3.1 Publieke routes (geen auth)

| Pad | Component | Doel |
|---|---|---|
| `/login` | LoginPage | Login bestaande gebruiker |
| `/register` | RegisterPage | Registratie nieuwe gebruiker |
| `/registreren` | RegisterPage | NL-alias voor `/register` |
| `/check-inbox` | CheckInboxPage | E-mailverificatie na registratie |
| `/wachtwoord-vergeten` | ForgotPasswordPage | Reset-aanvraag |
| `/wachtwoord-resetten` | ResetPasswordPage | Reset via token |
| `/goedkeuring/:token` | GoedkeuringRedirect | Redirect naar `/portaal/:token` (legacy) |
| `/boeken/:userId` | PublicBookingPage | Klant boekt afspraak (online booking) |
| `/betalen/:token` | BetaalPagina | Klant-betaalpagina (Mollie) |
| `/betaald` | BetaaldPagina | Bevestiging na Mollie-betaling |
| `/offerte-bekijken/:token` | OffertePubliekPagina | Openbare offerte-preview |
| `/formulier/:token` | LeadFormulierPubliek | Publiek leadformulier |
| `/portaal/:token` | PortaalPagina | Klantportaal-ingang |

### 3.2 Onboarding (auth vereist)

| Pad | Component | Doel |
|---|---|---|
| `/welkom` | WelkomPagina | Eerste onboarding |
| `/team-welkom` | TeamWelkomPagina | Team-onboarding |
| `/onboarding` | OnboardingWizard | Setup-wizard |

### 3.3 Beveiligde routes (onder `<AppLayout>`)

**Guard-volgorde in `ProtectedRoute`**: `isAuthenticated` → `organisatieId` → organisatie geladen → `onboarding_compleet` (anders redirect naar `/welkom` of `/onboarding`).

| Pad | Component | Doel |
|---|---|---|
| `/` | FORGEdeskDashboard | Hoofddashboard, KPI's, snelle acties |
| `/projecten`, `/projecten/nieuw`, `/projecten/:id` | ProjectsList / ProjectCreate / ProjectDetail | Projectenmodule |
| `/klanten`, `/klanten/:id` | ClientsLayout / ClientProfile | Klantenmodule |
| `/deals`, `/deals/:id` | DealsLayout / DealDetail | Sales-pipeline |
| `/offertes`, `/offertes/nieuw`, `/offertes/:id`, `/offertes/:id/bewerken`, `/offertes/:id/preview` | QuotesPipeline / QuoteCreation / ForgeQuotePreview | Offertes |
| `/inkoopoffertes` | InkoopOffertesPage | Inkoopoffertes (van leveranciers) |
| `/documenten` | DocumentsLayout | Documentarchief |
| `/email`, `/email/compose` | EmailLayout | E-mailclient |
| `/planning` (adaptive) | PlanningRoute → PlanningLayout / MontagePlanningLayoutMobile | Montageplanning met D&D |
| `/taken` (adaptive) | TakenRoute → TasksLayout / TasksLayoutMobile | Takenmodule |
| `/financieel` | FinancialLayout | Financieel overzicht |
| `/voorraad` | VoorraadLayout | Voorraadbeheer |
| `/facturen`, `/facturen/nieuw`, `/facturen/:id`, `/facturen/:id/bewerken` | FacturenLayout / FactuurEditor | Facturenmodule (verkoop + inkoop tabs) |
| `/rapportages` | RapportagesLayout | Rapporten |
| `/forecast` | ForecastLayout | Prognose |
| `/werkbonnen`, `/werkbonnen/:id` (adaptive) | WerkbonnenLayout / WerkbonDetail | Werkbonnen |
| `/bestelbonnen`, `/bestelbonnen/:id` | BestelbonnenLayout / BestelbonDetail | Inkoopbestellingen |
| `/leveringsbonnen`, `/leveringsbonnen/:id` | LeveringsbonnenLayout / LeveringsbonDetail | Pakbonnen |
| `/leads`, `/leads/formulieren/nieuw`, `/leads/formulieren/:id`, `/leads/inzendingen` | LeadCaptureLayout / LeadFormulierEditor / LeadInzendingenLayout | Lead-formulieren |
| `/portalen` | PortalenOverzicht | Portaalconfiguratie |
| `/tijdregistratie` | TijdregistratieLayout | Urenregistratie |
| `/nacalculatie` | NacalculatieLayout | Nacalculatie |
| `/team` | TeamLayout | Teamleden, rollen |
| `/importeren` | DataImportPage | Bulk-import (CSV/Excel/JamesPro) |
| `/ai`, `/forgie` | FORGEdeskAIChat / ForgieChatPage | Daan AI-chat |
| `/kennisbank` | KennisbankPage | Interne kennisbank |
| `/changelog` | ChangelogPage | Release notes |
| `/booking` | BookingBeheer | Beheer publieke bookinglinks |
| `/visualizer` | VisualizerLayout | Signing-visualizer (3D mockups) |
| `/meldingen` | MeldingenPage | Notificatiecentrum |
| `/instellingen` | SettingsLayout | App-instellingen |

**Legacy redirects**: `/kalender` → `/planning`, `/montage` → `/planning`, `/offertes/:id/detail` → `/offertes/:id/bewerken`, `/inkoopfacturen*` → `/facturen?tab=inkoop`.

---

## 4. Modules en features

Component-tree onder `src/components/` heeft 28+ feature-mappen.

- **auth** — Login, registratie, password-reset, e-mailverificatie, ProtectedRoute, password-strength meter.
- **clients** — Klantenlijst, ClientProfile met tabs (info, deals, offertes, facturen, e-mail, historie, AI-chat).
- **projects** — Lijst, ProjectDetail, Cockpit (FaseNavigator, ActiviteitFeed, PortaalPanel, PulseBar, KlantCard, ActiesCard, MontageSection, BestandenSection, TakenOfferteGrid, WatNuBanner).
- **quotes** — Pipeline kanban, QuoteCreation editor met SmartCalculator + CalculatieModal, versioning, ForgeQuotePreview, SendOfferteDialog, OfferteOpvolgTimeline, InkoopOfferte-paneel, AutofillInput.
- **invoices** — FacturenLayout (tabs verkoop/inkoop), FactuurEditor, BetaalPagina (Mollie klant), BetaaldPagina, FactuurBijlagenSectie.
- **inkoopfacturen** — IMAP-inbox setup, lijst, detail (AI-extractie, goedkeuring, koppeling aan uitgave).
- **planning** — MontagePlanningLayout (week/maand D&D, swimlanes per rol-groep), TasksLayout (taken-dashboard), DayView, WeekView, MonthView, BookingBeheer, PublicBookingPage, WeatherDayStrip.
- **werkbonnen** — Lijst, detail, AanmaakDialog, HeaderForm, ItemCard, MonteurFeedback, VanProjectDialog.
- **leveringsbonnen / bestelbonnen** — Pakbonnen + inkoopbestellingen, met regels en project-koppeling.
- **portaal** — Klantportaal met feed (Bericht, Offerte, Factuur, Afbeelding, Tekening), header, sidebar, ReactieForm, Lightbox, KlantApprovalPage, statuspagina's (Gesloten, Verlopen).
- **dashboard** — KpiStrip, VandaagBlok, OpvolgenBlok, AanDeSlagSectie, ActiviteitLog, RightRail, PortaalAlerts, FloatingQuickActions.
- **email** — EmailLayout (lijst + reader + compose), ReaderAIToolbar, ComposePage, Templates, CRMSidebar, ContextSidebar, IngeplandeBerichtenLijst.
- **financial** — UitgavenLayout, LeveranciersLayout, VoorraadLayout, DiscountsSettings, VATCodesSettings, GeneralLedgerSettings.
- **visualizer** — VisualizerLayout, Gallery, Lightbox, SigningVisualizerDialog (3D), CreditsPakketDialog, KostenDashboard.
- **forgie** — Daan-chat (ChatPage, Widget, app-wide FORGEdeskAIChat), ActieKaart, Avatar, AITextGenerator.
- **documents / leads / kennisbank / changelog** — Documenten-pipeline, leadformulier-editor + publieke pagina, KB-artikelen, changelog.
- **import** — DataImportPage + ImportWizard (bedrijfsdata, contactpersonen, JamesPro, losse contacten, hulpbanner).
- **settings** — Profiel, Team, Bedrijf, Huisstijl, Portaal, Integraties, Kennisbank, Calculatie, Kostenplaatsen, Abonnement, Forgie, Visualizer, Beveiliging, Weergave, Sidebar. Submap **communicatie/** met Mijn Email, Templates, Factuur/Offerte-opvolging, PortaalEmails, Onboarding/Trial, TemplateEditor.
- **onboarding** — LandingPage, WelkomPagina, TeamWelkom, OnboardingWizard, FeatureIllustrations, ParticleField.
- **layouts** — AppLayout, Header, Sidebar, TopNav, TabBar (multi-tab), MobileBottomNav.
- **shared** — ErrorBoundary, NotFoundPage, ConfirmDialog, GlobalSearch, CommandPalette (Cmd+K), ModuleHeader, MedewerkerFilterCombobox, MedewerkerSelector, KlantContactSelector, KvkZoekVeld, ProductCatalogusCombobox, PdfPreviewDialog, FloatingEmailButton, AuditLogPanel, TrialBanner, TrialGuardDialog, UpgradeDialog, InkoopAILimietBanner.
- **ui** — Shadcn-componenten (button, card, dialog, input, select, etc.).

---

## 5. Services (`src/services/` — 40 bestanden)

Aggregator: **supabaseService.ts** re-exporteert alle andere services.

### Auth & core
- **authService** — Supabase Auth (sign in/up/out, reset, onAuthStateChange).
- **supabaseClient** — Client + `isSupabaseConfigured()`.
- **supabaseHelpers** — `withOrganisatieId`, `getOrgId`, `sanitizeDates`, `getMaxNummer`, UUID/DATE-fielden, generic helpers.

### Klanten & sales
- **klantService** — Klanten CRUD, contactpersonen, debiteurennummers, labels, import-logs, historie, bulk-acties.
- **crmService** — Deals + activiteiten, leadformulieren, lead-inzendingen, inkoopoffertes.
- **offerteService** — Offertes, items, versies, templates, calculatieproducten, calculatietemplates, tekeninggoedkeuringen.
- **opvolgingService** — Offerte-opvolgschema's (stappen, triggers, logs).

### Projecten
- **projectService** — Projecten, taken, toewijzingen, foto's, project-tijden, project-nummers.
- **planningService** — Calendar events, montage-afspraken, verlof, bedrijfssluitingsdagen.
- **tijdregistratieService** — Uren per medewerker/project.

### Financieel
- **factuurService** — Facturen, items, statussen, creditnota's, voorschotfacturen, herinneringen, nummergeneratie.
- **factuurPdfService** — PDF-gen + Storage-upload.
- **factuurBijlagenService** — Bijlagen + signed URLs.
- **boekhoudingService** — Grootboek, kostenplaatsen, btw-codes, kortingen, leveranciers, uitgaven, bestelbonnen, leveringsbonnen.
- **inkoopfactuurService** — IMAP-inbox config, AI-extractie, goedkeuring, sync, quota-tracking.
- **ublService** — UBL 2.1 NLCIUS XML (e-factuur).

### Operations
- **werkbonService** — Werkbonnen + regels + items + foto's + afbeeldingen.
- **werkbonPdfService** — Werkbon-instructie PDF.
- **voorraadService** — Artikelen + mutaties + minimum-voorraad.

### Documenten & storage
- **documentenService** — Documenten + sjablonen, briefpapier upload, document-style.
- **pdfService** — PDF-gen voor offertes, opdrachtbevestigingen, facturen, rapporten, bestel-/leveringsbonnen, werkbonnen; briefpapier-overlay.
- **storageService** — Supabase Storage CRUD, signed URLs, montage- en e-mailbijlagen.

### Email & messaging
- **emailService** — Emails CRUD, FTS-zoeken, threads, toewijzing, tickets, interne notities, Sales Inbox (wachtend/beantwoord), templates, ingeplande berichten.
- **gmailService** — IMAP/Gmail-flow: ophalen, lezen, versturen, search, settings sync.
- **emailTemplateService** — HTML-sjablonen (offerte, factuur, tekening, follow-up).
- **portaalNotificatieService** — Portaal-mails (item, herinnering, reactie), activiteit-log.

### AI
- **aiService** — Claude proxy (chat, stream, analyse, email-draft, quote-suggest).
- **aiChatService** — Persistente chat-sessies.
- **aiRewriteService** — Rewrite-acties (verkorten, formaliseer, vertaal, taalcheck).
- **forgieService** — Daan-assistent met token/credit-tracking.
- **forgieChatService** — Chat-sessies + CSV-imports naar kennisbank.
- **followUpService** — Context-aware follow-up emails.

### Portals & extern
- **portaalService** — Portaal-tokens, items, bestanden, reacties, instellingen, notificaties.
- **bookingService** — Booking-slots + afspraken.

### Profiel & meta
- **profielService** — Profile, app-settings, organisatie, medewerkers, notificaties, audit-log.

### Visualisatie
- **visualizerService** — Signing-visualisaties, credits, transacties, stats, Forgie-gebruik.

### Kennisbank & import
- **kbService** — KB-categorieën + artikelen.
- **importService** — CSV-parsing, validatie, normalisatie (klanten/contactpersonen).
- **universalImportService** — Universeel import-framework + JamesPro-compat.

---

## 6. Types (`src/types/index.ts` — 117+ exports)

### Team & organisatie
`TeamRol`, `TeamStatus`, `Profile`, `Organisatie`, `Uitnodiging`.

### Klanten & contacten
`Klant`, `Contactpersoon`, `ContactpersoonRecord`, `Vestiging`, `KlantActiviteit`, `KlantHistorie`, `KvkResultaat`.

### Klant-import
`CSVKlantRij`, `CSVActiviteitRij`, `ImportResultaat`, `ImportLog`, `ImportOperationResult`.

### Projecten & taken
`Project`, `Taak`, `ProjectToewijzing`, `ProjectFoto`.

### Offertes & calculatie
`Offerte`, `OfferteItem`, `OfferteItemDetailRegel`, `OfferteItemPrijsVariant`, `OfferteActiviteit`, `OfferteVersie`, `OfferteTemplate`, `OfferteTemplateRegel`, `CalculatieProduct`, `CalculatieRegel`, `CalculatieTemplate`, `OfferteItemCalculatie`.

### Facturen & inkoop
`Factuur`, `FactuurItem`, `FactuurBijlage`, `InkoopOfferte`, `InkoopRegel`.

### Werkbonnen
`Werkbon`, `WerkbonItem`, `WerkbonAfbeelding`, `WerkbonFoto`, `WerkbonRegel`, `WerkbonInstellingen`.

### Montage & booking
`MontageAfspraak`, `MontageBijlage`, `BookingSlot`, `BookingAfspraak`.

### Personeel
`Medewerker`, `Verlof`, `Bedrijfssluitingsdag`, `Tijdregistratie`.

### Email & communicatie
`Email`, `EmailTracking`, `EmailAttachment`, `EmailSequence`, `EmailSequenceStap`, `IngeplandEmail`, `EmailBijlage`, `InternEmailNotitie`.

### Documenten
`Document`, `TekeningGoedkeuring`.

### Financieel
`Kostenplaats`, `Grootboek`, `BtwCode`, `Korting`, `Leverancier`, `Uitgave`.

### Bestel- / leveringsbonnen / voorraad
`Bestelbon`, `BestelbonRegel`, `Leveringsbon`, `LeveringsbonRegel`, `VoorraadArtikel`, `VoorraadMutatie`.

### Sales pipeline
`Deal`, `DealActiviteit`, `LeadFormulier`, `LeadFormulierVeld`, `LeadInzending`.

### Klantportaal
`ProjectPortaal`, `PortaalItem`, `PortaalBestand`, `PortaalReactie`, `PortaalFeedData`, `PortaalInstellingen`, `PortaalEmailTemplate`, `AppNotificatie`.

### Kalender & opvolging
`CalendarEvent`, `HerinneringTemplate`, `OpvolgSchema`, `OpvolgStap`, `OpvolgLogEntry`.

### Instellingen
`AppSettings`, `PipelineStap`, `DocumentStyle`, `DocumentTemplateId`, `LogoPositie`, `BriefpapierModus`, `SortDirection`.

### AI & notificaties
`AIChat`, `Notificatie`.

### Visualizer
`SigningType`, `VisualizerStatus`, `SigningVisualisatie`, `VisualizerInstellingen`, `VisualizerApiLog`, `VisualizerStats`, `VisualizerCredits`, `CreditTransactie`, `CreditsPakket`.

### Navigatie
`NavItem`.

> Alle entiteiten hebben `organisatie_id`. Naamgeving: Nederlandse PascalCase.

---

## 7. Trigger.dev tasks (`src/trigger/`)

| Task ID | Bestand | Doel |
|---|---|---|
| `hello-world` | example.ts | Demo |
| `email-opvolging` | email-opvolging.ts | Wacht X dagen, check IMAP voor reply, verstuur SMTP follow-up met threading-headers |
| `inkoopfactuur-intake` | inkoopfactuur-intake.ts | **Cron 15 min** — IMAP PDFs uit inkoop-inbox, upload Storage, trigger AI-extractie |
| `offerte-opvolging-cron` | offerte-opvolging.ts | **Cron dagelijks 08:00 CET** — herinneringen op basis van schema-stappen |
| `onboarding.email-sequence` | onboarding-sequence.ts | 3-staps welkom-sequence (dag 0 / 3 / 7) |
| `log-portaal-activiteit` | portaal-activiteit-log.ts | Fire-and-forget logging van portaalacties |
| `portaal-herinnering-cron` | portaal-herinnering.ts | **Cron dagelijks 09:00 CET** — reminders voor onbeantwoorde portaal-items |
| `trial-reminder-cron` | trial-reminder.ts | **Cron dagelijks 09:00 CET** — trial-verloop op dag 5 / 2 / 0 |
| `weekly-digest` | weekly-digest.ts | **Cron maandags 08:00 CET** — wekelijkse statistiek-digest |

**Utils** (`src/trigger/utils/`): `email.ts` (SMTP via Nodemailer), `emailTemplate.ts`, `idempotency.ts` (Redis-deduplicatie), `resend.ts`, `supabase.ts` (admin client), `templates.ts`.

---

## 8. API-routes (`api/` — 60+ endpoints)

Vercel serverless. **Constraint: geen imports uit `src/`** — alles inline.

### AI / Daan
`ai`, `ai-chat`, `ai-email`, `ai-followup-email`, `ai-rewrite`.

### Email
`send-email` (SMTP, rate-limited 20/60s), `fetch-emails` (IMAP), `read-email`, `email-settings`, `email-attachment`, `test-email-connection`, `emailTemplate`.

### Exact Online
`exact-auth`, `exact-callback`, `exact-refresh`, `exact-administraties`, `exact-dagboeken`, `exact-document-types`, `exact-btw-codes`, `exact-grootboeken`, `exact-sync-factuur` (one-way: doen. → Exact).

### Inkoopfactuur AI
`inkoopfactuur-extract` (Claude PDF→JSON), `inkoopfactuur-save-config`, `inkoopfactuur-sync`, `inkoopfactuur-test-connection`, `analyze-inkoop-offerte`, `inkoop-ai-usage`.

### KvK lookup
`kvk-zoeken`, `kvk-basisprofiel`.

### Offerte / portaal (publiek, token-based)
`offerte-publiek`, `offerte-accepteren`, `offerte-wijziging`, `portaal-create`, `portaal-get`, `portaal-items-get`, `portaal-upload`, `portaal-bekeken`, `portaal-reactie`, `portaal-link-aanvragen`, `portaal-verlengen`, `factuur-portaal`, `goedkeuring-reactie`.

### Betaling & abonnement
`create-subscription`, `create-checkout-session`, `cancel-subscription`, `billing-webhook` (Mollie, eigen billing), `mollie-create-payment`, `mollie-webhook` (Mollie, klant-facturen).

### Cron & webhooks
`cron-trial-expiration` (03:00 UTC), `cron-verzend-geplande-berichten`, `resend-notify`, `csp-report`, `api-status` (health).

### Team & instellingen
`invite-team-member`, `manage-team-member`, `save-integration-settings` (encrypted), `trigger-onboarding`, `generate-signing-mockup`.

### Overig
`annuleer-opvolging`.

**Patronen:** Bearer-tokens (user-auth), Upstash rate-limit, HMAC voor webhooks, pgcrypto/encryption voor credentials.

---

## 9. Database (`supabase/migrations/` — 126 migrations, ~92 tabellen)

Alle tabellen RLS-protected op `organisatie_id`. Uitzondering: `user_email_settings` (RLS op `user_id` — credentials zijn persoonlijk).

### Klanten & contacten
`klanten`, `contactpersonen`, `klant_activiteiten`, `klant_historie`, `vestigingen`, `lead_formulieren`, `lead_inzendingen`.

### Projecten & planning
`projecten`, `project_fotos`, `project_portalen`, `project_toewijzingen`, `taken`, `tijdregistraties`, `montage_afspraken`, `booking_afspraken`, `booking_slots`, `calendar_events`.

### Offertes
`offertes`, `offerte_items`, `offerte_versies`, `offerte_templates`, `offerte_opvolg_schemas`, `offerte_opvolg_stappen`, `calculatie_templates`, `calculatie_producten`.

### Facturen & financieel
`facturen`, `factuur_items`, `factuur_bijlagen`, `kostenplaatsen`, `grootboeken`, `btw_codes`, `kortingen`, `credit_transacties`, `herinnering_templates`.

### Inkoopfacturen
`inkoopfacturen`, `inkoopfactuur_regels`, `inkoopfactuur_inbox_config`, `inkoop_offertes`, `inkoop_regels`.

### Werkbonnen / pakbonnen / bestelbonnen
`werkbonnen`, `werkbon_regels`, `werkbon_items`, `werkbon_fotos`, `werkbon_afbeeldingen`, `leveringsbonnen`, `leveringsbon_regels`, `bestelbonnen`, `bestelbon_regels`.

### Voorraad & inkoop
`voorraad_artikelen`, `voorraad_mutaties`, `leveranciers`, `uitgaven`.

### Email
`emails` (+ FTS-kolom met Dutch stemming), `email_opvolgingen`, `email_send_idempotency`, `email_sequences`, `email_templates`, `ingeplande_berichten` (met threading), `ingeplande_emails`, `user_email_settings`.

### Documenten & portaal
`documenten`, `portaal_items`, `portaal_bestanden`, `portaal_reacties`, `document_styles`, `tekening_goedkeuringen`.

### Visualizer
`signing_visualisaties`, `visualizer_credits`.

### AI / Daan
`ai_chats`, `ai_chat_history`, `ai_usage`, `ai_usage_org`, `ai_imported_data`.

### Sales / CRM
`deals`, `deal_activiteiten`.

### Kennisbank
`kb_categories`, `kb_articles`.

### Personeel
`medewerkers`, `verlof`, `bedrijfssluitingsdagen`.

### Beheer & meta
`organisaties`, `profiles`, `app_settings`, `app_notificaties`, `notificaties`, `nieuwsbrieven`, `rate_limits`, `uitnodigingen`, `exact_tokens`.

### Audit & security
`audit_log`, `audit_log_feature`, `csp_violations`.

### Recente schema-wijzigingen (mig 041–050)
- 041: contactpersonen split `naam` → `voornaam`/`achternaam`; JamesPro-import opschonen.
- 042: `grootboek_code` op factuurregel + offerteregel; nieuwe `kostenplaatsen` met FK vanuit facturen/offertes/projecten.
- 044: `email_opvolgingen` (status: wachtend/verstuurd/reply_ontvangen).
- 045: `kb_categories` + `kb_articles` (kennisbank).
- 046: Storage-bucket `documenten` + RLS.
- 047: `ingeplande_berichten` + bcc/in_reply_to/thread_id (threading).
- 048: `emails.fts` GENERATED tsvector + GIN-index (Dutch stemming). **Referentie-pattern voor RLS.**
- 049: `email_templates` per organisatie.
- 050: **Grote** inkoopfacturen-module — IMAP-inbox-config (pgcrypto-encrypted), inkoopfacturen + regels, storage-bucket `inkoopfacturen`, role-flag `inkoopfacturen_toegang` op `medewerkers`.

Migratie-conventies: idempotent (`CREATE TABLE IF NOT EXISTS`, `ON CONFLICT DO NOTHING`); altijd `organisatie_id` met RLS; volgnummer uit `schema_migrations` (historisch conflict op 093/094 niet hergebruiken); door Antony zelf in SQL Editor gedraaid.

---

## 10. Contexts (`src/contexts/` — 9 bestanden)

| Context | Beheer |
|---|---|
| **AuthContext** | Login/logout, sessie, user-metadata, trial-status, organisatie-rol (RBAC); afhankelijkheid voor alles |
| **AppSettingsContext** | Bedrijfsinstellingen (valuta, btw, logo, handtekening, pipeline-stappen, e-mailteksten, prefix-nummers, API-keys) |
| **DashboardDataContext** | Cache voor projecten, offertes, facturen, taken, montages, klanten, medewerkers, events |
| **LanguageContext** | i18n (nl/en), `t(key)`-getter |
| **ThemeContext** | Light/dark (geforceerd light) — toggleTheme is no-op |
| **MedewerkersContext** | Team-cache + audit-snapshot |
| **SidebarContext** | Collapse-state, sidebar-vs-topnav layout, responsive — localStorage-backed |
| **TabsContext** | Multi-tab interface (activeTab, dirty-tracking, reorder, label-edit, undo) |
| **PaletteContext** | Theme-switcher (Petrol, Flame, Sage, Ocean) — CSS-vars injectie |

Dependency-volgorde: Auth → AppSettings → DashboardData.

---

## 11. Hooks (`src/hooks/` — 24+ bestanden)

**Context-wrappers**: `useAuth`, `useAppSettings`, `useMedewerkers`, `useTabs`, `useSidebar`, `useTheme`, `useLanguage`, `usePalette`.

**Utility**: `useData`, `useDataInit`, `useLocalStorage`, `useDebounce` + `useDebouncedCallback`, `useMediaQuery`, `useOptimisticState`, `useCountUp`, `useOnlineStatus`, `useUnsavedWarning`.

**Feature-hooks**: `useContactManagement`, `useEmailCompose`, `useDocumentStyle`, `useAanDeSlagStatus`, `useTrialGuard`, `useTabDirtyState`, `useTabShortcuts` (Cmd/Ctrl: W close, Tab next, 1-9 jump, T new), `useNavigateWithTab`, `usePortaalHerinnering`, `useProjectSidebarConfig`, `useQuoteClipboard` (offerte-items copy/paste, localStorage, max 50), `useQuoteVersioning` (snapshots + auto-save + undo), `useInkoopAIUsage`, `useWeather`.

---

## 12. Kritische regels

**Code-discipline**
- `npm run build` na ELKE wijziging. Fix alle TS-errors voordat je verder gaat.
- Geen nieuwe npm-packages zonder toestemming.
- Refactor NIET tenzij gevraagd. Doe wat gevraagd is, niet meer, niet minder.
- Geen overbodige comments — code zelfverklarend.
- "Groot" = > 3 bestanden of > 100 regels: eerst analyseren, rapporteren, wachten op akkoord.

**Werkmap**
- Altijd `cd ~/sign-company/forgedesk` voor commands.
- Niet in root Next.js marketing site werken.

**Data-isolatie**
- `organisatie_id` ALTIJD voor data-filtering, nooit `user_id`. Alle teamleden delen data binnen één organisatie.
- Uitzondering: `user_email_settings` (RLS op `user_id`, persoonlijk).

**Grote bestanden — grep, nooit cat**
- `supabaseService.ts` (~5700 regels) — laat sessies crashen bij cat.
- `types/index.ts` (~1700 regels) — idem.

**Vercel serverless constraint**
- `api/*.ts` zijn standalone — GEEN imports uit `src/`.
- Geen `api/_helpers/` — alles inline per endpoint.

**Naamgeving**
- Nederlandse variabelen/functies (klant, offerte, factuur, werkbon, medewerker).
- Types: PascalCase, Nederlandse namen.
- Bestanden: PascalCase voor componenten, camelCase voor services/utils.
- App-naam: **doen.** (lowercase, met punt). AI heet **Daan** (niet Forgie, niet FORGEdesk).

**Database**
- Migraties idempotent: `CREATE TABLE IF NOT EXISTS`, `ON CONFLICT DO NOTHING`.
- Volgnummer: check `schema_migrations` voor eerstvolgende vrije. Historisch conflict op 093/094 niet hergebruiken.
- Elke nieuwe tabel/kolom: org-scoped RLS-policy (SELECT/INSERT/UPDATE/DELETE elk afgedekt).
- Antony draait migraties zelf in Supabase SQL Editor.

**Git**
- Engelse commit messages, één concern per commit.

**Agent-workflow (intern)**
- `@Planner` — feature-niveau, 3-5 vragen, wacht op akkoord. Schrijft geen code.
- `@dev` — implementatie, één commit per concern, build na elke commit.
- `@senior-backend-reviewer` — per commit (AKKOORD / BLOKKADE / AKKOORD-MET-OPMERKINGEN).
- `@QAA` — per fase tegen acceptatiecriteria.
- Review-loop: bij BLOKKADE fix + `fix(review): ...` + opnieuw reviewen. Bij AKKOORD-MET-OPMERKINGEN log in `REVIEW_NOTES.md`. Einde fase: QAA + reviewer eindoordeel.

**Brand & UI**
- Flame `#F15025` (accent), Petrol `#1A535C` (dominant).
- Flame mag voor terminal acties (Afronden, Voltooien, Nieuw) — niet brand-only.
- Geen emojis in UI.
- Geen em-dashes in UI-copy — vervang door punten/komma's; lijst-separator is `·` (middle dot).
- Status-woorden eindigen op Flame-dot: `verstuurd.` `betaald.` `gedaan.`
- UI-copy actief, niet passief ("Opvolgen" niet "Wacht op reactie").
- **Planning** ≠ **Taken**: Planning = uitsluitend montage. Taken = al het werk eromheen (offertes opvolgen, inkoop, admin). Strikt gescheiden, ook in copy.
- Geen `useMemo` voor triviale string-concat — gewoon render-level const.
- Geen silent data mutations (JSONB → DB-tabel of vergelijkbaar): alleen bij expliciete user-actie via resolver-pattern, niet FK + silent upsert.

**Integraties**
- Exact-sync is **one-way**: doen. → Exact, niet andersom. Betaald-status zelf afvinken.
- Officieel contact-adres: `hello@doen.team`.
- Portaal-branding: white-label beperkt tot header-bg + logo; rest blijft doen.-stijl ("powered by doen."-feel).

---

## 13. Bekende beperkingen

- `src/components/planning/MontagePlanningLayout.tsx` — niet aanraken zonder reden (week/maand D&D-logica).
- `supabaseService.ts` blijft één bestand (5700 regels) — geen split.
- `toegewezen_aan` op `Taak` is string (naam), geen FK — risico bij hernoemen of dubbele namen.
- `Medewerker.rol` is soft-typed enum; `ROL_GROUP_ORDER` moet mee-updaten.
- Planning-module heeft geen unit-tests (helpers `formatDate`, `getMondayOfWeek`, conflict-detectie).
- `collapsedLanes`-Set bij swimlanes groeit traag bij deactivering medewerker — acceptabel <50 lanes.
- Server-side auto-opvolging UI is verwijderd, maar tabel `email_opvolgingen` + triggers + API-routes blijven (0 rijen geverifieerd). Cleanup uitgesteld.
- `audit_log_feature` schrijft één-per-mutatie; bij 200+ bulk later batch-insert overwegen.

---

## 14. Backlog en aandachtspunten

### Antony zelf (uit ANTONY_TODO.md)
1. Supabase-credentials invullen in `.env` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
2. RLS-policies activeren op alle kerntabellen.
3. Anthropic API-key configureren (optioneel, voor Daan).

### Production-ready fixes (uit PLAN-VAN-AANPAK.md)
- **Fase 1**: Storage-bucket policies fixen — portaal-bestanden van PUBLIC naar ownership-based.
- **Fase 2**: Soft-delete invoeren op klanten, projecten, offertes, facturen, werkbonnen.
- **Fase 3**: Multi-tenant migratie — `organisatie_id` op alle 18 kerntabellen.
- **Fase 4**: TypeScript opschonen — 138 → 0 errors, 9 → 0 `as any`-casts.

### Security-sprint backlog (geparkeerd post-FESPA)
- Auth-refactor: LoginPage refresh-hang, dubbele navigate, ProtectedRoute loading.
- 4 organisaties met `onboarding_compleet=false` opruimen.

### Sales Inbox v1 (LOG.md)
- UI-naam "Opvolgen", DB-kolom `wacht_op_reactie`.
- 72u sweep-window voor weekend-pattern.
- Threading is v2 follow-up — nog niet geïmplementeerd.

### Recent geleverd (april–mei 2026)
- **Taken-module refactor** — swim-lane view, delete-buffer met 5s undo via sonner, admin-detectie via `isAdminUser`, MedewerkerFilterCombobox.
- **Planning-module swimlane refactor** — lane-groepering per rol (Monteurs, Productie, Verkoop, Overig), conflict-indicator, drop-op-collapsed expandt auto.
- **Sales Inbox v1** — Opvolgen-flag, retroactive sweep, 6 nieuwe kolommen + 2 partial indexes.
- **Mobile email fixes** — Tailwind responsive, createPortal voor mobile drawer, sticky bottom-CTA boven MobileBottomNav.

### UI-patterns sinds april 2026
- Sticky top action-bar `#1A535C` (Clients/Quotes/Facturen).
- localStorage-keys: `doen_<module>_<feature>`.
- Migration-markers: `doen_<module>_migration_v<N>`.
- MedewerkerSelector: popover-based, `single`/`multi` modes, `valueKind="naam"|"id"`, drie trigger-varianten.

---

## 15. Productfilosofie

doen. is **radicaal transparant** binnen één organisatie. Iedereen ziet en plant alles van iedereen: taken, klanten, projecten, e-mails. RBAC komt pas voor externe freelancers of gevoelige cross-org scenarios. Dit is een bewuste productkeuze — geen tech-debt.
