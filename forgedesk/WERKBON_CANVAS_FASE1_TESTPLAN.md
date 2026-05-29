# Werkbon Canvas Fase 1 — Lokaal Testplan

> Voor Antony's lokale acceptatie-test op branch `feat/werkbon-canvas-fase1`.
> Geschreven: 2026-05-29.
> Pre-req: migraties 114 + 115 gedraaid, `werkbon_canvas_versie = 1` op jouw org.
> Scope: dekt alle 9 acceptatiecriteria uit `WERKBON_CANVAS_MASTERPLAN.md` §7.4 plus
> 4 extra verificaties (2-cap, live preview, PDF, feature-flag rollback).

---

## Pre-flight checks

Eerst valideren dat de pre-req in de DB klopt. Run de drie queries in de Supabase
SQL Editor van jouw eigen organisatie-database.

### A. Layout-kolom bestaat (migratie 114)

```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'werkbon_afbeeldingen'
  AND column_name = 'layout';
-- Verwacht: 1 row — data_type = 'jsonb', column_default = "'{}'::jsonb"
```

### B. Feature-flag kolom bestaat (migratie 115)

```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'app_settings'
  AND column_name = 'werkbon_canvas_versie';
-- Verwacht: 1 row — data_type = 'integer', column_default = '0'
```

### C. Flag actief op jouw org

```sql
SELECT organisatie_id, werkbon_canvas_versie
FROM app_settings
WHERE organisatie_id = '<jouw-org-uuid>';
-- Verwacht: 1 row met werkbon_canvas_versie = 1
```

Als A, B en C alle drie kloppen → ga door naar test-stappen. Anders eerst
migraties draaien of `UPDATE app_settings SET werkbon_canvas_versie = 1 WHERE
organisatie_id = '<jouw-org-uuid>'` runnen.

### D. Branch + build lokaal

```bash
cd ~/sign-company/forgedesk
git checkout feat/werkbon-canvas-fase1
npm run build
npm run dev
```

Verwacht: build groen, dev-server op `http://localhost:5173`. Login als jouw
eigen org.

---

## Test-volgorde

1. Pre-flight checks (hierboven)
2. Editor: drop JPG/PNG op item (criterium 1)
3. Editor: logo-pill toggle + PDF-render rechtsboven (criterium 2)
4. Editor: reorder afbeeldingen binnen item (criterium 3)
5. Editor: legacy-afbeelding eerste edit → `layout.schaal_percentage` (criterium 4)
6. Editor: bestaande werkbon klein/normaal/groot opent ongewijzigd (criterium 5)
7. PDF render visueel identiek (criterium 6)
8. 2-cap test bij drop (extra)
9. Live preview 600ms debounce (criterium 9 + extra)
10. Mobile: telefoon opent `WerkbonMonteurView` (criterium 7)
11. Mobile: desktop-link op telefoon → monteur-view (criterium 8)
12. Feature-flag rollback test (extra)

---

## Acceptatie-criteria fase 1 — test-stappen

### 1. Drop JPG/PNG vanaf desktop op een item

**Stap:** open een bestaande werkbon op desktop via `/werkbonnen/:id` met
minimaal 1 item dat 0 of 1 afbeelding heeft. Sleep een JPG of PNG vanaf Finder
naar de item-card (overal binnen de card-zone is goed). Houd vast tijdens
`dragover` om de overlay te zien voor je loslaat.

**Verwacht tijdens `dragover`:** dashed flame-border `2px #F15025` rond de hele
item-card, met cream-bg-overlay `rgba(248, 247, 245, 0.5)` over de card. Geen
layout-shift (overlay is absolute).

**Verwacht na drop:** thumbnail verschijnt in het `grid grid-cols-2`-blok onder
"Afbeeldingen". Toast `"1 afbeelding toegevoegd"` (of N bij multi-file).
Bestaande overlay verdwijnt. Teller "0/2" wordt "1/2".

**DB-verify:** in Supabase SQL Editor:

```sql
SELECT id, werkbon_item_id, url, layout, created_at
FROM werkbon_afbeeldingen
WHERE werkbon_item_id = '<item-uuid>'
ORDER BY created_at DESC
LIMIT 1;
-- Verwacht: layout = {"blok_type": "foto"}
-- url begint met "werkbon-afbeeldingen/<item-uuid>/"
```

---

### 2. Drop logo → blok-type "logo", render 40×40mm rechtsboven

**Stap A — pill-toggle:** klik in de item-card op de pill rechtsboven op een
thumbnail. Pill toont nu `FOTO` (default). Klik → wordt `LOGO`.

**Verwacht visueel pill:**
- Foto-state: `bg-white/80`, grijze text `#9B9B95`, geen border, label `FOTO`.
- Logo-state: `bg-[#FFFFFF]`, flame text `#F15025`, `border-2 border-[#F15025]`,
  label `LOGO`. Font-mono 10px uppercase tracking-wider.

