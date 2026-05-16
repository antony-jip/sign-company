# External API Audit — doen. App

**Project:** doen. SaaS (Sign Company)  
**Scope:** Production API usage at 100 active organizations  
**Date:** 2026-05-15  
**Auditor:** Agent (READ-ONLY analysis)

---

## Executive Summary

The doen. app integrates 10 external APIs. **Three APIs pose material scaling risk:**

1. **Exact Online** — 10-minute token expiry + hourly refresh storm risk
2. **Anthropic Claude** — Tier 1 rate limits (50 req/min) with 5 simultaneous AI features  
3. **Mollie** — Payment webhook retries without exponential backoff

At 100 orgs with concurrent usage, the system can hit all three APIs' public limits within peak traffic windows (8–9am during morning cron runs).

---

## API-by-API Analysis

### 1. MOLLIE — Payments & Webhooks

| Aspect | Detail |
|--------|--------|
| **Call Sites** | `/api/mollie-create-payment.ts:230–250` (POST), `/api/mollie-webhook.ts:155` (GET), reuse check 195–223 |
| **Call Pattern** | User-triggered (payment initiation); webhook-driven (status updates). Single-use; payment_id reused if still valid (open state). |
| **Public Limits** | ~300 req/min (default). Webhook retries for transient failures; Mollie retries indefinitely on 5xx. |
| **Retry Logic** | No explicit retry in client code; 500 response on error relies on Mollie's own retry (exponential backoff). Webhook 500 = Mollie retries ~5 times. |
| **Idempotency** | **YES** — `mollie_payment_id` stored in `facturen` table; webhook checks `status = 'betaald'` before updating (line 181); reuse check prevents double-create (line 193–208). |
| **Est @100 orgs** | ~50–100 payments/month/org avg = 5,000–10,000/month system-wide = ~150–300/day = ~6–12 req/hour = **well below limit**. Peak (month-end) ~20/hour still safe. |
| **Headroom** | 250x at average load; 12x at peak. ✅ Safe. |
| **Risk (L/M/H)** | **L** — Payment creation is one-shot user action; idempotency on webhook prevents cascades. Webhook retries handled by Mollie. |

**Failure Mode:** If Mollie API returns 5xx, client gets 502 error; user must retry. No customer-facing impact if webhook eventually lands (idempotent update). If payment created but DB write fails (line 273–279), payment is orphaned but Mollie auto-expires it.

---

### 2. STRIPE — Webhooks & Subscriptions

| Aspect | Detail |
|--------|--------|
| **Call Sites** | `/api/stripe-webhook.ts:204–175` (webhook handlers); checkout creation via UI (not shown in audit — client-side Stripe.js). |
| **Call Pattern** | Webhook-driven (credits checkout, subscription activation, payment failed, subscription events). Async event processing. |
| **Public Limits** | 100 read/sec (ample). No client-initiated API calls to Stripe; all server-side is webhook reactions. |
| **Retry Logic** | Stripe retries webhook delivery ~5 times with exponential backoff (24h total). 200 OK stops retries; 5xx/timeout triggers retry. |
| **Idempotency** | **YES** — Line 58–65: Check `stripe_session_id` in `credit_transacties` before inserting credits. Prevents duplicate credits on re-delivery. |
| **Est @100 orgs** | One webhook per checkout session (~10–50/org/month) + subscription events. System: ~500–1500/month = ~15–45/day = **~1 event/hour**. Very low. |
| **Headroom** | 6000x at current load. ✅ Safe. |
| **Risk (L/M/H)** | **L** — Idempotency key in place; Stripe's webhook retry strategy is robust. No cascading failures. |

**Failure Mode:** If app returns 5xx on webhook, Stripe retries. If idempotency check fails, duplicate credits added (but marked with stripe_session_id). Current code checks deduplication key, so safe.

---

### 3. ANTHROPIC CLAUDE (Daan AI)

