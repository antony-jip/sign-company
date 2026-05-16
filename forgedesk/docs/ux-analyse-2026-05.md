# UX-analyse doen. — april/mei 2026

> Bron: code-pass op `forgedesk/src/components/` op 2026-05-04.
> Methode: lezen + grep, geen browser-test. Diepte op `FORGEdeskDashboard` + sweep over 8 modules.
> Streefdatum launch: 17 mei 2026 (T-13 dagen).

---

## Samenvatting

Dashboard staat er visueel goed: typografie, kleuren en widget-grid voelen volwassen. Maar de **basis-UX-hygiëne is gemankeerd**: skeletons ontbreken (alleen spinners → layout-shift), accessibility heeft 0 focus-rings, en er staat ~1.700 regels **dood widget-code** in `dashboard/`. De modules zelf zijn ongelijk — Klanten/Offertes/Facturen voelen klaar, Taken en Montage zijn enorm (2.6k / 2.2k regels) en dragen nog inconsistenties (sticky teal action-bar uit `CLAUDE.md` is **nergens** echt zo geïmplementeerd). Klaar voor 17 mei? **Ja, met 5 quick-wins** (zie onder). Top-3 risico's: (1) accessibility audit zal er hard inhakken, (2) em-dashes zitten verspreid in UI-copy ondanks duidelijke regel, (3) dashboard heeft drie ongebruikte hero-widgets die suggereren dat het oorspronkelijke "Wat moet ik doen?"-blok ergens onderweg is gesneuveld zonder vervanger.

---

## Dashboard — diepteanalyse

### 1. Loading states ⚠️
Inconsistent en functioneel zwak. Van de 28 widget-files gebruikt **0** het Shadcn `<Skeleton>` component. 22 widgets renderen een centered `Loader2` spinner in een fixed-height card (`h-48`), 2 gebruiken `animate-pulse` (`StatisticsCards.tsx:39-51`, en het hero-pulse). Gevolg: bij settled state schuift de pagina (de spinner-card is altijd `h-48`, het echte widget meestal anders). Fix: `<SkeletonTable>` bestaat al en wordt door `ClientsLayout`/`ProjectsList`/`FacturenLayout`/`QuotesPipeline` gebruikt. Trek dat door naar dashboard-widgets.

### 2. Empty states ⚠️
Slechts **6 van 28** dashboard-files hebben een echte empty-state UI: `ActionBlock`, `CalendarMiniWidget`, `OpenstaandeOffertesWidget`, `SalesFollowUpWidget`, `TodayPlanningWidget`, `WorkflowWidget`. `MoneyBlock`, `RecenteActiviteitWidget`, `PriorityTasks`, `TeFacturerenWidget`, `InboxPreviewWidget`, `OpenstaandeOffertesWidget` (gedeeltelijk) tonen óf niets óf een leeg blok bij geen data. `AanDeSlagSectie` (`AanDeSlagSectie.tsx:35-167`) is wel een sterke onboarding-empty (zes tegels, voortgangsbalk, dismiss).

### 3. Visuele hiërarchie ⚠️
- ✅ Hero greeting (`FORGEdeskDashboard.tsx:222-231`) + datum is sterk en persoonlijk.
- ✅ Verlopen-facturen alert (rood, regel 242-256) trekt het oog goed.
- ⚠️ Daarna geen voorgeschreven volgorde: gebruiker schuift widgets via drag-and-drop zelf op volgorde. Voor een **default-dashboard** voelt dat als het probleem doorschuiven naar de gebruiker. Wat een signbedrijf-eigenaar 's ochtends wil ("wat moet ik vandaag doen?") moet bij elkaar in één blok staan, niet verspreid over 3 widgets (TodayPlanning + ActionBlock-die-niet-bestaat + PriorityTasks).
- ⚠️ Statistieken (6 cards, `StatisticsCards.tsx`) is mooi maar voelt secundair t.o.v. "wat moet ik nu doen". Defaultgewijs staat het bovenaan het grid.

### 4. Consistente klikfeedback ✅
Hover-states overal `hover:bg-muted/50`, `hover:shadow-elevation-md`, of `hover:-translate-y-[1px]`. Cursors correct (cursor-pointer op klikbare cards). Drag-handles hebben `cursor-grab active:cursor-grabbing`.

