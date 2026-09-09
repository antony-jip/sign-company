---
version: alpha
name: doen-marketing-site
description: Petrol draagt het merk, flame is het signaal. Tegels wisselen in kleurvlak met de kleurwissel als scheiding, precies een schaduw, pillen voor acties, bodytekst op 17px.
colors:
  primary: "#F15025"
  bg: "#F4F7F7"
  canvas: "#FFFFFF"
  petrol: "#1A535C"
  petrol-light: "#2A6F7A"
  petrol-deep: "#0D343C"
  flame: "#F15025"
  ink: "#16262B"
  muted: "#54666A"
  on-flame: "#FFFFFF"
  on-dark: "#FFFFFF"
  body-on-dark: "#BCCED0"
  footnote-on-dark: "#829BA0"
  footer-link: "#8DA5A9"
  hairline: "#E0E6E7"
typography:
  hero:
    fontFamily: Instrument Sans
    fontSize: 88px
    fontWeight: 700
    lineHeight: 0.97
    letterSpacing: -0.035em
  sectiekop:
    fontFamily: Instrument Sans
    fontSize: 52px
    fontWeight: 700
    lineHeight: 1.0
    letterSpacing: -0.03em
  lead:
    fontFamily: Hanken Grotesk
    fontSize: 21px
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: -0.011em
  body:
    fontFamily: Hanken Grotesk
    fontSize: 17px
    fontWeight: 400
    lineHeight: 1.47
    letterSpacing: -0.011em
  caption:
    fontFamily: Hanken Grotesk
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.43
    letterSpacing: -0.016em
  fijn:
    fontFamily: Hanken Grotesk
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.4
  knoplabel:
    fontFamily: Hanken Grotesk
    fontSize: 16px
    fontWeight: 600
    lineHeight: 1.0
    letterSpacing: -0.011em
rounded:
  none: 0px
  util: 8px
  card: 18px
  pill: 9999px
spacing:
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  tile: 80px
components:
  knop-flame:
    backgroundColor: "{colors.flame}"
    textColor: "{colors.on-flame}"
    typography: "{typography.knoplabel}"
    rounded: "{rounded.pill}"
  knop-wit:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.flame}"
    typography: "{typography.knoplabel}"
    rounded: "{rounded.pill}"
  knop-lijn:
    backgroundColor: "{colors.bg}"
    textColor: "{colors.petrol}"
    typography: "{typography.knoplabel}"
    rounded: "{rounded.pill}"
  knop-lijn-wit:
    backgroundColor: "{colors.petrol-deep}"
    textColor: "{colors.on-dark}"
    typography: "{typography.knoplabel}"
    rounded: "{rounded.pill}"
  tegel-licht:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.none}"
  tegel-tint:
    backgroundColor: "{colors.bg}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.none}"
  tegel-donker:
    backgroundColor: "{colors.petrol-deep}"
    textColor: "{colors.on-dark}"
    typography: "{typography.body}"
    rounded: "{rounded.none}"
  tegel-flame:
    backgroundColor: "{colors.flame}"
    textColor: "{colors.on-flame}"
    typography: "{typography.sectiekop}"
    rounded: "{rounded.none}"
  kaart:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.card}"
  sectiekop-op-licht:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.petrol}"
    typography: "{typography.sectiekop}"
  toelichting-op-tint:
    backgroundColor: "{colors.bg}"
    textColor: "{colors.muted}"
    typography: "{typography.body}"
  toelichting-op-wit:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.muted}"
    typography: "{typography.body}"
  body-op-donker:
    backgroundColor: "{colors.petrol-deep}"
    textColor: "{colors.body-on-dark}"
    typography: "{typography.body}"
  voetnoot-op-donker:
    backgroundColor: "{colors.petrol-deep}"
    textColor: "{colors.footnote-on-dark}"
    typography: "{typography.fijn}"
  footer-link:
    backgroundColor: "{colors.petrol-deep}"
    textColor: "{colors.footer-link}"
    typography: "{typography.body}"
  invoerveld:
    backgroundColor: "{colors.bg}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.util}"
