# doen. Observability & Cost Projection Audit

**Audit Date:** 2026-05-15  
**Target Scale:** 100 paying orgs @ €79/mo flat  
**Target Revenue:** €7,900/mo  
**Baseline:** Max 10 users per org

---

## 1. Sentry Configuration — Coverage & Gaps

**Status:** ✅ Installed, ✅ Configured with PII scrubbing  
**Files:** `src/main.tsx:8-49`, `api/invite-team-member.ts:6-30`, `api/mollie-webhook.ts:6-30`

### Initialization Config

**Frontend (main.tsx):**
```typescript
Sentry.init({
  dsn: SENTRY_DSN,
  environment: import.meta.env.MODE,
  tracesSampleRate: 0.1,        // ← Only 10% of transactions sampled
  replaysSessionSampleRate: 0,   // ← Replays DISABLED
  replaysOnErrorSampleRate: 0,   // ← Error replays DISABLED
  sendDefaultPii: false,
  beforeSend(event) {
    // Scrubs: authorization, cookie, password, tokens, emails
  }
})
```

**Backend (API routes):**
- Same 10% sample rate across all edge functions
- Sensitive scrubbing applied to request data, headers, user.email, user.ip_address

### Noise Reduction

**✅ Good:** Filters applied for:
- ResizeObserver loop errors (suppressed at browser level)
- "Failed to fetch" + "NetworkError" + "AbortError" (unhandled rejection listener)
- PII redacted (passwords, tokens, emails)
- Authorization headers filtered

**⚠️ Issue:** ResizeObserver suppression only happens if message contains exact substring.  
**⚠️ Issue:** No error grouping rules visible — likely Sentry dashboard-side, but code doesn't set custom `fingerprint`.

### Gaps

| Gap | Impact | Severity |
|-----|--------|----------|
| **No beforeSend for rate-limit errors** | 429 responses will flood Sentry; AI rate-limits not deduplicated | **MEDIUM** |
| **No error fingerprinting** | Duplicate errors grouped by Sentry's default rules; may miss patterns | **MEDIUM** |
| **10% trace sample rate** | At 100 orgs with 1000 users, 90% of transactions invisible | **HIGH** — hard to debug rare issues |
| **Replays disabled** | No session replay on errors; debugging complex bugs harder | **MEDIUM** |
| **No custom context** | Not attaching `organisatie_id` or `user_id` to events | **MEDIUM** — can't filter by org |
| **No breadcrumbs for AI calls** | When Claude API times out, no trace of which endpoint triggered it | **LOW** |

---

## 2. PostHog Events — What's Tracked & What's Missing

**Status:** ❌ **NOT INSTALLED**

**Finding:** No `posthog` or `@posthog` imports found in codebase.

### What This Means

- **Zero product analytics** — no visibility into:
  - Feature adoption rates
  - User journey funnels (onboarding → first quote → payment)
  - Churn signals (inactive days)
  - Feature usage per tier
  - Performance metrics (time-to-quote, time-to-invoice)

### Critical Gaps

| Event | Purpose | Current Status | Business Impact |
|-------|---------|---|---|
| **Onboarding funnel** | Track drop-off at each step (signup → profile → first org) | Not tracked | Can't measure CAC efficiency |
| **Feature adoption** | How many orgs use AI rewrite, portals, integrations | Not tracked | Can't identify upsell opportunities |
| **Churn signals** | Days since last login, quotes created, invoices sent | Not tracked | Can't build retention campaigns |
| **Payment flow** | Stripe/Mollie checkout start → completion → payment received | Not tracked | Can't debug payment failures |
| **Integration tests** | Which integrations are used most (KVK, Exact, IMAP) | Not tracked | Can't prioritize API maintenance |
| **Error funnel** | Page → error → retry → success/abandon | Not tracked | Can't measure reliability |
| **API latency** | Time to ai-chat, ai-rewrite per request | Not tracked | Can't optimize slow paths |

