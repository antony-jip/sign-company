# PORTAAL-ANALYSE.md — Klantportaal Systeem

> Automatisch gegenereerd op 2026-03-23

---

## 1. ALLE BESTANDEN

### src/components/portaal/ (16 bestanden, 5112 regels totaal)

| Bestand | Regels | Beschrijving |
|---------|--------|-------------|
| `PortaalPagina.tsx` | 493 | Hoofd klant-facing portaal pagina (publiek, geen login) |
| `PortalenOverzicht.tsx` | 708 | Admin overzicht van alle actieve portalen |
| `ClientApprovalPage.tsx` | 764 | Legacy goedkeuringspagina (backward-compat) |
| `PortaalBerichtenSection.tsx` | 266 | Berichten/chat sectie in portaal |
| `PortaalChat.tsx` | 298 | Chat container met berichten en input |
| `PortaalChatBubble.tsx` | 77 | Enkele chat bubble (bedrijf of klant) |
| `PortaalChatDaySeparator.tsx` | 36 | Dag-scheidslijn in chat |
| `PortaalChatInput.tsx` | 566 | Chat input met bestandsupload en reactie knoppen |
| `PortaalChatProgress.tsx` | 111 | Voortgang indicator in chat |
| `PortaalChatRichCard.tsx` | 315 | Rich card voor offertes/tekeningen/facturen in chat |
| `PortaalDrukproevenSection.tsx` | 460 | Drukproeven sectie (per-image goedkeuring) |
| `PortaalGesloten.tsx` | 48 | "Portaal gesloten" melding |
| `PortaalLightbox.tsx` | 224 | Afbeelding lightbox |
| `PortaalOfferteSection.tsx` | 255 | Offerte weergave in portaal |
| `PortaalReactieForm.tsx` | 371 | Reactie formulier (goedkeuren/revisie/bericht) |
| `PortaalVerlopen.tsx` | 120 | "Portaal verlopen" pagina met link-aanvraag |

### Portaal-gerelateerde componenten elders

| Bestand | Regels | Beschrijving |
|---------|--------|-------------|
| `projects/cockpit/PortaalSidebarCard.tsx` | 869 | Portaal beheer in project sidebar |
| `projects/cockpit/PortaalPanel.tsx` | 186 | Portaal panel in project cockpit |
| `projects/ProjectPortaalTab.tsx` | 551 | Portaal tab in project detail |
| `settings/PortaalTab.tsx` | 526 | Portaal instellingen in settings |

### api/portaal-*.ts (7 bestanden, 1165 regels totaal)

| Bestand | Regels | Beschrijving |
|---------|--------|-------------|
| `portaal-get.ts` | 385 | Portaal data ophalen voor klant |
| `portaal-create.ts` | 106 | Nieuw portaal aanmaken |
| `portaal-reactie.ts` | 300 | Klant reactie verwerken + email notificatie |
| `portaal-upload.ts` | 142 | Bestand uploaden door klant |
| `portaal-link-aanvragen.ts` | 86 | Nieuwe portaallink aanvragen |
| `portaal-bekeken.ts` | 67 | Items als bekeken markeren |
| `portaal-verlengen.ts` | 79 | Portaal verlengen (+30 dagen) |

### Supabase service functies (in supabaseService.ts)

| Functie | Regel | Beschrijving |
|---------|-------|-------------|
| `getDefaultPortaalInstellingen()` | 5255 | Default portaal settings |
| `getPortaalInstellingen(userId)` | 5259 | Portaal instellingen ophalen |
| `updatePortaalInstellingen(userId, settings)` | 5276 | Portaal instellingen updaten |
| `getAllPortalen()` | 5291 | Alle portalen met project/klant info + items |
| `getPortaalByProject(projectId)` | 5327 | Actief portaal per project |
| `getPortaalByToken(token)` | 5345 | Portaal ophalen via publieke token |
| `createPortaal(projectId, userId)` | 5360 | Nieuw portaal aanmaken (of bestaand retourneren) |
| `verlengPortaal(portaalId)` | 5394 | Portaal +30 dagen verlengen |
| `deactiveerPortaal(portaalId)` | 5417 | Portaal deactiveren |
| `getPortaalItems(portaalId, alleenZichtbaar)` | 5435 | Items ophalen met bestanden en reacties |
| `createPortaalItem(item)` | 5466 | Nieuw portaal item aanmaken |
| `updatePortaalItem(itemId, updates)` | 5485 | Portaal item updaten |
| `deletePortaalItem(itemId)` | 5504 | Soft-delete (zet zichtbaar_voor_klant=false) |
| `createPortaalBestand(bestand)` | 5509 | Bestand record aanmaken |
| `createPortaalReactie(reactie)` | 5526 | Reactie opslaan |
| `getAllePortalen(userId)` | 5622 | Alle portalen van een gebruiker met project info |

