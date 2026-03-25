# DOEN Production Readiness Audit
Datum: 25 maart 2026

## Samenvatting
- **7 kritische issues** (moeten voor go-live gefixt)
- **8 hoge prioriteit issues** (moeten snel gefixt)
- **10 medium issues** (fix binnen eerste maand)
- **5 lage prioriteit issues** (nice to have)

---

## 🔴 KRITISCH (moet voor go-live gefixt)

### CRIT-001: Geen applicatie-level tenant isolatie op queries
- **Bestand**: `src/services/supabaseService.ts` (regels 281, 396, 631, 514, 929, 2126, 2262, 2680)
- **Probleem**: Alle 9 kritische lijst-functies (getKlanten, getProjecten, getOffertes, getTaken, getDocumenten, getFacturen, getMedewerkers, getWerkbonnen, getNotificaties) gebruiken `.select('*')` zonder `.eq('user_id', ...)` of `.eq('organisatie_id', ...)` filter
- **Impact**: Vertrouwt volledig op Supabase RLS. Als RLS ooit wordt uitgeschakeld of misconfigured, lekt ALLE data van alle tenants
- **Fix**: Voeg `organisatie_id` filter toe aan elke query als defense-in-depth. Haal `organisatie_id` uit de auth context, niet uit de URL

### CRIT-002: 138 TypeScript errors
- **Bestand**: Voornamelijk `src/services/supabaseService.ts`, `src/services/werkbonPdfService.ts`
- **Probleem**: `npx tsc --noEmit` rapporteert 138 type errors. Werkbon type mist properties (kilometers, km_tarief, omschrijving). DocumentStyle type mismatch in werkbonPdfService (camelCase vs snake_case)
- **Impact**: Runtime crashes mogelijk bij edge cases die TypeScript zou vangen
- **Fix**: Fix de type definities in `types/index.ts` en sync met de database schema

### CRIT-003: Geen pagination op grote datasets
- **Bestand**: `src/services/supabaseService.ts`
- **Probleem**: `getKlanten()` haalt tot 50.000 rijen op (regel 291). `getFacturen()` tot 5.000. `getMedewerkers()`, `getTijdregistraties()`, `getMontageAfspraken()` halen ALLES op zonder LIMIT
- **Impact**: Bij 100+ gebruikers met duizenden records: trage laadtijden, hoog geheugengebruik, mogelijke crashes
- **Fix**: Implementeer server-side pagination met `LIMIT 50` + offset/cursor. Begin met klanten en facturen

### CRIT-004: Secrets in .env.local
- **Bestand**: `forgedesk/.env.local`
- **Probleem**: Bevat live productie secrets: Stripe live key (sk_live_...), Mollie live key, Supabase service role key, FAL API key, Trigger.dev secret, email encryption key
- **Impact**: Als het bestand wordt gedeeld of de machine compromised: volledige toegang tot alle betaaldiensten en database
- **Mitigatie**: Bestand staat in `.gitignore` — niet in git
- **Fix**: Roteer alle keys die ooit buiten de server zijn geweest. Gebruik een secrets manager (Vercel env vars) in productie

### CRIT-005: Multi-tenant organisatie_id ontbreekt op queries
- **Bestand**: `src/services/supabaseService.ts` (32+ queries)
- **Probleem**: Bij de overstap naar multi-tenant (organisatie_id op tabellen) worden de frontend queries niet gefilterd op organisatie_id. RLS vangt dit nu, maar bij service-role API calls is er GEEN isolatie
- **Impact**: API routes die `supabaseAdmin` (service role) gebruiken kunnen data van andere organisaties retourneren als er geen organisatie_id filter is
- **Fix**: Voeg organisatie_id filtering toe aan alle API routes die service role key gebruiken

