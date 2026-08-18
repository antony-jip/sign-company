# TODO — pas dezelfde logo flicker fix toe op offerte/factuur PDF

## Achtergrond

In `fix/werkbon-pdf-logo-flicker` is voor werkbon-PDF een race-condition opgelost:
- `new Image() + img.src = url` werd synchroon gevolgd door `naturalWidth/naturalHeight` reads → 0 bij koude cache → fallback aspect ratio + `addImage(url, ...)` met half-decoded image
- Fix: pre-resolve via `resolveImageToBase64()`, dan `getImageProperties(base64)` voor exacte ratio, dan `addImage(base64, detectImageFormat(base64), ...)`

`pdfService.ts` heeft hetzelfde latente patroon op de **hoofd-pagina** van offertes/facturen. De **bijlage-pagina's** zijn al correct (gebruikt al base64 pre-resolve).

## Scope — alleen hoofd-pagina logo fix

### Bestand
`src/services/pdfService.ts`

### Te wijzigen — addPageHeader functie

Regelnummers per huidige main (na werkbon-fix merge — verifieer voordat je begint):

- **Regel ~243-257:** `if (bedrijfsProfiel.logo_url) { ... doc.addImage(bedrijfsProfiel.logo_url, logoFormat, ...) }` op drie posities (rechts, midden, links)
  - Probleem: `addImage(URL-string)` zonder `await`, hardcoded afmetingen `logoW = 25 * logoScale`, `logoH = 20 * logoScale` — het verklaart waarom dit *minder* opvalt dan in werkbon (hardcoded h+w, geen ratio-detectie), maar de render-quality variatie door browser-cache state blijft.

### Voorgestelde fix

1. Functie waarin de logo wordt geladen async maken (let op: `addPageHeader` of welke parent ook wordt gebruikt — check call chain in `pdfService.ts`).
2. Voor de render-loop start: `const logoBase64 = bedrijfsProfiel.logo_url ? await resolveImageToBase64(bedrijfsProfiel.logo_url) : null`
3. In `addPageHeader`: gebruik `logoBase64` ipv `logo_url`. Optioneel: gebruik `getImageProperties(logoBase64)` voor exacte aspect-ratio ipv hardcoded `logoW/logoH` — dit is een verbetering, niet strikt deel van de flicker fix. Bespreek met Antony of dit gewenst is.

### Call-sites

Vergelijk met werkbon-fix: `generateWerkbonInstructiePDF` werd async gemaakt + 3 call-sites in `WerkbonDetail.tsx` kregen `await`. Doe hetzelfde voor de offerte/factuur entry-points:

- Verwacht: `generateOffertePDF`, `generateFactuurPDF` of vergelijkbare functies in `pdfService.ts`
- Verwacht: call-sites in `OfferteEditor`, `FactuurEditor`, `QuoteCreation`, `FactuurDetail`, mogelijk ook in PDF preview dialog

Grep vooraf:
```bash
grep -rn "generateOffertePDF\|generateFactuurPDF" src/
```

### Niet vergeten

- Loading-state op call-sites: in werkbon-fix is dit bewust **niet** toegevoegd. Voor offerte/factuur eerst kijken of er al `isPdfGenerating`/`isLoading` state bestaat. Zo niet: niet zelf toevoegen, alleen melden.
- Bijlage-pagina logo flow (`logoBase64ForBijlage` rond regel 980-984) blijft zoals het is — die werkt al correct.
- `addBriefpapierBackground` flow: niet aanraken tenzij vergelijkbaar probleem aantoonbaar is.
- Geen styling wijzigingen aan de PDF zelf.

### Werkwijze

- Aparte branch `fix/offerte-factuur-pdf-logo-flicker` van main
- Eén commit per documenttype (offerte, factuur) zodat je selectief kunt reverten
- `npm run build` na elke commit
- Smoke test: 5× achter elkaar dezelfde offerte- en factuur-PDF genereren — logo moet 5/5 keer scherp én correct gedimensioneerd zijn
- Niet pushen — Antony pusht zelf

### STOP-condities

- Als `addPageHeader` of de logo-render in `pdfService.ts` is verweven met andere helpers die ook async moeten worden, en de wijziging cascadeert door meer dan ~5 bestanden: stop, rapporteer, wacht op richting.
- Als hardcoded `logoW`/`logoH` aanpassen (naar aspect-ratio detectie) zichtbare layout shifts veroorzaakt op bestaande templates: niet doen.
