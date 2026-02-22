# SCHEMA AUDIT — Workmate Data Integrity Report

> Gegenereerd: 2026-02-22
> Doel: Volledige mapping TypeScript types ↔ Supabase tabellen

---

## Legenda

- ✅ = Type en tabel zijn in sync
- ⚠️ = Tabel bestaat, maar kolommen missen
- ❌ = Tabel ontbreekt volledig in SQL schema
- 🔧 = Gerepareerd in migration 003

---

## 1. Type ↔ Tabel Mapping

| # | TypeScript Interface | Supabase Tabel | Status | Actie |
|---|---------------------|----------------|--------|-------|
| 1 | `Profile` | `profiles` | ⚠️→🔧 | Kolom `iban` toegevoegd |
| 2 | `Klant` | `klanten` | ⚠️→🔧 | Kolom `contactpersonen` (JSONB) toegevoegd |
| 3 | `Contactpersoon` | (embedded in klanten) | ✅ | Opgeslagen als JSONB in klanten.contactpersonen |
| 4 | `Project` | `projecten` | ⚠️→🔧 | 4 kolommen toegevoegd |
| 5 | `Taak` | `taken` | ✅ | Volledig in sync |
| 6 | `Offerte` | `offertes` | ⚠️→🔧 | 16 kolommen toegevoegd |
| 7 | `OfferteItem` | `offerte_items` | ✅ | Volledig in sync |
| 8 | `Document` | `documenten` | ✅ | Volledig in sync |
| 9 | `Email` | `emails` | ⚠️→🔧 | 12 kolommen toegevoegd |
| 10 | `CalendarEvent` | `events` | ✅ | Volledig in sync |
| 11 | `Grootboek` | `grootboek` | ✅ | Volledig in sync |
| 12 | `BtwCode` | `btw_codes` | ✅ | Volledig in sync |
| 13 | `Korting` | `kortingen` | ✅ | Volledig in sync |
| 14 | `AIChat` | `ai_chats` | ✅ | Volledig in sync |
| 15 | `Factuur` | `facturen` | ⚠️→🔧 | 17 kolommen toegevoegd |
| 16 | `FactuurItem` | `factuur_items` | ✅ | Volledig in sync |
| 17 | `Tijdregistratie` | `tijdregistraties` | ⚠️→🔧 | Kolom `factuur_id` toegevoegd |
| 18 | `Medewerker` | `medewerkers` | ⚠️→🔧 | Kolom `app_rol` toegevoegd |
| 19 | `Notificatie` | `notificaties` | ⚠️→🔧 | CHECK constraint uitgebreid |
| 20 | `MontageAfspraak` | `montage_afspraken` | ✅ | Volledig in sync |
| 21 | `Nieuwsbrief` | `nieuwsbrieven` | ✅ | Volledig in sync |
| 22 | `AppSettings` | `app_settings` | ⚠️→🔧 | 3 kolommen toegevoegd |
| 23 | `CalculatieProduct` | `calculatie_producten` | ✅ | Volledig in sync |
| 24 | `CalculatieTemplate` | `calculatie_templates` | ✅ | Volledig in sync |
| 25 | `OfferteTemplate` | `offerte_templates` | ✅ | Volledig in sync |
| 26 | `TekeningGoedkeuring` | `tekening_goedkeuringen` | ⚠️→🔧 | 3 kolommen toegevoegd |
| 27 | `DocumentStyle` | `document_styles` | ✅ | Volledig in sync |
| 28 | `Verlof` | `verlof` | ❌→🔧 | Nieuwe tabel aangemaakt |
| 29 | `Bedrijfssluitingsdag` | `bedrijfssluitingsdagen` | ❌→🔧 | Nieuwe tabel aangemaakt |
| 30 | `ProjectToewijzing` | `project_toewijzingen` | ❌→🔧 | Nieuwe tabel aangemaakt |
| 31 | `BookingSlot` | `booking_slots` | ❌→🔧 | Nieuwe tabel aangemaakt |
| 32 | `BookingAfspraak` | `booking_afspraken` | ❌→🔧 | Nieuwe tabel aangemaakt |
| 33 | `Werkbon` | `werkbonnen` | ❌→🔧 | Nieuwe tabel aangemaakt |
| 34 | `WerkbonRegel` | `werkbon_regels` | ❌→🔧 | Nieuwe tabel aangemaakt |
| 35 | `WerkbonFoto` | `werkbon_fotos` | ❌→🔧 | Nieuwe tabel aangemaakt |
| 36 | `HerinneringTemplate` | `herinnering_templates` | ❌→🔧 | Nieuwe tabel aangemaakt |
| 37 | `Leverancier` | `leveranciers` | ❌→🔧 | Nieuwe tabel aangemaakt |
| 38 | `Uitgave` | `uitgaven` | ❌→🔧 | Nieuwe tabel aangemaakt |
| 39 | `Bestelbon` | `bestelbonnen` | ❌→🔧 | Nieuwe tabel aangemaakt |
| 40 | `BestelbonRegel` | `bestelbon_regels` | ❌→🔧 | Nieuwe tabel aangemaakt |
| 41 | `Leveringsbon` | `leveringsbonnen` | ❌→🔧 | Nieuwe tabel aangemaakt |
| 42 | `LeveringsbonRegel` | `leveringsbon_regels` | ❌→🔧 | Nieuwe tabel aangemaakt |
| 43 | `VoorraadArtikel` | `voorraad_artikelen` | ❌→🔧 | Nieuwe tabel aangemaakt |
| 44 | `VoorraadMutatie` | `voorraad_mutaties` | ❌→🔧 | Nieuwe tabel aangemaakt |
| 45 | `Deal` | `deals` | ❌→🔧 | Nieuwe tabel aangemaakt |
| 46 | `DealActiviteit` | `deal_activiteiten` | ❌→🔧 | Nieuwe tabel aangemaakt |
| 47 | `LeadFormulier` | `lead_formulieren` | ❌→🔧 | Nieuwe tabel aangemaakt |
| 48 | `LeadInzending` | `lead_inzendingen` | ❌→🔧 | Nieuwe tabel aangemaakt |

