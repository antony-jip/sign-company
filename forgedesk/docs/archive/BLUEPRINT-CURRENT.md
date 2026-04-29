# BLUEPRINT-CURRENT.md — FORGEdesk SaaS App

> Automatisch gegenereerd op 2026-03-23
> Doel: Volledige snapshot van de huidige codebase staat

---

## 1. BESTANDSSTRUCTUUR

### forgedesk/src/ — Top-level

| Bestand | Beschrijving |
|---------|-------------|
| `App.tsx` | Hoofd-app met alle routes, providers en lazy-loaded componenten |
| `main.tsx` | Entry point, rendert App in DOM |
| `index.css` | Globale CSS / Tailwind imports |
| `vite-env.d.ts` | Vite TypeScript environment declaraties |

### forgedesk/src/types/

| Bestand | Beschrijving |
|---------|-------------|
| `index.ts` | Alle TypeScript interfaces en types (1717 regels) |
| `visualizer.ts` | Types voor de Signing Visualizer module |
| `fal-ai-client.d.ts` | Type declaraties voor fal.ai client |

### forgedesk/src/contexts/

| Bestand | Beschrijving |
|---------|-------------|
| `AppSettingsContext.tsx` | App-instellingen (branche, valuta, pipeline, etc.) |
| `AuthContext.tsx` | Authenticatie state (login, sessie, profiel, organisatie) |
| `LanguageContext.tsx` | Taalwisseling (nl/en) met 900+ vertaalsleutels |
| `PaletteContext.tsx` | Kleurenpalet / accent-kleuren (6 paletten) |
| `SidebarContext.tsx` | Sidebar open/dicht state (RAIL=88px, EXPANDED=220px) |
| `TabsContext.tsx` | Browser-style tabs navigatie met dirty-state tracking |
| `ThemeContext.tsx` | Light/dark mode |

### forgedesk/src/hooks/

| Bestand | Beschrijving |
|---------|-------------|
| `useCountUp.ts` | Animatie hook voor oplopende getallen |
| `useDashboardLayout.ts` | Dashboard widget grid configuratie met drag & drop |
| `useData.ts` | Centrale data-ophaal hook (klanten, projecten, taken, offertes) |
| `useDataInit.ts` | Initialisatie van demo/seed data bij eerste load |
| `useDebounce.ts` | Debounce hook voor inputs en callbacks |
| `useDocumentStyle.ts` | Ophalen document styling/huisstijl |
| `useLocalStorage.ts` | Generieke localStorage hook |
| `useNavigateWithTab.ts` | Navigatie met automatisch tab aanmaken |
| `useOnlineStatus.ts` | Online/offline detectie |
| `usePortaalHerinnering.ts` | Automatische portaal herinneringen |
| `useProjectSidebarConfig.ts` | Project sidebar secties (11 toggles) |
| `useSidebarLayout.ts` | Sidebar layout + drag & drop secties |
| `useTabDirtyState.ts` | Dirty-state tracking per tab |
| `useTabShortcuts.ts` | Keyboard shortcuts (Ctrl+W, Ctrl+Tab, etc.) |
| `useTrialGuard.ts` | Trial-periode check / upgrade prompt |
| `useUnsavedWarning.ts` | Browser beforeunload warning |

### forgedesk/src/services/

| Bestand | Beschrijving |
|---------|-------------|
| `supabaseClient.ts` | Supabase client initialisatie |
| `supabaseService.ts` | Hoofd-dataservice (5701 regels) — alle CRUD operaties |
| `authService.ts` | Authenticatie (login, registratie, wachtwoord reset) |
| `aiService.ts` | AI functies (chat, tekst generatie, project analyse) |
| `aiRewriteService.ts` | AI tekst herschrijven |
| `emailTemplateService.ts` | Email templates (offerte, factuur, herinnering) |
| `followUpService.ts` | Follow-up email generatie en verzending |
| `forgieChatService.ts` | Forgie (AI assistant) chat service |
| `forgieService.ts` | Forgie acties en usage tracking |
| `gmailService.ts` | Email integratie (Gmail + IMAP/SMTP) |
| `importService.ts` | CSV import voor klanten en activiteiten |
| `pdfService.ts` | PDF generatie (offertes, facturen, werkbonnen, etc.) |
| `storageService.ts` | Bestandsopslag (Supabase + localStorage fallback) |
| `ublService.ts` | UBL XML factuur generatie (e-facturatie) |
| `werkbonPdfService.ts` | Werkbon instructie-PDF generatie |

### forgedesk/src/lib/

| Bestand | Beschrijving |
|---------|-------------|
| `briefpapierGenerator.ts` | Briefpapier/achtergrond generatie voor PDFs |
| `documentTemplates.ts` | Document template definities (klassiek, modern, minimaal, industrieel) |
| `export.ts` | Export utilities |
| `moduleColors.ts` | Module-specifieke kleurdefinities (mod-* systeem) |
| `utils.ts` | Algemene utility functies (cn, formatters) |

### forgedesk/src/utils/

| Bestand | Beschrijving |
|---------|-------------|
| `auditLogger.ts` | Audit log helper functies |
| `autofillUtils.ts` | Autofill logica voor formulieren |
| `budgetUtils.ts` | Budget berekening utilities |
| `emailTemplate.ts` | Email template helpers |
| `emailUtils.ts` | Email utility functies |
| `feestdagen.ts` | Nederlandse feestdagen berekening |
| `forgieMarkdown.tsx` | Markdown rendering voor Forgie chat |
| `localStorageUtils.ts` | Safe localStorage utilities |
| `logger.ts` | Logger utility |
| `projectFases.ts` | Project fase definities en logica |
| `spectrumUtils.ts` | Spectrum/gradient utilities |
| `statusColors.ts` | Status-naar-kleur mapping |
| `visualizerDefaults.ts` | Default waarden voor Visualizer |
| `zipBuilder.ts` | ZIP file builder (voor downloads) |

