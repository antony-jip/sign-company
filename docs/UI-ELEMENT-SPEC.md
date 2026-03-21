# DOEN. — UI Element Specificatie

> Dit document beschrijft EXACT hoe elk UI-element eruitziet. Geen interpretatie, geen variatie. Claude Code leest dit en past het letterlijk toe.

---

## 1. BORDER RADIUS — Overal consistent

| Element | Radius | Tailwind |
|---------|--------|----------|
| Cards / widgets | 12px | rounded-xl |
| Buttons | 8px | rounded-lg |
| Inputs / selects | 8px | rounded-lg |
| Badges / pills | 99px | rounded-full |
| Status dropdowns | 8px | rounded-lg |
| Modals / dialogs | 16px | rounded-2xl |
| Icoon-cirkels (page header) | 12px | rounded-xl |
| Sidebar items | 8px | rounded-lg |
| Filter pills | 99px | rounded-full |
| Toast notificaties | 12px | rounded-xl |
| FAB knoppen | 14px | rounded-[14px] |
| Tabel rijen | 0px | rounded-none |
| Avatars | 50% | rounded-full |

**REGEL:** Geen mix van scherp en rond op dezelfde pagina. Cards zijn ALTIJD rounded-xl. Knoppen zijn ALTIJD rounded-lg. Badges zijn ALTIJD rounded-full.

---

## 2. PAGE HEADERS — Elke module-pagina

Structuur:
```
[Icoon cirkel 48px] [Titel + subtitel]                    [Primaire actie knop]
```

