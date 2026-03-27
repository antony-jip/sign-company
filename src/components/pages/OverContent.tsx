'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import Image from 'next/image'
import SectionReveal from '../SectionReveal'
import WachtlijstForm from '../WachtlijstForm'

const pains = [
  { before: 'Offertes in Word of een systeem uit 2015', after: 'Calculator met templates. Klant keurt goed via het portaal.' },
  { before: 'Planning op het whiteboard', after: 'Drag-and-drop. Werkbon zit eraan vast. Weerbericht erbij.' },
  { before: 'Facturen in Excel', after: 'Eén klik vanuit de offerte. Betaallink. Automatische herinneringen.' },
  { before: 'Klantcommunicatie via WhatsApp', after: 'Klantportaal. Eén link, alles op één plek.' },
  { before: 'Geen idee hoeveel uren ergens in zitten', after: 'Uren per project, per monteur. Altijd inzicht.' },
  { before: 'Offerte verstuurd en dan maar hopen', after: 'Automatische opvolging. Je weet wanneer de klant kijkt.' },
]

const oldVsNew = [
  { old: 'Interface uit 2015', nieuw: 'Ontworpen voor hoe je vandaag werkt' },
  { old: 'Geen klantportaal', nieuw: 'Portaal met één link, geen inlog' },
  { old: 'Geen offerte-opvolging', nieuw: 'Automatische opvolging en herinneringen' },
  { old: 'Geen urenoverzicht per project', nieuw: 'Uren per project, per monteur, altijd inzicht' },
  { old: 'Geen AI', nieuw: 'AI-assistent die je data kent en meedenkt' },
  { old: 'Modules bijkopen', nieuw: 'Alles erin. Geen add-ons.' },
]

