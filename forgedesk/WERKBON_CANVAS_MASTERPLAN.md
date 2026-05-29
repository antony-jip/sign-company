# Werkbon Canvas — Masterplan

> **Status:** v1.1 — beslissingen Antony verwerkt, klaar voor fase-1-implementatie in een aparte sessie.
> **Geschreven:** 2026-05-29
> **Doel:** werkbon-editor transformeren van form-based (klein/normaal/groot toggles) naar desktop canvas-achtige editor. Mobiel wordt read-only via aparte `WerkbonMonteurView`-component.

---

## Versiehistorie

- **v1.0** — initiële analyse + voorstel
- **v1.1** — Antony's beslissingen verwerkt:
  - Eén schrijf-bron `layout.schaal_percentage` vanaf fase 1 (`grootte` blijft alleen read-fallback)
  - Fase 3 inclusief vrije tekst-blokken, uren naar 60–100u
  - PDF-bestand-blok-type meegenomen in fase 2 (via reeds-aanwezig `pdfjs-dist`)
  - Per-item drop-zone, geen centrale
  - Mobile-fork via aparte `WerkbonMonteurView`-component (optie C) direct vanaf fase 1
  - Migratie-nummer reservering: 114 vrij in repo; Antony bevestigt in Supabase Dashboard

---

## 0. TL;DR

Drie fasen, in volgorde:

1. **Fase 1 — Drop & flow** (geschat 12–20 uur, 1–2 dagen). Per-item drop-zone vanuit desktop, nieuwe blok-types (foto/logo), free-reorder. `schaal_percentage` (continu) wordt nieuwe schrijf-bron; `grootte` alleen nog read-fallback. Mobile splitst naar aparte `WerkbonMonteurView`. Flow-based PDF blijft.
2. **Fase 2 — Free-position binnen item-block + PDF-blokken** (4–7 dagen, 32–56 uur). Resize via corner-handles, snap (25/50/75/100%), aspect-ratio lock, tekst-positie keuze. Drop van PDF-bestanden → eerste pagina via `pdfjs-dist` als image-blok. Flow-based PDF nog steeds.
3. **Fase 3 — Vrije canvas per pagina + tekst-blokken** (60–100 uur, 8–13 dagen). Drag-anywhere, layers/z-index, snap-to-grid 5mm, multi-page, vrije tekst-blokken op canvas. Coordinate-based PDF render naast bestaande flow-based — hybride. Inline split-pane preview als optie.

Per fase gate door Antony vóór begin volgende fase. Aparte feature-branches per fase, mergen na akkoord. Backward-compat verplicht — bestaande werkbonnen blijven werken zonder migratie-pijn.

---

## 1. Huidige staat

### 1.1 Component-tree werkbon-editor

```
App.tsx
  └─ Route "werkbonnen/:id" → WerkbonDetail
       │  (~950 regels, orchestrator: state, handlers, save, preview)
       │
       ├─ WerkbonHeaderForm.tsx (~190 regels)
       │    klant-select, project/offerte links, titel, datum,
       │    locatie, contact-op-locatie + contactpersoon-picker
       │
       ├─ WerkbonItemCard.tsx (~200 regels)  [meerdere instanties]
       │    per item: drag-handle (visueel, niet functioneel),
       │    move-up/down knoppen, delete, omschrijving textarea,
       │    afmetingen breedte/hoogte, max 2 afbeelding-thumbnails
       │    met klein/normaal/groot toggle, notitie voor monteur
       │
       ├─ WerkbonMonteurFeedback.tsx
       │    uren, monteur-opmerkingen, voor/na-foto's,
       │    klant-handtekening + naam, afronden-knop
       │
       └─ PdfPreviewDialog (lazy, gedeeld met Quotes/Offertes/Projects)
            live PDF preview met debounced refresh via bumpPreview()
```

**Route-fork:** lijst-views (`WerkbonnenLayout` desktop vs `WerkbonnenLayoutMobile`) is gefork in `App.tsx:114-115`. Maar **detail-route (`werkbonnen/:id`) heeft GEEN fork** — `WerkbonDetail` rendert altijd, ook op telefoon. In fase 1 splitsen we dit met een nieuwe `WerkbonMonteurView`-component voor mobile (zie §6).

### 1.2 PDF render (`werkbonPdfService.ts`, ~600 regels)

- jsPDF landscape A4 (297×210mm)
- Pre-resolve: logo + alle item-afbeeldingen naar base64 + ratio (voor `getImageProperties`)
- Header (klant/project/datum/aanmaker) → 38mm hoog
- Per item: flow-based render
  - `sizeFor(grootte)` → bounding box (klein 85×64mm, normaal 130×98mm, groot 267×100mm)
  - Loop over `afbeeldingen[0..1]`, plaats in 2x2 wrap-row
  - `drawImageContain` letterboxt binnen box (sinds commit `f2f10c26` zonder fill/border)
  - Tekst-block onder beelden: nummer + omschrijving + afmeting (groot in flame) + notitie (gele box)
