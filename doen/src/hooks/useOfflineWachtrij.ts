import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useFeatureAan } from '@/contexts/FeatureFlagsContext'
import { maakEigenaarSleutel } from '@/utils/offlineMutatieStore'
import { telStand, type WachtrijStand } from '@/utils/offlineWachtrijRegels'
import { fotoMutaties, flushFotoWachtrij, WACHTRIJ_GEWIJZIGD } from '@/utils/werkbonFotoWachtrij'
import { logger } from '@/utils/logger'

const LEEG: WachtrijStand = { wachtend: 0, vast: 0 }

/**
 * De app-brede stand van de offline-wachtrij, plus de flush die er niet aan
 * vastzit welk scherm open staat. Vandaag draaien beide bestaande flushes
 * alleen zolang één component gekoppeld is; wie een foto maakt en de app sluit,
 * leegt zijn wachtrij nooit.
 *
 * Staat de vlag `offline_queue` niet expliciet aan, dan raakt deze hook
 * IndexedDB niet aan en doet hij geen enkele flush.
 */
export function useOfflineWachtrij(): WachtrijStand {
  const aan = useFeatureAan('offline_queue')
  const { user, organisatieId } = useAuth()
  const userId = user?.id || ''
  const eigenaar = maakEigenaarSleutel(userId || null, organisatieId ?? null)
  const [stand, setStand] = useState<WachtrijStand>(LEEG)

  const tel = useCallback(async () => {
    if (!aan || !userId) { setStand(LEEG); return }
    // Alleen de kleine JSON-store wordt gelezen; de foto-Blobs blijven waar ze
    // staan. Daarom staan ze in een eigen store.
    setStand(telStand(await fotoMutaties(eigenaar)))
  }, [aan, userId, eigenaar])

  useEffect(() => { tel() }, [tel])

  useEffect(() => {
    if (!aan || !userId) return
    let bezig = false
    const flush = async () => {
      if (bezig) return
      bezig = true
      try {
        await flushFotoWachtrij(eigenaar, userId)
      } catch (fout) {
        logger.warn('Offline-wachtrij legen mislukt:', fout)
      } finally {
        bezig = false
        await tel()
      }
    }
    // Drie momenten. Die derde is er omdat een telefoon een tab bevriest: de
    // monteur stopt hem met een volle wachtrij in zijn zak, rijdt naar huis en
    // haalt hem er weer uit. Dan is er bereik maar geen 'online'-event, want de
    // verbinding is nooit zichtbaar weggevallen.
    // Niet flushen zonder verbinding. Zonder deze poort loopt elke poging dood
    // op een netwerkfout, en dat kostte in de review de hele wachtrij: de
    // monteur haalt de app naar de voorgrond, de flush vuurt, en elk item raakt
    // een foutpad. navigator.onLine is geen bewijs van bereik (true betekent
    // alleen "er is een interface"), maar false is wél bewijs van het
    // tegendeel, en dat is precies de kant die hier telt.
    const flushAlsVerbonden = () => { if (navigator.onLine !== false) flush() }

    flushAlsVerbonden()
    const opZichtbaar = () => { if (!document.hidden) flushAlsVerbonden() }
    window.addEventListener('online', flushAlsVerbonden)
    document.addEventListener('visibilitychange', opZichtbaar)
    window.addEventListener(WACHTRIJ_GEWIJZIGD, tel)
    return () => {
      window.removeEventListener('online', flushAlsVerbonden)
      document.removeEventListener('visibilitychange', opZichtbaar)
      window.removeEventListener(WACHTRIJ_GEWIJZIGD, tel)
    }
  }, [aan, userId, eigenaar, tel])

  return stand
}