### CRIT-006: Multi-tenancy architectuur split — user_id vs organisatie_id
- **Bestand**: `supabase/migrations/001_create_all_tables.sql` + migraties 029-044
- **Probleem**: Alle 53 kerntabellen (klanten, projecten, offertes, facturen, taken, werkbonnen, emails, documenten) gebruiken `user_id` isolatie. Nieuwere tabellen (contactpersonen, import_jobs, uitnodigingen, kassaboek) gebruiken `organisatie_id`. Als twee medewerkers bij dezelfde organisatie horen, kunnen ze elkaars klanten/projecten/offertes NIET zien
- **Impact**: Team samenwerking is onmogelijk op kerntabellen. Dit is de grootste architecturele blocker voor multi-user organisaties
- **Fix**: Migratie om `organisatie_id` toe te voegen aan kerntabellen + RLS policies bijwerken van `user_id = auth.uid()` naar `organisatie_id = (SELECT organisatie_id FROM profiles WHERE id = auth.uid())`

### CRIT-007: Hardcoded BTW 21% in werkbon PDF
- **Bestand**: `src/services/pdfService.ts:1625`
- **Probleem**: `const btw = round2(totaalExcl * 0.21)` — negeert het werkelijke BTW-percentage per item. Werkbonnen met 9% BTW items krijgen 21% berekend in de PDF
- **Impact**: Foute BTW-bedragen op werkbon PDF's
- **Fix**: Gebruik het BTW-percentage van elk item i.p.v. hardcoded 0.21

---

## 🟠 HOOG (moet snel gefixt)

### HIGH-001: Race condition bij offerte-acceptatie
- **Bestand**: `api/offerte-accepteren.ts`
- **Probleem**: Geen idempotency guard — als de klant twee keer snel op "Accepteren" klikt, kan de offerte twee keer geaccepteerd worden (dubbele email, dubbele status update)
- **Fix**: Check `offerte.status === 'goedgekeurd'` voordat je accepteert (deels aanwezig voor 'afgewezen', niet voor 'goedgekeurd')

### HIGH-002: Race condition bij Mollie betaling
- **Bestand**: `api/mollie-webhook.ts`
- **Probleem**: Als Mollie de webhook twee keer stuurt (retry), kan de betaling twee keer verwerkt worden
- **Fix**: Check of de factuur al status 'betaald' heeft voordat je het update. Gebruik een `processed_webhook_ids` tabel

### HIGH-003: Branding niet volledig — 277 "FORGEdesk"/"Forgie" referenties
- **Bestanden**: 47 bestanden, waaronder user-visible strings
- **Probleem**: Demo email `demo@forgedesk.nl`, component namen (ForgieSection, IllustratieForgie), service bestanden (forgieService.ts), localStorage keys
- **Impact**: Gebruikers zien oude branding
- **Fix**: Batch rename van alle user-visible strings. Code identifiers en localStorage keys kunnen later

### HIGH-004: Geen ErrorBoundary
- **Bestand**: `src/App.tsx`
- **Probleem**: Geen React ErrorBoundary component gevonden. Een crash in een component = witte pagina
- **Fix**: Voeg een ErrorBoundary toe rond de main app met een "Er is iets misgegaan" fallback UI

### HIGH-005: N+1 queries in ProjectDetail
- **Bestand**: `src/components/projects/ProjectDetail.tsx` (regels 528-547)
- **Probleem**: 13 parallelle queries bij het laden van een project (getProject, getTakenByProject, getDocumenten, getOffertesByProject, etc.). Elke keer als je een project opent = 13 database calls
- **Fix**: Combineer in één Supabase RPC call of gebruik een server-side aggregatie endpoint

### HIGH-006: Service role key fallback naar anon key
- **Bestanden**: `api/ai.ts:6`, `api/ai-chat.ts:6`, `api/ai-email.ts:6`, `api/ai-followup-email.ts:6`, `api/ai-rewrite.ts:6`, `api/analyze-inkoop-offerte.ts:6`, `api/create-checkout-session.ts:20`
- **Probleem**: 7 API files gebruiken `process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''`. Als de service role key niet geconfigureerd is, vallen ze stil terug op de anon key — server-side operations worden dan beperkt door RLS i.p.v. admin access
- **Fix**: Gooi een error als service role key ontbreekt in productie, fail niet stil

