# Sign Company - Claude Code Richtlijnen

**Versie 2.0 - December 2025**

---

## ALLERBELANGRIJKSTE REGEL - LEES DIT EERST!

### ALLE HEADINGS MOETEN EXTRA DIK (BOLD) ZIJN!

```css
/* H1 en H2 = ULTRA BLACK (dikst mogelijk) */
font-weight: 900 !important;

/* H3 = BLACK */
font-weight: 700 !important;

/* H4, H5, H6 = BOLD */
font-weight: 600 !important;
```

**NOOIT VERGETEN:**
- Zonder `!important` pakt het WordPress theme de styling over
- Sign Company headings zijn ALTIJD extra dik - dit is het merk!
- Weight 900 = "Ultra Black" = dikste variant van Excon font
- Normale font-weight (400/500) is FOUT voor headings

**Controleer ALTIJD:**
```css
/* GOED */
h2 {
    font-family: 'Excon', sans-serif !important;
    font-weight: 900 !important;
}

/* FOUT - vergeet !important */
h2 {
    font-family: 'Excon', sans-serif;
    font-weight: 900;
}

/* FOUT - te licht */
h2 {
    font-weight: 700 !important;  /* Moet 900 zijn voor H1/H2! */
}
```

---

## KRITISCHE REGELS

### 1. FONTS - ALTIJD MET !important
```css
/* HEADINGS = Excon (H1-H6, badges, buttons, stats) */
font-family: 'Excon', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;

/* BODY = Satoshi (paragraphs, descriptions) */
font-family: 'Satoshi', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
```

### 2. HEADING WEIGHTS - ALTIJD MET !important

| Element | Weight | !important |
|---------|--------|------------|
| H1, H2 | 900 | VERPLICHT |
| H3 | 700 | VERPLICHT |
| H4, H5, H6 | 600-700 | VERPLICHT |

### 3. LETTER-SPACING - TIGHT VOOR EXCON

| Element | Spacing | !important |
|---------|---------|------------|
| H1 | -3.5px | VERPLICHT |
| H2 | -3px | VERPLICHT |
| H3 | -2px | VERPLICHT |
| H4 | -1.5px | VERPLICHT |

---

## KLEURENPALET

### Primary Colors
```css
--navy:        #1A3752;    /* Headers, accenten */
--black:       #141414;    /* Body text, backgrounds */
--off-white:   #F7F4F0;    /* Lichte backgrounds */
--gray-text:   #666666;    /* Secundaire tekst */
--gray-tint:   #ECECEC;    /* Borders, dividers */
```

### Service Colors (voor gradients en accenten)
```css
--orange:      #E57324;    /* Gevelreclame */
--yellow:      #F0AA04;    /* Voertuigreclame */
--pink:        #D83255;    /* Event & Promotie */
--teal:        #00BFA5;    /* Interieur/Printerieur */
--purple:      #5139E2;    /* Special accents */
--light-orange: #FFB347;   /* Hover states */
--light-teal:  #00E5CC;    /* Teal gradient end */
```

### Primary Gradient (Buttons, Badges, Highlights)
```css
background: linear-gradient(135deg, #F0AA04, #E57324);

/* Hover state */
background: linear-gradient(135deg, #FFB347, #E57324);
```

---

## TYPOGRAPHY - COMPLETE CSS

### Font Import
```html
<!-- Satoshi Font -->
<link href="https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700&display=swap" rel="stylesheet">

<!-- Excon moet lokaal gehost worden of via Adobe Fonts -->
```

### H1 - Main Title
```css
h1 {
    font-family: 'Excon', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
    font-size: 36px !important;           /* Mobile */
    font-weight: 900 !important;
    color: #1A3752 !important;
    line-height: 1.05 !important;
    letter-spacing: -2px !important;
    margin: 0 !important;
}

@media (min-width: 600px) {
    h1 {
        font-size: 48px !important;
        letter-spacing: -2.5px !important;
    }
}

@media (min-width: 968px) {
    h1 {
        font-size: 56px !important;
        letter-spacing: -3px !important;
    }
}

@media (min-width: 1200px) {
    h1 {
        font-size: 64px !important;
        letter-spacing: -3.2px !important;
    }
}

@media (min-width: 1400px) {
    h1 {
        font-size: 72px !important;
        letter-spacing: -3.5px !important;
    }
}
```

