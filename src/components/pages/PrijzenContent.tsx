'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Check, Plus } from 'lucide-react'
import CTASection from '@/components/home/CTASection'
import JsonLd from '@/components/JsonLd'
import { PRICE_PER_MONTH } from '@/data/pricing'
import { prijzenFaqs } from '@/data/faq'
import { prijzenFaqPageSchema } from '@/lib/structured-data'

/* Gangbare branchesoftware: richtprijs per maand voor een vergelijkbaar
   pakket. De besparing rekent zichzelf uit vanaf PRICE_PER_MONTH. */
const GANGBAAR_PER_MAAND = 208
const BESPARING_PER_JAAR = (GANGBAAR_PER_MAAND - PRICE_PER_MONTH) * 12

const INBEGREPEN = [
  'Alle tien modules',
  'Tot 10 gebruikers',
  'Onbeperkt projecten, offertes en facturen',
  'Klantportaal zonder inlog',
  'AI-assistent Daan',
  'Koppeling Exact Online en Mollie',
  'Studio met 10 credits, bijkopen kan altijd',
  'Nederlandse support',
  'Updates inbegrepen',
]

export default function PrijzenContent() {
  return (
    <div className="bg-bg">
      <PriceHero />
      <PrijzenFaq />
      <CTASection />
    </div>
  )
}

/* Lichte hero met korte kop, direct gevolgd door de twee prijskaarten.
   De prijs wordt hier één keer verteld; verder rekent niets op deze pagina.
   Entree via CSS-keyframes (globals.css: .hero-line / .hero-fade). */
function PriceHero() {
  return (
    <section className="bg-bg">
      <div className="container-site pt-28 md:pt-44 pb-14 md:pb-32">
        <div className="hero-fade flex flex-wrap items-end justify-between gap-x-10 gap-y-5 mb-8 md:mb-16" style={{ animationDelay: '0.05s' }}>
          <h1
            className="font-heading font-bold text-petrol leading-[0.97]"
            style={{ fontSize: 'clamp(34px, 5.2vw, 72px)', letterSpacing: '-0.03em', textWrap: 'balance' }}
          >
            Eén plan, geen verrassingen<span className="text-flame">.</span>
          </h1>
          <p className="text-[15px] md:text-[16px] text-muted max-w-sm leading-[1.55]">
            Alles wat je bedrijf nodig hebt voor €{PRICE_PER_MONTH} per maand, ex btw.
            Geen pakketten, geen prijs per gebruiker, geen opzetkosten.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 md:gap-6">
          {/* doen., aanbevolen */}
          <div
            className="hero-fade relative flex flex-col rounded-[12px] border border-petrol/15 bg-white p-7 md:p-10"
            style={{ animationDelay: '0.25s' }}
          >
            <span className="absolute top-6 right-6 md:top-7 md:right-7 text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-[3px] bg-flame text-white">
              Aanbevolen
            </span>

            <h2
              className="font-heading font-bold text-ink leading-none mb-3"
              style={{ fontSize: 'clamp(28px, 3vw, 38px)', letterSpacing: '-0.03em' }}
            >
              doen<span className="text-flame">.</span>
            </h2>
            <p className="text-[15px] text-muted leading-[1.6] mb-6 md:mb-8 max-w-sm">
              Eén plan voor je hele bedrijf, van eerste klantvraag tot betaalde factuur.
            </p>

            <div className="flex items-baseline gap-3 mb-2">
              <span
                className="font-heading font-bold text-ink leading-none tabular-nums"
                style={{ fontSize: 'clamp(56px, 6vw, 84px)', letterSpacing: '-0.03em' }}
              >
                €{PRICE_PER_MONTH}
              </span>
              <span className="text-[15px] text-muted">per maand, ex btw</span>
            </div>
            <p className="text-[14px] text-muted mb-6 md:mb-9">
              Per bedrijf · 30 dagen gratis · maandelijks opzegbaar
            </p>

            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 mb-7 md:mb-9 flex-1">
              {INBEGREPEN.map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 mt-0.5 shrink-0 text-flame" strokeWidth={3} />
                  <span className="text-[15px] font-medium text-ink leading-snug">{item}</span>
                </li>
              ))}
            </ul>

            <div className="flex flex-wrap items-center gap-x-7 gap-y-4">
              <a
                href="https://app.doen.team/register"
                className="group inline-flex items-center gap-2.5 text-[15px] font-semibold text-white px-7 h-[54px] rounded-[6px] bg-flame transition-transform duration-300 hover:scale-[1.02] active:scale-[0.98]"
              >
                <span>Start gratis</span>
                <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5" strokeWidth={2.5} />
              </a>
              <Link href="/contact" className="group inline-flex items-center gap-2 text-[15px] font-semibold text-petrol">
                <span className="relative">
                  Plan een demo
                  <span className="absolute left-0 -bottom-1 h-px w-full origin-left bg-petrol/40 transition-transform duration-300 group-hover:scale-x-0" />
                </span>
                <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-1">→</span>
              </Link>
            </div>
          </div>

          {/* Wat je nu betaalt */}
          <div
            className="hero-fade relative flex flex-col overflow-hidden rounded-[12px] bg-petrol-deep p-7 md:p-10"
            style={{ animationDelay: '0.4s' }}
          >
            <div
              aria-hidden
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  'radial-gradient(ellipse 70% 80% at 90% 0%, rgba(42,111,122,0.45) 0%, rgba(42,111,122,0) 60%)',
              }}
            />

            <div className="relative flex flex-col flex-1">
              <h2
                className="font-heading font-bold text-white leading-[1.05] mb-3"
                style={{ fontSize: 'clamp(24px, 3vw, 36px)', letterSpacing: '-0.03em' }}
              >
                Wat je nu betaalt<span className="text-flame">.</span>
              </h2>
              <p className="text-[15px] leading-[1.6] mb-6 md:mb-8 max-w-sm" style={{ color: 'rgba(226,240,241,0.82)' }}>
                Losse abonnementen voor offertes, planning, werkbonnen en je
                boekhoudkoppeling. Elk met een eigen factuur.
              </p>

              <div className="flex items-baseline gap-3 mb-2">
                <span
                  className="font-heading font-bold text-white leading-none tabular-nums"
                  style={{ fontSize: 'clamp(56px, 6vw, 84px)', letterSpacing: '-0.03em' }}
                >
                  €{GANGBAAR_PER_MAAND}
                </span>
                <span className="text-[15px]" style={{ color: 'rgba(226,240,241,0.82)' }}>
                  per maand, gemiddeld
                </span>
              </div>
              <p className="text-[14px] mb-6 md:mb-9" style={{ color: 'rgba(226,240,241,0.55)' }}>
                En dan komen de opzetkosten, add-ons en prijzen per gebruiker er nog bij.
              </p>

              <ul className="space-y-3 flex-1">
                {['Opzetkosten vooraf', 'Add-ons per module', 'Prijs per gebruiker'].map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <span aria-hidden className="mt-[9px] w-3 h-px shrink-0 bg-flame" />
                    <span className="text-[15px] leading-snug" style={{ color: 'rgba(226,240,241,0.82)' }}>
                      {item}
                    </span>
                  </li>
                ))}
              </ul>

              <p className="mt-9 pt-6 border-t border-white/10 text-[16px] md:text-[17px] font-semibold text-white">
                Met doen. bespaar je{' '}
                <span className="text-flame tabular-nums">€{BESPARING_PER_JAAR.toLocaleString('nl-NL')}</span>{' '}
                per jaar<span className="text-flame">.</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* Zelfde accordion-grammatica als de home-FAQ: hairlines, plus-icoon flame. */
