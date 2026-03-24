'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'

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
            <p className="font-mono text-5xl md:text-7xl text-white font-medium mb-6">
              &euro;49
            </p>
            <p className="text-white/80 text-lg md:text-xl max-w-md mx-auto leading-relaxed">
              per maand. Alles erin. Geen per-user pricing. Geen add-ons.
              Geen implementatiekosten.
            </p>
            <p className="font-heading text-2xl md:text-3xl text-white mt-8 tracking-tight">
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
