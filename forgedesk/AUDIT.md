# doen. Audit Report

**Datum:** 2026-03-14 (basis), uitgebreid 2026-03-25 en 2026-04-29
**Scope:** Volledige pre-RLS audit van de doen. codebase
**Repository:** `forgedesk/` in `sign-company`
**Supabase project:** hrqxmelzguhohzzwjfzg

---

## Status (april 2026)

Status per blokker nog te valideren — zie git history en branches.

De onderstaande inventarisatie is samengesteld uit twee audit-rondes (maart 2026). Geen van de bron-bestanden bevat expliciete markeringen van "opgelost" voor specifieke blokkers. Daarom worden alle 15 blokkers (B1–B15) en alle hoge/medium/lage issues uit de oorspronkelijke rapportage als **openstaand** beschouwd totdat verificatie via git of database-inspectie anders aantoont.

Aanvullende observaties uit de productie-checklist van 25 maart 2026 (CRIT-001 t/m CRIT-007, HIGH-001 t/m HIGH-009, MED-001 t/m MED-010, LOW-001 t/m LOW-005) zijn integraal meegenomen — zie de RLS Activatie Plan en Performance Aanbevelingen secties hieronder, en overlap is geclusterd.

**Uitvoering:** Zie `PLAN-VAN-AANPAK.md` voor de gestructureerde aanpak per blokker (let op: `PLAN-VAN-AANPAK.md` is nog niet aanwezig — wacht op Set 3 van de documentatie-merge).

---

## Samenvatting

- **15** 🔴 BLOKKERS
- **18** 🟠 HOOG
- **16** 🟡 MEDIUM
- **12** ⚪ LAAG

Aanvullende productie-readiness issues uit de maart-25 checklist:

- **7 kritische issues** (CRIT-001 t/m CRIT-007)
- **8 hoge prioriteit issues** (HIGH-001 t/m HIGH-008/9)
- **10 medium issues** (MED-001 t/m MED-010)
- **5 lage prioriteit issues** (LOW-001 t/m LOW-005)

---

## 🔴 Blokkers (fix voor RLS/launch)

### B1: 49 van 62 insert-functies missen user_id op service-laag
- **Bestand**: `src/services/supabaseService.ts` (verspreid over hele bestand)
- **Probleem**: Functies zoals `createProject`, `createOfferte`, `createFactuur`, `createWerkbon` etc. sturen geen `user_id` mee in het insert-object. Ze vertrouwen op de caller (component) om user_id in het data-object te zetten.
- **Consequentie**: Met RLS policy `user_id = auth.uid()` en GEEN `DEFAULT auth.uid()` op de kolom zullen alle inserts falen met policy violation.
- **Fix richting**: Voeg `DEFAULT auth.uid()` toe aan de `user_id` kolom van alle tabellen via een migratie. Lange termijn: refactor service-functies om `userId` als verplichte parameter te accepteren.
- **Geschatte effort**: M (migratie) + L (refactor)

### B2: send-email.ts is een open SMTP relay
- **Bestand**: `api/send-email.ts` (heel bestand)
- **Probleem**: Geen authenticatie. Iedereen kan SMTP-credentials, ontvanger, onderwerp en body meesturen en emails versturen.
- **Consequentie**: Misbruik voor phishing en spam op schaal.
- **Fix richting**: Voeg Bearer token auth (verifyUser) toe.
- **Geschatte effort**: S

### B3: fetch-emails.ts en read-email.ts accepteren user_id zonder auth
- **Bestand**: `api/fetch-emails.ts:22-23`, `api/read-email.ts:14-22`
- **Probleem**: Accepteren `user_id` direct uit request body zonder authenticatie. Een aanvaller kan emails schrijven naar/lezen van elke gebruiker's email cache via de service_role client.
- **Consequentie**: Email data van alle gebruikers is toegankelijk/manipuleerbaar door iedereen.
- **Fix richting**: Voeg Bearer token auth toe en gebruik het auth user_id i.p.v. body user_id.
- **Geschatte effort**: S

### B4: Mollie webhook signature check is conditioneel
- **Bestand**: `api/mollie-webhook.ts:17-27`
- **Probleem**: `if (MOLLIE_WEBHOOK_SECRET)` — als de env var niet is gezet (default `''`), wordt de hele signature check overgeslagen. Daarnaast wordt HMAC berekend over `JSON.stringify(req.body)` terwijl Mollie `application/x-www-form-urlencoded` stuurt — de signature klopt dus nooit.
- **Consequentie**: Iedereen kan de webhook callen met een willekeurige paymentId en facturen als betaald markeren.
- **Fix richting**: Maak signature check verplicht. Gebruik raw body voor HMAC zoals stripe-webhook.ts doet.
- **Geschatte effort**: S

### B5: Mollie webhook retourneert altijd 200 bij errors
- **Bestand**: `api/mollie-webhook.ts:108-112`
- **Probleem**: De catch-block retourneert altijd HTTP 200. Als de Supabase update faalt, denkt Mollie dat de webhook succesvol is afgeleverd.
- **Consequentie**: Klant heeft betaald, maar factuur blijft op "open" staan. Geen retry, geen alert.
- **Fix richting**: Retourneer 500 bij DB-fouten zodat Mollie retry't. Implementeer idempotency check.
- **Geschatte effort**: S

