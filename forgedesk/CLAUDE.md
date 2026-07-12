# doen. — Claude Code Project Context

## 1. Stack & werkmap

**Stack:** Vite + React 18 + TypeScript + Tailwind + Shadcn/UI + Supabase + Vercel.
Trigger.dev voor background jobs, Mollie voor payments,
Anthropic Claude voor Daan AI-assistent.

**App-naam:** doen. (lowercase, altijd). AI-assistent heet **Daan**
(nooit Forgie, nooit FORGEdesk).

**Werkmap:** altijd eerst `cd ~/sign-company/forgedesk` voor commands.

**Design-systeem:** lees `.claude/skills/doen-design/SKILL.md` bij elke
visuele wijziging.

## 2. Kritische conventies

### Code-discipline
- `npm run build` na ELKE wijziging. Geen uitzonderingen.
- Fix ALLE TypeScript errors voordat je doorgaat.
- Tests: `npm run test` (vitest watch) of `npm run test:run` (one-shot).
- Geen nieuwe npm packages zonder expliciete toestemming.

### Comments
- Schrijf GEEN overbodige comments. Code moet zelfverklarend zijn door
  goede naamgeving.
- Alleen comments bij: complexe businesslogica, niet-voor-de-hand-liggende
  keuzes, waarom iets zo is (niet wat het doet).
- Verwijder bestaande nutteloze comments als je ze tegenkomt.

### Refactoring & scope
- Refactor NIET tenzij expliciet gevraagd.
- Als je een bug fixt, fix alleen die bug. Geen "even" imports opruimen,
  variabelen hernoemen, of code verplaatsen.
- Als je iets ziet dat beter kan, noem het in je rapport maar wijzig
  het niet.
- Doe wat gevraagd is. Niet meer, niet minder. Als een taak 3 bestanden
  raakt, raak er geen 8 aan.
- Als je merkt dat een wijziging cascade-effecten heeft, stop en
  rapporteer.

### Analyse voor actie
- "Groot" = meer dan 3 bestanden OF meer dan 100 regels wijziging.
- Bij grote taken: analyseer EERST, rapporteer wat je vindt, wacht op
  goedkeuring.
- Bij kleine fixes: direct uitvoeren.

### Data-isolatie
- **`organisatie_id` altijd**, nooit `user_id` voor data-filtering.
- Alle teamleden binnen één organisatie delen data.
- Uitzondering: email-credentials (RLS op `user_id`, persoonlijk).

### Grote bestanden — grep, nooit cat
- `supabaseService.ts` (5700+ regels) — kan Claude Code sessies laten
  crashen bij volledig lezen.
- `types/index.ts` (1700+ regels) — zelfde issue.
- Altijd grep gebruiken voor zoekopdrachten in deze files.

### Vercel serverless
- `api/*` bestanden zijn standalone — GEEN imports uit `src/`.
- Geen helpers in `api/_helpers/` — alles inline in elk API-bestand.

### Naamgeving
- Nederlandse variabelen en functies in de app (klant, offerte,
  factuur, werkbon, medewerker).
- Types en interfaces: PascalCase met Nederlandse namen (Klant, Offerte,
  FactuurItem).
- Bestanden: PascalCase voor componenten, camelCase voor services/utils.

### Git
- Duidelijke commit messages in het **Engels**.
- Eén concern per commit. Niet alles in één grote commit.

## 3. Database conventies

- Alle tabellen hebben `organisatie_id` kolom.
- RLS-policies op `organisatie_id` (zie migrations/048 als referentie-pattern).
- Nieuwe tabellen/kolommen krijgen altijd org-scoped RLS-policy
  (SELECT/INSERT/UPDATE/DELETE elk afgedekt).
- **Migratie-nummering:** check `schema_migrations` voor het eerstvolgende
  vrije nummer voordat je een nieuwe migratie aanmaakt. Het historische
  conflict op 093/094 niet opnieuw gebruiken.
- Migraties idempotent maken: `CREATE TABLE IF NOT EXISTS`,
  `ON CONFLICT DO NOTHING`, etc.
- Migraties worden door Antony zelf in de Supabase SQL Editor gedraaid.