### forgedesk/src/components/ — Overzicht

| Map | # | Beschrijving |
|-----|---|-------------|
| `auth/` | 6 | Login, registratie, wachtwoord reset, protected route |
| `bestelbonnen/` | 2 | Bestelbonnen overzicht en detail |
| `clients/` | 10 | Klantenbeheer, profiel, deals, import |
| `dashboard/` | 27 | Dashboard widgets en quick actions |
| `documents/` | 4 | Documentenbeheer |
| `email/` | 10 | Email client (inbox, compose, templates, newsletter) |
| `financial/` | 7 | Financieel, leveranciers, uitgaven, voorraad |
| `forgie/` | 6 | AI assistent (Forgie/Daan) |
| `invoices/` | 4 | Facturenbeheer en online betaling |
| `layouts/` | 6 | App layout, sidebar, header, tab bar, mobile nav |
| `leads/` | 4 | Lead capture formulieren en inzendingen |
| `leveringsbonnen/` | 2 | Leveringsbonnen overzicht en detail |
| `notifications/` | 2 | Meldingen pagina en notificatie center |
| `onboarding/` | 5 | Welkom, onboarding wizard, landing page |
| `planning/` | 10 | Kalender, planning, taken, booking |
| `portaal/` | 16 | Klantportaal (chat, bestanden, goedkeuring) |
| `projects/` | 13 + 16 cockpit | Projectbeheer, detail, cockpit |
| `quick-actions/` | 4 | Snelle modals (klant, offerte, taak, project) |
| `quotes/` | 13 | Offertes pipeline, creatie, calculatie, preview |
| `reports/` | 2 | Rapportages en forecast |
| `settings/` | 11 | Instellingen (calculatie, huisstijl, team, etc.) |
| `shared/` | 16 | Gedeelde componenten (zoeken, errors, etc.) |
| `ui/` | 27 | UI primitieven (button, dialog, input, badge, etc.) |
| `visualizer/` | 6 | Signing visualizer (AI mockups) |
| `werkbonnen/` | 7 | Werkbonnen beheer |

---

## 2. ROUTES

### Publieke routes (geen login vereist)

| Pad | Component | Beschrijving |
|-----|-----------|-------------|
| `/login` | `LoginPage` | Inlogpagina |
| `/register` | `RegisterPage` | Registratie |
| `/registreren` | `RegisterPage` | Registratie (NL alias) |
| `/check-inbox` | `CheckInboxPage` | Check inbox na registratie |
| `/wachtwoord-vergeten` | `ForgotPasswordPage` | Wachtwoord vergeten |
| `/wachtwoord-resetten` | `ResetPasswordPage` | Wachtwoord resetten |
| `/goedkeuring/:token` | → redirect `/portaal/:token` | Backward-compatibiliteit |
| `/boeken/:userId` | `PublicBookingPage` | Publieke booking pagina |
| `/betalen/:token` | `BetaalPagina` | Online factuur betalen |
| `/betaald` | `BetaaldPagina` | Bevestiging na betaling |
| `/offerte-bekijken/:token` | `OffertePubliekPagina` | Offerte bekijken door klant |
| `/formulier/:token` | `LeadFormulierPubliek` | Lead formulier invullen |
| `/portaal/:token` | `PortaalPagina` | Klantportaal |

### Beveiligde routes (binnen AppLayout)

| Pad | Component |
|-----|-----------|
| `/` | `FORGEdeskDashboard` |
| `/welkom` | `WelkomPagina` |
| `/onboarding` | `OnboardingWizard` |
| `/projecten` | `ProjectsList` |
| `/projecten/nieuw` | `ProjectCreate` |
| `/projecten/:id` | `ProjectDetail` |
| `/klanten` | `ClientsLayout` |
| `/klanten/importeren` | `KlantenImportPage` |
| `/klanten/:id` | `ClientProfile` |
| `/deals` | `DealsLayout` |
| `/deals/:id` | `DealDetail` |
| `/offertes` | `QuotesPipeline` |
| `/offertes/nieuw` | `QuoteCreation` |
| `/offertes/:id` | `QuoteCreation` |
| `/offertes/:id/bewerken` | `QuoteCreation` |
| `/offertes/:id/preview` | `ForgeQuotePreview` |
| `/offertes/:id/detail` | → redirect `/offertes/:id/bewerken` |
| `/inkoopoffertes` | `InkoopOffertesPage` |
| `/documenten` | `DocumentsLayout` |
| `/email` | `EmailLayout` |
| `/email/compose` | `EmailComposePage` |
| `/planning` | `PlanningLayout` |
| `/kalender` | → redirect `/planning` |
| `/montage` | → redirect `/planning?modus=montage` |
| `/financieel` | `FinancialLayout` |
| `/taken` | `TasksLayout` |
| `/facturen` | `FacturenLayout` |
| `/facturen/nieuw` | `FactuurEditor` |
| `/facturen/:id` | `FactuurEditor` |
| `/facturen/:id/bewerken` | `FactuurEditor` |
| `/rapportages` | `RapportagesLayout` |
| `/tijdregistratie` | `TijdregistratieLayout` |
| `/nacalculatie` | `NacalculatieLayout` |
| `/team` | `TeamLayout` |
| `/nieuwsbrieven` | `NewsletterBuilder` |
| `/importeren` | `DataImportLayout` |
| `/ai` | `FORGEdeskAIChat` |
| `/forgie` | `ForgieChatPage` |
| `/werkbonnen` | `WerkbonnenLayout` |
| `/werkbonnen/:id` | `WerkbonDetail` |
| `/bestelbonnen` | `BestelbonnenLayout` |
| `/bestelbonnen/:id` | `BestelbonDetail` |
| `/leveringsbonnen` | `LeveringsbonnenLayout` |
| `/leveringsbonnen/:id` | `LeveringsbonDetail` |
| `/voorraad` | `VoorraadLayout` |
| `/leads` | `LeadCaptureLayout` |
| `/leads/formulieren/nieuw` | `LeadFormulierEditor` |
| `/leads/formulieren/:id` | `LeadFormulierEditor` |
| `/leads/inzendingen` | `LeadInzendingenLayout` |
| `/forecast` | `ForecastLayout` |
| `/booking` | `BookingBeheer` |
| `/visualizer` | `VisualizerLayout` |
| `/portalen` | `PortalenOverzicht` |
| `/meldingen` | `MeldingenPage` |
| `/instellingen` | `SettingsLayout` |
| `*` | `NotFoundPage` |

