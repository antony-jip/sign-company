'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, Check } from 'lucide-react'
import SerifItalic from '@/components/SerifItalic'
import PageBackdrop from '@/components/PageBackdrop'
import { TrimCorners, FlameStamp } from '@/components/brand/BrandMarks'

const allFeatures = [
  'Onbeperkt projecten, offertes en facturen',
  'Planning met drag-and-drop',
  'Werkbonnen met foto\'s en uren',
  'Klantportaal met goedkeuring',
  'AI-assistent Daan',
  'Mollie betaallinks (iDEAL, creditcard)',
  'Email met gedeelde inbox',
  'CRM met klantbeheer',
  'Visualizer (10 credits)',
  'Rapportages en tijdregistratie',
  'Alle toekomstige updates',
  'Nederlandse support',
]

const faqs = [
  { q: 'Kan ik het eerst proberen?', a: 'Eerste 30 dagen gratis. Geen creditcard nodig. Geen verplichtingen.' },
  { q: 'Moet ik extra betalen voor AI of het klantportaal?', a: 'Nee. Alles zit erin. Bij ons geen feature-gates of premium-tiers.' },
  { q: 'Welke koppelingen zitten erbij?', a: 'Mollie, Exact Online, email (IMAP/SMTP) en AI. Alles standaard, geen extra kosten.' },
  { q: 'Kan ik mijn data exporteren?', a: 'Altijd. CSV, PDF, wat je nodig hebt. Jouw data is van jou.' },
  { q: 'Moet ik een contract tekenen?', a: 'Nee. Maandelijks opzegbaar. Je blijft omdat het werkt.' },
  { q: 'Hoe verschilt doen. van andere software?', a: 'Gebouwd door vakmensen uit de branche. Alles in één systeem. Klantportaal, AI en planning zitten standaard in je abonnement.' },
]

