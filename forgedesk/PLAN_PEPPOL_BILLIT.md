# Plan · Belgische klanten, Peppol en Billit

Status: **voorstel**, wacht op akkoord. Niets gebouwd, niets gecommit behalve
dit document. Aanleiding is de vraag van een prospect uit Antwerpen: werkt
doen. met betaallinks in België, en is de facturatie te koppelen aan Peppol
en Billit?

Ontwerpregel: **het bestaande boekhoudpatroon hergebruiken.** Billit wordt
een vierde `boekhoud_pakket` naast SnelStart, Moneybird en e-Boekhouden, met
dezelfde sync-knop, dezelfde encryptie van tokens en dezelfde
`facturen.boekhoud_*`-kolommen. Peppol is daarbovenop één extra stap in de
verzendketen. Geen eigen Peppol-access-point bouwen: Billit ís er een.

## 1. Waarom dit meer is dan een koppeling

Sinds 1 januari 2026 is in België gestructureerde elektronische facturatie
via Peppol **verplicht** voor B2B-facturen tussen Belgische btw-plichtigen.
Een PDF per mail is daar juridisch geen factuur meer. Een Belgische klant kan
doen. dus pas als facturatiesysteem gebruiken als doen. via Peppol kan
verzenden én ontvangen. Peppol is voor België geen wens maar de voorwaarde
om überhaupt mee te doen; Nederland volgt met de EU-richtlijn ViDA later dit
decennium, dus het werk wordt niet weggegooid.

