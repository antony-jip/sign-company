# doen. — Development Log

## Mei 2026 — Werkbon canvas fase 2 (lokaal afgerond, geen productie-rollout)

**Branch:** `feat/werkbon-canvas-fase2` (15 commits vanaf parent `c462ad38` op fase 1 branch)
**Status:** Lokale acceptatie-test in gang. Niet gemerged naar main, geen productie-rollout. Gate op `werkbonCanvasVersie >= 2`.

### Wat gebouwd
- **Datamodel:** `WerkbonAfbeeldingLayout` uitgebreid met `tekst_positie: 'links'|'rechts'|'boven'|'onder'` en `pdf_bron_url`. `WerkbonBlokType` krijgt `'pdf'`. Geen migratie — alles JSONB-additive.
- **PDF render:** tekst-positie-aware single-image layout (links/rechts side-by-side, boven/onder stacked). Multi-image-items vallen automatisch terug op fase-1 flow. PDF-blok rendert identiek aan foto (pre-resolved PNG van eerste pagina).
- **Editor UI:** corner-resize-handle rechtsonder elke thumbnail (pointer-events, 1px≈1%, snap 25/50/75/100 of Shift voor vrij). Tekst-positie-radio (4 opties, Petrol-active) onder klein/normaal/groot toggle bij single-image items.
- **PDF drop:** WerkbonDropZone accepteert PDF-mime. `pdfToImage.ts` helper extrahieert eerste pagina als 1200px PNG via pdfjs-dist (already peer-dep van react-pdf, geen install). Dual-storage: PNG voor display + originele PDF in `pdf_bron_url`. 25MB cap.

### Nieuwe patterns om te hergebruiken
- **`renderTekstBlok` helper in werkbonPdfService**: inner-helper voor item-text op willekeurige (tx, ty, tw). Te hergebruiken voor fase-3 vrije positie.
- **`pdfEerstePaginaNaarImage` helper**: standalone PDF→PNG conversion. Te hergebruiken voor andere PDF-thumb-needs (offerte-attachments, etc.).
- **Pointer-events resize pattern**: AfbeeldingResizeHandle als template voor fase-3 vrije resize handles.
- **Per-feature gating-strategy**: `fase2Actief = werkbonCanvasVersie >= 2` lokaal in component, UI verbergt features bij flag < N. Renderer respect data altijd (rollback-safe).

### Architectuur-keuzes met motivatie
- **Geen aparte render-pad voor pdf-blok:** PNG van eerste pagina staat al in `url`, renderer behandelt het als foto. Eenvoudiger, minder code-duplicatie. Originele PDF blijft beschikbaar via `pdf_bron_url` voor download/herrendering bij quality-bump.
- **Tekst-positie alleen voor single-image items:** masterplan §8.2 — multi-image flow blijft 'onder'. Voorkomt UX-complexiteit (hoe positie kiezen per afbeelding in een multi-row?).
- **`schaal_percentage` blijft via thresholds in PDF mapping:** ≤40 klein, ≤75 normaal, >75 groot. Continue waarden (uit resize-handle) snappen naar 3 buckets. Echt continue PDF-render is fase 3 (coord-based).

### Open punten voor fase 3
- `renderTekstBlok` heeft tekst-render-code; `hasImage`-tak heeft nog steeds identieke code. Cleanup: route hasImage ook door renderTekstBlok. Niet-blokkerend.
- Aspect-ratio lock werkt via vaste bbox-aspectverhoudingen in `sizeFor`, niet via image-eigen aspect. Bij `boven`/`onder` tekst-positie: image krijgt `min(sizeFor.w, contentWidth)` — kan aspect-verstoring veroorzaken als sizeFor.h niet schaalt mee. Verifieer in §7.4 #3.
- PDF >25MB: cap is hard-error. Eventueel: degrade-render naar lager DPI?
- Continue schaal in PDF-render: alleen mogelijk via fase-3 coord-based pad.

### Stop-gate vóór fase 3
Per masterplan §8.4: minimaal 2 productie-weken na fase 2. Lokaal: gebruik fase-2-testplan + acceptatiecriteria §7.4.

## Mei 2026 — Werkbon canvas fase 1 (lokaal afgerond, geen productie-rollout)

**Branch:** `feat/werkbon-canvas-fase1` (22 commits vanaf parent `f5d27254`)
**Status:** Lokale acceptatie-test in gang. Geen merge naar main, geen productie-rollout.

