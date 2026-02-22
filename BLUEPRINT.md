# WORKMATE APP - COMPREHENSIVE BLUEPRINT

## 1. TECH STACK

**Framework & Core**
- React: ^18.2.0
- React Router DOM: ^6.22.0
- TypeScript: ^5.3.3
- Vite: ^5.0.12

**UI & Styling**
- Tailwind CSS: ^3.4.1
- shadcn/ui components (Radix UI based)
- Lucide React: ^0.312.0 (icons)
- Tailwind Merge: ^2.2.1
- Tailwind Animate: ^1.0.7
- Class Variance Authority: ^0.7.0
- clsx: ^2.1.0

**Backend & Data**
- Supabase JS: ^2.39.3
- Zod: ^3.22.4 (data validation)

**Features**
- Sonner: ^1.4.0 (toast notifications)
- date-fns: ^3.3.1 (date utilities)
- jsPDF: ^2.5.1 (PDF generation)
- jsPDF AutoTable: ^3.8.1 (PDF tables)
- Recharts: ^2.12.0 (charts)

**Dev Tools**
- Autoprefixer: ^10.4.17
- PostCSS: ^8.4.33
- Vite React Plugin: ^4.2.1

---

## 2. PROJECT STRUCTURE (src/)

```
src/
├── components/          # 90 React components organized by feature
│   ├── ai/              # AI Assistant features
│   ├── approval/        # Client approval/drawing approval system
│   ├── auth/            # Authentication (Login, Register, ProtectedRoute)
│   ├── calendar/        # Calendar views (Day, Week, Month)
│   ├── clients/         # Client management
│   ├── dashboard/       # Dashboard widgets and main view
│   ├── documents/       # Document management
│   ├── email/           # Email features (compose, templates, tracking, sequences)
│   ├── financial/       # Financial settings (ledger, VAT, discounts)
│   ├── import/          # Data import
│   ├── invoices/        # Invoice/Facturatie system
│   ├── layouts/         # Main app layout, header, sidebar
│   ├── montage/         # Montage/Installation planning
│   ├── nacalculatie/    # Post-calculation
│   ├── newsletter/      # Newsletter builder
│   ├── notifications/   # Notification center
│   ├── projects/        # Project management
│   ├── quotes/          # Quote/Offerte system
│   ├── reports/         # Reports/Rapportages
│   ├── settings/        # App settings
│   ├── shared/          # Shared components (ErrorBoundary, NotFoundPage, CommandPalette)
│   ├── tasks/           # Task management
│   ├── team/            # Team management
│   ├── timetracking/    # Time tracking
│   └── ui/              # shadcn/ui components (18 components)
├── contexts/            # 6 Context Providers
│   ├── AppSettingsContext.tsx
│   ├── AuthContext.tsx
│   ├── LanguageContext.tsx
│   ├── PaletteContext.tsx
│   ├── SidebarContext.tsx
│   └── ThemeContext.tsx
├── hooks/               # Custom React hooks
│   ├── useData.ts
│   ├── useDataInit.ts
│   ├── useDebounce.ts
│   └── useLocalStorage.ts
├── lib/                 # Utilities
│   ├── export.ts        # CSV/Excel export helpers
│   └── utils.ts         # Formatting and UI utilities
├── services/            # Backend communication
│   ├── aiService.ts     # AI features
│   ├── authService.ts   # Authentication
│   ├── emailTemplateService.ts
│   ├── gmailService.ts  # Gmail integration
│   ├── pdfService.ts    # PDF generation
│   ├── storageService.ts
│   ├── supabaseClient.ts
│   └── supabaseService.ts (2192 lines - main data service)
├── types/
│   └── index.ts         # All TypeScript interfaces
├── utils/               # Helper functions
│   ├── budgetUtils.ts
│   ├── emailUtils.ts
│   └── logger.ts
├── App.tsx              # Main app with routing
├── main.tsx             # Entry point
├── index.css            # Global styles
└── vite-env.d.ts
```

---

## 3. ALL PAGES & ROUTES

**Public Routes**
- `/login` → LoginPage (Authentication)
- `/register` → RegisterPage (Registration)
- `/goedkeuring/:token` → ClientApprovalPage (Public drawing approval)

**Protected Routes** (require authentication, wrapped in ProtectedRoute)
```
/                          → WorkmateDashboard (Home)
/projecten                 → ProjectsList
/projecten/nieuw           → ProjectCreate
/projecten/:id             → ProjectDetail
/klanten                   → ClientsLayout
/klanten/:id               → ClientProfile
/offertes                  → QuotesPipeline
/offertes/nieuw            → QuoteCreation
/offertes/:id              → ForgeQuotePreview
/documenten                → DocumentsLayout
/email                     → EmailLayout
/kalender                  → CalendarLayout
/financieel                → FinancialLayout
/taken                     → TasksLayout
/facturen                  → FacturenLayout
/rapportages               → RapportagesLayout
/tijdregistratie           → TijdregistratieLayout
/nacalculatie              → NacalculatieLayout
/montage                   → MontagePlanningLayout
/team                      → TeamLayout
/nieuwsbrieven             → NewsletterBuilder
/importeren                → DataImportLayout
/ai                        → WorkmateAIChat
/instellingen              → SettingsLayout
*                          → NotFoundPage (404)
```

---

## 4. ALL COMPONENTS BY DIRECTORY

### Auth Components
- `LoginPage.tsx` - Login form with email/password
- `RegisterPage.tsx` - Registration form
- `ProtectedRoute.tsx` - Route wrapper for authenticated pages

