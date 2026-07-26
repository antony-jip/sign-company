/* Privacyverklaring.

   Aanvulling op de algemene voorwaarden, niet een herhaling ervan. De
   voorwaarden gaan over de gegevens die jij als klant in doen. zet, waarbij
   wij verwerker zijn. Dit stuk gaat over de gegevens waarvoor wij zelf
   verwerkingsverantwoordelijke zijn: bezoekers van de website, mensen die
   het contactformulier gebruiken, en accounthouders.

   De sub-verwerkerslijst staat bewust maar op één plek, in
   src/data/voorwaarden.ts (Bijlage B). Hier wordt ernaar verwezen. */

export const PRIVACY_VERSIE = '1.0'
export const PRIVACY_DATUM = '26 juli 2026'

export type PrivacyBlok = {
  nr: string
  titel: string
  leden: string[]
}

export const privacyBlokken: PrivacyBlok[] = [
  {
    nr: '1',
    titel: 'Waar dit over gaat',
    leden: [
      'Deze verklaring gaat over persoonsgegevens waarvoor wij zelf bepalen waarom en hoe we ze verwerken: bezoekers van doen.team, mensen die contact met ons opnemen, en accounthouders van doen.',
      'Zet jij als klant gegevens van jouw eigen klanten in doen., dan bepaal jij wat daarmee gebeurt en zijn wij alleen verwerker. Hoe wij daarmee omgaan staat in Bijlage A van de algemene voorwaarden.',
      'Verantwoordelijke is Sign Company VOF, De Drie Kronen 115, 1601 MT Enkhuizen, KvK 36011150.',
    ],
  },
  {
    nr: '2',
    titel: 'De website',
    leden: [
      'Wij gebruiken geen cookies om je te volgen, geen advertentiepixels en geen profielen. Daarom zie je ook geen cookiebanner: er valt niets te accepteren.',
      'We meten wel hoeveel mensen welke pagina bekijken, met een cookieloze teller die op ons eigen domein draait. Daarbij wordt geen uniek profiel opgebouwd en worden IP-adressen niet opgeslagen. We zien dus dat een pagina 40 keer is bekeken, niet door wie.',
      'Onze server houdt technische logs bij, zoals opgevraagde adressen en foutmeldingen. Die gebruiken we voor beveiliging en storingen, en ze worden na 30 dagen opgeruimd.',
      'De pagina laadt geen scripts, lettertypen of afbeeldingen van externe partijen. Alles komt van ons eigen domein.',
    ],
  },
  {
    nr: '3',
    titel: 'Het contactformulier',
    leden: [
      'Vul je het contactformulier in, dan verwerken wij je naam, je e-mailadres en je bericht. Meer vragen we niet.',
      'We gebruiken die gegevens om je vraag te beantwoorden. De grondslag is ons gerechtvaardigd belang om op een binnenkomende vraag te kunnen reageren, en jouw belang om antwoord te krijgen.',
      'Je bericht komt binnen via onze e-mailverzender en belandt in onze mailbox. We bewaren het maximaal twee jaar, zodat we een eerder gesprek nog kunnen terugvinden. Wil je dat we het eerder weggooien, vraag het en we doen het.',
      'We gebruiken je adres niet om je ongevraagd commerciële mail te sturen.',
    ],
  },
  {
    nr: '4',
    titel: 'Je account',
    leden: [
      'Maak je een account aan, dan verwerken wij je e-mailadres, je naam, je bedrijfsnaam en je factuurgegevens. Dat hebben we nodig om de overeenkomst uit te voeren.',
      'Voor de betaling gebruiken wij een betaaldienstverlener. Je betaalgegevens komen bij die partij terecht en niet bij ons.',
      'We sturen je e-mail over je account: bevestigingen, facturen, meldingen over je proefperiode en berichten over storingen of wijzigingen. Die horen bij de dienst en kun je niet uitzetten zolang je een account hebt.',
      'Facturen bewaren wij zeven jaar, want dat schrijft de belastingwet voor. De rest van je gegevens verwijderen we volgens artikel 17 van de algemene voorwaarden.',
    ],
  },
  {
    nr: '5',
    titel: 'Wie je gegevens nog meer ziet',
    leden: [
      'Om doen. te kunnen leveren schakelen wij een aantal partijen in, bijvoorbeeld voor hosting, e-mail, betalingen en AI. De volledige lijst met wie dat zijn, waarvoor, waar zij zitten en op welke grondslag staat in Bijlage B van de algemene voorwaarden.',
      'Wij verkopen of verhuren geen persoonsgegevens, en gebruiken ze niet voor advertenties.',
      'Wij verstrekken gegevens alleen aan anderen als de wet ons daartoe verplicht.',
    ],
  },
  {
    nr: '6',
    titel: 'Buiten Europa',
    leden: [
      'Je gegevens staan opgeslagen binnen de EU, op servers in Frankfurt.',
      'Een deel van de verwerking loopt via partijen buiten de Europese Economische Ruimte. Dat betreft vooral de AI-functies: de inhoud die je door AI laat bewerken wordt daar verwerkt.',
      'Voor die doorgifte gelden de standaardcontractbepalingen van de Europese Commissie. Onze AI-leveranciers trainen niet op wat jij invoert.',
    ],
  },
  {
    nr: '7',
    titel: 'Beveiliging',
    leden: [
      'Verkeer met onze systemen gaat versleuteld. Gekoppelde inloggegevens en gevoelige documenten slaan wij versleuteld op. Toegang is gescheiden per organisatie op databaseniveau en verloopt op basis van rollen.',
      'Onze foutmonitoring filtert persoonsgegevens er vooraf uit.',
      'Ontdek je een kwetsbaarheid, meld die dan bij ons voordat je die met anderen deelt. Wij reageren binnen vijf werkdagen en verhalen niets op melders die zorgvuldig handelen.',
    ],
  },
  {
    nr: '8',
    titel: 'Jouw rechten',
    leden: [
      'Je mag opvragen welke gegevens wij van je hebben, ze laten corrigeren, laten verwijderen of de verwerking laten beperken. Je mag ook bezwaar maken, en je gegevens in een gangbaar bestandsformaat meekrijgen.',
      'Stel je verzoek via het contactformulier. Wij reageren binnen een maand. We kunnen vragen om je identiteit aan te tonen, zodat we niets aan de verkeerde persoon geven.',
      'Ben je het niet eens met hoe wij met je gegevens omgaan, dan mag je een klacht indienen bij de Autoriteit Persoonsgegevens.',
    ],
  },
  {
    nr: '9',
    titel: 'Wijzigingen',
    leden: [
      'Verandert er iets wezenlijks aan deze verklaring, dan laten wij dat weten via e-mail of een melding in de app.',
      'Deze versie is ' + PRIVACY_VERSIE + ', geldig vanaf ' + PRIVACY_DATUM + '.',
    ],
  },
]
