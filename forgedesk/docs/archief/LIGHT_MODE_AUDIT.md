# Light Mode Audit — doen.

**Datum:** 10 juni 2026
**Scope:** de light weergave van de hele app — lay-out, kleurgebruik, animaties, component-consistentie, contrast/leesbaarheid en dagelijkse-gebruik-UX.
**Methode:** 35 parallelle audit-agents over 6 dimensies + gap-analyse. Elke bevinding van ernst *middel* of *hoog* is door een aparte agent adversarieel geverifieerd tegen de code (tellingen gereproduceerd, file:line gecontroleerd). 3 bevindingen sneuvelden bij verificatie en zijn weggelaten; 49 bevindingen zijn bevestigd.

---

## Oordeel in één alinea

Het fundament van doen. is opvallend goed: een doordacht warm HSL-tokensysteem, een volwassen animatie-basis met reduced-motion-clamp, één consistent lijstpagina-patroon, cache-first loading met skeletons, en voorbeeldige micro-UX op het dashboard (5s-undo, focus-visible). **Het probleem is niet het ontwerp maar de adoptie ervan:** vrijwel elke zwakte komt neer op "het goede systeem bestaat al, maar wordt omzeild". 4.320 hardcoded hexes naast de tokens, 1.080 inline buttons naast ui/button, 2.400+ arbitrary font-sizes naast de type-scale, 16 icon-strokeWidths, drie status-systemen die elkaar tegenspreken. De weg naar "strakker" is dus geen redesign maar een reeks grotendeels mechanische consolidaties — laag risico, hoge zichtbare winst.

---

## De rode draad: vijf systemen die bestaan maar niet gebruikt worden

| Systeem | Bestaat in | Werkelijkheid |
|---|---|---|
| Kleurtokens (petrol, flame, mod-*) | `tailwind.config.js:81-97`, `index.css:17-195` | 4.320 hardcoded hexes in 223/309 component-files; `#1A535C` 1.251× hardcoded vs 232× als token |
| Type-scale (text-tiny/caption/body/headline) | `tailwind.config.js:22-32` ("Migration in Fase 3") | 0–2 gebruikers per token; 2.400+ `text-[Npx]` incl. 49 half-pixel-maten (13.5px e.d.) |
| Radius-tokens (`rounded-card` 16px) | `tailwind.config.js:185` ("Migration in Fase 2") | Dashboard 14px, lijstpagina's 18px, token 0× gebruikt |
| Duration/easing-tokens | `index.css:80-84,188-189` | duration-150/200/300/500 door elkaar; 4+ inline cubic-beziers |
| Centrale componenten (Button, StatusBadge, dropdown-menu, EmptyState) | `src/components/ui/` | 1.080 inline buttons, 13 lokale STATUS_CONFIG's, 16 handgerolde dropdowns, 40+ ad-hoc empty states |

De geplande "Fase 2/3"-migraties uit de eigen config-comments zijn nooit uitgevoerd. Dit rapport is in feite de boodschappenlijst voor die migraties.

---

## Top 7 — grootste impact op het dagelijkse gevoel

