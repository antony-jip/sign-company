'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'

// TODO: vervang door echte cijfers zodra we ze hebben.
const stats: { n: string; suffix?: string; l: string }[] = [
  { n: '340', suffix: '+', l: 'signmakers werken in doen.' },
  { n: '€18M', suffix: '+', l: 'aan offertes verstuurd dit jaar' },
  { n: '6,4u', suffix: '.', l: 'tijdwinst per week per gebruiker' },
  { n: '11', suffix: '×', l: 'sneller factureren dan voorheen' },
]

export default function StatsStrip() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section
      ref={ref}
      className="relative"
      style={{ backgroundColor: '#F3F2ED' }}
      aria-label="Cijfers"
    >
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-px"
        style={{ backgroundColor: 'rgba(26,83,92,0.10)' }}
      />
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-px"
        style={{ backgroundColor: 'rgba(26,83,92,0.10)' }}
      />

      <div className="container-site relative py-10 md:py-14">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-y-8 md:gap-y-0 gap-x-6 md:gap-x-12">
          {stats.map((s, i) => (
            <motion.div
              key={s.l}
              initial={{ opacity: 0, y: 12 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.55, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
              className="md:border-l md:first:border-l-0 md:pl-6"
              style={{ borderColor: 'rgba(26,83,92,0.10)' }}
            >
              <p
                className="font-heading font-bold tabular-nums leading-none mb-2"
                style={{
                  fontSize: 'clamp(34px, 4vw, 52px)',
                  color: '#1A535C',
                  letterSpacing: '-1.5px',
                }}
              >
                {s.n}
                {s.suffix && <span style={{ color: '#F15025' }}>{s.suffix}</span>}
              </p>
              <p className="text-[13px] md:text-[14px] leading-snug" style={{ color: '#6B6B66' }}>
                {s.l}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