### B6: Exact Online sync berekent BTW dubbel verkeerd
- **Bestand**: `api/exact-sync-factuur.ts:297`
- **Probleem**: `item.totaal` op factuur_items is al excl. BTW. De code deelt het nogmaals door `(1 + btw_percentage / 100)`, waardoor elk bedrag ~17.4% te laag wordt voor 21%-items.
- **Consequentie**: Alle facturen in Exact Online hebben verkeerde bedragen. Boekhouding klopt niet.
- **Fix richting**: Verwijder de dubbele BTW-aftrek.
- **Geschatte effort**: S

### B7: manage-team-member.ts mist autorisatie
- **Bestand**: `api/manage-team-member.ts:28-30`
- **Probleem**: Verifieert authenticatie maar gooit het user_id weg. Elke geauthenticeerde gebruiker kan de rol wijzigen, blokkeren of deblokkeren van ELKE profile_id in het hele systeem.
- **Consequentie**: Privilege escalation — een gewone gebruiker kan zichzelf admin maken of andere gebruikers blokkeren.
- **Fix richting**: Check dat de caller admin is van dezelfde organisatie als het target profile.
- **Geschatte effort**: M

### B8: invite-team-member.ts mist admin-role check
- **Bestand**: `api/invite-team-member.ts:27-29`
- **Probleem**: Elke geauthenticeerde gebruiker kan uitnodigingen sturen voor elke organisatie.
- **Consequentie**: Ongeautoriseerde gebruikers kunnen teamleden toevoegen aan willekeurige organisaties.
- **Fix richting**: Check dat caller admin is van de opgegeven organisatie_id.
- **Geschatte effort**: S

### B9: test-email-connection.ts zonder auth — SSRF vector
- **Bestand**: `api/test-email-connection.ts` (heel bestand)
- **Probleem**: Accepteert SMTP/IMAP host en port zonder authenticatie. Kan gebruikt worden om interne infrastructuur te proben.
- **Consequentie**: Server-Side Request Forgery (SSRF).
- **Fix richting**: Voeg Bearer token auth toe.
- **Geschatte effort**: S

### B10: Twee conflicterende basisschema's
- **Bestand**: `supabase/schema.sql` vs `supabase/migrations/001_create_all_tables.sql`
- **Probleem**: Beide definiëren dezelfde tabellen met incompatibele structuren. profiles PK: schema.sql gebruikt `id REFERENCES auth.users`, 001 gebruikt `id gen_random_uuid()` + aparte `user_id`. De `handle_new_user` trigger werkt alleen met het schema.sql-pad.
- **Consequentie**: Onduidelijk welk schema actief is. Als 001 actief is, kan de trigger profielen aanmaken waar user_id nooit wordt gezet.
- **Fix richting**: Verifieer welk schema live draait. Verwijder of markeer het andere als deprecated.
- **Geschatte effort**: M

### B11: Geen CREATE TABLE organisaties in migraties
- **Bestand**: `supabase/migrations/029_trial_and_onboarding.sql`, `030_create_organisaties_uitnodigingen.sql`
- **Probleem**: Migrations 029 en 030 doen `ALTER TABLE organisaties`, maar geen enkele migratie bevat `CREATE TABLE organisaties`.
- **Consequentie**: Migraties falen als de tabel niet handmatig is aangemaakt. Nieuwe omgevingen kunnen niet reproduceerbaar worden opgezet.
- **Fix richting**: Voeg een migratie toe die `CREATE TABLE IF NOT EXISTS organisaties` doet.
- **Geschatte effort**: S

### B12: Profiles tabel mist 5 kolommen voor team-functionaliteit
- **Bestand**: `supabase/migrations/028_update_handle_new_user.sql`
- **Probleem**: De `handle_new_user()` trigger inserteert waarden in `organisatie_id`, `rol`, `status`, `uitgenodigd_door`, `uitgenodigd_op` — maar geen enkele migratie voegt deze kolommen toe.
- **Consequentie**: De trigger faalt bij elke nieuwe gebruikersregistratie. Registratie is kapot.
- **Fix richting**: Voeg een migratie toe die de ontbrekende kolommen aanmaakt.
- **Geschatte effort**: S

### B13: CORS staat open op Access-Control-Allow-Origin: *
- **Bestand**: `vercel.json:15`
- **Probleem**: Alle API routes accepteren cross-origin requests van elk domein.
- **Consequentie**: Elke website kan de publieke endpoints aanroepen. In combinatie met de onbeveiligde email-routes is dit extra gevaarlijk.
- **Fix richting**: Restrict naar `https://app.forgedesk.io`.
- **Geschatte effort**: S

### B14: ClientProfile crasht op niet-bestaand klant-UUID
- **Bestand**: `src/components/clients/ClientProfile.tsx:172`
- **Probleem**: Wanneer `getKlant(id)` null retourneert, probeert de code `klantData.email.toLowerCase()` → TypeError crash.
- **Consequentie**: Navigeren naar `/klanten/fake-uuid` crasht de app.
- **Fix richting**: Voeg null-check toe met redirect en toast.
- **Geschatte effort**: S

