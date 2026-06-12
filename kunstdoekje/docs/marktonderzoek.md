# Marktonderzoek — Kunstdoekje.nl

> Onderzoek t.b.v. de migratie van kunstdoekje.nl (WordPress/WooCommerce → Next.js
> + Supabase + Mollie op Vercel). Doel: positionering, prijsmodel, categorie-
> structuur, configurator-features, content/SEO en het zakelijk segment
> onderbouwen met marktdata.
>
> **Datum:** juni 2026 · **Methode:** 6 parallelle research-agents (fan-out
> web search), per bevinding gemarkeerd op betrouwbaarheid.
>
> **Belangrijke kanttekening:** veel concurrent-sites blokkeren geautomatiseerd
> ophalen (HTTP 403), dus diverse prijzen/teksten komen uit zoekresultaat-
> snippets en zijn **indicatief** — verifieer concrete prijspunten handmatig op
> de live-sites vóór definitieve prijszetting. Marktomvang-cijfers komen grotendeels
> van commerciële vendors met uiteenlopende definities: vertrouw op de
> **groeirichting (CAGR)**, niet op de absolute miljardenbedragen.

---

## 0. Managementsamenvatting — 7 kernconclusies

1. **Het wisseldoek-concept commoditiseert.** Minstens 8+ NL-spelers bieden
   "aluminium frame + verwisselbaar textieldoek" (Werk aan de Muur/ArtFrame als
   marktleider, plus Murale, KunstOpDoek, Canvas Company, Wallstars, XL Wall Art,
   Sfeer aan de Muur, JEU, Laroid). **Differentiatie zit niet meer in het
   mechaniek**, maar in positionering, prijs, personalisatie en het zakelijk spoor.
2. **Drie differentiatie-assen winnen:** (a) **eigen-foto personalisatie**,
   (b) **zakelijk/horeca + akoestiek**, (c) **prijstransparantie** (los-doek-prijs
   tonen). Kunstdoekje moet op minstens twee hiervan scherp zijn.
3. **Het prijsmodel "prijs = formaat + stof + lijst" (print is gratis variabel)
   is marktconform** en al in de backend verankerd. De markt bevestigt de
   los-doek vs. met-frame splitsing als kern van het wisselmodel (KunstOpDoek:
   80×80 los ≈ €112,50 / mét frame ≈ €197,50).
4. **B2B is een serieus, onderbenut segment** met sterke koopmotieven (branding,
   welzijn/productiviteit, akoestiek, healing environment) én een NL-specifiek
   **fiscaal voordeel bij kunst-huur** — dat rechtvaardigt een huur-/abonnements-
   spoor. Inkoop loopt via offerte/maatwerk (al ondersteund via `quote_requests`).
5. **Visualisatie is dé conversie-hefboom.** Home decor converteert structureel
   laag (~1,3%); room-visualisatie / "bekijk op je muur" / AR + lifestyle-mockups
   pakken het kernprobleem (afmeting/sfeer inschatten) direct aan.
6. **SEO-winst zit in de categoriematrix** kamer × stijl × kleur × thema, met
   sterke image-SEO. Daar ligt het long-tail volume met lage concurrentie.
7. **Duurzaamheid mag NIET vaag geclaimd worden.** Vanaf sep 2026 verbiedt de EU
   (EmpCo-richtlijn) termen als "duurzaam/milieuvriendelijk/groen" zonder
   gecertificeerde onderbouwing; de ACM handhaaft dit nu al. Claim rPET/velvet
   **feitelijk en specifiek** ("X% gerecycled PET, op bestelling geprint in NL"),
   nooit generiek.

---

## 1. Markt & trends (2024–2026)

### Marktomvang (indicatief — vertrouw op de richting, niet het bedrag)
- **Wall art wereldwijd:** ~$60–68 mld (2024–2025), CAGR **6–8,5%**
  (Fortune Business Insights, Market.us, Cognitive). *Betrouwbaarheid: laag-midden,
  vendor-bronnen met optimistische aannames.*
- **Wall decor wereldwijd:** ~$64,7 mld (2024) → $103,4 mld (2034), CAGR ~4,8%
  (Market.us). *Laag-midden.*
