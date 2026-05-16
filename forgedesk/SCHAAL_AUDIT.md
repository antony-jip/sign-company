# Schaal-audit doen. — 2026-05-15

Bron-rapporten: zeven sub-audits in `.audit-tmp/agent1..7-*.md`. Scope: doen. SaaS op huidig stack (Vite/React + Supabase + Vercel + Trigger.dev) bij doorgroei van nu naar 50, 100 en 500 organisaties · €79/maand/org flat · max 10 users/org.

---

## 1. Executive summary

De app is functioneel solide, maar er zitten een aantal kraakpunten in de infrastructuur die bij 50-100 orgs gaan bijten. De drie scherpste randen zijn: (1) Supabase JS-client praat nu op poort 5432 zonder PgBouncer · connection-pool raakt op tussen 100-200 concurrent users, (2) RLS-policies gebruiken `organisatie_id IN (SELECT ... FROM profiles WHERE id = auth.uid())` zonder DISTINCT-wrap · per-row evaluatie wordt zichtbaar zodra `klant_historie` of `audit_log_feature` boven 100k rijen komen, (3) twee cron-fan-outs (`offerte-opvolging-cron`, `portaal-herinnering-cron`) lopen e-mails sequentieel · ze passen niet meer binnen 300s zodra het aantal items per cron-window groeit. Daarnaast zit er een verborgen tijdbom in Realtime: alleen `NotificatieCenter` zit op weg naar 2000+ concurrent connections terwijl Supabase Pro 500 toelaat. Bruto-marge op revenue €7.900/maand bij 100 orgs landt op circa 93,5% (€7.385 winst), aannemend Pro-tiers op alle SaaS-diensten. Belangrijkste onzekerheid in die marge: Anthropic-kosten · onder gemiddeld gebruik €100-160/maand, onder piek-aanname uit agent3 (peak 1000 req/min) zou Tier 2 nodig zijn ($10k+/maand) of een async-queue voor non-realtime AI-features.

---

## 2. Capacity heat-map