### B15: ProjectDetail crasht op niet-bestaand project-UUID
- **Bestand**: `src/components/projects/ProjectDetail.tsx` (loadData functie)
- **Probleem**: `project` wordt null, maar alle renders lezen `project.naam`, `project.klant_id` etc.
- **Consequentie**: Navigeren naar `/projecten/fake-uuid` crasht de app.
- **Fix richting**: Voeg null-check toe zoals WerkbonDetail dat correct doet.
- **Geschatte effort**: S

---

## Aanvullende kritische issues (productie-checklist 25 maart 2026)

### CRIT-001: Geen applicatie-level tenant isolatie op queries
- **Bestand**: `src/services/supabaseService.ts` (regels 281, 396, 631, 514, 929, 2126, 2262, 2680)
- **Probleem**: Alle 9 kritische lijst-functies (getKlanten, getProjecten, getOffertes, getTaken, getDocumenten, getFacturen, getMedewerkers, getWerkbonnen, getNotificaties) gebruiken `.select('*')` zonder `.eq('user_id', ...)` of `.eq('organisatie_id', ...)` filter
- **Impact**: Vertrouwt volledig op Supabase RLS. Als RLS ooit wordt uitgeschakeld of misconfigured, lekt ALLE data van alle tenants
- **Fix**: Voeg `organisatie_id` filter toe aan elke query als defense-in-depth. Haal `organisatie_id` uit de auth context, niet uit de URL

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

### CRIT-005: Multi-tenant organisatie_id ontbreekt op queries (service-role API)
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

> **Opmerking:** CRIT-002 (138 TS errors) komt overeen met de TypeScript Build Status sectie verderop. CRIT-001/005 vullen B1 aan met de tenant-isolatie kant van het verhaal.

---

## 🟠 Hoog (fix voor eerste echte klant)

### H1: Werkbon TypeScript type mist 9 velden
- **Bestand**: `src/types/index.ts:1064-1091`
- **Probleem**: De Werkbon interface mist `kilometers`, `km_tarief`, `omschrijving`, `contactpersoon_id`, `factuur_id`, `start_tijd`, `eind_tijd`, `pauze_minuten`, `interne_notitie`.
- **Consequentie**: TypeScript errors in `supabaseService.ts:4163,4180,4186,4208-4210`. De `convertWerkbonToFactuur` functie compileert niet correct.
- **Fix richting**: Voeg de ontbrekende velden toe aan de Werkbon interface.
- **Geschatte effort**: S

### H2: Werkbon status enum mismatch
- **Bestand**: `src/types/index.ts` (Werkbon.status)
- **Probleem**: TS: 3 waarden. DB: 6 waarden (`ingediend`, `goedgekeurd`, `gefactureerd` missen). `supabaseService.ts:4218` schrijft `'gefactureerd'` wat niet in het TS type zit.
- **Fix richting**: Breid het TS type uit met alle 6 statussen.
- **Geschatte effort**: S

### H3: werkbonPdfService.ts gebruikt verkeerde property-namen
- **Bestand**: `src/services/werkbonPdfService.ts:25,30,31,37,41`
- **Probleem**: Gebruikt `primaryColor`, `textColor`, `headingFont`, `bodyFont` maar DocumentStyle heeft `primaire_kleur`, `tekst_kleur`, `heading_font`, `body_font`.
- **Consequentie**: PDF generatie voor werkbonnen is volledig kapot — alle styling-waarden zijn `undefined`.
- **Fix richting**: Hernoem naar de correcte property-namen.
- **Geschatte effort**: S

### H4: Hardcoded 21% BTW in werkbon→factuur en tijdregistratie→factuur
- **Bestand**: `src/services/supabaseService.ts:4165,4197,4211`, `src/components/timetracking/TijdregistratieLayout.tsx:532,540`
- **Probleem**: BTW hardcoded op 21%. Geen rekening met 9% of 0%.
- **Consequentie**: Werkbonnen en tijdregistraties met afwijkend BTW-tarief worden verkeerd gefactureerd.
- **Fix richting**: Gebruik `settings.standaard_btw` of per-item BTW instelling.
- **Geschatte effort**: M

### H5: Geen unique constraints op documentnummers
- **Bestand**: Supabase schema (geen constraint aanwezig)
- **Probleem**: `offerte_nummer`, `factuur_nummer`, `werkbon_nummer` etc. hebben geen `UNIQUE(nummer, user_id)`.
- **Consequentie**: Race conditions kunnen dubbele nummers produceren. Boekhoudkundig probleem.
- **Fix richting**: Voeg `UNIQUE(nummer, user_id)` constraints toe via migratie.
- **Geschatte effort**: S

