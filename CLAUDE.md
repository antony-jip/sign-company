# CLAUDE.md - AI Assistant Guide for Sign Company

This document provides essential context for AI assistants working with this codebase.

## Project Overview

**Repository:** sign-company
**Type:** SEO-optimized marketing website
**Framework:** Next.js 14 (App Router)
**Language:** TypeScript
**Status:** Production-ready with 21 SEO landing pages
**Last Updated:** 2025-12-05

Sign Company is a modern, SEO-focused marketing website for a Dutch signage and advertising company established in 1983, based in Enkhuizen. The site showcases services including gevelreclame (facade signage), autobelettering (vehicle lettering), bootstickers, carwrapping, interieur signing, and bewegwijzering (wayfinding).

**Live Domain:** https://signcompany.nl

## Repository Structure

```
sign-company/
├── CLAUDE.md                 # This file - AI assistant guide
├── package.json              # Dependencies and scripts
├── next.config.js            # Next.js configuration
├── tsconfig.json             # TypeScript configuration (strict mode)
├── tailwind.config.ts        # Tailwind CSS theme config
├── postcss.config.js         # PostCSS configuration
├── next-env.d.ts             # Next.js TypeScript declarations
│
└── src/
    ├── app/                  # Next.js App Router
    │   ├── page.tsx          # Home page
    │   ├── layout.tsx        # Root layout with metadata
    │   ├── globals.css       # Global styles
    │   ├── not-found.tsx     # 404 page
    │   ├── robots.ts         # robots.txt generation
    │   ├── sitemap.ts        # XML sitemap generation
    │   └── [slug]/
    │       └── page.tsx      # Dynamic landing pages (21 pages)
    │
    ├── components/           # Reusable React components
    │   ├── Header.tsx        # Navigation with dropdowns (client component)
    │   ├── Hero.tsx          # Hero section with gradient
    │   ├── Services.tsx      # Services grid
    │   ├── USPs.tsx          # Unique selling propositions
    │   ├── Portfolio.tsx     # Portfolio showcase
    │   ├── FAQ.tsx           # Accordion FAQ
    │   ├── CTA.tsx           # Call-to-action sections
    │   ├── Location.tsx      # Location information
    │   ├── Footer.tsx        # Footer with links
    │   ├── LandingPageTemplate.tsx  # Reusable landing page template
    │   └── index.ts          # Barrel exports
    │
    ├── data/
    │   └── landing-pages/    # 21 landing page data files
    │       ├── index.ts      # Collection helpers
    │       ├── bootstickers-enkhuizen.ts
    │       ├── gevelreclame-*.ts
    │       ├── autobelettering-*.ts
    │       ├── signing-*.ts
    │       └── ...
    │
    ├── lib/
    │   └── company-info.ts   # Company metadata & Schema.org generation
    │
    └── types/
        └── landing-page.ts   # TypeScript interfaces
```

## Technology Stack

| Category | Technology | Version |
|----------|------------|---------|
| Framework | Next.js | ^14.0.0 |
| UI Library | React | ^18.2.0 |
| Language | TypeScript | ^5.0.0 |
| Styling | Tailwind CSS | ^3.4.0 |
| CSS Processing | PostCSS | ^8.4.0 |
| Linting | ESLint | ^8.0.0 |

## Development Setup

### Prerequisites

- Node.js >= 18.x
- npm (or yarn/pnpm)

### Installation

```bash
git clone <repository-url>
cd sign-company
npm install
```

### Key Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server (http://localhost:3000) |
| `npm run build` | Production build with static generation |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |

## Architecture

### Routing Strategy

- **Static Site Generation (SSG):** All 21 landing pages are pre-rendered at build time via `generateStaticParams()`
- **Dynamic Routes:** `/[slug]/page.tsx` handles all landing pages
- **Home Page:** `/page.tsx` serves as the main entry

### Component Architecture