### Dashboard Components (11 widgets)
- `WorkmateDashboard.tsx` - Main dashboard container
- `StatisticsCards.tsx` - KPI cards (projects, tasks, revenue, emails)
- `CalendarMiniWidget.tsx` - Mini calendar preview
- `QuickActions.tsx` - Fast action buttons
- `WorkflowWidget.tsx` - Workflow status visualization
- `PriorityTasks.tsx` - High-priority task list
- `SalesFollowUpWidget.tsx` - Sales follow-up tracking
- `SalesPulseWidget.tsx` - Sales metrics
- `TodayPlanningWidget.tsx` - Today's schedule
- `EmailCommunicationHub.tsx` - Email summary
- `AIInsightWidget.tsx` - AI-generated insights
- `WeatherWidget.tsx` - Weather display

### Clients Components
- `ClientsLayout.tsx` - Client list view with filtering
- `ClientCard.tsx` - Individual client card
- `ClientProfile.tsx` - Detailed client view
- `AddEditClient.tsx` - Create/edit client form

### Projects Components
- `ProjectsList.tsx` - All projects with filtering
- `ProjectDetail.tsx` - Project details page
- `ProjectCreate.tsx` - Create new project
- `ProjectTasksTable.tsx` - Tasks within a project
- `ProjectOfferteEditor.tsx` - Edit project quotes
- `TimelineView.tsx` - Gantt-style timeline
- `TeamAvailability.tsx` - Team member availability

### Quotes Components
- `QuotesPipeline.tsx` - Kanban pipeline view
- `QuoteCreation.tsx` - Quote builder
- `ForgeQuotePreview.tsx` - Quote preview/editor
- `QuoteItemsTable.tsx` - Line items editor
- `SmartCalculator.tsx` - Price calculator
- `CalculatieModal.tsx` - Calculation dialog

### Tasks Components
- `TasksLayout.tsx` - Task management view

### Calendar Components
- `CalendarLayout.tsx` - Calendar container
- `MonthView.tsx` - Month view
- `WeekView.tsx` - Week view
- `DayView.tsx` - Day view

### Email Components
- `EmailLayout.tsx` - Email main view
- `EmailCompose.tsx` - Compose new email
- `EmailReader.tsx` - Read email
- `EmailTemplates.tsx` - Email template management
- `EmailSequences.tsx` - Email automation sequences
- `EmailTracking.tsx` - Email open/click tracking
- `EmailAnalytics.tsx` - Email statistics
- `ContactSidebar.tsx` - Contact list in email

### Documents Components
- `DocumentsLayout.tsx` - Document library
- `DocumentUpload.tsx` - File upload
- `DocumentFolders.tsx` - Folder structure
- `DocumentsPipeline.tsx` - Document workflow

### Financial Components
- `FinancialLayout.tsx` - Accounting main view
- `GeneralLedgerSettings.tsx` - Ledger account management
- `VATCodesSettings.tsx` - VAT code configuration
- `DiscountsSettings.tsx` - Discount setup

### Invoice/Facturen Components
- `FacturenLayout.tsx` - Invoice list and management

### Time Tracking Components
- `TijdregistratieLayout.tsx` - Time entry logging

### Montage/Installation Components
- `MontagePlanningLayout.tsx` - Installation scheduling

### Team Components
- `TeamLayout.tsx` - Team member management

### Reports Components
- `RapportagesLayout.tsx` - Report generation

### Post-Calculation Components
- `NacalculatieLayout.tsx` - Post-project cost adjustments

### Newsletter Components
- `NewsletterBuilder.tsx` - Newsletter designer

### Data Import Components
- `DataImportLayout.tsx` - Data import interface

### AI Components
- `WorkmateAIChat.tsx` - AI chat interface
- `AITextGenerator.tsx` - AI text generation

### Settings Components
- `SettingsLayout.tsx` - Settings main page

### Approval Components
- `ClientApprovalPage.tsx` - Public approval page for clients

### Notification Components
- `NotificatieCenter.tsx` - Notification inbox

### Layout Components
- `AppLayout.tsx` - Main app wrapper with sidebar/header
- `Header.tsx` - Top navigation bar
- `Sidebar.tsx` - Left navigation

### Shared Components
- `ErrorBoundary.tsx` - Error handling
- `NotFoundPage.tsx` - 404 page
- `CommandPalette.tsx` - Cmd+K search/command palette

### UI Components (shadcn/ui + Radix)
- `button.tsx` - Base button
- `input.tsx` - Text input
- `label.tsx` - Form label
- `card.tsx` - Card container
- `dialog.tsx` - Modal dialog
- `dropdown-menu.tsx` - Dropdown menu
- `select.tsx` - Select/dropdown
- `checkbox.tsx` - Checkbox input
- `switch.tsx` - Toggle switch
- `tabs.tsx` - Tab navigation
- `badge.tsx` - Badge/tag
- `avatar.tsx` - User avatar
- `tooltip.tsx` - Tooltip
- `popover.tsx` - Popover
- `scroll-area.tsx` - Scrollable area
- `progress.tsx` - Progress bar
- `separator.tsx` - Divider
- `textarea.tsx` - Multiline text input

---

## 5. ALL TYPESCRIPT TYPES & INTERFACES

### Core Business Entities

**Profile** (User profile)
- id, voornaam, achternaam, email, telefoon
- avatar_url, logo_url, bedrijfsnaam, bedrijfs_adres
- kvk_nummer, btw_nummer, taal, theme
- created_at, updated_at

**Klant** (Client)
- id, user_id, bedrijfsnaam, contactpersoon, email, telefoon
- adres, postcode, stad, land, website
- kvk_nummer, btw_nummer
- status: 'actief' | 'inactief' | 'prospect'
- tags[], notities, contactpersonen[]
- created_at, updated_at

