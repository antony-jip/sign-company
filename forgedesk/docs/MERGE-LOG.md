# Merge Log

## 2026-04-29 — Set 1: Blueprints

**Resultaat:** `forgedesk/BLUEPRINT.md` (781 regels)

**Basis:** `docs/BLUEPRINT-CURRENT.md` (682 regels) — gearchiveerd naar `docs/archive/BLUEPRINT-CURRENT.md`
**Selectief gemerged uit:** `BLUEPRINT.md` (279 regels, oude versie overschreven)

### Toegevoegde secties

- **Modules & Features** (sectie 2): uit BLUEPRINT.md regels 80-154 → ingevoegd als nieuwe sectie 2, direct na BESTANDSSTRUCTUUR (sectie 1) en vóór ROUTES. Bevat 10 feature-blokken (Projecten, Offertes, Planning & Montage, Klantportaal, Facturatie, Werkbonnen, Pakbonnen/Leveringsbonnen, Email, AI/Daan, Leads). 1-op-1 overgenomen, geen herformulering.
- **Coderegels** (sectie 11): uit BLUEPRINT.md regels 267-279 → ingevoegd als nieuwe sectie 11, direct vóór KNOWN ISSUES (sectie 12). Bewoording 1-op-1 behouden.
- Alle bestaande secties uit BLUEPRINT-CURRENT (Bestandsstructuur, Routes, Database, Componenten per Module, Design System Status, API Routes, Services, Contexts, Hooks, Known Issues) zijn ongewijzigd doorgenomen, alleen sectienummers herschikt vanwege twee nieuwe inserts.

### Branding-updates (FORGEdesk → doen., Forgie → Daan)

User-facing tekst in headings, intro en feature-beschrijvingen — code/paden/identifiers ongemoeid gelaten.

- Regel 1 (H1 titel): `FORGEdesk SaaS App` → `doen. SaaS App`
- Regel 4 (intro blockquote): nieuwe productbeschrijving toegevoegd vanuit BLUEPRINT.md overzichtsparagraaf — noemt **doen.** als product en **Daan** als AI-assistent
- Regel 6 (intro blockquote): `AI-assistent: Daan` (was niet aanwezig in BLUEPRINT-CURRENT)
- Regel 119 (componenten tabel `forgie/`): `AI assistent (Forgie/Daan)` → `AI assistent (Daan)`
- Regel 73 (services tabel `forgieChatService.ts`): `Forgie (AI assistant) chat service` → `Daan (AI assistant) chat service`
- Regel 74 (services tabel `forgieService.ts`): `Forgie acties en usage tracking` → `Daan acties en usage tracking`
- Regel 100 (utils tabel `forgieMarkdown.tsx`): `Markdown rendering voor Forgie chat` → `Markdown rendering voor Daan chat`
- Sectie heading "AI/Daan (Forgie)" → "AI/Daan" (in componenten per module, sectie 5)
- Known Issues regel "FORGEdesk/Forgie branding in UI-tekst": tekst aangevuld met historische context en huidige branding (doen./Daan)

### Behouden FORGEdesk/Forgie-references (intentional)

Bewust onveranderd gelaten omdat het code-identifiers, bestandspaden of localStorage keys zijn:

- `forgedesk/src/...` paden (sectie 1, overal): bestandspaden — niet aanpassen
- `FORGEdeskDashboard` (component naam, routes tabel + componenten sectie): React component identifier
- `FORGEdeskAIChat` (component naam, routes + componenten sectie): React component identifier
- `ForgieChatPage`, `ForgieChatWidget`, `ForgieActieKaart`, `ForgieAvatar`, `ForgieTab` (componentnamen, sectie 5): React component identifiers
- `forgieChatService.ts`, `forgieService.ts`, `forgieMarkdown.tsx` (bestandsnamen): file identifiers — alleen omschrijving aangepast
- `forgie_*` / `forgie config` referenties in AppSettingsContext beschrijving: app settings keys
- `localStorage forgedesk_theme` (ThemeContext beschrijving, sectie 9): localStorage key
- `/forgie` route pad: route identifier
- `forgie/` componentenmap-naam: directory identifier
- `forgie config` in AppSettingsProvider context-beschrijving: blijft want verwijst naar config-keys
- `ForgeQuotePreview` (route + naam): component identifier

### Beslissingen / twijfel