### Missing Instrumentation

No client-side event capture code in:
- `src/components/onboarding/*` — no signup funnel tracking
- `src/components/financial/*` — no payment flow tracking
- `src/services/forgieChatService.ts` — no AI feature usage tracking
- `src/services/aiRewriteService.ts` — no usage metrics

---

## 3. Web Vitals / RUM Status

**Status:** ❌ **NOT COLLECTED**

**Finding:** No `web-vitals`, `getCLS`, `getLCP`, `getCLSLet`, or similar RUM library.

### What This Means

- **Zero real-user monitoring** — no visibility into:
  - Core Web Vitals (LCP, FID, CLS)
  - First Contentful Paint (FCP)
  - Time to Interactive (TTI)
  - User perception of slowness

### Critical for SaaS @ €79/mo

At €79/mo flat pricing, **performance = customer satisfaction**. Slow app = higher churn.

**Example:** If LCP > 3s for 20% of users and you don't measure it, you'll only hear about churn in cancellations.

### Current Observability Blind Spot

- Vercel provides FCP/LCP data via Web Analytics (Dashboard only)
- But **no automated alerts** if LCP degrades
- **No per-page breakdown** of slow endpoints

---

## 4. Database Slow-Query Monitoring

**Status:** ⚠️ **Partial — Supabase Dashboard Only**

**Finding:** No slow-query logging configured in code.

### Supabase Free vs. Pro vs. Team

| Feature | Free | Pro ($25/mo) | Team ($600/yr) |
|---------|------|---|---|
| **Slow query logs** | ❌ No | ✅ Yes (5+ sec) | ✅ Yes (1+ sec) |
| **Query stats** | ❌ No | ✅ Yes | ✅ Yes |
| **PITR (7-day recovery)** | ❌ No | ✅ Yes | ✅ Yes (14-day) |

**Current:** If on Free, there's zero slow-query visibility.  
**Recommendation:** Upgrade to Pro ($25/mo) for slow-query alerts.

### Missing Runbooks

No documentation of:
- How to detect slow queries (manual SQL commands needed)
- How to interpret `pg_stat_statements`
- When to add indexes
- How to escalate DB issues

---

## 5. Backup & Disaster Recovery Readiness

**Status:** ⚠️ **TIER-DEPENDENT, UNTESTED**

### PITR by Supabase Tier

| Tier | PITR Window | Cost | Status for doen. |
|------|---|---|---|
| **Free** | ❌ None | $0 | **Current? Unknown** |
| **Pro** | ✅ 7 days | $25/mo | **Recommended** |
| **Team** | ✅ 14 days | $600/yr | **Best for production** |

### Current State

**Finding:** No restore procedure documented.

- No CLAUDE.md section on "How to restore from backup"
- No runbook for "DB corruption detected → restore to X timestamp"
- No restore test ever run (assumed)

### Risk Assessment

**If on Free tier:**
- ❌ No PITR available
- ❌ Manual backups required (not set up)
- **Risk:** Data loss = complete org wipe, no recovery option
- **Revenue impact:** €79 × 100 orgs = €7900/mo at risk

**If on Pro tier:**
- ✅ 7-day PITR
- ⚠️ Restore not tested
- **Risk:** Recovery may fail under stress; unknown time-to-recovery

**If on Team tier:**
- ✅ 14-day PITR
- ⚠️ Restore procedure still not documented
- **Best practice:** Schedule monthly restore drill

### Recommendation

**MUST:** Tier to Pro ($25/mo) minimum. Document and test restore procedure before launch.

---

## 6. Alerting Gaps — What Should Fire But Doesn't

**Status:** ❌ **CRITICAL GAPS**

### Alert Checks Currently Missing

