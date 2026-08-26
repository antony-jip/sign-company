/* Vergelijkingspagina's onder /vergelijk/[slug].

   Waarom: kit.com heeft zeven "X vs Kit"-pagina's in de footer. doen. had er
   nul, terwijl een signmaker die zoekt bijna altijd al iets gebruikt. Dit is
   hoge intentie en lage concurrentie in het Nederlands.

   Regels voor deze pagina's, en die zijn belangrijker dan de SEO:
   - Noem eerst waar het alternatief écht goed in is. Wie dat overslaat leest
     als een verkooppraatje en wordt niet geloofd.
   - Geen prijzen of specificaties van andermans product noemen. Die kloppen
     binnen een jaar niet meer en we kunnen ze niet controleren.
   - Er staat op elke pagina een "blijf bij X als"-blok. Dat is geen zwakte,
     dat is de reden dat de rest geloofd wordt.
   - Nooit besteltaal. Elke pagina eindigt bij een gesprek of een proef.
     Zie ook feedback: geen webshop-framing op signcompany/doen.

   Feitelijk: doen. koppelt met Exact Online en Mollie. Verzin nergens een
   koppeling met een van deze pakketten. */

export type Vergelijking = {
  slug: string
  /** Zoals je het in een zin schrijft: "naast Moneybird" */
  naam: string
  /** Korte typering onder de menu-/kaartlink */
  tagline: string
  seoTitle: string
  seoDescription: string
  h1Lead: string
  h1Accent: string
  intro: string
  /** Waar het alternatief echt goed in is. Eerst dit, dan de rest. */
  sterk: string[]
  /** Waar het stukloopt zodra het een signklus wordt. */
  knelpunten: { title: string; body: string }[]
  /** Rij-voor-rij verschil. Kort houden, geen tabel van dertig rijen. */
  verschil: { onderwerp: string; ander: string; doen: string }[]
  /** Wanneer je gewoon moet blijven waar je zit. */
  blijf: string
  /** Wat er praktisch gebeurt als je overstapt of ernaast draait. */
  overstap: string
}

