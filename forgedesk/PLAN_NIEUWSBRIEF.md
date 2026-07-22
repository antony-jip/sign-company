# Plan: Nieuwsbrief-module (account-specifiek)

**Doel:** een nieuwsbrief-tool binnen doen., alleen zichtbaar voor organisatie `ce6843e3-5cd9-4043-9461-55071bc91eb7`, waarmee Antony maandelijks een HTML-nieuwsbrief opstelt, test, direct verstuurt of inplant naar alle contacten — via Resend.

**Status:** plan, wacht op akkoord. Onderzoek uitgevoerd 8 juli 2026 (codebase + actuele Resend-docs).

---

## 1. Kernbeslissingen (met onderbouwing)

### 1.1 Verzendroute: eigen batch-verzending via Resend Emails API (níét Broadcasts)

Resend biedt twee routes. Onderzocht (stand medio 2026):

| | Broadcasts/Segments | Eigen batch (`resend.batch.send`) |
|---|---|---|
| Contactenbeheer | Dubbel: Supabase ↔ Resend syncen (Audiences zijn bovendien deprecated → Segments) | Supabase = enige bron ✓ |
| Unsubscribe | Gehost door Resend, Resend-branded pagina | Zelf bouwen, eigen huisstijl ✓ |
| Statistieken in-app | Niet via API opvraagbaar — alsnog webhooks nodig | Webhooks (identiek werk) ✓ |
| Prijs | Per contact ($40/mnd boven 1.000 contacten) | Per mail (gratis tier / Pro $20) ✓ |
| Inplannen | `scheduledAt` op broadcast | Zelf via Trigger.dev (hebben we al) ✓ |

**Keuze: batch.** Klantdata blijft in doen., de afmeldpagina is in eigen huisstijl, en de statistieken moeten toch via webhooks. Wat we ervoor terug moeten bouwen (unsubscribe-endpoint, chunking, suppressie) is beperkt en staat hieronder gespecificeerd.

Technische feiten batch-API:
- Max **100 mails per call**, rate limit **2 req/sec** per team → ~1.000 mails in enkele seconden, ruim voldoende.
- `scheduled_at` en attachments werken **niet** in batch → inplannen doen we zelf via Trigger.dev.
- `Idempotency-Key`-header ondersteund → veilige retries zonder dubbele mails.
- `tags` per mail (bv. `nieuwsbrief_id`) → webhook-events koppelbaar aan campagne + ontvanger.

### 1.2 Afzender: eigen Resend-account + eigen domein — **beslissing Antony**

Twee opties:

- **A (aanbevolen):** Antony's eigen Resend-account met geverifieerd eigen domein, bv. `nieuws@signcompany.nl`. Beste deliverability (mail komt echt van Sign Company), replies komen bij Antony binnen, telt niet mee op de doen.-platformkey. Vereist: domein verifiëren in zijn Resend-dashboard (SPF/DKIM), DMARC-record, en de API-key als secret `RESEND_NEWSLETTER_API_KEY` in Vercel + Trigger.dev.
- **B:** bestaande platformkey (`noreply@doen.team`, patroon van `src/trigger/utils/resend.ts` met reply-to). Werkt direct, maar afzenderdomein is niet het eigen merk.

Let op bij A: Resend free tier heeft een **100 mails/dag**-limiet — een blast naar >100 contacten vereist Resend Pro ($20/mnd) op dat account. Checken hoeveel contacten er zijn.

De afzender (naam + e-mail) wordt instelbaar in de module, niet hardcoded.

### 1.3 Zichtbaarheid: `app_settings.nieuwsbrief_enabled`

Bestaand patroon (`008_forgie_enabled.sql`): boolean-kolom op `app_settings`, default `false`, alleen `true` voor de doelorganisatie. Sidebar-item, route én API-endpoints checken de flag. Geen hardcoded org-id in de frontend-bundle.

### 1.4 Inplannen: Trigger.dev delayed run + status-check in DB

Bij "Inplannen" triggert `api/nieuwsbrief-verzenden.ts` de Trigger.dev-taak met een `delay` tot het gekozen moment. **Annuleren = alleen de DB-status op `geannuleerd` zetten**: de taak controleert bij aanvang of de nieuwsbrief nog status `ingepland` heeft en stopt anders stilletjes. Robuust, geen run-administratie nodig. Zelfde presets-UX als `EmailCompose.tsx` ("Morgen 9:00", custom DatePicker). Max 30 dagen vooruit is hier geen beperking (Trigger.dev, niet Resend, doet de timing).

