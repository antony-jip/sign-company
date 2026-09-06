import { useCallback, useEffect, useRef, useState } from 'react'
import { leesVoorkeur, schrijfVoorkeur } from './voorkeuren'

/**
 * Een kolom die je met een greep aan de rand breder of smaller sleept, met de
 * breedte in localStorage. Tijdens het slepen hangen de listeners op `window`
 * en staat de cursor vast op col-resize; anders verliest de muis de greep zodra
 * hij over het leesvenster schiet.
 */
export function useSleepBreedte(
  sleutel: string,
  standaard: number,
  grenzen: { min: number; max: number },
  richting: 'rechts' | 'links' = 'rechts',
): { breedte: number; zetBreedte: (n: number) => void; sleept: boolean; greepProps: { onMouseDown: (e: React.MouseEvent) => void; onDoubleClick: () => void } } {
  const [breedte, zetBreedteState] = useState<number>(() => {
    const bewaard = Number(leesVoorkeur(sleutel))
    if (!Number.isFinite(bewaard) || bewaard <= 0) return standaard
    return Math.min(grenzen.max, Math.max(grenzen.min, bewaard))
  })
  const [sleept, zetSleept] = useState(false)
  const start = useRef<{ x: number; breedte: number } | null>(null)

  const zetBreedte = useCallback((n: number) => {
    const begrensd = Math.min(grenzen.max, Math.max(grenzen.min, Math.round(n)))
    zetBreedteState(begrensd)
    schrijfVoorkeur(sleutel, String(begrensd))
  }, [grenzen.max, grenzen.min, sleutel])

  useEffect(() => {
    if (!sleept) return
    const beweeg = (e: MouseEvent) => {
      if (!start.current) return
      const delta = richting === 'rechts' ? e.clientX - start.current.x : start.current.x - e.clientX
      zetBreedte(start.current.breedte + delta)
    }
    const los = () => { zetSleept(false); start.current = null }
    window.addEventListener('mousemove', beweeg)
    window.addEventListener('mouseup', los)
    const vorigeCursor = document.body.style.cursor
    const vorigeSelectie = document.body.style.userSelect
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    return () => {
      window.removeEventListener('mousemove', beweeg)
      window.removeEventListener('mouseup', los)
      document.body.style.cursor = vorigeCursor
      document.body.style.userSelect = vorigeSelectie
    }
  }, [sleept, richting, zetBreedte])

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    start.current = { x: e.clientX, breedte }
    zetSleept(true)
  }, [breedte])

  return { breedte, zetBreedte, sleept, greepProps: { onMouseDown, onDoubleClick: () => zetBreedte(standaard) } }
}

/** De greep zelf: een smalle strook die oplicht zodra je hem pakt. */
export const GREEP_CLS = 'group absolute inset-y-0 z-20 hidden w-1.5 cursor-col-resize md:block'
export const GREEP_LIJN_CLS = 'absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-transparent transition-colors duration-150 group-hover:bg-petrol/40 group-active:bg-petrol/60'