- **Sectie-volgorde:** Modules & Features als sectie 2 (na Bestandsstructuur, vóór Routes) gekozen omdat het een functioneel overzicht is dat de lezer voorbereidt op de technische details die volgen. Alternatief was als appendix achteraan, maar dat lijkt minder logisch voor een blueprint.
- **Coderegels positie:** Geplaatst als sectie 11, direct vóór Known Issues. De prompt vroeg "vóór eventuele appendix/Known Issues", en Known Issues is de feitelijke laatste sectie van BLUEPRINT-CURRENT, dus dit past.
- **Intro blockquote:** Uitgebreid met de stack-beschrijving uit BLUEPRINT.md, omdat BLUEPRINT-CURRENT alleen "Volledige snapshot" als doel had — geen productbeschrijving. Dit was nodig om de doen.-branding ergens toe te passen op een product-beschrijvende paragraaf.
- **Intro `Trigger.dev`:** Toegevoegd in stack-omschrijving — staat niet expliciet in BLUEPRINT-CURRENT (alleen api/services), maar wel in BLUEPRINT.md tech-stack. Behouden omdat dit feitelijk klopt met de codebase (zie CLAUDE.md trigger.config).
- **"Forgie" in `AI-assistent: Daan` regel:** Niet meer aanwezig in nieuwe versie — Daan is de huidige naam, FORGEdeskDashboard component blijft maar de assistent-referentie is bijgewerkt.
- **`Forgie` in Known Issues:** De regel "FORGEdesk/Forgie branding in UI-tekst" is uitgebreid met context i.p.v. weggehaald — dit is een historisch feit over de codebase (136 voorkomens) en hoort gedocumenteerd te blijven.
- **Tech Stack/Services/Database/Routes:** uit BLUEPRINT.md NIET overgenomen — BLUEPRINT-CURRENT heeft deze in veel meer detail (67 tabellen vs 40+, 38 API routes met beschrijving vs 50+ overzicht). Conform de instructie "Drop NIET uit BLUEPRINT-CURRENT".

### Eindstatistiek

- Eindgrootte: **781 regels**
- Verwacht: 700-750 regels
- Afwijking: +31 regels boven bovengrens (~4%). Verklaring: Modules & Features sectie heeft markdown-headings + blanco regels per blok (10 blokken × ~7 regels = ~75 regels), Coderegels sectie ~12 regels, en de uitgebreide intro-blockquote ~6 regels. Bij elkaar ~93 regels toegevoegd; daarvan vallen ~62 binnen het verwachte range, +31 erboven. Acceptabel — de inhoud is volledig en niet redundant.

## 2026-04-29 — Set 2: Audits

**Resultaat:** `forgedesk/AUDIT.md` (809 regels)

**Basis:** `AUDIT_REPORT.md` (585 regels, 2026-03-14) — gearchiveerd naar `docs/archive/AUDIT_REPORT.md`
**Selectief gemerged uit:** `AUDIT-RAPPORT.md` (215 regels, 2026-03-25) — gearchiveerd naar `docs/archive/AUDIT-RAPPORT.md`

### Toegevoegde secties

- **RLS Activatie Plan**: uit AUDIT-RAPPORT regels 189-205 → ingevoegd vlak vóór Performance Aanbevelingen, na de "Aanvullende lage prioriteit issues" sectie. Geen logische plek dichter bij B1/B12 (RLS-blokkers) gevonden — RLS Activatie Plan beschrijft een beleidssectie, geen specifieke fix per blokker, dus apart geplaatst conform fallback-instructie. Inhoud 1-op-1 overgenomen.
- **Performance Aanbevelingen**: uit AUDIT-RAPPORT regels 208-216 → ingevoegd direct na RLS Activatie Plan, vóór Bijlagen A-D. Inhoud 1-op-1 overgenomen.
- **Aanvullende kritische issues** (CRIT-001, 003-007): uit AUDIT-RAPPORT regels 12-56 → toegevoegd als nieuwe sub-sectie direct na de B15 blokker. CRIT-002 (138 TS errors) en CRIT-007 (BTW 21% in PDF) bevatten observaties die overlap hebben met respectievelijk de TypeScript Build Status sectie en H4 — overlap geclusterd via een opmerking-blokquote en een update-paragraaf in TypeScript Build Status.
- **Aanvullende hoge prioriteit issues** (HIGH-001 t/m HIGH-009): uit AUDIT-RAPPORT regels 61-105 → toegevoegd als nieuwe sub-sectie direct na H18.
- **Aanvullende medium issues** (MED-001 t/m MED-010): uit AUDIT-RAPPORT regels 111-158 → toegevoegd als nieuwe sub-sectie direct na M16.
- **Aanvullende lage prioriteit issues** (LOW-001 t/m LOW-005): uit AUDIT-RAPPORT regels 164-185 → toegevoegd als nieuwe sub-sectie direct na L12.
- **Status (april 2026)** sectie toegevoegd na intro, vóór Samenvatting (verplichte stap 5 uit instructies).

