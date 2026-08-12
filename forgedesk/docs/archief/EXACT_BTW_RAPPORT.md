# Onderzoeksrapport: Exact Online BTW-discrepantie

**Datum:** 2026-05-13
**Onderzoek:** 5 parallelle agents (code, schema, API-spec, impact, UI) + zelf-verificatie
**Status:** Diagnose afgerond. **Geen code gewijzigd.** Wacht op akkoord.

---

## 1. Samenvatting

- Eén regel code is de oorzaak: `api/exact-sync-factuur.ts:825` deelt `item.totaal` door `(1 + btw%/100)` terwijl `factuur_items.totaal` al **EXCL BTW** is.
- Gevolg: per regel gaat ~17% te weinig (factor `1/1.21`) naar Exact. Exact rekent vervolgens BTW over dat te lage bedrag.
- Bug leeft sinds **10-03-2026** (commit `8ec3a981`, ~64 dagen).
- Alleen Exact-sync is fout. UI, PDF, Mollie en factuurportaal tonen het juiste bedrag.
- Per factuur is het verschil tussen verwacht totaal en het totaal in Exact precies gelijk aan `factuur.btw_bedrag`.

---

## 2. Root cause

**Bestand:** `api/exact-sync-factuur.ts`
**Regel:** 825

```ts
const regelTotaal = item.totaal / (1 + item.btw_percentage / 100)
```

Deze regel veronderstelt dat `item.totaal` **INCL BTW** is. Dat klopt niet.

### Bewijs dat `factuur_items.totaal` EXCL BTW is

`src/components/invoices/FactuurEditor.tsx:148-152`:

```ts
function calcLineTotal(item: LineItem): number {
  const subtotaal = round2(item.aantal * item.eenheidsprijs)
  const korting = round2(subtotaal * (item.korting_percentage / 100))
  return round2(subtotaal - korting)         // GEEN BTW erbij
}
```

`calcBtwGroups` (regel 158-166) telt vervolgens BTW erover op (`lineTotal × btw%`) — wat alleen klopt als `calcLineTotal` excl. is.

`factuur_items.totaal` wordt op regels 855, 1031, 1078, 1151 en 1518 ingevuld met `calcLineTotal(item)`. Bevestigd: **EXCL BTW**.

### Rekenkundige reproductie

Factuur 1 regel, €1000 ex BTW @ 21%:

| Stap | Waarde |
|---|---|
| `factuur_items.totaal` in DB | €1000,00 (excl) |
| `regelTotaal` na deling door 1.21 (regel 825) | €826,45 |
| Naar Exact als `AmountFC` per regel | €826,45 |
| Exact rekent BTW via `VATCode` (21%) | €173,55 |
| **Totaal in Exact** | **€1000,00** |
| Verwacht totaal in Exact | €1210,00 |
| Verschil | €210,00 (= `factuur.btw_bedrag`) |

De factuur in Exact heeft dus exact het EXCL-bedrag van doen. als totaalbedrag — wat overeenkomt met de symptoombeschrijving.

### Secundair issue (niet de root cause, maar relevant)

Op header-niveau wordt `VATAmountDC` / `VATAmountFC` handmatig meegestuurd met `factuur.btw_bedrag` (regels 846-847). Volgens Exact-spec berekent Exact BTW zelf via de regel-`VATCode`. Het handmatig meesturen kan een conflict opleveren als de bedragen niet matchen. Niet nu fixen — eerst de hoofd-bug.

---

## 3. Reproductie

1. Maak in doen. een factuur aan met één regel: 1 × €1000, BTW 21%.
2. Verifieer in UI: subtotaal €1000, BTW €210, totaal €1210.
3. Klik "Sync naar Exact" (knop in FactuurEditor regel 1536).
4. Open de SalesEntry in Exact Online.
5. Waargenomen: regelbedrag €826,45 excl, BTW €173,55, totaal €1000,00.
6. Verwacht: regelbedrag €1000,00 excl, BTW €210,00, totaal €1210,00.

---

## 4. Impact

### Wat we weten
- **Sync-state kolom:** `facturen.exact_synced_at` (`timestamptz`), bijgewerkt op regel 893 van `api/exact-sync-factuur.ts`.
- **Bug live sinds:** 2026-03-10 06:57 UTC (commit `8ec3a981` — "Exact Online OAuth2 koppeling — volledige backend"). Niet gewijzigd in de 64 dagen sinds.
- **Per factuur fout:** ja, voor elke factuur waar `btw_bedrag > 0`.
- **Per-factuur fout-bedrag:** exact gelijk aan `factuur.btw_bedrag`. Geen rounding-edge cases.

### Wat we niet uit de code kunnen halen
- Hoeveel facturen er werkelijk gesynchroniseerd zijn (geen DB-toegang in deze sessie).
- Welke klanten het betreft.
- Of er al iets in Exact zijdig gecorrigeerd is (geen feedback-link).

### SQL queries (run in Supabase SQL Editor — read-only)

Vervang `<ORG_ID>` door de relevante `organisatie_id`.

```sql
-- A. Aantal gesynchroniseerde facturen
SELECT COUNT(*) AS totaal_gesynct
FROM facturen
WHERE exact_synced_at IS NOT NULL
  AND organisatie_id = '<ORG_ID>';
```

```sql
-- B. Hoeveel daarvan zijn echt fout (btw_bedrag > 0)
SELECT COUNT(*) AS fout_aantal
FROM facturen
WHERE exact_synced_at IS NOT NULL
  AND btw_bedrag > 0
  AND organisatie_id = '<ORG_ID>';
```

