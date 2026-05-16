# Implementatie — Communicatie-tab + Email-bug + Portaal white-label

**Datum:** 2026-05-15
**Status:** Plan ter goedkeuring. Geen code geschreven tot "akkoord fase N".
**Onderzoek-basis:** `ONDERZOEK_OPVOLGING_INSTELLINGEN.md`

---

## Context

Twee samenhangende problemen:

1. **Bug:** `<br/>` rendert als letterlijke tekst in offerte-opvolging en email-opvolging mails. Oorzaak: `.replace(/\n/g, "<br/>")` resultaat wordt via nodemailer's `html:` parameter verstuurd zonder HTML-wrapper / Content-Type-garantie. Resend-flows zijn safe.
2. **Versnippering:** instellingen rond uitgaande communicatie zitten op 4 plekken (EmailTab, OfferteOpvolgingTab, factuur-opvolging subtab, PortaalTab) met 3 placeholder-syntaxes en 4 hardcoded timing-blokken zonder UI. `email_templates` tabel bestaat sinds migration 049 maar is nooit aan triggers gekoppeld. `bedrijfskleuren_gebruiken` toggle bestaat in UI maar doet niets.

Doel: **Optie A volledig** — één "Communicatie" supertab met 6 sub-tabs, alle outbound-mail via gecentraliseerde wrapper, idempotent versturen, white-label-kleuren functioneel, per-project portaal-overrides. Gefaseerde delivery achter feature flag `doen_communicatie_tab_enabled` als FESPA-rollback.

### Bevestigde getallen uit Fase 0 (verkenning)

- Migration 101 is hoogste in main → **102, 103, 104** voor nieuwe migraties
- `email_templates` mist `trigger_task_naam` (text) en `is_systeem` (boolean) kolommen
- Idempotency: greenfield, nieuwe tabel `email_send_idempotency`
- Portaal-kleur-hits scope: ~15 in `src/components/portaal/` (NIET de ~1.200 app-brede hits aanraken)
- Feature flag = boolean kolom in `app_settings` (zelfde patroon als `forgie_enabled`)
- 093/094/095 dubbele filenames in main = bekend, NIET aanpakken in dit plan
- Placeholder-aliasing: in code (`templateRender.ts`), geen DB-veld (user-keuze)
- Idempotency-keys: alle 5 outbound tasks (user-keuze)

### Sessie-regels

- Engels in commit messages, NL in code/UI/comments
- Dutch variable names: `klant`, `offerte`, `opvolging`, `template`, `communicatie`
- Geen `npm install` zonder goedkeuring
- `npm run build` na elke commit — output checken
- Antony pusht zelf naar feature branch, mergt zelf naar main
- Bij elk GATE-punt: korte status, wacht op "akkoord fase N"
- Geen unsolicited refactoring buiten deze scope

---

## Architectuur — Communicatie supertab

```
Instellingen/
├── ...                                       (ongewijzigd t/m Documenten)
├── ► Communicatie  ◄ NIEUW (feature flag)
│   ├── Mijn e-mail        (SMTP + verbinding + handtekening, ex-EmailTab regel 770-1041)
│   ├── Templates          (alle 12 systeem-templates + custom, single source of truth)
│   ├── Offerte-opvolging  (ex-OfferteOpvolgingTab, ~523 regels, eigen state)
│   ├── Factuur-opvolging  (ex-EmailTab factuur-opvolging subtab)
│   ├── Portaal e-mails    (ex-PortaalTab regel 356-472, template_herinnering + timing)
│   └── Onboarding & Trial (NIEUW, onboarding_dag_offsets + trial_reminder_offsets)
├── ...
└── Integraties
    └── Portaal            (alleen branding/visueel, regel 477-564 blijft staan)
```

Oude locaties verwijderen achter dezelfde feature flag (geen banner — flag is veiligheidsnet).

---

## Fase 1 — Bug-fix (branch: `fix/email-html-multipart`, los te mergen)

