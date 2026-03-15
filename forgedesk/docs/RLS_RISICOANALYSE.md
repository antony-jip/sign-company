# RLS Risicoanalyse — FORGEdesk

> **Doel:** Alle potentiele breekpunten identificeren VOORDAT RLS policies worden aangescherpt.
> Als RLS eenmaal aan staat, falen queries **stil** — je krijgt gewoon `[]` terug zonder error.

---

## RISICO 1: ~50 INSERT operaties zonder `user_id` (KRITIEK)

### Probleem

De RLS policy `WITH CHECK (user_id = auth.uid())` blokkeert elke INSERT die geen `user_id` bevat
(of een verkeerde). De INSERT faalt dan **stil** — geen error, gewoon geen data opgeslagen.

### Getroffen functies

Bijna alle `create*()` functies in `src/services/supabaseService.ts` missen `user_id`:

| Functie | Regel | Tabel |
|---------|-------|-------|
| `createProject()` | ~315 | projecten |
| `createTaak()` | ~413 | taken |
| `createOfferta()` | ~550 | offertes |
| `createOfferteItem()` | ~622 | offerte_items |
| `createOfferteVersie()` | ~693 | offerte_versies |
| `createDocument()` | ~736 | documenten |
| `createEmail()` | ~819 | emails |
| `createEvent()` | ~900 | events |
| `createGrootboekRekening()` | ~967 | grootboek |
| `createBtwCode()` | ~1033 | btw_codes |
| `createKorting()` | ~1099 | kortingen |
| `createAIChat()` | ~1165 | ai_chats |
| `createNieuwsbrief()` | ~1263 | nieuwsbrieven |
| `createCalculatieProduct()` | ~1330 | calculatie_producten |
| `createOfferteTemplate()` | ~1397 | offerte_templates |
| `createCalculatieTemplate()` | ~1527 | calculatie_templates |
| `createTekeningGoedkeuring()` | ~1621 | tekening_goedkeuringen |
| `createFactuur()` | ~1911 | facturen |
| `createFactuurItem()` | ~1960 | factuur_items |
| `createTijdregistratie()` | ~1984 | tijdregistraties |
| `createMedewerker()` | ~2034 | medewerkers |
| `createNotificatie()` | ~2088 | notificaties |
| `createMontageAfspraak()` | ~2136 | montage_afspraken |
| `createVerlof()` | ~2208 | verlof |
| `createBedrijfssluitingsdag()` | ~2256 | bedrijfssluitingsdagen |
| `createProjectToewijzing()` | ~2302 | project_toewijzingen |
| `createBookingSlot()` | ~2337 | booking_slots |
| `createBookingAfspraak()` | ~2396 | booking_afspraken |
| `createWerkbon()` | ~2489 | werkbonnen |
| `createWerkbonRegel()` | ~2540 | werkbon_regels |
| `createWerkbonFoto()` | ~2591 | werkbon_fotos |
| `createWerkbonItem()` | ~2638 | werkbon_items |
| `createWerkbonAfbeelding()` | ~2697 | werkbon_afbeeldingen |
| `createHerinneringTemplate()` | ~2767 | herinnering_templates |
| `createLeverancier()` | ~2833 | leveranciers |
| `createUitgave()` | ~2925 | uitgaven |
| `createBestelbon()` | ~3119 | bestelbonnen |
| `createBestelbonRegel()` | ~3168 | bestelbon_regels |
| `createLeveringsbon()` | ~3260 | leveringsbonnen |
| `createLeveringsbonRegel()` | ~3309 | leveringsbon_regels |
| `createVoorraadArtikel()` | ~3374 | voorraad_artikelen |
| `createVoorraadMutatie()` | ~3436 | voorraad_mutaties |
| `createDeal()` | ~3534 | deals |
| `createDealActiviteit()` | ~3585 | deal_activiteiten |
| `createLeadFormulier()` | ~3644 | lead_formulieren |
| `createLeadInzending()` | ~3713 | lead_inzendingen |
| `createPortaalItem()` | ~5192 | portaal_items |
| `createPortaalReactie()` | ~5250 | portaal_reacties |
| `createAppNotificatie()` | ~5289 | app_notificaties |

**Wel goed (5 functies):**
- `createDocumentStyle()` (~3822) — zet user_id expliciet
- `createSigningVisualisatie()` (~4412) — zet user_id expliciet
- `getOrCreateVisualizerCredits()` (~4599) — zet user_id expliciet
- `logCreditTransactie()` (~4610) — zet user_id expliciet
- `createPortaal()` (~5101) — zet user_id expliciet

### Fix nodig

