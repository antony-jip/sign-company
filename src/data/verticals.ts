// Eén bron voor de verticale landingspages onder /voor/[vertical]:
// gerenderd door VerticalContent en opgenomen in de sitemap.

export type Vertical = {
  slug: string
  naam: string
  seoTitle: string
  seoDescription: string
  h1Lead: string
  h1Accent: string
  intro: string
  pains: { title: string; body: string }[]
  highlights: { href: string; blurb: string }[]
}

export const verticals: Vertical[] = [
  {
    slug: 'signmakers',
    naam: 'Signmakers',
    seoTitle: 'Software voor signmakers | doen.',
    seoDescription:
      'Alles-in-één software voor signmakers: offertes, planning, werkbonnen, klantportaal en facturatie in één systeem. €79/maand, 30 dagen gratis.',
    h1Lead: 'Software voor signmakers',
    h1Accent: 'Van aanvraag tot montage',
    intro:
      'Gevelreclame, belettering, bewegwijzering: elk project loopt van offerte tot montage door je hele bedrijf heen. doen. houdt het bij elkaar: één systeem van eerste klantvraag tot betaalde factuur.',
    pains: [
      {
        title: 'Elke klus is anders',
        body: 'Een doek, een lichtbak, een gevel van acht meter. Standaardsoftware kent je producten niet, dus reken je elke offerte weer half opnieuw uit.',
      },
      {
        title: 'De status zit in je hoofd',
        body: 'Is de drukproef goedgekeurd? Is het materiaal binnen? Wie staat er woensdag op de bok? Drie vragen, drie systemen, nul overzicht.',
      },
      {
        title: 'Papier op de bok',
        body: 'Werkbonnen uitprinten, foto\'s op de telefoon van de monteur, uren nabellen op vrijdag. Alles komt dubbel terug op kantoor.',
      },
    ],
    highlights: [
      { href: '/features/offertes', blurb: 'Calculeer met je eigen producten en marges, verstuur binnen minuten en laat de klant digitaal akkoord geven.' },
      { href: '/features/portaal', blurb: 'Tekening, drukproef en offerte op één link. Je klant keurt goed zonder inlog.' },
      { href: '/features/planning', blurb: 'Sleep projecten naar een dag, de werkbon hangt eraan. Weerbericht erbij voor buitenmontages.' },
      { href: '/features/werkbonnen', blurb: 'Je monteur ziet zijn klus op zijn telefoon: uren, foto\'s, handtekening van de klant.' },
    ],
  },
  {
    slug: 'autobelettering',
    naam: 'Autobelettering & carwrapping',
    seoTitle: 'Software voor autobelettering en carwrapping | doen.',
    seoDescription:
      'Snelle klussen, strakke planning: offertes, drukproef-akkoord via het klantportaal, planning per bus en digitale werkbonnen met foto\'s. 30 dagen gratis.',
    h1Lead: 'Software voor autobelettering',
    h1Accent: 'en carwrapping',
    intro:
      'Veel klussen, korte doorlooptijden en een klant die zijn bus morgen terug wil. doen. houdt het tempo bij: offerte eruit, akkoord binnen, ingepland, gewrapt, gefactureerd.',
    pains: [
      {
        title: 'Tien kleine klussen per week',
        body: 'Elke wrap is een eigen offerte, eigen drukproef, eigen deadline. In een mailbox raakt dat kwijt; op een whiteboard wordt het vlekwerk.',
      },
      {
        title: 'Het akkoord komt per appje',
        body: '"Ja is goed" in WhatsApp. Maar op welke versie van het ontwerp? Bij discussie achteraf heb je niks om op terug te vallen.',
      },
      {
        title: 'Foto\'s overal en nergens',
        body: 'Voor- en na-foto\'s staan op de telefoon van je monteur. Bij een schadeclaim of een vervolgorder moet je erom vragen.',
      },
    ],
    highlights: [
      { href: '/features/offertes', blurb: 'Offerte voor een wrap of belettering in een paar klikken, uit je eigen templates.' },
      { href: '/features/portaal', blurb: 'Ontwerp en drukproef op één link; de klant tekent digitaal af op de juiste versie.' },
      { href: '/features/planning', blurb: 'Plan per dag en per bus; verschuif een klus en de werkbon schuift mee.' },
      { href: '/features/werkbonnen', blurb: 'Foto\'s van de oplevering direct in het project: bewijs bij schade, materiaal voor je portfolio.' },
    ],
  },
  {
    slug: 'grootformaat-print',
    naam: 'Grootformaat print',
    seoTitle: 'Software voor grootformaat print | doen.',
    seoDescription:
      'Offertes met m²-calculatie, inkoop, drukproef-akkoord via het klantportaal en facturatie in één systeem voor grootformaat printbedrijven.',
    h1Lead: 'Software voor',
    h1Accent: 'grootformaat print',
    intro:
      'Doeken, banieren, bouwhekzeil, raamfolie: de marge zit in de vierkante meter en in de doorloop. doen. rekent mee en bewaakt de deadline, van aanvraag tot oplevering.',
    pains: [
      {
        title: 'Marge per m² is giswerk',
        body: 'Materiaal, print, confectie, montage: als de calculatie in losse Excel-tabbladen leeft, weet je pas achteraf wat je verdiend hebt.',
      },
      {
        title: 'Drukproef-pingpong',
        body: 'Versie 3 per mail, versie 4 per WeTransfer. Eén verkeerd akkoord en je print de verkeerde file op vijftig meter doek.',
      },
      {
        title: 'Inkoop naast de order',
        body: 'Materiaal bestellen gebeurt buiten het systeem om. Komt de rol te laat binnen, dan hoor je het van de planning, niet van je software.',
      },
    ],
    highlights: [
      { href: '/features/offertes', blurb: 'Calculeer per m² met je eigen materialen en marges; de verkoopprijs rolt er automatisch uit.' },
      { href: '/features/portaal', blurb: 'De klant keurt de drukproef goed op de juiste versie, vastgelegd met tijdstempel.' },
      { href: '/features/facturen', blurb: 'Verkoop én inkoop in één systeem; Daan leest inkoopfacturen van je leveranciers uit.' },
      { href: '/features/planning', blurb: 'Productie en montage in één planning, met de werkbon eraan vast.' },
    ],
  },
  {
    slug: 'lichtreclame',
    naam: 'Lichtreclame',
    seoTitle: 'Software voor lichtreclamebedrijven | doen.',
    seoDescription:
      'Van tekening en akkoord tot montageplanning en servicedossier: projectsoftware voor lichtreclame. Klantportaal, werkbonnen en facturatie inbegrepen.',
    h1Lead: 'Software voor',
    h1Accent: 'lichtreclamebedrijven',
    intro:
      'Een lichtbak of doosletterset is geen dagklus: tekeningen, akkoorden, productie, montage op hoogte en service daarna. doen. houdt het hele traject in één project.',
    pains: [
      {
        title: 'Lange trajecten, veel versies',
        body: 'Tussen eerste schets en definitieve tekening zitten weken en vijf versies. Welke heeft de klant nou goedgekeurd?',
      },
      {
        title: 'Montage hangt van alles af',
        body: 'Hoogwerker geregeld, twee man ingepland. En dan slaat het weer om. Omplannen betekent bellen, schuiven en hopen dat niemand iets mist.',
      },
      {
        title: 'Service verdwijnt uit beeld',
        body: 'Twee jaar later valt de verlichting uit. Welke armaturen hangen daar ook alweer, en wat is er toen gemonteerd? Dat dossier is er niet.',
      },
    ],
    highlights: [
      { href: '/features/portaal', blurb: 'Tekeningen en revisies op één link; het akkoord staat vast op de juiste versie.' },
      { href: '/features/planning', blurb: 'Montage plannen met het weerbericht erbij; verschuif en de werkbon schuift mee.' },
      { href: '/features/werkbonnen', blurb: 'Foto\'s en gemonteerd materiaal vastgelegd per project. Je servicedossier bouwt zichzelf.' },
      { href: '/features/projecten', blurb: 'Alles van schets tot service in één projectlog. Niks valt tussen wal en schip.' },
    ],
  },
]

export function getVerticalBySlug(slug: string): Vertical | undefined {
  return verticals.find((v) => v.slug === slug)
}