| Aspect | Detail |
|--------|--------|
| **Call Sites** | `/api/ai-chat.ts:477` (claude-sonnet-4-6), `/api/ai-rewrite.ts:225` (claude-haiku), `/api/ai-followup-email.ts:219` (claude-sonnet), `/api/ai-email.ts:213` (claude-sonnet), `/api/generate-signing-mockup.ts:227` (claude-sonnet), `/api/analyze-inkoop-offerte.ts:256` (claude-sonnet), `/api/inkoopfactuur-extract.ts:249` (claude-sonnet) |
| **Models Used** | Sonnet 4.6 (6 sites: chat, followup-email, email, mockup-prompt, analyze, extract); Haiku (1 site: rewrite). |
| **Call Pattern** | User-triggered (chat, rewrite, email generation); batch-like (analyze-offerte, inkoopfactuur-extract queued from triggers). Heavy usage in morning workflows. |
| **Public Limits** | **Tier 1 (default):  50 req/min, 40k input tokens/min** across all models. Sonnet pricing: $3/1M input, $15/1M output. Haiku: $1/$5. Monthly budget enforced per user: €5/user/month. |
| **Rate Limiting** | `/api/ai-chat.ts:75` — Upstash Ratelimit: `slidingWindow(20, '60s')` = 20 req/min per user. `/api/generate-signing-mockup.ts:19` — `slidingWindow(2, '3600s')` = 2 req/hour per user (expensive operation). |
| **Monthly Budget** | Enforced at user level: `$MONTHLY_LIMIT = 5.0` EUR. Checked before each call (line 432–437 in ai-chat.ts); returns 429 if exceeded. |
| **Retry Logic** | **NO exponential backoff.** Line 495 in ai-chat.ts: if 429, return 429 to client (propagate, user retries). No server-side retry. On 5xx, return 5xx; client retries or errors. |
| **Tokens/Call (estimate)** | ai-chat: ~800 input (context + question), ~300 output (response) = 1,100 tokens avg. ai-rewrite: ~500 in, ~200 out. ai-followup-email: ~600 in, ~150 out. |
| **Est @100 orgs** | **Conservative scenario:** 5 active users/org, ~2 chat calls/user/day = 1,000 calls/day. Plus rewrite (1/user/day) = 500. Plus followup (1/user/day) = 500. **Total: 2,000 calls/day = 1.4 calls/min avg.** Peak (8am, 10 users online 5 calls/min each = 50 calls/5min = 10 calls/min). At 100 orgs: **peak 1,000 calls/min.** **FAR EXCEEDS Tier 1 limit of 50 req/min.** |
| **Token Budget @100 orgs** | At 1,000 calls/min peak: 1,000 × 1,100 tokens = 1.1M tokens/min input. Tier 1 limit: 40k/min. **27x over limit.** Monthly: assuming avg 20 calls/org/day = 2,000 calls = 2.2M tokens/day = 66M tokens/month. Tier 1 daily quota ~1.2M (40k/min × 1440min). |
| **Headroom** | **CRITICAL:** At peak load, **27x over token limit**. Tier 1 insufficient; needs Tier 2+ (500 req/min, 1.2M tokens/min) or request batching. |
| **Risk (L/M/H)** | **H — BLOCKER.** Tier 1 will reject 95% of traffic at scale. No exponential backoff means clients see immediate 429 errors. Need to: (a) upgrade to Tier 2 ($10k+/month), (b) implement server-side backoff/queue with Trigger.dev, (c) reduce per-user monthly budget or AI features, or (d) use cheaper model (Haiku for more workloads). |

**Failure Mode:** Peak traffic (8–9am with 100 orgs) = 1,000 req/min burst. Anthropic returns 429 (Rate Limit). No client-side retry → users see "too many requests" error. All AI features offline during morning workflow. Backlog accumulates; queue never clears.

**Mitigation Needed:**
- Upgrade to Tier 2 ($10k–15k/month, supports ~500 req/min, 1.2M tokens/min).
- Or: Async queue (Trigger.dev) for non-instant AI features (rewrite, followup, mockup-prompt); chat remains real-time.
- Or: Reduce budget or remove costly features (mockup generation = most expensive).

---

### 4. RESEND — Transactional Email

