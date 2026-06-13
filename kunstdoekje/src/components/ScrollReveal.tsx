'use client'

import { usePathname } from 'next/navigation'
import { useEffect } from 'react'

/**
 * Globale scroll-reveal. Onthult elk element met [data-reveal] of de directe
 * kinderen van [data-reveal-group] zodra het in beeld komt — door enkel een
 * `.is-in` klasse te zetten (de animatie zit in CSS, alleen transform+opacity).
 * Herscant bij route-wissel. Geen library, geen layout-thrash.
 */
export default function ScrollReveal() {
  const pathname = usePathname()

  useEffect(() => {
    const els = Array.from(
      document.querySelectorAll<HTMLElement>('[data-reveal], [data-reveal-group]'),
    ).filter((el) => !el.classList.contains('is-in'))

    if (els.length === 0) return

    // Geen IntersectionObserver of reduced-motion → meteen tonen, geen animatie
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce || !('IntersectionObserver' in window)) {
      els.forEach((el) => el.classList.add('is-in'))
      return
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-in')
            io.unobserve(entry.target)
          }
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.12 },
    )

    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [pathname])

  return null
}
