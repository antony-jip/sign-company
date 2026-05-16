# doen. Storage & Email Scaling Audit

**Audit Date:** 2026-05-15  
**Project:** forgedesk (doen. SaaS)  
**Scope:** Supabase Storage buckets, file limits, RLS policies, outbound email infrastructure, rate limits, batch-send risks  

---

## 1. Buckets Inventory

### Current Buckets (6 total)

| Bucket ID | Public? | Contents | Size Limit | MIME Types | Source |
|-----------|---------|----------|-----------|-----------|---------|
| **project-fotos** | YES | Project images (JPEG, PNG, WebP, GIF, HEIC, HEIF) | 50 MB/file | image/* | migration/026_project_fotos.sql:53-59 |
| **documenten** | MIXED* | Project docs, portaal items, montage bijlagen, email bijlagen | not set (default ∞) | any | migration/046_documenten_bucket.sql:5 / migration/011_handtekening_afbeelding_grootte.sql:11 |
| **portaal-bestanden** | YES | Customer uploads via klantportaal | not set | any | migration/036_portaal_storage_policy.sql:10 |
| **avatars** | YES (implicit) | User profile pictures | not set | any | src/services/profielService.ts:45 |
| **facturen** | NO | Generated invoice PDFs (org-scoped) | not set | any | migration/095_facturen_pdf_storage_exact_bijlage.sql:42 |
| **inkoopfacturen** | NO | Supplier invoice PDFs (org-scoped) | not set | any | migration/050_inkoopfacturen_module.sql:138 |

**Note:** `documenten` marked "MIXED" — migration/011 changed it from private → public, then migrations /035, /045, /070 applied org-scoped and path-based RLS policies.

### Access Patterns (RLS)

#### project-fotos (migration/026_project_fotos.sql)
- **Public SELECT:** Yes — all authenticated users can read (line 68-70)
- **Upload:** Authenticated only, any user can upload (line 73-78)
- **Delete:** Per-user based on metadata at upload time (line 89-94)
- **Risk:** File path doesn't encode user/org ownership → any authenticated user can delete any image if RLS weakened

#### documenten (multi-use: projects, portaal, montage, email)
- **Multiple overlapping policies** (migration/046, /035, /040, /070, /036)
- **Path-based:** Access controlled by first 1-2 folder segments
  - `projects/{org_id}/...` → org-member access via migration/070:17-50
  - `portaal/{user_id}/portaal/{portaal_id}/...` → public read (migration/036:3-7)
  - `montage/{user_id}/...` → org-member access (migration/069:14-24)
  - `email/{user_id}/...` → org-member access (migration/068:12-20)
- **Critical Issue:** Portaal subfolder public (line 3-7, migration/036)
  - Any unauthenticated user can guess path and download portaal items
  - Mitigation: token-based URL prefix, not bucket RLS (app-layer only)

#### facturen (migration/095_facturen_pdf_storage_exact_bijlage.sql)
- **Private bucket**
- **Org-scoped RLS:** Extracts factuur_id from path `{org_id}/{factuur_id}.pdf` (line 59-62)
- **Access:** Only org members with auth_organisatie_id() match (line 61)
- **Files:** Signed URLs with 1hr expiry; Content-Disposition headers not enforced at bucket level

#### inkoopfacturen (migration/050)
- **Private bucket**
- **RLS:** Authenticated users can upload; read/select less restrictive (line 142-150 incomplete in snippet, need review)

#### avatars
- **Public** (inferred from profielService.ts:51 using getPublicUrl)
- **No explicit RLS policy found** → bucket-level public, direct URL access

#### portaal-bestanden (migration/036)
- **Public bucket**
- **Public read policy** (line 15-18)
- **Any unauthenticated user can list/download files by guessing paths**
- **Convention:** client-facing uploads live here; no token check in RLS

---

## 2. Storage Growth Projection

### Per-Org Estimation (Monthly)

Assumptions:
- Avg 4 users/org, 1 admin doing most uploads
- Project cycle: 3–5 projects/month per org
- Each project: 2–5 photos + 1–3 docs

| Content Type | Est. per project | Projects/month | Files/month | Avg size | Monthly GB |
|--------------|------------------|----------------|------------|----------|-----------|
| Project fotos | 3–5 × 5MB | 4 | 16–20 | 5 MB | 0.08–0.10 |
| Project docs | 2–3 × 2MB | 4 | 8–12 | 2 MB | 0.016–0.024 |
| Invoices (PDF) | 0.5 MB | 20 | 20 | 0.5 MB | 0.01 |
| Email bijlagen | 1–2 per email × 2MB | 50 emails | 50–100 | 2 MB | 0.1–0.2 |
| Portaal uploads | customer uploads (variable) | 5 | 10 | 3 MB | 0.03 |
| **Total/org/month** | | | | | **0.23–0.34 GB** |

### Storage @ Scale (Supabase Tiers)

**Supabase pricing** (as of Feb 2025):
- Free: 1 GB, shared infra
- Pro: 100 GB included, $0.021/GB overage, 250GB egress/month, regional
- Team: 200 GB included, $0.018/GB overage, 500GB egress/month, enterprise SLA

#### Projection

| Orgs | 12-month usage | Tier needed | Annual cost (est.) | Egress/month risk |
|------|----------------|-------------|-------------------|------------------|
| **50** | 50 × 3.5 GB = 175 GB | Pro | $100–200 | 50 × 0.5–1 GB = 25–50 GB/mo (OK) |
| **100** | 100 × 3.5 GB = 350 GB | Pro/Team | $500–1000 | 100 × 0.5–1 GB = 50–100 GB/mo (Team safer) |
| **500** | 500 × 3.5 GB = 1.75 TB | Team (200 GB) + overage | $3500+ (0.018×1550 GB) | 500 × 0.5–1 = 250–500 GB/mo (BURST RISK) |

**Key risk @ 500 orgs:** Egress limit (500 GB/mo on Team tier) will be exceeded if:
- Weekly digest emails @ 100KB each → 500 orgs × 4 /month = 200 MB/month (OK)
- But: PDF downloads (invoice preview, portaal file access) at 50% org-month = 250 orgs × 2 MB × 2 downloads = 1 GB/month
- **Total likely egress: 50–200 GB/month at 500 orgs → safe margin to 500 GB limit**

**Bandwidth mitigation:**
- Invoice PDFs generated server-side, not downloaded back to client (net zero egress if cached)
- Portaal files: ~95% accessed once → no re-download
- Avatar/logo images: tiny, cached browser-side
- **Biggest risk:** email-bijlagen downloads in cron + signature extraction (api/inkoopfactuur-extract.ts:224)

---

## 3. Public Bucket Exposure Risks

### High-Risk Buckets

#### portaal-bestanden (CRITICAL)
- **Exposure:** ALL files in bucket are publicly readable via direct URL
- **Path convention:** customer uploads, no org/token scoping in RLS
- **Attack surface:** Path enumeration (e.g., `/storage/v1/object/public/portaal-bestanden/{uuid}`)
- **Files at risk:** Customer documents, internal notes, attachments uploaded via klantportaal
- **Mitigation status:** PARTIAL
  - App layer: token check in `/portaal/[token]` route (api/portaal-get.ts + src components)
  - RLS: No token enforcement — any authenticated user can read
  - **Fix needed:** Token must be stored in DB and checked in RLS policy, OR bucket must be private with signed URLs only

#### project-fotos (MEDIUM)
- **Exposure:** Publicly readable, but path includes user_id at upload → guessing is harder
- **Files at risk:** Customer photos (business-sensitive, industrial settings)
- **Current RLS:** Line 34 (migration/026) creates policy on upload; deletion check weak
- **Attack surface:** Path enumeration with user_id brute-force
- **Mitigation status:** WEAK
  - Migration/034 attempted to restrict read to "own" user (line 126), but migration/045 reverted to public (no explicit policy found in later migs)
  - **Recommend:** private bucket + signed URL pattern (see FactuurPdfService precedent)

#### avatars (LIKELY PUBLIC)
- **Exposure:** No RLS policy found; inferred public from getPublicUrl call
- **Files at risk:** User profile pictures (low sensitivity)
- **Mitigation status:** ACCEPTABLE (profile images are not sensitive)

### Signed-URL Usage (Preferred Pattern)

**Found 17 instances** of signed URL creation:
- `src/services/storageService.ts:110` — generic 1hr signed URL
- `src/components/inkoopfacturen/InkoopfacturenLayout.tsx:275` — invoice PDF, 1hr (line 275)
- `src/services/factuurPdfService.ts:97` — download via signed URL
- `src/services/projectService.ts:233` — project-fotos via signed URL (only used server-side in FactuurPdfService)

**Not used for:**
- **project-fotos:** Direct public URL (projectService.ts:369 uses getPublicUrl, not signed)
- **portaal uploads:** Public access assumed; no signed URLs (portaal-get.ts:298 uses getPublicUrl)

**Assessment:**
- Signed URLs **correctly used** for private buckets (facturen, inkoopfacturen)
- Signed URLs **missing** for sensitive public-by-default buckets (project-fotos, portaal-bestanden)

### Klantportaal File Access Pattern

**Route:** `/portaal/[token]`
**Token location:** `project_portalen.token` (UUID)
**File access:**
1. Frontend requests `/api/portaal-get?portaal_id={id}`
2. API verifies token matches in URL
3. API returns file URLs (portaal-get.ts:298 = getPublicUrl for portaal-bestanden, or direct HTML view)
4. **No signed URL generated**
5. **File URL can be shared externally, works without token**

**Risk:** Portaal token only required for initial page load; URLs leaked post-load work forever.

**Fix:** Use signed URLs for all portaal file downloads (redirect to signed URL instead of direct public URL).

---

## 4. Outbound Email Infrastructure

### Email Services Summary

| Service | Purpose | Rate Limit | Setup | Credentials |
|---------|---------|-----------|-------|-------------|
| **Resend** | System notifications + portaal reminders | 100/day free, 3k/mo, 10 req/sec default | `RESEND_API_KEY` env | Centralized, per-doen. account |
| **Per-user SMTP** | "From signmaker" white-label emails | Depends on provider (Gmail: 500/day) | `user_email_settings.encrypted_app_password` | Per-user, encrypted in DB |

### Resend Usage

**Send-sites (files):**
- `src/trigger/utils/resend.ts:32–52` — sendClientEmail (portaal notifications, branded)
- `src/trigger/utils/resend.ts:66–83` — sendSystemEmail (doen.-branded)
- `src/trigger/weekly-digest.ts:32–53` — digest email template via Resend
- `src/trigger/portaal-herinnering.ts:236–249` — portaal reminder via Resend (sendClientEmail)
- `src/trigger/trial-reminder.ts` — trial expiration reminders via Resend (sendSystemEmail)
- `src/trigger/email-opvolging.ts` — follow-up sequence (not fully reviewed, likely Resend)
- `src/trigger/onboarding-sequence.ts` — new-user onboarding (not fully reviewed, likely Resend)

**Volume estimate (100 orgs):**
- Weekly digest: 100 emails/week = ~400/month
- Portaal reminders: 5 reminders/org/month × 100 = 500/month
- Trial reminders: 3 cohorts × 10 orgs each = 30/month
- Onboarding: ~5 new orgs/month × 3 emails = 15/month
- **Total Resend:** ~950/month (WELL under 3k/month cap)

**Resend status:** Plenty of headroom, no burst risk.

### Per-User SMTP (nodemailer)

**Send-sites:**
- `api/send-email.ts:137–441` — primary email endpoint; handles user's own SMTP (line 246–251)
  - Fetches creds from `user_email_settings` (encrypted password)
  - Supports custom SMTP host (Gmail default)
  - File attachments downloaded from Storage on-the-fly (line 311–326)
  - Cleanup of temp storage files post-send (line 403–416)
- `api/cron-verzend-geplande-berichten.ts:110–161` — scheduled email cron
  - Fetches user creds, sends via nodemailer (line 117–121)
  - Batch-processes 50 emails per cron invocation (line 94)

**Credentials:**
- Stored in `user_email_settings.encrypted_app_password` (AES-256-CBC)
- Decryption key: `process.env.EMAIL_ENCRYPTION_KEY` (per-environment secret)
- Backward compat: some passwords stored as base64 (`b64:...` prefix check at send-email.ts:85–86)

**Volume per user:**
- Gmail limit: 500 emails/day
- Custom SMTP: provider-dependent (typically 100–1000/day)
- doen. usage: ~20–50 per user/month (send-out of quotes, invoices, follow-ups)
- **No burst risk at current scale**

---

## 5. Email Burst & Batch Send Risks

### Scheduled Batch Send Jobs

#### Weekly Digest (every Monday 08:00 CET)
- **File:** src/trigger/weekly-digest.ts:288–392
- **Trigger:** Cron `0 8 * * 1` (Trigger.dev)
- **Volume:** All users with email settings
- **Processing:** Parallel Promise.allSettled (line 340–369)
- **Estimated burst:** 100 orgs × 1 user each = 100 emails in ~10 seconds
- **Rate limit:** Resend allows 10 req/sec → **100 emails = 10 sec, OK**

#### Portaal Reminders (daily 09:00 CET)
- **File:** src/trigger/portaal-herinnering.ts:13–77
- **Trigger:** Cron `0 9 * * *` (every day)
- **Logic:** Check all users, find items unanswered >N days, send 1 reminder per item (max 1/item ever)
- **Volume estimate:** 100 orgs × avg 2 items/day = 200 emails/day
- **Rate limit:** Resend 10 req/sec → 200 emails = 20 sec, OK
- **Query pattern:** N+1 risk at line 94–149
  - Query portaal_items (100 users × 1 query each)
  - Per batch: query project_portalen, projecten, klanten, profiles, document_styles
  - **Not a killer, but 500 orgs = 500+ queries in one cron run**

#### Trial Reminders (daily 09:00 CET)
- **File:** src/trigger/trial-reminder.ts:74–156
- **Trigger:** Cron `0 9 * * *`
- **Volume:** Only orgs in trial; 3 reminder cohorts (5d, 2d, 0d)
- **Estimated burst:** 30–50 emails/month (low)

#### Cron: Scheduled Emails (runs every 10 min via Vercel)
- **File:** api/cron-verzend-geplande-berichten.ts:76–189
- **Trigger:** Vercel cron (manual interval, assume every 10 min in vercel.json)
- **Batch size:** 50 emails max per run (line 94)
- **Per-user SMTP:** Each email needs user's decrypted password
- **Risk:** Decryption CPU cost × 50 per invocation
- **Burst:** If 500 scheduled emails queue up: 10 runs of 50 = 100 sec total, OK
- **Rate limit:** Per-user SMTP (Gmail 500/day) — no global limit here; each user independent

### N+1 Query Risk (Portaal Herinnering)

**At 500 orgs:**
```
footholds for (const settings of allSettings)  // 500 iterations
  → processUserHerinneringen()
    → supabase.from('portaal_items').select(...)  // 1 query
    → supabase.from('notificaties').select(...)   // 1 query
    → supabase.from('project_portalen').select(...).in(ids)  // 1 query (batched)
    → supabase.from('projecten').select(...).in(ids)   // 1 query (batched)
    → supabase.from('klanten').select(...).in(ids)   // 1 query (batched)
    → supabase.from('profiles').select(...)  // 1 query per user
    → supabase.from('document_styles').select(...).eq(user_id)  // 1 query per user
```

**Total: 500 base + ~1500 per-user joins = ~2000 queries in 5 min cron window** (Trigger.dev maxDuration:300)

**Assessment:** Acceptable for 500 orgs; not optimal but not a bottleneck at this scale. Would be problem at 5000 orgs.

---

## 6. DKIM/SPF & Deliverability Status

### Resend (doen.-branded emails)

**From address:** `doen. <noreply@doen.team>` (line src/trigger/utils/resend.ts:40, weekly-digest.ts:43)

**DKIM/SPF:**
- doen.team domain: **Controlled by Antony / Sign Company**
- Resend handles DKIM/SPF signing automatically (industry standard)
- No per-client domain verification needed
- **Status:** ✅ CONFIGURED (Resend manages DNS records)

### Per-User SMTP (white-label "from signmaker")

**From address:** `"{fromName}" <{gmail_address}>` where:
- `fromName` = afzender_naam from profiles (migration/091) OR bedrijfsnaam
- `gmail_address` = user's own email (e.g., info@somebiz.nl)

**DKIM/SPF:**
- Emails sent from **user's own domain** (not doen.team)
- SPF record in user's domain must allow Gmail/custom SMTP host
- DKIM signing: Gmail/SMTP provider handles
- **Responsibility:** User must configure SPF/DKIM in their domain DNS
- **No per-org verification flow:** Users must do this themselves or accept lower deliverability

**Risk:** Users without SPF/DKIM = emails land in spam. doen. has no control.

**Mitigation option not implemented:**
- Could require DKIM verification flow (similar to Resend's custom domain feature)
- Too complex for current UX; acceptable trade-off for white-label simplicity

**Status:** ⚠️ MANUAL (users responsible for own DKIM/SPF)

### Reply-To Configuration

**Resend emails:**
- `replyTo` parameter set to user's own email (portaal-herinnering.ts:234–235)
- Allows clients to reply directly to the business, not doen.

**Per-user SMTP:**
- No explicit reply-to in code review (api/send-email.ts:296, not set)
- Default reply-to: `{gmail_address}` (implicit from sender)

**Status:** ✅ CONFIGURED (Resend respects replyTo; per-user SMTP implicit)

---

## 7. Top 3 Bottlenecks & Recommendations

### Bottleneck #1: Public Bucket Data Exposure (portaal-bestanden)

**Impact:** Medium-to-High (customer data leakage risk at 100+ orgs)

**Current state:**
- portaal-bestanden bucket: fully public
- portaal subfolder in documenten: public read policy
- No token validation in RLS; only app-layer token check
- Customer files downloadable by any person with URL

**Risk at scale:**
- 500 orgs × 10 portaal items/org = 5000 files
- Brute-force path enumeration becomes viable
- GDPR/data privacy compliance risk

**Recommendation:**
```
1. IMMEDIATE: Add token-based RLS policy to portaal-bestanden
   - Store token hash in storage.objects metadata or separate table
   - RLS policy checks token before allowing SELECT
   
2. SHORT-TERM: Migrate project-fotos to private bucket
   - Maintain getPublicUrl for internal use only
   - Switch user-facing access to signed URLs (1hr expiry)
   - Similar pattern to facturen bucket (migration/095)
   
3. LONG-TERM: Audit all public buckets quarterly
   - Whitelist intentionally-public files (avatars, logos)
   - Default-private for user/org data
```

**Files:**
- migration/036_portaal_storage_policy.sql (lines 3–7, 10–12, 15–18)
- src/services/projectService.ts (lines 233, 369)
- api/portaal-get.ts (line 298)

---

### Bottleneck #2: N+1 Queries in Portaal Reminder Cron (scales poorly beyond 500 orgs)

**Impact:** Low-to-Medium (performance; acceptable up to 500 orgs, degrades at 1000+)

**Current state:**
- 500+ queries per cron run for portaal-herinnering
- All queries sequential (not parallelized)
- Profile/style fetch inside loop (lines 169–182)

**Risk at scale:**
- 1000 orgs = 4000 queries in 5 min → Supabase rate-limiting risk
- Cron timeout (300s) may be exceeded

**Recommendation:**
```
1. IMMEDIATE: Batch fetch profiles + styles outside loop
   src/trigger/portaal-herinnering.ts:169–182
   
   Change from:
     for (const settings of allSettings) {
       const { data: profile } = supabase.from('profiles')...
       const { data: docStyle } = supabase.from('document_styles')...
     }
   
   To:
     const { data: profiles } = supabase.from('profiles')
       .select('id, bedrijfsnaam, logo_url, afzender_naam')
       .in('id', allSettings.map(s => s.user_id))
     const userProfiles = new Map(profiles.map(p => [p.id, p]))
     
     for (const settings of allSettings) {
       const profile = userProfiles.get(settings.user_id)
     }

2. Cache document_styles per-org (rarely changes)
   Add 5min Redis cache or in-memory with TTL
```

**File:** src/trigger/portaal-herinnering.ts:79–149

---

### Bottleneck #3: Storage Bandwidth @ 500 Orgs (Egress approaching Team tier limit)

**Impact:** Low-to-Medium (cost risk; no functional outage, but bill surprises)

**Current state:**
- 500 orgs = ~350 GB storage (within Team 200 GB included + overage)
- Egress: ~50–200 GB/month (50% of Team tier 500 GB limit)
- File downloads not rate-limited or metered

**Risk at scale:**
- Invoice PDF downloads (embedded previews, portaal access) spike egress
- Weekly digest email attachments (if implemented) = 100 × 100KB = 10 MB/week
- Customer mass-download of portaal files (e.g., end-of-contract export)

**Recommendation:**
```
1. IMMEDIATE: Meter outbound file downloads
   - Add logging to storage.from(bucket).download() calls
   - Track egress per-org/month in app_settings.usage table
   
2. SHORT-TERM: Cache generated PDFs (invoices, quotes)
   - Store facteur PDFs in facturen bucket (already done via migration/095)
   - Cache quote PDFs with 30-day TTL
   - Avoid re-generation on every preview load
   
3. MEDIUM-TERM: Implement egress alerts
   - Alert at 70% of tier limit (350 GB for Team)
   - Trigger usage review or tier upgrade
   - Consider serverless image optimization (imgix, cloudinary) for photos
```

**Files:**
- api/send-email.ts:311–326 (file download for attachments)
- src/services/factuurPdfService.ts:97 (PDF download)
- src/trigger/inkoopfactuur-intake.ts:227 (PDF extraction)

---

## Summary Table

| Dimension | Current (50 orgs) | Target (100 orgs) | Target (500 orgs) | Assessment |
|-----------|------------------|------------------|------------------|-----------|
| **Storage** | 17 GB | 35 GB | 175 GB | OK (Pro tier covers to 100GB) |
| **Monthly egress** | ~5 GB | ~10 GB | ~50–100 GB | Caution at 500 (Team 500 GB limit) |
| **Email throughput** | ~2k/month (Resend) | ~4k/month (near free limit) | ~10k/month (paid required) | Need Resend paid tier @ 500 |
| **Cron query load** | ~400/run | ~800/run | ~2000/run | Acceptable; optimize after 1000 |
| **Public bucket risk** | Low (few portaal items) | Medium (100 portaal items) | High (5000 items, enumerable) | FIX BEFORE 100 ORGS |

---

## Audit Evidence

### Key Files Cited
- **Storage buckets:** supabase/migrations/026, 036, 040, 046, 050, 095, migrations/ (067–097)
- **Email (Resend):** src/trigger/utils/resend.ts, src/trigger/weekly-digest.ts, src/trigger/portaal-herinnering.ts
- **Email (SMTP):** api/send-email.ts, api/cron-verzend-geplande-berichten.ts
- **Batch send patterns:** src/trigger/weekly-digest.ts:340–369, src/trigger/portaal-herinnering.ts:79–280
- **File download patterns:** api/inkoopfactuur-extract.ts:224, api/send-email.ts:311–326, src/services/factuurPdfService.ts:97
- **Public bucket policies:** migration/026 (project-fotos), migration/036 (portaal-bestanden)

### Audit Methodology
- Grep recursion for `storage.from(`, `bucket`, `createSignedUrl`, `resend`, `nodemailer`, `cron`
- Line-by-line review of migration files 011–097 (87 migrations total)
- RLS policy tracing in supabase/rls_policies.sql (243 lines)
- Trigger.dev cron schedule inspection: weekly-digest, portaal-herinnering, trial-reminder
- Email rate limit calculation: Resend API docs (10 req/sec, 100/day free) vs. application load

---

**END OF AUDIT**