**Branch vanaf main.** Surgical fix in centrale wrapper, niet per call-site.

### Wijzigingen

`src/trigger/utils/email.ts` — `sendEmailForUser`:
- Detecteer of `html` begint met `<!doctype html|<html` (case-insensitive)
- Zo niet: wrap in `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>${html}</body></html>`
- Genereer plain-text fallback uit html via simpele inline strip (tags weg, `<br/>` → `\n`, entities decode); geen nieuwe dependency
- Stuur `nodemailer.sendMail({ ...rest, html: wrappedHtml, text: derivedText })`

**NIET aanraken:** `offerte-opvolging.ts:295` en `email-opvolging.ts:279` — `.replace(/\n/g, "<br/>")` werkt correct zodra wrapper aanwezig is.

### Verificatie

- `npm run build` — verplicht groen
- `npx trigger.dev@latest deploy` (production) — handmatig door Antony
- Antony triggert offerte-opvolging flow naar eigen adres, controleert: geen `<br/>` als tekst, plain-text alt aanwezig

### Commit
`fix(email): wrap html body and add text alternative in sendEmailForUser`

**GATE 2** — Antony pusht + mergt main + productietest. Wacht op "akkoord fase 2".

---

## Fase 2 — Migraties (Antony runt zelf in Supabase SQL Editor)

**Branch:** `feat/communicatie-tab` vanaf main na fase 1 merge.

### `supabase/migrations/102_communicatie_settings.sql`

```sql
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS onboarding_dag_offsets int[] DEFAULT '{3,7}';
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS trial_reminder_offsets int[] DEFAULT '{5,2,0}';
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS doen_communicatie_tab_enabled boolean DEFAULT false;
-- placeholder_syntax_canonical: WEGGELATEN (aliasing in code, niet DB)
-- Bestaande org-scoped RLS dekt automatisch
```

### `supabase/migrations/103_email_templates_activeren.sql`

```sql
ALTER TABLE email_templates ADD COLUMN IF NOT EXISTS trigger_task_naam text;
ALTER TABLE email_templates ADD COLUMN IF NOT EXISTS is_systeem boolean DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_email_templates_org_task
  ON email_templates (organisatie_id, trigger_task_naam);

-- Seed 12 systeem-templates voor ALLE bestaande orgs
INSERT INTO email_templates (organisatie_id, naam, trigger_task_naam, is_systeem, onderwerp, body)
SELECT o.id, t.naam, t.trigger_task_naam, true, t.onderwerp, t.body
FROM organisaties o
CROSS JOIN (VALUES
  ('Offerte-opvolging dag 1', 'offerte_opvolging_dag1', 'Herinnering offerte {{offerte_nummer}}', '...'),
  ('Offerte-opvolging dag 7', 'offerte_opvolging_dag7', '...', '...'),
  ('Factuur-herinnering 1',   'factuur_herinnering_1', '...', '...'),
  ('Factuur-herinnering 2',   'factuur_herinnering_2', '...', '...'),
  ('Factuur-herinnering 3',   'factuur_herinnering_3', '...', '...'),
  ('Portaal-uitnodiging',     'portaal_uitnodiging',   '...', '...'),
  ('Portaal-herinnering',     'portaal_herinnering',   '...', '...'),
  ('Onboarding dag 3',        'onboarding_dag3',       '...', '...'),
  ('Onboarding dag 7',        'onboarding_dag7',       '...', '...'),
  ('Trial-reminder 5d',       'trial_reminder_5',      '...', '...'),
  ('Trial-reminder 2d',       'trial_reminder_2',      '...', '...'),
  ('Trial-reminder 0d',       'trial_reminder_0',      '...', '...')
) AS t(naam, trigger_task_naam, onderwerp, body)
ON CONFLICT DO NOTHING;
```

RLS op `email_templates` is al org-scoped (4 policies in migration 049) — geen wijziging nodig.

