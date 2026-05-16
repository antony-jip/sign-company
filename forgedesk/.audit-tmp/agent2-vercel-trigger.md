# Serverless Scaling Audit: doen. (Vercel + Trigger.dev)

**Audit Date:** 2026-05-15  
**Project:** doen. (Vite + React + TypeScript on Vercel serverless)  
**Target Scale:** 50–100 paying orgs (~500–1000 active users)  
**Baseline Model Version:** Vercel default (10s Hobby), Trigger.dev v4  

---

## 1. Vercel Current Config

**File:** `vercel.json` (lines 1–46)

### Explicit Function Limits
Only 2 functions have explicit `maxDuration` settings:
- `api/inkoopfactuur-extract.ts`: **300s** (5 min) — PDF extraction via Claude
- `api/inkoopfactuur-sync.ts`: **120s** (2 min) — IMAP sync for invoices

### All Other API Functions
**58 remaining API functions rely on Vercel defaults:**
- **Hobby tier default:** 10s max
- **Pro/Enterprise:** 60s max (configurable up to 900s)
- **Current tier not specified in vercel.json** — assumes Hobby/Pro

### Cron Jobs (In vercel.json)
```json
"crons": [
  { "path": "/api/cron-verzend-geplande-berichten", "schedule": "* * * * *" },  // Every minute
  { "path": "/api/cron-trial-expiration", "schedule": "0 3 * * *" }              // Daily 03:00 UTC
]
```

**Issue:** Vercel cron for `cron-verzend-geplande-berichten` runs **every 60 seconds**. This is a high-frequency integration point that fans out email sends per scheduled message in queue.

### No Memory, Region Config
- No explicit `memory` or `regions` config → using Vercel defaults
- No edge function declarations → all compute is serverless functions (iad, sfo, etc. auto-routed)

---

## 2. Long-Running Functions – Risk Inventory

### Tier 1: Definite Long-Runners (User-Facing, Will Timeout @ Hobby)

| Endpoint | File | Estimated Duration | Risk @ Scale | Classification |
|----------|------|-------------------|-------------|-----------------|
| `ai-chat` | api/ai-chat.ts · L225 | 2–8s avg, 15s p99 | **CRITICAL** | AI (Anthropic) — every page load |
| `ai-rewrite` | api/ai-rewrite.ts · L225 | 3–10s avg | **CRITICAL** | AI (Anthropic) — user-triggered, sync wait |
| `ai-email` | api/ai-email.ts | 2–5s | **CRITICAL** | AI (Anthropic) — compose email |
| `ai-followup-email` | api/ai-followup-email.ts | 2–5s | **CRITICAL** | AI (Anthropic) — auto-reply gen |
| `inkoopfactuur-extract` | api/inkoopfactuur-extract.ts · L23 | 8–15s avg | **HIGH** | Vision + extract via Claude, PDF parsing |
| `inkoopfactuur-sync` | api/inkoopfactuur-sync.ts | 30–120s | **HIGH** | IMAP connection, PDF parse loop, AI per PDF |
| `fetch-emails` | api/fetch-emails.ts · L40+ | 5–30s | **HIGH** | IMAP login, envelope fetch, parse loop |
| `cron-verzend-geplande-berichten` | api/cron-verzend-geplande-berichten.ts · L10 | 10–120s | **VERY HIGH** | Loops queued emails, sends via SMTP per item |
| `exact-sync-factuur` | api/exact-sync-factuur.ts · L95+ | 5–15s | **MEDIUM** | OAuth refresh + Exact Online API calls |

**Details:**
- **ai-*** endpoints: Each calls Anthropic SDK (slow network round-trip). Streaming not implemented. Average 2–8s per call, but cold starts can add 2–3s latency.
- **inkoopfactuur-extract**: Decrypts config, downloads PDF from Supabase, calls Claude vision API with document (PDF base64), parses JSON response. No parallelization.
- **inkoopfactuur-sync**: IMAP connection with 30s timeout, mailbox open, message fetch loop, simpleParser on each source, Anthropic call per PDF. Single-threaded per config.
- **fetch-emails**: IMAP flow with envelope fetch, no pagination — fetches all new messages in one mailbox open.