export default function PrijzenContent() {
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  return (
    <div className="pt-24 md:pt-32" style={{ backgroundColor: '#F3F2ED' }}>

      {/* HERO */}
      <section className="relative overflow-hidden">
        <PageBackdrop variant="flame" />
        <TrimCorners inset={28} size={16} color="rgba(26,83,92,0.28)" />
        <FlameStamp size={420} opacity={0.05} style={{ top: '15%', right: '-180px' }} />

        <div className="container-site relative py-20 md:py-28 text-center max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 mb-7"
          >
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
              Eenvoudig · eerlijk · alles erin
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="font-heading font-bold tracking-[-2px] md:tracking-[-3px] leading-[0.92]"
            style={{ fontSize: 'clamp(44px, 6vw, 88px)', color: '#1A535C' }}
          >
            <span className="block">Eén prijs<span style={{ color: '#F15025' }}>.</span></span>
            <span className="block" style={{ color: '#6B6B66' }}>
              <SerifItalic style={{ letterSpacing: '-2px' }}>Alles</SerifItalic> erin
              <span style={{ color: '#F15025' }}>.</span>
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="text-[17px] md:text-[19px] mt-6 leading-[1.55] max-w-xl mx-auto"
            style={{ color: '#3F3F3A' }}
          >
            Geen modules bijkopen. Geen verrassingen. Het enige verschil is je teamgrootte.
          </motion.p>
        </div>
      </section>

      {/* PRICING CARDS — two-tier */}
      <section className="relative overflow-hidden">
        <PageBackdrop variant="default" showDots />

        <div className="container-site relative py-16 md:py-20">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">

            {/* Team — primary */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="rounded-[10px] p-6 md:p-10 h-full relative"
              style={{
                backgroundColor: '#1A535C',
                boxShadow: '0 16px 32px -12px rgba(20,40,40,0.25), 0 2px 6px rgba(0,0,0,0.06)',
              }}
            >
              <div className="absolute -top-3 left-8">
                <span
                  className="font-mono text-[10px] font-bold tracking-[0.2em] uppercase text-white px-3 py-1.5"
                  style={{ backgroundColor: '#F15025' }}
                >
                  Populair
                </span>
              </div>
              <p className="font-mono text-[10px] font-bold tracking-[0.22em] uppercase mb-6 text-white/45">Team</p>
              <div className="flex items-baseline gap-1 mb-1">
                <span
                  className="font-heading text-[60px] md:text-[68px] font-bold tracking-[-3px] text-white tabular-nums"
                  style={{ textShadow: '2px 3px 0 rgba(0,0,0,0.15)' }}
                >
                  €79
                  <span style={{ color: '#F15025' }}>.</span>
                </span>
              </div>
              <p
                className="text-[15px] mb-8 italic"
                style={{
                  color: 'rgba(255,255,255,0.6)',
                  fontFamily: '"Instrument Serif", var(--font-instrument-serif), Georgia, serif',
                }}
              >
                per maand ex. btw, tot 10 gebruikers
              </p>

              <div className="h-px mb-7" style={{ backgroundColor: 'rgba(255,255,255,0.12)' }} />

              <ul className="space-y-3">
                {allFeatures.map((f, i) => (
                  <li key={i} className="flex items-start gap-3 text-[14px]">
                    <Check className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: '#F15025' }} strokeWidth={2.6} />
                    <span className="text-white/80">{f}</span>
                  </li>
                ))}
              </ul>

              <a
                href="https://app.doen.team/register"
                className="mt-8 inline-flex items-center justify-center gap-2 w-full font-mono text-[12px] font-bold tracking-[0.2em] uppercase text-white px-7 h-[52px] rounded-[6px] transition-all duration-300 hover:scale-[1.02] active:scale-[0.97]"
                style={{
                  backgroundColor: '#F15025',
                  boxShadow: '0 8px 24px rgba(241,80,37,0.32)',
                }}
              >
                <span>Start 30 dagen gratis</span>
                <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
              </a>
            </motion.div>

            {/* Groter team — op aanvraag */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="rounded-[10px] p-6 md:p-10 h-full flex flex-col bg-white"
              style={{
                border: '1px solid rgba(26,83,92,0.08)',
                boxShadow: '0 1px 2px rgba(20,40,40,0.04), 0 12px 24px -10px rgba(20,40,40,0.12)',
              }}
            >
              <p className="font-mono text-[10px] font-bold tracking-[0.22em] uppercase mb-6" style={{ color: '#6B6B66' }}>Groter team</p>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="font-heading text-[36px] md:text-[42px] font-bold tracking-[-1.5px]" style={{ color: '#1A535C' }}>
                  Op aanvraag
                </span>
              </div>
              <p
                className="text-[15px] mb-8 italic"
                style={{
                  color: '#6B6B66',
                  fontFamily: '"Instrument Serif", var(--font-instrument-serif), Georgia, serif',
                }}
              >
                meer dan 10 gebruikers
              </p>

              <div className="h-px mb-7" style={{ backgroundColor: 'rgba(26,83,92,0.08)' }} />

              <p className="text-[14px] leading-relaxed mb-8 flex-1" style={{ color: '#3F3F3A' }}>
                Werkt je team met meer dan 10 mensen? Neem contact op voor een prijs op maat. Alles uit het Team-plan, geschikt voor grotere organisaties.
              </p>

              <a
                href="/contact"
                className="mt-auto inline-flex items-center justify-center gap-2 w-full font-mono text-[12px] font-bold tracking-[0.2em] uppercase text-white h-[52px] px-7 rounded-[6px] transition-all hover:scale-[1.02] active:scale-[0.97]"
                style={{ backgroundColor: '#1A535C' }}
              >
                Neem contact op
                <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
              </a>
            </motion.div>
          </div>

          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-center text-[13px] mt-8 font-mono tracking-wide"
            style={{ color: '#6B6B66' }}
          >
            30 dagen gratis · geen creditcard · maandelijks opzegbaar
          </motion.p>
        </div>
      </section>

      {/* COMPARE SLIDER */}
      <section className="relative overflow-hidden">
        <PageBackdrop variant="mirror" />
        <div className="container-site relative py-20 md:py-28">
          <div className="max-w-2xl mx-auto text-center mb-12">
            <div className="inline-flex items-center gap-2 mb-5">
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#F15025' }} />
              <span className="font-mono text-[11px] font-medium tracking-[0.18em] uppercase" style={{ color: '#6B6B66' }}>
                Vergelijk zelf
              </span>
            </div>
            <h2
              className="font-heading font-bold tracking-[-1.5px] md:tracking-[-2px] leading-[0.95]"
              style={{ fontSize: 'clamp(32px, 4vw, 52px)', color: '#1A535C' }}
            >
              Anderen rekenen per gebruiker<span style={{ color: '#F15025' }}>.</span>{' '}
              <span style={{ color: '#6B6B66' }}>
                <SerifItalic>Wij</SerifItalic> niet
                <span style={{ color: '#F15025' }}>.</span>
              </span>
            </h2>
            <p className="text-[15px] md:text-[17px] mt-5" style={{ color: '#3F3F3A' }}>
              Schuif de slider, zie hoeveel je bespaart.
            </p>
          </div>
          <PricingSlider />
        </div>
      </section>

      {/* FAQ */}
      <section className="relative overflow-hidden">
        <PageBackdrop variant="default" />
        <div className="container-site relative py-20 md:py-28">
          <div className="max-w-2xl mb-12 md:mb-16">
            <div className="inline-flex items-center gap-2 mb-5">
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#F15025' }} />
              <span className="font-mono text-[11px] font-medium tracking-[0.18em] uppercase" style={{ color: '#6B6B66' }}>
                Veelgestelde vragen
              </span>
            </div>
            <h2
              className="font-heading font-bold tracking-[-1.5px] md:tracking-[-2px] leading-[0.95]"
              style={{ fontSize: 'clamp(32px, 4vw, 52px)', color: '#1A535C' }}
            >
              Vragen<span style={{ color: '#F15025' }}>?</span>{' '}
              <span style={{ color: '#6B6B66' }}>
                <SerifItalic>Stel</SerifItalic> ze
                <span style={{ color: '#F15025' }}>.</span>
              </span>
            </h2>
          </div>

          <div className="max-w-2xl space-y-3">
            {faqs.map((faq, i) => {
              const isOpen = openFaq === i
              return (
                <div
                  key={i}
                  className="rounded-[10px] overflow-hidden bg-white"
                  style={{
                    border: '1px solid rgba(26,83,92,0.08)',
                    boxShadow: isOpen ? '0 12px 28px -10px rgba(20,40,40,0.16)' : '0 1px 2px rgba(20,40,40,0.04)',
                  }}
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : i)}
                    aria-expanded={isOpen}
                    className="w-full flex items-center justify-between px-5 md:px-6 py-5 text-left group focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1A535C] rounded-[10px]"
                  >
                    <span
                      className="text-[15px] md:text-[16px] font-semibold pr-4 transition-colors group-hover:text-[#F15025]"
                      style={{ color: '#1A535C' }}
                    >
                      {faq.q}
                    </span>
                    <motion.span
                      className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center"
                      animate={{ backgroundColor: isOpen ? '#F15025' : '#F3F2ED', rotate: isOpen ? 45 : 0 }}
                      transition={{ duration: 0.25 }}
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M6 2V10M2 6H10" stroke={isOpen ? 'white' : '#1A535C'} strokeWidth="1.8" strokeLinecap="round" />
                      </svg>
                    </motion.span>
                  </button>
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                        className="overflow-hidden"
                      >
                        <p className="text-[14px] md:text-[15px] leading-[1.65] px-5 md:px-6 pb-5" style={{ color: '#3F3F3A' }}>
                          {faq.a}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )
            })}
          </div>
        </div>
      </section>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────
   COMPARE SLIDER — interactive savings comparison
   ───────────────────────────────────────────────────────────────── */