**Stap B — PDF-render:** klik bovenin de werkbon-detail op het oog-icoon
(`Eye`, title "Live preview") om de PDF-preview dialog te openen. Wacht 600ms
op refresh.

**Verwacht PDF:** logo rendert vast 40×40mm in de rechter-bovenhoek van de
item-block. Eventuele foto in dezelfde item-block rendert separaat in de
foto-flow (logo overlapt mogelijk lange omschrijving — bewust geaccepteerd
voor fase 1, zie open items).

**DB-verify:**

```sql
SELECT id, layout
FROM werkbon_afbeeldingen
WHERE id = '<afb-uuid>';
-- Verwacht: layout JSONB bevat "blok_type": "logo"
```

---

### 3. Reorder afbeeldingen binnen één item via drag

**Stap:** open een item met 2 afbeeldingen in de grid. Sleep de eerste thumb
naar de positie van de tweede en laat los op de tweede thumb. Tijdens drag:
de gedragen thumb wordt `opacity-40`.

**Verwacht:** volgorde wisselt direct in de UI. Geen toast (silent succes).
PDF-preview refresht na 600ms.

**DB-verify:** beide afbeeldingen krijgen `layout.volgorde` (0 voor eerste, 1
voor tweede). Run:

```sql
SELECT id, layout->>'volgorde' AS volgorde, created_at
FROM werkbon_afbeeldingen
WHERE werkbon_item_id = '<item-uuid>'
ORDER BY (layout->>'volgorde')::int NULLS LAST, created_at;
-- Verwacht: 2 rows, volgorde 0 en 1, in de nieuwe volgorde
```

**Note:** reorder-semantiek "dragged altijd vóór target" — eerste thumb
gedraagd naar tweede positie betekent: eerste thumb komt vóór tweede thumb
op de doel-index. Herlaad de pagina → volgorde blijft persistent.

---

### 4. Eerste edit van legacy afbeelding schrijft `layout.schaal_percentage`

**Stap:** zoek een werkbon waarvan ten minste één afbeelding pre-canvas is
(layout `{}` of `null`). Snel-zoek via SQL:

```sql
SELECT a.id AS afb_id, a.werkbon_item_id, a.grootte, a.layout, wi.werkbon_id
FROM werkbon_afbeeldingen a
JOIN werkbon_items wi ON wi.id = a.werkbon_item_id
WHERE a.layout = '{}'::jsonb OR a.layout IS NULL
LIMIT 5;
```

