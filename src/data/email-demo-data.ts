// ============================================================================
// Email Demo Data - FORGEdesk Werkplaats
// ============================================================================

export interface EmailAddress {
  name: string;
  email: string;
  company?: string;
}

export interface Email {
  id: string;
  from: EmailAddress;
  to: EmailAddress[];
  cc?: EmailAddress[];
  subject: string;
  preview: string;
  body: string;
  date: string; // ISO string
  read: boolean;
  starred: boolean;
  folder: 'inbox' | 'sent' | 'drafts' | 'archive' | 'trash' | 'spam';
  labels: string[];
  hasAttachment: boolean;
  attachments?: { name: string; size: string; type: string }[];
  priority: 'high' | 'normal' | 'low';
}

export interface Contact {
  id: string;
  name: string;
  email: string;
  company?: string;
  phone?: string;
  avatar?: string;
  isCustomer: boolean;
  subscribedNewsletter: boolean;
  tags: string[];
  deals?: { name: string; value: string; status: 'open' | 'won' | 'lost' | 'pending' }[];
  activities?: { type: string; description: string; date: string }[];
  notes?: string;
  addedDate?: string;
}

export type FolderType = 'inbox' | 'sent' | 'drafts' | 'archive' | 'trash' | 'spam';

export interface Folder {
  id: FolderType;
  name: string;
  icon: string;
  unreadCount: number;
}

// ============================================================================
// Demo Contacts
// ============================================================================