1. **Statuskleuren spreken elkaar tegen** (hoog) — drie centrale systemen (`utils/statusColors.ts`, `shared/StatusBadge.tsx`, `ui/badge.tsx`) + 13 lokale STATUS_CONFIG's. "Verzonden" is oranje in de facturenlijst maar blauw in de factuureditor; "betaald" bestaat in vijf verschillende groenen. Statuskleur is hét scansignaal van de dag — dit ondermijnt het direct. → Eén bron van waarheid kiezen (StatusBadge ligt voor de hand), eerst de directe tegenstrijdigheden fixen.
2. **Leestekst onder de leesgrens** (hoog) — 182× `text-muted-foreground/60` (~2,3:1) en 55× `/50` (~2,0:1) op echte leestekst: gewogen dealbedragen op 10px (`DealsLayout.tsx:321`), factuurkolomkoppen op 11px met `#1A4A52]/55` (~2,9:1). En de **publieke offertepagina** — het visitekaartje richting klanten — gebruikt `text-gray-400` (~2,5:1) voor labels, tabelkop en voorwaarden (`OffertePubliekPagina.tsx:607-814`). → Regel: opacity-modifiers alleen voor decoratie; klantpagina naar gray-500.
3. **Hardcoded brand-hexes** (hoog) — zie tabel hierboven. Mechanische codemod `[#1A535C]`→`petrol` etc., file-voor-file beginnend bij MontagePlanningLayout (188), TasksLayout (134), QuotesPipeline (92), ProjectsList (91), ProjectDetail (90), EmailLayout (75). Visueel identiek resultaat, dus laag risico. NB: CLAUDE.md §4 schrijft de hex zelf voor als patroon — die conventie meteen bijwerken naar het token.
4. **Dashboard-padding wijkt af** (hoog) — dashboard heeft 64px gutters waar lijstpagina's 40px hebben (`FORGEdeskDashboard.tsx:201` stapelt eigen padding op AppLayout-padding zonder de negative-margin-correctie). Elke navigatie dashboard→module laat de content 24px verspringen. Bovendien matcht de negative-margin-hack van de lijstpagina's (`-m-3 sm:-m-4 md:-m-6`) de AppLayout-padding (`p-4 md:p-8`) niet: 4–8px residu. → Routes opnemen in de isFullBleed/owns-padding-lijst in `AppLayout.tsx:42`; geen rekensom met negative margins meer.
5. **Knoppen zijn geen familie** (hoog) — 1.080 inline `<button>`'s vs 127 Button-imports; de primaire teal-knop is 178× herbouwd met **negen** verschillende hover-tinten (#0F3D44, #16444c, #16454D, #143F46…). → `primary-flat`-variant toevoegen aan ui/button die matcht met wat features bouwen, één hover-token, daarna per module migreren.
6. **Dubbele entree-animatie op klantprofiel** (middel) — skeleton én content krijgen beide `animate-fade-in-up` (`ClientProfile.tsx:1870` en `:528`): elke klant-open schuift twee keer. Plus stagger-delays tot 600ms+ in Kennisbank/Changelog, en framer-motion negeert `prefers-reduced-motion` (fix: één `<MotionConfig reducedMotion="user">` om de app-root).
7. **MobileBottomNav is een spook** (middel) — nergens gerenderd, maar FAB's en camera-knop reserveren er 56px voor (`TasksLayout.tsx:1912`, `ProjectDetail.tsx:1291`): op mobiel hangen die knoppen 56px te hoog. Buitendienst raakt dit dagelijks. → Bestand verwijderen en offsets corrigeren (of de nav echt mounten).

---

## Bevindingen per dimensie

### 1. Kleursysteem (6 bevindingen)

*Sterk: het HSL-variabelensysteem met warme off-whites, semantische tokens die écht gebruikt worden (muted 3.747×, muted-foreground 3.138×), beperkte grijswildgroei in de hoofd-app.*

| # | Ernst | Bevinding | Kern |
|---|---|---|---|
| 1.1 | hoog | 4.320 hardcoded hexes in 223 files | Zie Top 7 #3 |
| 1.2 | middel | Ongetokeniseerde tussentinten | `#1A4A52` 103× (geen token; `--color-petrol-dark` is een ándere tint, 4× gebruikt); grijzen #9B9B95/#6B6B66/#5A5A55/#A0A098 hardcoded naast amper gebruikte tokens. Bonus: `index.css:414-416` forceert h1–h4 op #1A4A52 en overrulet zelfs `text-black` — utilities "liegen" daar |
| 1.3 | middel | Zelfde kleur op 3–4 plekken gedefinieerd | flame-pastel bestaat als flame.light/.text + mod-offertes + --prio-kritiek-bg + --status-flame-bg; 8–10 componenten met eigen statuskleur-objecten; `--prio-*`-vars 0× via var() aangeroepen |
| 1.4 | middel | Drie verschillende pagina-achtergronden | token `#F8F7F5` (`index.css:23`), body-hardcode `#F5F4F1` (`index.css:392` overschrijft het eigen `@apply bg-background`), PaletteContext-preview `#F4F3F0`, plus ongebruikt `bg-page` #FAFAF8. Panelen met `bg-background` "zweven" in een nét andere tint dan de body |
| 1.5 | middel | Twee parallelle theme-systemen | ThemeContext-stub forceert light en levert noop-toggle (`ThemeContext.tsx:14-20`) terwijl PaletteContext echt light/dark beheert; beide sleutelen aan documentElement. ACCENT_PALETTES: 6 paletten gedefinieerd, setAccentId is no-op — dode configuratie |
| 1.6 | laag | Koele grijzen op publieke/auth-pagina's | 120 van 129 `gray-*` zit in portaal/offerte-pagina's, `neutral-*` in auth — koele grijzen in een bewust wárm systeem. Juist de pagina's die de klant ziet |

