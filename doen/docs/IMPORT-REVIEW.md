# James PRO Import — End-to-End Review

Datum: 2026-03-23

---

## 1. Imports & Types

### OK — TypeScript compileert zonder fouten
`npx tsc --noEmit` geeft 0 fouten in de import-bestanden. Alle types (`ParseResult`, `ImportProgress`, `ImportResultaat`, `JamesProImportData`, `ImportSamenvatting`) worden correct geëxporteerd en gebruikt in de UI-componenten.

### OK — SheetJS import
`import * as XLSX from 'xlsx'` is correct. De `xlsx` package staat in `package.json`.

### PROBLEEM — `supabaseClient` direct import
**Bestand:** `jamesProImportService.ts:12`
**Probleem:** De service importeert `supabase` van `./supabaseClient` en roept rechtstreeks `.from().insert()` / `.from().select()` aan. Dit omzeilt de bestaande CRUD functies in `supabaseService.ts` (bijv. `createKlant`, `getKlanten`).
**Impact:** Geen RLS-problemen (client gebruikt zelfde auth token), maar dubbele patronen in de codebase. Acceptabel voor een import-flow — geen actie nodig.

---

## 2. Supabase Operaties

### PROBLEEM — Individuele inserts i.p.v. batch
**Bestand:** `jamesProImportService.ts:306-351` (en vergelijkbaar voor projecten/offertes/facturen)
**Probleem:** Elke rij wordt individueel geïnsert met `await supabase.from('klanten').insert(mapped).select('id').single()`. De `BATCH_SIZE = 50` loop geeft alleen progress-updates per 50, maar de inserts zijn 1-voor-1.
**Impact:** Bij 500 klanten = 500 aparte HTTP requests naar Supabase. Langzaam maar functioneel.
**Fix:** Gebruik `supabase.from('klanten').insert(batchArray).select('id')` voor echte batch inserts. Let op: klanten moeten 1-voor-1 vanwege de duplicate-check, maar projecten/offertes/facturen zouden batch kunnen.

### PROBLEEM — `klant_id: klantId || ''` (lege string i.p.v. null)
**Bestand:** `jamesProImportService.ts:496`
**Probleem:** `mapJamesProProject` zet `klant_id: klantId || ''`. Als er geen klant match is, wordt een lege string opgeslagen. Het `projecten`-schema verwacht waarschijnlijk een UUID of NULL.
**Impact:** Supabase zal een fout geven bij insert als `klant_id` een foreign key is met een constraint, OF de lege string wordt opgeslagen en veroorzaakt later problemen bij JOINs.
**Fix:** Verander naar `klant_id: klantId || null`. Idem voor `klant_id` in `mapJamesProOfferte` (regel 531) en `mapJamesProFactuur` (regel 569).

### PROBLEEM — Unique index migratie faalt
**Bestand:** `docs/migration-036-import-kolommen.sql:26-27`
**Probleem:** `CREATE UNIQUE INDEX idx_klanten_user_bedrijfsnaam ON klanten(user_id, lower(trim(bedrijfsnaam)))` faalt met error `23505` — er bestaan al meerdere rijen met dezelfde `user_id` en lege `bedrijfsnaam`.
**Impact:** De index is niet aangemaakt. Import werkt nog steeds (gebruikt `ilike` lookup), maar upsert-strategie op basis van deze index is niet beschikbaar.
**Fix:**
```sql
-- 1. Verwijder dubbele lege bedrijfsnamen (bewaar de oudste)
DELETE FROM klanten k1
USING klanten k2
WHERE k1.user_id = k2.user_id
  AND lower(trim(k1.bedrijfsnaam)) = lower(trim(k2.bedrijfsnaam))
  AND lower(trim(k1.bedrijfsnaam)) = ''
  AND k1.created_at > k2.created_at;

-- 2. Maak unique index met exclusie van lege bedrijfsnaam
CREATE UNIQUE INDEX IF NOT EXISTS idx_klanten_user_bedrijfsnaam
  ON klanten(user_id, lower(trim(bedrijfsnaam)))
  WHERE bedrijfsnaam IS NOT NULL AND trim(bedrijfsnaam) != '';
```

---

## 3. Excel / CSV Parsing

### OK — CSV parser met quoted fields
`parseCSVLine` (regel 112-134) handelt correct: quoted fields, escaped quotes (`""`), en configurable separator.

### OK — Auto-detect separator
Separator detectie (regel 96) kijkt of de eerste regel `;` bevat. Werkt voor standaard James PRO exports die semicolon-separated zijn.

### OK — UTF-8 BOM handling
`text.replace(/^\uFEFF/, '')` op regel 92 verwijdert BOM correct.

### OK — Excel date handling
`XLSX.read(buffer, { type: 'array', cellDates: true })` parsed dates als JS Date objecten, die vervolgens naar ISO string worden geconverteerd (regel 147-149).

### PROBLEEM — Geen validatie op verwachte kolommen
**Probleem:** Er is geen check of het geüploade bestand de verwachte kolommen bevat (bijv. `name` of `bedrijfsnaam` voor klanten, `Company` voor projecten). Als iemand het verkeerde bestand in het verkeerde upload-slot plaatst, worden er lege rijen aangemaakt.
**Impact:** Gebruiker ziet "500 klanten gevonden" maar alle velden zijn leeg.
**Fix:** Check na parsing of minimaal 1 verwachte kolom aanwezig is per type. Bijv. voor klanten: `name` OF `bedrijfsnaam` moet bestaan als header.