**Contactpersoon** (Contact person)
- id, naam, functie, email, telefoon, is_primair

**Project**
- id, user_id, klant_id, naam, beschrijving
- status: 'gepland' | 'actief' | 'in-review' | 'afgerond' | 'on-hold'
- prioriteit: 'laag' | 'medium' | 'hoog' | 'kritiek'
- start_datum, eind_datum, budget, besteed, voortgang
- team_leden[], budget_waarschuwing_pct, bron_offerte_id
- is_template, bron_project_id
- created_at, updated_at

**Taak** (Task)
- id, user_id, project_id, titel, beschrijving
- status: 'todo' | 'bezig' | 'review' | 'klaar'
- prioriteit: 'laag' | 'medium' | 'hoog' | 'kritiek'
- toegewezen_aan, deadline, geschatte_tijd, bestede_tijd
- created_at, updated_at

**Offerte** (Quote)
- id, user_id, klant_id, nummer, titel
- status: 'concept' | 'verzonden' | 'bekeken' | 'goedgekeurd' | 'afgewezen'
- subtotaal, btw_bedrag, totaal, geldig_tot
- notities, voorwaarden
- follow_up_datum, follow_up_notitie, laatste_contact
- follow_up_status: 'geen' | 'gepland' | 'achterstallig' | 'afgerond'
- contact_pogingen, prioriteit: 'laag' | 'medium' | 'hoog' | 'urgent'
- geconverteerd_naar_project_id, geconverteerd_naar_factuur_id
- created_at, updated_at

**OfferteItem** (Quote line item)
- id, offerte_id, beschrijving, aantal, eenheidsprijs
- btw_percentage, korting_percentage, totaal, volgorde
- created_at

### Calculation System

**CalculatieProduct** (Product catalog)
- id, user_id, naam, categorie, eenheid
- inkoop_prijs, verkoop_prijs, standaard_marge, btw_percentage
- actief, notitie
- created_at, updated_at

**CalculatieRegel** (Calculation line)
- id, product_id (optional), product_naam, categorie, eenheid
- aantal, inkoop_prijs, verkoop_prijs, marge_percentage
- korting_percentage, nacalculatie (boolean), btw_percentage, notitie

**CalculatieTemplate** (Reusable calculation)
- id, user_id, naam, beschrijving, regels[], actief
- created_at, updated_at

**OfferteTemplate** (Quote template)
- id, user_id, naam, beschrijving, regels[], actief
- created_at, updated_at

**OfferteTemplateRegel**
- soort: 'prijs' | 'tekst'
- beschrijving, extra_velden{}, aantal, eenheidsprijs
- btw_percentage, korting_percentage

### Document & File Management

**Document**
- id, user_id, project_id (nullable), klant_id (nullable)
- naam, type, grootte, map, storage_path
- status: 'concept' | 'review' | 'definitief' | 'gearchiveerd'
- tags[], gedeeld_met[]
- created_at, updated_at

### Email System

**Email**
- id, user_id, gmail_id, van, aan, onderwerp, inhoud
- datum, gelezen, starred, pinned (optional), snoozed_until (optional)
- labels[], bijlagen (count), map, scheduled_at (optional)
- thread_id (optional), internal_notes (optional)
- follow_up_at (optional), tracking (EmailTracking)
- created_at

**EmailTracking**
- opens, last_opened (optional), clicks, last_clicked (optional)
- pixel_id (optional)

**EmailSequence**
- id, user_id, naam, beschrijving
- status: 'actief' | 'gepauzeerd' | 'concept'
- stappen[], ontvangers[]
- created_at, updated_at

**EmailSequenceStap**
- id, volgorde, onderwerp, inhoud, wacht_dagen
- verzonden, geopend

### Calendar & Events

**CalendarEvent**
- id, user_id, project_id (nullable), titel, beschrijving
- start_datum, eind_datum
- type: 'meeting' | 'deadline' | 'herinnering' | 'persoonlijk'
- locatie, deelnemers[], kleur, herhaling
- created_at, updated_at

### Financial/Accounting

**Grootboek** (General ledger account)
- id, user_id, code, naam
- categorie: 'activa' | 'passiva' | 'omzet' | 'kosten'
- saldo, created_at

**BtwCode** (VAT code)
- id, user_id, code, omschrijving, percentage, actief
- created_at

**Korting** (Discount)
- id, user_id, naam
- type: 'percentage' | 'vast_bedrag'
- waarde, voorwaarden, actief
- created_at

**Factuur** (Invoice)
- id, user_id, klant_id, offerte_id (optional), project_id (optional)
- nummer, titel
- status: 'concept' | 'verzonden' | 'betaald' | 'vervallen' | 'gecrediteerd'
- subtotaal, btw_bedrag, totaal, betaald_bedrag
- factuurdatum, vervaldatum, betaaldatum (optional)
- betalingsherinnering_verzonden (optional), notities, voorwaarden
- bron_type, bron_offerte_id, bron_project_id
- created_at, updated_at

**FactuurItem** (Invoice line)
- id, factuur_id, beschrijving, aantal, eenheidsprijs
- btw_percentage, korting_percentage, totaal, volgorde
- created_at

### HR & Team Management

**Medewerker** (Employee)
- id, user_id, naam, email, telefoon, functie, afdeling
- avatar_url, uurtarief, status: 'actief' | 'inactief'
- rol: 'admin' | 'medewerker' | 'monteur' | 'verkoop' | 'productie'
- app_rol (optional): 'admin' | 'medewerker' | 'viewer'
- vaardigheden[], start_datum, notities
- created_at, updated_at

