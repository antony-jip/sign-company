# CLAUDE.md - AI Assistant Guide for sign-company

## Project Overview

**Repository:** sign-company
**Eigenaar:** signcompany.nl
**Status:** Actief - Workmate CRM app + marketingwebsite
**Last Updated:** 2026-02-23

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