### 5. Navigatie 〰️
Buiten scope (Sidebar/TopNav niet gelezen). Spot-check: TabBar + MobileBottomNav + FloatingQuickActions + FloatingEmailButton + ForgieChatWidget zijn **vijf** persistente navigatie-elementen tegelijk in `AppLayout.tsx:30-80`. Op mobiel mogelijk veel.

### 6. Iconografie ✅
100% Lucide React. Geen mix met andere packs. Stijl consistent (1.5 stroke, 4×4 standaard).

### 7. Typografie ✅
- `font-heading` (Bricolage Grotesque) op H1, hero, panel-titels.
- DM Sans body via Tailwind default.
- `font-mono` op alle numerieke waarden (StatisticsCards waardes, factuurnummers, dagen). Consistent toegepast.
- Tracking en weight kloppen met de doen-design tokens.

### 8. Brand-consistentie ⚠️
- ✅ Flame `#F15025` als hero-accent en CTA-kleur. Petrol `#1A535C` voor sub-actions en filters.
- ✅ Flame-dot signature staat op: hero greeting, "Aan de slag.", "Klaar.", "Werk vanuit projecten.", "Klanten.", "Offertes.", offerte-status badges in pipeline.
- ❌ Flame-dot **ontbreekt** op factuur-statuslabels (`FacturenLayout.tsx`) en op klant-statusbadges (`ClientsLayout.tsx:341-358`). Inconsistent met de "verstuurd. betaald. gedaan."-conventie uit `forgedesk/CLAUDE.md`.
- ✅ Geen emoji-violations gevonden in dashboard, projects, quotes, invoices, clients (gegrept op de gangbare ranges).

### 9. Animations & transitions ✅
- `animate-stagger-item` met `animationDelay: index * 50ms` op widgets — subtiele staggered reveal.
- `animate-pulse` op drag-target indicator-bar, `animate-spin` op loaders, `animate-shimmer`/`slide-up-spring` aanwezig in lib.
- Page enter via `page-content-enter` class.
- Subtiel en functioneel. Niet storend.

### 10. User feedback ⚠️
- Sonner toasts: in dashboard alleen `PortaalAlerts` gebruikt ze (`PortaalAlerts.tsx:24`). Andere widgets praten niet terug.
- **Anti-pattern** in `PortaalAlerts.tsx:83-85`: `} catch (err) { // Stille error }` — netwerkfout faalt geluidloos. Gebruiker weet niet dat alerts niet geladen zijn.
- Optimistic updates: niet aanwezig in dashboard-widgets (mutaties gaan via dialogs die wachten op server-response).

### 11. Accessibility ❌
- **0 focus-visible/focus:ring** classes in de hele `dashboard/` map (gegrept). Toetsenbord-navigatie is onzichtbaar.
- 1 (één) `aria-label` gevonden in `dashboard/`, op de Sluit-X van AanDeSlagSectie.
- Icon-only knoppen gebruiken `title=` (browser-tooltip) i.p.v. `aria-label` (schermlezer). `WidgetResizeControl`, `EyeOff`, `GripVertical`, weather-toggle, alle dezelfde issue.
- Drag-and-drop heeft geen toetsenbord-alternatief en geen `aria-grabbed`/`role="listitem"`.
- Contrast lijkt op het oog OK (donkere tekst op `#F8F7F5`/`#FEFDFB`), maar muted-foreground/40 voor hint-tekst is verdacht laag — niet getest met tooling.

### 12. Performance gevoel ⚠️
- Spinner-only loading → layout shift bij settled (zie 1).
- Geen widget lazy-loading: alle 14 widgets in registry worden gemount bij dashboard-mount, ook als ze hidden zijn (in registry maar `layout.hidden.has(id)` filtert ze, dus dat is OK).
- `DashboardDataProvider` haalt waarschijnlijk alle data parallel op — niet gemeten, maar verdacht voor lijsten met >500 records.
- Geen debouncing nodig op dashboard zelf (geen search), wel op `/klanten` (search input lijkt niet gedebounced — `ClientsLayout.tsx:368-375`).

### Bonus: dood gewicht in `dashboard/`
**~1.700 regels worden geïmporteerd of bestaan, maar zijn niet bereikbaar in de UI:**