Open die werkbon. In de item-card vind de afbeelding. Klik op de
klein/normaal/groot-toggle onder de thumb — wissel naar een andere waarde
(als 'ie nu Normaal staat, klik Klein of Groot).

**Verwacht:** toggle-state update direct (button met `bg-[#F15025]`). Geen
zichtbare verandering aan de thumb zelf in de editor (formaat-effect alleen
in PDF).

**DB-verify:**

```sql
SELECT id, grootte, layout
FROM werkbon_afbeeldingen
WHERE id = '<afb-id>';
-- Verwacht na klein → layout = {"blok_type": "foto", "schaal_percentage": 33}
-- Verwacht na normaal → layout = {"blok_type": "foto", "schaal_percentage": 50}
-- Verwacht na groot → layout = {"blok_type": "foto", "schaal_percentage": 100}
-- "grootte" enum blijft ongewijzigd (alleen read-fallback)
```

**Belangrijk:** als `grootte` mee-update is dat een regressie. UI mag
**uitsluitend** `layout.schaal_percentage` schrijven per masterplan v1.1.

---

### 5. Bestaande werkbon met klein/normaal/groot opent ongewijzigd

**Stap:** open een bestaande werkbon van vóór de migratie (een waarin geen
afbeelding ooit via canvas-toggle is aangeraakt). Bekijk de
klein/normaal/groot-toggle onder elke thumb.

**Verwacht:** voor elke thumb staat de juiste toggle-knop actief
(`bg-[#F15025]`) op basis van de oude `grootte` enum:
- `grootte='klein'` → "Klein" actief
- `grootte='normaal'` → "Normaal" actief
- `grootte='groot'` → "Groot" actief
- `grootte` NULL → "Normaal" actief (default-fallback 50%)

**Code-pad:** `resolveSchaal` returnt `deriveFromGrootte(grootte)` bij lege
layout. Mapping in `WerkbonItemCard.tsx:181`: `schaal <= 40 → klein`,
`schaal <= 75 → normaal`, anders `groot`.

**Verwacht visueel:** geen veranderingen ten opzichte van pre-canvas — thumbs
zien er identiek uit, monteur-notitie geel, afmetingen in mono.

---

### 6. PDF render = bestaande werkbon visueel identiek

**Stap:** kies een bestaande, afgeronde werkbon met afbeeldingen (mix
klein/normaal/groot). Druk op het FileText-icoon (`title="Download PDF"`).
Bewaar de PDF lokaal.

Switch dan tijdelijk naar `main` (of een pre-canvas commit) en doe hetzelfde
voor dezelfde werkbon (lokaal in een tweede dev-server, of via vergelijking
met een eerder gedownloade PDF).

**Verwacht:** beide PDF's renderen visueel identiek. Foto-formaten op exact
dezelfde pixels (`klein` = 85×64mm, `normaal` = 130×98mm, `groot` = 267×100mm
bij `contentWidth = 267`). Header, briefpapier, monteur-feedback identiek.

**Optionele steekproef-verificatie:** open een werkbon waarin geen enkele
afbeelding ooit een `layout.blok_type = 'logo'` heeft. Druk op preview. PDF
mag geen 40×40mm logo-vlak in een item-block tonen — alleen briefpapier-logo
linksboven (als `toon_briefpapier = true`).

---

### 7. Mobile: `WerkbonMonteurView` opent op telefoon

**Stap:** open de werkbon-detail-route `http://<dev-server>:5173/werkbonnen/<id>`
op een telefoon (of via Chrome DevTools mobile-emulator, breedte < 768px).
Login als monteur of admin.

**Verwacht component:** `WerkbonMonteurView.tsx` rendert (niet `WerkbonDetail`).
Herkenbaar aan:
- Pagina-bg `#F8F7F5` (cream), niet de editor-toolbar
- Items zijn read-only: geen `GripVertical`-grip, geen
  `ChevronUp`/`ChevronDown`-knoppen, geen `Trash2`, geen edit-velden voor
  omschrijving/afmeting/notitie
- Per item: omschrijving (read-only tekst), afmeting in mono, gele
  notitie-blok, thumb-grid waar tappen = lightbox open (géén
  blok-type-pill, géén grootte-toggle, géén delete-X)
- Onderaan: `WerkbonMonteurFeedback` is wel volledig bewerkbaar:
  uren-input, monteur-opmerkingen-textarea, voor/na-foto-upload,
  handtekening-canvas, "Werkbon afronden"-knop

**Negatieve check:** als status = `afgerond`, vergrendelen de
monteur-feedback-velden via `readOnly={werkbon.status === 'afgerond'}`
(regel 525 in WerkbonMonteurView). Test: zet via SQL `status='afgerond'`,
herlaad, verifieer dat uren/opmerkingen/handtekening niet meer te bewerken
zijn. Reset daarna naar `concept` of `gereed`.

```sql
UPDATE werkbonnen SET status = 'afgerond' WHERE id = '<werkbon-uuid>';
-- na test:
UPDATE werkbonnen SET status = 'gereed' WHERE id = '<werkbon-uuid>';
```

---

### 8. Desktop-link op telefoon → automatisch monteur-view

**Stap:** plak een desktop-link van een werkbon (bijv. uit een email die je
op desktop kopieert) op je telefoon. Open de link.

**Verwacht:** dezelfde route `werkbonnen/:id` opent direct in
`WerkbonMonteurView` (geen redirect zichtbaar). Logic in `App.tsx:120-126`:
`WerkbonDetailWrapper` checkt `useMediaQuery('(min-width: 768px)')` en
`werkbonCanvasVersie >= 1`. Bij flag = 0 of breedte ≥ 768px → `WerkbonDetail`.

**Verifieer:** geen edit-affordances zichtbaar (zie criterium 7).

---

### 9. Live preview ververst na elke wijziging

**Stap:** open een werkbon op desktop. Klik op het oog-icoon (`Eye`, title
"Live preview") om `PdfPreviewDialog` te openen. Wacht tot eerste render
klaar is. Maak nu een wijziging in een item: typ in de omschrijving, wissel
een klein/normaal/groot, of toggle een logo-pill.

**Verwacht:** ~600ms na de laatste wijziging refresht de preview-pagina van
de dialog automatisch (nieuwe PDF rendert). Snel-typen accumuleert in één
refresh per 600ms-window (debounce). Mechaniek in `WerkbonDetail.tsx:148-152`:
`bumpPreview()` → `setTimeout(setPreviewNonce, 600)`.

**Negatieve check:** wanneer dialog gesloten is (`showPdfPreview === false`),
schiet de timer niet (regel 149 vroege return). Dat is bewust — voorkomt
nodeloos werk.

---

## Extra verificaties

### 2-cap test op drop

**Stap:** open een item met 0 afbeeldingen. Sleep 3 JPG/PNG-bestanden
tegelijk vanaf Finder naar de item-card.

**Verwacht:** 2 thumbnails verschijnen. Toast `"2 afbeeldingen toegevoegd"`
plus tweede toast `"1 afbeelding(en) overgeslagen (max 2 per item)"`. Teller
"0/2" wordt "2/2".

**Stap-vervolg:** sleep nog 1 file naar dezelfde item-card.

**Verwacht:** geen upload, alleen `toast.error("Max 2 afbeeldingen per
item")`. Code-pad: `handleAfbeeldingenDropped` regel 527-532.

**Stap-edge-case:** sleep een PDF of `.txt` naar een item.

**Verwacht:** geen upload, geen toast. DropZone filtert `f.type.startsWith
('image/')` op regel 47 — non-image-files vallen weg en de drop is een
no-op.

---

### Feature-flag rollback test

**Stap:** zet de flag uit:

```sql
UPDATE app_settings SET werkbon_canvas_versie = 0 WHERE organisatie_id = '<jouw-org-uuid>';
```

Herlaad een werkbon-detail op desktop.

**Verwacht (flag = 0):**
- `WerkbonItemCard` rendert **zonder** drop-zone effect: sleep een JPG naar
  een item → geen flame-border overlay, geen upload (DropZone disabled
  per regel 107 van `WerkbonItemCard`).
- Logo/foto-pill is **niet zichtbaar** op thumbs (regel 196 check `canvasActief`).
- Thumbs zijn niet draggable (`draggable={canvasActief}` regel 188) — reorder
  werkt niet.
- Mobile-route opent `WerkbonDetail`, niet `WerkbonMonteurView`
  (App.tsx:124 check `werkbonCanvasVersie >= 1`).
- Klein/normaal/groot-toggle blijft wel werken (pre-canvas patroon).
- Bestaande werkbonnen met `layout.blok_type = 'logo'` blijven correct
  renderen in PDF — render-paden zijn **niet** gegate, alleen UI-affordances.

**Stap:** zet flag weer aan:

```sql
UPDATE app_settings SET werkbon_canvas_versie = 1 WHERE organisatie_id = '<jouw-org-uuid>';
```

Herlaad. Verwacht: alle canvas-features (drop-zone, logo-pill, reorder,
mobile monteur-view) zijn terug. Geen deploy nodig.

---

## Bekende open items voor fase 2 (niet test-blokkers)

Tijdens fase 1 acceptatie mag je deze items signaleren wanneer ze opvallen,
maar ze blokkeren de gate niet. Allemaal vastgelegd in `REVIEW_NOTES.md`
sectie "Werkbon canvas fase 1":

- **2-dashed-borders bij dragover** — gefixt in Stream H1 vóór deze
  acceptatie-ronde. Mocht je toch dubbele borders zien: rapporteren.
- **`estimatedHeight` negeert logo-only items** — bij item met enkel een
  logo zonder foto/notitie kan logo bottom-margin schenden bij
  page-break-edge. Lage kans; fase-2-fix overwegen via `hasLogo`-tak.
- **Logo overlapt lange omschrijving in no-image branch** en in
  groot-foto rechter-bovenhoek. Bewust geaccepteerd voor fase 1 (vrij
  plaatsbaar pas in fase 3).
- **`bg-white` anti-pattern** — 3× in `WerkbonMonteurView` (regels 364,
  373, 459) en 17× elders in werkbonnen-module. Cosmetisch cleanup-ticket
  post-fase-1, niet blokkerend.
- **Em-dash in `WerkbonMonteurView`** — gefixt in Stream H1 per memory
  `feedback_geen_em_dashes`. Mocht je nog em-dashes zien: rapporteren.
- **`profile?.naam` TS-issue** in `WerkbonMonteurView.tsx:238` en
  `WerkbonDetail.tsx:340` — pre-existing, niet door deze branch
  geïntroduceerd. Apart fix-ticket.
- **Reorder N-writes geen rollback bij failure tweede call** — N=2 max
  per item; impact klein voor fase 1.
- **`disabled` op DropZone niet gebonden aan `status === 'afgerond'`** —
  pre-canvas patroon: afgeronde werkbon = alles bewerkbaar in editor.
  Buiten scope.

---

## Akkoord-flow

Wanneer alle 12 test-stappen groen zijn:

1. Markeer in masterplan §7.4 fase 1 alle 9 checkboxes.
2. Bevestig per bericht: "Fase 2 mag starten" of "Fase 1 gaat ⩾ 1 week in
   productie eerst" per stop-gate uit masterplan §8.1.
3. Eventuele opmerkingen uit "bekende open items" → losse tickets.

Bij rode test-stap: rapporteer aan dev-agent met (a) welk criterium, (b)
verwacht vs werkelijk, (c) screenshot indien visueel, (d) eventuele
console-error of toast-tekst.