| Alert | Trigger | Current Status | Business Impact |
|-------|---------|---|---|
| **High error rate** | >5% errors/min in Sentry | ❌ None | Doesn't wake on-call; errors pile up |
| **Payment failure** | Stripe/Mollie webhook fails | ❌ None | Revenue leakage silent |
| **DB connection pool exhausted** | PgBouncer 6543 connection limit hit | ❌ None | Cascading API timeouts, users blocked |
| **Trigger.dev task failure** | Task retries exhausted (3x) | ❌ None | Emails not sent, offertes not followed up |
| **IMAP sync failure** | inkoopfactuur-intake can't connect | ❌ None | Invoice data stale, customer data lost |
| **Cron job missed** | cron-verzend-geplande-berichten > 2 min late | ❌ None | Scheduled emails queue grows unbounded |
| **Disk quota exceeded** | Supabase DB/storage >80% | ❌ None | Sudden write failures, data loss |
| **AI service unavailable** | Claude API 500 error rate >10% | ❌ None | Daan feature broken; users can't rewrite |
| **Email rate limit hit** | Resend API returns 429 | ❌ None | Emails dropped silently |

### What's Missing

**Zero monitoring stack configured.** Sentry is error-only; no metrics, no alerts.

**Options to implement (pick one):**
1. **Sentry Alerts** (native, free tier) — configure "error rate > 10%" → email Antony
2. **Vercel Analytics** (native) — alerts via dashboard, no proactive notification
3. **External APM** (New Relic, Datadog) — $200+/mo, overkill for current scale
4. **DIY via Trigger.dev** — schedule daily audit job, check error count, send email

**Recommendation:** Use Sentry Alerts (free) + Vercel dashboard checks (free) + one Trigger.dev audit job.

---

## 7. Cost Projection @ 100 Orgs

### Input Assumptions

- **100 paying orgs × €79/mo = €7,900/mo revenue**
- **~10 users/org average = ~1,000 active users**
- **~30 offertes/org/year, ~10 invoices/org/mo = 1000 invoices/mo**
- **~200 emails/org/mo (IMAP ingest) = 20,000 emails/mo**
- **~50 AI interactions/org/mo (rewrite, chat, email) = 5,000 AI interactions/mo**

### Cost Projection Table

| Service | Tier/Plan | Current Cost | @ 50 orgs | @ 100 orgs | @ 500 orgs | Multiplier |
|---------|-----------|---|---|---|---|---|
| **Supabase DB** | Assumed Pro | $25/mo | $25 | $25 | $75 | Storage overage $5 per 100GB |
| **Supabase Storage** | Included in Pro | Incl. | Incl. | Incl. | +$10 | ~10GB/mo at scale |
| **Vercel** | Pro | $20 | $20 | $20 | $20 | +API per-invocation @ scale |
| **Trigger.dev** | Free (now, <5k) | $0 | $0 (free) | $100/mo (pro) | $500+ (business) | 50k → business tier |
| **Resend** | Pro (50k emails) | $20 | $20 | $20 | $50 | 50k → 200k emails |
| **Anthropic Claude** | Pay-as-you-go | — | $25–50 | $100–250 | $500+ | 5k queries/mo × tokens |
| **Upstash Redis** | Pay-as-you-go | ~$2 | ~$5 | ~$10 | ~$50 | Rate-limiting ops |
| **Stripe/Mollie** | Pay-as-you-go (1.8% + €0.25) | — | ~€71 | ~€142 | ~€710 | Transaction fees on revenue |
| **Sentry** | Free or Team ($26/mo) | $0 (free) | $0 | $26 | $26 | Volume doesn't trigger upgrade |
| **KVK API** | Paid tier | ~€500/yr | €42/mo | €42/mo | €42/mo | Fixed annual license |
| **Exact Online API** | Free for app devs | $0 | $0 | $0 | $0 | — |
| **FAL AI** | Pay-per-image ($ per call) | Minimal | Minimal | Minimal | Minimal | Not heavily used |

---

## 7a. Detailed AI Cost Calculation (Anthropic Claude)

