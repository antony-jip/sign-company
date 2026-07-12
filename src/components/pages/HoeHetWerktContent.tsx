'use client'

import { useRef } from 'react'
import { motion, useInView, useReducedMotion } from 'framer-motion'
import CTASection from '@/components/home/CTASection'
import { morningNotifications, pains, type Notification, type Pain } from '@/data/werkdag'

const FLAME = '#F15025'
const easing: [number, number, number, number] = [0.16, 1, 0.3, 1]

/* ─────────────────────────────────────────────────────────────────
   Hero · lost de paginabelofte direct in: zeven stappen, klikbaar.
   ───────────────────────────────────────────────────────────────── */

const stepIndex = [
  { nr: '01', label: 'Aanvraag' },
  { nr: '02', label: 'Offerte' },
  { nr: '03', label: 'Portaal' },
  { nr: '04', label: 'Planning' },
  { nr: '05', label: 'Montage' },
  { nr: '06', label: 'Factuur' },
  { nr: '07', label: 'Gedaan' },
]

/* Kop-entree via CSS-keyframes (globals.css: .hero-line / .hero-fade). */
function Hero() {
  return (
    <section className="bg-bg">
      <div className="container-site pt-28 md:pt-44 pb-12 md:pb-24">
        <h1
          className="font-heading font-bold text-petrol leading-[1.0] mb-6 max-w-3xl"
          style={{ fontSize: 'clamp(34px, 5.2vw, 68px)', letterSpacing: '-0.035em', textWrap: 'balance' }}
        >
          <span className="block overflow-hidden pb-[0.08em] -mb-[0.08em]">
            <span className="hero-line" style={{ animationDelay: '0.05s' }}>
              Van aanvraag tot betaald.
            </span>
          </span>
          <span className="block overflow-hidden pb-[0.08em] -mb-[0.08em]">
            <span className="hero-line" style={{ animationDelay: '0.15s' }}>
              In zeven stappen<span className="text-flame">.</span>
            </span>
          </span>
        </h1>

        <p
          className="hero-fade text-[16px] md:text-[19px] leading-[1.6] text-muted max-w-xl mb-9"
          style={{ animationDelay: '0.3s' }}
        >
          Dit is een werkweek met doen., van de eerste klantvraag op maandag tot
          een afgesloten vrijdag. Elke stap hieronder is er één uit de echte app.
        </p>

        {/* Stappenoverzicht: klikbaar, springt naar de uitwerking */}
        <nav aria-label="De zeven stappen" className="hero-fade" style={{ animationDelay: '0.42s' }}>
          <ol className="flex flex-wrap items-center gap-y-2.5 gap-x-1.5">
            {stepIndex.map((s, i) => (
              <li key={s.nr} className="flex items-center gap-1.5">
                <a
                  href={`#stap-${s.nr}`}
                  className="group inline-flex items-center gap-2 pl-3 pr-3.5 h-10 rounded-full bg-white border border-petrol/10 transition-colors hover:border-petrol/30"
                >
                  <span className="font-mono text-[11px] font-semibold text-flame">{s.nr}</span>
                  <span className="text-[14px] font-semibold text-ink group-hover:text-petrol transition-colors">
                    {s.label}
                  </span>
                </a>
                {i < stepIndex.length - 1 && (
                  <span aria-hidden className="text-petrol/25 text-[13px]">→</span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────────────────────────
   Herkenning · zo gaat het nu: maandag-notificaties + de vier gaten.
   ───────────────────────────────────────────────────────────────── */

/* Notificaties druppelen één voor één binnen zodra de sectie in beeld is. */
function NotificationRow({ n, i, reduce, show }: { n: Notification; i: number; reduce: boolean; show: boolean }) {
  const Icon = n.icon
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 18, scale: 0.97 }}
      animate={show ? { opacity: 1, y: 0, scale: 1 } : {}}
      transition={{ duration: 0.5, delay: reduce ? 0 : 0.3 + i * 0.14, ease: easing }}
      className="flex items-center gap-3.5 bg-bg border border-petrol/10 rounded-lg px-4 py-3 mb-2.5"
    >
      <div className="w-9 h-9 rounded-full bg-bg flex items-center justify-center shrink-0">
        <Icon className="w-[18px] h-[18px] text-petrol" strokeWidth={1.8} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-[14px] font-semibold text-ink truncate">{n.from}</p>
          <span className="font-mono text-[11px] text-muted shrink-0">{n.when}</span>
        </div>
        <p className="text-[13px] text-muted truncate">{n.text}</p>
      </div>
    </motion.div>
  )
}

/* ─────────────────────────────────────────────────────────────────
   Act 2 · De diagnose: vier gaten in je werkdag, als hairline-rijen.
   ───────────────────────────────────────────────────────────────── */

function Diagnose({ reduce }: { reduce: boolean }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-100px' })
  const show = reduce || inView

  return (
    <section className="bg-white">
      <div className="container-site py-16 md:py-28">
        <motion.div
          ref={ref}
          initial={reduce ? false : { opacity: 0, y: 20 }}
          animate={show ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: easing }}
          className="md:grid md:grid-cols-12 md:gap-10 mb-8 md:mb-14"
        >
          <h2
            className="md:col-span-7 font-heading font-bold text-petrol leading-[1.02] mb-5 md:mb-0"
            style={{ fontSize: 'clamp(30px, 4vw, 52px)', letterSpacing: '-0.03em', textWrap: 'balance' }}
          >
            Eerst even eerlijk: zo gaat het nu<span className="text-flame">.</span>
          </h2>
          <p className="md:col-span-5 self-end text-[16px] md:text-[17px] leading-[1.6] text-muted">
            Offertes en facturen heb je vast al ergens geregeld. Maar portaal, mail, opvolging en
            projectlog, waar het werk gewonnen wordt, doe je erbij.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.3fr] gap-10 lg:gap-16 items-start">
          {/* Links: maandagochtend 08:15, dit staat er al */}
          <div>
            <p className="font-mono text-[12px] font-medium tracking-[0.08em] text-flame mb-4">
              Maandag 08:15 · je opent je laptop
            </p>
            <div className="mb-3">
              {morningNotifications.map((n, i) => (
                <NotificationRow key={i} n={n} i={i} reduce={reduce} show={show} />
              ))}
            </div>
            <p className="text-[14px] text-muted">Dit is je maandag. En je dinsdag. En je vrijdag.</p>
          </div>

          {/* Rechts: de vier gaten in je werkdag */}
          <div className="border-b border-petrol/10">
            {pains.map((p, i) => (
              <PainRow key={p.title} pain={p} index={i} show={show} reduce={reduce} />
            ))}
          </div>
        </div>

        <MonteurMoment reduce={reduce} />
      </div>
    </section>
  )
}

function PainRow({ pain, index, show, reduce }: { pain: Pain; index: number; show: boolean; reduce: boolean }) {
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 16 }}
      animate={show ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay: reduce ? 0 : 0.15 + index * 0.08, ease: easing }}
      className="border-t border-petrol/10 py-5 md:py-6"
    >
      <h3
        className="font-heading text-[19px] md:text-[21px] font-bold text-petrol leading-snug mb-1.5"
        style={{ letterSpacing: '-0.02em' }}
      >
        {pain.title}
        <span className="text-flame">.</span>
      </h3>
      <div className="max-w-xl">
        <p className="text-[15px] md:text-[16px] leading-[1.6] text-muted">{pain.body}</p>
        <p className="mt-2.5 text-[14px]">
          <span className="font-semibold text-flame">Kost je:</span>{' '}
          <span className="text-muted">{pain.cost}</span>
        </p>
      </div>
    </motion.div>
  )
}