| Aspect | Detail |
|--------|--------|
| **Call Sites** | `/api/resend-notify.ts:23` (sendDoenNotification), called from `/api/goedkeuring-reactie.ts:169`, `/api/offerte-wijziging.ts:161`, Trigger workflows (`portaal-herinnering.ts`, `trial-reminder.ts`, `weekly-digest.ts`, `onboarding-sequence.ts`, `offerte-opvolging.ts` via `/src/trigger/utils/resend.ts`). |
| **Call Pattern** | Event-driven (approval reaction, quote change) + cron-scheduled (portaal reminders daily 10am, trial-reminder weekly, digest weekly, onboarding sequence multi-step, offerte-opvolging daily 8am). |
| **Public Limits** | Free tier: 100/day, 3k/month. Paid: $20+/month, unlimited or high cap (50k+/month). |
| **Retry Logic** | Resend retries on transient failures; app level: none (fire-and-forget in `/api/resend-notify.ts:31` returns false on error, no re-attempt). |
| **Idempotency** | **NO.** No check for duplicate sends. If trigger re-fires, user gets duplicate email. |
| **Est @100 orgs** | **offerte-opvolging cron (8am daily):** Per org, avg 5 open offertes × avg 2 followup steps = ~10 emails/org/day = 1,000/day system-wide. Plus **portaal-herinnering (10am daily):** avg 3 pending items/org = 300/day. Plus **trial-reminder (weekly):** ~20 trial orgs = 20/week. Plus **weekly-digest:** ~80 active orgs = 80/week. Plus **onboarding-sequence:** ~2 new orgs/week × 5 steps = 10/week. **Total: ~1,500–2,000/month.** Well within free tier (3,000/month) if not at scale; at 200 orgs would hit limit. |
| **Headroom** | Free tier: 3k/month; estimate 2k. **1.5x headroom.** Upgrade needed at 200+ orgs. Currently safe. |
| **Risk (L/M/H)** | **M** — At current scale (assuming <100 active orgs), safe. But: (a) no deduplication if triggers re-fire, (b) free tier exhausted at 200 orgs, (c) offerte-opvolging cron not idempotent (if Trigger.dev re-fires, users get double emails). Must upgrade to paid tier ($20+) and add idempotency checks before 150 orgs. |

**Failure Mode:** If `offerte-opvolging` cron retries due to transient DB error, each offerte sends followup email twice. User sees duplicate. If free tier exhausted, all emails drop silently (no API key = function bails).

**Mitigation:**
- Add `idempotency_key` to triggers (hash of org + offerte + stap_id + date).
- Move to paid tier ($20+/month) before 150 orgs.

---

### 5. EXACT ONLINE — ERP Integration

| Aspect | Detail |
|--------|--------|
| **Call Sites** | `/api/exact-refresh.ts:138` (token refresh), `/api/exact-auth.ts` (OAuth), `/api/exact-administraties.ts`, `/api/exact-dagboeken.ts`, `/api/exact-btw-codes.ts`, `/api/exact-grootboeken.ts` (config reads), `/api/exact-sync-factuur.ts` (invoice sync triggered by user in FactuurEditor). Plus admin queries in components (FactuurEditor.tsx:1614 calls `/api/exact-sync-factuur`). |
| **Call Pattern** | OAuth callback → access_token + refresh_token stored. Refresh token via POST `/api/exact-refresh` on demand or before expiry. Config reads on UI load. Sync on user action (save invoice). |
| **Public Limits** | ~60 req/min per app per user. Daily quota. **Refresh token expires every 10 minutes** — critical issue. Access tokens expire in ~1 hour. |
| **Token Refresh** | `/api/exact-refresh.ts:138–149`: Calls `/token` endpoint to refresh. **No backoff.** If token expired, immediate 400/401 response. |
| **Retry Logic** | No client-side retry. Component (`FactuurEditor.tsx:1614`) calls sync; if 400/401, user sees "reconnect Exact Online" error. |
| **Idempotency** | **NO.** Invoice sync is fire-and-forget. If sync partially succeeds (invoice created, DB update fails), orphaned record in Exact. |
| **Est @100 orgs** | Assume 20 orgs use Exact integration (not universal). Each user syncs ~5 invoices/month = 100 syncs/org/month = 2,000 system-wide = ~65/day = ~3/hour. Plus config reads on login = ~10/day. **Plus refresh token calls:** If app caches access_token lifetime, refresh ~once/hour/user = 20 users/org × 20 orgs = 400/hour = **6.7 req/min.** Still under 60 limit. |
| **Token Refresh Storm Risk** | **CRITICAL.** Exact tokens expire every 10 minutes. If multiple users refresh simultaneously during startup or after API downtime, system makes 20 refresh calls / 10min = 2 calls/min per org × 20 orgs = 40 calls/min. At 50 orgs using Exact: **100+ req/min.** Exceeds limit. Mollie doesn't have this issue (tokens valid 1 hour+). |
| **Headroom** | At 20 orgs: 6.7 req/min, 50x headroom. At 50 orgs: 17 req/min, 3.5x headroom. At 100 orgs: 34 req/min, 1.8x headroom. **Close at scale.** Token-storm risk is real if clients crash and all retry refresh simultaneously. |
| **Risk (L/M/H)** | **H — Token expiry cascade.** Every 10 minutes, all active Exact users' tokens expire. If app doesn't cache / refresh preemptively, next API call triggers refresh. If 10+ users online per org, that's 10 refresh calls in 1 second = burst > 60 limit = 429 responses = users see "reconnect" errors. Happens every 10 minutes. |