### H2 - Section Title
```css
h2, .section-title {
    font-family: 'Excon', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
    font-size: 32px !important;           /* Mobile */
    font-weight: 900 !important;
    color: #1A3752 !important;
    line-height: 1.05 !important;
    letter-spacing: -1.5px !important;
    margin: 0 !important;
}

@media (min-width: 600px) {
    h2, .section-title {
        font-size: 42px !important;
        letter-spacing: -2px !important;
    }
}

@media (min-width: 1200px) {
    h2, .section-title {
        font-size: 52px !important;
        letter-spacing: -2.5px !important;
    }
}

@media (min-width: 1400px) {
    h2, .section-title {
        font-size: 64px !important;
        letter-spacing: -3px !important;
    }
}
```

### H3 - Subsection Title
```css
h3 {
    font-family: 'Excon', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
    font-size: 28px !important;           /* Mobile */
    font-weight: 700 !important;
    color: #1A3752 !important;
    line-height: 1.1 !important;
    letter-spacing: -1.2px !important;
}

@media (min-width: 600px) {
    h3 {
        font-size: 32px !important;
        letter-spacing: -1.5px !important;
    }
}

@media (min-width: 1200px) {
    h3 {
        font-size: 42px !important;
        letter-spacing: -2px !important;
    }
}
```

### H4 - Small Section Title
```css
h4 {
    font-family: 'Excon', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
    font-size: 24px !important;
    font-weight: 700 !important;
    color: #1A3752 !important;
    line-height: 1.15 !important;
    letter-spacing: -1px !important;
}

@media (min-width: 600px) {
    h4 {
        font-size: 28px !important;
        letter-spacing: -1.2px !important;
    }
}

@media (min-width: 1200px) {
    h4 {
        font-size: 32px !important;
        letter-spacing: -1.5px !important;
    }
}
```

### H5 - Minor Heading
```css
h5 {
    font-family: 'Excon', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
    font-size: 20px !important;
    font-weight: 600 !important;
    color: #1A3752 !important;
    line-height: 1.2 !important;
    letter-spacing: -0.8px !important;
}

@media (min-width: 1200px) {
    h5 {
        font-size: 24px !important;
        letter-spacing: -1px !important;
    }
}
```

### H6 - Smallest Heading
```css
h6 {
    font-family: 'Excon', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
    font-size: 16px !important;
    font-weight: 600 !important;
    color: #1A3752 !important;
    line-height: 1.3 !important;
    letter-spacing: -0.4px !important;
}

@media (min-width: 1200px) {
    h6 {
        font-size: 18px !important;
        letter-spacing: -0.5px !important;
    }
}
```

### Section Description (Body Text)
```css
.section-description, p {
    font-family: 'Satoshi', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 16px;              /* Mobile */
    font-weight: 400;
    line-height: 1.7;
    color: #666666;
    max-width: 640px;
}

@media (min-width: 600px) {
    .section-description, p {
        font-size: 17px;
    }
}

@media (min-width: 1200px) {
    .section-description, p {
        font-size: 18px;
    }
}
```

---

## BUTTONS

### Primary Button (CTA)
```css
.btn-primary {
    font-family: 'Excon', sans-serif !important;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 14px 32px;           /* Mobile */
    background: linear-gradient(135deg, #F0AA04, #E57324);
    color: #FFFFFF !important;
    text-decoration: none;
    font-weight: 700 !important;
    font-size: 14px !important;
    letter-spacing: 0.3px !important;
    border-radius: 50px;
    border: none;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 6px 16px rgba(240, 170, 4, 0.2);
    width: 100%;                  /* Mobile: full width */
}

@media (min-width: 600px) {
    .btn-primary {
        width: auto;
        padding: 15px 36px;
        font-size: 15px !important;
        box-shadow: 0 8px 20px rgba(240, 170, 4, 0.25);
    }
}

@media (min-width: 1200px) {
    .btn-primary {
        padding: 16px 40px;
    }
}

.btn-primary:hover {
    transform: translateY(-3px);
    box-shadow: 0 12px 30px rgba(240, 170, 4, 0.35);
    background: linear-gradient(135deg, #FFB347, #E57324);
}
```

