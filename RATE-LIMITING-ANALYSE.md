# Rate Limiting Analyse — `doen.` (forgedesk)

**Datum:** 2026-05-09
**Branch:** `claude/analyze-rate-limiting-4qrQG`
**Scope:** alleen-lezen analyse van rate-limiting status vóór FESPA-launch.
**Werkmap:** `~/sign-company/forgedesk` (synced met `origin/main`, HEAD `f237a921`).

---

## 1. Infrastructuur

### Geïnstalleerd
- `@upstash/ratelimit` **^2.0.8** — `package.json:39`
- `@upstash/redis` **^1.37.0** — `package.json:40`

### Helper / middleware
- **Geen centrale helper.** Vercel serverless bundelt geen lokale modules in `api/`, dus elke route die rate-limit gebruikt heeft de logica **volledig inline gedupliceerd**:
  - Inline `enforceRateLimit(identifier, res)` (Upstash sliding-window) — 11 routes
  - Inline `isRateLimited(ip, endpoint, max, window)` (Postgres RPC) — 5 routes
- Rate-limit code wordt per route ingevoegd via copy-paste; logica is identiek.

### Twee parallelle backends
1. **Upstash Redis (sliding window, primair)** — gebruikt `Redis.fromEnv()`, `Ratelimit.slidingWindow(N, 'X s')`, `prefix: 'rl:<route>'`, `timeout: 2000`. 11 routes, zie tabel hieronder.
2. **Postgres `check_rate_limit` RPC (fixed window, ouder)** — table `rate_limits`, function in `supabase/migrations/032_rate_limits_and_portaal_indexes.sql:6-46`. 5 routes, allemaal IP-based.
   - Cleanup van verlopen rijen gebeurt probabilistisch (1 % kans per call), wat in lage-volume runtimes prima werkt maar bij DDoS niet.
   - Geen RLS op `rate_limits` (gebruikt service role).

### Env vars
`.env.example:54-59`:
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- Comment expliciet: *"Als beide ontbreken: rate limiting wordt uitgeschakeld (graceful degrade)."*
  Bij ontbrekende env wordt een `console.warn` gelogd en `enforceRateLimit` retourneert `true` — er is dan **geen** bescherming.

### Huidig Upstash-gebruik elders
- **Alleen rate limiting.** `grep -rln "@upstash"` → uitsluitend de 11 hierboven genoemde `api/*.ts` files. Geen caching, geen distributed locks, geen idempotency-keys via Redis.

---

## 2. API routes — bucket-overzicht

Totaal **57** bestanden in `api/`. Twee daarvan zijn helpers (geen `export default`):
- `api/emailTemplate.ts` — alleen `buildPortalEmailHtml` export
- `api/resend-notify.ts` — alleen `sendDoenNotification` export, dynamic-imported door `offerte-wijziging.ts:161` en `goedkeuring-reactie.ts:169`

Resterend: **55 publiek bereikbare endpoints** (Vercel exposeert elk `.ts`-bestand in `api/`).

### Bucket A — Hoog risico (kosten: AI / image / email)

| Route | Auth | Externe call | Huidige bescherming |
|---|---|---|---|
| `api/ai-chat.ts` | `verifyUser` (Bearer) | Anthropic Sonnet 4.6, 2048 tok | **Upstash 20/60s per userId** (`ai-chat.ts:20`) + **$5/maand/user cap** via `ai_usage` |
| `api/ai.ts` | `verifyUser` | Anthropic Sonnet 4.6, configurable max | **Upstash 10/3600s per userId** (`ai.ts:19`) — geen kostencap |
| `api/ai-email.ts` | `verifyUser` | Anthropic Sonnet 4.6, 1024 tok | **GEEN Upstash**, alleen `$5/maand/user` cap |
| `api/ai-followup-email.ts` | `verifyUser` | Anthropic Sonnet 4.6, 1024 tok | **GEEN Upstash**, alleen `$5/maand/user` cap |
| `api/ai-rewrite.ts` | `verifyUser` | Anthropic Haiku 4.5, 1024 tok | **GEEN Upstash**, alleen `$5/maand/user` cap |
| `api/analyze-inkoop-offerte.ts` | `verifyUser` | Anthropic Sonnet 4.6, 4096 tok + image input | **GEEN Upstash, GEEN kostencap** |
| `api/inkoopfactuur-extract.ts` | `verifyUser` | Anthropic Sonnet 4.6, 4096 tok + PDF/image | **GEEN Upstash, GEEN kostencap** (maxDuration 300s in `vercel.json:33`) |
| `api/generate-signing-mockup.ts` | `verifyUser` + credit-check | Anthropic Sonnet (planning) + fal.ai (image gen) | **Upstash 2/3600s per userId** + **pre-paid credits** (`saldo` in `visualizer_credits`) |
| `api/send-email.ts` | `verifyUser` (uit body `user_id`) | Resend / SMTP | **Upstash 20/60s per user_id** |
| `api/resend-notify.ts` | n.v.t. (helper) | Resend | n.v.t. (interne import) |
| `api/cron-verzend-geplande-berichten.ts` | `Bearer ${CRON_SECRET}` | Resend / SMTP via job | Cron-only (Vercel) — geen rate limit |
| `api/email-attachment.ts` | `verifyUser` | IMAP fetch | Geen rate limit |
| `api/fetch-emails.ts` | `verifyUser` | IMAP (imapflow) | Geen rate limit |
| `api/read-email.ts` | `verifyUser` | IMAP | Geen rate limit |
| `api/test-email-connection.ts` | `verifyUser` | IMAP/SMTP test | Geen rate limit |

