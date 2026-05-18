'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'

// TODO: vervang door echte klantnamen + (later) logos.
const logos: { mark: string; name: string; tone: 'petrol' | 'flame' | 'green' | 'terra' | 'plum' }[] = [
  { mark: 'VS', name: 'Verhoef Signs', tone: 'petrol' },
  { mark: 'LH', name: 'Lichtreclame Heijmans', tone: 'flame' },
  { mark: 'DB', name: 'De Bruin Reclame', tone: 'green' },
  { mark: 'KS', name: 'Kemper Signing', tone: 'terra' },
  { mark: 'NL', name: 'Noord/Letters', tone: 'plum' },
  { mark: 'AT', name: 'Atelier 9', tone: 'petrol' },
]

const toneColor: Record<string, string> = {
  petrol: '#1A535C',
  flame: '#F15025',
  green: '#2D6B48',
  terra: '#9A5A48',
  plum: '#6A5A8A',
}

export default function TrustLogos() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })

  return (
    <section ref={ref} className="relative" style={{ backgroundColor: '#F3F2ED' }}>
      <div className="container-site py-12 md:py-16">
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="font-mono text-[10px] md:text-[11px] font-bold tracking-[0.22em] uppercase mb-7 md:mb-9 text-center"
          style={{ color: '#6B6B66' }}
        >
          Vertrouwd door signbedrijven en ateliers in Nederland
        </motion.p>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-x-6 gap-y-5 items-center justify-items-center">
          {logos.map((l, i) => (
            <motion.div
              key={l.name}
              initial={{ opacity: 0, y: 6 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.08 + i * 0.05 }}
              className="inline-flex items-center gap-2.5 grayscale opacity-70 hover:opacity-100 transition-opacity"
            >
              <span
                className="w-7 h-7 rounded-md inline-flex items-center justify-center font-mono text-[10px] font-bold text-white"
                style={{ backgroundColor: toneColor[l.tone] }}
              >
                {l.mark}
              </span>
              <span className="text-[13px] md:text-[14px] font-semibold" style={{ color: '#3F3F3A' }}>
                {l.name}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