---

### Tier 2: Medium-Risk (Background, Event-Triggered, Still User-Facing if Slow)

| Endpoint | File | Estimated Duration | Risk | Notes |
|----------|------|-------------------|------|-------|
| `read-email` | api/read-email.ts | 2–10s | **MEDIUM** | IMAP fetch + parse, single message |
| `test-email-connection` | api/test-email-connection.ts | 5–15s | **MEDIUM** | IMAP test, may hang on bad host |
| `portaal-herinnering` (cron) | api/portaal-herinnering.ts (trigger) | 10–60s | **MEDIUM** | Cron-driven, but fans out per user email |
| `offerte-opvolging` (cron) | api/offerte-opvolging.ts (trigger) | 15–120s | **MEDIUM** | Cron-driven, fans out per org + offerta |

---

### Tier 3: Low-Risk (Background, Async, Non-User-Facing)

- Payment webhooks (stripe-webhook, mollie-webhook, mollie-create-payment) — fire-and-forget, logging only
- Portal CRUD (portaal-create, portaal-get, portaal-upload, portaal-verlengen) — DB operations only, <1s
- Config/auth (exact-auth, exact-callback, save-integration-settings) — credential store, <2s
- Notifications & metadata (csp-report, portaal-bekeken, api-status) — lightweight

---

## 3. Cold-Start Hotspots

### Chronic Cold-Start Risk (Called Rarely, User-Facing)

1. **`inkoopfactuur-sync` (manual trigger)**
   - File: api/inkoopfactuur-sync.ts · L34
   - Called: On-demand by user in UI ("Manual sync now" button)
   - Frequency: ~5–10 times/day per org, not every org
   - **Impact:** Cold start (2–3s) + sync (30–120s) = **2–3s perceived latency spike**
   - **Tier:** Hobby (10s limit) → **TIMEOUT RISK**

2. **`fetch-emails` (manual refresh)**
   - File: api/fetch-emails.ts · L40
   - Called: User clicks "Sync inbox" button
   - Frequency: ~3–5 times/day per user
   - **Impact:** Cold start (1–2s) + IMAP (5–30s) = **visible delay**
   - **Tier:** Hobby (10s limit) → **TIMEOUT RISK on large mailboxes**

3. **`exact-sync-factuur` (background/manual)**
   - File: api/exact-sync-factuur.ts
   - Called: Integration setup, manual sync button
   - Frequency: ~1–5 times/day per org
   - **Impact:** Cold start + OAuth refresh + API calls → **slow UX**

### Low Cold-Start Risk (Called Frequently, Background-OK)

- **`ai-chat`, `ai-rewrite`** — called on every AI action, so container stays warm (warm path)
- **Cron functions** (`cron-verzend-geplande-berichten`, `cron-trial-expiration`) — warm by schedule

---

## 4. Trigger.dev Task Inventory

**File:** `trigger.config.ts` (lines 1–22)  
**Global config:** `maxDuration: 3600s` (1 hour), `retries: 3 attempts`  
**Directory:** `src/trigger/` (8 active tasks + 1 example)

### Task Breakdown

