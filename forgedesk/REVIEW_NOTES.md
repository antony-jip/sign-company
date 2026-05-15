# Review-opmerkingen

Niet-blocking opmerkingen uit `@senior-backend-reviewer`-gates. Per CLAUDE.md
sectie 8 hier loggen bij verdict AKKOORD-MET-OPMERKINGEN of bij AKKOORD met
expliciete vervolgsuggesties.

---

## Fase 1 — `fix/email-html-multipart` (2026-05-15)

Commits: `53022e2d`, `fa400894`.

Open punten uit eindreview commit `fa400894`:

- **Entity-decoding in `htmlToPlainText`** (`src/trigger/utils/email.ts`):
  decodeert alleen een korte handlist van named entities plus decimale
  `&#NNN;`. Hex-entities (`&#x27;`) en exotische named entities komen
  letterlijk in de plain-text-alt terecht. Acceptabel voor fase 1 — alle
  huidige call-sites produceren zelf de html en gebruiken geen exotische
  entities. Heroverwegen zodra Daan-gegenereerde of klant-input in mail-body
  terechtkomt.
- **Link-tekst in plain-text-alt** (`src/trigger/utils/email.ts`):
  `replace(/<[^>]+>/g, "")` strijkt `<a href="...">label</a>` weg tot enkel
  `label`; de url verdwijnt. Voor de portaal-CTA in `offerte-opvolging.ts`
  staat de url tekstueel al in `plainBody` (regel 286), dus geen incident.
  Heroverwegen in fase 3 zodra templates dynamische CTA's krijgen.

---

## Fase 3a — `feat/communicatie-tab` (2026-05-15)

Open punten uit per-commit reviews:

- **getTemplateAdmin in `src/trigger/utils/`** (fase 3d-prerequisite):
  `emailTemplateService.getTemplate` gebruikt de browser/SSR
  supabase-client met RLS. Trigger.dev runs hebben geen sessie-cookie en
  zouden via die client lege resultaten krijgen → silent fallback naar
  DEFAULT_TEMPLATES, terwijl org-customisaties genegeerd worden. Vóór
  fase 3d: maak een trigger-vriendelijke `getTemplateAdmin(orgId, key)`
  in `src/trigger/utils/` die `getSupabaseAdmin()` gebruikt en
  `DEFAULT_TEMPLATES` importeert uit `emailTemplateService`.
- **Logging bij fallback in `getTemplate`** (fase 3d): in trigger-context
  helpt `logger.warn` bij DB-error of missing-row zodat
  org-fallback-events zichtbaar zijn in Trigger.dev-dashboard.
- **Drift-test DEFAULT_TEMPLATES vs migration 103**: 12 strings staan
  byte-voor-byte op twee plekken. Toekomstige wijziging riskeert drift
  zonder dat iemand het merkt. Niet urgent, te overwegen vóór release:
  test die 103 parset en met `DEFAULT_TEMPLATES` vergelijkt.
- **Discriminated union voor idempotency-params** (cosmetic): in plaats
  van twee `!`-asserties op `params.idempotencyKey!`/`organisatieId!`,
  een `idempotency?: { key: string; organisatieId: string }` object dat
  de "alleen samen geldig"-invariant typevangt. Doe als de helper in
  meer call-sites geïntegreerd wordt (fase 3d).
- **TTL/cleanup op `email_send_idempotency`**: monotonische groei. Cron
  die rijen > 90 dagen verwijdert, of partitioneren op maand. Niet
  urgent, plan voor operations-item.

---

## Fase 2 — `feat/communicatie-tab` (2026-05-15)

Commits: `31b086ce`, `b512f569`, plus fase-eind tweaks.

Open punten uit eindreview:

- **TS-interface `EmailTemplate` mist `trigger_task_naam` en `is_systeem`**
  (`src/services/emailService.ts` rond regel 365). Niet breaking — bestaande
  `select('*')`-paden halen de velden mee, alleen typing weet er niet van.
  Type-uitbreiding hoort bij fase 3, want daar wordt `getTemplate(orgId,
  triggerTaskNaam)` geïmplementeerd in `emailTemplateService`.
- **TTL-cleanup op `email_send_idempotency`**: TODO in migration-comment.
  Eerst handmatige `DELETE WHERE sent_at < now() - interval '90 days'` per
  kwartaal; zodra pg_cron beschikbaar is automatiseren.
- **Duplicate-naam-edge-case in seed**: als een org vóór 103 al een custom
  template had met `naam='Offerte-opvolging dag 1'` (`is_systeem=false`),
  voegt de seed alsnog een tweede rij toe met dezelfde `naam` maar
  `is_systeem=true`. Geen DB-fout (partial UNIQUE filtert op
  `is_systeem=true`). UX-aandachtspunt voor fase 3 templates-lijst:
  toon `is_systeem`-badge of dedupliceer op naam.
- **`ON CONFLICT DO NOTHING` zonder expliciete target** in seed: werkt op
  PK + partial UNIQUE, maar `ON CONFLICT (organisatie_id, trigger_task_naam)
  WHERE is_systeem = true DO NOTHING` zou de intentie expliciet maken.
  Stijl-puntje, niet functioneel.
