# Review-opmerkingen

Niet-blocking opmerkingen uit `@senior-backend-reviewer`-gates. Per CLAUDE.md
sectie 8 hier loggen bij verdict AKKOORD-MET-OPMERKINGEN of bij AKKOORD met
expliciete vervolgsuggesties.

---

## Portaal-bestanden read-side resolve (2026-05-21)

Context: fix voor "interne user kan gedeeld portaal-bestand niet openen" (zie
`src/services/portaalService.ts :: getPortaalItems`,
`src/services/storageService.ts :: resolvePortaalBestandUrl`). Tijdens analyse
twee items opgekomen die buiten scope blijven — hier genoteerd voor de
security-sprint:

- **`portaal_bestanden` RLS is `user_id`-scoped, niet `organisatie_id`-scoped.**
  `supabase/migrations/049_portaal_rls_policies.sql:23-27` definieert:
  `FOR ALL USING (portaal_item_id IN (SELECT id FROM portaal_items WHERE
  user_id = auth.uid()))`. Werkt nu omdat alle reads via
  `get_my_portaal_items` (SECURITY DEFINER, migration 056) lopen — die doet
  eigen org-membership-check en omzeilt de RLS. Risico: zodra een toekomstige
  query rechtstreeks op `portaal_bestanden` queryt (zonder die RPC), zien
  collega's binnen dezelfde organisatie de bestanden niet meer. Te herzien
  tijdens security-sprint, gelijktijdig met `portaal_items`, `project_portalen`
  en `portaal_reacties` (allemaal hetzelfde patroon in 049).

- **Bucket `documenten` is `public = true`** terwijl
  `supabase/migrations/migration_046_documenten_bucket.sql:5-7` 'm op
  `public = false` zet — alleen via `ON CONFLICT DO NOTHING`, dus de eerdere
  `UPDATE storage.buckets SET public = true` uit
  `supabase/migrations/011_handtekening_afbeelding_grootte.sql:11` blijft
  effectief. De portaal-flow leunt impliciet op deze public-status (klant
  zonder login moet bijlagen kunnen ophalen). Security-sprint topic: bewust
  beslissen of bucket public blijft (huidige werking) of private wordt met
  signed URLs voor zowel intern als publiek pad.

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

---

## Werkbon canvas fase 1 — Stream A & C (2026-05-29)

Gate-reviews op `feat/werkbon-canvas-fase1` (parent `f5d27254`). Beide
streams: verdict **AKKOORD-MET-OPMERKINGEN**. Geen blokkades. Build groen
na merge van A+C in umbrella branch.

### Stream A — Datamodel (3 commits)

| Hash | Subject | Verdict |
|---|---|---|
| `38e35072` | feat(werkbon): add layout JSONB column to werkbon_afbeeldingen (migration 114, canvas phase 1) | AKKOORD-MET-OPMERKINGEN |
| `6c03e3cf` | feat(werkbon): extend WerkbonAfbeelding with layout field (canvas phase 1) | AKKOORD |
| `ab6ce4d8` | feat(werkbon): add resolveSchaal helper + allow layout in updateWerkbonAfbeelding | AKKOORD |

**Reviewer-bevindingen integraal:**

#### Commit `38e35072` — migration 114
- Migratie-nummer 114 klopt: 113 is laatste in repo, 114 vrij per Antony.
- `ADD COLUMN IF NOT EXISTS` is idempotent en re-runnable, conform CLAUDE.md §3.
- `NOT NULL DEFAULT '{}'::jsonb` correct: bestaande rows krijgen `{}` zodat
  fallback-keten via `deriveFromGrootte(grootte)` kicken kan (masterplan §2.3).
- Geen RLS-conflict: `werkbon_afbeeldingen` heeft al een org-dekkende
  `FOR ALL`-policy uit migratie 022 die elke kolom dekt — kolom-toevoeging
  vereist geen policy-update.
- Backward-compat masterplan §2.3 correct ondersteund.

**Opmerking (niet-blokkerend):**
- Migratie 113 wikkelt de ADD COLUMN in `BEGIN/COMMIT` met `DO $$ ... IF NOT
  EXISTS`-block, migratie 114 is een platte one-liner. Functioneel equivalent
  (idempotent in beide gevallen), maar stilistisch inconsistent met directe
  voorganger.

#### Commit `6c03e3cf` — types
- `WerkbonBlokType` correct gedefinieerd als union `'foto' | 'logo'` (fase 1
  scope; `'pdf'`/`'tekst'` komen later, masterplan §2.5/2.6).
- `WerkbonAfbeeldingLayout` interface heeft alle velden optioneel
  (`blok_type?`, `schaal_percentage?`) — matcht het lege-`{}`-default uit
  migratie 114 zonder TypeScript-fouten bij oude data.
- Veld `layout?` op `WerkbonAfbeelding` optioneel toegevoegd: bestaande
  callers die alleen `grootte`/`omschrijving` raken blijven werken.
- `grootte?: 'klein' | 'normaal' | 'groot'` blijft staan voor legacy fallback.
- Beide types geëxporteerd voor Stream B en UI.

#### Commit `ab6ce4d8` — service helpers
- `updateWerkbonAfbeelding` signature uitgebreid van `'grootte' |
  'omschrijving'` naar `'grootte' | 'omschrijving' | 'layout'`. Enige caller
  (`WerkbonDetail.tsx:526` met `{ grootte }`) blijft valide.
- `deriveFromGrootte` returnt exact `{ klein: 33, normaal: 50, groot: 100 }`
  zoals masterplan §2.2 voorschrijft.
- `resolveSchaal` fallback-keten klopt 1-op-1 met masterplan §2.2:
  `afb.layout?.schaal_percentage ?? deriveFromGrootte(afb.grootte) ?? 50`.
- Beide helpers zijn `export function`, beschikbaar voor Stream B en UI.
- Service-layer-Supabase-pad propagiert `updates` rechtstreeks (`.update(updates)`)
  — JSONB-object wordt door supabase-js correct als JSON gemarshaled.
- LocalStorage-pad mergeert op top-level: OK voor fase 1 (UI schrijft `layout`
  altijd als volledig object, niet als patch).
- Defensief lezen via optional chaining voorkomt crashes op rows met
  `layout = {}` of legacy `layout = null` (masterplan §7.2 punt 2).

**Stream A eindoordeel:** AKKOORD-MET-OPMERKINGEN. Klaar voor Stream B —
`resolveSchaal`, `deriveFromGrootte` en `WerkbonAfbeeldingLayout` zijn alle
drie correct geëxporteerd, semantiek matcht masterplan exact, backward-compat
flow is verifieerbaar gedekt.

### Stream C — Mobile fork (2 commits)

| Hash | Subject | Verdict |
|---|---|---|
| `484e4630` | feat(werkbon): add WerkbonMonteurView read-only mobile view (canvas phase 1) | AKKOORD-MET-OPMERKINGEN |
| `d64332ae` | feat(werkbon): route-fork werkbonnen/:id to WerkbonMonteurView on mobile (canvas phase 1) | AKKOORD |

#### Commit `484e4630` — WerkbonMonteurView component
- Nieuwe component is read-only voor header + items: geen
  `onDrop/onDragStart/reorder/Grip/toevoegen`-handlers in items-sectie.
  Item-cards renderen alleen omschrijving, afmeting (mono), notitie en thumbs
  (lightbox-only).
- `WerkbonMonteurFeedback` 1-op-1 hergebruikt met volledige bewerkbaarheid
  (uren / opmerkingen / voor-na fotos / handtekening / afronden).
- `PdfPreviewDialog` lazy-geladen en hergebruikt zoals desktop (zelfde
  `generatePreviewPdf` + `refreshNonce` pattern).
- Fetch-pattern correcte kopie uit `WerkbonDetail.tsx` (regels 154-223):
  klant + project + offerte + werkbon-items + werkbon-fotos + signed-URL
  resolve per afbeelding/foto. Loading- en niet-gevonden-states aanwezig.
- `WerkbonDetail`, `WerkbonHeaderForm`, `WerkbonItemCard`,
  `WerkbonMonteurFeedback` worden niet aangeraakt (geen refactor).
- Design-tokens correct: `#F8F7F5` pagina-bg, card shadow `rgba(0,0,0,0.03)`,
  `rounded-xl`, tekst `#1A1A1A/#6B6B66/#9B9B95`, Flame `#F15025` puntsignature,
  Petrol `#1A535C` voor links, mono voor werkbonnummer + afmetingen, geen
  pill-badges, geen emojis, geen "FORGEdesk".
- Mobile-first padding `px-4 py-4`, `max-w-2xl` center, sticky `pb-32` voor
  monteur-bar.

**Opmerkingen (niet-blokkerend):**
- Anti-pattern `bg-white` 3× gebruikt (regels 364, 373, 459) waar SKILL.md
  expliciet `bg-white` als anti-pattern noemt. Visueel correct (FFFFFF =
  card-token) en consistent met rest van werkbonnen-module (17× elders),
  maar canoniek zou `bg-[#FFFFFF]` zijn.
- `text-muted-foreground` op loading-spinner (regel 311). Niet expliciet
  verboden, maar canoniek zou `#9B9B95` zijn. Triviaal.
- Pre-existing TS-issue `profile?.naam` (regel 238) bestaat ook in
  `WerkbonDetail.tsx:340` — identieke kopie, geen nieuwe schade.

#### Commit `d64332ae` — route-fork in App.tsx
- `useMediaQuery('(min-width: 768px)')` exact analoog aan bestaande
  `WerkbonnenRoute` op regel 113-116.
- `WerkbonMonteurView` lazy-geïmporteerd via dezelfde named-export helper als
  buurcomponenten (regel 118).
- Route `werkbonnen/:id` (regel 277) verwijst naar wrapper-component
  `WerkbonDetailWrapper`, niet inline-conditie.
- Géén andere routes of imports geraakt; minimale 7-regel diff, één concern.

**Stream C eindoordeel:** AKKOORD-MET-OPMERKINGEN. Klaar voor productie-
rollout fase 1 — mobile-fork solide. Aanbeveling tijdens fase-1-acceptatie:
handmatig op telefoon verifiëren dat (a) desktop-link op mobiel automatisch
naar monteur-view forkt, (b) `afgerond`-status correct alle bewerkbare velden
lockt via `readOnly={werkbon.status === 'afgerond'}`.

### Open follow-ups voor fase-1-acceptatiecheck
- `bg-white` → `bg-[#FFFFFF]` consistent maken in werkbonnen-module
  (Stream C cosmetisch, plus 17× elders) — apart cleanup-ticket post-fase-1.