Elke `create*()` functie moet `user_id` meekrijgen van de caller. Twee opties:

**Optie A (aanbevolen):** Haal `user_id` op via `supabase.auth.getUser()` in een helper:
```typescript
async function getCurrentUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Niet ingelogd')
  return user.id
}

// In elke create functie:
export async function createProject(project: Omit<Project, 'id' | 'created_at'>) {
  const user_id = await getCurrentUserId()
  const { data, error } = await supabase
    .from('projecten')
    .insert({ ...project, user_id })
    ...
}
```

**Optie B:** Laat de frontend altijd `user_id` meesturen (huidige patroon bij de 5 werkende functies).

---

## RISICO 2: SELECT queries zonder `user_id` filter (HOOG)

### Probleem

RLS filtert automatisch op `user_id = auth.uid()`, dus `.eq('user_id', ...)` is niet per se nodig.
**MAAR:** als `auth.uid()` null is (niet ingelogd, of auth nog niet geladen), krijg je `[]` terug.

### Getroffen functies

| Functie | Regel | Probleem |
|---------|-------|----------|
| `getNotificaties()` | ~2072 | Geen user_id filter — RLS filtert wel, maar als auth null is: leeg |
| `markAlleNotificatiesGelezen()` | ~2112 | Update ALLE notificaties zonder filter — met RLS: alleen eigen, maar als auth null: niets |
| `getMontageAfspraken()` | ~2124 | Geen user_id filter |

### Fix nodig

Na RLS is `.eq('user_id', ...)` niet strikt nodig, maar een **auth-readiness check** is cruciaal.

---

## RISICO 3: Auth timing — queries vuren voor auth geladen is (HOOG)

### Probleem

Componenten die in `useEffect([], [])` (mount) data laden, doen dit mogelijk voordat
de Supabase auth sessie is hersteld. Met RLS betekent dit: `auth.uid() = null` → `[]` terug.

### Getroffen componenten

| Component | Bestand | Probleem |
|-----------|---------|----------|
| NotificatieCenter | `components/notifications/NotificatieCenter.tsx:372-420` | Realtime subscription start mogelijk voor auth ready |
| ForgieTab | `components/settings/ForgieTab.tsx:146` | `useEffect` laadt data direct bij mount |
| TeamledenTab | `components/settings/TeamledenTab.tsx:121-149` | `loadData()` query't op organisatie_id zonder auth check |
| usePortaalHerinnering | `hooks/usePortaalHerinnering.ts:89-114` | Queries `projecten`, `klanten`, `project_portalen` zonder auth guard |

### Fix nodig

Wrap alle data-loading hooks/effects met een auth-readiness guard:
```typescript
const { user, isLoading } = useAuth()

useEffect(() => {
  if (isLoading || !user) return  // ← wacht op auth
  loadData()
}, [user, isLoading])
```

---

## RISICO 4: Nested joins — child tabellen met eigen RLS (HOOG)

### Probleem

Supabase nested selects zoals `select('*, offerte_items(*)')` passen RLS toe op BEIDE tabellen.
Als de child tabel een andere RLS policy heeft (bijv. via parent lookup ipv directe `user_id`),
kan de nested data `null` of `[]` returnen terwijl de parent wel zichtbaar is.

### Getroffen queries

| Query | Bestand | Geneste tabellen |
|-------|---------|-----------------|
| `getAllPortalen()` | supabaseService.ts:~5015 | `project_portalen` → `portaal_items` → `portaal_reacties` |
| `getPortaalItems()` | supabaseService.ts:~5160 | `portaal_items` → `portaal_bestanden`, `portaal_reacties` |
| `getOffertes()` | supabaseService.ts:~261 | `offertes` → `klanten(bedrijfsnaam)` |
| `getFacturen()` | supabaseService.ts:~283 | `facturen` → `klanten(bedrijfsnaam)` |

### Fix nodig

Zorg dat alle child tabellen dezelfde `user_id = auth.uid()` policy hebben (niet via parent subquery).
De tabellen `portaal_items`, `portaal_bestanden`, `portaal_reacties` hebben al `user_id` — dus
standaard `USING (user_id = auth.uid())` policies volstaan.

---

## RISICO 5: Publieke pagina's met `USING (true)` policies (HOOG)

### Probleem

Drie tabellen hebben `USING (true)` policies die ALLE rijen voor IEDEREEN zichtbaar maken:

| Tabel | Policy | Risico |
|-------|--------|--------|
| `tekening_goedkeuringen` | `FOR SELECT USING (true)` | Alle tekeningen zichtbaar voor iedereen |
| `booking_slots` | `FOR SELECT USING (true)` | Alle booking configuratie zichtbaar |
| `booking_afspraken` | `FOR ALL USING (true)` | Iedereen kan afspraken lezen EN schrijven |