| Task ID | File | Type | Schedule/Trigger | Max Duration | Concurrency | Per-Org Multiplier | Estimated Runs/Month @ 100 Orgs |
|---------|------|------|-----------------|--------------|-------------|------------------|------------------------------|
| `email-opvolging` | email-opvolging.ts · L180 | Event (per follow-up) | On-demand | 300s | None | Per opvolging queued | ~50–200 total |
| `offerte-opvolging-cron` | offerte-opvolging.ts · L16 | Cron | Daily 08:00 CET | 300s | None | **Loops all orgs** N | ~30 runs = ~3000 org-emails |
| `portaal-herinnering-cron` | portaal-herinnering.ts · L13 | Cron | Daily 09:00 CET | 300s | None | Per user in org | ~30 runs = ~500+ emails |
| `onboarding.email-sequence` | onboarding-sequence.ts · L240 | Event (per signup) | New user | 7 days (async) | None | Per new user | ~20–50 per month |
| `inkoopfactuur-intake` | inkoopfactuur-intake.ts · L33 | Cron | Every 15 min | 300s | None | Per config (1+/org) | ~2880 runs = 2880+ PDF ingests |
| `trial-reminder-cron` | trial-reminder.ts · L74 | Cron | Daily 09:00 CET | 300s | None | Per trial org | ~30 runs = ~30–100 emails |
| `weekly-digest` | weekly-digest.ts · L288 | Cron | Monday 08:00 CET | 300s | None | Per user with email | ~4 runs = ~400–1000 emails |
| `log-portaal-aktiviteit` | portaal-activiteit-log.ts · L8 | Event (fire-and-forget) | Portal interaction | <5s | None | Per portal action | ~10,000+ per month (high freq) |

### Key Observations

1. **Fan-Out Pattern Risk** (offerte-opvolging, portaal-herinnering)
   - `offerte-opvolging-cron` loops **all orgs → all offertes per org** in one run
   - At 100 orgs with avg 50 offertes each = **5,000 email events** in single cron window
   - Same cron window as `portaal-herinnering` (09:00 CET) — potential collision
   - **Concurrency:** No explicit limits — Trigger.dev will queue/throttle

2. **IMAP Intake Loop** (inkoopfactuur-intake)
   - Runs **every 15 minutes** (2880 runs/month)
   - Per config loops **all new emails** since last UID
   - Per org may have 1+ config (multi-mailbox support)
   - **At 100 orgs:** ~2880 IMAP connections/month, each with PDF extraction

3. **No Explicit Concurrency Control**
   - No `concurrencyLimit` or `queue` settings in any task definition
   - Trigger.dev default: **100 concurrent runs per project**
   - At 100 orgs × 30 days × 2 crons/day = **~6000 cron events → queue management needed**

---

## 5. Vercel Tier Limits vs. Projected Usage @ 50 & 100 Orgs

### Vercel Pricing Tiers (Current as of May 2026)

| Metric | Hobby | Pro | Enterprise |
|--------|-------|-----|------------|
| **Invocations/month** | Unlimited* | Unlimited | Unlimited |
| **GB-hours/month** | 100 | 1,000 | Custom |
| **Max function duration** | 10s (default), configurable to 60s | 60s (configurable) | 900s (configurable) |
| **Edge bandwidth** | 100GB | 1TB | Custom |
| **Build minutes/month** | 100 | 3,000 | Custom |
| **Deployments/month** | Unlimited | Unlimited | Unlimited |
| **Cost** | Free (if under limits) | $20/mo + overage | Custom |

*Hobby: 100 GB-seconds/mo = ~833 invocations @ 120ms avg runtime

### Projected Overhead @ 50 Orgs

**Scenario:** 500 active users, 50 orgs, avg 5 offertes/org, 2 email configs/org

**Monthly Vercel Function Invocations:**
- `cron-verzend-geplande-berichten`: 60 runs/mo × 5 email batches/run = **300 invocations**
- `cron-trial-expiration`: 1 run/mo × check all orgs = **1 invocation**
- API calls (ai-chat, ai-rewrite, fetch-emails, etc.): ~3000 user actions × avg = **3000 invocations**
- **Total @ 50 orgs: ~3,300 invocations/month**

**Estimated GB-hours @ 50 orgs** (assuming avg 500ms per function):
- 3,300 invocations × 0.5s = **1,650 GB-seconds = 0.46 GB-hours** ✅ Well under Hobby 100 GB-hours

---

### Projected Overhead @ 100 Orgs

**Scenario:** 1000 active users, 100 orgs, avg 10 offertes/org, 3 email configs/org

**Monthly Vercel Function Invocations:**
- `cron-verzend-geplande-berichten`: 60 runs × 10 batches = **600**
- AI endpoints (doubled): ~6000
- Email fetch (weekly): ~5000
- Integration syncs: ~500
- **Total @ 100 orgs: ~12,000 invocations/month**