---

## 2. Datamodel (migratie `150_nieuwsbrief.sql`)

Alle tabellen: `organisatie_id UUID NOT NULL REFERENCES organisaties(id) ON DELETE CASCADE`, index op org, RLS per patroon `048_rls_organisatie_policies.sql` (SELECT/INSERT/UPDATE/DELETE afgedekt), idempotent geschreven.

```
nieuwsbrieven
  id, organisatie_id, onderwerp, preheader,
  blokken JSONB DEFAULT '[]',          -- editor-blokken (bron)
  html TEXT,                            -- gerenderde e-mail-HTML (bij verzenden gefixeerd)
  afzender_naam, afzender_email, reply_to,
  status TEXT CHECK (concept|ingepland|wordt_verzonden|verzonden|geannuleerd|mislukt) DEFAULT 'concept',
  scheduled_at TIMESTAMPTZ, verzonden_at TIMESTAMPTZ,
  ontvangers_filter JSONB,              -- {statussen:[], tags:[], uitgesloten_ids:[]}
  aantal_ontvangers INT,
  stats JSONB DEFAULT '{}',             -- {delivered, opened, clicked, bounced, complained, unsubscribed}
  created_by UUID, created_at, updated_at

nieuwsbrief_verzendingen                -- snapshot per ontvanger, gemaakt bij verzenden
  id, nieuwsbrief_id FK CASCADE, organisatie_id,
  klant_id UUID NULL, email TEXT NOT NULL, naam TEXT,
  status TEXT (wachtend|verzonden|afgeleverd|geopend|geklikt|gebounced|mislukt|overgeslagen),
  resend_email_id TEXT,                 -- koppeling webhook-events
  fout TEXT, verzonden_at, geopend_at,
  UNIQUE (nieuwsbrief_id, email)

nieuwsbrief_afmeldingen                 -- suppressielijst, per e-mailadres
  id, organisatie_id, email TEXT NOT NULL, klant_id UUID NULL,
  reden TEXT (afgemeld|bounce|klacht),
  afgemeld_op TIMESTAMPTZ DEFAULT now(),
  UNIQUE (organisatie_id, email)
```

- Aparte suppressietabel i.p.v. boolean op `klanten`: dekt ook contactpersoon-adressen, overleeft klant-verwijdering, en bounce/klacht-suppressie hoort niet op de klantkaart thuis. (Wel tonen op klantprofiel: "Afgemeld voor nieuwsbrief.")
- `app_settings`: `ADD COLUMN IF NOT EXISTS nieuwsbrief_enabled BOOLEAN DEFAULT false`.
- Afmeld-endpoint schrijft via service-role (publiek, geen RLS-toegang nodig).

**Ontvangers-bron:** `klanten` met `email IS NOT NULL` (default: status `actief`), minus suppressielijst. Contactpersonen-adressen als optionele uitbreiding in fase 3 — dubbele opslag (JSONB + tabel) daar eerst uitzoeken.

---

## 3. Backend

### 3.1 `api/nieuwsbrief-verzenden.ts` (Vercel, standalone — geen src-imports)
- Bearer-JWT verificatie (patroon `api/trigger-onboarding.ts` `verifyUser()`), check org + `nieuwsbrief_enabled`.
- Acties: `test` (rendert HTML, stuurt 1 mail naar de ingelogde gebruiker), `verstuur` (nu) en `plan` (met `scheduledAt`).
- Bij verstuur/plan: valideert (onderwerp, ≥1 blok, afzender), zet status, en `tasks.trigger<typeof nieuwsbriefVerzenden>("nieuwsbrief-verzenden", { nieuwsbriefId }, { delay? })`.

### 3.2 `src/trigger/nieuwsbrief-verzenden.ts` (Trigger.dev task)
1. Haal nieuwsbrief op; **stop als status ≠ `ingepland`/`wordt_verzonden`-waardig** (annulering). Zet `wordt_verzonden`.
2. Bouw ontvangerslijst uit filter, dedupliceer op e-mail, **filter suppressielijst** (afgemeld/bounce/klacht) → schrijf snapshot naar `nieuwsbrief_verzendingen` (gesupprimeerde adressen als `overgeslagen`).
3. Render definitieve HTML (of gebruik gefixeerde `html`) + plain-text-variant.
4. Chunks van 100 → `resend.batch.send` met per mail: `List-Unsubscribe: <https://…/api/nieuwsbrief-afmelden?t=TOKEN>` + `List-Unsubscribe-Post: List-Unsubscribe=One-Click` (RFC 8058), tag `nieuwsbrief_id`, idempotency-key `nieuwsbrief:{id}:chunk:{n}`. Throttle ≤2 req/sec. Sla `resend_email_id` per ontvanger op.
5. Idempotency via `src/trigger/utils/idempotency.ts` — herstartte run verstuurt geen chunk dubbel.
6. Eindstatus `verzonden` (+ `verzonden_at`, `aantal_ontvangers`) of `mislukt` met fout.

