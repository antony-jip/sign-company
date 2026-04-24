# doen. — Development Log

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