- `estimatedHeight` per item → page-break check vóór render
- Page-break = `doc.addPage()` + re-render header
- Geen item-tabel, geen totalen — instructieblad, geen factuur

### 1.3 Wat blokkeert een canvas-aanpak?

| Onderdeel | Blokkade | Impact |
|---|---|---|
| Fixed text-block onder image-row | Tekst zit in code-flow tussen afbeeldingen en notitie, hardcoded `colW * 0.75` + `textY += omschrLines.length * 5` | Vrije positie van tekst onmogelijk zonder herschrijven |
| `estimatedHeight` page-break | Werkt alleen voor flow waar je hoogte vooraf kan voorspellen | Vrije x/y = onvoorspelbaar; nieuwe page-break logica nodig |
| Geen positie-data in DB | `werkbon_afbeeldingen` heeft alleen `grootte` enum | Migratie verplicht voor fase 2/3 |
| Geen drag-functionaliteit | `WerkbonItemCard` heeft visuele `GripVertical` maar geen `draggable` attr | Wel bestaande patterns elders (zie 4.1) |
| `WerkbonDetail` is desktop+mobile single component | Geen mobile-read-only mode | Aparte mobile component via optie C (zie §6) |

---

## 2. Datamodel

### 2.1 Huidig DB-schema (migratie 022 + 113)

```sql
werkbon_items
  id UUID PK
  werkbon_id UUID FK
  volgorde INT
  omschrijving TEXT
  afmeting_breedte_mm NUMERIC
  afmeting_hoogte_mm NUMERIC
  interne_notitie TEXT
  user_id UUID

werkbon_afbeeldingen
  id UUID PK
  werkbon_item_id UUID FK
  url TEXT          -- storage-path
  type TEXT         -- 'tekening' | 'drukproef' | 'foto' | 'overig'
  omschrijving TEXT
  grootte TEXT      -- 'klein' | 'normaal' | 'groot'  ← migratie 113
  created_at TIMESTAMPTZ
```

### 2.2 Migratie-strategie: **één JSONB-kolom `layout` op `werkbon_afbeeldingen`**

```sql
ALTER TABLE werkbon_afbeeldingen
  ADD COLUMN IF NOT EXISTS layout JSONB NOT NULL DEFAULT '{}'::jsonb;
```

Structuur per fase, alles in dezelfde `layout`-kolom — additief, geen schema-breaks:

**Fase 1** (nieuwe blok-types + reorder + schaal_percentage als nieuwe schrijf-bron):
```jsonc
{
  "blok_type": "foto",          // of "logo"
  "schaal_percentage": 50       // 0-100, continu (geen snap in fase 1)
}
```

**Belangrijk — corrigeerde Antony in v1.1:**

Vanaf fase 1 schrijft de UI **uitsluitend** `layout.schaal_percentage` (continu 0-100). De render-helper leest met fallback-keten:

```ts
function resolveSchaal(afb: WerkbonAfbeelding): number {
  return afb.layout?.schaal_percentage
      ?? deriveFromGrootte(afb.grootte)
      ?? 50
}

function deriveFromGrootte(g?: 'klein'|'normaal'|'groot'): number | undefined {
  if (!g) return undefined
  return { klein: 33, normaal: 50, groot: 100 }[g]
}
```

`grootte`-kolom blijft staan voor read-fallback op pre-migratie rijen, maar wordt **niet meer geschreven**. Voorkomt dual-source-of-truth in fase 2 als `schaal_percentage` continu wordt en `grootte` snap-discrete is — divergentie tussen wat editor toont en wat PDF rendert. Eén bron, één waarheid.

**Fase 2** (tekst-positie + PDF-blok):
```jsonc
{
  "blok_type": "foto",          // of "logo" of "pdf"
  "schaal_percentage": 50,      // nu met 25/50/75/100 snap, Shift voor vrij
  "tekst_positie": "rechts",    // "links" | "rechts" | "boven" | "onder"
  "pdf_bron_url": "..."         // alleen voor blok_type='pdf', URL van origineel PDF in storage
}
```

**Fase 3** (vrije canvas + tekst-blokken):
```jsonc
{
  "blok_type": "foto",          // ook "tekst" voor vrije tekst-blokken
  "schaal_percentage": 50,
  "tekst_positie": "rechts",
  "vrij_geplaatst": true,
  "x_mm": 45.5,
  "y_mm": 80.2,
  "breedte_mm": 120,
  "hoogte_mm": 80,
  "z_index": 2,
  "pagina": 1,
  "tekst_inhoud": "..."         // alleen voor blok_type='tekst', vrije rich-text
}
```