### Wat gebouwd
- **Datamodel:** migratie 114 (`werkbon_afbeeldingen.layout JSONB`) + migratie 115 (`app_settings.werkbon_canvas_versie INT`).
- **PDF render:** percentage-based `sizeFor` via `resolveSchaal`-fallback-keten (`layout.schaal_percentage` → `deriveFromGrootte(grootte)` → 50). Logo-blok-render 40×40mm rechtsboven in item-block.
- **Editor UI:** WerkbonDropZone-component voor per-item file-drop (JPG/PNG, multi-file, mime-validatie, dashed flame border). HTML5 drag-reorder binnen item via `layout.volgorde`. Klein/normaal/groot toggle schrijft nu uitsluitend `layout.schaal_percentage` (33/50/100); `grootte`-kolom blijft alleen read-fallback. Logo/foto pill-toggle rechtsboven op elke thumbnail (FOTO subtiel, LOGO met flame-border).
- **Mobile fork:** nieuwe `WerkbonMonteurView` read-only voor telefoon. `App.tsx` route-fork via `useMediaQuery + useAppSettings`. Hergebruikt `WerkbonMonteurFeedback` + `PdfPreviewDialog`.
- **Feature-flag:** `werkbon_canvas_versie` op `app_settings` (per-org via bestaande RLS). Default 0 (= pre-canvas-gedrag). Antony zet 1 per org in Supabase voor activatie. UI-affordances gegate, render-paden niet (data canonical → rollback-veilig).
- **UX-cleanups:** 2-image cap afgedwongen in drop-handler. Em-dash uit WerkbonMonteurView. Dubbele dashed-border weg.

### Nieuwe patterns om te hergebruiken
- **JSONB-additive datamodel** voor incrementele feature-uitbreiding (fase 2/3 breiden `layout`-shape uit zonder schema-breaks).
- **Resolver-pattern** met fallback-keten (`resolveSchaal`, `deriveFromGrootte`) voor backward-compat zonder data-backfill.
- **Per-org feature-flag op `app_settings`** voor instant rollback zonder deploy. Pattern: gate UI-affordances, laat render-paden data-canonical.
- **Aparte mobile-view-component** (`WerkbonMonteurView`) i.p.v. `isReadOnly` props in desktop-component — vermijdt conditional-rendering-hel.
- **WerkbonDropZone-component** als herbruikbare native-HTML5-drop-wrap met `disabled`-prop en MIME-filter (`Files`-type) tegen reorder-conflicten.

### Architectuur-keuzes met motivatie
- **Eén schrijf-bron per data-veld:** UI schrijft uitsluitend `layout.schaal_percentage`, nooit meer `grootte`. Voorkomt dual-source-divergentie in fase 2 als schaal continu wordt (per memory `feedback_geen_silent_data_mutations`).
- **HTML5 native drag-drop, geen libs:** consistent met bestaand werkbonnen/quotes/clients pattern. Geen `react-dnd`/`dnd-kit`/`react-rnd` (CLAUDE.md regel: geen nieuwe npm packages).
- **Flow-based PDF blijft canon:** coordinate-based wordt pas fase 3 (hybride pad). Backward-compat verplicht.

### Open punten voor fase 2 (niet test-blokkers)
- Cosmetisch: `bg-white` → `bg-[#FFFFFF]` consistent maken in werkbonnen-module (17× elders).
- `estimatedHeight` negeert logo-only items (page-break-edge-risico, zeer lage kans).
- Logo overlapt lange omschrijving in no-image PDF-branch (geaccepteerd voor fase 1).
- `sizeFor` constanten hard-coded i.p.v. afgeleid van `contentWidth/colGap` (onderhouds-noot).
- Pre-existing `profile?.naam` TS-issue (gedeeld met `WerkbonDetail.tsx:340`).

### Stop-gate vóór fase 2
Per masterplan §8.1: minimaal 1 productie-week monitoring na rollout. Bij lokale test:
- Test-checklist in `WERKBON_CANVAS_FASE1_TESTPLAN.md`.
- Akkoord per email/bericht: "Fase 2 mag starten".

## April 2026 — Taken-module refactor (afgerond)

**Commits:** c4d97cac, 4b6703ac, 0abecff5, ed0d0f65, 34387d06, d0aac7ff, f2ef242d