export const demoContacts: Contact[] = [
  {
    id: 'c1',
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
    id: 'c2',
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
    id: 'c3',
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
    id: 'c4',
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
    id: 'c5',
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
    id: 'c6',
    name: 'Kees Jansen',
    email: 'k.jansen@gmail.com',
    company: undefined,
    phone: '+31 6 77889900',
    isCustomer: false,
    subscribedNewsletter: false,
    tags: ['particulier', 'klacht'],
    activities: [
      { type: 'email', description: 'Klacht over bootbelettering', date: '2026-02-11' },
    ],
  },
  {
    id: 'c7',
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
    id: 'c8',
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
    id: 'c9',
    name: '3M Sign Materials',
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
    id: 'c10',
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
];

// ============================================================================
// Demo Emails
// ============================================================================

const signCompany: EmailAddress = {
  name: 'FORGEdesk',
  email: 'info@forgedesk.nl',
  company: 'FORGEdesk',
};

export const demoEmails: Email[] = [
  // --- INBOX ---
  {
    id: 'e1',
    from: { name: 'Lisa van Dijk', email: 'lisa@hotelwestfriesland.nl', company: 'Hotel West-Friesland' },
    to: [signCompany],
    subject: 'Interesse in totale signing voor ons hotel',
    preview: 'Goedemiddag, Wij zijn bezig met een grote renovatie van Hotel West-Friesland en zijn op zoek naar...',
    body: `Goedemiddag,

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
    date: '2026-02-16T14:32:00Z',
    read: false,
    starred: true,
    folder: 'inbox',
    labels: ['offerte', 'hoge prioriteit'],
    hasAttachment: false,
    priority: 'high',
  },
  {
    id: 'e2',
    from: { name: 'Jan de Boer', email: 'jan@bakkerijdeboer.nl', company: 'Bakkerij De Boer' },
    to: [signCompany],
    subject: 'Re: Offerte raamstickers voorjaarsactie',
    preview: 'Hoi, de offerte ziet er goed uit! Ik heb alleen nog een vraag over de levertijd...',
    body: `Hoi,

De offerte ziet er goed uit! Ik heb alleen nog een vraag over de levertijd. Kunnen de stickers voor 1 maart geleverd en geplaatst worden? We starten dan met onze voorjaarsactie.

Ook vroeg ik me af of het mogelijk is om de stickers seizoensgebonden te maken, zodat we ze makkelijk kunnen wisselen voor de zomeractie.

Alvast bedankt!

Groet,
Jan de Boer
Bakkerij De Boer`,
    date: '2026-02-16T11:15:00Z',
    read: false,
    starred: false,
    folder: 'inbox',
    labels: ['offerte'],
    hasAttachment: false,
    priority: 'normal',
  },
  {
    id: 'e3',
    from: { name: '3M Sign Materials', email: 'orders@3msignmaterials.nl', company: '3M Sign Materials' },
    to: [signCompany],
    subject: 'Bestelling #SM-2026-4492 verzonden',
    preview: 'Uw bestelling is vandaag verzonden. Verwachte levering: woensdag 18 februari...',
    body: `Geachte klant,

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
    date: '2026-02-15T16:45:00Z',
    read: true,
    starred: false,
    folder: 'inbox',
    labels: ['leverancier', 'bestelling'],
    hasAttachment: true,
    attachments: [
      { name: 'pakbon-SM-2026-4492.pdf', size: '245 KB', type: 'pdf' },
      { name: 'factuur-SM-2026-4492.pdf', size: '189 KB', type: 'pdf' },
    ],
    priority: 'normal',
  },
  {
    id: 'e4',
    from: { name: 'Peter van Dalen', email: 'peter@vandalenbv.nl', company: 'Van Dalen Bouw BV' },
    to: [signCompany],
    subject: 'Planning montage bouwborden project Medemblik',
    preview: 'Hi, kunnen we de bouwborden volgende week woensdag plaatsen? Het terrein is dan...',
    body: `Hi,

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
    date: '2026-02-14T09:22:00Z',
    read: false,
    starred: false,
    folder: 'inbox',
    labels: ['montage', 'planning'],
    hasAttachment: false,
    priority: 'normal',
  },
  {
    id: 'e5',
    from: { name: 'Mohammed El Amrani', email: 'info@taxihoorn.nl', company: 'Taxi Hoorn' },
    to: [signCompany],
    subject: 'Offerte carwrapping taxivloot (6 auto\'s)',
    preview: 'Geachte heer/mevrouw, Wij hebben een vloot van 6 taxi\'s (Tesla Model 3) en willen deze...',
    body: `Geachte heer/mevrouw,

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
    date: '2026-02-13T15:08:00Z',
    read: true,
    starred: true,
    folder: 'inbox',
    labels: ['offerte', 'carwrapping'],
    hasAttachment: true,
    attachments: [
      { name: 'TaxiHoorn_Logo.ai', size: '2.4 MB', type: 'ai' },
      { name: 'TaxiHoorn_Huisstijl.pdf', size: '5.1 MB', type: 'pdf' },
    ],
    priority: 'normal',
  },
  {
    id: 'e6',
    from: { name: 'Sandra Visser', email: 'sandra@supermarktplus.nl', company: 'Supermarkt Plus Enkhuizen' },
    to: [signCompany],
    subject: 'Re: Offerte lichtreclame - AKKOORD',
    preview: 'Goed nieuws! Het bestuur heeft de offerte goedgekeurd. We gaan graag met jullie in zee...',
    body: `Hallo,

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
    date: '2026-02-12T10:30:00Z',
    read: true,
    starred: true,
    folder: 'inbox',
    labels: ['offerte', 'goedgekeurd', 'hoge prioriteit'],
    hasAttachment: false,
    priority: 'high',
  },
  {
    id: 'e7',
    from: { name: 'Kees Jansen', email: 'k.jansen@gmail.com' },
    to: [signCompany],
    subject: 'Klacht bootbelettering - letters laten los',
    preview: 'Geachte FORGEdesk, Twee weken geleden heeft u belettering aangebracht op mijn boot...',
    body: `Geachte FORGEdesk,

Twee weken geleden heeft u belettering aangebracht op mijn boot (Bayliner VR5, "Zeemeermin"). Helaas moet ik constateren dat er al 3 letters los zitten aan de bakboord kant.

Dit is niet wat ik verwacht had gezien de prijs die ik hiervoor betaald heb (€ 750,-). Ik verzoek u dit zo spoedig mogelijk te herstellen, uiteraard op uw kosten.

Mijn boot ligt in de jachthaven van Enkhuizen, steiger 7, plek 23.

Graag hoor ik wanneer u dit kunt oplossen. Bij voorkeur deze week nog, want ik wil komend weekend het water op.

Met vriendelijke groet,
Kees Jansen
T: +31 6 77889900`,
    date: '2026-02-11T13:45:00Z',
    read: true,
    starred: false,
    folder: 'inbox',
    labels: ['klacht', 'urgent'],
    hasAttachment: true,
    attachments: [
      { name: 'foto_belettering_1.jpg', size: '3.2 MB', type: 'image' },
      { name: 'foto_belettering_2.jpg', size: '2.8 MB', type: 'image' },
    ],
    priority: 'high',
  },
  {
    id: 'e8',
    from: { name: 'Marieke Bakker', email: 'm.bakker@cafetdorphuis.nl', company: "Café 't Dorphuis" },
    to: [signCompany],
    subject: 'Offerte aanvraag uithangbord en lichtreclame',
    preview: 'Beste FORGEdesk, Wij zijn een nieuw café in Schagen en zoeken een mooi uithangbord...',
    body: `Beste FORGEdesk,

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
    date: '2026-02-10T08:55:00Z',
    read: false,
    starred: false,
    folder: 'inbox',
    labels: ['offerte', 'lichtreclame'],
    hasAttachment: false,
    priority: 'normal',
  },
  {
    id: 'e9',
    from: { name: 'Tom de Vries', email: 'tom@reclameland.nl', company: 'ReclameLand BV' },
    to: [signCompany],
    subject: 'Samenwerkingsvoorstel grootformaat print',
    preview: 'Geachte directie, ReclameLand BV is gespecialiseerd in grootformaat digitaal printen...',
    body: `Geachte directie,

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
    date: '2026-02-09T11:20:00Z',
    read: true,
    starred: false,
    folder: 'inbox',
    labels: ['samenwerking'],
    hasAttachment: true,
    attachments: [
      { name: 'ReclameLand_Bedrijfspresentatie.pdf', size: '8.7 MB', type: 'pdf' },
    ],
    priority: 'normal',
  },
  {
    id: 'e10',
    from: { name: 'Gemeente Enkhuizen', email: 'vergunningen@enkhuizen.nl', company: 'Gemeente Enkhuizen' },
    to: [signCompany],
    subject: 'Vergunning lichtreclame Supermarkt Plus - GOEDGEKEURD',
    preview: 'Betreft: Aanvraag omgevingsvergunning lichtreclame, Westerstraat 88, Enkhuizen...',
    body: `Geachte heer/mevrouw,

Betreft: Aanvraag omgevingsvergunning lichtreclame
Locatie: Westerstraat 88, Enkhuizen
Aanvrager: FORGEdesk namens Supermarkt Plus Enkhuizen
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
    date: '2026-02-07T14:00:00Z',
    read: true,
    starred: true,
    folder: 'inbox',
    labels: ['vergunning', 'gemeente'],
    hasAttachment: true,
    attachments: [
      { name: 'Vergunning_OV-2026-0234.pdf', size: '1.2 MB', type: 'pdf' },
    ],
    priority: 'normal',
  },
  {
    id: 'e11',
    from: { name: 'Henk Smit', email: 'h.smit@drukkerijnoord.nl', company: 'Drukkerij Noord' },
    to: [signCompany],
    subject: 'Nieuwe tarieven 2026 en uitbreiding assortiment',
    preview: 'Beste relatie, Hierbij sturen wij u onze nieuwe tarieflijst voor 2026. Goed nieuws:...',
    body: `Beste relatie,

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
    date: '2026-02-06T09:10:00Z',
    read: true,
    starred: false,
    folder: 'inbox',
    labels: ['leverancier'],
    hasAttachment: true,
    attachments: [
      { name: 'Tarieflijst_2026_DrukkerijNoord.pdf', size: '456 KB', type: 'pdf' },
    ],
    priority: 'low',
  },
  {
    id: 'e20',
    from: { name: 'Anna Mol', email: 'anna.mol@gmail.com' },
    to: [signCompany],
    subject: 'Naambordje voordeur',
    preview: 'Hallo, ik ben op zoek naar een mooi naambordje voor bij onze voordeur. Iets in rvs of...',
    body: `Hallo,

Ik ben op zoek naar een mooi naambordje voor bij onze voordeur. Iets in rvs of aluminium met onze achternaam "Mol-Dijkstra" erop.

Formaat: ongeveer 20x10cm
Materiaal: RVS of geborsteld aluminium
Bevestiging: schroeven of dubbelzijdig tape

Kunnen jullie zoiets maken? En wat kost dat ongeveer?

Groetjes,
Anna Mol`,
    date: '2026-02-16T09:00:00Z',
    read: false,
    starred: false,
    folder: 'inbox',
    labels: ['offerte'],
    hasAttachment: false,
    priority: 'low',
  },

  // --- SENT ---
  {
    id: 'e12',
    from: signCompany,
    to: [{ name: 'Jan de Boer', email: 'jan@bakkerijdeboer.nl', company: 'Bakkerij De Boer' }],
    subject: 'Offerte raamstickers voorjaarsactie',
    preview: 'Beste Jan, Hierbij de offerte voor de raamstickers voor jullie voorjaarsactie...',
    body: `Beste Jan,

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
FORGEdesk
T: +31 228 123 456`,
    date: '2026-02-15T09:30:00Z',
    read: true,
    starred: false,
    folder: 'sent',
    labels: ['offerte'],
    hasAttachment: true,
    attachments: [
      { name: 'Offerte_SC-2026-089_BakkerijDeBoer.pdf', size: '320 KB', type: 'pdf' },
    ],
    priority: 'normal',
  },
  {
    id: 'e13',
    from: signCompany,
    to: [{ name: 'Sandra Visser', email: 'sandra@supermarktplus.nl', company: 'Supermarkt Plus Enkhuizen' }],
    subject: 'Offerte vernieuwing lichtreclame',
    preview: 'Beste Sandra, Naar aanleiding van ons gesprek stuur ik hierbij de offerte voor de...',
    body: `Beste Sandra,

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
FORGEdesk`,
    date: '2026-02-08T14:15:00Z',
    read: true,
    starred: false,
    folder: 'sent',
    labels: ['offerte'],
    hasAttachment: true,
    attachments: [
      { name: 'Offerte_SC-2026-078_SupermarktPlus.pdf', size: '1.1 MB', type: 'pdf' },
      { name: 'Visualisatie_Lichtreclame.jpg', size: '4.2 MB', type: 'image' },
    ],
    priority: 'normal',
  },
  {
    id: 'e14',
    from: signCompany,
    to: [{ name: 'Gemeente Enkhuizen', email: 'vergunningen@enkhuizen.nl', company: 'Gemeente Enkhuizen' }],
    subject: 'Aanvraag omgevingsvergunning lichtreclame Westerstraat 88',
    preview: 'Geachte heer/mevrouw, Hierbij dienen wij namens onze klant een aanvraag in voor...',
    body: `Geachte heer/mevrouw,

Hierbij dienen wij namens onze klant Supermarkt Plus Enkhuizen een aanvraag in voor een omgevingsvergunning voor het plaatsen van lichtreclame op het pand Westerstraat 88 te Enkhuizen.

Bijgevoegd vindt u:
1. Ingevuld aanvraagformulier
2. Situatietekening met afmetingen
3. Kleurenfoto huidige situatie
4. Visualisatie nieuwe situatie
5. Technische specificaties lichtreclame

Met vriendelijke groet,
FORGEdesk`,
    date: '2026-01-20T10:00:00Z',
    read: true,
    starred: false,
    folder: 'sent',
    labels: ['vergunning'],
    hasAttachment: true,
    attachments: [
      { name: 'Aanvraag_Vergunning_Westerstraat88.pdf', size: '12.3 MB', type: 'pdf' },
    ],
    priority: 'normal',
  },

  // --- DRAFTS ---
  {
    id: 'e15',
    from: signCompany,
    to: [{ name: 'Mohammed El Amrani', email: 'info@taxihoorn.nl', company: 'Taxi Hoorn' }],
    subject: 'Re: Offerte carwrapping taxivloot (6 auto\'s)',
    preview: 'Beste Mohammed, Bedankt voor uw aanvraag. Ik heb de specificaties bekeken en kan u het...',
    body: `Beste Mohammed,

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
    date: '2026-02-14T16:30:00Z',
    read: true,
    starred: false,
    folder: 'drafts',
    labels: ['offerte'],
    hasAttachment: false,
    priority: 'normal',
  },
  {
    id: 'e16',
    from: signCompany,
    to: [{ name: 'Tom de Vries', email: 'tom@reclameland.nl', company: 'ReclameLand BV' }],
    subject: 'Re: Samenwerkingsvoorstel grootformaat print',
    preview: 'Beste Tom, Bedankt voor het interessante voorstel. Wij staan zeker open voor een...',
    body: `Beste Tom,

Bedankt voor het interessante voorstel. Wij staan zeker open voor een samenwerking. In onze regio is er inderdaad veel vraag naar professionele montage.

[CONCEPT - AFMAKEN]`,
    date: '2026-02-10T12:00:00Z',
    read: true,
    starred: false,
    folder: 'drafts',
    labels: [],
    hasAttachment: false,
    priority: 'normal',
  },

  // --- ARCHIVE ---
  {
    id: 'e17',
    from: { name: 'Willem Hoekstra', email: 'willem@jachthavenenkhuizen.nl', company: 'Jachthaven Enkhuizen' },
    to: [signCompany],
    subject: 'Bedankt voor de mooie havenborden!',
    preview: 'Beste FORGEdesk, De nieuwe havenborden zijn fantastisch geworden! Alle...',
    body: `Beste FORGEdesk,

De nieuwe havenborden zijn fantastisch geworden! Alle complimenten. De ligplaatshouders reageren ook erg positief.

We zullen jullie zeker aanbevelen bij andere jachthavens in de regio.

Hartelijk dank,
Willem Hoekstra
Havenmeester
Jachthaven Enkhuizen`,
    date: '2026-01-15T16:20:00Z',
    read: true,
    starred: false,
    folder: 'archive',
    labels: ['klant'],
    hasAttachment: false,
    priority: 'normal',
  },

  // --- SPAM ---
  {
    id: 'e18',
    from: { name: 'SEO Experts', email: 'noreply@seoexperts-promo.com' },
    to: [signCompany],
    subject: '🚀 Uw website op #1 in Google! Gegarandeerd resultaat!',
    preview: 'Geachte websitebeheerder, Wij hebben uw website geanalyseerd en zien grote...',
    body: `Geachte websitebeheerder,

Wij hebben uw website geanalyseerd en zien grote verbetermogelijkheden! Met onze SEO diensten garanderen wij u een top 3 positie in Google binnen 30 dagen!

SPECIAAL AANBOD: 50% korting deze week!

Klik hier voor uw gratis analyse!

Met vriendelijke groet,
SEO Experts International`,
    date: '2026-02-15T03:22:00Z',
    read: false,
    starred: false,
    folder: 'spam',
    labels: [],
    hasAttachment: false,
    priority: 'low',
  },
  {
    id: 'e19',
    from: { name: 'China Signage Co', email: 'sales@chinasignage888.com' },
    to: [signCompany],
    subject: 'LED sign factory direct price! MOQ 1pc!',
    preview: 'Dear friend, We are LED sign manufacturer in Shenzhen. Best price for channel letters...',
    body: `Dear friend,

We are LED sign manufacturer in Shenzhen. Best price for channel letters, light box, neon sign!

MOQ only 1pc! Free shipping to Netherlands!

Contact us on WhatsApp: +86 xxx xxx xxxx

Best regards,
Sales Team`,
    date: '2026-02-14T05:11:00Z',
    read: false,
    starred: false,
    folder: 'spam',
    labels: [],
    hasAttachment: false,
    priority: 'low',
  },
];

// ============================================================================
// Helper Functions
// ============================================================================

export function getContactByEmail(email: string): Contact | undefined {
  return demoContacts.find((c) => c.email === email);
}

export function getEmailsByFolder(folder: FolderType): Email[] {
  return demoEmails.filter((e) => e.folder === folder);
}

export function getFolderCounts(): Record<FolderType, number> {
  const counts: Record<FolderType, number> = {
    inbox: 0, sent: 0, drafts: 0, archive: 0, trash: 0, spam: 0,
  };
  demoEmails.forEach((e) => {
    if (!e.read) counts[e.folder]++;
  });
  return counts;
}

export function formatEmailDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
  } else if (diffDays === 1) {
    return 'Gisteren';
  } else if (diffDays < 7) {
    return date.toLocaleDateString('nl-NL', { weekday: 'long' });
  } else {
    return date.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' });
  }
}