### H6: GedeeldeInboxLayout — XSS via dangerouslySetInnerHTML zonder sanitizatie
- **Bestand**: `src/components/email/GedeeldeInboxLayout.tsx:364`
- **Probleem**: `dangerouslySetInnerHTML={{ __html: selectedEmail.inhoud || '' }}` zonder DOMPurify. EmailReader.tsx:991 doet dit WEL correct.
- **Consequentie**: Stored XSS via kwaadaardige emails.
- **Fix richting**: Gebruik `DOMPurify.sanitize()` zoals in EmailReader.tsx.
- **Geschatte effort**: S

### H7: HTML-injectie in email notificaties via portaal
- **Bestand**: `api/offerte-accepteren.ts:154`, `api/offerte-wijziging.ts:144,146`, `api/goedkeuring-reactie.ts:125,157`
- **Probleem**: User-supplied waarden worden direct in HTML email strings geïnterpoleerd zonder escaping. `_emailTemplate.ts` heeft `escapeHtml()` maar deze wordt niet gebruikt.
- **Consequentie**: Phishing content injection in legitieme notificatie-emails.
- **Fix richting**: Gebruik `escapeHtml()` uit `_emailTemplate.ts`.
- **Geschatte effort**: S

### H8: Stored XSS via portaal reacties
- **Bestand**: `api/portaal-reactie.ts:98-99`
- **Probleem**: `bericht` en `klant_naam` worden raw opgeslagen in `portaal_reacties`.
- **Consequentie**: Klant kan kwaadaardige content injecteren die in de browser van de admin draait.
- **Fix richting**: Sanitize bij opslag of bij rendering.
- **Geschatte effort**: S

### H9: create-subscription.ts mist ownership check
- **Bestand**: `api/create-subscription.ts:39-40`
- **Probleem**: Elke geauthenticeerde gebruiker kan Stripe billing sessions aanmaken voor elke organisatie.
- **Consequentie**: Billing fraude.
- **Fix richting**: Check dat caller eigenaar is van de opgegeven organisatie_id.
- **Geschatte effort**: S

### H10: project_portalen missen FK op project_id
- **Bestand**: Schema — geen FK constraint
- **Probleem**: Bij verwijdering van een project blijven portalen en items als orphans bestaan.
- **Fix richting**: Voeg FK toe met `ON DELETE CASCADE`.
- **Geschatte effort**: S

### H11: OAuth CSRF in Exact Online integratie
- **Bestand**: `api/exact-auth.ts:48`, `api/exact-callback.ts:17`
- **Probleem**: OAuth `state` parameter is het rauwe `user_id` zonder HMAC of nonce.
- **Consequentie**: Aanvaller kan zijn Exact Online account koppelen aan het doen.-account van een slachtoffer.
- **Fix richting**: Voeg HMAC signing toe aan de state parameter.
- **Geschatte effort**: M

### H12: ClientProfile — geen .catch() op Promise.all, oneindige spinner
- **Bestand**: `src/components/clients/ClientProfile.tsx:155-193`
- **Probleem**: `.then(...)` chain zonder `.catch()` en zonder `.finally()`.
- **Consequentie**: Oneindige spinner bij network error op de klantpagina.
- **Fix richting**: Voeg `.catch()` toe met error toast en `.finally(() => setIsLoading(false))`.
- **Geschatte effort**: S

### H13: ai.ts endpoint heeft geen usage limit
- **Bestand**: `api/ai.ts`
- **Probleem**: Roept Anthropic direct aan zonder `checkUsageLimit()`. Andere AI endpoints hebben wel een maandlimiet.
- **Consequentie**: Onbeperkt API-kosten genereren met geldige sessie.
- **Fix richting**: Voeg dezelfde usage limit check toe.
- **Geschatte effort**: S

### H14: Email wachtwoord in plaintext in localStorage
- **Bestand**: `src/services/gmailService.ts:225-243`, `src/components/settings/SettingsLayout.tsx:1739`
- **Probleem**: Het email app-wachtwoord wordt plaintext opgeslagen in `localStorage`. Server-side wordt het correct encrypted.
- **Consequentie**: Elke XSS-aanval of browser-extensie kan het wachtwoord lezen.
- **Fix richting**: Verwijder localStorage opslag. Gebruik server-side decryptie.
- **Geschatte effort**: M

### H15: createKlant fallback naar user_id = ''
- **Bestand**: `src/services/supabaseService.ts:198`
- **Probleem**: `user?.id || ''` — als auth faalt wordt user_id een lege string.
- **Consequentie**: Records met `user_id = ''` zijn onzichtbaar onder RLS.
- **Fix richting**: Throw error als user null is.
- **Geschatte effort**: S

### H16: Mixed-rate BTW back-calculatie produceert ongeldige tarieven
- **Bestand**: `src/components/invoices/FacturenLayout.tsx:500,737,866`, `src/components/invoices/FactuurEditor.tsx:359`
- **Probleem**: `Math.round((btw_bedrag / subtotaal) * 100)` berekent gemiddeld BTW-%. Bij mixed-rate offertes produceert dit een ongeldig tarief (bijv. 15%).
- **Fix richting**: Maak aparte factuurregels per BTW-groep bij conversie.
- **Geschatte effort**: M