/* Het monteur-moment: de pijn raakt niet alleen de eigenaar. */
function MonteurMoment({ reduce }: { reduce: boolean }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-100px' })
  const show = reduce || inView

  return (
    <motion.div
      ref={ref}
      initial={reduce ? false : { opacity: 0, y: 20 }}
      animate={show ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.8, ease: easing }}
      className="max-w-2xl mx-auto text-center mt-12 md:mt-20"
    >
      <p className="font-mono text-[12px] font-medium tracking-[0.18em] uppercase text-muted mb-6">
        07:52 · woensdag · bij de bus
      </p>
      <blockquote>
        <p
          className="font-heading font-bold text-petrol leading-[1.15] mb-4"
          style={{ fontSize: 'clamp(24px, 3vw, 36px)', letterSpacing: '-0.03em', textWrap: 'balance' }}
        >
          &ldquo;Welke versie moet ik monteren: die van dinsdag, of die uit de mail van
          gisteravond?&rdquo;
        </p>
        <footer className="text-[14px] font-semibold text-flame mb-6">Mark, monteur</footer>
      </blockquote>
      <p className="text-[15px] md:text-[16px] leading-[1.65] text-muted max-w-md mx-auto">
        Het antwoord zit in een mailthread die alleen jij kunt zien.{' '}
        <span className="text-ink font-medium">
          Vier van de vijf vragen aan jou zijn eigenlijk vragen aan je systeem.
        </span>
      </p>
    </motion.div>
  )
}