### `supabase/migrations/104_email_send_idempotency.sql`

```sql
CREATE TABLE IF NOT EXISTS email_send_idempotency (
  organisatie_id uuid NOT NULL REFERENCES organisaties(id) ON DELETE CASCADE,
  idempotency_key text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organisatie_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_email_send_idempotency_sent_at
  ON email_send_idempotency (sent_at);

ALTER TABLE email_send_idempotency ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_select" ON email_send_idempotency FOR SELECT
  USING (organisatie_id IN (SELECT organisatie_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "service_insert" ON email_send_idempotency FOR INSERT
  WITH CHECK (true);  -- service_role bypass via Trigger.dev

-- TTL-cleanup: TODO als pg_cron beschikbaar, anders manuele DELETE-job
```

### Deliverable
- 3 SQL-files in `supabase/migrations/`
- Eén gecombineerd SQL-blok in chat dat Antony in één keer in SQL Editor kan plakken

### Commit
`feat(db): communicatie settings, email templates activation, idempotency (migrations 102-104)`

**GATE 3** — Antony runt SQL, bevestigt zero errors. Wacht op "akkoord fase 3".

---

## Fase 3 — Implementatie (branch: `feat/communicatie-tab`, 11 commits)

`npm run build` na elke commit; bij rood: stop en fix.

### 3a. Infrastructuur (4 commits)

**`src/trigger/utils/idempotency.ts`** (nieuw)
- `buildKey(taskName, entityId, stepNr?): string` — canonical formaat `${taskName}:${entityId}${stepNr ? ':'+stepNr : ''}`
- `checkAndMark(orgId, key): Promise<boolean>` — INSERT met ON CONFLICT DO NOTHING; returns true als nieuw, false als duplicaat
- Integratie in `sendEmailForUser`: optionele `idempotencyKey` parameter; als gezet en duplicaat → skip + `logger.warn`

Commit: `feat(trigger): idempotency layer for outbound email`

**`src/utils/templateRender.ts`** (nieuw)
- `renderTemplate(template: string, vars: Record<string,string>): string`
- Single-pass regex: accepteer zowel `{var}` als `{{var}}` (canonical is `{{var}}`)
- Inline test-cases als comments of vitest (indien al setup — anders comments)

Commit: `feat(templates): unified placeholder rendering, double-curly canonical`

**`src/services/emailTemplateService.ts`** (uitbreiding van bestaand `emailService.ts` of nieuw)
- `getTemplate(orgId, triggerTaskNaam): Promise<{onderwerp, body}>` — DB-fetch, fallback naar `DEFAULT_TEMPLATES[triggerTaskNaam]`
- `resetTemplateToDefault(orgId, triggerTaskNaam): Promise<void>` — UPSERT met default-content
- `listDefaults(): typeof DEFAULT_TEMPLATES` — export voor preview/reset
- `DEFAULT_TEMPLATES` const met alle 12 systeem-templates (zelfde body als seed in migration 103)

Commit: `feat(templates): centralized template service with reset-to-default`

**`src/utils/featureFlags.ts`** (nieuw)
- `isCommunicatieTabEnabled(orgId): Promise<boolean>` — leest `app_settings.doen_communicatie_tab_enabled`
- In-memory cache met 60s TTL (Map<orgId, {value, expiresAt}>)
- Hergebruik bestaand `AppSettingsContext` patroon waar mogelijk

Commit: `feat(settings): feature flag helper`

### 3b. Communicatie supertab UI (3 commits)

**Nieuwe directory:** `src/components/settings/communicatie/`

