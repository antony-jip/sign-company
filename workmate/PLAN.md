# Plan van Aanpak: Workmate Code Quality → 100%

## Scope

Alle code-verbeteringen die ZONDER externe koppelingen (Supabase, Vercel, OpenAI, SMTP) gedaan kunnen worden. Focus: stabiliteit, veiligheid, onderhoudsbaarheid.

---

## Fase 1: Kritieke bugfixes (stille errors + data verlies risico)

### 1.1 Stille `.catch(() => {})` vervangen door `toast.error()`
- **Bestanden:** ~20 locaties in EmailLayout, EmailReader, EmailCompose, Sidebar, FacturenLayout, BetaalPagina, OffertePubliekPagina
- **Wat:** Elke `.catch(() => {})` wordt `.catch((e) => { logger.error(...); toast.error('Actie mislukt') })`
- **Uitzondering:** Fire-and-forget tracking calls (markFactuurBekeken, updateOfferteTracking) mogen stil blijven

### 1.2 Double-click preventie op alle submit buttons
- **Wat:** `disabled={isSubmitting}` + loading spinner op ALLE formulier-submit knoppen
- **Patroon:** useState `isSubmitting`, set true bij submit, false in finally block
- **Scope:** Alle create/update forms (offertes, facturen, werkbonnen, klanten, projecten, taken, uitgaven, bestelbonnen, leveringsbonnen, deals, leads)

### 1.3 Delete-bevestigingen toevoegen
- **Wat:** AlertDialog voor ALLE delete-acties die er nog geen hebben
- **Check:** Momenteel maar 17 confirm/AlertDialog calls op 114 componenten
- **Patroon:** Herbruikbaar `<ConfirmDialog>` component maken in `/components/shared/`

---

## Fase 2: Form validatie

### 2.1 Herbruikbare validatie helpers aanmaken
- **Nieuw bestand:** `src/utils/validation.ts`
- **Functies:** `isValidEmail()`, `isValidPhone()`, `isValidIBAN()`, `isRequired()`, `isPositiveNumber()`, `isValidDate()`

### 2.2 Validatie toevoegen aan formulieren die het missen
- Offerte aanmaken: klant verplicht, minstens 1 item, bedragen > 0
- Factuur aanmaken: klant, bedrag, vervaldatum
- Werkbon: klant, project, datum, locatie
- Uitgave: bedrag, datum, categorie
- Bestelbon: leverancier, minstens 1 regel
- Leveringsbon: klant, datum, locatie
- Deal: titel, klant
- Medewerker: naam, email
- Tijdregistratie: datum, uren > 0
- Settings: email format, telefoonnummer format

---

## Fase 3: Component decomposition (grote bestanden opsplitsen)

### 3.1 SettingsLayout.tsx (3.741 regels → ~9 bestanden)
Opsplitsen in:
- `SettingsLayout.tsx` (wrapper + tab navigatie, ~100 regels)
- `tabs/ProfielTab.tsx`
- `tabs/BedrijfTab.tsx`
- `tabs/CalculatieTab.tsx`
- `tabs/AanpassingenTab.tsx`
- `tabs/MeldingenTab.tsx`
- `tabs/IntegratiesTab.tsx`
- `tabs/BeveiligingTab.tsx`
- `tabs/WeergaveTab.tsx`
- `HuisstijlTab.tsx` (bestaat al, 868 regels)

### 3.2 FacturenLayout.tsx (2.411 regels → ~4 bestanden)
- `FacturenLayout.tsx` (lijst + filters, ~400 regels)
- `FactuurForm.tsx` (aanmaken/bewerken formulier)
- `FactuurDetail.tsx` (detail weergave)
- `FactuurActions.tsx` (status wijzigingen, email, PDF)

