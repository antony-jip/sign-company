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
