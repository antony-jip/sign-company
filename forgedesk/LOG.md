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
