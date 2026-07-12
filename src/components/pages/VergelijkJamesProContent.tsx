'use client'

import { useRef } from 'react'
import Link from 'next/link'
import { motion, useInView, useReducedMotion } from 'framer-motion'
import { Check } from 'lucide-react'
import { PRICE_PER_MONTH } from '@/data/pricing'

// Tarieven James PRO volgens jamespro.nl/tarieven, geraadpleegd juli 2026:
// €113 p/mnd per gebruiker; opzetkosten €495 (Basic), €749 (Business),
// €2.490 (Enterprise); 14 dagen proefperiode. Alleen geverifieerde feiten
// vergelijken, geen aannames over features van James PRO.
const JAMES_PER_USER = 113
const JAMES_SETUP_BASIC = 495
const VOORBEELD_GEBRUIKERS = 5

const vergelijking = [
  {
    label: 'Prijsmodel',
    james: `€${JAMES_PER_USER} per maand, per gebruiker`,
    doen: `€${PRICE_PER_MONTH} per maand, ex btw, voor je hele team tot 10 gebruikers`,
  },
  {
    label: 'Opzetkosten',
    james: '€495 tot €2.490 eenmalig, afhankelijk van pakket',
    doen: '€0',
  },
  {
    label: 'Proefperiode',
    james: '14 dagen gratis',
    doen: '30 dagen gratis, geen creditcard',
  },
  {
    label: 'Projecten, offertes en facturen',
    james: 'Onbeperkt',
    doen: 'Onbeperkt',
  },
  {
    label: 'Contract',
    james: 'Zie voorwaarden James PRO',
    doen: 'Maandelijks opzegbaar',
  },
]

const inbegrepen = [
  'Alle tien modules: projecten, offertes, planning, werkbonnen, facturen',
  'Klantportaal met één link, geen inlog voor je klant',
  'AI-assistent Daan: vat mails samen, leest inkoopfacturen uit',
  'Eigen mailbox per gebruiker (IMAP/SMTP)',
  'Mollie-betaallinks en koppeling met Exact Online',
  'Nederlandse support en een live onboarding-sessie',
]

const EASE = [0.16, 1, 0.3, 1] as const

