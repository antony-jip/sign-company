import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react'
import type { EmailLijstItem, MailMap, Postvak, PostvakKeuze, SyncStatus } from './types'
import { mailStore } from './mailStore'

/**
 * De snapshot is een versienummer: dat is altijd stabiel tussen renders, en
 * de afgeleide lijsten komen uit useMemo op die versie. Zo hoeft de store
 * nooit arrays te kopiëren op elke patch en loopt React niet vast op een
 * snapshot die telkens een nieuw object is.
 */
function useVersie(): number {
  return useSyncExternalStore(mailStore.subscribe, mailStore.getVersie, mailStore.getVersie)
}

export function useMailLijst(map: MailMap): { items: EmailLijstItem[]; laden: boolean; klaar: boolean; laadMeer: () => void; fout?: string } {
  const versie = useVersie()
  const { actief } = usePostvakken()
  useEffect(() => { void mailStore.laadMap(map) }, [map, actief])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const items = useMemo(() => mailStore.lijstItems(map), [versie, map])
  const stand = mailStore.lijstStand(map)
  const laadMeer = useCallback(() => { void mailStore.laadMeer(map) }, [map])
  return { items, laden: stand.laden, klaar: stand.klaar, laadMeer, fout: stand.fout }
}

export function useMail(id: string | null): EmailLijstItem | undefined {
  const versie = useVersie()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => (id ? mailStore.item(id) : undefined), [versie, id])
}

export function useThread(threadId: string | null): { berichten: EmailLijstItem[]; laden: boolean } {
  const versie = useVersie()
  useEffect(() => { if (threadId) void mailStore.laadThread(threadId) }, [threadId])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const berichten = useMemo(() => (threadId ? mailStore.threadItems(threadId) : []), [versie, threadId])
  const laden = threadId ? (mailStore.getSnapshot().threadLeden.get(threadId)?.laden ?? false) : false
  return { berichten, laden }
}

export function useMapTellers(): Record<MailMap, number> {
  useVersie()
  useEffect(() => { void mailStore.laadTellers() }, [])
  return mailStore.getSnapshot().tellers
}

export function useSyncStatus(): SyncStatus {
  useVersie()
  useEffect(() => { void mailStore.laadSyncStatus() }, [])
  return mailStore.getSnapshot().sync
}

export interface PostvakkenStand {
  postvakken: Postvak[]
  actief: PostvakKeuze
  /** Het gekozen postvak, of null bij "Alle postvakken". */
  huidig: Postvak | null
  /** Meer dan één postvak: pas dan verschijnt de kiezer en de Van-regel. */
  meerdere: boolean
  kies: (keuze: PostvakKeuze) => void
}

export function usePostvakken(): PostvakkenStand {
  useVersie()
  useEffect(() => { void mailStore.laadPostvakken() }, [])
  const stand = mailStore.getSnapshot()
  const kies = useCallback((keuze: PostvakKeuze) => mailStore.zetActiefPostvak(keuze), [])
  return {
    postvakken: stand.postvakken,
    actief: stand.actiefPostvak,
    huidig: mailStore.actiefPostvakObject(),
    meerdere: stand.postvakken.length > 1,
    kies,
  }
}

export function useZoekresultaten(): { items: EmailLijstItem[]; laden: boolean; klaar: boolean; laadMeer: () => void } {
  const versie = useVersie()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const items = useMemo(() => mailStore.lijstItems('zoek'), [versie])
  const stand = mailStore.lijstStand('zoek')
  const laadMeer = useCallback(() => {
    const cursor = mailStore.zoekCursor()
    if (cursor) void mailStore.zoek(mailStore.huidigeZoekQuery(), cursor)
  }, [])
  return { items, laden: stand.laden, klaar: stand.klaar, laadMeer }
}