---

## 3. DATABASE — Supabase Tabellen

67 tabellen gedetecteerd via `.from()` calls:

### Kern-entiteiten

| Tabel | Type | Kolommen |
|-------|------|----------|
| `profiles` | `Profile` | id, voornaam, achternaam, email, bedrijfsnaam, kvk_nummer, btw_nummer, organisatie_id, rol, taal, theme |
| `organisaties` | `Organisatie` | id, naam, eigenaar_id, trial_start, trial_einde, is_betaald, stripe_customer_id, abonnement_status |
| `klanten` | `Klant` | id, bedrijfsnaam, contactpersoon, email, telefoon, adres, kvk_nummer, btw_nummer, status, tags, klant_status, labels |
| `projecten` | `Project` | id, klant_id, naam, status, prioriteit, budget, besteed, voortgang, project_nummer, bron_offerte_id |
| `taken` | `Taak` | id, project_id, titel, status, prioriteit, deadline, geschatte_tijd, bestede_tijd, bijlagen |
| `medewerkers` | `Medewerker` | id, naam, email, functie, afdeling, uurtarief, status, rol, vaardigheden |

### Offertes & Facturatie

| Tabel | Type | Kolommen |
|-------|------|----------|
| `offertes` | `Offerte` | id, klant_id, nummer, titel, status, totaal, geldig_tot, publiek_token, versie, follow_up_status |
| `offerte_items` | `OfferteItem` | id, offerte_id, beschrijving, aantal, eenheidsprijs, btw_percentage, calculatie_regels, prijs_varianten |
| `offerte_versies` | `OfferteVersie` | id, offerte_id, versie_nummer, snapshot |
| `offerte_templates` | `OfferteTemplate` | id, naam, beschrijving, regels, actief |
| `facturen` | `Factuur` | id, klant_id, nummer, titel, status, totaal, betaald_bedrag, vervaldatum, factuur_type, mollie_payment_id |
| `factuur_items` | `FactuurItem` | id, factuur_id, beschrijving, aantal, eenheidsprijs, btw_percentage |
| `inkoop_offertes` | `InkoopOfferte` | id, leverancier_naam, project_id, offerte_id, totaal |
| `inkoop_regels` | `InkoopRegel` | id, inkoop_offerte_id, omschrijving, aantal, prijs_per_stuk |

### Documenten & Email

| Tabel | Type | Kolommen |
|-------|------|----------|
| `documenten` | `Document` | id, project_id, klant_id, naam, type, storage_path, status |
| `emails` | `Email` | id, gmail_id, van, aan, onderwerp, inhoud, datum, gelezen, map, ticket_status |
| `nieuwsbrieven` | `Nieuwsbrief` | id, naam, onderwerp, html_inhoud, ontvangers, status |

### Planning & Werkbonnen

| Tabel | Type | Kolommen |
|-------|------|----------|
| `events` | `CalendarEvent` | id, project_id, titel, start_datum, eind_datum, type, locatie |
| `montage_afspraken` | `MontageAfspraak` | id, project_id, klant_id, datum, monteurs, status, werkbon_id |
| `werkbonnen` | `Werkbon` | id, werkbon_nummer, offerte_id, project_id, klant_id, datum, status |
| `werkbon_items` | `WerkbonItem` | id, werkbon_id, omschrijving, afbeeldingen |
| `werkbon_afbeeldingen` | `WerkbonAfbeelding` | id, werkbon_item_id, url, type |
| `werkbon_fotos` | `WerkbonFoto` | id, werkbon_id, type (voor/na/overig), url |
| `werkbon_regels` | `WerkbonRegel` | id, werkbon_id, type, uren, totaal (legacy) |

### Bestelbonnen & Leveringsbonnen

| Tabel | Type | Kolommen |
|-------|------|----------|
| `bestelbonnen` | `Bestelbon` | id, bestelbon_nummer, leverancier_id, status, totaal |
| `bestelbon_regels` | `BestelbonRegel` | id, bestelbon_id, omschrijving, aantal, prijs_per_eenheid |
| `leveringsbonnen` | `Leveringsbon` | id, leveringsbon_nummer, klant_id, datum, status, klant_handtekening |
| `leveringsbon_regels` | `LeveringsbonRegel` | id, leveringsbon_id, omschrijving, aantal |

### Financieel & Voorraad

| Tabel | Type | Kolommen |
|-------|------|----------|
| `grootboek` | `Grootboek` | id, code, naam, categorie, saldo |
| `btw_codes` | `BtwCode` | id, code, omschrijving, percentage, actief |
| `kortingen` | `Korting` | id, naam, type, waarde, actief |
| `uitgaven` | `Uitgave` | id, uitgave_nummer, leverancier_id, bedrag_excl_btw, categorie |
| `leveranciers` | `Leverancier` | id, bedrijfsnaam, email, categorie |
| `voorraad_artikelen` | `VoorraadArtikel` | id, naam, sku, huidige_voorraad, minimum_voorraad, inkoop_prijs |
| `voorraad_mutaties` | `VoorraadMutatie` | id, artikel_id, type, aantal, saldo_na_mutatie |
| `credit_transacties` | — | Credits/transacties tracking |

