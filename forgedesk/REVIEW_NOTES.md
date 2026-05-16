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

## Fase 3b — `feat/communicatie-tab` (2026-05-15)

Scope-aanpassing op plan:

- **MijnEmailSubTab fysieke verhuizing uitgesteld**: plan zei
  handtekening (EmailTab regel 770-826) + SMTP (940-988) + voorkeuren
  (990-1041) verhuizen naar `MijnEmailSubTab`. Die blokken zijn diep
  verweven in `EmailTab` met gedeelde state en sub-nav. Voor commit 3
  bleef het bij een placeholder-stub. Plan-uitvoering: aparte
  vervolg-iteratie, niet binnen GATE 4 scope.
- **PortaalEmailsSubTab fysieke verhuizing uitgesteld**: plan zei
  PortaalTab regel 356-472 (template_herinnering + timing) verhuizen.
  Idem reden: het zit inline in `PortaalTab`-functie. Placeholder-stub
  blijft tot vervolg-iteratie.
- **Email-shrink en portaal-split** zijn ook uitgesteld om dezelfde
  reden — de oude tabs blijven volledig functioneel, communicatie
  toont voorlopig alleen Offerte-opvolging + Factuur-opvolging +
  Templates-lijst echt werkend (achter feature flag).

Tracking: [GitHub issue #16](https://github.com/antony-jip/sign-company/issues/16).

---

## Fase 3e / 3f — `feat/communicatie-tab` (2026-05-15)

Scope-aanpassing op plan:

- **orgTheme.ts is geland** met `getOrgColor(settings, portaalInstellingen, slot)`.
  Defaults: petrol `#1A535C` / flame `#F15025` / light-bg `#E6F0F1`. Accent
  blijft expliciet brand-only (Flame), conform plan-regel "alleen primary/light-bg
  via white-label override".
- **PortaalHeader gebruikt het patroon als bewijs**: twee nieuwe optionele
  props (`primaireKleur`, `bedrijfskleurenGebruiken`); zonder props blijft
  alles brand-default (backward-compatible). Toepassing op de andere ~14
  hits in `src/components/portaal/` (PortaalSidebar, PortaalFeedItem*,
  PortaalReactieFormInline, PortaalKlantReactie, PortaalPagina) is
  uitgesteld — vereist prop-drilling vanaf `PortaalPagina` of een
  PortaalThemeContext om de twee waarden naar alle nested components te
  brengen. Pattern is bewezen, fan-out is mechanisch.
- **Color-picker in branding tab (fase 3e commit 2)**: niet uitgevoerd.
  HuisstijlTab heeft al een kleurpicker — plan zei "hergebruik component
  of dupliceer met deep-link". Bevestigen welke route in een vervolg-PR.
- **Fase 3f (per-project portaal-overrides UI)**: niet uitgevoerd. DB
  ondersteunt `project_portalen.instructie_tekst` al, en welkomstboodschap
  is een nieuwe kolom die nog niet bestaat. Per-project overrides + reset
  knoppen vereisen nieuw component `ProjectPortaalSettings.tsx` plus
  optionele DB-migration.

Trackt onder [GitHub issue #16](https://github.com/antony-jip/sign-company/issues/16) — uitbreiden of split issue per fase indien gewenst.

---

## Fase 3d — `feat/communicatie-tab` (2026-05-15, bijgewerkt na Antony's GATE 4 feedback)

Status na opvolg-iteratie:

- **Template-fetch voor 4 van 5 trigger-flows nu geland**:
  - trial-reminder, offerte-opvolging, portaal-herinnering: volledig
    template-driven via `getTemplateAdmin` + `renderTriggerTemplate`.
  - offerte-opvolging gebruikt per-stap custom content (uit
    `offerte_opvolg_stappen`) wanneer ingevuld; bij lege stap-velden
    valt het terug op `offerte_opvolging_dag1` (stap.dagen_na_versturen
    ≤ 3) of `offerte_opvolging_dag7` (anders).
  - portaal-herinnering gebruikt nu uniform `email_templates` als
    primaire bron; oude `portaal_instellingen.template_herinnering`
    blijft alleen als fallback wanneer organisatie_id niet kan worden
    opgelost (zou nooit moeten voorkomen in normaal verkeer).
- **R2-quickfix** gedaan in `src/trigger/utils/templates.ts`:
  `FALLBACK_TEMPLATES` const dupliceert de 12 systeem-templates uit
  migration 103, zodat `getTemplateAdmin` fail-soft kan zijn voor nieuwe
  trial-orgs die nog niet geseed zijn.
- **email-opvolging blijft AI-driven**: onderwerp is `Re: {origineel}`
  voor threading, body komt uit Anthropic. Een template-fetch hier zou
  óf threading breken (subject) óf de AI-feature elimineren (body). Per
  Antony's wens "copy-paste-patroon waar zinvol" niet gekoppeld.
  Idempotency-key + rollback is wel aanwezig.
- **Onboarding-sequence en color-picker**: per Antony's eigen instructie
  doorgeschoven naar [issue #16](https://github.com/antony-jip/sign-company/issues/16).
- **Idempotency-keys overal toegevoegd:**
  - offerte-opvolging via `sendEmailForUser` (organisatieId +
    idempotencyKey params toegevoegd, skipped pad behandeld).
  - email-opvolging via `checkAndMark` / `rollbackKey` rond eigen
    `transporter.sendMail` (orgId via profiles-lookup).
  - portaal-herinnering: `portaal_herinnering:{projectId}` key.
  - trial-reminder: `trial_reminder:{orgId}:{daysUntilEnd}` key.
- **Onboarding-sequence niet aangeraakt.** Huidige sequential
  wait.for-flow is incompatibel met de plan-vereiste offset-array-loop
  zonder een grote refactor naar een cron-based dispatcher. Beide
  blijven in een follow-up iteratie. `app_settings.onboarding_dag_offsets`
  wordt nog niet gelezen.
- **offsets-loop alleen op trial-reminder gedaan.**

Trackt onder [GitHub issue #16](https://github.com/antony-jip/sign-company/issues/16) als deel van vervolg-iteratie.

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

---

## Email UX batch — feat/email-ux-batch (7 commits)

**Eind-verdict senior-backend-reviewer:** AKKOORD-MET-OPMERKINGEN. Geen
blokkades. Twee items verdienen een conscious-decision moment vóór merge
tijdens de FESPA-week:

1. **Geen feature-flag op de virtualization** (EmailLayout.tsx:521-561).
   Hot path. Bij regressie alleen revert+deploy als kill-switch. Overweeg
   `email_virtualization_enabled` in `app_settings` met fall-through naar
   het oude render-pad.

2. **Snooze/unsnooze silent-fail** (EmailLayout.tsx:655-666).
   `updateEmail(...).catch(() => {})` slikt netwerk-fouten — UI blijft in
   "gesnoozed"-staat, DB ongewijzigd. Consistent met bestaande
   pin/read/archive-patronen in dit bestand, dus binnen-pattern. Bredere
   fix verdient een aparte refactor-pas (toast + revert).

**Niet-blokkerende observaties uit per-commit reviews:**

- `estimateSize` 46/70 is een grove gok; bij snel scrollen door 500+ mails
  kan eerste-paint flicker zichtbaar zijn voor measureElement de echte
  hoogte oppakt.
- Sales-banner is nu buiten de scroll-container (juiste fix) maar telt mee
  voor de viewport-hoogte; dismiss laat de lijst plotseling 80px omhoog
  schuiven.
- Swipe-threshold 80px is gehard-coded — werkt op telefoons, op brede
  tablets had % van rij-breedte fijner geweest.
- `gesnoozed`-folder telt ook mee op mobile tab-bar (voller, geen probleem).
- `email.labels || []` op EmailLayout:660 is defensief; type-def zegt
  `labels: string[]` (niet optional). Harmless.
- Click-outside boilerplate voor snooze + label popovers is verdubbeld;
  bij meer popovers overweeg een `useClickOutside`-hook (out of scope nu).
- `bg-emerald-100`/`bg-red-100` voor swipe-feedback zijn Tailwind-defaults
  i.p.v. brand-tokens — universele iOS/Gmail-conventie, OK om te houden.
- Swipe werkt alleen in inline-mode (mobile default), niet in stacked
  desktop. Bewuste keuze.


---

## Mail-Project-Koppeling — feat/email-ux-batch (5 commits M1-M5)

**Eindverdict senior-backend-reviewer:** AKKOORD-MET-OPMERKINGEN. Geen
blokkades. Vijf observaties voor de backlog:

1. **Scheduled-send orphan-link.** `EmailLayout.handleSendEmail` schrijft
   de project-koppeling direct na inplannen, maar
   `api/cron-verzend-geplande-berichten.ts` schrijft de verzonden mail
   niet in de `emails`-tabel. De koppel-rij wijst naar een thread_id die
   pas zichtbaar wordt zodra IMAP de Sent-folder ververst. Tot dan toont
   de project-tab een lege lijst. Niet corrupt — wel verwarrend voor de
   geplande-verzend-flow. Fix-richting later: cron-worker insert óók een
   `emails`-rij met dezelfde thread_id, of skip de koppeling bij
   `scheduledAt`.

2. **RLS-asymmetrie tussen koppel-tabel en emails.** `email_project_koppelingen`
   is org-scoped, `emails` blijft user-scoped (mailbox-credentials zijn
   persoonlijk). `getEmailsVoorProject` JOIN'd beide; resultaat: een
   collega die de mail nooit zelf gefetched heeft via IMAP, ziet hem niet
   in de project-tab — ook al staat de koppeling er. De copy in
   migratie 108 ("toont de mail-communicatie van het hele team") is dus
   gedeeltelijk waar. Twee opties later: (a) copy aanpassen aan
   werkelijkheid, of (b) een org-zichtbare projectie-tabel voor
   gekoppelde mails maken.

3. **`getProjectSuggestiesVoorEmail` escapet `%`/`_` niet** vóór
   `.ilike`. Theoretisch issue bij afzender met die tekens in local part
   (RFC laat het toe, in praktijk zeldzaam).

4. **`ontkoppelEmailVanProject` filtert alleen op `thread_id`.** RLS
   dekt het af, maar `eq('organisatie_id', orgId)` toevoegen zou
   defense-in-depth zijn — consistent met `koppelEmailAanProject`.

5. **Picker-popover sluit op `mousedown` buiten** — als een sonner-toast
   verschijnt tijdens een open picker kan dat verwarrend voelen.
   Edge-case, niet bevestigd.

