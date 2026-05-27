'use client'

import { motion, useInView, useReducedMotion } from 'framer-motion'
import { useRef } from 'react'
import { ArrowRight } from 'lucide-react'

const PETROL = '#1A535C'
const FLAME = '#F15025'
const MUTED = '#6B6B66'

/**
 * Herbruikbaar CTA-blok — consistente conversie-prompt tussen secties.
 * Witte kaart op de beige achtergrond zodat het rustig maar duidelijk opvalt.
 */
export default function SectionCTA({
  title = 'Klaar om te beginnen',
  sub = 'Van eerste klantvraag tot betaalde factuur, in één systeem.',
}: {
  title?: string
  sub?: string
}) {
  const ref = useRef(null)
  const reduce = useReducedMotion()
  const inView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section ref={ref} className="relative" style={{ backgroundColor: '#F3F2ED' }}>
      <div className="container-site py-14 md:py-20">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 20 }}
          animate={reduce ? undefined : inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="relative mx-auto max-w-3xl text-center rounded-[16px] px-6 py-10 md:px-12 md:py-14"
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid rgba(26,83,92,0.10)',
            boxShadow: '0 1px 2px rgba(20,40,40,0.04), 0 24px 56px -30px rgba(19,62,69,0.24)',
          }}
        >
          <div className="h-1 w-12 rounded-full mx-auto mb-6" style={{ backgroundColor: FLAME }} />
          <h2
            className="font-heading font-bold tracking-[-1px] leading-[1.05]"
            style={{ fontSize: 'clamp(26px, 3.4vw, 40px)', color: PETROL }}
          >
            {title}<span style={{ color: FLAME }}>.</span>
          </h2>
          <p className="text-[15px] md:text-[17px] leading-[1.55] mt-3 max-w-lg mx-auto" style={{ color: '#3F3F3A' }}>
            {sub}
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-4 md:gap-5">
            <a
              href="https://app.doen.team/register"
              className="group inline-flex items-center gap-2 text-[15px] font-semibold text-white px-7 h-[54px] rounded-[6px] transition-all duration-300 hover:scale-[1.03] active:scale-[0.97]"
              style={{ backgroundColor: FLAME, boxShadow: '0 8px 24px rgba(241,80,37,0.25)' }}
            >
              <span>Start gratis</span>
              <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5" strokeWidth={2.5} />
            </a>
            <a
              href="/hoe-het-werkt"
              className="inline-flex items-center gap-2 text-[15px] font-semibold transition-all group"
              style={{ color: PETROL }}
            >
              <span className="relative">
                Of zie hoe het werkt
                <span
                  className="absolute left-0 -bottom-0.5 h-[2px] w-full origin-left scale-x-100 transition-transform duration-300 group-hover:scale-x-0"
                  style={{ backgroundColor: PETROL }}
                />
              </span>
              <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-1">→</span>
            </a>
          </div>
          <p className="text-[12px] mt-5" style={{ color: MUTED }}>
            Geen creditcard nodig. Maandelijks opzegbaar.
          </p>
        </motion.div>
      </div>
    </section>
  )
}
