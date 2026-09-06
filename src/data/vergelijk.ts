/* De vergelijking op /vergelijk: doen. naast Gripp en James Pro.

   Elke cel is op 5 september 2026 nagekeken in beide pakketten, door ze
   helemaal door te klikken. Dat is de peildatum die onder de pagina staat.
   Verandert er iets bij hen, dan hoort de cel hier mee te veranderen,
   niet in de component. Schrijf niets op wat je niet zelf gezien hebt.

   Een cel heeft een stand en soms een korte noot. De noot verklaart de
   stand ("ladder bestaat, verzenden staat uit"), zodat de lezer kan
   controleren of we eerlijk zijn. Houd de noot onder de tien woorden, hij
   moet op 375px in een kolom van ruim 100px passen. */

export type Stand = 'ja' | 'nee' | 'deels' | 'nvt'

export type Cel = { stand: Stand; noot?: string }

export type Rij = { label: string; doen: Cel; gripp: Cel; james: Cel }

export type Groep = { titel: string; rijen: Rij[] }

const ja: Cel = { stand: 'ja' }
const nee = (noot?: string): Cel => ({ stand: 'nee', noot })
const deels = (noot?: string): Cel => ({ stand: 'deels', noot })
const nvt = (noot: string): Cel => ({ stand: 'nvt', noot })

export const PAKKETTEN = ['doen.', 'Gripp', 'James Pro'] as const

export const PEILDATUM = 'september 2026'

export const groepen: Groep[] = [
  {
    titel: 'Offerte en calculatie',
    rijen: [
      {
        label: 'Breedte x hoogte in mm, m² rekent zichzelf',
        doen: ja,
        gripp: nee('m² is alleen een eenheid, de plaatmaat staat in de productnaam'),
        james: nee('de offerte is een tekstdocument, de prijs wordt getypt'),
      },
      { label: 'Foto bij de regel en visualisatie op de gevel', doen: ja, gripp: nee(), james: nee() },
      { label: 'Maatjes: gevelfoto met maten vanaf de telefoon', doen: ja, gripp: nee(), james: nee() },
      { label: 'Digitaal akkoord met handtekening', doen: ja, gripp: ja, james: ja },
      { label: 'Offerte laten checken door een collega', doen: ja, gripp: nee(), james: nee() },
      {
        label: 'Urenbudget per bewerking met voortgang',
        doen: ja,
        gripp: ja,
        james: deels('gepland en gebruikt op een taak'),
      },
    ],
  },
  {
    titel: 'Buitendienst',
    rijen: [
      {
        label: 'Werkbon met klanthandtekening op locatie',
        doen: ja,
        gripp: nee(),
        james: nee('taak afvinken met foto'),
      },
      { label: "Foto's vanaf de gevel op de bon", doen: ja, gripp: nee(), james: nee() },
      { label: 'Weer op het montagebord', doen: ja, gripp: nee(), james: ja },
      { label: 'Uren van de bon tellen meteen mee', doen: ja, gripp: nee(), james: deels() },
    ],
  },
  {
    titel: 'Geld',
    rijen: [
      {
        label: 'Herinneringen en aanmaningen gaan vanzelf',
        doen: ja,
        gripp: deels('ladder bestaat, verzenden staat uit: elke aanmaning is een klik per factuur'),
        james: nee(),
      },
      {
        label: 'iDEAL-link in factuur en herinnering',
        doen: ja,
        gripp: nee(),
        james: deels('Mollie-link handmatig'),
      },
      {
        label: 'Betaalstand komt terug uit Exact',
        doen: ja,
        gripp: nvt('eigen boekhouding in het pakket'),
        james: nee('export in één richting'),
      },
      {
        label: 'Inkoopfacturen automatisch uitgelezen, inbegrepen',
        doen: ja,
        gripp: deels('Scan en Herken, € 0,37 per document extra'),
        james: nee(),
      },
      { label: 'Deelfactuur met aanbetaling verrekend', doen: ja, gripp: ja, james: nee() },
    ],
  },
  {
    titel: 'Communicatie',
    rijen: [
      {
        label: 'Mailbox in de app, mail aan project gekoppeld',
        doen: ja,
        gripp: nee('BCC-adres naar een tijdlijn'),
        james: nee('alleen uitgaand'),
      },
      {
        label: 'Drukproef goedkeuren in het klantportaal',
        doen: ja,
        gripp: nee('drukproef is een taak'),
        james: nee(),
      },
      { label: 'Chatwidget en aanvragen van de website in de app', doen: ja, gripp: nee(), james: nee() },
      {
        label: 'Nieuwsbrief met segmenten',
        doen: ja,
        gripp: deels('via koppeling, MailChimp of Laposta'),
        james: nee(),
      },
    ],
  },
  {
    titel: 'Slim',
    rijen: [
      {
        label: "AI-assistent met geheugen die 's nachts doorwerkt",
        doen: ja,
        gripp: nee('alleen een support-chatbot'),
        james: nee('AI-briefing in ontwikkeling'),
      },
      { label: 'Binnenkomende mail herkend als werkaanvraag', doen: ja, gripp: nee(), james: nee() },
      { label: 'Herhaalde montage inplannen', doen: ja, gripp: ja, james: ja },
      { label: 'Weekstaat met uren goedkeuren', doen: ja, gripp: ja, james: nee() },
      { label: 'Bezetting per medewerker per week', doen: ja, gripp: ja, james: deels('uren te plannen per dag') },
      { label: 'Collega noemen met @ in een notitie', doen: ja, gripp: ja, james: nee() },
    ],
  },
]

/* Waar zij verder zijn. Drie punten per pakket, niet meer: dit staat er
   om de rest geloofwaardig te maken, niet om hen te verkopen. */
export const verderIn: { pakket: string; punten: string[] }[] = [
  {
    pakket: 'Gripp',
    punten: [
      '33 rapporten en draaitabellen',
      'Uren fiatteren per week',
      'Capaciteit per medewerker (bij doen. in aanbouw)',
    ],
  },
  {
    pakket: 'James Pro',
    punten: [
      'Probo, Signnovation en Print.com als wizard in de offerte',
      'Veertien boekhoudkoppelingen',
      'Rechten per gebruiker in vier niveaus',
    ],
  },
]

/* Tarieven van de andere twee, uitgelezen op de peildatum. De doen.-prijs
   komt uit pricing.ts, de James Pro-staffel ook (PER_SEAT_*), want die
   rekent de prijzenpagina al mee. Gripp staat alleen hier. */
export const GRIPP_VANAF = 162
export const GRIPP_VANAF_GEBRUIKERS = 3
export const GRIPP_EXTRA_MIN = 19
export const GRIPP_EXTRA_MAX = 30

export const BRONNEN = [
  { label: 'exact.com/nl/producten/exact-gripp/features-en-prijzen', href: 'https://www.exact.com/nl/producten/exact-gripp/features-en-prijzen' },
  { label: 'jamespro.nl/tarieven', href: 'https://www.jamespro.nl/tarieven' },
]
