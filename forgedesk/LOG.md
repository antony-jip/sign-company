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