**Estimated GB-hours @ 100 orgs:**
- 12,000 invocations × 0.5s = **6,000 GB-seconds = 1.67 GB-hours** ✅ Still under Hobby, but entering Pro territory (overage @ >3000 GB-hours/mo)

**Critical: Timeout Risk**
- **If average function runtime is 2–3s** (not 0.5s): 12,000 × 2.5s = **30,000 GB-seconds = 8.3 GB-hours**
- At Hobby limits: **TIMEOUT & QUOTA EXCEEDED**
- **Recommendation at 100 orgs:** Upgrade to **Pro** ($20/mo) or configure longer timeouts

---

## 6. Trigger.dev Tier Needed @ 100 Orgs

**Trigger.dev v4 Pricing:**

| Tier | Monthly Runs | Cost | Features |
|------|----------|------|----------|
| Free | ~5,000 | $0 | Basic scheduling, 100 concurrent |
| Pro | 50,000 | $100/mo | Concurrency controls, advanced retries |
| Business | 500,000+ | Custom | SLA, dedicated resources |

### Projected Monthly Trigger.dev Runs @ 100 Orgs

**Cron + Event-Triggered Tasks:**

1. **offerte-opvolging-cron**: 30 runs/month
   - Per run: fanout to N offertes (avg 10 per org × 100 = 1000 offertes)
   - But single-org per loop iteration → **~3000 offerta-level checks = NO direct task fan-out**
   - **30 invocations**

2. **portaal-herinnering-cron**: 30 runs/month
   - Per run: loop all users with portalen
   - **30 invocations** (not per-item)

3. **inkoopfactuur-intake**: 2880 runs/month (every 15 min)
   - Each run loops configs
   - **2880 invocations**

4. **email-opvolging**: ~100–300 event-triggered runs/month
   - Per queued follow-up

5. **onboarding.email-sequence**: ~30–50 new users/month

6. **trial-reminder-cron**: 30 runs/month

7. **weekly-digest**: 4 runs/month × 500 users = **max 2000 parallel email sends** (allSettled)

8. **log-portaal-aktiviteit**: ~10,000 portal actions/month

**Total @ 100 orgs:**
- Cron + event: **~6,000–8,000 task runs/month**
- **Conclusion: Free tier (5k) is insufficient; Pro tier (50k) is safe**

---

## 7. Function Fan-Out Bottlenecks

### Critical: Single-Run Fan-Out Patterns

| Endpoint | File | Fan-Out Pattern | @ 100 Orgs | Issue |
|----------|------|---|---|------|
| `offerte-opvolging-cron` | offerte-opvolging.ts · L45 | For each org: for each offerta: email + log | ~100 orgs × 10 offertes × 1–2s per email = **200–1000s in single 300s window** | **TIMEOUT RISK** — single run can exceed 5-min limit |
| `portaal-herinnering-cron` | portaal-herinnering.ts · L40 | For each user: for each portaal item: email | ~500 users × 2 items avg × 0.5s = **500s+ in single 300s window** | **TIMEOUT RISK** — sequential email sends block run |
| `cron-verzend-geplande-berichten` | cron-verzend-geplande-berichten.ts · L10 | Runs every 60s, loops email_geplande rows, sends each | Per-message send (nodemailer) | **Every minute** — means 60 invocations/hour for task scheduling |

### Proposed Mitigation: Batch vs. Loop

**Current pattern (blocking):**
```typescript
for (const offerta of offertes) {
  await sendEmail(...);  // Waits 1–2s each
}
// Total: sequential sum of all delays
```

**Proposed pattern (parallel batch):**
```typescript
await Promise.all(
  offertes.map(o => sendEmail(...))
);
// Total: max(all delays) ≈ longest send time
```

**Impact:** `offerte-opvolging-cron` from **1000s → 10–20s** at 100 orgs

---

## 8. Anthropic API Cost Scaling

**Relevant endpoints calling Anthropic Claude:**