**Verlof** (Time off)
- id, user_id, medewerker_id
- type: 'vakantie' | 'ziek' | 'ouderschapsverlof' | 'bijzonder' | 'bedrijfssluiting'
- start_datum, eind_datum
- status: 'aangevraagd' | 'goedgekeurd' | 'afgewezen'
- opmerking (optional), created_at

**Bedrijfssluitingsdag** (Company closed day)
- id, user_id, datum, omschrijving, jaarlijks_herhalend
- created_at

### Time Tracking

**Tijdregistratie** (Time entry)
- id, user_id, project_id, taak_id (optional), medewerker_id (optional)
- omschrijving, datum, start_tijd, eind_tijd, duur_minuten
- uurtarief, facturabel, gefactureerd, factuur_id (optional)
- created_at, updated_at

### Scheduling & Appointments

**MontageAfspraak** (Installation appointment)
- id, user_id, project_id, klant_id, titel, beschrijving
- datum, start_tijd, eind_tijd, locatie
- monteurs[], status: 'gepland' | 'onderweg' | 'bezig' | 'afgerond' | 'uitgesteld'
- materialen[], notities
- created_at, updated_at

**BookingSlot** (Available booking slot)
- id, user_id, dag_van_week, start_tijd, eind_tijd
- slot_duur_minuten, actief
- created_at

**BookingAfspraak** (Booked appointment)
- id, user_id, klant_naam, klant_email, klant_telefoon (optional)
- datum, start_tijd, eind_tijd, onderwerp (optional)
- status: 'gepland' | 'bevestigd' | 'geannuleerd'
- token, created_at

### Approval System

**TekeningGoedkeuring** (Drawing approval)
- id, user_id, project_id, klant_id
- document_ids[], offerte_id (optional)
- token (unique), status: 'verzonden' | 'bekeken' | 'goedgekeurd' | 'revisie'
- email_aan, email_onderwerp, email_bericht
- revisie_opmerkingen (optional), goedgekeurd_door (optional)
- goedgekeurd_op (optional), revisie_nummer, vorige_goedkeuring_id (optional)
- created_at, updated_at

### Permissions & Access Control

**ProjectToewijzing** (Project assignment)
- id, user_id, project_id, medewerker_id
- rol: 'eigenaar' | 'medewerker' | 'viewer'
- created_at

### AI & Automation

**AIChat**
- id, user_id, rol: 'user' | 'assistant', bericht
- created_at

**Nieuwsbrief** (Newsletter)
- id, user_id, naam, onderwerp, html_inhoud
- ontvangers[], status: 'concept' | 'gepland' | 'verzonden'
- verzonden_op (optional), gepland_op (optional)
- created_at, updated_at

### Settings & Configuration

**AppSettings**
- id, user_id
- **Branche/Industry:**
  - branche, branche_preset: 'sign_company' | 'bouw' | 'ict' | 'marketing' | 'detailhandel' | 'horeca' | 'zorg' | 'custom'
- **Currency & VAT:**
  - valuta, valuta_symbool, standaard_btw
- **Pipeline:**
  - pipeline_stappen[] (PipelineStap)
- **Quote Settings:**
  - offerte_geldigheid_dagen, offerte_prefix, offerte_volgnummer
  - auto_follow_up, follow_up_dagen
- **Notifications:**
  - melding_follow_up, melding_verlopen, melding_nieuwe_offerte, melding_status_wijziging
- **Email:**
  - email_handtekening
- **Branding:**
  - primaire_kleur, secundaire_kleur
- **Display:**
  - toon_conversie_rate, toon_dagen_open, toon_follow_up_indicatoren
  - dashboard_widgets[], sidebar_items[]
- **Calculation:**
  - calculatie_categorieen[], calculatie_eenheden[], calculatie_standaard_marge
  - calculatie_toon_inkoop_in_offerte, offerte_regel_velden[]
- created_at, updated_at

**PipelineStap**
- key, label, kleur, volgorde, actief

**NavItem**
- label, icon, path, badge (optional)

### Utilities

**SortDirection**: 'asc' | 'desc'

---

## 6. ALL SERVICE FUNCTIONS (supabaseService.ts - 2192 lines)

### Klanten (Clients)
- `getKlanten()` - Get all clients
- `getKlant(id)` - Get single client
- `createKlant(klant)` - Create client
- `updateKlant(id, updates)` - Update client
- `deleteKlant(id)` - Delete client

### Projecten (Projects)
- `getProjecten()` - Get all projects with client names
- `getProject(id)` - Get single project
- `getProjectenByKlant(klantId)` - Get projects for specific client
- `createProject(project)` - Create project
- `updateProject(id, updates)` - Update project
- `deleteProject(id)` - Delete project

### Taken (Tasks)
- `getTaken()` - Get all tasks
- `getTaak(id)` - Get single task
- `getTakenByProject(projectId)` - Get tasks for project
- `createTaak(taak)` - Create task
- `updateTaak(id, updates)` - Update task
- `deleteTaak(id)` - Delete task

### Offertes (Quotes)
- `getOffertes()` - Get all quotes
- `getOfferte(id)` - Get single quote
- `getOffertesByProject(projectId)` - Get quotes for project
- `createOfferte(offerte)` - Create quote
- `updateOfferte(id, updates)` - Update quote
- `deleteOfferte(id)` - Delete quote

### OfferteItems (Quote Line Items)
- `getOfferteItems(offerteId)` - Get items for quote
- `createOfferteItem(item)` - Create quote item
- `updateOfferteItem(id, updates)` - Update quote item
- `deleteOfferteItem(id)` - Delete quote item