export default function OverContent() {
  const portalRef = useRef(null)
  const portalInView = useInView(portalRef, { once: true, margin: '-80px' })
  const compareRef = useRef(null)
  const compareInView = useInView(compareRef, { once: true, margin: '-80px' })

  return (
    <div className="pt-28 md:pt-36">

      {/* Hero */}
      <section className="pb-20 md:pb-28">
        <div className="container-site">
          <SectionReveal>
            <div className="max-w-3xl">
              <p className="font-mono text-[12px] font-bold tracking-[0.2em] uppercase text-flame mb-4">
                Waarom doen.
              </p>
              <h1 className="font-heading text-[40px] md:text-[56px] font-bold text-petrol tracking-[-2.5px] leading-[0.95] mb-6">
                Jij maakt het<span className="text-flame">.</span><br />
                doen<span className="text-flame">.</span> <span style={{ color: '#9B9B95' }}>regelt de rest</span><span className="text-flame">.</span>
              </h1>
              <p className="text-[18px] md:text-[20px] leading-relaxed max-w-2xl" style={{ color: '#6B6B66' }}>
                Je bent niet ondernemer geworden om de hele dag achter een scherm te zitten. Je wilt maken, monteren, opleveren. doen. neemt het papierwerk over. Jij doet waar je goed in bent.
              </p>
            </div>
          </SectionReveal>
        </div>
      </section>

      {/* Before / After */}
      <section className="py-16 md:py-24 bg-white">
        <div className="container-site">
          <SectionReveal>
            <p className="font-mono text-[12px] font-bold tracking-[0.2em] uppercase text-flame mb-4">
              Herkenbaar?
            </p>
            <h2 className="font-heading text-[28px] md:text-[40px] font-bold text-petrol tracking-[-1.5px] leading-[0.95] mb-4">
              Zo werkte je<span className="text-flame">.</span><br />
              <span style={{ color: '#9B9B95' }}>Zo werk je met doen</span><span className="text-flame">.</span>
            </h2>
            <p className="text-[15px] mb-12" style={{ color: '#9B9B95' }}>Klik en herken je eigen werkdag.</p>
          </SectionReveal>

          <div className="space-y-0">
            {pains.map((p, i) => (
              <SectionReveal key={i} delay={i * 0.04}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-12 py-5" style={{ borderBottom: '1px solid #EBEBEB' }}>
                  <div className="flex items-start gap-3">
                    <span className="w-2 h-2 rounded-full mt-[7px] flex-shrink-0" style={{ backgroundColor: '#C0451A', opacity: 0.5 }} />
                    <p className="text-[15px] line-through" style={{ color: '#9B9B95' }}>{p.before}</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="w-2 h-2 rounded-full mt-[7px] flex-shrink-0" style={{ backgroundColor: '#1A535C' }} />
                    <p className="text-[15px] font-medium" style={{ color: '#1A1A1A' }}>{p.after}</p>
                  </div>
                </div>
              </SectionReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Portaal highlight */}
      <section ref={portalRef} className="relative overflow-hidden" style={{ backgroundColor: '#0F3A42' }}>
        <div className="h-[3px]" style={{ background: 'linear-gradient(90deg, #1A535C, #F15025)' }} />
        <div className="container-site py-20 md:py-28">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={portalInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            >
              <span className="font-mono text-[12px] font-bold tracking-[0.2em] uppercase mb-5 block" style={{ color: '#F15025' }}>
                Klantportaal
              </span>
              <h2 className="font-heading text-[32px] md:text-[44px] font-bold text-white tracking-[-2px] leading-[0.95] mb-6">
                Je klant doet mee<span className="text-flame">.</span><br />
                <span className="text-white/30">Zonder gedoe</span><span className="text-flame">.</span>
              </h2>
              <p className="text-[17px] leading-relaxed text-white/50 mb-8 max-w-lg">
                Geen WhatsApp-groepen. Geen eindeloze mailthreads. Je klant krijgt één link en ziet alles. Tekeningen goedkeuren, offertes accorderen, reageren op bestanden. Geen inlog nodig.
              </p>
              <div className="space-y-4">
                {[
                  'Tekeningen goedkeuren met één klik',
                  'Offertes accorderen zonder te printen',
                  'Reageert de klant niet? doen. herinnert automatisch',
                  'Meerdere contactpersonen per klant',
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    className="flex items-center gap-3"
                    initial={{ opacity: 0, x: -15 }}
                    animate={portalInView ? { opacity: 1, x: 0 } : {}}
                    transition={{ duration: 0.5, delay: 0.3 + i * 0.08 }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: '#F15025' }} />
                    <span className="text-[15px] text-white/60">{item}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={portalInView ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            >
              <Image
                src="/images/modules/klantportaal.jpg"
                alt="Klantportaal"
                width={800}
                height={800}
                className="w-full max-w-sm mx-auto h-auto"
              />
            </motion.div>
          </div>
        </div>
        <div className="h-[3px]" style={{ background: 'linear-gradient(90deg, #F15025, #1A535C)' }} />
      </section>

      {/* Tijd om te switchen */}
      <section ref={compareRef} className="py-20 md:py-28 bg-white">
        <div className="container-site">
          <SectionReveal>
            <p className="font-mono text-[12px] font-bold tracking-[0.2em] uppercase text-flame mb-4">
              Tijd om te switchen
            </p>
            <h2 className="font-heading text-[28px] md:text-[40px] font-bold text-petrol tracking-[-1.5px] leading-[0.95] mb-4">
              Je huidige software was ooit prima<span className="text-flame">.</span><br />
              <span style={{ color: '#9B9B95' }}>Ooit</span><span className="text-flame">.</span>
            </h2>
            <p className="text-[15px] max-w-xl mb-14" style={{ color: '#6B6B66' }}>
              Dezelfde knoppen, dezelfde beperkingen, al jaren. Geen portaal. Geen opvolging. Geen AI die meedenkt. Software hoort mee te groeien met je bedrijf.
            </p>
          </SectionReveal>

          <div className="max-w-3xl">
            {/* Header */}
            <div className="grid grid-cols-2 gap-8 pb-4 mb-2" style={{ borderBottom: '2px solid #1A535C' }}>
              <p className="font-mono text-[11px] font-bold tracking-[0.15em] uppercase" style={{ color: '#9B9B95' }}>
                Wat je gewend bent
              </p>
              <p className="font-mono text-[11px] font-bold tracking-[0.15em] uppercase" style={{ color: '#1A535C' }}>
                Wat doen<span className="text-flame">.</span> doet
              </p>
            </div>

            {oldVsNew.map((row, i) => (
              <motion.div
                key={i}
                className="grid grid-cols-2 gap-8 py-4"
                style={{ borderBottom: '1px solid #EBEBEB' }}
                initial={{ opacity: 0, y: 10 }}
                animate={compareInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.4, delay: i * 0.06 }}
              >
                <p className="text-[14px]" style={{ color: '#9B9B95' }}>{row.old}</p>
                <p className="text-[14px] font-medium" style={{ color: '#1A1A1A' }}>{row.nieuw}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Wat maakt doen. anders */}
      <section className="py-20 md:py-28">
        <div className="container-site">
          <SectionReveal>
            <p className="font-mono text-[12px] font-bold tracking-[0.2em] uppercase text-flame mb-4">
              Wat je krijgt
            </p>
            <h2 className="font-heading text-[28px] md:text-[40px] font-bold text-petrol tracking-[-1.5px] leading-[0.95] mb-14">
              Gebouwd door het vak<span className="text-flame">.</span><br />
              <span style={{ color: '#9B9B95' }}>Niet door consultants</span><span className="text-flame">.</span>
            </h2>
          </SectionReveal>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { title: 'Alles erin', text: 'Planning, portaal, AI, werkbonnen, facturatie. Geen modules bijkopen.' },
              { title: '€49 per maand', text: '3 gebruikers. Elke extra +€10. Geen verrassingen, geen opzetkosten.' },
              { title: 'Door signmakers', text: 'Niet door mensen die het vak googlen. Door mensen die in de werkplaats staan.' },
              { title: 'Geen lock-in', text: 'Jouw data is van jou. Maandelijks opzegbaar. Je blijft omdat het werkt.' },
            ].map((item, i) => (
              <SectionReveal key={i} delay={i * 0.08}>
                <div className="rounded-2xl p-7" style={{ backgroundColor: '#FFFFFF', boxShadow: '0 1px 8px rgba(0,0,0,0.03)' }}>
                  <h3 className="font-heading text-[18px] font-bold text-petrol tracking-tight mb-2">
                    {item.title}<span className="text-flame">.</span>
                  </h3>
                  <p className="text-[14px] leading-[1.7]" style={{ color: '#6B6B66' }}>
                    {item.text}
                  </p>
                </div>
              </SectionReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Numbers */}
      <section className="py-16 md:py-24 bg-white">
        <div className="container-site">
          <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto text-center">
            {[
              { nr: '30%', text: 'minder tijd aan administratie' },
              { nr: '0', text: 'kwijtgeraakte offertes' },
              { nr: '1', text: 'systeem voor alles' },
            ].map((r, i) => (
              <SectionReveal key={i} delay={i * 0.1}>
                <div>
                  <p className="font-heading text-[40px] md:text-[52px] font-bold tracking-[-2px]" style={{ color: '#1A535C' }}>
                    {r.nr}
                  </p>
                  <p className="text-[13px] mt-1" style={{ color: '#9B9B95' }}>
                    {r.text}
                  </p>
                </div>
              </SectionReveal>
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
              Stop met rommelen<span className="text-flame">.</span> Begin met doen<span className="text-flame">.</span>
            </h2>
            <p className="text-[15px] text-white/40 max-w-md mx-auto mb-8">
              We mailen je zodra het zover is. Als eerste erbij.
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