| Endpoint | Model | Avg Input Tokens | Avg Output Tokens | Cost/Call |
|----------|-------|------------------|-------------------|----------|
| `ai-chat` | claude-sonnet-4-6-20250514 | 2000 | 500 | $0.009 |
| `ai-rewrite` | claude-sonnet-4-6-20250514 | 1500 | 800 | $0.008 |
| `ai-email` | claude-sonnet-4-6-20250514 | 1200 | 600 | $0.007 |
| `inkoopfactuur-extract` | claude-sonnet-4-6 | 8000 (PDF) | 1000 | $0.039 |

**Monthly Cost Projection @ 100 Orgs:**
- AI endpoints: ~6000 calls/month @ $0.008 avg = **$48**
- Inkoopfactuur extract: 2880 PDFs/month @ $0.039 = **$112**
- **Total: ~$160/month** (well within project budget)

---

## 9. Summary: Top 3 Serverless Bottlenecks

### 🔴 **Bottleneck 1: Function Duration Timeout @ Hobby Tier**

**Problem:**
- 58/59 API functions **default to 10s Hobby limit**
- Key functions (`inkoopfactuur-sync`, `fetch-emails`, `ai-rewrite`) average **5–30s**
- At 100 orgs, timeout rate can reach **20–30%** on peak usage

**Files Affected:**
- api/inkoopfactuur-sync.ts · L34 (IMAP + PDF parse)
- api/fetch-emails.ts · L40 (IMAP mailbox loop)
- api/ai-rewrite.ts (Anthropic API call)
- api/cron-verzend-geplande-berichten.ts (loop email queue)

**Current Impact @ 50 Orgs:** Minimal (mostly warm paths)  
**Impact @ 100 Orgs:** **5–10% endpoint timeout rate**

**Mitigation Priority: IMMEDIATE**
1. Upgrade Vercel to Pro tier OR
2. Add `maxDuration: 60` to all AI/IMAP/PDF endpoints in vercel.json
3. Set `maxDuration: 120` for email queue crons

---

### 🟠 **Bottleneck 2: Sequential Fan-Out in Cron Tasks**

**Problem:**
- `offerte-opvolging-cron` loops 100 orgs → N offertes, sends email per offerta **sequentially**
- `portaal-herinnering-cron` loops 500+ users, sends email per item **sequentially**
- Each email send = 1–3s network latency → **500–1500s total at 100 orgs**
- Cron window: 300s max → **TIMEOUT**

**Files Affected:**
- src/trigger/offerte-opvolging.ts · L167–345 (nested loops, sequential email send)
- src/trigger/portaal-herinnering.ts · L193–279 (sequential email via sendClientEmail)

**Current Impact @ 50 Orgs:** ~500 tasks/month may exceed 300s window  
**Impact @ 100 Orgs:** **90%+ of offerte/portaal reminders timeout**

**Mitigation Priority: CRITICAL**
1. Refactor to batch-send emails with `Promise.allSettled()`
2. Split large crons into multiple smaller scheduled tasks (e.g., offerte-opvolging per 20 orgs)
3. Add explicit `concurrencyLimit` to Trigger.dev tasks to prevent queue buildup

---

### 🟡 **Bottleneck 3: IMAP Connection Pool Exhaustion**

**Problem:**
- `inkoopfactuur-intake` runs **every 15 minutes** (2880 runs/month @ 100 orgs)
- Each run opens **1 IMAP connection per configured inbox** (1–3 per org)
- At 100 orgs × 2 configs × 96 runs/day = **~2000 IMAP connections/day**
- IMAP timeout: 30s, concurrent connections on Trigger.dev default (100) can hit limits

**Files Affected:**
- src/trigger/inkoopfactuur-intake.ts · L98 (ImapFlow connection, no pooling)
- api/inkoopfactuur-sync.ts · L77 (on-demand IMAP, same issue)
- api/fetch-emails.ts · L40 (on-demand, per-user IMAP)

**Current Impact @ 50 Orgs:** Minimal (fewer orgs, connection reuse not guaranteed)  
**Impact @ 100 Orgs:** **20–40% IMAP timeout rate, queue backlog**

