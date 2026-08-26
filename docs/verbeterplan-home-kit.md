# Verbeterplan doen.team, na analyse van kit.com

Datum: 26 aug 2026. Bron: live doen.team + kit.com homepage, nav, footer.
Canon blijft `DESIGN.md`. Dit doc gaat over *indeling*, niet over stijl.

---

## 1. Wat kit.com structureel doet dat doen. niet doet

| # | Kit | doen. nu |
|---|-----|----------|
| 1 | Klantbewijs staat **in de hero** (foto + naam + functie, "TRUSTED BY") en daarna nog 3 hele secties: 30 gezichten in een marquee, 9 quotes, 2 grote cijfers | Nul klantbewijs. Geen naam, geen gezicht, geen quote, geen logo |
| 2 | Alles hangt aan **4 werkwoorden**: GROW / SEND / AUTOMATE / EARN. Terug in het megamenu, in de hero-bento, in de featuresecties en in de footer | Alles hangt aan **11 module-zelfstandignaamwoorden**. Een inventaris, geen belofte |
| 3 | 5 afwisselende secties, elk: één UI-shot in een gekleurd paneel + één kop + één zin met het resultaat **vet** | Eén demoblok waar het hele product in geperst zit, daarna een tekstlijst |
| 4 | Twee CTA-snelheden overal: "Start free trial" **en** "Request a demo" | Alleen "Start gratis". "Demo" in de nav is een klikdemo, geen afspraak |
| 5 | "Use Cases" is een **nav-item** met 10 doelgroepen, plus een megamenu-kolom, plus een footerkolom | 4 vertical-pagina's, alleen in de footer |
| 6 | 7 vergelijkingspagina's in de footer (Mailchimp vs Kit, Substack vs Kit, ...) | Geen enkele vergelijkingspagina |
| 7 | Eén nieuw ding krijgt een **spotlight-blok**: donkere kaart, badge, 3 bullets, dubbele CTA. Twee keer op de home (Subscriber Signals, Kit MCP) | Daan en Studio zijn één regel in een lijst van elf |
| 8 | Feature-index van 16 cellen vlak boven de footer, ná het vertrouwen | Module-index staat op positie 6, vóór de prijs |

## 2. De home nu, naast de home van kit

```
doen.team                          kit.com
1 Hero (petrol, foto onzichtbaar)   1 Hero + klant in beeld
2 Manifest "Kijk om je heen"        2 Bento met 4 werkwoord-beloftes
3 Demo (klikbare app)               3 Bewijsmuur: 30 namen + gezichten
4 "Wij draaien er zelf op" + 3 cij  4 Spotlight nieuw ding (donker)
5 Elf modules (hairline-lijst)      5..9 Vijf afwisselende beloftesecties
6 Prijs                             10 Spotlight twee (donker)
7 FAQ                               11 Feature-index, 16 cellen
8 Flame-CTA                         12 App-ecosysteem
                                    13 Quote-muur, 9 stuks
                                    14 Oprichtersverhaal + 2 cijfers
                                    15 Slot-CTA
```

Kit bouwt eerst vertrouwen en verkoopt daarna. doen. legt eerst het product uit
en vraagt daarna vertrouwen. Dat is de kern van het verschil.

## 3. Voorgestelde nieuwe home-indeling

1. **Hero** (blijft). Foto-fix, zie §7. Microcopy uitbreiden naar
   `30 dagen gratis · geen creditcard · wij zetten je gegevens erover`.
   Tweede CTA wordt "Plan een rondleiding", niet "Kijk hoe een klus loopt".
2. **Bewijsstrook direct onder de hero.** Nu geen klanten? Dan het eerlijke
   equivalent: gezicht + naam + "Sign Company, signbedrijf sinds 1983, draait
   er elke dag op". Dat is nu tekst op positie 4 zonder gezicht. Naar boven,
   met foto uit `public/images/fotos`.
3. **Manifest** (blijft, ongewijzigd). Dit is doen.'s sterkste blok.
4. **Vier werkwoord-secties**, afwisselend links/rechts, elk met een bestaande
   moduleloop uit `public/videos/`:
   `Binnenhalen.` (aanvraag, offerte, portaal) ·
   `Plannen.` (planning, taken) ·
   `Maken.` (werkbonnen, studio) ·
   `Factureren.` (facturen, inkoop, Exact).
   Eén kop, één zin, één video. Geen nieuwe assets nodig.
