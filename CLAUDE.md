# CLAUDE.md — Sign Company Repo

## Project

Sign Company – Next.js 14 marketing-website voor een signing/reclame
bedrijf (sinds 1983). De repo bevat ook **doen.**, een Vite + React SaaS
app voor interne bedrijfsvoering in de `forgedesk/` subfolder.

> **Werk je aan de doen.-app?** Lees `forgedesk/CLAUDE.md` — dat is de
> canonieke bron voor app-conventies, agent-workflow en review-loop.
> Dit document gaat alleen over de marketing-website.

## Repo structuur

```
sign-company/
├── src/                  # Next.js marketing-website
│   ├── app/              # App router (pages, layout, routes)
│   ├── components/       # React components
│   ├── data/             # Statische data
│   ├── hooks/            # Custom React hooks
│   ├── lib/              # Utilities
│   ├── services/         # API/service layer
│   └── types/            # TypeScript types
├── forgedesk/            # doen. SaaS app (Vite + React + Supabase)
├── tailwind.config.ts    # Tailwind config (website)
└── next.config.js        # Next.js config
```

## Commands (marketing-website)

```bash
npm run dev          # Dev server
npm run build        # Production build
npm run lint         # ESLint
```

Voor doen.-app commands: zie `forgedesk/CLAUDE.md`.

## Tech stack (marketing-website)

Next.js 14, React 18, TypeScript, Tailwind CSS.

## Conventies (marketing-website)

- Nederlands voor UI teksten; commit messages mogen NL of EN.
- Tailwind voor styling, geen CSS modules.
- Components in `src/components/`, gegroepeerd per feature.
- TypeScript strict mode.