| Component | OK tot N orgs | Bottleneck @ N+1 | Fix-effort | Tier-kost/mo |
|---|---|---|---|---|
| DB · connection pool (poort 5432) | ~50 orgs / ~100 concurrent users | Pool-uitputting · 502s · cascadende API-timeouts | 5 min config | Supabase Pro €25 |
| DB · RLS per-row subqueries | ~75 orgs (tot ~100k rijen per tabel) | `klant_historie` + `audit_log_feature` 500ms+ page-loads | 3u (DISTINCT-wrap in mig 071, 088, 097, 104) | inbegrepen |
| DB · `emails` tabel + FTS | ~250 orgs (~1M rijen) | Index-bloat, query-cliff, disk-quota | 1-2 weken (partitioning + archival window) | Storage-overage |
| DB · ontbrekende index op `portaal_items.toegewezen_aan` | nu al licht zichtbaar | seq-scan op assignment-filter | 10 min | inbegrepen |
| Vercel functions · Hobby tier | ~20 orgs | 58/59 endpoints krijgen 10s timeout · AI/IMAP/PDF-routes vallen om | 1u (Pro-upgrade + `maxDuration` in `vercel.json`) | Pro €20 |
| Vercel · cron `cron-verzend-geplande-berichten` | nu al elke minuut | 1440 invocations/dag/org · GB-uren oplopen | 30 min (interval 5 min of Trigger.dev queue) | inbegrepen |
| Trigger.dev · runs/maand | ~80 orgs (free tier ≤5000) | Free-tier op · queue valt stil | 1u (upgrade Pro) | Pro €100 |
| Trigger.dev · fan-out `offerte-opvolging-cron` | ~50 orgs | Sequentieel · 300s limiet overschreden bij ~50+ orgs × 10 offertes | 4-8u (`Promise.allSettled` + batch per org) | inbegrepen |
| Trigger.dev · fan-out `portaal-herinnering-cron` | ~50 orgs | Sequentieel · 500 users × items > 300s | 4-8u (zelfde patroon) | inbegrepen |
| Anthropic API · Tier 1 (50 req/min) | ~50 orgs gemiddeld | Ochtend-pieken 100-1000 req/min · 429-cascade · Daan offline | Tier-upgrade of async-queue (16u dev) | Tier 2 $10k+ óf €100-160 PAYGO bij niet-piek-load (zie §4) |
| Exact Online · OAuth refresh (10-min token) | ~20 orgs met Exact aan | Token-storm · 20 users × refresh-burst > 60 req/min · "reconnect"-foutmelding elke 10 min | 4u (preemptive refresh + batch) | inbegrepen |
| Supabase Realtime · concurrent connections | ~25 orgs | `NotificatieCenter` 2 tabs × 10 users × 100 orgs = 2000 subs · Pro-limit 500 | 4-8u (visibility-aware throttle) of Business-upgrade | Pro inbegrepen tot 500, daarna Business custom |
| Supabase Storage · capaciteit | ~100 orgs (~350 GB op Pro/Team) | Egress richting 500GB/maand Team-limiet bij 500 orgs | monitoring + image-optimisation | Team €600/jaar of $0.018/GB overage |
| Storage · `portaal-bestanden` public-bucket | nu al exposure | Path-enumeratie · GDPR-risico bij 500+ orgs · 5000 files raden wordt haalbaar | 4-8u (private bucket + signed URLs) | inbegrepen |
| Resend · transactionele e-mail | ~150 orgs (free 3k/mo) | Free tier op · duplicate emails als cron retried (geen idempotency-key) | 4u (idempotency + paid tier) | Pro €20 |
| Upstash Redis · rate-limit backend | ~50 orgs (free 10k cmds/dag) | Quota op · fail-open laat Anthropic ongeremd door | 1u (upgrade) | $7-10 |
| Klantportaal · cold load (`/api/portaal-get`) | ~50 orgs | 5-8 queries/load, geen cache · 20 stakeholders openen tegelijk = DB-spike | 2-4u (Cache-Control headers) | inbegrepen |
| Frontend bundle · 1.8-2.2 MB gzip | acceptabel | First paint langzaam op 3G · niet hard genoeg om revenue te kosten | 1-2 dagen (recharts/pdfjs splitsen) | inbegrepen |
| Sentry · 10% sample + geen alerts | nu | Payment-failures, AI-outages, cron-failures lopen onopgemerkt | 2u (Sentry Alerts + custom context) | Team €26 vanaf ~200 orgs |
| PostHog / RUM | nu | Geen funnel-data, geen LCP/FID-meting · churn-signalen onzichtbaar | 4-7u (PostHog + web-vitals) | gratis tot 1M events |

---

## 3. Top 10 actiepunten

Gerangschikt op (impact × urgentie) / effort. "Bron" verwijst naar het sub-rapport plus de specifiekste file:line uit dat rapport.

### 1. Supabase JS-client naar poort 6543 (PgBouncer transaction mode)
- **Wat** · Connection-pooler aanzetten zodat Vercel-functions niet direct op 5432 hangen.
- **Waarom kritiek** · Bij 500 users × 5 tabs zijn er 2500 connection-requests tegen een limit van ~100 · cascadende 502s op alle API-routes.
- **Effort** · 5 minuten (env-var + dashboard-toggle).
- **Window** · vóór 50 orgs.
- **Bron** · agent1 §6 (`src/services/supabaseClient.ts:1-14`).

### 2. Vercel Pro + `maxDuration`-overrides voor AI/IMAP/PDF-endpoints
- **Wat** · Pro-tier inschakelen, en in `vercel.json` per route-pattern `maxDuration` op 60-300s zetten.
- **Waarom kritiek** · 58 van 59 endpoints draaien op Hobby-default 10s · `ai-rewrite` (p99 15s), `fetch-emails` (5-30s), `inkoopfactuur-sync` (30-120s) timen out · timeout-rate 20-30% bij 100 orgs.
- **Effort** · 1 uur.
- **Window** · vóór FESPA (smaak-test bij eerste paid orgs).
- **Bron** · agent2 §1, §2, §9, recommendation-blok L466-473 (`vercel.json` ontbreekt overrides).

