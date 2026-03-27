'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import SectionReveal from '../SectionReveal'
import WachtlijstForm from '../WachtlijstForm'

const allFeatures = [
  'Onbeperkt projecten, offertes en facturen',
  'Planning met drag-and-drop',
  'Werkbonnen met foto\'s en uren',
  'Klantportaal met goedkeuring',
  'AI-assistent Daan',
  'Mollie betaallinks (iDEAL, creditcard)',
  'Email met gedeelde inbox',
  'CRM met KVK lookup',
  'Visualizer (10 credits)',
  'Rapportages en tijdregistratie',
  'Alle toekomstige updates',
  'Nederlandse support',
]

const faqs = [
  { q: 'Kan ik het eerst proberen?', a: 'Eerste 30 dagen gratis. Geen creditcard nodig. Geen verplichtingen.' },
  { q: 'Moet ik extra betalen voor AI of het klantportaal?', a: 'Nee. Alles zit erin. Bij ons geen feature-gates of premium-tiers.' },
  { q: 'Welke koppelingen zitten erbij?', a: 'Mollie, Exact Online, Probo, KVK, email (IMAP/SMTP) en AI. Alles standaard, geen extra kosten.' },
  { q: 'Kan ik mijn data exporteren?', a: 'Altijd. CSV, PDF, wat je nodig hebt. Jouw data is van jou.' },
  { q: 'Moet ik een contract tekenen?', a: 'Nee. Maandelijks opzegbaar. Je blijft omdat het werkt.' },
  { q: 'Hoe verschilt doen. van andere software?', a: 'Gebouwd door signmakers. Alles in één systeem. Klantportaal, AI en planning zitten standaard in je abonnement.' },
]