### Button Arrow Icon
```html
<a href="#" class="btn-primary">
    Vraag offerte aan
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M5 12h14M12 5l7 7-7 7"/>
    </svg>
</a>
```

### Secondary Button (Outline)
```css
.btn-secondary {
    font-family: 'Excon', sans-serif !important;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 14px 32px;
    background: transparent;
    color: #1A3752 !important;
    text-decoration: none;
    font-weight: 700 !important;
    font-size: 14px !important;
    letter-spacing: 0.3px !important;
    border-radius: 50px;
    border: 2px solid #1A3752;
    cursor: pointer;
    transition: all 0.3s ease;
}

.btn-secondary:hover {
    background: #1A3752;
    color: #FFFFFF !important;
    transform: translateY(-2px);
}
```

---

## BADGES

### Section Badge
```css
.section-badge {
    font-family: 'Excon', sans-serif !important;
    display: inline-block;
    padding: 6px 16px;            /* Mobile */
    background: linear-gradient(135deg, #F0AA04, #E57324);
    color: #FFFFFF !important;
    font-size: 10px !important;
    font-weight: 700 !important;
    letter-spacing: 1px !important;
    text-transform: uppercase;
    border-radius: 50px;
    margin-bottom: 24px;
}

@media (min-width: 1200px) {
    .section-badge {
        padding: 8px 20px;
        font-size: 11px !important;
        letter-spacing: 1.5px !important;
    }
}
```

### Service-Specific Badge Colors
```css
/* Gevelreclame - Orange */
.badge-gevel {
    background: linear-gradient(135deg, #E57324, #F0AA04);
}

/* Voertuigreclame - Yellow */
.badge-voertuig {
    background: linear-gradient(135deg, #F0AA04, #FFB347);
}

/* Event & Promotie - Pink */
.badge-event {
    background: linear-gradient(135deg, #D83255, #E85A7A);
}

/* Interieur - Teal */
.badge-interieur {
    background: linear-gradient(135deg, #00BFA5, #00E5CC);
}
```

---

## GRADIENT HIGHLIGHT TEXT

### Voor woorden in titels met kleurverloop
```css
.highlight {
    background: linear-gradient(135deg, #F0AA04, #E57324) !important;
    -webkit-background-clip: text !important;
    -webkit-text-fill-color: transparent !important;
    background-clip: text !important;
}
```

### HTML Voorbeeld
```html
<h2 class="section-title">
    Professionele<br>
    <span class="highlight">Gevelreclame</span><br>
    voor elk bedrijf
</h2>
```

---

## STATS

### Stat Number
```css
.stat-number {
    font-family: 'Excon', sans-serif !important;
    font-size: 32px !important;           /* Mobile */
    font-weight: 900 !important;
    line-height: 1 !important;
    letter-spacing: -1px !important;
    margin-bottom: 8px;
}

@media (min-width: 600px) {
    .stat-number {
        font-size: 36px !important;
        letter-spacing: -1.2px !important;
    }
}

@media (min-width: 1200px) {
    .stat-number {
        font-size: 42px !important;
        letter-spacing: -1.5px !important;
    }
}
```

### Stat Gradient Per Item
```css
/* Stat 1 - Yellow */
.stat-item:nth-child(1) .stat-number {
    background: linear-gradient(135deg, #F0AA04, #FFB347) !important;
    -webkit-background-clip: text !important;
    -webkit-text-fill-color: transparent !important;
    background-clip: text !important;
}

/* Stat 2 - Orange */
.stat-item:nth-child(2) .stat-number {
    background: linear-gradient(135deg, #E57324, #F0AA04) !important;
    -webkit-background-clip: text !important;
    -webkit-text-fill-color: transparent !important;
    background-clip: text !important;
}

/* Stat 3 - Teal */
.stat-item:nth-child(3) .stat-number {
    background: linear-gradient(135deg, #00BFA5, #00E5CC) !important;
    -webkit-background-clip: text !important;
    -webkit-text-fill-color: transparent !important;
    background-clip: text !important;
}

/* Stat 4 - Light Orange */
.stat-item:nth-child(4) .stat-number {
    background: linear-gradient(135deg, #FFB347, #F0AA04) !important;
    -webkit-background-clip: text !important;
    -webkit-text-fill-color: transparent !important;
    background-clip: text !important;
}
```