- Migratie-stijl-consistentie: future migrations volgen 113-style
  `BEGIN/COMMIT + DO $$` block — niet-blokkerend, niet retrofitten.
- Pre-existing `profile?.naam` TS-issue: apart fix-ticket, gedeeld met
  `WerkbonDetail.tsx:340`.
- Em-dash in `WerkbonMonteurView.tsx:468` (`{item.omschrijving || '—'}`)
  per memory `feedback_geen_em_dashes` vervangen door punten/komma's of
  laat leeg. Cosmetisch, niet blokkerend.

---

## Werkbon canvas fase 1 — Stream B + D + E + F + G (2026-05-29)

Vervolg op A+C-sectie hierboven. Alle resterende streams op
`feat/werkbon-canvas-fase1` reviewed en gemerged. Build groen na elke merge.

### Stream B — PDF render (1 commit) — Verdict: AKKOORD-MET-OPMERKINGEN
| Hash | Subject |
|---|---|
| `d4e43088` | feat(werkbon-pdf): use schaal_percentage via resolveSchaal + add logo blok render (canvas phase 1) |

- `sizeFor` percentage-based: ≤40 klein 85×64mm, ≤75 normaal 130×98mm, >75
  groot 267×100mm. Map-exact op oude formules bij `contentWidth=267`.
- `hasGroot`-drempel `>=76` dekt zowel `layout.schaal_percentage>=76` als
  legacy `grootte='groot'` via `resolveSchaal`.
- Logo-render: vast 40×40mm rechtsboven in item-block
  (`marginLeft + contentWidth - 40, itemStartY`). Pre-resolve cache pakt
  logos automatisch mee.

**Opmerkingen (niet-blokkerend):**
- `estimatedHeight` negeert logo-only items — bij item met enkel logo
  zonder foto/notitie kan logo bottom-margin schenden bij page-break-edge.
  Lage kans (logos zeldzaam); fase-2-fix overwegen via `hasLogo`-tak.
- Logo overlapt mogelijk lange omschrijving in no-image branch en groot-foto
  rechter-bovenhoek. Bewust geaccepteerd voor fase 1 (vrij plaatsbaar pas
  in fase 3).
- `sizeFor` constanten nu hard-coded i.p.v. afgeleid van `contentWidth/colGap`
  — fragiel bij margin-wijziging. Geen blocker, onderhouds-noot.

### Stream D — Drop & reorder UI (3 commits) — Verdict: AKKOORD-MET-OPMERKINGEN
| Hash | Subject |
|---|---|
| `aa5e6314` | feat(werkbon): add WerkbonDropZone component for per-item file drop |
| `71e5f333` | feat(werkbon): integrate drop-zone + reorder + schaal-via-layout in WerkbonItemCard |
| `646cb813` | feat(werkbon): wire drop handler + reorder + schaal-via-layout in WerkbonDetail |

- DropZone: `image/*` mime-filter, multi-file, dataTransfer-type `'Files'`
  check voorkomt false-positive op interne reorder-drags. Absolute overlay
  (geen layout-shift). Dashed flame border `#F15025` + cream-bg overlay.