export const vergelijkingen: Vergelijking[] = [
  {
    slug: 'excel-en-whatsapp',
    naam: 'Excel en WhatsApp',
    tagline: 'De meest gebruikte combinatie in de branche',
    seoTitle: 'doen. naast Excel en WhatsApp | doen.',
    seoDescription:
      'Excel en WhatsApp houden een signbedrijf verrassend lang draaiend. Waar het stukloopt, en wat doen. anders doet: één systeem van aanvraag tot factuur.',
    h1Lead: 'Excel en WhatsApp',
    h1Accent: 'werken. Tot ze dat niet meer doen',
    intro:
      'Het is de meest gebruikte combinatie in de branche, en niet voor niets: een offerteblad dat jij zelf hebt opgebouwd rekent precies zoals jouw bedrijf rekent. Tot de klus groter wordt dan het blad.',
    sterk: [
      'Je sjabloon rekent exact zoals jij rekent, want je hebt het zelf gebouwd.',
      'Er is geen abonnement, geen implementatie en geen leverancier die iets verandert.',
      'Iedereen kan ermee overweg vanaf dag één, ook de monteur en de invaller.',
    ],
    knelpunten: [
      {
        title: 'De laatste versie is een gok',
        body: 'Offerte-v3-def-echt.xlsx staat op de laptop, op de server en in een appje. Welke ging er naar de klant? Bij discussie achteraf heb je geen spoor.',
      },
      {
        title: 'Het akkoord staat in een chat',
        body: '"Ja is goed" in WhatsApp, maar op welke tekening? Als de klant twee weken later iets anders bedoelde, sta je met lege handen en een geproduceerd doek.',
      },
      {
        title: 'De status zit in je hoofd',
        body: 'Is de drukproef akkoord? Is het materiaal binnen? Wie staat er woensdag op de bok? Drie vragen, drie plekken, en jij bent de enige die het antwoord heeft.',
      },
      {
        title: 'Alles wordt twee keer ingetypt',
        body: 'Van offerte naar werkbon naar factuur type je dezelfde regels opnieuw. Elke overtypbeurt is een kans op een fout die je pas ziet als de klant belt.',
      },
    ],
    verschil: [
      {
        onderwerp: 'Calculeren',
        ander: 'Je eigen sjabloon, dat je per klus half opnieuw aanpast',
        doen: 'Je eigen materialen, uren en marges als vaste regels, marge loopt live mee',
      },
      {
        onderwerp: 'Akkoord van de klant',
        ander: 'Een appje of een mailtje, zonder versie',
        doen: 'Klantportaal op één link, met versiegeschiedenis en een vastgelegd akkoord',
      },
      {
        onderwerp: 'Van offerte naar werkbon',
        ander: 'Overtypen of kopiëren en plakken',
        doen: 'Eén klik, alle regels staan er al op',
      },
      {
        onderwerp: 'Uren en foto’s van de montage',
        ander: 'Op de telefoon van de monteur, nabellen op vrijdag',
        doen: 'Op de werkbon, ingevuld op locatie, met handtekening',
      },
      {
        onderwerp: 'Overzicht',
        ander: 'In je hoofd en in een map',
        doen: 'Eén cockpit, ook als jij een week weg bent',
      },
    ],
    blijf:
      'Werk je alleen, doe je een paar klussen per maand en pakt niemand anders je werk op? Dan is Excel voorlopig goedkoper dan elk pakket, en dat blijft zo. Dit gaat pas lonen zodra er een tweede persoon bij komt of zodra klussen elkaar gaan overlappen.',
    overstap:
      'Je hoeft je sjabloon niet weg te gooien. We zetten je klanten en je lopende offertes erover en bouwen je materialen en uurtarieven na, zodat je calculatie op dag één rekent zoals je gewend bent.',
  },
  {
    slug: 'moneybird',
    naam: 'Moneybird',
    tagline: 'Sterk in facturen, kent je klus niet',
    seoTitle: 'doen. naast Moneybird | doen.',
    seoDescription:
      'Moneybird is een prettig boekhoudpakket, maar kent geen drukproef, planning of werkbon. Wat doen. daar bovenop doet voor een signbedrijf.',
    h1Lead: 'Moneybird doet je boekhouding',
    h1Accent: 'doen. doet je klus',
    intro:
      'Moneybird is gebouwd om je administratie kloppend te krijgen, en dat doet het goed. Alleen begint een signklus niet bij een factuur, maar bij een aanvraag, een tekening en een drukproef.',
    sterk: [
      'Facturen en btw zijn netjes op orde, en je boekhouder is er blij mee.',
      'Het werkt licht en snel, zonder dat je een implementatietraject in moet.',
      'Bankkoppeling en herinneringen lopen vanzelf.',
    ],
    knelpunten: [
      {
        title: 'Een offerte is geen calculatie',
        body: 'Je kunt regels intypen, maar niet rekenen met vierkante meters folie, snijverlies, montage-uren en de marge daaronder. Dat blad houd je er dus naast.',
      },
      {
        title: 'Geen drukproef, geen versies',
        body: 'Het ontwerp, de proef en het akkoord daarop leven ergens anders. Precies daar gaat het mis bij een klus die de deur uit gaat en niet meer terug kan.',
      },
      {
        title: 'Geen planning en geen werkbon',
        body: 'Wie staat er woensdag op de bok en wat neemt hij mee? Dat staat niet in een boekhoudpakket, dus staat het op een whiteboard.',
      },
      {
        title: 'De klant ziet alleen de factuur',
        body: 'Alles daarvoor, de tekening, de proef, de planning, loopt via jouw mailbox. Elke vraag komt bij jou terug.',
      },
    ],
    verschil: [
      {
        onderwerp: 'Waar het begint',
        ander: 'Bij de factuur',
        doen: 'Bij de aanvraag, en de factuur rolt er aan het eind uit',
      },
      {
        onderwerp: 'Offerte',
        ander: 'Regels intypen',
        doen: 'Calculeren met je eigen materialen, uren en marges',
      },
      {
        onderwerp: 'Drukproef en akkoord',
        ander: 'Buiten het pakket',
        doen: 'Klantportaal met versies en een vastgelegd akkoord',
      },
      {
        onderwerp: 'Montage',
        ander: 'Buiten het pakket',
        doen: 'Planning met weerbericht, werkbon op de telefoon van de monteur',
      },
      {
        onderwerp: 'Boekhouding',
        ander: 'Dat is de kern',
        doen: 'Koppeling met Exact Online, betaallink via Mollie',
      },
    ],
    blijf:
      'Zit je hele administratie in Moneybird, doe je vooral kleine klussen en heb je geen planning of montage om bij te houden? Blijf dan waar je zit. doen. lost een probleem op dat je dan nog niet hebt.',
    overstap:
      'doen. koppelt met Exact Online, niet met Moneybird. In de praktijk gaan bedrijven twee kanten op: je houdt Moneybird als boekhouding en gebruikt doen. voor alles ervoor, of je zet de boekhouding over naar Exact zodat de hele keten aan elkaar hangt. In een rondleiding kijken we welke van de twee bij jou past.',
  },
  {
    slug: 'teamleader',
    naam: 'Teamleader',
    tagline: 'Brede projecttool, geen signtool',
    seoTitle: 'doen. naast Teamleader | doen.',
    seoDescription:
      'Teamleader is een brede CRM- en projecttool. Wat een signbedrijf mist: calculatie op vierkante meters, drukproeven, montageplanning en werkbonnen. De vergelijking.',
    h1Lead: 'Teamleader kan veel',
    h1Accent: 'doen. kan jouw klus',
    intro:
      'Teamleader is een volwassen pakket voor offertes, CRM en projecten, en dat merk je. Het is alleen gebouwd voor bureaus en dienstverleners, niet voor een bedrijf dat vanmiddag met een hoogwerker aan een gevel hangt.',
    sterk: [
      'Brede CRM en een offertemodule die er professioneel uitziet.',
      'Veel koppelingen, en een ecosysteem dat al jaren draait.',
      'Sterk in urenregistratie en facturatie op uurbasis.',
    ],
    knelpunten: [
      {
        title: 'Kantoorlogica, geen werkplaatslogica',
        body: 'Een project is een reeks uren en taken. Een signklus is een doek van vier bij twee, snijverlies, een lichtbak, een bok en een monteur die weet dat laden via het achterterrein gaat.',
      },
      {
        title: 'Calculeren op maat kost je een omweg',
        body: 'Rekenen met vierkante meters, materiaalstaten en inkoop per leverancier moet je erin wringen. Daarom blijft dat rekenblad bestaan.',
      },
      {
        title: 'Geen drukproef-stroom',
        body: 'Versies van een ontwerp, een proef die de klant goedkeurt en een productie die pas daarna start: dat zit er niet als vaste stap in.',
      },
      {
        title: 'Prijs schaalt met je ploeg',
        body: 'Brede pakketten rekenen doorgaans per gebruiker. Bij een signbedrijf waar ook monteurs en een invaller moeten kunnen kijken, telt dat snel op.',
      },
    ],
    verschil: [
      {
        onderwerp: 'Waar het voor gebouwd is',
        ander: 'Bureaus en dienstverleners, projecten in uren',
        doen: 'Signbedrijven, klussen in materiaal, meters en montage',
      },
      {
        onderwerp: 'Calculatie',
        ander: 'Regels en uren',
        doen: 'Materialen, meters, snijverlies, uren en marge in één berekening',
      },
      {
        onderwerp: 'Drukproef',
        ander: 'Los erbij organiseren',
        doen: 'Vaste stap, met versies en akkoord in het klantportaal',
      },
      {
        onderwerp: 'Montage',
        ander: 'Agenda en taken',
        doen: 'Montageplanning met weerbericht en werkbon op locatie',
      },
      {
        onderwerp: 'Prijsmodel',
        ander: 'Meestal per gebruiker',
        doen: 'Eén prijs per bedrijf, tot tien gebruikers, alle modules erin',
      },
    ],
    blijf:
      'Doe je vooral advies-, ontwerp- of bureauwerk waarin uren de kern zijn en montage de uitzondering? Dan past een brede projecttool beter. doen. is smal met opzet.',
    overstap:
      'We zetten je klanten en je lopende offertes erover en bouwen je materialen, leveranciers en uurtarieven na. Dat zit bij de onboarding in, je hoeft er zelf niets voor uit te typen.',
  },
]

export function vergelijkingBySlug(slug: string) {
  return vergelijkingen.find((v) => v.slug === slug)
}
