import { useEffect, useLayoutEffect, useRef } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'

// Hoe lang we na een terugnavigatie blijven proberen de oude scrollpositie te
// zetten. Lijsten komen uit de database, dus op het moment van terugkeren is de
// pagina vaak nog te kort om er heen te scrollen.
const HERSTEL_VENSTER_MS = 1200

/**
 * Bewaart de scrollpositie per route en zet hem terug bij een terugnavigatie.
 *
 * Zonder dit sta je na "terug" uit een project weer bovenaan de lijst. Op een
 * telefoon, waar een lijst tientallen schermen lang is, is dat de irritatie die
 * je het vaakst voelt zonder hem te benoemen.
 *
 * Alleen bij POP (terug/vooruit). Een nieuwe navigatie hoort bovenaan te
 * beginnen — dat is wat je verwacht als je ergens naartoe gaat.
 */
export function useScrollHerstel(container: React.RefObject<HTMLElement | null>) {
  const location = useLocation()
  const navigatieType = useNavigationType()
  const posities = useRef(new Map<string, number>())

  // Positie van de huidige route bijhouden zolang je erop staat.
  useEffect(() => {
    const el = container.current
    if (!el) return
    const sleutel = location.key
    const onScroll = () => posities.current.set(sleutel, el.scrollTop)
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      // Ook bij het verlaten vastleggen: de laatste scroll-event kan van vlak
      // vóór de navigatie zijn, of helemaal ontbreken als je niet scrollde.
      posities.current.set(sleutel, el.scrollTop)
      el.removeEventListener('scroll', onScroll)
    }
  }, [container, location.key])

  useLayoutEffect(() => {
    const el = container.current
    if (!el) return

    const doel = navigatieType === 'POP' ? posities.current.get(location.key) : 0
    if (doel == null) {
      el.scrollTop = 0
      return
    }
    if (doel === 0) {
      el.scrollTop = 0
      return
    }

    el.scrollTop = doel

    // De lijst is meestal nog leeg op dit moment. Blijf het even proberen
    // totdat de pagina lang genoeg is — en stop zodra de gebruiker zelf
    // scrollt, want dan is doorduwen tegen hem in werken.
    let afgebroken = false
    const gestart = performance.now()
    const stop = () => { afgebroken = true }
    el.addEventListener('wheel', stop, { passive: true, once: true })
    el.addEventListener('touchstart', stop, { passive: true, once: true })

    const probeer = () => {
      if (afgebroken || !container.current) return
      const huidig = container.current
      if (huidig.scrollTop !== doel && huidig.scrollHeight - huidig.clientHeight >= doel) {
        huidig.scrollTop = doel
      }
      if (huidig.scrollTop !== doel && performance.now() - gestart < HERSTEL_VENSTER_MS) {
        requestAnimationFrame(probeer)
      }
    }
    requestAnimationFrame(probeer)

    return () => {
      afgebroken = true
      el.removeEventListener('wheel', stop)
      el.removeEventListener('touchstart', stop)
    }
  }, [container, location.key, navigatieType])
}
