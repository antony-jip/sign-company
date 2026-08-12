# DOEN — Plan van Aanpak: Production Ready

## Status: Pre-RLS, pre-launch
## Doel: Alles fixen voordat we live gaan met 100+ gebruikers

---

## FASE 1: Blokkerende security fixes (VANDAAG)
*Geschatte tijd: 2-3 uur*

### 1.1 Storage bucket policies fixen
- [ ] `portaal-bestanden` bucket: van PUBLIC naar ownership-based policy
- [ ] `project-fotos` bucket: DELETE policy moet ownership checken, niet alleen `auth.uid() IS NOT NULL`
- [ ] `documenten` bucket portaal subfolder: restrictievere SELECT policy
- **Bestanden**: `supabase/migrations/036_portaal_storage_policy.sql`, `028_project_fotos.sql`
- **Aanpak**: Nieuwe migratie `050_fix_storage_policies.sql`

### 1.2 File upload server-side validatie
- [ ] `DocumentUpload.tsx` → voeg MIME type validatie toe (zoals portaal-upload.ts al doet)
- [ ] `storageService.ts` → voeg file type check toe in `uploadFile()` functie
- [ ] Whitelist: image/jpeg, image/png, image/webp, application/pdf, alleen bekende types
- **Bestanden**: `src/services/storageService.ts`, `src/components/documents/DocumentUpload.tsx`

### 1.3 SECURITY DEFINER functies auditen
- [ ] `cleanup_old_data()` → voeg `user_id` check toe of maak `SECURITY INVOKER`
- [ ] `handle_new_user()` → is OK (moet bypassen bij user creation), documenteer waarom
- **Bestanden**: `supabase/migrations/034_retention_and_rls_optimization.sql`
- **Aanpak**: Nieuwe migratie `051_fix_security_definer.sql`

---

## FASE 2: Data integriteit & race conditions (DEZE WEEK)
*Geschatte tijd: 3-4 uur*

### 2.1 Soft-delete implementeren op kritieke tabellen
- [ ] Voeg `deleted_at TIMESTAMPTZ` kolom toe aan: klanten, projecten, offertes, facturen, werkbonnen
- [ ] Pas delete functies aan: `UPDATE SET deleted_at = now()` i.p.v. `.delete()`
- [ ] Pas alle SELECT queries aan: `.is('deleted_at', null)` filter
- [ ] Voeg "Prullenbak" sectie toe in instellingen (optioneel, later)
- **Bestanden**: Nieuwe migratie `052_soft_delete.sql`, `supabaseService.ts` (40+ functies)
- **Risico**: HOOG — raakt alle queries. Goed testen.

### 2.2 Database CASCADE constraints
- [ ] Voeg ON DELETE CASCADE toe aan foreign keys waar logisch:
  - offerte_items → offertes
  - factuur_items → facturen
  - werkbon_regels/fotos/items → werkbonnen
  - portaal_items/bestanden → project_portalen
- [ ] Verwijder client-side cascade delete code daarna
- **Bestanden**: Nieuwe migratie `053_cascade_constraints.sql`, `supabaseService.ts`

### 2.3 Realtime subscriptions filteren
- [ ] `ProjectPortaalTab.tsx` → filter op `portaal_id` in subscription
- [ ] `NotificatieCenter.tsx` → filter op `user_id` in subscription
- **Bestanden**: `src/components/projects/ProjectPortaalTab.tsx`, `src/components/notifications/NotificatieCenter.tsx`

---

## FASE 3: Multi-tenant migratie (VOLGENDE WEEK)
*Geschatte tijd: 8-12 uur — grootste klus*

### 3.1 Database migratie: organisatie_id op alle kerntabellen
- [ ] Nieuwe migratie `054_organisatie_id_kerntabellen.sql`:
  ```sql
  ALTER TABLE klanten ADD COLUMN organisatie_id UUID REFERENCES organisaties(id);
  ALTER TABLE projecten ADD COLUMN organisatie_id UUID REFERENCES organisaties(id);
  -- etc. voor alle kerntabellen
  ```
- [ ] Backfill: `UPDATE klanten SET organisatie_id = (SELECT organisatie_id FROM profiles WHERE id = klanten.user_id)`
- [ ] NOT NULL constraint toevoegen na backfill
- **Tabellen** (18): klanten, projecten, taken, offertes, offerte_items, facturen, factuur_items, documenten, werkbonnen, werkbon_items, werkbon_fotos, montage_afspraken, events, medewerkers, tijdregistraties, verlof, emails, notificaties

### 3.2 RLS policies updaten
- [ ] Nieuwe migratie `055_rls_organisatie.sql`:
  ```sql
  DROP POLICY IF EXISTS "Users CRUD own klanten" ON klanten;
  CREATE POLICY "Org members CRUD klanten" ON klanten
    FOR ALL USING (
      organisatie_id = (SELECT organisatie_id FROM profiles WHERE id = auth.uid())
    );
  ```
- [ ] Per tabel dezelfde policy
- [ ] Service role bypass policies voor API routes