### Types (in types/index.ts)

| Type | Regel | Beschrijving |
|------|-------|-------------|
| `ProjectPortaal` | 1562 | Portaal per project (id, token, actief, verloopt_op) |
| `PortaalItem` | 1574 | Item in portaal (offerte/tekening/factuur/bericht) |
| `PortaalBestand` | 1605 | Bestand bij portaal item |
| `PortaalReactie` | 1617 | Klant reactie (goedkeuring/revisie/bericht) |
| `AppNotificatie` | 1628 | App notificatie (portaal events) |
| `PortaalEmailTemplate` | 1643 | Email template (onderwerp + inhoud) |
| `PortaalInstellingen` | 1648 | Alle portaal configuratie (19 velden) |

---

## 2. API ROUTES DETAIL

### `GET /api/portaal-get?token=xxx`
- **Auth:** Publiek (geen login) + rate limit (30/min per IP)
- **Wat:** Haalt alle portaaldata op voor de klant
- **Flow:**
  1. Zoek portaal via token in `project_portalen`
  2. Fallback: check `tekening_goedkeuringen` (backward-compat)
  3. Check status: gesloten → return bedrijfsinfo, verlopen → return bedrijfsinfo + token
  4. Parallel ophalen: project, profiel, document style, portaal items
  5. Resolve storage URLs voor bestanden
  6. Return: status, portaal info, project, bedrijf (naam/logo/kleuren), instellingen, items met bestanden/reacties
- **Return bij actief:** `{ status: 'actief', portaal, project, bedrijf, instellingen, items }`
- **Return bij gesloten:** `{ status: 'gesloten', bedrijfsnaam, logo_url, ... }`
- **Return bij verlopen:** `{ status: 'verlopen', token, bedrijfsnaam, ... }`

### `POST /api/portaal-create`
- **Auth:** Bearer token (Supabase JWT) — eigenaar verificatie
- **Wat:** Maakt nieuw portaal aan voor een project
- **Flow:**
  1. Verifieer user via JWT
  2. Check of user eigenaar is van project
  3. Check of er al een actief portaal bestaat → hergebruik
  4. Genereer 64-char hex token
  5. Bereken verloopt_op op basis van `link_geldigheid_dagen` uit instellingen
  6. Insert in `project_portalen`
- **Return:** `{ portaal, hergebruikt: boolean }`

### `POST /api/portaal-bekeken`
- **Auth:** Publiek + rate limit (20/min per IP)
- **Wat:** Markeert portaal items als bekeken
- **Flow:**
  1. Valideer token
  2. Update `updated_at` op portaal
  3. Batch update `bekeken_op` voor opgegeven items (alleen waar NULL)
- **Return:** `{ success: true }`

### `POST /api/portaal-reactie`
- **Auth:** Publiek + rate limit (10/uur per IP)
- **Wat:** Verwerkt klant reactie (goedkeuring/revisie/bericht)
- **Flow:**
  1. Valideer token, item bestaan en zichtbaarheid
  2. Insert reactie in `portaal_reacties`
  3. Update item status (goedgekeurd/revisie)
  4. Bij offerte goedkeuring: sla gekozen_items/varianten op bij offerte
  5. Koppel eventuele uploads aan reactie
  6. Maak in-app notificatie aan in `notificaties` tabel
  7. Stuur email naar gebruiker via SMTP (encrypted credentials)
- **Email:** Branded HTML email met "Doen." branding, bedrijfslogo, primaire kleur
- **Return:** `{ reactie }`