### H17: AppSettings mist 7 velden in database
- **Bestand**: `src/types/index.ts` (AppSettings interface)
- **Probleem**: `quick_actions_enabled`, `quick_action_items`, `werkbon_monteur_uren`, `werkbon_monteur_opmerkingen`, `werkbon_monteur_fotos`, `werkbon_klant_handtekening`, `werkbon_briefpapier` — geen DB-kolommen in migraties.
- **Consequentie**: Werkt alleen als app_settings een jsonb kolom is. Indien discrete kolommen: worden genegeerd.
- **Fix richting**: Verifieer of app_settings jsonb of discrete kolommen gebruikt. Voeg kolommen toe indien nodig.
- **Geschatte effort**: S

### H18: Portaal-upload path traversal via bestandsnaam
- **Bestand**: `api/portaal-upload.ts:97`
- **Probleem**: `bestandsnaam` uit client body direct in storage-pad. Een naam als `../../other-bucket/file.pdf` kan naar onbedoelde locaties schrijven.
- **Fix richting**: Strip path separators en `..` sequences.
- **Geschatte effort**: S

---

## Aanvullende hoge prioriteit issues (productie-checklist 25 maart 2026)

### HIGH-001: Race condition bij offerte-acceptatie
- **Bestand**: `api/offerte-accepteren.ts`
- **Probleem**: Geen idempotency guard — als de klant twee keer snel op "Accepteren" klikt, kan de offerte twee keer geaccepteerd worden (dubbele email, dubbele status update)
- **Fix**: Check `offerte.status === 'goedgekeurd'` voordat je accepteert (deels aanwezig voor 'afgewezen', niet voor 'goedgekeurd')

### HIGH-002: Race condition bij Mollie betaling
- **Bestand**: `api/mollie-webhook.ts`
- **Probleem**: Als Mollie de webhook twee keer stuurt (retry), kan de betaling twee keer verwerkt worden
- **Fix**: Check of de factuur al status 'betaald' heeft voordat je het update. Gebruik een `processed_webhook_ids` tabel

### HIGH-003: Branding niet volledig — 277 oude product-/AI-referenties
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

## 🟡 Medium (fix voor schaal)

### M1: 30+ select-functies missen user_id filter
- **Bestand**: `src/services/supabaseService.ts` (verspreid)
- **Probleem**: `getKlanten`, `getProjecten`, `getOffertes`, etc. fetchen ALLE records zonder `.eq('user_id', ...)`.
- **Consequentie**: Met RLS: automatisch gescoped (correct). Zonder: alle data zichtbaar.
- **Geschatte effort**: L

### M2: deleteAIChats() verwijdert ALLE rijen
- **Bestand**: `src/services/supabaseService.ts:1180`
- **Probleem**: `.delete().neq('id', '')` zonder user_id filter.
- **Geschatte effort**: S

### M3: markAlleNotificatiesGelezen() mist user_id filter
- **Bestand**: `src/services/supabaseService.ts:2107`
- **Geschatte effort**: S

### M4: Afrondingskorting bij mixed BTW-tarieven
- **Bestand**: `src/components/quotes/QuoteCreation.tsx:1306,1369,872,1536,2626,2644,2650`
- **Probleem**: BTW op afrondingskorting gebruikt gewogen gemiddelde tarief i.p.v. proportionele verdeling.
- **Geschatte effort**: M

### M5: Tijdregistratie display totaal zonder round2
- **Bestand**: `src/components/timetracking/TijdregistratieLayout.tsx:1051`
- **Geschatte effort**: S

### M6: Revenue sums zonder round2 op dashboard
- **Bestand**: `src/components/reports/RapportagesLayout.tsx:182`, `src/components/dashboard/SalesPulseWidget.tsx:84`, `src/components/financial/FinancialLayout.tsx:57-71`
- **Geschatte effort**: S

### M7: PortaalPagina visibilitychange listener lekt
- **Bestand**: `src/components/portaal/PortaalPagina.tsx:170-176`
- **Geschatte effort**: S

### M8: useAnimatedCounter mist cleanup
- **Bestand**: `src/components/dashboard/StatisticsCards.tsx:12-25`
- **Geschatte effort**: S

### M9: 12+ ontbrekende foreign key constraints
- **Bestand**: Supabase schema
- **Probleem**: `werkbonnen.factuur_id`, `werkbonnen.contactpersoon_id`, `leveringsbonnen.werkbon_id/bestelbon_id`, `deals.contactpersoon_id/medewerker_id`, `facturen.werkbon_id`, etc.
- **Geschatte effort**: M

### M10: HuisstijlTab parseInt zonder NaN guard (6x)
- **Bestand**: `src/components/settings/HuisstijlTab.tsx:708,732,743,754,765,795`
- **Geschatte effort**: S

### M11: Encryption salt is hardcoded 'salt'
- **Bestand**: `api/email-settings.ts:9`, `api/offerte-accepteren.ts:29`, `api/offerte-wijziging.ts:29`
- **Geschatte effort**: M

### M12: portaal-reactie.ts schrijft naar oude notificaties-tabel
- **Bestand**: `api/portaal-reactie.ts:151`
- **Probleem**: Insert naar `notificaties` tabel terwijl de app `app_notificaties` gebruikt.
- **Geschatte effort**: S