### Nieuwe patterns om te hergebruiken
- `src/utils/authHelpers.ts` → `isAdminUser(medewerker, user)`
- `src/components/shared/MedewerkerFilterCombobox` — searchable popover met avatars
- Sticky top action-bar met `#1A535C` teal (consistent met Clients/Quotes)
- Delete-buffer met flush-on-unmount (5s undo-window via sonner toast)
- localStorage-override + migration-marker pattern
  - Keys: `doen_taken_filter_override`, `doen_taken_filter_migration_v2`
- Swimlane-view met collapse-state in localStorage
- Filter-consolidatie: één `filteredTaken`-memo ipv per-view duplicatie

### Productkeuze
**doen. is radicaal transparant binnen een organisatie.** Iedereen ziet 
en plant iedereen's taken. Default filter = "Iedereen" voor alle rollen. 
Bij toekomstige externe freelancers of gevoelige projecten: RBAC-laag 
toevoegen.

### Technische schuld
- `toegewezen_aan` op `Taak` is string (naam), geen FK naar medewerkers
  - Risico bij hernoemen en dubbele namen
  - Niet urgent, wel onthouden

## April 2026 — Planning-module swimlane refactor (afgerond)

**Commits:** 92b26f48, fef14821, d77609f1, 98b7d653, 36a30bd4 + deze LOG-update

### Nieuwe patterns / keys in MontagePlanningLayout
- localStorage-keys:
  - `doen_planning_swimlane_collapsed` — Set met monteur-id's én group-keys
  - `doen_planning_hide_empty_lanes` — boolean als `'1'`/`'0'`
  - `doen_planning_lane_grouping` — `'none' | 'rol'`
- Collapse-state is één gedeelde `Set<string>` voor zowel individuele lanes
  (key = `monteur.id` of `__ongetoewezen__`) als groep-kopregels (key =
  `group:<rolKey>`). Prefix `group:` voorkomt collision met UUIDs.
- Lane-groepering per `Medewerker.rol` via `groupLanesByRol` helper:
  - Buckets: Monteurs (rol=monteur), Productie (rol=productie), Verkoop
    (rol=verkoop), Overig (rol=admin | medewerker | undefined)
  - Lege buckets overgeslagen
- Stable avatar-kleuren via `indexById` Map — kleur per monteur identiek
  ongeacht grouping-modus
- D&D-beslissing (Optie B): drop op collapsed lane expandt de baan
  auto + `toast.info("Baan uitgeklapt: {naam}")` + bestaande
  `handleDragDrop` (per-dag drop-precisie behouden)
- Conflict-indicator (rood `AlertTriangle`) op compact-rij én group-header
  wanneer één afspraak in die scope in `conflictAfspraakIds` zit —
  zichtbaar ook bij collapsed state
- Weather-strip + dag-headers hebben `sticky top-0 z-10` als defensive
  safety-net (inert vandaag, robuust tegen toekomstige refactor)

### Productkeuzes
- **Default = "Geen groepering"** zodat de refactor backwards compatible
  is; coördinator kiest zelf en voorkeur persist in localStorage.
- **Default = "lege banen verbergen"** (`hideEmptyLanes=true`) — matcht
  pre-refactor gedrag. Toggle zichtbaar maakt alle actieve medewerkers,
  bruikbaar voor capaciteitsplanning.
- **Geen sticky group-headers** — stacking complexity niet de moeite bij
  typische groepsgrootte; overwegen bij teams >15.
- **Swimlane v1 geen D&D in Taken-module**, wel in Planning-module —
  semantische keuze: planning = tijd-gebonden, taken-overzicht = triage.

### Expliciet NIET meegenomen (backlog)
- Searchable combobox voor sidebar-filter Planning
- Virtualisering (react-window) bij >15 lanes
- Rol/specialisme-metadata uitbreiding op `Medewerker`-type
- Eye/EyeOff dual-state op "Alle banen"-toggle (QAA-observatie commit 3)
- Group-headers sticky bij scroll binnen grote groep

### Technische schuld
- `Medewerker.rol` is soft-typed enum; bij toevoegen nieuwe rol moet
  `ROL_GROUP_ORDER` in `MontagePlanningLayout.tsx` mee-updaten
- `collapsedLanes`-Set wordt niet opgeschoond bij deactivering/verwijdering
  van een medewerker; Set groeit traag, acceptabel bij <50 lanes
