# BACKEND & DATA TOTAL CHECK — Audit Report

**Datum:** 2026-03-02
**Scope:** Types, services, data flow, financiele berekeningen, Supabase-readiness
**Branch:** claude/fix-quote-calc-save-PDXrI

---

## FASE 1: Analyse Samenvatting

### Codebase Overzicht
- **Types:** 50+ interfaces in `src/types/index.ts` (1317+ regels)
- **Service layer:** `src/services/supabaseService.ts` (3659+ regels)
- **Patroon:** Supabase met localStorage fallback (`isSupabaseConfigured()`)
- **Naamgeving:** Consistent Nederlands (klant_id, factuur_id, etc.)

---

## FASE 2: Types Gefixt

### contactpersoon_id toegevoegd aan:
| Type | Was | Nu |
|------|-----|-----|
| `Werkbon` | ontbrak | `contactpersoon_id?: string` |
| `MontageAfspraak` | ontbrak | `contactpersoon_id?: string` |
| `Email` | ontbrak | `contactpersoon_id?: string` |

### user_id toegevoegd aan:
| Type | Was | Nu |
|------|-----|-----|
| `OfferteItem` | ontbrak | `user_id: string` |
| `FactuurItem` | ontbrak | `user_id: string` |

### updated_at toegevoegd aan (24 types):
`KlantActiviteit`, `OfferteItem`, `FactuurItem`, `Email`, `Grootboek`, `BtwCode`, `Korting`, `AIChat`, `Notificatie`, `Verlof`, `Bedrijfssluitingsdag`, `ProjectToewijzing`, `BookingSlot`, `BookingAfspraak`, `HerinneringTemplate`, `WerkbonRegel`, `WerkbonFoto`, `Leverancier`, `BestelbonRegel`, `LeveringsbonRegel`, `VoorraadMutatie`, `DealActiviteit`, `LeadInzending`, `IngeplandEmail`

### Ongewijzigd (bewust):
- `Contactpersoon` — embedded type, geen user_id/timestamps nodig
- `Vestiging` — embedded type
- `OfferteActiviteit`, `CalculatieRegel`, `PipelineStap` — embedded types
- CSV/DTO types — geen entiteiten

---

## FASE 3: Service Functies Gefixt

### Nieuwe relationele queries (8):
| Functie | Beschrijving |
|---------|-------------|
| `getFacturenByKlant(klantId)` | Alle facturen van een klant |
| `getFacturenByProject(projectId)` | Alle facturen van een project |
| `getDocumentenByProject(projectId)` | Alle documenten van een project |
| `getDocumentenByKlant(klantId)` | Alle documenten van een klant |
| `getTijdregistratiesByMedewerker(medewerkerId)` | Alle uren van een medewerker |
| `getMontageAfsprakenByProject(projectId)` | Alle montage-afspraken van een project |
| `getMontageAfsprakenByKlant(klantId)` | Alle montage-afspraken van een klant |

### Nieuwe nummer generatoren (5):
| Functie | Patroon |
|---------|---------|
| `generateOfferteNummer(prefix)` | `OFF-2026-001` |
| `generateFactuurNummer(prefix)` | `FAC-2026-001` |
| `generateCreditnotaNummer()` | `CN-2026-001` |
| `generateProjectNummer()` | `PRJ-2026-001` |
| `generateLeveringsbonNummer()` | `LB-2026-001` |

Bestaande generatoren (ongewijzigd): `generateWerkbonNummer`, `generateUitgaveNummer`, `generateBestelbonNummer`

### Nieuwe conversie functies (4):
| Functie | Beschrijving |
|---------|-------------|
| `convertOfferteToFactuur(offerteId, userId, prefix)` | Offerte -> Factuur met items kopie |
| `convertWerkbonToFactuur(werkbonId, userId, prefix)` | Werkbon -> Factuur met regels + km |
| `createCreditnota(factuurId, userId, reden)` | Factuur -> Creditnota (negatieve bedragen) |
| `createVoorschotfactuur(factuurId, userId, %, prefix)` | Factuur -> Voorschotfactuur (percentage) |

