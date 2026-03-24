'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import SectionReveal from '../SectionReveal'
import WachtlijstForm from '../WachtlijstForm'

const included = [
  'Projectbeheer — onbeperkt projecten',
  'Offertes met sjablonen en digitale handtekening',
  'Facturen met automatische herinneringen',
  'Planning met drag-and-drop',
  'Klantportaal',
  'Daan AI assistent',
  'Team tot 10 medewerkers',
  'Onbeperkt klanten',
  'Alle toekomstige updates',
  'Nederlandse support',
]

const faqs = [
  {
    q: 'Zijn er kosten per gebruiker?',
    a: 'Nee. Eenvoudig en eerlijk. Vast bedrag per maand voor je hele team tot 10 medewerkers. Groter team? Neem contact op.',
  },
  {
    q: 'Kan ik het eerst proberen?',
    a: 'Natuurlijk. Eerste 30 dagen gratis. Geen creditcard nodig. Geen verplichtingen.',
  },
  {
    q: 'Kan ik mijn data exporteren?',
    a: 'Altijd. Jouw data is van jou. Export je projecten, klanten en facturen wanneer je wilt. CSV, PDF, wat je nodig hebt.',
  },
  {
    q: 'Hoe zit het met support?',
    a: 'Via email en WhatsApp. We reageren binnen een werkdag. Gewoon normale menselijke hulp, geen chatbots.',
  },
  {
    q: 'Moet ik een contract tekenen?',
    a: 'Nee. Maandelijks opzegbaar. Geen langetermijnverplichtingen. Je blijft omdat het werkt, niet omdat je vast zit.',
  },
]

function PricingCalculator() {
  const [users, setUsers] = useState(5)
  const competitorPrice = users * 20 // avg €20/user

  return (
    <div className="bg-white rounded-2xl p-8 border border-ink/[0.04] max-w-lg mx-auto">
      <p className="text-sm text-muted mb-4">
        Hoeveel mensen heeft je team?
      </p>
      <input
        type="range"
        min={1}
        max={10}
        value={users}
        onChange={(e) => setUsers(Number(e.target.value))}
        className="w-full accent-flame mb-6"
      />
      <div className="flex items-center justify-between gap-4">
        <div className="text-center flex-1">
          <p className="text-xs text-muted mb-1">Anderen</p>
          <p className="font-mono text-2xl text-ink/40 line-through">
            &euro;{competitorPrice}
          </p>
          <p className="text-xs text-muted">{users} gebruikers</p>
        </div>
        <div className="text-center flex-1">
          <p className="text-xs text-muted mb-1">doen<span className="text-flame">.</span></p>
          <p className="font-mono text-2xl text-petrol font-medium">
            &euro;49
          </p>
          <p className="text-xs text-flame">altijd</p>
        </div>
      </div>
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
          className="bg-white rounded-xl border border-ink/[0.04] overflow-hidden"
        >
          <button
            onClick={() => setOpenIndex(openIndex === i ? null : i)}
            className="w-full flex items-center justify-between p-5 text-left min-h-[48px]"
          >
            <span className="font-semibold text-sm text-petrol pr-4">{faq.q}</span>
            <span
              className={`text-muted transition-transform duration-300 shrink-0 ${
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
              Een plan<span className="text-flame">.</span> Een prijs<span className="text-flame">.</span>
            </h1>
          </SectionReveal>

          <SectionReveal delay={0.2}>
            <div className="inline-block bg-white rounded-3xl p-10 md:p-14 border border-ink/[0.04] shadow-lg shadow-ink/[0.02] mb-10">
              <p className="font-mono text-6xl md:text-8xl text-petrol font-medium mb-2">
                &euro;49
              </p>
              <p className="text-muted text-lg">per maand</p>
              <div className="w-12 h-[2px] bg-flame mx-auto my-6" />
              <p className="text-ink font-medium mb-1">Alles erin. Geen verborgen kosten.</p>
              <p className="text-sm text-muted">Eerste 30 dagen gratis. Geen creditcard.</p>
            </div>
          </SectionReveal>

          {/* What's included */}
          <SectionReveal delay={0.3}>
            <div className="max-w-md mx-auto text-left mb-16">
              <ul className="space-y-3">
                {included.map((item, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05, duration: 0.4 }}
                    viewport={{ once: true }}
                    className="flex items-start gap-3 text-sm"
                  >
                    <span className="w-5 h-5 rounded-full bg-petrol/10 flex items-center justify-center shrink-0 mt-0.5">
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                        <path d="M1 4l3 3 5-6" stroke="#1A535C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                    <span className="text-ink/80">{item}</span>
                  </motion.li>
                ))}
              </ul>
            </div>
          </SectionReveal>
        </div>
      </section>

      {/* Pricing calculator */}
      <section className="pb-20 md:pb-32">
        <div className="container-site">
          <SectionReveal>
            <h2 className="section-heading font-heading text-petrol text-center mb-4">
              Vergelijk zelf<span className="text-flame">.</span>
            </h2>
            <p className="text-muted text-center max-w-lg mx-auto mb-10">
              Anderen rekenen per gebruiker. Bij 5 man ben je al snel meer kwijt. Bij ons: altijd hetzelfde.
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