- **Planning-module heeft geen unit-tests**. De recente `formatDate`-TZ-bug
  kwam daardoor pas bij handmatig testen boven. Overwegen: een lichte
  test-harness (vitest) voor puur-functionele helpers (`formatDate`,
  `getMondayOfWeek`, `getWeekNumber`, `groupLanesByRol`, conflict-detectie)
  zodat regressies op deze randgevallen sneller zichtbaar worden. Niet
  urgent; apart traject.

### Proces-les (april 2026) — Planner moet provider-claims verifiëren

`MedewerkerSelector` is in eerste instantie gebouwd met
`useDashboardData()` voor interne data-fetch op basis van een
Planner-claim: *"DashboardDataContext is app-breed geladen, bevestigd
door alle module-layouts die useDashboardData al consumeren"*. Die
claim was fout — de provider zit alleen in `FORGEdeskDashboard.tsx`
rond de dashboard-index-route. Op elke andere route mount het
component buiten de provider en crasht `useDashboardData` met
`"useDashboardData must be used within DashboardDataProvider"`. Een
grep had dat direct uitgewezen: de enige `useDashboardData`-consumer
is het dashboard zelf.

**Vaste regel voor toekomstige plans**: elke claim over context-
scope, provider-wrapping of app-breed beschikbare hooks moet
**bewezen** worden met een concrete grep-referentie naar de provider-
plaatsing én de consumer-lijst, niet aangenomen. Zelfde geldt voor
claims over shared utilities, RLS-policies, of andere "app-breed
geldige" eigenschappen. Voor reviewers: blokkeer plannen die zulke
claims maken zonder `bestand:regel`-bewijs.

Fix voor dit specifieke geval: `MedewerkerSelector` neemt
`medewerkers: Medewerker[]` als prop, consumers geven hun eigen
al-gefetchte state door. Dit matcht `MedewerkerFilterCombobox` (dat
nooit context gebruikte) en respecteert de per-route data-boundaries
die de app al hanteert. Zie commits `4e6bb3a1` (selector intro),
`c96d4dd7` (eerste consumer → crash) en `fff500cd` (prop-based fix).

### Tech-debt aandachtspunten (niet urgent, wel onthouden)

- **Value-converter `string ↔ string | null` rondom `MedewerkerSelector`**:
  consumers vertalen aan weerskanten (`value={x || null}` + `onChange={v =>
  setX(v ?? '')}`). Nu in ProjectsList, NieuweTaakModal, en impliciet in
  filter-paden. Als dit bij migraties C4-C10 nog 2-3x opduikt, extraheren
  naar een tiny helper — bv. `toSelectorValue(s)` / `fromSelectorValue(v)`
  in `src/utils/selectorValue.ts`. Kleinere diff-oppervlakte en
  consistentere boundary-handling. Drempel: ~5 call-sites.

## Bewuste afwijkingen van Prompt C (medewerker-selector-standaard)

### 2026-04-24 — Montage-afspraak dialog behoudt avatar-toggle-grid

**Context**: Prompt C standaardiseert medewerker-selector-UIs op
`MedewerkerSelector` (popover-based). Toegepast in C2 (ProjectsList
team-kolom, multi-mode, `trigger="avatar-stack"`) en C3
(NieuweTaakModal toegewezen-aan, single-mode, `trigger="input"`).

**Beslissing**: de Medewerkers-selector in de Montage-afspraak dialog
(`src/components/planning/MontagePlanningLayout.tsx:1767-1786`, de
`flex flex-wrap` avatar-toggle-grid) blijft ongewijzigd. Expliciet
**niet** migreren naar `MedewerkerSelector`.

**Motivatie**:

1. **Conflict-banner-UX is doorslaggevend**. Direct onder het
   selector-veld leeft een live-overlap-waarschuwing
   (`MontagePlanningLayout.tsx:1788-1816`) die `formData.monteurs` in
   real-time leest. Met de avatar-grid ziet de gebruiker toggle +
   overlap-feedback in één frame — oorzaak en gevolg zijn direct
   gekoppeld. Een popover-selector dekt die banner af tijdens
   selectie, waardoor de feedback-loop breekt. Voor een veld wiens
   bestaansreden "double-booking voorkomen" is, is die gebroken loop
   onacceptabel.
