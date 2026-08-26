# doen.team na de kit.com-analyse

Datum: 26 aug 2026. Bron: live doen.team + kit.com (homepage, nav, footer).
Canon blijft `DESIGN.md`. Dit doc gaat over *indeling*, niet over stijl.

---

## 1. Wat kit.com structureel anders doet

| # | Kit | doen. was |
|---|-----|-----------|
| 1 | Klantbewijs staat **in de hero** (foto + naam + functie) en daarna nog drie hele secties | Nul klantbewijs. Geen naam, geen gezicht, geen quote |
| 2 | Alles hangt aan **vier werkwoorden** (Grow/Send/Automate/Earn), terug in menu, hero, secties en footer | Elf module-zelfstandignaamwoorden. Een inventaris, geen belofte |
| 3 | Vijf afwisselende secties, elk één UI-shot + één kop + één zin | Eén demoblok met alles erin, daarna een tekstlijst |
| 4 | Twee CTA-snelheden overal: trial **en** demo-afspraak | Alleen "Start gratis" |
| 5 | "Use Cases" als nav-item, tien doelgroepen | Vier verticals, alleen in de footer |
| 6 | Eén nieuw ding krijgt een spotlight-blok, twee keer op de home | Daan en Studio: één regel in een lijst van elf |

De kern: kit bouwt eerst vertrouwen en verkoopt daarna. doen. legde eerst het
product uit en vroeg daarna vertrouwen.

## 2. Wat er is doorgevoerd

**Home, nieuwe volgorde** (`src/app/page.tsx`):

```
1  Hero                 petrol-deep, foto zichtbaar, tweede CTA
2  EigenGebruikBewijs   wit, werkbeeld + de drie cijfers        NIEUW
3  Manifest             bg, ongewijzigd
4  Werkwoorden          wit, vier stappen met bestaande video's NIEUW
5  DaanSpotlight        petrol-deep, badge + drie regels        NIEUW
6  Demo                 de klikbare app, nu ná de belofte
7  Modules              wit, index i.p.v. pitch
8  Prijs · 9 FAQ · 10 Slot-CTA
```

Kleurritme loopt nu donker, wit, grijs, wit, donker, grijs, wit, donker, wit,
flame. Elke scrolllengte wisselt.

**Hero-foto gerepareerd.** Er lagen drie lagen over `hoogwerker-aan-de-gevel-breed.webp`:
multiply 0.3, een verloop dat rechts nog op 0.22 stond en een radiale lichtval
over het hele vlak. De rechterhelft las als vlak petrol. Nu: multiply 0.15,
verloop dooft rechts naar 0.02, lichtval alleen over de tekstkolom, en op
mobiel een eigen scrim (`bg-petrol-deep/70`) omdat de kop daar over de volle
breedte staat.

**Tweede CTA-spoor.** `src/data/cta.ts` is de enige plek. "Plan een rondleiding"
staat in de header, de hero en de afsluiter, en gaat naar
`/contact?over=rondleiding#contact-formulier`. Het formulier vult zichzelf voor
(via `window.location.search`, niet via `useSearchParams`: die dwingt een
Suspense-grens af bij statisch renderen).

**Nav van zes naar vier items.** Product · Voor wie · Prijzen · Kennis. Met het
tweede CTA-spoor erbij werd zes te vol. Demo en Hoe het werkt hangen onder
Product, Verhaal en Contact onder Kennis. Het productmenu is gegroepeerd op de
vier werkwoorden plus Daan (`modulesPerGroep` in `src/data/modules.ts`), in
plaats van één lijst van elf.

**Exact-koppeling rechtgezet.** De site zei op vijf plekken "one-way, betaald
vink je zelf af". Dat klopt niet meer: `forgedesk/api/cron-exact-betaalsync.ts`
haalt dagelijks de afgeletterde betaaltermijnen uit Exact en boekt het restant
via `factuur_markeer_betaald`. Aangepast in de home (Werkwoorden), `faq.ts`,
twee kennisbank-artikelen, `FeaturesContent.tsx`, `AppShowcase.tsx` en de
SEO-omschrijving van de Facturen-module.

## 3. Bewust niet gedaan

- **Vergelijkingspagina's** ("doen. naast Moneybird" etc.). Gebouwd en op
  verzoek weer verwijderd. Als ze ooit terugkomen: eerst noemen waar het
  alternatief goed in is, geen prijzen van andermans product, en een "blijf bij
  X als"-blok, anders leest het als een advertentie.
- **Module-index als icoonraster.** Stond in het oorspronkelijke plan, maar
  `DESIGN.md` schrijft hairline-rijen voor en verbiedt icon-kaart-grids. De
  lijst blijft dus een lijst, alleen op een latere plek en met andere copy.
- **Eyebrow-labels**, kits pastelpanelen, de beroemdheden-muur, het roterende
  woord in de kop. Zie DESIGN.md.

## 4. Wat nog open staat

1. **Echt klantbewijs.** Het bewijsblok draagt nu een sfeerbeeld uit de eigen
   fotoserie, geen documentaire foto. Zet er geen persoonsnaam onder zolang dat
   zo is. Eén echte foto van de ploeg plus één klant met naam en bedrijf is de
   grootste conversiewinst die er nog ligt.
2. **Mobiel op een echt toestel.** Headless Chrome rendert een bredere
   layoutviewport, dus daar valt niets uit af te lezen. De live site gedraagt
   zich in dezelfde test identiek, dus er is geen regressie, maar getest is het
   niet.
3. **Kennisbank-artikelen** zijn nog niet per stuk nagelezen na de
   Exact-correctie; alleen de twee passages die "one-way" zeiden zijn aangepast.