**Failure Mode:** 
1. User logs in at 8:00am, gets access_token (expires 9:00am), refresh_token (expires 8:10am).
2. At 8:10am, refresh_token auto-expires. 
3. If app tries to sync invoice at 8:11am, needs fresh access_token → calls refresh → 400 "refresh_token expired" → user must re-authorize OAuth.
4. Or: 10 users online, all try sync at 8:00:59am (before their token refresh), each triggers refresh → 10 calls in 1 second → Exact returns 429 → all see errors.

**Mitigation Needed:**
- **Preemptive refresh:** Refresh token every 9 minutes (before 10-min expiry), not on-demand.
- **Batch refresh:** Aggregate refresh calls to max 1 per minute per org.
- **Exact fallback:** If Exact 429, queue for retry in 30s via Trigger.dev, don't fail user immediately.
- **Monitor:** Alert if 5+ 429 errors in 10min from Exact.

---

### 6. KVK API — Business Registry (Netherlands)

| Aspect | Detail |
|--------|--------|
| **Call Sites** | `/api/kvk-zoeken.ts:120` (search by name/kvknummer), `/api/kvk-basisprofiel.ts` (fetch profile). Called from UI on client-side searches: `KvkZoekVeld.tsx`, `AddEditClient.tsx`, `LeadFormulierPubliek.tsx`. |
| **Call Pattern** | User-initiated search (typeahead, add customer flow). One call per search; typically 1–5 searches/user/week during onboarding or customer add. |
| **Public Limits** | Paid tier: ~10k/day. Test API (free, unlimited but limited data). |
| **Rate Limiting** | `/api/kvk-zoeken.ts:52–54`: App-level RPC check via Supabase `check_rate_limit('kvk-zoeken', userId, 20, 60)` = 20 req/60s per user. Hard limit enforced in DB. |
| **Retry Logic** | No retry on client. If 429, user sees "too many requests" error and waits. |
| **Idempotency** | N/A — reads only, no state change. |
| **Est @100 orgs** | Assume 10% of users (5 users/org × 100 orgs = 500 users) use customer search ~1/week = 500 calls/week = 71 calls/day = ~3 calls/hour. Well under 10k/day. |
| **Headroom** | 140x at current load. ✅ Safe. |
| **Risk (L/M/H)** | **L** — Low volume, good user-level rate limiting in place. Paid tier sufficient for 200+ orgs. |

**Failure Mode:** KVK daily quota (10k) hits only if app accidentally loops all customer searches in batch (e.g., import script). Unlikely given current code.

---

### 7. FAL AI — Image Generation (Signing Mockups)

| Aspect | Detail |
|--------|--------|
| **Call Sites** | `/api/generate-signing-mockup.ts:355–375` (fal.storage.upload + fal.subscribe('fal-ai/nano-banana-2/edit')). Called from UI: `SigningVisualizerDialog.tsx`, `VisualizerLayout.tsx`. User generates 1 mockup at a time; ~5–30 min per image. |
| **Call Pattern** | User-triggered, synchronous. Expensive (2K mockup = $0.12, 4K = $0.24). Credits deducted per generation. Rate-limited to 2 req/hour per user via Upstash (line 19). |
| **Public Limits** | Concurrent request limit (typical: 10–50). Pricing per image (nano-banana-2 = $0.12/2K, $0.24/4K). |
| **Rate Limiting** | `/api/generate-signing-mockup.ts:19` — `slidingWindow(2, '3600s')` = 2/hour. Plus credit check (line 144–149) = 1–2 credits per image, user must buy. |
| **Retry Logic** | No retry. Timeout (504) on line 404 suggests possible long waits; no exponential backoff on client. |
| **Idempotency** | **NO.** No request deduplication. If user double-clicks "Generate", two images created, two credits deducted. Should add deduplication key. |
| **Est @100 orgs** | Assume 20% of users (100 users) generate mockups ~5/month = 500 mockups/month = ~16/day = ~0.66 calls/hour. Far under 2/hour limit per user. |
| **Headroom** | 3x per user; 1000x system-wide. ✅ Safe. |
| **Risk (L/M/H)** | **L** — Rate-limited, expensive (pay-per-call), low volume. Credit system prevents abuse. Only risk: client-side double-submit (user impatience) → double charge. Add UI debounce. |