### Stat Label
```css
.stat-label {
    font-family: 'Excon', sans-serif !important;
    font-size: 13px !important;
    font-weight: 600 !important;
    color: #666666 !important;
    letter-spacing: 0.5px !important;
}

@media (min-width: 1200px) {
    .stat-label {
        font-size: 14px !important;
    }
}
```

---

## PROJECT CARDS

### Card Container
```css
.project-card {
    position: relative;
    height: 280px;                /* Mobile */
    overflow: hidden;
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

@media (min-width: 600px) {
    .project-card {
        height: 320px;
    }
}

@media (min-width: 968px) {
    .project-card {
        height: 360px;
    }
}

@media (min-width: 1200px) {
    .project-card {
        height: 400px;
    }
}

.project-card img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

.project-card:hover {
    transform: translateY(-8px);
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.2);
}

.project-card:hover img {
    transform: scale(1.08);
}
```

### Card Gradient Overlay
```css
.project-gradient {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 60%;
    background: linear-gradient(180deg, transparent 0%, rgba(20, 20, 20, 0.95) 100%);
    pointer-events: none;
}
```

### Card Text
```css
.project-title {
    font-family: 'Excon', sans-serif !important;
    font-size: 18px !important;
    font-weight: 700 !important;
    color: #FFFFFF !important;
    letter-spacing: -0.5px !important;
    margin-bottom: 6px;
}

@media (min-width: 1200px) {
    .project-title {
        font-size: 20px !important;
    }
}

.project-type {
    font-family: 'Excon', sans-serif !important;
    font-size: 11px !important;
    font-weight: 600 !important;
    color: rgba(255, 255, 255, 0.85) !important;
    letter-spacing: 0.5px !important;
    text-transform: uppercase;
}

@media (min-width: 1200px) {
    .project-type {
        font-size: 12px !important;
    }
}
```

---

## LAYOUT

### Section Container
```css
.section {
    background: #FFFFFF;
    position: relative;
    overflow: hidden;
    width: 100vw;
    margin: 0;
    margin-left: calc(-50vw + 50%);
    margin-right: calc(-50vw + 50%);
    padding: 60px 0;              /* Mobile */
}

@media (min-width: 600px) {
    .section {
        padding: 70px 0;
    }
}

@media (min-width: 968px) {
    .section {
        padding: 80px 0;
    }
}

@media (min-width: 1200px) {
    .section {
        padding: 100px 0;
    }
}
```

### Content Wrapper
```css
.container {
    max-width: 1400px;
    margin: 0 auto;
    padding: 0;
    position: relative;
    z-index: 1;
}

.content-wrapper {
    padding: 0 20px;              /* Mobile */
}

@media (min-width: 481px) {
    .content-wrapper {
        padding: 0 24px;
    }
}

@media (min-width: 769px) {
    .content-wrapper {
        padding: 0 32px;
    }
}

@media (min-width: 969px) {
    .content-wrapper {
        padding: 0 40px;
    }
}
```

### Projects Grid
```css
.projects-grid {
    display: grid;
    grid-template-columns: 1fr;   /* Mobile: 1 kolom */
    gap: 20px;
    margin-top: 48px;
}

@media (min-width: 481px) {
    .projects-grid {
        grid-template-columns: repeat(2, 1fr);
    }
}

@media (min-width: 1201px) {
    .projects-grid {
        grid-template-columns: repeat(4, 1fr);
        gap: 24px;
        margin-top: 56px;
    }
}
```

---

## SERVICE COLOR BAR

