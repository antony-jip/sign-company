'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Check, Plus } from 'lucide-react'
import JsonLd from '@/components/JsonLd'
import {
  MAX_GEBRUIKERS, PER_SEAT_EERSTE, PER_SEAT_EERSTE_AANTAL,
  PER_SEAT_EXTRA, PER_SEAT_OPSTART_MIN, PER_SEAT_OPSTART_MAX, OMSLAGPUNT,
  perSeatPerMaand, maatVoor,
} from '@/data/pricing'
import { prijzenFaqs } from '@/data/faq'
import { prijzenFaqPageSchema } from '@/lib/structured-data'
import { EigenGebruikBand } from '@/components/EigenGebruik'
import FaqAnswer from '@/components/FaqAnswer'
import { OnboardingSectie } from '@/components/Onboarding'
import AanmeldSectie from '@/components/Aanmelden'

// Hun tarief loopt op centen, het onze niet. Eén formatter voor allebei,
// zodat € 129 niet als € 129,00 in beeld komt naast € 253,15.
const euro = (n: number) =>
  n.toLocaleString('nl-NL', {
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
    maximumFractionDigits: 2,
  })
const perPersoon = (totaal: number, gebruikers: number) => euro(Math.round(totaal / gebruikers))

const INBEGREPEN = [
  'Alle elf modules',
  'Onbeperkt offertes en facturen',
  'Klantportaal zonder inlog',
  'AI-assistent Daan',
  'Exact Online en Mollie',
  'Gratis onboarding',
  'Nederlandse support',
  'Geen opzetkosten',
]

export default function PrijzenContent() {
  return (
    <div className="bg-bg">
      <PriceHero />
      <OnboardingSectie />
      <PrijzenFaq />
      <EigenGebruikBand />
      <AanmeldSectie
        kop="Nu jouw bedrijf"
        intro="Dertig dagen gratis. Bevalt het niet, dan stop je met één klik."
        veldId="prijzen-email"
      />
    </div>
  )
}

/* Lichte hero met korte kop, direct gevolgd door de twee prijskaarten.
   De prijs wordt hier één keer verteld; verder rekent niets op deze pagina.
   Entree via CSS-keyframes (globals.css: .hero-line / .hero-fade). */