### Documenten (Documents)
- `getDocumenten()` - Get all documents
- `getDocument(id)` - Get single document
- `createDocument(document)` - Create document
- `updateDocument(id, updates)` - Update document
- `deleteDocument(id)` - Delete document

### Emails
- `getEmails()` - Get all emails
- `getEmail(id)` - Get single email
- `createEmail(email)` - Create email
- `updateEmail(id, updates)` - Update email
- `deleteEmail(id)` - Delete email

### Evenementen (Calendar Events)
- `getEvents()` - Get all events
- `getEvent(id)` - Get single event
- `createEvent(event)` - Create event
- `updateEvent(id, updates)` - Update event
- `deleteEvent(id)` - Delete event

### Grootboek (General Ledger)
- `getGrootboek()` - Get all ledger accounts
- `createGrootboekRekening(rekening)` - Create account
- `updateGrootboekRekening(id, updates)` - Update account
- `deleteGrootboekRekening(id)` - Delete account

### BtwCodes (VAT Codes)
- `getBtwCodes()` - Get all VAT codes
- `createBtwCode(btwCode)` - Create VAT code
- `updateBtwCode(id, updates)` - Update VAT code
- `deleteBtwCode(id)` - Delete VAT code

### Kortingen (Discounts)
- `getKortingen()` - Get all discounts
- `createKorting(korting)` - Create discount
- `updateKorting(id, updates)` - Update discount
- `deleteKorting(id)` - Delete discount

### AI Chat
- `getAIChats()` - Get chat history
- `createAIChat(chat)` - Create chat message
- `deleteAIChats()` - Clear chat history

### Profile
- `getProfile(userId)` - Get user profile
- `updateProfile(userId, updates)` - Update profile

### Nieuwsbrieven (Newsletters)
- `getNieuwsbrieven()` - Get all newsletters
- `getNieuwsbrief(id)` - Get single newsletter
- `createNieuwsbrief(nieuwsbrief)` - Create newsletter
- `updateNieuwsbrief(id, updates)` - Update newsletter
- `deleteNieuwsbrief(id)` - Delete newsletter

### CalculatieProducten (Catalog Products)
- `getCalculatieProducten()` - Get all products
- `createCalculatieProduct(product)` - Create product
- `updateCalculatieProduct(id, updates)` - Update product
- `deleteCalculatieProduct(id)` - Delete product

### CalculatieTemplates
- `getCalculatieTemplates()` - Get all templates
- `createCalculatieTemplate(template)` - Create template
- `updateCalculatieTemplate(id, updates)` - Update template
- `deleteCalculatieTemplate(id)` - Delete template

### OfferteTemplates
- `getOfferteTemplates()` - Get all quote templates
- `createOfferteTemplate(template)` - Create quote template
- `updateOfferteTemplate(id, updates)` - Update quote template
- `deleteOfferteTemplate(id)` - Delete quote template

### TekeningGoedkeuring (Drawing Approval)
- `getTekeningGoedkeuringen(projectId)` - Get approvals for project
- `getTekeningGoedkeuringByToken(token)` - Get approval by public token
- `createTekeningGoedkeuring(data)` - Create new approval request
- `updateTekeningGoedkeuring(id, updates)` - Update approval
- `updateTekeningGoedkeuringByToken(token, updates)` - Update via public token

### Facturen (Invoices)
- `getFacturen()` - Get all invoices
- `getFactuur(id)` - Get single invoice
- `createFactuur(factuur)` - Create invoice
- `updateFactuur(id, updates)` - Update invoice
- `deleteFactuur(id)` - Delete invoice

### FactuurItems (Invoice Lines)
- `getFactuurItems(factuurId)` - Get items for invoice
- `createFactuurItem(item)` - Create invoice item

### Tijdregistratie (Time Tracking)
- `getTijdregistraties()` - Get all time entries
- `getTijdregistratiesByProject(projectId)` - Get entries for project
- `createTijdregistratie(entry)` - Create time entry
- `updateTijdregistratie(id, updates)` - Update time entry
- `deleteTijdregistratie(id)` - Delete time entry

### Medewerkers (Employees)
- `getMedewerkers()` - Get all employees
- `createMedewerker(mw)` - Create employee
- `updateMedewerker(id, updates)` - Update employee
- `deleteMedewerker(id)` - Delete employee

### Notificaties (Notifications)
- `getNotificaties()` - Get all notifications
- `createNotificatie(notif)` - Create notification
- `markNotificatieGelezen(id)` - Mark as read
- `markAlleNotificatiesGelezen()` - Mark all as read

### MontageAfspraken (Installation Appointments)
- `getMontageAfspraken()` - Get all appointments
- `createMontageAfspraak(afspraak)` - Create appointment
- `updateMontageAfspraak(id, updates)` - Update appointment
- `deleteMontageAfspraak(id)` - Delete appointment

### Verlof (Time Off)
- `getVerlof()` - Get all time off
- `getVerlofByMedewerker(medewerkerId)` - Get time off for employee
- `createVerlof(verlof)` - Create time off
- `updateVerlof(id, updates)` - Update time off
- `deleteVerlof(id)` - Delete time off

### Bedrijfssluitingsdagen (Company Closed Days)
- `getBedrijfssluitingsdagen()` - Get closed days
- `createBedrijfssluitingsdag(dag)` - Create closed day
- `deleteBedrijfssluitingsdag(id)` - Delete closed day

### ProjectToewijzingen (Project Assignments)
- `getProjectToewijzingen(projectId)` - Get assignments for project
- `getProjectToewijzingenVoorMedewerker(medewerkerId)` - Get assignments for employee
- `createProjectToewijzing(toewijzing)` - Create assignment
- `deleteProjectToewijzing(id)` - Delete assignment

