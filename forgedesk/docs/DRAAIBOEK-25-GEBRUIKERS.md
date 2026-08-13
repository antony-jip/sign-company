# Draaiboek: bedrijf met 25 gebruikers onboarden

Voor de livegang van een organisatie met 25 losse gebruikers (week van
17 aug 2026). Volgorde is bindend: elke stap voorkomt een concreet
faalpad dat in de doorlichting van 13 aug is gevonden.

## A. Vooraf, eenmalig (Antony, SQL-editor)

1. **Migraties draaien** (in deze volgorde, voor zover nog niet gedraaid):
   - `205_kindtabellen_org_rls.sql` — collega's zien elkaars
     werkbonregels/foto's/versies niet zolang deze niet draait.
   - `206_facturen_offerte_uniek_en_items_rpc.sql` — dubbel-factureren en
     dubbele factuurregels bij gelijktijdig opslaan.
   - `207_uitnodigingen_org_admins.sql` — tweede admin ziet openstaande
     uitnodigingen.

2. **Verifieer het race-vangnet** (moet 5 rijen geven):

   ```sql
   SELECT indexname FROM pg_indexes WHERE indexname IN
    ('facturen_org_nummer_unique','idx_offertes_nummer_org_unique',
     'werkbonnen_org_nummer_unique','projecten_org_nummer_unique',
     'klanten_org_debiteurennummer_unique');
   ```

3. **Verifieer de rol-bescherming** (beide moeten bestaan):

   ```sql
   SELECT tgname FROM pg_trigger
   WHERE tgname IN ('profiles_rol_en_org_vastzetten_trigger',
                    'organisaties_staffel_beschermen_trigger')
      OR tgname LIKE '%rol_en_org%' OR tgname LIKE '%staffel%';
   ```

4. **RLS-dekking**: draai `docs/rls-dekking.sql` en controleer dat de
   tabellen uit migratie 205 nu org-policies hebben.

## B. Zodra de organisatie van het bedrijf bestaat

5. **Staffel op trede 3** (25 past niet in de default van 10; er is geen
   UI voor en de trigger blokkeert client-writes):

   ```sql
   UPDATE organisaties
   SET max_gebruikers = 35, abonnement_bedrag_excl = 279, ai_maandlimiet = 50
   WHERE id = '<org-id>';
   ```

   Dit kan ook via Claude (service-role-API). Loopt er al een
   Mollie-abonnement, dan daarna `api/update-subscription-bedrag`
   aanroepen (owner-only) zodat de incasso meebeweegt.

6. **Eigenaar eerst compleet.** De org-eigenaar rondt de
   bedrijfs-onboarding volledig af en vult onder Instellingen > Bedrijf:
   bedrijfsnaam, adres, KvK, btw-nummer, IBAN en logo. Alle offertes en
   facturen van alle 25 gebruikers dragen déze gegevens. Daarna koppelt
   de eigenaar de eigen mailbox.

## C. Uitnodigen

7. **Check vooraf**: heeft iemand van de 25 al een eigen doen.-account op
   het werkmailadres? Die kan niet uitgenodigd worden (alleen handmatig
   via SQL te verhuizen). Vraag de lijst e-mailadressen op en vergelijk.

8. **Volgorde**: pas uitnodigen nadat stap 6 klaar is. Wie zichzelf los
   registreert krijgt ongemerkt een eigen lege organisatie.

9. **Tempo**: de invite-API staat 10 uitnodigingen per uur per admin toe.
   25 invites = spreiden over 3 uur, of met twee admins werken.

10. **Instructie aan het team** (letterlijk meesturen):
    - Klik de link in de mail binnen 24 uur.
    - Link verlopen? Ga naar de loginpagina en kies wachtwoord vergeten
      met hetzelfde e-mailadres. Er komt geen tweede uitnodiging.
    - Registreer jezelf nooit los via de registratiepagina.
    - Vul in de welkom-wizard je echte voor- en achternaam in; tot die
      tijd sta je in de planning als je e-mailprefix.
    - Koppel je eigen mailbox (Instellingen > Koppelingen > E-mail),
      anders kun je geen offertes of facturen mailen.

11. **Let op**: openstaande uitnodigingen zijn tot migratie 207 alleen
    zichtbaar voor de org-eigenaar, niet voor andere admins.

## D. Eerste werkweek

12. **Taken-weergave**: laat iedereen in Taken een eigen filter zetten
    (default is "iedereen" = alle taken van 25 man door elkaar).
13. **Tegelijk werken**: niet met meerdere mensen tegelijk dezelfde
    factuur/werkbon/projectdetail bewerken; de laatste die opslaat wint.
    Offertes en (na migratie 206) factuurregels zijn beschermd, de rest
    nog niet. Wijzigingen van collega's zie je pas na een refresh.
14. **Deactiveren bij vertrek**: Instellingen > Teamleden > deactiveren
    (telt dan niet meer mee voor de staffel). Zet de bijbehorende
    medewerker in Planning apart op inactief; dat gaat niet vanzelf mee.

## E. Monitoring tijdens de onboarding-dagen

- Sentry: let op `Profile zonder organisatie_id na signup` — dat is het
  signaal dat iemand buiten de invite om binnenkwam.
- AI-budget: bij melding "gedeelde AI-budget is op" de maandlimiet
  heroverwegen (staffel trede 3 = 50 euro per org per maand).
- Teamleden-tab: controleer na elke invite-ronde het aantal
  geaccepteerde profielen tegen de verwachting.