export default function PrijzenContent() {
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  return (
    <div className="pt-28 md:pt-36">

      {/* Hero */}
      <section className="pb-16 md:pb-24">
        <div className="container-site text-center">
          <SectionReveal>
            <p className="font-mono text-[12px] font-bold tracking-[0.2em] uppercase text-flame mb-4">Eenvoudig en eerlijk</p>
            <h1 className="font-heading text-[40px] md:text-[56px] font-bold text-petrol tracking-[-2.5px] leading-[0.95] mb-5">
              Eén prijs<span className="text-flame">.</span> Alles erin<span className="text-flame">.</span>
            </h1>
            <p className="text-[17px] max-w-md mx-auto leading-relaxed" style={{ color: '#6B6B66' }}>
              Geen modules bijkopen. Geen verrassingen. Het enige verschil is je teamgrootte.
            </p>
          </SectionReveal>
        </div>
      </section>

      {/* Pricing cards */}
      <section className="pb-20 md:pb-28 bg-white">
        <div className="container-site py-16 md:py-20">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">

            {/* Starter */}
            <SectionReveal>
              <div className="rounded-2xl p-8 md:p-10 h-full" style={{ backgroundColor: '#FFFFFF', border: '1px solid #EBEBEB' }}>
                <p className="font-mono text-[11px] font-bold tracking-[0.15em] uppercase mb-6" style={{ color: '#9B9B95' }}>Starter</p>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="font-heading text-[52px] font-bold tracking-[-2px]" style={{ color: '#1A535C' }}>&euro;49</span>
                </div>
                <p className="text-[14px] mb-8" style={{ color: '#6B6B66' }}>per maand, tot 3 gebruikers</p>

                <div className="h-px mb-8" style={{ backgroundColor: '#EBEBEB' }} />

                <ul className="space-y-3">
                  {allFeatures.map((f, i) => (
                    <li key={i} className="flex items-start gap-3 text-[14px]">
                      <span className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ backgroundColor: '#1A535C10' }}>
                        <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l3 3 5-6" stroke="#1A535C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      </span>
                      <span style={{ color: '#1A1A1A' }}>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </SectionReveal>

            {/* Team */}
            <SectionReveal delay={0.1}>
              <div className="rounded-2xl p-8 md:p-10 h-full relative" style={{ backgroundColor: '#1A535C' }}>
                <div className="absolute -top-3 left-8">
                  <span className="text-white text-[10px] font-bold uppercase tracking-[0.15em] px-3 py-1.5 rounded-full" style={{ backgroundColor: '#F15025' }}>
                    Populair
                  </span>
                </div>
                <p className="font-mono text-[11px] font-bold tracking-[0.15em] uppercase mb-6 text-white/40">Team</p>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="font-heading text-[52px] font-bold tracking-[-2px] text-white">&euro;69</span>
                </div>
                <p className="text-[14px] mb-8 text-white/40">per maand, onbeperkt gebruikers</p>

                <div className="h-px mb-8" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }} />

                <ul className="space-y-3">
                  {[...allFeatures, 'Onbeperkt teamleden'].map((f, i) => (
                    <li key={i} className="flex items-start gap-3 text-[14px]">
                      <span className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                        <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l3 3 5-6" stroke="#F15025" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      </span>
                      <span className="text-white/70">{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </SectionReveal>
          </div>

          <SectionReveal delay={0.2}>
            <p className="text-center text-[13px] mt-8" style={{ color: '#9B9B95' }}>
              Eerste 30 dagen gratis. Geen creditcard nodig. Maandelijks opzegbaar.
            </p>
          </SectionReveal>
        </div>
      </section>

      {/* Compare slider */}
      <section className="py-16 md:py-24">
        <div className="container-site">
          <SectionReveal>
            <h2 className="font-heading text-[28px] md:text-[36px] font-bold text-petrol tracking-[-1.5px] text-center mb-4">
              Vergelijk zelf<span className="text-flame">.</span>
            </h2>
            <p className="text-[15px] text-center max-w-md mx-auto mb-10" style={{ color: '#6B6B66' }}>
              Anderen rekenen per gebruiker. Schuif en zie het verschil.
            </p>
          </SectionReveal>
          <SectionReveal delay={0.1}>
            <PricingSlider />
          </SectionReveal>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 md:py-24 bg-white">
        <div className="container-site">
          <SectionReveal>
            <h2 className="font-heading text-[28px] md:text-[36px] font-bold text-petrol tracking-[-1.5px] text-center mb-4">
              Vragen<span className="text-flame">?</span> Stel ze<span className="text-flame">.</span>
            </h2>
            <p className="text-[15px] text-center max-w-md mx-auto mb-12" style={{ color: '#6B6B66' }}>
              Of lees de antwoorden alvast.
            </p>
          </SectionReveal>

          <div className="max-w-2xl mx-auto">
            {faqs.map((faq, i) => (
              <div key={i} style={{ borderBottom: '1px solid #EBEBEB' }}>
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between py-5 text-left"
                >
                  <span className="text-[15px] md:text-[16px] font-semibold pr-4" style={{ color: '#1A535C' }}>{faq.q}</span>
                  <motion.span
                    className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: openFaq === i ? '#F15025' : '#F8F7F5' }}
                    animate={{ rotate: openFaq === i ? 45 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M6 2V10M2 6H10" stroke={openFaq === i ? 'white' : '#9B9B95'} strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </motion.span>
                </button>
                <AnimatePresence>
                  {openFaq === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                      className="overflow-hidden"
                    >
                      <p className="text-[14px] md:text-[15px] leading-[1.7] pb-5" style={{ color: '#6B6B66' }}>
                        {faq.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="pt-4 pb-20 md:pb-32">
        <div className="container-site">
          <div className="rounded-2xl p-12 md:p-16 text-center" style={{ backgroundColor: '#1A535C' }}>
            <p className="text-[13px] text-flame font-semibold mb-3 tracking-wide">Binnenkort live</p>
            <h2 className="font-heading text-[24px] md:text-[32px] font-bold text-white tracking-tight mb-3">
              Klaar om te beginnen<span className="text-flame">?</span>
            </h2>
            <p className="text-[15px] text-white/40 max-w-md mx-auto mb-8">
              Schrijf je in. We mailen je zodra doen. live gaat.
            </p>
            <div className="flex justify-center">
              <WachtlijstForm />
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

function PricingSlider() {
  const [users, setUsers] = useState(5)
  const competitorPrice = users * 20
  const doenPrice = users <= 3 ? 49 : 69
  const saving = competitorPrice - doenPrice

  return (
    <div className="max-w-lg mx-auto">
      <div className="rounded-2xl p-8 bg-white" style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.03)' }}>
        <div className="flex items-center justify-between mb-4">
          <p className="text-[14px] font-medium" style={{ color: '#1A1A1A' }}>Teamgrootte</p>
          <p className="font-mono text-[14px] font-bold" style={{ color: '#1A535C' }}>{users} personen</p>
        </div>
        <input
          type="range"
          min={1}
          max={15}
          value={users}
          onChange={(e) => setUsers(Number(e.target.value))}
          className="w-full accent-flame mb-8"
        />

        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl p-5 text-center" style={{ backgroundColor: '#F8F7F5' }}>
            <p className="text-[12px] font-medium mb-2" style={{ color: '#9B9B95' }}>Per-user pricing</p>
            <p className="font-mono text-[28px] font-bold line-through" style={{ color: '#9B9B95' }}>
              &euro;{competitorPrice}
            </p>
            <p className="text-[12px] mt-1" style={{ color: '#9B9B95' }}>{users} x &euro;20/gebruiker</p>
          </div>
          <div className="rounded-xl p-5 text-center" style={{ backgroundColor: '#1A535C08', border: '1.5px solid #1A535C20' }}>
            <p className="text-[12px] font-medium mb-2" style={{ color: '#1A535C' }}>
              doen<span style={{ color: '#F15025' }}>.</span>
            </p>
            <p className="font-mono text-[28px] font-bold" style={{ color: '#1A535C' }}>
              &euro;{doenPrice}
            </p>
            <p className="text-[12px] mt-1" style={{ color: '#F15025' }}>alles erin</p>
          </div>
        </div>

        {saving > 0 && (
          <p className="text-center text-[13px] font-medium mt-5" style={{ color: '#1A535C' }}>
            Je bespaart &euro;{saving} per maand<span style={{ color: '#F15025' }}>.</span>
          </p>
        )}
      </div>
    </div>
  )
}
