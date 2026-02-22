# Plan van Aanpak — Projecten-sectie Verbeteren

## Fase 1: Fundament & opschoning (geen visuele impact, voorkomt merge-conflicten later)

### 1.1 Gedeelde constanten extraheren
- Maak `workmate/src/constants/projectConstants.ts`
- Verplaats hierheen: `statusOpties`, `statusLabels`, `statusIcons`, `prioriteitOpties`, status-kleurfuncties (`getStatusBorderColor`, `getStatusCellBg`, `getStatusDotColor`), `taakStatusKolommen`
- Pas imports aan in `ProjectsList.tsx`, `ProjectDetail.tsx`, `ProjectTasksTable.tsx`

### 1.2 Ongebruikte componenten opruimen
- Verwijder `TeamAvailability.tsx` (nergens geïmporteerd, bevat hardcoded demo-data)
- Verwijder `TimelineView.tsx` (nergens geïmporteerd, `ProjectsList` heeft eigen inline Gantt)

### 1.3 `getDocumentenByProject()` toevoegen aan supabaseService
- Voeg een gefilterde query toe, naar het patroon van `getTakenByProject()`
- Verwijder client-side filtering in `ProjectDetail.tsx`

### 1.4 Fix `window.location.href` → React Router
- In `ProjectsList.tsx:656`: vervang `window.location.href` door `useNavigate()` navigatie

---

## Fase 2: ProjectDetail opsplitsen (architectuur)

### 2.1 Nieuwe subcomponenten maken
Splits `ProjectDetail.tsx` (2077 regels) op in:

| Component | Verantwoordelijkheid |
|-----------|---------------------|
| `ProjectHeroBanner.tsx` | Hero-banner, stats, badges, AI-knop, kopieer-knop |
| `ProjectBriefing.tsx` | Briefing tonen/bewerken (collapsible) |
| `ProjectTakenBoard.tsx` | Kanban board + tabel toggle, TaakCard, nieuwe taak dialog |
| `ProjectDocumenten.tsx` | Drag & drop upload zone, bestandenlijst, verwijderen |
| `ProjectGoedkeuringen.tsx` | Goedkeuringen-kaarten, opnieuw versturen |
| `ProjectSidebar.tsx` | Team, rechten, werkbonnen, uitgaven, offertes |
| `ProjectDialogs.tsx` | AI-analyse, verstuur-naar-klant, kopieer-project, email-offerte dialogen |

### 2.2 State refactoring
- Voer een `useProjectData(id)` custom hook in die alle fetch-logica en state bundelt
- Geeft terug: `{ project, klant, taken, documenten, offertes, goedkeuringen, werkbonnen, uitgaven, tijdregistraties, medewerkers, toewijzingen, isLoading, refetch }`
- Houdt `ProjectDetail.tsx` als dunne orchestrator (~150-200 regels)

---

## Fase 3: Ontbrekende kernfunctionaliteit

### 3.1 Project bewerken
- Maak `ProjectEdit.tsx` — formulier vergelijkbaar met `ProjectCreate.tsx` maar pre-filled
- Voeg route toe: `/projecten/:id/bewerken`
- Bewerkbare velden: naam, beschrijving, klant, status, prioriteit, start/einddatum, budget, budget_waarschuwing_pct, tags, categorie, team_leden
- Voeg "Bewerken"-knop toe in `ProjectHeroBanner`

### 3.2 Drag-and-drop Kanban board
- Installeer `@dnd-kit/core` + `@dnd-kit/sortable`
- Implementeer in `ProjectTakenBoard.tsx`: taken slepen tussen kolommen (Todo → Bezig → Review → Klaar)
- Bij drop: `updateTaak(taakId, { status: nieuweKolom })` aanroepen
- Visuele feedback: dragging state, drop-indicator

### 3.3 Automatische voortgangsberekening
- In `useProjectData` hook: bereken voortgang als `(taken met status 'klaar' / totaal taken) * 100`
- Bij taak-statuswijziging: update `project.voortgang` automatisch via `updateProject()`
- Optionele handmatige override bewaren

### 3.4 Offerte email daadwerkelijk versturen
- In de offerte email-dialog: roep `sendEmail()` aan (zoals de goedkeuringsflow al doet)
- Voeg PDF-bijlage toe als bijlage (via bestaande `pdfService`)

