# Portaal Redesign Plan — Van Chat naar Feed/Prikbord

## Samenvatting

Vervang de chat-interface door een feed/prikbord model. Klant ziet items (offerte, factuur, tekening, afbeelding, bericht) chronologisch gesorteerd en kan per item reageren. Geen vrije chat meer.

---

## 1. COMPONENTEN — WAT VERANDERT

### Nieuwe componenten (schrijven)

| Component | Vervangt | Beschrijving |
|-----------|----------|-------------|
| `PortaalFeed.tsx` | `PortaalChat.tsx` | Gedeelde feed (publiek + intern) |
| `PortaalFeedItem.tsx` | `PortaalChatRichCard.tsx` | Router per item-type |
| `PortaalFeedItemOfferte.tsx` | `PortaalOfferteSection.tsx` | Offerte card + accepteren/vragen |
| `PortaalFeedItemFactuur.tsx` | *(nieuw)* | Factuur card + betalen/vragen |
| `PortaalFeedItemTekening.tsx` | `PortaalDrukproevenSection.tsx` | Tekening + goedkeuren/revisie |
| `PortaalFeedItemAfbeelding.tsx` | *(nieuw)* | Afbeelding preview + reactie |
| `PortaalFeedItemBericht.tsx` | `PortaalBerichtenSection.tsx` | Tekst bericht van bedrijf |
| `PortaalKlantReactie.tsx` | `PortaalChatBubble.tsx` | Reactie met flame border |
| `PortaalReactieForm.tsx` | `PortaalReactieForm.tsx` (herschrijven) | Inline formulier (tekst + foto) |
| `PortaalSidebar.tsx` | *(nieuw)* | Planning, contact, documenten |
| `PortaalHeader.tsx` | *(deel van PortaalPagina)* | Petrol header met branding |
| `PortaalItemToevoegen.tsx` | *(deel van ProjectPortaalTab)* | Dropdown menu intern |

### Behouden (niet wijzigen)

| Component | Reden |
|-----------|-------|
| `PortaalGesloten.tsx` (48 regels) | Werkt, simpel |
| `PortaalVerlopen.tsx` (120 regels) | Werkt, inclusief link-aanvragen |
| `PortaalLightbox.tsx` (224 regels) | Hergebruiken voor afbeelding preview |
| `ClientApprovalPage.tsx` (764 regels) | Backward-compat voor oude tokens |
| `PortalenOverzicht.tsx` (708 regels) | Admin overzicht, niet gerelateerd |

### Verwijderen (na volledige vervanging)

| Component | Regels | Reden |
|-----------|--------|-------|
| `PortaalChat.tsx` | 298 | Vervangen door PortaalFeed |
| `PortaalChatBubble.tsx` | 77 | Geen chat meer |
| `PortaalChatDaySeparator.tsx` | 36 | Feed heeft geen day separators |
| `PortaalChatInput.tsx` | 566 | Vervangen door inline PortaalReactieForm |
| `PortaalChatProgress.tsx` | 111 | Geen voortgangsbalk meer |
| `PortaalChatRichCard.tsx` | 315 | Vervangen door PortaalFeedItem*.tsx |
| `PortaalBerichtenSection.tsx` | 266 | Vervangen door PortaalFeedItemBericht |
| `PortaalOfferteSection.tsx` | 255 | Vervangen door PortaalFeedItemOfferte |
| `PortaalDrukproevenSection.tsx` | 460 | Vervangen door PortaalFeedItemTekening |

### Herschrijven

| Component | Wijziging |
|-----------|----------|
| `PortaalPagina.tsx` (493 regels) | Layout: twee kolommen (feed + sidebar), header apart |
| `ProjectPortaalTab.tsx` (551 regels) | Feed + beheer toolbar |
| `PortaalSidebarCard.tsx` (869 regels) | Minimale wijzigingen, verwijst naar nieuwe feed |

---

## 2. API ROUTES — WIJZIGINGEN

### Uitbreiden

| Route | Wijziging |
|-------|----------|
| `portaal-get.ts` | Response uitbreiden: project planning (start_datum, deadline), bedrijfsprofiel (naam, telefoon, email, logo_url), montage datum |
| `portaal-reactie.ts` | `foto_url` veld accepteren in request body + opslaan |
| `portaal-upload.ts` | Base64 fallback verwijderen — return error bij Storage failure |

### Niet wijzigen

| Route | Reden |
|-------|-------|
| `portaal-create.ts` | Werkt correct |
| `portaal-bekeken.ts` | Werkt correct |
| `portaal-link-aanvragen.ts` | Werkt correct |
| `portaal-verlengen.ts` | Werkt correct |
| `portaal-items-get.ts` | Werkt correct |

---

## 3. DATABASE — WIJZIGINGEN

### Migratie nodig: `055_portaal_feed.sql`

De meeste kolommen bestaan al (migratie 033). Alleen nodig:

```sql
-- foto_url op portaal_reacties (voor klant foto uploads bij reacties)
ALTER TABLE portaal_reacties ADD COLUMN IF NOT EXISTS foto_url text;

-- Type 'afbeelding' toevoegen (kolom is al text, geen ENUM constraint)
-- Geen DDL nodig, alleen een comment
COMMENT ON COLUMN portaal_items.type IS 'offerte | tekening | factuur | bericht | afbeelding';
```

**Bestaande kolommen die al bestaan (migratie 033):**
- `bericht_type`, `bericht_tekst`, `foto_url`, `afzender`, `email_notificatie` op `portaal_items`

**Bestaande kolommen die al bestaan (eerdere migraties):**
- `sort_order`/`volgorde`, `zichtbaar_voor_klant`, `bedrag`, `mollie_payment_url`

**Geen destructieve wijzigingen nodig.**

---

## 4. SERVICES — WIJZIGINGEN

### Nieuw bestand

| Bestand | Beschrijving |
|---------|-------------|
| `src/services/portaalNotificatieService.ts` | Extract email/notificatie logica uit API routes |

### Bestaande functies (supabaseService.ts)

Geen wijzigingen nodig — alle CRUD functies bestaan al.

---

## 5. TYPES — WIJZIGINGEN

### Uitbreiden `PortaalItem.type`

```typescript
// Huidig: 'offerte' | 'tekening' | 'factuur' | 'bericht'
// Nieuw:  'offerte' | 'tekening' | 'factuur' | 'bericht' | 'afbeelding'
```

### Toevoegen `PortaalReactie.foto_url`

```typescript
export interface PortaalReactie {
  // ... bestaande velden
  foto_url?: string; // NIEUW
}
```

### Nieuw type `PortaalData`

```typescript
export interface PortaalData {
  portaal: ProjectPortaal;
  items: (PortaalItem & { reacties: PortaalReactie[]; bestanden: PortaalBestand[] })[];
  project: { naam: string; status: string; start_datum?: string; deadline?: string };
  bedrijf: { naam: string; telefoon?: string; email?: string; logo_url?: string };
  montage?: { datum: string; start_tijd?: string };
}
```

---

## 6. TRIGGER.DEV

Geen wijzigingen aan bestaande tasks. Alleen:
- `portaalNotificatieService.ts` als voorbereiding voor toekomstige migratie
- TODO comments op `usePortaalHerinnering.ts`

---

## 7. BUILD IMPACT

### Verwachte impact op `npm run build`:

- **Nieuwe bestanden:** ~12 componenten + 1 service + 1 migratie
- **Verwijderde bestanden:** 9 componenten (na vervanging)
- **Netto:** ~3 meer bestanden
- **Bundle size:** Vergelijkbaar (nieuwe componenten vervangen oude)
- **Breaking changes:** Geen — API routes blijven backward-compatible
- **Risico:** Laag — publieke pagina is geïsoleerd, geen invloed op rest van app

### Kritieke paden:
1. `PortaalPagina.tsx` → alles wat de klant ziet
2. `ProjectPortaalTab.tsx` → alles wat het bedrijf ziet
3. `portaal-get.ts` → data voor publieke pagina

---

## 8. IMPLEMENTATIE VOLGORDE

### Fase 1: Foundation
1. Database migratie (`055_portaal_feed.sql`)
2. Types uitbreiden (`index.ts`)
3. `portaalNotificatieService.ts` aanmaken
4. `portaal-get.ts` response uitbreiden

### Fase 2: Publieke pagina
5. `PortaalHeader.tsx`
6. `PortaalSidebar.tsx`
7. `PortaalKlantReactie.tsx`
8. `PortaalReactieForm.tsx` (herschrijven)
9. `PortaalFeedItemOfferte.tsx`
10. `PortaalFeedItemFactuur.tsx`
11. `PortaalFeedItemTekening.tsx`
12. `PortaalFeedItemAfbeelding.tsx`
13. `PortaalFeedItemBericht.tsx`
14. `PortaalFeedItem.tsx` (router)
15. `PortaalFeed.tsx`
16. `PortaalPagina.tsx` (herschrijven)

### Fase 3: Intern portaal
17. `PortaalItemToevoegen.tsx`
18. `ProjectPortaalTab.tsx` (herschrijven)

### Fase 4: Cleanup
19. API route wijzigingen (`portaal-reactie.ts`, `portaal-upload.ts`)
20. Oude componenten verwijderen
21. Build verificatie

---

## 9. DESIGN TOKENS (DOEN Branding)

```
Petrol:     #1A535C (header, primaire accenten)
Flame:      #F15025 (punt in logo, klant reactie border, urgente acties)
Groen:      #2D6B48 (goedgekeurd, betaald)
Paars:      #6A5A8A (afbeeldingen module)
Grijs:      #5A5A55 (berichten)
Warm wit:   #FAF9F7 (achtergrond)
Card bg:    #FFFFFF
Border:     #E8E6E1
```

**Fonts:** Bricolage Grotesque (headings), IBM Plex Sans (body), DM Mono (nummers)