- **Print-on-demand (POD):** $10–12 mld (2025), CAGR **~23–26%** — het meest
  robuuste signaal (twee gevestigde firma's, Mordor + Grand View, convergeren).
  Wall art/home décor wordt genoemd als snelst groeiend POD-segment. *Midden.*
- **Een zuivere "canvas prints"-marktomvang bestaat niet** als betrouwbaar losse
  reeks — rapporten mengen canvas met bredere wall art. *Datagat.*

### Nederland / Europa (sterkste regionale bronnen)
- **InRetail Branchevisie Wonen 2025** (NL brancheorganisatie — *hoog betrouwbaar*):
  e-commerce woonproducten **€2,1 mld in 2023 (+18% j-o-j)**; online-aandeel
  **~19% van omzet, ~28% van het aantal aankopen** (kleinere/decoratieve items
  worden relatief vaker online gekocht → gunstig voor wanddecoratie). Markt −7%
  in 2024, voorzichtig herstel 2025; recordaantal woningverkopen (~239k) stuwt.
- **CBI / RVO (Nederlandse overheid — *hoog betrouwbaar*):** 55% van consumenten
  vindt duurzaam geproduceerde home-decor belangrijk (tot 60% bij 25–34 jaar);
  NL + Duitsland genoemd als EU-koplopers in duurzame home decor.
- NL home decor breed: ~$8,2 mld (2025), CAGR ~4% (IMARC, vendor — *laag-midden*).

### Trends die het concept direct ondersteunen
- **Personalisatie/eigen foto** = snelst groeiende POD- én cadeau-categorie
  (foto-segment ~44% van gepersonaliseerde cadeaus).
- **Gallery walls + "mindful maximalism"** (gecureerde, persoonlijke muren) —
  past perfect bij meerdere/verwisselbare doeken.
- **Warme, aardse paletten 2026** (terracotta, bosgroen, chocoladebruin, roest,
  mosterd) en **biophilic design** → natuur/botanische motieven scoren.

---

## 2. Concurrentie-analyse (NL/BE)

### Directe concurrenten — verwisselbaar doek-in-frame

| Speler | Positionering / USP | Materiaal & frame | Prijs (indicatief) | Personalisatie | Zakelijk | Zwakte |
|---|---|---|---|---|---|---|
| **Werk aan de Muur — ArtFrame** | Marktleider; kunstenaarsplatform, grootste collectie; omruilgarantie 30 dgn | Textieldoek (akoestische optie van rPET), alu-frame zwart/wit/zilver/goud; tot 15×3 m | ArtFrame-prijzen **niet publiek geverifieerd** | Minder foto-gericht | Beperkt | Lange levertijd (7–9 dgn); minder eigen-foto/B2B |
| **Murale** | Premium "mooier dan canvas"; horeca-collectie | Decotex polyester, 27 mm alu-wandframe; zwart/wit/zilver | **Geen prijzen op site** (op aanvraag) | Ja (nabestellen) | Ja, expliciet horeca | **Geen prijstransparantie** = drempel |
| **KunstOpDoek.nl** | "Betaalbare kunst, thuis of op kantoor"; manifest schoonheid/gemak | Elastisch polyester wisseldoek, wasbaar, opvouwbaar; op maat tot 6×3 m | **Transparant:** 80×80 los ≈ **€112,50**, mét frame ≈ **€197,50**; gratis vanaf €90 | Ja, eigen foto XL | Ja ("op kantoor") | Kleiner merk/collectie |
| **XL Wall Art** | "Swipe your design"; betaalbare fotokunst | Alu-frame + siliconenpees, foto-gericht | Niet geverifieerd | Ja sterk | — | Weinig publieke info/merk |
| **Overig** | Sfeer aan de Muur, Canvas Company (Art Frame, 2000+ designs), Wallstars (zakelijk/horeca), PrintYourMoment (akoestisch), JEU, Laroid, Company7 | Vergelijkbare alu-frame + textieldoek | — | wisselend | wisselend | concept commoditiseert |

### Indirecte concurrenten — posters / canvas / foto-op-materiaal
- **Desenio / Poster Store:** Scandinavisch, trendy posters + lijsten; sterk op
  social/gallery walls; poster 30×40 ≈ €12, gepersonaliseerd 50×70 ≈ €44,95.
  Geen wisselsysteem.
- **IXXI:** modulair kliksysteem van kunststof-tegels; vanaf €29,95 (40×60); uniek
  maar zichtbare naden, geen textiel/canvas-premium.
- **Albelli / Fotofabriek:** massa-fotoservices, 100% eigen foto, vanaf €14,99;
  geen wisselsysteem, commodity-canvas.

### Benchmark-prijzen wissellijst (fotogeschenk.nl, indicatief)
- Canvas in alu wissellijst 70×100 ≈ €170,99 · Textielprint in wissellijst
  100×140 ≈ €244,99 · instap foto-op-canvas in alu frame vanaf €39,99.

**Strategische gevolgtrekking:** positioneer Kunstdoekje tussen de premium-maar-
ondoorzichtige spelers (Murale) en de betaalbare-transparante (KunstOpDoek), met
**prijstransparantie + eigen-foto + een echt B2B/akoestiek-spoor** als wapen.

---

## 3. Prijsstrategie

### Marktprijzen per formaat — canvas (B2C, incl. 21% btw, indicatief)
| Formaat | Marktrange (canvas) |
|---|---|
| 30×40 | €27 – €41 |
| 50×70 | €55 – €69 |
| 70×100 | €83 – €115 (reguliere prijs vóór acties) |
| 100×140 | ~€130 – €180 *(geëxtrapoleerd, onzeker)* |

### Materiaal-ladder (upsell, oplopend)
`poster < canvas < dibond (+10–20%) < plexiglas (+40–50%) < aluminium/galerij`.
Voor Kunstdoekje vertaalt dit naar de **stof-ladder**: deco < velvet, met
rPET-deco als duurzaam alternatief.

### Mechanismen die werken in NL
- **Charm pricing**: prijzen op **,95 / ,99**.
- **"Van → voor" ankering** — maar wettelijk (Omnibus, sinds 2023) moet de
  "van"-prijs de **laagste prijs van de afgelopen 30 dagen** zijn.
- **Gratis verzending vanaf €45–50** (NL-norm) — net boven het kleinste
  formaat-prijspunt, stimuleert upsell naar groter/2e doek.
- **Volumekorting vanaf 2 doeken (~tot 10%)** + bundels/sets (gallery wall).
- **Prijzen incl. btw tonen** voor B2C; excl.-btw-optie alleen voor het zakelijke spoor.

### Aanbevolen prijsmodel (te kalibreren met de echte WooCommerce-export)
Het wisselmodel leeft van **twee prijzen per formaat**: het **complete pakket
(lijst + doek)** als eerste aankoop, en het **losse doek** als goedkope
herhaalaankoop (de echte LTV-driver). Dit zit al in de backend: `formats.base_price_cents`
(los doek) + `formats.frame_price_cents` (meerprijs lijst).

| Formaat | Los doek (richt) | + Lijst (richt) | Compleet (richt) |
|---|---|---|---|
| 70×50 | €49,95 | €35 | ~€84,95 |
| 70×100 | €69,95 | €45 | ~€114,95 |
| 100×70 | €79,95 | €50 | ~€129,95 |
| 120×80 | €89,95 | €55 | ~€144,95 |
| 140×100 | €109,95 | €65 | ~€174,95 |
| 160×120 | €129,95 | €75 | ~€204,95 |

> Dit zijn richtprijzen afgeleid van KunstOpDoek/fotogeschenk-benchmarks (los 80×80
> ≈ €112,50 / mét frame ≈ €197,50). **Vervang ze door je werkelijke marges en de
> WooCommerce-export.** Stof-meerprijs (velvet vs deco) en RAL-lijstkleur als
> aparte opslag (al gemodelleerd in `fabrics` / `frame_colors`).

---

## 4. Klantsegmenten

### Particulier — koopt op emotie, personalisatie, cadeau
- **Emotie/persoonlijke connectie** is de primaire conversiedriver; aankoop vaak
  impulsief en op de "emotionele route".
- **Eigen foto** is een groot subsegment (CEWE, Printvoorjou, Fotofabriek, ByLieke …).
- **Cadeau-motief** sterk en versterkt personalisatie.
- **Seizoens-/sfeerwissel** = uniek verkoopverhaal van het wisseldoek: "van
  winterscène naar lentedag binnen enkele minuten".

### Zakelijk (B2B) — onderbenut en aantrekkelijk
- **Koopmotieven:** branding/identiteit, **welzijn & productiviteit** (kunst hangt
  samen met werktevredenheid, minder verzuim; biophilic/wellness-design tot 6:1 ROI
  per Harvard), **akoestiek** (open kantoren), **healing environment** (zorg).
- **Segmenten:** kantoor, horeca/hospitality, zorg, retail.
- **NL-fiscaal voordeel:** kunst **huren** is 100% direct aftrekbaar (kopen wordt
  afgeschreven) → rechtvaardigt een **huur-/abonnementsmodel** voor bedrijven.
- **Inkoop = offerte/maatwerk/projectinrichting** (anders dan B2C directe checkout).
  Al ondersteund via `quote_requests` (type `zakelijk`).
- *Marktindicatie (onzeker, globaal):* decoratieve akoestische panelen ~$14,8 mld
  (2025), CAGR ~7,6% — trendrichting, geen NL-cijfer.

---

## 5. Het wisseldoek-concept: voordelen, bezwaren & messaging

**Voordelen (verkoopargumenten):** één frame, eindeloos variëren · minder afval
(frame blijft) · tool-loos wisselen in ~1 minuut · geen opslag/transportschade ·
strak gespannen zonder golving · akoestiek-optie · goedkoop bijbestellen van doeken.

**Bezwaren (verwachtingsmanagement):** transportkreukels (verdwijnen bij
opspannen) · hogere instapdrempel dan een poster (frame-investering) · "anders
dan klassiek canvas" voor puristen · lock-in op één systeem voor bijbestellen.

**Winnende messaging-bouwstenen (uit de markt):**
- Duurzaam-feitelijk: **"Eén lijst, eindeloos veel kunstwerken."**
- Gemak: **"Wissel je kunst — flexibel, tool-loos, in één minuut."**
- Betaalbaar variëren: **"Frame eenmalig, doeken voordelig bij."**
- Seizoen/sfeer (particulier) + **akoestiek + branding + huur/fiscaal** (B2B).

---

## 6. E-commerce UX & conversie

> Home decor converteert structureel laag (~1,27–1,4%; goede shops 1,7–1,9%).
> De rem is het **visualisatieprobleem**: klanten kunnen afmeting/sfeer in hun
> eigen ruimte niet inschatten. Alles hieronder pakt dat aan.

1. **Configurator** — flow: kies kunst/upload → formaat → stof → wel/geen lijst →
   lijstkleur → **live preview + live prijs** die direct en accuraat update.
   (Backend levert dit via `/api/products`; prijs altijd server-side.)
2. **Room-visualisatie / "bekijk op je muur" / AR** — grootste hefboom. Minimaal
   lifestyle-mockups per PDP; idealiter AR-preview op ware schaal (mobiel). Toon
   schaal t.o.v. bank/persoon en afmetingen in cm.
3. **Beeldkwaliteit** — high-res zoom, lifestyle-context; vermeld printtechniek
   (sublimatie/giclée) als kwaliteitssignaal.
4. **Sociale bewijskracht (NL)** — **Kiyoh** (gele sterren in Google) +
   **Thuiswinkel Waarborg / WebwinkelKeur** (CR +10–20%); >70% NL leest reviews
   vóór aankoop. Communiceer 14-dagen retour proactief.
5. **Checkout (NL, mobiel-first)** — **iDEAL bovenaan** (~70%+ van aankopen),
   **gastcheckout**, **verzendkosten vooraf tonen**, snelheid (1 sec sneller =
   tot +27% mobiele CR). (Mollie/iDEAL al in de backend.)
6. **Eigen-foto-flow** — **live DPI/kwaliteits-indicator** gekoppeld aan het
   gekozen eindformaat (groen/oranje/rood); ~15% van uploads is niet print-ready.
   Reken op pixels, niet op DPI-metadata; crop/zoom/preview + waarschuwing bij
   upscaling. (`custom_uploads` heeft al `breedte_px/hoogte_px/dpi`.)

---

## 7. SEO & vindbaarheid

> Exacte zoekvolumes zijn niet publiek; valideer met Keyword Planner/Ahrefs vóór
> prioritering. Onderstaande is afgeleid van concurrent-categorieën.

**Head terms:** wanddecoratie · muurdecoratie · canvas schilderij · foto op canvas
· kunst op doek · kunst aan de muur · wandkleed · wissellijst · posters · fotokunst.

**Categoriematrix (bouw indexeerbare pagina's met unieke content) — 4 assen:**
- **Kamer:** woonkamer, slaapkamer, kinder-/babykamer, keuken, kantoor, hal, badkamer
- **Stijl:** botanisch, industrieel, landelijk, modern/minimalistisch, scandinavisch,
  abstract, vintage/retro, luxe
- **Kleur:** zwart, wit, goud, groen, blauw, zwart-wit (sterke long-tail)
- **Thema:** natuur, dieren, bloemen, landschap, steden/skyline, strand/zee, quotes

**Long-tail:** kamer × stijl × kleur combinaties (bv. "botanische wanddecoratie
woonkamer"), formaat ("canvas schilderij XXL", "drieluik/meerluik"), cadeau
("gepersonaliseerd canvas cadeau"), personalisatie ("eigen foto op canvas").

**Image-SEO is hier disproportioneel belangrijk:** beschrijvende bestandsnamen,
alt-teksten met keyword, **Product-schema/structured data**, snelle laadtijd
(lazy-load, AVIF/WebP — al geconfigureerd in `next.config.js`), reviews → rich
snippets.

---

## 8. Duurzaamheid & materialen — wat mag je claimen?

> **Juridisch kritisch.** De ACM-Leidraad Duurzaamheidsclaims geldt nu al voor
> **iedere webshop** (niet alleen producenten). De EU **EmpCo-richtlijn
> (2024/825)** is van toepassing **vanaf 27 sep 2026** en **verbiedt generieke
> termen** ("milieuvriendelijk", "groen", "ecologisch", "klimaatneutraal", "eco")
> zonder erkende, gecertificeerde topprestatie. Boetes tot ≥4% jaaromzet.

**rPET / velvet — feitelijk, niet generiek.** rPET geeft een *relatief* voordeel
(minder virgin grondstof) maar is geen onbetwist "groen" materiaal (bron is
flessen niet textiel; downcycling- en microplastics-kritiek). Velvet/velours
print via sublimatie = diepe, kleurvaste weergave; akoestiek alleen hard claimen
mét absorberende backing.

**DO**
- Specifiek + cijfermatig: *"Geprint op stof met X% gerecycled PET"* (mét
  certificaatnr. als GRS/RCS-gecertificeerd).
- Procesfeiten: *"Op bestelling geprint in Nederland — geen overproductie,
  kortere transportafstand."* (Veilig want feitelijk/verifieerbaar.)
- Keurmerk alleen met **officieel logo + geldig certificaatnummer + verifieerlink**.

**DON'T**
- Geen kale termen: "duurzaam", "milieuvriendelijk", "groen", "eco", "klimaatneutraal".
- Geen "CO₂-neutraal op basis van compensatie".
- Geen ongefundeerde vergelijking "duurzamer dan canvas".
- Geen rPET-besparingspercentages (32–79%) als feit zonder eigen/leverancier-LCA.
- OEKO-TEX niet als milieukeurmerk presenteren (gaat alleen over schadelijke stoffen).

**Keurmerken:** GRS (geverifieerd % gerecycled + keten-eisen) · RCS (lichter,
alleen %) · OEKO-TEX 100 (schadelijke stoffen, géén milieuclaim). Alleen noemen
bij geldig certificaat.

---

## 9. Concrete implementatie-aanbevelingen

### Positionering
Tussen "premium-maar-ondoorzichtig" (Murale) en "betaalbaar-transparant"
(KunstOpDoek), met scherpe troeven: **prijstransparantie (toon los-doek-prijs) +
eigen-foto-personalisatie + een echt B2B/akoestiek-spoor**. Kernbelofte:
*"Eén lijst, eindeloos wisselen."*

### Categorie-structuur (data → `categories` + filters)
Bouw de **SEO-matrix kamer × stijl × kleur × thema** als filterbare,
indexeerbare collecties. Breid `artworks.tags` uit met stijl/kleur/kamer-tags
voor facetten; overweeg een `artwork_room`/`artwork_style` mapping als facetten
zwaar worden.

### Prijsmodel (backend al geschikt)
- Houd **los doek (`base_price_cents`) + lijst (`frame_price_cents`)** gesplitst;
  toon beide ("compleet" en "los doek" prijs) op de PDP.
- Kalibreer de seed-prijzen met de **WooCommerce-export** (het import-script logt
  de aangetroffen Woo-prijzen daarvoor).
- Charm pricing ,95; gratis-verzending-drempel ~€50 (`SHIPPING_CENTS`).
- Volumekorting/bundels (gallery wall set) als latere uitbreiding.

### Configurator-features (frontend, volgende fase)
1. Live configurator (formaat/stof/lijst/kleur) met **server-geverifieerde** live prijs.
2. **Room-visualisatie/AR + lifestyle-mockups** — hoogste prioriteit voor conversie.
3. **Eigen-foto-flow met live DPI-indicator** per gekozen formaat (data al in
   `custom_uploads`).
4. Mobiel-first, **iDEAL bovenaan**, gastcheckout, verzendkosten vooraf.
5. Kiyoh-reviews + Thuiswinkel/WebwinkelKeur-badges; Product-schema voor rich snippets.

### Zakelijk spoor (differentiator)
Aparte `/zakelijk`-landingspagina met **akoestiek + branding + welzijn**-narratief
en een **offerte/maatwerk-flow** (al via `quote_requests` type `zakelijk`).
Overweeg een **huur-/abonnementsmodel** (fiscaal voordeel als argument) als
fase-2 propositie.

### Copy & claims
Volg de DO/DON'T uit §8 strikt. Gebruik feitelijke, specifieke duurzaamheids-
en akoestiek-claims; vermijd vage groene termen (ACM nu, EmpCo vanaf sep 2026).

### Roadmap-prioriteit
1. **Frontend MVP**: home + shop (categoriematrix) + PDP-configurator + cart +
   Mollie-checkout (backend staat al).
2. **Conversie**: room-visualisatie/mockups, reviews/keurmerk, mobiel-checkout-tuning.
3. **Personalisatie**: eigen-foto-upload met DPI-flow.
4. **SEO**: categoriematrix-content + image-SEO + structured data.
5. **B2B**: zakelijk-landing + offerte; later huur/abonnement.

---

## 10. Belangrijkste onzekerheden & datagaten
- Absolute marktomvang-cijfers zijn vendor-afhankelijk en onzeker; **CAGR-richting**
  is betrouwbaarder. Zuivere "canvas prints"-marktomvang ontbreekt.
- Veel **concurrent-prijzen komen uit snippets** (sites blokkeren scraping) —
  verifieer Werk aan de Muur/ArtFrame, Murale, XL Wall Art handmatig.
- **NL-zoekvolumes** niet publiek — valideer keywords met Keyword Planner/Ahrefs.
- AR/360-conversiecijfers (+22% e.d.) zijn grotendeels leverancier-claims; richting
  klopt, percentages met voorzichtigheid.
- rPET-besparingspercentages bronafhankelijk; akoestiek van velours zónder backing
  waarschijnlijk beperkt.
- "Murale" als wisseldoek-speler niet 100% bevestigd in alle bronnen.

---

## 11. Belangrijkste bronnen (selectie)

**Markt / NL (sterkst):** InRetail Branchevisie Wonen 2025 · CBI/RVO
(home-decoration-textiles trends) · Mordor & Grand View (POD) · IMARC (NL/EU home decor).

**Concurrentie:** werkaandemuur.nl/materialen/artframe · murale.nl · kunstopdoek.nl
(manifest, materiaal-wisseldoek, bestellen) · xlwallart.nl · canvascompany.nl/prijzen
· topdoek.nl · fotogeschenk.nl (wissellijst-prijzen) · desenio.nl · ixxi.com.

**Prijs:** topdoek.nl · canvascompany.nl · fotofabriek.nl (dibond/plexiglas/canvas)
· lijstenwebwinkel.nl · bestecanvas.nl (verzendkosten) · gijswierda.com (psychologische prijzen/Omnibus).

**UX/SEO:** Statsig & ConvertCart (home-decor CR) · Shopify App Store (AR-tools:
Easy ARt, Picture It, Wall Art Viewer AR) · Tangiblee/Threekit (visual configurator)
· Spotler Thuiswinkel Markt Monitor Q4 2025 (iDEAL/mobiel) · Mollie checkout-guide ·
Kiyoh/Thuiswinkel/WebwinkelKeur · Printify/Printful/LetsEnhance (DPI) ·
Werk aan de Muur/Wallstars/Sfeer aan de Muur (categoriestructuur).

**Segmenten/concept:** wonenonline.nl (verwisselbare fotokunst) · abrahamart.com
(kunst op kantoor) · theartofinterior.nl (akoestiek) · bernice.be (fiscaal kunst huren)
· framestory.com · whitewall.com (changeable magnetic frame).

**Duurzaamheid/recht:** ACM Leidraad Duurzaamheidsclaims (v2) · Rijksoverheid
(misleidende duurzaamheidsclaims) · Grant Thornton/Milgro (ECGT/EmpCo) ·
OEKO-TEX & GRS/RCS (keurmerken) · COSH!/Changing Markets (rPET-kritiek) · CBI (go-green).