- `CommunicatieTab.tsx` — parent, hergebruikt `SubTabNav` uit `settingsShared.ts` (props: `tabs: SubTab[], active: string, onChange: (id: string) => void`)
- `MijnEmailSubTab.tsx` — verhuis blokken uit `EmailTab.tsx` regels 770-826 (handtekening) + 940-988 (SMTP) + 990-1041 (voorkeuren)
- `TemplatesSubTab.tsx` — lijst van 12 systeem-templates + custom, klik = `TemplateEditor` modal/panel
- `OfferteOpvolgingSubTab.tsx` — verhuis volledige `OfferteOpvolgingTab.tsx` (~523 regels, alle state mee)
- `FactuurOpvolgingSubTab.tsx` — verhuis factuur-opvolging subtab content
- `PortaalEmailsSubTab.tsx` — verhuis `PortaalTab.tsx` regels 356-472 (template_herinnering + timing)
- `OnboardingTrialSubTab.tsx` (nieuw) — twee chip-inputs voor `onboarding_dag_offsets` + `trial_reminder_offsets`

**`src/components/settings/SettingsLayout.tsx`** (regels 89-141, sections-array):
- Voeg sectie `communicatie` toe tussen `email-settings` en `inkoopfacturen-settings`
- Wrap conditional: `.filter(s => s.id !== 'communicatie' || settings.doen_communicatie_tab_enabled)`
- **Verwijder** `offertes > opvolging` tab (regel 106)
- **Verwijder** `facturen > factuur-opvolging` subtab (regel 112)
- **Inkrimp** `email-settings` (regel 114-116): handtekening/SMTP/voorkeuren weg, alleen verbinding-config blijft als niet-feature-flag-fallback (of helemaal weg achter flag — TBD bij implementatie)

Commits:
1. `feat(settings): communicatie supertab with six subtabs`
2. `refactor(settings): migrate offerte and factuur opvolging into communicatie`
3. `refactor(settings): split portaal tab — emails to communicatie, branding stays`

### 3c. Template editor met preview + reset (1 commit)

**`src/components/settings/communicatie/TemplateEditor.tsx`** (nieuw)
- Velden: `onderwerp` (input), `body` (textarea, monospace, min 12 regels)
- Klikbare placeholder-chips bovenaan editor, insert-at-cursor (verschilt per `trigger_task_naam` — definieer `PLACEHOLDERS_PER_TASK` const)
- Rechter paneel: live preview met `DUMMY_DATA` per task-type (klant "Jan de Vries", offerte "OFF-2026-999", etc.) — rendert via `renderTemplate` uit `templateRender.ts`
- "Herstel standaard" knop → `AlertDialog` confirm → `resetTemplateToDefault`
- Validatie: onderwerp niet leeg, body min 20 tekens
- Save via `emailTemplateService.saveTemplate`

Commit: `feat(templates): template editor with live preview and reset`

### 3d. Trigger-tasks koppelen aan email_templates (1 commit)

Wijzig alle 5 outbound trigger-files:

- `src/trigger/offerte-opvolging.ts` — vervang hardcoded subject/body door `emailTemplateService.getTemplate(orgId, 'offerte_opvolging_dag1')` etc. Idempotency-key: `offerte_opvolging:{offerteId}:{stapNr}`
- `src/trigger/email-opvolging.ts` — idem, idempotency-key: `email_opvolging:{opvolgingId}`
- `src/trigger/portaal-herinnering.ts` — `portaal_herinnering`, key: `portaal_herinnering:{projectId}`
- `src/trigger/trial-reminder.ts` — `trial_reminder_5/2/0`, key: `trial_reminder:{orgId}:{daysUntilEnd}`; loop over `app_settings.trial_reminder_offsets` i.p.v. hardcoded
- `src/trigger/onboarding-sequence.ts` — `onboarding_dag3/7`, key: `onboarding:{userId}:{dag}`; loop over `app_settings.onboarding_dag_offsets` i.p.v. hardcoded `wait.for({days:2/4})`

Commit: `feat(trigger): wire all outbound tasks to email_templates and idempotency`

### 3e. Portaal white-label (2 commits)