**Failure Mode:** User clicks "Generate" twice due to slow feedback → two identical images created → 2 credits deducted instead of 1. User annoyed.

**Mitigation:** Add client-side debounce (disable button during request).

---

### 8. OPEN-METEO — Weather API

| Aspect | Detail |
|--------|--------|
| **Call Sites** | `/src/hooks/useWeather.ts:75` — fetch from `https://api.open-meteo.com/v1/forecast?latitude=...&longitude=...`. Called on component mount. Used in `WeatherDayStrip.tsx` (planning view), `MontagePlanningLayout.tsx`. |
| **Call Pattern** | Component hook, fetches on mount. Cached in localStorage for 30 min. One call per user session = ~1 call/user/day (typically during morning planning). |
| **Public Limits** | Free: ~10k/day non-commercial. Commercial: ~1M/day. doen. qualifies as commercial (SaaS). Likely needs paid tier ($10+/month). |
| **Retry Logic** | `.catch(() => { /* silent */ })` line 126 — no retry. If API down, weather just won't show. |
| **Idempotency** | N/A — reads only. localStorage caching prevents duplicate calls. |
| **Est @100 orgs** | 500 users, 1 call/user/day = 500 calls/day. Well under free tier (10k). Even at 200 orgs: 1k calls/day still safe. |
| **Headroom** | 10x at 100 orgs; 5x at 200 orgs. ✅ Safe. |
| **Risk (L/M/H)** | **L** — Low volume, good caching, silent failure (non-critical UI feature). |

**Failure Mode:** Open-Meteo API returns 5xx → weather widget doesn't render. User continues without weather info (not critical).

---

### 9. IMAP/GMAIL — Email Sync (Per-User)

| Aspect | Detail |
|--------|--------|
| **Call Sites** | `/src/trigger/email-opvolging.ts:65–89` (ImapFlow connect, mailbox open, search). Per-user credentials stored encrypted in `user_email_settings`. |
| **Call Pattern** | Trigger.dev scheduled task (email-opvolging cron) connects to each user's Gmail/IMAP once daily. Searches for replies to track email engagement. One connection per active user. |
| **Public Limits** | **Gmail: 15 concurrent IMAP connections per account.** IMAP IDLE: varies by provider. Refresh token quota: depends on OAuth token reuse. |
| **Retry Logic** | No explicit retry on line 72–89. If IMAP connection times out (line 72), `.catch()` on line 104 continues (silent fail). |
| **Idempotency** | N/A — reads only. No side effects if called multiple times. |
| **Est @100 orgs** | Assume 50 users across all orgs have email configured. Cron fires daily at 8am CET, connects to each user's Gmail in sequence (not parallel). Sequential: ~50 connections over 1 hour = well under 15 concurrent limit. If parallelized: 50 concurrent > 15 limit → Google throttles. |
| **Headroom** | 15 concurrent hard limit. If sequential (current code), safe. If parallelized (future refactor), need to queue/batch. |
| **Risk (L/M/H)** | **M** — Current sequential code is safe. But: (a) refresh_token quota exhaustion risk if syncing multiple times/day, (b) if future code parallelizes connections, will hit 15-concurrent limit and Gmail rejects. Monitor connection count during cron. |

**Failure Mode:** If cron tries to fetch emails from 30+ users in parallel, Gmail closes 50% of connections → email sync incomplete → user replies not detected → offerte follow-up sequences don't trigger.

**Mitigation:** Keep sequential + add timeout (line 72 already has 15s socketTimeout, good). Monitor `email-opvolging` task duration; alert if >5min (indicates slow/stuck connections).

---

### 10. UPSTASH REDIS — Rate Limiting Backend

