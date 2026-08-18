# Onderzoek — Opvolgings-bug + Instellingen-architectuur

**Datum:** 2026-05-15
**Status:** READ-ONLY onderzoek. Geen code gewijzigd. Wacht op akkoord.
**Scope:** Twee samenhangende vragen — (1) `<br/>` rendert als letterlijke tekst in opvolg-mails, (2) instellingen rond communicatie zijn versnipperd over Offertes/Facturen/Portaal.

---

## 1. Samenvatting

De `<br/>` bug komt door één patroon op twee plekken: `.replace(/\n/g, "<br/>")` op een platte string die vervolgens via nodemailer's `html:` parameter de deur uit gaat zonder dat de body in een echte HTML-wrapper zit. Lokaal te fixen in ~1 uur. De settings-versnippering is structureler: drie verschillende plekken beheren e-mail templates (EmailTab herinneringen, PortaalTab portaal-mails, OfferteOpvolgingTab opvolg-stappen), met drie placeholder-syntaxes en 4 hardcoded timing-blokken zonder UI. Aanbeveling: vóór FESPA alleen de bug + een minimale tab-consolidatie ("E-mail & Opvolging", 2 dagen). Na FESPA de volledige Communicatie-tab + white-label-gat + ontsluiten hardcoded timings (~4 dagen). Dat is geen weggegooid werk: de kleine fix is een strikte subset van de grote.

---

## 2. Bug: root cause + aanbevolen fix

### Root cause

In `src/trigger/offerte-opvolging.ts:295` en `src/trigger/email-opvolging.ts:279` wordt een platte string (de body die de user in de opvolg-stap heeft getypt) bewerkt met:

```ts
inhoud.replace(/\n/g, "<br/>")
```

Resultaat gaat als `html:` parameter naar nodemailer's `sendEmailForUser()`. Probleem: er is geen HTML-wrapper (geen `<html>`, geen `<body>`, geen `Content-Type: text/html` garantie) — afhankelijk van de mailclient ziet de ontvanger de `<br/>` als letterlijke tekst.

**De Resend-flows hebben dit probleem NIET.** `portaal-herinnering.ts`, `trial-reminder.ts` en `weekly-digest.ts` gebruiken dedicated builders (`buildClientEmailHtml`, `buildSystemEmailHtml`, `buildDigestHtml`) die wél een volledige HTML-structuur opleveren. De bug zit dus alleen in de twee nodemailer-flows.

### Aanbevolen fix (vóór FESPA)

**Lokaal in beide files** — kleinste mogelijke change, ~1 uur:

| File | Regel | Wat |
|---|---|---|
| `src/trigger/offerte-opvolging.ts` | 295 | Wrap het `replace`-resultaat in een minimale HTML-structuur (`<!DOCTYPE html><html><body>…</body></html>`) of stuur `text:` + `html:` beide door |
| `src/trigger/email-opvolging.ts` | 279 | Idem |

**Niet doen vóór FESPA:** unified `buildFollowUpEmailHtml()` helper. Wel beter (DRY), maar refactor onder tijdsdruk = risico op nieuwe bugs in working flows.

### Impact-lijst (welke flows zijn betroffen?)

- `offerte-opvolging.ts:295` — **kapot**
- `email-opvolging.ts:279` — **kapot** (zelfde patroon)
- `portaal-herinnering.ts:244` — safe (Resend builder)
- `trial-reminder.ts:134` — safe (Resend builder)
- `weekly-digest.ts:46` — safe (eigen HTML)
- `onboarding-sequence.ts` — safe (inline HTML strings)

---

## 3. Huidige settings-landschap

### Bestaande structuur

`SettingsLayout.tsx` rendert 13 sections met ~18 tabs. Alle settings leven netjes binnen `/instellingen` — er zijn geen verdwaalde panels buiten de settings-module.

### Versnippering rond communicatie (de pijn)

Vier plekken die hetzelfde soort werk doen, op verschillende plekken in de zijbalk:

| Wat | Waar in UI | DB-bron | Mail-stack |
|---|---|---|---|
| Factuur-herinnering templates | `facturen > factuur-opvolging` (EmailTab subtab) | `app_settings.herinnering_*_tekst/onderwerp` | nodemailer |
| Offerte-opvolging schema's + stappen | `offertes > opvolging` (OfferteOpvolgingTab) | `offerte_opvolg_schemas` + `offerte_opvolg_stappen` | nodemailer |
| Portaal e-mail templates | `integraties-all > portaal` (PortaalTab) | `app_settings.portaal_instellingen` JSONB | Resend |
| Handtekening + Mijn e-mail | `email-settings > email` (EmailTab) | `app_settings.email_handtekening` + `user_email_settings` | nodemailer |