function PricingSlider() {
  const [users, setUsers] = useState(5)
  // Realistische concurrent: €25/user/mo + €495 eenmalige opzetkosten
  const COMPETITOR_PER_USER = 25
  const COMPETITOR_SETUP = 495
  const DOEN_PRICE = 79

  const competitorMonthly = users * COMPETITOR_PER_USER
  const monthlySaving = competitorMonthly - DOEN_PRICE
  const yearOneSaving = monthlySaving * 12 + COMPETITOR_SETUP

  return (
    <div className="max-w-xl mx-auto">
      <div
        className="rounded-[10px] p-5 md:p-8 bg-white"
        style={{
          border: '1px solid rgba(26,83,92,0.08)',
          boxShadow: '0 1px 2px rgba(20,40,40,0.04), 0 12px 24px -10px rgba(20,40,40,0.12)',
        }}
      >
        {/* Slider control */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-[13px] font-semibold" style={{ color: '#1A1A1A' }}>Teamgrootte</p>
          <p className="font-mono text-[13px] font-bold tabular-nums" style={{ color: '#1A535C' }}>
            {users} {users === 1 ? 'persoon' : 'personen'}
          </p>
        </div>
        <input
          type="range"
          min={1}
          max={10}
          value={users}
          onChange={(e) => setUsers(Number(e.target.value))}
          className="w-full accent-flame mb-7"
          aria-label="Aantal gebruikers"
        />

        {/* Comparison cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-[8px] p-4 text-center" style={{ backgroundColor: '#F3F2ED' }}>
            <p className="font-mono text-[10px] font-bold tracking-[0.18em] uppercase mb-3" style={{ color: '#6B6B66' }}>
              Per-user SaaS
            </p>
            <p className="font-heading text-[28px] font-bold line-through tabular-nums leading-none" style={{ color: '#6B6B66' }}>
              €{competitorMonthly}
            </p>
            <p className="text-[11px] mt-1" style={{ color: '#6B6B66' }}>
              {users} × €{COMPETITOR_PER_USER}/mnd
            </p>
            <p
              className="text-[11px] mt-3 pt-3 leading-snug"
              style={{ color: '#6B6B66', borderTop: '1px dashed rgba(0,0,0,0.10)' }}
            >
              + <span className="font-bold tabular-nums">€{COMPETITOR_SETUP}</span> opzet
            </p>
          </div>
          <div
            className="rounded-[8px] p-4 text-center"
            style={{ backgroundColor: 'rgba(241,80,37,0.06)', border: '1.5px solid rgba(241,80,37,0.25)' }}
          >
            <p className="font-mono text-[10px] font-bold tracking-[0.18em] uppercase mb-3" style={{ color: '#F15025' }}>
              doen.
            </p>
            <p className="font-heading text-[28px] font-bold tabular-nums leading-none" style={{ color: '#1A535C' }}>
              €{DOEN_PRICE}
            </p>
            <p className="text-[11px] mt-1" style={{ color: '#1A535C' }}>
              flat · alles erin
            </p>
            <p
              className="text-[11px] mt-3 pt-3 leading-snug"
              style={{ color: '#2D6B48', borderTop: '1px dashed rgba(241,80,37,0.20)' }}
            >
              + <span className="font-bold">€0</span> opzet
            </p>
          </div>
        </div>

        {/* Saving callout */}
        {monthlySaving > 0 && (
          <div
            className="mt-6 pt-5 text-center"
            style={{ borderTop: '1px solid rgba(26,83,92,0.10)' }}
          >
            <p className="text-[12px] tracking-wide mb-1" style={{ color: '#6B6B66' }}>
              Je bespaart in jaar 1
            </p>
            <p
              className="font-heading font-bold tabular-nums leading-none"
              style={{ fontSize: 'clamp(36px, 5vw, 48px)', color: '#1A535C', letterSpacing: '-1.5px' }}
            >
              €{yearOneSaving.toLocaleString('nl-NL')}
              <span style={{ color: '#F15025' }}>.</span>
            </p>
            <p className="text-[12px] mt-2 font-mono tracking-wide" style={{ color: '#6B6B66' }}>
              <span className="tabular-nums">€{monthlySaving}</span>/mnd × 12 + <span className="tabular-nums">€{COMPETITOR_SETUP}</span> opzetkosten
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