### BookingSlots & BookingAfspraken
- `getBookingSlots()` - Get available slots
- `createBookingSlot(slot)` - Create available slot
- `updateBookingSlot(id, updates)` - Update slot
- `deleteBookingSlot(id)` - Delete slot
- `getBookingAfspraken()` - Get booked appointments
- `getBookingAfspraakByToken(token)` - Get booking by public token
- `createBookingAfspraak(afspraak)` - Create booking
- `updateBookingAfspraak(id, updates)` - Update booking

### Settings
- `getAppSettings(userId)` - Get app settings
- `updateAppSettings(userId, updates)` - Update settings
- `getDefaultAppSettings(userId)` - Get defaults

### Helpers
- `getLocalData<T>(key)` - Get from localStorage
- `setLocalData<T>(key, data)` - Set to localStorage
- `generateId()` - Create UUID
- `now()` - Get ISO timestamp
- `assertId(id, label)` - Validate ID

---

## 7. DATA MODEL & ENTITY RELATIONSHIPS

```
User (Supabase Auth)
  ↓
Profile (User's company info)
  ↓
┌─────────────────────────────────────────────┐
│         Klant (Client) ← many-to-one        │
├─────────────────────────────────────────────┤
│  └─ Contactpersoon[] (Contact persons)      │
│  └─ Project[] (Client's projects)           │
│     └─ Taak[] (Project tasks)               │
│     └─ Offerte[] (Project quotes)           │
│        └─ OfferteItem[] (Quote lines)       │
│           └─ CalculatieRegel[] (Calc lines)│
│     └─ Tijdregistratie[] (Time entries)     │
│     └─ MontageAfspraak[] (Appointments)     │
│     └─ Document[] (Project docs)            │
│     └─ TekeningGoedkeuring[] (Approvals)    │
│  └─ Factuur[] (Client invoices)             │
│     └─ FactuurItem[] (Invoice lines)        │
│     └─ bron_offerte_id → Offerte            │
│     └─ bron_project_id → Project            │
│                                              │
└─────────────────────────────────────────────┘

Additional Entities:
├── Email (Gmail integration)
│   └─ EmailTracking
├── EmailSequence[]
│   └─ EmailSequenceStap[] (Automation steps)
├── CalendarEvent[]
├── Medewerker[] (Employees)
│   ├─ ProjectToewijzing[] (Project assignments)
│   ├─ Verlof[] (Time off requests)
│   └─ Notificatie[] (Notifications)
├── BookingSlot[] (Available time slots)
├── BookingAfspraak[] (Booked appointments)
├── Nieuwsbrief[] (Newsletters)
├── AIChat[] (Chat history)
├── AppSettings (Global app config)
├── CalculatieProduct[] (Product catalog)
├── CalculatieTemplate[] (Reusable calcs)
├── OfferteTemplate[] (Quote templates)
├── Grootboek[] (Ledger accounts)
├── BtwCode[] (VAT codes)
└── Korting[] (Discounts)

Feature Chains:
Offerte → Project → Factuur
Offerte → Factuur (direct)
Project → Factuur (direct)
Offerte → TekeningGoedkeuring
Project → Document → TekeningGoedkeuring
```

---

## 8. STATE MANAGEMENT - CONTEXT PROVIDERS

### AuthContext
Manages user authentication state
- `user: User | null` - Current authenticated user
- `session: any | null` - Supabase session
- `isAuthenticated: boolean` - Auth status
- `isLoading: boolean` - Loading state
- `login(email, password)` - Sign in
- `register(email, password, metadata)` - Sign up
- `logout()` - Sign out
- localStorage key: (Managed by Supabase)

### ThemeContext
Light/Dark mode management
- `theme: 'light' | 'dark'` - Current theme
- `toggleTheme()` - Switch theme
- `setTheme(theme)` - Set specific theme
- localStorage key: `workmate_theme`

### PaletteContext
8 color palettes (Jade, Ocean, Amber, Berry, Coral, Slate, Rosé, Forest)
- `paletteId: string` - Selected palette ID
- `palette: ColorPalette` - Full palette object with light/dark HSL values
- `setPaletteId(id)` - Change palette
- Applies CSS variables for gradients and colors
- localStorage key: `workmate_palette`

### LanguageContext
Bilingual support (Dutch/English)
- `language: 'nl' | 'en'` - Current language
- `setLanguage(lang)` - Change language
- `t(key)` - Translation function (dot notation: 'section.field')
- Full translations for all UI sections
- localStorage key: `workmate_language`

### SidebarContext
Sidebar collapse state
- `isCollapsed: boolean` - Sidebar state
- `toggleSidebar()` - Toggle collapse
- `setCollapsed(boolean)` - Set state
- localStorage key: `workmate_sidebar_collapsed`

### AppSettingsContext
Business settings and user profile
- `settings: AppSettings` - Full app config
- `profile: Profile | null` - User profile
- `isLoading: boolean` - Loading state
- `updateSettings(updates)` - Update settings
- `updateUserProfile(updates)` - Update profile
- `refreshSettings()`, `refreshProfile()` - Reload data
- Convenience getters for common settings
- Loads on auth context change

---

## 9. UI LIBRARY - shadcn/ui COMPONENTS

**Form Components**
- Button - CTA with variants (default, secondary, destructive, outline, ghost, link)
- Input - Text input field
- Label - Form labels
- Textarea - Multiline text
- Select - Dropdown select
- Checkbox - Checkbox input
- Switch - Toggle switch
- Popover - Floating popover UI

**Display Components**
- Card - Container (Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter)
- Badge - Status/tag badges
- Avatar - User avatars
- Progress - Progress bars
- Separator - Visual dividers
- Tooltip - Hover tooltips