## 4. UI patterns (sinds Taken-module refactor, april 2026)

- **Sticky top action-bar:** `#1A535C` teal achtergrond
  (Clients/Quotes/Facturen).
- **Searchable combobox:** `components/shared/MedewerkerFilterCombobox`.
- **Admin-detectie:** `utils/authHelpers.ts :: isAdminUser(medewerker, user)`.
- **localStorage-keys:** `doen_<module>_<feature>`.
- **Migration-markers voor breaking defaults:** `doen_<module>_migration_v<N>`.
- **Swimlane-view** met collapse-state in localStorage.
- **Delete-buffer:** 5s undo via sonner toast, flush on unmount.

## 5. Productfilosofie

doen. is **radicaal transparant** binnen één organisatie. Iedereen ziet
en plant iedereen's taken, klanten, projecten. RBAC komt pas bij externe
freelancers of gevoelige cross-org scenarios.

## 6. Brand

- **Kleuren:** Flame `#F15025` (accent), Petrol `#1A535C` (dominant).
- **Geen emojis in UI.**
- **"doen."** lowercase bold + Flame dot signature.
- **Status-woorden** eindigen op Flame dot: verstuurd. betaald. gedaan.

## 7. Agent-workflow

Vier agents met verschillende cadans:

- **`@Planner`** — **feature-niveau**: maakt plan voor complexe features,
  analyseert codebase, stelt 3-5 gerichte vragen, wacht op akkoord van
  Antony. Schrijft geen code.
- **`@dev`** — **implementatie**: voert goedgekeurd plan uit, één commit
  per concern, `npm run build` na elke commit. Schrijft code.
- **`@senior-backend-reviewer`** — **per commit**: leest `git show HEAD`,
  geeft GATE-REVIEW (AKKOORD / BLOKKADE / AKKOORD-MET-OPMERKINGEN). Zie
  sectie 8 voor de mechaniek.
- **`@QAA`** — **per fase**: review tegen acceptatiecriteria, ✅/⚠️/❌
  per item, regressie-check, pattern-consistentie.

**Standaard-flow voor complexe features:**
`@Planner` → plan → akkoord van Antony → `@dev` → per commit
`@senior-backend-reviewer` → einde fase `@QAA` + `@senior-backend-reviewer`
(eindoordeel) → gate-update naar Antony.

Zie `LOG.md` voor recente beslissingen per module.

## 8. Review-loop (verplicht na elke commit op feature-branches)

Na elke commit op een feature-branch, vóórdat naar de volgende stap
overgegaan wordt:

1. Spawn `@senior-backend-reviewer` met instructie:
   "Review de laatste commit op branch <branch-naam>. Lees de diff via
    `git show HEAD`. Lever GATE-REVIEW volgens jouw format."

2. Bij Verdict = BLOKKADE: fix de blokkades, commit als
   `"fix(review): address <topic> from senior review"`, spawn reviewer
   opnieuw. Herhaal tot AKKOORD of AKKOORD-MET-OPMERKINGEN.

3. Bij Verdict = AKKOORD-MET-OPMERKINGEN: log opmerkingen in
   `REVIEW_NOTES.md`, ga door.

4. Bij Verdict = AKKOORD: ga direct door.

**Aan het einde van elke FASE** (voor de gate naar Antony):

1. Spawn `@QAA` voor review tegen acceptatiecriteria (✅/⚠️/❌ per item,
   regressie-check, pattern-consistentie).
2. Spawn `@senior-backend-reviewer` één keer extra met instructie
   "review de hele fase, niet alleen de laatste commit".
3. Rapporteer aan Antony: gate-update + reviewer's eindoordeel +
   QAA-checklist + eventuele opmerkingen-lijst.

Antony ziet dus per gate: status + reviewer-verdict + QAA-checklist +
opmerkingen. Hij hoeft de diff niet zelf te lezen.

## 9. Niet aanraken zonder reden

- `src/components/planning/MontagePlanningLayout.tsx` week/maand D&D-logica.
- `supabaseService.ts` splitsen (5700 regels, blijft zoals het is).
- Root Next.js marketing site (altijd in `forgedesk/` werken, niet in root).