### 3. RLS-subqueries wrappen in `(SELECT DISTINCT ...)`
- **Wat** · Migraties 071, 088, 097, 104 patchen: `organisatie_id IN (SELECT organisatie_id FROM profiles WHERE id = auth.uid())` → `IN (SELECT DISTINCT organisatie_id ...)` of CTE.
- **Waarom kritiek** · `klant_historie` (geschat ~200k @ 500 orgs) en `audit_log_feature` (~500k) worden per-row geëvalueerd · page-loads >500ms wordt 2s+ bij groei van audit-log.
- **Effort** · 2-3 uur per tabel · totaal ~3u.
- **Window** · vóór 75 orgs.
- **Bron** · agent1 §3 (`071_rls_batch1_onbeveiligd.sql:71/87`, `088_audit_log_feature.sql:88`, `097_factuur_bijlagen.sql:97`).

### 4. Sequential fan-out in cron-tasks parallel maken
- **Wat** · `offerte-opvolging-cron` en `portaal-herinnering-cron` van `for ... await` naar `Promise.allSettled(...)`.
- **Waarom kritiek** · 300s-window van Trigger.dev wordt overschreden zodra een cron 100+ items binnen één run moet versturen · 90%+ van opvolging/herinneringen mist bij 100 orgs.
- **Effort** · 4-8 uur (twee tasks · testen op idempotency en error-handling).
- **Window** · vóór 100 orgs (deels al spannend bij 50).
- **Bron** · agent2 §7 (`src/trigger/offerte-opvolging.ts:167-345`, `src/trigger/portaal-herinnering.ts:193-279`).

### 5. Exact Online preemptive refresh + batch
- **Wat** · `token_expires_at` bijhouden in DB, refresh op `T-1 min`, batch refreshes (max 1 per minuut per org).
- **Waarom kritiek** · Refresh-tokens vervallen elke 10 min · bij 10 users tegelijk op één org = burst > 60 req/min limit · "reconnect Exact Online"-popup elke 10 min voor enterprise orgs.
- **Effort** · 4 uur.
- **Window** · vóór 25 orgs met Exact aan.
- **Bron** · agent3 §5 (`/api/exact-refresh.ts:138-149`, `FactuurEditor.tsx:1614`).

### 6. Realtime-subscription throttling in `NotificatieCenter`
- **Wat** · Subscription pauzeren op `document.visibilityState === 'hidden'`, of alleen leading-tab laten subscriben (BroadcastChannel-leader-election).
- **Waarom kritiek** · 100 orgs × 10 users × 2 tabs = 2000 concurrent Realtime-connections · Pro-limit is 500 · nieuwe subs worden geweigerd, notificaties stilletjes weg.
- **Effort** · 4-8 uur.
- **Window** · vóór 50 orgs.
- **Bron** · agent6 §5 (`src/components/notifications/NotificatieCenter.tsx`, schatting op L215).

### 7. `portaal-bestanden`-bucket privé maken + signed URLs
- **Wat** · Bucket van public naar private, klantportaal-route levert signed URLs (1u TTL) i.p.v. `getPublicUrl`.
- **Waarom kritiek** · Customer-uploads zijn nu publiek; path-enumeratie wordt haalbaar zodra er 5000+ files in zitten · GDPR-blootstelling. App-laag-token wordt na initiële load niet meer afgedwongen op file-URL.
- **Effort** · 4-8 uur (migration + `api/portaal-get.ts` aanpassen + frontend test).
- **Window** · vóór 100 orgs (eerder als data-classificatie strakker moet).
- **Bron** · agent4 §3, §7 Bottleneck #1 (`migration/036_portaal_storage_policy.sql:3-7,15-18`, `api/portaal-get.ts:298`).