/* ─────────────────────────────────────────────────────────────────
   Overgang · smalle petrol-band: vanaf hier dezelfde week, mét doen.
   ───────────────────────────────────────────────────────────────── */

function Kantelpunt({ reduce }: { reduce: boolean }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-100px' })
  const show = reduce || inView

  return (
    <section className="relative overflow-hidden bg-petrol-deep">
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 80% 90% at 50% 0%, rgba(42,111,122,0.5) 0%, rgba(42,111,122,0) 60%)',
        }}
      />
      <div ref={ref} className="container-site relative py-14 md:py-20 text-center">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 24 }}
          animate={show ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease: easing }}
        >
          <h2
            className="font-heading font-bold text-white leading-[1.1] max-w-3xl mx-auto mb-3"
            style={{ fontSize: 'clamp(26px, 3.6vw, 44px)', letterSpacing: '-0.03em', textWrap: 'balance' }}
          >
            Nu dezelfde week, mét doen<span className="text-flame">.</span>
          </h2>
          <p className="text-[15px] md:text-[17px]" style={{ color: 'rgba(226,240,241,0.7)' }}>
            Zeven stappen, stap voor stap. Bij elke stap: wat er verandert.
          </p>
        </motion.div>
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────────────────────────
   Act 4 · De doen.-dag: zeven stappen, elk met een mini-mockup.
   ───────────────────────────────────────────────────────────────── */

type FlowStep = {
  nr: string
  title: string
  when: string
  was: string
  is: string
  body: string
}

const flowSteps: FlowStep[] = [
  {
    nr: '01',
    title: 'Aanvraag binnen',
    when: 'Maandag 08:15',
    was: 'Gemiste oproep. Mail gelezen, moet je nog terugbellen.',
    is: 'Aanvraag landt in doen., gekoppeld aan de klant. Daan vat samen.',
    body: 'Via je website, je inbox of een telefoontje: alles landt op één plek. Je ziet wie het is, wat hij wil en wanneer je moet reageren.',
  },
  {
    nr: '02',
    title: 'Offerte uit template',
    when: 'Maandag 08:32',
    was: '40 minuten in Excel. Marge-formule klopt niet meer.',
    is: 'Template, producten erbij, marge klopt. Verstuurd voor de koffie koud is.',
    body: 'Bouw één keer je producten op en combineer ze in een paar klikken tot een offerte. Versturen per mail of goedkeuren via het klantportaal. Geen Excel, geen losse versies.',
  },
  {
    nr: '03',
    title: 'Klant in het portaal',
    when: 'Maandag 09:00',
    was: 'Tekening via WeTransfer. Klant belt: ik kan hem niet openen.',
    is: 'Eén link, geen inlog. Klant ziet alles en reageert met één klik.',
    body: 'Tekening, offerte, bevestiging en factuur staan in één portaal, op volgorde. Je klant keurt goed, reageert en tekent digitaal. Jij ziet wanneer hij kijkt.',
  },
  {
    nr: '04',
    title: 'Akkoord, direct in planning',
    when: 'Maandag 10:12',
    was: 'Handmatig op het whiteboard. Mark bellen of hij kan.',
    is: 'Sleep naar woensdag, monteur erbij. Werkbon maakt zichzelf.',
    body: 'Planning en werkbonnen zijn hetzelfde in doen. Verschuif een project en de werkbon schuift mee, je monteur ziet het op zijn telefoon. Regen op woensdag? Dat weet je voordat je inplant.',
  },
  {
    nr: '05',
    title: 'Op locatie',
    when: 'Woensdag 09:00',
    was: "Werkbon uitgeprint. Foto's uren later doorgemaild.",
    is: "Uren in de app, foto's erbij, klant tekent digitaal.",
    body: "Je monteur werkt vanaf zijn telefoon: uren registreren, foto's maken, klant laten tekenen. Jij ziet het live in het project, zonder te bellen.",
  },
  {
    nr: '06',
    title: 'Factuur de deur uit',
    when: 'Donderdag 11:00',
    was: 'Overtikken in Exact. Klant belt: waarom nog niet betaald?',
    is: 'Factuur uit de offerte, Mollie-link erbij, gegevens naar Exact.',
    body: 'Offerte wordt factuur in één klik, met Mollie-betaallink. De gegevens gaan rechtstreeks naar Exact Online, geen dubbele invoer. Geld binnen? Eén vinkje.',
  },
  {
    nr: '07',
    title: 'Gedaan',
    when: 'Vrijdag 16:45',
    was: 'Vrijdag 17:30 nog checken of alles klopt. Weekendstress.',
    is: 'Vrijdag 16:45 sluit jij af. Je klant weet waar hij aan toe is. Jij ook.',
    body: 'Geen vergeten facturen, geen offertes onder de radar. Alles zichtbaar, alles afgehandeld. Het weekend is echt weekend.',
  },
]

