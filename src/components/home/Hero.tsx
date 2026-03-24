'use client'

import { motion, useScroll, useTransform } from 'framer-motion'
import { useRef } from 'react'
import WachtlijstForm from '../WachtlijstForm'
import TypeWriter from '../TypeWriter'
import FlameCursor from '../FlameCursor'
import DashboardMockup from '../mockups/DashboardMockup'
import WerkbonMockup from '../mockups/WerkbonMockup'

const words = ['Doe', 'waar', 'je', 'goed', 'in', 'bent.']

export default function Hero() {
  const sectionRef = useRef(null)
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end start'],
  })
  const mockupY = useTransform(scrollYProgress, [0, 1], [0, -80])
  const phoneY = useTransform(scrollYProgress, [0, 1], [0, -40])

  return (
    <section
      id="hero-section"
      ref={sectionRef}
      className="relative min-h-[100vh] flex items-center overflow-hidden dot-grid"
    >
      <FlameCursor />

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-bg via-bg/95 to-flame/[0.03] pointer-events-none" />

      <div className="container-site relative z-10 pt-28 pb-20 md:pt-36 md:pb-28">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-8">
          {/* Left: Text content */}
          <div className="flex-1 max-w-xl">
            {/* Staggered headline */}
            <h1 className="hero-heading font-heading text-petrol mb-4">
              {words.map((word, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.7,
                    delay: 0.2 + i * 0.1,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  className="inline-block mr-[0.25em]"
                >
                  {word.endsWith('.') ? (
                    <>
                      {word.slice(0, -1)}
                      <span className="text-flame">.</span>
                    </>
                  ) : (
                    word
                  )}
                </motion.span>
              ))}
            </h1>

            {/* Typing animation */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.0, duration: 0.5 }}
              className="mb-6"
            >
              <TypeWriter
                text="slim gedaan."
                className="text-sm text-muted/60"
                delay={1500}
                speed={90}
              />
            </motion.div>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.9, ease: [0.16, 1, 0.3, 1] }}
              className="text-muted text-lg max-w-md mb-8 leading-relaxed"
            >
              Van offerte tot factuur — alles in een systeem.
              Geen losse tools, geen add-ons. Gebouwd door vakmensen.
            </motion.p>

            {/* Waitlist form */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 1.1, ease: [0.16, 1, 0.3, 1] }}
            >
              <WachtlijstForm />
              <p className="text-xs text-muted/50 mt-3">
                Eerste 30 dagen gratis. Geen creditcard nodig.
              </p>
            </motion.div>
          </div>

          {/* Right: Floating mockups */}
          <div className="flex-1 relative hidden lg:block">
            <motion.div
              style={{ y: mockupY }}
              initial={{ opacity: 0, x: 40, rotate: 4 }}
              animate={{ opacity: 1, x: 0, rotate: 4 }}
              transition={{ duration: 1, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="relative z-10"
            >
              <DashboardMockup className="w-full max-w-[520px]" />
            </motion.div>

            <motion.div
              style={{ y: phoneY }}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 1.0, ease: [0.16, 1, 0.3, 1] }}
              className="absolute -bottom-8 -left-4 z-20 rotate-[-3deg]"
            >
              <WerkbonMockup className="w-[160px]" />
            </motion.div>
          </div>

          {/* Mobile: Single mockup below */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="lg:hidden w-full max-w-sm mx-auto"
          >
            <DashboardMockup />
          </motion.div>
        </div>
      </div>

      {/* Gedaan ticker */}
      <div className="absolute bottom-0 left-0 right-0 overflow-hidden marquee-fade">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 1 }}
          className="flex animate-marquee whitespace-nowrap py-4"
        >
          {[...Array(2)].map((_, setIndex) => (
            <div key={setIndex} className="flex items-center">
              {[
                'offerte verstuurd',
                'factuur betaald',
                'project opgeleverd',
                'montage gepland',
                'werkbon getekend',
                'klant akkoord',
              ].map((item, i) => (
                <span
                  key={`${setIndex}-${i}`}
                  className="font-mono text-sm text-muted/30 mx-6 whitespace-nowrap"
                >
                  {item}<span className="text-flame/40">.</span>
                  <span className="mx-4 text-flame/20">&#10022;</span>
                </span>
              ))}
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