### Bucket B — Hoog risico (publiek toegankelijk via token)

| Route | Auth | Toegang | Huidige bescherming |
|---|---|---|---|
| `api/portaal-get.ts` | token in URL/body | Publiek | **Upstash 30/60s per IP** |
| `api/portaal-items-get.ts` | Bearer (interne app) | Authenticated | **Upstash 20/60s per user.id** |
| `api/portaal-link-aanvragen.ts` | publiek (e-mail-flow) | Publiek | **Upstash 3/3600s per IP** |
| `api/portaal-bekeken.ts` | token in body | Publiek | **Postgres 20/60s per IP** |
| `api/portaal-reactie.ts` | token in body | Publiek | **Postgres 10/3600s per IP** |
| `api/portaal-upload.ts` | token in body | Publiek (10MB max) | **Postgres 10/3600s per IP** |
| `api/offerte-publiek.ts` | publieke offerte-token | Publiek | **Upstash 10/60s per IP** |
| `api/offerte-accepteren.ts` | publieke offerte-token | Publiek | **Upstash 10/3600s per IP** |
| `api/offerte-wijziging.ts` | publieke offerte-token | Publiek | **Upstash 10/3600s per IP** |
| `api/factuur-portaal.ts` | publieke factuur-token | Publiek | **Upstash 10/60s per IP** |
| `api/goedkeuring-reactie.ts` | token in body | Publiek | **Postgres 10/3600s per IP** |
| `api/mollie-webhook.ts` | HMAC `x-mollie-signature` | Publiek (Mollie) | Signature-verify (geen RL) |
| `api/stripe-webhook.ts` | `stripe-signature` constructEvent | Publiek (Stripe) | Signature-verify + idempotency-check op `credit_transacties` |
| `api/csp-report.ts` | publiek (browser) | Publiek | **Postgres 100/60s per IP** |
| `api/exact-callback.ts` | OAuth state | Publiek (redirect) | Geen RL (state-gevalideerd) |

### Bucket C — Medium risico (externe API met kosten of side-effects)

| Route | Auth | Externe call | Huidige bescherming |
|---|---|---|---|
| `api/kvk-zoeken.ts` | `verifyUser` | KvK API (per-call kosten) | **Postgres 20/60s per userId** (key: `kvk-zoeken:<userId>`) |
| `api/kvk-basisprofiel.ts` | `verifyUser` | KvK API | **Postgres 20/60s per userId** |
| `api/invite-team-member.ts` | `verifyUser` | Resend/email + DB | Geen RL |
| `api/manage-team-member.ts` | `verifyUser` | DB | Geen RL |
| `api/exact-administraties.ts` | `verifyUser` | Exact Online API | Geen RL |
| `api/exact-btw-codes.ts` | `verifyUser` | Exact Online | Geen RL |
| `api/exact-dagboeken.ts` | `verifyUser` | Exact Online | Geen RL |
| `api/exact-grootboeken.ts` | `verifyUser` | Exact Online | Geen RL |
| `api/exact-refresh.ts` | `verifyUser` | Exact OAuth refresh | Geen RL |
| `api/exact-sync-factuur.ts` | `verifyUser` | Exact write | Geen RL |
| `api/exact-auth.ts` | `verifyUser` | OAuth start | Geen RL |
| `api/inkoopfactuur-sync.ts` | `verifyUser` | IMAP / DB | Geen RL |
| `api/inkoopfactuur-test-connection.ts` | `verifyUser` | IMAP test | Geen RL |
| `api/inkoopfactuur-save-config.ts` | `verifyUser` | DB write | Geen RL |
| `api/mollie-create-payment.ts` | optional Bearer | Mollie API | Geen RL |
| `api/create-checkout-session.ts` | `verifyUser` | Stripe checkout | Geen RL |
| `api/create-portal-session.ts` | `verifyUser` | Stripe portal | Geen RL |
| `api/create-subscription.ts` | `verifyUser` | Stripe sub | Geen RL |
| `api/save-integration-settings.ts` | `verifyUser` | DB (encrypted) | Geen RL |
| `api/trigger-onboarding.ts` | `verifyUser` | Trigger.dev queue | Geen RL |

