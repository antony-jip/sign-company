'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { Check, Users, Plus, ArrowRight } from 'lucide-react'
import SectionReveal from '../SectionReveal'

const FEATURES = [
  'Onbeperkt klanten en projecten',
  'Offertes, facturen en werkbonnen',
  'Montageplanning met drag-and-drop',
  'Klantportaal',
  'Email integratie',
  'AI-assistent Daan',
  'Geen opzetkosten',
  'Geen verborgen kosten',
  'Maandelijks opzegbaar',
  'Eenvoudig data overzetten',
]

export default function PricingSection() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section className="py-24 md:py-36" ref={ref}>
      <div className="container-site">
        <SectionReveal>
          <div className="text-center mb-16">
            <span className="font-mono text-[12px] font-bold tracking-[0.2em] uppercase mb-4 block" style={{ color: '#F15025' }}>
              Pricing
            </span>
            <h2 className="font-heading text-[36px] md:text-[48px] font-bold text-petrol tracking-[-2px] leading-[1.05] mb-4">
              Eén plan<span className="text-flame">.</span> Alles erin<span className="text-flame">.</span>
            </h2>
            <p className="text-[17px] max-w-md mx-auto leading-relaxed" style={{ color: '#6B6B66' }}>
              Geen tiers, geen verrassingen. Alle features beschikbaar, geen beperkingen.
            </p>
          </div>
        </SectionReveal>

        <motion.div
          className="max-w-4xl mx-auto rounded-3xl overflow-hidden"
          style={{ border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 4px 24px rgba(100,80,40,0.06)' }}
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Spectrum bar top */}
          <div className="h-1.5" style={{ background: 'linear-gradient(90deg, #F15025, #1A535C)' }} />

          <div className="bg-white p-8 md:p-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16">
              {/* Left: Pricing */}
              <div>
                <h3 className="font-heading text-[24px] md:text-[28px] font-bold text-ink tracking-tight mb-6">
                  Gewoon doen<span className="text-flame">.</span>
                </h3>

                <div className="flex items-baseline gap-2 mb-8">
                  <span className="font-heading text-[64px] md:text-[80px] font-bold text-ink tracking-[-3px] leading-none">€79</span>
                  <span className="text-[18px]" style={{ color: '#9B9B95' }}>/ maand ex. btw</span>
                </div>

                <div className="space-y-4 mb-8">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#1A535C10' }}>
                      <Users className="w-4 h-4" style={{ color: '#1A535C' }} />
                    </div>
                    <span className="text-[15px] text-ink"><strong>Tot 10 gebruikers</strong> inbegrepen</span>
                  </div>
                  <a href="/contact" className="flex items-center gap-3 group">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#1A535C10' }}>
                      <Plus className="w-4 h-4" style={{ color: '#1A535C' }} />
                    </div>
                    <span className="text-[15px] text-ink">Meer gebruikers? <strong className="group-hover:text-flame transition-colors">Neem contact op</strong></span>
                  </a>
                </div>

                <p className="text-[14px] mb-8" style={{ color: '#9B9B95' }}>
                  Geen opzetkosten. Maandelijks opzegbaar. Eenvoudig data overzetten.
                </p>

                <a
                  href="#wachtlijst"
                  className="inline-flex items-center gap-2 h-14 px-8 text-[16px] font-bold text-white rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{ backgroundColor: '#F15025', boxShadow: '0 4px 16px rgba(241,80,37,0.3)' }}
                >
                  Schrijf je in voor early access
                  <ArrowRight className="w-5 h-5" />
                </a>
                <p className="text-[12px] mt-3" style={{ color: '#9B9B95' }}>
                  Binnenkort live. Eerste 30 dagen gratis.
                </p>
              </div>

              {/* Right: Features */}
              <div>
                <p className="font-mono text-[11px] font-bold tracking-[0.15em] uppercase mb-5" style={{ color: '#9B9B95' }}>
                  Wat je krijgt
                </p>
                <ul className="space-y-3.5">
                  {FEATURES.map((f, i) => (
                    <motion.li
                      key={f}
                      className="flex items-center gap-3"
                      initial={{ opacity: 0, x: 10 }}
                      animate={isInView ? { opacity: 1, x: 0 } : {}}
                      transition={{ duration: 0.4, delay: 0.3 + i * 0.05, ease: [0.16, 1, 0.3, 1] }}
                    >
                      <Check className="w-4.5 h-4.5 flex-shrink-0" style={{ color: '#1A535C' }} />
                      <span className="text-[14px] text-ink">{f}</span>
                    </motion.li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