### Visuele scheiding met alle servicekleuren
```html
<div class="service-bar" style="display: flex; width: 100%;">
    <div style="background: #E57324; flex: 1; height: 6px;"></div>
    <div style="background: #F0AA04; flex: 1; height: 6px;"></div>
    <div style="background: #D83255; flex: 1; height: 6px;"></div>
    <div style="background: #00BFA5; flex: 1; height: 6px;"></div>
</div>
```

---

## WEBSITE LINKS

### Hoofdcategorieën

| Categorie | URL |
|-----------|-----|
| Gevelreclame | https://signcompany.nl/gevelreclame |
| Voertuigreclame | https://signcompany.nl/voertuigreclame |
| Event & Promotie | https://signcompany.nl/promo-artikelen |
| Interieur/Printerieur | https://signcompany.nl/interieur-printerieur |

### Gevelreclame Subcategorieën

| Dienst | URL |
|--------|-----|
| Lichtreclame | https://signcompany.nl/lichtreclame |
| Bewegwijzering | https://signcompany.nl/bewegwijzering |
| Freesletters | https://signcompany.nl/freesletters |
| Raamfolie | https://signcompany.nl/raamfolie |
| Reclamezuilen | https://signcompany.nl/reclamezuilen |
| Spandoekframes | https://signcompany.nl/spandoekframes |

### Voertuigreclame Subcategorieën

| Dienst | URL |
|--------|-----|
| Bestickering | https://signcompany.nl/bestickering |
| Wrappen | https://signcompany.nl/wrappen |
| Campers | https://signcompany.nl/campers |
| Bootstickers | https://signcompany.nl/boot-stickers |

### Event & Promotie Subcategorieën

| Dienst | URL |
|--------|-----|
| Stickers & Etiketten | https://signcompany.nl/stickers-etiketten |
| Evenementen | https://signcompany.nl/evenementen |
| Vlaggen | https://signcompany.nl/vlaggen |
| Spandoeken | https://signcompany.nl/spandoeken |
| Branding Items | https://signcompany.nl/branding-items |
| Reclameborden | https://signcompany.nl/reclameborden |

### Interieur/Printerieur Subcategorieën

| Dienst | URL |
|--------|-----|
| Hotel Bewegwijzering | https://signcompany.nl/hotel-bewegwijzering-signing |
| Branding | https://signcompany.nl/branding |
| Akoestische Oplossingen | https://signcompany.nl/akoestische-oplossingen |
| Fotobehang | https://signcompany.nl/fotobehang |
| Textielframes | https://signcompany.nl/textielframes |
| Raamfolie Binnen | https://signcompany.nl/raamfolie-binnen |

---

## CONTACT INFORMATIE

```
Sign Company
De Drie Kronen 115
1601 MT Enkhuizen

Telefoon: 0228-351960
WhatsApp: 0629399326
Email: info@signcompany.nl
Website: https://signcompany.nl
```

### WhatsApp Link (voor buttons)
```html
<a href="https://wa.me/31629399326" class="btn-whatsapp">
    WhatsApp ons
</a>
```

---

## TONE OF VOICE

### Kernprincipes
- **Professioneel maar toegankelijk** - Niet te formeel
- **Direct en persoonlijk** - Gebruik "je" en "jouw"
- **Luchtig met subtiele humor** - Waar passend
- **Focus op oplossingen** - Niet alleen producten
- **Duidelijke maar niet te technische taal**

### Te vermijden
- Samengestelde woorden (bijv. "sign-oplossing" -> "signing oplossing")
- Em-dashes (-)
- Overly formele taal
- AI-achtige zinnen

### Pay-off structuur
Gebruik consistent "van... naar..." constructies:
- "Van idee naar icoon"
- "Van concept naar realisatie"
- "Van ontwerp naar montage"

### Voorbeeld goede tekst
> "Jouw bedrijfswagen is een rijdend visitekaartje. Met professionele autobelettering zorg je dat iedereen weet wie je bent, waar je ook rijdt. Onze premium folies gaan 5-7 jaar mee en beschermen ook nog eens je lak."