function DoenDag({ reduce }: { reduce: boolean }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-100px' })
  const show = reduce || inView

  return (
    <section className="bg-bg">
      <div className="container-site py-16 md:py-32">
        <motion.div
          ref={ref}
          initial={reduce ? false : { opacity: 0, y: 20 }}
          animate={show ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: easing }}
          className="md:grid md:grid-cols-12 md:gap-10 mb-8 md:mb-16"
        >
          <h2
            className="md:col-span-7 font-heading font-bold text-petrol leading-[1.02] mb-5 md:mb-0"
            style={{ fontSize: 'clamp(30px, 4vw, 52px)', letterSpacing: '-0.03em', textWrap: 'balance' }}
          >
            Zo werkt het<span className="text-flame">.</span>
          </h2>
          <p className="md:col-span-5 self-end text-[16px] md:text-[17px] leading-[1.6] text-muted">
            Van eerste klantvraag tot betaalde factuur. Bij elke stap zie je het scherm uit de app,
            en wat er verandert ten opzichte van hoe je het nu doet.
          </p>
        </motion.div>

        <div className="border-b border-petrol/10">
          {flowSteps.map((step) => (
            <StepBlock key={step.nr} step={step} reduce={reduce} />
          ))}
        </div>
      </div>
    </section>
  )
}

function StepBlock({ step, reduce }: { step: FlowStep; reduce: boolean }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-120px' })
  const show = reduce || inView

  return (
    <div
      ref={ref}
      id={`stap-${step.nr}`}
      className="border-t border-petrol/10 py-8 md:py-16 grid md:grid-cols-2 gap-7 md:gap-14 items-center scroll-mt-24"
    >
      <motion.div initial={reduce ? false : { opacity: 0, y: 24 }} animate={show ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.7, ease: easing }}>
        <p className="font-mono text-[12px] font-medium tracking-[0.08em] text-flame mb-3">
          Stap {Number(step.nr)} van 7 · {step.when}
        </p>
        <h3
          className="font-heading text-[26px] md:text-[32px] font-bold text-petrol leading-tight mb-4"
          style={{ letterSpacing: '-0.025em' }}
        >
          {step.title}
          <span className="text-flame">.</span>
        </h3>
        <p className="text-[15px] md:text-[16px] leading-[1.6] text-muted max-w-lg">{step.body}</p>
        <div className="mt-6 max-w-lg rounded-lg border border-petrol/10 overflow-hidden">
          <div className="px-4 py-2.5 bg-bg flex gap-3 items-baseline">
            <span className="text-[12px] font-semibold text-muted shrink-0 w-[86px]">Zonder doen.</span>
            <span className="text-[13.5px] leading-snug text-muted">{step.was}</span>
          </div>
          <div className="px-4 py-2.5 bg-white border-t border-petrol/10 flex gap-3 items-baseline">
            <span className="text-[12px] font-semibold text-flame shrink-0 w-[86px]">Met doen.</span>
            <span className="text-[13.5px] leading-snug font-medium text-ink">{step.is}</span>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={reduce ? false : { opacity: 0, y: 20 }}
        animate={show ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.7, delay: reduce ? 0 : 0.2, ease: easing }}
      >
        <StepMockup nr={step.nr} />
      </motion.div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────
   Mini-mockups: laten zien wint van vertellen.
   font-mono alleen hier, voor data (tijden, bedragen, statussen).
   ───────────────────────────────────────────────────────────────── */