2. **Use-case verschilt fundamenteel** van C2/C3. Dit is bulk-toggling
   van meerdere monteurs binnen een afspraak-context met live
   conflict-feedback — niet "selector-in-tabelrij" (C2) of
   "toewijzen-in-form-input" (C3).
3. **Team-omvang-doel (10 medewerkers) past optimaal bij grid-pattern**.
   Grid toont alle actieve medewerkers zonder klik of scroll;
   "recognition over recall" werkt hier beter dan een verborgen lijst.
   Omslagpunt naar popover ligt bij >15 medewerkers.
4. **Code-schuld is minimaal**: 20 regels JSX + 8-regel `toggleMonteur`
   helper (`MontagePlanningLayout.tsx:613`), gebruikmakend van
   gedeelde helpers uit `utils/medewerkerAvatar.ts`. `MedewerkerSelector`
   heeft geen always-visible-grid-mode; er is dus geen echte duplicatie
   met de selector — het zijn verschillende patronen voor verschillende
   use-cases.

**Onderhoud**: de grid blijft gebonden aan:
- `getAvatarStyle` uit `src/utils/medewerkerAvatar.ts` — gedeeld met
  `MedewerkerSelector` en weekview-lanes
- lokale `getInitials` in `MontagePlanningLayout.tsx:164` — wordt ook
  gebruikt op regel 889, 1410, 2091 (niet verwijderbaar zonder cascade)

Wijzigingen aan het avatar-palette of initialen-logica moeten
consistent blijven tussen grid, selector en weekview.

**Herziening-triggers** (revisiteren als één van deze waar wordt):
- Team-omvang groeit >15 medewerkers (scanbaarheid grid degradeert)
- `MedewerkerSelector` krijgt conflict-inline-feedback-ondersteuning
  die de popover-feedback-loop sluit
- De Montage-dialog krijgt een fundamenteel ander UX-paradigma
  (bv. full-screen planning-mode)

## 2026-04-24 — Prompt C afgesloten

Prompt C (medewerker-selector-standaardisatie) afgerond in **6 commits**
(plus 1 forward-fix + 1 docs-only).

| Commit | Doel |
|---|---|
| `73a945e2` | C0 — avatar-palette gecentraliseerd in `utils/medewerkerAvatar.ts` |
| `4e6bb3a1` | C1 — `MedewerkerSelector` shared component gebouwd |
| `fff500cd` | **Forward-fix** na provider-scope-crash: selector prop-based i.p.v. context |
| `c96d4dd7` | C2 — `ProjectsList` team-kolom multi-select gemigreerd |
| `f3825686` | C3 — `NieuweTaakModal` single-select gemigreerd |
| `1650894f` | C4 — `MontagePlanningLayout` dialog **bewust behouden** (zie boven) |
| `61838364` | C5 — `CalendarLayout` multi-select gemigreerd (eerste `valueKind="id"` consumer) |

**Buiten scope gehouden** (C6-C10 uit oorspronkelijk plan):
`MedewerkerFilterCombobox`-consolidatie in `TasksLayout`, plus mogelijke
selector-UIs in `ProjectDetail`, `ProjectTasksTable`, `TaskChecklistView`,
`PortalenOverzicht`, en diverse single-select dropdowns.

**Reden om te parkeren**: secundaire plekken, geen bewezen gebruikers-
pijn. Andere prioriteiten (app-brede TZ-sweep, Daan AI tool-calling)
wegen zwaarder. **Niet proactief consolideren zonder signaal** — pas
oppakken wanneer een gebruiker een inconsistentie meldt op één van
deze plekken.

De benodigde infrastructuur voor toekomstige migraties ligt klaar:
- `MedewerkerSelector` met `single`/`multi` modes, `valueKind="naam"|"id"`,
  en drie trigger-varianten (`pill`, `input`, `avatar-stack`)
- `getAvatarStyleForMedewerker` voor stable-across-app kleuren
- Proces-les vastgelegd: provider-claims met grep verifiëren
- Convert-helper-drempel gemarkeerd (~5 call-sites) — momenteel 3 consumers,
  niet urgent

## April 2026 — Sales Inbox v1 (afgerond)

UX-laag op `/email` voor cold-acquisitie outbound mail: per-mail "Opvolgen"-
flag, Sales Inbox tabs, auto-match van replies, eerlijke UX over de
beperkingen van afzender-match. **Geen pipeline-CRM** — bewust een filter
op bestaande email-functionaliteit, geen aparte entiteit.