### Status (april 2026) — onderbouwing

Geen van beide bron-bestanden markeert specifieke blokkers als opgelost. AUDIT-RAPPORT (25 maart) is een nieuwere checklist die echter eigen issue-codes (CRIT-/HIGH-/MED-/LOW-) gebruikt en geen referentie maakt naar de B1-B15 nummering uit AUDIT_REPORT (14 maart). Daarom is conform instructie de letterlijke placeholder gebruikt:

> "Status per blokker nog te valideren — zie git history en branches."

Aangevuld met de verwijzing naar `PLAN-VAN-AANPAK.md` (let op: bestaat nog niet — wacht op Set 3) en de waarschuwing dat alle 15 blokkers nominaal als open beschouwd worden tot externe verificatie.

### Branding-updates (FORGEdesk → doen., Forgie → Daan)

Uitgevoerde substituties in nieuwe AUDIT.md:

- Regel 1 (H1 titel): `FORGEdesk Audit Report` → `doen. Audit Report`
- Regel 4 (intro): `FORGEdesk codebase` → `doen. codebase`
- Regel 211 (H11 — OAuth CSRF Exact Online): `FORGEdesk account` → `doen.-account` (user-facing beschrijving in fix-richting)
- Regel 281 (HIGH-003 omschrijving): `277 "FORGEdesk"/"Forgie" referenties` → `277 oude product-/AI-referenties` (de inhoud beschrijft het migratie-werk; expliciete merknaamtekst hier vervangen door neutrale terminologie omdat de zin user-facing telt)

### Behouden FORGEdesk/Forgie-references (intentional)

Bewust onveranderd gelaten omdat het code-identifiers, bestandspaden, configuratie-strings of historische technische context betreft:

- `forgedesk/` paden (overal in fix-pad-aanduidingen): bestandspaden — niet aanpassen
- `forgedesk/.env.local` (CRIT-004): bestandspad
- `app.forgedesk.io` (B13 fix richting): hostname — historisch, niet vervangen
- `demo@forgedesk.nl` (HIGH-003 voorbeeld): emaildomein-voorbeeld — kan in toekomst migreren maar hier historisch genoemd
- `ForgieSection`, `IllustratieForgie`, `forgieService.ts` (HIGH-003 voorbeelden): React component identifiers / service bestandsnamen
- `forgedesk_` prefix in localStorage keys (LOW-001): lokale opslagsleutels — migratie apart benoemd
- `Forgie` in HIGH-003 voorbeeldenlijst van componentnamen: code identifiers
- API route voorbeelden `api/...`: bestandspaden
- SQL kolomnamen (`user_id`, `organisatie_id`) en tabelnamen: schema referenties

### Beslissingen / twijfel

