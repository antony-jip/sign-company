'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Check } from 'lucide-react'
import SerifItalic from '@/components/SerifItalic'
import PageBackdrop from '@/components/PageBackdrop'
import { TrimCorners, FlameStamp } from '@/components/brand/BrandMarks'
import { PRICE_PER_MONTH } from '@/data/pricing'
import { prijzenFaqs } from '@/data/faq'
import JsonLd from '@/components/JsonLd'
import { prijzenFaqPageSchema } from '@/lib/structured-data'

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

export default function PrijzenContent() {
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  return (
    <div className="pt-24 md:pt-32" style={{ backgroundColor: '#F3F2ED' }}>

      {/* HERO + PRICING — left h1, right paragraph, then two cards */}
      <section className="relative overflow-hidden">
        <PageBackdrop variant="flame" />
        <TrimCorners inset={28} size={16} color="rgba(26,83,92,0.28)" />
        <FlameStamp size={420} opacity={0.05} style={{ top: '15%', right: '-180px' }} />

        <div className="container-site relative py-16 md:py-24">

          {/* Header: H1 left, paragraph right */}
          <div className="grid grid-cols-1 md:grid-cols-[1.25fr_1fr] gap-6 md:gap-12 mb-10 md:mb-14 items-end">
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="font-heading font-bold tracking-[-1.5px] md:tracking-[-3px] leading-[1.0] md:leading-[0.92]"
              style={{ fontSize: 'clamp(36px, 6vw, 84px)', color: '#1A535C' }}
            >
              Geen tiers, geen add-ons, geen verrassingen<span style={{ color: '#F15025' }}>.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="text-[15px] md:text-[17px] leading-[1.6] max-w-md"
              style={{ color: '#3F3F3A' }}
            >
              Wat je nu betaalt aan losse abonnementen voor offertes, planning en je boekhoudkoppeling? Waarschijnlijk meer. Met meer geklik.
            </motion.p>
          </div>

          {/* Two cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">

            {/* LEFT — doen. plan (white, recommended) */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="relative rounded-[16px] p-6 md:p-10 bg-white flex flex-col"
              style={{
                border: '1.5px solid #1A535C',
                boxShadow: '0 16px 32px -14px rgba(20,40,40,0.18), 0 2px 6px rgba(0,0,0,0.04)',
              }}
            >
              <div className="absolute top-5 right-5 md:top-6 md:right-6">
                <span
                  className="font-mono text-[10px] font-bold tracking-[0.2em] uppercase text-white px-3 py-1.5 rounded-[4px]"
                  style={{ backgroundColor: '#F15025' }}
                >
                  Aanbevolen<span className="opacity-90">.</span>
                </span>
              </div>

              <h2 className="font-heading text-[36px] md:text-[44px] font-bold tracking-[-1.5px] leading-none mb-3" style={{ color: '#1A1A1A' }}>
                doen<span style={{ color: '#F15025' }}>.</span>
              </h2>

              <p className="text-[14px] md:text-[15px] leading-[1.55] mb-8" style={{ color: '#6B6B66' }}>
                Alles erin. Max 10 gebruikers. Onbeperkt projecten, offertes en facturen.
              </p>

              {/* Price */}
              <div className="mb-3 flex items-baseline gap-2">
                <span className="font-heading text-[28px] md:text-[36px] font-bold" style={{ color: '#1A535C' }}>€</span>
                <span
                  className="font-heading font-bold tabular-nums relative"
                  style={{ fontSize: 'clamp(72px, 9vw, 120px)', lineHeight: 0.85, color: '#1A1A1A', letterSpacing: '-3px' }}
                >
                  <span
                    aria-hidden
                    className="absolute left-0 right-0 bottom-[8%] h-[14%] -z-0"
                    style={{ backgroundColor: 'rgba(241,80,37,0.22)' }}
                  />
                  <span className="relative">79</span>
                </span>
                <span className="font-mono text-[13px] md:text-[14px]" style={{ color: '#6B6B66' }}>
                  / maand, flat
                </span>
              </div>

              <p className="font-mono text-[11px] md:text-[12px] tracking-[0.05em] mb-7 md:mb-8" style={{ color: '#6B6B66' }}>
                ex BTW · per bedrijf · 30 dagen gratis · per maand opzegbaar
              </p>

              {/* Features grid */}
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 mb-8 flex-1">
                {[
                  'Alle 10 modules',
                  'Daan AI inbegrepen',
                  'IMAP/SMTP mailbox',
                  'Klantportaal, eigen huisstijl',
                  'Mobiel voor monteurs',
                  'Boekhoudpakket-koppelingen',
                  'Nederlandse support',
                  'Migratie vanuit Excel',
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-[13.5px] md:text-[14.5px]">
                    <Check className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#1A535C' }} strokeWidth={2.6} />
                    <span style={{ color: '#1A1A1A' }}>{f}</span>
                  </li>
                ))}
              </ul>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row items-stretch gap-3">
                <a
                  href="https://app.doen.team/register"
                  className="group inline-flex items-center justify-center gap-2 text-[15px] font-semibold text-white px-7 h-[56px] rounded-[6px] transition-all duration-300 hover:scale-[1.03] active:scale-[0.97]"
                  style={{ backgroundColor: '#F15025', boxShadow: '0 8px 24px rgba(241,80,37,0.25)' }}
                >
                  <span>Start 30 dagen gratis</span>
                  <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5" strokeWidth={2.5} />
                </a>
                <a
                  href="/contact"
                  className="inline-flex items-center justify-center gap-2 text-[14px] font-semibold px-6 h-[56px] rounded-[6px] transition-colors"
                  style={{ color: '#1A535C', border: '1.5px solid #1A535C' }}
                >
                  Demo plannen
                </a>
              </div>
            </motion.div>

            {/* RIGHT — compare card (dark petrol) */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="relative rounded-[16px] p-6 md:p-10 overflow-hidden flex flex-col"
              style={{
                backgroundColor: '#0F3A42',
                boxShadow: '0 16px 32px -14px rgba(20,40,40,0.30)',
              }}
            >
              {/* Soft flame glow */}
              <div
                aria-hidden
                className="absolute -top-20 -right-20 w-[360px] h-[360px] rounded-full pointer-events-none"
                style={{ backgroundColor: '#F15025', opacity: 0.12, filter: 'blur(90px)' }}
              />

              <div className="relative flex items-center gap-2 mb-5">
                <span className="w-6 h-px" style={{ backgroundColor: '#1A535C' }} />
                <span className="font-mono text-[10px] font-bold tracking-[0.18em] uppercase" style={{ color: 'rgba(255,255,255,0.55)' }}>
                  Vergelijken
                </span>
              </div>

              <h3 className="relative font-heading text-[26px] md:text-[32px] font-bold tracking-[-1px] leading-[1.1] text-white mb-4">
                Wat je nu waarschijnlijk betaalt<span style={{ color: '#F15025' }}>.</span>
              </h3>

              <p className="relative text-[14px] md:text-[15px] leading-[1.65] mb-8 md:mb-10 max-w-md" style={{ color: 'rgba(255,255,255,0.65)' }}>
                Gevestigde branchesoftware doet veel. Wij doen het schoner. En goedkoper.
              </p>

              <div className="relative h-px mb-8 md:mb-10" style={{ backgroundColor: 'rgba(255,255,255,0.10)' }} />

              {/* Comparison row */}
              <div className="relative grid grid-cols-2 gap-6 flex-1">
                {/* Gangbaar */}
                <div>
                  <p className="font-mono text-[10px] font-bold tracking-[0.18em] uppercase mb-3" style={{ color: 'rgba(255,255,255,0.45)' }}>
                    Gangbaar
                  </p>
                  <p className="font-heading font-bold tabular-nums leading-none mb-3" style={{ fontSize: 'clamp(36px, 5vw, 56px)', color: '#FFFFFF', letterSpacing: '-1.5px' }}>
                    €208<span className="font-mono text-[12px] tracking-normal" style={{ color: 'rgba(255,255,255,0.55)' }}>/mnd</span>
                  </p>
                  <p className="font-mono text-[12px] leading-[1.6]" style={{ color: 'rgba(255,255,255,0.55)' }}>
                    + onboarding fee<br />
                    + add-ons per module
                  </p>
                </div>

                {/* doen. */}
                <div style={{ borderLeft: '1px solid rgba(255,255,255,0.10)', paddingLeft: '24px' }}>
                  <p className="font-mono text-[10px] font-bold tracking-[0.18em] uppercase mb-3" style={{ color: '#F15025' }}>
                    doen<span style={{ color: '#F15025' }}>.</span>
                  </p>
                  <p className="font-heading font-bold tabular-nums leading-none mb-3" style={{ fontSize: 'clamp(36px, 5vw, 56px)', color: '#F15025', letterSpacing: '-1.5px' }}>
                    €79<span className="font-mono text-[12px] tracking-normal" style={{ color: 'rgba(255,255,255,0.55)' }}>/mnd</span>
                  </p>
                  <p className="font-mono text-[12px] leading-[1.6]" style={{ color: 'rgba(255,255,255,0.55)' }}>
                    geen onboarding<br />
                    geen add-ons
                  </p>
                </div>
              </div>

              <div className="relative mt-8 md:mt-10 pt-6" style={{ borderTop: '1px solid rgba(255,255,255,0.10)' }}>
                <p className="font-mono text-[11px] md:text-[12px] font-bold tracking-[0.2em] uppercase" style={{ color: '#F15025' }}>
                  · Bespaar €1.548 per jaar<span>.</span>
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* COMPARE SLIDER */}
      <section className="relative overflow-hidden">
        <PageBackdrop variant="mirror" />
        <div className="container-site relative py-24 md:py-32">
          <div className="max-w-2xl mx-auto text-center mb-12">
            <div className="inline-flex items-center gap-2 mb-7">
              <span className="relative inline-flex items-center justify-center w-2 h-2">
                <span className="absolute inset-0 rounded-full animate-ping" style={{ backgroundColor: '#F15025', opacity: 0.4 }} />
                <span className="relative w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#F15025' }} />
              </span>
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
        <div className="container-site relative py-24 md:py-32">
          <div className="max-w-2xl mb-12 md:mb-16">
            <div className="inline-flex items-center gap-2 mb-7">
              <span className="relative inline-flex items-center justify-center w-2 h-2">
                <span className="absolute inset-0 rounded-full animate-ping" style={{ backgroundColor: '#F15025', opacity: 0.4 }} />
                <span className="relative w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#F15025' }} />
              </span>
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
            <JsonLd data={prijzenFaqPageSchema} />
            {prijzenFaqs.map((faq, i) => {
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
                    aria-controls={`prijzen-faq-${i}`}
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
                  {/* Antwoord staat altijd in de HTML; open/dicht via
                      grid-template-rows zodat de animatie blijft. */}
                  <div
                    id={`prijzen-faq-${i}`}
                    role="region"
                    aria-hidden={!isOpen}
                    style={{
                      display: 'grid',
                      gridTemplateRows: isOpen ? '1fr' : '0fr',
                      opacity: isOpen ? 1 : 0,
                      transition:
                        'grid-template-rows 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                    }}
                  >
                    <div className="overflow-hidden">
                      <p className="text-[14px] md:text-[15px] leading-[1.65] px-5 md:px-6 pb-5" style={{ color: '#3F3F3A' }}>
                        {faq.a}
                      </p>
                    </div>
                  </div>
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
  const DOEN_PRICE = PRICE_PER_MONTH

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
