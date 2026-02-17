// ============================================================================
// Demo Email Data for Workmate - Sign Company
// ============================================================================

import type { Email, Klant } from '@/types'

// ============================================================================
// Contact / CRM info for sidebar
// ============================================================================

export interface EmailContact {
  name: string
  email: string
  company?: string
  phone?: string
  isCustomer: boolean
  subscribedNewsletter: boolean
  tags: string[]
  deals?: { name: string; value: string; status: 'open' | 'won' | 'lost' | 'pending' }[]
  activities?: { type: 'email' | 'call' | 'meeting'; description: string; date: string }[]
  notes?: string
  addedDate?: string
}

export const demoContacts: EmailContact[] = [
  {
    name: 'Jan de Boer',
    email: 'jan@bakkerijdeboer.nl',
    company: 'Bakkerij De Boer',
    phone: '+31 6 12345678',
    isCustomer: true,
    subscribedNewsletter: true,
    tags: ['klant', 'gevelreclame', 'enkhuizen'],
    deals: [
      { name: 'Gevelreclame nieuw pand', value: '€ 4.850', status: 'won' },
      { name: 'Raamstickers actie', value: '€ 380', status: 'open' },
    ],
    activities: [
      { type: 'email', description: 'Offerte raamstickers verstuurd', date: '2026-02-15' },
      { type: 'call', description: 'Nabellen montage gevelreclame', date: '2026-02-10' },
      { type: 'meeting', description: 'Oplevering gevelreclame', date: '2026-01-28' },
    ],
    notes: 'Vaste klant sinds 2019. Altijd tevreden. Verwijst regelmatig nieuwe klanten door.',
    addedDate: '2019-03-15',
  },
  {
    name: 'Lisa van Dijk',
    email: 'lisa@hotelwestfriesland.nl',
    company: 'Hotel West-Friesland',
    phone: '+31 6 98765432',
    isCustomer: false,
    subscribedNewsletter: false,
    tags: ['prospect', 'hotel', 'hoorn'],
    deals: [
      { name: 'Totale signing hotel', value: '€ 12.500', status: 'pending' },
    ],
    activities: [
      { type: 'email', description: 'Eerste contact - interesse signing', date: '2026-02-16' },
    ],
    addedDate: '2026-02-16',
  },
  {
    name: 'Peter van Dalen',
    email: 'peter@vandalenbv.nl',
    company: 'Van Dalen Bouw BV',
    phone: '+31 228 567890',
    isCustomer: true,
    subscribedNewsletter: true,
    tags: ['klant', 'bouw', 'borden', 'medemblik'],
    deals: [
      { name: 'Bouwborden project Medemblik', value: '€ 2.200', status: 'open' },
      { name: 'Bedrijfswagen belettering', value: '€ 1.650', status: 'won' },
    ],
    activities: [
      { type: 'email', description: 'Planning montage bouwborden', date: '2026-02-14' },
      { type: 'meeting', description: 'Bespreking nieuw project', date: '2026-02-05' },
    ],
    notes: 'Bouwbedrijf, regelmatig bouwborden nodig. Korting afgesproken bij >5 borden.',
    addedDate: '2021-06-10',
  },
  {
    name: 'Mohammed El Amrani',
    email: 'info@taxihoorn.nl',
    company: 'Taxi Hoorn',
    phone: '+31 6 55443322',
    isCustomer: false,
    subscribedNewsletter: false,
    tags: ['prospect', 'carwrapping', 'hoorn'],
    activities: [
      { type: 'email', description: 'Vraag over carwrapping vloot', date: '2026-02-13' },
    ],
  },
  {
    name: 'Sandra Visser',
    email: 'sandra@supermarktplus.nl',
    company: 'Supermarkt Plus Enkhuizen',
    phone: '+31 228 334455',
    isCustomer: true,
    subscribedNewsletter: true,
    tags: ['klant', 'lichtreclame', 'gevelreclame', 'enkhuizen'],
    deals: [
      { name: 'Lichtreclame vernieuwing', value: '€ 8.900', status: 'won' },
      { name: 'Seizoensstickers ramen', value: '€ 450', status: 'won' },
    ],
    activities: [
      { type: 'email', description: 'Offerte lichtreclame goedgekeurd', date: '2026-02-12' },
      { type: 'call', description: 'Besproken planning montage', date: '2026-02-08' },
    ],
    notes: 'Grote klant. Lichtreclame moet voor 1 maart klaar zijn ivm heropening.',
    addedDate: '2023-09-01',
  },
  {
    name: 'Kees Jansen',
    email: 'k.jansen@gmail.com',
    phone: '+31 6 77889900',
    isCustomer: false,
    subscribedNewsletter: false,
    tags: ['particulier', 'klacht'],
    activities: [
      { type: 'email', description: 'Klacht over bootbelettering', date: '2026-02-11' },
    ],
  },
  {
    name: 'Marieke Bakker',
    email: 'm.bakker@cafetdorphuis.nl',
    company: "Café 't Dorphuis",
    phone: '+31 6 11223344',
    isCustomer: false,
    subscribedNewsletter: false,
    tags: ['prospect', 'lichtreclame', 'schagen'],
    deals: [
      { name: 'Lichtreclame café', value: '€ 3.200', status: 'pending' },
    ],
    activities: [
      { type: 'email', description: 'Offerte aanvraag lichtreclame', date: '2026-02-10' },
    ],
  },
  {
    name: 'Tom de Vries',
    email: 'tom@reclameland.nl',
    company: 'ReclameLand BV',
    phone: '+31 20 1234567',
    isCustomer: false,
    subscribedNewsletter: false,
    tags: ['partner', 'samenwerking'],
    activities: [
      { type: 'email', description: 'Samenwerkingsvoorstel ontvangen', date: '2026-02-09' },
    ],
  },
  {
    name: 'Henk Smit',
    email: 'orders@3msignmaterials.nl',
    company: '3M Sign Materials',
    phone: '+31 30 9876543',
    isCustomer: false,
    subscribedNewsletter: false,
    tags: ['leverancier', 'materialen'],
    activities: [
      { type: 'email', description: 'Bestelling materialen update', date: '2026-02-14' },
    ],
    notes: 'Hoofdleverancier folie en printmaterialen. Contactpersoon: Henk Smit.',
  },
  {
    name: 'Gemeente Enkhuizen',
    email: 'vergunningen@enkhuizen.nl',
    company: 'Gemeente Enkhuizen',
    phone: '+31 228 123000',
    isCustomer: false,
    subscribedNewsletter: false,
    tags: ['overheid', 'vergunningen'],
    activities: [
      { type: 'email', description: 'Vergunning lichtreclame goedgekeurd', date: '2026-02-07' },
    ],
  },
]

