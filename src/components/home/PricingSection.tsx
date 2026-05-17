'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { ArrowRight, Check } from 'lucide-react'
import SerifItalic from '@/components/SerifItalic'
import { TrimCorners, FlameStamp } from '@/components/brand/BrandMarks'

const FEATURES = [
  '10 modules · alles inbegrepen',
  'Tot 10 gebruikers',
  'Daan AI · vat mails samen, leest inkoopfacturen uit',
  'Mollie · Exact Online gekoppeld',
  'Eigen mailbox · IMAP/SMTP per gebruiker',
  'Onbeperkt klanten en projecten',
  'Klantportaal · één link, geen inlog',
  'EU-data · dagelijkse backups',
  'Geen opzetkosten · geen add-ons',
  'Maandelijks opzegbaar · data altijd jouw',
]

export default function PricingSection() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section
      ref={ref}
      className="relative"
      style={{ backgroundColor: '#F3F2ED' }}
    >
      {/* Backdrop layer scoped */}
      <div aria-hidden className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-20 -left-20 w-[520px] h-[520px] rounded-full"
          style={{ backgroundColor: '#E8E1D0', opacity: 0.6, filter: 'blur(80px)' }}
        />
        <div
          className="absolute -bottom-20 -right-20 w-[560px] h-[560px] rounded-full"
          style={{ backgroundColor: '#E4DBC6', opacity: 0.5, filter: 'blur(90px)' }}
        />
        <div
          className="absolute top-[30%] right-[15%] w-[300px] h-[300px] rounded-full"
          style={{ backgroundColor: '#F15025', opacity: 0.07, filter: 'blur(100px)' }}
        />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='22' height='22' viewBox='0 0 22 22'><circle cx='11' cy='11' r='0.7' fill='%231A1A1A' opacity='0.08'/></svg>")`,
            backgroundSize: '22px 22px',
          }}
        />
      </div>

      <TrimCorners inset={28} size={16} color="rgba(26,83,92,0.28)" />

      <div className="container-site relative py-24 md:py-32">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-2xl mb-14 md:mb-16 mx-auto text-center"
        >
          <div className="inline-flex items-center gap-2 mb-7">
            <span className="relative inline-flex items-center justify-center w-2 h-2">
              <span
                className="absolute inset-0 rounded-full animate-ping"
                style={{ backgroundColor: '#F15025', opacity: 0.45 }}
              />
              <span className="relative w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#F15025' }} />
            </span>
            <span
              className="font-mono text-[11px] font-medium tracking-[0.18em] uppercase"
              style={{ color: '#6B6B66' }}
            >
              Wat het kost
            </span>
          </div>

          <h2
            className="font-heading font-bold tracking-[-1.5px] md:tracking-[-2.5px] leading-[0.95]"
            style={{ fontSize: 'clamp(36px, 5vw, 64px)', color: '#1A535C' }}
          >
            <span className="block">Eén plan<span style={{ color: '#F15025' }}>.</span></span>
            <span className="block" style={{ color: '#6B6B66' }}>
              <SerifItalic style={{ letterSpacing: '-2px' }}>Alles</SerifItalic> erin
              <span style={{ color: '#F15025' }}>.</span>
            </span>
          </h2>

          <p
            className="text-[16px] md:text-[18px] leading-[1.55] mt-6"
            style={{ color: '#3F3F3A' }}
          >
            Geen tiers, geen verrassingen. Wat je ziet, krijg je.
          </p>
        </motion.div>

        {/* THE TICKET — center stage */}
        <PriceTicket inView={inView} />

      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────────────────────────
   PRICE TICKET — voucher / rate-card design
   ───────────────────────────────────────────────────────────────── */