### 8. Anthropic-strategie kiezen: async-queue voor non-realtime AI of Tier-upgrade
- **Wat** · Opties: (a) `ai-rewrite`, `ai-followup-email`, `analyze-inkoop-offerte`, `inkoopfactuur-extract` via Trigger.dev async queue · (b) Tier 2 aanvragen bij Anthropic · (c) features afslanken.
- **Waarom kritiek** · Agent3 berekent peak 1000 req/min @ 100 orgs op 8u-9u-window terwijl Tier 1 = 50 req/min · agent2/7 berekenen maand-gemiddelde dat wél binnen budget past. Het verschil is precies of je ochtend-pieken accepteert. Eerste 429 hit = Daan offline. Geen server-side backoff aanwezig (`api/ai-chat.ts:495`).
- **Effort** · 16u (async-queue refactor) · 1u (tier-aanvraag) · 1 dag (feature-cull).
- **Window** · vóór 100 orgs.
- **Bron** · agent3 §3 (`api/ai-chat.ts:75,432-437,477,495`) vs. agent7 §7a (gemiddeld 5k calls/mo · €100-120/mo). Conflict: zie §4.

### 9. Sentry Alerts + custom `organisatie_id`-context
- **Wat** · Native Sentry alert-rules op: error-rate >5%/min, payment-webhook failures, Trigger.dev task-retry-exhausted, AI 5xx >10%. `Sentry.setContext({ organisatie_id })` in auth-init.
- **Waarom kritiek** · Op revenue €7.900/maand is 1u downtime ~€330 · payment-failures zijn nu silent · zonder org-context geen filtering bij incidents.
- **Effort** · 2-3u.
- **Window** · vóór FESPA.
- **Bron** · agent7 §1, §6 (`src/main.tsx:8-49`).

### 10. Resend idempotency-keys op alle Trigger.dev e-mails
- **Wat** · `idempotency_key = hash(org_id + entity_id + step_id + date)` in `cron_dedup_log`-tabel; cron checkt vóór send.
- **Waarom kritiek** · Bij retry van een cron-task (zoals `offerte-opvolging` bij DB-timeout halfweg) krijgt klant duplicaat-mails · support-ticket-stroom · trust-schade.
- **Effort** · 4u.
- **Window** · vóór 100 orgs.
- **Bron** · agent3 §4 (`src/trigger/utils/resend.ts:32-52`) + agent2 §4 (geen `concurrencyLimit` op tasks).

---

## 4. Kosten-projectie

| Service | Nu | @50 orgs | @100 orgs | @500 orgs |
|---|---|---|---|---|
| Supabase (Pro → Business) | €25 (Pro · aanname) | €25 | €25 | €500 (Business custom) |
| Supabase Storage overage | €0 | €0 | €0-10 | €10-50 |
| Vercel (Hobby → Pro → Pro+) | €0 of €20 | €20 | €20 | €50-70 |
| Trigger.dev (Free → Pro → Business) | €0 | €0 | €100 | €500 |
| Resend (Pro vanaf ~150 orgs) | €0 of €20 | €20 | €20 | €50 |
| Anthropic Claude (PAYGO) | <€20 | €25-50 | €100-160 (gemiddeld) · €10k+ (piek-Tier-2 scenario) | €500-1000 (gemiddeld) |
| Upstash Redis | ~€2-5 | €5 | €7-10 | €50 |
| Sentry (Free → Team) | €0 | €0 | €26 | €26 |
| KVK API (jaarcontract) | €42 | €42 | €42 | €42 |
| Stripe/Mollie fees (1,8% × revenue) | n.v.t. | €71 | €142 | €710 |
| FAL AI (per image) | minimaal | minimaal | minimaal | minimaal |
| **Totaal/maand** | **~€90** | **~€210** | **~€505 (gemiddeld)** | **~€2.500-2.600** |

### Bruto-marge @ 100 orgs

Revenue: 100 orgs × €79 = **€7.900/maand**.

