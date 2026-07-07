// Eén bron voor de FAQ's: gerenderd door FaqSection (homepage/features)
// en PrijzenContent, en gebruikt voor de FAQPage-schema's in
// lib/structured-data.ts.
export const categories = [
  { id: 'prijs', label: 'Prijs' },
  { id: 'product', label: 'Product' },
  { id: 'security', label: 'Security' },
  { id: 'support', label: 'Support' },
  { id: 'technisch', label: 'Technisch' },
] as const

export type CategoryId = typeof categories[number]['id']

export const faqs: { category: CategoryId; q: string; a: string }[] = [
  {
    category: 'prijs',
    q: 'Kan ik doen. eerst gratis proberen?',
    a: 'Natuurlijk. De **eerste 30 dagen zijn gratis**, geen creditcard nodig, geen verplichtingen. Je hebt **direct toegang tot alle modules** — niks uitgegrijsd of achter een muur.',
  },
  {
    category: 'prijs',
    q: 'Hoeveel kost doen. na de proefperiode?',
    a: '**€79 per maand ex. btw**, tot **10 gebruikers**. Dat is alles. Geen opzetkosten, geen add-ons, geen aparte prijs per gebruiker die later omhoog duikt. Heb je een groter team? Stuur ons een bericht.',
  },
  {
    category: 'prijs',
    q: 'Moet ik een contract tekenen?',
    a: 'Nee. **Maandelijks opzegbaar.** Je blijft omdat het werkt, niet omdat je vastzit aan een jaarcontract.',
  },
  {
    category: 'prijs',
    q: 'Zijn er opzetkosten of verborgen kosten?',
    a: 'Nee. **Alles zit in het abonnement**, inclusief toekomstige updates. Geen opzetkosten, geen premium-tiers, geen "pakket uitbreiden om feature X te gebruiken".',
  },
  {
    category: 'prijs',
    q: 'Wat als ik meer dan 10 gebruikers heb?',
    a: 'Stuur ons een mail, dan maken we een **prijs op maat**. Alles uit het abonnement blijft hetzelfde, we passen alleen de schaal aan.',
  },

  {
    category: 'product',
    q: 'Zit AI echt overal in?',
    a: 'Ja, overal waar het helpt. **Daan** is onze AI-assistent (draait op het nieuwste **Claude**-model van Anthropic). Hij kent je bedrijfsdata, schrijft offerteteksten, vat binnengekomen mails samen, leest inkoopfacturen uit. **Geen extra kosten** — onderdeel van het abonnement.',
  },
  {
    category: 'product',
    q: 'Hoe werkt de inkoopfactuur-AI?',
    a: 'Leverancier mailt een PDF naar je inkoop-inbox. **doen. haalt de mail elk kwartier op**, leest de factuur uit (leverancier, factuurnummer, datum, regels, btw) en zet hem klaar ter goedkeuring. Je controleert, keurt goed, klaar. **Boekhouding gaat one-way door naar Exact Online**.',
  },
  {
    category: 'product',
    q: 'Wat is Sales Inbox / "Opvolgen"?',
    a: 'Een aparte view bovenop je mailbox. **Mails waarop nog geen antwoord kwam** krijgen automatisch de Opvolgen-vlag. Komt het antwoord binnen, vlag eraf. Zo zie je in één oogopslag wie er nog wacht op jou. Geen losse spreadsheet meer.',
  },
  {
    category: 'product',
    q: 'Kan mijn monteur alles vanaf zijn telefoon?',
    a: 'Ja. **Planning, werkbonnen, taken en email** hebben dedicated mobiele weergaven. Werkbon openen, uren tikken, foto\'s erbij, klant laten tekenen — allemaal op een telefoon. Geen aparte app om te installeren.',
  },
  {
    category: 'product',
    q: 'Wat is het verschil tussen Planning en Taken?',
    a: '**Planning is voor de montage.** Sleep een project naar een dag in de kalender, de werkbon hangt er automatisch aan. **Taken is voor al het werk eromheen**: offertes opvolgen, inkoop regelen, drukproeven binnenhalen.',
  },
  {
    category: 'product',
    q: 'Hoe werkt het klantportaal?',
    a: 'Je klant krijgt een **unieke link per mail** en ziet direct alles: tekeningen, offertes, opdrachtbevestigingen, facturen. **Geen inlog, geen wachtwoord**. Hij keurt goed of tekent met één klik. Jij krijgt een notificatie.',
  },
  {
    category: 'product',
    q: 'Werkt doen. op mijn telefoon?',
    a: 'Ja. Planning en werkbonnen zijn **specifiek voor mobiel ontworpen**. Je monteur opent de werkbon op zijn telefoon, registreert **uren en foto\'s direct**, laat de klant **digitaal tekenen**.',
  },

  {
    category: 'security',
    q: 'Waar staat mijn data?',
    a: 'In de **EU**, op Supabase (AWS Frankfurt). **Geen data verlaat Europa.**',
  },
  {
    category: 'security',
    q: 'Is doen. AVG-compliant?',
    a: 'Ja. Gebouwd volgens de **Europese AVG-richtlijnen**. Jouw klantdata blijft van jou en wordt **nooit gedeeld met derden**. Verwerkersovereenkomst op aanvraag.',
  },
  {
    category: 'security',
    q: 'Hoe zit het met backups?',
    a: '**Dagelijkse automatische backups** met point-in-time recovery. Als er iets misgaat, kunnen we **terug naar een eerder moment**.',
  },
  {
    category: 'security',
    q: 'Wat gebeurt er met mijn data als ik opzeg?',
    a: 'Tijdens je opzegperiode **exporteer je al je data** (CSV, PDF) wanneer je wilt. Na afloop bewaren we je data nog **30 dagen** — voor het geval je terug wilt. Daarna wordt alles **definitief verwijderd**.',
  },

  {
    category: 'support',
    q: 'Welke support krijg ik en in welke taal?',
    a: '**Nederlandse support** van echte mensen via email en chat, op werkdagen. Reactietijd meestal **binnen een paar uur**. Vastgelopen op iets ingewikkelds? Dan plannen we een **scherm-deling-sessie**.',
  },
  {
    category: 'support',
    q: 'Hoe lang duurt de implementatie?',
    a: 'De meeste bedrijven zijn **binnen een week live**. Wij helpen met de basisinrichting: producten, templates, team, eerste klanten importeren.',
  },
  {
    category: 'support',
    q: 'Kan ik overstappen vanuit mijn huidige systeem?',
    a: 'Ja. We hebben **migratiepaden voor de gangbare pakketten**. Stuur ons een export van je klanten en producten, dan zetten wij het netjes in doen. Laat het weten via **info@signcompany.nl**.',
  },
  {
    category: 'support',
    q: 'Krijg ik uitleg of training?',
    a: 'Zeker. Elke nieuwe klant krijgt een **live onboarding-sessie van ~1 uur** waarin we het systeem doorlopen.',
  },

  {
    category: 'technisch',
    q: 'Kan ik doen. koppelen aan mijn boekhouding?',
    a: 'Ja. Factuurgegevens **gaan rechtstreeks van doen. naar Exact Online** (one-way). Voor online betalingen is **Mollie** geïntegreerd.',
  },
  {
    category: 'technisch',
    q: 'Hoe werkt de email-koppeling?',
    a: 'Iedere gebruiker koppelt zijn **eigen zakelijke mailbox via IMAP/SMTP**. Je **privé-inbox blijft privé**. Alleen mails die bij een klant of project horen worden in de projectcontext zichtbaar.',
  },
  {
    category: 'technisch',
    q: 'Kan ik mijn data exporteren?',
    a: '**Altijd.** CSV, PDF, wat je nodig hebt, wanneer je wilt. **Jouw data is van jou.**',
  },
  {
    category: 'technisch',
    q: 'Op welke apparaten werkt doen.?',
    a: 'doen. draait **in de browser**. Werkt op **desktop, laptop, tablet en telefoon**. Geen installatie, geen updates. Chrome, Safari, Firefox, Edge — allemaal prima.',
  },
]

export const prijzenFaqs: { q: string; a: string }[] = [
  { q: 'Kan ik het eerst proberen?', a: 'Eerste 30 dagen gratis. Geen creditcard nodig. Geen verplichtingen.' },
  { q: 'Moet ik extra betalen voor AI of het klantportaal?', a: 'Nee. Alles zit erin. Bij ons geen feature-gates of premium-tiers.' },
  { q: 'Welke koppelingen zitten erbij?', a: 'Mollie, Exact Online, email (IMAP/SMTP) en AI. Alles standaard, geen extra kosten.' },
  { q: 'Kan ik mijn data exporteren?', a: 'Altijd. CSV, PDF, wat je nodig hebt. Jouw data is van jou.' },
  { q: 'Moet ik een contract tekenen?', a: 'Nee. Maandelijks opzegbaar. Je blijft omdat het werkt.' },
  { q: 'Hoe verschilt doen. van andere software?', a: 'Gebouwd door vakmensen uit de branche. Alles in één systeem. Klantportaal, AI en planning zitten standaard in je abonnement.' },
]