**`src/utils/orgTheme.ts`** (nieuw)
- `getOrgColor(settings: AppSettings, portaalInstellingen: PortaalInstellingen, slot: 'primary' | 'accent' | 'light-bg'): string`
- Als `!portaalInstellingen.bedrijfskleuren_gebruiken`: return defaults `#1A535C` / `#F15025` / `#E2F0F0`
- Anders: `settings.primaire_kleur || '#1A535C'` etc.
- Hergebruik bestaande `AppSettingsContext` (al `primaireKleur` exposed, regel 181)

Vervang ~15 hits in `src/components/portaal/`:
- `PortaalHeader.tsx:23` — `backgroundColor`
- `PortaalHeader.tsx:30` — SVG `fill` voor decoratieve dots
- `PortaalSidebar.tsx:41-46` — status-badge map (5-6 hits)
- `PortaalFeedItem*.tsx` — buttons/accents (~8 hits)

SVG-fills via inline `style={{ fill: getOrgColor(...) }}` i.p.v. attribute.

**Scope-grens:** alleen `src/components/portaal/` + `src/components/klantportaal/`. De ~1.200 hits in andere modules (Tasks, Planning, Quotes, Email-UI) blijven hardcoded — deze zijn admin-UI doen.-branding, niet klant-facing.

**`src/components/settings/PortaalTab.tsx`** (branding-blok regel 477-564 blijft):
- Bovenaan: `bedrijfskleuren_gebruiken` toggle (al aanwezig, nu functioneel)
- Kleurpicker voor `primaire_kleur` (bestaat al in HuisstijlTab — hergebruik component of dupliceer met deep-link)
- Live preview-blok van portaal-header met gekozen kleuren

Commits:
1. `feat(portaal): functional white-label color override via getOrgColor`
2. `feat(portaal): color picker with live preview in branding tab`

### 3f. Per-project portaal-overrides UI (1 commit)

**`src/components/projecten/ProjectPortaalSettings.tsx`** (nieuw of uitbreiding bestaand `ProjectDetail` portaal-sectie)
- UI voor `project_portalen.instructie_tekst` override (DB ondersteunt al)
- UI voor welkomstboodschap override (kolom toevoegen als nog niet aanwezig — bevestigen bij implementatie)
- "Reset naar organisatie-default" knop per veld
- Link vanuit `ProjectDetail > Portaal-sectie`

Commit: `feat(portaal): per-project welcome and instruction overrides`

**GATE 4** — alle 11 commits klaar, build groen, branch gepusht. Wacht op "akkoord fase 4".

---

## Fase 4 — Feature flag aan + merge

### Test-checklist (Antony loopt door)
- [ ] Offerte-opvolging mail: geen `<br/>` als tekst, multipart aanwezig
- [ ] Factuur-herinnering mail: idem
- [ ] Portaal-uitnodiging + herinnering: idem
- [ ] Template-editor: bewerken + preview + reset
- [ ] "Herstel standaard" → confirm → werkelijk reset naar default
- [ ] Placeholder-aliasing: `{klant_naam}` én `{{klant_naam}}` renderen beide
- [ ] White-label kleur in `/portaal/[token]` na toggle aan
- [ ] Per-project override werkt + reset
- [ ] Onboarding/trial timing UI: opslaan + chip-input werkt
- [ ] Idempotency: dubbele trigger → tweede send wordt geskipt

### Activatie

Als alles groen:
```sql
UPDATE app_settings
SET doen_communicatie_tab_enabled = true
WHERE organisatie_id = '226bf02a-ebb2-4b4c-ae51-cdc9919e4229';  -- Sign Makers eerst
```

Andere orgs: flag blijft `false` tot Antony per-org expliciet aanzet. Geen aparte migratie.

### Bij falen
Flag op `false` → nieuwe tab verdwijnt uit UI. Oude tabs zijn weg uit code → tijdelijk geen UI voor opvolg-config (acceptabel tijdens FESPA-noodgeval). Bug fixen, hertesten.