- Reorder: HTML5 native `draggable`, custom mime `text/afb-id`,
  `e.stopPropagation()` voor drop-isolatie. Volgorde persistent via
  `layout.volgorde` (Stream A's types uitgebreid). `getWerkbonAfbeeldingen`
  sorteert op `layout.volgorde ?? MAX_SAFE_INTEGER` daarna `created_at`.
- Schaal-toggle: read via `resolveSchaal` → klein/normaal/groot mapping,
  write **uitsluitend** `layout.schaal_percentage` (33/50/100), nooit meer
  `grootte` (per masterplan v1.1).
- Drop-handler: hergebruikt resize/sanitize/upload-flow met
  `sanitizeStorageFilename`. Nieuwe afbeeldingen krijgen
  `layout: { blok_type: 'foto' }` als fase-1-default.

**Opmerkingen (afgehandeld of niet-blokkerend):**
- 2-cap niet afgedwongen bij drop → **afgehandeld in Stream F**.
- Reorder N-writes geen rollback bij failure tweede call — N=2 max, impact
  klein voor fase 1.
- Reorder-semantiek "dragged altijd vóór target" — handmatig valideren in
  acceptatie-test.
- `disabled` op DropZone niet gebonden aan `status === 'afgerond'` — bestaand
  pre-canvas patroon (afgeronde werkbon = alles bewerkbaar in editor). Buiten
  scope.

### Stream E — Logo/foto pill toggle (1 commit) — Verdict: AKKOORD
| Hash | Subject |
|---|---|
| `0a071695` | feat(werkbon): add logo/foto blok-type pill toggle on image thumbnail |

- Pill `absolute top-1 right-1 z-10` rechtsboven op thumb, altijd zichtbaar.
- Foto-state: `bg-white/80`, `text-[#9B9B95]`, geen border, label `FOTO`.
- Logo-state: `bg-[#FFFFFF]`, `text-[#F15025]`, `border-2 border-[#F15025]`,
  label `LOGO`. Font-mono 10px uppercase tracking-wider.
- Klik flipt `layout.blok_type`, bewaart bestaande layout-velden
  (`schaal_percentage`, `volgorde`) via spread. `e.stopPropagation()` vermijdt
  lightbox-trigger.
- WerkbonMonteurView.tsx ongewijzigd (rendert eigen thumbs zonder
  WerkbonItemCard) — toggle verschijnt automatisch niet op monteur-view.
- Sluit logo-UI-gat uit QAA-rapport.

### Stream F — 2-image cap op drop (1 commit) — Verdict: AKKOORD
| Hash | Subject |
|---|---|
| `0acdbf5d` | fix(werkbon): enforce 2-image cap on drop handler (canvas phase 1) |

- `handleAfbeeldingenDropped` checkt `huidigAantal = item.afbeeldingen.length`,
  `beschikbaar = max(0, 2 - huidigAantal)`. Vol → `toast.error('Max 2
  afbeeldingen per item')` + return.
- Anders: `slice(0, beschikbaar)` + `toast.info(N overgeslagen)` bij
  partial-acceptatie.
- `useCallback`-deps uitgebreid met `werkbonItems` (voor lookup).

### Stream G — Feature-flag `werkbon_canvas_versie` (3 commits) — Verdict: AKKOORD
| Hash | Subject |
|---|---|
| `5ef66b33` | feat(werkbon): add werkbon_canvas_versie feature-flag column (migration 115) |
| `c621d79b` | feat(werkbon): gate mobile monteur-view behind werkbon_canvas_versie flag |
| `84a86139` | feat(werkbon): gate drop + reorder + logo-toggle behind werkbon_canvas_versie flag |

- **Tabel:** `app_settings.werkbon_canvas_versie INT NOT NULL DEFAULT 0`
  (per-org via bestaande RLS migratie 112). Default 0 = veilige rollback.
- **Context:** `AppSettingsContext.werkbonCanvasVersie` via `useAppSettings()`.
- **Gating-strategie:** UI-affordances gegate bij `versie === 0`,
  render-paden NIET gegate (data canonical). Werkbon met `layout.blok_type=
  'logo'` rendert correct ook bij flag=0 — rollback-veilig.
- **Niet gegated:** `resolveSchaal`/`deriveFromGrootte` (backward-compat),
  PDF logo-render, migratie zelf, klein/normaal/groot toggle (pre-canvas).
- **Wel gegated:** App.tsx mobile-fork (val terug op `WerkbonDetail` op
  mobiel bij flag=0), `WerkbonDropZone` disabled, logo-pill verborgen,
  `draggable={canvasActief}` op thumbnails, drie WerkbonDetail-handlers
  vroege-return.

**Productie-rollout-stappen voor Antony:**
1. Migratie 114 + 115 handmatig draaien in Supabase SQL Editor.
2. Default flag=0 → app gedraagt zich identiek aan pre-canvas. Verifieer.
3. Per org activeren via Supabase:
   `UPDATE app_settings SET werkbon_canvas_versie = 1 WHERE organisatie_id = '<jouw-org-uuid>';`
4. Test eigen org ⩾ 1 week per masterplan §8.1 stop-gate.
5. Rollback indien nodig: `UPDATE ... SET werkbon_canvas_versie = 0` — geen
   deploy.


---

## Werkbon canvas fase 3 — `feat/werkbon-canvas-fase3` (2026-05-30)

Branch geforked van fase 2 (lokaal getest, niet gemerged). Fase 2 expliciet
gedropt; `pdfToImage.ts` + PDF-drop-tak zijn al in deze branch aanwezig en
worden hergebruikt.

| Commit | Stream | Onderwerp |
|---|---|---|
| `781218c0` | A3 | types-extension + constants + migratie 116 (`COMMENT ON COLUMN`) |
| `d5b90118` | B3+C3 | WerkbonCanvas + WerkbonCanvasElement (gecombineerd: tight coupling) |
| `aa079038` | B3+C3 review-fix | Backspace-delete, z_index-fallback, NW-resize clamp |
| `568f4e8e` | D3 | PDF coord-render + per-item-router in `werkbonPdfService` |
| `d2555e86` | D3 review-fix | textEstimate 40→65mm, `heeftCanvasCoords` parity, logo-default |
| `290b6b13` | E3 | WerkbonItemCard fase3-router + WerkbonDetail canvas-handlers + 2-cap weg |

**Senior-review-uitkomsten:**
- A3: AKKOORD (3 niet-blokkerende stijl-opmerkingen, alle out-of-scope)
- B3+C3: AKKOORD-MET-OPMERKINGEN → 3 bugs + 2 cleanups gefixt in `aa079038`
- D3: AKKOORD-MET-OPMERKINGEN → 3 punten gefixt in `d2555e86`
- E3: AKKOORD-MET-OPMERKINGEN → punten niet-blokkerend, hieronder gelogd

**Open niet-blokkerende opmerkingen (uit E3-review):**

1. **Soft-cap toast-copy passief.** `${totaal} elementen op het werkblad. Veel
   elementen kan de preview vertragen.` is descriptief, niet actief. Per
   project-feedback `feedback_ui_copy_actief.md` mag actiever, bv. "Werkblad
   raakt vol · preview kan traag worden bij ${totaal} elementen." Niet
   gefixt om scope te bewaken.
2. **Cascade-overlap bij bestaande elementen.** `cascadeIndex = nieuweAfbeeldingen.length`
   start altijd op (5,5) mm voor de eerste van een drop-batch. Bij een canvas
   dat al een element op (5,5) heeft, overlapt het nieuwe element. By-design
   voor V1 (gebruiker rangschikt zelf verder); polishing later overwegen via
   `huidigAantal + nieuweAfbeeldingen.length` of slot-based vrije-plaats-zoeker.
3. **Code-duplicatie handleCanvasElementMove vs Resize** (~95% identiek). Per
   project-regel "refactor niet tenzij gevraagd" laten staan.
4. **PDF estimatedHeight pessimistisch.** 65mm tekstblok-schatting betekent dat
   één canvas-item nooit met een ander item op één pagina past. By-design per
   masterplan §8.3.

**Architectuur:**

- **A3-contract** = single source of truth voor canvas-werkruimte/snap/z-index.
  B3 (editor sort), C3 (clamp + snap), D3 (PDF z-sort) importeren alle drie
  uit `src/utils/werkbonCanvas.ts`. Helper `heeftCanvasCoords` is de
  canonieke check voor "rendert via coord-pad".
- **Drop-zone nesting** in fase 3: buitenste `WerkbonDropZone` (item-card)
  is `disabled` zodra `fase3Actief`, binnenste drop-zone in `WerkbonCanvas`
  vangt de file-drop. Geen dubbele events.
- **State-eigenaarschap canvas** (per spec deliverable):
  - selectie-id → `WerkbonCanvas` (één per item)
  - transient drag/resize → `WerkbonCanvasElement` (per-element pointer-state)
  - scale (px/mm) → `WerkbonCanvas` via `ResizeObserver`, doorgegeven aan elementen
  - DB-writes → `WerkbonDetail` via `updateWerkbonAfbeelding` met layout-spread
- **PDF coord-mapping 1:1**: `contentWidth=267mm` (297-15-15) matcht exact
  `CANVAS_WERKRUIMTE_MM.breedte`. Element op `(x_mm, y_mm)` rendert op
  `(marginLeft + x_mm, canvasY + y_mm)`. Geen schaling-rekenfouten.

**Mobile**: `WerkbonMonteurView` is read-only en gebruikt
`generateWerkbonInstructiePDF` direct. D3 coord-render werkt automatisch
voor mobile zonder code-wijziging.

**Productie-rollout-stappen voor Antony:**

1. Pull `feat/werkbon-canvas-fase3` lokaal, `npm run build` groen.
2. Draai migratie 116 in Supabase SQL Editor (alleen `COMMENT ON COLUMN`,
   geen schema-wijziging, idempotent).
3. Default flag=2 of lager → app gedraagt zich identiek aan fase 2. Verifieer.
4. Eigen org activeren via Supabase:
   `UPDATE app_settings SET werkbon_canvas_versie = 3 WHERE organisatie_id = '<jouw-org-uuid>';`
5. Manuele test-checklist per masterplan §7.4 fase 3:
   - Drag-anywhere positie persistent
   - Z-index logica klopt — logo bovenop foto
   - Snap-to-grid 5mm voelt prettig
   - Vrije positie blijft binnen pagina-grenzen (geen overflow naar buiten margin)
   - Bestaande flow-werkbonnen blijven 100% identiek renderen (test met org op versie<3)
   - Mix: één item flow-based, ander vrij geplaatst, beide op dezelfde werkbon
6. Test eigen org ≥ 2 weken per masterplan §8.4 stop-gate voor breder rollout.
7. Rollback indien nodig:
   `UPDATE app_settings SET werkbon_canvas_versie = 2 WHERE organisatie_id = '<uuid>';`
   Canvas-data blijft in DB (`layout.canvas_x_mm` etc.) maar wordt genegeerd
   door render-pad — geen data-verlies.

### Fase 3 bug-fixes — `feat/werkbon-canvas-fase3` (2026-05-30)

Twee bugs uit Antony's lokale test gefixt na fase-3-merge-prep:

| Commit | Bug |
|---|---|
| `4ab8df54` | Selectie-frame om bounding-box i.p.v. visible image (object-contain letterbox) |
| `55dedef4` | Lege eerste PDF-pagina door over-conservatieve textEstimate=65mm |

**Open opmerkingen uit gate-review:**

1. **Bestaande canvas-items met hardcoded 80×60 mm.** Items die in Antony's
   eigen test-org gemaakt zijn vóór `4ab8df54` houden de oude bounding-box
   en tonen nog het letterbox-frame. Per `feedback_geen_silent_data_mutations`
   geen automatische backfill. Opt-in fix: gebruiker verwijdert (X-knop) en
   dropt opnieuw — nieuwe element krijgt de juiste ratio. Geen blocker voor
   merge.
2. **`deriveCanvasSize` defensive guard.** Helper accepteert nu `ratio` van
   één caller (`getImageBlobRatio` die zelf guard't op `r > 0 && Number.isFinite`).
   Bij toekomstig hergebruik door andere callers zou een interne guard
   `if (!(ratio > 0) || !Number.isFinite(ratio)) ratio = 1` de helper
   standalone-safe maken. 3 regels werk, niet kritiek.
3. **`maxH`-clamp in `deriveCanvasSize` is dode tak** voor huidige
   target-waarden (80mm < 90mm). Cosmetisch.
4. **`textEstimate` overshoot 4mm op omschrijving-deel** (8 base-pad vs.
   4 in renderTekstBlok). Mirror-fout, maar veilig kant op: leidt tot iets
   conservatievere estimate, geen clipping risico.

---

## Daan offerte vullen (stap 4b) — gate-review `feat/daan-offerte-fill`

**Verdict:** AKKOORD-MET-OPMERKINGEN (geen blokkades). RLS/org correct (offerte_items
isoleert via parent-offerte, migratie 057; geen migratie nodig), fill draait
client-side onder de ingelogde sessie, geen dubbele fill, bedragen kloppen ook bij 9%.

**Open opmerkingen uit gate-review:**

1. **Offerte-totalen-roll-up: 1 van 6 call-sites geconverteerd.** `berekenOfferteTotalen`
   (`src/utils/offerteTotalen.ts`) vervangt alleen de autosave-roll-up in
   `QuoteCreation.tsx` (~r.1038). Dezelfde inline formule staat nog op ~r.426-437,
   1229-1239, 1355-1356, 1384-1385 en 1564-1565. Geen drift nu (gedrag identiek aan
   main, bewezen door `tests/utils/offerteTotalen.test.ts`), maar wel toekomstig risico:
   een wijziging in de util raakt die sites niet. Apart commit (buiten 4b-scope) om ze
   te laten landen. ⚠️ De PDF-variant (~r.1564) gebruikt bewust géén `urenCorrectieBedrag`
   — niet zomaar samenvoegen.
2. **Test-gat (triviaal):** geen test op negatieve `urenCorrectieBedrag` of de
   `rawSub === 0` → 0.21-fallback-tak. Eén regel werk, laag risico.
3. **Half-gevulde offerte bij fout halverwege** (`vulOfferteMetCalculatie`, gemengde BTW,
   tweede item faalt): één item + totalen nog 0; `DaanActiePlan` toont "Offerte vullen
   mislukt" (failedType='offerte'), de skeleton-offerte blijft staan. Geen data-corruptie;
   acceptabel voor v1 — gebruiker loopt 'm na in de editor. Geen RPC/transactie beschikbaar.
4. **Beschrijving-fallback** (`offerteService.ts`, `product_naam.join(' + ')`) kan lang
   worden bij veel regels in één tarief. Cosmetisch.

---

## Mail-composer + cron storagePath + project status-flow (akkoord-klant / ingepland) — 2026-06-02

GATE-REVIEW senior-backend-reviewer: **AKKOORD-MET-OPMERKINGEN** (geen blokkades).

1. **Geplande "Opvolgen" landt niet in Wacht-tab.** `ingeplande_berichten` slaat
   `wacht_op_reactie` niet op (insert in `api/send-email.ts`), en de cron-`emails`-insert
   (`api/cron-verzend-geplande-berichten.ts`) laat het veld weg. De directe route zet het wel
   + draait de Sales-Inbox "vervangen-niet-stapelen". Geplande opvolging werkt dus nog niet
   end-to-end. Bekende beperking (gepland-pad is nieuw, geen regressie).
2. **Inline base64-afbeeldingen → CID niet geconverteerd in de cron** (`:139`), anders dan
   `api/send-email.ts:259-276`. Geplande mails met geplakte afbeeldingen kunnen groot/afgewezen
   worden. Pre-existing, nu relevanter doordat de composer rijkere content stuurt.
3. **Re-send risico bij cron (pre-existing):** volgorde sendMail -> status='verzonden' ->
   emails-insert. Faalt de status-update na geslaagde sendMail, dan opnieuw verzonden bij
   volgende run. storagePath maakt mails zwaarder/trager -> iets hogere timeoutkans.
   Overweeg: status flippen vóór sendMail, of idempotency-guard.
4. **Dubbele goedkeur-logica** in `ForgeQuotePreview` en `OfferteDetail` -> beide naar
   `akkoord-klant`. Allebei alleen-vooruit met dezelfde vanaf-set; geen terugdraai-risico,
   wel logica op twee plekken.

Goed bevonden: storagePath-cleanup veilig (cleanupAfter:false voor projectbijlagen, cron doet
geen remove); migratie 118 idempotent + behoudt alle statussen; api/* blijft standalone;
thread-zichtbaarheid via koppeling (policy 109) correct, koppeling zet organisatie_id.

> Update: opmerking 1 (geplande Opvolgen) opgelost — `wacht_op_reactie` wordt nu
> opgeslagen op `ingeplande_berichten` (migratie 119) en door de cron op de
> `emails`-rij gezet, inclusief de "vervangen-niet-stapelen" Sales-Inbox-logica.

> Update: opmerkingen 2 en 3 opgelost — de cron converteert nu inline base64-
> afbeeldingen naar CID-attachments (gelijk aan api/send-email.ts), en claimt een
> bericht atomair (wachtend -> verwerken, migratie 120) vóór verzenden zodat
> overlappende runs of een gefaalde status-update geen dubbele mail veroorzaken.
- Fase 2a gate-review: AKKOORD na fix 129 (RLS) + redeploy-instructie in commit message. TTL staat op 3 plekken (storageService/groteBijlagen/cleanup-cron) — bij wijziging alle drie aanpassen.
- Fase 2b gate: dedup-fix toegevoegd; restrisico (server verstuurt exact tijdens response-verlies binnen 5min-venster met afwijkend onderwerp) is aanvaard. Echte at-most-once vergt server-side idempotency-keys — kandidaat voor later.
- Fase 1a gate: blokkades 1-3 gefixt (waterlijn alleen bij foutloze upsert; uidvalidity-log; 60s/flags-cap). Blokkade 4 (503 zonder migratie 131) verworpen: fallback is exact het oude productiegedrag, 503 zou mail breken.
- Fase 1b gate: NULL-message_id dedup gefixt. Verworpen: 'upsert reset andere kolommen naar NULL' (PostgREST update't alleen meegestuurde kolommen) en 'setBackfillTarget via serverless endpoint' (client-side RLS-update is het standaardpatroon in deze codebase).
- Eindfase email-outlook (QAA + senior): AKKOORD-MET-OPMERKINGEN. Open punten voor later: observability/metrics op sync-vensters, flags-resync 2-pass voor grote inboxen, TTL-constante op 3 plekken (storageService/groteBijlagen/cleanup-cron), zoeklimiet 50 op 2 plekken. Deploy-volgorde: migraties 129→130→131 in Supabase SQL editor, daarna `npx trigger.dev@latest deploy` (cleanup-cron gewijzigd), dan pas mergen.

## Boekhoudkoppelingen (SnelStart/Moneybird/e-Boekhouden) — fase 0 gate

- Fase 0 gate-review: AKKOORD-MET-OPMERKINGEN. Open punten:
  1. Sync-knop in FactuurEditor is dood (404) zolang fase 1-3 endpoints niet bestaan —
     fase 0 niet los naar productie mergen, of knop extra gaten op token-aanwezigheid.
  2. Fase 1-3 sync-endpoints MOETEN server-side idempotent zijn: eerst
     facturen.boekhoud_extern_id checken vóór aanmaken in het externe pakket
     (sync-knop heeft geen disabled/loading-state, dubbel-klik = twee POSTs).
  3. boekhoud_pakket in save-integration-settings.ts whitelisten op
     ['snelstart','moneybird','eboekhouden', null] — meenemen in fase 1.
  4. Zodra fase 1 de DB-write doet: facturen.boekhoud_pakket (server-side) leidend
     voor de badge, niet settings.boekhoud_pakket.
- Fase 1 (Moneybird) gate: BLOKKADE (cross-org sync via service-role zonder org-check)
  gefixt in a5ec20ce + race-verliezer-detectie via .select('id') op de write-back.
  Open punten: check-then-act race kan nog steeds dubbel boeken in Moneybird zelf
  (alleen DB-state is beschermd); api/exact-sync-factuur.ts heeft hetzelfde org-gat
  én geen 409-idempotency — eigen fix-taak, buiten deze feature; klant-select bug
  in exact-sync (naam i.p.v. bedrijfsnaam) eveneens apart oppakken; pre-existing
  64 TS-errors maken typecheck als gate waardeloos — opruimronde plannen.
- Fase 2 (e-Boekhouden) gate: AKKOORD-MET-OPMERKINGEN. Gefixt in review-commit:
  lookup-fout niet meer stil doorvallen naar relatie-aanmaken; fuzzy-match-fallback
  (kandidaten[0]) verwijderd; sessie-DELETE in ledgers-route nu in finally.
  Open punten voor later: BTW verlegd (VERL_VERK) niet representeerbaar — 0% is
  altijd GEEN, gedocumenteerd in UI-helptekst; creditnota met negatieve regels
  testen tegen echte e-Boekhouden API vóór livegang; ledger-paginatie boven 500;
  NaN-guard op opgeslagen ledger-ids; 429-specifieke melding op mutatie-call.
- Fase 3 (SnelStart) gate: AKKOORD-MET-OPMERKINGEN. Gefixt in review-commit:
  relatiecode-normalisatie (voorloopnullen), 400 bij BTW-verschil > 5 cent
  i.p.v. inconsistent doorboeken, waarschuwing-veld uit sync-response wordt nu
  als warning-toast getoond (dekt alle drie pakketten). Open punten:
  updateAppSettingsOrgFirst heeft geen insert-fallback (bestaand patroon,
  meenemen bij helpers-consolidatie); grootboeken-select ongefilterd tot echte
  response-shape bekend is; SnelStart payload-shapes verifiëren tegen
  Ontwikkeling&Test-administratie vóór livegang + certificering + env var.
- Eindfase-gate boekhoudkoppelingen: QAA groen licht (9/9 criteria, 1 waarschuwing),
  senior AKKOORD-MET-OPMERKINGEN. Na gate nog gefixt: e-Boekhouden exacte-naam-lookup
  bij leeg debiteurennummer (voorkomt duplicaat-relaties), pakket-match-check in alle
  drie sync-routes (400 bij stale client na pakketwissel), dubbelklik-guard +
  spinner op de sync-knop. Open punten (bewust, voor later/Antony):
  status-guard op concept-facturen (productbeslissing), audit-events voor
  boekhoud connect/sync, 400 bij btw_percentage buiten {0,9,21}, 429-melding
  harmoniseren, waarschuwing-pad restrisico (pending-marker vóór externe call zou
  echte fix zijn), encrypted tokens client-leesbaar (zelfde patroon als mollie_api_key).
- Totaalcheck pre-merge: AKKOORD-MET-OPMERKINGEN. Gefixt in review-commit:
  e-Boekhouden naam-lookup faalt nu hard op non-404 (geen stille duplicaat-relatie),
  Moneybird naam-fallback met per_page=100, badge-historie blijft zichtbaar na
  pakketwissel naar "Geen" (badge aan factuur-historie, knop aan actief pakket).
  Restpunt (cosmetisch, gelogd): stale-state race in handleBoekhoudPakketChange
  bij snel dubbel wisselen; ?name=-filter-shape e-Boekhouden onbevestigd tot API-test.
- Post-gate review (5eb1b622 + 11be98fe): AKKOORD-MET-OPMERKINGEN, geen blokkades.
  Exact klant-bugfix bevestigd als centrale fix (geen andere select('naam')-plekken
  in api/). Toegevoegd n.a.v. review: console.error op klant-lookup-fouten in
  exact-sync (stil-falen was de root cause van deze bug). Gelogd: zelfde
  stille-destructure-patroon in andere handlers is een losse opschoontaak;
  per_page=100 is het Moneybird-maximum (geen paginatie, verwaarloosbaar risico).

## Multi-agent audit (42 agents, code + live docs-verificatie) — fixes

- Audit leverde 30 bevestigde bevindingen (5 weerlegd na adversariële verificatie). Gefixt:
  KRITIEK: SnelStart btw-array gebruikte 'Hoog'/'Laag' maar de API eist
  'VerkopenHoog'/'VerkopenLaag' (ander enum dan boekingsregels). HOOG: creditnota-dialoog
  kopieerde geen factuur_items (sync faalde altijd) + server-side teken-guard tegen
  positief boeken; e-Boekhouden naam-lookup matchte op niet-bestaand name-veld in de
  list-response (duplicaat-relatie per sync) — nu server-side [eq]-filter vertrouwen;
  oneindige fetch-retry-loops in de drie config-load useEffects. MIDDEL/LAAG:
  dirty-guard vóór sync (DB-staat vs PDF-mismatch); Moneybird naam-lookup hard-fail;
  e-Boekhouden description ≤50 / name ≤100 / code ≤15 limieten; SnelStart BTW per regel
  afgerond (zoals frontend), grootboek-per-tarief (migratie 133: hoog/laag/onbelast),
  land-lookup matcht nu ook op landnaam (geen NL-forceren), betalingstermijn meegestuurd,
  relatie/boeking-id-guards, grootboeken-paginering ($skip/$top); decryptSecret gooit
  hard op onontsleutelbare blobs (10 routes); item-validatie (NULL-waarden) +
  regelsom/BTW-consistentiechecks in alle drie sync-routes; Moneybird
  administratie-wissel reset ledger/tax-ids; tax_rates per_page=100.
- Bewust niet gefixt (gelogd): e-Boekhouden ledger-select categoriefallback (anders lege
  select bij afwijkende categorie-waarden); e-Boekhouden ledgers >500 (paginering
  onbevestigd in docs); SnelStart creditnota-acceptatie en payload-shapes blijven
  extern te verifiëren tegen O&T-administratie; Moneybird naam-zoek >100 hits.
- Audit-fixes gate-review: AKKOORD-MET-OPMERKINGEN, geen blokkades. Naloop gefixt:
  naam-lookup e-Boekhouden gebruikt nu dezelfde 100-tekens-sleutel als de create.
  Docs-verificatie ?name=-filter: live Swagger api.e-boekhouden.nl/swagger/v1/swagger.json
  (geraadpleegd 2026-06-10) — name-param filtert server-side met default operator [eq]
  ("Only retrieves relations with this (company) name"); rows[].description heeft
  géén maxLength (alleen header-description: 50). Open (laag, gelogd): creditnota
  item-copy loop niet transactioneel (zelfde zwakte als factuurService.createCreditnota);
  rond2-halve-cent-randgeval bij teken-omkering wordt door 5ct-tolerantie gedekt.
- 2026-06-15 — Batch (concept-factuur/verwerken, boekhoud-disconnect, Exact-omschrijving,
  klantstatus inline/bulk, offerte-PDF meesturen, intro/outro-overname, factuur kopiëren/plakken,
  projectlijst-statusfilter persist, factuurdatum-snelknoppen, maatjes galerij-import,
  creditnota-doornummeren #2, factuurregel-detail_regels #4). Twee senior-reviews:
  AKKOORD-MET-OPMERKINGEN, geen blokkades. Gefixt na review: lijst-"Verwerken" gebruikt nu
  de DB-bewuste generateFactuurNummer (was in-memory → duplicaat-risico).
  Open (laag, gelogd):
  (a) Item-edits op een BESTAANDE factuur persisteren niet — handleSave update-tak schrijft
      alleen header-velden, geen factuur_items. Geldt al voor beschrijving/prijs, nu ook voor
      detail_regels. UI suggereert wel bewerkbaarheid op een opgeslagen concept. Pre-existing.
  (b) Asymmetrie nummerreeks: doorgenummerde creditnota pakt nummer direct bij aanmaken,
      reguliere factuur pas bij "Verwerken" (concept = leeg nummer). Een weggegooid
      creditnota-concept laat dus wél een gat, een factuur-concept niet. Bewuste keuze.
  (c) factuurService.createCreditnota (ongebruikt door UI) volgt nog de harde CN-reeks,
      niet de creditnota_doornummeren-setting. Latente valkuil als die service ooit vanuit
      UI gebruikt wordt.

## 2026-07-08 — feat/portaal-cx (portaal-CX-overhaul, senior review)

Verdict na review-fix: AKKOORD-MET-OPMERKINGEN. Blocker (org-settings-lookup
zonder order/limit + org-resolutie via maker-profiel) en 4 opmerkingen
(bericht-default server-side, notificatie-type, verloopt_op-inkorting,
from-header-quoting) gefixt in "fix(review)". Resterende opmerkingen:

  (a) PortaalFeedItemTekening: de "Ja, revisie"-confirm post type 'revisie'
      zonder bericht en krijgt altijd 400 (bericht verplicht) — pre-existing,
      nu wel zichtbaar via de nieuwe feedbackregel. Nette fix: berichtveld in
      de revisie-confirm opnemen, of revisie via het inline-formulier laten
      lopen met type 'revisie'.
  (b) mollie-webhook betaalbevestiging toont het laatst betaalde bedrag, niet
      het factuurtotaal — bij deelbetalingen cosmetisch verwarrend.
  (c) Betalen vanuit de portaal-feed vereist nog een vooraf gezette
      mollie_payment_url; betaal_token wordt bewust niet via het portaal-pad
      teruggegeven (kortere link-TTL). Online betalen vanuit de feed zonder
      voorbereide URL is een productbeslissing (token-exposure vs. gemak).
  (d) Klantgerichte voortgangstijdlijn in het portaal (stepper i.p.v. alleen
      status-label) bewust niet gebouwd — nieuw visueel ontwerp, eerst
      hero-checkpoint met Antony.

## 2026-07-08 — feat/mail-verbeteringen (mail-audit, senior review)

Verdict na review-fix: AKKOORD-MET-OPMERKINGEN. Blockers gefixt in
"fix(review)": migratie hernummerd 141→149; cron valt niet meer terug naar een
lagere herinneringsstap na een handmatig verstuurde hogere stap (+ aanmaning in
de cool-down); deelbetalingen worden verrekend (openstaand bedrag in de mail,
skip bij 0); nieuwste app_settings-rij per org is leidend zodat de uit-toggle
een echte kill-switch is; vlag wordt ook bij idempotency-skip gezet. Extra:
vangnet voor geïmporteerde facturen (>180d zonder eerdere herinnering = skip).

Resterende opmerkingen (bewust open):
  (a) SendOfferteDialog maakt het portaal-item aan vóór de e-mailverzending;
      bij een mislukte send ziet de klant het item dus al in het portaal
      terwijl de offerte op concept blijft. Nette fix: item pas na geslaagde
      send aanmaken (herordening met dedupe-risico — aparte klus).
  (b) Composer-bijlagen zitten niet in de draft-autosave en gaan nu verloren
      bij sluiten (voorheen overleefden ze sluiten binnen dezelfde mount).
  (c) List-Unsubscribe is een mailto: naar het reply-adres — auto-unsubscribe
      -bots mailen dan de ondernemer. Echte unsubscribe-endpoint = vervolgwerk.
  (d) De send-retry in offerte-opvolging retryt ook permanente fouten (bv.
      ontbrekende SMTP-instellingen) met een nutteloze 5s-wachttijd.
  (e) DEPLOY-VOLGORDE: eerst migratie 149 draaien, dan deployen — de
      Factuur-opvolging-instellingentab schrijft de nieuwe kolom bij elke save.
  (f) Markdown in de projectcomposer rendert nu echt (** _ __ - [](url)) —
      wie letterlijke sterretjes typte krijgt nu opmaak.

Groter vervolgwerk uit de audit (niet gestart): server-side inbound-sync-cron,
composer-consolidatie naar één editor, design-eiland mailmodule (dark-mode
fork) — designkeuze voor Antony, open/klik-tracking in het verzendpad,
consolidatie van de drie factuur-template-opslagplaatsen (cron gebruikt nu
bewust dezelfde bron als de instellingen-tab; de handmatige dialog gebruikt
nog herinnering_templates).

## 2026-07-09 · fix/offerte-create-hardening · detail-regels placeholder-fix (dba909ab + 2fa684aa)

Senior review AKKOORD-MET-OPMERKINGEN na eerdere BLOKKADE (id-botsing gefixt
met index+slug). Opmerkingen:
  (a) Slug-identieke maar string-verschillende labels ("Lay-out"/"Lay out")
      op dezelfde index konden in theorie nog botsen met een gematerialiseerde
      rij — dichtgezet met een seenIds-check op placeholder-ids in
      getDetailRegels (meegenomen in de Fase A-serie).
  (b) RegelTemplateEditor.handleApply geeft t.labels ongesaneerd door aan
      onApplyTemplate; gedekt doordat de leeskant (handleApplyTemplate +
      QuoteItemsTable) saneert. Alleen relevant als er ooit een nieuwe
      apply-callsite bijkomt.
  (c) Vervuilde _hidden_labels-strings uit de oude bug blijven in de DB staan;
      vermoedelijk onschadelijk. Checken als er "verdwenen rijen"-meldingen
      komen.

## 2026-07-09 · fix/offerte-create-hardening · Fase A (40944ba6, 942aca61, 3c170c6f)

Senior review AKKOORD-MET-OPMERKINGEN. Opmerkingen:
  (a) Ingeplande offerte-mail zet de offerte direct op "verzonden" met
      verstuurd_op in de toekomst; als de cron faalt of het geplande bericht
      geannuleerd wordt is er geen terugkoppeling naar de offerte-status.
  (b) 400-melding van de send-email API werd generiek getoond — direct
      gefixt: servermelding wordt nu doorgegeven in de toast.
  (c) Pre-existing: pdfService r842-859 toont "Subtotaal" (incl. korting) én
      een aparte regel "Afrondingskorting" — visueel telt de som niet op.
      Centrale fix hoort in pdfService, apart oppakken.

## 2026-07-09 · fix/offerte-create-hardening · Fase C render-performance (uitgesteld)

Taak "performance QuoteCreation" is deels gedaan (toOfferteItemPayload-helper,
gedeelde offerteTotalen-util incl. getActievePrijsRegel/berekenRegelTotaal).
BEWUST NIET in deze branch: QuoteItemRow-extractie + React.memo + useCallback op
alle item-handlers + useOfferteTotalen-hook.

Reden: dat is een ~700-regel JSX-verplaatsing per item met drag/drop-reorder,
focus-beheer, autofill, prijsvariant-UI, inkoop-drag-drop en bijlage-upload.
React.memo levert pas winst als álle ~30 callbacks gestabiliseerd zijn; fout
gedrag (focus-verlies bij typen, kapotte drag/drop, stale closures) is niet via
build/unit-tests te vangen en vraagt handmatige in-app-verificatie met echte
data. Los oppakken op een eigen branch met /verify-doorloop. Perf-issue is
merkbaar (re-render bij elke toetsaanslag) maar geen correctness-bug.

## 2026-07-09 · fix/offerte-create-hardening · Onafhankelijke review (2 agents) — geverifieerde restpunten

Correctness- en missed-callsites-review over de hele branch. Direct gefixt in
commit 0ee038ca: ProjectOfferteEditor variant-regressie (velden read-only bij
varianten), ingeplande-mail zet offerte niet meer op verzonden met toekomstige
verstuurd_op, syncOfferteItems lege-array guard, OfferteDetail-duplicate kopieert
alle velden, null-guard op detail_regels-opschoning. Ook meegenomen: contact-
autofill overschreef bij openen het geladen contact (→ vals conflict), round2
dode import weg.

BEWUST NIET auto-gefixt (pre-existing, buiten scope van deze branch — geldmath
richting klant/factuur of risicovolle wijziging die in-app verificatie vraagt).
Aanbevolen als losse taken, met Antony's akkoord:

  (a) FactuurEditor factuur-uit-offerte (FactuurEditor.tsx ~484-498/576-591,
      790-793): negeert offerte.afrondingskorting_excl_btw én uren_correctie, en
      rekent met basisprijs i.p.v. actieve prijsvariant. €995-offerte → €1000-
      factuur. Vraagt productkeuze: wordt een correctie een factuurregel?
  (b) OffertePubliekPagina.tsx:505-507: bij optionele items/varianten valt de
      afrondingskorting uit het klant-totaal terwijl de kortingsregel wél getoond
      wordt. Klant ziet inconsistent bedrag. Vrij contained te fixen.
  (c) OfferteDetail.tsx:585-593: itemtabel toont totaal berekend uit álle items
      (geen is_optioneel-filter, geen afronding/urencorrectie) → wijkt af van het
      opgeslagen offerte.totaal. Beter: gewoon offerte.totaal tonen.
  (d) syncOfferteItems churnt item-ids bij elke autosave → offerte.gekozen_items/
      gekozen_varianten (OffertePubliekPagina) en Werkbon.offerte_item_id worden
      dode refs. Klant-keuzes lijken leeg na een edit. Echte fix = id-behoudende
      upsert in syncOfferteItems (update-by-id voor bestaande UUID's, insert voor
      new-*), maar dat is kritiek-pad persistence → eigen branch + /verify.
  (e) syncOfferteItems insert-before-delete: als de delete faalt ná geslaagde
      insert blijven dubbele rijen staan (zichtbaar bij factuur-conversie). Lage
      kans; opgeruimd bij volgende save. Bewuste trade-off tegen "0 items".
  (f) Gedeeld klembord + telItemsMetBijlage: item met bijlage plakken in offerte
      B (nog niet opgeslagen), daarna bijlage in origineel verwijderen → telt
      alleen DB-refs → bestand weg → gebroken link in B na autosave. Smalle race.
  (g) QuoteSidebar eigen totaalformule kan 1 cent afwijken van berekenOfferte-
      Totalen tijdens typen. Cosmetisch.

## 2026-07-09 · fix/offerte-create-hardening · Vervolgpunten a/b/c/d opgelost (op verzoek Antony)

De eerder gelogde restpunten zijn alsnog aangepakt:
  (b) OffertePubliekPagina: afrondingskorting nu meegenomen in het live klant-
      totaal bij selecties (6dab8285).
  (c) OfferteDetail: toont opgeslagen offerte-totalen als bron van waarheid,
      BTW-uitsplitsing variant-bewust + excl. optioneel (6dab8285).
  (a) FactuurEditor: factuur-uit-offerte gebruikt actieve variant + correctie-
      regel "Afronding / correctie" zodat subtotaal = offerte.subtotaal (c7c06f2f).
  (d) syncOfferteItems: id-behoudende upsert (update-by-id voor bestaande UUID's,
      insert voor new-*, delete verwijderde). partitionOfferteItemSync pure helper
      + 7 unit-tests (cdccc9a5).

RESTERENDE bekende beperkingen (klein/bewust, niet gefixt):
  - Bredere subtotaal/BTW-lijn-reconciliatie op OffertePubliekPagina in de NIET-
    selectie-tak (offerte.subtotaal bevat de korting al terwijl de kortingsregel
    apart staat) — vraagt een layout-herziening + visuele verificatie. Alleen de
    selectie-tak-total is nu gefixt.
  - FactuurEditor correctieregel gebruikt één gewogen BTW-tarief; bij gemengde
    tarieven kan de factuur-BTW een cent afwijken van offerte.btw_bedrag.
  - syncOfferteItems insert/upsert-vóór-delete blijft niet-transactioneel; bij
    een falende delete blijven dubbele rijen staan tot de volgende save.
  - Cross-tab item-sync race (twee gebruikers <2s) blijft mogelijk.

VERIFICATIE-VERZOEK: de syncOfferteItems-upsert (kritiek-pad persistence) is
build+unit-getest maar niet tegen live Supabase gedraaid. Antony: test in-app
de flow bestaande offerte openen → item wijzigen → opslaan → herladen (id's
moeten gelijk blijven), item toevoegen (vers id), item verwijderen, en een
klant-keuze die een offerte-edit overleeft.

## 2026-07-09 · fix/offerte-create-hardening · Accept-endpoint schrijft geaccepteerde config terug (69826d0e)

Review-finding 1 (klant kiest optie/variant → detail & factuur toonden het
standaardbedrag) opgelost aan de bron: api/offerte-accepteren.ts materialiseert
bij acceptatie mét keuzes de gekozen configuratie op de items (gekozen optioneel
→ is_optioneel=false, gekozen variant → actieve_variant_id, regel-totaal
bijgewerkt) en herberekent offerte.subtotaal/btw_bedrag/totaal met dezelfde
formule als berekenOfferteTotalen, met behoud van de correctie (afrondings-
korting + urencorrectie) als lump. Sluit de loop:
  - OfferteDetail toont nu het geaccepteerde bedrag (leest offerte.subtotaal/
    totaal + variant-bewuste btwGroups over de gematerialiseerde items).
  - FactuurEditor factureert de gekozen optionele items (nu is_optioneel=false)
    tegen de gekozen variant, en reconcilieert op offerte.subtotaal.
Offertes zónder opties/varianten worden niet aangeraakt (guard).

VERIFICATIE-VERZOEK (kritiek, niet live getest): draai de flow publieke offerte
met optionele items + varianten → klant kiest afwijkend van default → accepteren
→ controleer dat offerte.totaal = wat de klant zag, dat de detailpagina dat toont
en dat "Maak factuur" de gekozen items/variant bevat.

Kleine open punten (bewust): correctie-lump draagt over naar een door de klant
gewijzigde config (afrondingskorting was op de default berekend); en de
gewogen-BTW-benadering op de factuur-correctieregel kan een cent afwijken bij
gemengde tarieven.

## 2026-07-09 · fix/offerte-create-hardening · Accept-total exact + open BTW-beslissing (cb248a0f)

Adversariële review vond dat mijn eerste accept-herberekening de EDITOR-formule
gebruikte (BTW over de afrondingskorting + urencorrectie meegeteld), terwijl de
klant op de publieke pagina een ANDER getal ziet. Gefixt (cb248a0f):
berekenGeaccepteerdeTotalen reproduceert nu regel-voor-regel het publieke-pagina-
totaal → offerte.totaal = exact wat de klant accepteerde. Correctie-lump-aanname
(review-finding 2) verwijderd.

ROOT-CAUSE die nog speelt (pre-existing, twee formules in de codebase):
  - Editor/berekenOfferteTotalen: afrondingskorting verlaagt de BTW-grondslag
    (BTW over subtotaal ná korting).
  - Publieke pagina + nieuwe accept-formule: afrondingskorting plat ná de BTW
    (geen BTW erover); urencorrectie niet zichtbaar.

Gevolg — twee kleine restinconsistenties, WACHT OP BESLISSING Antony (BTW-
behandeling afrondingskorting) voordat ik ze fix:
  1. FactuurEditor correctieregel gebruikt gewogen BTW → factuur kan ~ (BTW ×
     afrondingskorting), meestal < €1, afwijken van het geaccepteerde totaal bij
     offertes mét opties én afrondingskorting.
  2. OfferteDetail BTW-uitsplitsing (per item, rauw) telt met subtotaal niet
     exact op tot het opgeslagen totaal bij offertes met afrondingskorting
     (verkoper-zichtbaar, ~cent-niveau).

PROMINENT AANDACHTSPUNT: urencorrectie wordt bij acceptatie van een offerte MÉT
klant-keuzes weggelaten (want de publieke pagina toont hem niet, dus de klant
gaf er geen akkoord op). Verkopers die urencorrectie + klant-selecteerbare opties
combineren verliezen die correctie stil. Echte oplossing = urencorrectie ook op
de publieke pagina tonen (vereist opslag van het euro-bedrag) — apart traject.

### Beslissing Antony (2026-07-09): afrondingskorting-BTW nuance NIET nu fixen
Het verschil (< €1, alleen bij offertes met opties én afrondingskorting) blijft
als bekende beperking staan. FactuurEditor-correctieregel en OfferteDetail-BTW-
uitsplitsing worden nu niet aangepast. Later oppakken samen met het gelijktrekken
van de editor- vs publieke-pagina-totaalformule.

## feat/mollie-billing — senior review opmerkingen (12 jul 2026)

Blokkades B1/B2/B3 en M1 zijn gefixt in "fix(review)"-commit. Openstaand:
  (a) M2: Mollie stuurt géén webhook als een subscription zelf eindigt
      (dashboard-cancel, mandaat ingetrokken zonder chargeback) — org blijft
      dan onbeperkt actief zonder incasso's. Vervolgwerk: dagelijkse
      reconciliatie in cron-trial-expiration die voor orgs met een echt
      mollie_subscription_id de status bij Mollie GET en niet-actieve
      subscriptions afhandelt.
  (b) Billing-kolommen op organisaties zijn client-writable (pre-existing,
      policy uit migratie 085 zonder WITH CHECK): elk org-lid kan zelf
      abonnement_status/is_betaald/mollie_* zetten = billing-bypass.
      Hoort bij de security-sprint (kolom-grants of trigger, service_role
      only).
  (c) Elk teamlid kan het abonnement opzeggen (alleen lidmaatschap-check,
      consistent met productfilosofie); eventueel eigenaar-check overwegen.
  (d) Restrisico: bij een stale pending-claim + twee gelijktijdige retries
      van twee verschillende betaalde eerste betalingen kan in theorie een
      dubbele subscription ontstaan (verschillende Idempotency-Keys); de
      reconciliatie uit (a) vangt dit op.
Her-review 0dcf9217: AKKOORD-MET-OPMERKINGEN. Aanvullend gelogd:
  (e) Sentry-warning "Dubbele eerste abonnementsbetaling zonder activering"
      vuurt ook bij een onschuldige duplicate delivery ná geslaagde
      activering (alert-ruis). Fix t.z.t.: in het skip-pad org-status
      checken en alleen warnen bij status ≠ actief.
  (f) Re-subscribe tijdens de betaalde uitloopperiode (opgezegd-pending)
      incasseert per direct een volle maand die overlapt met de uitloop.
      Laag risico; bewuste keuze of startDate opschuiven bij vervolgronde.
  (g) GEFIXT direct na review: cancel-subscription behandelt subscriptions
      met Mollie-status canceled/completed/suspended nu als niet-bestaand
      (voorheen 502-loop door DELETE→422).

Branch fix/lead-mail-handtekening-en-prompt (leadmail: handtekening, prompt,
startstatus). Twee reviews, beide AKKOORD-MET-OPMERKINGEN. Gefixt tijdens de
branch: $-expansie in de prompt-substitutie, placeholder die de prompt
tegensprak, niet-idempotente UPDATE in migratie 154, en composeLeadId dat
bleef hangen na annuleren of via de compose-deeplink. Restpunten:
  (a) EmailCompose.tsx:224 zet defaultBody ongeescaped in innerHTML. Via de
      deeplink /email/compose?body=<img src=x onerror=...> is dat XSS in de
      app-origin. Pre-existing, verdient een eigen commit: escapen voor de
      \n-naar-<br>-conversie.
  (b) De aanwijzing bij "Schrijf opzetje" gaat ongefilterd de prompt in en kan
      de guardrails overschrijven. Eigen invoer, eigen budget, dus geen
      privilegegrens; wel output die naar externe bedrijven gaat.
  (c) benaderdeLeadId wordt nooit gereset, dus hetzelfde signaal twee keer
      geeft geen effect-run. Alleen zichtbaar als je een lead handmatig
      terugzet op nieuw en opnieuw mailt: de lijst toont dan nieuw terwijl de
      DB benaderd zegt, tot een refetch. Oplossing: signaal als {id, ts}.
  (d) Bij een ingepland bericht springt de lead direct op benaderd terwijl de
      mail nog niet verstuurd is. Bewuste keuze, heroverwegen als inplannen
      vaker gebruikt gaat worden.
  (e) LeadsPaneel geeft de leadId via een losse setter na handleCompose. Op
      mobiel zou viewTransition die volgorde omdraaien; nu onbereikbaar omdat
      de mailknoppen desktop-only zijn (hidden md:flex). Fragiel zodra er een
      mobiele mailknop bij komt.
  (f) CLAUDE.md verwijst naar .claude/skills/doen-design/SKILL.md voor visuele
      wijzigingen, maar die map bestaat niet in de repo.

## Activatie-ronde first-login (2026-07-24)

Context: 5 commits (f71feed1..33394790) — mijlpalen, dashboard/module-empty-
states, Daan-FAB, eerste-view-notificatie. Verdict was BLOKKADE op de race in
`api/offerte-publiek.ts`; gefixt met atomische `.is(null)`-claim (fix-commit).
Niet-blocking opmerkingen uit de review:

- **Latency publieke offertepagina bij eerste view.** `meldEersteView`
  (notificatie-insert + settings-select + Resend-call) draait serieel vóór de
  response. Kost de klant eenmalig ~1s. Kan later parallel aan de
  items/profiel/klant-fetches gestart worden en pas vlak voor `res.json`
  geawait worden.
- **Dekking: alleen fallback-pad.** Offertes via het klantportaal
  (`/portaal/<token>`, primaire verzendpad) raken `offerte-publiek.ts` nooit;
  de eerste-view-melding werkt alleen voor het publiek_token-pad. Zelfde
  mechaniek in het portaal-endpoint (`portaal-bekeken.ts`) is de logische
  vervolgstap.
- **Vals positief mogelijk:** maker die zijn eigen verzonden link opent (knop
  in `OfferteDetail.tsx:732`) of een mail-scanner (Outlook SafeLinks) telt als
  eerste view en triggert de mail. Later te dempen via user-agent-check of
  korte delay.
- **Gemiste eerste keer:** opent de maker de link terwijl status nog concept
  is, dan is `publieke_link_geopend_op` al gezet en meldt de echte klant-view
  nooit. Niets reset dit veld bij verzenden; overwegen om bij verzenden te
  resetten.
- **Mijlpaal-edge-cases (veteraan op nieuw apparaat):** FacturenLayout checkt
  `facturen.length === 0` op state die bij koude cache nog leeg kan zijn; en
  de services vallen bij Supabase-fouten stil terug op localStorage waardoor
  de "is dit de eerste?"-check op een lege lijst kan rekenen. Vergt samenloop.
- **Mijlpaal bij mislukte DB-save:** in het catch-fallback-pad van
  FacturenLayout (factuur alleen lokaal) wordt eerste_factuur toch gevierd.
- **`handleMarkAsBetaald` deps:** `user`/`medewerkers` ontbreken nog steeds
  (pre-existing, raakt alleen de audit-log-naam).
- **Dashboard-flicker bij koude cache:** KpiStrip/OpvolgenBlok tonen kort de
  doel-kaarten/eerste-offerte-CTA tot de data binnen is; isLoading-gate zou
  dit oplossen. Cosmetisch.

## feat/daan-geheugen · fase 1 (28 jul 2026)

Senior-verdict: AKKOORD-MET-OPMERKINGEN. QAA: 7/8 ✅, crit. 5 ⚠️ (gefixt).
Gefixt in fase: dedup op onderwerp_id + zichtbare status, write-check vóór
"Genoteerd", legacy user-fallback in het RPC-pad, persoonlijk-filter vóór
limit, widget-copy zonder klantkaart-verwijzing.

Bewust doorgeschoven naar fase 2:
- Race in read-then-write dedup van leg_vast: dubbele insert bij gelijktijdige
  identieke calls. Fix te zijner tijd: partial unique index op
  (organisatie_id, onderwerp_type, COALESCE(onderwerp_id, nil-uuid),
  md5(inhoud)) WHERE status <> 'afgewezen', plus upsert.
- ai_geheugen.user_id staat op ON DELETE SET NULL; NULL betekent org-gedeeld,
  dus persoonlijke regels worden bij user-verwijdering gedeeld. Latent (fase 1
  schrijft alleen NULL); in de fase 2-migratie omzetten naar ON DELETE CASCADE.
- Org-brede 'algemeen'-geheugenregels hebben geen beheer-UI; beheerlijst hoort
  in Instellingen > Daan (ForgieTab) bij fase 2.
- p_klant_id van daan_context() wordt door geen call-site gevuld (ai-chat dekt
  klantgeheugen apart); bewuste fase 2-plumbing.
- Mail-match is substring-ilike op klant-email (kan bij korte adressen te
  breed matchen, alleen binnen eigen mailbox); scherper matchen kan later op
  from_address-gelijkheid.
- Legacy-rijen met organisatie_id NULL vallen sinds de org-scoping-fix buiten
  Daans blikveld; eenmalige check in productie aanbevolen.

## feat/daan-nachtploeg · fase 2 herkeuring (28 jul 2026)

Senior-herkeuring: AKKOORD-MET-OPMERKINGEN (na eerdere BLOKKADE, beide
blokkades + M1-M4 + QAA-punten bevestigd gefixt). Gelogde opmerkingen:
- Pre-dedup-tiebreak in migratie 165 is status- en telling-blind: in een
  omgeving mét fase 1-twins kan een geprommoveerde nieuwere twin sneuvelen
  en gaat bevestigd_aantal van de verliezer verloren (productie draaide
  schoon, dus daar een no-op). Evt. later: status-precedentie in de
  tiebreak of GREATEST(bevestigd_aantal) naar de overlever.
- Lezer-batches in daan-nachtploeg.ts hebben geen stop_reason-warning
  (synthese wel); afgekapte batch parseert stil naar []. Laag risico.
- De 2-uurs stale-lock-grens is alleen veilig zolang maxDuration <= 7200s;
  afhankelijkheid niet in het comment benoemd.

## Fase 3-lijst · Daan-geheugen (besluit Antony, 28 jul 2026)

- **Mail leert mee via de classifier.** classificeer-aanvraag leest nieuwe
  mail al (max 25/run, 14 dagen terug, 4000 tekens); laat hem per mail een
  compacte kern (afzender + onderwerp + kern, ≤600 tekens) als ai_spoor
  achterlaten zodat de nachtploeg ook leert uit klantmail waar niemand een
  AI-knop op gebruikt. VOORWAARDE van Antony: uitzetbaar in Instellingen >
  Daan (org-brede toggle op app_settings, default aan, check in de
  classifier vóór het schrijven van sporen). Ontwerpvragen voor dan:
  alleen mail herleidbaar naar een bekende klant meenemen, en de
  user-scoped mailboxgrens respecteren in wat er in het spoor belandt.
- Eerder gelogde restpunten fase 1/2 (zie secties hierboven): tiebreak
  status-precedentie, stop_reason-warning op lezer-batches, beheer-UI
  volgorde conventies, p_klant_id-plumbing in ai-email/followup.

## feat/daan-mail-leert-mee · fase 3 (28 jul 2026)

Senior: AKKOORD-MET-OPMERKINGEN, geen blokkades. Fail-closed, privacygrens
en toggle-conventie expliciet goedgekeurd. Dubbele-adres-attributie direct
gefixt (ambigu adres = geen attributie, geen spoor). Gelogde restpunten:
- from_address kan via read-email-fallback "Naam <adres>" bevatten; exacte
  match faalt dan stil (veilig, maar mist leerkansen). Contactpersoon-
  adressen (klanten.contactpersonen JSONB) matchen bewust niet, alleen
  klanten.email; smal beginnen is de keuze, verbreden kan later.
- Legacy app_settings-rij zonder organisatie_id: server negeert die, dus
  privacy-toggle valt daar terug op default áán terwijl de UI "uit" kan
  tonen. Verify in prod: select id from app_settings where organisatie_id
  is null;  — hoort leeg te zijn.
- Klantenquery kan .not('email','is',null) krijgen (kleinigheid).

## feat/daan-briefing · fase 4 herkeuring (28 jul 2026)

Senior-herkeuring: AKKOORD-MET-OPMERKINGEN (na BLOKKADE; B1 factuur-enum,
B2 hybride mail-grens, B3 herdraai-guard alle bevestigd gefixt). O1
(backslash-strip in thread-id-quoting) en O4 (comment gedeactiveerden-
telling) direct meegenomen. Gelogde restpunten:
- teamThreads limit(200) zonder order: bij >200 projectkoppelingen valt
  een willekeurige rest buiten de mail-lens, en de or-URL wordt lang
  (~10-15kB). Acceptabel v1; bij grote orgs herzien (bv. subquery of
  thread-filter in twee stappen).
- Nag-guard op ilike '%herinnering%' is fragiel (te breed bij feiten met
  dat woord, te smal na herformulering door de synthese). Sturdier:
  guard op ai_sporen agent='reactie-statistiek' + klant_id ongeacht
  verwerkt_in_ronde; de 30d-retentie maakt dat vanzelf een maandelijkse
  rate-limit. Volgende iteratie.
- Query-errors in de signaal-lanes worden niet gecheckt; een 400 maakt
  een lane stil leeg. Laag risico na de quoting-hardening.

## feat/daan-briefing-onbeantwoord (28 jul 2026)

Senior: AKKOORD-MET-OPMERKINGEN (2x). Verify V1 bleek raak: alle recente
emails-rijen hadden organisatie_id NULL; ingest gefixt op vijf paden
(fetch/send/backfill/cron-gepland/read-email) + backfill-migratie 168 +
job-queries op user_id∈leden. Reply-detectie via klant-adres, thread-dedup,
inbound-only fetch. Gelogde restpunten:
- Substring-match klant-adres kan een punt onterecht onderdrukken bij
  adressen die elkaars suffix zijn (jan@x.nl in notjan@x.nl); adres-extractie
  zou scherper zijn. Faalt stil, lage prio.
- Onbeantwoord-punt herhaalt max 9 nachten (dag 5-14) zonder escalatie en
  valt op dag 14 geruisloos weg; bewust ontwerp, consistent met de andere
  lanen.

## Inkoopfactuur-projectvoorstel + migratie-administratie (12 aug 2026)

Gate-review verdict AKKOORD-MET-OPMERKINGEN. Vier punten zijn gefixt in
`6c697331`. Wat bewust blijft staan:

- **`api/*` wordt door geen enkele geautomatiseerde poort gedekt.**
  `tsconfig.json` heeft `include: ["src", "trigger.config.ts"]`, dus noch
  `tsc --noEmit` noch de vite-build kijkt naar de 92 endpoints. Het zwaarste
  bestand van deze ronde (`api/inkoopfactuur-extract.ts`) is daarom los
  getypechecked met `--strict` (schoon). Dit is een echt gat in de toolketen en
  geen eigenschap van deze wijziging: de laag waar geld en tenant-isolatie zitten
  is de laag zonder compiler. Een tweede tsconfig voor `api/` zou het dichten.
- **Projectnummer `P-2026-001` matcht een referentie `P-2026-0019`.** Vergt
  inconsistente padding aan leverancierszijde, en als dat langere nummer óók een
  bestaand project is worden het twee treffers en dus geen voorstel. Degradeert
  dus naar de veilige kant.
- **`parsed.vertrouwen || 'laag'`** (`api/inkoopfactuur-extract.ts:481`): laat het
  model het veld weg, dan land je in Nakijken. Ruim aan de goede kant, bewust.
- **Geen accent-normalisatie**: project `Nieuwbouw Café de Zwaan` matcht niet op
  `cafe`. Een misser in plaats van een verkeerd voorstel, dus de goede richting.
## AVG-export (12 aug 2026)

Gate-review verdict BLOKKADE, gefixt. De blokkade: `facturen.betaal_link` bevat
letterlijk `/betalen/<betaal_token>` (`FactuurEditor.tsx:1247`), en het filter
haalde `betaal_token` weg maar liet `betaal_link` staan. De uitvoer bevatte dus
per factuur een levende sleutel naar een publieke pagina zonder inlog. Opgelost
met een tweede filterlaag op de WAARDE, want een naamfilter mist per definitie de
volgende kolom die een URL blijkt te zijn. Vastgelegd in
`tests/api/orgExportFilter.test.ts`.

Ook gefixt: het filter faalde open voorbij nestdiepte 8 (gaf de ruwe subtree
terug), de auditregel werd vóór de groottecheck geschreven zodat een 413 als
geslaagde uitvoer in het logboek stond, en de toast meldde alleen het rijtotaal
zodat een mislukte tabel als succes las.

Wat blijft staan:

- **`inkoopfactuur_inbox_config` exporteert `imap_host`/`imap_port`/`imap_user`.**
  Het wachtwoord gaat eruit op `encrypted`, maar dit is dezelfde mailkoppeling
  waarvoor `user_email_settings` juist wordt uitgesloten, alleen op org-niveau.
  Kies bij de volgende ronde: tabel uitsluiten, of ook de gebruikersnamen
  strippen.
- **`profiles.iban` en `leveranciers.iban` gaan mee.** Geen credential en
  terecht een gegeven, maar het zijn betaalgegevens van collega's in een bestand
  dat bedoeld is om door te sturen. Bewuste keuze, hoort expliciet in
  `docs/AVG.md`.
- **Zonder Upstash-env-vars is er geen rate limit** (alleen een `console.warn`),
  en een Redis-fout faalt open. `docs/AVG.md` noemt "twee per uur" als feit;
  dat geldt alleen als Upstash geconfigureerd is.
- **De definitieve secret-sweep vraagt de database.** `eboekhouden_api_token` en
  `moneybird_api_token` staan in `docs/AVG.md` maar in geen enkele migratie, en
  van `organisaties` bestaat geen `CREATE TABLE` in de map. Een sluitende
  controle is `information_schema.columns` tegen de regex; dat is een
  terugkerende check, niet een eenmalige.
- **`verwijderde_kolommen` vult alleen aan uit tabellen die rijen teruggaven.**
  De belofte "je ziet wat er ontbreekt" geldt dus niet voor lege tabellen.
- **Ongetest tot deploy**: de gzip-route en de 413-tak. Beide falen zichtbaar.
  Controleer bij de eerste echte download of het bestand JSON is en geen
  gzip-bytes, want of Vercel's proxy `Content-Encoding` ongemoeid doorlaat is
  statisch niet vast te stellen.
## Support-inbox: paginatie, toewijzing, melding (13 aug 2026)

Gate-review verdict BLOKKADE op twee punten, beide gefixt in `82aed6f7`: de
Resend-fout werd niet gelezen (stil falen plus een kwartier stilte door een
blijvende idempotency-claim), en de heartbeat pingde zolang er een tabblad
openstond, waardoor er nooit een mail uitging. Plus de ontbrekende tiebreaker
op de paginatie.

Wat blijft staan:

- **`berekenAttentie` is nog ongebonden** (`api/support-inbox.ts:180-189`):
  selecteert álle open gesprekken en haalt daarna previews voor die volledige
  set. Draait op elke lijst-GET én op elke realtime-INSERT. Bewust niet
  begrensd: elke haastige cap maakt de badge stil te laag, en dat is de fout
  die deze hele ronde wegwerkt. De goede oplossing is een aggregatie
  server-side, zoals migratie 199 voor rapportages doet.
- **De preview-limiet is globaal, niet per gesprek** (`:162-164`). Eén lange
  thread binnen het tijdvenster kan de hele limiet opeten; andere gesprekken
  krijgen dan geen preview en `telAttentie` telt ze niet mee. De badge kan dus
  onderrapporteren.
- **Zoeken en filteren gaat alleen over geladen rijen**
  (`SupportInboxPage.tsx:57-67`). De lege staat zegt "Geen gesprekken voor dit
  filter" zonder te melden dat er maar een deel geladen is. Paginatie maakt dit
  zichtbaar waar het eerder verborgen was. Echte fix is server-side zoeken.
- **`laadMeer` kan vastlopen** (`useSupportInbox.ts:56-66`): de offset is het
  aantal geladen rijen, dus levert een pagina alleen al-geziene ids, dan schuift
  de offset niet meer. Lage kans, echte dead-end.
- **De trigger dekt INSERT en UPDATE, niet DELETE.** Een klant mag onder
  `122:59-62` zijn eigen gesprek verwijderen, wat de berichten cascadeert en de
  toewijzing wegpoetst. De toewijzing is dus niet volledig klant-proof. Het
  terugschroeven van die `FOR ALL` is een besluit over wat klanten mogen.
- **De melding wordt ge-`await`'d binnen het klantverzoek** (`:316`), dus de
  klant wacht op de Resend-roundtrip. Op Vercel is dat de juiste keuze, maar het
  staat in het kritieke pad.
- **Ongetest tot de migratie draait**: de trigger heeft nul dekking, en de
  idempotency-test bewijst alleen dat twee aanroepen dezelfde sleutel geven, niet
  dat Postgres de tweede insert weigert.

## Factuur-races 25-gebruikers-ronde (2026-08-13)

Gate-review op b98d8c8e (AKKOORD-MET-OPMERKINGEN). Bevinding 1 (stale
existingFactuur na mislukte regels-stap), de foutcode-detectie van de
RPC-fallback, het 111-comment en `SET search_path` op de RPC zijn direct
gefixt in de vervolgcommit. Blijft staan voor een volgende ronde:

- **Exact-sync-knop zichtbaar op concepten; `api/exact-sync-factuur.ts`
  heeft geen status-guard.** Een concept met leeg nummer syncen stuurt
  `YourRef: ''` naar Exact. Pre-existing; goedkope fix is knop verbergen
  bij `status === 'concept'` plus een server-side weigering.
- **Confirm-check offerte-naar-factuur is TOCTOU** (twee exact gelijktijdige
  conversies passeren beide). Bewust geaccepteerd: productie heeft 11
  legitieme deelfactuur-paren, dus een unique constraint kan niet.
- **factuur_items valt buiten de abonnement-write-lock van 111** (alleen de
  facturen-header is vergrendeld). Meenemen als 111 ooit wordt uitgebreid.
- **Voorschot-/eindafrekening-verrekening kent dezelfde check-then-act-race**
  (FacturenLayout:1355-1488); buiten scope van deze ronde, kandidaat fase 3.

## Fase 3 gate-review (2026-08-13)

AKKOORD-MET-OPMERKINGEN op 4be837bb..b8b3a4ee; bevindingen 1-5 direct
gefixt (209-trigger dekt nu ook INSERT/DELETE, classifier hergebruikt
alleen AI-oordelen met zekerheid > 0 en true wint, hergebruikt-teller in
eindresponse, revertFields incl. toegewezen_aan_id, bulkBusy in de
Taken-refresh-guard). Blijft staan als backlog:

- **Voorschot-verrekening niet atomair**: conditional update
  (`.eq('is_voorschot_verrekend', false)` + rowcount-check) hoort in de
  DB; ook generateTypedNummer (VS/EA) blijft client-side raceable.
- **Planning-refresh venster drop-naar-commit**: saving-teller in de
  guard van MontagePlanningLayout zou het laatste venster dichten.
- **Admin-notificatie-moeheid monitoren**: admins krijgen nu elk
  klant-event van de hele org; mute-instelling is een kandidaat.
- **Bij draaien van 209**: check of `uniq_app_settings_organisatie`
  (migratie 094) live staat: `SELECT indexname FROM pg_indexes WHERE
  tablename = 'app_settings';`
- Swimlane-collapsed-state (naam-keys) klapt eenmalig open; taak met id
  van verwijderde medewerker toont raw UUID als lane-label. Cosmetisch.

## Facturatie-automatisering fase 1 gate-review (2026-08-15)

Eerste ronde BLOKKADE (dubbeltel-gat op betaalde facturen zonder
grootboek-rij), gefixt met een centrale guard in factuur_betaling_verwerk
(delta 0 bij onbekende referentie op status 'betaald'). Herronde
AKKOORD-MET-OPMERKINGEN op 5aee5caf/d877498f; direct verwerkt: NOT EXISTS
op de Mollie-backfill-insert, factuur_betalingen-policy versmald naar
SELECT-only, bijgewerkt_op (updated_at) in de RETURNS van beide
markeer-betaald-RPC's plus doorgave in markeerFactuurBetaald (optimistic
lock in de editor), fallback-detectie in factuurService versmald naar
PGRST202-only. Blijft staan als bewuste keuze/backlog:

- **Mengfacturen-backfill**: facturen die deels handmatig én deels via
  Mollie betaald waren krijgen hun hele stand op de Mollie-referentie;
  een latere refund kan daar te veel aftrekken (tot het handmatige deel).
  Geaccepteerd omdat pure-Mollie de norm is en refunds daar dan wél
  correct verwerken; gedocumenteerd in migratie 210.
- **Deploy-volgorde 210**: eerst deployen, dan migratie draaien — dan
  boekt de volledige backfill eventuele legacy-optellingen uit het
  venster alsnog goed.
- **Legacy-fallback-pad webhook** (pre-migratie-venster) blijft
  niet-idempotent voor deelbetalingen; venster sluit zodra 210 draait.

## Facturatie-automatisering fase 2+3 gate-review + leger-verificatie (2026-08-15)

Multi-lens adversarial review (6 lenzen, 18 bevindingen, 13 bevestigd)
op de Exact-betaalsync leverde 4 blokkades die in 13768c41 zijn gefixt;
een aparte verificatieronde (4 skeptici) bevestigde alle 4 fixes als
dicht. Senior-gate-review daarna: BLOKKADE op de fail-open v2-probe in
factuur-herinnering (gefixt: drie-standig, run breekt af bij een
onverwachte probe-fout) + opmerkingen die direct verwerkt zijn
(staleness-guard dekt nu ook de inhaalslag en ankert op de
exact_sync_state-rij, intern-kanaal consumeert de stap niet meer bij een
mislukte notificatie, org-dedup in de cron, koppelpas-paginatie herleest
vanaf 0, neutrale pre-migratie-toasts). Blijft staan als bewuste
keuze/backlog:

- **Settle vertrouwt Exacts afletterstatus**: status 50 via
  betalingskorting/afboeking telt als ontvangen; korting-kolom staat in
  de spiegel voor latere uitsplitsing. Na een Mollie-refund op een in
  Exact afgeletterde factuur boekt een her-evaluatie het restant opnieuw.
- **Disconnect-venster**: settings-lezing in het milliseconden-venster
  tussen token-delete en flag-update kan een rij reanimeren; zelfde
  venster bestaat in het referentiepad exact-sync-factuur.
- **Vreemde Exact-boeking met YourRef van een wél-gesyncte factuur**
  koppelt mee; faalrichting is veilig (blokkeert settle eerder dan
  forceren; hooguit een herinnering te veel).
- **Verwijderde/teruggeboekte termijnen** verschijnen niet in de delta
  (sync/Deleted niet geïmplementeerd); wekelijkse ReceivablesList-
  reconciliatie is de kandidaat-oplossing als dit ooit knelt.
