# Styling Plan — Van "Workmate" naar "Sign Company"

## Doel
De app voelt nu te generiek / template-achtig. Het moet aanvoelen alsof jij het zelf hebt gebouwd voor Sign Company. Modern, strak, met een warme terracotta-rode accent.

---

## Fase 1: Rebranding — "Sign Company"

### 1.1 Naam aanpassen
Overal "Workmate" → "Sign Company" (of "Sign Co." waar ruimte beperkt is):
- `Sidebar.tsx` — header logo + tekst
- `LoginPage.tsx` — 3 plekken (hero, form header, footer)
- `RegisterPage.tsx` — header
- `BetaalPagina.tsx` — footer "Gegenereerd door..."
- `OffertePubliekPagina.tsx` — footer
- `Header.tsx` — fallback titel
- `index.html` — `<title>` tag

### 1.2 Logo icoon
Nu: `Sparkles` icoon (generiek AI-gevoel). Vervangen door iets dat past bij sign industry:
- Optie: `Pen` / `PenTool` (design), `Layers` (productie), of een eigen SVG letter "S"
- Gradient aanpassen naar terracotta-palette

---

## Fase 2: Kleurenpalet — Terracotta als standaard

### 2.1 Nieuw standaard palet "Terracotta"
Geïnspireerd op Claude's terracotta rood, als nieuwe **default** palette:

```
Primary:    #D4714A  (warm terracotta)
Accent:     #8B4A2F  (donker terracotta/kastanje)
Light:      #F5DDD0  (zacht roze-beige)
Pale:       #FFF5EF  (heel licht warm)
Gradient:   #8B4A2F → #D4714A → #F5DDD0
```

### 2.2 Bestaande paletten behouden
De 8 paletten blijven beschikbaar in Instellingen → Weergave. Gebruikers kunnen nog steeds wisselen. Alleen de **default** verandert van "Jade" naar "Terracotta".

### 2.3 Sidebar kleuren
Sidebar achtergrond: warm-donker (niet koud-bruin zoals nu):
```
Sidebar BG:    #1E1410  (warm donkerbruin)
Sidebar hover: #2A1E18  (subtiel lichter)
Active:        terracotta accent
```

---

## Fase 3: Achtergrond & Basis kleuren

### 3.1 Content area
Nu: botanische groentint. Wordt: neutraal zacht grijs / warm off-white:
```
Light mode:
  Background:  #F7F5F3  (warm off-white)
  Card:        #FFFFFF
  Muted:       #F0EDEA  (zacht warm grijs)
  Border:      #E8E4E0  (subtiele warme rand)
```

### 3.2 Dark mode fine-tune
Donkere modus meenemen met terracotta-tinten (al geregeld via palette systeem).

---

## Fase 4: Typografie & Spacing

### 4.1 Font
DM Sans blijft (is goed voor modern/strak). Geen wijziging nodig.

### 4.2 Border radius
Huidige `--radius: 0.75rem` (12px) is goed voor "rond (12-16px)".
Eventueel naar `0.875rem` (14px) voor net iets meer personality.

### 4.3 Schaduwen
Huidige box-shadows reviewen — moeten subtiel en warm zijn, niet blauw/koud.
Aanpassen naar warme tinten: `rgba(139, 74, 47, 0.06)` ipv neutrale zwarte shadows.

---

## Fase 5: Component-specifieke verbeteringen

### 5.1 Login pagina
- Sign Company branding met terracotta gradient
- Eventueel tagline: "Alles voor je sign business, op één plek"
- Hero sectie links: terracotta gradient ipv groen

### 5.2 Dashboard
- Welcome banner gradient → terracotta
- KPI cards schaduwen → warm
- Statistiek-accenten → terracotta

### 5.3 Sidebar active indicator
Het linkerzijde-balkje bij actieve nav items: terracotta gradient ipv groen.

---

## Bestanden die wijzigen

| # | Bestand | Wat |
|---|---------|-----|
| 1 | `src/index.css` | CSS variabelen: achtergrond, borders, shadows, sidebar |
| 2 | `src/contexts/PaletteContext.tsx` | Nieuw "Terracotta" palet + default wijzigen |
| 3 | `tailwind.config.js` | Evt. radius aanpassing |
| 4 | `src/components/layouts/Sidebar.tsx` | Naam + logo icoon |
| 5 | `src/components/auth/LoginPage.tsx` | Naam + gradient kleuren |
| 6 | `src/components/auth/RegisterPage.tsx` | Naam |
| 7 | `src/components/betaling/BetaalPagina.tsx` | Footer tekst |
| 8 | `src/components/offerte/OffertePubliekPagina.tsx` | Footer tekst |
| 9 | `src/components/layouts/Header.tsx` | Fallback titel |
| 10 | `index.html` | Page title |

---

## Volgorde van uitvoering

1. **Fase 2** eerst — Terracotta palet toevoegen (fundament)
2. **Fase 3** — Achtergrondkleuren aanpassen
3. **Fase 1** — Rebranding teksten
4. **Fase 4** — Typografie/spacing fine-tune
5. **Fase 5** — Component-specifieke polish

Geschatte omvang: ~10 bestanden, vooral CSS variabelen en tekst-wijzigingen.