### Getroffen frontend componenten

| Component | Wat het doet |
|-----------|-------------|
| `ClientApprovalPage.tsx` | Haalt goedkeuring op via `getTekeningGoedkeuringByToken()` |
| `PublicBookingPage.tsx` | Leest booking_slots en maakt afspraken aan |
| `BetaalPagina.tsx` | Haalt factuur op via `getFactuurByBetaalToken()` |
| `LeadFormulierPubliek.tsx` | Leest formulier via `getLeadFormulierByToken()` |

### Fix nodig

Vervang `USING (true)` door token-gebaseerde policies:
```sql
-- In plaats van:
CREATE POLICY "public read" ON tekening_goedkeuringen FOR SELECT USING (true);

-- Gebruik:
CREATE POLICY "public read by token" ON tekening_goedkeuringen
  FOR SELECT USING (
    user_id = auth.uid()
    OR token IS NOT NULL  -- publieke toegang alleen als er een token is
  );
```

---

## RISICO 6: Demo mode breekt (MEDIUM)

### Probleem

De app heeft een demo/localStorage mode die draait zonder echte Supabase connectie.
Met RLS actief zal `auth.uid()` null zijn → alle queries returnen `[]`.

### Getroffen code

`src/contexts/AuthContext.tsx:81-96` — demo mode creëert een fake user in localStorage.

### Fix nodig

Demo mode moet ofwel:
- Alleen localStorage gebruiken (geen Supabase queries)
- Of disabled worden wanneer RLS actief is

---

## RISICO 7: API endpoints met supabaseAdmin (LAAG — bewust)

### Probleem

Alle 41 API endpoints gebruiken de service role key (`supabaseAdmin`). Dit bypassed RLS volledig.
Dit is **bewust** — de API doet zelf auth checks.

### Endpoints die data schrijven namens andere users

| Endpoint | Tabel | Situatie |
|----------|-------|----------|
| `portaal-reactie.ts` | portaal_reacties, notificaties | Klant reageert via portaal → INSERT zonder user_id van de klant |
| `offerte-accepteren.ts` | offertes, notificaties | Klant accepteert offerte → UPDATE + notificatie INSERT |
| `goedkeuring-reactie.ts` | tekening_goedkeuringen, notificaties | Klant reageert op tekening → UPDATE |
| `mollie-webhook.ts` | facturen | Mollie betaling → UPDATE factuur status |
| `stripe-webhook.ts` | credit_transacties | Stripe betaling → INSERT transactie |

### Fix nodig

Geen directe fix nodig — deze endpoints MOETEN admin rechten hebben omdat ze zonder user context draaien.
**Maar:** documenteer welke endpoints admin access nodig hebben, zodat dit niet per ongeluk verandert.

---

## RISICO 8: `handle_new_user()` trigger (LAAG)

### Probleem

De PostgreSQL trigger `handle_new_user()` (migratie 028) draait als `SECURITY DEFINER` en insert in
`profiles`. Dit is correct — nieuwe users hebben nog geen profiel, dus de INSERT moet RLS bypassen.

### Fix nodig

Geen — `SECURITY DEFINER` is hier bewust en noodzakelijk.

---

## Samenvatting acties voor RLS

| # | Actie | Risico | Omvang | Wanneer |
|---|-------|--------|--------|---------|
| **1** | **`user_id` toevoegen aan ~50 INSERT functies** | KRITIEK | Groot | **VOOR RLS** |
| **2** | **Auth-readiness guards in components** | HOOG | Medium | **VOOR RLS** |
| **3** | **`USING (true)` policies vervangen door token-based** | HOOG | Klein | **TIJDENS RLS** |
| **4** | **Nested join policies afstemmen** | HOOG | Medium | **TIJDENS RLS** |
| **5** | **Ontbrekende 18 tabellen policies toevoegen** | HOOG | Klein | **TIJDENS RLS** |
| **6** | **Demo mode guard** | MEDIUM | Klein | **VOOR/NA RLS** |
| **7** | **API admin access documenteren** | LAAG | Klein | **NA RLS** |
| **8** | **`handle_new_user()` trigger verifieren** | LAAG | Geen | **Klaar** |

### Aanbevolen volgorde

```
1. user_id toevoegen aan alle create*() functies     ← GROOTSTE KLUS
2. Auth-readiness guards toevoegen aan components     ← VOORKOMT LEGE PAGINA'S
3. Dan pas RLS policies schrijven/aanscherpen         ← INCLUSIEF token-based + nested + 18 tabellen
```
