import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Laat een scrollbare lijst onderaan zacht uitlopen zolang er nog rijen
 * onder de rand staan. Zonder dit wordt de laatste regel halverwege
 * afgekapt en leest dat als een renderfout in plaats van "er is meer".
 */
export function useScrollFade<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [atEnd, setAtEnd] = useState(true)

  const measure = useCallback(() => {
    const el = ref.current
    if (!el) return
    setAtEnd(el.scrollTop + el.clientHeight >= el.scrollHeight - 2)
  }, [])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    measure()
    el.addEventListener('scroll', measure, { passive: true })
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => {
      el.removeEventListener('scroll', measure)
      observer.disconnect()
    }
  }, [measure])

  return { ref, atEnd }
}