### M13: ai.ts en ai-rewrite.ts fallback naar anon key
- **Bestand**: `api/ai.ts:6`, `api/ai-rewrite.ts:6`
- **Probleem**: `SUPABASE_SERVICE_ROLE_KEY || VITE_SUPABASE_ANON_KEY` — silent fallback naar anon key.
- **Geschatte effort**: S

### M14: Offerte status 'wijziging_gevraagd' ontbreekt in DB CHECK
- **Bestand**: `supabase/migrations/005_fix_column_mismatches.sql`
- **Geschatte effort**: S

### M15: Migratie 027 ontbreekt
- **Bestand**: `supabase/migrations/` — springt van 026 naar 028
- **Geschatte effort**: S

### M16: QuoteCreation useEffect met lege deps array leest scope variabelen
- **Bestand**: `src/components/quotes/QuoteCreation.tsx:403-422`
- **Geschatte effort**: S

---

## Aanvullende medium issues (productie-checklist 25 maart 2026)

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

## ⚪ Laag (technische schuld)

### L1: Geen route-level code splitting
- **Bestand**: `src/App.tsx:10-74` — 65+ statisch geïmporteerde routes, geen `React.lazy()`.
- **Geschatte effort**: M

### L2: jsPDF statisch geïmporteerd (~300KB)
- **Bestand**: `src/services/pdfService.ts:1-2`, `src/services/werkbonPdfService.ts:1`
- **Geschatte effort**: S

### L3: 22 ongebruikte componenten — zie Bijlage D
- **Geschatte effort**: S

### L4: 77 ongebruikte functies in supabaseService.ts — zie Bijlage D
- **Geschatte effort**: M

### L5: Duplicate utility functies in API routes
- **Bestand**: `api/ai-chat.ts`, `api/ai-rewrite.ts`, `api/ai-email.ts`, en ~10 andere
- **Geschatte effort**: M

### L6: Duplicate notificatie-systemen
- **Bestand**: `src/services/supabaseService.ts:2069-2113` en `5248-5323`
- **Geschatte effort**: M

### L7: KVK test API key hardcoded in source
- **Bestand**: `api/kvk-basisprofiel.ts:7`, `api/kvk-zoeken.ts:7`
- **Geschatte effort**: S

### L8: user?.id || '' patroon in meerdere componenten
- **Bestand**: `FactuurEditor.tsx:503`, `ProjectCreate.tsx:110`, `WerkbonDetail.tsx:216`, `QuoteCreation.tsx`
- **Geschatte effort**: S

### L9: 3 ongebruikte hooks — `useLocalStorage.ts`, `useDebounce.ts`, `useTrialGuard.ts`
- **Geschatte effort**: S

### L10: Medewerker type mist `email_handtekening`, `handtekening_afbeelding`
- **Geschatte effort**: S

### L11: MontageAfspraak mist `werkbon_id` veld
- **Geschatte effort**: S

### L12: ai.ts client controleert max_tokens — geen server-side cap
- **Bestand**: `api/ai.ts:38`
- **Geschatte effort**: S

---

## Aanvullende lage prioriteit issues (productie-checklist 25 maart 2026)

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

---

## Bijlage A: user_id Coverage Tabel

### Insert-functies (62 totaal)

| Functie | Tabel | user_id? | Bron | Probleem |
|---------|-------|----------|------|----------|
| createKlant | klanten | JA | klant.user_id, fallback auth.getUser() | Fallback naar '' |
| updateAppSettings | app_settings | JA | userId param | OK |
| updateProfile | profiles | JA | userId param | OK |
| upsertDocumentStyle | document_styles | JA | userId param | OK |
| createPortaal | project_portalen | JA | userId param | OK |
| createProjectFoto | project_fotos | JA | foto.user_id | OK |
| createSigningVisualisatie | signing_visualisaties | JA | data.user_id | OK |
| logVisualizerActie | visualizer_api_log | JA | data.user_id | OK |
| getVisualizerCredits (insert) | visualizer_credits | JA | user_id param | OK |
| gebruikCredit | credit_transacties | JA | user_id param | OK |
| voegCreditsToe | credit_transacties | JA | user_id param | OK |
| handmatigCreditsToewijzen | credit_transacties | JA | user_id param | OK |
| createOrganisatie | organisaties | JA | eigenaarId | OK |
| createProject | projecten | **NEE** | Caller | ONTBREEKT |
| createTaak | taken | **NEE** | Caller | ONTBREEKT |
| createOfferte | offertes | **NEE** | Caller | ONTBREEKT |
| createOfferteItem | offerte_items | **NEE** | Caller | ONTBREEKT |
| createDocument | documenten | **NEE** | Caller | ONTBREEKT |
| createEmail | emails | **NEE** | Caller | ONTBREEKT |
| createFactuur | facturen | **NEE** | Caller | ONTBREEKT |
| createFactuurItem | factuur_items | **NEE** | Caller | ONTBREEKT |
| createTijdregistratie | tijdregistraties | **NEE** | Caller | ONTBREEKT |
| createMedewerker | medewerkers | **NEE** | Caller | ONTBREEKT |
| createNotificatie | notificaties | **NEE** | Caller | ONTBREEKT |
| createMontageAfspraak | montage_afspraken | **NEE** | Caller | ONTBREEKT |
| createWerkbon | werkbonnen | **NEE** | Caller | ONTBREEKT |
| createWerkbonItem | werkbon_items | **NEE** | Caller | ONTBREEKT |
| createWerkbonFoto | werkbon_fotos | **NEE** | Caller | ONTBREEKT |
| createLeverancier | leveranciers | **NEE** | Caller | ONTBREEKT |
| createUitgave | uitgaven | **NEE** | Caller | ONTBREEKT |
| createBestelbon | bestelbonnen | **NEE** | Caller | ONTBREEKT |
| createLeveringsbon | leveringsbonnen | **NEE** | Caller | ONTBREEKT |
| createDeal | deals | **NEE** | Caller | ONTBREEKT |
| *(+ 16 meer)* | *(diverse)* | **NEE** | Caller | ONTBREEKT |

