---
name: doen-design
description: DOEN design system — Linear/Notion-inspired minimal UI for creative tradespeople. Use when modifying any visual styling, colors, typography, spacing, components, layout, or UI feel in the forgedesk/ app.
---

# DOEN Design System

App heet "doen." — AI-assistent heet "Daan". Nooit "FORGEdesk" of "Forgie".
Referentie: Linear (precisie), Notion (witruimte), Stripe (data-elegantie).

## Kleuren

| Token | Hex | Gebruik |
|-------|-----|---------|
| Flame | `#F15025` | De punt, CTA's, urgente badges. Max 3-5 per scherm. |
| Petrol | `#1A535C` | Sidebar bg, heading accenten, links, active states. |
| Pagina bg | `#F8F7F5` | Warm off-white. Nooit koud wit. |
| Card bg | `#FFFFFF` | Met shadow `rgba(0,0,0,0.03)`, geen border. |
| Tekst | `#1A1A1A` | Primair. `#6B6B66` secundair. `#9B9B95` tertiair. |
| Borders | `#EBEBEB` | Bijna onzichtbaar. Liever spacing dan borders. |

NOOIT: `gray-50/100/200`, `bg-white`, `shadow-sm/md/lg`, `border-gray-*`.

### Module kleuren
Projecten=`#1A535C`, Offertes=`#F15025`, Facturen=`#2D6B48`, Klanten=`#3A6B8C`, Planning=`#9A5A48`, Werkbonnen=`#C44830`, Taken/Team=`#5A5A55`, Email/Portaal=`#6A5A8A`.

## De Flame Punt

**Het belangrijkste visuele element.** Elke status eindigt met Flame punt:
`Gepland.` `Verstuurd.` `Betaald.` `Opgeleverd.` `Gedaan.`

```tsx
<span>Gepland</span><span className="text-[#F15025]">.</span>
```

Statussen als tekst + punt, NIET als gekleurde pill badges.

| Status | Kleur | Bg (optioneel, 5% opacity) |
|--------|-------|---------------------------|
| concept/gepland | `#8A7A4A` | `#F5F2E8` |
| verstuurd/in_uitvoering | `#3A5A9A` | `#E8EEF9` |
| goedgekeurd/betaald/opgeleverd | `#3A7D52` | `#E8F2EC` |
| verlopen/afgewezen | `#C0451A` | `#FDE8E4` |

## Typografie

- **Headings**: weight 700-800, -0.3px tracking, 28-32px paginatitels
- **Body**: 14px, weight 400-500, line-height 1.55
- **Nummers/bedragen/codes**: `font-mono` (DM Mono) ALTIJD
- **Kolomheaders**: 11px, uppercase, `tracking-wider`, `#9B9B95`
- **Paginatitels**: groot, bold, `#1A1A1A`. Geen icoon ervoor.

## Layout — Linear/Notion Stijl

**Witruimte:** Page `px-8 py-6`. Secties `space-y-8`. Tabelrijen `py-4`. Cards `p-6`+.

**Minder borders, meer spacing.** Scheidt met ruimte, niet lijnen. NOOIT verticale tabel-borders.

**Tabellen:** Geen verticale lijnen, geen zebra. Horizontaal `border-[#EBEBEB]`. Veel padding `py-4`. Hover `bg-[#F8F7F5]`. Status als tekst + Flame punt.

**Filters als tekst-links.** Active: `font-semibold #1A1A1A`. Inactive: `#9B9B95`.
**"Nieuw..." acties**: Flame tekst-link, niet grote button. Max 1 primaire CTA per scherm.
**Zoekbalk**: minimaal — `border-b` of subtiele bg, geen border rondom.

## Componenten

**Buttons:** Primary=Flame bg (max 1/scherm). Secondary=transparant+Petrol. Liever tekst-link dan knop.
**Inputs:** Border `#EBEBEB` of bg `#F8F7F5`. Focus: Petrol ring. `rounded-lg`.
**Cards:** Wit, geen border, shadow `rgba(0,0,0,0.03)`, `rounded-xl`. Hover: shadow groeit.
**Modals:** `rounded-2xl`, `p-8`, overlay `bg-black/20 backdrop-blur-sm`.
**Sidebar:** Petrol bg, wit tekst, "doen." logo, Flame punt. Active=witte overlay+Flame accent.
**Empty states:** Tekst + tekst-link. Geen illustraties.

## Anti-patronen

GEEN `bg-white` / `border-gray-*` / `text-gray-*` / `shadow-sm/md/lg` / gekleurde pills / dikke knoppen / icoon-first / onnodige borders / "FORGEdesk" / "Forgie" / emojis / nieuwe npm packages.

## Filosofie

> "De beste interface is de interface die je niet opvalt."

Het verschil zit in wat je WEGLAAT.