5. **Spotlight Daan.** Donkere kaart, Beta-badge in de bestaande stijl uit
   `Modules.tsx`, drie bullets, CTA naar `/features/geheugen`.
6. **Demo** (blijft, verplaatst naar hier). Na de belofte, niet ervoor.
7. **Module-index** als icoon-raster i.p.v. hairline-lijst, verplaatst naar
   vlak boven de footer. Dekking bewijzen, niet uitleggen.
8. **Prijs** (blijft).
9. **FAQ** (blijft).
10. **Slot-CTA** (blijft), met dezelfde dubbele CTA als de hero.

## 4. Buiten de home

- **Nav.** "Voor wie" ernaast zetten, met de 4 verticals. `Product` megamenu
  hergroeperen onder dezelfde vier werkwoorden i.p.v. één lijst van elf.
  "Kennisbank" uit de footer naar de nav (20 artikelen die nu geen crawlpad
  hebben).
- **Vergelijkingspagina's.** Hoogste SEO-rendement, laagste concurrentie in NL.
  Kandidaten in volgorde van zoekvolume-gevoel: Excel + WhatsApp, Moneybird,
  Teamleader, Gripp, Simplicate, Jortt, e-Boekhouden. Sjabloon: waar het
  alternatief goed in is, waar het stukloopt bij een signklus, wat doen. anders
  doet. Eindigt in contact, niet in besteltaal.
- **Tweede CTA-spoor.** "Plan een rondleiding" naar antony@signcompany.nl of
  een boekingslink. Voor een eigenaar op een steiger is 30 minuten schermdelen
  waarschijnlijk een kortere weg dan een proefaccount.

## 5. Prioriteit

| Wat | Moeite | Opbrengst | Risico |
|-----|--------|-----------|--------|
| Hero-foto zichtbaar maken | 15 min | Hoog | Geen |
| Bewijsstrook met gezicht onder de hero | Halve dag | Hoog | Geen |
| Tweede CTA "Plan een rondleiding" | 1 uur | Hoog | Geen |
| "Voor wie" + "Kennisbank" in de nav | 1 uur | Middel | Geen |
| Vier werkwoord-secties met bestaande video's | 1 dag | Hoog | Home wordt langer |
| Megamenu hergroeperen op werkwoorden | Halve dag | Middel | Raakt elke pagina |
| Spotlight Daan | Halve dag | Middel | Geen |
| Module-index naar onder + icoonraster | 2 uur | Laag | Geen |
| Vergelijkingspagina's, 3 stuks om te beginnen | 2 dagen | Hoog, traag | Geen |

## 6. Wat NIET overnemen van kit

- **Eyebrow-labels.** Kit gebruikt "OVERVIEW", "NEW", "EARLY ACCESS". Het oude
  doen.-eyebrow-canon is vervallen en mag niet terug. Gebruik het bestaande
  badge-patroon uit `Modules.tsx` (flame-rand, 11px).
- **Pastelpanelen.** Kit haalt ritme uit blauw/lila/perzik/groen. Bij doen.
  draagt petrol. Het ritme moet uit **foto's** komen, niet uit kleurvlakken.
  Er liggen 44 foto's in `public/images/fotos`, de home gebruikt er één.
- **Beroemdheden-muur.** Onhaalbaar en ongeloofwaardig in deze markt. Eén
  echte signmaker met naam en bedrijf is meer waard dan dertig gezichten.
- **App-ecosysteem-sectie.** doen. heeft Exact en Mollie. Dat is een regel,
  geen sectie.
- **Roterend woord in de kop.** Beweging boven de vouw, botst met het canon.

## 7. Losse bevinding: de hero-foto is onzichtbaar

`src/components/home/Hero.tsx` legt drie lagen over de foto: een petrol-multiply
op 0.3, een lineair verloop van 0.92 naar 0.22, en een radiale lichtval. Op
1243px breed leest de rechterhelft als vlak petrol. De foto laadt wel (live 200,
`hoogwerker-aan-de-gevel-breed.webp`), maar je ziet hem niet. De hele
trots-ronde van 20 aug hangt aan dat beeld.

Fix: het verloop eerder laten uitdoven (rechts naar 0.05 i.p.v. 0.22), de
multiply-laag naar 0.15, en de radiale lichtval alleen over de linkerhelft.
Daarna zelf in de browser controleren, niet op de code afgaan.