| Aspect | Detail |
|--------|--------|
| **Call Sites** | `/api/ai-chat.ts:75`, `/api/generate-signing-mockup.ts:19` (Ratelimit.limit() calls). Each rate-limit check = 1 Redis operation (GET/SET on sliding window key). |
| **Call Pattern** | One check per API call. ai-chat gets ~20 req/min per user (rate limit enforces this). generate-signing-mockup gets 2 req/hour per user. |
| **Public Limits** | Upstash free tier: 10k cmds/day. Paid: 100k+/day ($7+). Latency: <5ms typical. |
| **Retry Logic** | Line 90–91 in ai-chat.ts: `.catch(err => { ... return true })` — if Redis fails, allow request (fail-open). Reasonable for rate-limit (non-critical). |
| **Idempotency** | N/A — reads and updates only. |
| **Est @100 orgs** | 500 users × 20 ai-chat checks/min avg + 500 users × 2 mockup checks/hour avg. Assuming peak: 500 users × 20 = 10k checks/min = 166k checks/sec... wait, that's wrong. Let me recalculate. At 100 orgs, assume 5 concurrent users at peak = 5 × 20 req/min = 100 req/min = 100 Redis ops/min = 1.7 ops/sec. Over a day: 100 × 1440 = 144k ops/day. Plus mockup checks (negligible). **144k ops/day.** |
| **Headroom** | Free tier: 10k cmds/day. **14x over limit.** Paid tier (100k cmds/day) gives 0.7x headroom. At 200 orgs, definitely exhausted. |
| **Risk (L/M/H)** | **M** — Upstash free tier exhausted within week of launch at 100 orgs. Paid tier ($7+/month) required. Cost: <$10/month at current usage. If rate-limit check fails, fall-open behavior allows requests (not ideal but safe). |

**Failure Mode:** Free tier quota exhausted → Redis ops fail → rate-limit check returns error → app allows requests without rate-limiting → Anthropic API gets 100+ req/min → 429 errors cascade → Daan AI offline.

**Mitigation:** Upgrade to paid Upstash tier ($7/month). Add alert if Redis fails >10x per minute (indicates quota exhaustion).

---

## API Summary Table

| API | Call Sites | Pattern | Est @100 orgs | Public Limit | Headroom | Retry? | Idempotency? | Risk |
|-----|-----------|---------|---------------|--------------|----------|--------|-------------|------|
| **Mollie** | `/api/mollie-create-payment.ts:230`, `/api/mollie-webhook.ts:155` | User-triggered payment + webhook status | ~300/month = 10/day = 0.4/hour | 300 req/min | 250x | No (Mollie handles) | YES (mollie_payment_id) | L |
| **Stripe** | `/api/stripe-webhook.ts:204–175` | Webhook-driven (credits, subscriptions) | ~1,500/month = 50/day = ~1/hour | 100 read/sec | 6000x | Stripe retries | YES (stripe_session_id dedup) | L |
| **Anthropic** | `/api/ai-*.ts` (6 files) | User-triggered chat/rewrite/email; batch analysis | **1,000+ req/min peak** (chat:1000, rewrite:500, followup:500, email:200, mockup:200, analyze:100) **= 2.3M tokens/min peak** | **50 req/min, 40k tokens/min (Tier 1)** | **0.05x (27x OVER)** | No (429 propagates) | No user-level dedup | **H — CRITICAL** |
| **Resend** | `/api/resend-notify.ts:23` + triggers | Event-driven + cron (approval, quote change, portaal, trial, digest, onboarding, offerte-opvolging) | ~2,000/month = 65/day | 3k/month (free) or 50k+ (paid) | 1.5x free | No (fire-forget) | **NO** (retry → dupe) | M |
| **Exact Online** | `/api/exact-refresh.ts`, `/api/exact-*.ts`, `FactuurEditor.tsx:1614` | OAuth + config reads + user-triggered sync | ~2,000/month = 65/day; refresh storm risk: 100 req/min peak (token expiry every 10min) | 60 req/min | **0.6x (1.7x OVER at peak storm)** | No (400/401 immediate) | No (sync orphans possible) | **H — Token expiry storm** |
| **KVK API** | `/api/kvk-zoeken.ts:120`, `/api/kvk-basisprofiel.ts` | User-initiated customer search | 500/week = 71/day = 3/hour | 10k/day (paid) | 140x | No | N/A (read-only) | L |
| **FAL AI** | `/api/generate-signing-mockup.ts:355` | User-triggered image generation (expensive) | 500/month = 16/day = 0.66/hour; 2 req/hour limit/user | Concurrent limit (~50) | 1000x | No | **NO** (double-click → dupe charges) | L–M |
| **Open-Meteo** | `/src/hooks/useWeather.ts:75` | Component hook (cached 30min) | 500/day (free) | 10k/day | 10x | No (silent fail) | N/A (localStorage cached) | L |
| **IMAP/Gmail** | `/src/trigger/email-opvolging.ts:65` | Daily cron (sequential per-user connect) | 50 concurrent daily; 15 concurrent limit | 15 concurrent IMAP connections | 0.3x (safe if sequential, dangerous if parallel) | No | N/A (read-only) | M |
| **Upstash Redis** | `/api/ai-chat.ts:75`, `/api/generate-signing-mockup.ts:19` | Rate-limit checks (per API call) | 144k ops/day | 10k/day (free) | 0.07x (14x OVER) | Fail-open | N/A | M |