// ============================================================================
// Demo Emails (using existing Email type format)
// ============================================================================

const now = new Date()
function daysAgo(days: number, hour = 12, minute = 0): string {
  const d = new Date(now)
  d.setDate(d.getDate() - days)
  d.setHours(hour, minute, 0, 0)
  return d.toISOString()
}

export const demoEmails: Email[] = [
  // --- INBOX ---
  {
    id: 'demo-e1',
    user_id: 'demo',
    gmail_id: '',
    van: 'Lisa van Dijk <lisa@hotelwestfriesland.nl>',
    aan: 'info@signcompany.nl',
    onderwerp: 'Interesse in totale signing voor ons hotel',
    inhoud: `Goedemiddag,

Wij zijn bezig met een grote renovatie van Hotel West-Friesland en zijn op zoek naar een partij die de volledige signing voor ons hotel kan verzorgen. Het gaat om:

• Nieuwe gevelreclame (lichtreclame, ca. 4 meter breed)
• Bewegwijzering binnen het hotel (40+ kamers, restaurant, spa)
• Parkeerplaats borden en routeborden
• Raamstickers voor het restaurant

Wij willen graag een afspraak maken om de mogelijkheden te bespreken. Kunt u volgende week langskomen voor een vrijblijvende inventarisatie?

Met vriendelijke groet,
Lisa van Dijk
Hotel Manager
Hotel West-Friesland
Roode Steen 15, Hoorn
T: +31 6 98765432`,
    datum: daysAgo(0, 14, 32),
    gelezen: false,
    starred: true,
    labels: ['offerte'],
    bijlagen: 0,
    map: 'inbox',
    created_at: daysAgo(0, 14, 32),
  },
  {
    id: 'demo-e2',
    user_id: 'demo',
    gmail_id: '',
    van: 'Jan de Boer <jan@bakkerijdeboer.nl>',
    aan: 'info@signcompany.nl',
    onderwerp: 'Re: Offerte raamstickers voorjaarsactie',
    inhoud: `Hoi,

De offerte ziet er goed uit! Ik heb alleen nog een vraag over de levertijd. Kunnen de stickers voor 1 maart geleverd en geplaatst worden? We starten dan met onze voorjaarsactie.

Ook vroeg ik me af of het mogelijk is om de stickers seizoensgebonden te maken, zodat we ze makkelijk kunnen wisselen voor de zomeractie.

Alvast bedankt!

Groet,
Jan de Boer
Bakkerij De Boer`,
    datum: daysAgo(0, 11, 15),
    gelezen: false,
    starred: false,
    labels: ['offerte', 'klant'],
    bijlagen: 0,
    map: 'inbox',
    created_at: daysAgo(0, 11, 15),
  },
  {
    id: 'demo-e3',
    user_id: 'demo',
    gmail_id: '',
    van: '3M Sign Materials <orders@3msignmaterials.nl>',
    aan: 'info@signcompany.nl',
    onderwerp: 'Bestelling #SM-2026-4492 verzonden',
    inhoud: `Geachte klant,

Uw bestelling #SM-2026-4492 is vandaag verzonden.

Bestelgegevens:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• 3M IJ180Cv3 Print Folie - 25m rol x 3    € 892,50
• 3M 8548G Laminaat Folie - 25m rol x 3    € 637,50
• 3M VHB Tape 4941 - 10 rollen              € 189,00
• Avery Dennison MPI 1105 - 50m rol x 1    € 425,00
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Subtotaal:    € 2.144,00
BTW 21%:      € 450,24
Totaal:       € 2.594,24

Verwachte levering: woensdag 18 februari 2026
Track & Trace: 3SPOST2026449200

Met vriendelijke groet,
3M Sign Materials
Klantenservice: +31 30 9876543`,
    datum: daysAgo(1, 16, 45),
    gelezen: true,
    starred: false,
    labels: ['leverancier'],
    bijlagen: 2,
    map: 'inbox',
    created_at: daysAgo(1, 16, 45),
  },
  {
    id: 'demo-e4',
    user_id: 'demo',
    gmail_id: '',
    van: 'Peter van Dalen <peter@vandalenbv.nl>',
    aan: 'info@signcompany.nl',
    onderwerp: 'Planning montage bouwborden project Medemblik',
    inhoud: `Hi,

Kunnen we de bouwborden volgende week woensdag plaatsen? Het terrein is dan bouwrijp en de hekken staan er al omheen.

Het gaat om de 3 borden zoals besproken:
- 1x groot informatiebord (3x2m) bij de hoofdingang
- 2x projectbord (2x1.5m) aan de Nieuwstraat kant

Ik kan 's ochtends om 8:00 aanwezig zijn om jullie toegang te geven tot het terrein.

Laat maar weten of woensdag schikt!

Groet,
Peter van Dalen
Van Dalen Bouw BV
T: +31 228 567890`,
    datum: daysAgo(2, 9, 22),
    gelezen: false,
    starred: false,
    labels: ['project', 'klant'],
    bijlagen: 0,
    map: 'inbox',
    created_at: daysAgo(2, 9, 22),
  },
  {
    id: 'demo-e5',
    user_id: 'demo',
    gmail_id: '',
    van: 'Mohammed El Amrani <info@taxihoorn.nl>',
    aan: 'info@signcompany.nl',
    onderwerp: "Offerte carwrapping taxivloot (6 auto's)",
    inhoud: `Geachte heer/mevrouw,

Wij hebben een vloot van 6 taxi's (Tesla Model 3) en willen deze graag laten voorzien van een professionele carwrap in onze huisstijl.

Het gaat om:
- Full wrap in donkerblauw metallic
- Logo's en telefoonnummer op beide zijkanten
- Website URL op de achterkant
- Eventueel de dakreclame unit wrappen

Graag ontvangen wij een offerte voor het wrappen van alle 6 auto's. Is er korting mogelijk bij een grotere opdracht?

Bijgevoegd vindt u ons logo en huisstijl handboek.

Met vriendelijke groet,
Mohammed El Amrani
Eigenaar Taxi Hoorn
T: +31 6 55443322`,
    datum: daysAgo(3, 15, 8),
    gelezen: true,
    starred: true,
    labels: ['offerte'],
    bijlagen: 2,
    map: 'inbox',
    created_at: daysAgo(3, 15, 8),
  },
  {
    id: 'demo-e6',
    user_id: 'demo',
    gmail_id: '',
    van: 'Sandra Visser <sandra@supermarktplus.nl>',
    aan: 'info@signcompany.nl',
    onderwerp: 'Re: Offerte lichtreclame - AKKOORD',
    inhoud: `Hallo,

Goed nieuws! Het bestuur heeft de offerte goedgekeurd. We gaan graag met jullie in zee voor de vernieuwing van onze lichtreclame.

De offerte van € 8.900,- excl. BTW voor:
✅ Demontage oude lichtreclame
✅ Nieuwe LED lichtreclame 6 meter breed
✅ Inclusief montage en aansluiting
✅ 5 jaar garantie op LED modules

Wanneer kunnen jullie starten? Zoals besproken willen we graag klaar zijn voor 1 maart in verband met onze heropening na de verbouwing.

Graag hoor ik van jullie over de planning.

Met vriendelijke groet,
Sandra Visser
Bedrijfsleider
Supermarkt Plus Enkhuizen`,
    datum: daysAgo(4, 10, 30),
    gelezen: true,
    starred: true,
    labels: ['offerte', 'klant'],
    bijlagen: 0,
    map: 'inbox',
    created_at: daysAgo(4, 10, 30),
  },
  {
    id: 'demo-e7',
    user_id: 'demo',
    gmail_id: '',
    van: 'Kees Jansen <k.jansen@gmail.com>',
    aan: 'info@signcompany.nl',
    onderwerp: 'Klacht bootbelettering - letters laten los',
    inhoud: `Geachte Sign Company,

Twee weken geleden heeft u belettering aangebracht op mijn boot (Bayliner VR5, "Zeemeermin"). Helaas moet ik constateren dat er al 3 letters los zitten aan de bakboord kant.

Dit is niet wat ik verwacht had gezien de prijs die ik hiervoor betaald heb (€ 750,-). Ik verzoek u dit zo spoedig mogelijk te herstellen, uiteraard op uw kosten.

Mijn boot ligt in de jachthaven van Enkhuizen, steiger 7, plek 23.

Graag hoor ik wanneer u dit kunt oplossen. Bij voorkeur deze week nog, want ik wil komend weekend het water op.

Met vriendelijke groet,
Kees Jansen
T: +31 6 77889900`,
    datum: daysAgo(5, 13, 45),
    gelezen: true,
    starred: false,
    labels: ['klant'],
    bijlagen: 2,
    map: 'inbox',
    created_at: daysAgo(5, 13, 45),
  },
  {
    id: 'demo-e8',
    user_id: 'demo',
    gmail_id: '',
    van: 'Marieke Bakker <m.bakker@cafetdorphuis.nl>',
    aan: 'info@signcompany.nl',
    onderwerp: 'Offerte aanvraag uithangbord en lichtreclame',
    inhoud: `Beste Sign Company,

Wij zijn een nieuw café in Schagen en zoeken een mooi uithangbord en lichtreclame voor ons pand. We hebben jullie werk gezien bij een paar andere horeca zaken in de buurt en dat sprak ons erg aan.

Wat we in gedachten hebben:
- Een klassiek uithangbord (dubbelzijdig, aan gevel)
- Lichtreclame boven de voordeur met onze naam
- Eventueel raamstickers met openingstijden

Ons budget is ongeveer € 3.000 - € 3.500. Is dat realistisch?

Wanneer kunnen we een afspraak maken om het te bespreken?

Groetjes,
Marieke Bakker
Café 't Dorphuis
Gedempte Gracht 42, Schagen`,
    datum: daysAgo(6, 8, 55),
    gelezen: false,
    starred: false,
    labels: ['offerte'],
    bijlagen: 0,
    map: 'inbox',
    created_at: daysAgo(6, 8, 55),
  },
  {
    id: 'demo-e9',
    user_id: 'demo',
    gmail_id: '',
    van: 'Tom de Vries <tom@reclameland.nl>',
    aan: 'info@signcompany.nl',
    onderwerp: 'Samenwerkingsvoorstel grootformaat print',
    inhoud: `Geachte directie,

ReclameLand BV is gespecialiseerd in grootformaat digitaal printen en wij zijn op zoek naar partners in de regio Noord-Holland voor het uitbesteden van montagewerk.

Wij ontvangen regelmatig opdrachten voor signing en belettering in uw regio maar beschikken niet over een eigen montageteam in Noord-Holland.

Zouden jullie interesse hebben in een samenwerking waarbij:
1. Wij de productie en print verzorgen
2. Jullie de montage in Noord-Holland uitvoeren
3. Eventueel vice versa voor onze regio (Randstad)

Bij interesse plan ik graag een kennismakingsgesprek. We kunnen dit zowel op jullie locatie als bij ons in Amsterdam.

Met vriendelijke groet,
Tom de Vries
Commercieel Directeur
ReclameLand BV
Amstelveenseweg 100, Amsterdam`,
    datum: daysAgo(7, 11, 20),
    gelezen: true,
    starred: false,
    labels: [],
    bijlagen: 1,
    map: 'inbox',
    created_at: daysAgo(7, 11, 20),
  },
  {
    id: 'demo-e10',
    user_id: 'demo',
    gmail_id: '',
    van: 'Gemeente Enkhuizen <vergunningen@enkhuizen.nl>',
    aan: 'info@signcompany.nl',
    onderwerp: 'Vergunning lichtreclame Supermarkt Plus - GOEDGEKEURD',
    inhoud: `Geachte heer/mevrouw,

Betreft: Aanvraag omgevingsvergunning lichtreclame
Locatie: Westerstraat 88, Enkhuizen
Aanvrager: Sign Company namens Supermarkt Plus Enkhuizen
Zaaknummer: OV-2026-0234

Hierbij delen wij u mede dat uw aanvraag voor een omgevingsvergunning voor het plaatsen van lichtreclame op bovengenoemd adres is GOEDGEKEURD.

Voorwaarden:
1. De lichtreclame mag niet feller zijn dan 800 cd/m²
2. Dimmen tussen 23:00 en 07:00 uur tot max. 200 cd/m²
3. De afmetingen mogen niet afwijken van de ingediende tekening
4. Montage conform de bouwtechnische eisen

De vergunning is bijgevoegd als PDF. De bezwaartermijn is 6 weken.

Met vriendelijke groet,
Afdeling Vergunningen
Gemeente Enkhuizen`,
    datum: daysAgo(9, 14, 0),
    gelezen: true,
    starred: true,
    labels: [],
    bijlagen: 1,
    map: 'inbox',
    created_at: daysAgo(9, 14, 0),
  },
  {
    id: 'demo-e20',
    user_id: 'demo',
    gmail_id: '',
    van: 'Anna Mol <anna.mol@gmail.com>',
    aan: 'info@signcompany.nl',
    onderwerp: 'Naambordje voordeur',
    inhoud: `Hallo,

Ik ben op zoek naar een mooi naambordje voor bij onze voordeur. Iets in rvs of aluminium met onze achternaam "Mol-Dijkstra" erop.

Formaat: ongeveer 20x10cm
Materiaal: RVS of geborsteld aluminium
Bevestiging: schroeven of dubbelzijdig tape

Kunnen jullie zoiets maken? En wat kost dat ongeveer?

Groetjes,
Anna Mol`,
    datum: daysAgo(0, 9, 0),
    gelezen: false,
    starred: false,
    labels: ['offerte'],
    bijlagen: 0,
    map: 'inbox',
    created_at: daysAgo(0, 9, 0),
  },
  {
    id: 'demo-e21',
    user_id: 'demo',
    gmail_id: '',
    van: 'Henk Smit <h.smit@drukkerijnoord.nl>',
    aan: 'info@signcompany.nl',
    onderwerp: 'Nieuwe tarieven 2026 en uitbreiding assortiment',
    inhoud: `Beste relatie,

Hierbij sturen wij u onze nieuwe tarieflijst voor 2026. Goed nieuws: ondanks de inflatie hebben wij de prijsstijging beperkt weten te houden tot gemiddeld 3%.

Nieuw in ons assortiment:
• Eco-vriendelijke PVC-vrije banners
• Recyclebare mesh doeken
• Bio-based laminaat folies

Als vaste klant bieden wij u 8% korting op de eerste bestelling van onze nieuwe eco-producten.

De volledige tarieflijst vindt u in de bijlage.

Met vriendelijke groet,
Henk Smit
Accountmanager
Drukkerij Noord`,
    datum: daysAgo(10, 9, 10),
    gelezen: true,
    starred: false,
    labels: ['leverancier'],
    bijlagen: 1,
    map: 'inbox',
    created_at: daysAgo(10, 9, 10),
  },

  // --- VERZONDEN ---
  {
    id: 'demo-e12',
    user_id: 'demo',
    gmail_id: '',
    van: 'Sign Company <info@signcompany.nl>',
    aan: 'jan@bakkerijdeboer.nl',
    onderwerp: 'Offerte raamstickers voorjaarsactie',
    inhoud: `Beste Jan,

Hierbij de offerte voor de raamstickers voor jullie voorjaarsactie. Zoals besproken gaat het om:

• 4x raamsticker 120x80cm (full color, witte achtergrond)
• Inclusief ontwerp (2 correctierondes)
• Inclusief plaatsing
• Materiaal: gegoten folie, verwijderbaar

Investering: € 380,- excl. BTW

Levertijd: 5 werkdagen na akkoord ontwerp

Laat me weten of je akkoord bent, dan ga ik direct aan de slag met het ontwerp!

Met vriendelijke groet,
Mark de Jong
Sign Company
T: +31 228 123 456`,
    datum: daysAgo(1, 9, 30),
    gelezen: true,
    starred: false,
    labels: ['offerte'],
    bijlagen: 1,
    map: 'verzonden',
    created_at: daysAgo(1, 9, 30),
  },
  {
    id: 'demo-e13',
    user_id: 'demo',
    gmail_id: '',
    van: 'Sign Company <info@signcompany.nl>',
    aan: 'sandra@supermarktplus.nl',
    onderwerp: 'Offerte vernieuwing lichtreclame',
    inhoud: `Beste Sandra,

Naar aanleiding van ons gesprek stuur ik hierbij de offerte voor de vernieuwing van de lichtreclame voor Supermarkt Plus Enkhuizen.

Offerte SC-2026-078:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Demontage bestaande lichtreclame      € 450,-
• Nieuwe LED lichtreclame 6m breed     € 6.200,-
  - Aluminium frame, weerbestendig
  - Full LED verlichting (dimbaar)
  - Bedrukking conform huisstijl
• Montage en aansluiting               € 1.400,-
• Elektrische keuring                    € 350,-
• Transport                              € 500,-
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Totaal excl. BTW:                      € 8.900,-
BTW 21%:                               € 1.869,-
Totaal incl. BTW:                     € 10.769,-

Levertijd: 3-4 weken na akkoord
Garantie: 5 jaar op LED modules, 10 jaar op constructie

Ik hoor graag van je!

Met vriendelijke groet,
Mark de Jong
Sign Company`,
    datum: daysAgo(8, 14, 15),
    gelezen: true,
    starred: false,
    labels: ['offerte'],
    bijlagen: 2,
    map: 'verzonden',
    created_at: daysAgo(8, 14, 15),
  },
  {
    id: 'demo-e14',
    user_id: 'demo',
    gmail_id: '',
    van: 'Sign Company <info@signcompany.nl>',
    aan: 'vergunningen@enkhuizen.nl',
    onderwerp: 'Aanvraag omgevingsvergunning lichtreclame Westerstraat 88',
    inhoud: `Geachte heer/mevrouw,

Hierbij dienen wij namens onze klant Supermarkt Plus Enkhuizen een aanvraag in voor een omgevingsvergunning voor het plaatsen van lichtreclame op het pand Westerstraat 88 te Enkhuizen.

Bijgevoegd vindt u:
1. Ingevuld aanvraagformulier
2. Situatietekening met afmetingen
3. Kleurenfoto huidige situatie
4. Visualisatie nieuwe situatie
5. Technische specificaties lichtreclame

Met vriendelijke groet,
Sign Company`,
    datum: daysAgo(25, 10, 0),
    gelezen: true,
    starred: false,
    labels: [],
    bijlagen: 5,
    map: 'verzonden',
    created_at: daysAgo(25, 10, 0),
  },

  // --- CONCEPTEN ---
  {
    id: 'demo-e15',
    user_id: 'demo',
    gmail_id: '',
    van: 'Sign Company <info@signcompany.nl>',
    aan: 'info@taxihoorn.nl',
    onderwerp: "Re: Offerte carwrapping taxivloot (6 auto's)",
    inhoud: `Beste Mohammed,

Bedankt voor uw aanvraag. Ik heb de specificaties bekeken en kan u het volgende aanbieden voor de carwrapping van uw 6 Tesla Model 3's:

Per auto:
• Full wrap donkerblauw metallic (3M 1080-M227)
• Logo's en telefoonnummer zijkanten
• Website URL achterkant

Prijs per auto: € 2.850,- excl. BTW
Bij 6 auto's: 10% korting = € 2.565,- per auto

Totaal 6 auto's: € 15.390,- excl. BTW

Levertijd: 2 auto's per week, totaal 3 weken

[CONCEPT - NOG AANVULLEN MET GARANTIEVOORWAARDEN]`,
    datum: daysAgo(2, 16, 30),
    gelezen: true,
    starred: false,
    labels: ['offerte'],
    bijlagen: 0,
    map: 'concepten',
    created_at: daysAgo(2, 16, 30),
  },
  {
    id: 'demo-e16',
    user_id: 'demo',
    gmail_id: '',
    van: 'Sign Company <info@signcompany.nl>',
    aan: 'tom@reclameland.nl',
    onderwerp: 'Re: Samenwerkingsvoorstel grootformaat print',
    inhoud: `Beste Tom,

Bedankt voor het interessante voorstel. Wij staan zeker open voor een samenwerking. In onze regio is er inderdaad veel vraag naar professionele montage.

[CONCEPT - AFMAKEN]`,
    datum: daysAgo(6, 12, 0),
    gelezen: true,
    starred: false,
    labels: [],
    bijlagen: 0,
    map: 'concepten',
    created_at: daysAgo(6, 12, 0),
  },

  // --- PRULLENBAK ---
  {
    id: 'demo-e18',
    user_id: 'demo',
    gmail_id: '',
    van: 'SEO Experts <noreply@seoexperts-promo.com>',
    aan: 'info@signcompany.nl',
    onderwerp: 'Uw website op #1 in Google! Gegarandeerd resultaat!',
    inhoud: `Geachte websitebeheerder,

Wij hebben uw website geanalyseerd en zien grote verbetermogelijkheden! Met onze SEO diensten garanderen wij u een top 3 positie in Google binnen 30 dagen!

SPECIAAL AANBOD: 50% korting deze week!

Klik hier voor uw gratis analyse!

Met vriendelijke groet,
SEO Experts International`,
    datum: daysAgo(1, 3, 22),
    gelezen: false,
    starred: false,
    labels: [],
    bijlagen: 0,
    map: 'prullenbak',
    created_at: daysAgo(1, 3, 22),
  },
  {
    id: 'demo-e19',
    user_id: 'demo',
    gmail_id: '',
    van: 'China Signage Co <sales@chinasignage888.com>',
    aan: 'info@signcompany.nl',
    onderwerp: 'LED sign factory direct price! MOQ 1pc!',
    inhoud: `Dear friend,

We are LED sign manufacturer in Shenzhen. Best price for channel letters, light box, neon sign!

MOQ only 1pc! Free shipping to Netherlands!

Contact us on WhatsApp: +86 xxx xxx xxxx

Best regards,
Sales Team`,
    datum: daysAgo(2, 5, 11),
    gelezen: false,
    starred: false,
    labels: [],
    bijlagen: 0,
    map: 'prullenbak',
    created_at: daysAgo(2, 5, 11),
  },
]

// ============================================================================
// Helpers
// ============================================================================

export function getContactByEmail(email: string): EmailContact | undefined {
  // Extract email from "Name <email>" format
  const match = email.match(/<([^>]+)>/)
  const cleanEmail = match ? match[1] : email
  return demoContacts.find((c) => c.email === cleanEmail)
}

export function extractEmailAddress(from: string): string {
  const match = from.match(/<([^>]+)>/)
  return match ? match[1] : from
}
