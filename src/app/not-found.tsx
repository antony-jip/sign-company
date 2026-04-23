'use client'

import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import MagneticButton from '@/components/MagneticButton'
import AnimatedLink from '@/components/AnimatedLink'
import { motion } from 'framer-motion'

const PETROL = '#1A535C'
const FLAME = '#F15025'
const MUTED = '#6B6B66'

export default function NotFound() {
  return (
    <>
      <Navbar />
      <main
        id="main-content"
        className="min-h-[85vh] flex items-center justify-center overflow-hidden relative"
      >
        {/* Subtle ambient radial behind */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse at center, rgba(241,80,37,0.06) 0%, transparent 55%)',
          }}
        />

        <div className="container-site text-center relative z-10 px-6">
          {/* Eyebrow */}
          <motion.p
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="font-mono text-[12px] font-bold tracking-[0.24em] uppercase mb-8"
            style={{ color: FLAME }}
          >
            404
          </motion.p>

          {/* Heading with runaway flame punt */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="font-heading text-[44px] md:text-[72px] font-extrabold tracking-[-2.5px] leading-[0.95] mb-6"
            style={{ color: PETROL }}
          >
            Deze pagina werd
            <br />
            niet gedaan
            <motion.span
              initial={{ x: 0, rotate: 0, opacity: 1 }}
              animate={{
                x: [0, 60, 120, 180],
                rotate: [0, 220, 440, 680],
                opacity: [1, 1, 0.6, 0],
              }}
              transition={{
                duration: 3,
                delay: 1.4,
                ease: [0.16, 1, 0.3, 1],
                repeat: Infinity,
                repeatDelay: 2,
              }}
              style={{ display: 'inline-block', color: FLAME }}
            >
              .
            </motion.span>
          </motion.h1>

          {/* Body */}
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="text-[16px] md:text-[19px] leading-relaxed max-w-lg mx-auto mb-10"
            style={{ color: MUTED }}
          >
            De pagina die je zocht bestaat niet, of is verplaatst. Geen probleem —
            we brengen je weer op weg.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
          >
            <MagneticButton href="/" variant="primary" size="lg">
              Terug naar home
              <span aria-hidden>→</span>
            </MagneticButton>
            <MagneticButton href="/features" variant="secondary" size="lg">
              Bekijk de modules
            </MagneticButton>
          </motion.div>

          {/* Secondary wayfinding */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[14px]"
            style={{ color: MUTED }}
          >
            <span className="opacity-60">of ga direct naar</span>
            <AnimatedLink href="/hoe-het-werkt" accent={FLAME}>
              Hoe het werkt
            </AnimatedLink>
            <AnimatedLink href="/prijzen" accent={FLAME}>
              Prijzen
            </AnimatedLink>
            <AnimatedLink href="/over" accent={FLAME}>
              Waarom doen.
            </AnimatedLink>
            <AnimatedLink href="/contact" accent={FLAME}>
              Contact
            </AnimatedLink>
          </motion.div>
        </div>
      </main>
      <Footer />
    </>
  )
}