| Element | Specificatie |
|---------|-------------|
| Icoon cirkel | 48x48px, rounded-xl (12px), achtergrond module-light, icoon in module-DEFAULT kleur, Lucide 22px |
| Titel | Bricolage Grotesque 700, 24px, ink (#191919), letter-spacing -0.8px |
| Subtitel | IBM Plex Sans 400, 13px, text-sec (#5A5A55) |
| Actie knop | Achtergrond module-DEFAULT, wit tekst, rounded-lg, padding 10px 20px, weight 600 |

Per module:

| Module | Icoon bg | Icoon kleur | Knop bg |
|--------|----------|-------------|---------|
| Projecten | #E2F0F0 | #1A535C | #1A535C |
| Offertes | #FDE8E2 | #F15025 | #F15025 |
| Facturen | #E4F0EA | #2D6B48 | #2D6B48 |
| Klanten | #E5ECF6 | #3A6B8C | #3A6B8C |
| Planning | #F2E8E5 | #9A5A48 | #9A5A48 |
| Werkbonnen | #FAE5E0 | #C44830 | #C44830 |
| Taken | #EEEEED | #5A5A55 | #5A5A55 |
| Email | #EEE8F5 | #6A5A8A | #6A5A8A |

---

## 3. STAT BADGES (bovenaan lijstpagina's)

De gekleurde badges onder de page header ("8 actief", "1 te factureren", etc.)

| Element | Specificatie |
|---------|-------------|
| Vorm | Pill, rounded-full |
| Padding | 6px 14px |
| Font | IBM Plex Sans 500, 12px |
| Border | 1px solid |
| Achtergrond | Wit (#FFFFFF) |
| Icoon | Lucide 14px, links van tekst |

Kleur per type:
| Type | Border + icoon + tekst kleur |
|------|------------------------------|
| Actief / open | #1A535C petrol |
| Te factureren | #3A6B8C blauw |
| Verlopen / te laat | #F15025 flame |
| Afgerond / betaald | #2D6B48 groen |
| Verstuurd | #F15025 flame |
| Concept | #5A5A55 grijs |

---

## 4. FILTER PILLS

De rij met filterknoppen ("Alle 16", "Actief 8", "Gepland 6", etc.)

| Element | Specificatie |
|---------|-------------|
| Vorm | Pill, rounded-full |
| Padding | 6px 14px |
| Font | IBM Plex Sans 500, 12px |
| Teller | DM Mono 500, 11px, zelfde kleur als tekst |
| Inactief | Achtergrond transparant, tekst text-sec (#5A5A55), border geen |
| Actief | Achtergrond ink (#191919), tekst wit (#FFFFFF) |
| Hover (inactief) | Achtergrond warm (#F4F2EE) |
| Gap | 4px tussen pills |

**"Dagen open" filter rij** — zelfde stijl als de hoofdfilter, maar:
- Label "Dagen open:" in 12px, text-sec, voor de pills
- Actieve pill: achtergrond ink, tekst wit (zelfde als boven)

---

## 5. STATUS BADGES (in tabelrijen)

| Element | Specificatie |
|---------|-------------|
| Vorm | Pill, rounded-full |
| Padding | 4px 12px |
| Font | IBM Plex Sans 600, 11px |
| Geen dropdown pijl | De badge is GEEN select/dropdown. Het is een label. |

Als de status WEL bewerkbaar moet zijn, gebruik dan een apart icoon (ChevronDown, 12px) NAAST de badge, niet erin.

Kleuren per status — zie docs/DESIGN-SYSTEM.md sectie 7. Samenvatting:

| Status | Achtergrond | Tekst |
|--------|-------------|-------|
| Concept | #EEEEED | #5A5A55 |
| Actief / Bezig | #E2F0F0 | #1A535C |
| Gepland | #E2F0F0 | #1A535C |
| Verstuurd | #FDE8E2 | #C03A18 |
| Goedgekeurd | #E2F0F0 | #1A535C |
| Te factureren | #E4F0EA | #2D6B48 |
| Betaald | #E4F0EA | #2D6B48 |
| Verlopen | #FDE8E2 | #C03A18 |
| Afgerond | #E2F0F0 | #1A535C |
| Afgewezen | #FDE8E2 | #C03A18 |

---

## 6. PRIORITY BADGES

| Prioriteit | Weergave |
|-----------|----------|
| Urgent | NIET tonen als badge. Toon een flame dot (8px, #F15025) links van de rij |
| Hoog | Flame dot (8px, #F15025) |
| Medium | NIET tonen. Medium is de default — het voegt niks toe |
| Laag | NIET tonen |

**Regel:** Verwijder alle "Medium" en "Low" priority badges uit de interface. Ze zijn ruis. Alleen "Urgent" en "Hoog" worden zichtbaar gemaakt, en dan als een dot — niet als tekst-badge.

---

## 7. TABELRIJEN

| Element | Specificatie |
|---------|-------------|
| Rij hoogte | Minimaal 56px (voldoende voor 2 regels tekst) |
| Padding | py-3 px-4 |
| Border | Alleen border-bottom 0.5px sand (#E6E4E0) |
| Hover | Achtergrond warm (#F4F2EE), transition 150ms |
| Kleurstreepje links | 3px breed, module-DEFAULT kleur, volle hoogte, border-radius 0 |
| Cursor | pointer (hele rij klikbaar) |
| Checkbox | 18x18px, rounded-md (6px), border sand |

### Kolom styling
| Kolom type | Font | Kleur | Uitlijning |
|-----------|------|-------|-----------|
| Titel/naam | IBM Plex Sans 500, 13px | ink (#191919) | links |
| Subtitel/beschrijving | IBM Plex Sans 400, 12px | text-sec (#5A5A55) | links |
| Referentienummer | DM Mono 400, 12px | muted (#A0A098) | links |
| Klant | IBM Plex Sans 400, 13px | ink | links |
| Bedrag | DM Mono 500, 13px | ink | rechts |
| Datum | DM Mono 400, 12px | muted (#A0A098) | rechts |
| Dagen open | DM Mono 600, 12px | spectrum-kleur (aging) | rechts |
| Team | IBM Plex Sans 400, 12px | text-sec | links |
| Status | Badge (zie sectie 5) | — | links |

### Tabel headers
| Element | Specificatie |
|---------|-------------|
| Font | IBM Plex Sans 500, 10px, uppercase, letter-spacing 0.8px |
| Kleur | muted (#A0A098) |
| Achtergrond | warm (#F4F2EE) |
| Padding | py-2 px-4 |
| Border | border-bottom 0.5px sand |
| Sorteer icoon | ArrowUpDown (Lucide), 12px, muted |

---

## 8. SPECTRUM BALKJES (onder projectnamen in tabel)

| Element | Specificatie |
|---------|-------------|
| Hoogte | 3px |
| Breedte | 80px (vast, niet percentage) |
| Border-radius | 2px |
| Achtergrond (leeg deel) | sand (#E6E4E0) |
| Vulling | Spectrum gradient, breedte = percentage van project voortgang |
| Gradient | linear-gradient(90deg, #F15025 0%, #D4453A 18%, #9A4070 38%, #6A5A8A 50%, #3A6B8C 65%, #2D6B48 80%, #1A535C 100%) |
| Positie | Direct onder de projectnaam, geen extra spacing |

---

## 9. CARDS / WIDGETS

| Element | Specificatie |
|---------|-------------|
| Achtergrond | #FFFFFF |
| Border | 0.5px sand (#E6E4E0) |
| Border-radius | 12px (rounded-xl) |
| Schaduw | Geen (clean en vlak) |
| Padding | 16px |

### Widget header (in card)
| Element | Specificatie |
|---------|-------------|
| Titel | IBM Plex Sans 600, 14px, ink |
| Link rechts | IBM Plex Sans 400, 12px, muted, hover: ink |
| Resize icoon | Lucide Columns/Maximize2, 14px, muted, alleen zichtbaar op hover |
| Border-bottom | 0.5px sand, alleen als er content onder zit |

---

## 10. STAT CARDS (dashboard)

| Element | Specificatie |
|---------|-------------|
| Border-radius | 12px (rounded-xl) |
| Padding | 16px |
| Border | GEEN |
| Schaduw | GEEN |
| Achtergrond | module-light kleur |

| Element in card | Specificatie |
|----------------|-------------|
| Label | IBM Plex Sans 600, 10px, uppercase, letter-spacing 1px, module-text kleur |
| Waarde | DM Mono 700, 24px, module-text kleur, letter-spacing -0.5px |
| Subtekst | IBM Plex Sans 400, 11px, module-text kleur, opacity 0.7 |

---

## 11. BUTTONS

| Type | Achtergrond | Tekst | Border | Gebruik |
|------|-------------|-------|--------|---------|
| Primair (module) | module-DEFAULT | wit | geen | Hoofdactie per pagina |
| Flame (onomkeerbaar) | #F15025 | wit | geen | "Doen", versturen |
| Petrol (opslaan) | #1A535C | wit | geen | Opslaan, bewaren |
| Ghost | transparant | text-sec | 0.5px sand | Annuleren, secundair |
| Destructive | #FDE8E2 | #C03A18 | geen | Verwijderen (zacht, niet alarmerend) |

Alle knoppen: rounded-lg (8px), padding 8px 18px, font 13px weight 600, transition 150ms.
Hover: iets donkerder achtergrond.

---

## 12. INPUTS

| Element | Specificatie |
|---------|-------------|
| Achtergrond | warm (#F4F2EE) |
| Border | 0.5px sand (#E6E4E0) |
| Border-radius | 8px (rounded-lg) |
| Hoogte | 40px |
| Font | IBM Plex Sans 400, 13px, ink |
| Placeholder | muted (#A0A098) |
| Focus | border-color #1A535C + box-shadow 0 0 0 2px rgba(26,83,92,0.12) |
| Error | border-color #F15025 + box-shadow 0 0 0 2px rgba(241,80,37,0.1) |
| Nummervelden | DM Mono 400, 13px |
| Label | IBM Plex Sans 500, 11px, text-sec, boven het veld, mb-1.5 |

---

## 13. DROPDOWN / SELECT

| Element | Specificatie |
|---------|-------------|
| Trigger | Zelfde als input (achtergrond warm, border sand, rounded-lg, 40px) |
| Chevron | ChevronDown, 14px, muted |
| Dropdown panel | Achtergrond #FFF, border 0.5px sand, rounded-xl (12px), schaduw 0 4px 16px rgba(0,0,0,0.08) |
| Item | Padding 8px 12px, font 13px, hover achtergrond warm |
| Geselecteerd item | Font weight 600, petrol kleur |

---

## 14. ZOEKBALK

| Element | Specificatie |
|---------|-------------|
| Achtergrond | warm (#F4F2EE) |
| Border | 0.5px sand (#E6E4E0) |
| Border-radius | 8px |
| Hoogte | 36px |
| Icoon links | Search (Lucide), 16px, muted |
| Placeholder | "Zoeken..." in muted |
| Keyboard hint (Cmd K) | DM Mono 10px, achtergrond #FFF, border sand, rounded-md, padding 2px 6px |

---

## 15. PAGE ACHTERGROND EN SPACING

| Element | Specificatie |
|---------|-------------|
| Pagina achtergrond | #FAFAF8 (bg) |
| Content padding | 24px |
| Gap tussen page header en content | 20px |
| Gap tussen filter bar en tabel | 12px |
| Gap tussen stat badges en filter bar | 16px |
| Gap tussen widgets (dashboard grid) | 16px |

---

## 16. REGEL: GEEN VIERKANTE ELEMENTEN

Als een element op het scherm een scherpe hoek heeft (border-radius 0) en het is NIET een tabelrij of het kleurstreepje links, dan klopt het niet. Alles heeft afgeronde hoeken volgens de tabel in sectie 1.

Uitzonderingen:
- Tabelrijen (geen radius)
- Kleurstreepje links in tabelrijen (geen radius)
- Dividers / borders (geen radius)

---

## 17. REGEL: GEEN "MEDIUM" BADGES

Prioriteit "Medium" wordt NERGENS getoond. Het is de default en voegt geen informatie toe. Verwijder alle Medium badges. Alleen "Urgent" en "Hoog" zijn zichtbaar, als een kleurde dot — niet als tekst.
