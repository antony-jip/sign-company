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
