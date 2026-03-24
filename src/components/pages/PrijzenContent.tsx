'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import SectionReveal from '../SectionReveal'
import CountUp from '../CountUp'
import WachtlijstForm from '../WachtlijstForm'

const allFeatures = [
  'Projectbeheer — onbeperkt projecten',
  'Offertes met sjablonen en digitale handtekening',
  'Facturen met automatische herinneringen',
  'Planning met drag-and-drop',
  'Klantportaal',
  'Daan AI assistent',
  'Onbeperkt klanten',
  'Alle toekomstige updates',
  'Nederlandse support',
]

const faqs = [
  {
    q: 'Wat is het verschil tussen Starter en Team?',
    a: 'Alleen het aantal gebruikers. Starter is voor teams tot 3 personen, Team voor grotere teams zonder limiet. Alle features zijn in beide plannen identiek.',
  },
  {
    q: 'Kan ik het eerst proberen?',
    a: 'Natuurlijk. Eerste 30 dagen gratis. Geen creditcard nodig. Geen verplichtingen.',
  },
  {
    q: 'Moet ik extra betalen voor modules zoals AI of klantportaal?',
    a: 'Nee. Alles zit erin. Planning, klantportaal, Daan AI, offertes, facturen — alles. Bij ons geen feature-gates of premium-tiers.',
  },
  {
    q: 'Kan ik mijn data exporteren?',
    a: 'Altijd. Jouw data is van jou. Export je projecten, klanten en facturen wanneer je wilt. CSV, PDF, wat je nodig hebt.',
  },
  {
    q: 'Moet ik een contract tekenen?',
    a: 'Nee. Maandelijks opzegbaar. Geen langetermijnverplichtingen. Je blijft omdat het werkt, niet omdat je vast zit.',
  },
]

function PricingCalculator() {
  const [users, setUsers] = useState(5)
  const competitorPrice = users * 20
  const doenPrice = users <= 3 ? 49 : 69

  return (
    <div className="bg-white rounded-2xl p-8 border border-black/[0.05] max-w-lg mx-auto" style={{ boxShadow: '0 1px 3px rgba(100,80,40,0.04)' }}>
      <p className="text-sm text-muted mb-4">
        Hoeveel mensen heeft je team?
      </p>
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono text-sm text-petrol font-medium">{users} personen</span>
      </div>
      <input
        type="range"
        min={1}
        max={10}
        value={users}
        onChange={(e) => setUsers(Number(e.target.value))}
        className="w-full accent-flame mb-6"
      />
      <div className="flex items-center justify-between gap-4">
        <div className="text-center flex-1 p-4 rounded-xl bg-ink/[0.02]">
          <p className="text-xs text-muted mb-1">Anderen</p>
          <p className="font-mono text-2xl text-ink/30 line-through">
            &euro;{competitorPrice}
          </p>
          <p className="text-xs text-muted">{users} x &euro;20/gebruiker</p>
        </div>
        <div className="text-center flex-1 p-4 rounded-xl bg-petrol/[0.04] border border-petrol/10">
          <p className="text-xs text-muted mb-1">doen<span className="text-flame">.</span></p>
          <p className="font-mono text-2xl text-petrol font-medium">
            &euro;{doenPrice}
          </p>
          <p className="text-xs text-flame">altijd alle features</p>
        </div>
      </div>
      {users > 3 && (
        <p className="text-xs text-muted/60 text-center mt-4">
          Je bespaart &euro;{competitorPrice - doenPrice} per maand t.o.v. per-user pricing.
        </p>
      )}
    </div>
  )
}

function FAQAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <div className="max-w-2xl mx-auto space-y-3">
      {faqs.map((faq, i) => (
        <div
          key={i}
          className="bg-white rounded-xl border border-black/[0.05] overflow-hidden"
          style={{ boxShadow: '0 1px 3px rgba(100,80,40,0.04)' }}
        >
          <button
            onClick={() => setOpenIndex(openIndex === i ? null : i)}
            className="w-full flex items-center justify-between p-5 text-left min-h-[48px]"
          >
            <span className="font-semibold text-sm text-petrol pr-4">{faq.q}</span>
            <span
              className={`text-muted text-lg transition-transform duration-300 shrink-0 ${
                openIndex === i ? 'rotate-45' : ''
              }`}
            >
              +
            </span>
          </button>
          <div
            className="accordion-content"
            style={{ maxHeight: openIndex === i ? '200px' : '0' }}
          >
            <p className="px-5 pb-5 text-sm text-muted leading-relaxed">
              {faq.a}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function PrijzenContent() {
  return (
    <div className="pt-32 md:pt-40">
      {/* Hero pricing */}
      <section className="pb-20 md:pb-32">
        <div className="container-site text-center">
          <SectionReveal>
            <p className="font-mono text-sm text-flame mb-4">Eenvoudig en eerlijk</p>
            <h1 className="hero-heading font-heading text-petrol mb-6">
              Alles erin<span className="text-flame">.</span> Twee opties<span className="text-flame">.</span>
            </h1>
            <p className="text-muted text-lg max-w-md mx-auto mb-12">
              Alle features. Altijd. Het enige verschil: je teamgrootte.
            </p>
          </SectionReveal>

          {/* Two pricing cards */}
          <SectionReveal delay={0.2}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto mb-16">
              {/* Starter */}
              <div className="bg-white rounded-2xl p-8 border border-black/[0.05] text-center" style={{ boxShadow: '0 1px 3px rgba(100,80,40,0.04)' }}>
                <p className="font-mono text-xs text-muted uppercase tracking-widest mb-2">Starter</p>
                <div className="flex items-baseline justify-center gap-1 mb-1">
                  <CountUp end={49} prefix="&euro;" className="text-5xl text-petrol font-medium" />
                </div>
                <p className="text-muted text-sm mb-6">per maand, tot 3 personen</p>
                <div className="w-10 h-[2px] bg-petrol/20 mx-auto mb-6" />
                <ul className="space-y-2.5 text-left">
                  {allFeatures.map((f, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm">
                      <span className="w-4 h-4 rounded-full bg-petrol/10 flex items-center justify-center shrink-0 mt-0.5">
                        <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                          <path d="M1 3l2 2 4-5" stroke="#1A535C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                      <span className="text-ink/70">{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Team */}
              <div className="bg-white rounded-2xl p-8 border-2 border-flame/30 text-center relative" style={{ boxShadow: '0 4px 16px rgba(241,80,37,0.08)' }}>
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-flame text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full">
                    Populair
                  </span>
                </div>
                <p className="font-mono text-xs text-muted uppercase tracking-widest mb-2">Team</p>
                <div className="flex items-baseline justify-center gap-1 mb-1">
                  <CountUp end={69} prefix="&euro;" className="text-5xl text-petrol font-medium" />
                </div>
                <p className="text-muted text-sm mb-6">per maand, onbeperkt personen</p>
                <div className="w-10 h-[2px] bg-flame/30 mx-auto mb-6" />
                <ul className="space-y-2.5 text-left">
                  {[...allFeatures.slice(0, -1), 'Onbeperkt teamleden', allFeatures[allFeatures.length - 1]].map((f, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm">
                      <span className="w-4 h-4 rounded-full bg-flame/10 flex items-center justify-center shrink-0 mt-0.5">
                        <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                          <path d="M1 3l2 2 4-5" stroke="#F15025" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                      <span className="text-ink/70">{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </SectionReveal>

          <SectionReveal delay={0.3}>
            <p className="text-sm text-muted mb-2">Eerste 30 dagen gratis. Geen creditcard.</p>
            <p className="text-xs text-muted/50">
              Bij anderen betaal je extra voor planning, klantportaal of AI. Bij ons zit alles erin.
            </p>
          </SectionReveal>
        </div>
      </section>

      {/* Calculator */}
      <section className="pb-20 md:pb-32">
        <div className="container-site">
          <SectionReveal>
            <h2 className="section-heading font-heading text-petrol text-center mb-4">
              Vergelijk zelf<span className="text-flame">.</span>
            </h2>
            <p className="text-muted text-center max-w-lg mx-auto mb-10">
              Anderen rekenen per gebruiker. Schuif en zie het verschil.
            </p>
          </SectionReveal>
          <SectionReveal delay={0.2}>
            <PricingCalculator />
          </SectionReveal>
        </div>
      </section>

      {/* FAQ */}
      <section className="pb-20 md:pb-32">
        <div className="container-site">
          <SectionReveal>
            <h2 className="section-heading font-heading text-petrol text-center mb-12">
              Veelgestelde vragen<span className="text-flame">.</span>
            </h2>
          </SectionReveal>
          <FAQAccordion />
        </div>
      </section>

      {/* CTA */}
      <section className="pb-20 md:pb-32">
        <div className="container-site text-center">
          <SectionReveal>
            <h2 className="font-heading text-2xl text-petrol mb-6">
              Geen gedoe<span className="text-flame">.</span> Gewoon doen<span className="text-flame">.</span>
            </h2>
            <div className="flex justify-center">
              <WachtlijstForm />
            </div>
          </SectionReveal>
        </div>
      </section>
    </div>
  )
}