### `POST /api/portaal-upload`
- **Auth:** Publiek + rate limit (10/uur per IP)
- **Wat:** Bestandsupload door klant
- **Beperkingen:** Max 10MB, alleen JPG/PNG/PDF
- **Flow:**
  1. Valideer token, item, bestandstype en grootte
  2. Sanitize bestandsnaam (directory traversal preventie)
  3. Upload naar Supabase Storage bucket `portaal-bestanden`
  4. Fallback: base64 data URL als storage faalt
  5. Insert record in `portaal_bestanden`
- **Return:** `{ url, thumbnail_url, bestandsnaam, id }`

### `POST /api/portaal-link-aanvragen`
- **Auth:** Publiek + rate limit (3/uur per IP)
- **Wat:** Klant vraagt nieuwe portaallink aan (bij verlopen portaal)
- **Flow:**
  1. Zoek portaal via token
  2. Zoek klant via project → klant_id
  3. Vergelijk opgegeven email met klant email
  4. Bij match: maak `app_notificaties` record aan voor eigenaar
  5. Altijd zelfde response (voorkomt email enumeration)
- **Return:** `{ success: true, message: "Als het e-mailadres bekend is..." }`

### `POST /api/portaal-verlengen`
- **Auth:** Bearer token (Supabase JWT) — eigenaar verificatie
- **Wat:** Verleng portaal met 30 dagen
- **Flow:**
  1. Verifieer user
  2. Check eigenaarschap
  3. Bereken nieuwe vervaldatum (+30 dagen vanaf nu of huidige vervaldatum)
  4. Update + heractiveer portaal
- **Return:** `{ portaal }`

---

## 3. DATABASE

### Tabellen en relaties

```
project_portalen
├── id (PK)
├── user_id (FK → profiles)
├── project_id (FK → projecten)
├── token (uniek, 64-char hex)
├── actief (boolean)
├── verloopt_op (timestamp)
├── instructie_tekst (text)
├── created_at, updated_at
│
├── portaal_items (1:N)
│   ├── id (PK)
│   ├── user_id
│   ├── project_id
│   ├── portaal_id (FK → project_portalen)
│   ├── type ('offerte' | 'tekening' | 'factuur' | 'bericht')
│   ├── offerte_id (FK → offertes, nullable)
│   ├── factuur_id (FK → facturen, nullable)
│   ├── titel, omschrijving, label
│   ├── status ('verstuurd' | 'bekeken' | 'goedgekeurd' | 'revisie' | 'betaald' | 'vervangen')
│   ├── bekeken_op (timestamp, nullable)
│   ├── mollie_payment_url (nullable)
│   ├── bedrag (nullable)
│   ├── zichtbaar_voor_klant (boolean)
│   ├── volgorde, sort_order
│   ├── bericht_type ('item' | 'tekst' | 'foto' | 'notitie_intern')
│   ├── bericht_tekst, foto_url
│   ├── afzender ('bedrijf' | 'klant')
│   ├── email_notificatie (boolean)
│   ├── created_at, updated_at
│   │
│   ├── portaal_bestanden (1:N)
│   │   ├── id (PK)
│   │   ├── portaal_item_id (FK → portaal_items)
│   │   ├── bestandsnaam, mime_type, grootte
│   │   ├── url, thumbnail_url
│   │   ├── uploaded_by ('bedrijf' | 'klant')
│   │   └── created_at
│   │
│   └── portaal_reacties (1:N)
│       ├── id (PK)
│       ├── portaal_item_id (FK → portaal_items)
│       ├── portaal_bestand_id (FK, nullable)
│       ├── type ('goedkeuring' | 'revisie' | 'bericht')
│       ├── bericht, klant_naam, klant_email
│       └── created_at

app_notificaties (voor portaal events)
├── id, user_id, type, titel, bericht, link
├── project_id, offerte_id, klant_id
├── gelezen, actie_genomen, created_at

app_settings.portaal_instellingen (JSONB kolom)
├── portaal_module_actief, portaal_standaard_actief
├── link_geldigheid_dagen (default: 30)
├── instructie_tekst
├── klant_kan_offerte_goedkeuren (default: true)
├── klant_kan_tekening_goedkeuren (default: true)
├── klant_kan_bestanden_uploaden (default: true)
├── klant_kan_berichten_sturen (default: false)
├── max_bestandsgrootte_mb (default: 10)
├── email_naar_klant_bij_nieuw_item, email_naar_mij_bij_reactie
├── herinnering_na_dagen (default: 3)
├── bedrijfslogo_op_portaal, bedrijfskleuren_gebruiken, contactgegevens_tonen
└── template_portaallink, template_nieuw_item, template_herinnering
```

