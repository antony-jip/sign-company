import type { ReactNode } from 'react'

export type Section = {
  id: string
  title: string
  content: ReactNode
}

export type Article = {
  slug: string
  title: string
  category: Category
  excerpt: string
  updatedAt: string
  readingTime: number
  sections: Section[]
}

export type Category =
  | 'Aan de slag'
  | 'Projecten'
  | 'Offertes'
  | 'Klantportaal'
  | 'Planning'
  | 'Werkbonnen'
  | 'Facturen'
  | 'Email'
  | 'Taken'
  | 'Studio'
  | 'AI-assistent'
  | 'Integraties'
  | 'Instellingen'
  | 'Vakkennis'

export const CATEGORY_ORDER: Category[] = [
  'Aan de slag',
  'Projecten',
  'Offertes',
  'Klantportaal',
  'Planning',
  'Werkbonnen',
  'Facturen',
  'Email',
  'Taken',
  'Studio',
  'AI-assistent',
  'Integraties',
  'Instellingen',
  'Vakkennis',
]

/* Helpers for content authoring */
const P = ({ children }: { children: ReactNode }) => (
  <p className="mb-5 leading-[1.75] text-[16px] text-ink">{children}</p>
)
const B = ({ children }: { children: ReactNode }) => (
  <strong className="font-bold text-petrol">{children}</strong>
)
const UL = ({ children }: { children: ReactNode }) => (
  <ul className="mb-5 space-y-2 pl-0">{children}</ul>
)
const LI = ({ children }: { children: ReactNode }) => (
  <li className="flex gap-3 text-[16px] leading-[1.7] text-ink">
    <span aria-hidden className="mt-[10px] flex-shrink-0 w-1.5 h-1.5 rounded-full bg-flame" />
    <span>{children}</span>
  </li>
)
/* Callout als hairline-blok: geen kaart, geen zijstreep. */
const Callout = ({ children, tone = 'info' }: { children: ReactNode; tone?: 'info' | 'warning' }) => (
  <div className="border-y border-petrol/10 py-4 mb-6">
    <p className={`text-[13px] font-semibold mb-1.5 ${tone === 'info' ? 'text-petrol' : 'text-flame'}`}>
      {tone === 'info' ? 'Goed om te weten' : 'Let op'}
    </p>
    <div className="text-[14px] leading-[1.65] text-ink">{children}</div>
  </div>
)

/* ═══════════════════════════════════════════════════════════ */