### Bucket D — Laag risico (read-only / cron / config)

| Route | Auth | Bescherming |
|---|---|---|
| `api/api-status.ts` | geen | Statisch — geeft alleen booleans terug |
| `api/email-settings.ts` | `verifyUser` | DB-only |
| `api/portaal-create.ts` | `verifyUser` | DB-only |
| `api/portaal-verlengen.ts` | `verifyUser` | DB-only |
| `api/annuleer-opvolging.ts` | `verifyUser` | DB-only |
| `api/cron-trial-expiration.ts` | `Bearer CRON_SECRET` | Cron-only |
| `api/cron-verzend-geplande-berichten.ts` | `Bearer CRON_SECRET` | Cron-only (zie ook Bucket A) |

---

## 3. Bestaande beschermingsmechanismen

- **Upstash sliding-window per route**, identifier wisselt: userId (4×) of IP (7×). Inline gedupliceerd in 11 routes — zie sectie 1.
- **Postgres `check_rate_limit` RPC** (fixed window, atomic UPSERT, probabilistic cleanup) in 5 routes. Migration `032_rate_limits_and_portaal_indexes.sql`.
- **Anthropic-kosten cap per user, per maand**: hardcoded `MONTHLY_LIMIT = 5.0` ($5) in 4 routes (`ai-chat.ts:12`, `ai-email.ts:10`, `ai-followup-email.ts:10`, `ai-rewrite.ts:10`). Tracking via `ai_usage`-tabel (PK = `(user_id, maand)`). **Cap is per `user_id`, NIET per `organisatie_id`** — bij meerdere users in dezelfde org schalen kosten 1-op-1 mee. **`ai.ts`, `analyze-inkoop-offerte.ts`, `inkoopfactuur-extract.ts` en `generate-signing-mockup.ts` (Claude-deel) hebben deze cap NIET.**
  Race-conditie: cap-check is read-then-write zonder lock; meerdere parallel calls kunnen elk slagen voordat de eerste de cap bumpt.
- **Visualizer-credits** (`visualizer_credits.saldo`): pre-paid model voor `generate-signing-mockup.ts`, atomic deductie in `deductCredits`. Stripe webhook idempotency via `credit_transacties` tabel (`stripe-webhook.ts:57-64`).
- **Webhook signature verify**: Mollie HMAC (`mollie-webhook.ts:60-69`, fail-closed) en Stripe `constructEvent` (`stripe-webhook.ts:194`).
- **CRON_SECRET** Bearer-check op beide cron-endpoints.
- **Body size**: `portaal-upload.ts` heeft `bodyParser.sizeLimit: '12mb'` + 10 MB content-check + MIME-allowlist (`portaal-upload.ts:15-23`).
- **`vercel.json` functions**: alleen `inkoopfactuur-extract` (300s) en `inkoopfactuur-sync` (120s) hebben verhoogde maxDuration.
- **CORS-whitelist**: `Access-Control-Allow-Origin: https://app.doen.team` (`vercel.json:15`). Beperkt browser-misbruik vanaf andere origins, maar geen bescherming tegen scripts of curl.
- **Trigger.dev** (`trigger.config.ts`): retries `maxAttempts: 3`, default `randomize: true`. **Geen `concurrency`-config, geen queue-throttling** op tasks zoals `email-opvolging`, `weekly-digest`, `onboarding-sequence`. Cron-tasks (`portaal-herinnering`, `trial-reminder`, `inkoopfactuur-intake`, `weekly-digest`, `offerte-opvolging`) draaien zonder per-organisatie throttling.
- **Client-side debounce/throttle op AI-acties**: niet gevonden. `grep` op `debounce|throttle` in `src/services/aiService.ts`, `forgieChatService.ts`, `aiRewriteService.ts`, `followUpService.ts` levert niets op. Visualizer-dialogen (`SigningVisualizerDialog.tsx`, `VisualizerLayout.tsx`) gebruiken `fetch('/api/generate-signing-mockup')` zonder zichtbare client-throttle (de credit-check op de server is de feitelijke gate).
- **Idempotency-keys / request-deduplication**: alleen op Stripe-webhook (via `credit_transacties` lookup). Verder niet aanwezig.

