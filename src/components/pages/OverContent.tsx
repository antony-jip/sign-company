'use client'

import { useRef } from 'react'
import Image from 'next/image'
import { motion, useInView, useReducedMotion } from 'framer-motion'
import CTASection from '@/components/home/CTASection'

const easing: [number, number, number, number] = [0.16, 1, 0.3, 1]

/* Kalme reveal per blok: één fade-up, eenmalig. */
function Reveal({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  const reduce = useReducedMotion() ?? false
  const show = reduce || inView

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={reduce ? false : { opacity: 0, y: 20 }}
      animate={show ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.8, delay, ease: easing }}
    >
      {children}
    </motion.div>
  )
}

export default function OverContent() {
  return (
    <div>
      {/* === DE OPENING === */}
      {/* Entree via CSS-keyframes (globals.css: .hero-line / .hero-fade) */}
      <section className="bg-bg">
        <div className="container-site pt-28 md:pt-48 pb-14 md:pb-32">
          <div className="max-w-3xl">
            <h1
              className="font-heading font-bold text-petrol leading-[0.97] mb-5 md:mb-8"
              style={{ fontSize: 'clamp(36px, 6.4vw, 88px)', letterSpacing: '-0.035em', textWrap: 'balance' }}
            >
              <span className="block overflow-hidden pb-[0.08em] -mb-[0.08em]">
                <span className="hero-line" style={{ animationDelay: '0.05s' }}>
                  Je werd ondernemer om te maken<span className="text-flame">.</span>
                </span>
              </span>
              <span className="block overflow-hidden pb-[0.08em] -mb-[0.08em]">
                <span className="hero-line text-muted" style={{ animationDelay: '0.15s' }}>
                  Niet om te administreren<span className="text-flame">.</span>
                </span>
              </span>
            </h1>
            <p className="hero-fade text-[17px] md:text-[19px] leading-[1.6] max-w-xl text-ink" style={{ animationDelay: '0.35s' }}>
              Signing, wrapping, lichtreclame, belettering. Dat is waar je goed in
              bent. Maar elke dag gaan er uren op aan offertes, planning, facturen
              en klantcommunicatie. Dat moet anders.
            </p>
          </div>
        </div>
      </section>

      {/* === HET ORIGIN-VERHAAL === */}
      <section className="relative overflow-hidden bg-petrol-deep">
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 80% 85% at 88% 0%, rgba(42,111,122,0.5) 0%, rgba(42,111,122,0) 60%)',
          }}
        />
        <div className="container-site relative py-16 md:py-32">
          <div className="max-w-3xl">
            <Reveal>
              <h2
                className="font-heading font-bold text-white leading-[1.02] mb-6 md:mb-10"
                style={{ fontSize: 'clamp(30px, 4vw, 52px)', letterSpacing: '-0.03em', textWrap: 'balance' }}
              >
                Gebouwd vanuit de werkplaats, niet vanuit een kantoor
                <span className="text-flame">.</span>
              </h2>
            </Reveal>
            <Reveal delay={0.1}>
              <div className="space-y-5 md:space-y-7 text-[17px] md:text-[19px] leading-[1.7]" style={{ color: 'rgba(226,240,241,0.82)' }}>
                <p>
                  doen. is geboren uit frustratie. De frustratie van een signbedrijf
                  dat al sinds 1983 bestaat. Elke dag dezelfde strijd: offertes die
                  kwijtraken, planning die niet klopt, klanten die niet reageren, en
                  software die aanvoelt alsof die in een ander tijdperk is gebouwd.
                </p>
                <p>
                  Dus bouwden we ons eigen systeem. Geen consultants die kwamen
                  vertellen hoe het moest. Geen framework dat bedacht is voor elke
                  branche. Maar software die begrijpt hoe jouw dag eruitziet.
                </p>
                <p className="font-medium text-white">
                  En nu delen we het met iedereen die hetzelfde voelt.
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* === BRIEF VAN DE MAKER === */}
      <section className="bg-white">
        <div className="container-site py-16 md:py-32">
          <div className="grid grid-cols-1 lg:grid-cols-[0.8fr_1.2fr] gap-8 lg:gap-20 items-start max-w-6xl mx-auto">
            {/* Portret */}
            <Reveal>
              <div className="relative aspect-[3/4] w-full max-w-md overflow-hidden rounded-[8px]">
                <Image
                  src="/images/maker/founder.webp"
                  alt="Antony Bootsma, maker van doen."
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 40vw"
                />
              </div>
              <p className="text-[14px] text-muted mt-4">
                Antony Bootsma · Sign Company, sinds 1983
              </p>
            </Reveal>

            {/* De brief */}
            <Reveal delay={0.15}>
              <h2
                className="font-heading font-bold text-petrol leading-[1.02] mb-5 md:mb-8"
                style={{ fontSize: 'clamp(30px, 4vw, 52px)', letterSpacing: '-0.03em', textWrap: 'balance' }}
              >
                <span className="block">Familiebedrijf<span className="text-flame">.</span></span>
                <span className="block text-muted">Ruim 40 jaar vak<span className="text-flame">.</span></span>
                <span className="block">Eén maker<span className="text-flame">.</span></span>
              </h2>

              <div className="space-y-5 text-[16px] md:text-[17px] leading-[1.65] max-w-xl text-ink">
                <p>
                  Ik ben <strong>Antony Bootsma</strong>. Wij zijn een
                  familiebedrijf. Sign Company bestaat sinds 1983. Mijn vader heeft
                  het opgebouwd, doet de montage nog steeds. Ik neem het over.
                </p>
                <p>
                  En ik had geen zin om nog jaren te werken met software die niet
                  past bij hoe wij werken. Op een vrijdagmiddag telde ik vijf open
                  tabbladen, drie WhatsApp-gesprekken en een post-it die ik niet
                  meer kon lezen. Mijn vader belde voor de werkbon. Een klant
                  wachtte op een bevestiging. En ik stond nog midden in een offerte.
                </p>
              </div>

              <blockquote
                className="font-heading font-bold text-petrol my-7 md:my-10 max-w-xl leading-[1.15]"
                style={{ fontSize: 'clamp(22px, 2.6vw, 30px)', letterSpacing: '-0.02em', textWrap: 'balance' }}
              >
                Niet omdat ik het niet kon<span className="text-flame">.</span> Maar
                omdat het systeem het me niet makkelijk maakte
                <span className="text-flame">.</span>
              </blockquote>

              <div className="space-y-5 text-[16px] md:text-[17px] leading-[1.65] max-w-xl text-ink">
                <p>
                  Ik zocht software die paste bij ruim 40 jaar vakmanschap en de
                  manier waarop wij werken. Die er niet was. Dus heb ik het zelf
                  gebouwd, in de avonden, tussen de werkdagen door. Niet vanuit een
                  glazen kantoor, maar vanuit dezelfde werkplaats waar mijn vader
                  elke ochtend binnenloopt.
                </p>
                <p>
                  Een van de dingen waar ik het meest trots op ben is het
                  klantportaal. Geen mailtjes heen en weer. Je klant krijgt één
                  link, ziet de tekeningen, keurt de offerte goed. Dat scheelt ons
                  elke week uren.
                </p>
                <p>
                  En AI? Ik vind het geen toverwoord, ik vind het een werkwoord.
                  Onze assistent Daan schrijft offerteteksten, vat mails samen,
                  rekent vierkante meters uit. Niet omdat het indrukwekkend klinkt,
                  maar omdat het gewoon werkt.
                </p>
                <p>
                  Ik noemde het <strong>doen.</strong> Omdat dat is wat wij doen.
                  Andere signmakers herkenden hetzelfde: de losse eindjes, de
                  administratie die het echte werk in de weg zit. Ik wilde dit niet
                  voor mezelf houden. doen. is gebouwd voor ons vak. Ik deel het
                  graag met iedereen die er beter van wordt.
                </p>
                <p className="font-heading font-bold text-petrol text-[19px] md:text-[21px]">
                  Voor het vak<span className="text-flame">.</span> Door het vak
                  <span className="text-flame">.</span> Gewoon doen
                  <span className="text-flame">.</span>
                </p>
              </div>

              <div className="flex items-end justify-between mt-10 pt-7 max-w-xl border-t border-petrol/10">
                <p className="text-[14px] font-semibold text-ink">
                  Antony Bootsma
                  <span className="block text-[13px] font-normal text-muted mt-0.5">maker van doen.</span>
                </p>
                <a
                  href="mailto:hello@doen.team"
                  className="group inline-flex items-center gap-2 text-[15px] font-semibold text-ink"
                >
                  <span className="relative">
                    Schrijf me
                    <span className="absolute left-0 -bottom-1 h-px w-full origin-left transition-transform duration-300 group-hover:scale-x-0 bg-ink/30" />
                  </span>
                  <span aria-hidden className="text-flame transition-transform duration-300 group-hover:translate-x-1">→</span>
                </a>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* === AFSLUITING === */}
      <CTASection />
    </div>
  )
}