Onder de gemiddelde-load-aanname (agent7):
- Infra-kost €505/maand · €7.900 − €505 = **€7.395 bruto-winst** · marge **93,6%**.

Onder de piek-load-aanname (agent3):
- Als Anthropic Tier 2 nodig blijkt om ochtend-bursts op te vangen: extra ~$10.000/maand · marge zakt naar circa 10-15% en het businessmodel klopt niet meer op een €79-flat-plan.

**Cruciaal verschil tussen de twee bronnen** · agent3 modelleert een 8-9u ochtend-piek waarin 500 users tegelijk Daan openen (50% concurrency, 2 calls in 5 min); agent7 modelleert maand-totalen (5k AI-calls/maand × 2000 tokens × $2,50 per 1M). Beide kunnen kloppen · welke realistisch is hangt af van of er een gedeelde "morning rush" zit op het Daan-gebruik bij signmaker-werkpatroon. Vraag voor de praktijk: wat is de werkelijke spreidings-curve van AI-calls per uur over de dag? Tot die data er is, is dit het grootste risico in de marge-aanname.

Stripe/Mollie-fees zijn meegerekend als infra-kost omdat ze direct met revenue meeschalen. Loonkosten, customer-support en marketing zijn niet opgenomen · dit is bruto-marge op infra-laag.

---

## 5. Observability-gaten

Wat Antony nu mist:

- **PostHog (of vergelijkbaar)** · geen onboarding-funnel, geen feature-adoption-meting, geen churn-signaal. Bron: agent7 §2.
- **RUM / web-vitals** · LCP/FID/CLS niet gemeten · klant-side traagheid alleen via cancellations zichtbaar. Bron: agent7 §3.
- **Sentry Alerts** · 10% sample-rate, geen alert-regels actief · payment-failures, Trigger.dev-task-failures, AI 5xx-spikes blijven onopgemerkt. Bron: agent7 §1, §6.
- **Slow-query log** · Supabase tier-afhankelijk; runbook ontbreekt · queries die langzamer worden door RLS-groei worden pas zichtbaar via klant-klacht. Bron: agent7 §4.
- **Realtime-connection-count metric** · geen alert bij >400 concurrent subscriptions; ceiling van 500 wordt onverwacht geraakt. Bron: agent6 §5.
- **Trigger.dev task-failure rate** · `concurrencyLimit` ontbreekt overal · retries-exhausted gaat alleen in dashboard zichtbaar zijn, niet proactief. Bron: agent2 §4, §9.
- **IMAP-connection-pool metrics** · `inkoopfactuur-intake` opent connecties zonder pooling/instrumentatie · Gmail 15-concurrent-limit kan stil geraakt worden. Bron: agent2 §9, agent3 §9.
- **Egress-meter per org** · Supabase Storage egress wordt niet bijgehouden · Team-tier-limit (500GB/maand) wordt pas in een Supabase-factuur zichtbaar. Bron: agent4 §7 Bottleneck #3.
- **Custom Sentry-context (`organisatie_id`)** · errors zijn niet te filteren per organisatie tijdens incident-triage. Bron: agent7 §1.
- **Resend bounce/complaint webhook** · geen handler · deliverability-issues blijven verborgen. Bron: agent5 §4.

---

## 6. Quick wins (<1 dag werk, hoge impact)

