'use client'

import { motion, useInView, useMotionValue, useTransform, animate } from 'framer-motion'
import { useRef, useEffect, useState } from 'react'
import Image from 'next/image'
import SectionReveal from '../SectionReveal'
import WachtlijstForm from '../WachtlijstForm'

const pains = [
  { nr: '01', before: 'Offertes in Word of een systeem uit 2015', after: 'Calculator met templates. Klant keurt goed via het portaal.' },
  { nr: '02', before: 'Planning op het whiteboard', after: 'Drag-and-drop. Werkbon zit eraan vast. Weerbericht erbij.' },
  { nr: '03', before: 'Facturen in Excel', after: 'Eén klik vanuit de offerte. Betaallink. Automatische herinneringen.' },
  { nr: '04', before: 'Klantcommunicatie via WhatsApp', after: 'Klantportaal. Eén link, alles op één plek.' },
  { nr: '05', before: 'Geen idee hoeveel uren ergens in zitten', after: 'Uren per project, per monteur. Altijd inzicht.' },
  { nr: '06', before: 'Offerte verstuurd en dan maar hopen', after: 'Automatische opvolging. Je weet wanneer de klant kijkt.' },
]

const oldVsNew = [
  { old: 'Interface uit 2015', nieuw: 'Ontworpen voor hoe je vandaag werkt' },
  { old: 'Geen klantportaal', nieuw: 'Portaal met één link, geen inlog' },
  { old: 'Geen offerte-opvolging', nieuw: 'Automatische opvolging en herinneringen' },
  { old: 'Geen urenoverzicht per project', nieuw: 'Uren per project, per monteur, altijd inzicht' },
  { old: 'Geen AI', nieuw: 'AI-assistent die je data kent en meedenkt' },
  { old: 'Modules bijkopen', nieuw: 'Alles erin. Geen add-ons.' },
]

function AnimatedNumber({ value, suffix = '', inView }: { value: number; suffix?: string; inView: boolean }) {
  const count = useMotionValue(0)
  const rounded = useTransform(count, (v) => Math.round(v))
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    if (inView) {
      const controls = animate(count, value, { duration: 1.5, ease: [0.16, 1, 0.3, 1] })
      const unsub = rounded.on('change', (v) => setDisplay(v))
      return () => { controls.stop(); unsub() }
    }
  }, [inView, value, count, rounded])

  return <>{display}{suffix}</>
}

