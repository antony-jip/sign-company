# doen. — Claude Code Project Context

## Stack
Vite + React 18 + TypeScript + Tailwind + Shadcn/UI + Supabase + Vercel
Trigger.dev voor background jobs, Mollie + Stripe voor payments, 
Anthropic Claude voor Daan AI-assistent.

## Werkmap
Altijd eerst `cd ~/sign-company/forgedesk` voor commands.

## Kritische regels
- **organisatie_id altijd**, nooit user_id voor data-filtering
- **Grep op grote files**: supabaseService.ts (5700+ regels) en 
  types/index.ts (1700+ regels) — NOOIT cat
- **Nederlands in code**: klant, offerte, werkbon, medewerker
- **Engels in commit messages**, één concern per commit
- **npm run build** na elke code-wijziging — verplicht
- **Tests draaien met `npm run test`** (vitest, watch-mode) of `npm run test:run` (one-shot)
- **Geen nieuwe npm packages** zonder expliciete toestemming
- **Geen unsolicited refactoring** — blijf binnen scope
- **Vercel serverless functions zijn standalone** — geen imports uit src/
- **Geen helpers in api/_helpers/** — alles inline in elk API-bestand, ook binnen api/ subdirectory geldt deze regel

## Database conventies
- Alle tabellen hebben organisatie_id kolom
- RLS policies op organisatie_id (zie migrations/048)
- Migraties draait Antony zelf in Supabase SQL Editor

## UI Patterns (sinds Taken-module refactor, april 2026)
- Sticky top action-bar: #1A535C teal achtergrond (Clients/Quotes/Facturen)
- Searchable combobox: components/shared/MedewerkerFilterCombobox
- Admin-detectie: utils/authHelpers.ts :: isAdminUser(medewerker, user)
- localStorage-keys: doen_<module>_<feature>
- Migration-markers voor breaking defaults: doen_<module>_migration_v<N>
- Swimlane-view met collapse-state in localStorage
- Delete-buffer: 5s undo via sonner toast, flush on unmount

## Productfilosofie
doen. is **radicaal transparant** binnen één organisatie. Iedereen ziet 
en plant iedereen's taken, klanten, projecten. RBAC komt pas bij externe 
freelancers of gevoelige cross-org scenarios.

## Brand
- Kleuren: Flame #F15025 (accent), Petrol #1A535C (dominant)
- Geen emojis in UI
- "doen." lowercase bold + Flame dot signature
- Status-woorden eindigen op Flame dot: verstuurd. betaald. gedaan.

## Agent-workflow
Voor complexe features: @Planner → plan → akkoord → @dev → commits → 
@QAA → review. Zie LOG.md voor recente beslissingen per module.

## Review-loop (verplicht na elke commit op feature-branches)

Na elke commit op een feature-branch, vóórdat naar de volgende stap 
overgegaan wordt:

1. Spawn `senior-backend-reviewer` subagent met instructie:
   "Review de laatste commit op branch <branch-naam>. Lees de diff via 
    `git show HEAD`. Lever GATE-REVIEW volgens jouw format."

2. Bij Verdict = BLOKKADE: fix de blokkades, commit als 
   `"fix(review): address <topic> from senior review"`, spawn reviewer 
   opnieuw. Herhaal tot AKKOORD of AKKOORD-MET-OPMERKINGEN.

3. Bij Verdict = AKKOORD-MET-OPMERKINGEN: log opmerkingen in 
   REVIEW_NOTES.md, ga door.

4. Bij Verdict = AKKOORD: ga direct door.

Aan het einde van elke FASE (voor de gate naar Antony): spawn de reviewer 
nog één keer met instructie "review de hele fase, niet alleen de laatste 
commit". Rapporteer Antony's gate-update mét reviewer's eindoordeel.

Antony ziet dus per gate: status + reviewer-verdict + eventuele 
opmerkingen-lijst. Hij hoeft de diff niet zelf te lezen.

## Niet aanraken zonder reden
- src/components/planning/MontagePlanningLayout.tsx week/maand D&D logica
- supabaseService.ts splitsen (5700 regels, blijft zoals het is)
- Root Next.js marketing site (altijd in forgedesk/ werken, niet in root)
