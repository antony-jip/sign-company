# Werkbon Canvas — Masterplan

> **Status:** v1.2 — fase 1+2 lokaal afgerond, fase 3 heroriëntatie na lokale fase-2-test. Klaar voor Antony's gate.
> **Geschreven:** 2026-05-29
> **Doel:** werkbon-editor transformeren van form-based (klein/normaal/groot toggles) naar **echte canvas-editor per item**. Mobiel blijft read-only via aparte `WerkbonMonteurView`-component.

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
- **v1.2** — fase-2-leerpunten verwerkt. Fase 3 herontworpen: van "vrije positie binnen item-block" naar **echte canvas-editor per item**. Klein/normaal/groot-toggle, tekst-positie-radio en 2-image cap **verwijderd** bij versie≥3. Vrije tekstblokken **uit scope** (item-tekst hoort bovenaan, niet als losse blokken op canvas). Logo en foto worden vrij positioneerbaar op een gedeelde canvas-area per item. **Eén canvas per item** (niet per pagina, niet per werkbon). Multi-page canvas, layers panel, undo/redo, smart-guides, roteren expliciet uit scope. Coord-based render-pad naast bestaande flow-pad — per-item-router op `heeftCanvasData`. Migratie 116 (`COMMENT ON COLUMN`, geen schema-wijziging).

---

## 0. TL;DR

Drie fasen, in volgorde:

1. **Fase 1 — Drop & flow** (geschat 12–20 uur, 1–2 dagen). Per-item drop-zone vanuit desktop, nieuwe blok-types (foto/logo), free-reorder. `schaal_percentage` (continu) wordt nieuwe schrijf-bron; `grootte` alleen nog read-fallback. Mobile splitst naar aparte `WerkbonMonteurView`. Flow-based PDF blijft.
2. **Fase 2 — Free-position binnen item-block + PDF-blokken** (4–7 dagen, 32–56 uur). Resize via corner-handles, snap (25/50/75/100%), aspect-ratio lock, tekst-positie keuze. Drop van PDF-bestanden → eerste pagina via `pdfjs-dist` als image-blok. Flow-based PDF nog steeds.
3. **Fase 3 — Canvas per item** (v1.2 herontwerp, 63–93 uur, 8–12 dagen). Onder elke item-card komt een landscape-ratio canvas-area (267×100mm werkruimte). Foto's en logo's worden canvas-elementen met absolute mm-positie, vrij sleepbaar via pointer-events, 4-corner-resize met aspect-ratio-lock (Shift = vrij), snap-to-grid 5mm (Shift = vrij), z-index foto < logo. Item-tekst (omschrijving, afmeting, notitie) staat **bovenaan** in de PDF, canvas eronder met absolute posities. Coordinate-based render-pad naast bestaande flow-pad — per-item-router op `heeftCanvasData`. Multi-page canvas, layers UI, vrije tekstblokken, roteren, undo/redo, smart-guides expliciet **niet** in scope. Feature-flag `werkbon_canvas_versie = 3` activeert; versie < 3 = fase-2-gedrag (thumbnails grid + radio's).

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

### 1.4 Leerpunten fase 2 (v1.2 — na lokale test)

Vanuit Antony's lokale test op `feat/werkbon-canvas-fase2` (niet gemerged):

1. **Resize-handles op thumbnails voelen niet als tekenen.** De 14×14 corner-handle op een form-thumbnail (`AfbeeldingResizeHandle.tsx`) doet z'n werk technisch, maar de mentale modellen botsen: een thumbnail "in een formulier" ↔ een element "op een werkblad". Resize voelt als toggle-vervanger, niet als layout-control.
2. **Tekst-positie radio (links/rechts/boven/onder) is onvindbaar en conceptueel verkeerd.** Verschijnt alleen bij `aantalFotos === 1` (`WerkbonItemCard.tsx:200`), verstopt onderaan de thumbnail. Bovendien past het concept niet: de instructie-tekst van een item (nummer + omschrijving + afmeting + notitie) is **één blok** dat consistent bovenaan hoort, niet rondom een afbeelding gedrapeerd.
3. **2-image cap (geforceerd via Stream F, `WerkbonDetail.tsx:536-538`) is te restrictief.** Echte werkbonnen hebben soms 3-4 referentie-foto's (front, achter, detail, drukproef). Hard-cap was reflex van het oude formulier, niet een product-keuze.
4. **Vaste 2-kolom 50/50-grid (`WerkbonItemCard.tsx:191`) is verkeerd primitief.** Een werkbon is een visueel instructie-blad, geen formulier-rijtje. De juiste primitief is een **vrij canvas met absolute posities**.
5. **Klein/normaal/groot toggle vervalt automatisch zodra hoek-resize op canvas-elementen werkt.** Vrije resize maakt drie discrete maten betekenisloos (`WerkbonItemCard.tsx:270-286`).

**Conclusie:** fase 3 wordt geen incrementele uitbreiding van fase 2 maar een **structuur-shift**. Items-lijst boven, canvas eronder, per item één canvas. Zie §8.3 (v1.2).

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

### 8.3 (v1.2) Fase 3 — Canvas per item

> **Scope-statement (v1.2):** onder elke item-card komt **één canvas-area** (267×100mm werkruimte, landscape-ratio, cream bg `#F8F7F5`, 1px subtle border). Afbeeldingen en logo's zijn vrij sleepbare canvas-elementen met absolute (x, y, breedte, hoogte) in mm. Resize via 4 corner-handles met aspect-ratio-lock (Shift = vrij). Snap-to-grid 5mm (Shift omzeilt). Click-buiten = deselect. Delete via X-knop (hover, rechtsboven) of Delete-key. Per item krijgt de PDF een tekstblok bovenaan (nummer + omschrijving + afmeting + notitie), canvas eronder met 1:1 absolute posities. Item-tekst hoort bij item, niet bij element. Een item kan nul tot ca. zes elementen hebben (geen hard-cap, soft-cap ~6 voor performance). Eén canvas per item, geen multi-page binnen item.

**In scope:**
- `WerkbonCanvas` component per item-card (cream bg, 1px border, drop-zone)
- `WerkbonCanvasElement` met absolute (`canvas_x_mm`, `canvas_y_mm`, `canvas_breedte_mm`, `canvas_hoogte_mm`, `z_index`) in `layout` JSONB
- Pointer-events drag binnen canvas-grenzen (clamp + snap-to-5mm + Shift-bypass)
- 4-corner resize met aspect-ratio-lock (Shift = vrij)
- Selectie-state: 1px Petrol border + 4 corner-handles 10×10px Flame met witte border
- Click-buiten = deselect, Delete-key + X-knop verwijderen element
- Live position/size-badge tijdens drag/resize
- Logo blok-type toggle in selectie-overlay (geen rechtsboven-thumbnail-pill meer)
- Z-index foto < logo automatisch (foto default 1, logo default 2)
- PDF coord-based render-pad per item, met page-break check op item-niveau
- Per-item-router op `heeftCanvasData` (`some(a => a.layout?.canvas_x_mm !== undefined)`)
- Bestaande flow-render pad BEHOUDEN voor legacy items
- 2-image cap verwijderen uit `handleAfbeeldingenDropped`
- Soft-cap ~6 elementen → toast.info, geen hard-block
- Feature-flag `werkbon_canvas_versie = 3` activeert canvas-mode
- Mobile `WerkbonMonteurView` blijft read-only, PDF-preview toont nieuwe render

**Buiten scope (v1.2):**
- Multi-page canvas (één canvas per item, max ~100mm hoog)
- Layers panel (geen handmatige z-index UI; alleen automatisch foto<logo)
- Vrije tekst-blokken op canvas (item-tekst blijft bovenaan, géén `blok_type='tekst'`)
- Roteren van elementen
- Undo/redo
- Smart-guides / align-tot-andere-objecten
- Touch-edit op mobiel (read-only blijft)

**Wat overleeft uit fase 1+2 bij versie≥3** (zie §8.3.7-tabel):
- Drop-flow (image + PDF), `pdfToImage` helper, `sanitizeStorageFilename`
- Logo blok-type toggle (UI-plek verhuist naar selectie-overlay)
- `pdfjs-dist` integratie
- `WerkbonMonteurView` mobile-fork
- Feature-flag pattern
- `resolveSchaal`/`deriveFromGrootte` (voor versie<3 fallback en legacy data)
- `AfbeeldingResizeHandle` component (versie<3 fallback)
- `bumpPreview` 600ms debounce

**Wat vervalt bij versie≥3:**
- Klein/normaal/groot toggle (`WerkbonItemCard.tsx:270-286`)
- Tekst-positie radio L/R/B/O (`WerkbonItemCard.tsx:287-306`)
- Thumb-reorder via drag (`AFB_DRAG_MIME`, array-`volgorde`)
- 2-image cap (`WerkbonDetail.tsx:535-539`)
- Vaste 2-kolom 50/50 grid (`WerkbonItemCard.tsx:191`)
- Logo render 40×40mm vast rechtsboven (canvas regelt positie)
- `enkeleFotoMetPositie`-tak in `werkbonPdfService` (laten staan voor legacy)

**Migratie 116 — `COMMENT ON COLUMN`, geen schema-wijziging:**

```sql
-- Migratie 116 — Werkbon canvas fase 3
-- Voegt geen kolommen toe: canvas-coördinaten leven in bestaande layout JSONB.
-- Backward-compat: items zonder canvas_*_mm rendert PDF via flow-pad.
-- Idempotent: COMMENT-statements zijn re-runnable.

COMMENT ON COLUMN werkbon_afbeeldingen.layout IS
  'JSONB layout per afbeelding. Velden:
   - blok_type: foto | logo | pdf (fase 1+2)
   - schaal_percentage: 0-100 (fase 1+2, legacy)
   - tekst_positie: links/rechts/boven/onder (fase 2, legacy)
   - volgorde: array-index (fase 1, legacy)
   - pdf_bron_url: storage-pad origineel PDF (fase 2)
   - canvas_x_mm, canvas_y_mm: absolute positie op item-canvas (fase 3)
   - canvas_breedte_mm, canvas_hoogte_mm: element-grootte op canvas (fase 3)
   - z_index: stacking, default 1 foto/pdf, 2 logo (fase 3)
   Werkruimte canvas = 267mm breed × 100mm hoog.';
```

Geen RLS-update (parent-tabel `werkbon_afbeeldingen` heeft al org-dekkende FOR ALL policy uit migratie 022). Feature-flag-kolom `werkbon_canvas_versie` uit migratie 115 accepteert al INT — geen migratie voor `=3`.

**Component-architectuur:**

Nieuwe componenten:
- `src/components/werkbonnen/WerkbonCanvas.tsx` (~250-350 regels) — canvas-area, drop-zone, lege-staat, selection-state, position-badge, click-outside-deselect, keyboard Delete
- `src/components/werkbonnen/WerkbonCanvasElement.tsx` (~200-280 regels) — sleepbaar/resizebaar element, 4-corner-handles, aspect-lock, snap-to-5mm, Shift-bypass, blok-type pill in selectie

Niet apart (overwogen, afgewezen): `SelectionOverlay`, `GridSnapHelper`, `PositionBadge`, `WerkbonTekstBlok` (vrije tekstblokken zijn uit scope).

Gewijzigde bestaande:
- `WerkbonItemCard.tsx` — versie≥3 tak rendert `<WerkbonCanvas>` i.p.v. thumbnail-grid. Header/omschrijving/dimensies/notitie blijven 1-op-1
- `WerkbonDetail.tsx` — 3 nieuwe handlers (`handleCanvasElementPositie`, `handleCanvasElementResize`, hergebruik `handleAfbeeldingVerwijderen` voor delete), 2-cap weg, default canvas-positie-cascade in `handleAfbeeldingenDropped`
- `werkbonPdfService.ts` — per-item-router, `renderCanvasItem` helper (hergebruikt bestaande `renderTekstBlok`), ~150-200 nieuwe regels
- `types/index.ts` — `WerkbonAfbeeldingLayout` uitbreiden met 5 nieuwe optionele velden

**PDF coord-render strategie:**

Per item:
```ts
const heeftCanvasData = item.afbeeldingen.some(
  (a) => a.layout?.canvas_x_mm !== undefined
)
if (heeftCanvasData) {
  // 1. page-break check op item-niveau
  // 2. renderTekstBlok(item, i, marginLeft, y, contentWidth) → textBottom
  // 3. canvasY = textBottom + 4; canvasH = 100
  // 4. sorteer afbeeldingen op z_index (foto<logo), tiebreaker created_at
  // 5. per afbeelding: drawImageContain op (canvas_x_mm, canvas_y_mm, breedte_mm, hoogte_mm) 1:1
  // 6. y = canvasY + canvasH + 5
} else {
  // bestaande flow-pad ongewijzigd
}
```

Mm-mapping 1:1: canvas-werkblad (267×100mm) is exact gelijk aan PDF content-block bij landscape A4 met 15mm marges. Geen rekenfouten.

**Stream-decompositie (parallel waar mogelijk):**

| Stream | Naam | Dependencies |
|---|---|---|
| **A3** | Datamodel + types (migratie 116 + `WerkbonAfbeeldingLayout` extension) | — |
| **B3** | `WerkbonCanvas` component | A3 |
| **C3** | `WerkbonCanvasElement` component | A3 |
| **D3** | PDF coord-render + per-item-router | A3 |
| **E3** | Item-card cleanup + Detail-handlers + 2-cap weg + dead-code-gating | B3 + C3 |
| **F3** | Mobile-verify + feature-flag `=3` + rollout-SQL | E3 |

Volgorde: `A3 → {B3, C3, D3} parallel → E3 → F3`. A3 bottleneck ~2-4u. B3+C3 grootste werk. D3 kan parallel met E3 als B3+C3 klaar.

**Geschatte uren (eerlijk + 40% buffer):**

| Stream | Basis (h) | Met buffer (h) |
|---|---|---|
| A3 datamodel + types | 1.5 | 2 |
| B3 WerkbonCanvas | 10-14 | 14-20 |
| C3 WerkbonCanvasElement | 16-22 | 22-31 |
| D3 PDF coord-render | 6-10 | 8-14 |
| E3 ItemCard + Detail integratie | 6-9 | 8-13 |
| F3 mobile + flag + SQL | 1.5-2.5 | 2-3.5 |
| Cross-browser + manual test | — | +7-10 |
| **Totaal eindschatting** | **41-58** | **63-93** |

Target 70u, alarm 90u. **30% lager** dan v1.1's 60-100u want vrije tekstblokken + multi-page + layers panel zijn uit scope.

**Risico's & onbekenden (samenvatting — volledig in §8.3.8 v1.2 in bronrapport):**

1. Canvas-state-management: selectie + drag + resize + snap + shift door elkaar → mitigatie via `onPointerCancel`-reset + minimale state-refs (zelfde pattern als `AfbeeldingResizeHandle`)
2. Pointer-events vs HTML5 drag: canvas-element-drag = pointer (consistent met resize), file-drop blijft HTML5 (Files-transfer). Acceptabele paradigma-scheiding
3. Backward-compat per-item-router: legacy items met `tekst_positie='rechts'` blijven via fase-2-tak renderen
4. Touch-device drag op tablet: buiten scope fase 3 (read-only blijft)
5. Boundary-clipping snel slepen: `clamp(0, 267-w, x)` en idem y
6. Performance 6×5 elementen: pre-resolve cache schaalt lineair, debounce blijft 600ms
7. Default-positie cascade bij multi-drop: `x = 5 + i*10, y = 5 + i*10`
8. Element-overlap bij z=z: tiebreaker `created_at` voor stabiele newer-on-top

**Stop-gate vóór implementatie (v1.2):**

Antony bevestigt expliciet:
1. **Scope** klopt — canvas per item, niet per pagina; tekstblok bovenaan; klein/normaal/groot weg; tekst-positie radio weg; 2-cap weg; logo wordt canvas-element; multi-page/layers/vrije tekstblokken/roteren/undo/smart-guides expliciet uit scope
2. **Uren-schatting** acceptabel — 63–93u eindschatting (70u target, 90u alarm)
3. **Stream-plan** akkoord — A3 → {B3, C3, D3} parallel → E3 → F3, branch `feat/werkbon-canvas-fase3`
4. **Migratie 116 SQL** ok — `COMMENT ON COLUMN`, geen schema-wijziging
5. **Fase 2-keuze** — fase 2 is lokaal getest maar niet gemerged. Vóór fase-3-start: óf fase 2 alsnog mergen met `werkbon_canvas_versie=2`-gating als fallback-pad, óf fase 2 verwerpen (lokale branch droppen) en `pdfToImage.ts` + PDF-blok-type-tak porteren naar fase 3-branch. **Aanbeveling**: fase 2 droppen omdat versie≥3 het grootste deel obsoleet maakt. **Beslissing nodig van Antony.**

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
if (versie >= 1) { /* drop-zones, logo-pill, monteur-view */ }
if (versie >= 2) { /* resize-handles thumbnails, tekst-positie radio, PDF-drop */ }
if (versie === 3) {
  /* canvas-mode v1.2: WerkbonItemCard rendert <WerkbonCanvas>,
     klein/normaal/groot + tekst-positie radio + 2-cap UI verborgen,
     PDF gebruikt coord-router per item op heeftCanvasData */
}
```

**Per-org rollback v1.2:** `UPDATE app_settings SET werkbon_canvas_versie = 1 WHERE organisatie_id = '<uuid>'` — terug naar fase 1, canvas-data blijft in DB maar wordt genegeerd door render-pad (`heeftCanvasData` check is alleen actief in versie=3 pad). Geen data-verlies.

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