| Commit | Doel |
|---|---|
| `3fb8b07a` | refactor — auto-opvolging UI uit composer (vervangen door Sales Inbox) |
| `208542d7` | migration 087 + types — 6 nieuwe kolommen op `emails` + 2 partial indexes |
| `2d732ce8` | service-laag — 6 helpers in `emailService.ts` |
| `881a60aa` | api/send-email — `wacht_op_reactie`-flag + replace-not-stack-logic |
| `31feb0e7` | api/fetch-emails — auto-match v1 (per-newcomer) |
| `d9938e38` | UI — toggle, compose-hint, tabs, banner, per-rij acties |
| `bac24f54` | refactor — UI copy "Wacht op reactie" → "Opvolgen" |
| `bceb0911` | **fix** — auto-match v2 (retroactive sweep + soft deadline) |

### Nieuwe patterns

- **Email-tabel als feature-flag dragger.** Geen aparte sales-table; 6
  kolommen (`wacht_op_reactie`, `beantwoord`, `beantwoord_door_email_id`,
  `vervangen_door_email_id`, `wacht_op_reactie_uitgezet_op`,
  `niet_match_email_ids`) op `emails`. UX-laag, geen entiteit.
- **Partial indexes voor hot path.** `idx_emails_wacht_open` op
  `(user_id, datum DESC) WHERE wacht=true AND beantwoord=false` —
  Opvolgen-tab + auto-match query landen sub-millisecond.
- **Optimistic-remove + rollback in service-laag-callers.** Per-rij
  acties (markeer/wis/terug) verwijderen rij optimistic, herladen tab
  bij fout. Matcht bestaand archive/delete-pattern.
- **Schema/code-naam vs UI-copy ontkoppeling.** DB-kolom blijft
  `wacht_op_reactie`; UI heet "Opvolgen". Bij twijfel kiezen we de
  actieve user-georiënteerde label, niet de toestand-omschrijving.
- **Retroactive sweep i.p.v. per-newcomer-loop in serverless function.**
  2 parallel SELECTs + N updates voor matches gevonden. Met soft
  deadline (`Date.now() - startedAt > MS`) als guard tegen runaway.
  Idempotent: filters + race-guards + in-memory `alreadyMatched: Set`.
- **`extractBareEmail`-helper inline in API-routes.** Vercel serverless
  kan geen src/-imports doen → twee identieke kopieën in
  `api/send-email.ts` en `src/services/emailService.ts`. Aanvaard
  duplicate; één plek niet haalbaar.

### Productkeuzes

- **"Opvolgen" boven "Wacht op reactie".** Gebruiker is actief de
  bewaker, niet passief afwachter. UI-rename in aparte commit ná
  feature-shipping (`bac24f54`); tabel-naam `wacht_op_reactie` blijft.
- **72u inbox-sweep window** (niet 24u). Dekt weekend-pattern: gebruiker
  niet actief za/zo, refresht maandag, weekend-replies blijven matchen.
- **Pure afzender-match v1.** Threading-kolommen (`in_reply_to`,
  `references`) bestaan al sinds migratie 062 maar worden bewust niet
  gebruikt. Eerlijke UX-banner waarschuwt over false positives.
- **Vervangen-niet-stapelen.** Opvolg-mail naar zelfde adres met flag
  aan → oude rij krijgt `vervangen_door_email_id`; max 1 openstaande
  per adres in Opvolgen-tab.
- **Compose-hint skipt bij multi-recipient** (`to.includes(',')`).
  Cold-acquisitie is 1-op-1 per spec; multi-mail krijgt geen nudge.
- **Sales-acties alleen in default (two-line) row-mode.** Stacked
  (dense) modus heeft fixed 42px hoogte; gebruiker schakelt naar
  default voor correcties.
- **Geen RLS-policies in migratie 087.** Bestaande user-scoped policy
  (`auth.uid() = user_id`) op `emails` dekt alle nieuwe kolommen.

### Auto-match v1 → v2 (de bug)

v1 (commit `31feb0e7`) walked `newEmails` per-mail met 2 queries elk
(storedRow lookup + candidates). Bij ~50 inbox-mails: 100+ extra
round-trips bovenop IMAP-fetch + upsert + thread-resolution → 504
timeouts (`POST /api/fetch-emails` >30s).