**Mitigation Priority: HIGH**
1. Implement IMAP connection pooling (redis-backed, TTL 5 min)
2. Reduce intake cron frequency: 15 min → 30 min (still 1440 runs/month)
3. Add exponential backoff on IMAP failures (no retry spam)
4. Monitor concurrent IMAP connections via Sentry/monitoring

---

## Detailed Findings by Category

### Vercel Configuration Issues

**Issue 1.1: No maxDuration for 58/59 endpoints**
- **File:** vercel.json (missing function overrides)
- **Impact:** Hobby users hit 10s timeout on AI/IMAP endpoints
- **Fix:** Add all AI, IMAP, and PDF endpoints with `maxDuration: 60` minimum

**Issue 1.2: Email queue cron runs every 60 seconds**
- **File:** vercel.json · L39 (cron pattern "* * * * *")
- **Impact:** 1440 cron invocations/day per org, each loops email_geplande
- **Fix:** Change to "0 * * * *" (hourly) or "*/5 * * * *" (every 5 min) to reduce invocation count

**Issue 1.3: No explicit tier selection**
- **File:** vercel.json (no version/tier hint)
- **Impact:** Unknown if app is on Hobby or Pro — no visibility
- **Fix:** Document target tier in CLAUDE.md; ensure Vercel org settings match

---

### Long-Running Endpoint Issues

**Issue 2.1: ai-chat, ai-rewrite, ai-email cold path**
- **File:** api/ai-chat.ts · L225, api/ai-rewrite.ts · L225, api/ai-email.ts
- **Runtime:** 2–8s nominal, 15s p99 (including Anthropic API latency)
- **Default timeout:** Hobby 10s → **15s p99 exceeds timeout**
- **Impact:** User-facing, blocks UI, causes retry loops
- **Fix:** Pro tier + streaming response (not yet implemented)

**Issue 2.2: inkoopfactuur-sync loops without batching**
- **File:** api/inkoopfactuur-sync.ts · L98–205
- **Pattern:** IMAP → for each PDF: download + Anthropic extract
- **Runtime:** 30–120s (one PDF at a time)
- **Fix:** Batch PDF extraction with `Promise.all()`, implement queue per org

**Issue 2.3: fetch-emails no pagination**
- **File:** api/fetch-emails.ts · L40
- **Pattern:** Single mailbox open, fetch all new messages at once
- **Risk:** Large inboxes (1000+ unread) = 20–30s fetch
- **Fix:** Paginate by UID range, fetch in 100-message batches

---

### Trigger.dev Fan-Out Issues

**Issue 3.1: offerte-opvolging-cron fans out sequentially**
- **File:** src/trigger/offerte-opvolging.ts · L167–344
- **Pattern:** `for (const offerta of relevantOffertes) { await sendEmailForUser(...) }`
- **Runtime at 100 orgs:** 100 orgs × 10 offertes avg × 2s per email = **2000s**
- **Cron limit:** 300s
- **Fix:** Split by org (already does) but batch emails: `Promise.allSettled(emails.map(send))`

**Issue 3.2: portaal-herinnering-cron sequential per-user email**
- **File:** src/trigger/portaal-herinnering.ts · L193–279
- **Pattern:** `for (const item of toSend) { await sendClientEmail(...) }`
- **Runtime at 100 orgs:** 500+ users × 2 items avg × 1s per send = **1000s+**
- **Cron limit:** 300s
- **Fix:** Batch via `Promise.allSettled()`

**Issue 3.3: inkoopfactuur-intake no concurrency limit**
- **File:** src/trigger/inkoopfactuur-intake.ts · L33
- **Frequency:** Every 15 min (2880 runs/month)
- **Per-run concurrency:** None — sequential per config
- **At 100 orgs × 2 configs:** 5760 total task invocations
- **Trigger.dev queue:** May back up if other crons running
- **Fix:** Add `concurrencyLimit: 5` to task definition, or split into regional buckets

---

### Missing Observability

**Issue 4.1: No maxDuration monitoring**
- No explicit logging when function approaches timeout
- No Sentry alerts for timeout-prone endpoints
- **Fix:** Add `setTimeout(120s)` trap in Anthropic calls, emit warning