### 2. Lay-out & frame (9 bevindingen)

*Sterk: echt design-systeem (.doen-panel/.doen-toolbar/.doen-stat-tile), één herkenbaar lijstpagina-patroon, doordacht full-bleed-concept, samenhangende light chrome.*

| # | Ernst | Bevinding | Kern |
|---|---|---|---|
| 2.1 | hoog | Dashboard dubbele padding | Zie Top 7 #4 |
| 2.2 | middel | Negative-margin-hack matcht niet | 4–8px residu, gutter springt onlogisch per breakpoint (20→16→40px); zes pagina's moeten synchroon blijven met AppLayout |
| 2.3 | middel | Facturen-skeleton mist wrapper | Skeleton op andere positie dan content (`FacturenLayout.tsx:1428` vs `:1445`); Projecten en Werkbonnen doen het wél goed — dat patroon kopiëren |
| 2.4 | middel | Card-radius per pagina | dashboard `rounded-xl` 14px, Projecten `rounded-2xl` 18px, token `rounded-card` 16px ongebruikt → Fase 2-migratie afmaken op de paneel-laag |
| 2.5 | middel | Spook-component MobileBottomNav | Zie Top 7 #7. Plus gruis: ongebruikte `isEmailRoute`, dode `py`-helft in `AppLayout.tsx:113` |
| 2.6 | laag | Popover-radius drie smaken | TopNav/Sidebar 16px, TabBar-contextmenu 12px, Radix via `!important` 13px (`index.css:3214`) → één popover-radius kiezen |
| 2.7 | laag | Hardcoded chroomkleuren + onzichtbare breadcrumb-separator | `bg-[#F8F7F5]` i.p.v. `bg-background` in Header/TabBar; separator `text-[#EBEBEB]` op #F8F7F5 ≈ 1,06:1 — feitelijk onzichtbaar (`Header.tsx:94`) |
| 2.8 | laag | Paginatitel-kleur varieert | 9× `text-foreground`, 2× petrol `#1A4A52` (ProjectsList); QuoteHeader wijkt af in tracking → overweeg gedeeld `<PageTitle>` |
| 2.9 | laag | Sectie-spacing & KPI-grid wijken af | dashboard `space-y-5` vs lijstpagina's `space-y-6`; Projecten-KPI's `grid-cols-1` op mobiel waar Werkbonnen/Facturen `grid-cols-2` doen |

### 3. Animaties (6 bevindingen; 2 claims verworpen bij verificatie)

*Sterk: duration/easing-tokens bestaan, globale reduced-motion-clamp, hover vrijwel altijd via transforms (geen layout shift), framer-motion beperkt tot weinig componenten. Verworpen na verificatie: "oneindig pulserende elementen op dagelijkse schermen" en "4–5 skeleton-systemen" bleken niet houdbaar.*

| # | Ernst | Bevinding | Kern |
|---|---|---|---|
| 3.1 | middel | 453× `transition-all` | Zwaarst: QuotesPipeline/ProjectsList/TasksLayout/ClientsLayout (elk 19–20×). Het juiste patroon (`transition-colors`, 889×) bestaat al → gericht vervangen, 60% van de winst zit in zes lijst-layouts |
| 3.2 | middel | Durations/easings negeren eigen tokens | duration-150 (196×) / 200 (146×) / 300 (51×) / 500 (20×) door elkaar; 4+ inline cubic-beziers → map tokens in tailwind-config, regel: micro 120–150ms, hover 200ms, entree 300–350ms |
| 3.3 | middel | Dubbele fade-up klantprofiel + trage staggers | Zie Top 7 #6 |
| 3.4 | middel | framer-motion + smooth scroll negeren reduced-motion | `<MotionConfig reducedMotion="user">` om de root + `scroll-behavior: auto` in de media query — twee regels, reële toegankelijkheidswinst |
| 3.5 | laag | Nav-pill animeert width via transition-all | `TopNav.tsx:231` → `transition-[transform,width,opacity]` |
| 3.6 | laag | Dode animatie-CSS | wm-welcome-banner-orbs, wm-stagger, orb-float/marquee-keyframes nergens gebruikt → verwijderen |

### 4. Componenten (6 bevindingen; 1 claim verworpen)

*Sterk: volwaardige shadcn-laag, ConfirmDialog overal (nul `window.confirm`), ui/dialog in 60 bestanden. Verworpen: de claim over handgerolde tabel-styling hield geen stand — het lijstpagina-tabelpatroon is juist consistent.*