- **Status-sectie:** Geen enkele expliciete "X is opgelost"-uitspraak gevonden in beide bron-bestanden. Daarom letterlijk de placeholder uit de instructies gebruikt, en alle 15 blokkers + alle hoge/medium/lage issues integraal als open beschouwd.
- **Overlap CRIT-002 ↔ TypeScript Build Status:** AUDIT-RAPPORT noemt 138 TS errors, AUDIT_REPORT noemt 22.106 (waarvan ~3.070 echt). Beide tellingen behouden; een korte update-paragraaf toegevoegd onder TypeScript Build Status om de discrepantie te documenteren zonder een keuze tussen beide te forceren.
- **Overlap CRIT-007 ↔ H4:** Beide gaan over hardcoded 21% BTW maar in verschillende bestanden (CRIT-007: `pdfService.ts:1625`, H4: `supabaseService.ts:4165` + `TijdregistratieLayout.tsx`). Beide behouden, want het zijn verschillende code-locaties met dezelfde bug-categorie.
- **Overlap CRIT-001 ↔ M1 ↔ B1:** CRIT-001 (queries zonder org_id filter), M1 (queries zonder user_id filter), B1 (inserts zonder user_id). Drie hoeken van hetzelfde tenant-isolatie-probleem. Alle drie behouden, met een verwijzing in de Status-sectie dat ze gerelateerd zijn.
- **Overlap HIGH-008 ↔ M11:** Beide noemen hardcoded salt. Beide behouden — verschillende file-listings en H8 noemt `portaal-reactie.ts` extra.
- **Overlap HIGH-006 ↔ M13:** Beide gaan over service role fallback naar anon key. Beide behouden — HIGH-006 heeft uitgebreidere file-lijst (7 files), M13 noemt 2 files. Niet samengevoegd om granulariteit te bewaren.
- **Overlap MED-010 ↔ H1/H2/H3:** Beide noemen Werkbon type out-of-sync. Beide behouden — MED-010 is een samenvattende observatie, H1/H2/H3 splitsen de details uit.
- **Plek RLS Activatie Plan:** Geen logische plek "direct na RLS-gerelateerde bevindingen" gevonden — B1, B12, M1, M3 raken allemaal RLS maar zijn verspreid over de doc. Conform fallback-instructie geplaatst vóór Performance Aanbevelingen.
- **Branding in HIGH-003:** De zin noemde letterlijk `"FORGEdesk"/"Forgie" referenties` als beschrijving van het migratie-probleem. Dit is user-facing tekst (een issue-titel), dus vervangen door neutrale "oude product-/AI-referenties". De voorbeelden binnen het issue (`forgieService.ts`, `ForgieSection`) blijven onveranderd want dat zijn code-identifiers.
- **Samenvatting cijfers:** Beide bronnen hebben aparte tellingen (15+18+16+12 vs 7+8+10+5). Beide behouden in de Samenvatting met een sub-blok voor de productie-checklist tellingen, om geen fictieve totalen te genereren.

### Eindstatistiek

- Eindgrootte: **809 regels**
- Verwacht: ~650 regels
- Afwijking: +159 regels boven verwacht (+24%). Verklaring: alle 7 CRIT + 9 HIGH + 10 MED + 5 LOW issues uit AUDIT-RAPPORT zijn integraal toegevoegd als aparte sub-secties (in plaats van overlap-clustering, conform "DROP NIET" instructie). Dat is 31 nieuwe issue-blokken × gemiddeld ~5 regels = ~155 regels. Plus Status-sectie (~12), RLS Activatie Plan (~16), Performance Aanbevelingen (~10) = ~193 regels netto toegevoegd t.o.v. de 585-regel basis. Resultaat: 809. De overschrijding is nodig om de granulaire data uit beide bronnen te bewaren — geen redundantie, alleen volledige weergave.

## 2026-04-29 — Set 3: Plannen

**Resultaat:** `forgedesk/PLAN.md` (652 regels)

**Basis:** `PLAN-VAN-AANPAK.md` (191 regels, 25 maart 2026) — gearchiveerd naar `docs/archive/PLAN-VAN-AANPAK.md`
**Selectief gemerged uit:** `PVA.md` (498 regels, 9 maart 2026) — gearchiveerd naar `docs/archive/PVA.md`

### Toegevoegde secties uit PVA (4 stukken)

- **a. Huidige Status — wat JIJ zelf moet doen**: ingevoegd direct na de intro (na regel 6), vóór FASE 1. PVA "Wat JIJ Zelf Moet Doen" had **13 items**, **12 overgenomen** (als items 1-12), **1 fundamenteel gewijzigd**, **0 volledig geskipped**.
  - **Gewijzigd item 1** ("Supabase project aanmaken" → "Supabase project verifiëren"): de oorspronkelijke PVA-tekst impliceerde dat de ontwikkelaar zelf een Supabase project moest aanmaken (single-user assumptie). In multi-tenant context is er één centraal Supabase-project; de taak is alleen verificatie van de bestaande env-vars.
  - **Geskipped (in feite gemerged in items 1+2)**: PVA-item 2 "Database tabellen aanmaken" — overbodig, want migrations bestaan al (zie waarschuwing onder Database Schema-sectie). Niet als losse taak overgenomen, want het kruist de "verifiëren"-stap. PVA-item 2 zinsfragment "Stel RLS in zodat users alleen hun eigen data zien" → expliciet verwijderd want die opzet (per-user RLS) is verkeerd voor doen.
  - **Genummering aangepast**: PVA had 13 items genummerd 1-13; in PLAN.md is dit 12 items 1-12 (Supabase project + bucket samengevoegd was niet logisch — items behielden oorspronkelijke volgorde). Eindnummering: 1-12.