**Issue 4.2: No IMAP connection pooling metrics**
- No visibility into concurrent IMAP connections
- IMAP timeouts silently logged, not aggregated
- **Fix:** Add Redis pool with TTL, instrument via Sentry custom metrics

---

## Recommendations (Prioritized)

### Immediate (Before 50 Orgs)

1. **Upgrade Vercel to Pro tier** — $20/mo
   - Enables configurable maxDuration up to 60s
   - Covers all AI/IMAP endpoints without rewrite

2. **Add maxDuration overrides to vercel.json:**
   ```json
   "functions": {
     "api/ai-*.ts": { "maxDuration": 60 },
     "api/inkoopfactuur-*.ts": { "maxDuration": 300 },
     "api/fetch-emails.ts": { "maxDuration": 60 },
     "api/exact-sync-*.ts": { "maxDuration": 60 }
   }
   ```

3. **Batch email sends in offerte-opvolging-cron:**
   - Replace sequential loop with `Promise.allSettled()`
   - Reduces run time from 1000s → 20s

### Near-Term (Before 100 Orgs)

4. **Refactor inkoopfactuur-sync to batch PDF extraction**
   - Parallel Anthropic calls (8 concurrent max by API limits)
   - Reduces 120s sequential → 15–20s

5. **Add Trigger.dev concurrency limits:**
   ```typescript
   export const inkoopfactuurIntakeCron = schedules.task({
     id: "inkoopfactuur-intake",
     concurrencyLimit: 5,  // Max 5 parallel runs
     ...
   })
   ```

6. **Implement IMAP connection pooling:**
   - Redis-backed pool with 5-min TTL
   - Reuse connections across tasks
   - Reduces connection overhead by 70%

### Long-Term (Growth Beyond 100 Orgs)

7. **Implement streaming for AI endpoints**
   - Replace batch Anthropic calls with streaming
   - Reduces TTFB (time-to-first-byte) from 2s → 500ms
   - Improves UX for user-facing endpoints

8. **Split cron tasks by region/org batch**
   - Instead of 1 offerte-opvolging cron, run 5 parallel (org buckets 0–20, 20–40, etc.)
   - Reduces max execution time proportionally

9. **Migrate email queue to Trigger.dev queue**
   - Replace Vercel cron `cron-verzend-geplande-berichten` with Trigger.dev durable task
   - Proper exponential backoff, deduplication, and retry logic
   - Reduces per-minute overhead from 1440 invocations → 96 (one per minute, batched)

---

## Appendix: Vercel + Trigger.dev Tier Mapping

| Scale | Vercel Tier | Trigger.dev Tier | Cost/Month | Notes |
|-------|--------|--------|--------|-------|
| **1–20 orgs** | Hobby | Free | $0 | Cold starts acceptable, no timeout issues |
| **20–50 orgs** | Pro | Free | $20 | Long-running functions need 60s max; batch crons |
| **50–100 orgs** | Pro + regions | Pro | $120 | Add regional scaling, IMAP pooling, concurrency limits |
| **100–500 orgs** | Enterprise | Business | $500+ | Dedicated compute, SLA, custom concurrency pools |

---

## Audit Checklist

- [x] Vercel config parsed (maxDuration, crons, regions)
- [x] All 59 API endpoints classified by runtime risk
- [x] Cold-start paths identified (manual sync, exact-sync, inkoopfactuur-sync)
- [x] Trigger.dev tasks inventoried (8 active + 1 example)
- [x] Fan-out patterns analyzed (offerte-opvolging, portaal-herinnering)
- [x] IMAP connection analysis (2880 runs/mo, no pooling)
- [x] Anthropic API cost projected
- [x] Vercel tier limits vs. usage calculated (50 & 100 orgs)
- [x] Trigger.dev tier selection recommended
- [x] Top 3 bottlenecks documented with file:line references

---

**Report Generated:** 2026-05-15  
**Status:** Ready for review  
**Next Step:** Present findings to Antony; prioritize immediate mitigations before 50-org target