Render-logica leest `layout` met fallback-defaults:
```ts
const blok_type = afb.layout?.blok_type ?? 'foto'
const vrij = afb.layout?.vrij_geplaatst ?? false
// als !vrij → flow-render met schaal_percentage
// als vrij → coordinate-render
```

### 2.3 Backward compatibility — verplicht

- Bestaande `grootte` kolom blijft staan, fungeert als **read-only fallback** voor pre-migratie afbeeldingen.
- Lege `layout = {}` + bestaande `grootte` → render gebruikt `deriveFromGrootte(grootte)` → identiek aan vandaag.
- Bestaande werkbonnen in productie blijven werken **zonder migratie-data-write**. Alleen schema-add.
- Eerste edit van een legacy afbeelding (bv. schaal aanpassen) schrijft `layout.schaal_percentage` en daarna wordt `grootte` voor die rij effectief dood.
- Geen backfill-script. Lazy migratie via user-actions.

### 2.4 Logo-blok-type — fase 1

Gebruik bestaande `type='overig'` + `layout.blok_type='logo'`. **Geen schema-uitbreiding nodig.** JSONB is voor render-semantiek; `type` blijft documentcategorie.

### 2.5 PDF-blok-type — fase 2

Nieuw `layout.blok_type='pdf'`. Bewaar twee URLs:
- `werkbon_afbeeldingen.url` → image-render van eerste pagina (PNG/JPEG in storage)
- `layout.pdf_bron_url` → originele PDF (voor download/herrendering bij quality-bump)

Rendering eerste pagina naar image: client-side via reeds-beschikbaar `pdfjs-dist` (peer-dep van `react-pdf`). Bij upload: `getDocument()` → `getPage(1)` → `render()` naar canvas → `toBlob('image/png')` → uploaden naar Supabase Storage zoals huidige beelden.

### 2.6 Tekst-blok-type — fase 3

Nieuw `layout.blok_type='tekst'`. Apart record in `werkbon_afbeeldingen` (naam is dan misleidend — overwegen rename naar `werkbon_canvas_blokken` in fase 3 of acceptaat als legacy-naam). `url` blijft leeg, `layout.tekst_inhoud` houdt rich-text content. Font, kleur, alignment via uitbreiding van `layout`-structuur in fase 3.

---

## 3. PDF-renderer strategie

### 3.1 Trade-off: flow-based vs coordinate-based

| Aspect | Flow-based (huidig) | Coordinate-based (fase 3 nodig) |
|---|---|---|
| Implementatie | jsPDF helpers, item-loop, estimatedHeight | Lay-out berekenen vóór render, per element `addImage(x,y,w,h)` |
| Page-break | `if (y + h > avail) addNewPage()` | Berekening pagina-grenzen + element-clipping/wrapping |
| Bestaande werkbonnen | Werken direct | Migreren naar `layout.vrij_geplaatst` of fallback houden |
| Risico bij refactor | Laag (incrementeel uitbreiden) | Hoog (alle render-paden herschrijven) |
| Past bij fase 1+2 | Ja | Overkill |
| Past bij fase 3 | Nee, kan niet | Ja |

### 3.2 Voorstel: **hybride**

- **Fase 1+2: flow-based blijft.** sizeFor() krijgt erbij: `schaal_percentage` (continu) en `blok_type='logo'` / `'pdf'` (logo = 40×40mm rechtsboven, pdf = behandeld als image).
- **Fase 3: introduceer `coordinate-based`-pad NAAST flow-based.** Per item check `layout.vrij_geplaatst`. Als true → coord-render. Als false → bestaand flow-pad. Twee paden in dezelfde service.
- Bij fase 3 is de bestaande render-functie nog steeds canon voor legacy werkbonnen — geen breaking changes.

**Risico:** twee paden = onderhoudslast. Mitigatie: shared `drawImageContain` helper, gedeelde text-block helpers. Ramen op ~30% code-overlap.

### 3.3 Alternatief: vanaf fase 1 al coord-based

**Tegen:** alle huidige werkbonnen moeten layout-defaults krijgen (in DB of in render-default), grotere refactor up-front, hogere kans op regressies, geen incrementele waarde.

**Voor:** geen technical debt later, één rendering-paradigma.

**Advies:** hybride. Incrementeel, lager risico, levert in elke fase werkende werkbonnen op.

---

## 4. Editor-UI bibliotheek

### 4.1 Bestaande drag-drop patronen in codebase

`grep` op `draggable|onDragStart|onDragOver` toont **uitsluitend native HTML5 drag-and-drop**:

- `src/components/quotes/QuotesPipeline.tsx:1184-85` — kanban-card drag tussen kolommen
- `src/components/quotes/QuoteItemsTable.tsx:1088,1236,1307` — item/regel reorder
- `src/components/quotes/QuoteSidebar.tsx:231-236` — sidebar item drag
- `src/components/quotes/InkoopOffertePaneel.tsx:535` — drag-naar-doel
- `src/components/clients/DealsLayout.tsx:371,392` — deal-kaart drag
- `src/components/invoices/FactuurBijlagenSectie.tsx:370` — file-drop target

**Geen externe lib gebruikt.** Geen `react-dnd`, `dnd-kit`, `react-rnd`, `react-moveable`, `react-draggable`, `interactjs` in `package.json`.

CLAUDE.md regel: "Geen nieuwe npm packages zonder expliciete toestemming."

### 4.2 Per fase: wat hebben we nodig?

| Fase | Functie | Lib of self-built? |
|---|---|---|
| 1 | Drag-from-desktop drop op editor → upload | Native HTML5 `onDrop`. Bestaand patroon in `FactuurBijlagenSectie`. |
| 1 | Reorder blokken (up/down) | Native HTML5 `draggable` + reorder. Bestaand patroon in `QuoteItemsTable`. |
| 2 | Corner-resize handle | Self-built met pointer events (`onPointerDown` → `onPointerMove` → setSize). ~80-120 regels per component. Geen lib. |
| 2 | Snap (25/50/75/100%) | Self-built — `Math.round(percent/25)*25` in resize-handler |
| 2 | Aspect-ratio lock | Self-built — bewaar source ratio, w-only resize → h = w/ratio |
| 2 | PDF eerste pagina render → image | `pdfjs-dist` (al beschikbaar via `react-pdf` ^10.4.1). `getDocument` → `getPage(1)` → `render(canvas)` → `toBlob`. |
| 3 | Drag-anywhere | Self-built pointer events; bestaand HTML5 drag is suboptimaal voor pixel-perfect (geen smooth feedback) |
| 3 | Z-index / layers panel | Self-built UI + `layout.z_index` sort |
| 3 | Snap-to-grid 5mm | Self-built — `Math.round(coord/5)*5` |
| 3 | Vrije tekst-blokken edit | Self-built — `contentEditable` div met basis rich-text-keys (bold/italic via keyboard shortcut), of integratie met bestaande `Textarea` component (eenvoudiger). |

**Aanbeveling:** geen libs installeren. Self-built is meer code maar 100% controle, geen bundle-size hit, geen lib-mismatch met React 18.

**Risico:** self-built drag/resize op verschillende browsers (Safari touch pointer-events soms anders dan Chrome). Mitigatie: pointer-events API (cross-browser standaard), valideren in Safari + Chrome bij elke commit.

### 4.3 react-pdf is al beschikbaar — voor wat?

`react-pdf` ^10.4.1 in `package.json` (gebruikt door `PdfPreviewDialog`). Heeft `pdfjs-dist` als peer-dep met `getDocument()` + page-render-naar-canvas. **Gebruikt in fase 2 voor PDF-bestand-blokken** (PDF → eerste pagina als image rendering).

---

## 5. Preview-integratie

### 5.1 Bestaande live-preview (commit `4f075b83`)

- `PdfPreviewDialog` met `refreshNonce` prop
- `bumpPreview()` debounce 600ms, expliciete calls per handler
- Modal, max-w-5xl
- React-pdf rendert jsPDF output

### 5.2 Past dit nog bij fase 2/3?

**Fase 1**: ja, ongewijzigd. Nieuwe blok-types triggeren `bumpPreview()` zoals huidige toggle. Modal blijft volstaan.

**Fase 2**: ja, met opmerking. Bij vrije resize-wijziging triggert elke pointer-move een re-render via bumpPreview. Met 600ms debounce is dat OK, maar kan vertraagd voelen tijdens drag. **Alternatief:** preview blijft idle tijdens drag (`onPointerDown` zet `isDragging=true`, `onPointerUp` triggert bump). Cleaner UX.

**Fase 3**: hier wordt het modal-only model krap. Bij vrij slepen wil je het canvas EN de PDF preview tegelijk zien. Dialog die half het scherm vult = editor-helft te smal voor canvas. **Voorstel:** introduceer inline split-pane preview als optionele view-mode in fase 3. Toggle "Modal preview" ↔ "Split-pane preview". Modal blijft default voor smaller screens.

### 5.3 Inline split-pane — overweging

Eerder (klein/normaal/groot-rondje) afgewezen als scope creep. **Bij canvas-editor is het wél passend** want layout-werk wil je naast de PDF-resultaat doen. Niet in V1, wel mee-ontwerpen in fase 3.

---

## 6. Mobiel

### 6.1 Confirmatie scope-keuze