---

## 4. Top-5 risico-endpoints (worst-case bij 10 orgs × 10 users = 100 users)

Aannames: Sonnet 4.6 = $3 per M input, $15 per M output. Haiku 4.5 = $0.80/$4. Gemiddelde call ≈ 5 K input.

### 1. `api/inkoopfactuur-extract.ts` — **kritiek**
- Geen Upstash, geen kostencap, max 4096 output tokens **+ PDF/image input**.
- maxDuration 300s = lange functions stapelen op (Vercel concurrency-budget).
- Per call: ~$0.015 input + $0.060 output + image-tokens (≈ $0.01–0.05 per pagina) ≈ **$0.08–$0.15/call**.
- Worst-case 1 user in een loop, 1 call/sec authenticated: 3600/h × $0.10 = **$360/uur per user**. 100 users theoretisch $36 K/uur. Realistisch is dat geen normaal gebruik, maar er is letterlijk geen rem.

### 2. `api/analyze-inkoop-offerte.ts` — **kritiek**
- Identiek profiel: geen Upstash, geen cap, Sonnet 4.6 4096 tok + image input.
- Per call: **~$0.08/call**. 1 user 1 call/sec = **$288/uur**.

### 3. `api/ai-email.ts` / `api/ai-followup-email.ts` — **hoog**
- $5/maand cap per user is enige rem; geen per-min Upstash. Cap is per `user_id`.
- 100 users × $5 = **€500/maand garantie-plafond**.
- Race-conditie tussen check en bump betekent dat een attacker met parallel requests realistisch $5–15 over de cap kan komen voordat het registreert.
- Geen DDoS-schade, maar onverwachte API-kosten van max ±€500/maand structureel als alle users tegelijk worden misbruikt of zelf experimenteren.

### 4. `api/ai-chat.ts` — **medium-hoog**
- Wél Upstash (20/60s per userId) en wél $5/maand cap.
- Theoretisch plafond: 20 calls/min × Sonnet kosten ($0.045/call avg) = $0.90/min = $54/uur per user — maar de $5/maand cap kapt dat snel af.
- Over 100 users: **€500/maand maximum** structureel.
- Vergelijkbaar met ai-email maar Daan-chat zit in normaal gebruikspatroon, dus reëel risico is dat 1 power-user al snel het cap raakt en dan niet verder kan — UX-risico, geen cost-risk.

### 5. `api/send-email.ts` — **medium (kosten + reputatie)**
- Upstash 20/60s per `user_id` (uit body — niet geverifieerd dat dit hetzelfde is als de Bearer-token-user, zie open vraag 2).
- 1200/h Resend = ±$1.20/uur kosten, maar **deliverability/reputatie-risico** is groter: een loop kan honderden mails sturen voordat een handmatige interventie. Geen per-org cap, geen daily cap.
- Bij 100 users 1200/h × 100 = 120 K mails/uur theoretisch — Resend zal dat zelf afknijpen, maar het hoort niet aan hun kant geblokkeerd te worden.

**Eervolle vermeldingen** (niet top-5 maar wel zorg waard):
- `api/generate-signing-mockup.ts`: 2/h Upstash + credits is robuust, maar als credit-deductie mislukt na succesvolle fal.ai call (zie `deductCredits` bij `userId === 'local'`), dan kunnen credits in dev-modus omzeild worden. Niet relevant prod.
- `api/exact-sync-factuur.ts`: Exact Online heeft eigen rate limits (~5 req/sec per company). Een loop hier kan lockouts veroorzaken voor de hele organisatie bij Exact. **Geen lokale RL.**
- `api/portaal-link-aanvragen.ts`: 3/h per IP is goed gekozen (anti-enumeratie), maar identifier-keuze IP betekent dat 1 attacker met meerdere IP's er omheen kan; ook een corporate NAT raakt z'n quota snel kwijt.
- `api/csp-report.ts`: 100/60s per IP — bij CSP-storm in prod kan dat de Postgres `rate_limits` tabel laten groeien (random 1% cleanup is dun).

---

## 5. Aanbeveling — alleen prioriteit-volgorde

1. **P0 — kritieke gaten (geen RL én geen cap):**
   - `api/inkoopfactuur-extract.ts`
   - `api/analyze-inkoop-offerte.ts`
   - `api/ai.ts` (heeft RL maar geen kostencap; voor de FESPA-launch zou je willen weten waar dit gebruikt wordt — frontend grep nodig)