function StepMockup({ nr }: { nr: string }) {
  switch (nr) {
    case '01': return <MockupAanvraag />
    case '02': return <MockupOfferte />
    case '03': return <MockupPortaal />
    case '04': return <MockupPlanning />
    case '05': return <MockupWerkbon />
    case '06': return <MockupFactuur />
    case '07': return <MockupGedaan />
    default: return null
  }
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="w-full max-w-[420px] rounded-xl overflow-hidden bg-white border border-petrol/10"
      style={{ boxShadow: '0 2px 8px rgba(13,52,60,0.05), 0 20px 44px -24px rgba(13,52,60,0.2)' }}
    >
      {children}
    </div>
  )
}

function MockupAanvraag() {
  return (
    <Frame>
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-petrol/10">
        <span className="font-heading font-bold text-[13px] text-petrol">
          doen<span className="text-flame">.</span>
        </span>
        <div className="flex items-center gap-1.5 text-[10px] font-semibold text-muted">
          <span className="w-1.5 h-1.5 rounded-full bg-flame motion-safe:animate-pulse" />
          Nieuwe aanvraag
        </div>
      </div>
      <div className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 font-heading font-bold text-[13px] text-flame"
            style={{ backgroundColor: '#FDE8E2' }}
          >
            JB
          </div>
          <div className="min-w-0">
            <p className="text-[12px] font-bold text-ink truncate">Jansen Bouw</p>
            <p className="font-mono text-[10px] text-muted">contact@jansenbouw.nl · 08:15</p>
          </div>
        </div>
        <p className="text-[12px] leading-relaxed text-muted mb-3">
          Interesse in gevelreclame voor nieuw pand. ±8m breed, met LED-verlichting.
        </p>
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-petrol/5">
          <span className="text-[10px]" aria-hidden>✨</span>
          <span className="text-[10px] font-semibold text-petrol">Daan vat samen</span>
        </div>
      </div>
    </Frame>
  )
}

function MockupOfferte() {
  const items = [
    { name: 'Gevelreclame basic', price: '€ 1.850' },
    { name: 'LED-verlichting 5m', price: '€ 340' },
    { name: 'Montage · 2p', price: '€ 420' },
  ]
  return (
    <Frame>
      <div className="flex items-center justify-between px-4 py-3 border-b border-petrol/10">
        <div>
          <p className="text-[10px] font-semibold text-muted">Offerte</p>
          <p className="font-mono text-[13px] font-bold text-petrol">2026-0042</p>
        </div>
        <span className="font-mono text-[9px] font-bold px-2 py-0.5 rounded-full text-flame" style={{ backgroundColor: '#FDE8E2' }}>
          CONCEPT
        </span>
      </div>
      <div className="p-4">
        {items.map((item, i) => (
          <div key={i} className={`flex items-center justify-between py-1.5 ${i < 2 ? 'border-b border-dashed border-petrol/10' : ''}`}>
            <p className="text-[11px] text-ink">{item.name}</p>
            <p className="font-mono text-[11px] font-semibold text-petrol">{item.price}</p>
          </div>
        ))}
        <div className="flex items-center justify-between pt-3 mt-3 border-t-2 border-petrol">
          <p className="text-[11px] font-bold text-petrol">Totaal ex. btw</p>
          <p className="font-mono text-[14px] font-bold text-petrol">€ 2.610</p>
        </div>
        <div className="w-full mt-4 py-2.5 rounded-md bg-flame font-semibold text-[11px] text-white flex items-center justify-center gap-1.5">
          Verstuur via portaal <span aria-hidden>→</span>
        </div>
      </div>
    </Frame>
  )
}