| Bestand | Regels | Status |
|---|---|---|
| `ActionBlock.tsx` | 252 | Geïmporteerd in `FORGEdeskDashboard.tsx:7`, **niet in registry** |
| `MoneyBlock.tsx` | 167 | Geïmporteerd in `FORGEdeskDashboard.tsx:8`, **niet in registry** |
| `SalesFollowUpWidget.tsx` | 582 | Niet geïmporteerd |
| `WorkflowWidget.tsx` | 168 | Niet geïmporteerd |
| `AIInsightWidget.tsx` | 218 | Niet geïmporteerd |
| `EmailCommunicationHub.tsx` | 153 | Niet geïmporteerd |
| `SalesForecastWidget.tsx` | 109 | Niet geïmporteerd |
| `SalesPulseWidget.tsx` | 126 | Niet geïmporteerd |
| **Totaal** | **~1.775** | |

Dit suggereert dat het dashboard architecturaal in transitie is geweest en de oude hero-blokken ("Wat moet ik doen?" via ActionBlock, "Waar zit mijn geld?" via MoneyBlock) zijn vervangen door losse widgets — zonder dat de oude bestanden zijn opgeruimd. **Belangrijk voor het rapport**: hierdoor mist het dashboard nu een geconsolideerde "vandaag-actie"-blok, wat juist het meest waardevolle scherm 's ochtends zou zijn.

---

## Modules — sweep

### `/projecten` — `ProjectsList.tsx` (1.330 regels)
+ Sterke inline header (`Projecten.` met flame dot, count-badge), Toolbar-card met search + filters + import/export.
+ Gebruikt `<SkeletonTable>` (`r.464`) en `<EmptyState>` (`r.741`) — voorbeeld voor andere modules.
- Twee `&mdash;` violations in regels 1124, 1150 (placeholder voor lege cellen — zie patroon-sectie).
- Geen sticky teal action-bar zoals `forgedesk/CLAUDE.md` zegt; toolbar is wit met teal underline-indicators op active tabs.

### `/offertes` — `QuotesPipeline.tsx` (1.388 regels)
+ Pipeline-view met kolom-headers per status, flame-dot op statuslabels (`r.875, 924, 1145, 1250`). Sterke brand-consistency.
+ `<SkeletonTable>` (`r.577`) en `<EmptyState>` (`r.1112`) aanwezig.
+ Bulk-actie balk met teal-tint (`bg-[#1A535C]/[0.06]` r.1068) — patroon dat ook in Clients/Projects voorkomt.
- **Violation feedback-memory**: filter-optie label `Wacht op reactie` in `r.121` — moet `Opvolgen` worden volgens de "actief vs passief"-regel en de Sales Inbox v1 spec.

### `/planning` — `PlanningLayout.tsx` (65 regels), `MontagePlanningLayout.tsx` (2.168 regels), `CalendarLayout.tsx`
+ MontagePlanningLayout heeft sticky-header op week/maand grid (`r.1298, 1311`) — werkt.
- 2.168 regels in één component is een onderhouds-risico, ook als de logica solide is. CLAUDE.md zegt "niet aanraken zonder reden" — terecht.
- `PlanningLayout.tsx` is een dunne wrapper (65 regels). Geen UX-issue.
- Geen `<EmptyState>` in MontagePlanningLayout — bij lege week zie je een lege grid.

### `/taken` — `TasksLayout.tsx` (2.635 regels)
+ Sticky white toolbar (`r.1013`) met filter chips, swimlane- en lijstweergave.
+ "Niet vergeten"-sticky-note (r.1137) — leuke detail.
- Wéér geen teal sticky-bar, ondanks `CLAUDE.md`-conventie. Inconsistent met Clients/Projects (die hebben witte toolbar) → maar dan hád `CLAUDE.md` niet moeten claimen dat het standaard is.
- 2.6k regels in één component — combineert heel veel modi (dag/maand/swimlane/dropdown/bulk-actions). Refactor uitstellen tot na launch.

### `/klanten` — `ClientsLayout.tsx` (754 regels)
+ Inline header met flame-dot, status-stats badges, view-toggle, multi-row filter (status + label + klantStatus).
+ Sortering, import/export, search met `kbd` shortcut hint (`/`). Polished.
- Search lijkt niet gedebounced (geen `useDebounce` hook gespot rondom regel 368). Bij grote klantenlijsten merkbaar.
- Em-dash in copy (r.549): `'... eerste klant toe — winkels, horeca...'` — feedback-violation.

