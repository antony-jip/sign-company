import { useEffect, useRef, useState } from 'react'

const DREMPEL = 64
const MAX = 96

interface Opties {
  /** Scrollcontainer waarin de gebruiker trekt. */
  doel: React.RefObject<HTMLElement>
  onRefresh: () => void | Promise<unknown>
  /** Uit op desktop, tijdens lezen, of waar de gebaar niet hoort. */
  actief?: boolean
}

/**
 * Trek-om-te-verversen voor touch. De mailmodule had op mobiel geen enkele
 * manier om handmatig te syncen: geen knop, geen gebaar — je kon alleen
 * wachten op de poll.
 *
 * Werkt alleen als de container bovenaan staat, zodat gewoon terugscrollen
 * niet per ongeluk een sync aftrapt. De weerstand loopt op naarmate je verder
 * trekt; dat maakt de drempel voelbaar zonder hem te tonen.
 */
export function usePullToRefresh({ doel, onRefresh, actief = true }: Opties) {
  const [afstand, setAfstand] = useState(0)
  const [bezig, setBezig] = useState(false)
  const startY = useRef<number | null>(null)
  const onRefreshRef = useRef(onRefresh)
  onRefreshRef.current = onRefresh
  const bezigRef = useRef(false)
  bezigRef.current = bezig

  useEffect(() => {
    const el = doel.current
    if (!el || !actief) return

    const onStart = (e: TouchEvent) => {
      if (bezigRef.current || el.scrollTop > 0 || e.touches.length !== 1) {
        startY.current = null
        return
      }
      startY.current = e.touches[0].clientY
    }

    const onMove = (e: TouchEvent) => {
      if (startY.current === null) return
      const delta = e.touches[0].clientY - startY.current
      if (delta <= 0) {
        // Omhoog wissen tijdens het gebaar is gewoon scrollen; laat los.
        startY.current = null
        setAfstand(0)
        return
      }
      // Vierkantswortel-demping: de eerste centimeters gaan mee, daarna wordt
      // het merkbaar zwaarder en stopt het bij MAX.
      setAfstand(Math.min(MAX, Math.sqrt(delta) * 7))
    }

    const onEnd = () => {
      if (startY.current === null) return
      startY.current = null
      setAfstand((huidig) => {
        if (huidig >= DREMPEL && !bezigRef.current) {
          setBezig(true)
          void Promise.resolve(onRefreshRef.current())
            .catch(() => { /* de knop mag niet blijven hangen op een fout */ })
            .finally(() => { setBezig(false); setAfstand(0) })
          return DREMPEL
        }
        return 0
      })
    }

    // passive: de browser mag blijven scrollen; we onderdrukken niets, we
    // meten alleen. Dat houdt de lijst soepel op toestellen die het gebaar
    // zelf al afhandelen.
    el.addEventListener('touchstart', onStart, { passive: true })
    el.addEventListener('touchmove', onMove, { passive: true })
    el.addEventListener('touchend', onEnd)
    el.addEventListener('touchcancel', onEnd)
    return () => {
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchmove', onMove)
      el.removeEventListener('touchend', onEnd)
      el.removeEventListener('touchcancel', onEnd)
    }
  }, [doel, actief])

  return { afstand, bezig, gereed: afstand >= DREMPEL }
}
