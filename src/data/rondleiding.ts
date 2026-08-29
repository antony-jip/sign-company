/* Wat er in een rondleiding gebeurt, op één plek.

   Reden voor deze pagina: "Plan een rondleiding" ging rechtstreeks naar het
   contactformulier. Wie doen. nog niet kent klikt dan op een knop zonder te
   weten wie hij aan de lijn krijgt, wat er langskomt en wat het hem oplevert.
   Dat is precies de drempel waar een eigenaar op afhaakt.

   Toon: vaktaal en concrete klussen (doosletters, hoogwerker, drukproef),
   geen software-woorden. Elk punt eindigt in wat het hém scheelt. */

export const RONDLEIDING_DUUR = '30 minuten'

export const RONDLEIDING_ZEKERHEDEN = [
  { label: RONDLEIDING_DUUR, note: 'niet langer, we houden de klok in de gaten' },
  { label: 'Online, scherm delen', note: 'of we komen langs, dat mag je zeggen' },
  { label: 'Gratis en vrijblijvend', note: 'geen offerte achteraf, geen account nodig' },
  { label: 'Je spreekt Antony', note: 'de maker zelf, geen accountmanager' },
]

export type Agendapunt = {
  minuten: string
  titel: string
  tekst: string
}

/** Wat we in dat half uur doorlopen, in de volgorde waarin een klus loopt. */
export const RONDLEIDING_AGENDA: Agendapunt[] = [
  {
    minuten: '5 min',
    titel: 'Eerst jouw week',
    tekst:
      'Je vertelt hoe een aanvraag nu binnenkomt en wat er daarna gebeurt. Waar het blijft hangen, waar je dingen twee keer intikt. De rest van het half uur gaat over jouw manier van werken, niet over onze schermen.',
  },
  {
    minuten: '5 min',
    titel: 'Van mail naar project',
    tekst:
      'Een aanvraag voor gevelletters komt binnen in de mailbox. Eén klik en de klus staat: klant, contactpersoon en de hele mailwisseling eronder. Je zoekt nooit meer terug wie wat beloofd heeft.',
  },
  {
    minuten: '5 min',
    titel: 'De offerte, met marge en uren',
    tekst:
      'We rekenen een klus na die jij kent: acht meter doosletters, hoogwerker, montage op sluitingsdag. Inkoop, verkoop en marge lopen live mee, dus je ziet meteen of er nog wat aan verdiend wordt.',
  },
  {
    minuten: '5 min',
    titel: 'Drukproef en klantportaal',
    tekst:
      'De klant krijgt één link, ziet de tekening en keurt zelf goed. Versies staan op volgorde, dus je weet altijd wat er ligt. Dat scheelt de mailtjes heen en weer over welke proef nou de laatste was.',
  },
  {
    minuten: '5 min',
    titel: 'Planning en werkbon',
    tekst:
      'De montage schuif je de week in. De monteur ziet hem op zijn telefoon, tekent af op locatie en zijn foto’s staan direct bij het project. Geen belletje meer vanaf de steiger om te vragen wat er ook alweer moest.',
  },
  {
    minuten: '5 min',
    titel: 'Factuur, betaling en boekhouding',
    tekst:
      'De factuur rolt uit de offerte, met betaallink erin. De gegevens gaan door naar Exact Online en de afgeletterde betaalstand komt vanzelf terug. Je ziet in één blik wie nog moet betalen.',
  },
]

export type Opbrengst = {
  titel: string
  tekst: string
}

/** Wat de bezoeker eraan overhoudt. Uitkomsten, geen functies. */
export const RONDLEIDING_OPBRENGST: Opbrengst[] = [
  {
    titel: 'Je weet vandaag of het past',
    tekst:
      'Geen tweede gesprek, geen offertetraject. Aan het eind van het half uur weet je of doen. bij jouw manier van werken past. Past het niet, dan zeggen we dat gewoon.',
  },
  {
    titel: 'Je ziet je eigen soort klus',
    tekst:
      'We pakken geen verzonnen demobedrijf erbij, maar een klus zoals jij ze draait. Herken je de calculatie niet, dan heb je er ook niks aan.',
  },
  {
    titel: 'Je weet waar je uren weglekken',
    tekst:
      'Uit het eerste kwartier komt bijna altijd hetzelfde: dubbel intikken, zoeken naar de laatste versie, achter goedkeuring aanbellen. Je krijgt te horen waar dat bij jou zit, ook als je niets bij ons afneemt.',
  },
  {
    titel: 'Je weet wat de overstap kost',
    tekst:
      'In geld en in tijd. Wat je per maand kwijt bent, wat de onboarding doet, wat wij overzetten en op welke maandag je erop kunt draaien.',
  },
]

export type Bezwaar = {
  vraag: string
  antwoord: string
}

/* De drie dingen die een eigenaar denkt maar niet vraagt. Ze staan hier
   omdat een scepticus die ze niet beantwoord ziet, aanneemt dat het
   antwoord hem niet bevalt. De prijs staat er met opzet vóór het gesprek:
   niets jaagt iemand harder weg dan het idee dat hij een half uur moet
   zitten om te horen wat het kost. */
export const RONDLEIDING_BEZWAREN: Bezwaar[] = [
  {
    vraag: 'Krijg ik de prijs pas te horen in het gesprek?',
    antwoord:
      'Nee, die staat gewoon op de site. Vanaf € 129 per maand ex btw, all-in en niet per gebruiker, maandelijks opzegbaar. Je hoeft niet te bellen om te weten waar je aan toe bent.',
  },
  {
    vraag: 'Moet ik dan in één weekend om?',
    antwoord:
      'Nee. Je oude systeem hoeft er op dag één niet uit. Stuur ons een export van je klanten en producten, dan zetten wij die erin. De onboarding is gratis en duurt ongeveer een uur.',
  },
  {
    vraag: 'Word ik daarna nagebeld?',
    antwoord:
      'Nee. Je krijgt één mail met wat je gezien hebt en wat het kost. Daarna hoor je niets meer, tenzij je zelf van je laat horen. Geen belrondje, geen tweede afspraak die je niet gevraagd hebt.',
  },
]

/* Jezelf diskwalificeren werkt bij een scepticus beter dan nog een
   voordeel. Alleen dingen opschrijven die echt waar zijn. */
export const RONDLEIDING_NIET_VOOR_JOU = [
  'Je zoekt een boekhoudpakket. doen. rekent en factureert, maar je boekhouding blijft in Exact, Moneybird of e-Boekhouden staan.',
  'Je werkt in je eentje en je Excel doet precies wat je wil. Dan levert een systeem je vooral werk op.',
  'Je wil je huidige pakket exact nagebouwd hebben. Dat gaan we niet doen, en dat zou je ook niet moeten willen.',
  'Je monteurs komen er niet aan te pas. Zonder de mensen op de bus valt de helft van de winst weg.',
]
