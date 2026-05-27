'use client'

import { motion, useReducedMotion, type Variants } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import HeroFlow from '@/components/home/HeroFlow'

const PETROL = '#1A535C'
const FLAME = '#F15025'
const MUTED = '#6B6B66'

const easing: [number, number, number, number] = [0.16, 1, 0.3, 1]

/* Kalme reveal — rijst zacht op, blur klaart uit. Geen bounce, geen drukte. */
const reveal: Variants = {
  hidden: { opacity: 0, y: 18, filter: 'blur(6px)' },
  visible: { opacity: 1, y: 0, filter: 'blur(0px)' },
}

export default function Hero() {
  const reduce = useReducedMotion()

  const container = reduce
    ? {}
    : {
        initial: 'hidden' as const,
        animate: 'visible' as const,
        transition: { staggerChildren: 0.1, delayChildren: 0.05 },
      }
  const item = reduce ? undefined : reveal
  const itemT = { duration: 0.7, ease: easing }

  return (
    <section
      id="hero-section"
      className="relative overflow-hidden"
      style={{ backgroundColor: '#F3F2ED' }}
    >
      {/* Eén zachte ambient blob — rustige warmte */}
      <div
        aria-hidden
        className="absolute -top-40 -right-32 w-[640px] h-[640px] rounded-full pointer-events-none"
        style={{ backgroundColor: '#E8E1D0', opacity: 0.35, filter: 'blur(110px)' }}
      />

      <div className="container-site relative pt-28 pb-16 md:pt-40 md:pb-24">

        {/* Tekst — wat is het, welk probleem */}
        <motion.div {...container} className="max-w-3xl">
          <motion.div variants={item} transition={itemT} className="inline-flex items-center gap-2 mb-7">
            <span className="relative inline-flex items-center justify-center w-2 h-2">
              {!reduce && (
                <span className="absolute inset-0 rounded-full animate-ping" style={{ backgroundColor: FLAME, opacity: 0.4 }} />
              )}
              <span className="relative w-1.5 h-1.5 rounded-full" style={{ backgroundColor: FLAME }} />
            </span>
            <span className="font-mono text-[11px] font-medium tracking-[0.18em] uppercase" style={{ color: MUTED }}>
              Nu beschikbaar · 30 dagen gratis
            </span>
          </motion.div>

          <h1
            className="font-heading font-bold tracking-[-2px] md:tracking-[-3px] leading-[0.98] mb-7"
            style={{ fontSize: 'clamp(40px, 5.4vw, 78px)', color: PETROL }}
          >
            <motion.span className="block" variants={item} transition={itemT}>
              Eén plek voor je
            </motion.span>
            <motion.span className="block" variants={item} transition={itemT}>
              hele signbedrijf<span style={{ color: FLAME }}>.</span>
            </motion.span>
          </h1>

          <motion.p
            variants={item}
            transition={itemT}
            className="text-[17px] md:text-[20px] leading-[1.55] max-w-xl mb-9"
            style={{ color: '#3F3F3A' }}
          >
            De alles-in-één software voor signmakers. Van eerste klantvraag tot
            betaalde factuur, zonder losse tools.
          </motion.p>

          <motion.div variants={item} transition={itemT} className="flex flex-wrap items-center gap-5 md:gap-6">
            <a
              href="https://app.doen.team/register"
              className="group inline-flex items-center gap-2 text-[15px] font-semibold text-white px-7 h-[56px] rounded-[6px] transition-all duration-300 hover:scale-[1.03] active:scale-[0.97]"
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
          </motion.div>

          <motion.p variants={item} transition={itemT} className="text-[12px] mt-6" style={{ color: MUTED }}>
            Geen creditcard nodig. Maandelijks opzegbaar.
          </motion.p>
        </motion.div>

        {/* Flow — zie meteen hoe het werkt */}
        <motion.div
          initial={reduce ? false : { opacity: 0 }}
          animate={reduce ? undefined : { opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.4, ease: easing }}
          className="mt-14 md:mt-20"
        >
          <HeroFlow />
        </motion.div>
      </div>
    </section>
  )
}