export default function OverContent() {
  const portalRef = useRef(null)
  const portalInView = useInView(portalRef, { once: true, margin: '-80px' })
  const compareRef = useRef(null)
  const compareInView = useInView(compareRef, { once: true, margin: '-80px' })
  const numbersRef = useRef(null)
  const numbersInView = useInView(numbersRef, { once: true, margin: '-80px' })
  const [hoveredPain, setHoveredPain] = useState<number | null>(null)

  return (
    <div className="pt-28 md:pt-36">

      {/* === ACT 1: DE OPENING === */}
      <section className="pb-32 md:pb-44 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <Image
            src="/images/hero-waarom-doen.webp"
            alt=""
            fill
            className="object-contain object-right-bottom opacity-[0.18]"
            priority
          />
        </div>
        <div className="container-site relative">
          <SectionReveal>
            <div className="max-w-3xl">
              <motion.p
                className="font-mono text-[12px] font-bold tracking-[0.3em] uppercase text-flame mb-6"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
              >
                Waarom doen. bestaat
              </motion.p>
              <h1 className="font-heading text-[44px] md:text-[64px] lg:text-[76px] font-bold text-petrol tracking-[-3px] leading-[0.92] mb-8">
                Je werd ondernemer<br />
                om te maken<span className="text-flame">.</span><br />
                <span style={{ color: '#9B9B95' }}>Niet om te administreren</span><span className="text-flame">.</span>
              </h1>
              <p className="text-[18px] md:text-[21px] leading-[1.8] max-w-xl" style={{ color: '#6B6B66' }}>
                Signing, wrapping, lichtreclame, belettering. Dat is waar je goed in bent. Maar elke dag gaat er uren op aan offertes, planning, facturen en klantcommunicatie. Dat moet anders.
              </p>
            </div>
          </SectionReveal>
        </div>
      </section>

      {/* === TUSSENSTATEMENT === */}
      <section className="py-20 md:py-28" style={{ backgroundColor: '#F8F8F6' }}>
        <div className="container-site">
          <SectionReveal>
            <blockquote className="max-w-3xl mx-auto text-center">
              <p className="font-heading text-[24px] md:text-[36px] lg:text-[42px] font-bold text-petrol tracking-[-1.5px] leading-[1.1]">
                &ldquo;We hebben het altijd zo gedaan&rdquo;<br />
                <span style={{ color: '#9B9B95' }}>is geen reden om het zo te blijven doen</span><span className="text-flame">.</span>
              </p>
            </blockquote>
          </SectionReveal>
        </div>
      </section>

      {/* === ACT 2: HET PROBLEEM === */}
      <section className="py-24 md:py-36 bg-white relative">
        <div className="container-site relative">
          <SectionReveal>
            <p className="font-mono text-[12px] font-bold tracking-[0.3em] uppercase text-flame mb-4">
              Herkenbaar?
            </p>
            <h2 className="font-heading text-[28px] md:text-[44px] font-bold text-petrol tracking-[-2px] leading-[0.92] mb-3">
              Zo werkte je<span className="text-flame">.</span><br />
              <span style={{ color: '#9B9B95' }}>Zo werk je met doen</span><span className="text-flame">.</span>
            </h2>
            <p className="text-[15px] mb-14" style={{ color: '#9B9B95' }}>Hover en herken je eigen werkdag.</p>
          </SectionReveal>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {pains.map((p, i) => (
              <SectionReveal key={i} delay={i * 0.06}>
                <motion.div
                  className="relative rounded-2xl p-6 cursor-default overflow-hidden min-h-[140px]"
                  style={{
                    backgroundColor: hoveredPain === i ? '#1A535C' : '#F8F8F6',
                    transition: 'background-color 0.4s ease',
                  }}
                  onMouseEnter={() => setHoveredPain(i)}
                  onMouseLeave={() => setHoveredPain(null)}
                  whileHover={{ y: -4 }}
                  transition={{ duration: 0.3 }}
                >
                  <span className="font-mono text-[11px] font-bold tracking-[0.1em] mb-4 block"
                    style={{ color: hoveredPain === i ? 'rgba(255,255,255,0.3)' : '#C8C8C0', transition: 'color 0.3s ease' }}>
                    {p.nr}
                  </span>

                  <div style={{
                    opacity: hoveredPain === i ? 0 : 1,
                    transform: hoveredPain === i ? 'translateY(-8px)' : 'translateY(0)',
                    transition: 'all 0.3s ease',
                    position: hoveredPain === i ? 'absolute' : 'relative',
                    pointerEvents: hoveredPain === i ? 'none' : 'auto',
                    left: hoveredPain === i ? '1.5rem' : undefined,
                    right: hoveredPain === i ? '1.5rem' : undefined,
                  }}>
                    <p className="text-[15px] leading-[1.6] line-through" style={{ color: '#9B9B95' }}>
                      {p.before}
                    </p>
                  </div>

                  <div style={{
                    opacity: hoveredPain === i ? 1 : 0,
                    transform: hoveredPain === i ? 'translateY(0)' : 'translateY(8px)',
                    transition: 'all 0.3s ease',
                    position: hoveredPain === i ? 'relative' : 'absolute',
                    pointerEvents: hoveredPain === i ? 'auto' : 'none',
                    left: hoveredPain !== i ? '1.5rem' : undefined,
                    right: hoveredPain !== i ? '1.5rem' : undefined,
                  }}>
                    <p className="text-[15px] font-medium leading-[1.6] text-white">
                      {p.after}
                    </p>
                  </div>

                  <div className="absolute bottom-0 left-0 right-0 h-[3px] rounded-b-2xl"
                    style={{
                      background: 'linear-gradient(90deg, #F15025, #1A535C)',
                      opacity: hoveredPain === i ? 1 : 0,
                      transition: 'opacity 0.3s ease',
                    }} />
                </motion.div>
              </SectionReveal>
            ))}
          </div>
        </div>
      </section>

      {/* === ORIGIN STORY === */}
      <section className="py-24 md:py-36" style={{ backgroundColor: '#0F3A42' }}>
        <div className="container-site">
          <div className="max-w-3xl mx-auto">
            <SectionReveal>
              <p className="font-mono text-[12px] font-bold tracking-[0.3em] uppercase mb-6" style={{ color: '#F15025' }}>
                Ons verhaal
              </p>
              <h2 className="font-heading text-[28px] md:text-[44px] font-bold text-white tracking-[-2px] leading-[0.95] mb-10">
                Gebouwd vanuit de werkplaats<span className="text-flame">.</span><br />
                <span className="text-white/30">Niet vanuit een kantoor</span><span className="text-flame">.</span>
              </h2>
            </SectionReveal>
            <SectionReveal delay={0.1}>
              <p className="text-[17px] md:text-[19px] leading-[1.9] text-white/50 mb-8">
                doen. is geboren uit frustratie. De frustratie van een signbedrijf dat al sinds 1983 bestaat. Elke dag dezelfde strijd: offertes die kwijtraken, planning die niet klopt, klanten die niet reageren, en software die aanvoelt alsof die in een ander tijdperk is gebouwd.
              </p>
            </SectionReveal>
            <SectionReveal delay={0.15}>
              <p className="text-[17px] md:text-[19px] leading-[1.9] text-white/50 mb-8">
                Dus bouwden we ons eigen systeem. Geen consultants die kwamen vertellen hoe het moest. Geen framework dat bedacht is voor elke branche. Maar software die begrijpt hoe jouw dag eruitziet.
              </p>
            </SectionReveal>
            <SectionReveal delay={0.2}>
              <p className="text-[17px] md:text-[19px] leading-[1.9] text-white/70 font-medium">
                En nu delen we het met iedereen die hetzelfde voelt.
              </p>
            </SectionReveal>
          </div>
        </div>
      </section>

      {/* === ACT 3: DE OPLOSSING — PORTAAL === */}
      <section ref={portalRef} className="py-24 md:py-36 bg-white relative overflow-hidden">
        <div className="container-site relative">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={portalInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            >
              <span className="font-mono text-[12px] font-bold tracking-[0.3em] uppercase mb-6 block" style={{ color: '#F15025' }}>
                Klantportaal
              </span>
              <h2 className="font-heading text-[32px] md:text-[48px] font-bold text-petrol tracking-[-2.5px] leading-[0.92] mb-8">
                Je klant doet mee<span className="text-flame">.</span><br />
                <span style={{ color: '#9B9B95' }}>Zonder gedoe</span><span className="text-flame">.</span>
              </h2>
              <p className="text-[16px] md:text-[17px] leading-[1.8] mb-10 max-w-lg" style={{ color: '#6B6B66' }}>
                Geen WhatsApp-groepen. Geen eindeloze mailthreads. Je klant krijgt een link en ziet alles. Tekeningen goedkeuren, offertes accorderen, reageren op bestanden. Geen inlog nodig.
              </p>
              <div className="space-y-4">
                {[
                  'Tekeningen goedkeuren met een klik',
                  'Offertes accorderen zonder te printen',
                  'Reageert de klant niet? doen. herinnert automatisch',
                  'Meerdere contactpersonen per klant',
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    className="flex items-center gap-4"
                    initial={{ opacity: 0, x: -20 }}
                    animate={portalInView ? { opacity: 1, x: 0 } : {}}
                    transition={{ duration: 0.5, delay: 0.3 + i * 0.1 }}
                  >
                    <span className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-[13px] font-bold"
                      style={{ backgroundColor: 'rgba(241, 80, 37, 0.1)', color: '#F15025' }}>
                      {i + 1}
                    </span>
                    <span className="text-[15px]" style={{ color: '#4A4A46' }}>{item}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={portalInView ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="relative"
            >
              <div className="relative">
                <Image
                  src="/images/klantportaal-illustratie.webp"
                  alt="Klantportaal"
                  width={800}
                  height={800}
                  className="w-full max-w-md mx-auto h-auto"
                />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* === VERGELIJKING === */}
      <section ref={compareRef} className="py-24 md:py-36" style={{ backgroundColor: '#F8F8F6' }}>
        <div className="container-site">
          <SectionReveal>
            <p className="font-mono text-[12px] font-bold tracking-[0.3em] uppercase text-flame mb-4">
              Tijd om te switchen
            </p>
            <h2 className="font-heading text-[28px] md:text-[44px] font-bold text-petrol tracking-[-2px] leading-[0.92] mb-4">
              Je huidige software was ooit prima<span className="text-flame">.</span><br />
              <span style={{ color: '#9B9B95' }}>Ooit</span><span className="text-flame">.</span>
            </h2>
            <p className="text-[15px] md:text-[16px] max-w-xl mb-14" style={{ color: '#6B6B66' }}>
              Dezelfde knoppen, dezelfde beperkingen, al jaren. Software hoort mee te groeien met je bedrijf.
            </p>
          </SectionReveal>

          <div className="max-w-3xl">
            <div className="grid grid-cols-[1fr,auto,1fr] gap-4 md:gap-6 pb-4 mb-2" style={{ borderBottom: '2px solid #1A535C' }}>
              <p className="font-mono text-[11px] font-bold tracking-[0.15em] uppercase" style={{ color: '#9B9B95' }}>
                Wat je gewend bent
              </p>
              <div />
              <p className="font-mono text-[11px] font-bold tracking-[0.15em] uppercase" style={{ color: '#1A535C' }}>
                Wat doen<span className="text-flame">.</span> doet
              </p>
            </div>

            {oldVsNew.map((row, i) => (
              <motion.div
                key={i}
                className="grid grid-cols-[1fr,auto,1fr] gap-4 md:gap-6 py-5"
                style={{ borderBottom: '1px solid #E4E4E0' }}
                initial={{ opacity: 0, y: 15 }}
                animate={compareInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: i * 0.08 }}
              >
                <p className="text-[14px] flex items-center gap-2" style={{ color: '#C0451A' }}>
                  <span className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[10px]"
                    style={{ backgroundColor: 'rgba(192, 69, 26, 0.08)' }}>
                    &#x2717;
                  </span>
                  <span className="line-through opacity-60">{row.old}</span>
                </p>
                <span className="text-[18px] self-center" style={{ color: '#DADAD6' }}>&#8594;</span>
                <p className="text-[14px] font-medium flex items-center gap-2" style={{ color: '#1A535C' }}>
                  <span className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[10px]"
                    style={{ backgroundColor: 'rgba(26, 83, 92, 0.08)' }}>
                    &#x2713;
                  </span>
                  {row.nieuw}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* === WAT JE KRIJGT === */}
      <section className="py-24 md:py-36 relative overflow-hidden" style={{ backgroundColor: '#1A535C' }}>
        <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full opacity-[0.08] blur-[120px] pointer-events-none"
          style={{ background: 'radial-gradient(circle, #F15025 0%, transparent 60%)' }} />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full opacity-[0.06] blur-[100px] pointer-events-none"
          style={{ background: 'radial-gradient(circle, #fff 0%, transparent 60%)' }} />
        <div className="container-site relative">
          <SectionReveal>
            <p className="font-mono text-[12px] font-bold tracking-[0.3em] uppercase mb-4" style={{ color: '#F15025' }}>
              Wat je krijgt
            </p>
            <h2 className="font-heading text-[28px] md:text-[44px] font-bold text-white tracking-[-2px] leading-[0.92] mb-16">
              Gebouwd door het vak<span className="text-flame">.</span><br />
              <span className="text-white/30">Niet door consultants</span><span className="text-flame">.</span>
            </h2>
          </SectionReveal>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-3xl">
            {[
              { title: 'Alles erin', text: 'Planning, portaal, AI, werkbonnen, facturatie. Geen modules bijkopen.' },
              { title: '49 euro per maand', text: '3 gebruikers. Elke extra +10 euro. Geen verrassingen, geen opzetkosten.' },
              { title: 'Door signmakers', text: 'Niet door mensen die het vak googlen. Door mensen die in de werkplaats staan.' },
              { title: 'Geen lock-in', text: 'Jouw data is van jou. Maandelijks opzegbaar. Je blijft omdat het werkt.' },
            ].map((item, i) => (
              <SectionReveal key={i} delay={i * 0.08}>
                <motion.div
                  className="rounded-2xl p-8 h-full"
                  style={{ backgroundColor: 'rgba(255,255,255,0.07)', borderLeft: '3px solid rgba(241, 80, 37, 0.4)' }}
                  whileHover={{ backgroundColor: 'rgba(255,255,255,0.12)' }}
                  transition={{ duration: 0.3 }}
                >
                  <h3 className="font-heading text-[20px] font-bold text-white tracking-tight mb-3">
                    {item.title}<span className="text-flame">.</span>
                  </h3>
                  <p className="text-[14px] leading-[1.8] text-white/50">
                    {item.text}
                  </p>
                </motion.div>
              </SectionReveal>
            ))}
          </div>
        </div>
      </section>

      {/* === NUMBERS === */}
      <section ref={numbersRef} className="py-20 md:py-28" style={{ backgroundColor: '#F8F8F6' }}>
        <div className="container-site">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-3xl mx-auto text-center">
            {[
              { value: 30, suffix: '%', text: 'minder tijd aan administratie' },
              { value: 0, suffix: '', text: 'kwijtgeraakte offertes' },
              { value: 1, suffix: '', text: 'systeem voor alles' },
            ].map((r, i) => (
              <SectionReveal key={i} delay={i * 0.12}>
                <div className="py-6">
                  <p className="font-heading text-[52px] md:text-[68px] font-bold tracking-[-3px] leading-none" style={{ color: '#1A535C' }}>
                    <AnimatedNumber value={r.value} suffix={r.suffix} inView={numbersInView} />
                  </p>
                  <div className="w-8 h-[3px] mx-auto my-4 rounded-full" style={{ background: 'linear-gradient(90deg, #F15025, #1A535C)' }} />
                  <p className="text-[14px]" style={{ color: '#6B6B66' }}>
                    {r.text}
                  </p>
                </div>
              </SectionReveal>
            ))}
          </div>
        </div>
      </section>

      {/* === ACT 4: DE AFSLUITING === */}
      <section className="py-24 md:py-36 bg-white">
        <div className="container-site">
          <div className="max-w-2xl mx-auto text-center">
            <SectionReveal>
              <p className="font-mono text-[12px] font-bold tracking-[0.3em] uppercase text-flame mb-6">
                Binnenkort live
              </p>
              <h2 className="font-heading text-[28px] md:text-[44px] font-bold text-petrol tracking-[-2px] leading-[1] mb-6">
                Stop met rommelen<span className="text-flame">.</span><br />
                Begin met doen<span className="text-flame">.</span>
              </h2>
              <p className="text-[16px] mb-10 max-w-md mx-auto" style={{ color: '#9B9B95' }}>
                We mailen je zodra het zover is. Als eerste erbij.
              </p>
              <div className="flex justify-center">
                <WachtlijstForm />
              </div>
            </SectionReveal>
          </div>
        </div>
      </section>
    </div>
  )
}