**Score: 13 OK / 49 ONTBREEKT (79% failure rate)**

---

## Bijlage B: API Route Security Tabel

| Route | Auth? | Publiek? | Rate limit? | Risico |
|-------|-------|----------|-------------|--------|
| ai.ts | JA | Nee | NEE | Geen usage limit, max_tokens door client |
| ai-chat.ts | JA | Nee | Maandcap | OK |
| ai-email.ts | JA | Nee | Maandcap | OK |
| ai-rewrite.ts | JA | Nee | Maandcap | Fallback naar anon key |
| create-checkout-session.ts | JA | Nee | NEE | Open redirect via success_url |
| create-subscription.ts | JA | Nee | NEE | Geen ownership check |
| email-settings.ts | JA | Nee | NEE | Static salt |
| exact-auth.ts | JA | Nee | NEE | OAuth CSRF |
| exact-callback.ts | NEE | JA (OAuth) | NEE | CSRF risk |
| **fetch-emails.ts** | **NEE** | **NEE** | **NEE** | **user_id injectie** |
| goedkeuring-reactie.ts | NEE (token) | JA | 10/hr/IP | HTML-injectie email |
| invite-team-member.ts | JA | Nee | NEE | Geen admin check |
| kvk-basisprofiel.ts | JA | Nee | 20/min | Hardcoded test key |
| manage-team-member.ts | JA | Nee | NEE | **Geen autorisatie** |
| mollie-webhook.ts | NEE | JA | NEE | **Conditionele signature** |
| offerte-accepteren.ts | NEE (token) | JA | 10/min/IP | HTML-injectie email |
| offerte-publiek.ts | NEE (token) | JA | 10/min | OK (whitelist) |
| portaal-get.ts | NEE (token) | JA | 30/min/IP | OK |
| portaal-reactie.ts | NEE (token) | JA | 10/hr/IP | Stored XSS |
| portaal-upload.ts | NEE (token) | JA | 10/hr/IP | Path traversal |
| **read-email.ts** | **NEE** | **NEE** | **NEE** | **user_id injectie** |
| **send-email.ts** | **NEE** | **NEE** | **NEE** | **Open SMTP relay** |
| stripe-webhook.ts | NEE | JA | NEE | OK (signature) |
| **test-email-connection.ts** | **NEE** | **NEE** | **NEE** | **SSRF** |

---

## Bijlage C: TypeScript ↔ Schema Mismatch Tabel

### Werkbon (9 ontbrekende velden)

| TypeScript veld | Supabase kolom | Probleem |
|-----------------|----------------|----------|
| *(ontbreekt)* | kilometers (NUMERIC) | Gebruikt in :4163,:4208,:4209 |
| *(ontbreekt)* | km_tarief (NUMERIC) | Gebruikt in :4163,:4208,:4210 |
| *(ontbreekt)* | omschrijving (TEXT) | Gebruikt in :4180 |
| *(ontbreekt)* | contactpersoon_id (UUID) | Gebruikt in :4186 |
| *(ontbreekt)* | factuur_id (UUID) | Mist in TS |
| *(ontbreekt)* | start_tijd (TEXT) | Mist in TS |
| *(ontbreekt)* | eind_tijd (TEXT) | Mist in TS |
| *(ontbreekt)* | pauze_minuten (INTEGER) | Mist in TS |
| *(ontbreekt)* | interne_notitie (TEXT) | Mist in TS |
| status | status CHECK | TS: 3 waarden, DB: 6 waarden |

### werkbonPdfService (4 verkeerde namen)

| TypeScript property | Gebruikt als | Correct |
|---------------------|-------------|---------|
| primaire_kleur | primaryColor | NEE |
| tekst_kleur | textColor | NEE |
| heading_font | headingFont | NEE |
| body_font | bodyFont | NEE |

### Profiles (5 ontbrekende kolommen in migraties)

| Kolom | Trigger 028 verwacht | In migratie? |
|-------|---------------------|--------------|
| organisatie_id | JA | NEE |
| rol | JA | NEE |
| status | JA | NEE |
| uitgenodigd_door | JA | NEE |
| uitgenodigd_op | JA | NEE |