**Current Usage Patterns:**
- `ai-rewrite` — claude-haiku-4-5 (~800 tokens avg, $0.01 per 1M tokens)
- `ai-chat`, `ai-email`, `ai-followup-email` — claude-sonnet-4-6 (~2000 tokens avg, $3 per 1M tokens)
- `analyze-inkoop-offerte` — claude-sonnet-4-6 (vision + parse, ~3000 tokens avg)

**Calculation @ 100 orgs:**

```
Monthly AI calls estimate:
- ai-rewrite: 50 calls/org × 100 orgs = 5,000 calls × 800 tok = 4M tokens
- ai-chat: 20 calls/org × 100 orgs = 2,000 calls × 2000 tok = 4M tokens
- ai-email: 10 calls/org × 100 orgs = 1,000 calls × 2000 tok = 2M tokens
- ai-followup-email: 5 calls/org × 100 orgs = 500 calls × 2000 tok = 1M tokens
- analyze-inkoop: 2 calls/org × 100 orgs = 200 calls × 3000 tok = 0.6M tokens
- Daan (chat widget): 15 calls/user × 1000 users = 15k calls × 2000 tok = 30M tokens

Total: ~41.6M input tokens/mo

Anthropic Pricing (May 2026):
- claude-haiku: $0.80/$2.40 per 1M tokens (in/out)
- claude-sonnet-4-6: $3/$15 per 1M tokens (in/out)
- claude-opus: $15/$45 per 1M tokens

Average (mixed): ~$2.50 per 1M input tokens
Cost @ 100 orgs: 41.6M tokens × ($2.50 / 1M) = €100–120/mo
```

**Note:** Streaming not implemented; if added, costs drop ~10%.

---

## 7b. Tier-Upgrade Thresholds (When You'll Hit Cost Jumps)

| Service | Current Threshold | Upgrade Trigger | Cost Jump | Org Count |
|---------|---|---|---|---|
| **Trigger.dev** | Free (5k runs) | Exceed 5k runs/mo | +$100/mo | ~80 orgs |
| **Vercel** | Pro $20/mo | Exceed 3000 GB-hours/mo | +$50/mo per overage | ~200 orgs |
| **Supabase** | Pro $25/mo | DB >500GB or >100k RPS | Upgrade to Business custom | ~300 orgs |
| **Resend** | Pro $20/mo | Exceed 50k emails/mo | $20→$50/mo | ~250 orgs |
| **Sentry** | Free | Exceed 50k events/mo | $26/mo (Team tier) | ~200 orgs |
| **Claude/Anthropic** | PAYGO | Linear scale | No tier-up; linear cost | Every org |

---

## 7c. Cost Summary @ Different Scales

### @ 50 orgs (€3,950/mo revenue)

```
Fixed costs:
- Supabase Pro:           €25/mo
- Vercel Pro:            €20/mo
- Trigger.dev Free:       €0/mo
- Resend Pro:            €20/mo
- Sentry Free:            €0/mo
- KVK API:               €42/mo
- Upstash:                €5/mo

Variable (50 orgs):
- Claude AI:             €50/mo
- Stripe/Mollie fees:    €71/mo (1.8% × €3950)
- Storage:                €0/mo

Total @ 50 orgs: €213/mo
Gross Margin: (€3950 - €213) / €3950 = **94.6%**
```

### @ 100 orgs (€7,900/mo revenue)

```
Fixed costs:
- Supabase Pro:           €25/mo
- Vercel Pro:            €20/mo
- Trigger.dev Pro:      €100/mo (upgraded due to 6000+ runs)
- Resend Pro:            €20/mo
- Sentry Team:           €26/mo
- KVK API:               €42/mo
- Upstash:               €10/mo

Variable (100 orgs):
- Claude AI:            €120/mo
- Stripe/Mollie fees:   €142/mo (1.8% × €7900)
- Storage:               €10/mo

Total @ 100 orgs: €515/mo
Gross Margin: (€7900 - €515) / €7900 = **93.5%**
```

### @ 500 orgs (€39,500/mo revenue)

