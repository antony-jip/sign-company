# België in doen. — wet, regelgeving en wat er per land verandert

Hoe doen. omgaat met een Belgische organisatie, en wat er wettelijk achter
zit. De landkeuze gebeurt bij het aanmaken van het account (onboarding,
stap 1) en is later te wijzigen bij Instellingen > Bedrijf. Het land staat
op `profiles.bedrijfs_land` en stuurt onderstaande punten aan.

## Wat er op de landkeuze meeverandert

| Onderwerp | Nederland | België | Waar in de code |
|---|---|---|---|
| Btw-tarieven in selects en afronding | 21 / 9 / 0 | 21 / 12 / 6 / 0 | `src/lib/btwTarieven.ts` |
| Ondernemingsnummer | KvK (8 cijfers) | KBO (10 cijfers, `0xxx.xxx.xxx`) | `src/lib/landInstellingen.ts`, PDF-label `Ondernemingsnr.` |
| RPR-vermelding op factuur | n.v.t. | Verplicht (WVV art. 2:20): "RPR Antwerpen, afdeling Antwerpen" | `profiles.rpr_rechtbank`, `BedrijfTab`, `pdfService` |
| Betalingskenmerk | Factuurnummer | Gestructureerde mededeling `+++xxx/xxxx/xxxxx+++` (mod 97), ook als UBL `PaymentID` | `src/lib/betalingskenmerk.ts` |
| Factuurvoorwaarden-default | "Betaling binnen 30 dagen" | Idem + wettelijke interest en € 40 forfait (wet 2 aug 2002, max. 60 dagen B2B) | `standaardInstellingenVoorLand` |
| E-facturatie | UBL NLCIUS-download | Peppol BIS 3.0, verplicht B2B sinds 1-1-2026; verzenden én ontvangen via Billit | `ublService.ts`, `api/billit-*`, `api/cron-billit-inbox.ts` |
| Peppol-identifier | 0106 (KvK) / 9944 (btw) | 0208 (KBO, afgeleid uit btw-nummer) | `src/lib/peppol.ts` |
| Btw verlegd | "Btw verlegd naar de afnemer." (nationale grondslag) | BE→BE werk in onroerende staat: verplichte medecontractant-tekst (KB nr. 1 art. 20) | `src/lib/verlegging.ts` |
| Btw-nummer controleren | VIES | VIES + prefill naam/adres (KBO-equivalent van KvK-zoeken) | `api/vies-check.ts`, `BtwCheckKnop` |
| KvK-zoeken (autocomplete) | Aan | Uit (Nederlands register) | `AddEditClient.tsx` |
| Feestdagen in de montageplanning | NL (Koningsdag, Bevrijdingsdag, …) | BE (21 juli, 15 aug, 1 en 11 nov, Paas-/Pinkstermaandag, …) | `src/utils/feestdagen.ts` |
| Betaallinks | Mollie (iDEAL) | Mollie (Bancontact/Payconiq) met eigen Mollie-account | `api/mollie-create-payment.ts` |
| doen.-abonnement | 21% btw | Btw verlegd (art. 196) zodra het btw-nummer via VIES is gevalideerd | `api/billing-webhook.ts` e.a. |
| Placeholders (postcode, telefoon, IBAN, e-mail) | `1234 AB`, `06-…`, `NL00 …` | `2000`, `+32 …`, `BE00 …` | `src/lib/landInstellingen.ts` |
| Voorbeeldklanten bij onboarding | Amsterdam/Rotterdam/Utrecht | Antwerpen/Gent/Mechelen met BE-btw-nummers | `demoKlantenVoorLand` |

## De regels waar het om gaat

- **Peppol-plicht (B2B, sinds 1 januari 2026).** Wet van 6 februari 2024: elke
  factuur tussen Belgische btw-plichtigen moet als gestructureerde e-factuur
  (EN 16931, Peppol BIS 3.0) via het Peppol-netwerk. PDF per mail telt niet
  meer. Ontvangen is ook verplicht; daarom landen inkomende Peppol-facturen bij
  Inkoopfacturen. Boetes bij niet-naleving lopen op tot € 5.000.
- **Verplichte factuurvermeldingen (art. 5 KB nr. 1 + WVV art. 2:20):** naam,
  rechtsvorm, zetel, ondernemingsnummer, btw-nummer met "BE", RPR-vermelding,
  factuurnummer in doorlopende reeks, datum, klantgegevens met btw-nummer,
  omschrijving, maatstaf en tarief per btw-voet, bij verlegging de
  wettelijke tekst.
- **Medecontractant (KB nr. 1 art. 20, tekst sinds 2023).** Werk in onroerende
  staat (montage van gevelreclame, lichtreclame, bewegwijzering aan/in een
  gebouw) voor een btw-plichtige klant: btw verlegd naar de klant, mét de
  letterlijke tekst "Verlegging van heffing. Bij gebrek aan schriftelijke
  betwisting …". Losse levering van borden/stickers aan dezelfde klant is
  gewoon 21%. In doen. staat dit nu per klant (`btw_verlegd`); een
  verleggingsgrond per factuur staat op de lijst (REVIEW_NOTES.md).
- **Betalingsachterstand (wet 2 augustus 2002, gewijzigd 2022):** B2B
  betaaltermijn maximaal 60 dagen, wettelijke interest en forfait € 40 zonder
  ingebrekestelling. De standaardtekst in doen. vermeldt dat.
- **Consumenten (Boek XIX WER, sinds 1 september 2023):** eerste herinnering
  gratis, 14 kalenderdagen wachttijd vóór kosten, geplafonneerde kosten.
  Sign-bedrijven factureren overwegend B2B; de herinneringsladder van doen.
  maakt nog geen onderscheid — pas nodig zodra particulieren worden
  aangemaand.
- **Btw-tarieven:** 21% standaard, 12% (o.a. horeca-restaurant, sociale
  huisvesting), 6% (o.a. renovatie woningen > 10 jaar, drukwerk/boeken), 0%.
  Welk tarief op een regel hoort blijft een keuze van de gebruiker.
- **Talen:** Vlaanderen Nederlands; Brussel/Wallonië Frans. doen. is
  Nederlandstalig; een taal per klant staat op de lijst.

## Wat nog niet per land verschilt (bewust)

- Herinneringsteksten en -ladder (7/14/21/30 dagen) — B2B-praktijk is gelijk.
- Offerte-voorwaarden — bedrijfsspecifiek, geen wettelijke tekst vereist.
- Exact Online-koppeling — Belgische administraties draaien op
  `start.exactonline.be`; niet ondersteund zolang er geen vraag is.