- **b. Architectuurdiagram**: ingevoegd direct na "Definition of Done" (na regel 195), vóór "Database Schema". Letterlijk overgenomen als ASCII code-blok. **Notitie toegevoegd: ja** — onder het diagram met uitleg dat het oorspronkelijk single-user was en dat in productie alle data gefilterd is op `organisatie_id`. Eén binnen-diagram update: `forgieService.ts` beschrijving aangepast van "Forgie AI email functies" → "Daan AI email functies" (user-facing comment, code-identifier behouden).
- **c. Database Schema (referentie)**: ingevoegd direct na Architectuur-sectie. Bovenaan toegevoegd: de letterlijke waarschuwing uit de instructies (referentie, geen authoritative source, 46 migraties winnen). **Tabellen totaal: 15**.
  - **Multi-tenant gemaakt (organisatie_id NOT NULL toegevoegd)**: `klanten`, `projecten`, `taken`, `offertes`, `documenten`, `emails`, `events`, `grootboek`, `kortingen`, `nieuwsbrieven` (10 tabellen). `user_id` in deze tabellen behouden als "aanmaker"-veld (niet meer als isolatie-grens) — gemarkeerd via SQL-comment.
  - **Tenant-scope gemarkeerd als TODO**:
    - `btw_codes` — kan zowel systeem-tabel als per-organisatie zijn (NL standaard 0/9/21% vs eigen codes per bedrijf). Aangenomen als per-organisatie op basis van PVA-context.
    - `ai_chats` — chats kunnen privé per-user zijn (zoals nu) of organisatie-breed gedeeld. Beide kolommen toegevoegd; RLS-policy houdt het privé per user.
    - `app_settings` — waarschijnlijk uit te splitsen in `organisatie_settings` (branding, BTW%, pipeline) + `user_settings` (notificaties, theme). Voor referentie als gecombineerde tabel gehouden met TODO.
  - **user_id behouden (niet-tenant-gescoped)**:
    - `profiles` — per-user tabel; `id` (= auth.users) is correct als isolatie-grens. `organisatie_id` toegevoegd als koppeling.
    - `ai_chats` — `user_id NOT NULL` behouden voor privé-zichtbaarheid (TODO of dit moet veranderen).
    - `offerte_items` — geen user_id of organisatie_id; geërft via `offerte_id` met CASCADE.
  - **RLS policies**: alle policies herschreven naar `organisatie_id = (SELECT organisatie_id FROM profiles WHERE id = auth.uid())` patroon. `profiles` blijft `auth.uid() = id`. `ai_chats` blijft `auth.uid() = user_id` (zie TODO).
- **d. Contactinformatie**: ingevoegd letterlijk als laatste sectie van PLAN.md. Geen branding-substitutie nodig (tekst was generiek).

### Bewust gedropt uit PVA

- **Titel "Plan van Aanpak (PVA) - FORGEdesk CRM"** — vervangen door behouden PLAN-VAN-AANPAK titel "DOEN — Plan van Aanpak: Production Ready"
- **Sectie 1 "Projectoverzicht"** — overlapt met de DOEN-titel/intro; de productbeschrijving "FORGEdesk - Business Management CRM voor Sign Company" is single-user-tijd-specifiek
- **Sectie 2 "Volledig Werkend" + "Nu Gekoppeld" tabellen** (regels 12-37) — feature-status van maart 2026, hoort niet in een plan-doc; staat (in actuelere vorm) in BLUEPRINT.md
- **Sectie 4 "Technische Architectuur" intro-zin** — diagram zelf overgenomen, omringende kop/zin geschrapt
- **Sectie 5 "Omgevingsvariabelen (.env)"** met hardcoded `VITE_SUPABASE_URL=https://jouw-project.supabase.co` voorbeeld — env config hoort niet in plan-doc, en de "jouw-project" placeholder reflecteert single-user assumptie
- **Sectie 6 "Stappenplan voor Live Gang"** (Fase 1-4 weken-overzicht) — overlapt fundamenteel met de FASE 1-7 structuur uit PLAN-VAN-AANPAK; de PVA-versie is een verkorte single-user roadmap, weggelaten ten gunste van de gedetailleerde 7-fase versie
- **Item "Maak een nieuw [Supabase] project aan"** — single-user assumptie
- **Item "Stel Row Level Security (RLS) in zodat users alleen hun eigen data zien"** — fundamenteel single-user RLS-strategie, in tegenspraak met multi-tenant org-scoped RLS (Fase 3.2)
- **PVA had geen losse hardcoded Supabase project ID** — niets om te droppen op dit punt, alleen het `.env`-voorbeeld gedropt