### `/facturen` — `FacturenLayout.tsx` (2.879 regels)
+ Top-tabs voor `facturen`/`betalingen`/`herinneringen` (`r.1411`). Sub-statusfilters met teal underline-indicator.
+ `<SkeletonTable>` en `<EmptyState>` aanwezig.
- Status-labels missen flame-dot (zie brand-consistency dashboard). "Betaald" in een lijst zonder flame-punt vertelt minder dan "Betaald." doet.
- 2.9k regels — vergelijkbaar met Taken. Uitstellen.

### `/email` — `EmailLayout.tsx` (1.677 regels)
+ Eigen mobile pill-topbar (`EmailMobileTopBar`), drie-paneel desktop layout.
+ Sticky section-headers in lijst (`r.1490, 1511`) met `backdrop-blur-md`.
- AppLayout schakelt expliciet de globale TopNav uit op `/email` mobile (`AppLayout.tsx:34`). Maakt de module wat eigenwijs t.o.v. de rest van de app.
- Geen `EmptyState` in lijst gespot bij grep — bij lege folder waarschijnlijk gewoon witruimte.

### `/forgie` — `ForgieChatPage.tsx` (234 regels) + `ForgieChatWidget`
+ "Daan" als merknaam consistent in UI-copy. Suggestie-chips voor cold-start zijn goed (`r.14-21`).
+ Typing-indicator met drie bouncende dots, mooi.
- Bestandsnaam en service-functies zijn nog `Forgie...` (`sendForgieChat`, `getForgieHistory`, `renderForgieMarkdown`). Geen UI-leak, wel cognitieve dissonantie voor wie de code leest. Niet kritiek voor launch.
- HTML-entities `&euro;` in copy (`r.228`) — werkt, maar inconsistent met de rest die gewoon `€` schrijft.

---

## Patroon-inconsistenties

| Patroon | Claim in `CLAUDE.md` | Realiteit |
|---|---|---|
| Sticky teal action-bar (Clients/Quotes/Facturen) | `bg-[#1A535C]` topbar | **Geen enkele module** heeft een teal sticky topbar. Wel: teal underline op active tab, teal-tint bulk-action banner (`bg-[#1A535C]/[0.06]`), teal hover op buttons. De claim klopt niet. |
| Flame-dot na status-woorden | `verstuurd. betaald. gedaan.` | Wel toegepast in QuotesPipeline en hero's. **Niet** in Facturen-lijst statuslabels en Klanten-stats. |
| Geen em-dashes in UI-copy | `—` → `.`/`,`/`·` | **15+ violations** verspreid: `ActionBlock.tsx:79,102`, `MoneyBlock.tsx:145`, `AanDeSlagSectie.tsx:83` (`&mdash;`), `RecenteActiviteitWidget.tsx:28-42`, `PortaalAlerts.tsx:103,151`, `ProjectsList.tsx:1124,1150`, `ClientsLayout.tsx:549`, `WatNuBanner.tsx:45,46,55,71,82,88`, `OfflineBanner` in `AppLayout.tsx:25`. |
| Actief vs passief copy ("Wacht op reactie" → "Opvolgen") | Sales Inbox v1 spec | `QuotesPipeline.tsx:121` heeft nog filter-label `Wacht op reactie`. |
| `SkeletonTable` voor data-loading | Modulair patroon | Toegepast in 4 module-layouts ✅. **Niet** in 22 dashboard-widgets (die gebruiken `Loader2`). |
| `EmptyState` component | `@/components/ui/empty-state` | Toegepast in Clients/Projects/Quotes/Facturen + 6 dashboard-widgets. **Niet** in MontagePlanning, Email-lijst, of de helft van de dashboard-widgets. |
| Daan-merknaam (niet Forgie) | `.claude/CLAUDE.md` | UI ✅. Bestandsnamen, services, hooks: `Forgie*` blijft (cosmetisch, niet user-facing). |

---

## Quick wins (≤2u per stuk)

Geprioriteerd op zichtbare-impact-per-uur:

1. **Em-dash sweep** (~30 min)
   Find-and-replace over `src/components/`: `—` → `.` of `·` afhankelijk van context, `&mdash;` → `·`. ~15 plekken. Direct zichtbare impact want het komt op het dashboard, in projectkaarten, in factuurregels.