Plus: "newcomer-only" blind spot — een inkomende mail die in een
getimeoutte fetch in DB belandde maar de match-loop miste, kreeg nooit
een tweede kans. Concreet bewezen in productie: outbound `8eeee48b...`
naar `info@kunstdoekje.nl` + reply `33c0cf1e...` 65 sec later — match
faalde, handmatige SQL gaf wel resultaat.

v2 (commit `bceb0911`) vervangt door retroactive sweep over DB:
2 parallel SELECTs (inbox 72u, candidates 60d) + N updates voor
matches. Soft deadline 10s (~1/3 maxDuration=30) cap't sweep zodat
hij nooit de hele endpoint laat timeouten. Idempotent via
`.eq('beantwoord', false)`-filter + race-guard + in-memory dedup-Set.

Stranded case automatisch opgelost bij eerstvolgende fetch na deploy.

### Technische schuld

- **Server-side auto-opvolging cleanup.** UI is weg sinds `3fb8b07a`,
  maar `email_opvolgingen`-tabel, `email-opvolging.ts` Trigger task,
  `api/annuleer-opvolging.ts` en `createEmailOpvolging`-helper blijven
  staan zonder huidige callers. 0 rijen geverifieerd. Latere
  opruim-sprint.
- **Batch-upsert fallback in `api/fetch-emails.ts`** (regels 345-389):
  bij batch-failure draait per-mail-fallback met 2 queries × 50 mails.
  100+ queries voor één fetch — kan secundair bijdragen aan timeouts
  bij grote inboxen. Out of scope commit 7; flag voor performance-sprint.
- **`createEmail()` in `emailService.ts:117`** doet `.insert({ ...,
  organisatie_id })` maar `emails`-tabel heeft die kolom niet. Dood pad
  (uitvoer gaat via `api/send-email.ts`); cleanup latere sprint.
- **PAT in `git remote -v` cleartext.** GitHub Personal Access Token
  van `antony-jip` zit in remote URL. Aanbevolen: roteren via
  github.com/settings/tokens, `git remote set-url origin
  https://github.com/antony-jip/sign-company.git`,
  `git config --global credential.helper osxkeychain`.

### Buiten scope (v2-roadmap)

- **Thread-aware matching via `in_reply_to`/`references`.** Kolommen
  worden al gevuld bij IMAP-fetch sinds migratie 062, niet geconsulteerd.
  Natuurlijke upgrade die false-positives drastisch reduceert (geen
  verkeerde-matches uit info@-replies of mails-over-ander-onderwerp).
  Eigen feature, eigen sprint.
- **Auto-match naar Trigger.dev task.** Als de 10s soft deadline ooit
  hit blijft worden, verplaats sweep naar background task. v1 inline
  is fine voor solo-founder volume.
- **Statistieken / response-rates / dashboard.** Bewust uit v1 gehouden;
  mocht gebruiker ernaar vragen, eigen feature.
- **Bulk-acties** (alles afvinken, alles uit Opvolgen).
- **Koppeling klant/project/offerte op email-niveau.** doen. is geen
  pipeline-CRM — bewuste keuze.
- **`alreadyMatched.add()` bij race-loss.** Edge case bij meerdere
  concurrent tabs — verloren matching-kans voor latere inkomende in
  zelfde sweep. Niet relevant bij solo-founder use case.

## 2026-04-26 — Mobile email module fixes (afgerond)

**Commits:** 70a61a07, ac0b2e69, 0df33fc5, d2b6384f, d3de7f05, 3da3a806, a6f401b7, 7549ba4b

Mini-sprint om de email-module bruikbaar te maken op 375px. Geen
herontwerp — alleen Tailwind responsive prefixes en één React-portal
om een stacking-context bug op te lossen. Desktop ≥768px is
byte-identical.

### Patterns toegepast
- `md:hidden` + `hidden md:flex/inline/contents` voor mobile-only
  show/hide zonder desktop-styling weg te halen.
- `md:!w-[220px]` (important-modifier) om mobile `w-[80vw]` te overrulen
  op één element — alternatief was twee `<aside>`-elementen, zoals
  `Sidebar.tsx` doet. Single-element + `!` is kleinere diff.