---

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

- Koppen: `font-heading` (Instrument Sans 600/700, hetzelfde kopfont als de app), `letter-spacing: -0.03em` (hero -0.035em), `leading-[0.97..1.08]`, flame-punt als afsluiting: `<span className="text-flame">.</span>`
- Body: `font-sans` (Hanken Grotesk), 15–17px, leading 1.55–1.65, max ~65ch.
- `font-mono` (Spline Sans Mono) ALLEEN binnen de app-demo/mockups voor data (tijden, bedragen). Nooit voor site-labels of CTA's.
- Schaal: hero `clamp(44px,6.4vw,88px)`, sectiekop `clamp(30px,4vw,52px)`, subkop `clamp(24px,3vw,36px)`.
- `textWrap: 'balance'` op grote koppen.

## Sectie-grammatica

- GEEN eyebrow-labels (mono-uppercase + ping-dot) boven secties. Verwijder ze overal. Een kicker mag alleen als het échte content is (bijv. "Stap 3 van 7" boven een stap).
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

- **Inhoud is nooit afhankelijk van een animatie.** Geen scroll-reveals meer op tekst: in een tab die niet tekent vuren `requestAnimationFrame`, IntersectionObserver en zelfs React-hydratie niet, en dan blijft de pagina leeg. Dat is in juli 2026 sitebreed weggehaald.
- De hero-entree draait op CSS-keyframes en hangt aan `html.anim-ready`. Die klasse zet het scriptje in `layout.tsx` alleen als de eerste frame echt gerenderd wordt. Blijft hij weg, dan verbergt `globals.css` niets.
- `AnimatePresence` altijd met `initial={false}`, zodat de eerste render meteen zichtbaar is en alleen latere wissels animeren.
- framer-motion mag nog voor interactie (menu's, tab-wissels, overlays), niet voor het tonen van tekst. Ease `[0.16, 1, 0.3, 1]`, duur 0.5–0.9s.
- Test: haal de pagina op met `curl` en tel `opacity:0` in de HTML. Alles boven nul is een bug.

## Copy

- Nederlands, actief, vaktaal (werkbon, montage, nacalculatie). Geen em-dashes in UI-copy; gebruik punten/komma's, middle dot als separator.
- Eén boodschap staat op precies één plek: modules uitleggen doet /features, rekenen doet /prijzen, de flow van aanvraag tot factuur staat op /hoe-het-werkt, het verhaal op /over, en de onboarding staat op /prijzen#onboarding. Elders alleen de losse regel (`OnboardingRegel`), zoals `EigenGebruikRegel` dat ook doet.
- Officieel e-mailadres: antony@signcompany.nl. `hello@doen.team` bestaat niet meer, zet dat nergens op de site.
- Pay-off: "Slim gedaan." Labels actief formuleren.

## De Apple-laag (september 2026)

Bovenop het bovenstaande ligt sinds september een tweede laag: de structuur en
maatvoering uit Apple's eigen design-systeem, overgenomen uit
`docs/design/apple-DESIGN.md` (de complete bronanalyse staat daar, ongewijzigd).
Wat we overnemen is het vakwerk, niet het merk. Kleur blijft petrol en flame,
de fonts blijven Instrument Sans en Hanken Grotesk. Wat verandert is hoe de
pagina is opgebouwd.

De vier regels, in volgorde van belang:

**1. De kleurwissel is de scheiding.** Een sectie is een tegel: hij draagt zijn
eigen achtergrond over de volle breedte en raakt de tegel eronder. Geen randen,
geen lijnen, geen decoratie ertussen. Gebruik `.tegel` voor het ritme (56px
mobiel, 80px desktop) plus `.tegel-licht`, `.tegel-tint` of `.tegel-donker`.
Twee tegels van dezelfde soort achter elkaar krijgen geen rand maar een
micro-stap in helderheid (`.tegel-donker-2`). Zet nooit meer `py-16 md:py-32`
op een sectie: dat stapelde bodempadding op koppadding en gaf gaten van bijna
een schermhoogte.

**2. Precies één schaduw op de hele site.** `.productbeeld`
(`3px 5px 30px rgba(0,0,0,0.22)`) hoort onder beeld dat op een vlak rust: een
app-mockup, de telefoon, een browserframe, een foto. Kaarten krijgen een
haarlijn en verder niets. Een kaart die zweeft trekt de aandacht naar de kaart,
en wij willen aandacht op wat erin staat. Hiërarchie maak je met een
vlakwissel, niet met diepte.

**3. Alles wat een actie is, is een pil.** `.knop` plus een van
`.knop-flame` (primair), `.knop-wit` (op een flame-vlak), `.knop-lijn` /
`.knop-lijn-wit` (het tweede spoor ernaast). Minstens 44px hoog, want dat is de
kleinste maat die een duim betrouwbaar raakt. De indruk zit in de indrukstand
(`scale(0.95)`), niet in hover-groei. Twee pillen naast elkaar is de vorm
waarin je een tweede keuze aanbiedt: de tekstlink-met-onderstreep uit de vorige
ronde leest naast een vlak knop als een voetnoot in plaats van als een keuze.
Die tekstlink blijft wel bestaan, maar alleen voor een zijpad dat géén keuze
is (zie `Demo.tsx`, "Liever kijken?").

**4. Bodytekst is 17px.** `.tekst-body` (17/1.47/-0.011em), `.tekst-lead`
(19px, 21px op desktop), `.tekst-caption` (14px), `.tekst-fijn` (13px, zonder
tracking, want kleine tekst wordt van tracking alleen maar moeilijker). Die ene
pixel boven 16 is het verschil tussen scannen en lezen. Gebruik geen
`text-[15px]` of `text-[16px]` meer voor lopende tekst.

**Radius-grammatica**, en niets ertussen: `rounded-full` voor pillen, chips en
badges, `rounded-util` (8px) voor compacte werkknoppen en invoervelden,
`rounded-card` (18px) voor kaarten en beeldframes, `0` voor tegels.

**De balk boven** is matglas: 80% dekking met `saturate(180%) blur(20px)`,
zodat de kleur van de sectie eronder erdoorheen schijnt. Gescrold komt hij uit
op 44px.

Wat we bewust NIET overnemen uit Apple's systeem: Action Blue (#0066cc) en de
hele SF Pro-ladder. Eén accentkleur hebben we al, dat is flame, en de fonts
horen bij de app.

## Contrast en de linter

De YAML bovenin dit bestand is niet decoratief: `npm run design:lint` haalt er
`@google/design.md` (de formaatspecificatie van Google Labs, Apache-2.0)
overheen en rekent elk kleurpaar na tegen WCAG AA. Draai hem als je een kleur
of een tekstmaat aanraakt.

Wat de ronde van 9 september 2026 opleverde:

- De voetnootregel in de footer stond op `rgba(226,240,241,0.45)` en haalde
  3,57:1 op petrol-deep. Terug naar 0,55, de bodem die hierboven al beschreven
  stond en die 4,54:1 haalt. Dat was drift, geen keuze.
- De proefregel op de flame-band stond op wit 80% en haalde 2,76:1, onder de
  3:1 die zelfs voor grote tekst geldt. Nu vol wit, 3,55:1. Meer zit er niet in
  zolang flame het vlak is.

Wat blijft staan, en waarom je het moet weten: **wit op flame haalt 3,55:1.**
Dat is genoeg voor grote tekst (de koppen op de flame-band, vanaf 32px bold),
maar niet voor een knoplabel van 15 tot 16px. De primaire knop van de site
haalt WCAG AA dus niet. Hetzelfde geldt omgekeerd voor flame-tekst op wit.

Dat is met de huidige flame niet op te lossen: er bestaat geen witttint die op
`#F15025` 4,5:1 haalt. De enige echte uitweg is een donkerder flame voor
vlakken die tekst dragen. `#D24620` (13% donkerder, zelfde tint) haalt 4,53:1.
Dat is een merkbeslissing, geen technische, en staat daarom open.