### HIGH-007: Marge berekening inconsistentie
- **Bestanden**: `QuoteCreation.tsx:333` vs `QuoteItemsTable.tsx:163`
- **Probleem**: Dezelfde marge percentage wordt verschillend berekend: `Math.round(... * 10) / 10` (1 decimaal) vs `Math.round(... * 1000) / 10` — geeft verschillende resultaten bij edge cases
- **Fix**: Gebruik één `calcMargePercentage()` helper overal

### HIGH-008: Hardcoded salt in encryptie
- **Bestanden**: `api/offerte-accepteren.ts:20`, `api/offerte-wijziging.ts:45`, `api/portaal-reactie.ts:22`
- **Probleem**: `crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32)` — statische salt verzwakt de key derivation
- **Fix**: Gebruik een random salt per encryptie operatie, sla de salt op naast de encrypted data

### HIGH-009: Geen unhandled promise rejection handler
- **Bestand**: `src/main.tsx`
- **Probleem**: Geen `window.addEventListener('unhandledrejection', ...)` — async errors die niet gecatcht worden verdwijnen stilletjes
- **Fix**: Voeg een globale rejection handler toe die fouten logged en een toast toont

---

## 🟡 MEDIUM (fix binnen eerste maand)

### MED-001: 9 `as any` type casts op database operations
- **Bestanden**: `PortaalCompactBlock.tsx:399`, `QuoteCreation.tsx:258`, `ProjectDetail.tsx:1024`, `supabaseService.ts:4057-4077`
- **Probleem**: Bypass type safety bij data die naar de database wordt gestuurd
- **Fix**: Fix de types zodat `as any` niet nodig is

### MED-002: supabaseService.ts is 5701 regels
- **Bestand**: `src/services/supabaseService.ts`
- **Probleem**: Eén monoliet bestand met ALLE database queries. Moeilijk te onderhouden en debuggen
- **Fix**: Split per module: `klantService.ts`, `projectService.ts`, `offerteService.ts`, etc.

### MED-003: 2 stray console.log in productie code
- **Bestanden**: `src/services/portaalNotificatieService.ts:318`, `src/components/email/EmailLayout.tsx:176`
- **Fix**: Vervang door `logger.debug()` of verwijder

### MED-004: Emails ophalen zonder body — dan apart per email
- **Bestand**: `src/services/supabaseService.ts:1011-1023`
- **Probleem**: `getEmails()` haalt 200 emails op zonder body, dan wordt per email apart de body opgehaald bij openen. Dit is correct maar de initiële 200 kan traag worden
- **Fix**: Implementeer virtuele scrolling in de email lijst

### MED-005: API routes gebruiken "minimale" input validatie
- **Bestanden**: Alle 28 authenticated API routes
- **Probleem**: Input wordt geaccepteerd als het niet `undefined` is. Geen schema validatie (Zod/Yup)
- **Fix**: Voeg Zod schema validatie toe aan de meest kritische routes (betaling, offerte-acceptatie)

### MED-006: Tabellen zonder organisatie_id
- **Database migraties**: `document_styles`, `visualizer_credits`, `credit_transacties`, `portaal_activiteiten`
- **Probleem**: Deze tabellen hebben alleen `user_id`, geen `organisatie_id`. Bij multi-tenant worden ze niet automatisch gefilterd
- **Fix**: Voeg `organisatie_id` kolom toe via migratie

### MED-007: Geen LIMIT op dashboard queries
- **Bestand**: `src/components/dashboard/` widgets
- **Probleem**: Dashboard widgets laden elk apart data (projecten, offertes, facturen, taken). Geen LIMIT of caching
- **Fix**: Maak een dashboard RPC endpoint die alle data in één call retourneert

### MED-008: N+1 queries in supabaseService.ts — 5 sequentiële loops
- **Bestanden**: `supabaseService.ts:2872` (getWerkbonItemsMetAfbeeldingen), `:2921` (deleteWerkbonItem), `:4436` (createFactuurFromOfferte), `:4494` (createFactuurFromWerkbon), `:4558` (createCreditnota)
- **Probleem**: Queries worden in for-loops uitgevoerd (INSERT per item, DELETE per afbeelding). Bij 50 items = 50 database calls
- **Fix**: Gebruik batch INSERT/DELETE of een Supabase RPC functie