---

## Fase 4: Sign-industrie specifiek

### 4.1 Projecttypen voor sign-industrie
- Voeg `type` veld toe aan Project interface: `'lichtreclame' | 'gevelbelettering' | 'voertuigbelettering' | 'raamsigning' | 'interieur' | 'overig'`
- Voeg filter-pills toe in `ProjectsList` voor projecttype
- Toon projecttype als badge in grid/list views

### 4.2 Productiefasen
- Voeg `fase` veld toe aan Project: `'ontwerp' | 'goedkeuring' | 'productie' | 'montage' | 'oplevering'`
- Toon fasebalk in `ProjectHeroBanner` als visuele stappenbalk
- Fase-wijziging via dropdown (vergelijkbaar met status-dropdown in de tabel)

### 4.3 Koppelingen naar bestaande modules
- Link naar montage-planning vanuit ProjectDetail (naar `MontagePlanningLayout`)
- Link naar nacalculatie vanuit ProjectDetail (naar `NacalculatieLayout`)
- Link naar tijdregistratie gefilterd op project

---

## Fase 5: UX-verbeteringen

### 5.1 Bevestigingsdialogen bij destructieve acties
- Document verwijderen: confirmatie-dialog
- Toewijzing verwijderen: confirmatie-dialog
- Project kopiëren: huidige dialog is al goed

### 5.2 Skeleton loading states
- Maak `Skeleton` UI-component (vergelijkbaar met shadcn/ui skeleton)
- Pas toe in ProjectsList (grid-kaartjes skeleton) en ProjectDetail (sectie-skeletons)

### 5.3 Filter/sort persistentie
- Sla filter/sort state op in URL search params (`?status=actief&sort=naam&dir=asc`)
- Gebruik `useSearchParams()` van React Router
- Filters blijven behouden bij navigatie en back-button

### 5.4 Zoeken binnen ProjectDetail
- Voeg zoekbalk toe boven het taken-board voor het filteren van taken
- Zoek op titel, beschrijving, toegewezen persoon

### 5.5 Paginatie of virtualisatie
- Voeg paginatie toe aan ProjectsList (20 per pagina)
- Of: `react-window` voor virtuele scrolling bij grid-weergave

### 5.6 Consistente CSV-export
- Vervang de inline CSV-export (met `;` delimiter) in het actie-menu door de bestaande `exportCSV` utility

---

## Volgorde en afhankelijkheden

```
Fase 1 (fundament)
  ├── 1.1 Constants → nodig voor Fase 2
  ├── 1.2 Opruimen → geen afhankelijkheden
  ├── 1.3 getDocumentenByProject → nodig voor Fase 2
  └── 1.4 Fix navigatie → geen afhankelijkheden

Fase 2 (opsplitsen) ← hangt af van Fase 1
  ├── 2.1 Subcomponenten → nodig voor alles hierna
  └── 2.2 useProjectData hook → nodig voor Fase 3

Fase 3 (kernfunctionaliteit) ← hangt af van Fase 2
  ├── 3.1 Project bewerken
  ├── 3.2 Drag-and-drop (npm install nodig)
  ├── 3.3 Auto-voortgang
  └── 3.4 Email fix

Fase 4 (sign-industrie) ← hangt af van Fase 3.1
  ├── 4.1 Projecttypen
  ├── 4.2 Productiefasen
  └── 4.3 Module-koppelingen

Fase 5 (UX) ← onafhankelijk, kan parallel met Fase 3-4
  ├── 5.1 Confirmatie-dialogen
  ├── 5.2 Skeleton loading
  ├── 5.3 Filter persistentie
  ├── 5.4 Zoeken in detail
  ├── 5.5 Paginatie
  └── 5.6 CSV fix
```

## Geschatte omvang per fase

| Fase | Bestanden nieuw | Bestanden gewijzigd | Complexiteit |
|------|----------------|---------------------|-------------|
| 1 | 1 | 4 | Laag |
| 2 | 8 | 2 | Hoog |
| 3 | 1 | 5 | Hoog |
| 4 | 0 | 6 | Medium |
| 5 | 1 | 4 | Medium |
