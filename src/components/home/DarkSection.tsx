'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import DePunt from '../brand/DePunt'
import CountUp from '../CountUp'

const statuses = [
  { text: 'verstuurd', delay: 0 },
  { text: 'betaald', delay: 0.3 },
  { text: 'opgeleverd', delay: 0.6 },
  { text: 'gedaan', delay: 0.9 },
]

export default function DarkSection() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section className="relative bg-petrol dot-grid-petrol overflow-hidden">
      {/* DePunt decorations */}
      <div className="absolute -top-10 -right-10 opacity-30">
        <DePunt variant="light" size={200} />
      </div>
      <div className="absolute -bottom-10 -left-10 opacity-20">
        <DePunt variant="light" size={160} />
      </div>

      <div className="container-site py-24 md:py-36 relative z-10" ref={ref}>
        <div className="max-w-3xl mx-auto text-center">
          {/* Status sequence */}
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 mb-12">
            {statuses.map(({ text, delay }) => (
              <motion.span
                key={text}
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
                className="font-mono text-lg md:text-2xl text-white/90"
              >
                {text}<span className="text-flame">.</span>
              </motion.span>
            ))}
          </div>

          {/* Price statement */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 1.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="flex flex-col items-center mb-6">
              <CountUp end={79} prefix="&euro;" className="text-4xl md:text-6xl text-white font-medium" />
              <p className="text-white/40 text-xs mt-1">ex. btw · tot 10 gebruikers · meer? neem contact op</p>
            </div>
            <p className="text-white/70 text-lg md:text-xl max-w-md mx-auto leading-relaxed mb-4">
              Alles erin. Mollie, Exact Online, Probo, AI. Geen per-user pricing. Geen add-ons. Geen modules bijkopen.
            </p>
            <p className="font-heading text-2xl md:text-3xl text-white mt-6 tracking-tight">
              Gewoon doen<span className="text-flame">.</span>
            </p>
          </motion.div>
        </div>
      </div>

      {/* Gradient edges */}
      <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-bg to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-bg to-transparent" />
    </section>
  )
}
