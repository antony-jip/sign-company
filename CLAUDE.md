# CLAUDE.md

## Project

Sign Company – Next.js 14 website voor een signing/reclame bedrijf (sinds 1983). Daarnaast bevat de repo **FORGEdesk**, een Vite+React SaaS app voor interne bedrijfsvoering (offertes, werkbonnen, projecten).

## Repo structuur

```
sign-company/
├── src/                  # Next.js website
│   ├── app/              # App router (pages, layout, routes)
│   ├── components/       # React components
│   ├── data/             # Statische data
│   ├── hooks/            # Custom React hooks
│   ├── lib/              # Utilities
│   ├── services/         # API/service layer
│   └── types/            # TypeScript types
├── forgedesk/            # FORGEdesk SaaS app (Vite + React + Supabase)
│   ├── src/              # App source
│   ├── supabase/         # Supabase config/migrations
│   └── api/              # API routes
├── tailwind.config.ts    # Tailwind config (website)
└── next.config.js        # Next.js config
```

## Commands

```bash
# Website (Next.js)
npm run dev          # Dev server
npm run build        # Production build
npm run lint         # ESLint

# FORGEdesk (in forgedesk/)
cd forgedesk
npm run dev          # Vite dev server
npm run build        # Production build
```

## Tech stack

- **Website:** Next.js 14, React 18, TypeScript, Tailwind CSS
- **FORGEdesk:** Vite, React, TypeScript, Tailwind CSS, Supabase (auth + database)

## Conventions

- Nederlands voor UI teksten en commit messages (mag ook Engels)
- Tailwind voor styling, geen CSS modules
- Components in `src/components/`, gegroepeerd per feature
- TypeScript strict mode