export default function VergelijkJamesProContent() {
  const jamesMaand = VOORBEELD_GEBRUIKERS * JAMES_PER_USER
  const jamesJaar1 = jamesMaand * 12 + JAMES_SETUP_BASIC
  const doenJaar1 = PRICE_PER_MONTH * 12
  const besparing = jamesJaar1 - doenJaar1

  return (
    <div className="bg-bg">
      {/* Kop + vergelijkingstabel.
          Entree via CSS-keyframes (globals.css: .hero-line / .hero-fade). */}
      <section className="bg-bg">
        <div className="container-site pt-28 md:pt-44 pb-14 md:pb-32">
          <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-5 mb-8 md:mb-16">
            <h1
              className="font-heading font-bold text-petrol leading-[0.97]"
              style={{ fontSize: 'clamp(34px, 5.2vw, 72px)', letterSpacing: '-0.03em', textWrap: 'balance' }}
            >
              <span className="block overflow-hidden pb-[0.08em] -mb-[0.08em]">
                <span className="hero-line" style={{ animationDelay: '0.05s' }}>
                  doen<span className="text-flame">.</span> of James PRO<span className="text-flame">?</span>
                </span>
              </span>
            </h1>
            <p className="hero-fade hidden md:block text-[15px] md:text-[16px] text-muted max-w-md leading-[1.55]" style={{ animationDelay: '0.25s' }}>
              James PRO is een gevestigde naam in de signbranche. Wij bouwden doen. met
              één vaste prijs voor je hele team, zonder opzetkosten. Hieronder de feiten
              naast elkaar, beslis zelf wat bij je bedrijf past.
            </p>
          </div>

          <VergelijkTabel />
        </div>
      </section>

      {/* Rekenvoorbeeld */}
      <section className="bg-white">
        <div className="container-site py-16 md:py-32">
          <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-4 mb-8 md:mb-16">
            <h2
              className="font-heading font-bold text-petrol leading-[1.0]"
              style={{ fontSize: 'clamp(30px, 4vw, 52px)', letterSpacing: '-0.03em' }}
            >
              Reken het na<span className="text-flame">.</span>
            </h2>
            <p className="text-[15px] md:text-[16px] text-muted max-w-sm leading-[1.55]">
              Eén rekenvoorbeeld: een team van {VOORBEELD_GEBRUIKERS} gebruikers, het
              eerste jaar, instaptarieven.
            </p>
          </div>

          <RekenKaarten jamesJaar1={jamesJaar1} doenJaar1={doenJaar1} besparing={besparing} />
        </div>
      </section>

      {/* Wat er bij doen. altijd in zit */}
      <section className="bg-bg">
        <div className="container-site py-16 md:py-32">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-20 items-start">
            <div>
              <h2
                className="font-heading font-bold text-petrol leading-[1.05] mb-5"
                style={{ fontSize: 'clamp(30px, 4vw, 48px)', letterSpacing: '-0.03em' }}
              >
                Wat er altijd in zit<span className="text-flame">.</span>
              </h2>
              <p className="text-[15px] md:text-[16px] text-muted leading-[1.6] mb-5 md:mb-8 max-w-md">
                Geen pakketten, geen add-ons, geen prijs per gebruiker. Het beste oordeel
                vel je zelf, in je eigen omgeving, met je eigen offertes.
              </p>
              <Link href="/prijzen" className="group inline-flex items-center gap-2 text-[15px] font-semibold text-petrol">
                <span className="relative">
                  Bekijk de prijs
                  <span className="absolute left-0 -bottom-1 h-px w-full origin-left bg-petrol/40 transition-transform duration-300 group-hover:scale-x-0" />
                </span>
                <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-1">→</span>
              </Link>
            </div>

            <ul className="border-t border-petrol/10">
              {inbegrepen.map((item) => (
                <li key={item} className="flex items-start gap-3 py-4 border-b border-petrol/10">
                  <Check className="w-4 h-4 mt-1 shrink-0 text-flame" strokeWidth={3} />
                  <span className="text-[15px] text-ink leading-[1.55]">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </div>
  )
}

/* Boven de vouw, dus geen framer-mount-animatie: .hero-fade uit globals.css. */
function VergelijkTabel() {
  return (
    <div
      className="hero-fade max-w-4xl rounded-[12px] overflow-hidden bg-white border border-petrol/15"
      style={{ animationDelay: '0.4s' }}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-left" style={{ minWidth: 560 }}>
          <thead>
            <tr className="border-b border-petrol/10">
              <th className="px-5 md:px-7 py-5" />
              <th className="px-5 md:px-7 py-5 text-[13px] font-semibold text-muted">James PRO</th>
              <th className="px-5 md:px-7 py-5 text-[13px] font-semibold text-petrol bg-bg">
                doen<span className="text-flame">.</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {vergelijking.map((row) => (
              <tr key={row.label} className="border-b border-petrol/10 last:border-b-0">
                <td className="px-5 md:px-7 py-5 text-[13px] md:text-[14px] font-semibold text-petrol align-top">
                  {row.label}
                </td>
                <td className="px-5 md:px-7 py-5 text-[13px] md:text-[14px] text-muted align-top">{row.james}</td>
                <td className="px-5 md:px-7 py-5 text-[13px] md:text-[14px] font-medium text-ink align-top bg-bg">
                  {row.doen}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="px-5 md:px-7 py-4 text-[13px] text-muted border-t border-petrol/10">
        Tarieven James PRO volgens{' '}
        <a href="https://www.jamespro.nl/tarieven" rel="nofollow noopener" target="_blank" className="underline">
          jamespro.nl/tarieven
        </a>
        , geraadpleegd juli 2026. Prijzen kunnen wijzigen. Klopt er iets niet meer? Mail ons, dan passen we het aan.
      </p>
    </div>
  )
}

function RekenKaarten({ jamesJaar1, doenJaar1, besparing }: { jamesJaar1: number; doenJaar1: number; besparing: number }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })
  const reduce = useReducedMotion() ?? false
  const show = reduce || inView

  return (
    <div ref={ref} className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6 max-w-4xl">
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 24 }}
        animate={show ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.7, ease: EASE }}
        className="p-7 md:p-9 rounded-[12px] h-full bg-bg border border-petrol/10"
      >
        <p className="text-[13px] font-semibold text-muted mb-4">James PRO · jaar 1</p>
        <p
          className="font-heading font-bold text-muted leading-none tabular-nums mb-3"
          style={{ fontSize: 'clamp(34px, 4vw, 44px)', letterSpacing: '-0.03em' }}
        >
          €{jamesJaar1.toLocaleString('nl-NL')}
        </p>
        <p className="text-[14px] text-muted leading-[1.6]">
          {VOORBEELD_GEBRUIKERS} gebruikers × €{JAMES_PER_USER} per maand × 12, plus €{JAMES_SETUP_BASIC} eenmalige
          opzetkosten (Basic-pakket).
        </p>
      </motion.div>

      <motion.div
        initial={reduce ? false : { opacity: 0, y: 24 }}
        animate={show ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.7, delay: reduce ? 0 : 0.1, ease: EASE }}
        className="p-7 md:p-9 rounded-[12px] h-full bg-petrol-deep"
      >
        <p className="text-[13px] font-semibold mb-4" style={{ color: 'rgba(226,240,241,0.55)' }}>
          doen. · jaar 1
        </p>
        <p
          className="font-heading font-bold text-white leading-none tabular-nums mb-3"
          style={{ fontSize: 'clamp(34px, 4vw, 44px)', letterSpacing: '-0.03em' }}
        >
          €{doenJaar1.toLocaleString('nl-NL')}
        </p>
        <p className="text-[14px] leading-[1.6]" style={{ color: 'rgba(226,240,241,0.82)' }}>
          €{PRICE_PER_MONTH} per maand, ex btw, × 12, voor je hele team tot 10 gebruikers. Geen opzetkosten.
        </p>
        <p className="mt-5 pt-5 border-t border-white/10 text-[15px] font-semibold text-white">
          Verschil: <span className="text-flame tabular-nums">€{besparing.toLocaleString('nl-NL')}</span> in jaar
          één<span className="text-flame">.</span>
        </p>
      </motion.div>
    </div>
  )
}