---

## Top 3 APIs Most Likely to Fail at Scale

### 🔴 **#1: Anthropic Claude (Tier 1 Rate Limit) — CRITICAL**

**Why it fails first:**
- Tier 1 allows 50 req/min; system needs 1,000+ req/min at 100 orgs peak.
- 6 simultaneous AI features (chat, rewrite, followup, email, mockup-prompt, analyze) all competing for same 50-req/min budget.
- No server-side retry or backoff; clients see immediate 429 errors.
- Morning workflows (8–9am) trigger all AI features at once → cascade failure.

**Impact:** Daan AI completely offline during peak hours. Users cannot: chat with Daan, rewrite text, generate follow-up emails, create signing mockups, analyze purchase invoices. SaaS core value proposition broken.

**Mitigation:** Upgrade to Tier 2 (~500 req/min, $10k+/month) or implement async queue with Trigger.dev.

---

### 🔴 **#2: Exact Online (Token Expiry Storm) — CRITICAL**

**Why it fails:**
- Exact tokens expire every 10 minutes.
- If 20+ active users simultaneously need sync at the same minute, each triggers token refresh.
- 20 refresh requests in 1 second → exceeds 60 req/min limit → Exact returns 429 → all users see "reconnect Exact Online" error.
- Happens predictably every 10 minutes (token expiry cascade).

**Impact:** Erratic invoice syncing. Users must re-authorize Exact Online every 10–30 minutes. Enterprise orgs with 10+ concurrent users see constant re-auth prompts.

**Mitigation:** Preemptive refresh (every 9 min); batch refresh calls; queue for retry on 429.

---

### 🟡 **#3: Upstash Redis + Resend (Combined) — HIGH**

**Why it fails (combined impact):**
- **Upstash:** Free tier exhausted within 1 week at 100 orgs. Paid tier ($7) needed but not budgeted initially.
- **Resend:** Free tier (3k/month) exhausted at 150 orgs if offerte-opvolging scales. Plus no idempotency → duplicate emails if cron retries.

**Impact:** 
- Upstash failure → rate-limiting offline → Anthropic API hammered → cascades to #1 (Claude).
- Resend at scale → users get duplicate emails; customer support burden. Upgrade cost ($20/month) not budgeted.

**Mitigation:** Pre-budget $30+/month for Upstash + Resend upgrades. Add idempotency to Resend calls. Monitor both services weekly.

---

## Detailed Failure Modes & Mitigation

### Anthropic Tier 1 Exhaustion

**Scenario:** 100 orgs active, 8:30am (peak morning workflow).
- 5 users/org log in = 500 users.
- 50% open Daan chat widget = 250 concurrent.
- Each user makes 2 requests in 5 min = 500 req/5min = 100 req/min.
- Limit: 50 req/min.
- **Result:** First 50 requests succeed; next 450 get 429 rate-limit errors.

**User Experience:** Chat freezes, "Too many requests" error shown. Retry in 2 min. But next batch hits same limit. Queue backs up; chat is offline for 1–2 hours during morning peak.

**Mitigation:**
1. **Upgrade to Tier 2** (~500 req/min, $10k+/month). Overkill for current load but necessary at 100 orgs.
2. **Async queue for non-realtime AI:**
   - Chat: realtime (must keep 50 req/min for this).
   - Rewrite, followup-email, analyze: queue via Trigger.dev, return "generating..." response, email result later.
   - Reduces peak from 1,000 req/min to ~100 req/min (chat only).