**Extra issues die uit de audit kwamen:**

- **Placeholder-syntax-divergentie:** EmailTab gebruikt `{klant_naam}`, PortaalTab gebruikt `{{klant_naam}}`, OfferteOpvolging gebruikt `{klant_naam}`. Users die templates kopiëren tussen tabs raken in de war.
- **`email_templates` tabel bestaat** met user-beheerde templates, maar is **niet gekoppeld** aan trigger-tasks. Dode bron.
- **Vier hardcoded timing-blokken zonder UI:**
  - `onboarding-sequence.ts:280,309` — dag 3 + dag 7 (na user-creatie)
  - `trial-reminder.ts:16,23,30` — 5/2/0 dagen voor trial-einde
  - `portaal-herinnering.ts:47` — default 3 dagen (DB-veld bestaat, UI in PortaalTab)
  - `offerte-opvolging.ts:191` — per-stap `dagen_na_versturen` (DB-veld bestaat, UI in OfferteOpvolgingTab)

  Eerste twee zijn dus écht onbereikbaar. Laatste twee zijn in DB beheerd maar gefragmenteerd.

- **White-label-gat (portaal):** `bedrijfskleuren_gebruiken` toggle bestaat in PortaalTab UI maar **doet niets** in de render-code. Kleuren zijn 15+ keer hardcoded `#1A535C` (teal) en `#F15025` (flame) in `PortaalHeader.tsx`, `PortaalFeedItem*.tsx`.

---

## 4. Architectuur-opties

Drie opties overwogen; B (drie aparte tabs) afgevallen — splitst de mentale model van de user nog verder uit i.p.v. samen te trekken.

### Optie A — "Communicatie" supertab

Eén sectie in de zijbalk, alle uitgaande communicatie samen, sub-tabs via het bestaande `SubTabNav` patroon.

```
Instellingen/
├── Algemeen / Gebruikers / Financieel        (ongewijzigd)
├── Offertes
│   └── Calculatie                            (opvolging weg → Communicatie)
├── Facturen                                  (subtab "factuur-opvolging" weg → Communicatie)
├── ► Communicatie  ◄ NIEUW
│   ├── Mijn e-mail        (SMTP, verbinding, handtekening)
│   ├── Templates          (1 bron: email_templates tabel, 1 placeholder-syntax)
│   ├── Offerte-opvolging  (schemas + stappen)
│   ├── Factuur-opvolging  (herinnering_* keys)
│   ├── Portaal e-mails    (template_herinnering + timing)
│   └── Onboarding & Trial (ontsluit hardcoded timings)
├── Integraties
│   └── Portaal            (alleen branding/visueel, geen e-mails)
└── Documenten / Apparaten / Kennisbank / Daan AI
```

**DB-impact:** voornamelijk hergebruik. Twee mini-toevoegingen aan `app_settings`: `onboarding_dag_offsets`, `trial_reminder_offsets` (allebei int[] of JSONB). Eén kleine migratie: placeholder-syntax uniformeren naar `{{var}}`. Geen nieuwe tabellen.

**Migratie-pad:** OfferteOpvolgingTab + factuur-opvolging subtab + portaal-mail-velden verhuizen naar Communicatie-sub-tabs. Originele tabs krijgen banner met deep-link. `email_templates` tabel eindelijk koppelen aan triggers.

**Effort: 6 dagen.**

**Waarom wel:** user-mentaal model klopt ("alles wat naar klanten gaat → één plek"); hergebruikt bestaand `SubTabNav` patroon; ontsluit hardcoded timings; geen breaking schema changes.

**Waarom niet:** 6 dagen is veel; te groot om vóór Barcelona te doen zonder regressie-risico tijdens afwezigheid.

---

### Optie C — Minimale consolidatie: "E-mail & Opvolging"

Trek alleen offerte-opvolging en factuur-opvolging binnen EmailTab. Portaal blijft met rust. White-label-gat en onboarding/trial-timings: aparte epic na FESPA.