### Voorbeeld slechte tekst
> "Sign Company biedt u professionele auto-beletteringsoplossingen aan - wij zijn gespecialiseerd in het aanbrengen van hoogwaardige folies op uw bedrijfsvoertuigen."

---

## BEDRIJFSINFO

### Kerncijfers
- **42 jaar** ervaring (sinds 1983)
- **West-Friesland, Noord-Holland & Lelystad** werkgebied
- **Premium materialen**: 3M, Avery Dennison
- **85 euro/uur** montagekosten per persoon
- **2-3 weken** standaard levertijd

### USP's
1. 42 jaar lokale ervaring
2. Van idee tot realisatie
3. Premium materialen
4. Eigen monteurs
5. Complete ontzorging

### Grote klanten (voor social proof)
- WestCord Hotels
- Albert Heijn
- KWS Vegetables
- Contest Yachts
- Renolit Healthcare

---

## SEO FOCUS KEYWORDS

### Autobelettering
- autobelettering Hoorn
- autobelettering Enkhuizen
- autobelettering Lelystad
- bedrijfswagen belettering West-Friesland

### Gevelreclame
- gevelreclame Lelystad
- gevelreclame Hoorn
- lichtreclame West-Friesland
- doosletters Enkhuizen

### Carwrapping
- carwrapping Hoorn
- carwrapping Lelystad
- full wrap bedrijfswagen

### Bootstickers
- bootstickers
- bootbelettering
- maritieme folie
- bootnaam belettering

### Interieur
- interieursigning Lelystad
- fotobehang kantoor
- raamfolie Hoorn
- bewegwijzering bedrijventerrein

---

## BREAKPOINTS OVERZICHT

```css
/* Mobile First Approach */
/* Base: 320px+ (mobile) */

@media (min-width: 481px) { /* Large mobile / Small tablet */ }
@media (min-width: 600px) { /* Tablet */ }
@media (min-width: 769px) { /* Small desktop */ }
@media (min-width: 968px) { /* Desktop */ }
@media (min-width: 1200px) { /* Large desktop */ }
@media (min-width: 1400px) { /* Extra large desktop */ }
```

---

## QUICK COPY-PASTE

### Complete H2 met Highlight
```html
<span class="section-badge">GEVELRECLAME</span>
<h2 class="section-title">
    Professionele<br>
    <span class="highlight">Lichtreclame</span><br>
    die opvalt
</h2>
<p class="section-description">
    Laat je bedrijf 24/7 stralen met onze LED-lichtreclame.
    Energiezuinig, duurzaam en perfect afgewerkt.
</p>
```

### Complete Primary Button
```html
<a href="https://signcompany.nl/lichtreclame" class="btn-primary">
    Bekijk mogelijkheden
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M5 12h14M12 5l7 7-7 7"/>
    </svg>
</a>
```

### Complete Stat Item
```html
<div class="stat-item">
    <div class="stat-number">42+</div>
    <div class="stat-label">Jaar ervaring</div>
</div>
```

### Complete Project Card
```html
<div class="project-card">
    <img src="project-image.webp" alt="Project beschrijving">
    <div class="project-gradient"></div>
    <div class="project-overlay">
        <div class="project-title">WestCord Hotel</div>
        <div class="project-type">Gevelreclame</div>
    </div>
</div>
```

---

## CHECKLIST VOOR NIEUWE SECTIES

- [ ] Font-family Excon voor headings MET !important
- [ ] Font-weight 900 voor H1/H2 MET !important
- [ ] Letter-spacing tight (-2px tot -3px) MET !important
- [ ] Satoshi voor body text
- [ ] Gradient highlight voor accent woorden
- [ ] Mobile-first responsive breakpoints
- [ ] Primary gradient voor buttons/badges
- [ ] Navy (#1A3752) voor heading kleuren
- [ ] Gray (#666666) voor body text
- [ ] Max-width 640px voor descriptions
- [ ] Service-specifieke kleuren waar relevant
- [ ] Correcte interne links naar signcompany.nl

---

**Laatste update:** December 2025
**Versie:** 2.0