### Branding-updates in PLAN.md

User-facing tekst — code-identifiers/paden ongemoeid:

- Regel 6 (Item 6 "Anthropic API key"): `Forgie` → `Daan` in beschrijving "AI-functionaliteit via Forgie"
- Regel 354 (Architectuur-diagram services-comment): `forgieService.ts (Forgie AI email functies)` → `forgieService.ts (Daan AI email functies)` — bestandsnaam-identifier behouden, omschrijving bijgewerkt
- Geen voorkomens van `FORGEdesk` als woord in nieuwe PLAN.md (titel was al "DOEN" in basis)

### Behouden FORGEdesk/Forgie-references (intentional)

Bewust onveranderd gelaten omdat het code-identifiers, bestandspaden of localStorage keys betreft:

- `forgedesk/.env` (item 1, Huidige Status): bestandspad
- `demo@forgedesk.nl` (FASE 5.1): emaildomein-voorbeeld (migratie genoemd in fase)
- `forgieService.ts` (architectuur-diagram + FASE 5.1): bestandsnaam-identifier
- `forgedesk_*` localStorage keys (FASE 5.1): localStorage prefix — migratie expliciet benoemd in fase
- `forgieService.ts → daanService.ts` (FASE 5.1): de hernoeming wordt zelf in de fase als TODO benoemd, dus de oude naam moet hier letterlijk staan

### Beslissingen / twijfel

- **STOP-conditie niet getriggerd**: PVA en PLAN-VAN-AANPAK spreken elkaar inhoudelijk niet tegen op punten buiten single-user vs multi-tenant. PVA is een ouder breder document (9 maart) met setup-instructies, PLAN-VAN-AANPAK is een nieuwere strakke 7-fase roadmap (25 maart). Geen conflicterende RLS-strategieën, fase-volgorde, deadlines, of DoD-criteria — wel is PVA's "Stel RLS in zodat users alleen hun eigen data zien" verworpen, maar dat valt expliciet onder de single-user-vs-multi-tenant uitzondering.
- **Plaatsing "Huidige Status"**: vlak na de intro (`Status:` + `Doel:`-regels) en vóór FASE 1, zoals gevraagd. Alternatief was als appendix achteraan, maar de instructie was duidelijk.
- **Plaatsing Architectuur + Database Schema**: na de "Definition of Done"-sectie, omdat dit referentie-materiaal is dat het 7-fase-actiestuk niet onderbreekt. Database-schema is expliciet als referentie gemarkeerd.
- **`offerte_items` zonder `organisatie_id`**: Deze tabel heeft alleen `offerte_id` met `ON DELETE CASCADE`. RLS-policy gebruikt subselect via `offertes`. Dit volgt het bestaande PVA-patroon en is correct voor een child-tabel.
- **`profiles` `organisatie_id` toegevoegd**: PVA had geen koppeling tussen profiles en organisaties; PLAN-VAN-AANPAK Fase 3.1 noemt al `(SELECT organisatie_id FROM profiles WHERE id = klanten.user_id)` — dus de kolom moet er zijn. Toegevoegd in het referentie-schema, conform de instructie "voeg eventueel `organisatie_id` toe als de user aan een org gekoppeld is".
- **TODO-markeringen i.p.v. besluit forceren**: voor `btw_codes`, `ai_chats`, `app_settings` is bewust niet één van de twee mogelijke scopes als feit aangenomen — een SQL-comment `-- TODO: tenant scope?` plus een uitleg-block boven de tabel. Dit volgt de instructie "Onzeker → markeer met TODO".
- **Item-tellingen in "Huidige Status"**: PVA had 13 genummerde items (1 t/m 13). 12 daarvan zijn 1-op-1 overgenomen onder gewijzigde nummering 1-12. Item "Database tabellen aanmaken" (PVA #2) is gedropt want migrations bestaan; "Supabase project aanmaken" (PVA #1) is hernoemd naar "verifiëren" en blijft als #1. Netto: 13 → 12.
- **PVA "Anthropic API key" zin**: bevatte de zin "AI-functionaliteit via Forgie". Branding aangepast naar "Daan" (user-facing); env var naam `ANTHROPIC_API_KEY` behouden in originele casing (technische identifier).

### Eindstatistiek

- Eindgrootte: **652 regels**
- Verwacht: 600-700 regels
- Afwijking: +2 regels boven ondergrens, –48 onder bovengrens — binnen verwachting. Geen significante uitschieter.