---

## 2. Kolom-niveau Detail: Bestaande tabellen met ontbrekende kolommen

### profiles (→ IBAN ontbreekt)
| Kolom | TS Type | DB Status |
|-------|---------|-----------|
| `iban` | `string?` | ❌ ONTBREEKT → 🔧 toegevoegd als TEXT |

### klanten (→ contactpersonen ontbreekt)
| Kolom | TS Type | DB Status |
|-------|---------|-----------|
| `contactpersonen` | `Contactpersoon[]` | ❌ ONTBREEKT → 🔧 toegevoegd als JSONB DEFAULT '[]' |

### projecten (→ 4 kolommen ontbreken)
| Kolom | TS Type | DB Status |
|-------|---------|-----------|
| `budget_waarschuwing_pct` | `number?` | ❌ → 🔧 DECIMAL(5,2) |
| `bron_offerte_id` | `string?` | ❌ → 🔧 UUID FK→offertes |
| `is_template` | `boolean?` | ❌ → 🔧 BOOLEAN DEFAULT FALSE |
| `bron_project_id` | `string?` | ❌ → 🔧 UUID FK→projecten |

### offertes (→ 16 kolommen ontbreken)
| Kolom | TS Type | DB Status |
|-------|---------|-----------|
| `project_id` | `string?` | ❌ → 🔧 UUID FK→projecten |
| `follow_up_datum` | `string?` | ❌ → 🔧 DATE |
| `follow_up_notitie` | `string?` | ❌ → 🔧 TEXT |
| `laatste_contact` | `string?` | ❌ → 🔧 TIMESTAMPTZ |
| `follow_up_status` | `string?` | ❌ → 🔧 TEXT CHECK |
| `contact_pogingen` | `number?` | ❌ → 🔧 INTEGER DEFAULT 0 |
| `prioriteit` | `string?` | ❌ → 🔧 TEXT CHECK |
| `deal_id` | `string?` | ❌ → 🔧 UUID |
| `geconverteerd_naar_project_id` | `string?` | ❌ → 🔧 UUID |
| `geconverteerd_naar_factuur_id` | `string?` | ❌ → 🔧 UUID |
| `bekeken_door_klant` | `boolean?` | ❌ → 🔧 BOOLEAN DEFAULT FALSE |
| `eerste_bekeken_op` | `string?` | ❌ → 🔧 TIMESTAMPTZ |
| `laatst_bekeken_op` | `string?` | ❌ → 🔧 TIMESTAMPTZ |
| `aantal_keer_bekeken` | `number?` | ❌ → 🔧 INTEGER DEFAULT 0 |
| `publiek_token` | `string?` | ❌ → 🔧 TEXT UNIQUE |
| `herinnering_verstuurd_op` | `string?` | ❌ → 🔧 TIMESTAMPTZ |
| `verlopen_notificatie_getoond` | `boolean?` | ❌ → 🔧 BOOLEAN DEFAULT FALSE |

