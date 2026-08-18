import { useEffect, useLayoutEffect, useRef } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'

// Hoe lang we na een terugnavigatie blijven proberen de oude scrollpositie te
// zetten. Lijsten komen uit de database, dus op het moment van terugkeren is de
// pagina vaak nog te kort om er heen te scrollen.
const HERSTEL_VENSTER_MS = 1200

/** Pad plus querystring: ?page=2 is een andere lijst dan ?page=1. */
function sleutelVan(pathname: string, search: string): string {
  return pathname + search
}

/**
 * Kwam je hier terug vanaf een detailpagina van dezelfde lijst? Dan is dit een
 * terugkeer, ook als de knop technisch vooruit navigeerde.
 */
function isTerugkeerVanDetail(vorigPad: string | null, nieuwPad: string): boolean {
  if (!vorigPad) return false
  return vorigPad.startsWith(nieuwPad === '/' ? '/' : nieuwPad + '/')
}

/**
 * Bewaart de scrollpositie per pagina en zet hem terug zodra je erop terugkomt.
 *
 * Zonder dit sta je na "terug" uit een project weer bovenaan de lijst. Op een
 * telefoon, waar een lijst tientallen schermen lang is, is dat de irritatie die
 * je het vaakst voelt zonder hem te benoemen.
 *
 * Twee dingen maakten dat de eerdere opzet, die op `location.key` bewaarde en
 * alleen bij POP herstelde, in de praktijk zelden aansloeg:
 *
 * 1. Het tabbladsysteem navigeert op meerdere plekken met `{ replace: true }`.
 *    Een replace maakt een nieuwe `location.key`, dus de positie die onder de
 *    oude key stond werd nooit meer gevonden. Vandaar dat we nu op pad plus
 *    querystring bewaren: dat overleeft een replace.
 * 2. De terugknoppen in de detailschermen doen `navigate(herkomstpad)` zodra ze
 *    weten waar je vandaan kwam. Dat is technisch een vooruitnavigatie, dus de
 *    hook zette je netjes bovenaan terwijl jij "terug" bedoelde. Vandaar dat we
 *    ook herstellen wanneer het vorige pad een detailpagina van deze lijst was.
 *
 * Een echte nieuwe navigatie begint nog steeds bovenaan; dat is wat je verwacht
 * als je ergens naartoe gaat.
 */
export function useScrollHerstel(container: React.RefObject<HTMLElement | null>) {
  const location = useLocation()
  const navigatieType = useNavigationType()
  const posities = useRef(new Map<string, number>())
  const vorigPad = useRef<string | null>(null)

  const sleutel = sleutelVan(location.pathname, location.search)

  // Positie van de huidige pagina bijhouden zolang je erop staat.
  useEffect(() => {
    const el = container.current
    if (!el) return
    const onScroll = () => posities.current.set(sleutel, el.scrollTop)
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      // Ook bij het verlaten vastleggen: de laatste scroll-event kan van vlak
      // vóór de navigatie zijn, of helemaal ontbreken als je niet scrollde.
      posities.current.set(sleutel, el.scrollTop)
      el.removeEventListener('scroll', onScroll)
    }
  }, [container, sleutel])

  useLayoutEffect(() => {
    const el = container.current
    const vorige = vorigPad.current
    vorigPad.current = location.pathname
    if (!el) return

    const herstelt = navigatieType === 'POP' || isTerugkeerVanDetail(vorige, location.pathname)
    const doel = herstelt ? posities.current.get(sleutel) : 0

    if (!doel) {
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
  }, [container, sleutel, location.pathname, navigatieType])
}