---

## Bijlage D: Dead Code Lijst

### Ongebruikte componenten (22)

1. `src/components/ai/AITextGenerator.tsx`
2. `src/components/calendar/DayView.tsx`
3. `src/components/clients/ClientCard.tsx`
4. `src/components/clients/KlantAIChat.tsx`
5. `src/components/dashboard/AIInsightWidget.tsx`
6. `src/components/dashboard/CalendarMiniWidget.tsx`
7. `src/components/dashboard/EmailCommunicationHub.tsx`
8. `src/components/dashboard/FloatingQuickActions.tsx`
9. `src/components/dashboard/SalesFollowUpWidget.tsx`
10. `src/components/dashboard/SalesForecastWidget.tsx`
11. `src/components/dashboard/SalesPulseWidget.tsx`
12. `src/components/dashboard/TeFacturerenWidget.tsx`
13. `src/components/dashboard/WorkflowWidget.tsx`
14. `src/components/email/EmailTemplates.tsx`
15. `src/components/quotes/SmartCalculator.tsx`
16. `src/components/quotes/ProboProductPicker.tsx`
17. `src/components/projects/ProjectOfferteEditor.tsx`
18. `src/components/projects/TeamAvailability.tsx`
19. `src/components/projects/TimelineView.tsx`
20. `src/components/uitgaven/UitgavenLayout.tsx`
21. `src/components/uitgaven/LeveranciersLayout.tsx`
22. `src/components/shared/UpgradeDialog.tsx`

### Ongebruikte functies in supabaseService.ts (77 — selectie)

| Functie | Regel |
|---------|-------|
| deleteProject | 351 |
| getTaak | 376 |
| getDocument | 714 |
| getEvent / createEvent / updateEvent / deleteEvent | 877-934 |
| getAIChats / createAIChat / deleteAIChats | 1145-1180 |
| getDefaultHerinneringTemplates | 2728 |
| getVerlopenFacturen | 2796 |
| getOfferteByPubliekToken / updateOfferteTracking / respondOpOfferte | 2997-3030 |
| convertOfferteToFactuur / convertWerkbonToFactuur | 4097-4220 |
| createCreditnota / createVoorschotfactuur | 4222-4284 |
| logVisualizerActie / gebruikCredit | 4491-4626 |
| getAppNotificaties / createAppNotificatie / markeerAlleNotificatiesGelezen | 5248-5323 |
| getAllePortalen | 5325 |
| *(+ 50 meer)* | |

### Ongebruikte hooks (3)

- `src/hooks/useLocalStorage.ts`
- `src/hooks/useDebounce.ts`
- `src/hooks/useTrialGuard.ts`

### Ongebruikte API routes (4)

- `api/exact-refresh.ts`
- `api/exact-auth.ts`
- `api/exact-sync-factuur.ts`
- `api/probo-product-detail.ts`

---

## TypeScript Build Status

### npx tsc --noEmit

- **Totaal**: 22.106 errors
- **Echte fouten** (excl. missing modules/JSX noise): ~3.070
- **Hoofdcategorieën**:
  - ~2.800: `BadgeProps` type mismatch (Badge component mist `children`/`variant`/`className` in props type)
  - ~100: Implicit `any` parameters (TS7006/TS7031)
  - ~30: Property does not exist (echte type fouten)
  - ~20: `ImportMetaEnv` missende VITE_ properties
  - ~10: Type casting issues (`as unknown as`)
- **Build (`npm run build`)**: Faalt — `vite: not found` (node_modules niet geïnstalleerd in sandbox)

> **Update 25 maart 2026:** een tweede meting met `npx tsc --noEmit` rapporteerde 138 type errors (CRIT-002), voornamelijk geconcentreerd in `src/services/supabaseService.ts` en `src/services/werkbonPdfService.ts` (Werkbon properties + DocumentStyle camelCase/snake_case mismatch). Discrepantie met de 22.106 telling waarschijnlijk te wijten aan verschillende `tsconfig` strict-flags of node_modules-aanwezigheid.

### @ts-ignore / as unknown as / as any

| Patroon | Aantal | Bestanden |
|---------|--------|-----------|
| `as unknown as` | 5 | FactuurEditor, QuoteItemsTable, KlantenImportPage |
| `catch (err: any)` | 2 | SettingsLayout |
| Explicit `: any` | 0 | — |
| `@ts-ignore` | 0 | — |

---

## Niet verifieerbaar

1. Welk basisschema daadwerkelijk actief is (schema.sql vs 001_create_all_tables.sql)
2. Of organisaties tabel handmatig is aangemaakt in Supabase dashboard
3. Of profiles kolommen handmatig zijn toegevoegd
4. Of app_settings jsonb of discrete kolommen gebruikt
5. Of migratie 027 handmatig is uitgevoerd
6. Live Vercel env vars (MOLLIE_WEBHOOK_SECRET, EMAIL_ENCRYPTION_KEY, etc.)
7. Supabase RLS policies — er zijn geen policy-definities in de migraties
8. Storage bucket permissions