function PriceHero() {
  // Eén schuif stuurt beide kaarten. Standaard op 10: de maat waar de meeste
  // signbedrijven in vallen, en meteen het punt waar een prijs per seat pijn
  // begint te doen.
  const [gebruikers, setGebruikers] = useState(10)
  const maat = maatVoor(gebruikers)
  const perSeat = perSeatPerMaand(gebruikers)
  const verschilPerJaar = Math.round((perSeat - maat.prijs) * 12)

  return (
    <section className="bg-bg">
      <div className="container-site pt-28 md:pt-44 pb-14 md:pb-32">
        <h1
          className="hero-fade font-heading font-bold text-petrol leading-[0.97] mb-8 md:mb-14 max-w-3xl"
          style={{ fontSize: 'clamp(34px, 5.2vw, 72px)', letterSpacing: '-0.03em', textWrap: 'balance', animationDelay: '0.05s' }}
        >
          Alles erin<span className="text-flame">.</span> Niet per seat<span className="text-flame">.</span>
        </h1>

        <div className="hero-fade mb-5 md:mb-6" style={{ animationDelay: '0.15s' }}>
          <label htmlFor="gebruikers" className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 mb-3">
            <span className="text-[15px] font-semibold text-ink">Hoeveel mensen werken er bij je?</span>
            <span className="text-[15px] text-muted">
              <span className="font-semibold text-petrol tabular-nums">{gebruikers}</span>
              {gebruikers === 1 ? ' gebruiker' : ' gebruikers'}
              {gebruikers === MAX_GEBRUIKERS ? ' of meer' : ''}
            </span>
          </label>
          <input
            id="gebruikers"
            type="range"
            min={1}
            max={MAX_GEBRUIKERS}
            step={1}
            value={gebruikers}
            onChange={(e) => setGebruikers(Number(e.target.value))}
            className="seat-slider w-full"
            aria-valuetext={`${gebruikers} gebruikers`}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 md:gap-6">
          {/* doen., aanbevolen */}
          <div
            className="hero-fade relative flex flex-col rounded-[12px] border border-petrol/15 bg-white p-7 md:p-10"
            style={{ animationDelay: '0.25s' }}
          >
            <span className="absolute top-6 right-6 md:top-7 md:right-7 text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-[3px] bg-flame text-white">
              Alles inbegrepen
            </span>

            <h2
              className="font-heading font-bold text-ink leading-none mb-3"
              style={{ fontSize: 'clamp(28px, 3vw, 38px)', letterSpacing: '-0.03em' }}
            >
              doen<span className="text-flame">.</span>
            </h2>

            <div className="flex items-baseline gap-3 mb-2">
              <span
                className="font-heading font-bold text-ink leading-none tabular-nums"
                style={{ fontSize: 'clamp(56px, 6vw, 84px)', letterSpacing: '-0.03em' }}
              >
                €{euro(maat.prijs)}
              </span>
              <span className="text-[15px] text-muted">per maand, ex btw</span>
            </div>
            <p className="text-[15px] font-semibold text-petrol mb-1.5 tabular-nums">
              € {perPersoon(maat.prijs, gebruikers)} per persoon per maand
            </p>
            <p className="text-[14px] text-muted mb-6 md:mb-9">
              Eén bedrag tot {maat.tot} gebruikers · 30 dagen gratis · maandelijks opzegbaar
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
                Wat je per seat betaalt<span className="text-flame">.</span>
              </h2>

              <div className="flex items-baseline gap-3 mb-2">
                <span
                  className="font-heading font-bold text-white leading-none tabular-nums"
                  style={{ fontSize: 'clamp(56px, 6vw, 84px)', letterSpacing: '-0.03em' }}
                >
                  €{euro(perSeat)}
                </span>
                <span className="text-[15px]" style={{ color: 'rgba(226,240,241,0.82)' }}>
                  per maand, ex btw
                </span>
              </div>
              <p className="text-[15px] font-semibold mb-1.5 tabular-nums" style={{ color: 'rgba(226,240,241,0.82)' }}>
                € {perPersoon(perSeat, gebruikers)} per persoon per maand
              </p>
              <p className="text-[14px] flex-1" style={{ color: 'rgba(226,240,241,0.55)' }}>
                € {euro(PER_SEAT_EERSTE)} voor de eerste {PER_SEAT_EERSTE_AANTAL},
                dan € {euro(PER_SEAT_EXTRA)} per seat · eenmalig
                € {euro(PER_SEAT_OPSTART_MIN)} tot € {euro(PER_SEAT_OPSTART_MAX)} opzetkosten
              </p>

              <p
                className="mt-9 pt-6 border-t border-white/10 font-heading font-bold text-white leading-[1.15]"
                style={{ fontSize: 'clamp(20px, 2.2vw, 28px)', letterSpacing: '-0.02em' }}
              >
                {verschilPerJaar > 0 ? (
                  <>
                    Met doen. bespaar je{' '}
                    <span className="text-flame tabular-nums">€ {euro(verschilPerJaar)}</span> per
                    jaar<span className="text-flame">.</span>
                  </>
                ) : (
                  <>
                    Met minder dan {OMSLAGPUNT} mensen ben je daar goedkoper uit. Vanaf{' '}
                    {OMSLAGPUNT} draait het om<span className="text-flame">.</span>
                  </>
                )}
              </p>
              <p className="mt-3 text-[13px]" style={{ color: 'rgba(226,240,241,0.55)' }}>
                Gepubliceerd tarief per gebruiker, ex btw, augustus 2026. Opzetkosten niet meegerekend.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* Zelfde accordion-grammatica als de home-FAQ: hairlines, plus-icoon flame.
   Op bg in plaats van wit, want de onboarding-sectie erboven is al wit. */
function PrijzenFaq() {
  // Dicht bij binnenkomst: zes korte regels lezen sneller dan één open alinea.
  const [open, setOpen] = useState<number | null>(null)

  return (
    <section className="bg-bg">
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
                      <FaqAnswer text={faq.a} />
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