```
Instellingen/
├── ► E-mail & Opvolging  ◄ (= huidige EmailTab uitgebreid)
│   ├── Mijn e-mail        (SMTP + handtekening)
│   ├── Templates          (placeholder-aliasing: {x} én {{x}} werken)
│   ├── Offerte-opvolging
│   └── Factuur-opvolging
├── Integraties
│   └── Portaal            (ONGEWIJZIGD, inclusief portaal-mail-templates)
└── (rest ongewijzigd)
```

**DB-impact:** geen migraties verplicht. Placeholder-aliasing in render-laag (accepteer beide syntaxes) i.p.v. DB-rewrite — zero risk.

**Migratie-pad:** OfferteOpvolgingTab als subtab in EmailTab (rename → `EmailEnOpvolgingTab`). Sections `offertes > opvolging` en `facturen > factuur-opvolging` uit `SettingsLayout.tsx` weghalen. Eén release met banner in oude locaties.

**Effort: 2 dagen.**

**Waarom wel:** past in halve week vóór FESPA + bug-fix met buffer; lost de zwaarste user-pijn (opvolg-config vinden) op zonder portaal-flow te raken; strikte subset van A — geen weggegooid werk.

**Waarom niet:** lost white-label en hardcoded onboarding/trial timings niet op; portaal-templates blijven gedupliceerd; voelt half als je het hele rapport leest.

---

## 5. Aanbeveling

**Doe C vóór FESPA, A erna.** C is een echte subset van A, dus geen herwerk — alleen fasering.

**Vóór Barcelona (~3 dagen incl. buffer):**
1. Br-bug lokaal fixen in `offerte-opvolging.ts:295` + `email-opvolging.ts:279` (~1 uur). Geen template-laag refactor onder tijdsdruk.
2. Optie C uitvoeren: OfferteOpvolgingTab + factuur-opvolging-subtab verhuizen naar "E-mail & Opvolging" (2 dagen).
3. Placeholder-aliasing in render-laag — accepteer `{x}` én `{{x}}` zodat users templates kunnen kopiëren zonder support-tickets tijdens jouw afwezigheid (0,5 dag).

**Na Barcelona (~4 dagen, in week-sprints):**
4. Portaal-e-mail-velden + onboarding/trial-timing-UI naar de Communicatie-tab (Optie A complete).
5. `bedrijfskleuren_gebruiken` daadwerkelijk laten werken — 15+ hardcoded kleur-instances in `PortaalHeader.tsx` + `PortaalFeedItem*.tsx` vervangen door org-kleur lookup.
6. `email_templates` tabel koppelen aan trigger-tasks (eindelijk gebruiken).
7. Per-project portaal-overrides UI (DB ondersteunt het al via `project_portalen.instructie_tekst`).

---

## 6. FESPA-overweging

| Categorie | Item |
|---|---|
| **MOET vóór Barcelona** | Br-rendering-bug fix (user-facing mailcorruptie) |
| **MOET vóór Barcelona** | Optie C tab-consolidatie (verkleint support-vragen tijdens afwezigheid) |
| **MOET vóór Barcelona** | Placeholder-aliasing (`{x}` én `{{x}}`) — voorkomt copy-paste-fouten van users |
| **KAN na Barcelona** | Architectuur-consolidatie naar Optie A (Communicatie supertab) |
| **KAN na Barcelona** | White-label kleur-toggle écht laten werken (15+ plekken) |
| **KAN na Barcelona** | UI voor onboarding-dag-3/7 en trial-reminder-5/2/0 |
| **KAN na Barcelona** | `email_templates` tabel koppelen aan triggers |
| **KAN na Barcelona** | Per-project portaal-overrides UI |

---

## Cruciale files voor implementatie

- `src/trigger/offerte-opvolging.ts:295` (bug-fix)
- `src/trigger/email-opvolging.ts:279` (bug-fix)
- `src/components/settings/SettingsLayout.tsx` (sections-array)
- `src/components/settings/EmailTab.tsx` (host voor nieuwe sub-tabs)
- `src/components/settings/OfferteOpvolgingTab.tsx` (verhuizen)
- `src/components/settings/PortaalTab.tsx` (later splitsen)
- `src/components/settings/SubTabNav.tsx` (hergebruiken)
- `src/trigger/utils/email.ts` (sendEmailForUser — eventueel HTML-wrapper toevoegen als wijdere fix)

---

**STOP — wacht op akkoord van Antony voordat implementatie-fase begint.**
