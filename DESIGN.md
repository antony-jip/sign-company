# DESIGN.md — doen. marketing-site

Visueel systeem sinds de redesign van juli 2026. Geldt voor `src/` (marketing-site), niet voor `forgedesk/`.
Canonieke voorbeelden: `src/components/home/*` (Hero, Demo, Statement, Modules, PricingSection, FaqSection, CTASection), `src/components/Navbar.tsx`, `src/components/Footer.tsx`.

## Richting

"Petrol draagt het merk." Diepe petrol-vlakken dragen hero, prijs en afsluiters; secties wisselen in kleurvlak (petrol-deep / wit / bg) in plaats van decoratie. Flame is een signaal, geen behang: primaire CTA en de flame-punt in koppen. Kortbondig is de luxe: weinig secties, weinig woorden, veel lucht.

## Kleur (Tailwind-tokens)

| Token | Waarde | Gebruik |
|---|---|---|
| `bg` | `#F4F7F7` | body-achtergrond, koel petrol-getint |
| `white` | `#FFFFFF` | afwisselende secties, kaarten |
| `petrol` | `#1A535C` | koppen op licht, accenten |
| `petrol-deep` | `#0D343C` | donkere secties (hero, prijs, footer) |
| `petrol-light` | `#2A6F7A` | lichtval-gradients op petrol-deep |
| `flame` | `#F15025` | primaire CTA, flame-punt, plus-iconen |
| `ink` | `#16262B` | bodytekst op licht |
| `muted` | `#54666A` | secundaire tekst op licht (min. 15px) |

Tekst op petrol-deep: wit voor koppen/links, `rgba(226,240,241,0.82)` voor body, `rgba(226,240,241,0.55)` voor voetnoten (alleen ≥13px).
Op petrol-deep mag maximaal één zachte radial-lichtval (`petrol-light`, opacity ≤0.55, blur via gradient). Geen blobs op lichte secties.

## Typografie

- Koppen: `font-heading` (Bricolage Grotesque 700/800), `letter-spacing: -0.03em` (hero -0.035em), `leading-[0.97..1.08]`, flame-punt als afsluiting: `<span className="text-flame">.</span>`
- Body: `font-sans` (Hanken Grotesk), 15–17px, leading 1.55–1.65, max ~65ch.
- `font-mono` (Spline Sans Mono) ALLEEN binnen de app-demo/mockups voor data (tijden, bedragen). Nooit voor site-labels of CTA's.
- Schaal: hero `clamp(44px,6.4vw,88px)`, sectiekop `clamp(30px,4vw,52px)`, subkop `clamp(24px,3vw,36px)`.
- `textWrap: 'balance'` op grote koppen.

## Sectie-grammatica

- GEEN eyebrow-labels (mono-uppercase + ping-dot) boven secties. Verwijder ze overal. Een kicker mag alleen als het échte content is (bijv. "08:15 · maandagochtend" in de werkdag-story).
- Sectiekop links, korte toelichting (max 2 zinnen, `text-muted`) rechts ernaast of eronder. Zie `Modules.tsx`/`Demo.tsx`.
- Ritme: mobiel compact, desktop ruim: `py-14` of `py-16` als base, `md:py-24`/`md:py-32` op desktop. Hero-toppadding: `pt-28` base, `md:pt-44`/`md:pt-48` op desktop. Containers via `.container-site` (1200px).
- Lijsten: hairline-rijen (`border-petrol/10`), geen icon-kaart-grids. Kaarten alleen als het echt de beste vorm is; nooit geneste kaarten, nooit zijstreep-borders.
- Verwijder decoratie: dot-grids, `paper-grid`, blur-blobs, `ScrollProgress`, `PageBackdrop`, `FlameStamp`, `TrimCorners`, ConstellationBackground.

## Knoppen & links

- Primair: flame-vlak, sentence-case semibold 15px wit, `h-[54px] px-7 rounded-[6px]`, pijl (`ArrowRight` 16px) die 2px meeschuift op hover, `hover:scale-[1.02]`. Geen mono-uppercase knoppen.
- Secundair: tekstlink semibold met onderstreep-lijntje dat op hover wegschuift + `→` die meeschuift (zie Hero).
- Op flame-achtergrond: witte knop met flame-tekst.
- Proof-regels met middle dots: `30 dagen gratis · geen creditcard · maandelijks opzegbaar`.

## Motion

- framer-motion, ease `[0.16, 1, 0.3, 1]`, duur 0.5–0.9s, `useInView({ once: true })`.
- Elke reveal past bij wat hij onthult (regels rijzen uit een mask in de hero; rijen staggeren in een lijst). Niet dezelfde fade-up op elke sectie plakken.
- `useReducedMotion` overal: bij reduce direct zichtbaar (`initial={false}` of geen variants).
- Content mag nooit onzichtbaar blijven als de animatie niet afspeelt.

## Copy

- Nederlands, actief, vaktaal (werkbon, montage, nacalculatie). Geen em-dashes in UI-copy; gebruik punten/komma's, middle dot als separator.
- Eén boodschap staat op precies één plek: modules uitleggen doet /features, rekenen doet /prijzen, de werkdag-story staat op /hoe-het-werkt, het verhaal op /over.
- Officieel e-mailadres: hello@doen.team.
- Pay-off: "Slim gedaan." Labels actief formuleren.
