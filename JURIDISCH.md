# Juridisch — status en open punten

Bijgewerkt: 25 juli 2026

De algemene voorwaarden staan in `src/data/voorwaarden.ts` en worden gerenderd op
`/voorwaarden`. Bijlage A is de verwerkersovereenkomst (AVG art. 28), Bijlage B is de
lijst met sub-verwerkers.

## Bedrijfsgegevens

Ingevuld in `src/data/voorwaarden.ts`, artikel 1.1:

- Contractspartij: **Sign Company VOF** (door Antony bevestigd op 25 juli 2026)
- KvK: **36011150** (overgenomen van signcompany.nl, waar het als 360.111.50 staat)
- Btw: **NL006284267B01**

Eén punt blijft open: het KvK-nummer heb ik van je eigen website gehaald, niet uit een
officiële bron. Controleer het even in het Handelsregister.

## Laten nakijken door een jurist

Niet omdat de tekst incompleet is, maar omdat deze punten geld kosten als ze fout staan:

- **Artikel 18, aansprakelijkheid. Dit is het belangrijkste punt.** Een VOF is geen
  rechtspersoon: de vennoten zijn hoofdelijk en met hun privévermogen aansprakelijk.
  Sneuvelt de beperking in artikel 18, dan landt een claim dus niet bij een B.V. maar bij
  jullie persoonlijk. De beperking staat nu op de betaling over twaalf maanden met een
  maximum van € 5.000, oftewel ongeveer € 1.548 per klant per jaar. Laat een jurist
  toetsen of dat standhoudt tegenover een klant die zijn hele administratie kwijt is, en
  bespreek meteen of een beroepsaansprakelijkheidsverzekering hier verstandig is.
- **Artikel 6.2 en 6.3**, de afbakening tegenover boekhouding en advies.
- **Bijlage A, doorgifte buiten de EER.** De onderbouwing leunt op de
  standaardcontractbepalingen van de leveranciers. Controleer of je de DPA's van
  Anthropic en fal.ai daadwerkelijk hebt geaccepteerd en bewaard.

## Wat is aangepast

- `/voorwaarden` toegevoegd, gelinkt vanuit de footer en de sitemap.
- Registratie in de app (`forgedesk/src/components/auth/RegisterPage.tsx`) vraagt nu een
  expliciet vinkje met een link naar de voorwaarden. Zonder vinkje geen account.
- Twee FAQ-antwoorden gecorrigeerd die feitelijk onjuist waren:
  - "Geen data verlaat Europa" klopte niet, want twaalf endpoints sturen inhoud naar
    Anthropic en Studio stuurt foto's naar fal.ai. Nu benoemd, met de mogelijkheid om
    AI-functies uit te zetten.
  - "Nooit gedeeld met derden" plus "verwerkersovereenkomst op aanvraag" is vervangen:
    verwerkers worden benoemd en de verwerkersovereenkomst geldt automatisch.

## Nog niet gedaan

- **Privacyverklaring.** De voorwaarden dekken de verwerking richting klanten, maar er is
  nog geen aparte privacyverklaring voor websitebezoekers en voor de gegevens waarvoor
  doen. zelf verwerkingsverantwoordelijke is. Het contactformulier verzamelt naam, e-mail
  en bericht zonder verwijzing.
- **Verwerkingsregister (art. 30).** Bijlage B is een goede basis, maar een register is
  wat anders dan een sub-verwerkerslijst.
- **Retentie technisch afdwingen.** Artikel 17 belooft verwijdering na 30 dagen plus 30
  dagen back-up. Er draait nog geen job die dat uitvoert.
- **Afmeldregel in koude outreach.** `forgedesk/src/components/email/LeadsPaneel.tsx`
  stuurt via de eigen mailbox, dus zonder de afmeldlink die de nieuwsbrief wel heeft.
  Voor zakelijke koude e-mail is een afmeldmogelijkheid verplicht (Telecommunicatiewet
  11.7).

## Sub-verwerkers bijwerken

Bijlage B is afgeleid uit de integraties in `forgedesk`: elke partij met een eigen
API-sleutel of externe host in `api/`. Komt er een koppeling bij, werk dan
`subVerwerkers` in `src/data/voorwaarden.ts` bij en meld de wijziging 30 dagen vooraf
aan je klanten (Bijlage A, artikel A5.2).
