'use client'

import { useState, useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import SerifItalic from '@/components/SerifItalic'
import { TrimCorners, TapePiece, MeasurementTag } from '@/components/brand/BrandMarks'
import { modules, type Module } from '@/data/modules'

// AI acties als werkwoorden — geen toverwoord maar doen
const AI_ACTIES = [
  { verb: 'Vat', rest: 'mails samen' },
  { verb: 'Beantwoordt', rest: 'mails in jouw toon' },
  { verb: 'Leest', rest: 'inkoopfacturen uit' },
  { verb: 'Kent', rest: 'jouw bedrijf' },
]

export default function ModulesCarousel() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section
      ref={ref}
      className="relative overflow-hidden"
      style={{ backgroundColor: '#F3F2ED' }}
    >
      <TrimCorners inset={28} size={16} color="rgba(26,83,92,0.28)" />
      {/* Eén zachte ambient blob — rustige warmte, geen drukte */}
      <div
        aria-hidden
        className="absolute -bottom-32 -right-24 w-[620px] h-[620px] rounded-full pointer-events-none"
        style={{ backgroundColor: '#E4DBC6', opacity: 0.35, filter: 'blur(100px)' }}
      />

      <div className="container-site relative py-24 md:py-32">

        {/* Header — uitgelijnd op het 2-koloms ritme van de Hero zodat secties doorlopen */}
        <div className="grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr] gap-10 lg:gap-16 items-end mb-14 md:mb-20">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-3xl"
          >
            {/* Eyebrow */}
            <div className="inline-flex items-center gap-2 mb-7">
              <span className="relative inline-flex items-center justify-center w-2 h-2">
                <span
                  className="absolute inset-0 rounded-full animate-ping"
                  style={{ backgroundColor: '#F15025', opacity: 0.4 }}
                />
                <span className="relative w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#F15025' }} />
              </span>
              <span
                className="font-mono text-[11px] font-medium tracking-[0.18em] uppercase"
                style={{ color: '#6B6B66' }}
              >
                De modules
              </span>
            </div>

            {/* Integrated headline — one cohesive line, smaller, doesn't wrap awkwardly */}
            <h2
              className="font-heading font-bold tracking-[-1px] md:tracking-[-2px] leading-[1.0] mb-6"
              style={{
                fontSize: 'clamp(32px, 4.2vw, 58px)',
                color: '#1A535C',
              }}
            >
              <span style={{ color: '#F15025' }}>10</span>{' '}
              <SerifItalic>krachtige</SerifItalic> modules<span style={{ color: '#F15025' }}>,</span>{' '}
              <span style={{ color: '#1A535C' }}>1</span>{' '}
              <span style={{ color: '#6B6B66' }}>overzicht</span>
              <span style={{ color: '#F15025' }}>.</span>
            </h2>

            <p className="text-[16px] md:text-[19px] leading-[1.55] max-w-lg" style={{ color: '#3F3F3A' }}>
              Eén plek voor je hele bedrijf.{' '}
              <strong style={{ color: '#1A535C', fontWeight: 600 }}>
                Krachtige AI onder de motorkap
              </strong>
              <span style={{ color: '#F15025' }}>.</span>
            </p>
          </motion.div>

          {/* Right — "AI dat werkt" card (geen toverwoord, werkwoord) */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="hidden lg:block w-[320px] lg:justify-self-end"
          >
            <div className="relative">
              {/* Tape piece sticker — workshop signal */}
              <div className="absolute -top-3 -right-3 z-10">
                <TapePiece width={70} height={20} rotate={6} color="#1A535C">
                  Daan
                </TapePiece>
              </div>
            <div
              className="relative rounded-[10px] bg-white overflow-hidden"
              style={{
                border: '1px solid rgba(26,83,92,0.08)',
                boxShadow: '0 1px 2px rgba(20,40,40,0.04), 0 16px 32px -16px rgba(20,40,40,0.18)',
              }}
            >
              {/* Header strip */}
              <div className="px-5 pt-5 pb-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="inline-flex items-center gap-1.5">
                    <span className="relative inline-flex items-center justify-center w-2 h-2">
                      <span
                        className="absolute inset-0 rounded-full animate-ping"
                        style={{ backgroundColor: '#F15025', opacity: 0.4 }}
                      />
                      <span className="relative w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#F15025' }} />
                    </span>
                    <span
                      className="font-mono text-[10px] font-bold tracking-[0.22em] uppercase"
                      style={{ color: '#6B6B66' }}
                    >
                      Daan · AI
                    </span>
                  </div>
                  <span
                    className="font-mono text-[9px] tracking-[0.15em] uppercase"
                    style={{ color: '#6B6B66' }}
                  >
                    Live
                  </span>
                </div>

                <h3
                  className="font-heading text-[24px] font-bold leading-[1.0] tracking-tight"
                  style={{ color: '#1A535C' }}
                >
                  AI als <SerifItalic>werkwoord</SerifItalic>
                  <span style={{ color: '#F15025' }}>.</span>
                </h3>
              </div>

              {/* AI actions — verb-first */}
              <ul style={{ borderTop: '1px solid rgba(26,83,92,0.06)' }}>
                {AI_ACTIES.map((a, i) => (
                  <li
                    key={i}
                    className="flex items-baseline gap-3 px-5 py-3 transition-colors hover:bg-[rgba(241,80,37,0.03)]"
                    style={{
                      borderBottom: i < AI_ACTIES.length - 1 ? '1px solid rgba(26,83,92,0.05)' : 'none',
                    }}
                  >
                    <span
                      className="font-mono text-[9px] font-bold tabular-nums"
                      style={{ color: '#6B6B66' }}
                    >
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <div className="flex-1">
                      <p className="text-[14px] leading-tight" style={{ color: '#1A1A1A' }}>
                        <span style={{ color: '#F15025', fontWeight: 600 }}>{a.verb}</span>{' '}
                        <span style={{ color: '#3F3F3A' }}>{a.rest}</span>
                        <span style={{ color: '#F15025' }}>.</span>
                      </p>
                    </div>
                  </li>
                ))}
              </ul>

              {/* Footer link */}
              <Link
                href="/features/ai"
                className="flex items-center justify-between px-5 py-3 text-[12px] font-semibold group"
                style={{
                  borderTop: '1px solid rgba(26,83,92,0.06)',
                  color: '#1A535C',
                  backgroundColor: 'rgba(241,80,37,0.03)',
                }}
              >
                <span className="font-mono tracking-[0.18em] uppercase text-[10px]">
                  Maak kennis met Daan
                </span>
                <ArrowUpRight
                  className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  strokeWidth={2.2}
                />
              </Link>
            </div>
            </div>{/* /tape-wrapper */}
          </motion.div>
        </div>

        {/* Module grid — clean cards, hover lift */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
          {modules.map((mod, i) => (
            <ModuleCard key={mod.label} mod={mod} index={i} isInView={isInView} />
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────────────────────────
   MODULE CARD — clean, white bg, hover lift, branded icon
   ───────────────────────────────────────────────────────────────── */
function ModuleCard({
  mod,
  index,
  isInView,
}: {
  mod: Module
  index: number
  isInView: boolean
}) {
  const [hovered, setHovered] = useState(false)
  const Icon = mod.icon

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{
        duration: 0.55,
        delay: 0.2 + index * 0.04,
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      <Link
        href={mod.href}
        className={`group block ${mod.comingSoon ? 'pointer-events-none' : ''}`}
        tabIndex={mod.comingSoon ? -1 : 0}
        aria-disabled={mod.comingSoon ? 'true' : undefined}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <motion.div
          className="relative rounded-[10px] overflow-hidden p-5 md:p-6 h-full bg-white"
          style={{
            border: '1px solid rgba(26,83,92,0.07)',
            boxShadow: hovered
              ? '0 12px 28px -10px rgba(20,40,40,0.18), 0 2px 6px rgba(0,0,0,0.04)'
              : '0 1px 2px rgba(20,40,40,0.04), 0 4px 12px -8px rgba(20,40,40,0.08)',
          }}
          animate={{ y: hovered ? -4 : 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Coming soon stamp */}
          {mod.comingSoon && (
            <div
              className="absolute top-2.5 right-2.5 px-1.5 py-0.5 rotate-[4deg]"
              style={{
                backgroundColor: '#1A1A1A',
                boxShadow: '0 2px 6px rgba(0,0,0,0.18)',
              }}
            >
              <span className="font-mono text-[8px] font-bold uppercase tracking-[0.18em] text-white">
                Binnenkort
              </span>
            </div>
          )}

          {/* Icon tile — soft color-tinted square */}
          <div
            className="relative w-12 h-12 rounded-[8px] flex items-center justify-center mb-5 transition-colors duration-300"
            style={{
              backgroundColor: hovered ? `${mod.color}1A` : `${mod.color}11`,
            }}
          >
            <Icon
              style={{ color: mod.color }}
              className="w-6 h-6 transition-transform duration-300 group-hover:scale-110"
            />
          </div>

          {/* Label + sub */}
          <h3
            className="font-heading text-[17px] md:text-[18px] font-bold tracking-tight leading-[1.15] mb-1"
            style={{ color: '#1A1A1A' }}
          >
            {mod.label}
            <span style={{ color: mod.color }}>.</span>
          </h3>
          <p className="text-[13px] leading-[1.45]" style={{ color: '#6B6B66' }}>
            {mod.sub}
          </p>

          {/* Footer — number + arrow on hover */}
          <div className="flex items-center justify-between mt-5 pt-3" style={{ borderTop: '1px solid rgba(26,83,92,0.06)' }}>
            <span
              className="font-mono text-[10px] tracking-[0.18em] tabular-nums uppercase"
              style={{ color: '#6B6B66' }}
            >
              {String(index + 1).padStart(2, '0')}
            </span>
            <motion.span
              animate={{ x: hovered ? 2 : 0, opacity: hovered ? 1 : 0.4 }}
              transition={{ duration: 0.25 }}
              style={{ color: mod.color }}
            >
              <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={2.2} />
            </motion.span>
          </div>
        </motion.div>
      </Link>
    </motion.div>
  )
}
