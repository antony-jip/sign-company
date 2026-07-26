import { useEffect, useRef } from 'react'
import { useTabs } from '@/contexts/TabsContext'

/**
 * Bewaart de invoer van een scherm per tabblad.
 *
 * Alleen het actieve tabblad is gemount: van tabblad wisselen unmount je
 * hele scherm, en alles wat nog niet in de database staat is dan weg. Deze
 * hook maakt bij het unmounten een momentopname en zet die terug zodra je
 * op dat tabblad terugkomt — half ingevulde formulieren overleven zo een
 * uitstapje naar een andere tab.
 *
 * `maak` geeft `null` terug wanneer er niets bewaard hoeft te worden (leeg
 * of net opgeslagen); de opgeslagen momentopname wordt dan opgeruimd. Dat is
 * het enige signaal dat de hook nodig heeft — er is geen aparte dirty-vlag.
 *
 * De opslag zit in sessionStorage: hij hoort bij dit browservenster en is
 * na het sluiten weg. Dat is bewust — een concept van vorige week terug
 * krijgen zou verwarrender zijn dan het kwijt zijn.
 */
export function useTabSnapshot<T>(
  naam: string,
  maak: () => T | null,
  herstel: (momentopname: T) => void,
) {
  const { activeTabId } = useTabs()

  // Beide callbacks in een ref: de effect-body mag niet opnieuw draaien als
  // de closure ververst, anders herstelt hij bij elke render opnieuw.
  const maakRef = useRef(maak)
  maakRef.current = maak
  const herstelRef = useRef(herstel)
  herstelRef.current = herstel

  useEffect(() => {
    if (!activeTabId) return
    const sleutel = snapshotSleutel(activeTabId, naam)

    try {
      const rauw = sessionStorage.getItem(sleutel)
      if (rauw) herstelRef.current(JSON.parse(rauw) as T)
    } catch {
      /* onleesbaar of geen storage · begin gewoon leeg */
    }

    return () => {
      try {
        const momentopname = maakRef.current()
        if (momentopname === null || momentopname === undefined) {
          sessionStorage.removeItem(sleutel)
        } else {
          sessionStorage.setItem(sleutel, JSON.stringify(momentopname))
        }
      } catch {
        /* storage vol of niet serialiseerbaar · liever niets dan een crash */
      }
    }
  }, [activeTabId, naam])
}

const PREFIX = 'doen_tabsnapshot_'

function snapshotSleutel(tabId: string, naam: string): string {
  return `${PREFIX}${tabId}_${naam}`
}

/** Alles wat dit tabblad bewaarde weggooien · aangeroepen bij tab sluiten. */
export function wisTabSnapshots(tabId: string): void {
  try {
    const teWissen: string[] = []
    for (let i = 0; i < sessionStorage.length; i++) {
      const sleutel = sessionStorage.key(i)
      if (sleutel?.startsWith(`${PREFIX}${tabId}_`)) teWissen.push(sleutel)
    }
    teWissen.forEach((sleutel) => sessionStorage.removeItem(sleutel))
  } catch {
    /* geen storage beschikbaar */
  }
}
