# DOEN. — Design System & Migratie Gids

> Dit document is de enige bron van waarheid voor het visuele ontwerp van de Doen app (app.doen.team). Lees dit document volledig voordat je wijzigingen maakt aan de codebase.

---

## 1. Merk & Identiteit

### Naam en domein
- Merknaam: **Doen.**  (met punt)
- Domein: doen.team
- App URL: app.doen.team
- AI-assistent: **Daan**
- Tagline: "Jij doet. Wij doen."

### Logo
- "D" in petrol (#1A535C) vierkant met border-radius 8px
- Daarnaast "Doen." in Bricolage Grotesque 800
- De punt is onderdeel van het logo
- De punt is NIET gekleurd in flame — alles is ink (#191919) behalve het D-vierkant

### Tone of voice
- Nuchter, kort, eerlijk, Nederlands
- Geen emojis. Nergens. Niet in de app, niet in emails
- Geen "wij geloven dat" of "ontdek de kracht van"
- Humor mag, circus niet

---

## 2. Kleuren

### Brandkleuren

| Token | Hex | Gebruik |
|-------|-----|---------|
| flame | #F15025 | Primaire accent. CTAs bij onomkeerbare acties, urgentie, "Doen" knoppen. Max 5-8 flame elementen per scherm |
| petrol | #1A535C | Secundaire accent. Daan AI, focus rings, save-knoppen, vertrouwen |
| ink | #191919 | Primaire tekst |
| bg | #FAFAF8 | Pagina achtergrond |
| card | #FFFFFF | Cards, modals, surfaces |
| warm | #F4F2EE | Subtiele achtergrond, inputs |
| border | #E6E4E0 | Borders, dividers |
| text-sec | #5A5A55 | Secundaire tekst |
| muted | #A0A098 | Placeholders, timestamps |

### Modulekleuren

Elke module heeft drie tinten: vol (icoon), licht (card-bg, badge-bg), border.

| Module | Vol | Licht | Border | Tekst |
|--------|-----|-------|--------|-------|
| Projecten | #1A535C | #E2F0F0 | #B8D8DA | #1A535C |
| Offertes + Deals | #F15025 | #FDE8E2 | #F5C4B4 | #C03A18 |
| Facturen | #2D6B48 | #E4F0EA | #C0DBCC | #2D6B48 |
| Klanten | #3A6B8C | #E5ECF6 | #C0D0EA | #2A5580 |
| Planning + Montage | #9A5A48 | #F2E8E5 | #E0CFC8 | #7A4538 |
| Werkbonnen | #C44830 | #FAE5E0 | #EDD0C5 | #943520 |
| Taken + Tijdregistratie + Team + Instellingen | #5A5A55 | #EEEEED | #D8D8D5 | #4A4A45 |
| Email + Klantportaal | #6A5A8A | #EEE8F5 | #D8CCE8 | #5A4A78 |
| Daan AI | #1A535C | #E2F0F0 | #B8D8DA | #1A535C |

### Spectrum

Het kleurenspectrum van flame naar petrol is de visuele ruggengraat van Doen. Het vertelt het verhaal van actie naar resultaat.

```
Flame #F15025 → #D4453A → #9A4070 → #6A5A8A → #3A6B8C → #2D6B48 → #1A535C Petrol
```

CSS gradient:
```css
background: linear-gradient(90deg, #F15025 0%, #D4453A 18%, #9A4070 38%, #6A5A8A 50%, #3A6B8C 65%, #2D6B48 80%, #1A535C 100%);
```

Toepassingen van het spectrum:
- **Projectvoortgang**: progressbar groeit van flame naar petrol per fase
- **Factuur aging**: omgekeerd — vers=petrol, oud=flame
- **Project timeline**: verticale gradient lijn
- **Klantportaal**: voortgangsbalk die klant ziet
- **Onboarding**: stappen vullen spectrum
- **PDF offerte**: spectrum strip bovenaan (4px)
- **Website hero**: storytelling element
- **Loading bar**: shimmer van flame naar petrol

### Kleurregels
- Modulekleuren zijn altijd zacht op de achtergrond (licht), nooit vol op grote vlakken
- Flame en Petrol zijn de baas, modulekleuren zijn ondersteunend
- Nooit meer dan 5-8 flame elementen per scherm
- Stat cards: achtergrond = module-licht, tekst = module-tekst, GEEN border
- Sidebar: 8px kleurbolletje of gekleurd icoon per module
- Badges: lichte achtergrond + border + donkere tekst, pill shape
- Tabelrijen: 3px verticaal kleurstreepje links

### Dark mode

| Token | Light | Dark |
|-------|-------|------|
| bg | #FAFAF8 | #1A1A18 |
| card | #FFFFFF | #232320 |
| warm | #F4F2EE | #2A2A26 |
| border | #E6E4E0 | #3A3A36 |
| ink | #191919 | #E8E6E0 |
| text-sec | #5A5A55 | #A0A098 |
| flame | #F15025 | #F15025 (ongewijzigd) |
| petrol | #1A535C | #2A7A86 (iets lichter) |

Warm donker, niet koud zwart. Modulekleuren worden gedempt, niet feller.

---

## 3. Typografie

| Gebruik | Font | Weight | Grootte |
|---------|------|--------|---------|
| Logo & headlines | Bricolage Grotesque | 800 | 20-28px, letter-spacing -0.8px tot -1.5px |
| Body & interface | IBM Plex Sans | 400-600 | 12-14px, line-height 1.6 |
| Getallen, codes, bedragen | DM Mono | 400-500 | Alle bedragen, nummers, datums, stats |
| Labels & section headers | IBM Plex Sans | 500-600 | 9-11px, uppercase, letter-spacing 1-1.5px |
| Sidebar labels (collapsed) | IBM Plex Sans | 500 | 9px |

Regels:
- DM Mono voor ALLE getallen: bedragen, datums, offerte-nummers, KVK, telefoon, tellers
- "EUR" als prefix bij bedragen, niet het euroteken
- Geen emojis — gebruik iconen of tekst

---

## 4. Layout

### Sidebar (collapsed = standaard)
- Breedte: 72px collapsed, 220px expanded
- Logo: "D" in petrol vierkant (34px), border-radius 8px
- Items: icoon (18px, Lucide, modulekleur) + label (9px) onder elkaar
- Active state: 3px verticale indicator links in modulekleur + lichte achtergrond
- Groepering met dunne dividers:
  - **Werk**: Projecten, Offertes, Facturen, Klanten, Werkbonnen
  - **Planning**: Planning, Taken
  - **Communicatie**: Email, Portaal
  - **Onderkant** (los): Instellingen
- Tellers: DM Mono, pill-shaped, alleen tonen als >0

### Top navigation
- Hoogte: 48px
- Links: breadcrumb (Module > Pagina)
- Midden: Cmd+K zoekbalk (altijd zichtbaar)
- Rechts: notificatie-bel (flame dot als ongelezen) + user avatar (initialen)
- Geen Daan-knop in top nav — Daan is de FAB rechtsonder

### Content area
- Achtergrond: bg (#FAFAF8)
- Page padding: 20px
- Cards: card (#FFFFFF), border-radius 10-12px, border 0.5px
- Section gap: 16px

### Mobiel (PWA)
- Sidebar → bottom tab bar (5 tabs: Dashboard, Projecten, Planning, Email, Meer)
- Touch targets: minimaal 44px
- Formulieren: full-width, single column, 44px input hoogte
- Daan FAB: blijft rechtsonder

---

## 5. Componenten

### Buttons
- **Flame** (onomkeerbare actie: versturen, "Doen"): bg #F15025, wit tekst, weight 600, radius 6px
- **Petrol** (opslaan, bewaren): bg #1A535C, wit tekst
- **Ghost** (annuleren, secundair): transparant, border, text-secondary
- Geen "Doen" als label behalve op confirmatie-dialogen en Daan acties

### Inputs
- Border: 0.5px #E6E4E0
- Achtergrond: #FAFAF8 (warm)
- Focus: petrol ring — border-color #1A535C + box-shadow 0 0 0 2px rgba(26,83,92,0.12)
- Error: flame ring — border-color #F15025 + box-shadow 0 0 0 2px rgba(241,80,37,0.1)
- Labels: 11px, weight 500, boven het veld
- Nummervelden (bedragen, telefoon, KVK): DM Mono font

### Badges / Status
- Pill shape: border-radius 99px, padding 3px 10px, font-size 10px, weight 600
- Lichte achtergrond + donkere tekst in modulekleur
- Kleurlogica:
  - Grijs (#EEEEED / #5A5A55) = neutraal/inactief (Concept, Open, Te doen)
  - Flame (#FDE8E2 / #C03A18) = actie nodig (Verstuurd, Verlopen, Revisie)
  - Petrol/groen (#E2F0F0 / #1A535C of #E4F0EA / #2D6B48) = klaar (Goedgekeurd, Betaald, Afgerond)
  - Paars (#EEE8F5 / #5A4A78) = communicatie (Bekeken, Bericht)

### Tabellen
- Headers: 10px uppercase, letter-spacing 0.8px, muted kleur, lichte achtergrond
- Rijen: hover bg-tertiary, transition 150ms, alleen horizontale borders
- 3px kleurstreepje links per rij (modulekleur of spectrum-kleur)
- Filter pills boven de tabel (pill shape, active = donkere bg + bold)
- Bedragen: DM Mono, rechts uitgelijnd
- Geen pagination — infinite scroll met skeleton loading

### Cards
- Achtergrond: #FFFFFF
- Border: 0.5px rgba(0,0,0,0.06)
- Border-radius: 10-12px
- Hover (klikbaar): shadow-md, transition 200ms
- Geen schaduw standaard — clean en vlak

### Toasts
- Positie: rechtsboven
- Verdwijntijd: 4 seconden
- Max 2 tegelijk gestapeld
- Success: petrol/groen vinkje-icoon
- Error: flame uitroepteken
- Tekst: beschrijf wat er is gebeurd, geen woordgrappen

### Dialogen (confirmatie)
- Overlay: bg-black/15 met backdrop-blur-sm
- Card: rounded-xl, centered
- Titel: wat er gaat gebeuren als vraag
- Subtitel: relevante details (bedrag, klantnaam)
- Knoppen: "Nog niet" (ghost) + "Doen" (flame)
- "Doen" alleen hier en bij Daan — nergens anders

---

## 6. Pagina's

### Dashboard
- **Groet**: "Goeiemorgen, [naam]." Bricolage 700, 20px. Eronder: dag + datum + aantal dingen + montages
- **Weer strip**: 5-daags horizontaal, vandaag uitgelicht. Temperatuur, neerslag, wind voor vandaag
- **Stat cards** (4): Openstaand (flame-light), Omzet maand (groen-light), Te factureren (blauw-light), Actieve projecten (petrol-light). DM Mono bedragen, geen borders
- **Daan suggestie**: Petrol balk met proactieve suggestie. Alleen als er iets is. "Doen" knop in flame
- **Widgets** (2x2 grid):
  - Montage vandaag: tijdstip, locatie, teamleden, spectrum-balkje
  - Vandaag: taken/acties met modulekleur-dots en badges
  - Portaal: klantreacties (goedkeuringen, vragen, bekeken)
  - Projecten: voortgangsbalken met spectrum

### Tabellen (offertes, facturen, klanten)
- Filter pills bovenaan
- Kleurstreepje links per rij
- Zoekbalk rechts in filter bar

### Formulieren
- Max-width 520-560px, gecentreerd
- Twee kolommen waar logisch (naam+email, telefoon+KVK)
- Save knop: petrol (opslaan ≠ versturen)

### Daan AI
- FAB rechtsonder: 48x48px, border-radius 14px, petrol bg, chat-icoon wit
- Panel: 340px breed, petrol header, chat interface
- Context cards bij relevante data (offerte, factuur, klant)
- Suggestie chips na elk antwoord (2-3 vervolgacties)
- "Doen" knop alleen bij onomkeerbare acties
- Daan zet emails klaar maar verstuurt nooit zonder bevestiging

### Klantportaal
- White-label: toont bedrijfsnaam gebruiker, niet "Doen."
- Spectrum voortgangsbalk bovenaan (groeit mee met fase)
- Chronologische timeline (nieuwste bovenaan)
- Goedkeuren/revisie knoppen bij actie-items
- Chat onderaan voor vragen
- Mobiel-eerst design

### PDF (offerte/factuur)
- Offerte: spectrum strip bovenaan (4px, flame→petrol)
- Factuur: effen groene strip bovenaan (4px)
- Werkbon: effen terracotta strip
- Logo: "Doen." met punt in ink, bedrijfsnaam eronder
- Typografie: IBM Plex Sans + DM Mono
- Minimale kleur — zwart tekst, grijze labels, gekleurde strip + type-titel
- White-label ready: logo vervangbaar door klant-logo
- Footer: alle bedrijfsgegevens op een rij, lichte achtergrond

### Onboarding
- 3 stappen (geen branche-keuze):
  1. Bedrijfsgegevens
  2. Demo data of schone lei (+ Excel import optie)
  3. Klaar.
- Spectrum strip bovenaan vult zich per stap (flame → petrol)
- Stap 3 zegt "Klaar." met een punt. Geen confetti, geen emojis
- Onder 3 minuten

### Notificaties
- Paneel opent vanuit bel in top nav
- Iconen: letter in modulekleur (P=portaal paars, O=offerte flame, F=factuur groen, K=klant blauw, M=montage terracotta)
- Ongelezen: lichte achtergrond + flame dot rechts
- Klikbaar: navigeert naar het relevante item

### Empty states (eerste gebruik)
- Eerste vier pagina's (dashboard, projecten, offertes, klanten) hebben CTA-knop
- De rest is stiller — vullen zichzelf als je bezig bent
- "Doen" verschijnt op precies 1 plek: "Niks te doen." op de taken pagina
- Voorbeelden:
  - Dashboard: "Schone lei." + "Begin met een klant of een offerte"
  - Offertes: "Nog geen offertes." + "De eerste is altijd het spannendst."
  - Taken: "Niks te doen." + "Taken komen vanzelf als je projecten lopen."
  - Inbox leeg: "Alles gelezen."
- Geen "Welkom bij Doen!", geen uitroeptekens, geen emojis

### "Doen" als woord in de UI
- Staat op exact 2 plekken als knoplabel: confirmatie-dialogen en Daan AI
- Alle andere knoppen zeggen wat ze doen: "Versturen", "Opslaan", "Aanmaken"
- "Niks te doen" bij lege taken is de enige subtiele woordgrap
- Het merk zit in de kleuren en het spectrum, niet in het woord herhalen
- Wie het doorheeft glimlacht. Wie het niet doorheeft merkt niks.

---

## 7. Statussen per module

### Offertes
| Status | Badge kleur | Logica |
|--------|-------------|--------|
| Concept | Grijs | Nog niet verstuurd |
| Verstuurd | Flame | Wacht op klant |
| Bekeken | Paars | Geopend in portaal |
| Goedgekeurd | Petrol | Akkoord |
| Gefactureerd | Groen | Factuur aangemaakt |
| Verlopen | Grijs | Geen reactie |
| Afgewezen | Flame | Klant zegt nee |

### Facturen
| Status | Badge kleur | Logica |
|--------|-------------|--------|
| Concept | Grijs | Nog niet verstuurd |
| Verstuurd | Flame | Wacht op betaling |
| Betaald | Groen | Geld binnen |
| Verlopen | Flame (donkerder) | Over termijn |
| Gecrediteerd | Paars | Creditnota |

### Projecten (volgt het spectrum)
| Status | Spectrum positie | Badge kleur |
|--------|-----------------|-------------|
| Offerte | 0-15% | Flame |
| Goedgekeurd | 15-25% | Donker flame |
| Voorbereiding | 25-40% | Warm paars #9A4070 / #F2E8EF |
| Productie | 40-60% | Paars |
| Montage | 60-80% | Blauw |
| Opgeleverd | 80-95% | Groen |
| Afgerond | 100% | Petrol |

### Werkbonnen
| Status | Badge kleur |
|--------|-------------|
| Open | Grijs |
| In uitvoering | Werkbon-flame |
| Afgetekend | Petrol |

### Taken
| Status | Badge kleur |
|--------|-------------|
| Te doen | Grijs |
| Bezig | Blauw |
| Klaar | Petrol |

### Portaal reacties
| Status | Badge kleur |
|--------|-------------|
| Goedgekeurd | Groen |
| Revisie | Flame |
| Bericht | Paars |

---

## 8. Technische specs

### Animaties
- Hover: 150ms ease
- Page transition: 200ms ease-out
- Toast in: 300ms slide-down, uit: 200ms fade
- Modal: 200ms scale + fade
- Sidebar expand: 200ms ease
- Loading: spectrum shimmer (flame→petrol)
- Geen bounce, geen spring, geen parallax, geen 3D
- Daan FAB: subtiele pulse bij nieuwe suggestie

### Iconen
- Lucide icons, 1.5px stroke, 24px viewbox
- Sidebar: 18px, in modulekleur
- Top nav: 18px, text-secondary
- Altijd outline, nooit gevuld

### Spacing
| Element | Waarde |
|---------|--------|
| Page padding | 20px |
| Card padding | 14-16px |
| Tabelrij hoogte | min 44px |
| Section gap | 16px |
| Input hoogte | 40px desktop, 44px mobiel |
| Sidebar | 72px collapsed, 220px expanded |
| Top nav | 48px hoogte |
| Border-radius cards | 10-12px |
| Border-radius buttons | 6-8px |
| Border-radius badges | 99px (pill) |

### Error handling
- Inline validatie: flame border + foutmelding eronder
- API errors: toast met flame icoon, "Dat ging mis. Probeer het opnieuw."
- Offline: grijze banner bovenaan, geen alarmen
- Geen technische foutmeldingen aan gebruikers

---

## 9. Migratiestrategie: FORGEdesk → Doen

### BELANGRIJK
De huidige app (FORGEdesk) werkt en is live. Elke migratiestap moet:
- De app werkend houden na elke stap
- Getest worden met `npm run build` voor push
- In een eigen Claude Code sessie gedaan worden (nooit alles tegelijk)
- Revertbaar zijn als iets misgaat

### Laag 1 — CSS Tokens + Fonts (nul risico)

**Wat verandert:** Alleen CSS variables en font imports. Geen componenten, geen logica.

**Stappen:**
1. Nieuwe fonts laden: Bricolage Grotesque, IBM Plex Sans, DM Mono (vervang Plus Jakarta Sans)
2. CSS variables updaten in index.css / tailwind.config:
   - Achtergrond: `#F4F3F0` → `#FAFAF8`
   - Accent: amber/oranje → flame `#F15025`
   - Secundair accent: → petrol `#1A535C`
   - Alle pastel tokens → nieuwe modulekleuren
3. Tailwind config: nieuwe kleuren toevoegen (flame, petrol, module kleuren)
4. Test: `npm run build` — moet slagen zonder errors
5. Visuele check: app ziet er anders uit qua kleuren/fonts maar werkt identiek

**Revert:** Eén bestand (index.css of tailwind.config) terugzetten.

### Laag 2 — Tekst en branding (minimaal risico)

**Wat verandert:** Strings. Geen logica, geen componenten.

**Stappen:**
1. "FORGEdesk" → "Doen." overal (titel, sidebar, meta tags, login, register)
2. "Forgie" → "Daan" (chat component, service files, API prompts)
3. Logo component updaten: "D" vierkant + "Doen." tekst
4. Favicon/PWA manifest updaten
5. Test: grep voor "FORGEdesk", "Forgie", "FORGE" — moet leeg zijn

**Revert:** Git diff toont alleen string changes, makkelijk revertbaar.

### Laag 3 — Component styling (per component, getest)

**ELKE STAP IS EEN EIGEN CLAUDE CODE SESSIE.**

**3a. Sidebar**
- Collapsed als standaard (72px)
- Icoon + label layout
- Modulekleur per item
- Active state met 3px indicator
- Groepering (Werk / Planning / Communicatie)

**3b. Top navigation**
- Breadcrumb links
- Cmd+K zoekbalk
- Notificatie-bel
- User avatar
- Verwijder Daan-knop uit top nav (wordt FAB)

**3c. Dashboard**
- Groet met datum en montage-telling
- Weer strip
- Stat cards met modulekleuren
- Daan suggestie balk
- Widgets: montage vandaag, vandaag taken, portaal activiteit, projecten voortgang

**3d. Tabellen**
- Filter pills
- 3px kleurstreepje links
- DM Mono bedragen
- Badge styling

**3e. Formulieren**
- Max-width centreren
- Petrol focus ring
- Flame error state
- DM Mono nummervelden

**3f. Badges overal**
- Nieuwe statuskleuren per module toepassen
- Pill shape consistent maken

**3g. Toasts en notificaties**
- Toast styling (rechts boven, 4sec)
- Notificatiepaneel met modulekleur-iconen

**3h. Empty states**
- Per pagina de juiste copy
- CTA knoppen op eerste vier pagina's

### Laag 4 — Nieuwe features (apart van migratie)

Deze features bestaan nog niet en worden NA de migratie gebouwd:

**4a. Spectrum voortgangsbalken**
- Projectkaarten: kleurstrip die meegroeit
- Project detail: gradient strip bovenaan
- Dashboard: mini voortgangsbalken

**4b. Factuur aging spectrum**
- Omgekeerd spectrum op factuur-lijst
- Dashboard widget

**4c. Daan panel redesign**
- Context cards met live data
- Suggestie chips
- Proactieve modus

**4d. Klantportaal spectrum**
- Voortgangsbalk voor klant
- Timeline redesign

**4e. PDF redesign**
- Spectrum strip op offertes
- Nieuwe typografie
- White-label logo

**4f. Onboarding redesign**
- 3 stappen (zonder branche)
- Spectrum voortgang

---

## 10. Modules die NIET in gebruik zijn

De volgende modules bestaan in de codebase maar worden niet actief gebruikt. Niet aanraken bij de migratie:

- Voorraad
- Uitgaven
- Bestelbonnen
- Leveringsbonnen
- Nacalculatie
- Leads
- Nieuwsbrieven

---

## 11. Design principes

1. **Warm, niet koud.** Achtergrond is off-white, borders zijn zand, schaduwen zijn warm getint
2. **Scanbaar in 2 seconden.** Een monteur op de bouwplaats met een iPhone moet direct zien wat de status is
3. **Flame doet, Petrol vertrouwt.** Oranje = actie, petrol = betrouwbaarheid
4. **DM Mono voor alle getallen.** Bedragen, datums, nummers — altijd monospace
5. **Geen feature-bloat.** Moderne UI is een gratis voordeel. Niet verpesten met overbodige elementen
6. **Geen emojis.** Gebruik modulekleuren en typografie voor persoonlijkheid
7. **Het spectrum vertelt het verhaal.** Van flame (begin) naar petrol (klaar). Overal.