- `flex-col md:flex-row` met `w-full md:w-auto justify-end md:justify-start`
  op de actions-cluster om compose/reply bottom-bars te stacken op mobile,
  Send-knop right-aligned (Gmail/Apple Mail patroon).
- **`createPortal(..., document.body)` voor mobile drawer + sticky CTA.**
  AppLayout's `<main>` heeft `style={{ position: 'relative', zIndex: 0 }}`
  in topnav-mode (regel 40). Dat creëert een stacking context die `fixed
  z-50` kinderen vangt → globale Header (z-30 in parent context)
  overschreef drawer-top. Portal naar body ontsnapt aan die trap.
- Sticky bottom-CTA boven `MobileBottomNav` met
  `bottom-[calc(3.5rem+env(safe-area-inset-bottom))]` voor iOS notch.

### Buiten scope (parked, vereist eigen sprint)

- **Mobile email sidebar polish — needs design pass before
  implementation.** De drawer functioneert maar voelt amateuristisch:
  spacing, hiërarchie tussen primary/secondary folders, branding-strip
  onderaan, knop-plaatsing. Geen responsive-prefix werk meer — vereist
  design-denken vóór code. Aparte sprint.
- **Toolbar overflow op email-list (375px).** `RefreshCw` en list-style
  toggle vallen buiten viewport, was al pre-existing voor deze sprint.
  Plus `overflow-x-auto` op filter-pills. Niet als one-liner op te
  lossen → bewust uit scope gehouden.
- **Bulk-select op touch ontbreekt.** Checkboxes onthuld op `:hover` in
  EmailListItem — touch heeft geen hover. Long-press → selection-mode
  is iOS-conventie. Eigen feature.
- **Swipe-acties (archive/delete/read).** Standaard mobile mail-pattern,
  niet aanwezig. Library-vrij te bouwen met touch events.
  Premium-upgrade.
- **Bottom-content overlap.** Email-list heeft geen `pb-` om
  MobileBottomNav + sticky CTA te clearen — laatste rijen vallen achter
  de chrome. Polish-sprint.
- **Header-creep op mobile.** Top-header + tab-pillrow + email-toolbar +
  search-bar = ~30% screen weg vóór content. Tab-pillrow met "Email ×"
  is dubbelop met bottom-tabbar. Navigatie-gesprek dat boven email
  uitstijgt.
- **Dubbele "Projecten" tab.** In screenshot na openen reply-mode
  verscheen "Projecten Projecten Email ×" ipv enkel "Email ×". Mogelijk
  regressie in tabbar-systeem. Niet onderzocht.

### Tech-debt aandachtspunten
- `EmailReader.tsx` (1462 regels) en `EmailLayout.tsx` (~1520 na deze
  sprint) zijn groot. Reply-mode + reading-mode in één bestand maakt
  navigatie traag. Splitsen in `EmailReaderReadingMode.tsx` /
  `EmailReaderReplyMode.tsx` zou helpen — niet urgent.
- `EmailContextSidebar` is `hidden xl:flex` (1280px+) — onzichtbaar op
  iPad-portrait (~810px). Bewust of regressie? Niet onderzocht in deze
  sprint.

## 2026-07-05 — Security sprint (audit + P0/P1/P2/P3)

Analyse-only audit over 5 gebieden → gefaseerde remediatie (plan:
`~/.claude/plans/maak-nu-een-plan-reflective-mountain.md`). Migraties 141-147.

**Bewuste beslissingen (niet als bug behandelen):**
- **Support-admin-UUID** in migratie `122_support_chat.sql` (`auth.uid() =
  'ce6843e3-5cd9-4043-9461-55071bc91eb7'`) geeft dit ene support-account
  cross-tenant lees+schrijf op support-chats. Dit is BEWUST (interne
  support-toegang), geen lek. Optioneel later: vervangen door een
  support-rol/claim i.p.v. hardcoded UUID.
- **Nummer-generatie** blijft max-scan + retry-on-23505 + unique index
  (geen atomaire teller-tabel) — bewust, om fiscale gaten bij verwijderde
  concept-facturen te voorkomen.

**Nog open:** app_settings-brede secret-exposure + `kvk_api_key`-encryptie
(feature-refactor, apart in te plannen) en b64-encryptie-fallback verwijderen
(vereist prod-check op `b64:`-rijen). PKCE + sessie-JWT-uit-query bij
exact-auth: flow-wijziging, apart.
