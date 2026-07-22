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