| # | Ernst | Bevinding | Kern |
|---|---|---|---|
| 4.1 | hoog | Button massaal omzeild | Zie Top 7 #5 |
| 4.2 | hoog | Drie status-systemen + 13 lokale configs | Zie Top 7 #1 |
| 4.3 | middel | Twee modal-systemen | 23 handgerolde overlays met 9 scrim-zwaartes (black/20 t/m black/90), zonder focus-trap/Escape/scroll-lock → scrim standaardiseren op `bg-black/30 backdrop-blur-sm`, daarna opportunistisch migreren |
| 4.4 | middel | Ad-hoc spinners in 103 bestanden | 3+ handgebouwde border-trick-spinners naast Loader2 (269×); Skeleton maar in 17 bestanden → mini `ui/spinner.tsx`; afspraak: page-load = skeleton, inline = spinner. ClientsLayout & FacturenLayout eerst |
| 4.5 | laag | EmptyState onderbenut | 40+ ad-hoc "Geen … gevonden"-teksten in sub-views; component zelf hardcodet ook kleuren → `size="sm"`-variant + tokens |
| 4.6 | laag | 191 raw inputs naast ui/input | Andere border/radius/focus per module; alleen formulier-inputs migreren, inline-edit-cellen alleen tokens uitlijnen |

### 5. Contrast & leesbaarheid (7 bevindingen)

*Sterk: --muted-foreground haalt ~4,7:1 (AA), pastel-badges hebben correcte donkere teksttinten, geen text-white op lichte tinten gevonden, buttons hebben prima focus-ring.*

| # | Ernst | Bevinding | Kern |
|---|---|---|---|
| 5.1 | hoog | `/50–/60`-opacity op leestekst | Zie Top 7 #2 — 237 voorkomens, waarvan veel bedragen/timestamps/sublabels |
| 5.2 | hoog | Publieke offertepagina gray-400 | Zie Top 7 #2 — labels, tabelkop, "incl. BTW", voorwaarden ~2,5:1; kost letterlijk conversie |
| 5.3 | middel | Factuur-kolomkoppen 11px @ ~2,9:1 | `#1A4A52]/55` op drie geldkolommen die je moet kunnen onderscheiden → /80 |
| 5.4 | middel | 10px + /60–/70 opacity | Invoerlabels "Prijs"/"BTW %"/"Korting %" in CalculatieTab — foutloos lezen is hier geld waard → onder 12px nooit een opacity-modifier |
| 5.5 | laag | border-gray-100 op wit ≈ 1,07:1 | Tabelkop-separator publieke offerte feitelijk onzichtbaar → gray-200 |
| 5.6 | laag | Input-focusring 12% opacity | Ring doet visueel niets; borderwissel redt het → opacity naar ~0.28 in input/textarea/select |
| 5.7 | laag | --text-tertiary ~3,9:1, net onder AA | → 25 8% 45%; plus gray-300 status-vinkje op publieke offerte (1,6:1) |

### 6. Dagelijkse-gebruik UX (10 bevindingen)

*Sterk: consequent tabel-patroon met petrol-hover en rechts uitgelijnde mono-bedragen, cache-first loading, voorbeeldige dashboard-micro-UX, één toast-systeem in 131 bestanden, heldere actieve nav-states.*

| # | Ernst | Bevinding | Kern |
|---|---|---|---|
| 6.1 | middel | Native `alert()` in uploadflow + betaalpagina | 7 stuks in QuoteItemsTable + BetaalPagina — blocking dialoog midden in drag&drop; klant ziet dit → `toast.error()` |
| 6.2 | middel | Werkbonnen N+1 sequentiële queries | Items-kolom toont eerst "0" en druppelt vol (`WerkbonnenLayout.tsx:87-99`) → één geaggregeerde count-query; en-dash i.p.v. 0 tijdens laden |
| 6.3 | middel | Taken: actieve filter/view alleen font-weight | "Week/Maand/Team" actief = alleen semibold; comment belooft onderlijn die niet bestaat → Werkbonnen-pill-patroon doortrekken |
| 6.4 | laag | Facturen-skeleton spiegelt pagina niet | Layout-jump bij koude load (hangt samen met 2.3) |
| 6.5 | laag | Hover-only rij-acties zonder focus-fallback | `opacity-0 group-hover:opacity-100` zonder `focus-visible:opacity-100`; het goede patroon bestaat al (`ProjectsList.tsx:1722`) |
| 6.6 | laag | Mobiele zoek-overlay 50px op 56px-balk | 6px sliver van de oude balk blijft zichtbaar → `inset-0` |
| 6.7 | laag | Breadcrumb-separator onzichtbaar | = 2.7 |
| 6.8 | laag | Flame-dot ontbreekt bij quick-action-toasts | Merk-signature inconsistent → `toastDoen()`-helper |
| 6.9 | laag | Delete-UX verschilt per module | Werkbonnen: blocking confirm zonder undo; elders 5s-undo-buffer → CLAUDE.md §4-patroon doortrekken |
| 6.10 | laag | TopNav niet-sticky als default | Pin-functie bestaat maar is onontdekbaar; tabel-headers zijn wél sticky, wat de verwachting wekt → sticky als default overwegen |

