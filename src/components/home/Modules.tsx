'use client'

import { useRef } from 'react'
import Link from 'next/link'
import { motion, useInView, useReducedMotion } from 'framer-motion'
import { modules } from '@/data/modules'

/* Tien modules als strakke index: hairlines, geen icon-kaarten. */
export default function Modules() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-100px' })
  const reduce = useReducedMotion() ?? false
  const show = reduce || inView

  return (
    <section ref={ref} className="bg-bg">
      <div className="container-site py-16 md:py-32">
        <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-4 mb-12 md:mb-16">
          <h2
            className="font-heading font-bold text-petrol leading-[1.0]"
            style={{ fontSize: 'clamp(30px, 4vw, 52px)', letterSpacing: '-0.03em' }}
          >
            Tien modules<span className="text-flame">.</span>
            <br />
            Eén systeem<span className="text-flame">.</span>
          </h2>
          <p className="text-[15px] md:text-[16px] text-muted max-w-sm leading-[1.55]">
            Geen losse tools die elkaar niet kennen. Alles zit erin en alles
            werkt samen, voor één prijs.
          </p>
        </div>

        <ul className="grid grid-cols-1 md:grid-cols-2 md:gap-x-16 border-t border-petrol/10">
          {modules.map((mod, i) => {
            const isStudio = mod.href === '/features/visualizer'
            return (
              <motion.li
                key={mod.href}
                initial={reduce ? false : { opacity: 0, y: 12 }}
                animate={show ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: reduce ? 0 : 0.04 * i, ease: [0.16, 1, 0.3, 1] }}
                className="border-b border-petrol/10"
              >
                <Link
                  href={mod.href}
                  className="group flex items-baseline gap-4 py-5 md:py-6"
                >
                  <span className="font-heading text-[19px] md:text-[21px] font-bold text-ink leading-none transition-colors duration-200 group-hover:text-petrol whitespace-nowrap">
                    {mod.label}
                    <span className="text-flame">.</span>
                  </span>
                  {isStudio && (
                    <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-[3px] border border-flame text-flame shrink-0">
                      Beta
                    </span>
                  )}
                  <span className="hidden sm:block text-[14px] text-muted truncate flex-1 text-right transition-colors duration-200 group-hover:text-ink">
                    {mod.sub}
                  </span>
                  <span
                    aria-hidden
                    className="text-flame opacity-0 -translate-x-1 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0"
                  >
                    →
                  </span>
                </Link>
              </motion.li>
            )
          })}
        </ul>

        <p className="mt-8 text-[14px] text-muted">
          Elke module heeft z&apos;n eigen pagina.{' '}
          <Link href="/features" className="font-semibold text-petrol hover:text-flame transition-colors">
            Bekijk het hele product →
          </Link>
        </p>
      </div>
    </section>
  )
}