- **Server Components:** Default (better performance, SEO)
- **Client Components:** Only `Header.tsx` uses `'use client'` for interactivity
- **Template Pattern:** `LandingPageTemplate.tsx` composes all sections for landing pages

### Data Flow

```
LandingPageData (types) → data files → getLandingPageBySlug() → LandingPageTemplate → Components
```

### SEO Implementation

- **Schema.org:** LocalBusiness, WebPage, FAQPage structured data
- **Sitemap:** Generated in `sitemap.ts` with priority based on phase
- **Robots:** Generated in `robots.ts`
- **Metadata:** Dynamic per-page titles, descriptions, OpenGraph
- **Canonical URLs:** Set for each page

## Landing Page Phases

Landing pages are organized in 3 deployment phases:

| Phase | Focus | Pages |
|-------|-------|-------|
| 1 | Quick Wins (Enkhuizen area) | 6 pages |
| 2 | Nearby Cities | 9 pages |
| 3 | Flevoland & Expansion | 6 pages |

**Service Types:**
- Gevelreclame (facade signage)
- Autobelettering (vehicle lettering)
- Bootstickers/Bootbelettering (boat lettering)
- Carwrapping
- Signing (general signage)
- Bewegwijzering (wayfinding)
- Interieur Signing

## Design System

### Color Palette

```css
/* Primary Colors */
--navy:        #1A3752    /* Headers, important accents */
--black:       #141414    /* Body text, backgrounds */
--off-white:   #F7F4F0    /* Light backgrounds */
--gray-text:   #666666    /* Secondary text */
--gray-tint:   #ECECEC    /* Borders, dividers */

/* Service Colors */
--orange:      #E57324    /* Gevelreclame */
--yellow:      #F0AA04    /* Voertuigreclame */
--pink:        #D83255    /* Event & Promotie */
--teal:        #00BFA5    /* Interieur */
--purple:      #5139E2    /* Special accents */
```

### Typography

**Fonts:**
- **Headings:** Excon (weight 600-900)
- **Body:** Satoshi (weight 400-700)

**Font Sizes (Desktop):**
- H1: 72px, weight 900, letter-spacing: -3.5px
- H2: 64px, weight 900, letter-spacing: -3px
- H3: 42px, weight 700, letter-spacing: -2px
- H4: 32px, weight 700, letter-spacing: -1.5px
- H5: 24px, weight 600, letter-spacing: -1px
- H6: 18px, weight 600, letter-spacing: -0.5px
- Body: 18px, weight 400, line-height: 1.7

### Primary Gradient

```css
background: linear-gradient(135deg, #F0AA04, #E57324);
```

### Tailwind Theme (Current Config)

The `tailwind.config.ts` defines:
- **Primary colors:** Blue scale (50-900)
- **Secondary colors:** Orange/Amber scale (50-900)
- **Fonts:** Inter (body), Poppins (headings)

## Data Interfaces

### LandingPageData

```typescript
interface LandingPageData {
  slug: string;
  phase: 1 | 2 | 3;
  priority: number;

  // SEO
  metaTitle: string;
  metaDescription: string;
  h1: string;
  primaryKeywords: string[];
  secondaryKeywords: string[];

  // Content
  heroIntro: string;
  contentFocus: string[];
  services: Service[];
  usps: USP[];
  portfolio: PortfolioItem[];
  faqs: FAQ[];
  location: LocationInfo;
  relatedPages: RelatedPage[];
}
```

### Company Info

Located in `src/lib/company-info.ts`:
- Company: Sign Company
- Location: Enkhuizen, Noord-Holland
- Founded: 1983
- Domain: signcompany.nl

## Code Conventions

### File Naming

- **Components:** PascalCase (`Header.tsx`, `LandingPageTemplate.tsx`)
- **Data files:** kebab-case (`gevelreclame-enkhuizen.ts`)
- **Utilities:** kebab-case (`company-info.ts`)