function MockupPortaal() {
  return (
    <Frame>
      <div className="px-3 py-2 flex items-center gap-2 bg-bg border-b border-petrol/10">
        <div className="flex gap-1" aria-hidden>
          <span className="w-2 h-2 rounded-full bg-petrol/15" />
          <span className="w-2 h-2 rounded-full bg-petrol/15" />
          <span className="w-2 h-2 rounded-full bg-petrol/15" />
        </div>
        <div className="flex-1 text-center">
          <span className="font-mono text-[9px] text-muted">portaal.doen.team/jansen-bouw</span>
        </div>
      </div>
      <div className="p-4">
        <p className="font-heading text-[14px] font-bold leading-tight text-petrol">
          Jouw project bij Mark<span className="text-flame">.</span>
        </p>
        <p className="text-[10px] text-muted mb-3">Gevelreclame · start woensdag</p>
        <div className="rounded-lg mb-3 h-20 flex items-center justify-center bg-bg border border-dashed border-petrol/20">
          <svg width="100" height="34" viewBox="0 0 100 34" aria-hidden>
            <rect x="4" y="12" width="92" height="14" fill="none" stroke="#1A535C" strokeWidth="1.2" />
            <text x="50" y="23" textAnchor="middle" fontSize="7" fontFamily="monospace" fontWeight="700" fill="#1A535C">
              JANSEN BOUW
            </text>
            <circle cx="4" cy="4" r="1.5" fill={FLAME} />
            <circle cx="96" cy="4" r="1.5" fill={FLAME} />
            <line x1="4" y1="4" x2="96" y2="4" stroke={FLAME} strokeWidth="0.6" strokeDasharray="2 2" />
            <text x="50" y="9" textAnchor="middle" fontSize="5.5" fontFamily="monospace" fontWeight="700" fill={FLAME}>
              800 CM
            </text>
          </svg>
        </div>
        <div className="flex gap-2">
          <div className="flex-1 py-2 rounded-md bg-flame text-[11px] font-semibold text-white flex items-center justify-center gap-1">
            <span aria-hidden>✓</span> Akkoord
          </div>
          <div className="flex-1 py-2 rounded-md border border-petrol text-petrol text-[11px] font-semibold text-center">
            Reageren
          </div>
        </div>
      </div>
    </Frame>
  )
}

