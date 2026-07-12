'use client'

import { useRef } from 'react'
import Link from 'next/link'
import { motion, useInView, useReducedMotion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import type { Vertical } from '@/data/verticals'
import { modules } from '@/data/modules'

/* Verticale landingspagina: lichte hero, pijnpunten als hairline-lijst,
   module-highlights als strakke rijen naar /features/*. */
export default function VerticalContent({ vertical }: { vertical: Vertical }) {
  const reduce = useReducedMotion() ?? false

  return (
    <div className="bg-bg">
      {/* Hero: entree via CSS-keyframes (globals.css: .hero-line / .hero-fade) */}
      <section className="pt-28 md:pt-44 pb-14 md:pb-28">
        <div className="container-site">
          <div className="max-w-3xl">
            <h1
              className="font-heading font-bold leading-[0.98] mb-5 md:mb-7"
              style={{ fontSize: 'clamp(36px, 5.6vw, 76px)', letterSpacing: '-0.035em', textWrap: 'balance' }}
            >
              <span className="block overflow-hidden pb-[0.08em] -mb-[0.08em]">
                <span className="hero-line text-petrol" style={{ animationDelay: '0.05s' }}>
                  {vertical.h1Lead}
                  <span className="text-flame">.</span>
                </span>
              </span>
              <span className="block overflow-hidden pb-[0.08em] -mb-[0.08em]">
                <span className="hero-line text-muted" style={{ animationDelay: '0.15s' }}>
                  {vertical.h1Accent}
                  <span className="text-flame">.</span>
                </span>
              </span>
            </h1>

            <p className="hero-fade text-[16px] md:text-[17px] leading-[1.6] text-ink max-w-2xl mb-6 md:mb-9" style={{ animationDelay: '0.35s' }}>
              {vertical.intro}
            </p>

            <div className="hero-fade flex flex-wrap items-center gap-5 md:gap-7" style={{ animationDelay: '0.45s' }}>
              <a
                href="https://app.doen.team/register"
                className="group inline-flex items-center gap-2 text-[15px] font-semibold text-white bg-flame px-7 h-[54px] rounded-[6px] transition-transform duration-300 hover:scale-[1.02] active:scale-[0.98]"
              >
                <span>Start gratis</span>
                <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5" strokeWidth={2.5} />
              </a>
              <Link
                href="/hoe-het-werkt"
                className="group inline-flex items-center gap-2 text-[15px] font-semibold text-ink"
              >
                <span className="relative">
                  Zie hoe het werkt
                  <span className="absolute left-0 -bottom-1 h-px w-full origin-left transition-transform duration-300 group-hover:scale-x-0 bg-ink/30" />
                </span>
                <span aria-hidden className="text-flame transition-transform duration-300 group-hover:translate-x-1">→</span>
              </Link>
            </div>
            <p className="hero-fade text-[15px] text-muted mt-6" style={{ animationDelay: '0.55s' }}>
              30 dagen gratis · geen creditcard · maandelijks opzegbaar
            </p>
          </div>
        </div>
      </section>

      {/* Pijnpunten als hairline-lijst */}
      <PainSection vertical={vertical} reduce={reduce} />

      {/* Module-highlights als strakke rijen */}
      <HighlightSection vertical={vertical} reduce={reduce} />
    </div>
  )
}

function PainSection({ vertical, reduce }: { vertical: Vertical; reduce: boolean }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-100px' })
  const show = reduce || inView

  return (
    <section ref={ref} className="bg-white">
      <div className="container-site py-16 md:py-32">
        <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-4 mb-8 md:mb-16">
          <h2
            className="font-heading font-bold text-petrol leading-[1.0]"
            style={{ fontSize: 'clamp(30px, 4vw, 52px)', letterSpacing: '-0.03em' }}
          >
            Herkenbaar<span className="text-flame">?</span>
          </h2>
          <p className="text-[15px] md:text-[16px] text-muted max-w-sm leading-[1.55]">
            Dit horen we van elk signbedrijf dat overstapt.
          </p>
        </div>

        <ul className="border-t border-petrol/10">
          {vertical.pains.map((pain, i) => (
            <motion.li
              key={pain.title}
              initial={reduce ? false : { opacity: 0, y: 12 }}
              animate={show ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: reduce ? 0 : 0.06 * i, ease: [0.16, 1, 0.3, 1] }}
              className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-x-12 gap-y-2 py-6 md:py-7 border-b border-petrol/10"
            >
              <h3 className="font-heading text-[19px] md:text-[21px] font-bold text-ink leading-snug">
                {pain.title}
                <span className="text-flame">.</span>
              </h3>
              <p className="text-[15px] md:text-[16px] leading-[1.6] text-muted max-w-2xl">
                {pain.body}
              </p>
            </motion.li>
          ))}
        </ul>
      </div>
    </section>
  )
}

function HighlightSection({ vertical, reduce }: { vertical: Vertical; reduce: boolean }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-100px' })
  const show = reduce || inView

  return (
    <section ref={ref} className="bg-bg">
      <div className="container-site py-16 md:py-32">
        <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-4 mb-8 md:mb-16">
          <h2
            className="font-heading font-bold text-petrol leading-[1.0]"
            style={{ fontSize: 'clamp(30px, 4vw, 52px)', letterSpacing: '-0.03em' }}
          >
            Wat doen<span className="text-flame">.</span> daarvoor regelt
          </h2>
          <p className="text-[15px] md:text-[16px] text-muted max-w-sm leading-[1.55]">
            Vier modules die dit werk dragen. De rest zit er gewoon bij.
          </p>
        </div>

        <ul className="border-t border-petrol/10">
          {vertical.highlights.map((highlight, i) => {
            const mod = modules.find((m) => m.href === highlight.href)
            if (!mod) return null
            return (
              <motion.li
                key={highlight.href}
                initial={reduce ? false : { opacity: 0, y: 12 }}
                animate={show ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: reduce ? 0 : 0.06 * i, ease: [0.16, 1, 0.3, 1] }}
                className="border-b border-petrol/10"
              >
                <Link
                  href={mod.href}
                  className="group grid grid-cols-1 md:grid-cols-[220px_1fr_auto] items-baseline gap-x-12 gap-y-1.5 py-6 md:py-7"
                >
                  <span className="font-heading text-[19px] md:text-[21px] font-bold text-ink leading-none transition-colors duration-200 group-hover:text-petrol whitespace-nowrap">
                    {mod.label}
                    <span className="text-flame">.</span>
                  </span>
                  <span className="text-[15px] md:text-[16px] leading-[1.6] text-muted max-w-2xl transition-colors duration-200 group-hover:text-ink">
                    {highlight.blurb}
                  </span>
                  <span
                    aria-hidden
                    className="hidden md:block text-flame opacity-0 -translate-x-1 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0"
                  >
                    →
                  </span>
                </Link>
              </motion.li>
            )
          })}
        </ul>

        <p className="mt-8 text-[15px] text-muted">
          Elke module heeft z&apos;n eigen pagina.{' '}
          <Link href="/features" className="font-semibold text-petrol hover:text-flame transition-colors">
            Bekijk het hele product →
          </Link>
        </p>
      </div>
    </section>
  )
}