### emails (→ 12 kolommen ontbreken)
| Kolom | TS Type | DB Status |
|-------|---------|-----------|
| `pinned` | `boolean?` | ❌ → 🔧 BOOLEAN DEFAULT FALSE |
| `snoozed_until` | `string?` | ❌ → 🔧 TIMESTAMPTZ |
| `thread_id` | `string?` | ❌ → 🔧 TEXT |
| `internal_notes` | `string?` | ❌ → 🔧 TEXT |
| `follow_up_at` | `string?` | ❌ → 🔧 TIMESTAMPTZ |
| `tracking` | `EmailTracking?` | ❌ → 🔧 JSONB |
| `inbox_type` | `string?` | ❌ → 🔧 TEXT DEFAULT 'persoonlijk' |
| `toegewezen_aan` | `string?` | ❌ → 🔧 TEXT |
| `ticket_status` | `string?` | ❌ → 🔧 TEXT |
| `interne_notities` | `InternEmailNotitie[]?` | ❌ → 🔧 JSONB DEFAULT '[]' |
| `prioriteit_inbox` | `string?` | ❌ → 🔧 TEXT |
| `categorie_inbox` | `string?` | ❌ → 🔧 TEXT |

### facturen (→ 17 kolommen ontbreken)
| Kolom | TS Type | DB Status |
|-------|---------|-----------|
| `bron_type` | `string?` | ❌ → 🔧 TEXT |
| `bron_offerte_id` | `string?` | ❌ → 🔧 UUID |
| `bron_project_id` | `string?` | ❌ → 🔧 UUID |
| `betaaltermijn_dagen` | `number?` | ❌ → 🔧 INTEGER |
| `herinnering_1_verstuurd` | `string?` | ❌ → 🔧 TIMESTAMPTZ |
| `herinnering_2_verstuurd` | `string?` | ❌ → 🔧 TIMESTAMPTZ |
| `herinnering_3_verstuurd` | `string?` | ❌ → 🔧 TIMESTAMPTZ |
| `aanmaning_verstuurd` | `string?` | ❌ → 🔧 TIMESTAMPTZ |
| `factuur_type` | `string?` | ❌ → 🔧 TEXT DEFAULT 'standaard' |
| `gerelateerde_factuur_id` | `string?` | ❌ → 🔧 UUID |
| `credit_reden` | `string?` | ❌ → 🔧 TEXT |
| `voorschot_percentage` | `number?` | ❌ → 🔧 DECIMAL(5,2) |
| `is_voorschot_verrekend` | `boolean?` | ❌ → 🔧 BOOLEAN DEFAULT FALSE |
| `verrekende_voorschot_ids` | `string[]?` | ❌ → 🔧 UUID[] DEFAULT '{}' |
| `werkbon_id` | `string?` | ❌ → 🔧 UUID |
| `betaal_token` | `string?` | ❌ → 🔧 TEXT UNIQUE |
| `betaal_link` | `string?` | ❌ → 🔧 TEXT |
| `betaal_methode` | `string?` | ❌ → 🔧 TEXT |
| `online_bekeken` | `boolean?` | ❌ → 🔧 BOOLEAN DEFAULT FALSE |
| `online_bekeken_op` | `string?` | ❌ → 🔧 TIMESTAMPTZ |

### tijdregistraties (→ 1 kolom ontbreekt)
| Kolom | TS Type | DB Status |
|-------|---------|-----------|
| `factuur_id` | `string?` | ❌ → 🔧 UUID FK→facturen |

### medewerkers (→ 1 kolom ontbreekt)
| Kolom | TS Type | DB Status |
|-------|---------|-----------|
| `app_rol` | `string?` | ❌ → 🔧 TEXT CHECK |