### 3.3 ProjectDetail.tsx (2.076 regels → ~6 bestanden)
- `ProjectDetail.tsx` (wrapper + tabs, ~200 regels)
- `tabs/ProjectOverviewTab.tsx`
- `tabs/ProjectTasksTab.tsx`
- `tabs/ProjectDocumentsTab.tsx`
- `tabs/ProjectFinancialTab.tsx`
- `tabs/ProjectTeamTab.tsx`

---

## Fase 4: Hardcoded waarden vervangen

### 4.1 Hardcoded configuratie naar settings verplaatsen
- `WerkbonDetail.tsx:68` — km-tarief `0.23` → lezen uit AppSettings
- `FinancialLayout.tsx` — maandelijkse verdeling → echte data per maand groeperen
- `CalendarLayout.tsx` — werkuren 6-19 → configureerbaar
- Newsletter — `via.placeholder.com` URLs verwijderen, lege state tonen

### 4.2 2FA placeholder verwijderen
- `SettingsLayout.tsx` — "Tweefactorauthenticatie geactiveerd (placeholder)" verwijderen
- Vervangen door "Binnenkort beschikbaar" tekst of tab volledig weglaten

---

## Fase 5: Error boundaries & robuustheid

### 5.1 Sectie-level error boundaries
- **Nieuw component:** `src/components/shared/SectionErrorBoundary.tsx`
- **Toepassen op:** Elke dashboard widget, elke tab in ProjectDetail/Settings, elke route-level component
- **Patroon:** Toont "Er ging iets mis in [sectie]. Probeer opnieuw." met retry knop

### 5.2 Standaardisatie loading/error/empty states
- **Nieuw component:** `src/components/shared/DataState.tsx`
  - Props: `loading`, `error`, `empty`, `emptyMessage`, `children`
  - Consistent patroon voor alle lijstweergaven
- **Toepassen op:** Alle Layout-componenten die data ophalen

---

## Fase 6: Code consistentie

### 6.1 Naamgeving standaardiseren
- Alle `loading` variabelen → `isLoading` (consistent patroon)
- Alle error logging → via `logger.error()` (niet console.error)

### 6.2 `as any` casts oplossen (8 stuks)
- `pdfService.ts` (5x): `(doc as any).lastAutoTable` → proper type declaration voor jsPDF-autotable plugin
- `gmailService.ts` (2x): error response typing → maak `ApiError` interface
- `aiService.ts` (1x): error response typing → zelfde `ApiError` interface

---

## Fase 7: Basis tests

### 7.1 Test setup
- Vitest configureren (past bij Vite)
- Test utilities: `@testing-library/react`, `@testing-library/jest-dom`

### 7.2 Unit tests (kritieke paden)
- `utils/budgetUtils.ts` — `round2()`, `berekenBudgetStatus()`
- `utils/validation.ts` — alle validatie functies (nieuw uit Fase 2)
- `utils/emailUtils.ts` — `extractEmailAddress()`
- Auto-nummering: werkbon, uitgave, bestelbon, leveringsbon nummers

### 7.3 Service tests
- CRUD operaties (localStorage modus): create, read, update, delete voor minstens klanten, projecten, offertes, facturen
- Financiële berekeningen: offerte totalen, factuur bedragen, BTW

---

## Volgorde & Tijdsinschatting

| Fase | Omschrijving | Bestanden geraakt |
|------|-------------|-------------------|
| 1 | Kritieke bugfixes | ~15 bestanden |
| 2 | Form validatie | ~12 bestanden + 1 nieuw |
| 3 | Component decomposition | 3 bestanden → ~19 bestanden |
| 4 | Hardcoded waarden | ~5 bestanden |
| 5 | Error boundaries | ~20 bestanden + 2 nieuwe |
| 6 | Code consistentie | ~10 bestanden |
| 7 | Basis tests | ~8 nieuwe test bestanden |

## Regels

- GEEN functionele wijzigingen — als iets werkt, blijft het werken
- GEEN nieuwe features — alleen bestaande code verbeteren
- Elke fase apart committen zodat je kunt terugdraaien
- `npm run build` moet slagen na elke fase (voor zover testbaar)
