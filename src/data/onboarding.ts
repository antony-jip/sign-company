// Eén bron voor de onboarding-propositie: gebruikt door de sectie op
// /prijzen, de losse regel op /contact, /demo en /hoe-het-werkt, en de
// FAQ-antwoorden.
//
// Twee routes, bewust in deze volgorde: online is gratis en dekt verreweg
// de meeste bedrijven. Langskomen is een extra dienst, geen opstartkost,
// want anders klopt de claim "geen opzetkosten" op /prijzen niet meer.
//
// LET OP bij het herschrijven van deze teksten: de onboarding is UITLEG.
// Wij vullen het bedrijf niet voor de klant in. Producten, marges en
// calculaties zet de klant zelf op, want dat is zijn vak en zijn prijsbeleid.
// Beloof hier dus nooit "wij zetten je producten erin".

export const ONBOARDING_OP_LOCATIE_PRIJS = 250

export type OnboardingRoute = {
  titel: string
  prijs: string
  icoon: 'scherm' | 'bus'
  punten: string[]
}

export const onboardingRoutes: OnboardingRoute[] = [
  {
    titel: 'Online',
    prijs: 'Gratis',
    icoon: 'scherm',
    punten: ['Een uur scherm-delen', 'Elke module doorgelopen', 'Je vragen meteen beantwoord'],
  },
  {
    titel: 'Bij jou op de zaak',
    prijs: `€ ${ONBOARDING_OP_LOCATIE_PRIJS} ex btw, plus reis`,
    icoon: 'bus',
    punten: ['Alles van online', 'Je hele team tegelijk', 'Eenmalig, geen abonnement'],
  },
]