### 3.3 supabaseService.ts aanpassen
- [ ] Voeg `getOrganisatieId()` helper toe die uit auth context haalt
- [ ] Pas alle create functies aan: voeg `organisatie_id` toe aan INSERT
- [ ] SELECT queries: RLS doet het werk, maar voeg `.eq('organisatie_id', orgId)` toe als defense-in-depth
- [ ] Test: teamlid A maakt klant → teamlid B moet die klant kunnen zien
- **Geschatte wijzigingen**: 50-80 functies

### 3.4 AuthContext / AppSettingsContext updaten
- [ ] `organisatieId` beschikbaar maken in AppSettingsContext
- [ ] Alle componenten die `user?.id` doorgeven aan service functies → check of `organisatieId` nodig is
- **Bestanden**: `src/contexts/AppSettingsContext.tsx`, `src/contexts/AuthContext.tsx`

---

## FASE 4: TypeScript opschonen (VOLGENDE WEEK)
*Geschatte tijd: 4-6 uur*

### 4.1 Type definities syncen met database
- [ ] `Werkbon` interface: voeg ontbrekende properties toe (kilometers, km_tarief, omschrijving, etc.)
- [ ] `DocumentStyle` interface: fix camelCase vs snake_case mismatch in werkbonPdfService.ts
- [ ] `Email` interface: sync met actual database kolommen
- **Doel**: Van 138 → 0 TypeScript errors

### 4.2 `as any` casts verwijderen
- [ ] `PortaalCompactBlock.tsx:399` → fix PortaalItem type
- [ ] `QuoteCreation.tsx:258` → fix offerte creation type
- [ ] `ProjectDetail.tsx:1024` → fix status type ('montage' is geen geldige status)
- [ ] `supabaseService.ts:4057-4077` → fix DocumentStyle upsert types
- **Doel**: Van 9 → 0 `as any` casts

### 4.3 Dead code opruimen
- [ ] Verwijder ongebruikte imports (build warnings)
- [ ] Verwijder `console.log` in productie code (2 stuks)
- [ ] Verwijder oude component referenties die niet meer gebruikt worden

---

## FASE 5: Branding afronden (WEEK 2)
*Geschatte tijd: 2-3 uur*

### 5.1 FORGEdesk/Forgie → doen./Daan
- [ ] User-visible strings: 277 referenties in 47 bestanden
- [ ] Prioriteit: demo email `demo@forgedesk.nl`, component namen, service bestanden
- [ ] localStorage keys: `forgedesk_*` → `doen_*` (met migratie script)
- [ ] Code identifiers: `forgieService.ts` → `daanService.ts` etc.

---

## FASE 6: Performance optimalisatie (WEEK 2)
*Geschatte tijd: 4-6 uur*

### 6.1 Pagination implementeren
- [ ] `getKlanten()`: van 50.000 default → 50 per pagina + server-side pagination
- [ ] `getFacturen()`: idem
- [ ] `getDocumenten()`: voeg LIMIT toe
- [ ] Frontend: infinite scroll of pagination UI

### 6.2 N+1 queries fixen
- [ ] `getWerkbonItemsMetAfbeeldingen()`: batch query i.p.v. loop
- [ ] `createFactuurFromOfferte()`: batch INSERT i.p.v. loop
- [ ] `createFactuurFromWerkbon()`: idem
- [ ] `createCreditnota()`: idem

### 6.3 Dashboard batching
- [ ] Eén RPC endpoint voor alle dashboard data
- [ ] Of: `useDataInit` hook optimaliseren met batching

---

## FASE 7: GDPR & compliance (WEEK 3)
*Geschatte tijd: 3-4 uur*

### 7.1 Data export endpoint
- [ ] `/api/user-data-export` → exporteert alle organisatie data als JSON
- [ ] UI: knop in Instellingen → Profiel → "Download mijn data"

### 7.2 Account verwijdering
- [ ] Endpoint om account + alle data te verwijderen
- [ ] UI: knop in Instellingen met bevestiging

### 7.3 Session management
- [ ] Cross-tab session invalidatie via localStorage events
- [ ] "Uitloggen op alle apparaten" knop

---

## PRIORITEIT MATRIX

| Fase | Urgentie | Impact | Risico | Wanneer |
|------|----------|--------|--------|---------|
| 1. Security | KRITIEK | Data lekken voorkomen | Laag (alleen policies) | Vandaag |
| 2. Data integriteit | HOOG | Data verlies voorkomen | Medium (raakt queries) | Deze week |
| 3. Multi-tenant | HOOG | Team samenwerking | HOOG (grootste wijziging) | Volgende week |
| 4. TypeScript | MEDIUM | Stabiliteit | Laag | Volgende week |
| 5. Branding | MEDIUM | Professioneel | Laag | Week 2 |
| 6. Performance | MEDIUM | Schaal | Medium | Week 2 |
| 7. GDPR | MEDIUM | Compliance | Laag | Week 3 |

---

## DEFINITION OF DONE per fase

- [ ] `npm run build` slaagt
- [ ] `npx tsc --noEmit` — geen NIEUWE errors
- [ ] Handmatig getest op localhost
- [ ] Geen regressie in bestaande functionaliteit
- [ ] Migraties getest op staging database