2. **`Wacht op reactie` → `Opvolgen` in QuotesPipeline** (5 min)
   `QuotesPipeline.tsx:121`. Lost feedback-memory inconsistentie op. Eén regel.

3. **Dead code uit `dashboard/` verwijderen** (~45 min)
   Verwijder `ActionBlock.tsx`, `MoneyBlock.tsx`, `SalesFollowUpWidget.tsx`, `WorkflowWidget.tsx`, `AIInsightWidget.tsx`, `EmailCommunicationHub.tsx`, `SalesForecastWidget.tsx`, `SalesPulseWidget.tsx` + de twee dode imports in `FORGEdeskDashboard.tsx:7-8`. ~1.775 regels schoner. **Of** integreer ActionBlock terug — zie 'Grotere brokken'.

4. **Skeletons i.p.v. spinners in dashboard-widgets** (~90 min)
   22 widgets met `Loader2` vervangen door `<Skeleton>` of een per-widget skeleton-shape. Eindresultaat: geen layout-shift bij settled state, "alles is altijd er, maar is nog leeg" gevoel. Begin met de 6 grootste (StatisticsCards al klaar): `TodayPlanningWidget`, `MontagePlanningWidget`, `WeekStripWidget`, `OpenstaandeOffertesWidget`, `PriorityTasks`, `RecenteActiviteitWidget`.

5. **Focus-rings + aria-labels op dashboard icon-buttons** (~60 min)
   Voeg `focus-visible:ring-2 focus-visible:ring-[#1A535C]/40` toe aan widget resize/eyeOff/grip buttons in `FORGEdeskDashboard.tsx:132-138, 342-352` en `WidgetResizeControl`. Vervang de `title=`-attributes door `aria-label=` (of voeg toe naast). Toetsenbord-gebruikers en a11y-audit zijn dan blij.

---

## Grotere brokken (na launch)

- **"Wat moet ik vandaag doen?"-hero terug op het dashboard.**
  De `ActionBlock` (252 r.) consolideert montages + nabellen + facturen + taken in één lijst. Hij is verwijderd zonder vervanger; de vier afzonderlijke widgets vervangen het concept niet. Overweeg `ActionBlock` te restoren als pinned hero-widget bovenaan het grid (boven `StatisticsCards`).

- **Search-debouncing op `ClientsLayout`/`FacturenLayout`/`ProjectsList`.**
  Bij >500 records merkbaar. Niet kritiek voor launch.

- **Toetsenbord-alternatief voor widget drag-and-drop.**
  Move-up / move-down knoppen via menu, of arrow-key support na focus. A11y-blocker pas relevant bij audit.

- **Splitsing `TasksLayout.tsx` (2.635 r.) en `MontagePlanningLayout.tsx` (2.168 r.).**
  Gevoel-van-onderhoudbaarheid issue, niet UX. CLAUDE.md zegt expliciet niet aanraken — laat staan.

- **Sticky-teal-actionbar conventie definitief beslechten.**
  Of de `CLAUDE.md`-regel klopt niet meer met de praktijk (toolbar is wit met teal-accenten, niet teal achtergrond) en moet aangepast worden, of de modules moeten alsnog die teal achtergrond krijgen. Op dit moment bestaat de claim alleen op papier.

---

## Aanbevolen volgorde van aanpak

Drie pakketjes voor losse Claude Code sessies:

1. **Pakket A — "Klaar voor launch" hygiëne** (4u, doe vóór 17 mei)
   Em-dash sweep + Wacht-op-reactie label + dead code uit dashboard + focus-rings & aria-labels op dashboard icon-buttons. Lage risico's, hoge polish.

2. **Pakket B — "Geen layout-shift meer"** (2-3u, doe vóór 17 mei als tijd toelaat)
   Skeleton-vervanging in 6-10 grootste dashboard-widgets. Eén PR, goed te reviewen.

3. **Pakket C — "Dashboard hero-blok terug"** (4-6u, na launch)
   `ActionBlock` herintegreren als pinned widget, of de "vandaag"-data consolideren in `TodayPlanningWidget`. Vraagt design-keuze, niet alleen code-werk.

Totaal pakket A+B = ~6-7 uur werk voor een merkbaar strakkere launch.