### Storage buckets
- `portaal-bestanden` — Klant uploads (max 10MB, JPG/PNG/PDF)
- `documenten` — Bedrijfsbestanden (tekeningen, drukproeven)

---

## 4. FLOW

### Portaal aanmaken (bedrijfszijde)

1. **Gebruiker** opent project → cockpit → `PortaalSidebarCard.tsx`
2. Klikt "Portaal activeren" → `createPortaal(projectId, userId)` of `POST /api/portaal-create`
3. Systeem genereert 64-char hex token + berekent vervaldatum
4. Portaal URL: `https://app.dframed.nl/portaal/{token}`
5. Gebruiker voegt items toe via `ProjectPortaalTab.tsx`:
   - Offerte koppelen → `createPortaalItem({ type: 'offerte', offerte_id })`
   - Tekening uploaden → bestand + item
   - Bericht sturen → `createPortaalItem({ type: 'bericht', bericht_type: 'tekst' })`
6. Link wordt gekopieerd of per email verstuurd

### Portaal bekijken (klantzijde)

1. **Klant** opent URL `/portaal/{token}`
2. `PortaalPagina.tsx` wordt geladen (publieke route, geen login)
3. Component roept `GET /api/portaal-get?token=xxx` aan
4. API retourneert status:
   - `actief` → toon portaal met chat-interface
   - `gesloten` → toon `PortaalGesloten.tsx` met contactinfo
   - `verlopen` → toon `PortaalVerlopen.tsx` met link-aanvraag formulier
5. Bij actief portaal:
   - Items worden als chat-bubbels weergegeven (`PortaalChat.tsx`)
   - Offerte items → `PortaalOfferteSection.tsx` of `PortaalChatRichCard.tsx`
   - Drukproeven/tekeningen → `PortaalDrukproevenSection.tsx` (per-image goedkeuring)
   - `POST /api/portaal-bekeken` wordt aangeroepen voor onbekeken items
6. Klant kan reageren:
   - Goedkeuren/revisie via `PortaalReactieForm.tsx` → `POST /api/portaal-reactie`
   - Bestand uploaden → `POST /api/portaal-upload` → `POST /api/portaal-reactie`
   - Bericht sturen → `POST /api/portaal-reactie` met type 'bericht'
7. Bij reactie:
   - Item status wordt geüpdatet
   - In-app notificatie wordt aangemaakt
   - Email wordt verstuurd naar bedrijf (via SMTP)

### Token flow

```
[Bedrijf]                          [Klant]
    │                                  │
    │── POST /api/portaal-create ──►   │
    │   (JWT auth, retourneert token)  │
    │                                  │
    │── Stuur link per email/chat ──►  │
    │                                  │
    │                  GET /api/portaal-get?token=xxx
    │                  (publiek, rate limited)
    │                                  │
    │                  POST /api/portaal-bekeken
    │                  (markeert items als gezien)
    │                                  │
    │                  POST /api/portaal-reactie
    │◄── notificatie + email ──────────│
    │                                  │
    │                  POST /api/portaal-upload
    │                  (bestand upload, max 10MB)
```

### Herinnering flow

`usePortaalHerinnering.ts` hook draait in de achtergrond:
1. Haalt alle actieve portalen op
2. Check per item of het onbeantwoord is > X dagen (configureerbaar)
3. Stuurt email herinnering naar klant
4. Maakt notificatie aan
5. Draait 1x per sessie

---

## 5. WAT WERKT, WAT MIST, WAT IS KAPOT

### Wat werkt