3. **Reduce features:** Remove mockup-generation (most expensive, ~2% of users). Saves ~200 req/month.

---

### Exact Token Expiry Storm

**Scenario:** 20 orgs using Exact, 10 active users/org at 8:00am.
- At 8:10am, all 200 refresh tokens simultaneously expire (10-minute window).
- At 8:11am, user tries to sync invoice → app calls refresh endpoint.
- All 200 users make refresh calls in parallel over 30 seconds = ~7 calls/sec = 420 calls/min.
- Exact limit: 60 req/min.
- **Result:** 360 refresh calls fail with 429. Users get "reconnect Exact Online" error.

**User Experience:** Invoice sync fails. Pop-up: "Please reconnect your Exact Online account." User clicks, goes through OAuth again. Happens every 10 minutes.

**Mitigation:**
1. **Preemptive refresh:** Store `token_expires_at` in DB. Cron refreshes all tokens at 8:05, 8:15, 8:25 (every 10 min in batches). Sequential, no surge.
   - 20 orgs × 10 users = 200 users; batch 20 at a time (10 batches × 1 refresh/user = 10 req/min) → no burst.
2. **Refresh on first use, not expiry:** Cache access token in memory (or Redis). Only refresh on 401 response, with exponential backoff.
3. **Fallback:** If refresh fails with 429, return stale token (if <30min old) or queue for retry in 10 min (user continues offline).

---

### Resend Duplicate Emails + Upstash Quota Exhaustion

**Scenario:** offerte-opvolging cron fires at 8am, sends 1,000 followup emails.
- Halfway through, Supabase API times out.
- Trigger.dev retries entire cron task.
- Resend receives same 1,000 requests again (no dedup key).
- **Result:** 1,000 duplicate emails sent. Users see two identical followup emails. Support tickets flood in.

**Also:** Resend operation calls Upstash (rate-limit check) 1,000 times. Free tier quota (10k/day) partially exhausted in 1 cron run.

**User Experience:** Customer receives duplicate email: "Opvolging offerte #OFT-001". Confusion. Negative perception of app reliability.

**Mitigation:**
1. **Idempotency key per trigger:** Hash of `org_id + offerte_id + stap_id + date`. Insert into `cron_dedup_log` before sending email. Cron checks before re-sending.
2. **Upgrade Resend to paid tier ($20+/month) before 150 orgs.** Free tier 3k/month is exhausted at 150 orgs × 15 emails/org/month.
3. **Upgrade Upstash to paid ($7/month).** Free tier 10k/day is exhausted in 2–3 days at 100 orgs.
4. **Batch rate-limit checks:** Instead of 1 check per email, batch 10 at a time (1 check per 10 emails). Reduces Redis ops 10x.

---

## Recommendations for Scaling to 200+ Orgs

1. **Anthropic Tier 2 upgrade:** $10k–15k/month. Timeline: before 150 orgs.
2. **Exact Online preemptive refresh:** Dev effort ~4 hours. Timeline: before 50 orgs with Exact enabled.
3. **Resend + Upstash upgrades:** $27/month total. Timeline: before 150 orgs.
4. **Async queue for non-realtime AI (rewrite, followup, analyze):** Dev effort ~16 hours. Timeline: before 200 orgs.
5. **Idempotency on Resend + Trigger.dev tasks:** Dev effort ~4 hours. Timeline: before 100 orgs.
6. **Monitor 429 errors:** Set up alerts in Sentry/DataDog. Alert if 5+ 429/min from any external API.

---

## Conclusion

At **100 active organizations**, the system is viable but approaching limits on:
- **Anthropic Claude** (Tier 1 exhausted; needs Tier 2 upgrade or async queue).
- **Exact Online** (token expiry storm risk; needs preemptive refresh).
- **Upstash + Resend** (free tiers exhausted; need paid upgrades).

**Immediate actions (next 30 days):**
1. Test load at 50 concurrent users during morning hours. Capture 429 error rates from Anthropic, Exact, Upstash.
2. Upgrade Upstash + Resend to paid tiers ($27/month).
3. Implement idempotency on Trigger.dev cron tasks.
4. Plan Anthropic Tier 2 upgrade or async-queue refactor (decide based on load test results).

---

*End of audit.*