export const articles: Article[] = [
  {
    slug: 'aan-de-slag',
    title: 'Aan de slag met doen.',
    category: 'Aan de slag',
    excerpt: 'De eerste stappen. Van inloggen tot je eerste offerte verstuurd, in één middag klaar.',
    updatedAt: '2026-04-23',
    readingTime: 4,
    sections: [
      {
        id: 'welkom',
        title: 'Welkom',
        content: (
          <>
            <P>
              Welkom bij doen. Deze gids neemt je mee door de <B>eerste stappen</B> in de app: van je account opzetten tot
              je eerste offerte in het portaal van een klant. Reken op een uur of drie voor de basisinrichting.
            </P>
            <P>
              Geen haast? doen. werkt direct. Je kunt altijd later terugkomen om dingen aan te scherpen.
            </P>
          </>
        ),
      },
      {
        id: 'account',
        title: 'Je account opzetten',
        content: (
          <>
            <P>
              Na je inschrijving krijg je een welkomstmail. Klik op de link en maak je wachtwoord. Activeer
              direct <B>twee-factor-authenticatie</B> in je profiel-instellingen. Sterk aangeraden voor admin-accounts.
            </P>
            <P>
              Daarna vul je je <B>bedrijfsgegevens</B> in: naam, adres, KvK-nummer, btw-nummer, logo. Die gegevens
              komen automatisch op je offertes en facturen. Eén keer invullen, voor altijd correct.
            </P>
          </>
        ),
      },
      {
        id: 'team',
        title: 'Je team uitnodigen',
        content: (
          <>
            <P>
              Ga naar <B>Instellingen → Gebruikers</B> en nodig je team uit. Per gebruiker kies je een <B>rol</B>:
            </P>
            <UL>
              <LI><B>Admin</B>: volledige toegang, ziet marges en financieel</LI>
              <LI><B>Werkvoorbereider</B>: offertes, planning, werkbonnen; geen financiële details</LI>
              <LI><B>Monteur</B>: alleen eigen werkbonnen en planning</LI>
            </UL>
            <P>Je team krijgt een uitnodiging per mail. Zodra ze hun account activeren, staan ze erin.</P>
          </>
        ),
      },
      {
        id: 'eerste-offerte',
        title: 'Je eerste offerte maken',
        content: (
          <>
            <P>
              Ga naar <B>Offertes → Nieuwe offerte</B>. Kies een klant (of maak er een aan via de KvK-lookup).
              Voeg producten toe uit je catalogus, of bouw een nieuw product op met inkoop + marge. doen. rekent
              de verkoopprijs automatisch uit.
            </P>
            <Callout>
              Tip: maak eerst een paar <B>templates</B> voor je standaard-werk (gevelreclame, wrapping, belettering).
              Volgende keer selecteer je een template en ben je in 30 seconden klaar.
            </Callout>
            <P>
              Klaar? Klik op <B>Verstuur via portaal</B>. Je klant krijgt een link per mail, geen inlog nodig. Zodra
              hij goedkeurt, krijg je een notificatie.
            </P>
          </>
        ),
      },
      {
        id: 'hulp',
        title: 'Hulp nodig?',
        content: (
          <>
            <P>
              Vastgelopen? Stuur een mailtje naar <B>info@signcompany.nl</B>. We reageren meestal binnen een paar uur op
              werkdagen. Voor complexe vragen plannen we een scherm-deling-sessie.
            </P>
          </>
        ),
      },
    ],
  },
  {
    slug: 'offerte-maken',
    title: 'Hoe maak ik een offerte?',
    category: 'Offertes',
    excerpt: 'Van lege offerte tot verzonden via het portaal. In vijf stappen, onder de vier minuten.',
    updatedAt: '2026-04-23',
    readingTime: 3,
    sections: [
      {
        id: 'nieuwe-offerte',
        title: 'Nieuwe offerte starten',
        content: (
          <>
            <P>
              Ga naar <B>Offertes</B> in de zijnav. Klik rechtsboven op <B>Nieuwe offerte</B>. Kies of je bij een
              bestaande klant start, of een nieuwe klant aanmaakt.
            </P>
            <P>
              Voor nieuwe klanten: gebruik de <B>KvK-lookup</B>: typ het KvK-nummer en adresgegevens worden
              automatisch ingevuld. Scheelt veel typen.
            </P>
          </>
        ),
      },
      {
        id: 'producten',
        title: 'Producten toevoegen',
        content: (
          <>
            <P>
              Klik op <B>Product toevoegen</B>. Kies uit je catalogus, of maak ter plekke een nieuw product aan.
              Per regel kun je aantal, eenheid, inkoopprijs en marge invullen, de verkoopprijs rolt er automatisch uit.
            </P>
            <P>Combineer losse onderdelen door ze in een <B>groep</B> te zetten, dan toont de klant één totaalprijs maar zie jij de opbouw.</P>
          </>
        ),
      },
      {
        id: 'upload',
        title: 'Werktekening uploaden',
        content: (
          <>
            <P>
              Sleep je werktekening (PDF of afbeelding) naar het upload-veld. doen. probeert de omschrijving
              automatisch te lezen en voor te stellen. Je kunt altijd aanpassen.
            </P>
            <P>Meerdere tekeningen nodig? Upload ze allemaal, ze blijven per offerte gegroepeerd.</P>
          </>
        ),
      },
      {
        id: 'verstuur',
        title: 'Versturen naar klant',
        content: (
          <>
            <P>
              Klaar? Twee opties:
            </P>
            <UL>
              <LI><B>Verstuur via portaal</B>: klant krijgt een mail met unieke link, keurt goed met één klik, geen inlog</LI>
              <LI><B>Download PDF</B>: als je 'm per email wilt meesturen</LI>
            </UL>
            <P>
              Wij raden het <B>portaal</B> aan. Je ziet dan precies wanneer je klant de offerte heeft bekeken en wanneer
              hij goedkeurt. Geen gokken meer.
            </P>
          </>
        ),
      },
      {
        id: 'opvolging',
        title: 'Wat als de klant niet reageert?',
        content: (
          <>
            <P>
              doen. volgt automatisch op. Stel per offerte in na hoeveel dagen een herinnering uitgaat. Standaard is
              dat 3 en 7 dagen na versturen. Je kunt het elk moment wijzigen of uitzetten.
            </P>
            <Callout>
              Ook handig: in de <B>Taken</B>-module kun je jezelf een taak geven om die ene grote klant persoonlijk te
              bellen. Niet alles hoeft automatisch.
            </Callout>
          </>
        ),
      },
    ],
  },
  {
    slug: 'klantportaal-uitleg',
    title: 'Hoe werkt het klantportaal?',
    category: 'Klantportaal',
    excerpt: 'Je klant krijgt een link. Geen inlog. Alles wat hij moet zien, bij elkaar op één plek.',
    updatedAt: '2026-04-23',
    readingTime: 3,
    sections: [
      {
        id: 'wat-is-het',
        title: 'Wat is het klantportaal?',
        content: (
          <>
            <P>
              Het klantportaal is een <B>persoonlijke pagina</B> voor jouw klant. Hij bereikt 'm via een unieke link die
              hij per mail ontvangt. <B>Geen account, geen wachtwoord</B>, geen app om te downloaden.
            </P>
            <P>
              Op dat portaal ziet hij alles wat bij zijn project hoort: tekeningen, offertes, opdrachtbevestigingen,
              foto's van de montage, facturen, in chronologische volgorde.
            </P>
          </>
        ),
      },
      {
        id: 'wat-kan-de-klant',
        title: 'Wat kan de klant ermee?',
        content: (
          <>
            <UL>
              <LI><B>Offertes goedkeuren</B> met één klik (digitale handtekening)</LI>
              <LI><B>Tekeningen bekijken</B> en per onderdeel reageren</LI>
              <LI><B>Opdrachtbevestigingen tekenen</B>, ook op de telefoon</LI>
              <LI><B>Facturen betalen</B> via iDEAL of creditcard (Mollie)</LI>
              <LI><B>Bestanden opvragen</B> of uploaden (bv. huisstijl, foto's)</LI>
            </UL>
            <P>
              Alles wat de klant doet, zie jij direct in het project terug. Notificaties standaard aan, per type aan
              te passen in je instellingen.
            </P>
          </>
        ),
      },
      {
        id: 'herinneringen',
        title: 'Automatische herinneringen',
        content: (
          <>
            <P>
              Reageert de klant niet? doen. stuurt automatisch een vriendelijke herinnering op het moment dat jij
              instelt. Standaard: 3 dagen en 7 dagen na versturen. Per offerte of factuur aan te passen.
            </P>
            <Callout>
              De herinneringen gaan uit vanaf jouw eigen domein (via de <B>email-koppeling</B>), niet vanaf doen.team.
              De klant merkt niet dat er software achter zit.
            </Callout>
          </>
        ),
      },
      {
        id: 'whitelabel',
        title: 'Portaal in jouw huisstijl',
        content: (
          <>
            <P>
              In <B>Instellingen → Huisstijl</B> stel je je logo, kleuren en bedrijfsnaam in. Het portaal toont dat
              allemaal. Je klant ziet jouw merk, niet dat van doen.
            </P>
          </>
        ),
      },
    ],
  },
  {
    slug: 'projecten',
    title: 'Werken met projecten',
    category: 'Projecten',
    excerpt: 'Het project is de basis. Offerte, werkbon, factuur, klantcommunicatie: alles hangt hieraan vast.',
    updatedAt: '2026-04-23',
    readingTime: 3,
    sections: [
      {
        id: 'wat-is-project',
        title: 'Wat is een project?',
        content: (
          <>
            <P>
              Een project is een <B>verzameling van alles</B> rondom één opdracht voor één klant. Offerte, tekeningen,
              opdrachtbevestiging, planning, werkbonnen, foto's, facturen, emails en taken: alles in één dossier.
            </P>
            <P>
              Ieder project heeft een eigen pagina waar je in één oogopslag ziet wat de status is en wat er nog moet
              gebeuren.
            </P>
          </>
        ),
      },
      {
        id: 'nieuwe-project',
        title: 'Nieuw project aanmaken',
        content: (
          <>
            <P>
              Een project kan op drie manieren ontstaan:
            </P>
            <UL>
              <LI><B>Vanuit een aanvraag</B>: klant stuurt een mail, doen. koppelt 'm automatisch aan de klant en je maakt er een project van</LI>
              <LI><B>Vanuit een offerte</B>: zodra de klant akkoord geeft, wordt automatisch een project aangemaakt</LI>
              <LI><B>Handmatig</B>: via de knop "Nieuw project" in de bovenbalk</LI>
            </UL>
          </>
        ),
      },
      {
        id: 'timeline',
        title: 'Project-timeline',
        content: (
          <>
            <P>
              Elke actie op een project komt in de <B>timeline</B>: offerte verstuurd, klant akkoord, werkbon
              aangemaakt, montage ingepland, foto's geüpload, factuur verzonden, betaald. Je ziet precies wat
              wanneer gebeurde en door wie.
            </P>
            <Callout>
              Team-collega die opspringt na vakantie? De timeline vertelt wat er is gebeurd terwijl hij weg was.
              Geen lange briefings nodig.
            </Callout>
          </>
        ),
      },
    ],
  },
  {
    slug: 'planning',
    title: 'Planning: montage inplannen',
    category: 'Planning',
    excerpt: 'Sleep een project naar een dag. Werkbon hangt eraan. Monteur ziet het direct op zijn telefoon.',
    updatedAt: '2026-04-23',
    readingTime: 3,
    sections: [
      {
        id: 'weekview',
        title: 'Weekview: de kalender',
        content: (
          <>
            <P>
              Ga naar <B>Planning</B> en je ziet een weekoverzicht. Per dag zie je per monteur of ploeg wie wat
              doet. Klik op een dag voor de dag-view, of swipe per week.
            </P>
            <P>
              Wil je alleen het weekoverzicht van één monteur? Filter linksboven, handig voor 1-op-1 gesprekken.
            </P>
          </>
        ),
      },
      {
        id: 'inplannen',
        title: 'Project inplannen',
        content: (
          <>
            <P>
              Sleep een project vanuit de zijbalk naar een dag in de kalender. Wijs meteen de <B>monteurs</B> toe.
              De werkbon wordt automatisch aangemaakt met alle offerteregels en instructies.
            </P>
            <Callout>
              Plan je buiten-werk? Het <B>weerbericht</B> staat al in de kalender. Regen op woensdag? Je ziet het
              voordat je plant.
            </Callout>
          </>
        ),
      },
      {
        id: 'verplaatsen',
        title: 'Verplaatsen of herplannen',
        content: (
          <>
            <P>
              Moet een montage verschuiven? Sleep 'm naar een andere dag, de werkbon schuift mee. Monteurs krijgen
              automatisch een notificatie met de nieuwe datum en tijd. Klant ook, als je dat instelt.
            </P>
          </>
        ),
      },
      {
        id: 'verschil-taken',
        title: 'Planning vs. Taken',
        content: (
          <>
            <P>
              Planning is <B>alleen voor montage</B>: de momenten waarop je monteurs on-location werk doen. Alles
              wat náást de montage moet gebeuren (offertes opvolgen, inkoop, drukproeven) zet je in <B>Taken</B>.
            </P>
            <P>
              Meer lezen? Check het artikel <B>"Taken: alles náást de montage"</B> in deze kennisbank.
            </P>
          </>
        ),
      },
    ],
  },
  {
    slug: 'taken',
    title: 'Taken: alles náást de montage',
    category: 'Taken',
    excerpt: 'To-do-lijst per project, met eigenaar en deadline. Voor alles wat niet in de planning hoort.',
    updatedAt: '2026-04-23',
    readingTime: 2,
    sections: [
      {
        id: 'waarvoor',
        title: 'Waarvoor gebruik je Taken?',
        content: (
          <>
            <P>
              Taken is voor <B>alles wat níet de montage zelf is</B>: offertes opvolgen, inkoop regelen, drukproeven
              binnenhalen, bestanden opvragen, admin. Een to-do-lijst, maar dan gekoppeld aan het project of de klant.
            </P>
            <P>Voorbeelden:</P>
            <UL>
              <LI>Offerte van vorige week opvolgen bij klant X</LI>
              <LI>Drukproef binnenhalen bij leverancier</LI>
              <LI>Klant herinneren om huisstijl-bestanden aan te leveren</LI>
              <LI>Btw-nummer navragen bij nieuwe klant</LI>
            </UL>
          </>
        ),
      },
      {
        id: 'taak-maken',
        title: 'Taak aanmaken',
        content: (
          <>
            <P>
              Vanuit elk project of elke klant kun je een taak toevoegen. Titel, korte beschrijving, <B>eigenaar</B>
              {' '}(wie moet het doen) en <B>deadline</B>. Klaar.
            </P>
            <Callout>
              Tip: koppel een taak aan een <B>checklist</B> voor herhalende processen (bv. standaard-checklist per
              nieuwe klant). Scheelt steeds opnieuw typen.
            </Callout>
          </>
        ),
      },
      {
        id: 'notificaties',
        title: 'Notificaties en opvolging',
        content: (
          <>
            <P>
              Taken krijgen automatisch herinneringen als de deadline nadert. Is iets te laat? Je ziet het direct op
              je dashboard, gekleurd naar prioriteit.
            </P>
          </>
        ),
      },
    ],
  },
  {
    slug: 'werkbonnen',
    title: 'Werkbonnen op de telefoon',
    category: 'Werkbonnen',
    excerpt: 'Alle offerteregels automatisch op de werkbon. Monteur opent telefoon, registreert alles, klaar.',
    updatedAt: '2026-04-23',
    readingTime: 3,
    sections: [
      {
        id: 'automatisch',
        title: 'Automatisch vanuit de offerte',
        content: (
          <>
            <P>
              Een werkbon maak je niet handmatig. Zodra een project ingepland staat, wordt de werkbon automatisch
              gegenereerd met <B>alle offerteregels, instructies, adressen en contactpersonen</B>. Je monteur krijgt
              hem op zijn telefoon.
            </P>
          </>
        ),
      },
      {
        id: 'op-locatie',
        title: 'Werkbon op locatie',
        content: (
          <>
            <P>
              Op de montage-plek opent je monteur de werkbon. Hij kan direct:
            </P>
            <UL>
              <LI><B>Uren registreren</B> met start/stop-knop</LI>
              <LI><B>Foto's maken</B> van het werk (voor, tijdens, na)</LI>
              <LI><B>Opmerkingen toevoegen</B> per onderdeel</LI>
              <LI><B>Materiaal bijbestellen</B> als blijkt dat er meer nodig is</LI>
              <LI><B>Klant laten tekenen</B>: digitale handtekening op het scherm</LI>
            </UL>
          </>
        ),
      },
      {
        id: 'terug',
        title: 'Alles automatisch terug in doen.',
        content: (
          <>
            <P>
              Foto's, uren, handtekening: alles komt <B>direct terug in het project</B>. Geen losse mappen, geen
              "stuur even door", geen rommel. Jij op kantoor ziet live wat er gebeurt.
            </P>
          </>
        ),
      },
    ],
  },
  {
    slug: 'facturen',
    title: 'Facturen: verkoop en inkoop',
    category: 'Facturen',
    excerpt: 'Verkoopfacturen vanuit offerte, Mollie-betaallink, Exact-sync. Inkoopfacturen via aparte mailbox.',
    updatedAt: '2026-04-23',
    readingTime: 4,
    sections: [
      {
        id: 'verkoop',
        title: 'Verkoopfacturen',
        content: (
          <>
            <P>
              Offerte goedgekeurd en werk gedaan? <B>Factuur staat klaar</B>, in één klik vanuit de offerte of vanaf
              scratch. Mollie-betaallink automatisch mee, klant betaalt direct via iDEAL of creditcard.
            </P>
            <Callout>
              <B>Niet op tijd betaald?</B> doen. herinnert automatisch op het moment dat jij instelt (standaard: 7 en
              14 dagen na de vervaldatum). Je klant krijgt de herinnering vanaf jouw eigen domein, niet vanaf doen.team.
            </Callout>
          </>
        ),
      },
      {
        id: 'exact',
        title: 'Koppeling met Exact Online',
        content: (
          <>
            <P>
              Factuurgegevens <B>gaan rechtstreeks van doen. naar Exact Online</B>, one-way. Je boekhouder hoeft
              niks dubbel in te voeren. Dagboeken, grootboekrekeningen, btw-codes: allemaal automatisch.
            </P>
            <P>
              Let op: <B>betaalstatus komt niet automatisch terug</B> vanuit Exact. Zodra jij het geld binnen ziet
              komen, vink je de factuur in doen. zelf af als betaald.
            </P>
          </>
        ),
      },
      {
        id: 'inkoop',
        title: 'Inkoopfacturen',
        content: (
          <>
            <P>
              Je leveranciers mailen vaak facturen als PDF. doen. geeft je een <B>aparte mailbox</B> (bv.{' '}
              <B>inkoop@jouwbedrijf.doen.team</B>) waar je leveranciers hun facturen naar kunnen sturen. Eén adres,
              één inbox voor alle inkoopfacturen.
            </P>
            <P>
              Inkomende PDFs worden automatisch uitgelezen: leverancier, bedrag, btw, factuurdatum. Je personeel
              <B> keurt goed of wijst af</B> met één klik. Goedgekeurde facturen komen op de openstaande-posten-lijst
              en kun je in je boekhouding inboeken.
            </P>
          </>
        ),
      },
      {
        id: 'overzicht',
        title: 'Overzicht: wat staat open',
        content: (
          <>
            <P>
              In je dashboard zie je in één blok hoeveel <B>openstaande verkoopfacturen</B> je hebt, en hoeveel
              <B> openstaande inkoopfacturen</B> wachten op goedkeuring. Gekleurd naar leeftijd: rood als het te
              lang duurt.
            </P>
          </>
        ),
      },
    ],
  },
  {
    slug: 'visualizer',
    title: 'Studio: AI-impressies',
    category: 'Studio',
    excerpt: 'Upload een schets, Studio maakt er een realistische visualisatie van. Draait op Nano Banana 2.',
    updatedAt: '2026-04-23',
    readingTime: 2,
    sections: [
      {
        id: 'wat-is-het',
        title: 'Wat is Studio?',
        content: (
          <>
            <P>
              Upload een foto of schets van een locatie, beschrijf wat er moet komen (*"rood-witte gevelreclame
              met LED-verlichting"*), en Studio genereert een <B>realistische visualisatie</B> van het
              eindresultaat.
            </P>
            <P>
              Werkt voor autobelettering, gevelreclame, lichtreclame, raamstickers, signing-borden, wrapping, in
              principe alles wat jullie maken.
            </P>
          </>
        ),
      },
      {
        id: 'credits',
        title: 'Hoe de credits werken',
        content: (
          <>
            <P>
              Elke visualisatie kost <B>1 credit</B>. Je begint met <B>10 credits inbegrepen</B> in je abonnement.
              Meer nodig? Koop een <B>credit-pack</B> bij: 50 credits, 100 credits, of een groot pak. Credits
              verlopen niet.
            </P>
            <Callout>
              Credits worden gedeeld binnen je team. Een collega die een credit gebruikt, haalt 'm van het
              gezamenlijke saldo.
            </Callout>
          </>
        ),
      },
      {
        id: 'model',
        title: 'Welk AI-model?',
        content: (
          <>
            <P>
              Studio draait op <B>Nano Banana 2</B>, Google's image-generation model. Claude Sonnet 4.6
              verbetert eerst je tekstuele input voordat het naar Nano Banana gaat, zodat je resultaten consistenter
              zijn.
            </P>
          </>
        ),
      },
      {
        id: 'delen',
        title: 'Koppelen aan project of offerte',
        content: (
          <>
            <P>
              Elke visualisatie kun je <B>koppelen aan een project of offerte</B>. Zo kun je 'm via het portaal
              delen met je klant, handig als verkoop-argument vooraf. Klant ziet het eindresultaat voordat je
              aan de slag gaat.
            </P>
          </>
        ),
      },
    ],
  },
  {
    slug: 'daan-ai',
    title: 'Daan: de AI-assistent',
    category: 'AI-assistent',
    excerpt: 'Daan kent je data. Schrijft teksten, vat mails samen, rekent vierkante meters uit. Draait op Claude Sonnet 4.6.',
    updatedAt: '2026-04-23',
    readingTime: 3,
    sections: [
      {
        id: 'wie-is-daan',
        title: 'Wie is Daan?',
        content: (
          <>
            <P>
              Daan is doen.'s ingebouwde <B>AI-assistent</B>. Hij draait op <B>Claude Sonnet 4.6</B> en heeft directe
              toegang tot jouw bedrijfsdata: klanten, projecten, offertes, facturen, mails.
            </P>
            <P>
              Dat betekent: als je hem vraagt <B>"hoeveel staat er open bij Bakker BV?"</B>, kan hij het echte antwoord
              geven. Geen algemene kul, jouw data.
            </P>
          </>
        ),
      },
      {
        id: 'wat-kan-hij',
        title: 'Wat kan Daan doen?',
        content: (
          <>
            <UL>
              <LI><B>Offerteteksten schrijven</B>: op basis van je notitie maakt hij een professionele beschrijving</LI>
              <LI><B>Mails samenvatten</B>: 20 mails lang? Daan geeft de kern in 3 regels</LI>
              <LI><B>Data-vragen beantwoorden</B>: "wie is mijn grootste klant dit kwartaal?"</LI>
              <LI><B>Calculaties</B>: vierkante meters, hoeveelheden materiaal, marges</LI>
              <LI><B>Teksten verbeteren</B>: selecteer en Daan herschrijft korter, professioneler of informeler</LI>
              <LI><B>Vertalingen</B>: Nederlands ↔ Engels voor internationale klanten</LI>
            </UL>
          </>
        ),
      },
      {
        id: 'hoe-gebruik',
        title: 'Hoe gebruik je Daan?',
        content: (
          <>
            <P>
              Daan zit <B>overal in doen.</B>: in een drijvende knop rechtsonder, in elk tekstveld met een klein
              magische-wand-icoon, in het dashboard als chat. Vraag wat je wilt, wanneer je wilt.
            </P>
            <Callout>
              Daan leert mee met jouw bedrijf. Hoe vaker je hem gebruikt, hoe beter hij jouw tone-of-voice en
              klant-voorkeuren begrijpt.
            </Callout>
          </>
        ),
      },
      {
        id: 'privacy',
        title: 'Privacy en veiligheid',
        content: (
          <>
            <P>
              Jouw data gaat <B>nooit</B> naar het AI-model om hem te trainen. Daan gebruikt je data alleen om jouw
              vragen te beantwoorden. Conversaties worden niet gedeeld tussen bedrijven, ieder bedrijf heeft zijn
              eigen Daan.
            </P>
          </>
        ),
      },
    ],
  },
  {
    slug: 'email-koppelen',
    title: 'Email koppelen aan doen.',
    category: 'Email',
    excerpt: 'Je eigen zakelijke mailbox aan doen. hangen. IMAP/SMTP, per gebruiker, 5 minuten werk.',
    updatedAt: '2026-04-23',
    readingTime: 4,
    sections: [
      {
        id: 'waarom',
        title: 'Waarom je mailbox koppelen?',
        content: (
          <>
            <P>
              Als je je zakelijke mailbox koppelt, worden <B>inkomende en verzonden mails automatisch gekoppeld aan de
              juiste klant en het juiste project</B>. Je collega's zien wat er is besproken, niemand antwoordt dubbel,
              niks raakt kwijt.
            </P>
            <Callout>
              Belangrijk: iedere gebruiker koppelt zijn <B>eigen mailbox</B>. Je privé-inbox blijft privé. Alleen
              mails die bij een klant of project horen worden in de projectcontext zichtbaar voor je team.
            </Callout>
          </>
        ),
      },
      {
        id: 'voorbereiding',
        title: 'Voorbereiding: app-wachtwoord',
        content: (
          <>
            <P>
              Voor Google-, Microsoft- en andere zakelijke mailboxen heb je meestal een <B>app-wachtwoord</B> nodig
              (niet je gewone inlogwachtwoord). Dit is veiliger, zo kan doen. alleen bij je mail, niets anders.
            </P>
            <UL>
              <LI><B>Google Workspace</B>: Account → Beveiliging → App-wachtwoorden</LI>
              <LI><B>Microsoft 365</B>: Account → Beveiliging → App-wachtwoord aanmaken</LI>
              <LI><B>Eigen hosting</B>: vraag je hostingpartij om IMAP/SMTP-gegevens</LI>
            </UL>
          </>
        ),
      },
      {
        id: 'koppelen',
        title: 'Koppelen in doen.',
        content: (
          <>
            <P>
              Ga naar <B>Instellingen → Email</B>. Kies je provider (Google, Microsoft, anders) en vul in:
            </P>
            <UL>
              <LI>Je emailadres</LI>
              <LI>Je app-wachtwoord</LI>
              <LI>IMAP-server (automatisch voor Google/Microsoft)</LI>
              <LI>SMTP-server (automatisch voor Google/Microsoft)</LI>
            </UL>
            <P>
              doen. test de verbinding. Als 'm werkt, krijg je een groen vinkje. Inkomende mail wordt vanaf nu
              gesynchroniseerd naar je doen.-inbox.
            </P>
          </>
        ),
      },
      {
        id: 'hoe-koppeling-werkt',
        title: 'Hoe de koppeling werkt',
        content: (
          <>
            <P>
              Mails worden <B>automatisch gekoppeld aan de juiste klant</B> op basis van het emailadres van de
              afzender. Als er een project met die klant open staat, komt de mail ook op de project-timeline.
            </P>
            <P>
              Verzonden mails via doen. (bijvoorbeeld een offerte-herinnering) gaan <B>vanaf jouw eigen domein</B>.
              De klant ziet dus jouw naam en emailadres als afzender, niet "noreply@doen.team".
            </P>
          </>
        ),
      },
      {
        id: 'privacy',
        title: 'Privacy: wat ziet mijn team?',
        content: (
          <>
            <P>
              Je team ziet <B>alleen</B> mails die bij een klant of project horen, via de project-timeline. Alle
              andere mail in je inbox (vrienden, onze jubileum-uitnodiging, nieuwsbrieven) blijft in je eigen
              privé-inbox. Niemand anders ziet die.
            </P>
            <P>Dit is bewust zo gebouwd. Jouw mail is jouw mail.</P>
          </>
        ),
      },
    ],
  },

  /* ── Vakkennis — voor signmakers die zich oriënteren ── */
  {
    slug: 'wat-kost-software-voor-een-signbedrijf',
    title: 'Wat kost software voor een signbedrijf?',
    category: 'Vakkennis',
    excerpt:
      'Per gebruiker of flat, opzetkosten, add-ons: zo lees je de tarieven van bedrijfssoftware voor de signbranche, en dit betaal je echt.',
    updatedAt: '2026-07-07',
    readingTime: 6,
    sections: [
      {
        id: 'prijsmodellen',
        title: 'Twee prijsmodellen: per gebruiker of flat',
        content: (
          <>
            <P>
              Bijna alle bedrijfssoftware voor de signbranche werkt met een van twee modellen.
              <B> Per gebruiker</B>: je betaalt een bedrag per persoon per maand. Gangbare
              branchesoftware zit al snel boven de €100 per gebruiker per maand. <B>Flat</B>:
              één vaste prijs voor je hele team, ongeact hoeveel mensen meedoen.
            </P>
            <P>
              Het verschil lijkt klein, maar bepaalt hoe je met de software omgaat. Bij een
              prijs per gebruiker ga je rekenen: krijgt de monteur wél een account, de
              zaterdaghulp niet? Dan belandt de werkbon alsnog op papier en ben je het
              overzicht kwijt waar je juist voor betaalde.
            </P>
            <Callout>
              Vuistregel: reken een prijs per gebruiker altijd om naar je héle team, inclusief
              monteurs. Vijf mensen × €100 is €500 per maand, €6.000 per jaar.
            </Callout>
          </>
        ),
      },
      {
        id: 'opzetkosten',
        title: 'Opzetkosten en onboarding',
        content: (
          <>
            <P>
              Naast het abonnement rekenen veel pakketten <B>eenmalige opzetkosten</B> voor
              installatie, migratie en training. In de signbranche lopen die uiteen van een
              paar honderd tot enkele duizenden euro's, afhankelijk van het pakket.
            </P>
            <P>
              Vraag altijd wat er precies in die opzetkosten zit. Migratie van je klanten en
              producten? Training voor het hele team, of alleen voor jou? En wat kost het als
              je er later een collega bij traint?
            </P>
          </>
        ),
      },
      {
        id: 'verborgen-kosten',
        title: 'De checklist tegen verborgen kosten',
        content: (
          <>
            <P>Stel deze vragen voordat je tekent:</P>
            <UL>
              <LI>Zit het <B>klantportaal</B> erin, of is dat een add-on?</LI>
              <LI>Betaal je extra voor <B>koppelingen</B> met je boekhoudpakket of betaalprovider?</LI>
              <LI>Wat kost een <B>extra gebruiker</B> als je groeit?</LI>
              <LI>Is er een <B>jaarcontract</B>, of kun je maandelijks opzeggen?</LI>
              <LI>Kun je je <B>data exporteren</B> als je weggaat, en wat kost dat?</LI>
            </UL>
          </>
        ),
      },
      {
        id: 'wat-doen-kost',
        title: 'Wat doen. kost',
        content: (
          <>
            <P>
              Wij geloven in één simpele som: <B>€79 per maand ex. btw</B>, flat, tot 10
              gebruikers. Geen opzetkosten, geen add-ons, alle 10 modules en de AI-assistent
              inbegrepen. Maandelijks opzegbaar.
            </P>
            <P>
              De volledige opbouw staat op de{' '}
              <a href="/prijzen" style={{ color: '#1A535C', textDecoration: 'underline' }}>
                prijzenpagina
              </a>
              , en wie doen. naast James PRO wil leggen vindt de feiten op de{' '}
              <a href="/vergelijk/james-pro" style={{ color: '#1A535C', textDecoration: 'underline' }}>
                vergelijkingspagina
              </a>
              .
            </P>
          </>
        ),
      },
    ],
  },
  {
    slug: 'offerte-maken-gevelreclame',
    title: 'Offerte maken voor gevelreclame: zo calculeer je',
    category: 'Vakkennis',
    excerpt:
      'Van m²-prijs tot hoogwerker: welke posten horen in een offerte voor gevelreclame, hoe bewaak je je marge en hoe krijg je sneller akkoord.',
    updatedAt: '2026-07-07',
    readingTime: 7,
    sections: [
      {
        id: 'de-posten',
        title: 'Welke posten horen erin',
        content: (
          <>
            <P>
              Een offerte voor gevelreclame is meer dan een m²-prijs. De posten die je niet
              opneemt, betaal je zelf:
            </P>
            <UL>
              <LI><B>Materiaal</B>: panelen, folie, doosletters, LED-modules, bevestiging.</LI>
              <LI><B>Productie</B>: print-, frees- of zetwerk, confectie, laminaat.</LI>
              <LI><B>Voorbereiding</B>: ontwerp of aanpassing, drukproef, schouwen op locatie.</LI>
              <LI><B>Montage</B>: uren × mensen, plus reistijd.</LI>
              <LI><B>Materieel</B>: hoogwerker of steiger, en wie die huurt.</LI>
              <LI><B>Onvoorzien</B>: gevelstaat, boren in beton, parkeerontheffing.</LI>
            </UL>
            <Callout tone="warning">
              Check bij grotere gevelreclame altijd of er een <B>omgevingsvergunning</B> nodig
              is. Gemeenten verschillen; leg in je offerte vast wie de aanvraag doet en dat
              levertijd pas loopt na vergunning.
            </Callout>
          </>
        ),
      },
      {
        id: 'calculeren',
        title: 'Calculeren: van inkoop naar verkoopprijs',
        content: (
          <>
            <P>
              De veiligste route is calculeren vanuit <B>inkoopprijs plus marge per post</B>,
              niet vanuit één totaalprijs die "wel goed voelt". Materiaal heeft een andere
              marge dan montage-uren; wie alles op één hoop gooit, ziet nooit welke klussen
              geld opleveren en welke niet.
            </P>
            <P>
              Werk met <B>templates per producttype</B> (gevelbord, doosletters, lichtbak)
              waarin je opbouw en marges al staan. Dan is een nieuwe offerte een kwestie van
              maten en aantallen invullen, en klopt de marge automatisch.
            </P>
          </>
        ),
      },
      {
        id: 'sneller-akkoord',
        title: 'Sneller akkoord krijgen',
        content: (
          <>
            <P>
              De meeste offertes sterven niet aan de prijs, maar aan <B>stilte</B>. De klant
              heeft nog een vraag, de mail zakt weg, en drie weken later is het momentum weg.
            </P>
            <UL>
              <LI>Stuur de <B>drukproef of visual mee</B>, een klant tekent voor wat hij ziet.</LI>
              <LI>Maak akkoord geven <B>één klik</B>, geen print-, teken- en scanwerk.</LI>
              <LI>Volg <B>binnen een week</B> op, en daarna nog een keer. Automatisch als het kan.</LI>
            </UL>
            <P>
              In doen. keurt je klant de offerte en de tekening goed via het{' '}
              <a href="/features/portaal" style={{ color: '#1A535C', textDecoration: 'underline' }}>
                klantportaal
              </a>{' '}
              (één link, geen inlog) en herinnert het systeem hem eraan als hij niet reageert.
            </P>
          </>
        ),
      },
      {
        id: 'veelgemaakte-fouten',
        title: 'Veelgemaakte fouten',
        content: (
          <>
            <UL>
              <LI>Reistijd en <B>tweede montagedag</B> vergeten bij tegenslag op locatie.</LI>
              <LI>Hoogwerker <B>per dag</B> gehuurd, maar <B>per klus</B> gecalculeerd.</LI>
              <LI>Geen <B>geldigheidsdatum</B> op de offerte, materiaalprijzen bewegen.</LI>
              <LI>Akkoord per appje geaccepteerd <B>zonder versienummer</B> van het ontwerp.</LI>
            </UL>
          </>
        ),
      },
    ],
  },
  {
    slug: 'werkbon-app-kiezen',
    title: 'Een werkbon-app kiezen: waar let je op?',
    category: 'Vakkennis',
    excerpt:
      'Digitale werkbonnen voor je monteurs: welke functies zijn onmisbaar, en wanneer kies je een losse werkbon-app of een geïntegreerd systeem?',
    updatedAt: '2026-07-07',
    readingTime: 5,
    sections: [
      {
        id: 'waarom-digitaal',
        title: 'Waarom papier je geld kost',
        content: (
          <>
            <P>
              Een papieren werkbon lijkt gratis, maar je betaalt hem drie keer: de monteur
              belt om te vragen wat er ook alweer moest gebeuren, de uren komen op vrijdag
              uit het hoofd, en de foto's van de oplevering staan op iemands privételefoon.
            </P>
            <P>
              Een goede werkbon-app draait dat om: de monteur <B>ziet zijn klus op zijn
              telefoon</B>, legt uren en foto's vast op het moment zelf, en kantoor ziet het
              live terug.
            </P>
          </>
        ),
      },
      {
        id: 'checklist',
        title: 'De checklist',
        content: (
          <>
            <UL>
              <LI><B>Telefoon-eerst</B>: geen app die eigenlijk een website voor desktop is.</LI>
              <LI><B>Foto's bij de bon</B>: voor, tijdens en na, direct in het project.</LI>
              <LI><B>Digitale handtekening</B> van de klant op locatie.</LI>
              <LI><B>Urenregistratie</B> per klus, zonder los briefje.</LI>
              <LI><B>Gekoppeld aan de planning</B>: verschuift de klus, dan verschuift de bon.</LI>
              <LI><B>Doorstroom naar de factuur</B>: getekende bon erbij, discussie voorbij.</LI>
            </UL>
          </>
        ),
      },
      {
        id: 'los-of-geintegreerd',
        title: 'Losse app of geïntegreerd systeem?',
        content: (
          <>
            <P>
              Losse werkbon-apps zijn er genoeg, en ze doen het bon-gedeelte vaak prima. Het
              probleem zit in wat eromheen gebeurt: de klus staat in je planning, de
              afspraken staan in de offerte, en de factuur moet erna. Met een losse app ben
              jij de koppeling, elke dag opnieuw.
            </P>
            <P>
              In een geïntegreerd systeem zoals doen. <B>ontstaat de werkbon uit de
              planning</B> en staat erop wat er in de offerte is verkocht. Wat de monteur
              vastlegt, zit meteen in het project, zie de{' '}
              <a href="/features/werkbonnen" style={{ color: '#1A535C', textDecoration: 'underline' }}>
                werkbonnen-module
              </a>
              .
            </P>
            <Callout>
              Test welke route je ook kiest één ding in de proefperiode: laat je monteur een
              échte klus afronden op zijn eigen telefoon. Als dat wringt, wringt de rest ook.
            </Callout>
          </>
        ),
      },
    ],
  },
]

/* ═══════════════════════════════════════════════════════════ */

export function getArticleBySlug(slug: string): Article | undefined {
  return articles.find((a) => a.slug === slug)
}

export function getArticlesByCategory(category: Category): Article[] {
  return articles.filter((a) => a.category === category)
}

export function getAllCategoriesWithArticles(): { category: Category; articles: Article[] }[] {
  return CATEGORY_ORDER.map((category) => ({
    category,
    articles: articles.filter((a) => a.category === category),
  })).filter((g) => g.articles.length > 0)
}
