# Onderzoeksrapport: Exact Online OAuth-connectie "verdwijnt" na uitloggen

**Datum:** 2026-05-13
**Onderzoek:** 5 parallelle agents (storage, lifecycle, logout, hypothese, UI) + zelf-verificatie
**Status:** Diagnose afgerond. **Geen code gewijzigd.** Wacht op akkoord.

---

## 1. Samenvatting

- De tokens **zijn niet weg**. `exact_tokens` rij blijft na logout ongemoeid (geen DELETE, alleen CASCADE bij auth.users-delete).
- De UI bepaalt "verbonden ja/nee" via een aparte boolean `app_settings.exact_online_connected`, niet via aanwezigheid van tokens.
- Twee onafhankelijke mechanismen kunnen die boolean uit sync brengen met de werkelijke token-aanwezigheid: (F) refresh-failure flipt hem op `false`, (G) een race in `getAppSettings` bij re-login leest een lege rij en faalt naar default `false`.
- Fix-scope hangt af van welk mechanisme actief is — verifieer met SQL voor je iets verandert.

---

## 2. Token-opslag

**Tabel:** `exact_tokens` (migratie `018_exact_online.sql`).

```sql
CREATE TABLE exact_tokens (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token text NOT NULL,    -- AES-256-CBC geëncrypteerd
  refresh_token text NOT NULL,   -- AES-256-CBC geëncrypteerd
  expires_at timestamptz NOT NULL,
  division integer,
  created_at timestamptz,
  updated_at timestamptz
);

CREATE POLICY "Users manage own exact_tokens"
  ON exact_tokens FOR ALL USING (user_id = auth.uid());
```

- **Niveau:** per-user, geen `organisatie_id`-kolom.
- **State-parameter** in OAuth-flow: `{user_id}:{hmac-sig}` (`api/exact-auth.ts:126`, `signState` regel 11-14).
- **UPSERT-callsite:** `api/exact-callback.ts:261-270`, conflict op `user_id`.
- **Geen kopieën** in localStorage/sessionStorage/cookies (grep bevestigd).
- **Encryption-key:** `INTEGRATION_ENCRYPTION_KEY` (env).

---

## 3. Lifecycle: callback → opslag → ophalen

| Fase | Bestand:regel | Wat gebeurt |
|---|---|---|
| OAuth start | `api/exact-auth.ts:126` | state = `signState(user_id)` |
| Callback | `api/exact-callback.ts:67-76` | HMAC verificatie → user_id geëxtraheerd |
| Opslag tokens | `api/exact-callback.ts:261-270` | UPSERT in `exact_tokens` met `onConflict: 'user_id'` |
| Opslag flag | `api/exact-callback.ts:305` (via `updateAppSettingsOrgFirst`) | `app_settings.exact_online_connected = true` |
| Lookup bij sync | `api/exact-sync-factuur.ts:109-167` | `getValidToken(user_id)` → `.eq('user_id', user_id)` |
| Lookup bij refresh | `api/exact-refresh.ts:109-113` | Idem, user_id filter |
| Lookup bij UI | `src/services/profielService.ts:234-267` | `getAppSettings(userId)` → org-first, user-fallback |

**Backend gebruikt overal `SUPABASE_SERVICE_ROLE_KEY`** (`exact-callback.ts:34, 193`) — RLS wordt bypassed. RLS is dus geen factor in de bug.

---

## 4. Logout side-effects

`src/services/authService.ts:38-45`:

```ts
export async function signOut() {
  if (!isSupabaseConfigured() || !supabase) {
    localStorage.removeItem('doen_demo_user')
    return
  }
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}
```

Aanvullend in `src/contexts/AuthContext.tsx:218-237`: bij `onAuthStateChange` zonder user → `setOrganisatieId(null)`, `setUserRol(null)`, `setOrganisatie(null)`. Niets meer.

**Conclusie logout:**
- localStorage: alleen `doen_demo_user` weg, niets Exact-gerelateerd.
- Database: **geen mutaties** op `exact_tokens` of `app_settings`.
- Geen RPC, geen trigger, geen DELETE-callsite gevonden (`grep -rn "from('exact" src/ api/ | grep delete` → leeg).
- Tokens en flag overleven logout intact.

---

## 5. Root cause — twee plausibele mechanismen

De tokens leven nog. De UI-boolean kan op twee manieren `false` worden zonder dat de gebruiker daar zichtbaar iets aan deed:

