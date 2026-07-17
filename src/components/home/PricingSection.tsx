'use client'

import { useRef } from 'react'
import Link from 'next/link'
import { motion, useInView, useReducedMotion } from 'framer-motion'
import { ArrowRight, Check } from 'lucide-react'
import { PRICE_PER_MONTH } from '@/data/pricing'
import { REGISTER_URL } from '@/lib/site'

const INCLUDED = [
  'Alle tien modules',
  'Tot 10 gebruikers',
  'Klantportaal zonder inlog',
  'AI-assistent Daan',
  'Koppeling Exact Online en Mollie',
  'Updates en support',
]

/* Eén prijs, één keer verteld. Het rekenwerk staat op /prijzen. */
export default function PricingSection() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-100px' })
  const reduce = useReducedMotion() ?? false
  const show = reduce || inView

  return (
    <section ref={ref} className="relative overflow-hidden bg-petrol-deep">
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 70% 80% at 88% 100%, rgba(42,111,122,0.45) 0%, rgba(42,111,122,0) 60%)',
        }}
      />
      <div className="container-site relative py-16 md:py-32">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 20 }}
          animate={show ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-14 lg:gap-20 items-center"
        >
          <div>
            <h2
              className="font-heading font-bold text-white leading-[1.0] mb-6"
              style={{ fontSize: 'clamp(30px, 4vw, 52px)', letterSpacing: '-0.03em' }}
            >
              Eén prijs<span className="text-flame">.</span> Alles erin<span className="text-flame">.</span>
            </h2>
            <div className="flex items-baseline gap-3 mb-2">
              <span
                className="font-heading font-bold text-white leading-none"
                style={{ fontSize: 'clamp(56px, 7vw, 92px)', letterSpacing: '-0.03em' }}
              >
                €{PRICE_PER_MONTH}
              </span>
              <span className="text-[16px]" style={{ color: 'rgba(226,240,241,0.7)' }}>
                per maand, ex btw
              </span>
            </div>
            <p className="text-[15px] mb-2" style={{ color: 'rgba(226,240,241,0.7)' }}>
              Geen pakketten, geen prijs per gebruiker, geen verrassingen.
            </p>
            <p className="text-[13px] mb-10" style={{ color: 'rgba(226,240,241,0.55)' }}>
              Alleen Studio-visualisaties draaien op credits: 10 inbegrepen, bijkopen wanneer je wilt.
            </p>
            <div className="flex flex-wrap items-center gap-x-7 gap-y-4">
              <a
                href={REGISTER_URL}
                className="group inline-flex items-center gap-2.5 text-[15px] font-semibold text-white px-7 h-[54px] rounded-[6px] bg-flame transition-transform duration-300 hover:scale-[1.02] active:scale-[0.98]"
              >
                <span>Start gratis</span>
                <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5" strokeWidth={2.5} />
              </a>
              <Link href="/prijzen" className="group inline-flex items-center gap-2 text-[15px] font-semibold text-white">
                <span className="relative">
                  Reken het na
                  <span className="absolute left-0 -bottom-1 h-px w-full origin-left transition-transform duration-300 group-hover:scale-x-0" style={{ backgroundColor: 'rgba(255,255,255,0.4)' }} />
                </span>
                <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-1">→</span>
              </Link>
            </div>
          </div>

          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 lg:justify-self-end">
            {INCLUDED.map((item) => (
              <li key={item} className="flex items-center gap-3">
                <Check className="w-4 h-4 shrink-0 text-flame" strokeWidth={3} />
                <span className="text-[15px] font-medium text-white">{item}</span>
              </li>
            ))}
          </ul>
        </motion.div>
      </div>
    </section>
  )
}
