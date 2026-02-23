# CLAUDE.md — Sign Company Workmate App

## Communication

- Always respond in **Dutch** unless code/comments require English
- Keep output concise and structured — no walls of text
- Use tables or short bullet points for overviews and comparisons

## Workflow Orchestration

### 1. Plan Node Default

- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately — don't keep pushing
- Use plan mode for verification steps, not just building
- Write detailed specs upfront to reduce ambiguity

### 2. Subagent Strategy

- Use subagents liberally to keep main context window clean
- Offload research, exploration, and parallel analysis to subagents
- For complex problems, throw more compute at it via subagents
- One task per subagent for focused execution

### 3. Self-Improvement Loop

- After ANY correction from the user: update `tasks/lessons.md` with the pattern
- Write rules for yourself that prevent the same mistake
- Ruthlessly iterate on these lessons until mistake rate drops
- Review lessons at session start for relevant project

### 4. Verification Before Done

- Never mark a task complete without proving it works
- Diff behavior between main and your changes when relevant
- Ask yourself: "Would a staff engineer approve this?"
- Run tests, check logs, demonstrate correctness

### 5. Demand Elegance (Balanced)

- For non-trivial changes: pause and ask "is there a more elegant way?"
- If a fix feels hacky: "Knowing everything I know now, implement the elegant solution"
- Skip this for simple, obvious fixes — don't over-engineer
- Challenge your own work before presenting it

### 6. Autonomous Bug Fixing

- When given a bug report: just fix it. Don't ask for hand-holding
- Point at logs, errors, failing tests — then resolve them
- Zero context switching required from the user
- Go fix failing CI tests without being told how

### 7. Respect Boundaries

- When asked to **analyze only**, do NOT make changes. Present findings and wait
- When asked to **not commit**, stage changes but don't commit
- Always confirm destructive actions (deleting files, dropping data, force push)

## Task Management

1. **Plan First:** Write plan to `tasks/todo.md` with checkable items
2. **Verify Plan:** Check in before starting implementation
3. **Track Progress:** Mark items complete as you go
4. **Explain Changes:** High-level summary at each step
5. **Document Results:** Add review section to `tasks/todo.md`
6. **Capture Lessons:** Update `tasks/lessons.md` after corrections

## Core Principles

- **Simplicity First:** Make every change as simple as possible. Impact minimal code
- **No Laziness:** Find root causes. No temporary fixes. Senior developer standards
- **Minimal Impact:** Changes should only touch what's necessary. Avoid introducing bugs
- **Don't Repeat Yourself:** If you see duplication, refactor it
- **Read Before Write:** Always read existing code/files before creating or modifying — understand the current state first

## Project Context

- This is the **Workmate App** for Sign Company (signcompany.nl)
- Check `tasks/todo.md` at session start for current priorities
- Check `tasks/lessons.md` at session start for known patterns and mistakes to avoid
- The app handles quotations/offertes — treat business logic with extra care

---

## Project Overview

**Repository:** sign-company
**Eigenaar:** signcompany.nl
**Status:** Actief - Workmate CRM app + marketingwebsite

Dit project bevat twee applicaties:
1. **Marketing website** (root) - Next.js landingspagina's voor signcompany.nl
2. **Workmate App** (`/workmate/`) - Vite + React CRM/bedrijfsmanagement app

## Repository Structure

```
sign-company/
├── CLAUDE.md              # Dit bestand
├── BLUEPRINT.md           # Uitgebreide Workmate app documentatie
├── package.json           # Next.js website dependencies
├── tasks/
│   ├── todo.md            # Huidige taken en prioriteiten
│   └── lessons.md         # Geleerde lessen en patronen
├── src/                   # Next.js marketing website
│   ├── app/               # App Router pagina's
│   │   ├── werkplaats/    # Interne werkplaats routes
│   │   └── [slug]/        # Dynamische landingspagina's
│   ├── components/        # Website componenten
│   ├── data/              # Landingspagina data
│   └── lib/               # Utilities
└── workmate/              # Vite + React CRM app
    ├── src/
    │   ├── components/    # 143 React componenten (37 subdirectories)
    │   ├── contexts/      # 6 Context Providers
    │   ├── hooks/         # 5 Custom hooks
    │   ├── services/      # Backend services (Supabase)
    │   ├── types/         # TypeScript interfaces
    │   ├── lib/           # Utilities
    │   └── utils/         # Helpers
    ├── supabase/          # Database schema en migrations
    ├── api/               # Serverless API functies
    └── package.json       # Workmate dependencies
```

## Development Setup

### Prerequisites
- Node.js >= 18.x
- npm

### Marketing Website (root)
```bash
npm install
npm run dev          # Next.js dev server
npm run build        # Production build
```

### Workmate App
```bash
cd workmate
npm install
npm run dev          # Vite dev server
npm run build        # tsc + vite build
```

### Environment Variables (workmate/.env)
| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_SUPABASE_URL` | Supabase project URL | Ja (localStorage fallback) |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key | Ja (localStorage fallback) |
| `OPENAI_API_KEY` | OpenAI API key (server-side) | Nee |

## Key Commands

| Command | Directory | Description |
|---------|-----------|-------------|
| `npm run dev` | root | Next.js dev server |
| `npm run dev` | workmate/ | Vite dev server |
| `npm run build` | workmate/ | TypeScript check + production build |
| `npx tsc --noEmit` | workmate/ | TypeScript only check |

## Code Conventions

### Naamgeving
- **Business logica**: Nederlands (klant, offerte, factuur, medewerker)
- **Technische code**: Engels (hooks, utils, services, components)
- **Types**: Nederlands met PascalCase (Klant, Offerte, OfferteItem)

### File Organization
- UI componenten (shadcn/ui): `workmate/src/components/ui/`
- Feature componenten: `workmate/src/components/<feature>/`
- Alle types: `workmate/src/types/index.ts`
- Hoofd service: `workmate/src/services/supabaseService.ts`

### Git Workflow
- Branch naming: `claude/<description>-<session-id>`
- Commit messages in het Engels
- Check `tasks/todo.md` bij sessie start
- Check `tasks/lessons.md` voor bekende patronen

## Tech Stack

### Marketing Website
- Next.js 14, React 18, TypeScript 5, Tailwind CSS 3

### Workmate App
- Vite 5, React 18, TypeScript 5.3, Tailwind CSS 3.4
- shadcn/ui (Radix UI), Lucide React 0.312
- Supabase (auth + database), Zod (validatie)
- jsPDF (PDF generatie), Recharts (grafieken), date-fns, Sonner (toasts)

## Architecture Notes

### Workmate App
- **State**: 6 React Context providers (Auth, Theme, Palette, Language, Sidebar, AppSettings)
- **Data**: Supabase met localStorage fallback (offline support)
- **Routing**: React Router v6 - 49 routes (7 public, 42 protected)
- **Auth**: Supabase Auth met ProtectedRoute wrapper
- **Styling**: Tailwind + 9 kleurpaletten (dynamische CSS variabelen)
- **i18n**: Ingebouwd NL/EN via LanguageContext

### Bekende Beperkingen
- EmailSequence types bestaan maar service functies ontbreken
- Geen test suite (Vitest aanbevolen)

## Session Start Checklist
1. Lees `tasks/todo.md` voor huidige prioriteiten
2. Lees `tasks/lessons.md` voor bekende patronen en fouten
3. Check git status voor ongecommitte wijzigingen
4. Raadpleeg `BLUEPRINT.md` voor gedetailleerde app documentatie