- **Portaal CRUD:** Aanmaken, verlengen, deactiveren werkt volledig
- **Token-based access:** Klant kan zonder login het portaal bekijken
- **Chat-interface:** Berichten, bestanden, goedkeuring/revisie als chat flow
- **Per-image goedkeuring:** Drukproeven kunnen per afbeelding goedgekeurd worden
- **Offerte in portaal:** Offerte met optionele items/varianten goedkeuren
- **Bestandsupload:** Klant kan JPG/PNG/PDF uploaden (max 10MB)
- **Rate limiting:** Alle publieke endpoints hebben rate limits
- **Email notificaties:** Bij reactie wordt email verstuurd via SMTP
- **Backward-compatibiliteit:** Oude `tekening_goedkeuringen` tokens werken nog via fallback in `portaal-get`
- **Beveiligde link-aanvraag:** Voorkomt email enumeration (altijd zelfde response)
- **Storage URL resolving:** Slimme resolving van storage paths naar publieke URLs

### Wat mist / onvolledig

- **Realtime updates:** Geen WebSocket/realtime subscription — klant moet pagina herladen voor nieuwe items
- **Factuur betaling in portaal:** `mollie_payment_url` veld bestaat maar de integratie flow is niet duidelijk vanuit portaal-get (betaling via aparte `/betalen/:token` route)
- **klant_kan_berichten_sturen:** Default `false` — chatfunctie is beschikbaar maar standaard uitgeschakeld
- **Email templates:** `template_portaallink`, `template_nieuw_item`, `template_herinnering` zijn gedefinieerd in PortaalInstellingen maar de API routes gebruiken hardcoded HTML templates (in `portaal-reactie.ts`)
- **Portaal analytics:** Geen tracking van hoeveel keer een klant het portaal bezoekt (alleen `bekeken_op` per item)
- **Meerdere portalen per project:** Code voorkomt dit (`createPortaal` hergebruikt bestaand actief portaal), maar dat zou gewenst gedrag kunnen zijn voor verschillende projectfasen
- **Geen klant-authenticatie:** Iedereen met de token kan het portaal bekijken — geen extra verificatie (bewuste keuze voor gebruiksgemak)

### Potentiele problemen

- **`deletePortaalItem` is een soft-delete:** Zet alleen `zichtbaar_voor_klant=false`, verwijdert het item niet echt. Dit kan data ophoping veroorzaken
- **`portaal-reactie.ts` zoekt `referentie_id`** (regel 147) maar `PortaalItem` type heeft geen `referentie_id` veld — het heeft `offerte_id`. Dit kan een bug zijn waardoor offerte-opties bij goedkeuring niet worden opgeslagen
- **Base64 fallback in upload:** Als Supabase Storage faalt, worden bestanden als base64 data URLs opgeslagen in de database (regel 102 van portaal-upload.ts). Dit kan de database opblazen
- **`PortaalSidebarCard.tsx` is 869 regels:** Bevat veel logica voor items toevoegen, berichten, bestanden — overweeg opsplitsen
- **Dubbele portaal functies:** `getAllPortalen()` (zonder userId filter) en `getAllePortalen(userId)` doen bijna hetzelfde maar met andere queries. Verwarrend
- **Branding "Doen." vs "FORGEdesk":** De email templates in `portaal-reactie.ts` gebruiken "Doen." branding (regel 44, 47) terwijl de app "FORGEdesk" heet. Dit is ofwel de nieuwe merknaam of een inconsistentie
- **Email sturen is niet-blokkerend:** `sendMail()` draait als fire-and-forget promise (regel 279-287), fouten worden alleen gelogd. Klant weet niet of bedrijf de reactie email ontvangen heeft

### Aanbevelingen

1. **Fix `referentie_id` bug** in portaal-reactie.ts — zou `offerte_id` moeten zijn
2. **Voeg Supabase Realtime toe** voor live updates in het portaal
3. **Verwijder base64 fallback** in portaal-upload — beter een error tonen dan de DB vullen
4. **Splits PortaalSidebarCard** op in kleinere componenten
5. **Maak email templates configureerbaar** — gebruik de templates uit PortaalInstellingen
6. **Kies één merknaam** — "Doen." of "FORGEdesk"
