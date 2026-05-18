'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { Check } from 'lucide-react'
import SerifItalic from '@/components/SerifItalic'

const promises = [
  '30 dagen gratis',
  'Geen creditcard',
  '€79/mnd flat',
  'Maandelijks opzegbaar',
]

export default function PromiseStrip() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })

  return (
    <section ref={ref} className="relative" style={{ backgroundColor: '#F3F2ED' }}>
      <div className="container-site relative py-16 md:py-24">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-3xl mx-auto text-center"
        >
          <div className="inline-flex items-center gap-2 mb-5">
            <span className="w-6 h-px" style={{ backgroundColor: '#F15025' }} />
            <span className="font-mono text-[11px] font-bold tracking-[0.22em] uppercase" style={{ color: '#6B6B66' }}>
              Geen verrassingen
            </span>
            <span className="w-6 h-px" style={{ backgroundColor: '#F15025' }} />
          </div>

          <h2
            className="font-heading font-bold tracking-[-1px] md:tracking-[-2.5px] leading-[1.0] md:leading-[0.95] mb-6"
            style={{ fontSize: 'clamp(32px, 5vw, 60px)', color: '#1A535C' }}
          >
            Geen tiers<span style={{ color: '#F15025' }}>.</span>{' '}
            Geen add-ons<span style={{ color: '#F15025' }}>.</span>{' '}
            <span style={{ color: '#6B6B66' }}>
              Geen <SerifItalic>lock-in</SerifItalic>
              <span style={{ color: '#F15025' }}>.</span>
            </span>
          </h2>

          <p className="text-[15px] md:text-[18px] leading-[1.6] max-w-lg mx-auto mb-9 md:mb-10" style={{ color: '#3F3F3A' }}>
            Eén abonnement, alles erin. 30 dagen gratis om het te ontdekken — daarna pas je creditcard erbij.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-3">
            {promises.map((p, i) => (
              <motion.span
                key={p}
                initial={{ opacity: 0, y: 6 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.4, delay: 0.15 + i * 0.05 }}
                className="inline-flex items-center gap-2 px-3.5 h-9 rounded-full text-[12.5px] font-semibold"
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid rgba(26,83,92,0.10)',
                  color: '#1A535C',
                  boxShadow: '0 1px 2px rgba(20,40,40,0.04)',
                }}
              >
                <Check className="w-3.5 h-3.5" style={{ color: '#F15025' }} strokeWidth={2.6} />
                {p}
              </motion.span>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