function MockupPlanning() {
  const days = ['Ma', 'Di', 'Wo', 'Do', 'Vr']
  const scheduled = [null, null, { title: 'Jansen Bouw', crew: 'Mark + Sophie', weather: '☀' }, null, null]
  return (
    <Frame>
      <div className="px-4 py-3 flex items-center justify-between border-b border-petrol/10">
        <p className="font-heading text-[13px] font-bold text-petrol">
          Week 12<span className="text-flame">.</span>
        </p>
        <span className="font-mono text-[10px] font-semibold text-muted">Maart</span>
      </div>
      <div className="p-3">
        <div className="grid grid-cols-5 gap-1.5">
          {days.map((d, i) => {
            const job = scheduled[i]
            return (
              <div key={d} className="text-center">
                <p className="font-mono text-[9px] font-bold text-muted mb-1">{d}</p>
                <div
                  className={`h-[72px] rounded-md flex items-center justify-center text-[9px] p-1.5 ${
                    job ? 'bg-flame text-white' : 'bg-bg text-muted'
                  }`}
                >
                  {job ? (
                    <div className="leading-tight">
                      <div className="font-bold">{job.title}</div>
                      <div className="text-[8px] mt-0.5 opacity-85">{job.weather} {job.crew}</div>
                    </div>
                  ) : (
                    <span>·</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </Frame>
  )
}

function MockupWerkbon() {
  const checks = [
    { text: 'Materiaal geladen', done: true },
    { text: 'Montage afgerond', done: true },
    { text: "3 foto's geüpload", done: true },
    { text: 'Klant getekend', done: false },
  ]
  return (
    <div className="flex items-start">
      <div className="rounded-[24px] p-1.5 bg-ink" style={{ boxShadow: '0 20px 44px -24px rgba(13,52,60,0.35)' }}>
        <div className="rounded-[18px] overflow-hidden w-[200px] bg-white">
          <div className="px-3 py-2.5 bg-petrol-deep">
            <p className="text-[9px] font-semibold" style={{ color: 'rgba(226,240,241,0.55)' }}>Werkbon</p>
            <p className="text-[11px] font-bold text-white leading-tight">Jansen Bouw · woensdag</p>
          </div>
          <div className="p-3 space-y-2">
            {checks.map((item) => (
              <div key={item.text} className="flex items-center gap-2">
                <span
                  className={`w-4 h-4 rounded flex items-center justify-center shrink-0 ${item.done ? '' : 'bg-bg'}`}
                  style={item.done ? { backgroundColor: '#2D6B48' } : undefined}
                >
                  {item.done && <span className="text-white text-[8px] font-bold">✓</span>}
                </span>
                <p className={`text-[10px] ${item.done ? 'text-ink' : 'text-muted'}`}>{item.text}</p>
              </div>
            ))}
            <div className="mt-2 p-2 rounded-md flex items-center justify-between" style={{ backgroundColor: '#FDE8E2' }}>
              <p className="text-[9px] font-semibold text-flame">Uren vandaag</p>
              <p className="font-mono text-[14px] font-bold text-flame">6:45</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function MockupFactuur() {
  return (
    <Frame>
      <div className="flex items-center justify-between px-4 py-3 border-b border-petrol/10">
        <div>
          <p className="text-[10px] font-semibold text-muted">Factuur</p>
          <p className="font-mono text-[13px] font-bold text-petrol">F-2026-0087</p>
        </div>
        <span className="font-mono text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: '#E4F0EA', color: '#2D6B48' }}>
          BETAALD
        </span>
      </div>
      <div className="p-4">
        <div className="flex items-center justify-between mb-3 pb-3 border-b border-dashed border-petrol/10">
          <p className="text-[11px] text-muted">Jansen Bouw</p>
          <p className="font-mono text-[14px] font-bold text-petrol">€ 2.610</p>
        </div>
        <div className="space-y-2">
          <StatusRow tone="green" label="Betaald via Mollie (iDEAL)" value="€ 2.610" />
          <StatusRow tone="green" label="Verstuurd naar Exact Online" arrow />
          <StatusRow tone="muted" label="Handmatig afgevinkt" />
        </div>
      </div>
    </Frame>
  )
}

function StatusRow({ tone, label, value, arrow }: { tone: 'green' | 'muted'; label: string; value?: string; arrow?: boolean }) {
  const green = tone === 'green'
  return (
    <div className="flex items-center gap-2">
      <span
        className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 ${green ? '' : 'bg-bg text-muted'}`}
        style={green ? { backgroundColor: '#E4F0EA', color: '#2D6B48' } : undefined}
      >
        {arrow ? '→' : '✓'}
      </span>
      <p className="text-[10px] text-ink flex-1">{label}</p>
      {value && <p className="font-mono text-[10px] font-semibold" style={{ color: '#2D6B48' }}>{value}</p>}
    </div>
  )
}

function MockupGedaan() {
  const steps = ['Aanvraag', 'Offerte', 'Akkoord', 'Planning', 'Montage', 'Factuur']
  return (
    <Frame>
      <div className="flex items-center justify-between px-4 py-3 border-b border-petrol/10">
        <div>
          <p className="text-[10px] font-semibold text-muted">Project</p>
          <p className="font-heading text-[13px] font-bold text-petrol">
            Jansen Bouw<span className="text-flame">.</span>
          </p>
        </div>
        <span className="font-mono text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: '#E4F0EA', color: '#2D6B48' }}>
          AFGEROND
        </span>
      </div>
      <div className="p-4">
        <div className="flex items-center justify-between mb-4 relative">
          <div className="absolute top-3 left-3 right-3 h-[1.5px]" style={{ backgroundColor: '#D0E3D5' }} />
          {steps.map((s) => (
            <div key={s} className="relative flex flex-col items-center flex-1 z-10">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                style={{ backgroundColor: '#2D6B48' }}
              >
                ✓
              </div>
              <p className="text-[7px] font-bold uppercase tracking-wider mt-1.5 text-center text-muted">{s}</p>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between p-2.5 rounded-md bg-bg">
          <p className="text-[10px] font-semibold text-muted">Doorlooptijd</p>
          <p className="font-mono text-[13px] font-bold text-petrol">5 dagen</p>
        </div>
      </div>
    </Frame>
  )
}

export default function HoeHetWerktContent() {
  const reduce = useReducedMotion() ?? false

  return (
    <>
      <Hero />
      <Diagnose reduce={reduce} />
      <Kantelpunt reduce={reduce} />
      <DoenDag reduce={reduce} />
      <CTASection />
    </>
  )
}