- **PgBouncer aan (poort 6543)** · 5 min · ontgrendelt 10× connection-headroom. Bron: agent1 §6.
- **Index op `portaal_items.toegewezen_aan`** · 10 min · stopt seq-scan op assignment-filter. Bron: agent1 §1-2.
- **Indexen op `emails.beantwoord_door_email_id` en `vervangen_door_email_id`** · 15 min · maakt thread-traversal logaritmisch i.p.v. lineair. Bron: agent1 §1.
- **`maxDuration` per endpoint in `vercel.json`** · 1u · timeout-rate op AI/IMAP/PDF van 20-30% naar nul. Bron: agent2 §1, recommendation L466-473.
- **`Cache-Control: public, s-maxage=300, stale-while-revalidate=3600` op `/api/portaal-get`** · 30 min · 20-stakeholder-share-spike valt van 20 DB-queries terug naar één. Bron: agent6 §9, §10 Bottleneck 2.
- **Cron `cron-verzend-geplande-berichten` van `* * * * *` naar `*/5 * * * *`** · 5 min · 1440 → 288 invocations/dag, gelijk effect voor user. Bron: agent2 §1 issue 1.2.
- **Sentry Alerts opzetten (error-rate, payment-fail, Trigger.dev-fail)** · 2u · stopt "silent revenue leak". Bron: agent7 §6.
- **Upstash Redis upgraden naar $7-tier** · 5 min · voorkomt fail-open op rate-limit die Anthropic ontremt. Bron: agent3 §10.
- **`Sentry.setContext({ organisatie_id })` in auth-init** · 30 min · incident-triage kan filteren op klant. Bron: agent7 §1.
- **Image-lazyloading in portaal-galerij (`loading="lazy"` attribuut)** · 30 min · 100 image-requests bij galerij-render valt terug naar wat-in-viewport. Bron: agent6 §7.

---

## 7. Tech-debt parking lot

Wat NU acceptabel is, maar gemerkt blijft voor toekomst:

- **`audit_log_feature` schrijft één-per-mutatie** · prima tot ~200 orgs · bij grote bulk-actie of 300+ orgs overwegen batch-insert. Per memory `project_audit_log_feature_bulk_perf.md` al genoteerd. Bron: agent1 §3, §7.
- **Geen IMAP-connection-pool (Redis-backed)** · sequentieel werkt tot ~100 orgs · bij parallel werken aan inkoopfactuur-intake of email-fetch wordt Gmail 15-concurrent-limit een ceiling. **N-moment:** ~100 orgs of zodra parallel-fetch aangezet wordt. Bron: agent2 §3, §9; agent3 §9.
- **Bundle 1,8-2,2MB gzip (recharts 368KB + pdfjs 460KB)** · acceptabel tot churn-data zegt anders · bij merkbare LCP-degradatie chart-split en pdfjs-defer. **N-moment:** zodra RUM aangezet wordt en LCP-cohort >2,5s zichtbaar wordt. Bron: agent6 §1-3.
- **`portaal-bestanden` public bucket** · risico nu laag (paths met UUID) · bij 500 orgs / 5000+ files wordt enumeratie haalbaar. **N-moment:** vóór 100 orgs als data-classificatie strakker moet, anders ~300 orgs. Bron: agent4 §3.
- **`emails`-tabel zonder partitioning** · prima tot ~1M rijen · bij 250 orgs partitioning per `user_id` + archival-window (>6 maanden). **N-moment:** zodra `emails` over 800k rijen gaat. Bron: agent1 §7.
- **Key-rotation vereist redeploy (module-load caching)** · acceptabel zolang er geen compromise is · bij compliance-eis (SOC2/ISO27001) per-request secret-fetch nodig. **N-moment:** bij security-audit voor enterprise-klant. Bron: agent5 §5.
- **`portaal-herinnering`-cron N+1 op profiles/document_styles** · ~500 queries per run, OK tot ~500 orgs · daarboven batch fetchen buiten loop. **N-moment:** 500 orgs. Bron: agent4 §5, Bottleneck #2.
- **Geen Resend bounce/complaint webhook** · deliverability-blind tot scale waar inbox-reputatie-tracking belangrijk wordt. **N-moment:** zodra de eerste customer "ik krijg de mails niet"-ticket binnenkomt. Bron: agent5 §4.
- **Singleton `supabase`-client via dynamic-import (`import('@/services/supabaseClient')`)** · functioneel veilig (zelfde instance) maar overbodig · opruimen bij volgende refactor. Bron: agent6 §6.
- **Email-credentials encrypted met single shared key** · acceptabel, per memory `feedback_email_user_isolation.md` · jaarlijkse rotation overwegen of HKDF per user bij security-sprint (zie memory `project_security_sprint_backlog.md`). Bron: agent5 §9 Risk 3.