### app_settings (→ 3 kolommen ontbreken)
| Kolom | TS Type | DB Status |
|-------|---------|-----------|
| `standaard_voorwaarden` | `string` | ❌ → 🔧 TEXT DEFAULT '' |
| `kvk_api_key` | `string?` | ❌ → 🔧 TEXT |
| `kvk_api_enabled` | `boolean?` | ❌ → 🔧 BOOLEAN DEFAULT FALSE |

### tekening_goedkeuringen (→ 3 kolommen ontbreken)
| Kolom | TS Type | DB Status |
|-------|---------|-----------|
| `eerste_bekeken_op` | `string?` | ❌ → 🔧 TIMESTAMPTZ |
| `laatst_bekeken_op` | `string?` | ❌ → 🔧 TIMESTAMPTZ |
| `aantal_keer_bekeken` | `number?` | ❌ → 🔧 INTEGER DEFAULT 0 |

### notificaties (→ CHECK constraint incompleet)
| Waarde | DB Status |
|--------|-----------|
| `budget_waarschuwing` | ❌ Ontbreekt in CHECK → 🔧 |
| `booking_nieuw` | ❌ Ontbreekt in CHECK → 🔧 |

---

## 3. Ontbrekende tabellen (20 stuks)

Alle onderstaande tabellen bestaan in TypeScript types + supabaseService.ts maar hebben **geen SQL CREATE TABLE**:

1. `verlof` — Verlofregistratie per medewerker
2. `bedrijfssluitingsdagen` — Collectieve sluitingsdagen
3. `project_toewijzingen` — Medewerker-project koppelingen
4. `booking_slots` — Beschikbare boekingsslots
5. `booking_afspraken` — Gemaakte afspraken
6. `werkbonnen` — Werkbon hoofdrecords
7. `werkbon_regels` — Werkbon regeldetails
8. `werkbon_fotos` — Foto's bij werkbonnen
9. `herinnering_templates` — Betalingsherinnering templates
10. `leveranciers` — Leverancierbeheer
11. `uitgaven` — Uitgavenbeheer
12. `bestelbonnen` — Bestellingen bij leveranciers
13. `bestelbon_regels` — Bestelbon regeldetails
14. `leveringsbonnen` — Leveringsbonnen
15. `leveringsbon_regels` — Leveringsbon regeldetails
16. `voorraad_artikelen` — Voorraadbeheer artikelen
17. `voorraad_mutaties` — Voorraadmutaties
18. `deals` — Sales pipeline deals
19. `deal_activiteiten` — Deal activiteiten
20. `lead_formulieren` — Lead capture formulieren
21. `lead_inzendingen` — Lead form inzendingen

---

## 4. Service Functies Audit

### Bevindingen

1. **Geen `any` types** — Alle service functies gebruiken correcte TypeScript types ✅
2. **Geen `@ts-ignore`** — Niet gevonden ✅
3. **`round2()` gebruikt** — Geïmporteerd en gebruikt bij financiële berekeningen ✅
4. **CRUD completeness** — Alle entiteiten hebben volledige CRUD operaties ✅
5. **localStorage fallback** — Alle functies hebben correct localStorage fallback patroon ✅
6. **assertId()** — Gebruikt voor input validatie ✅
7. **Auto-nummering** — Werkbon (WB-YYYY-NNN), Uitgave (UIT-YYYY-NNN), Bestelbon (BST-YYYY-NNN), Leveringsbon (LB-YYYY-NNN) ✅

### Nota: user_id filtering via Supabase RLS
De service functies filtren NIET expliciet op user_id in Supabase queries — dit wordt afgedwongen via RLS policies. Dit is correct voor Supabase maar betekent dat **ALLE tabellen RLS moeten hebben**.

---

## 5. Bekende beperkingen

1. **Offerte/Factuur nummering** — Niet concurrent-safe bij meerdere gelijktijdige users (acceptabel voor eerste deployment, oplossing: Supabase function/sequence)
2. **EmailTracking** — Opgeslagen als JSONB, geen separate tabel (OK voor huidige schaal)
3. **Contactpersonen** — Embedded als JSONB in klanten tabel (geen apart relatie-model)
4. **EmailSequence** — Type gedefinieerd maar geen service functies/tabel (toekomstige feature)
5. **npm install** — Niet uitvoerbaar in huidige omgeving (registry geblokkeerd), tsc/build validatie niet mogelijk