Bronnen: [GS1 Belgilux](https://www.gs1belu.org/nl/peppol-verplichte-e-facturatie-voor-b2b-belgie),
[peppol.nl](https://www.peppol.nl/nl/nieuws/verplichte-e-facturatie-peppol-belgie-vanaf-2026),
[eConnect](https://econnect.eu/nl/docs/kennis/regelgeving-europa/belgie/overzicht).

## 2. Wat er al is (en dus niet opnieuw gebouwd wordt)

| Onderdeel | Locatie | Bruikbaar voor België? |
|---|---|---|
| Mollie-betaallink per factuur, eigen API-key per organisatie, geen `method`-filter | `api/mollie-create-payment.ts:299`, `IntegratiesTab.tsx:918` | **Ja, vandaag al.** Mollie toont de methoden van het eigen account, dus Bancontact/Payconiq zodra hij een Belgisch Mollie-account koppelt. Betaalpagina noemt Bancontact al (`BetaalPagina.tsx:472`) |
| doen.-abonnement via Mollie, `sequenceType: 'first'`, geen methode-restrictie | `api/create-subscription.ts:224` | Ja, kaart/Bancontact-mandaat werkt |
| UBL 2.1-generator met Peppol ProfileID | `src/services/ublService.ts` (289 regels) | Half: NLCIUS-profiel, land hardcoded NL, geen EndpointID, geen verzending |
| Downloadknop UBL in de factuureditor | `FactuurEditor.tsx:3181` | Alleen download, geen transport |
| Generiek boekhoudpatroon: één pakket per org, sync-knop, `boekhoud_extern_id`, `boekhoud_synced_at` | migratie `132_boekhoud_koppelingen.sql`, `FactuurEditor.tsx:2908` (`handleSyncBoekhouding`), `api/moneybird-sync-factuur.ts` als referentie-implementatie | **Ja**, Billit past hier één-op-één in |
| OAuth-flow met refresh, eigenaar per org en keepalive | `api/exact-auth.ts`, `api/exact-callback.ts`, `api/exact-refresh.ts`, `src/trigger/exact-token-keepalive.ts` | **Ja**, Billit eist OAuth voor commerciële integraties; dit patroon kopiëren |
| Versleutelde opslag van integratie-tokens | `api/save-integration-settings.ts` (`ALLOWED_FIELDS`, `SECRET_FIELDS`) | Ja |
| Verzendketen factuur: verwerken → PDF → Exact → mailen | `src/services/factuurVerzendService.ts:224` (`verwerkEnVerzendFactuur`, `FactuurKetenStap`) | Ja, Peppol wordt een extra stap |
| Klantvelden `verzendvoorkeur` ('email' \| 'post' \| 'portaal') en `btw_verlegd` | `types/index.ts:143-144`, `AddEditClient.tsx:687-712` | Ja: 'peppol' als vierde voorkeur; `btw_verlegd` wordt nu nergens verwerkt (alleen opgeslagen) |
| Landnormalisatie vrije tekst → ISO | `api/exact-sync-factuur.ts:688` (`landNaarIso`) | Ja, verhuist naar gedeelde helper |
| Inkoopfacturen-inbox met reviewflow (`nieuw` → `goedgekeurd` → `uitgaven`) | `inkoopfacturen`-tabel, `api/inkoopfactuur-sync.ts`, `inkoopfactuurService.ts` | Ja, inkomende Peppol-facturen landen hier |
| Sentry-alarm als een integratie-key geweigerd wordt | `mollie-create-payment.ts:318` | Zelfde patroon voor Billit |

## 3. Wat er nu níet kan

1. **Land is niet invulbaar.** Het klantformulier heeft geen landveld; vier
   schrijvers zetten hardcoded de tekst `'Nederland'` (`AddEditClient.tsx:296`,
   `importService.ts:418`, `LosseContacten.tsx:241,282`, vestigingen in
   `ClientProfile.tsx:167`). Ook de kolomdefault is `'Nederland'`
   (`001_create_all_tables.sql:67,121`). De UBL neemt `klant.land || 'NL'`
   letterlijk over en zou `<IdentificationCode>Nederland</IdentificationCode>`
   produceren, wat ongeldig is.
2. **Eigen bedrijf heeft geen land.** `Profile` en `Organisatie` kennen
   `kvk_nummer`, `btw_nummer`, `iban` en één adresstring `bedrijfs_adres`,
   geen land. `ublService.ts:120` zet de leverancier hard op `NL`.
3. **Btw-tarieven zijn 21/9/0**, hardcoded in selects
   (`QuoteItemsTable.tsx:1534,1780`, `CalculatieTab.tsx:952`) en in vier
   afleidingshelpers met `[21, 9, 0]` (`FactuurEditor.tsx:251`,
   `FacturenLayout.tsx:467`, `WatFacturerenDialog.tsx:68`,
   `factuurVerzendService.ts:154`). België heeft 21/12/6/0. De factuureditor
   zelf heeft een vrij getalveld (`FactuurEditor.tsx:3863`), dus 6% intikken
   kan, maar de afronding naar "zuiver tarief" herkent het niet.
4. **UBL is Nederlands en niet routeerbaar:** CustomizationID NLCIUS
   (`ublService.ts:70`), `schemeID="0106"` (KvK) voor beide partijen, en geen
   `cbc:EndpointID`. Peppol routeert op EndpointID; zonder dat veld wijst elk
   access point het document af. Ook `BuyerReference` (verplicht in BIS 3.0)
   en de verlegde-btw-categorie `AE` ontbreken.
5. **Billit bestaat niet in de repo.** Nul voorkomens.
6. **Bestaande boekhoudkoppelingen zijn NL.** Exact staat hard op
   `start.exactonline.nl` (10+ bestanden in `api/`); een Belgische
   administratie leeft op `start.exactonline.be`. KvK-zoeken is `api.kvk.nl`.
7. **Onze eigen abonnementsfactuur** rekent hard 21% (`billing-webhook.ts:41`).
   Aan een Belgische btw-plichtige hoort dat btw-verlegd te zijn.
8. Cosmetisch: "iDEAL" op vier plekken (`KpiStrip.tsx:62`,
   `ChangelogPage.tsx:189`, `ForgieTab.tsx:510`, `CreditsPakketDialog.tsx:205`),
   label "KvK Nummer" en IBAN-placeholder `NL00 BANK` in `BedrijfTab.tsx:352-361`.

## 4. Billit: wat het is en hoe we eraan hangen

Billit is een Belgisch facturatie-/boekhoudpakket **en** een gecertificeerd
Peppol-access-point met REST-API. Dat is precies de combinatie die de
prospect vraagt. Wat ik uit de documentatie heb kunnen vaststellen (de
docs-site zelf is vanuit deze sessie geblokkeerd; onderstaande komt uit de
zoekindex en moet bij fase 0 in de docs worden nagelopen):

| Onderdeel | Bevinding | Bron |
|---|---|---|
| Basis-URL's | `https://api.sandbox.billit.be` en `https://api.billit.be`; keys zijn per omgeving | [Sandbox vs Production](https://docs.billit.be/docs/sandbox-vs-production-1) |
| Authenticatie | Headers `apikey` + `partyID`. **API-key mag alleen voor niet-commerciële, eigen integraties.** Een SaaS als doen. moet OAuth gebruiken: Client ID/Secret aanvragen bij Billit-support, eerst sandbox, dan goedkeuring voor productie | [Authentication](https://docs.billit.be/docs/authentication), [OAuth](https://docs.billit.be/docs/how-do-i-get-started-with-oauth), [OAuth Client ID & Secret](https://docs.billit.be/docs/how-do-i-request-oauth-client-id-and-secret) |
| Factuur aanmaken | `POST /v1/orders` met `OrderType: "Invoice"`, `OrderDirection: "Income"`, `OrderNumber`, `OrderDate`, `ExpiryDate`, `Customer { Name, VATNumber, PartyType: "Customer", Addresses[{ CountryCode }] }`, `OrderLines[{ Quantity, UnitPriceExcl, Description, VATPercentage }]` | [Order](https://docs.billit.be/reference/order-1), [Creating Sales Invoices](https://docs.billit.be/docs/create-first-invoice) |
| Via Peppol verzenden | `POST /v1/peppol/sendOrder` (Billit bouwt en valideert de UBL uit JSON) óf `POST /v1/peppol/sendXml` (eigen UBL, moet Peppol-validatie doorstaan) | [sendOrder](https://docs.billit.be/reference/peppol_postsendorder-1), [Send UBL to Peppol](https://docs.billit.be/docs/send-ubl-to-peppol-1) |
| Is de ontvanger Peppol-geregistreerd? | `GET /v1/peppol/participantInformation/{btw- of ondernemingsnummer}`, bv. `BE0437299999`, `0437299999` of `NL002059999B90`. Sandbox-lijst is veel kleiner dan productie | [Check via API](https://docs.billit.be/docs/check-via-api) |
| Status en bewijs van aflevering | Elk document heeft een `OrderStatus`; bij Peppol komen IMR/MLR-berichten terug (proof of delivery). Webhooks op `POST /v1/webhooks`, of pollen | [Webhooks e-invoice statuses](https://docs.billit.be/docs/retrieving-your-first-e-invoice-statuses), [Webhooks](https://docs.billit.be/docs/webhooks) |
| Inkomende facturen | Zelfde webhooks; document ophalen als order met `OrderDirection: "Cost"` plus bestand (UBL/PDF) uit de Peppol-inbox | [Receiving via Peppol](https://docs.billit.be/docs/preparation-of-invoice-receiving-via-peppol), [Get files Peppol inbox](https://docs.billit.be/docs/get-files-peppol-inbox) |

**Keuze: `/v1/orders` + Peppol-verzending via Billit, niet `sendXml`.** De
prospect boekhoudt in Billit; hij wil de factuur dáár hebben staan én via
Peppol verstuurd. Met `orders` krijgt hij beide in één call en doet Billit
de UBL-validatie. Onze eigen `ublService` blijft bestaan voor de download en
wordt in fase 2 wel Peppol-correct gemaakt, zodat een tweede route (`sendXml`
voor organisaties die níet in Billit boekhouden) later alleen transport is.

**Lead-time-item dat vandaag kan starten:** OAuth Client ID/Secret voor de
sandbox aanvragen bij Billit-support. Dat heeft doorlooptijd en zonder die
credentials is fase 3 niet te testen. Tegelijk vragen: kosten per
Peppol-deelnemer/-document, en of een organisatie via onze OAuth-app haar
eigen bestaande Billit-account koppelt (aanname: ja, zoals bij Exact).

## 5. Fasen

Elke fase is los te mergen en terug te draaien. Fase 1 t/m 3 zijn wat de
demo nodig heeft; 4 t/m 6 maken het compleet. Migratienummers: eerstvolgend
vrij nummer in `supabase/migrations/` is **252** (CLAUDE.md noemt 217, de
map is verder).

### Fase 0 · Voorbereiding (geen code, wel doorlooptijd)

- OAuth-credentials sandbox aanvragen bij Billit; sandbox-account voor doen.
  aanmaken; Postman-collectie "Billit API QuickStart" doorlopen om de exacte
  veldnamen van `sendOrder`, `webhooks` en de statuswaarden vast te leggen.
- Beslissen: Belgische pilot-organisatie achter een feature flag
  (`docs/feature-flags.md`, rij per organisatie, géén globale rij).

### Fase 1 · Land en btw-tarieven (≈ 1,5 dag)

Randvoorwaarde voor alles erna.

| Wat | Waar |
|---|---|
| Migratie `252_land_iso.sql`: `klanten.land` en `vestigingen.land` default `'NL'`; `UPDATE ... SET land = 'NL' WHERE land ILIKE 'nederland'`, idem `'BE'` voor 'België/Belgie', `'DE'` voor 'Duitsland'. Nieuwe kolom `organisaties.land TEXT NOT NULL DEFAULT 'NL'` | `supabase/migrations/` |
| Helper `src/lib/landen.ts`: `LANDEN` (NL, BE, DE, LU, FR), `landNaarIso()` (verhuisd uit `exact-sync-factuur.ts`, die kopieert hem inline terug want `api/` mag niets uit `src/`), `landNaam()` voor weergave | nieuw |
| Landselect in klantformulier, vestigingformulier en import; de vier hardcoded `'Nederland'`-schrijvers gaan naar `'NL'` | `AddEditClient.tsx`, `ClientProfile.tsx:167`, `importService.ts:418`, `LosseContacten.tsx:241,282` |
| `ClientProfile.tsx:916` toont `landNaam(klant.land)` in plaats van de ruwe waarde | |
| Landselect in bedrijfsinstellingen; label "KvK-nummer" wordt "Ondernemingsnummer (KBO)" bij BE; IBAN-placeholder per land | `BedrijfTab.tsx:352-361`, `Organisatie`-type |
| Helper `src/lib/btwTarieven.ts`: `btwTarievenVoor(land)` → NL `[21, 9, 0]`, BE `[21, 12, 6, 0]`; `zuiverTarief(netto, btw, land)` vervangt de vier `[21, 9, 0].find(...)`-kopieën | nieuw + `FactuurEditor.tsx:251`, `FacturenLayout.tsx:467`, `WatFacturerenDialog.tsx:68`, `factuurVerzendService.ts:154` |
| Selects in offerteregels en calculatie-instellingen lezen de lijst uit de helper | `QuoteItemsTable.tsx:1534,1780`, `CalculatieTab.tsx:952` |
| Tests: `tests/lib/landen.test.ts`, `tests/lib/btwTarieven.test.ts` | |

Niet aanraken: de hoog/laag/nul-mappings van Moneybird, SnelStart en Exact.
Dat zijn Nederlandse pakketten; een Belgische org kiest Billit.

### Fase 2 · UBL Peppol-correct maken (≈ 1 dag)

`ublService.ts` wordt land-bewust. Dit is klein, en het is de enige plek
waar Peppol-kennis in doen. zelf leeft.

| Wat | Detail |
|---|---|
| CustomizationID per leveranciersland | NL: NLCIUS blijft. BE: `urn:cen.eu:en16931:2017#compliant#urn:fdc:peppol.eu:2017:poacc:billing:3.0` |
| `cbc:EndpointID` op leverancier én klant | BE: `schemeID="0208"` + 10-cijferig ondernemingsnummer (afleidbaar uit `btw_nummer`: `BE0123456789` → `0123456789`). NL: `schemeID="0106"` + KvK. Helper `peppolIdentifier({ land, btw_nummer, kvk_nummer })` in `src/lib/peppol.ts` |
| `PartyLegalEntity/CompanyID` schemeID per land | 0208 (BE) / 0106 (NL) in plaats van hardcoded 0106 |
| Leverancierland en -adres uit profiel | `bedrijfs_adres` splitsen zoals `BedrijfTab.tsx:62-69` al doet; land uit `organisaties.land` |
| `cbc:BuyerReference` (BT-10) | `klant_referentie`/PO-nummer, anders factuurnummer. Verplicht in BIS 3.0 |
| `klant.btw_verlegd` → categorie `AE` met `TaxExemptionReasonCode VATEX-EU-AE`, 0% | Wordt nu nergens verwerkt |
| Tests | `tests/services/ublService.test.ts`: NL-factuur, BE-factuur, creditnota, verlegd; assert op CustomizationID, EndpointID, schemeID en totalen |

### Fase 3 · Billit als boekhoudpakket + Peppol verzenden (≈ 3 dagen)

Kopie van het Moneybird-patroon, plus OAuth zoals Exact.

**Migratie `253_billit.sql`**

```sql
-- boekhoud_pakket-CHECK op facturen én app_settings uitbreiden met 'billit'
ALTER TABLE app_settings
  ADD COLUMN billit_access_token TEXT,        -- versleuteld
  ADD COLUMN billit_refresh_token TEXT,       -- versleuteld
  ADD COLUMN billit_token_expires_at TIMESTAMPTZ,
  ADD COLUMN billit_party_id TEXT,
  ADD COLUMN billit_omgeving TEXT DEFAULT 'productie' CHECK (billit_omgeving IN ('sandbox','productie')),
  ADD COLUMN billit_owner_user_id UUID,
  ADD COLUMN peppol_verzenden_standaard BOOLEAN DEFAULT false;
ALTER TABLE facturen
  ADD COLUMN peppol_status TEXT CHECK (peppol_status IN ('niet_verzonden','in_wachtrij','verzonden','afgeleverd','mislukt')),
  ADD COLUMN peppol_verzonden_op TIMESTAMPTZ,
  ADD COLUMN peppol_fout TEXT,
  ADD COLUMN peppol_bericht_id TEXT;
ALTER TABLE klanten
  ADD COLUMN peppol_status TEXT CHECK (peppol_status IN ('onbekend','geregistreerd','niet_geregistreerd')) DEFAULT 'onbekend',
  ADD COLUMN peppol_gecheckt_op TIMESTAMPTZ,
  ADD COLUMN peppol_id TEXT;                  -- handmatige override, normaal afgeleid
-- klanten.verzendvoorkeur: CHECK uit migratie 236 herdefiniëren met 'peppol' erbij
```

**Serverless functies** (elk standalone, geen imports uit `src/`, decrypt en
Sentry-init inline zoals de rest van `api/`):

| Bestand | Doet |
|---|---|
| `api/billit-auth.ts`, `api/billit-callback.ts`, `api/billit-disconnect.ts` | OAuth-start, callback (tokens versleuteld naar `app_settings`, `billit_party_id` ophalen via `GET /v1/parties/{partyID}`), loskoppelen. Model: `exact-auth.ts` / `exact-callback.ts` / `exact-disconnect.ts` |
| `api/billit-sync-factuur.ts` | `POST /v1/orders` (`Income`), klant op `VATNumber` matchen/aanmaken, regels als `UnitPriceExcl` = regeltotaal met `Quantity` 1 (zelfde truc als Moneybird/Exact zodat korting en afronding kloppen), `boekhoud_extern_id` = Billit `OrderID`. Bij `peppol: true` in de body direct daarna de Peppol-verzending; response `{ extern_id, peppol_status, waarschuwing? }` |
| `api/billit-peppol-check.ts` | `GET /v1/peppol/participantInformation/{id}`; schrijft `klanten.peppol_status` + `peppol_gecheckt_op`. Rate-limit via bestaande `check_rate_limit` RPC |
| `api/billit-webhook.ts` | Ontvangt statusupdates; zoekt factuur op `boekhoud_extern_id`, zet `peppol_status` op `afgeleverd`/`mislukt` + `peppol_fout`. Handtekening/secret verifiëren zoals `mollie-webhook.ts` en `nieuwsbrief-webhook.ts` |
| `api/save-integration-settings.ts` | `billit_*` in `ALLOWED_FIELDS`; tokens in `SECRET_FIELDS`; `boekhoud_pakket` accepteert `'billit'` |
| Token-refresh | Inline per bestand (regel: geen `api/_helpers/`); keepalive-job naar model van `src/trigger/exact-token-keepalive.ts` alleen als Billit-refresh-tokens verlopen (checken in fase 0) |

**Client**

| Bestand | Wijziging |
|---|---|
| `types/index.ts:773` | `BoekhoudPakket` += `'billit'`; `AppSettings` += `billit_*`; `Factuur` += `peppol_*`; `Klant.verzendvoorkeur` += `'peppol'`, `peppol_status`, `peppol_id` |
| `IntegratiesTab.tsx` | Billit-kaart: "Verbind met Billit" (OAuth), omgeving, schakelaar "Facturen standaard via Peppol". Pakketselect krijgt Billit. `tokenPerPakket` (regel 495) krijgt `billit: s.billit_access_token` |
| `FactuurEditor.tsx:129` | `BOEKHOUD_PAKKET_NAAM.billit = 'Billit'`; `handleSyncBoekhouding` stuurt `peppol: true` mee als klant `verzendvoorkeur === 'peppol'` of org-standaard aan; Peppol-statusbadge naast de bestaande sync-badge (regel 3145) |
| `factuurVerzendService.ts:25` | `FactuurKetenStap` += `'peppol'`; in `verwerkEnVerzendFactuur`: als pakket Billit én klant Peppol-geregistreerd → sync+verzend vóór het mailen (zelfde volgorde-argument als Exact: sync vóór verzenden). Mail blijft gaan met PDF als begeleidend document, tenzij voorkeur uitsluitend Peppol is |
| `AddEditClient.tsx:687` | 'Peppol' als verzendvoorkeur; naast het btw-nummerveld een knop "Check Peppol" met badge (geregistreerd / niet / onbekend) |
| `ClientProfile.tsx` | Zelfde badge |
| Kennisbank (`KennisbankPage.tsx`) en `ChangelogPage.tsx` | Artikel "Peppol en Billit" + changelog-regel |

**Tests:** `tests/api/billitPayload.test.ts` voor de mapping factuur →
Billit-order (regeltotaal, creditnota als `CreditNote`, verlegd-btw,
Belgische en Nederlandse klant), naar model van
`tests/api/exactRegelUitTotalen.test.ts`.

### Fase 4 · Peppol-inbox: inkomende facturen (≈ 2 dagen)

Ook verplicht in België: ontvangen. Billit is de inbox, doen. de reviewflow.

| Wat | Waar |
|---|---|
| `api/billit-webhook.ts` krijgt tweede tak: nieuw inkomend document → order ophalen (`OrderDirection: "Cost"`) + bestand (PDF-rendering en UBL) | |
| Insert in `inkoopfacturen` met `bron = 'peppol'` (nieuwe kolom, migratie `254`), gestructureerde velden direct uit de UBL (leverancier, nummer, datums, bedragen, regels) in plaats van via de Claude-extractie in `api/inkoopfactuur-extract.ts`; `extractie_vertrouwen = 'hoog'`, `raw_extractie_json` = de order | `inkoopfacturen`-tabel, `inkoopfactuurService.ts` |
| PDF naar `storage.inkoopfacturen` (kolom `pdf_storage_path` is NOT NULL); Billit levert een PDF-weergave mee, anders zelf renderen uit de UBL | |
| `InkoopfacturenLayout.tsx`: bron-badge "Peppol" | |
| Back-up zonder webhook: `api/cron-billit-inbox.ts`, elke 15 min, zelfde vorm als `cron-exact-betaalsync.ts`; registreren in `vercel.json` | |

### Fase 5 · Peppol zonder Billit-boekhouding (later, ≈ 2 dagen)

Voor Nederlandse organisaties die in Exact/Moneybird boekhouden maar toch
via Peppol willen verzenden: doen. gebruikt dan één eigen Billit-access-
point-account en stuurt de UBL uit fase 2 via `POST /v1/peppol/sendXml`.
Vraagt een eigen Peppol-registratie per organisatie (via Billit) en een
kostenmodel. Pas oppakken als er vraag is; fase 2 zorgt dat de UBL er
klaar voor is.

### Fase 6 · Eigen facturatie en cosmetiek (≈ 0,5 dag)

- `billing-webhook.ts:41`: btw-verlegd voor organisaties met land ≠ NL en
  een geldig EU-btw-nummer; tekst "BTW verlegd, art. 196 Btw-richtlijn" op
  de abonnementsfactuur. Kolom `organisaties.land` uit fase 1.
- "iDEAL" → "iDEAL of Bancontact" op de vier plekken uit §3.8.
- KvK-zoekveld (`KvkZoekVeld.tsx`) verbergen bij land BE; KBO-zoeken is een
  aparte wens.
- Exact-koppeling voor `.be`-administraties: niet in dit plan. Vraagt een
  omgevingskeuze in 10+ `api/exact-*`-bestanden; alleen doen als een
  Belgische Exact-gebruiker zich meldt.

## 6. Risico's en open vragen

| Risico | Wat we ermee doen |
|---|---|
| **Billit-OAuth-goedkeuring** voor productie heeft doorlooptijd; API-key-route is contractueel niet toegestaan voor een SaaS | Fase 0 vandaag starten. Sandbox met OAuth-credentials volstaat voor de demo |
| Exacte veldnamen van `sendOrder`, webhook-payload en statuswaarden zijn niet uit de docs geverifieerd (site geblokkeerd in deze omgeving) | Fase 0: één sessie met de docs en Postman-collectie; tabel in §4 bijwerken vóór fase 3 begint |
| Datamigratie `land`: 'Nederland' → 'NL' raakt alles wat de ruwe waarde toont | Alleen `ClientProfile.tsx:916` toont hem; `landNaarIso` in Exact-sync accepteert al ISO-codes. Migratie is idempotent en omkeerbaar |
| Verzendketen wordt langer (sync + Peppol vóór mail); een Billit-storing mag een factuur niet blokkeren | Zelfde soft-fail als Exact: ketenstap `'peppol'` faalt zichtbaar met `FactuurKetenFout`, mail gaat door, factuur krijgt `peppol_status = 'mislukt'` en een retry-knop |
| Dubbele verzending bij dubbelklik of webhook-retry | `claimVerzending` in `factuurVerzendService.ts:192` bestaat al; `peppol_status = 'in_wachtrij'` als lock, en `boekhoud_extern_id` als idempotentiesleutel richting Billit (`OrderNumber` = factuurnummer) |
| Belgische btw-regels die we niet kennen (6% renovatie, medecontractant, intracommunautair) | Tarieven alleen als lijst aanbieden; de fiscale keuze blijft bij de gebruiker en zijn boekhouder. `btw_verlegd` per klant dekt medecontractant en intracommunautair |
| `FactuurEditor.tsx` (3786 regels) en `types/index.ts` (2453) worden geraakt | Grep, nooit cat; wijzigingen beperkt tot `BOEKHOUD_PAKKET_NAAM`, `handleSyncBoekhouding` en de badge. Bestaande tsc-fouten in dat bestand eerst tellen (`npx tsc --noEmit \| grep -cE "error TS"`) en niet laten stijgen; `npm run typecheck:api` voor elk nieuw `api/`-bestand |

## 7. Inschatting en volgorde

| Fase | Dev-dagen | Levert |
|---|---|---|
| 0 Voorbereiding | 0 (doorlooptijd) | Sandbox-credentials, geverifieerde API-velden |
| 1 Land + btw | 1,5 | Belgische klant en Belgisch bedrijf correct invoerbaar |
| 2 UBL BIS 3.0 | 1 | Peppol-geldige UBL-download voor NL en BE |
| 3 Billit + Peppol verzenden | 3 | **Demo-waardig:** factuur naar Billit én via Peppol, Peppol-check op klant |
| 4 Peppol-inbox | 2 | Wettelijk compleet voor België |
| 5 Peppol zonder Billit | 2 | Alleen op vraag |
| 6 Eigen facturatie + cosmetiek | 0,5 | Netjes |

Totaal voor België compleet (0-4 + 6): **≈ 8 dev-dagen**, waarvan 5,5 vóór
de demo. Fase 1 en 2 kunnen parallel; fase 3 wacht op fase 1 en op de
sandbox-credentials uit fase 0.

## 8. Wat ik vandaag zou doen

1. Billit mailen voor OAuth-sandbox-credentials en het kostenmodel (fase 0).
2. De prospect antwoorden: betaallinks werken nu met zijn eigen
   Mollie-account (Bancontact inbegrepen); Peppol en Billit staan gepland
   met een concrete opzet; in de demo laten zien wat er staat en vragen hoe
   hij nu in Billit werkt (eigen Billit-abonnement? welke documenttypen
   ontvangt hij via Peppol?).
3. Bij akkoord op dit plan: fase 1 en 2 starten, die hangen nergens op.
