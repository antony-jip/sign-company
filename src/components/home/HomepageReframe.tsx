'use client'

import { useRef } from 'react'
import Link from 'next/link'
import { motion, useInView } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { morningNotifications, pains } from '@/data/werkdag'

const PETROL = '#1A535C'
const FLAME = '#F15025'
const MUTED = '#6B6B66'
const INK = '#1A1A1A'

// Verkorte warmer + reframe uit /hoe-het-werkt: statisch vignet met drie
// notificaties en de vier pijnpunten zonder "Kost je:"-uitwerking. De
// volledige versie (scroll-theater + diagnose + doen.-dag) blijft op
// /hoe-het-werkt staan.
const VIGNETTE_INDICES = [0, 1, 3] // Jansen Bouw, Mark (monteur), gemiste aanvraag

export default function HomepageReframe() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section ref={ref} className="relative overflow-hidden" style={{ backgroundColor: '#F5F4F1' }}>
      <div className="container-site py-24 md:py-32">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center mb-16 md:mb-20">

          {/* Kop */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="inline-flex items-center gap-2 mb-7">
              <span className="relative inline-flex items-center justify-center w-2 h-2">
                <span className="absolute inset-0 rounded-full animate-ping" style={{ backgroundColor: FLAME, opacity: 0.45 }} />
                <span className="relative w-1.5 h-1.5 rounded-full" style={{ backgroundColor: FLAME }} />
              </span>
              <span className="font-mono text-[11px] font-medium tracking-[0.18em] uppercase" style={{ color: MUTED }}>
                08:15 · Maandagochtend
              </span>
            </div>

            <h2
              className="font-heading font-bold tracking-[-1px] md:tracking-[-2.5px] leading-[1.0] md:leading-[0.95] mb-6"
              style={{ fontSize: 'clamp(32px, 4.5vw, 56px)', color: PETROL }}
            >
              Je software stopt waar<span style={{ color: FLAME }}>.</span>
              <br />
              <span style={{ color: MUTED }}>je klant begint</span>
              <span style={{ color: FLAME }}>.</span>
            </h2>

            <p className="text-[15px] md:text-[18px] leading-[1.6] max-w-lg" style={{ color: '#3F3F3A' }}>
              Je hebt vast al een systeem voor offertes en facturen. Prima. Maar waar deals
              gemaakt of gebroken worden — portaal, mail, opvolging — sta je er alleen voor.
            </p>
          </motion.div>

          {/* Vignet — drie notificaties, statisch */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-md w-full lg:justify-self-end"
          >
            <div className="space-y-2.5 mb-6">
              {VIGNETTE_INDICES.map((idx, i) => {
                const n = morningNotifications[idx]
                const Icon = n.icon
                return (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 14 }}
                    animate={inView ? { opacity: 1, y: 0, rotate: i % 2 === 0 ? -0.4 : 0.4 } : {}}
                    transition={{ duration: 0.5, delay: 0.3 + i * 0.12, ease: [0.16, 1, 0.3, 1] }}
                    className="flex items-center gap-3 md:gap-4 px-4 md:px-5 py-3 md:py-3.5 rounded-xl bg-white"
                    style={{
                      border: '1px solid rgba(26,83,92,0.08)',
                      boxShadow: '0 1px 2px rgba(20,40,40,0.04), 0 16px 40px -24px rgba(19,62,69,0.22)',
                    }}
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: '#F5F4F1' }}
                    >
                      <Icon className="w-5 h-5" style={{ color: PETROL }} strokeWidth={1.8} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="text-[13px] md:text-[14px] font-semibold truncate" style={{ color: INK }}>
                          {n.from}
                        </p>
                        <span className="font-mono text-[10px] md:text-[11px] flex-shrink-0" style={{ color: MUTED }}>
                          {n.when}
                        </span>
                      </div>
                      <p className="text-[12px] md:text-[13px] truncate" style={{ color: MUTED }}>
                        {n.text}
                      </p>
                    </div>
                  </motion.div>
                )
              })}
            </div>

            <p className="text-[15px] md:text-[17px] font-heading font-semibold">
              <span style={{ color: PETROL }}>Dit is je maandag</span>
              <span style={{ color: FLAME }}>.</span>{' '}
              <span style={{ color: MUTED }}>En je dinsdag</span>
              <span style={{ color: FLAME }}>.</span>{' '}
              <span style={{ color: MUTED }}>En je vrijdag</span>
              <span style={{ color: FLAME }}>.</span>
            </p>
          </motion.div>
        </div>

        {/* Pijnpunten — titel + één regel, zonder "Kost je:" */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5 mb-12 md:mb-14">
          {pains.map((pain, i) => {
            const Icon = pain.icon
            return (
              <motion.div
                key={pain.title}
                initial={{ opacity: 0, y: 20 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.55, delay: 0.35 + i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                className="p-5 md:p-6 rounded-2xl"
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid rgba(26,83,92,0.08)',
                  boxShadow: '0 1px 2px rgba(20,40,40,0.04)',
                }}
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center mb-4"
                  style={{ backgroundColor: '#FEE8E2' }}
                >
                  <Icon className="w-4 h-4" style={{ color: FLAME }} strokeWidth={1.8} />
                </div>
                <h3 className="font-heading text-[15px] md:text-[16px] font-bold tracking-tight mb-1.5 leading-snug" style={{ color: PETROL }}>
                  {pain.title}
                  <span style={{ color: FLAME }}>.</span>
                </h3>
                <p className="text-[13px] md:text-[13.5px] leading-relaxed" style={{ color: MUTED }}>
                  {pain.body}
                </p>
              </motion.div>
            )
          })}
        </div>

        {/* Doorklik naar de volledige werkdag */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="text-center text-[14px] md:text-[15px]"
          style={{ color: MUTED }}
        >
          Herkenbaar?{' '}
          <Link
            href="/hoe-het-werkt"
            className="font-semibold inline-flex items-center gap-1 group transition-opacity hover:opacity-70"
            style={{ color: PETROL }}
          >
            <span className="relative">
              Zie de hele werkdag
              <span
                className="absolute left-0 -bottom-0.5 h-[2px] w-full origin-left scale-x-100 transition-transform duration-300 group-hover:scale-x-0"
                style={{ backgroundColor: PETROL }}
              />
            </span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" style={{ color: FLAME }} />
          </Link>
        </motion.p>
      </div>
    </section>
  )
}