### Portaal

| Tabel | Type | Kolommen |
|-------|------|----------|
| `project_portalen` | `ProjectPortaal` | id, project_id, token, actief, verloopt_op |
| `portaal_items` | `PortaalItem` | id, portaal_id, type, status, bericht_type, bestanden, reacties |
| `portaal_bestanden` | `PortaalBestand` | id, portaal_item_id, url, uploaded_by |
| `portaal_reacties` | `PortaalReactie` | id, portaal_item_id, type, bericht, klant_naam |

### Overig

| Tabel | Beschrijving |
|-------|-------------|
| `app_settings` | App-instellingen per gebruiker (70+ kolommen) |
| `notificaties` | Systeem notificaties |
| `app_notificaties` | Portaal event notificaties |
| `ai_chats` | AI chat berichten |
| `ai_usage` | AI gebruik tracking |
| `avatars` | Gebruiker avatars |
| `briefpapier` | Briefpapier uploads |
| `document_styles` | Document huisstijl configuratie |
| `tijdregistraties` | Tijdregistratie per project |
| `project_fotos` | Foto's bij projecten |
| `project_toewijzingen` | Project-medewerker koppelingen |
| `tekening_goedkeuringen` | Tekening goedkeuringsproces |
| `calculatie_producten` | Productcatalogus voor calculaties |
| `calculatie_templates` | Herbruikbare calculatie templates |
| `herinnering_templates` | Email herinnering templates |
| `deals` | Sales deals/opportunities |
| `deal_activiteiten` | Activiteiten bij deals |
| `lead_formulieren` | Lead capture formulieren |
| `lead_inzendingen` | Ingediende leads |
| `verlof` | Verlof registratie |
| `bedrijfssluitingsdagen` | Bedrijfssluitingen |
| `booking_slots` | Booking beschikbaarheid |
| `booking_afspraken` | Geboekte afspraken |
| `signing_visualisaties` | Signing visualizer resultaten |
| `visualizer_api_log` | Visualizer API log |
| `visualizer_credits` | Visualizer credits systeem |

---

## 4. COMPONENTEN PER MODULE

### Dashboard (`components/dashboard/`)

`FORGEdeskDashboard.tsx` — Hoofd dashboard met configureerbaar widget grid
`ActionBlock.tsx`, `AIInsightWidget.tsx`, `CalendarMiniWidget.tsx`, `ClockWidget.tsx`, `EmailCommunicationHub.tsx`, `FloatingQuickActions.tsx`, `InboxPreviewWidget.tsx`, `MoneyBlock.tsx`, `MontagePlanningWidget.tsx`, `NieuwsWidget.tsx`, `NotitieWidget.tsx`, `OpenstaandeOffertesWidget.tsx`, `PortaalAlerts.tsx`, `PriorityTasks.tsx`, `QuickActions.tsx`, `RecenteActiviteitWidget.tsx`, `SalesFollowUpWidget.tsx` (584), `SalesForecastWidget.tsx`, `SalesPulseWidget.tsx`, `StatisticsCards.tsx`, `TeFacturerenWidget.tsx`, `TodayPlanningWidget.tsx`, `VisualizerDashboardWidget.tsx`, `WeatherWidget.tsx`, `WeekStripWidget.tsx`, `WorkflowWidget.tsx`

### Projecten (`components/projects/`)

`ProjectsList.tsx` (1059), `ProjectDetail.tsx` (2227), `ProjectCreate.tsx`, `ProjectOfferteEditor.tsx`, `ProjectPhotoGallery.tsx`, `ProjectPortaalTab.tsx` (551), `ProjectProgressIndicator.tsx`, `ProjectTasksTable.tsx`, `TeamAvailability.tsx`, `TijdregistratieLayout.tsx` (1340), `NacalculatieLayout.tsx` (946), `TimelineView.tsx`