**Navigation Components**
- Tabs - Tab navigation
- DropdownMenu - Dropdown menus

**Dialogs & Modals**
- Dialog - Modal dialogs
- ScrollArea - Scrollable containers

---

## 10. UTILITIES & HELPER FUNCTIONS

### src/lib/utils.ts
- `cn(...inputs)` - Merge Tailwind classes (clsx + twMerge)
- `formatCurrency(amount, currency, locale)` - Format numbers as currency
- `formatDate(date)` - Format date (dd-mm-yyyy)
- `formatDateTime(date)` - Format with time
- `getInitials(name)` - Get name initials
- `truncate(str, length)` - Truncate string with ellipsis
- `getStatusColor(status)` - Get Tailwind color for status badge
- `getPriorityColor(priority)` - Get Tailwind color for priority badge

### src/lib/export.ts
- `exportCSV(filename, headers, rows)` - Generate CSV with UTF-8 BOM
- `exportExcel(filename, headers, rows, sheetName)` - Generate Excel XML

### src/utils/logger.ts
- `logger.log()`, `logger.warn()`, `logger.error()` - Simple logging

### src/utils/emailUtils.ts
- Email utility functions

### src/utils/budgetUtils.ts
- `calculateBudgetStatus()` - Budget tracking
- Budget-related helper functions

### Custom Hooks (src/hooks/)

**useDataInit**
- Initializes all data on app load
- Loads klanten, projecten, taken, offertes, etc.
- Handles Supabase vs localStorage fallback
- Returns `isReady` boolean

**useData**
- Provides reactive access to cached data
- Used throughout components

**useDebounce**
- Debounce hook for search/input

**useLocalStorage**
- Hook for localStorage with auto-sync

---

## 11. KEY FEATURES

### Core CRM
- [x] Client management (Klanten)
- [x] Project management (Projecten)
- [x] Task management (Taken)
- [x] Quote system (Offertes + templates)
- [x] Invoice system (Facturen)

### Sales & Quotes
- [x] Quote creation with line items
- [x] Calculation system (products, templates, rules)
- [x] Quote templates for reuse
- [x] Quote-to-project-to-invoice workflow
- [x] Follow-up tracking
- [x] Auto-follow-up scheduling
- [x] Quote PDF generation & download

### Email
- [x] Gmail integration
- [x] Email templates
- [x] Email sequences (automation)
- [x] Email tracking (opens/clicks)
- [x] Email analytics
- [x] Compose interface
- [x] Newsletter builder

### Time & Scheduling
- [x] Calendar (Day/Week/Month views)
- [x] Time tracking (Tijdregistratie)
- [x] Montage/Installation planning
- [x] Team availability
- [x] Time off management (Verlof)
- [x] Company closed days
- [x] Booking slots for client appointments

### Financial
- [x] General ledger (Grootboek)
- [x] VAT code configuration
- [x] Discount management
- [x] Invoice generation
- [x] Budget tracking
- [x] Post-calculation (Nacalculatie)

### Team & Access
- [x] Employee management (Medewerkers)
- [x] Role-based access (admin/medewerker/viewer)
- [x] Project assignments
- [x] Team availability tracking

### Documents
- [x] Document library with folders
- [x] File upload & storage
- [x] Document status tracking
- [x] Sharing permissions
- [x] Tagging system

### Approvals
- [x] Drawing/document approval workflow
- [x] Public approval link (no login required)
- [x] Revision tracking
- [x] Approval history

### AI & Automation
- [x] AI Chat assistant
- [x] AI text generation
- [x] Email automation (sequences)
- [x] Dashboard AI insights

### Reporting & Analytics
- [x] Reports/Rapportages section
- [x] Dashboard analytics
- [x] Email analytics
- [x] Sales metrics
- [x] CSV/Excel export

### Admin & Settings
- [x] User profile management
- [x] Company branding (logo, colors)
- [x] Language settings (NL/EN)
- [x] Theme (Light/Dark)
- [x] Color palette selection (8 themes)
- [x] Quote settings configuration
- [x] Pipeline customization
- [x] Notification settings
- [x] Sidebar customization
- [x] Calculation setup

### Data Management
- [x] Data import interface
- [x] Local storage fallback (offline support)
- [x] Data persistence
- [x] Supabase integration

---

## 12. STYLING SYSTEM

### Tailwind Configuration
- **Font:** DM Sans (Google Fonts fallback)
- **Dark Mode:** Class-based (`darkMode: ["class"]`)
- **Custom Colors:**
  - Primary, Secondary, Accent, Destructive
  - Muted, Popover, Card
  - wm-hover, wm-light, wm-pale (custom Workmate colors)
- **Border Radius:** Customizable via `--radius` CSS variable
- **Animations:** Accordion (up/down)
- **Plugins:** tailwindcss-animate

### CSS Variables (Dynamic)
Set by PaletteContext in real-time:
- `--primary` (HSL)
- `--accent` (HSL)
- `--ring` (HSL)
- `--wm-sidebar-active` (HSL)
- `--wm-hover` (HSL)
- `--wm-light` (HSL)
- `--wm-pale` (HSL)
- `--wm-gradient-start` (Hex)
- `--wm-gradient-mid` (Hex)
- `--wm-gradient-end` (Hex)
- `--wm-glow` (CSS shadow)

### Color Palettes (8 themes)
1. **Jade** - Botanical green (original)
2. **Ocean** - Deep sea blue
3. **Amber** - Warm gold
4. **Berry** - Rich purple
5. **Coral** - Warm terracotta
6. **Slate** - Cool steel
7. **Rosé** - Soft pink
8. **Forest** - Deep forest green