```sql
-- C. Top 20 voor handmatige verificatie/correctie
SELECT nummer, factuurdatum, klant_naam, subtotaal, btw_bedrag, totaal, exact_synced_at
FROM facturen
WHERE exact_synced_at IS NOT NULL
  AND btw_bedrag > 0
  AND organisatie_id = '<ORG_ID>'
ORDER BY factuurdatum DESC
LIMIT 20;
```

```sql
-- D. Financiële omvang van de discrepantie
-- Voor elke gesynchroniseerde factuur is de fout in Exact precies factuur.btw_bedrag
SELECT
  COUNT(*) AS aantal_facturen,
  ROUND(SUM(btw_bedrag)::numeric, 2) AS totaal_te_kort_in_exact,
  ROUND(SUM(totaal)::numeric, 2) AS totaal_incl_in_doen,
  ROUND(SUM(subtotaal)::numeric, 2) AS totaal_in_exact_nu
FROM facturen
WHERE exact_synced_at IS NOT NULL
  AND btw_bedrag > 0
  AND organisatie_id = '<ORG_ID>';
```

```sql
-- E. CSV-export van alle gesyncte facturen (voor accountant)
SELECT nummer, factuurdatum, klant_naam, subtotaal, btw_bedrag, totaal,
       exact_entry_id, exact_synced_at
FROM facturen
WHERE exact_synced_at IS NOT NULL
  AND btw_bedrag > 0
  AND organisatie_id = '<ORG_ID>'
ORDER BY factuurdatum;
```

---

## 5. Mogelijke oplossingsrichtingen

### Optie A — Minimale fix: één regel wijzigen (aanbevolen)

**Wijziging:** `api/exact-sync-factuur.ts:825`

```ts
// Vóór:
const regelTotaal = item.totaal / (1 + item.btw_percentage / 100)
// Na:
const regelTotaal = item.totaal   // factuur_items.totaal is al excl. BTW
```

**Trade-offs:**
- Pro: kleinste change, één regel, geen schema-wijzigingen, geen risico op cascade.
- Pro: alle andere mappings blijven werken (de comment op regel 824 "Bereken totaal excl BTW per regel" blijft semantisch kloppen).
- Con: het feit dat `factuur_items.totaal` excl is, is niet expliciet gedocumenteerd in code. Toekomstige aanname-fout blijft mogelijk. Eventueel mini-comment naast regel 825 (één korte regel, conform CLAUDE.md).

### Optie B — Bredere herziening van Exact-mapping

**Inhoud:**
1. Fix regel 825 (zoals A).
2. Verwijder handmatig `VATAmountDC` / `VATAmountFC` op header (regels 846-847) — laat Exact dit zelf berekenen via `VATCode` per regel. Voorkomt mogelijke afrondingsconflicten.
3. Eventueel header `AmountDC` / `AmountFC` expliciet meegeven (Exact berekent dit normaal zelf uit de lines — niet strikt nodig).

**Trade-offs:**
- Pro: schoner volgens Exact-spec, minder kans op rounding-fouten in de toekomst.
- Con: meer regels gewijzigd, alle bestaande sync-flows moeten opnieuw geverifieerd worden, scope creep. **CLAUDE.md zegt expliciet "geen unsolicited refactoring"** — alleen doen als jij dit expliciet wenst.

### Wat moet er met de al-gesynchroniseerde facturen?

Geen optie is automatisch "juist" — vereist jouw beslissing en mogelijk afstemming met boekhouding:

| Aanpak | Wat | Wanneer |
|---|---|---|
| **Laten** | Niks doen aan oude facturen; alleen nieuwe goed | Als boekhouding zelf in Exact corrigeert |
| **Handmatig corrigeren in Exact** | Per SalesEntry bedragen aanpassen in Exact UI | Klein aantal (<20) |
| **Annuleren + opnieuw syncen** | `exact_synced_at` wissen + delete in Exact + opnieuw via doen. | Groter aantal, mits geen afhankelijkheden zoals betaal-koppelingen in Exact |
| **Bulk-correctie via Exact API** | Tijdelijk script `update-existing-exact-entries.ts` | Bij heel grote aantallen — alleen na expliciet akkoord |

Pas de keuze hier op nadat queries A-D omvang hebben aangetoond.

---

## 6. Open vragen

1. **Hoe gedraagt Exact zich bij conflict tussen header-`VATAmountDC` en regel-`VATCode`?**
   We sturen beide. Mogelijk overschrijft Exact onze `VATAmountDC` zelf (wat de huidige symptomen verklaart). Te verifiëren door één concrete SalesEntry in Exact te openen en de waarden ter plaatse te lezen.
2. **Hoeveel facturen zijn werkelijk getroffen?** Wacht op queries A/B/D.
3. **Eventuele creditnota's:** zijn `subtotaal`/`totaal` daar negatief? Zo ja, gedraagt regel 825 zich correct met negatieve waarden? (Vermoedelijk ja — de deling is mathematisch symmetrisch, maar te verifiëren.)
4. **Andere klanten van de app:** is doen. multi-tenant in productie, of alleen jullie eigen organisatie? Bepaalt of meerdere org's data verkeerd in Exact hebben staan.

---

## 7. Aanbevolen volgende stap

**Direct doen (door jou, geen code-wijziging):**

1. Run query B in Supabase SQL Editor om te zien hoeveel facturen er werkelijk fout staan.
2. Open één van die facturen in Exact Online (gebruik `exact_entry_id` uit query C). Bevestig dat het totaal afwijkt en lees of `VATAmountDC` op header overschreven is.
3. Geef daarna akkoord voor **Optie A** (één regel fix) of **Optie B** (bredere herziening).

**Daarna (door mij, na akkoord):**

- Implementatie van gekozen optie.
- Aparte beslissing over historische correctie nadat omvang bekend is.

**STOP-gate gehandhaafd.** Geen code-wijzigingen zonder jouw akkoord.
