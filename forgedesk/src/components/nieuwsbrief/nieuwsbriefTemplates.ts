import { type Blok, type BlokType, type NieuwsbriefDocument, maakBlok, nieuwId, STANDAARD_STIJL, leegDocument } from './nieuwsbriefBlokken'

export interface NieuwsbriefTemplate {
  key: string
  naam: string
  omschrijving: string
  voorOnderwerp: string
  voorPreheader: string
  maak: () => NieuwsbriefDocument
}

function b<T extends BlokType>(type: T, velden: Partial<Extract<Blok, { type: T }>> = {}): Blok {
  return { ...maakBlok(type), ...velden, id: nieuwId() } as Blok
}

const FOOTER = () => b('footer', { bedrijfsnaam: 'Antony · Sign Company', website: 'https://signcompany.nl', adres: 'Sinds 1983 vakwerk in signing' })

export const NIEUWSBRIEF_TEMPLATES: NieuwsbriefTemplate[] = [
  {
    key: 'blanco',
    naam: 'Blanco',
    omschrijving: 'Alleen een kopregel en afsluiting. Bouw de rest zelf op.',
    voorOnderwerp: '',
    voorPreheader: '',
    maak: () => ({
      ...leegDocument(),
      blokken: [b('header'), b('kop', { tekst: 'Je kop komt hier' }), b('tekst', { html: '<p>Beste {{{contact.first_name|relatie}}},</p><p>Schrijf hier je bericht.</p>' }), FOOTER()],
    }),
  },
  {
    key: 'nieuwsupdate',
    naam: 'Nieuwsupdate',
    omschrijving: 'Openingsverhaal, twee korte onderwerpen en een knop. Voor je maandelijkse update.',
    voorOnderwerp: 'Nieuws van Sign Company',
    voorPreheader: 'Wat we deze maand maakten, en wat eraan komt',
    maak: () => ({
      ...leegDocument(),
      blokken: [
        b('header', { tagline: 'Nieuwsbrief' }),
        b('kop', { tekst: 'Dit maakten we deze maand' }),
        b('tekst', { html: '<p>Beste {{{contact.first_name|relatie}}},</p><p>Een greep uit wat er de afgelopen weken bij ons van de werkvloer rolde, plus een vooruitblik op wat eraan komt. Veel leesplezier.</p>' }),
        b('afbeelding', { alt: 'Project van de maand', bijschrift: 'Het project van de maand' }),
        b('kolommen', {
          kolommen: [
            { kop: 'Gevelreclame', html: '<p>Nieuwe LED-letters voor een winkelpand in het centrum. Strak, zuinig en goed zichtbaar.</p>', url: '', knopTekst: 'Bekijk', knopUrl: 'https://signcompany.nl' },
            { kop: 'Autobelettering', html: '<p>Een complete bedrijfswagenvloot in nieuwe huisstijl. Binnen één week gereed.</p>', url: '', knopTekst: 'Bekijk', knopUrl: 'https://signcompany.nl' },
          ],
        }),
        b('lijn'),
        b('kop', { tekst: 'Wat eraan komt', niveau: 2 }),
        b('tekst', { html: '<p>Volgende maand openen we de nieuwe productieruimte. Daarover binnenkort meer.</p>' }),
        b('knop', { tekst: 'Bekijk ons werk', url: 'https://signcompany.nl' }),
        FOOTER(),
      ],
    }),
  },
  {
    key: 'spotlight',
    naam: 'Project in de spotlight',
    omschrijving: 'Eén project groot in beeld, met verhaal, klantquote en uitnodiging.',
    voorOnderwerp: 'Kijk eens wat we hier maakten',
    voorPreheader: 'Eén project uitgelicht, van schets tot montage',
    maak: () => ({
      ...leegDocument(),
      blokken: [
        b('header'),
        b('kop', { tekst: 'Van schets tot gevel in drie weken' }),
        b('tekst', { html: '<p>Beste {{{contact.first_name|relatie}}},</p><p>Soms loopt een project zo lekker dat we het graag laten zien. Dit is er zo een.</p>' }),
        b('afbeelding', { alt: 'Het eindresultaat' }),
        b('kop', { tekst: 'De vraag', niveau: 2 }),
        b('tekst', { html: '<p>De klant wilde een gevel die overdag én ’s avonds klopt. Geen schreeuwerige lichtbak, wel aanwezig.</p>' }),
        b('afbeelding_tekst', { kop: 'De oplossing', html: '<p>Doosletters met achterverlichting in de huisstijlkleur, gemonteerd op een afstandsframe. Het licht valt zacht op de gevel.</p>', positie: 'rechts' }),
        b('quote', { tekst: 'Precies wat we voor ogen hadden. De montage was in één ochtend klaar.', bron: 'Eigenaar van het pand' }),
        b('highlight', { kop: 'Ook zoiets voor jouw pand?', html: '<p>Stuur ons een foto van je gevel. Je krijgt binnen twee werkdagen een eerste schets en prijsindicatie.</p>', variant: 'zacht', knopTekst: 'Stuur een foto', knopUrl: 'mailto:antony@signcompany.nl' }),
        FOOTER(),
      ],
    }),
  },
  {
    key: 'actie',
    naam: 'Actie of aanbieding',
    omschrijving: 'Opvallend gekleurd vlak met de aanbieding bovenaan, voorwaarden eronder.',
    voorOnderwerp: 'Deze maand: scherpe prijs op autobelettering',
    voorPreheader: 'Alleen in september, voor bestaande relaties',
    maak: () => ({
      ...leegDocument(),
      blokken: [
        b('header'),
        b('highlight', { kop: 'Deze maand: 15% op autobelettering', html: '<p>Laat je bedrijfswagen beletteren vóór 30 september en ontvang 15% korting op het hele traject, van ontwerp tot montage.</p>', variant: 'accent', knopTekst: 'Plan een afspraak', knopUrl: 'https://signcompany.nl/contact' }),
        b('tekst', { html: '<p>Beste {{{contact.first_name|relatie}}},</p><p>Rijdende reclame werkt elke dag, ook als je zelf niet aan het werk bent. Daarom geven we bestaande relaties deze maand een extra duwtje.</p>' }),
        b('afbeelding', { alt: 'Beletterde bedrijfswagen' }),
        b('kop', { tekst: 'Zo werkt het', niveau: 2 }),
        b('tekst', { html: '<ul><li>Je stuurt een foto van de wagen en je logo</li><li>Wij maken binnen drie werkdagen een ontwerp op schaal</li><li>Montage bij ons in de werkplaats, in één dag klaar</li></ul>' }),
        b('knop', { tekst: 'Vraag je offerte aan', url: 'https://signcompany.nl/contact', breedte: 'vol', uitlijning: 'midden' }),
        b('tekst', { html: '<p>De actie geldt voor opdrachten die vóór 30 september zijn bevestigd. Niet geldig in combinatie met andere afspraken.</p>', grootte: 'klein' }),
        FOOTER(),
      ],
    }),
  },
  {
    key: 'persoonlijk',
    naam: 'Persoonlijke brief',
    omschrijving: 'Geen opsmuk, gewoon een goed geschreven brief met één knop. Leest als een mail van jou.',
    voorOnderwerp: 'Even bijpraten',
    voorPreheader: 'Een korte update van Antony',
    maak: () => ({
      ...leegDocument(),
      stijl: { ...STANDAARD_STIJL, font: "Georgia,'Times New Roman',serif" },
      blokken: [
        b('kop', { tekst: 'Even bijpraten', niveau: 2 }),
        b('tekst', { html: '<p>Beste {{{contact.first_name|relatie}}},</p><p>Het is een tijdje stil geweest van onze kant, dus een korte update over waar we mee bezig zijn.</p><p>Het afgelopen half jaar hebben we flink geïnvesteerd in de werkplaats. Nieuwe freesmachine, nieuwe printer, en vooral: meer ruimte om grote projecten in één keer op te bouwen voordat ze de deur uitgaan. Dat scheelt verrassingen op de montagedag.</p><p>Heb je iets liggen waar we naar moeten kijken? Reageer gewoon op deze mail, dan bel ik je.</p>', grootte: 'groot' }),
        b('knop', { tekst: 'Reageer op deze mail', url: 'mailto:antony@signcompany.nl', stijl: 'omlijnd' }),
        b('ruimte', { hoogte: 8 }),
        FOOTER(),
      ],
    }),
  },
  {
    key: 'seizoen',
    naam: 'Seizoensgroet',
    omschrijving: 'Feestdagen, zomerstop of jaarafsluiting. Een warm bericht met openingstijden.',
    voorOnderwerp: 'Fijne feestdagen van Sign Company',
    voorPreheader: 'Bedankt voor het vertrouwen, en onze openingstijden',
    maak: () => ({
      ...leegDocument(),
      blokken: [
        b('header', { uitlijning: 'midden' }),
        b('afbeelding', { alt: 'Seizoensgroet' }),
        b('kop', { tekst: 'Bedankt voor een mooi jaar', uitlijning: 'midden' }),
        b('tekst', { html: '<p>Beste {{{contact.first_name|relatie}}},</p><p>Het was een jaar vol mooie projecten, en dat hadden we niet zonder jou gedaan. Bedankt voor het vertrouwen en de prettige samenwerking.</p>', uitlijning: 'midden' }),
        b('highlight', { kop: 'Openingstijden rond de feestdagen', html: '<p>24 december tot en met 1 januari zijn we gesloten. Vanaf 2 januari staan we weer voor je klaar. Spoed? Mail gerust, we lezen mee.</p>', variant: 'donker' }),
        b('tekst', { html: '<p>Fijne dagen en een goed nieuw jaar gewenst.</p>', uitlijning: 'midden' }),
        FOOTER(),
      ],
    }),
  },
]

export function vindTemplate(key: string | null | undefined): NieuwsbriefTemplate | undefined {
  return NIEUWSBRIEF_TEMPLATES.find(t => t.key === key)
}