### 3.3 `api/nieuwsbrief-afmelden.ts` (publiek)
- Token = HMAC-signed (`EMAIL_ENCRYPTION_KEY` of eigen secret) over `email + organisatie_id + nieuwsbrief_id` — geen raadbare links, geen DB-lookup nodig voor validatie.
- `GET`: minimalistische afmeldpagina in huisstijl (logo + bedrijfsnaam uit org): "Je bent afgemeld." met één bevestigingsklik.
- `POST` (one-click vanuit Gmail/Outlook): direct verwerken, `200` — RFC 8058-conform, verwerking <48u ruim gehaald.
- Schrijft naar `nieuwsbrief_afmeldingen` via service-role.

### 3.4 `api/nieuwsbrief-webhook.ts` (Resend webhook, fase 2)
- Svix-signature verificatie, secret `RESEND_WEBHOOK_SECRET`.
- Events `email.delivered/opened/clicked/bounced/complained` → match op `resend_email_id` → update `nieuwsbrief_verzendingen.status` + increment `nieuwsbrieven.stats`.
- `bounced`/`complained` → automatisch in `nieuwsbrief_afmeldingen` (reden `bounce`/`klacht`) → nooit meer aanmailen. Complaint-rate moet <0,3% blijven (Gmail/Yahoo-eis).

---

## 4. UX — schermen

Design volgens doen-design (Linear/Notion; Flame-punt; module-kleur Email/Portaal `#6A5A8A`). Sidebar-item **"Nieuwsbrief"** in sectie COMMUNICATIE, alleen bij `nieuwsbrief_enabled` (leest `useAppSettings`), icoon `Send` of `Mail`. Route lazy-loaded in `App.tsx`.

### 4.1 Overzicht — `/nieuwsbrief`
Opbouw identiek aan QuotesPipeline/ClientsLayout:
- Titel `Nieuwsbrief.` (Flame-punt) + mono-teller; rechtsboven flame-pill **"Nieuwe nieuwsbrief"**.
- KPI-tegels (`doen-stat-tile`): **Abonnees** (contacten met e-mail − afmeldingen), **Laatste open rate**, **Verzonden dit jaar**, **Ingepland**.
- Lijstkaart: rij = onderwerp (bold) + verzenddatum/planning, ontvangers-aantal, open-/klik-% in `font-mono`, status als tekst + Flame-punt: `Concept.` `Ingepland.` `Verzonden.` — géén pills. Filters als tekst-links (Alle / Concepten / Ingepland / Verzonden). Hover `bg-[#F8F7F5]`, klik → detail.
- Empty state via `EmptyState`: "Nog geen nieuwsbrieven." + serif-subtekst + tekst-link "Schrijf je eerste nieuwsbrief".

### 4.2 Editor — `/nieuwsbrief/nieuw` en `/nieuwsbrief/:id` (concept)
**Geen wizard** — één rustig scherm, het canvas centraal (Notion-gevoel):

- **Header:** ← terug, titel = onderwerp (of "Nieuwe nieuwsbrief"), autosave-indicator ("Opgeslagen." met Flame-punt). Rechts: tekst-link **"Stuur testmail"**, secundaire knop **"Inplannen ▾"** (presets + DatePicker, patroon `EmailCompose.tsx:1069`), primaire flame-knop **"Versturen"** (de enige flame-CTA).
- **Canvas (midden, max-w ±640px):** de nieuwsbrief zoals hij eruit gaat zien — witte kaart op warm grijs, met logo/kleur van de organisatie er al in. Bovenaan twee kale inputs: **Onderwerp** (groot) en **Preheader** (subtiel, met InfoButton-uitleg). Daaronder de **blokken**, direct in-place bewerkbaar:
  - Bloktypen fase 1: **Kop**, **Tekst**, **Afbeelding** (upload → Supabase Storage), **Knop** (label + URL, huisstijlkleur), **Scheiding**.
  - Tussen blokken verschijnt bij hover een dunne `+`-regel → klein blok-menu. Blok geselecteerd → zwevende mini-toolbar: ↑ ↓ dupliceren verwijderen.
  - Tekstblokken zijn `contentEditable` met de bestaande **`AIContentEditableToolbar`** — selecteer tekst → "AI herschrijven" (beknopt/professioneel/taalcheck/eigen stijl) werkt out-of-the-box.
  - **Footer-blok is vast** (niet verwijderbaar): bedrijfsnaam, adres, afmeldlink. Kort uitgelegd waarom (wettelijk verplicht).