**GATE 5** — Antony mergt `feat/communicatie-tab` naar main. Vercel deploy. `npx trigger.dev@latest deploy` (production). Done.

---

## Deploy-checklist (Antony, na merge)

- [ ] Migraties 102-104 gedraaid in Supabase (alleen indien nog niet)
- [ ] Vercel deployment groen
- [ ] `npx trigger.dev@latest deploy` uitgevoerd (PRODUCTION env)
- [ ] Handmatige rooktest: stuur offerte-opvolging mail naar eigen adres
- [ ] Verifieer mail: geen `<br/>` als tekst, plain-text body aanwezig
- [ ] Feature flag aan voor Sign Makers, uit voor andere orgs

---

## Kritieke files

**Te bewerken:**
- `src/trigger/utils/email.ts` (fase 1, centrale wrapper-fix)
- `src/components/settings/SettingsLayout.tsx` (regels 89-141, sections-array)
- `src/components/settings/EmailTab.tsx` (regels 770-1041, blokken verhuizen)
- `src/components/settings/OfferteOpvolgingTab.tsx` (~523 regels, volledig verhuizen)
- `src/components/settings/PortaalTab.tsx` (regels 356-472 verhuizen, 477-564 blijft)
- 5x `src/trigger/*.ts` (offerte-opvolging, email-opvolging, portaal-herinnering, trial-reminder, onboarding-sequence)
- `src/types/index.ts` (AppSettings interface uitbreiden)
- `src/services/profielService.ts` (~regel 206, getDefaultAppSettings)
- `src/components/settings/AppSettingsContext.tsx` (regel 181, kleur-context al aanwezig — gebruik)

**Nieuw:**
- `supabase/migrations/102_communicatie_settings.sql`
- `supabase/migrations/103_email_templates_activeren.sql`
- `supabase/migrations/104_email_send_idempotency.sql`
- `src/trigger/utils/idempotency.ts`
- `src/utils/templateRender.ts`
- `src/services/emailTemplateService.ts` (of uitbreiding `emailService.ts`)
- `src/utils/featureFlags.ts`
- `src/utils/orgTheme.ts`
- `src/components/settings/communicatie/` (7 files: parent + 6 subtabs + TemplateEditor)
- `src/components/projecten/ProjectPortaalSettings.tsx`

**Hergebruik (niet wijzigen):**
- `src/components/settings/SubTabNav.tsx` — API herbruikbaar
- `src/components/settings/settingsShared.ts` — `SubTab` interface
- Tailwind tokens `petrol` / `flame` in `tailwind.config.js` — al gedefinieerd, nu eindelijk gebruiken in portaal

---

## Verificatie end-to-end

1. **Fase 1:** `npm run build` groen → Antony pusht → mergt → Trigger.dev deploy → handmatige rooktest offerte-opvolging mail → controleer mail-source: `Content-Type: multipart/alternative` met `text/html` (gewrapt) + `text/plain` (afgeleid)
2. **Fase 2:** Antony plakt SQL-blok in Supabase SQL Editor → controleert `email_templates` kolommen + 12 rijen per org + `email_send_idempotency` tabel + `app_settings` 3 nieuwe kolommen
3. **Fase 3:** `npm run build` na elke commit. Bij fase-eind: lokaal `npm run dev` → `/instellingen` → Communicatie-tab verschijnt na flag-toggle → alle 6 subtabs laden zonder errors
4. **Fase 4:** test-checklist (zie boven) met productie-mail naar `antony@signcompany.nl`

---

## Rollback-pad

- **Fase 1:** revert commit + Trigger.dev redeploy oude versie
- **Fase 2:** migraties 102-104 zijn additive (ALTER ADD COLUMN, CREATE TABLE) — kunnen blijven staan zonder gevolgen
- **Fase 3+4:** `UPDATE app_settings SET doen_communicatie_tab_enabled = false` → tab verdwijnt. Voor volledige revert: `git revert` + Vercel + Trigger.dev redeploy
