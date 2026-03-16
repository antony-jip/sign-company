# FORGEdesk Codebase Blueprint

> Gegenereerd: 2026-03-16
> Doel: Complete audit van de FORGEdesk codebase — geen wijzigingen, alleen documentatie.

---

## Inhoudsopgave

1. [Directory Structuur](#1-directory-structuur)
2. [Modules & Componenten](#2-modules--componenten)
3. [Database Schema](#3-database-schema)
4. [Routes](#4-routes)
5. [Services](#5-services)
6. [Design System](#6-design-system)
7. [Contexts](#7-contexts)
8. [Hooks](#8-hooks)
9. [API Routes](#9-api-routes)
10. [Bekende Problemen](#10-bekende-problemen)

---

## 1. Directory Structuur

### Totalen

| Categorie | Aantal bestanden |
|-----------|-----------------|
| Components | 178 |
| Services | 13 |
| Hooks | 16 |
| Contexts | 7 |
| Types | 3 |
| Utils | 12 |
| Lib | 4 |
| API routes | 41 |
| Root src bestanden | 4 (App.tsx, main.tsx, index.css, vite-env.d.ts) |
| **Totaal src/** | **278** |

### src/components/ — Per map

| Map | Bestanden | Bestanden |
|-----|-----------|-----------|
| **auth** | 6 | CheckInboxPage, ForgotPasswordPage, LoginPage, ProtectedRoute, RegisterPage, ResetPasswordPage |
| **bestelbonnen** | 2 | BestelbonDetail, BestelbonnenLayout |
| **clients** | 10 | AddEditClient, ClientCard, ClientProfile, ClientsLayout, DealDetail, DealsLayout, ImportAIChat, KlantAIChat, KlantHistorieTab, KlantenImportPage |
| **dashboard** | 27 | AIInsightWidget, ActionBlock, CalendarMiniWidget, ClockWidget, EmailCommunicationHub, FORGEdeskDashboard, FloatingQuickActions, InboxPreviewWidget, MoneyBlock, MontagePlanningWidget, NieuwsWidget, NotitieWidget, OpenstaandeOffertesWidget, PortaalAlerts, PriorityTasks, QuickActions, RecenteActiviteitWidget, SalesFollowUpWidget, SalesForecastWidget, SalesPulseWidget, StatisticsCards, TeFacturerenWidget, TodayPlanningWidget, VisualizerDashboardWidget, WeatherWidget, WeekStripWidget, WorkflowWidget |
| **documents** | 4 | DocumentFolders, DocumentUpload, DocumentsLayout, DocumentsPipeline |
| **email** | 15 + 6 hooks | ContactSidebar, EmailAnalytics, EmailCompose, EmailComposePage, EmailLayout, EmailListItem, EmailReader, EmailSequences, EmailTemplates, EmailTracking, GedeeldeInboxLayout, NewsletterBuilder, emailHelpers.ts, emailTypes.ts; hooks/: index, useEmailActions, useEmailData, useEmailFilters, useEmailKeyboard, useEmailSelection |
| **financial** | 7 | DiscountsSettings, FinancialLayout, GeneralLedgerSettings, LeveranciersLayout, UitgavenLayout, VATCodesSettings, VoorraadLayout |
| **forgie** | 6 | AITextGenerator, FORGEdeskAIChat, ForgieActieKaart, ForgieAvatar, ForgieChatPage, ForgieChatWidget |
| **invoices** | 4 | BetaalPagina, BetaaldPagina, FacturenLayout, FactuurEditor |
| **layouts** | 7 | AppLayout, Header, HeaderNav, MobileBottomNav, Sidebar, TabBar, TopNav |
| **leads** | 4 | LeadCaptureLayout, LeadFormulierEditor, LeadFormulierPubliek, LeadInzendingenLayout |
| **leveringsbonnen** | 2 | LeveringsbonDetail, LeveringsbonnenLayout |
| **notifications** | 2 | MeldingenPage, NotificatieCenter |
| **onboarding** | 5 | FeatureIllustrations, LandingPage, OnboardingWizard, WelkomPagina, constants.ts |
| **planning** | 9 | BookingBeheer, CalendarLayout, DayView, MontagePlanningLayout, MonthView, PlanningLayout, PublicBookingPage, TasksLayout, WeekView |
| **portaal** | 7 | ClientApprovalPage, PortaalGesloten, PortaalLightbox, PortaalPagina, PortaalReactieForm, PortaalVerlopen, PortalenOverzicht |
| **projects** | 12 | NacalculatieLayout, ProjectCreate, ProjectDetail, ProjectOfferteEditor, ProjectPhotoGallery, ProjectPortaalTab, ProjectProgressIndicator, ProjectTasksTable, ProjectsList, TeamAvailability, TijdregistratieLayout, TimelineView |
| **quotes** | 13 | AutofillInput, CalculatieModal, ForgeQuotePreview, InkoopOffertePaneel, InkoopOffertesPage, OfferteDetail, OffertePubliekPagina, ProboConfiguratorModal, ProboProductPicker, QuoteCreation, QuoteItemsTable, QuotesPipeline, SmartCalculator |
| **reports** | 2 | ForecastLayout, RapportagesLayout |
| **settings** | 11 | AbonnementTab, CalculatieTab, DataImportLayout, ForgieTab, HuisstijlTab, PortaalTab, SettingsLayout, SidebarTab, TeamLayout, TeamledenTab, VisualizerTab |
| **shared** | 14 | AuditLogPanel, CommandPalette, CompletionPromptModal, ErrorBoundary, GlobalSearch, KlantStatusWarning, KvkZoekVeld, ModuleHeader, NotFoundPage, PdfPreviewDialog, QuickActionsButton, ShareButton, TrialBanner, UpgradeDialog |
| **ui** | 26 | AIContentEditableToolbar, AITextToolbar, animated-badge, animated-list, avatar, badge, button, card, checkbox, dialog, dropdown-menu, empty-state, filter-pill, input, label, pagination-controls, popover, progress, scroll-area, select, separator, skeleton, switch, tabs, textarea, tooltip |
| **visualizer** | 6 | CreditsPakketDialog, SigningVisualizerDialog, VisualisatieGallery, VisualisatieLightbox, VisualizerKostenDashboard, VisualizerLayout |
| **werkbonnen** | 4 | WerkbonAanmaakDialog, WerkbonDetail, WerkbonVanProjectDialog, WerkbonnenLayout |

### src/services/

| Bestand | Doel |
|---------|------|
| aiRewriteService.ts | AI tekst herschrijven (10 acties) |
| aiService.ts | AI chat & content generatie (Claude) |
| authService.ts | Authenticatie (Supabase Auth + localStorage fallback) |
| emailTemplateService.ts | HTML email templates (offerte, factuur, herinnering, etc.) |
| forgieChatService.ts | Forgie AI chatbot met kennisbank |
| forgieService.ts | Forgie email-schrijfassistent |
| gmailService.ts | Email integratie (IMAP/SMTP) |
| importService.ts | CSV import & data migratie |
| pdfService.ts | PDF generatie (offertes, facturen, werkbonnen) |
| storageService.ts | Bestandsopslag (Supabase Storage + localStorage fallback) |
| supabaseClient.ts | Supabase client instantie & configuratie |
| supabaseService.ts | Core CRUD operaties (~5600 regels, 60+ functies, 60+ tabellen) |
| werkbonPdfService.ts | Werkbon instructie-PDF (landscape A4) |

### src/hooks/

| Bestand | Doel |
|---------|------|
| useCountUp.ts | Animeer getallen van 0 naar target |
| useDashboardLayout.ts | Dashboard widget volgorde, zichtbaarheid, grootte |
| useData.ts | Generieke data-fetching hook + 12 specifieke hooks |
| useDataInit.ts | localStorage initialisatie & demo seed data |
| useDebounce.ts | Debounce waarde-wijzigingen |
| useDocumentStyle.ts | Document styling ophalen |
| useLocalStorage.ts | Generieke state ↔ localStorage sync |
| useNavigateWithTab.ts | Navigatie + tab management |
| useOnlineStatus.ts | Browser online/offline status |
| usePortaalHerinnering.ts | Automatische portaal herinneringen (>3 dagen) |
| useProjectSidebarConfig.ts | Project detail sidebar secties toggle |
| useSidebarLayout.ts | Drag-reorderable sidebar secties |
| useTabDirtyState.ts | Unsaved changes tracking per tab |
| useTabShortcuts.ts | Keyboard shortcuts (Cmd+T, Cmd+W, etc.) |
| useTrialGuard.ts | Blokkeer acties bij verlopen trial |
| useUnsavedWarning.ts | Browser beforeunload waarschuwing |

### src/contexts/

| Bestand | Doel |
|---------|------|
| AppSettingsContext.tsx | App configuratie, bedrijfsprofiel, 50+ settings |
| AuthContext.tsx | User auth, organisatie, trial status |
| LanguageContext.tsx | NL/EN vertalingen (1000+ keys) |
| PaletteContext.tsx | App thema & accent kleuren (6 paletten) |
| SidebarContext.tsx | Sidebar breedte, collapsed, layout mode |
| TabsContext.tsx | Multi-tab management (browser-like) |
| ThemeContext.tsx | Light/dark toggle |

### src/types/

| Bestand | Doel |
|---------|------|
| index.ts | Hoofdtype-definities voor alle entiteiten |
| visualizer.ts | Types voor signing visualizer |
| fal-ai-client.d.ts | Type declarations voor fal.ai client |

### src/utils/

| Bestand | Doel |
|---------|------|
| auditLogger.ts | Audit trail logging |
| autofillUtils.ts | Autofill helpers voor formulieren |
| budgetUtils.ts | Budget berekeningen |
| emailTemplate.ts | Email template helpers |
| emailUtils.ts | Email utility functies |
| feestdagen.ts | Nederlandse feestdagen berekening |
| forgieMarkdown.tsx | Markdown rendering voor Forgie chat |
| localStorageUtils.ts | localStorage helpers |
| logger.ts | Logging utility (console.log alleen in dev) |
| statusColors.ts | Status → kleur mapping |
| visualizerDefaults.ts | Visualizer standaardwaarden |
| zipBuilder.ts | ZIP bestand generatie |

### src/lib/

| Bestand | Doel |
|---------|------|
| briefpapierGenerator.ts | Briefpapier achtergrond generatie |
| documentTemplates.ts | Document template definities |
| export.ts | Data export functionaliteit |
| utils.ts | Tailwind cn() merge utility |

### api/

41 bestanden — zie [sectie 9](#9-api-routes) voor volledige documentatie.

---

## 2. Modules & Componenten

### Per module: componenten, routes, Supabase tabellen, status

#### auth/
| Component | Route | Status |
|-----------|-------|--------|
| LoginPage | `/login` | Werkend |
| RegisterPage | `/register`, `/registreren` | Werkend |
| CheckInboxPage | `/check-inbox` | Werkend |
| ForgotPasswordPage | `/wachtwoord-vergeten` | Werkend |
| ResetPasswordPage | `/wachtwoord-resetten` | Werkend |
| ProtectedRoute | (wrapper) | Werkend |

**Supabase tabellen:** `auth` (managed by Supabase), `profiles`, `organisaties`

#### dashboard/
| Component | Route | Status |
|-----------|-------|--------|
| FORGEdeskDashboard | `/` (index) | Werkend |
| 26 widget-componenten | (sub-componenten) | Werkend |

**Supabase tabellen:** `projecten`, `offertes`, `facturen`, `taken`, `montage_afspraken`, `klanten`, `tijdregistraties`

#### projects/
| Component | Route | Status |
|-----------|-------|--------|
| ProjectsList | `/projecten` | Werkend |
| ProjectCreate | `/projecten/nieuw` | Werkend |
| ProjectDetail | `/projecten/:id` | Werkend |
| NacalculatieLayout | `/nacalculatie` | Werkend |
| TijdregistratieLayout | `/tijdregistratie` | Werkend |
| TimelineView | (sub-component) | Werkend |
| ProjectOfferteEditor | (sub-component) | Werkend |
| ProjectPhotoGallery | (sub-component) | Werkend |
| ProjectPortaalTab | (sub-component) | Werkend |
| ProjectProgressIndicator | (sub-component) | Werkend |
| ProjectTasksTable | (sub-component) | Werkend |
| TeamAvailability | (sub-component) | Werkend |

**Supabase tabellen:** `projecten`, `taken`, `klanten`, `offertes`, `montage_afspraken`, `tijdregistraties`, `project_fotos`, `project_toewijzingen`, `werkbonnen`, `facturen`

#### clients/
| Component | Route | Status |
|-----------|-------|--------|
| ClientsLayout | `/klanten` | Werkend |
| ClientProfile | `/klanten/:id` | Werkend |
| KlantenImportPage | `/klanten/importeren` | Werkend |
| DealsLayout | `/deals` | Werkend |
| DealDetail | `/deals/:id` | Werkend |
| AddEditClient | (dialog) | Werkend |
| ClientCard | (sub-component) | Werkend |
| ImportAIChat | (sub-component) | Werkend |
| KlantAIChat | (sub-component) | Werkend |
| KlantHistorieTab | (sub-component) | Werkend |

**Supabase tabellen:** `klanten`, `contactpersonen`, `vestigingen`, `deals`, `deal_activiteiten`, `klant_activiteiten`, `projecten`, `offertes`, `facturen`

#### quotes/
| Component | Route | Status |
|-----------|-------|--------|
| QuotesPipeline | `/offertes` | Werkend |
| QuoteCreation | `/offertes/nieuw`, `/offertes/:id`, `/offertes/:id/bewerken` | Werkend |
| ForgeQuotePreview | `/offertes/:id/preview` | Werkend |
| OfferteDetail | `/offertes/:id/detail` | Werkend |
| InkoopOffertesPage | `/inkoopoffertes` | Werkend |
| OffertePubliekPagina | `/offerte-bekijken/:token` (publiek) | Werkend |
| AutofillInput | (sub-component) | Werkend |
| CalculatieModal | (dialog) | Werkend |
| InkoopOffertePaneel | (sub-component) | Werkend |
| ProboConfiguratorModal | (dialog) | Werkend |
| ProboProductPicker | (dialog) | Werkend |
| QuoteItemsTable | (sub-component) | Werkend |
| SmartCalculator | (sub-component) | Werkend |

**Supabase tabellen:** `offertes`, `offerte_items`, `offerte_versies`, `offerte_templates`, `klanten`, `calculatie_producten`, `calculatie_templates`, `inkoop_offertes`, `inkoop_regels`

#### invoices/
| Component | Route | Status |
|-----------|-------|--------|
| FacturenLayout | `/facturen` | Werkend (was broken — selectedIds fix toegepast) |
| FactuurEditor | `/facturen/nieuw`, `/facturen/:id`, `/facturen/:id/bewerken` | Werkend |
| BetaalPagina | `/betalen/:token` (publiek) | Werkend |
| BetaaldPagina | `/betaald` (publiek) | Werkend |

**Supabase tabellen:** `facturen`, `factuur_items`, `klanten`, `offertes`, `herinnering_templates`

#### werkbonnen/
| Component | Route | Status |
|-----------|-------|--------|
| WerkbonnenLayout | `/werkbonnen` | Werkend |
| WerkbonDetail | `/werkbonnen/:id` | Werkend |
| WerkbonAanmaakDialog | (dialog) | Werkend |
| WerkbonVanProjectDialog | (dialog) | Werkend |

**Supabase tabellen:** `werkbonnen`, `werkbon_items`, `werkbon_regels`, `werkbon_afbeeldingen`, `werkbon_fotos`

#### planning/
| Component | Route | Status |
|-----------|-------|--------|
| PlanningLayout | `/planning` | Werkend |
| CalendarLayout | (sub-component) | Werkend |
| DayView | (sub-component) | Werkend |
| WeekView | (sub-component) | Werkend |
| MonthView | (sub-component) | Werkend |
| MontagePlanningLayout | (sub-component) | Werkend |
| BookingBeheer | `/booking` | Werkend |
| PublicBookingPage | `/boeken/:userId` (publiek) | Werkend |
| TasksLayout | `/taken` | Werkend |

**Supabase tabellen:** `events`, `montage_afspraken`, `taken`, `booking_slots`, `booking_afspraken`, `verlof`, `bedrijfssluitingsdagen`, `planning_instellingen`

#### email/
| Component | Route | Status |
|-----------|-------|--------|
| EmailLayout | `/email` | Werkend |
| EmailComposePage | `/email/compose` | Werkend |
| NewsletterBuilder | `/nieuwsbrieven` | Werkend |
| GedeeldeInboxLayout | (sub-component) | Werkend |
| + 10 sub-componenten en 6 hooks | | Werkend |

**Supabase tabellen:** `emails`, `user_email_settings`, `nieuwsbrieven`, `email_sequences`, `ingeplande_emails`

#### financial/
| Component | Route | Status |
|-----------|-------|--------|
| FinancialLayout | `/financieel` | Werkend |
| LeveranciersLayout | (sub-view) | Werkend |
| UitgavenLayout | (sub-view) | Werkend |
| VoorraadLayout | `/voorraad` | Werkend |
| DiscountsSettings | (sub-view) | Werkend |
| GeneralLedgerSettings | (sub-view) | Werkend |
| VATCodesSettings | (sub-view) | Werkend |

**Supabase tabellen:** `leveranciers`, `uitgaven`, `voorraad_artikelen`, `voorraad_mutaties`, `grootboek`, `btw_codes`, `kortingen`

#### documents/
| Component | Route | Status |
|-----------|-------|--------|
| DocumentsLayout | `/documenten` | Werkend |
| DocumentFolders | (sub-component) | Werkend |
| DocumentUpload | (sub-component) | Werkend |
| DocumentsPipeline | (sub-component) | Werkend |

**Supabase tabellen:** `documenten`

#### bestelbonnen/
| Component | Route | Status |
|-----------|-------|--------|
| BestelbonnenLayout | `/bestelbonnen` | Werkend |
| BestelbonDetail | `/bestelbonnen/:id` | Werkend |

**Supabase tabellen:** `bestelbonnen`, `bestelbon_regels`, `leveranciers`

#### leveringsbonnen/
| Component | Route | Status |
|-----------|-------|--------|
| LeveringsbonnenLayout | `/leveringsbonnen` | Werkend |
| LeveringsbonDetail | `/leveringsbonnen/:id` | Werkend |

**Supabase tabellen:** `leveringsbonnen`, `leveringsbon_regels`

#### leads/
| Component | Route | Status |
|-----------|-------|--------|
| LeadCaptureLayout | `/leads` | Werkend |
| LeadFormulierEditor | `/leads/formulieren/nieuw`, `/leads/formulieren/:id` | Werkend |
| LeadFormulierPubliek | `/formulier/:token` (publiek) | Werkend |
| LeadInzendingenLayout | `/leads/inzendingen` | Werkend |

**Supabase tabellen:** `lead_formulieren`, `lead_inzendingen`

#### portaal/
| Component | Route | Status |
|-----------|-------|--------|
| PortalenOverzicht | `/portalen` | Werkend |
| PortaalPagina | `/portaal/:token` (publiek) | Werkend |
| ClientApprovalPage | `/goedkeuring/:token` (publiek) | Werkend |
| PortaalGesloten | (sub-component) | Werkend |
| PortaalVerlopen | (sub-component) | Werkend |
| PortaalLightbox | (sub-component) | Werkend |
| PortaalReactieForm | (sub-component) | Werkend |

**Supabase tabellen:** `project_portalen`, `portaal_items`, `portaal_bestanden`, `portaal_reacties`, `portaal_instellingen`

#### visualizer/
| Component | Route | Status |
|-----------|-------|--------|
| VisualizerLayout | `/visualizer` | Werkend |
| SigningVisualizerDialog | (dialog) | Werkend |
| VisualisatieGallery | (sub-component) | Werkend |
| VisualisatieLightbox | (sub-component) | Werkend |
| VisualizerKostenDashboard | (sub-component) | Werkend |
| CreditsPakketDialog | (dialog) | Werkend |

**Supabase tabellen:** `signing_visualisaties`, `visualizer_credits`, `credit_transacties`, `visualizer_instellingen`, `visualizer_api_logs`, `visualizer_stats`

#### forgie/
| Component | Route | Status |
|-----------|-------|--------|
| ForgieChatPage | `/forgie` | Werkend |
| FORGEdeskAIChat | `/ai` | Werkend |
| AITextGenerator | (sub-component) | Werkend |
| ForgieAvatar | (sub-component) | Werkend |
| ForgieActieKaart | (sub-component) | Werkend |
| ForgieChatWidget | (sub-component) | Werkend |

**Supabase tabellen:** `ai_chats`, `ai_chat_history`, `ai_imported_data`, `ai_usage`

#### reports/
| Component | Route | Status |
|-----------|-------|--------|
| RapportagesLayout | `/rapportages` | Werkend |
| ForecastLayout | `/forecast` | Werkend |

**Supabase tabellen:** Leest uit `projecten`, `offertes`, `facturen`, `tijdregistraties`

#### settings/
| Component | Route | Status |
|-----------|-------|--------|
| SettingsLayout | `/instellingen` | Werkend |
| TeamLayout | `/team` | Werkend |
| DataImportLayout | `/importeren` | Werkend |
| AbonnementTab | (tab) | Werkend |
| CalculatieTab | (tab) | Werkend |
| ForgieTab | (tab) | Werkend |
| HuisstijlTab | (tab) | Werkend |
| PortaalTab | (tab) | Werkend |
| SidebarTab | (tab) | Werkend |
| TeamledenTab | (tab) | Werkend |
| VisualizerTab | (tab) | Werkend |

**Supabase tabellen:** `app_settings`, `profiles`, `document_styles`, `organisaties`, `medewerkers`, `uitnodigingen`

#### notifications/
| Component | Route | Status |
|-----------|-------|--------|
| MeldingenPage | `/meldingen` | Werkend |
| NotificatieCenter | (sub-component) | Werkend |

**Supabase tabellen:** `notificaties`, `app_notificaties`

#### onboarding/
| Component | Route | Status |
|-----------|-------|--------|
| WelkomPagina | `/welkom` | Werkend |
| OnboardingWizard | `/onboarding` | Werkend |
| LandingPage | (sub-component) | Werkend |
| FeatureIllustrations | (sub-component) | Werkend |

#### layouts/
| Component | Route | Status |
|-----------|-------|--------|
| AppLayout | `/` (parent wrapper) | Werkend |
| Header | (sub-component) | Werkend |
| HeaderNav | (sub-component) | Werkend |
| Sidebar | (sub-component) | Werkend |
| TabBar | (sub-component) | Werkend |
| TopNav | (sub-component) | Werkend |
| MobileBottomNav | (sub-component) | Werkend |

---

## 3. Database Schema

### Overzicht

- **Totaal tabellen:** 71
- **Totaal kolommen:** 1000+
- **Row Level Security:** Ingeschakeld op alle tabellen
- **Foreign keys:** ~80+
- **Storage buckets:** 3 (documenten, briefpapier, project-fotos)
- **Migraties:** 31

### Alle tabellen

| # | Tabel | Kolommen | Doel | RLS |
|---|-------|----------|------|-----|
| 1 | `profiles` | 20 | Gebruikersprofielen | Ja (uid = id) |
| 2 | `klanten` | 32 | Klanten/bedrijven | Ja |
| 3 | `projecten` | 24 | Projecten | Ja |
| 4 | `taken` | 16 | Taken | Ja |
| 5 | `offertes` | 46 | Offertes | Ja + publiek via token |
| 6 | `offerte_items` | 24 | Offerte regelitems | Ja (via offerte) |
| 7 | `offerte_versies` | 6 | Offerte versiegeschiedenis | Ja |
| 8 | `facturen` | 40 | Facturen | Ja + publiek via betaal_token |
| 9 | `factuur_items` | 11 | Factuur regelitems | Ja (via factuur) |
| 10 | `documenten` | 14 | Documentbeheer | Ja |
| 11 | `emails` | 34 | Email cache/geschiedenis | Ja |
| 12 | `events` | 14 | Kalender events | Ja |
| 13 | `grootboek` | 7 | Grootboekrekeningen | Ja |
| 14 | `btw_codes` | 7 | BTW codes | Ja |
| 15 | `kortingen` | 7 | Kortingen | Ja |
| 16 | `ai_chats` | 5 | AI chat geschiedenis | Ja |
| 17 | `tijdregistraties` | 17 | Urenregistratie | Ja |
| 18 | `medewerkers` | 16 | Medewerkers | Ja |
| 19 | `montage_afspraken` | 19 | Montage afspraken | Ja |
| 20 | `nieuwsbrieven` | 10 | Nieuwsbrieven | Ja |
| 21 | `notificaties` | 8 | Notificaties (legacy) | Ja |
| 22 | `app_notificaties` | 12 | App notificaties | Ja |
| 23 | `app_settings` | 60+ | App instellingen per user | Ja |
| 24 | `calculatie_producten` | 12 | Calculatie producten | Ja |
| 25 | `calculatie_templates` | 7 | Calculatie templates | Ja |
| 26 | `offerte_templates` | 7 | Offerte templates | Ja |
| 27 | `tekening_goedkeuringen` | 20 | Tekening goedkeuringen | Ja + publiek via token |
| 28 | `user_email_settings` | 11 | SMTP/IMAP credentials | Ja |
| 29 | `werkbonnen` | 26 | Werkbonnen | Ja |
| 30 | `werkbon_regels` | 13 | Werkbon regelitems | Ja |
| 31 | `werkbon_items` | 9 | Werkbon instructie-items | Ja |
| 32 | `werkbon_afbeeldingen` | 6 | Werkbon afbeeldingen | Ja (via werkbon_items) |
| 33 | `werkbon_fotos` | 7 | Werkbon foto's | Ja |
| 34 | `project_fotos` | 7 | Project foto's | Ja |
| 35 | `verlof` | 9 | Verlof/vakantie | Ja |
| 36 | `bedrijfssluitingsdagen` | 6 | Bedrijfssluitingsdagen | Ja |
| 37 | `project_toewijzingen` | 6 | Project team toewijzingen | Ja |
| 38 | `booking_slots` | 8 | Beschikbaarheidslots | Ja + publiek lezen |
| 39 | `booking_afspraken` | 12 | Publieke boekingen | Ja + publiek insert/lezen |
| 40 | `herinnering_templates` | 8 | Herinnering templates | Ja |
| 41 | `leveranciers` | 16 | Leveranciers | Ja |
| 42 | `uitgaven` | 19 | Uitgaven | Ja |
| 43 | `bestelbonnen` | 17 | Bestelbonnen | Ja |
| 44 | `bestelbon_regels` | 13 | Bestelbon regelitems | Ja |
| 45 | `leveringsbonnen` | 17 | Leveringsbonnen | Ja |
| 46 | `leveringsbon_regels` | 8 | Leveringsbon regelitems | Ja |
| 47 | `voorraad_artikelen` | 17 | Voorraad artikelen | Ja |
| 48 | `voorraad_mutaties` | 12 | Voorraad mutaties | Ja |
| 49 | `deals` | 24 | CRM deals/pipeline | Ja |
| 50 | `deal_activiteiten` | 9 | Deal activiteiten log | Ja |
| 51 | `klant_activiteiten` | 11 | Klant activiteiten timeline | Ja |
| 52 | `contactpersonen` | 9 | Klant contactpersonen | Ja |
| 53 | `vestigingen` | 9 | Klant vestigingen | Ja |
| 54 | `ingeplande_emails` | 12 | Geplande emails | Ja |
| 55 | `email_sequences` | 8 | Email automatisering | Ja |
| 56 | `lead_formulieren` | 15 | Lead capture formulieren | Ja + publiek via token |
| 57 | `lead_inzendingen` | 11 | Lead formulier inzendingen | Ja + publiek insert |
| 58 | `document_styles` | 24 | Document styling/branding | Ja |
| 59 | `project_portalen` | 8 | Klant project portalen | Ja |
| 60 | `portaal_items` | 16 | Portaal items | Ja |
| 61 | `portaal_bestanden` | 9 | Portaal bestanden | Ja |
| 62 | `portaal_reacties` | 7 | Portaal klant reacties | Ja |
| 63 | `visualizer_credits` | 6 | AI visualizer credits | Ja + service role |
| 64 | `credit_transacties` | 10 | Credit transacties | Ja + service role |
| 65 | `signing_visualisaties` | 22 | AI signing mockups | Ja |
| 66 | `ai_usage` | 8 | AI API gebruik tracking | Ja |
| 67 | `ai_imported_data` | 6 | Geimporteerde data voor AI context | Ja |
| 68 | `ai_chat_history` | 5 | Forgie AI chat geschiedenis | Ja |
| 69 | `exact_tokens` | 7 | Exact Online OAuth tokens | Ja |
| 70 | `inkoop_offertes` | 9 | Inkoop offertes | Ja |
| 71 | `inkoop_regels` | 9 | Inkoop offerte regels | Ja |

### Belangrijkste relaties (Foreign Keys)

```
profiles.id → auth.users.id
klanten.user_id → auth.users.id
projecten.klant_id → klanten.id (SET NULL)
taken.project_id → projecten.id (CASCADE)
offertes.klant_id → klanten.id (SET NULL)
offerte_items.offerte_id → offertes.id (CASCADE)
facturen.klant_id → klanten.id (SET NULL)
facturen.offerte_id → offertes.id (SET NULL)
facturen.project_id → projecten.id (SET NULL)
factuur_items.factuur_id → facturen.id (CASCADE)
werkbonnen.project_id → projecten.id (CASCADE)
werkbonnen.klant_id → klanten.id (CASCADE)
werkbonnen.offerte_id → offertes.id (SET NULL)
werkbon_items.werkbon_id → werkbonnen.id (CASCADE)
werkbon_afbeeldingen.werkbon_item_id → werkbon_items.id (CASCADE)
documenten.project_id → projecten.id (SET NULL)
documenten.klant_id → klanten.id (SET NULL)
montage_afspraken.project_id → projecten.id (SET NULL)
tijdregistraties.project_id → projecten.id (SET NULL)
deals.klant_id → klanten.id (CASCADE)
deal_activiteiten.deal_id → deals.id (CASCADE)
klant_activiteiten.klant_id → klanten.id (CASCADE)
contactpersonen.klant_id → klanten.id (CASCADE)
vestigingen.klant_id → klanten.id (CASCADE)
bestelbonnen.leverancier_id → leveranciers.id (CASCADE)
bestelbon_regels.bestelbon_id → bestelbonnen.id (CASCADE)
leveringsbonnen.klant_id → klanten.id (CASCADE)
leveringsbon_regels.leveringsbon_id → leveringsbonnen.id (CASCADE)
uitgaven.leverancier_id → leveranciers.id (SET NULL)
voorraad_mutaties.artikel_id → voorraad_artikelen.id (CASCADE)
lead_inzendingen.formulier_id → lead_formulieren.id (CASCADE)
portaal_items.portaal_id → project_portalen.id (CASCADE)
portaal_bestanden.portaal_item_id → portaal_items.id (CASCADE)
portaal_reacties.portaal_item_id → portaal_items.id (CASCADE)
signing_visualisaties.offerte_id → offertes.id (SET NULL)
signing_visualisaties.project_id → projecten.id (SET NULL)
credit_transacties.user_id → auth.users.id (CASCADE)
inkoop_offertes.project_id → projecten.id (SET NULL)
inkoop_regels.inkoop_offerte_id → inkoop_offertes.id (CASCADE)
```

### RLS Patronen

1. **Standaard user_id isolatie** — gebruikers zien alleen eigen data: `auth.uid() = user_id`
2. **Child table access via parent** — bijv. offerte_items checkt eigendom van offerte
3. **Publieke/anonieme toegang via token** — offertes.publiek_token, facturen.betaal_token, tekening_goedkeuringen.token

### Storage Buckets

| Bucket | Publiek | Doel |
|--------|---------|------|
| `documenten` | Nee | Documenten, bijlagen, handtekeningen |
| `briefpapier` | Ja (lezen) | Briefpapier achtergronden |
| `project-fotos` | Ja | Project foto's |

### Migratie-geschiedenis

31 migraties, van initieel schema tot organisatie/team uitnodigingen. Belangrijkste stappen:
1. Initieel schema (profiles, klanten, projecten, taken, offertes, etc.)
2. Factuur editor & status extensies
3. IMAP/email settings
4. AI usage tracking & Forgie chat
5. Visualizer credits systeem
6. Mollie & Exact Online integraties
7. Werkbonnen & gerelateerde tabellen
8. Klant portaal framework
9. Organisaties & team uitnodigingen

---

## 4. Routes

### Context Providers (wrapping volgorde)

1. BrowserRouter
2. ThemeProvider
3. PaletteProvider
4. LanguageProvider
5. AuthProvider
6. AppSettingsProvider
7. SidebarProvider
8. TabsProvider
9. ErrorBoundary
10. Toaster (Sonner)

### Publieke routes (geen authenticatie)

| Pad | Component | Doel |
|-----|-----------|------|
| `/login` | LoginPage | Inloggen |
| `/register` | RegisterPage | Registreren |
| `/registreren` | RegisterPage | NL alias registreren |
| `/check-inbox` | CheckInboxPage | Email verificatie |
| `/wachtwoord-vergeten` | ForgotPasswordPage | Wachtwoord vergeten |
| `/wachtwoord-resetten` | ResetPasswordPage | Wachtwoord resetten |
| `/goedkeuring/:token` | ClientApprovalPage | Klant goedkeuring portaal |
| `/boeken/:userId` | PublicBookingPage | Publieke boekingspagina |
| `/betalen/:token` | BetaalPagina | Betaalpagina (Mollie) |
| `/betaald` | BetaaldPagina | Betaling bevestigd |
| `/offerte-bekijken/:token` | OffertePubliekPagina | Publieke offerte weergave |
| `/formulier/:token` | LeadFormulierPubliek | Publiek lead formulier |
| `/portaal/:token` | PortaalPagina | Klant project portaal |

### Beveiligde routes (ProtectedRoute)

**Onboarding:**

| Pad | Component |
|-----|-----------|
| `/welkom` | WelkomPagina |
| `/onboarding` | OnboardingWizard |

**AppLayout nested routes (alle onder `/`):**

| Pad | Component | Lazy |
|-----|-----------|------|
| `/` (index) | FORGEdeskDashboard | Nee |
| `/projecten` | ProjectsList | Nee |
| `/projecten/nieuw` | ProjectCreate | Nee |
| `/projecten/:id` | ProjectDetail | Nee |
| `/klanten` | ClientsLayout | Nee |
| `/klanten/importeren` | KlantenImportPage | Nee |
| `/klanten/:id` | ClientProfile | Nee |
| `/deals` | DealsLayout | Nee |
| `/deals/:id` | DealDetail | Nee |
| `/offertes` | QuotesPipeline | Nee |
| `/offertes/nieuw` | QuoteCreation | Nee |
| `/offertes/:id` | QuoteCreation | Nee |
| `/offertes/:id/bewerken` | QuoteCreation | Nee |
| `/offertes/:id/preview` | ForgeQuotePreview | Nee |
| `/offertes/:id/detail` | OfferteDetail | Nee |
| `/inkoopoffertes` | InkoopOffertesPage | Nee |
| `/documenten` | DocumentsLayout | Nee |
| `/email` | EmailLayout | Nee |
| `/email/compose` | EmailComposePage | Nee |
| `/nieuwsbrieven` | NewsletterBuilder | Nee |
| `/planning` | PlanningLayout | Nee |
| `/kalender` | → Navigate `/planning` | Redirect |
| `/montage` | → Navigate `/planning?modus=montage` | Redirect |
| `/booking` | BookingBeheer | Nee |
| `/taken` | TasksLayout | Nee |
| `/financieel` | FinancialLayout | Nee |
| `/facturen` | FacturenLayout | Nee |
| `/facturen/nieuw` | FactuurEditor | Nee |
| `/facturen/:id` | FactuurEditor | Nee |
| `/facturen/:id/bewerken` | FactuurEditor | Nee |
| `/voorraad` | VoorraadLayout | Nee |
| `/werkbonnen` | WerkbonnenLayout | Nee |
| `/werkbonnen/:id` | WerkbonDetail | Nee |
| `/bestelbonnen` | BestelbonnenLayout | Nee |
| `/bestelbonnen/:id` | BestelbonDetail | Nee |
| `/leveringsbonnen` | LeveringsbonnenLayout | Nee |
| `/leveringsbonnen/:id` | LeveringsbonDetail | Nee |
| `/rapportages` | RapportagesLayout | Nee |
| `/forecast` | ForecastLayout | Nee |
| `/tijdregistratie` | TijdregistratieLayout | Nee |
| `/nacalculatie` | NacalculatieLayout | Nee |
| `/leads` | LeadCaptureLayout | Nee |
| `/leads/formulieren/nieuw` | LeadFormulierEditor | Nee |
| `/leads/formulieren/:id` | LeadFormulierEditor | Nee |
| `/leads/inzendingen` | LeadInzendingenLayout | Nee |
| `/ai` | FORGEdeskAIChat | Nee |
| `/forgie` | ForgieChatPage | Nee |
| `/instellingen` | SettingsLayout | Nee |
| `/team` | TeamLayout | Nee |
| `/importeren` | DataImportLayout | Nee |
| `/portalen` | PortalenOverzicht | Nee |
| `/meldingen` | MeldingenPage | Nee |
| `/visualizer` | VisualizerLayout | Nee |
| `*` | NotFoundPage | 404 |

**Opmerkingen:**
- Geen lazy loading — alle componenten statisch geimporteerd
- Nested routing via React Router `<Outlet />`
- Data-initialisatie via `useDataInit()` hook
- Globale UI: CommandPalette, ErrorBoundary, Toaster op app-niveau

---

## 5. Services

### supabaseService.ts — Core CRUD (~5600 regels)

**Entiteiten & functies:**

| Entiteit | Functies | Supabase Tabel(len) |
|----------|----------|---------------------|
| Klanten | get, getById, create, update, delete | `klanten` |
| Projecten | get, getById, getByKlant, create, update, delete | `projecten` |
| Taken | get, getById, getByProject, create, update, delete | `taken` |
| Offertes | get, getById, getByProject, getByKlant, create, update, delete | `offertes` |
| Offerte Items | get, create, update, delete | `offerte_items` |
| Offerte Versies | get, create | `offerte_versies` |
| Facturen | get, getById, getByKlant, getByProject, create, update, updateStatus, delete | `facturen` |
| Factuur Items | get, create | `factuur_items` |
| Documenten | get, getById, getByProject, getByKlant, create, update, delete | `documenten` |
| Emails | get, create, delete | `emails` |
| Events | get, create, update, delete | `events` |
| Grootboek | get, create | `grootboek` |
| BTW Codes | get, create | `btw_codes` |
| Kortingen | get, create | `kortingen` |
| AI Chats | get, create, deleteAll | `ai_chats` |
| Nieuwsbrieven | get, create | `nieuwsbrieven` |
| Calculatie Producten | get, create, update, delete | `calculatie_producten` |
| Calculatie Templates | get, create, update, delete | `calculatie_templates` |
| Offerte Templates | get, create, update, delete | `offerte_templates` |
| Tekening Goedkeuringen | get, getByProject, create, update | `tekening_goedkeuringen` |
| Tijdregistraties | get, getByProject, create, update, delete | `tijdregistraties` |
| Medewerkers | get, create, update, delete | `medewerkers` |
| Montage Afspraken | get, create, update, delete | `montage_afspraken` |
| Verlof | get, create, update, delete | `verlof` |
| Bedrijfssluitingsdagen | get, create, delete | `bedrijfssluitingsdagen` |
| Project Toewijzingen | get, create, delete | `project_toewijzingen` |
| Booking Slots | get, create, update, delete | `booking_slots` |
| Booking Afspraken | get, create, update | `booking_afspraken` |
| Werkbonnen | get, getById, getByProject, create, update, delete | `werkbonnen` |
| Werkbon Items | get, create, update, delete | `werkbon_items` |
| Herinnering Templates | get, upsert | `herinnering_templates` |
| Leveranciers | get, create, update, delete | `leveranciers` |
| Uitgaven | get, create, update, delete | `uitgaven` |
| Bestelbonnen | get, create, update, delete | `bestelbonnen` |
| Leveringsbonnen | get, create, update, delete | `leveringsbonnen` |
| Voorraad Artikelen | get, create, update, delete | `voorraad_artikelen` |
| Voorraad Mutaties | get, create | `voorraad_mutaties` |
| Deals | get, getByMedewerker, create, update, delete | `deals` |
| Deal Activiteiten | get, create, delete | `deal_activiteiten` |
| Lead Formulieren | get, getById, getByToken, create, update, delete | `lead_formulieren` |
| Lead Inzendingen | get, getAll, getNieuw, create, update | `lead_inzendingen` |
| Document Style | get, upsert | `document_styles` |
| Project Portalen | getAll, getByProject, getByToken, create, verlengen, deactiveren | `project_portalen` |
| Portaal Items | get, create, update, delete | `portaal_items` |
| Signing Visualisaties | get, getByOfferte, getByProject, getByKlant, create, update, delete | `signing_visualisaties` |
| Visualizer Credits | get, gebruikCredit, voegToe, handmatigToewijzen | `visualizer_credits` |
| Project Fotos | get, create, delete | `project_fotos` |
| Inkoop Offertes | get, create, update, delete | `inkoop_offertes` |
| Profiel | get, update, uploadAvatar | `profiles` |
| App Settings | get, update | `app_settings` |
| Organisatie | get, create, update | `organisaties` |

**Nummergeneratie:** `generateOfferteNummer`, `generateFactuurNummer`, `generateCreditnotaNummer`, `generateProjectNummer`

**Conversies:** `convertOfferteToFactuur`, `convertWerkbonToFactuur`, `createCreditnota`, `createVoorschotfactuur`

### Andere services

| Service | Externe API | Model/Protocol |
|---------|-------------|----------------|
| aiService.ts | Anthropic | claude-sonnet-4-6 |
| aiRewriteService.ts | Anthropic | claude-haiku-4-5-20251001 |
| forgieService.ts | Anthropic (via /api/ai-email) | claude-sonnet-4-6 |
| forgieChatService.ts | Anthropic (via /api/ai-chat) | claude-sonnet-4-6 |
| gmailService.ts | IMAP/SMTP (via /api/*) | Nodemailer |
| pdfService.ts | — | jsPDF + jspdf-autotable |
| werkbonPdfService.ts | — | jsPDF |
| storageService.ts | Supabase Storage | — |
| emailTemplateService.ts | — | HTML template generatie |
| importService.ts | — | CSV parsing + localStorage |

### Architectuurpatroon: Dual Storage

Alle services checken `isSupabaseConfigured()`:
- **Productie:** Supabase voor persistentie
- **Demo/Development:** Fallback naar localStorage

---

## 6. Design System

### Fonts

| Categorie | Fonts |
|-----------|-------|
| Sans/Display (primair) | Plus Jakarta Sans, Outfit, system-ui, sans-serif |
| Monospace | DM Mono, ui-monospace, SFMono-Regular |
| Serif | DM Serif Display, Georgia |
| Standaard grootte | 14px |

### Typography scale

| Token | Grootte | Gewicht | Tracking |
|-------|---------|---------|----------|
| h1 | 28px | extrabold | -0.04em |
| h2 | xl | bold | -0.02em |
| h3 | lg | semibold | — |
| h4 | base | medium | — |
| 2xs | 10px | — | — |
| label | — | — | 0.06em |

### Kleurensysteem

**Design filosofie:** "Earthy, premium, distinctive"

**Basis kleuren (Light mode):**

| Token | HSL | Hex | Doel |
|-------|-----|-----|------|
| --background | 40 14% 95% | #F4F3F0 | Warm off-white achtergrond |
| --foreground | 0 0% 10% | #1A1A1A | Tekst |
| --primary | 0 0% 10% | #1A1A1A | Knoppen |
| --accent | 145 22% 45% | #5A8264 | Sage accent |
| --destructive | 5 52% 54% | #C45B4F | Destructieve acties |
| --border | 36 12% 90% | #E8E6E0 | Randen |
| --muted-foreground | 0 0% 42% | #6B6B6B | Secundaire tekst |

**Pastel palette (FORGEdesk signatuur):**

| Kleur | DEFAULT | Deep | Achtergrond | Tekst |
|-------|---------|------|-------------|-------|
| Blush | #EDCFC4 | #B8806A | #F9E8E8 | #C0514A |
| Sage | #B8CCBE | #4E7A58 | #E8F2EC | #3A7D52 |
| Mist | #BCCAD6 | #4A6E8A | #E8EEF9 | #3A5A9A |
| Cream | #E2DCCB | #8A7E60 | #F5F2E8 | #8A7A4A |
| Lavender | #D5CCE6 | #6B5B8A | #EEE8F9 | #6A4A9A |
| Peach | #F5D5C8 | #C4735A | #FDE8E4 | #C0451A |

**Module-specifieke kleuren:**

| Module | Kleur |
|--------|-------|
| Projecten | #7EB5A6 |
| Klanten | #8BAFD4 |
| Offertes | #9B8EC4 |
| Facturen | #E8866A |
| Werkbonnen | #D4836A |
| Taken | #C4A882 |
| Planning | #7EB5A6 |
| Email | #8BAFD4 |

**Status badge kleuren:**

| Status | Achtergrond | Tekst | Dot |
|--------|-------------|-------|-----|
| Success | #E8F5EC | #4A9960 | #4A9960 |
| Warning | #F8F0E0 | #B8883A | #B8883A |
| Danger | #FAE8E6 | #C45B4F | #C45B4F |
| Info | #E8EFF8 | #4A7AB5 | #4A7AB5 |
| Neutral | #F0F0EE | #8A8A8A | #8A8A8A |
| Purple | #EEE8F8 | #7A5AB5 | #7A5AB5 |

### Thema's

4 thema's beschikbaar via `data-theme` attribuut en `.dark` class:

1. **Default (Light)** — Warm off-white, sage accenten
2. **Dark** — Donkere achtergrond (40 6% 8%), lichte tekst
3. **Glass** (`data-theme="glass"`) — Frosted glass met backdrop blur, iOS-achtig
4. **Zwart** (`data-theme="zwart"`) — Pure black (#000), OLED-geoptimaliseerd

### Border Radius

| Token | Waarde |
|-------|--------|
| --radius-sm | 6px |
| --radius-md | 8px |
| --radius-lg | 10px |
| --radius-xl | 14px |
| --radius-2xl | 18px |
| --radius (basis) | 10px |

### Animaties

| Animatie | Duur | Easing | Doel |
|----------|------|--------|------|
| fadeUp | var(--duration-slow) | var(--ease-out) | Entrance |
| fadeIn | 0.4s | ease-out | Entrance |
| scaleIn | 0.25s | cubic-bezier(0.16,1,0.3,1) | Entrance |
| slideInLeft | 0.3s | cubic-bezier(0.16,1,0.3,1) | Entrance |
| float | 5s | ease-in-out infinite | Decoratief |
| marquee | 30s | linear infinite | Scrolling tekst |
| shimmer | 3s | ease-in-out infinite | Loading |
| counterUp | 0.6s | cubic-bezier(0.16,1,0.3,1) | Getal animatie |
| accordion-down/up | 0.2s | ease-out | Radix accordion |

**Timing variabelen:**

| Token | Waarde |
|-------|--------|
| --duration-fast | 120ms |
| --duration-normal | 200ms |
| --duration-slow | 350ms |
| --ease-out | cubic-bezier(0.16, 1, 0.3, 1) |

### Component classes

| Class | Doel |
|-------|------|
| `.wm-card` | Basiskaart met schaduw en hover |
| `.wm-stat-card` | Premium stat kaarten |
| `.wm-glass` | Glassmorphism container |
| `.wm-sidebar` | Sidebar styling |
| `.wm-table` | Tabel styling |
| `.wm-quick-action` | Actieknoppen met hover lift |
| `.wm-gradient-text` | Gradient tekst |
| `.wm-welcome-banner` | Welkom banner met animated orb |
| `.badge-*` | Status badges (success, warning, danger, etc.) |
| `.wm-stagger` | Orchestrated entrance animatie (max 8 children) |

---

## 7. Contexts

### TabsContext

| Eigenschap | Type | Doel |
|------------|------|------|
| `tabs` | AppTab[] | Open tabs met path, label, icon, isDirty |
| `activeTabId` | string | Actieve tab ID |
| `openTab(tab)` | functie | Tab openen of ernaar switchen |
| `newTab()` | functie | Nieuwe dashboard tab (Cmd+T) |
| `closeTab(id)` | functie | Tab sluiten met unsaved warning |
| `closeOtherTabs(id)` | functie | Alle andere tabs sluiten |
| `closeAllTabs()` | functie | Alle tabs sluiten |
| `setTabDirty(id, dirty)` | functie | Unsaved changes markeren |
| `reorderTabs(from, to)` | functie | Tabs herordenen via drag |

**Persistentie:** localStorage (`forgedesk_tabs`, `forgedesk_active_tab`)

### AuthContext

| Eigenschap | Type | Doel |
|------------|------|------|
| `user` | User | Gebruiker (id, email, naam) |
| `session` | Session | Supabase auth sessie |
| `isAuthenticated` | boolean | Auth status |
| `organisatieId` | string | Huidige organisatie |
| `userRol` | string | Team rol |
| `isAdmin` | boolean | Admin check |
| `trialDagenOver` | number | Resterende trial dagen |
| `trialStatus` | string | 'trial' \| 'actief' \| 'verlopen' \| 'opgezegd' |
| `login(email, pw)` | functie | Inloggen |
| `register(email, pw)` | functie | Registreren |
| `logout()` | functie | Uitloggen |

### AppSettingsContext

| Eigenschap | Type | Doel |
|------------|------|------|
| `settings` | AppSettings | 50+ configuratie-opties |
| `profile` | Profile | Gebruikersprofiel |
| `updateSettings(updates)` | functie | Settings bijwerken |
| `updateUserProfile(updates)` | functie | Profiel bijwerken |
| `refreshSettings()` | functie | Settings herladen |

**Convenience getters:** valuta, BTW %, offerte/factuur prefix, betaaltermijn, email handtekening, Forgie enabled, etc.

### SidebarContext

| Eigenschap | Type | Doel |
|------------|------|------|
| `isCollapsed` | boolean | Sidebar open/dicht |
| `sidebarWidth` | number | Breedte (180-360px, default 220) |
| `layoutMode` | string | 'sidebar' \| 'topnav' |
| `toggleSidebar()` | functie | Toggle collapsed |
| `setSidebarWidth(w)` | functie | Breedte instellen |
| `setLayoutMode(m)` | functie | Layout mode wijzigen |

### ThemeContext

| Eigenschap | Type | Doel |
|------------|------|------|
| `theme` | string | 'light' \| 'dark' |
| `toggleTheme()` | functie | Thema wisselen |
| `setTheme(t)` | functie | Specifiek thema instellen |

### PaletteContext

| Eigenschap | Type | Doel |
|------------|------|------|
| `appThemeId` | string | 'normaal' \| 'dark' |
| `accentId` | string | sage, terracotta, ocean, amber, berry, slate |
| `setAppThemeId(id)` | functie | Thema wisselen |
| `setAccentId(id)` | functie | Accent kleur wijzigen |

### LanguageContext

| Eigenschap | Type | Doel |
|------------|------|------|
| `language` | string | 'nl' \| 'en' |
| `t(key)` | functie | Vertaal key → tekst |
| `setLanguage(lang)` | functie | Taal wisselen |

**1000+ vertaalsleutels:** nav.*, common.*, status.*, dashboard.*, klanten.*, projecten.*, offertes.*, email.*, agenda.*, etc.

---

## 8. Hooks

| Hook | Parameters | Return | Doel |
|------|------------|--------|------|
| `useData` / `useServiceData<T>` | fetcher functie | `{data, isLoading, error, refetch}` | Generieke data-fetching |
| `useKlanten` | — | useServiceData | Klanten lijst |
| `useProjecten` | — | useServiceData | Projecten lijst |
| `useTaken` | — | useServiceData | Taken lijst |
| `useOffertes` | — | useServiceData | Offertes lijst |
| `useEmails` | — | useServiceData | Email lijst |
| `useEvents` | — | useServiceData | Kalender events |
| `useDocumenten` | — | useServiceData | Documenten lijst |
| `useGrootboek` | — | useServiceData | Grootboek |
| `useBtwCodes` | — | useServiceData | BTW codes |
| `useKortingen` | — | useServiceData | Kortingen |
| `useLocalStorage<T>` | key, initialValue | `[T, setT]` | localStorage sync |
| `useDebounce<T>` | value, delay | T | Debounce waarden |
| `useDataInit` | — | `{isReady}` | localStorage init + demo data seed |
| `useOnlineStatus` | — | boolean | Online/offline status |
| `useCountUp` | target, duration?, decimals? | number | Getal animatie |
| `useNavigateWithTab` | — | `{navigateWithTab, navigateSimple}` | Navigatie + tab |
| `useTabDirtyState` | — | `{setDirty, isDirty, tabId}` | Unsaved changes per tab |
| `useTabShortcuts` | — | void | Keyboard shortcuts |
| `useUnsavedWarning` | isDirty | void | beforeunload warning |
| `useTrialGuard` | — | `{isBlocked, guardAction, showDialog}` | Trial expiratie check |
| `useDocumentStyle` | — | DocumentStyle \| null | Document styling |
| `usePortaalHerinnering` | — | void (side effects) | Auto-herinneringen >3 dagen |
| `useProjectSidebarConfig` | — | `{config, toggleBox, setBoxVisible}` | Project sidebar secties |
| `useSidebarLayout` | — | `{order, pinned, togglePin, moveSection, drag handlers}` | Drag-reorder sidebar |
| `useDashboardLayout` | — | `{order, hidden, sizes, toggleWidget, resetLayout, drag handlers}` | Dashboard widget config |

---

## 9. API Routes

### AI & Chat

| Endpoint | Methode | Auth | Externe service | Doel |
|----------|---------|------|-----------------|------|
| `/api/ai` | POST | Bearer | Anthropic (claude-sonnet-4-6) | Multi-turn AI chat |
| `/api/ai-chat` | POST | Bearer | Anthropic (claude-sonnet-4-6) | Forgie business AI (chat, history, CSV import) |
| `/api/ai-rewrite` | POST | Bearer | Anthropic (claude-haiku-4-5-20251001) | Tekst herschrijven (10 acties) |
| `/api/ai-email` | POST | Bearer | Anthropic (claude-sonnet-4-6) | Email-specifiek AI herschrijven |
| `/api/analyze-inkoop-offerte` | POST | Bearer | Anthropic (vision) | Inkoopfactuur regels extraheren (PDF/afbeelding) |
| `/api/generate-signing-mockup` | POST | Bearer | Anthropic + fal.ai | AI signing visualisatie genereren |

### Authenticatie & Team

| Endpoint | Methode | Auth | Doel |
|----------|---------|------|------|
| `/api/invite-team-member` | POST | Bearer | Teamlid uitnodigen |
| `/api/manage-team-member` | PATCH | Bearer | Teamlid rol/status beheren |

### Integraties

| Endpoint | Methode | Auth | Externe service | Doel |
|----------|---------|------|-----------------|------|
| `/api/exact-auth` | GET | Bearer | Exact Online | OAuth initiate |
| `/api/exact-callback` | GET | — | Exact Online | OAuth callback |
| `/api/exact-refresh` | POST | Bearer | Exact Online | Token refresh |
| `/api/exact-sync-factuur` | POST | Bearer | Exact Online | Factuur sync als SalesEntry |
| `/api/kvk-zoeken` | GET | Bearer | KVK API | Bedrijf zoeken (20 req/min) |
| `/api/kvk-basisprofiel` | GET | Bearer | KVK API | Bedrijfsdetails ophalen |
| `/api/probo-products` | GET | Bearer | Probo API | Producten lijst (1u cache) |
| `/api/probo-product-detail` | GET | Bearer | Probo API | Product details (30min cache) |
| `/api/probo-price` | POST | Bearer | Probo API | Printprijzen ophalen |
| `/api/probo-configure` | POST | Bearer | Probo API | Stapsgewijze productconfiguratie |

### Betalingen & Abonnementen

| Endpoint | Methode | Auth | Externe service | Doel |
|----------|---------|------|-----------------|------|
| `/api/create-checkout-session` | POST | Bearer | Stripe | Credits kopen (3 pakketten: starter/pro/enterprise) |
| `/api/create-subscription` | POST | Bearer | Stripe | Abonnement aanmaken |
| `/api/create-portal-session` | POST | Bearer | Stripe | Billing portal sessie |
| `/api/stripe-webhook` | POST | Webhook | Stripe | Checkout/subscription events |
| `/api/mollie-create-payment` | POST | Bearer | Mollie | Betaallink voor factuur |
| `/api/mollie-webhook` | POST | Webhook | Mollie | Betaling callback (HMAC-SHA256) |

### Email

| Endpoint | Methode | Auth | Doel |
|----------|---------|------|------|
| `/api/email-settings` | POST | Bearer | Email credentials opslaan (AES-256-CBC) |
| `/api/test-email-connection` | POST | — | IMAP/SMTP connectie testen |
| `/api/send-email` | POST | — | Email verzenden via SMTP |
| `/api/fetch-emails` | POST | — | Email lijst ophalen via IMAP |
| `/api/read-email` | POST | — | Volledige email lezen via IMAP |

### Offerte (publiek)

| Endpoint | Methode | Auth | Rate limit | Doel |
|----------|---------|------|------------|------|
| `/api/offerte-publiek` | GET | — | 10/min | Publieke offerte weergave + view tracking |
| `/api/offerte-accepteren` | POST | — | 10/min/IP | Offerte accepteren + email notificatie |
| `/api/offerte-wijziging` | POST | — | 10/min | Wijziging aanvragen |

### Portaal (publiek)

| Endpoint | Methode | Auth | Rate limit | Doel |
|----------|---------|------|------------|------|
| `/api/portaal-create` | POST | Bearer | — | Portaal aanmaken (30 dagen geldig) |
| `/api/portaal-get` | GET | — | 30/min/IP | Portaal data ophalen |
| `/api/portaal-upload` | POST | — | 10/uur/IP | Bestand uploaden (max 10MB, JPG/PNG/PDF) |
| `/api/portaal-reactie` | POST | — | 10/uur/IP | Klant feedback (goedkeuring/revisie/bericht) |
| `/api/portaal-verlengen` | POST | Bearer | — | Verlooptijd +30 dagen |
| `/api/portaal-link-aanvragen` | POST | — | 3/uur/IP | Nieuwe link aanvragen |
| `/api/portaal-bekeken` | POST | — | 20/uur/IP | Items als bekeken markeren |

### Overig

| Endpoint | Methode | Auth | Doel |
|----------|---------|------|------|
| `/api/goedkeuring-reactie` | POST | — (10/uur/IP) | Tekening goedkeuring/revisie |
| `/api/emailTemplate` | — | — | Helper module voor HTML email templates |

### Externe integraties samenvatting

| Service | Doel | Endpoints |
|---------|------|-----------|
| **Anthropic** | AI chat, rewrite, email, visualizer prompts | 6 endpoints |
| **Exact Online** | Boekhouding sync (facturen) | 4 endpoints |
| **Mollie** | Nederlandse betalingen | 2 endpoints |
| **Stripe** | Internationale betalingen + abonnementen | 4 endpoints |
| **Probo** | Print shop integratie | 4 endpoints |
| **KVK** | Bedrijfsregistratie lookup | 2 endpoints |
| **fal.ai** | AI beeldgeneratie | 1 endpoint |
| **IMAP/SMTP** | Email integratie | 5 endpoints |

---

## 10. Bekende Problemen

### TODO Comments

| Bestand | Regel | Inhoud |
|---------|-------|--------|
| `src/components/settings/SettingsLayout.tsx` | 1375 | `const isAdmin = true // TODO: koppel aan app_rol wanneer rollen geïmplementeerd zijn` |

### FIXME / HACK Comments

Geen gevonden.

### console.error (moet logger.error zijn)

| Bestand | Regel | Korte beschrijving |
|---------|-------|--------------------|
| `src/services/gmailService.ts` | 36 | authenticateGmail mislukt |
| `src/services/gmailService.ts` | 141 | starEmail ophalen mislukt |
| `src/services/gmailService.ts` | 151 | starEmail update mislukt |
| `src/services/gmailService.ts` | 318 | getEmailSettings mislukt |
| `src/services/supabaseService.ts` | 1837 | updateAppSettings upsert failed |
| `src/components/projects/ProjectPortaalTab.tsx` | 144 | Fout bij ophalen portaal |
| `src/components/settings/TeamledenTab.tsx` | 145 | Error loading team data |
| `src/components/settings/SettingsLayout.tsx` | 1745 | Email voorkeuren opslaan mislukt |
| `src/components/portaal/PortalenOverzicht.tsx` | 173 | Fout bij ophalen portalen |
| `src/components/visualizer/VisualizerLayout.tsx` | 425 | Opslaan mislukt |
| `src/components/shared/KvkZoekVeld.tsx` | 93 | KvK zoeken error |

### console.warn (moet logger.warn zijn)

| Bestand | Regel | Korte beschrijving |
|---------|-------|--------------------|
| `src/utils/auditLogger.ts` | 29 | Audit log schrijven mislukt |
| `src/services/pdfService.ts` | 117 | Briefpapier achtergrond laden mislukt |
| `src/services/supabaseService.ts` | 499 | getOffertes fallback to localStorage |
| `src/hooks/usePortaalHerinnering.ts` | 21 | Herinnering check mislukt |
| `src/hooks/useDataInit.ts` | 804 | localStorage init failed |

### TypeScript suppressions

Geen `@ts-ignore` of `@ts-expect-error` gevonden.

### Recente fix

- **FacturenLayout.tsx** — `selectedIds` was niet gedeclareerd (useState ontbrak na mappenreorganisatie). Fix: `const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())` toegevoegd.

### Observaties

| Categorie | Bevinding | Ernst |
|-----------|-----------|-------|
| TODO comments | 1 (admin rol koppeling) | Laag |
| FIXME / HACK | 0 | — |
| console.log (buiten logger) | 0 | — |
| console.error (moet logger zijn) | 11 | Laag — functioneel correct, niet consistent |
| console.warn (moet logger zijn) | 5 | Laag — functioneel correct, niet consistent |
| TypeScript suppressions | 0 | — |
| Lazy loading | 0 van 50+ routes | Medium — grote initiele bundle |
| Ongebruikte exports | Niet gevonden | — |
| Broken imports | Geen gevonden (na selectedIds fix) | — |

---

*Einde blueprint. Gegenereerd door codebase-analyse op 2026-03-16.*