---

## 8. Bronverwijzingen (top-3 per rapport)

**agent1 · database** (`/Users/antonybootsma/sign-company/forgedesk/.audit-tmp/agent1-database.md`)
- §6 Connection pooling ontbreekt · `src/services/supabaseClient.ts:1-14` · blocker bij 100 users.
- §3 RLS per-row subqueries · `071_rls_batch1_onbeveiligd.sql:71/87`, `088_audit_log_feature.sql:88` · wall bij 100k+ rijen.
- §7 `emails`-tabel groeit naar 1,2M rijen @ 100 orgs · FTS-index-bloat en disk-quota-risico bij 250+ orgs.

**agent2 · vercel + trigger.dev** (`.audit-tmp/agent2-vercel-trigger.md`)
- §1 58/59 endpoints op Hobby-default 10s · `vercel.json` mist `maxDuration`-overrides.
- §7 Sequential fan-out · `src/trigger/offerte-opvolging.ts:167-345`, `src/trigger/portaal-herinnering.ts:193-279` · 300s-window break bij 100 orgs.
- §3 + §9 IMAP zonder pooling · `inkoopfactuur-intake.ts:33,98` · 2880 runs/maand, geen `concurrencyLimit`.

**agent3 · external APIs** (`.audit-tmp/agent3-external-apis.md`)
- §3 Anthropic Tier 1 (50 req/min) vs. piek-vraag 1000 req/min · `api/ai-chat.ts:75,495` · geen server-side backoff.
- §5 Exact Online refresh-token vervalt elke 10 min · `api/exact-refresh.ts:138-149` · token-storm-risico bij gelijktijdige users.
- §4 + §10 Resend zonder idempotency + Upstash free-tier op · combineert tot cascade-risico (Upstash uit → Anthropic ontremd → Daan offline).

**agent4 · storage + email** (`.audit-tmp/agent4-storage-email.md`)
- §3 `portaal-bestanden` public bucket · `migration/036_portaal_storage_policy.sql:3-7,15-18` · GDPR-blootstelling bij path-enumeratie.
- §5 Portaal-herinnering N+1 · `src/trigger/portaal-herinnering.ts:79-149` · ~2000 queries per cron @ 500 orgs.
- §7 Storage-egress richting 500GB/maand Team-tier-limiet bij 500 orgs.

**agent5 · secrets + security** (`.audit-tmp/agent5-secrets-security.md`)
- §5 Key-rotation vereist redeploy · alle critical keys cached op module-load · 5-15 min downtime bij emergency-rotation.
- §7 `portaal-get` mist IP-rate-limit (alleen token-entropie beschermt) · DDoS-resilience-gat.
- §9 Risk 2 Exact/Mollie client-secret decrypted in geheugen tijdens OAuth-call · `api/exact-callback.ts:115-125` · niet vermijdbaar zonder pgsodium.

**agent6 · frontend** (`.audit-tmp/agent6-frontend.md`)
- §5 Realtime-subscriptions · `NotificatieCenter` schaalt naar 2000+ concurrent · Pro-limit 500.
- §4 + §9 Klantportaal zonder Cache-Control · `/api/portaal-get` doet 5-8 queries per load · spike bij 20 gelijktijdige openers.
- §1 + §3 Bundle 1,8-2,2MB gzip · recharts/pdfjs/lucide-react bovenop critical path.

**agent7 · observability + cost** (`.audit-tmp/agent7-observability-cost.md`)
- §2 + §3 PostHog ontbreekt + RUM ontbreekt · geen funnel, geen LCP-meting · churn-signaal blind.
- §6 Zero alerting · payment-fail, cron-fail, AI-outage allemaal silent.
- §7-7c Bruto-marge @100 orgs · €7.900 − €505 = €7.395 (93,5%) onder gemiddelde-load-aanname.