- **Ontvangers-regel** boven het canvas, als één rustige zin: *"Aan: alle actieve klanten met e-mailadres — **142 ontvangers** · 3 afgemeld"* met tekst-link **"aanpassen"** → paneel/dialog: FilterPills op status en tags, zoekveld, checkbox-lijst (Set-selectiepatroon), afgemelde adressen grijs met "wordt overgeslagen". Default staat goed: alle actieve klanten.
- Autosave (debounced) naar `blokken` JSONB; blokken → **table-based e-mail-HTML** gerenderd met dezelfde bouwstijl als `buildClientEmailHtml` (bewezen Outlook/Gmail-proof), DOMPurify op alle tekst-invoer.
- Versturen → confirm-dialog (Radix Dialog): "Versturen naar 142 ontvangers?" → optimistisch navigeren + `sendInBackground`-toastpatroon.

### 4.3 Detail — `/nieuwsbrief/:id` (ingepland/verzonden)
- **Ingepland:** canvas read-only + banner "Wordt verzonden op wo 15 juli, 09:00." met rode tekst-link **Annuleren** (patroon `IngeplandeBerichtenLijst`) en tekst-link "Bewerken" (→ terug naar concept, planning vervalt).
- **Verzonden:** stats-tegels (Afgeleverd / Geopend / Geklikt / Afgemeld / Bounces, mono-getallen), daaronder ontvangerslijst met status als tekst + punt (`Geopend.` groen, `Gebounced.` rood), zoekveld. Actie: **"Dupliceren als nieuwe nieuwsbrief"** — dé maandelijkse workflow: vorige editie als startpunt.
- Statussen live via polling (20s, patroon IngeplandeBerichtenLijst) zolang `wordt_verzonden`.

### 4.4 Afmeldpagina (publiek)
Minimaal, huisstijl van het bedrijf: logo, "Afmelden voor de nieuwsbrief van {bedrijf}", één knop, daarna "Je bent afgemeld." met Flame-punt. Geen doen.-branding op de voorgrond.

---

## 5. Fasering

**Fase 1 — schrijven & versturen (MVP, grootste blok)**
Migratie 150 + flag · sidebar/route · overzichtspagina · blok-editor met AI-toolbar en afbeelding-upload · HTML-rendering + testmail · ontvangers-selectie · afmeld-endpoint + -pagina + headers · Trigger.dev-verzendtaak (batch, suppressie, idempotent) · direct versturen met confirm.
*Resultaat: eerste nieuwsbrief kan veilig en AVG-conform de deur uit.*

**Fase 2 — inplannen & inzicht**
Inplannen met presets + annuleren · Resend-webhook + per-ontvanger status · stats op detail en overzicht · dupliceren-als-nieuw · afmeldstatus zichtbaar op klantprofiel.

**Fase 3 — verfijning (optioneel)**
Contactpersoon-adressen als extra ontvangers · nieuwsbrief-templates (structuur bewaren) · maandelijkse concept-herinnering (Trigger.dev cron) · merge-fields (`[naam]`).

---

## 6. Checklist deliverability/AVG

- [ ] SPF + DKIM via Resend-domeinverificatie; **DMARC-record** op verzenddomein (min. `p=none`)
- [ ] One-click unsubscribe: `List-Unsubscribe` + `List-Unsubscribe-Post` headers, POST-endpoint → 200
- [ ] Afmeldlink zichtbaar in footer, verwerking direct
- [ ] Suppressiefilter vóór élke verzending; bounce/klacht → auto-suppressie
- [ ] Plain-text alternatief meesturen; fysiek adres in footer
- [ ] Testmail-flow vóór eerste echte verzending; complaint-rate bewaken (<0,3%)

## 7. Openstaande beslissingen (Antony)

1. **Afzender:** eigen Resend-account + eigen domein (aanbevolen, vereist eenmalig domein verifiëren + evt. Pro $20/mnd bij >100 ontvangers) — of bestaande `doen.team`-key?
2. **Hoeveel contacten** heeft het account ongeveer? (Bepaalt of Resend Pro nodig is.)
