# FORGEdesk Design Review — Eerlijk, Niet Beleefd

**Datum**: 2026-03-17
**Reviewer**: Claude (design audit)
**Score**: 7/10

---

## Het Goede Nieuws

Dit is geen template-app. Iemand heeft nagedacht. Er IS een design systeem, er IS een kleurenpalet, er IS een typografie-hiërarchie. Dat alleen al zet het boven 80% van de SaaS apps die ik zie.

## Cijfer: 7/10

Solide basis, maar het voelt als een huis dat 90% af is. De fundering klopt, de muren staan, maar de kozijnen zijn niet overal dezelfde kleur en in sommige kamers hangt nog steenbehang.

---

## Top 5 Beste Plekken

### 1. Pastel Badge Systeem (9/10)
De badge-blush, badge-sage, badge-mist klassen zijn prachtig. Zachte kleuren, goede contrast-ratio's, consistent doorgevoerd in statusColors.ts. Dit is het meest "designed" onderdeel van de hele app.

### 2. Dashboard Stat Cards (8/10)
Gradient achtergronden, display-numbers met font-mono, hover effecten met schaduw-groei. Voelt premium. De sparkline watermarks op de achtergrond zijn een mooi detail.

### 3. CSS Variable Architectuur (8/10)
Drie-laags systeem (primitief → semantisch → component), HSL-formaat voor dark mode flexibiliteit, timing variabelen, radius schaal. Dit is een serieus design token systeem.

### 4. Sidebar Module Kleuren (8/10)
Elke module heeft een eigen kleur, de actieve indicator met glow effect, de collapsed mode met tooltips. Goed doordacht.

### 5. Micro-animaties (7.5/10)
De wm-card hover, de button active:scale, de sidebar transitions — er is aandacht besteed aan hoe dingen bewegen. Niet overdreven, wel aanwezig.

---

## Top 5 Slechtste Plekken

### 1. Accent Kleur Mismatch (Kritisch)
De sage green (#5A8264) als accent is te rustig voor een smederij-app. Het voelt als een wellness-app, niet als gereedschap voor vakmensen. Moet naar warm amber/oranje — stoerder, ambachtelijker, meer "vuur".

### 2. Hardcoded Kleuren in Pagina-Componenten (6/10)
QuotesPipeline gebruikt bg-stone-50, bg-sky-50 in plaats van CSS variabelen. ProjectCreate en QuoteCreation hebben nog gray-* klassen. EmailLayout heeft hardcoded bg-white en #F8F7F5. Dit ondermijnt het hele design systeem.

### 3. Datums Zonder font-mono (6/10)
Bedragen en ID-nummers gebruiken netjes font-mono, maar datums in tabellen staan in het standaard font. In QuotesPipeline, FacturenLayout en andere lijsten staan datums als "15 mrt 2026" zonder monospace. Dat breekt het ritme van tabeldata.

### 4. display-number Gebruikt Verkeerd Font (5/10)
De .display-number CSS class definieert `font-family: 'Plus Jakarta Sans'` — maar het hele punt van display numbers is dat ze monospace moeten zijn. Components compenseren door EXTRA `font-mono` toe te voegen, maar de class zelf is fout.

### 5. Inconsistente Spacing in Pagina-layouts (6.5/10)
Dashboard widgets gebruiken p-5, sommige pagina's p-4, detail-pagina's p-6. Er is geen harde regel. De ruimte tussen secties varieert van gap-3 tot gap-6 zonder duidelijk systeem.

---

## Observaties

- **Typografie basis is goed**: Plus Jakarta Sans als primary, DM Mono voor data. De keuze klopt.
- **Dark mode is indrukwekkend**: Volledige ondersteuning met gedempte pastels en goede contrast.
- **Portaal is een apart design**: Terecht — publieke pagina's hebben een andere behoefe.
- **De Forgie AI widget heeft eigen styling**: Wordt terecht niet aangeraakt.
- **Glass en Zwart themes**: Ambitieus. Laat zien dat het systeem flexibel is.

---

## Actieplan

1. Accent kleur → warm amber (de grootste visuele impact)
2. font-mono doorvoeren op alle datums en nummers
3. Hardcoded kleuren opruimen
4. Spacing standaardiseren
5. Component details fijn-slijpen
