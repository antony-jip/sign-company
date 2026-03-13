# FORGEdesk Website Styleguide
## Voor Claude Code implementatie in Next.js

---

## 0. Scope & context

**Dit document gaat ALLEEN over de marketingsite op forgedesk.io.**

Dit is NIET de app-styleguide. De FORGEdesk app (app.forgedesk.io) draait op Vite + React in de `/forgedesk` map en heeft een eigen design system. Deze styleguide heeft daar niks mee te maken. Niet mixen.

**Technisch:**
- Next.js project in de root van `sign-company/` (met `src/app/`, `src/components/`)
- De Vite app staat apart in `sign-company/forgedesk/`
- Madellin font bestanden staan in `public/fonts/`

**Taal:** De hele site is Nederlands. Geen Engelse termen in UI-teksten behalve "AI" en "PDF". Geen "Get started", geen "Learn more" — altijd Nederlands.

**Pagina's:** Op dit moment is er alleen een homepage (one-page). Toekomstige pagina's (/pricing, /features, /over-ons) volgen dezelfde styleguide.

**Links:**
- "Start gratis" / "Start 30 dagen gratis" → linkt naar de sign-up flow op app.forgedesk.io (of een /aanmelden route)
- "Inloggen" → app.forgedesk.io/login
- "Bekijk hoe het werkt" → scroll anchor naar de stappen-sectie (#stappen)

**Visuele referenties:**
- onliftoff.com — gradient mesh achtergronden, warme tonen, vloeiende lijn door stappen, grote typografie, veel ademruimte
- firmus.co — premium gevoel, strakke spacing, donkere contrasten op strategische momenten

---

## 1. Design filosofie

**"Stoer maar vriendelijk"** — bold typografie op warme pastel gradients. De site voelt als een ambachtelijke werkplaats waar licht door grote ramen valt. Niet corporate, niet speels — vakmanschap.

**Kernprincipes:**
- Gradient mesh achtergronden doen het zware werk — geen decoratie nodig
- Veel lucht. Secties ademen met 140-180px padding
- Eén visueel idee per sectie, niet drie
- De flow offerte→werkbon→factuur is het verhaal. De site vertelt dat verhaal visueel
- Info is punchy: korte headings, korte beschrijvingen. Niet meer dan 2-3 zinnen per blok
- Madellin font voor headings = de identiteit. Alles andere wijkt

---

## 2. Look & Feel — het gevoel

### Wie is de gebruiker?

Een eigenaar van een signbedrijf, 35-55 jaar. Of z'n kantoormanager. Of een monteur in een busje. Ze hebben geen tijd, geen geduld, en geen interesse in software. Ze willen werken, niet klikken. Ze vergelijken je onbewust met hun bank-app en met de gereedschap-webshops die ze kennen. Als het er goedkoop uitziet, vertrouwen ze het niet. Als het er te corporate uitziet, voelen ze zich niet thuis.

### Het gevoel in drie woorden

**Vertrouwd. Vakkundig. Snel.**

Niet "leuk" of "cool" — dat is voor een ander publiek. Het gevoel is: "deze mensen weten wat ze doen." Zoals een goed gereedschapsmerk: kwaliteit die je voelt zonder dat iemand het hoeft uit te leggen.

### Hoe bereik je dat gevoel?

**Gewicht en rust.**
De Madellin heading is zwaar. Dat geeft autoriteit. Maar het staat op een lichte, warme achtergrond met veel lucht. Dat geeft rust. Die combinatie — zwaar op licht — zegt: "wij zijn stevig, maar niet overweldigend." Elke sectie heeft maar één ding te zeggen. Geen drie kolommen met features, geen bullet lists, geen "en ook nog dit!". Eén boodschap, goed gezegd, klaar. De gebruiker mag ademen.

**Warmte, geen koelte.**
De pastel gradients zijn warm — blush, peach, sage. Geen blauw-grijs corporate gevoel. De achtergrond (#FAFAF7) is niet wit maar crème, alsof het papier een beetje vergeeld is van de zon. De site voelt niet als een tech-product maar als een werkplaats met grote ramen en natuurlijk licht. Dat maakt het toegankelijk voor mensen die niet in tech zitten.

**Beweging die richting geeft.**
De word-by-word reveal op de hero heading geeft tempo: elk woord komt met overtuiging binnen. De vloeiende lijn door de stappen-sectie vertelt een verhaal zonder woorden: je materiaal (offerte) gaat erin, wordt bewerkt (werkbon), en komt er klaar uit (factuur betaald). De kleur van die lijn verandert van warm (ember) naar koel (sage) — van heet naar afgekoeld, van onaf naar klaar. Die lijn is geen decoratie, het is de belofte: "wij brengen je van A naar B."

**Contrast op de juiste momenten.**
De pagina is overwegend licht en zacht. Maar de CTA-buttons zijn hard zwart op die zachte achtergrond. Dat contrast zegt: "dit is serieus." Het woord "Smeed" gloeit in ember terwijl de rest van de heading zwart is. Dat zegt: "dit woord is belangrijk." Gebruik contrast spaarzaam — als alles opvalt, valt niets op.

### Interactie-principes

**Hovers zijn subtiel, niet spectaculair.**
Buttons bewegen 2px omhoog met een zachte shadow. Cards liften 4px. Geen kleurveranderingen, geen schaalvergroting, geen flitsen. De gebruiker moet het gevoel hebben dat de interface reageert, niet dat het optreedt.

**Animaties vertellen, entertainen niet.**
Elke animatie heeft een reden: de heading reveal bouwt spanning op, de lijn tekent de flow, de scroll reveals geven ritme aan het lezen. Er zijn geen animaties "omdat het kan." Als een element geen verhaal vertelt door te bewegen, beweegt het niet.

**De pagina scrolt als een verhaal.**
Hero = de belofte (smeed je bedrijf). Screenshot = het bewijs (zo ziet het eruit). Stappen = de uitleg (zo werkt het). CTA = de uitnodiging (klaar om te starten?). Elke sectie bouwt voort op de vorige. De gebruiker hoeft niet te zoeken — de pagina leidt.

**Mobiel voelt niet als een afknipsel.**
Op mobiel verdwijnt de SVG lijn en worden de stappen verticaal. Maar het gevoel blijft: grote headings, zachte achtergronden, veel lucht. De gradient mesh werkt zelfs beter op een klein scherm omdat het het hele scherm vult. Buttons worden full-width — geen kleine pill op een groot touchscreen.

### Wat de site NIET is

- Niet speels of grappig. Geen confetti, geen bouncy animaties, geen casual toon
- Niet minimalistisch-koud. Geen witte achtergrond, geen grijze tekst op wit, geen Helvetica
- Niet feature-heavy. De site verkoopt een gevoel en drie stappen, geen feature-matrix
- Niet tech-forward. Geen dark mode, geen terminal-font, geen "built with React" signalen
- Niet goedkoop. Geen stock foto's, geen bonte kleuren, geen schreeuwerige banners

---

## 3. Kleursysteem

### Primaire paletten

Elke kleurgroep volgt: `light` → `DEFAULT` → `vivid` → `deep`

```
Blush (warm roze/terracotta) — offertes, warmte, CTA
  blush-light:  #F7ECE7   Lichte achtergronden, hover states
  blush:        #F0D9D0   Standaard, secties, cards
  blush-vivid:  #E8A990   Accenten, knoppen, highlights (= "ember")
  blush-deep:   #C49585   Tekst op lichte achtergrond, borders

Sage (groen/natuur) — facturen, succes, betaald
  sage-light:   #E4EBE6   Lichte achtergronden
  sage:         #C8D5CC   Standaard, secties
  sage-vivid:   #7DB88A   Accenten, success states
  sage-deep:    #5A8264   Tekst, iconen

Mist (blauw/grijs) — werkbonnen, planning, neutraal
  mist-light:   #E6EAF0   Lichte achtergronden
  mist:         #CDD5DE   Standaard, secties
  mist-vivid:   #7BA3C4   Links, accenten
  mist-deep:    #5D7A93   Tekst, borders

Cream (warm neutraal/beige) — pricing, achtergronden
  cream-light:  #F6F4EC   Achtergronden, body
  cream:        #EDE8D8   Standaard, secties
  cream-vivid:  #C4B88A   Gouden accenten
  cream-deep:   #9A8E6E   Subtiele tekst, borders

Lavender (paars/zacht) — werkbonnen in bewerking, AI
  lavender-light: #EDE9F3  Lichte achtergronden
  lavender:       #DDD5E8  Standaard, secties
  lavender-vivid: #A48BBF  Accenten, badges
  lavender-deep:  #7B6B8A  Tekst, iconen

Peach (warm oranje/koraal) — warmte-accenten
  peach-light:  #FAE8E0   Lichte achtergronden
  peach:        #F5D5C8   Standaard, secties
  peach-vivid:  #F0A080   Accenten, highlights
  peach-deep:   #D4856B   Tekst, borders
```

### Neutrale kleuren

```
Background:   #FAFAF7   (warm off-white, niet klinisch)
Ink:          #1A1A1A   (warm zwart, niet pure black)
ink-60:       #5A5A55   (body tekst)
ink-40:       #8A8A85   (secundaire tekst, labels)
ink-20:       #C0C0BA   (subtiele elementen)
ink-10:       #E8E8E3   (borders, dividers)
ink-05:       #F2F2ED   (lichtste grijs, hover backgrounds)
```

### Semantische kleur-toewijzing

```
Offerte fase:     ember/blush (heet, nieuw, actief)
Werkbon fase:     lavender/mist (in bewerking, onderweg)
Factuur fase:     sage (klaar, betaald, afgerond)
AI/Forgie:        lavender
Goedgekeurd:      sage-light bg + sage-deep tekst
Verstuurd:        amber (#FEF3C7 bg + #92400E tekst)
Concept:          mist-light bg + mist-deep tekst
Gefactureerd:     lavender-light bg + lavender-deep tekst
```

---

## 4. Typografie

### Font stack

```
Headings:  Donatto (via next/font/local)
           Bestanden: public/fonts/Madellin-Regular.woff, Madellin-Bold.woff
           Fallback: 'Outfit', system-ui, sans-serif

Body:      DM Sans (via next/font/google)
           Weights: 400 (regular), 500 (medium), 700 (bold)

Mono:      DM Mono (via next/font/google)
           Weights: 400, 500
           Gebruik: alle bedragen, codes, nummers (OFF-048, €1.525, F-2026-031)
```

### Font loading in Next.js

```tsx
// app/layout.tsx
import localFont from 'next/font/local'
import { DM_Sans, DM_Mono } from 'next/font/google'

const donatto = localFont({
  src: [
    { path: '../public/fonts/Madellin-Regular.woff', weight: '400', style: 'normal' },
    { path: '../public/fonts/Madellin-Bold.woff', weight: '400', style: 'italic' },
  ],
  variable: '--font-madellin',
  display: 'swap',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-dm-sans',
  display: 'swap',
})

const dmMono = DM_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-dm-mono',
  display: 'swap',
})
```

### Type scale

```
Hero h1:        clamp(44px, 5.8vw, 80px)   font-heading weight-900  tracking: -3px  line-height: 0.95
Section h2:     clamp(32px, 4vw, 52px)      font-heading weight-900  tracking: -2px  line-height: 1.0
Step title:     clamp(26px, 3vw, 36px)       font-heading weight-900  tracking: -1px  line-height: 1.1
Card title:     14px                          font-heading weight-700
Body large:     19px                          font-sans    weight-400  line-height: 1.7  color: ink-60
Body:           16px                          font-sans    weight-400  line-height: 1.7  color: ink-60
Small/labels:   13px                          font-sans    weight-500  color: ink-40
Mono codes:     10-12px                       font-mono    weight-400  color: ink-40
Overline:       12px                          font-mono    weight-500  tracking: 0.06em  uppercase  color: ink-40
```

### "Smeed" — het gloeiende woord

Het woord "Smeed" in de hero heading krijgt een speciale behandeling:
```css
background: linear-gradient(135deg, #C49585, #E8A990, #F4C49A);
-webkit-background-clip: text;
-webkit-text-fill-color: transparent;
filter: drop-shadow(0 2px 20px rgba(232, 169, 144, 0.25));
```
Dit is het enige woord op de hele site dat een gradient + glow krijgt. Gebruik dit nergens anders.

---

## 5. Gradient mesh achtergronden

De signatuur van de site. Grote, zachte, overlappende radial gradients op de achtergrond.

### Hero gradient

```css
background:
  radial-gradient(ellipse at 15% 20%, rgba(221,213,232,0.5) 0%, transparent 50%),   /* lavender linksboven */
  radial-gradient(ellipse at 85% 25%, rgba(232,169,144,0.35) 0%, transparent 45%),  /* ember rechtsboven */
  radial-gradient(ellipse at 50% 80%, rgba(200,213,204,0.4) 0%, transparent 50%),   /* sage onder midden */
  radial-gradient(ellipse at 20% 70%, rgba(205,213,222,0.3) 0%, transparent 45%),   /* mist linksonder */
  radial-gradient(ellipse at 75% 65%, rgba(245,213,200,0.3) 0%, transparent 40%),   /* peach rechtsonder */
  #FAFAF7;
```

### CTA gradient (variatie op hero)

```css
background:
  radial-gradient(ellipse at 20% 50%, rgba(205,213,222,0.5) 0%, transparent 50%),
  radial-gradient(ellipse at 80% 30%, rgba(232,169,144,0.4) 0%, transparent 45%),
  radial-gradient(ellipse at 50% 90%, rgba(221,213,232,0.35) 0%, transparent 45%),
  radial-gradient(ellipse at 70% 70%, rgba(245,213,200,0.3) 0%, transparent 40%),
  #FAFAF7;
```

### Regels voor gradient mesh:
- Maximaal 5-6 radial-gradients per sectie
- Opacity per gradient: 0.3-0.5 — nooit hoger
- Altijd eindigen met #FAFAF7 als base
- Gebruik alleen de lichte pastelkleuren in rgba()
- Elke gradient sectie (hero, CTA) heeft een unieke positionering — niet copy-pasten

---

## 6. Componenten

### Buttons

```
Primary (pill-ink):
  bg: #1A1A1A          color: #fff
  padding: 12px 28px   border-radius: 99px
  font: DM Sans 600 14px
  hover: translateY(-2px) + box-shadow 0 8px 28px rgba(0,0,0,0.15)

Secondary (pill-soft):
  bg: rgba(255,255,255,0.6)   color: #1A1A1A
  border: 1px solid rgba(0,0,0,0.06)
  border-radius: 99px
  hover: bg rgba(255,255,255,0.9)

Warm variant (pill-warm):
  bg: #F7ECE7           color: #C49585
  border: 1px solid #F0D9D0
  hover: bg #F0D9D0
```

Alle buttons zijn pill-shaped (border-radius: 99px). Geen vierkante buttons op de site.

### Status badges/pills

```
Goedgekeurd:    bg: sage-light    color: sage-deep     + checkmark SVG
Verstuurd:      bg: #FEF3C7       color: #92400E
Concept:        bg: mist-light    color: mist-deep
Gefactureerd:   bg: lavender-light color: lavender-deep
Betaald:        bg: sage-light    color: sage-deep     + checkmark SVG
In uitvoering:  bg: mist-light    color: mist-deep     + filled circle SVG
```

Badge styling: `padding: 4px 10px; border-radius: 99px; font-size: 10px; font-weight: 600`

### Step number circles

```
Cirkel: width/height 40px, border-radius: 50%, border: 2px solid [kleur]
Font: DM Mono 14px 500
Stap 1 (offerte):  border-color: ember    text-color: blush-deep
Stap 2 (werkbon):  border-color: lavender text-color: lavender-deep
Stap 3 (factuur):  border-color: sage     text-color: sage-deep
```

### Step cards (pastel gradient achtergrond)

Elke stap heeft een outer card met gradient achtergrond en een inner white card:

```
Outer card:
  border-radius: 20px
  padding: 32px
  Stap 1: background: linear-gradient(145deg, rgba(blush, 0.6), rgba(blush-light, 0.8), rgba(peach-light, 0.5))
  Stap 2: background: linear-gradient(145deg, rgba(lavender, 0.5), rgba(lavender-light, 0.7), rgba(mist, 0.4))
  Stap 3: background: linear-gradient(145deg, rgba(sage, 0.5), rgba(sage-light, 0.7), rgba(cream, 0.4))

Inner card:
  background: rgba(255,255,255,0.85)
  border: 1px solid rgba(0,0,0,0.04)
  border-radius: 14px
  padding: 22px
  box-shadow: 0 2px 16px rgba(0,0,0,0.03)
```

### Nav

```
Fixed top, height: 72px, padding: 0 48px
Default: transparant (geen background)
On scroll (>60px): background rgba(250,250,247,0.88) + backdrop-filter blur(20px) + box-shadow 0 1px 0 ink-10
Logo: "FORGE" in Donatto 900 22px ink + "desk" in DM Sans 400 ink-40
```

---

## 7. De vloeiende lijn

Een SVG lijn die door de stappen-sectie slingert en de drie stappen visueel verbindt.

### Lijn specificaties

```
Achtergrond-lijn: stroke ink-10, stroke-width 2
Gekleurde lijn:   stroke url(#flowGrad), stroke-width 2.5, filter: blur(3px) glow
Gradient:         ember (0%) → lavender-vivid (50%) → sage-vivid (100%)
Animatie:          stroke-dasharray/dashoffset, tekent zichzelf bij scroll (3s ease)
```

### Dots op de lijn

Bij elke stap zit een dot op de lijn:
```
Outer: fill bg, stroke [step-color], stroke-width 2.5, r=10
Inner: fill [step-color], r=4
Animatie: opacity 0→1, gestaffeld na de lijn (0.6s, 1.2s, 1.8s)
```

### SVG path

De lijn slingert als een S-curve: begint midden-boven, gaat naar links voor stap 1, naar rechts voor stap 2, terug naar midden voor stap 3.

---

## 8. Animaties

### Word-by-word heading reveal

```
Elke woord in de hero h1 is een aparte <span>
Initial: opacity 0, translateY(100%)
Animate to: opacity 1, translateY(0)
Easing: cubic-bezier(0.16, 1, 0.3, 1) — snelle start, zachte landing
Duration: 0.8s per woord
Stagger: 0.12s tussen woorden
```

### Scroll reveal (Framer Motion in Next.js)

```tsx
const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  visible: { 
    opacity: 1, y: 0, 
    transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } 
  }
}

// Usage:
<motion.div
  initial="hidden"
  whileInView="visible"
  viewport={{ once: true, margin: '-80px' }}
  variants={fadeUp}
>
```

### Stagger children

```tsx
const stagger = {
  visible: { transition: { staggerChildren: 0.12 } }
}
```

### Nav transition

```
Trigger: scroll > 60px
Transition: all 0.4s ease
Toevoegen: background blur + box-shadow
```

### Lijn drawing

```
Trigger: section enters viewport (threshold 0.05)
Animation: stroke-dashoffset van 1800 naar 0
Duration: 3s, cubic-bezier(0.4, 0, 0.2, 1)
Dots verschijnen gestaffeld na de lijn
```

---

## 9. Spacing & Layout

```
Pagina max-width:       1100px (stappen), 1040px (screenshot), 700px (hero content)
Sectie padding:         140-180px verticaal, 48px horizontaal
Tussen stappen:         140px
Step grid:              1fr 1fr, gap 80px
Card border-radius:     20px (outer), 14px (inner), 16px (screenshot frame)
Card padding:           32px (outer), 22px (inner)
Button border-radius:   99px (altijd pill)
Badge border-radius:    99px
Step circle:            40px
```

### Mobile breakpoints

```
< 900px:
  - Padding: 24px horizontaal
  - Step grid: 1 kolom
  - SVG lijn verbergen
  - Buttons: full width, max-width 300px
  - Hero proof: wrap

< 480px:
  - Hero heading: tracking -2px
  - Buttons: 100% width
```

---

## 10. Iconen

Geen emoji's. Gebruik inline SVG's of Lucide React icons.

```
Checkmark:  <polyline points="2 6 5 9 10 3" stroke-linecap="round"/>
Camera:     <rect x="2" y="5" width="20" height="14" rx="2"/><circle cx="12" cy="12" r="3"/>
Sparkle:    <path d="M8 0l1.8 5.2L16 6.5l-4.5 3.8L13 16l-5-3.2L3 16l1.5-5.7L0 6.5l6.2-1.3z"/>
Arrow:      → (text character in buttons)
Status dot: <circle cx="6" cy="6" r="3" fill="currentColor"/>
Image:      <rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>
```

Icon sizing: 9-10px in badges, 14px standalone, stroke-width 2-2.5

---

## 11. Component structuur (Next.js)

```
components/
├── landing/
│   ├── Navbar.tsx           — fixed nav met scroll-detectie
│   ├── Hero.tsx             — gradient mesh bg, heading met word reveal, CTA's, proof
│   ├── AppPreview.tsx       — browser frame met screenshot placeholder
│   ├── StepsSection.tsx     — header + flowing SVG line + drie stappen
│   ├── Step.tsx             — individuele stap (nummer, titel, desc, card)
│   ├── StepCard.tsx         — pastel gradient outer + white inner card
│   ├── FlowLine.tsx         — SVG lijn met gradient + dots + draw animatie
│   ├── CTASection.tsx       — gradient mesh bg, heading, button
│   └── Footer.tsx           — simpel, één regel
├── ui/
│   ├── Button.tsx           — pill buttons (ink, soft, warm variants)
│   ├── Badge.tsx            — status pills (sage, amber, mist, lavender)
│   └── StepCircle.tsx       — genummerde cirkel met kleur per fase
```

---

## 12. Tailwind config

```ts
// tailwind.config.ts
export default {
  theme: {
    extend: {
      fontFamily: {
        heading: ['var(--font-madellin)', 'Outfit', 'system-ui', 'sans-serif'],
        sans: ['var(--font-dm-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-dm-mono)', 'monospace'],
      },
      colors: {
        bg: '#FAFAF7',
        ink: {
          DEFAULT: '#1A1A1A',
          80: '#333330',
          60: '#5A5A55',
          40: '#8A8A85',
          20: '#C0C0BA',
          10: '#E8E8E3',
          '05': '#F2F2ED',
        },
        blush: {
          light: '#F7ECE7',
          DEFAULT: '#F0D9D0',
          vivid: '#E8A990',
          deep: '#C49585',
        },
        sage: {
          light: '#E4EBE6',
          DEFAULT: '#C8D5CC',
          vivid: '#7DB88A',
          deep: '#5A8264',
        },
        mist: {
          light: '#E6EAF0',
          DEFAULT: '#CDD5DE',
          vivid: '#7BA3C4',
          deep: '#5D7A93',
        },
        cream: {
          light: '#F6F4EC',
          DEFAULT: '#EDE8D8',
          vivid: '#C4B88A',
          deep: '#9A8E6E',
        },
        lavender: {
          light: '#EDE9F3',
          DEFAULT: '#DDD5E8',
          vivid: '#A48BBF',
          deep: '#7B6B8A',
        },
        peach: {
          light: '#FAE8E0',
          DEFAULT: '#F5D5C8',
          vivid: '#F0A080',
          deep: '#D4856B',
        },
      },
    },
  },
}
```

---

## 13. Metadata & assets

```tsx
export const metadata: Metadata = {
  title: 'FORGEdesk — Bedrijfssoftware voor signmakers & monteurs',
  description: 'Van offerte tot factuur in minuten. €49/maand voor je hele team. Geen kosten per gebruiker.',
  openGraph: {
    title: 'FORGEdesk — Smeed je bedrijf tot een geoliede machine',
    description: 'Bedrijfssoftware voor signmakers, interieurbouwers en monteurs. 30 dagen gratis.',
    url: 'https://forgedesk.io',
    siteName: 'FORGEdesk',
    locale: 'nl_NL',
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
}
```

**Favicon:** Zet een favicon.ico en apple-touch-icon.png in `public/`. Gebruik het FORGE logo-mark (zwart vierkant met afgeronde hoeken, witte "F" erin) of genereer er één.

**OG image:** Maak een 1200×630px afbeelding met de gradient mesh achtergrond + "FORGEdesk" in Donatto + de tagline. Zet in `public/og-image.png`.

---

## 14. Footer

Simpel, één regel. Geen mega-footer met 4 kolommen.

```
Layout: flex, space-between, border-top 1px ink-10
Padding: 40px 48px
Font: 13px, color ink-40
Links: Privacy · Voorwaarden · support@forgedesk.io
Links hover: color ink-60
```

Tekst links: `© 2026 FORGEdesk`
Tekst rechts: `Privacy · Voorwaarden · support@forgedesk.io`

---

## 15. Teksten

### Hero
- **Heading:** Smeed je bedrijf tot een geoliede machine.
- **Sub:** Van offerte tot factuur in minuten. Gebouwd voor signmakers, interieurbouwers en monteurs.
- **CTA 1:** Start 30 dagen gratis →
- **CTA 2:** Bekijk hoe het werkt
- **Proof:** Geen creditcard · Onbeperkt gebruikers · €49/maand voor het hele team

### Stappen header
- **Heading:** Van offerte tot betaling. Zo simpel.
- **Sub:** Drie stappen. Geen training. Gewoon beginnen.

### Stap 1 — Offerte
- **Titel:** Maak een offerte die indruk maakt.
- **Desc:** Klant selecteren, regels toevoegen, marge automatisch berekend. Verstuur als PDF of deel een link — je klant keurt direct goed.

### Stap 2 — Werkbon
- **Titel:** De monteur vult ter plekke in.
- **Desc:** Foto's, uren, materiaal — alles op de telefoon. Geen papier. De kantoormanager ziet het direct.

### Stap 3 — Factuur
- **Titel:** Eén klik: factuur betaald.
- **Desc:** Automatisch vanuit de offerte. Betaallink voor je klant, UBL-export voor je boekhouder. Geld sneller binnen.

### CTA
- **Heading:** Klaar om te smeden?
- **Sub:** Start vandaag gratis. Geen creditcard, geen contract, geen gedoe.
- **Button:** Start 30 dagen gratis →

---

## 16. Dependencies

```bash
npm install framer-motion
```

Framer Motion voor: word reveals, scroll-triggered section reveals, SVG line drawing, stagger animaties.

---

## 17. Implementatie volgorde

1. `app/layout.tsx` — fonts laden + metadata + body classes
2. `app/globals.css` — Tailwind imports + gradient mesh utilities
3. `tailwind.config.ts` — kleuren + fonts
4. `components/ui/Button.tsx`
5. `components/ui/Badge.tsx`
6. `components/landing/Navbar.tsx`
7. `components/landing/Hero.tsx`
8. `components/landing/AppPreview.tsx`
9. `components/landing/FlowLine.tsx`
10. `components/landing/Step.tsx` + `StepCard.tsx`
11. `components/landing/StepsSection.tsx`
12. `components/landing/CTASection.tsx`
13. `components/landing/Footer.tsx`
14. `app/page.tsx` — alles samenvoegen

Na elke component: `npx tsc --noEmit`
Aan het eind: `npm run build`

Git: `feat: landing page v1 — Madellin font, pastel gradients, flow line`
Branch: `feature/landing-page`