### Mechanisme F — Stilzwijgende auto-disconnect bij refresh-failure

**Zeven API-endpoints** zetten `exact_online_connected = false` bij een 400/401 of een mislukte token-refresh, en **verwijderen daarbij niet de tokens-rij**:

| Bestand | Regel |
|---|---|
| `api/exact-refresh.ts` | 157 |
| `api/exact-sync-factuur.ts` | 151 |
| `api/exact-document-types.ts` | 138 |
| `api/exact-grootboeken.ts` | 136 |
| `api/exact-dagboeken.ts` | 137 |
| `api/exact-administraties.ts` | 141 |
| `api/exact-btw-codes.ts` | 136 |

`IntegratiesTab.tsx:167-169` triggert automatisch bij mount:

```tsx
useEffect(() => {
  if (exactConnected) loadDocumentTypes()
}, [exactConnected, loadDocumentTypes])
```

Bij elke navigatie naar Instellingen → Integraties roept dit `api/exact-document-types.ts` aan. Als access_token verlopen is, wordt refresh geprobeerd. Exact's refresh_token is **single-use rotating** — als een eerdere call (andere tab, eerdere deploy, parallel request) de refresh_token al heeft gerouleerd zonder dat onze DB-update slaagde, faalt deze refresh → endpoint zet `exact_online_connected = false` → UI toont "niet verbonden". Tokens blijven echter in DB staan en zijn potentieel zelfs nog bruikbaar.

### Mechanisme G — Race in `getAppSettings` lookup bij re-login

`src/services/profielService.ts:234-267`:

```ts
const orgId = await getOrgId()
if (orgId) {
  // Probeer eerst org-based lookup
  data = ... eq('organisatie_id', orgId) ...
}
if (!data) {
  // Fallback: user_id lookup
  data = ... eq('user_id', userId) ...
}
return normalizeSidebarItems(data || getDefaultAppSettings(userId))
```

`getDefaultAppSettings` (regel 214): `exact_online_connected: false`.

**Race-scenario bij re-login:**
1. Supabase fired SIGNED_IN → `user.id` bekend → `AppSettingsContext` useEffect vuurt af met `[user?.id]`.
2. `getAppSettings(user.id)` → `getOrgId()` wordt aangeroepen.
3. `getOrgId()` haalt org uit React state of vraagt profile op. Bij koude start na re-login kan dit `null` retourneren omdat de profile-fetch nog loopt.
4. Org-lookup wordt overgeslagen → fallback naar `.eq('user_id', userId)` → **`app_settings` heeft géén rij op user_id voor deze gebruiker** (rij staat op organisatie_id).
5. `data = null` → `getDefaultAppSettings` → `exact_online_connected = false`.

UI rendert "niet verbonden" terwijl in DB zowel tokens als boolean (`true`) staan. Een tweede triggering van `getAppSettings` (bv. F5, tabwissel, of een tweede mount) lost dit vermoedelijk op — wat verklaart waarom de bug "soms" optreedt.

### F en G zijn niet wederzijds uitsluitend

In het ergste geval gebeurt G eerst (UI denkt foutief: niet verbonden), gebruiker klikt opnieuw "Verbinden", maar in achtergrond loopt al een mount-effect dat F triggert en de boolean alsnog op `false` zet via een refresh-failure.

---

## 6. Onderscheid "echt weg" vs "UI denkt dat het weg is"

| Symptoom | Oorzaak | Tokens in DB? | Boolean in DB? | Fix-scope |
|---|---|---|---|---|
| UI toont "niet verbonden" maar sync werkt nog | Mechanisme G (race) | aanwezig | `true` | Frontend: getAppSettings retry of wacht op orgId |
| UI toont "niet verbonden" en sync gooit "Verbind opnieuw" | Mechanisme F | aanwezig | `false` | Backend: niet meer flippen op transient errors |
| Tokens daadwerkelijk weg | Niet gevonden in code | afwezig | `false` | N.v.t. — dit scenario lijkt niet te bestaan |

**Hieruit volgt:** voordat je een fix kiest, moet je vaststellen welk mechanisme leeft. Zie sectie 9.

---

## 7. Mogelijke oplossingsrichtingen

### Optie A — Race fixen (Mechanisme G, frontend)