**cockpit/**: `ActiviteitFeed.tsx`, `BestandenSection.tsx`, `BriefingCard.tsx`, `CockpitTopBar.tsx`, `DoenBanner.tsx`, `FaseNavigator.tsx`, `MontageSection.tsx`, `PipelineBar.tsx`, `PortaalPanel.tsx`, `PortaalSidebarCard.tsx` (869), `ProjectKaart.tsx`, `PulseBar.tsx`, `PulseItem.tsx`, `TakenOfferteGrid.tsx`, `TaskChecklistView.tsx`, `WatNuBanner.tsx`

### Offertes (`components/quotes/`)

`QuotesPipeline.tsx` (1739), `QuoteCreation.tsx` (2996), `QuoteItemsTable.tsx` (1612), `ForgeQuotePreview.tsx` (823), `OfferteDetail.tsx` (1281), `OffertePubliekPagina.tsx` (1071), `CalculatieModal.tsx` (762), `QuotesFollowUp.tsx` (871), `FollowUpMailPanel.tsx`, `InkoopOffertesPage.tsx`, `InkoopOffertePaneel.tsx` (596), `AutofillInput.tsx`, `SmartCalculator.tsx`

### Facturen (`components/invoices/`)

`FacturenLayout.tsx` (2648), `FactuurEditor.tsx` (1751), `BetaalPagina.tsx` (501), `BetaaldPagina.tsx`

### Klanten (`components/clients/`)

`ClientsLayout.tsx` (763), `ClientProfile.tsx` (1829), `ClientCard.tsx`, `AddEditClient.tsx` (711), `KlantenImportPage.tsx` (596), `KlantHistorieTab.tsx`, `KlantAIChat.tsx` (660), `ImportAIChat.tsx` (620), `DealsLayout.tsx` (548), `DealDetail.tsx` (555)

### Planning/Montage (`components/planning/`)

`PlanningLayout.tsx`, `CalendarLayout.tsx` (1599), `MontagePlanningLayout.tsx` (1947), `TasksLayout.tsx` (1631), `DayView.tsx`, `WeekView.tsx`, `MonthView.tsx`, `WeatherDayStrip.tsx`, `BookingBeheer.tsx`, `PublicBookingPage.tsx`

### Werkbonnen (`components/werkbonnen/`)

`WerkbonnenLayout.tsx`, `WerkbonDetail.tsx` (623), `WerkbonAanmaakDialog.tsx`, `WerkbonHeaderForm.tsx`, `WerkbonItemCard.tsx`, `WerkbonMonteurFeedback.tsx`, `WerkbonVanProjectDialog.tsx`

### Taken

Taken worden beheerd in `TasksLayout.tsx` (1631) binnen de planning module.

### Email (`components/email/`)

`EmailLayout.tsx` (974), `EmailCompose.tsx` (730), `EmailComposePage.tsx`, `EmailReader.tsx` (1340), `EmailReaderAIToolbar.tsx`, `EmailListItem.tsx`, `EmailTemplates.tsx`, `NewsletterBuilder.tsx` (1693), `emailHelpers.ts`, `emailTypes.ts`

### Portaal (`components/portaal/`)

`PortaalPagina.tsx`, `PortalenOverzicht.tsx` (708), `ClientApprovalPage.tsx` (764), `PortaalBerichtenSection.tsx`, `PortaalChat.tsx`, `PortaalChatBubble.tsx`, `PortaalChatDaySeparator.tsx`, `PortaalChatInput.tsx` (566), `PortaalChatProgress.tsx`, `PortaalChatRichCard.tsx`, `PortaalDrukproevenSection.tsx`, `PortaalGesloten.tsx`, `PortaalLightbox.tsx`, `PortaalOfferteSection.tsx`, `PortaalReactieForm.tsx`, `PortaalVerlopen.tsx`

### Instellingen (`components/settings/`)

`SettingsLayout.tsx` (3627), `CalculatieTab.tsx` (2366), `HuisstijlTab.tsx` (1087), `ForgieTab.tsx` (846), `TeamLayout.tsx` (1188), `TeamledenTab.tsx` (583), `DataImportLayout.tsx` (1158), `PortaalTab.tsx` (526), `AbonnementTab.tsx`, `SidebarTab.tsx`, `VisualizerTab.tsx`

### AI/Daan (Forgie) (`components/forgie/`)

`FORGEdeskAIChat.tsx` (811), `ForgieChatPage.tsx`, `ForgieChatWidget.tsx`, `AITextGenerator.tsx` (512), `ForgieActieKaart.tsx`, `ForgieAvatar.tsx`

### Quick Actions (`components/quick-actions/`)

`NieuweOfferteModal.tsx` (996), `NieuweKlantModal.tsx`, `NieuweTaakModal.tsx`, `NieuwProjectModal.tsx`

### Shared/UI

**shared/**: `ErrorBoundary.tsx`, `CommandPalette.tsx`, `GlobalSearch.tsx` (607), `ModuleHeader.tsx`, `BackButton.tsx`, `NotFoundPage.tsx`, `PdfPreviewDialog.tsx`, `AuditLogPanel.tsx`, `CompletionPromptModal.tsx`, `DagenOpenFilter.tsx`, `KlantStatusWarning.tsx`, `KvkZoekVeld.tsx`, `QuickActionsButton.tsx`, `ShareButton.tsx`, `TrialBanner.tsx`, `UpgradeDialog.tsx`

**ui/**: `avatar.tsx`, `badge.tsx`, `button.tsx`, `card.tsx`, `checkbox.tsx`, `dialog.tsx`, `dropdown-menu.tsx`, `empty-state.tsx`, `filter-pill.tsx`, `input.tsx`, `label.tsx`, `pagination-controls.tsx`, `popover.tsx`, `progress.tsx`, `scroll-area.tsx`, `select.tsx`, `separator.tsx`, `skeleton.tsx`, `switch.tsx`, `tabs.tsx`, `textarea.tsx`, `tooltip.tsx`, `animated-badge.tsx`, `animated-list.tsx`, `AIContentEditableToolbar.tsx`, `AITextToolbar.tsx`, `SpectrumBar.tsx`

### Overige modules

**Financieel** (`financial/`): `FinancialLayout.tsx`, `VoorraadLayout.tsx` (726), `UitgavenLayout.tsx` (591), `LeveranciersLayout.tsx`, `DiscountsSettings.tsx`, `GeneralLedgerSettings.tsx`, `VATCodesSettings.tsx`

**Bestelbonnen** (`bestelbonnen/`): `BestelbonnenLayout.tsx`, `BestelbonDetail.tsx` (556)

**Leveringsbonnen** (`leveringsbonnen/`): `LeveringsbonnenLayout.tsx`, `LeveringsbonDetail.tsx` (597)

**Documenten** (`documents/`): `DocumentsLayout.tsx`, `DocumentsPipeline.tsx`, `DocumentFolders.tsx`, `DocumentUpload.tsx`

**Rapportages** (`reports/`): `RapportagesLayout.tsx` (1359), `ForecastLayout.tsx`

**Leads** (`leads/`): `LeadCaptureLayout.tsx`, `LeadFormulierEditor.tsx`, `LeadFormulierPubliek.tsx`, `LeadInzendingenLayout.tsx`

**Visualizer** (`visualizer/`): `VisualizerLayout.tsx` (1025), `SigningVisualizerDialog.tsx` (638), `VisualisatieGallery.tsx`, `VisualisatieLightbox.tsx`, `VisualizerKostenDashboard.tsx`, `CreditsPakketDialog.tsx`

**Notifications** (`notifications/`): `MeldingenPage.tsx`, `NotificatieCenter.tsx` (604)

**Onboarding** (`onboarding/`): `WelkomPagina.tsx`, `OnboardingWizard.tsx` (827), `LandingPage.tsx` (1128), `FeatureIllustrations.tsx`, `constants.ts`

**Auth** (`auth/`): `LoginPage.tsx`, `RegisterPage.tsx`, `CheckInboxPage.tsx`, `ForgotPasswordPage.tsx`, `ResetPasswordPage.tsx`, `ProtectedRoute.tsx`

**Layouts** (`layouts/`): `AppLayout.tsx`, `Sidebar.tsx`, `Header.tsx`, `TopNav.tsx`, `TabBar.tsx`, `MobileBottomNav.tsx`

---

## 5. DESIGN SYSTEM STATUS

### Oude pastel CSS classes (blush, sage, mist, cream, lavender, peach)

**Status: GEMIGREERD** — 0 bestanden gebruiken nog `bg-blush`, `text-sage`, `border-mist` etc. als CSS classes.

De termen komen nog wel voor als **thema-namen/strings** in PaletteContext en gerelateerde configuratie (376 voorkomens in 75 bestanden), maar dit zijn geen CSS class-namen meer — het zijn palette identifiers.

### Nieuw mod-* kleurensysteem

**Status: ACTIEF** — 32+ bestanden gebruiken het nieuwe systeem.

Gedefinieerd in `src/lib/moduleColors.ts`:
```typescript
MODULE_COLORS = {
  offertes:   { DEFAULT: '#F15025', light: '#FDE8E2', text: '#C03A18' },
  facturen:   { DEFAULT: '#2D6B48', light: '#E4F0EA', text: '#2D6B48' },
  klanten:    { DEFAULT: '#3A6B8C', light: '#E5ECF6', text: '#2A5580' },
  projecten:  { DEFAULT: '#1A535C', light: '#E2F0F0', text: '#1A535C' },
  planning:   { DEFAULT: '#9A5A48', light: '#F2E8E5', text: '#7A4538' },
  werkbonnen: { DEFAULT: '#C44830', light: '#FAE5E0', text: '#943520' },
  taken:      { DEFAULT: '#5A5A55', light: '#EEEEED', text: '#4A4A45' },
  email:      { DEFAULT: '#6A5A8A', light: '#EEE8F5', text: '#5A4A78' },
}
```

Bestanden die al mod-* gebruiken (o.a.):
- `quotes/QuotesPipeline.tsx`, `QuoteCreation.tsx`, `QuotesFollowUp.tsx`, `FollowUpMailPanel.tsx`
- `projects/cockpit/*` (TaskChecklistView, ProjectKaart, PulseBar, MontageSection, etc.)
- `planning/TasksLayout.tsx`
- `email/EmailReader.tsx`, `EmailCompose.tsx`
- `dashboard/TodayPlanningWidget.tsx`, `OpenstaandeOffertesWidget.tsx`, `AIInsightWidget.tsx`
- `financial/FinancialLayout.tsx`
- `ui/badge.tsx`, `skeleton.tsx`

---

## 6. API ROUTES

38 bestanden in `forgedesk/api/`:

| Bestand | Beschrijving |
|---------|-------------|
| `ai.ts` | Hoofd AI endpoint |
| `ai-chat.ts` | AI chat endpoint |
| `ai-email.ts` | AI email generatie |
| `ai-followup-email.ts` | AI follow-up email |
| `ai-rewrite.ts` | AI tekst herschrijven |
| `analyze-inkoop-offerte.ts` | Inkoop offerte AI analyse |
| `create-checkout-session.ts` | Stripe checkout sessie |
| `create-portal-session.ts` | Stripe portal sessie |
| `create-subscription.ts` | Stripe abonnement aanmaken |
| `email-settings.ts` | Email instellingen (IMAP/SMTP) |
| `emailTemplate.ts` | Email template ophalen |
| `exact-auth.ts` | Exact Online authenticatie |
| `exact-callback.ts` | Exact Online OAuth callback |
| `exact-refresh.ts` | Exact Online token refresh |
| `exact-sync-factuur.ts` | Factuur sync naar Exact Online |
| `fetch-emails.ts` | Emails ophalen (IMAP) |
| `generate-signing-mockup.ts` | Signing mockup generatie (AI) |
| `goedkeuring-reactie.ts` | Goedkeuring reactie verwerken |
| `invite-team-member.ts` | Teamlid uitnodigen |
| `kvk-basisprofiel.ts` | KvK basisprofiel ophalen |
| `kvk-zoeken.ts` | KvK zoeken |
| `manage-team-member.ts` | Teamlid beheren |
| `mollie-create-payment.ts` | Mollie betaling aanmaken |
| `mollie-webhook.ts` | Mollie webhook handler |
| `offerte-accepteren.ts` | Offerte acceptatie verwerken |
| `offerte-publiek.ts` | Publieke offerte ophalen |
| `offerte-wijziging.ts` | Offerte wijziging verwerken |
| `portaal-bekeken.ts` | Portaal bekeken markeren |
| `portaal-create.ts` | Portaal aanmaken |
| `portaal-get.ts` | Portaal ophalen |
| `portaal-link-aanvragen.ts` | Portaal link aanvragen |
| `portaal-reactie.ts` | Portaal reactie verwerken |
| `portaal-upload.ts` | Portaal bestand uploaden |
| `portaal-verlengen.ts` | Portaal verlengen |
| `read-email.ts` | Specifieke email lezen (IMAP) |
| `send-email.ts` | Email verzenden (SMTP) |
| `stripe-webhook.ts` | Stripe webhook handler |
| `test-email-connection.ts` | Email verbinding testen |

---

## 7. SERVICES

### supabaseService.ts (5701 regels) — 322+ functies

**Klanten:** `getKlanten`, `getKlant`, `createKlant`, `updateKlant`, `deleteKlant`, `getAllKlantLabels`

**Projecten:** `getProjecten`, `getProject`, `getProjectenByKlant`, `createProject`, `updateProject`, `deleteProject`, `generateProjectNummer`

**Taken:** `getTaken`, `getTaak`, `getTakenByProject`, `createTaak`, `updateTaak`, `deleteTaak`, `uploadTaakBijlage`

**Offertes:** `getOffertes`, `getOfferte`, `getOffertesByProject`, `getOffertesByKlant`, `createOfferte`, `updateOfferte`, `deleteOfferte`, `generateOfferteNummer`, `getOffertesByPubliekToken`, `updateOfferteTracking`, `respondOpOfferte`, `getKlantOfferteContext`, `getMateriaalSuggesties`

**Offerte Items:** `getOfferteItems`, `createOfferteItem`, `updateOfferteItem`, `deleteOfferteItem`

**Offerte Versies/Templates:** `getOfferteVersies`, `createOfferteVersie`, `getOfferteTemplates`, `createOfferteTemplate`, `updateOfferteTemplate`, `deleteOfferteTemplate`

**Facturen:** `getFacturen`, `getFactuur`, `createFactuur`, `updateFactuur`, `updateFactuurStatus`, `deleteFactuur`, `generateFactuurNummer`, `generateCreditnotaNummer`, `getFactuurByBetaalToken`, `markFactuurBekeken`, `getVerlopenFacturen`, `getFacturenByKlant`, `getFacturenByProject`

**Conversies:** `convertOfferteToFactuur`, `convertWerkbonToFactuur`, `createCreditnota`, `createVoorschotfactuur`

**Werkbonnen:** `getWerkbonnen`, `getWerkbon`, `getWerkbonnenByProject`, `getWerkbonnenByOfferte`, `getWerkbonnenByKlant`, `createWerkbon`, `updateWerkbon`, `deleteWerkbon` + items, regels, fotos, afbeeldingen CRUD

**Bestelbonnen:** `generateBestelbonNummer`, `getBestelbonnen`, `getBestelbon`, `createBestelbon`, `updateBestelbon`, `deleteBestelbon` + regels CRUD

**Leveringsbonnen:** Volledige CRUD + regels

**Financieel:** Grootboek, BTW codes, kortingen, uitgaven, leveranciers, voorraad CRUD

**Planning:** Events, montage afspraken, verlof, bedrijfssluitingsdagen, booking slots/afspraken

**Portaal:** `getAllPortalen`, `getPortaalByProject`, `getPortaalByToken`, `createPortaal`, `verlengPortaal`, `deactiveerPortaal` + items, bestanden, reacties

**Overig:** Medewerkers, tijdregistraties, notificaties, AI chats, deals, leads, calculatie, document styles, project fotos, audit log, signing visualisaties, visualizer credits

### authService.ts
`signIn`, `signUp`, `signOut`, `getSession`, `resetPassword`, `updatePassword`, `resendConfirmation`, `onAuthStateChange`

### aiService.ts
`isAIConfigured`, `chatCompletion`, `streamChatCompletion`, `generateText`, `analyzeProject`, `generateEmailDraft`, `suggestQuoteText`

### gmailService.ts
`isGmailConfigured`, `authenticateGmail`, `isAuthenticated`, `signOutGmail`, `fetchEmails`, `getEmailDetail`, `sendEmail`, `markAsRead`, `starEmail`, `deleteEmail`, `searchEmails`, `testEmailConnection`, `fetchEmailsFromIMAP`, `readEmailFromIMAP`, `loadEmailSettingsFromDb`, `saveEmailSettingsToDb`

### pdfService.ts
`generateOffertePDF`, `generateFactuurPDF`, `generateRapportPDF`, `generateBestelbonPDF`, `generateLeveringsbonPDF`, `generateWerkbonPDF`, `addVisualisatiePaginasToPdf`, `addBriefpapierBackground`

### emailTemplateService.ts
`getBaseTemplate`, `offerteVerzendTemplate`, `offerteGoedgekeurdTemplate`, `offerteFollowUpTemplate`, `factuurVerzendTemplate`, `factuurHerinneringTemplate`, `tekeningGoedkeuringTemplate`, `nieuwsbriefWrapperTemplate`

### forgieChatService.ts
`sendForgieChat`, `getForgieHistory`, `clearForgieHistory`, `importCsvToForgie`, `getForgieImports`, `deleteForgieImport`

### forgieService.ts
`callForgie`, `getForgieUsage`, `isForgieConfigured`

### importService.ts
`parseCSV`, `parseContactpersonen`, `findKlantByNaam`, `importKlanten`, `importActiviteiten`, `clearImportData`, `generateKlantenTemplate`, `generateActiviteitenTemplate`

### storageService.ts
`uploadFile`, `downloadFile`, `getSignedUrl`, `uploadMontageBijlage`, `deleteFile`, `listFiles`

### ublService.ts
`generateUBLInvoice`, `downloadUBLXml`

### werkbonPdfService.ts
`generateWerkbonInstructiePDF`

### aiRewriteService.ts
`rewriteText` — Tekst herschrijven (formeel, kort, vriendelijk, etc.)

### followUpService.ts
`generateFollowUpEmail`, `sendFollowUpEmail`

---

## 8. CONTEXTS

| Context | Provider | Beschrijving |
|---------|----------|-------------|
| `AuthContext` | `AuthProvider` | User, session, profile, organisatie, login/logout, trial status, isAdmin |
| `AppSettingsContext` | `AppSettingsProvider` | 30+ computed properties: valuta, btw, pipeline, offerte/factuur nummering, forgie config |
| `ThemeContext` | `ThemeProvider` | Light/dark mode toggle, localStorage `forgedesk_theme` |
| `PaletteContext` | `PaletteProvider` | 2 thema's + 6 accent paletten (Petrol, Flame, Sage, Ocean, Terracotta, Slate), CSS variables |
| `LanguageContext` | `LanguageProvider` | nl/en met 900+ vertaalsleutels in 20 secties, `t()` functie |
| `SidebarContext` | `SidebarProvider` | Collapsed/expanded, layoutMode ('sidebar'/'topnav'), RAIL=88px, EXPANDED=220px |
| `TabsContext` | `TabsProvider` | Browser-style tabs: openTab, closeTab, reorderTabs, dirty state, keyboard shortcuts |

**Provider nesting (App.tsx):**
```
BrowserRouter → ThemeProvider → PaletteProvider → LanguageProvider
→ AuthProvider → AppSettingsProvider → SidebarProvider → TabsProvider
```

---

## 9. HOOKS

| Hook | Beschrijving |
|------|-------------|
| `useCountUp(target, duration)` | Animatie van 0 naar target getal (ease-out cubic) |
| `useDashboardLayout()` | 14 widget types, configureerbare volgorde, grootte, drag & drop |
| `useData()` | Generic data fetching → exports: `useKlanten`, `useProjecten`, `useTaken`, `useOffertes`, `useEmails`, etc. |
| `useDataInit()` | Demo/seed data initialisatie, retourneert `{ isReady }` |
| `useDebounce(value, delay)` | Debounce waarde + `useDebouncedCallback` |
| `useDocumentStyle()` | Ophalen huisstijl of default `DocumentStyle` |
| `useLocalStorage(key, initial)` | Generieke localStorage state met auto-persist |
| `useNavigateWithTab()` | `navigateWithTab(options)` — opent pagina's in tabs |
| `useOnlineStatus()` | Online/offline boolean via navigator.onLine |
| `usePortaalHerinnering()` | Automatisch herinneringen sturen na X dagen inactiviteit |
| `useProjectSidebarConfig()` | 11 togglebare secties in project sidebar |
| `useSidebarLayout()` | Sidebar sectie-volgorde + pinning met drag & drop |
| `useTabDirtyState()` | Dirty-state tracking per tab, `{ setDirty, isDirty }` |
| `useTabShortcuts()` | Ctrl+T/W/Tab, Ctrl+1-9 voor tab navigatie |
| `useTrialGuard()` | Blokkeert acties bij verlopen trial, `{ isBlocked, guardAction }` |
| `useUnsavedWarning(isDirty)` | Browser beforeunload warning |

---

## 10. KNOWN ISSUES

### Typecheck script

`npm run typecheck` is beschikbaar (`tsc -b`). Niet uitgevoerd in deze scan.

### Grote componenten (>500 regels) — 52 bestanden

| Component | Regels | Ernst |
|-----------|--------|-------|
| `settings/SettingsLayout.tsx` | **3627** | Kritiek |
| `quotes/QuoteCreation.tsx` | **2996** | Kritiek |
| `invoices/FacturenLayout.tsx` | **2648** | Kritiek |
| `settings/CalculatieTab.tsx` | **2366** | Hoog |
| `projects/ProjectDetail.tsx` | **2227** | Hoog |
| `planning/MontagePlanningLayout.tsx` | **1947** | Hoog |
| `clients/ClientProfile.tsx` | **1829** | Hoog |
| `invoices/FactuurEditor.tsx` | **1751** | Hoog |
| `quotes/QuotesPipeline.tsx` | **1739** | Hoog |
| `email/NewsletterBuilder.tsx` | **1693** | Hoog |
| `planning/TasksLayout.tsx` | **1631** | Hoog |
| `quotes/QuoteItemsTable.tsx` | **1612** | Hoog |
| `planning/CalendarLayout.tsx` | **1599** | Hoog |
| `reports/RapportagesLayout.tsx` | 1359 | Medium |
| `projects/TijdregistratieLayout.tsx` | 1340 | Medium |
| `email/EmailReader.tsx` | 1340 | Medium |
| `quotes/OfferteDetail.tsx` | 1281 | Medium |
| `settings/TeamLayout.tsx` | 1188 | Medium |
| `settings/DataImportLayout.tsx` | 1158 | Medium |
| `onboarding/LandingPage.tsx` | 1128 | Medium |
| `settings/HuisstijlTab.tsx` | 1087 | Medium |
| `quotes/OffertePubliekPagina.tsx` | 1071 | Medium |
| `projects/ProjectsList.tsx` | 1059 | Medium |
| `visualizer/VisualizerLayout.tsx` | 1025 | Medium |
| `quick-actions/NieuweOfferteModal.tsx` | 996 | Medium |
| ... en nog 27 bestanden tussen 500-1000 regels |

### FORGEdesk/Forgie branding in UI-tekst

136 voorkomens in 22 bestanden. **Verwacht gedrag** — "FORGEdesk" is de productnaam, "Forgie"/"Daan" is de AI assistant.

### supabaseService.ts is extreem groot

**5701 regels** met 322+ functies in één bestand. Aanbeveling: opsplitsen per domein.

### types/index.ts is extreem groot

**1717 regels** in één bestand. Aanbeveling: opsplitsen per module.

### Design system migratie

Oude pastel CSS classes zijn gemigreerd, maar het nieuwe `mod-*` systeem is pas in ~32 van de 200+ component bestanden in gebruik. Veel bestanden gebruiken nog directe Tailwind kleuren (slate, gray, etc.) in plaats van het semantische module-kleurensysteem.

### Supabase migraties

53 migratie bestanden in `supabase/migrations/`, sommige met dubbele nummering (bijv. meerdere `026_*`, `032_*`, `033_*`, `034_*`, `035_*`, `039_*`, `040_*`). Dit kan verwarring geven bij de volgorde.