Each palette has:
- Light mode: primary, accent, ring, sidebar-active, hover, light, pale, gradient (start/mid/end), glow
- Dark mode: primary, accent, ring, hover, light
- Preview colors (3 hex swatches)

---

## 13. LOCALSTORAGE KEYS

**Theme & UI**
- `workmate_theme` - 'light' | 'dark'
- `workmate_palette` - Selected palette ID
- `workmate_language` - 'nl' | 'en'
- `workmate_sidebar_collapsed` - 'true' | 'false'

**Data** (fallback for offline)
- `workmate_klanten` - Klant[]
- `workmate_projecten` - Project[]
- `workmate_taken` - Taak[]
- `workmate_offertes` - Offerte[]
- `workmate_offerte_items` - OfferteItem[]
- `workmate_documenten` - Document[]
- `workmate_emails` - Email[]
- `workmate_evenementen` - CalendarEvent[]
- `workmate_grootboek` - Grootboek[]
- `workmate_btw_codes` - BtwCode[]
- `workmate_kortingen` - Korting[]
- `workmate_ai_chats` - AIChat[]
- `workmate_nieuwsbrieven` - Nieuwsbrief[]
- `workmate_calculatie_producten` - CalculatieProduct[]
- `workmate_calculatie_templates` - CalculatieTemplate[]
- `workmate_offerte_templates` - OfferteTemplate[]
- `workmate_facturen` - Factuur[]
- `workmate_factuur_items` - FactuurItem[]
- `workmate_tijdregistraties` - Tijdregistratie[]
- `workmate_medewerkers` - Medewerker[]
- `workmate_notificaties` - Notificatie[]
- `workmate_montage_afspraken` - MontageAfspraak[]
- `workmate_verlof` - Verlof[]
- `workmate_bedrijfssluitingsdagen` - Bedrijfssluitingsdag[]
- `workmate_project_toewijzingen` - ProjectToewijzing[]
- `workmate_booking_slots` - BookingSlot[]
- `workmate_booking_afspraken` - BookingAfspraak[]

---

## 14. EXTERNAL SERVICES & INTEGRATIONS

### Supabase
- **Client:** `@supabase/supabase-js` v2.39.3
- **Tables:** 30+ tables for all entities
- **Auth:** Supabase Auth (email/password)
- **Fallback:** localStorage for offline support
- **Detection:** `isSupabaseConfigured()` checks environment

### Gmail API Integration
- `gmailService.ts` - Gmail integration functions
- Email syncing, reading, sending
- Attachment handling

### PDF Generation
- `pdfService.ts` - jsPDF integration
- Quote PDFs with logo, line items, terms
- Invoice PDFs
- Custom formatting and branding

### AI Integration
- `aiService.ts` - AI features
- OpenAI API (server-side only, no frontend key exposure)

### Email Templates
- `emailTemplateService.ts` - Email template management
- Template variables and rendering

---

## 15. ENVIRONMENT & CONFIGURATION

### Required Environment Variables
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anon key
- `OPENAI_API_KEY` - OpenAI API key (server-side only)

### Development
```bash
npm run dev      # Start dev server
npm run build    # Build for production
npm run preview  # Preview production build
```

---

## 16. AUTHENTICATION FLOW

1. User navigates to `/login` or `/register`
2. Credentials validated via `authService.ts`
3. Supabase Auth returns session
4. AuthContext stores user & session
5. `ProtectedRoute` component checks authentication
6. Unauthenticated users redirected to `/login`
7. `AppSettingsContext` loads user profile & settings
8. All data initialized via `useDataInit` hook
9. App renders with user context

**Public Routes:** `/login`, `/register`, `/goedkeuring/:token`
**Protected Routes:** Everything else (requires AuthProvider + ProtectedRoute)

---

## 17. KEY WORKFLOWS

### Quote to Invoice Workflow
1. Create Offerte with OfferteItems
2. Add calculations (CalculatieRegel per item)
3. Send to client (PDF + email)
4. Track opens/clicks
5. Convert to Project (optional)
6. Create Factuur from Offerte
7. Mark as paid when received

### Drawing Approval Workflow
1. Create TekeningGoedkeuring with documents
2. Generate unique public token
3. Send email to client with approval link
4. Client accesses `/goedkeuring/:token` (no login needed)
5. Client views documents and approves/requests revision
6. Track approval status and history

### Email Automation (EmailSequence)
1. Create EmailSequence with multiple steps
2. Set wait days between each step
3. Add recipients
4. Sequence starts automatically
5. Track sends, opens, clicks
6. Pause/resume sequence anytime

### Time Tracking to Invoice
1. Log Tijdregistratie entries (per project)
2. Optionally mark as facturabel
3. Create Factuur for project
4. Auto-include time entries
5. Mark gefactureerd when paid

---

## 18. KNOWN FEATURES & NOTES

- **Bilingual:** Full NL/EN translation system
- **Offline First:** localStorage fallback when Supabase unavailable
- **Dark Mode:** Complete dark theme support
- **Responsive:** Mobile-friendly UI (Tailwind)
- **Type Safe:** Full TypeScript with Zod validation
- **Modular:** Component-based architecture
- **Customizable:** 8 color palettes, settings per business
- **PDF Generation:** Quote and invoice PDFs
- **Email Tracking:** Opens and click tracking
- **Public Links:** No-login approval system
- **Notifications:** In-app notification center
- **Dashboard:** 11+ widget dashboard
- **Export:** CSV and Excel exports

---

This comprehensive blueprint covers every aspect of the Workmate app and can be pasted directly into a Claude conversation for context during development and debugging.