### MED-009: BTW reverse-engineering verliest precisie bij mixed rates
- **Bestand**: `FactuurEditor.tsx:430,439,520,574`
- **Probleem**: BTW percentage wordt berekend als `Math.round((btw_bedrag / subtotaal) * 100)` — integer rounding verliest precisie als een offerte zowel 9% als 21% items heeft
- **Fix**: Bewaar het BTW-percentage per item, niet berekend uit totalen

### MED-010: Werkbon type definitie out of sync
- **Bestand**: `src/types/index.ts` vs `src/services/werkbonPdfService.ts`
- **Probleem**: Type gebruikt `heading_font` maar code probeert `headingFont` (camelCase). 15+ type errors
- **Fix**: Sync de type definitie met de database schema

---

## 🟢 LAAG (nice to have)

### LOW-001: localStorage keys gebruiken "forgedesk_" prefix
- **Bestanden**: 30+ localStorage calls
- **Probleem**: Oude branding in localStorage keys
- **Fix**: Geen haast — kan met een migratie script

### LOW-002: Geen rate limiting op client-side
- **Probleem**: Een gebruiker kan snel klikken en meerdere API calls triggeren
- **Fix**: Debounce op kritische acties (opslaan, versturen)

### LOW-003: PDF generatie kan traag zijn met grote bijlagen
- **Bestand**: `src/services/pdfService.ts`
- **Probleem**: `resolveImageToBase64()` fetcht afbeeldingen met 8s timeout. Bij meerdere grote bijlagen kan PDF generatie 30+ seconden duren
- **Fix**: Toon een loading indicator en overweeg server-side PDF generatie

### LOW-004: offerte-publiek.ts retourneert select('*') via service role
- **Bestand**: `api/offerte-publiek.ts:58`
- **Probleem**: Gebruikt `.select('*')` met service role key (bypassed RLS). Items worden gefilterd met `pick()`, maar de offerte zelf niet — als response serialisatie verandert, kunnen interne velden lekken
- **Fix**: Specificeer exacte kolommen in de `.select()` call

### LOW-005: Geen audit trail voor kritische acties
- **Probleem**: Beperkte logging van wie wat wanneer heeft gewijzigd. `logWijziging` bestaat maar wordt niet overal gebruikt
- **Fix**: Voeg audit logging toe aan offerte status changes, factuur betalingen, portaal goedkeuringen

---

## RLS Activatie Plan

RLS is al **INGESCHAKELD** op alle tabellen met `auth.uid() = user_id` policies (bron: `supabase/rls_policies.sql`).

### Aanbevolen uitbreidingen:
1. **Voeg `organisatie_id` policies toe** — wanneer multi-tenant live gaat:
   ```sql
   CREATE POLICY "org_isolation" ON klanten
   FOR ALL USING (organisatie_id = (SELECT organisatie_id FROM profiles WHERE id = auth.uid()));
   ```
2. **Service role bypass** — API routes die `supabaseAdmin` gebruiken omzeilen RLS al (correct)
3. **Publieke routes** — portaal/betaling endpoints gebruiken service role key + token validatie (correct)

### Breaking changes bij multi-tenant RLS:
- Alle queries die `user_id` filteren moeten ook `organisatie_id` filteren
- Teamleden binnen één organisatie moeten elkaars data kunnen zien → RLS policy op `organisatie_id` i.p.v. `user_id`

---

## Performance Aanbevelingen

1. **Pagination** — Implementeer server-side pagination voor klanten, projecten, offertes, facturen (de 4 grootste tabellen)
2. **Dashboard batching** — Eén RPC call voor alle dashboard data i.p.v. 8 losse queries
3. **ProjectDetail batching** — Combineer de 13 queries tot 1-3 batched calls
4. **Lazy loading** — Alle grote componenten (>500 regels) worden al lazy-loaded via `App.tsx` ✓
5. **Email lijst** — Implementeer virtuele scrolling voor de email inbox
6. **Bundle splitting** — `supabaseService.ts` (5701 regels) wordt volledig geladen. Overweeg tree-shaking-friendly module splits
