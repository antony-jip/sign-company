// Mijlpalen die je maar een keer haalt (eerste klant, eerste verstuurde
// offerte). Via een kleine bus zodat het vieren losstaat van het scherm dat de
// actie doet: dialogen sluiten of unmounten vaak direct na succes.

export interface Mijlpaal {
  titel: string
  tekst?: string
}

type Luisteraar = (m: Mijlpaal) => void

const luisteraars = new Set<Luisteraar>()

export function vierMijlpaal(mijlpaal: Mijlpaal): void {
  luisteraars.forEach(fn => fn(mijlpaal))
}

export function opMijlpaal(fn: Luisteraar): () => void {
  luisteraars.add(fn)
  return () => { luisteraars.delete(fn) }
}

/**
 * Markeert een eenmalige mijlpaal per gebruiker. Geeft `true` terug als dit de
 * eerste keer is; daarna nooit meer. De sleutel volgt de doen_-conventie.
 */
export function markeerEenmalig(sleutel: string): boolean {
  const key = `doen_mijlpaal_${sleutel}`
  try {
    if (localStorage.getItem(key)) return false
    localStorage.setItem(key, '1')
    return true
  } catch {
    // Private mode of storage vol: dan liever niet vieren dan crashen.
    return false
  }
}

/** Kijkt of een mijlpaal al gemarkeerd is, zonder hem te zetten. Handig als
 * de "is dit echt de eerste?"-check een fetch kost: die sla je dan over. */
export function isMijlpaalGehaald(sleutel: string): boolean {
  try {
    return localStorage.getItem(`doen_mijlpaal_${sleutel}`) !== null
  } catch {
    return true
  }
}

/**
 * Zet de marker en viert alleen als dit aantoonbaar de eerste is. Bestaande
 * gebruikers (of een nieuw apparaat) krijgen zo geen "eerste keer"-confetti
 * voor iets dat ze al honderd keer deden: de marker wordt dan stil gezet.
 * Geeft terug of er gevierd is, zodat de aanroeper zijn gewone toast kan tonen.
 */
export function vierEenmalig(sleutel: string, isEerste: boolean, mijlpaal: Mijlpaal): boolean {
  if (!markeerEenmalig(sleutel)) return false
  if (!isEerste) return false
  vierMijlpaal(mijlpaal)
  return true
}

/** Centrale copy zodat meerdere schermen dezelfde mijlpaal identiek vieren. */
export const MIJLPAAL_COPY = {
  eerste_offerte_akkoord: {
    titel: 'Je eerste akkoord is binnen',
    tekst: 'Je klant zei ja. Vanaf hier maak je er met een paar klikken een factuur of project van.',
  },
  eerste_factuur: {
    titel: 'Je eerste factuur staat klaar',
    tekst: 'Verstuur hem direct, of laat je klant online betalen via de betaallink.',
  },
  eerste_betaling: {
    titel: 'Je eerste betaling is binnen',
    tekst: 'Offerte, factuur, betaald. De hele cirkel rond, op één plek.',
  },
} satisfies Record<string, Mijlpaal>