2. **P1 — outbound side-effects zonder limit:**
   - `api/send-email.ts`: identifier-correctheid checken (zie open vraag 2) + per-org dagcap overwegen
   - `api/invite-team-member.ts`: stuurt mail, geen RL → kan misbruikt worden voor mailbombing van prospects via valide accounts
   - `api/exact-sync-factuur.ts` + andere `exact-*`: niet kritiek voor kosten maar wél voor Exact-ratelimit-lockouts per organisatie

3. **P2 — Anthropic-cap consolideren:**
   - `MONTHLY_LIMIT = 5.0` is per-user. Voor multi-tenant SaaS hoort dit per-org te zijn (of beide). Race-conditie in `checkUsageLimit/updateUsage` oplossen met DB-functie.
   - Cap toevoegen aan `ai.ts`, `analyze-inkoop-offerte.ts`, `inkoopfactuur-extract.ts`.

4. **P3 — Architectuur opschonen:**
   - **Eén** rate-limit backend kiezen (Upstash, want sliding window + serverless-vriendelijk) en de Postgres-route uitfaseren.
   - 16 routes hebben dezelfde inline RL-code — overweeg één gedeelde "snippet"-bestand dat per build naar elke route wordt geprepended (build-step), of accepteer de duplicatie en maak één canonieke template.
   - Identifier-strategie standaardiseren: voor authenticated routes liefst `organisatie_id` (alle teamleden delen quota) of `user_id`; voor publiek liefst `IP + token`-combo (anti-IP-rotation).

5. **P4 — Buiten scope rate-limiting maar gerelateerd:**
   - Trigger.dev concurrency-limits per task instellen (vooral voor email-opvolging en weekly-digest bij 10+ orgs).
   - Idempotency-keys op betalings- en mail-routes.
   - Client-side debounce op Daan-chat en visualizer-knoppen.

---

## 6. Open vragen / onduidelijkheden

1. **Upstash env-vars in productie ingesteld?** Niet te verifiëren zonder Vercel-toegang. Als ze ontbreken, draait elke "beschermde" route effectief zonder RL (graceful-degrade naar `return true`). Iemand moet dit handmatig in het Vercel-dashboard checken.
2. **`send-email.ts` identifier**: gebruikt `user_id` uit `req.body`, niet uit de Bearer-token. Werd niet diepgaand geïnspecteerd of er ergens een check is dat body.user_id === geverifieerde user. Als die check ontbreekt, kan een attacker het quotum van een ander user-id volpompen om die te DoS-en.
3. **`generate-signing-mockup.ts` rate-limiter**: gebruikt `creditCheck.userId`. Als de credit-check faalt (of in dev-mode `userId === 'local'`), wordt de RL met identifier `'local'` aangesproken — alle dev-traffic gebruikt dezelfde teller, geen probleem. In prod altijd echte userId.
4. **`portaal-link-aanvragen.ts`** (3/h per IP): scenario corporate NAT + meerdere echte klanten van dezelfde organisatie achter één publiek IP — zij delen de quota. Acceptabel of niet?
5. **`MONTHLY_LIMIT = 5.0`**: $5 of €5? In code geen valuta-aanduiding; pricing in `create-checkout-session.ts` is in centen euro. Kosten-formule (`/1_000_000 * 3`) is dollar-pricing van Anthropic. Mismatch.
6. **`ai.ts`** caller-context: niet onderzocht welk frontend-component deze route raakt en hoe vaak. Voor risico-inschatting nodig.
7. **`exact-*`** routes: Exact Online heeft eigen rate limits en token-refresh, maar dit is niet getest met meerdere organisaties tegelijk. Onbekend of de huidige access-token-refresh thread-safe is bij parallel calls.
8. **`rate_limits`-tabel groei**: probabilistic cleanup (1 % kans). Bij hoog volume (CSP-reports, bot-traffic op publieke routes) is onbekend hoe groot de tabel wordt — geen TTL/cron op deze tabel.
9. **Bestaande open branches** met `feature/rate-limiting-*` namen suggereren dat eerder werk al klaar lag (`feature/rate-limiting-p0-p1`, `feature/rate-limiting-graceful-degradation`, `feature/rate-limiting-tweak-ai-chat`, `feature/rate-limiting-tweak-send-email`). Niet onderzocht of die branches verder gaan dan wat al op `main` staat — bij implementatie eerst checken.

---

**Einde rapport — niets gewijzigd, geen install, geen build.**