```
Fixed costs:
- Supabase Business:     €500/mo (estimate; custom quote)
- Vercel Pro+:           €50/mo (with overage)
- Trigger.dev Business: €500/mo (custom concurrency)
- Resend Plus:           €50/mo
- Sentry Team:           €26/mo
- KVK API:               €42/mo
- Upstash Plus:          €50/mo

Variable (500 orgs):
- Claude AI:            €600/mo
- Stripe/Mollie fees:   €710/mo (1.8% × €39500)
- Storage:              €50/mo

Total @ 500 orgs: €2,578/mo
Gross Margin: (€39500 - €2578) / €39500 = **93.5%**
```

---

## 8. Top 3 Observability Gaps (By Impact on Revenue & Growth)

### 🔴 **Gap 1: Zero Product Analytics (PostHog Missing)**

**Impact:** Can't measure:
- Which features drive retention (paid vs. churn)
- Onboarding funnel drop-off (CAC efficiency)
- Churn signals (build retention campaigns)
- Feature adoption for upsell (who uses integrations?)

**Business Cost:** Missing €500–1000/mo in upsell revenue by not knowing which orgs are most engaged.

**Fix:** Install PostHog (free tier up to 1M events/mo) + capture 10 key events.  
**Time:** 4 hours  
**Cost:** €0 (free tier sufficient at current scale)

---

### 🔴 **Gap 2: No Alerting (Critical Production Issues Silent)**

**Impact:**
- Payment failures go undetected → revenue loss
- Task failures (Trigger.dev) → emails not sent → support tickets
- DB connection exhaustion → API 502s → users abandon

**Business Cost:** At €7,900/mo, 1 hour of downtime = ~€330 lost (assuming 30-day SLA math).

**Fix:** Set up Sentry Alerts (free) for error rate > 10%, payment failures.  
**Time:** 2 hours  
**Cost:** €0

---

### 🟠 **Gap 3: RUM (Real-User Monitoring) Missing**

**Impact:**
- Can't measure LCP, FID, CLS → don't know if app feels slow to users
- At €79/mo flat, slow performance = churn
- Vercel provides Web Analytics, but no automated alerts

**Business Cost:** Slow performance → 5–10% churn rate increase → €400–800/mo revenue loss.

**Fix:** Implement web-vitals library + send to Sentry (free) or Vercel Analytics.  
**Time:** 3 hours  
**Cost:** €0

---

## Summary: Margin @ 100 Orgs

| Metric | Value |
|--------|-------|
| **Revenue** | €7,900/mo |
| **Infra Cost** | €515/mo |
| **Gross Margin** | 93.5% |
| **Gross Profit** | €7,385/mo |

**Key assumptions:**
- Supabase Pro tier ($25/mo)
- Trigger.dev Pro tier ($100/mo @ 6000+ runs)
- Resend Pro ($20/mo @ 50k emails)
- Claude ~€120/mo @ 5k interactions/month × 2000 tokens avg × $2.50/1M tokens

---

## Action Items (Pre-Launch @ 100 Orgs)

| Priority | Action | Owner | Timeline | Cost |
|----------|--------|-------|----------|------|
| **P0** | Upgrade Supabase to Pro; test PITR restore | Antony | 1 week | €25/mo |
| **P0** | Set up Sentry Alerts for error rate + payment failures | Antony | 2 hours | €0 |
| **P1** | Install PostHog; capture 10 key events (onboarding, feature use, payment) | Dev | 4 hours | €0 (free) |
| **P1** | Implement web-vitals; send to Sentry or Vercel Analytics | Dev | 3 hours | €0 |
| **P1** | Document DB restore procedure; run monthly drill | Antony | 2 hours | €0 |
| **P2** | Upgrade Trigger.dev to Pro tier | Antony | 1 hour | €100/mo (auto-trigger @ 5k runs) |
| **P2** | Add Sentry custom fingerprinting for rate-limit errors | Dev | 1 hour | €0 |