function PrijzenFaq() {
  const [open, setOpen] = useState<number | null>(0)

  return (
    <section className="bg-white">
      <div className="container-site py-16 md:py-32">
        <JsonLd data={prijzenFaqPageSchema} />
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.6fr] gap-12 lg:gap-20">
          <div>
            <h2
              className="font-heading font-bold text-petrol leading-[1.05] mb-5"
              style={{ fontSize: 'clamp(30px, 4vw, 48px)', letterSpacing: '-0.03em' }}
            >
              Vragen over de prijs<span className="text-flame">?</span>
            </h2>
            <p className="text-[15px] text-muted leading-[1.6] max-w-xs">
              Staat je vraag er niet bij?{' '}
              <Link href="/contact" className="font-semibold text-petrol hover:text-flame transition-colors">
                Stel hem direct
              </Link>
              , je krijgt binnen een werkdag antwoord.
            </p>
          </div>

          <div className="border-t border-petrol/10">
            {prijzenFaqs.map((faq, i) => {
              const isOpen = open === i
              return (
                <div key={faq.q} className="border-b border-petrol/10">
                  <button
                    onClick={() => setOpen(isOpen ? null : i)}
                    aria-expanded={isOpen}
                    aria-controls={`prijzen-faq-${i}`}
                    className="w-full flex items-center justify-between gap-6 py-5 text-left group"
                  >
                    <span className="text-[16px] md:text-[17px] font-semibold text-ink group-hover:text-petrol transition-colors">
                      {faq.q}
                    </span>
                    <Plus
                      className="w-4 h-4 shrink-0 text-flame transition-transform duration-300"
                      style={{ transform: isOpen ? 'rotate(45deg)' : 'none' }}
                      strokeWidth={2.5}
                    />
                  </button>
                  <div
                    id={`prijzen-faq-${i}`}
                    className="grid transition-[grid-template-rows] duration-300 ease-out-expo"
                    style={{ gridTemplateRows: isOpen ? '1fr' : '0fr' }}
                  >
                    <div className="overflow-hidden">
                      <p className="text-[15px] leading-[1.65] text-muted max-w-2xl pb-6">{faq.a}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
