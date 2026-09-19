import { useEffect, useRef, useState } from 'react'

/**
 * Laat een bedrag naar zijn nieuwe waarde tellen in plaats van springen,
 * zodat de klant ziet wat een vinkje met het totaal doet. De eerste waarde
 * staat er meteen; bij prefers-reduced-motion wordt er niet geanimeerd.
 */
export function useTelBedrag(doel: number, duurMs = 320): number {
  const [getoond, setGetoond] = useState(doel)
  const vanRef = useRef(doel)
  const frameRef = useRef<number | null>(null)

  useEffect(() => {
    const start = vanRef.current
    if (start === doel) return
    const stil = typeof window === 'undefined'
      || typeof window.matchMedia !== 'function'
      || window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (stil) {
      vanRef.current = doel
      setGetoond(doel)
      return
    }
    const begin = performance.now()
    const stap = (nu: number) => {
      const t = Math.min(1, (nu - begin) / duurMs)
      const eased = 1 - (1 - t) * (1 - t)
      const waarde = start + (doel - start) * eased
      vanRef.current = waarde
      setGetoond(t >= 1 ? doel : waarde)
      if (t < 1) frameRef.current = requestAnimationFrame(stap)
    }
    frameRef.current = requestAnimationFrame(stap)
    return () => { if (frameRef.current !== null) cancelAnimationFrame(frameRef.current) }
  }, [doel, duurMs])

  return getoond
}