function PriceTicket({ inView }: { inView: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.9, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="relative max-w-[720px] mx-auto"
    >
      {/* AI INBEGREPEN stamp — rotated on top-left, like wet ink */}
      <motion.div
        initial={{ opacity: 0, scale: 0.6, rotate: -20 }}
        animate={inView ? { opacity: 1, scale: 1, rotate: -12 } : {}}
        transition={{
          duration: 0.6,
          delay: 0.7,
          type: 'spring',
          stiffness: 200,
          damping: 15,
        }}
        className="absolute -top-7 -left-2 md:-top-6 md:-left-10 z-20"
        style={{ transformOrigin: 'center' }}
      >
        <div
          className="inline-flex flex-col items-center justify-center px-4 py-2 text-center"
          style={{
            border: '2px solid #F15025',
            color: '#F15025',
            backgroundColor: '#FFFFFF',
            boxShadow: '0 4px 10px rgba(241,80,37,0.18)',
          }}
        >
          <span className="font-mono text-[10px] md:text-[11px] font-bold tracking-[0.18em] leading-tight">
            AI
          </span>
          <span className="font-mono text-[8px] md:text-[9px] font-bold tracking-[0.18em] leading-tight">
            INBEGREPEN
          </span>
        </div>
      </motion.div>

      {/* The card itself */}
      <div
        className="relative rounded-[12px] overflow-hidden"
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid rgba(26,83,92,0.10)',
          boxShadow:
            '0 4px 6px -1px rgba(20,40,40,0.06), 0 24px 48px -20px rgba(20,40,40,0.20), 0 60px 100px -40px rgba(20,40,40,0.15)',
        }}
      >
        {/* Top strip — ticket header */}
        <div
          className="flex items-center justify-between px-6 md:px-8 py-3"
          style={{ backgroundColor: '#0F3A42' }}
        >
          <span
            className="font-mono text-[10px] font-bold tracking-[0.22em] uppercase"
            style={{ color: 'rgba(255,255,255,0.75)' }}
          >
            Rate card · doen. STD-001
          </span>
          <span
            className="font-mono text-[10px] tracking-[0.18em] uppercase"
            style={{ color: 'rgba(255,255,255,0.45)' }}
          >
            Editie 2026
          </span>
        </div>

        {/* Main body */}
        <div className="px-6 md:px-12 pt-8 md:pt-10 pb-6">
          <div className="grid grid-cols-1 md:grid-cols-[1.05fr_0.95fr] gap-8 md:gap-10 items-end">
            {/* LEFT — price */}
            <div>
              <p
                className="font-mono text-[10px] font-bold tracking-[0.22em] uppercase mb-3"
                style={{ color: '#6B6B66' }}
              >
                Per maand · ex btw
              </p>

              {/* MASSIVE price with vinyl-cut depth */}
              <div className="relative inline-block">
                <h3
                  className="font-heading font-bold leading-[0.78] tabular-nums"
                  style={{
                    fontSize: 'clamp(96px, 13vw, 168px)',
                    color: '#1A535C',
                    letterSpacing: '-6px',
                    textShadow: '2px 3px 0 rgba(15,58,66,0.10)',
                  }}
                >
                  €79
                  <span style={{ color: '#F15025' }}>.</span>
                </h3>
              </div>

              <p
                className="text-[18px] md:text-[22px] leading-[1.1] mt-3"
                style={{
                  color: '#1A535C',
                  fontFamily: '"Instrument Serif", var(--font-instrument-serif), Georgia, serif',
                  fontStyle: 'italic',
                  fontWeight: 400,
                }}
              >
                per maand. alles inbegrepen.
              </p>
            </div>

            {/* RIGHT — features as compact list */}
            <div>
              <p
                className="font-mono text-[10px] font-bold tracking-[0.22em] uppercase mb-3"
                style={{ color: '#6B6B66' }}
              >
                Wat je krijgt
              </p>
              <ul className="space-y-2">
                {FEATURES.map((f, i) => (
                  <motion.li
                    key={f}
                    initial={{ opacity: 0, x: 8 }}
                    animate={inView ? { opacity: 1, x: 0 } : {}}
                    transition={{
                      duration: 0.4,
                      delay: 0.4 + i * 0.04,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                    className="flex items-start gap-2"
                  >
                    <Check
                      className="w-3.5 h-3.5 mt-0.5 flex-shrink-0"
                      style={{ color: '#F15025' }}
                      strokeWidth={2.6}
                    />
                    <span className="text-[13px] leading-snug" style={{ color: '#3F3F3A' }}>
                      {f}
                    </span>
                  </motion.li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* PERFORATION — dashed divider with side notches (cream-colored to match section) */}
        <div className="relative">
          <div
            aria-hidden
            className="absolute -translate-y-1/2 w-4 h-4 rounded-full"
            style={{ backgroundColor: '#F3F2ED', top: '50%', left: '-8px' }}
          />
          <div
            aria-hidden
            className="absolute -translate-y-1/2 w-4 h-4 rounded-full"
            style={{ backgroundColor: '#F3F2ED', top: '50%', right: '-8px' }}
          />
          <div
            className="mx-6 md:mx-12 my-1"
            style={{
              borderTop: '2px dashed rgba(26,83,92,0.20)',
            }}
          />
        </div>

        {/* Bottom stub — CTA + meta */}
        <div className="px-6 md:px-12 pt-5 pb-7 md:pb-8">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            <a
              href="https://app.doen.team/register"
              className="inline-flex items-center justify-center gap-2 font-mono text-[12px] font-bold tracking-[0.18em] uppercase text-white px-7 h-[56px] rounded-[6px] transition-all duration-300 hover:scale-[1.02] active:scale-[0.97]"
              style={{
                backgroundColor: '#F15025',
                boxShadow: '0 8px 24px rgba(241,80,37,0.32)',
              }}
            >
              <span>Start 30 dagen gratis</span>
              <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
            </a>

            <a
              href="/contact"
              className="inline-flex items-center justify-center gap-2 text-[13px] font-semibold transition-opacity hover:opacity-60 group"
              style={{ color: '#1A535C' }}
            >
              <span className="relative">
                Meer dan 10 gebruikers? Bel ons
                <span
                  className="absolute left-0 -bottom-0.5 h-[2px] w-full origin-left scale-x-100 transition-transform duration-300 group-hover:scale-x-0"
                  style={{ backgroundColor: '#1A535C' }}
                />
              </span>
            </a>
          </div>

          {/* Tiny meta line */}
          <div
            className="flex flex-wrap items-center justify-between gap-2 mt-5 pt-4 font-mono text-[9px] md:text-[10px] tracking-[0.18em] uppercase"
            style={{
              borderTop: '1px solid rgba(26,83,92,0.08)',
              color: '#6B6B66',
            }}
          >
            <span>Geen creditcard · maandelijks opzegbaar</span>
            <span>Uitgifte · NL · doen.team</span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