---

## 4. Koppellogica

### OK — Klant matching via normalizeCompanyName
Normalisatie (lowercase, trim, strip trailing dots, collapse spaces) werkt goed voor standaard bedrijfsnamen.

### OK — Klant duplicate check via ilike
De import checkt bestaande klanten met `.ilike('bedrijfsnaam', mapped.bedrijfsnaam)` (regel 319). Dit is case-insensitive maar matcht niet op genormaliseerde naam (bijv. trailing dots). Acceptabel.

### OK — Project-offerte koppeling via Levenshtein
`matchProjectByName` (regel 610-628) met threshold >0.6 is een redelijke heuristiek. Koppelt offerte-omschrijving aan projectnaam.

### PROBLEEM — Offerte status mapping logica-volgorde
**Bestand:** `jamesProImportService.ts:594-601`
**Probleem:** De check `s.includes('akkoord') && !s.includes('niet')` staat vóór `s.includes('niet akkoord')`. Dit werkt correct (de eerste regel vangt "akkoord" op en sluit "niet akkoord" uit), maar de tweede regel `s.includes('niet akkoord')` wordt nooit bereikt als er ook "akkoord" in zit — want die is al gevangen door regel 1.
**Impact:** Functioneel correct, maar de code is misleidend. "Niet akkoord" wordt correct als `afgewezen` gemapt via de `s.includes('niet')` fallback op regel 597.
**Fix:** Geen impact, optioneel: verplaats `niet akkoord` check naar boven voor leesbaarheid.

### PROBLEEM — Samenvatting klant-koppeling is exact match only
**Bestand:** `jamesProImportService.ts:206-214`
**Probleem:** In `buildSamenvatting` wordt projectkoppeling getest met exact match op genormaliseerde naam (`klantNamen.has(company)`). Maar de daadwerkelijke import gebruikt `ilike` voor klanten en Levenshtein voor projecten. De preview kan dus meer "ongekoppelde" items tonen dan er werkelijk zijn.
**Impact:** Warnings in stap 3 zijn pessimistisch. Gebruiker ziet bijv. "20 projecten niet gekoppeld" maar na import zijn er maar 5 ongekoppeld.
**Fix:** Acceptabel — liever pessimistisch dan optimistisch in een preview.

---

## 5. UI Flow

### OK — 4-stappen wizard
Stap 1 (bron kiezen) → Stap 2 (upload) → Stap 3 (preview) → Stap 4 (import) werkt logisch.

### OK — Drag & drop + file input
`ImportUploadZone` ondersteunt drag/drop en click-to-select. Clear-knop reset correct.

### OK — Progress bars per type
`ImportProgress` toont per type een voortgangsbalk met current/total en status-iconen.

### OK — Foutmeldingen worden getoond
Fouten worden per type verzameld en na afloop getoond (max 10).

### PROBLEEM — Geen "Terug"-knop in stap 4
**Bestand:** `JamesProImportWizard.tsx:210-217`
**Probleem:** Als de import eenmaal gestart is (stap 4), is er geen manier om terug te gaan of de import te annuleren. Na voltooiing is er alleen een link naar `/klanten`.
**Impact:** Als de gebruiker de verkeerde bestanden heeft geüpload, kan de import niet worden gestopt.
**Fix:** Acceptabel voor v1 — annuleren van een lopende import is complex. Optioneel: voeg een "Opnieuw importeren" knop toe na voltooiing.

### PROBLEEM — `handleComplete` callback doet niets
**Bestand:** `JamesProImportWizard.tsx:52-54`
**Probleem:** `handleComplete` is `useCallback((_result: ImportResultaat) => { /* noop */ }, [])`. Het resultaat wordt nergens opgeslagen in de wizard state.
**Impact:** Geen functioneel probleem — `ImportProgress` toont het resultaat zelf. Maar de wizard heeft geen toegang tot het resultaat voor eventuele navigatie-logica.
**Fix:** Geen actie nodig voor v1.

---

## Samenvatting

| Check | Status | Ernst |
|-------|--------|-------|
| TypeScript types & imports | OK | — |
| CSV parsing + BOM | OK | — |
| Excel parsing + dates | OK | — |
| Separator auto-detect | OK | — |
| Klant duplicate check | OK | — |
| Levenshtein koppeling | OK | — |
| UI wizard flow | OK | — |
| Progress tracking | OK | — |
| Unique index migratie | PROBLEEM | Hoog |
| klant_id lege string | PROBLEEM | Hoog |
| Individuele inserts | PROBLEEM | Medium |
| Geen kolomvalidatie | PROBLEEM | Medium |
| Status mapping volgorde | PROBLEEM | Laag |
| Preview koppeling pessimistisch | PROBLEEM | Laag |
| Geen cancel/terug stap 4 | PROBLEEM | Laag |

### Prioriteit fixes

1. **klant_id: '' → null** — voorkomt FK errors bij insert
2. **Unique index fix** — verwijder dubbele lege namen, maak index met WHERE clause
3. **Kolomvalidatie** — check verwachte headers na parsing
4. **Batch inserts** — optioneel, performance verbetering