> "Mobiel wordt read-only (monteur kan lezen + tekenen, niet bouwen)"

Akkoord. Maar: wat **kan** een monteur op mobiel?
- ✅ Werkbon openen, items zien, foto's bekijken
- ✅ PDF downloaden / delen
- ✅ Uren invullen, opmerkingen, klant-handtekening (= afronden-flow)
- ✅ Voor/na-foto's uploaden
- ❌ Items toevoegen/verwijderen, herordenen
- ❌ Afbeeldingen uploaden naar items
- ❌ Tekst-velden bewerken (omschrijving/afmeting/notitie)
- ❌ Canvas (komt sowieso niet op mobiel)

### 6.2 Gekozen aanpak (v1.1): **optie C — aparte `WerkbonMonteurView` vanaf fase 1**

Rationale (Antony): clean separation, geen conditional-rendering-hel in `WerkbonDetail`. Iets meer werk nu, veel minder pijn later. Optie B (single component met `isReadOnly` prop) leidt onvermijdelijk tot tientallen `if (!readOnly)`-checks die scrollen door alle handlers en render-takken — onderhouds-nightmare.

**Implementatie fase 1:**

- Nieuwe `App.tsx` route-fork: `useMediaQuery('(min-width: 768px)')` → `WerkbonDetail` (desktop) of `WerkbonMonteurView` (mobile).
- Nieuwe component `src/components/werkbonnen/WerkbonMonteurView.tsx`:
  - Toont werkbon-header read-only (klant, project, datum, locatie, contact)
  - Items als kale read-only cards (omschrijving + afmeting + notitie + foto-thumbnails, geen edit-controls)
  - Hergebruikt `WerkbonMonteurFeedback` component (uren / opmerkingen / voor-na-foto's / handtekening) → blijft volledig bewerkbaar
  - Hergebruikt `PdfPreviewDialog` voor PDF-bekijken
  - Geen drop-zones, geen reorder, geen grootte-toggles
- Redirect-logica: monteur kan vanuit een desktop-link op mobiel landen → automatisch in monteur-view. Geen 404, geen forced redirect naar desktop.

### 6.3 Raakvlakken

- `App.tsx:117,271` — route-definitie en lazy-import van `WerkbonMonteurView`
- Nieuw: `src/components/werkbonnen/WerkbonMonteurView.tsx`
- `WerkbonDetail.tsx` — ongewijzigd qua functionaliteit, krijgt alleen geen mobile-render meer
- `WerkbonHeaderForm.tsx` — niet hergebruikt in mobile view (read-only data zit inline in `WerkbonMonteurView`)
- `WerkbonMonteurFeedback.tsx` — hergebruikt in beide views, geen wijziging
- `WerkbonItemCard.tsx` — niet hergebruikt in mobile view (read-only items inline gerenderd in `WerkbonMonteurView`)

---

## 7. Risico's & onbekenden

### 7.1 Wat gaat zeker stuk

- **Bestaande PDF-preview snapshots / verwachtingen** — render-output verandert per fase. Geen automated snapshots in repo, dus visueel verifiëren handmatig.
- **Mobile users die nu wel kunnen bewerken** — als ze workaround hadden om vanaf telefoon items toe te voegen, dat valt weg.
- **Drag-handler in `WerkbonItemCard`** — de `GripVertical`-icoon was visueel-only. Wordt nu functioneel. Geen breaking change maar gedragsverandering.
- **Werkbon-items zonder `volgorde`** — fase 1 reorder vereist `volgorde` correct. Bestaande items met `volgorde=0` of duplicaten moeten gerepareerd worden in de migratie.

### 7.2 Werkbonnen in productie die kunnen breken

Risico-vectoren:
1. **PDF render-paden** — als sizeFor/drawImageContain regressies krijgen → werkbon-PDFs verkeerd. Manueel testen op bekende productie-werkbon.
2. **Layout-JSONB null/undefined** — als render-helper niet defensief leest → JS errors. Mitigatie: `afb.layout?.blok_type ?? 'foto'` overal.
3. **Migratie idempotency** — IF NOT EXISTS in alle CREATE/ALTER (vandaag al de norm).
4. **Storage paths bij file-drop** — nieuwe upload-flow moet `sanitizeStorageFilename` blijven gebruiken (commit `9fe622ad`).
5. **PDF-bestand grote files** — `pdfjs-dist` rendert in browser; >50MB PDF kan tab laten freezen. Mitigatie: 25MB cap op upload, fall-back UI bij parse-error.

### 7.3 Bestaande tests

`tests/` map bevat alleen:
- `daan-context.test.ts`
- `tests/utils/templateRender.test.ts`
- `tests/utils/storageHelpers.test.ts` (mijn vorige commit)

**Geen werkbon-tests.** Geen render-snapshot tests. Geen E2E. → Handmatig testen verplicht na elke commit, per fase een gedocumenteerde test-pass.

### 7.4 Wat moet handmatig per fase

**Fase 1:**
- [ ] Drop JPG/PNG vanaf desktop op een item → blok verschijnt
- [ ] Drop logo → blok-type "logo", render-stijl klopt (40×40mm rechtsboven)
- [ ] Reorder blokken binnen een item via drag — volgorde wordt persistent
- [ ] Eerste edit van legacy afbeelding schrijft `layout.schaal_percentage` (verifieer via DB)
- [ ] Bestaande werkbon met klein/normaal/groot opent ongewijzigd
- [ ] PDF render = bestaande werkbon visueel identiek
- [ ] Mobile: `WerkbonMonteurView` opent op telefoon, geen edit-controls, monteur-feedback bewerkbaar
- [ ] Desktop-link op telefoon → automatisch monteur-view
- [ ] Live preview ververst na elke wijziging

**Fase 2:**
- [ ] Corner-resize beeld werkt smooth in Chrome + Safari
- [ ] Snap-to-25/50/75/100 voelt natuurlijk, Shift omzeilt snap
- [ ] Aspect-ratio lock — beeld vervormt nooit
- [ ] Tekst-positie left/right/top/bottom rendert correct in PDF
- [ ] Schaal 25% met lange notitie past nog op pagina
- [ ] Schaal 100% triggert geen lege pagina (lessons learned uit commit `f2f10c26`)
- [ ] Drop PDF-bestand → eerste pagina verschijnt als image-blok binnen 3 seconden
- [ ] Drop multi-page PDF → alleen eerste pagina geïmporteerd (V2 spec; multi-page later)
- [ ] Beschadigde/encrypted PDF → graceful error, geen crash
- [ ] Performance: 5 items × 2 afbeeldingen op één werkbon — preview-refresh < 2s

**Fase 3:**
- [ ] Drag-anywhere positie persistent
- [ ] Z-index logica klopt — logo bovenop foto
- [ ] Snap-to-grid 5mm voelt prettig
- [ ] Vrije positie blijft binnen pagina-grenzen (geen overflow naar buiten margin)
- [ ] Vrije tekst-blokken: type, format, drag, resize
- [ ] Bestaande flow-werkbonnen blijven 100% identiek renderen
- [ ] Mix: één item flow-based, ander vrij geplaatst, beide op dezelfde werkbon
- [ ] Inline split-pane preview rendert correct in viewport ⩾ 1280px

---

## 8. Fasering & volgorde

### 8.1 Fase 1 — Drop & flow

**In scope:**
- Migratie 114: `layout JSONB` op `werkbon_afbeeldingen` (verifieer vrij in Supabase Dashboard vóór nummer-reservering — zie open punten)
- Per-item drop-zone (geen centrale — Antony's keuze: voorkomt twee patronen voor één actie)
- File-drop handler: JPG/PNG, multi-file, mime-validatie
- Nieuwe blok-type "logo" via `layout.blok_type` (vast 40×40mm rechtsboven in item-block; vrij plaatsbaar pas in fase 3)
- Reorder blokken binnen item via HTML5 drag
- `schaal_percentage` als nieuwe schrijf-bron; klein/normaal/groot toggle blijft visueel maar zet onder water `schaal_percentage` (33/50/100)
- `grootte`-kolom blijft staan, alleen-lezen voor pre-migratie rijen
- Mobile: nieuwe `WerkbonMonteurView` component + route-fork in `App.tsx`

**Buiten scope fase 1:**
- Resize / corner-handles
- Vrije positie
- PDF-bestand als blok-type
- Multi-page canvas
- Tekst-positie keuze
- Reorder tussen items (alleen binnen één item)

**Files geraakt (ramen):**
- `supabase/migrations/114_werkbon_layout_jsonb.sql` (nieuw — nummer onder voorbehoud van Supabase check)
- `src/types/index.ts` (uitbreiden `WerkbonAfbeelding.layout`)
- `src/services/werkbonService.ts` (uploadHandler accepteert blok_type, updateLayout helper)
- `src/services/werkbonPdfService.ts` (logo blok-type render-pad, `resolveSchaal()` fallback-keten)
- `src/components/werkbonnen/WerkbonDetail.tsx` (drop-handler per item)
- `src/components/werkbonnen/WerkbonItemCard.tsx` (drag-reorder binnen item + drop-zone)
- nieuw: `src/components/werkbonnen/WerkbonDropZone.tsx` (gedeelde drop-helper)
- nieuw: `src/components/werkbonnen/WerkbonMonteurView.tsx` (mobile read-only view)
- `src/App.tsx` (route-fork desktop/mobile voor `werkbonnen/:id`)

**Geschatte uren (inclusief 40% buffer):** 12–20

**Stop-gate vóór fase 2:**
- Antony test fase 1 in productie ⩾ 1 week
- Bevestigt: drop-flow + logo-blok + reorder + mobile read-only werken zoals verwacht
- Bevestigt: eerste edit van legacy afbeelding schrijft `layout.schaal_percentage` correct (steekproef in DB)
- Geen blocking regressies in bestaande werkbonnen
- Akkoord per email/bericht: "Fase 2 mag starten"

### 8.2 Fase 2 — Free-position binnen item-block + PDF-blokken

**In scope:**
- Corner-resize handle op elke afbeelding-thumbnail in editor
- Snap percentages 25/50/75/100, Shift-toets voor vrij
- Aspect-ratio lock
- Tekst-positie keuze per item (radio: links/rechts/boven/onder t.o.v. afbeelding)
- PDF-bestand drop → render eerste pagina via `pdfjs-dist`, upload als image-blok + bewaar `pdf_bron_url`
- PDF render: lees `schaal_percentage` continu, `tekst_positie`, `blok_type='pdf'` (rendert identiek aan foto)
- Klein/normaal/groot toggle blijft als shortcut maar zet onderliggend `schaal_percentage`

**Buiten scope fase 2:**
- Vrije positie (drag-anywhere)
- Multi-page (PDF-import = alleen eerste pagina)
- Z-index
- Vrije tekst-blokken

**Files geraakt (ramen):**
- `src/services/werkbonPdfService.ts` (text-position-aware layout, schaal-percentage render, pdf-blok als image)
- `src/components/werkbonnen/WerkbonItemCard.tsx` (corner-handle, tekst-positie radio, pdf-blok preview)
- nieuw: `src/components/werkbonnen/AfbeeldingResizeHandle.tsx` (pointer-events handler)
- nieuw: `src/utils/pdfToImage.ts` (pdfjs-dist eerste-pagina → blob helper)
- `src/services/werkbonService.ts` (PDF-upload-flow met dual-storage)
- `src/types/index.ts` (layout type uitbreiden, pdf-blok)

**Geschatte uren:** 32–56 (verhoogd t.o.v. v1.0 vanwege PDF-blok scope — inclusief Safari/Chrome cross-browser testing + PDF-edge-cases)

**Stop-gate:** zelfde proces als 8.1.

### 8.3 Fase 3 — Vrije canvas per pagina + vrije tekst-blokken

**In scope:**
- `layout.vrij_geplaatst=true` → coordinate-render-pad
- Drag-anywhere binnen pagina-grenzen
- Snap-to-grid 5mm, Shift-vrij
- Z-index UI (mini-knoppen: naar voren / naar achteren)
- Multi-page navigatie (toggle tussen pagina's)
- Inline split-pane preview optie (toggle naast modal-preview, default modal voor smaller screens)
- Logo's kunnen bovenop foto's
- **Vrije tekst-blokken** (`layout.blok_type='tekst'`) — sleepbaar, resize-baar, content via contentEditable of Textarea
- Logo-blokken worden ook vrij plaatsbaar (niet meer vast rechtsboven)

**Buiten scope:**
- Roteren
- Smart-guides / align-tot-andere-objecten
- Undo/redo (apart fase 4 als nodig)
- Multi-page PDF-import (alleen eerste pagina blijft de regel; multi-page kost te veel scope)
- Rich-text formatting binnen tekst-blokken (alleen plain-text/basis bold-italic via keyboard shortcuts)

**Files geraakt (ramen):**
- `src/services/werkbonPdfService.ts` (tweede render-pad coord-based, tekst-blok render)
- `src/components/werkbonnen/WerkbonDetail.tsx` (canvas-mode toggle)
- nieuw: `src/components/werkbonnen/WerkbonCanvas.tsx` (canvas-pagina component)
- nieuw: `src/components/werkbonnen/WerkbonCanvasElement.tsx` (sleepbaar element — image, logo, pdf, tekst)
- nieuw: `src/components/werkbonnen/WerkbonTekstBlok.tsx` (vrije tekst-blok editor)
- `src/components/shared/PdfPreviewDialog.tsx` (split-pane mode)
- `src/types/index.ts`
- `src/services/werkbonService.ts`

**Geschatte uren:** 60–100 (verhoogd t.o.v. v1.0 met vrije tekst-blokken erbij — Antony's keuze: meenemen i.p.v. uitstellen). Hoogste onzekerheid van de drie.

**Stop-gate:** zelfde proces.

### 8.4 Volgorde-overwegingen

- **Niet beginnen aan fase 2 voordat fase 1 in productie staat ⩾ 1 week** — feedback van echte werkbonnen vormt fase 2-keuzes.
- **Niet beginnen aan fase 3 voordat fase 2 in productie staat ⩾ 2 weken** — coord-based is grootste risico, vereist meeste leerwerk.
- Optionele tussenstap na fase 1: gebruiker-test met 3-5 monteurs/opstellers, vraag of fase 2 nog gewenst is. Soms is fase 1 al voldoende.

---

## 9. Rollback-strategie

### 9.1 Feature-flag per fase

In `app_settings` of `org_settings`: nieuw veld `werkbon_canvas_versie: 0 | 1 | 2 | 3`.

- 0 = huidig (geen wijzigingen zichtbaar)
- 1 = fase 1 ingeschakeld
- 2 = fase 2 ingeschakeld
- 3 = fase 3 ingeschakeld

Render-paden checken setting:
```ts
const versie = appSettings.werkbon_canvas_versie ?? 0
if (versie >= 1) { /* logo-blok beschikbaar, drop-zones, monteur-view */ }
if (versie >= 2) { /* resize-handles, PDF-blokken */ }
if (versie >= 3) { /* vrije positie, tekst-blokken */ }
```

Setting wordt door Antony in productie aangezet per organisatie (eerst eigen org, daarna breder).

**Voordeel:** instant rollback door setting terug te zetten naar 0. Geen code-revert nodig.

**Nadeel:** dead-code-paths in productie. Acceptabel voor zo'n grote refactor.

### 9.2 Branch-strategie

**Per fase een eigen feature-branch:**
- `feat/werkbon-canvas-fase1`
- `feat/werkbon-canvas-fase2`
- `feat/werkbon-canvas-fase3`

Mergen naar `main` per fase-afronding, niet per commit. Hierdoor kan Antony per fase:
- De feature-branch lokaal trekken en testen
- Akkoord geven voor merge
- In productie de feature-flag aanzetten

**Tussen fasen:** geen lange-leven branches. Fase 2 branched van `main` ná merge van fase 1.

### 9.3 Migration-rollback

Migratie 114 (en eventuele fase-2/3 migraties) zijn additieve `ADD COLUMN IF NOT EXISTS`. **Niet draaibaar terug** zonder data-verlies, maar zonder fase-feature-flag worden de kolommen genegeerd — equivalent aan rollback.

**Geen `DROP COLUMN`-strategie nodig**: kolom blijft bestaan, render-pad gebruikt 'm niet meer als flag = 0.

### 9.4 PDF render-pad rollback

Bij regressie in jsPDF render: feature-flag terug naar lagere fase → flow-based render zonder JSONB-velden actief → identiek aan vorige stabiele staat.

**Worst case:** fase 3 coord-based render heeft bugs. Flag → 2. Vrij-geplaatste afbeeldingen vallen terug op flow-positie (default x=0,y=0 binnen item-block). Zichtbaar maar niet stuk.

---

## Antony's beslissingen v1.1 — open punten afgerond

| # | Vraag | Beslissing |
|---|---|---|
| 1 | Per-item drop-zone of centraal? | **Per-item drop-zone, geen centrale.** Nieuwe items via "+ Item toevoegen" knop zoals nu. Voorkomt twee patronen voor één actie. |
| 2 | Logo-blok render specs? | **Vast 40×40mm rechtsboven in item-block voor fase 1.** In fase 3 wordt 'ie vrij plaatsbaar zoals andere blokken. |
| 3 | Drop-zone styling? | **Dashed flame-border (#F15025) tijdens dragover op cream-bg (#F8F7F5).** Conform forgedesk-design skill. |
| 4 | Mobile-fork keuze? | **Optie C direct vanaf fase 1**: aparte `WerkbonMonteurView` component. Clean separation, geen conditional-rendering-hel. Iets meer werk nu, veel minder pijn later. |
| 5 | Migratie 114 vrij? | **Repo: ja, 113 is laatste.** Vóór fase 1 commit moet Antony bevestigen dat `schema_migrations` in productie geen parallel 114 heeft. Zo wel → 115. Vermelden in commit message. |

---

## Aanbevolen volgende stappen

1. **Niet in deze sessie beginnen met fase 1.** Document is v1.1, klaar om als basis voor een aparte fase-1-sessie te dienen.
2. Antony bevestigt vóór fase-1-start: Supabase `schema_migrations` heeft geen parallel 114.
3. Nieuwe sessie starten met "Begin fase 1 — gestart vanuit WERKBON_CANVAS_MASTERPLAN.md". Eerst migratie 114 voor reviewen, dan implementatie-batches.
4. Tussen fasen: minimaal één productie-week met monitoring (Sentry) voor regressies.
5. **Niet alles in één sessie bouwen.** Verspreid over weken, niet uren.

---

**Einde document v1.1. Geen code geschreven in deze sessie. Klaar om gecommit te worden.**