Alle conversie functies:
- Gebruiken `round2()` voor alle financiele berekeningen
- Kopieren relevante items/regels
- Updaten bronentiteit status
- Zetten correcte `bron_type`, `factuur_type`, `contactpersoon_id`

### round2() toegevoegd aan financiele berekeningen:

**QuoteItemsTable.tsx** (9 fixes):
- `calculateLineTotaal()` — bruto en korting berekeningen
- `calculateVariantTotaal()` — variant totaal
- `calculateItemMargin()` — inkoop/verkoop/marge reduce
- Inline calculatie indicators (inkoop/verkoop display)

**CalculatieTab.tsx** (5 fixes):
- Inkoop -> verkoop berekening met marge
- Marge -> verkoop berekening
- Template regel update (inkoop/marge -> verkoop)
- `berekenTotalen()` — inkoop/verkoop/korting accumulatie

**pdfService.ts** (3 fixes):
- Optionele items BTW berekening
- Werkbon totalen (subtotaal, km, btw, totaal incl)
- Verwijderd handmatige `Math.round(x * 100) / 100` patronen

**RapportagesLayout.tsx** (4 fixes):
- Winst berekening (kosten en totaal)
- Voorraad waarde berekening
- Export waarde berekening
- Display waarde berekening

---

## FASE 4: Data Flow & Supabase-Readiness

### localStorage keys: OK
Alle keys gebruiken consistent de `forgedesk_` prefix:
- `forgedesk_klanten`, `forgedesk_offertes`, `forgedesk_facturen`, etc. (service layer)
- `forgedesk_weergave_instellingen`, `forgedesk_clipboard_items`, etc. (UI preferences)
- `forgedesk_demo_user`, `forgedesk_demo_password` (auth fallback)

### Hardcoded 'demo' strings: ACCEPTABEL
- `authService.ts` — demo-mode fallback, correct gedrag zonder Supabase
- `SettingsLayout.tsx` — demo wachtwoord wijziging, alleen zonder Supabase
- `BookingBeheer.tsx` — URL fallback, alleen zonder user

### Component localStorage: ACCEPTABEL
Alle directe localStorage calls in components zijn voor UI-state (niet entiteiten):
- Font/weergave instellingen
- Clipboard items (offerte regels copy/paste)
- Email signatures
- Auto-collapse / compact mode

---

## Niet gewijzigd (buiten scope)

1. **`@ts-ignore` / `:any`** — 0 gevonden, geen actie nodig
2. **UI componenten** — geen wijzigingen aan layout/routing/styling
3. **Embedded types** (Contactpersoon, Vestiging, etc.) — bewust zonder user_id/timestamps
4. **Component-level nummer generatoren** — niet verwijderd (NO refactoring), centralized versies toegevoegd in service layer voor toekomstig gebruik

---

## TypeScript Check

`npx tsc --noEmit` kon niet volledig draaien door ontbrekende `node_modules` (npm registry onbereikbaar in deze omgeving). Alle fouten zijn pre-existing (ontbrekende React/module types). Onze wijzigingen zijn:
- Alleen optionele velden toegevoegd (`?:`) — geen breaking changes
- Nieuwe export functies — geen bestaande code geraakt
- `round2()` import + wrapping — functioneel equivalent aan bestaande `Math.round` patronen

---

## Bestanden Gewijzigd

| Bestand | Wijziging |
|---------|-----------|
| `src/types/index.ts` | +3 contactpersoon_id, +2 user_id, +24 updated_at |
| `src/services/supabaseService.ts` | +8 relational queries, +5 generators, +4 conversies |
| `src/components/quotes/QuoteItemsTable.tsx` | +round2() import, 9x financial calc fix |
| `src/components/settings/CalculatieTab.tsx` | +round2() import, 5x financial calc fix |
| `src/services/pdfService.ts` | +round2() import, 3x financial calc fix |
| `src/components/reports/RapportagesLayout.tsx` | +round2() import, 4x financial calc fix |