### 7. Gap-analyse (5 extra bevindingen)

| # | Ernst | Bevinding | Kern |
|---|---|---|---|
| 7.1 | middel | Type-scale dood, half-pixel-dialect | Zie rode-draad-tabel; 49× half-pixel-maten in chrome en dagelijkse schermen → Fase 3-codemod + lint-regel tegen half-pixels |
| 7.2 | middel | 16 lucide strokeWidth-waarden | Sidebar 1.6, KPI-tiles 1.75, content default 2, checkmarks 2.5 én 3 — zichtbaar verschillend lijngewicht in één view → twee standaarden vastleggen (1.75 chroom, 2 content) |
| 7.3 | middel | Handgerolde dropdowns naast ui/dropdown-menu | 16 bestanden met koude grijze `shadow-lg` waar de rest wárme schaduwen heeft, radius 8–16px, hardcoded borders → `.doen-menu`-utility of consequent ui/dropdown-menu |
| 7.4 | laag | "10 jun." vs "10 jun" + 8 formatCurrency-kopieën | 6 call-sites strippen de punt, 40 niet — beide varianten zelfs binnen QuotesPipeline; 3 valuta-kopieën op klantpagina's → `formatDatumKort()` in lib/utils + kopieën verwijderen |
| 7.5 | laag | Drie scrollbar-stijlen, geen Firefox-styling | 6/8/3px, modals krijgen andere stijl dan de pagina eronder, selector-gat in full-bleed views, Firefox mist de petrol-tint volledig → consolideren + `scrollbar-color` op :root |

---

## Aanbevolen volgorde

**Quick wins (uren, direct zichtbaar):**
1. Contrast-fixes: `/50–/60` → vol token op leestekst, publieke offertepagina gray-400→500, factuurkoppen /55→/80 (5.1–5.4)
2. Dashboard-padding + Facturen-skeleton-wrapper (2.1, 2.3) — het "verspringen" is weg
3. Dubbele fade-up klantprofiel + `<MotionConfig reducedMotion="user">` (3.3, 3.4)
4. `alert()` → toasts, zoek-overlay `inset-0`, breadcrumb-separator, focus-fallback rij-acties (6.1, 6.5–6.7)
5. MobileBottomNav-besluit + FAB-offsets (2.5)

**Consolidatieslagen (per stuk een dagdeel tot dag, mechanisch):**
6. Status-systeem: één bron van waarheid, eerst de tegenstrijdigheden (4.2)
7. Hex→token-codemod, file-voor-file vanaf de top-15 (1.1, 1.2), incl. CLAUDE.md §4 bijwerken
8. Button: `primary-flat`-variant + één hover-token + migratie per module (4.1)
9. `transition-all`-sanering in de zes lijst-layouts + duration-tokens mappen (3.1, 3.2)
10. Negative-margin-hack opheffen via owns-padding-lijst in AppLayout (2.2)

**Structureel (plannen):**
11. Type-scale Fase 3-migratie + half-pixel-lint (7.1)
12. Icon-strokeWidth-standaard (7.2), dropdown-consolidatie (7.3), scrollbars (7.5)
13. Theme-systemen samenvoegen: ThemeContext-stub opruimen (1.5), één canonical achtergrond (1.4)
14. CI-guardrails: grep/lint tegen nieuwe `[#...]`-brandkleuren, half-pixel-sizes en `transition-all`

**Bewust níet aangeraakt:** het lijstpagina-tabelpatroon, het toast-systeem, ConfirmDialog, de dashboard-micro-UX, de overlay-primitives in ui/ en het full-bleed-concept — die zijn goed en vormen juist het ankerpunt waar de rest naartoe moet.