### Imports

Use path alias `@/` for absolute imports from `src/`:
```typescript
import { companyInfo } from '@/lib/company-info';
import { LandingPageData } from '@/types/landing-page';
import { Hero, Services, FAQ } from '@/components';
```

### Component Pattern

```typescript
// Server component (default)
export function ComponentName({ prop }: Props) {
  return <div>...</div>;
}

// Client component (only when needed)
'use client';
export function InteractiveComponent() {
  const [state, setState] = useState();
  return <div>...</div>;
}
```

### Adding a New Landing Page

1. Create data file in `src/data/landing-pages/[service]-[location].ts`
2. Export from `src/data/landing-pages/index.ts`
3. Add to `allLandingPages` array in same file
4. Page automatically renders via `[slug]/page.tsx`

## Image Assets

Images are hosted on signcompany.nl WordPress. Common categories:
- Gevelreclame/Lichtreclame
- Voertuigreclame
- WestCord Hotels projects
- Bewegwijzering
- Interieur/Printerieur
- Bootstickers

Image URL pattern:
```
https://signcompany.nl/wp-content/uploads/YYYY/MM/filename.webp
```

## Common AI Assistant Tasks

### When Making Changes

1. **Read first:** Always read relevant files before modifying
2. **Follow patterns:** Match existing code style and structure
3. **Run lint:** Execute `npm run lint` after changes
4. **Test build:** Run `npm run build` to verify SSG works

### When Adding Landing Pages

1. Copy an existing data file as template
2. Update all fields for new location/service
3. Ensure unique slug
4. Add exports to `index.ts`
5. Verify sitemap includes new page

### When Modifying Components

1. Check if component is server or client
2. Preserve accessibility features (skip links, ARIA labels)
3. Maintain responsive design (mobile-first breakpoints)
4. Keep Schema.org structured data intact

### When Updating SEO

1. Maintain Schema.org markup in templates
2. Keep meta descriptions under 160 characters
3. Use targeted keywords in H1 and content
4. Ensure proper heading hierarchy (H1 > H2 > H3)

## Service URLs (Main Website)

```
/gevelreclame          - Facade signage
/voertuigreclame       - Vehicle graphics
/interieur-printerieur - Interior signing
/event-promotie        - Events & promotion
/lichtreclame          - Illuminated signs
/bewegwijzering        - Wayfinding
/freesletters          - Cut letters
/raamfolie             - Window film
/wrappen               - Vehicle wrapping
/boot-stickers         - Boat graphics
```

## Responsive Breakpoints

| Breakpoint | Width |
|------------|-------|
| Mobile | 320px - 480px |
| Tablet | 481px - 768px |
| Small Desktop | 769px - 968px |
| Desktop | 969px - 1200px |
| Large Desktop | 1201px+ |

## Testing

**Current Status:** No test framework configured

**Recommended setup:**
- Jest + React Testing Library
- Test components and data utilities

## Troubleshooting

### Build fails with type errors
```bash
npm run lint  # Check for issues
npx tsc --noEmit  # Type check only
```

### Landing page not rendering
1. Verify slug exists in `allLandingPages` array
2. Check data file exports correctly
3. Ensure `generateStaticParams()` includes slug

### Images not loading
- Check image URL is correct and accessible
- Verify domain is in `next.config.js` image domains

## Git Workflow

- **Branch naming:** `feature/<description>`, `fix/<description>`, `claude/<session-id>`
- **Commits:** Descriptive messages explaining "why" not "what"
- **Atomic commits:** One logical change per commit

---

## Maintenance Notes

Update this CLAUDE.md when:
- New landing pages are added
- Components are created or modified
- Design system changes
- Dependencies are updated
- Architecture evolves

**Company Contact:**
- Email: info@signcompany.nl
- Phone: +31 (0)228 123 456
- Location: Enkhuizen, Netherlands
