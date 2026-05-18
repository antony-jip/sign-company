'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { Check, X } from 'lucide-react'
import SerifItalic from '@/components/SerifItalic'

const NU = [
  'Offerte uit Excel knippen, in mail plakken, prijs onthouden.',
  'App-groep om Jeroen te bereiken voor maandag.',
  'Bonnetjes overtikken in het boekhoudpakket. Maandagochtend dus.',
  'Werkbonnen op papier, soms zoek, vaak onleesbaar.',
  '"Heeft Van Meer al betaald?" Niemand weet het zeker.',
]

const MET = [
  'Offerte vanuit het project gemaakt en verstuurd. Klant heeft hem bekeken.',
  'Montage maandag staat in Jeroens planning. Hij heeft hem ontvangen.',
  'Werkbon digitaal op de telefoon, klant tekent ter plekke.',
  'Factuur volgt zodra de werkbon getekend is. Eén klik.',
  'Iedereen ziet hetzelfde. Geen "wie wist wat".',
]

export default function PainComparison() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section ref={ref} className="relative" style={{ backgroundColor: '#F3F2ED' }}>
      <div className="container-site relative py-20 md:py-28">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-3xl mb-12 md:mb-16"
        >
          <div className="inline-flex items-center gap-2 mb-5">
            <span className="w-6 h-px" style={{ backgroundColor: '#F15025' }} />
            <span className="font-mono text-[11px] font-bold tracking-[0.22em] uppercase" style={{ color: '#6B6B66' }}>
              Het probleem
            </span>
          </div>
          <h2
            className="font-heading font-bold tracking-[-1px] md:tracking-[-2.5px] leading-[1.0] md:leading-[0.95]"
            style={{ fontSize: 'clamp(32px, 5vw, 64px)', color: '#1A535C' }}
          >
            Negen tabbladen<span style={{ color: '#F15025' }}>.</span>{' '}
            <span style={{ color: '#6B6B66' }}>
              <SerifItalic>Eén</SerifItalic> project
              <span style={{ color: '#F15025' }}>.</span>
            </span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
          {/* NU column */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-[14px] p-6 md:p-8 bg-white"
            style={{
              border: '1px solid rgba(192,58,24,0.18)',
              boxShadow: '0 1px 2px rgba(20,40,40,0.04), 0 12px 24px -10px rgba(20,40,40,0.10)',
            }}
          >
            <div className="flex items-center justify-between mb-5">
              <span
                className="font-mono text-[10px] font-bold tracking-[0.22em] uppercase px-2 py-1 rounded-[4px]"
                style={{ backgroundColor: 'rgba(192,58,24,0.10)', color: '#C03A18' }}
              >
                Nu
              </span>
              <span className="font-mono text-[10px] tracking-[0.18em] uppercase" style={{ color: '#9B9B95' }}>
                Vrijdag, 16:42
              </span>
            </div>
            <h3 className="font-heading text-[22px] md:text-[26px] font-bold tracking-[-0.5px] leading-[1.15] mb-6" style={{ color: '#1A1A1A' }}>
              Wat je vandaag nog moet doen<span style={{ color: '#F15025' }}>.</span>
            </h3>
            <ul className="space-y-3">
              {NU.map((t) => (
                <li key={t} className="flex items-start gap-3 text-[14px] leading-[1.55]" style={{ color: '#4A4A46' }}>
                  <span
                    className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5"
                    style={{ backgroundColor: 'rgba(192,58,24,0.10)' }}
                  >
                    <X className="w-3 h-3" style={{ color: '#C03A18' }} strokeWidth={2.6} />
                  </span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* MET DOEN. column */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-[14px] p-6 md:p-8 relative overflow-hidden"
            style={{
              backgroundColor: '#0F3A42',
              boxShadow: '0 16px 32px -14px rgba(20,40,40,0.28)',
            }}
          >
            <div
              aria-hidden
              className="absolute -top-20 -right-20 w-[280px] h-[280px] rounded-full pointer-events-none"
              style={{ backgroundColor: '#F15025', opacity: 0.14, filter: 'blur(80px)' }}
            />
            <div className="relative flex items-center justify-between mb-5">
              <span
                className="font-mono text-[10px] font-bold tracking-[0.22em] uppercase px-2 py-1 rounded-[4px] text-white"
                style={{ backgroundColor: '#F15025' }}
              >
                Met doen<span>.</span>
              </span>
              <span className="font-mono text-[10px] tracking-[0.18em] uppercase" style={{ color: 'rgba(255,255,255,0.45)' }}>
                Vrijdag, 16:42
              </span>
            </div>
            <h3 className="relative font-heading text-[22px] md:text-[26px] font-bold tracking-[-0.5px] leading-[1.15] mb-6 text-white">
              Wat je vandaag al hebt gedaan<span style={{ color: '#F15025' }}>.</span>
            </h3>
            <ul className="relative space-y-3">
              {MET.map((t) => (
                <li key={t} className="flex items-start gap-3 text-[14px] leading-[1.55]" style={{ color: 'rgba(255,255,255,0.78)' }}>
                  <span
                    className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5"
                    style={{ backgroundColor: 'rgba(241,80,37,0.20)' }}
                  >
                    <Check className="w-3 h-3" style={{ color: '#F15025' }} strokeWidth={2.6} />
                  </span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
