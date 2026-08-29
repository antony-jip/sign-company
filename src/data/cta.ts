/* Eén plek voor het tweede CTA-spoor.

   De site had alleen "Start gratis". Voor een eigenaar die om drie uur op een
   steiger staat is een proefaccount een drempel en dertig minuten schermdelen
   niet. Kit.com zet "Request a demo" overal naast de trial; dit is de
   Nederlandse variant daarvan.

   De knop gaat naar /demo-plannen: daar staat met wie je zit, wat we in dat
   half uur doorlopen en wat het oplevert, met het formulier onderaan. Niet
   /rondleiding: dat pad staat in next.config.js als permanente redirect naar
   /features, en zo'n 308 blijft in browsers hangen. Wie nog binnenkomt op
   /contact?over=rondleiding (oude mails, bookmarks) krijgt daar de
   voorinvulling hieronder, zie ContactContent. */

export const RONDLEIDING_HREF = '/demo-plannen'
export const RONDLEIDING_LABEL = 'Plan een rondleiding'

/** Prefill die het contactformulier invult bij ?over=rondleiding */
export const RONDLEIDING_BERICHT =
  'Ik wil graag een rondleiding door doen. Wanneer schikt het?'

/** Proof-regel onder de CTA's. Onboarding is het echte bezwaar bij overstappen. */
export const ZEKERHEID_REGEL = '30 dagen gratis · geen creditcard · wij zetten je gegevens erover'