`profielService.ts:234-267`: wacht in `getAppSettings` tot `getOrgId()` een waarde geeft, of laat `AppSettingsContext` pas laden na SIGNED_IN + organisatieId-gevuld.

**Trade-offs:**
- Pro: kleine wijziging, behoudt huidige architectuur.
- Pro: lost de "soms"-variant op zonder backend-veranderingen.
- Con: lost F niet op.

### Optie B — Auto-disconnect verwijderen (Mechanisme F, backend)

Verwijder of verzacht de 7 callsites die `exact_online_connected = false` zetten bij refresh-failure. Idee: laat een transient error niet de verbinding "uitschakelen"; alleen écht permanente errors (HTTP 401 met `invalid_grant` op refresh) zouden de flag mogen flippen.

**Trade-offs:**
- Pro: stopt stilzwijgende ontkoppeling tijdens FESPA-drukte (concurrency).
- Con: 7 plekken aanpassen — scope creep. CLAUDE.md "geen unsolicited refactoring" — alleen doen op expliciet akkoord.
- Con: in zeldzame gevallen blijft een echt-verlopen refresh_token de UI als "verbonden" tonen totdat een aparte recovery-mechanisme dat detecteert.

### Optie C — Eén bron van waarheid (architectureel)

Verwijder `app_settings.exact_online_connected` als status-veld. Laat de UI de status afleiden uit `exact_tokens` (rij aanwezig + `expires_at` of werkende refresh_token).

**Trade-offs:**
- Pro: elimineert het hele klasse-probleem (geen 2 ankers meer).
- Con: groter (raakt callback, alle 7 endpoints, UI, FactuurEditor sync-gating, AppSettingsContext). Te groot voor pre-FESPA.
- Voorstel: vastleggen als post-FESPA refactor.

### Aanbevolen voor nu: **Optie A** als G bevestigd is, **Optie B-light** (alleen `exact-document-types.ts` en `exact-btw-codes.ts` die in IntegratiesTab mount-triggered worden) als F bevestigd is.

---

## 8. Open vragen

1. **Welk mechanisme is actief?** Niet uit code af te leiden — vereist runtime-check (zie sectie 9).
2. **Zijn er Vercel-logs van eerdere `Token vernieuwen mislukt` errors?** Bewijs voor F.
3. **Hoe gedraagt Exact's refresh_token-rotatie bij parallel calls?** Spec zegt single-use, maar gedrag bij race is niet gedocumenteerd.
4. **Heeft de gebruiker meerdere tabs/devices?** Verhoogt kans op F.
5. **Wordt `getOrgId()` bij re-login synchronously of asynchronously geladen?** Bepaalt of G überhaupt mogelijk is — moet ik nog verifiëren in `AppSettingsContext` als je voor Optie A kiest.

---

## 9. Aanbevolen volgende stap

**Direct doen (door jou, geen code-wijziging):**

Reproduceer de bug één keer (logout → re-login → zie "niet verbonden"). Run dán direct deze SQL in Supabase SQL Editor:

```sql
-- Bevestig: bestaan tokens nog?
SELECT user_id, expires_at, division, updated_at,
       length(access_token) AS at_len,
       length(refresh_token) AS rt_len
FROM exact_tokens
WHERE user_id = '<JOUW_USER_ID>';

-- Bevestig: staat de UI-flag op true of false?
SELECT user_id, organisatie_id, exact_online_connected,
       exact_administratie_id, updated_at
FROM app_settings
WHERE organisatie_id = '<JOUW_ORG_ID>'
   OR user_id = '<JOUW_USER_ID>'
ORDER BY updated_at DESC;
```

Interpretatie:
- **Tokens-rij aanwezig + `exact_online_connected = true`** → Mechanisme G (race). Kies Optie A.
- **Tokens-rij aanwezig + `exact_online_connected = false`** → Mechanisme F (auto-disconnect). Kies Optie B-light.
- **Tokens-rij afwezig** → een tot nu toe onontdekte verwijdering. Stop en herstart onderzoek.

Optioneel tijdelijke check: `UPDATE app_settings SET exact_online_connected = true WHERE organisatie_id = '...';` — als sync daarna meteen werkt zonder her-OAuth bevestigt dat de tokens nog goed zijn en alleen de UI-status fout was.

**Daarna (door mij, na akkoord):** implementatie van Optie A of B-light.

**STOP-gate gehandhaafd.** Geen code-wijzigingen zonder jouw akkoord.
