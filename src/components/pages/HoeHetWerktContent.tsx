'use client'

import { useRef } from 'react'
import {
  motion,
  useScroll,
  useTransform,
  useInView,
  useReducedMotion,
  MotionValue,
} from 'framer-motion'
import {
  Mail,
  MessageCircle,
  Receipt,
  Phone,
  Calendar,
  FileText,
  Pencil,
  Image as ImageIcon,
  User,
  ClipboardList,
  CreditCard,
  Smile,
  Check,
  X,
  type LucideIcon,
} from 'lucide-react'
import SectionReveal from '../SectionReveal'
import WachtlijstForm from '../WachtlijstForm'

const PETROL = '#1A535C'
const PETROL_DARK = '#143F46'
const FLAME = '#F15025'
const MUTED = '#6B6B66'
const MUTED_SOFT = '#9B9B95'
const INK = '#1A1A1A'

/* ═══════════════════════════════════════════════════════════════════
   ACT 1 — Opening: "08:15. Maandagochtend."
   De bezoeker herkent zichzelf. Laptop open, notificaties stapelen op.
   ═══════════════════════════════════════════════════════════════════ */

type Notification = {
  icon: LucideIcon
  from: string
  text: string
  when: string
}

const morningNotifications: Notification[] = [
  { icon: Mail, from: 'Jansen Bouw', text: 'Heb je mijn offerte al bekeken?', when: '08:03' },
  { icon: MessageCircle, from: 'Mark (monteur)', text: 'Waar staat de werkbon voor vandaag?', when: '08:08' },
  { icon: Receipt, from: 'Accountant', text: 'Kun je de facturen van vorige week aanleveren?', when: '08:11' },
  { icon: Phone, from: 'Onbekend', text: 'Gemist: nieuwe aanvraag gevelreclame', when: '08:14' },
  { icon: Mail, from: 'De Vries BV', text: 'Offerte-akkoord, maar met welke versie?', when: '08:15' },
]

function Act1Opening() {
  const sectionRef = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end end'],
  })

  // Phase transforms
  const eyebrowOpacity = useTransform(scrollYProgress, [0.02, 0.12], [0, 1])
  const h1Opacity = useTransform(scrollYProgress, [0.10, 0.22], [0, 1])
  const h1Y = useTransform(scrollYProgress, [0.10, 0.22], [20, 0])
  const subheadOpacity = useTransform(scrollYProgress, [0.70, 0.82], [0, 1])
  const subheadY = useTransform(scrollYProgress, [0.70, 0.82], [16, 0])
  const contentFadeOut = useTransform(scrollYProgress, [0.90, 1.0], [1, 0])

  return (
    <section ref={sectionRef} className="relative" style={{ height: '260vh', backgroundColor: '#F5F4F1' }}>
      <div className="sticky top-0 h-screen flex items-center">
        <div className="container-site w-full">
          <motion.div style={{ opacity: contentFadeOut }} className="max-w-4xl mx-auto text-center">
            {/* Eyebrow — time + day */}
            <motion.div
              style={{ opacity: eyebrowOpacity }}
              className="mb-6 inline-flex items-center gap-3 px-4 py-2 rounded-full"
            >
              <span className="font-mono text-[11px] md:text-[12px] font-bold tracking-[0.2em] uppercase" style={{ color: FLAME }}>
                08:15 · Maandagochtend
              </span>
            </motion.div>

            {/* H1 */}
            <motion.h1
              style={{ opacity: h1Opacity, y: h1Y }}
              className="font-heading text-[40px] md:text-[64px] lg:text-[76px] font-extrabold tracking-[-2.5px] leading-[0.95] mb-12"
              aria-label="Je opent je laptop. Dit staat er al."
            >
              <span style={{ color: PETROL }}>Je opent je laptop</span>
              <span style={{ color: FLAME }}>.</span>
              <br />
              <span style={{ color: MUTED_SOFT }}>Dit staat er al</span>
              <span style={{ color: FLAME }}>.</span>
            </motion.h1>

            {/* Notifications stack */}
            <div className="relative max-w-xl mx-auto mb-10 md:mb-12">
              {morningNotifications.map((n, i) => (
                <NotificationCard
                  key={i}
                  notification={n}
                  index={i}
                  scrollProgress={scrollYProgress}
                />
              ))}
            </div>

            {/* Subhead */}
            <motion.p
              style={{ opacity: subheadOpacity, y: subheadY }}
              className="text-[17px] md:text-[22px] leading-relaxed font-heading font-semibold"
              aria-label="Dit is je maandag. En je dinsdag. En je vrijdag."
            >
              <span style={{ color: PETROL }}>Dit is je maandag</span>
              <span style={{ color: FLAME }}>.</span>{' '}
              <span style={{ color: MUTED }}>En je dinsdag</span>
              <span style={{ color: FLAME }}>.</span>{' '}
              <span style={{ color: MUTED }}>En je vrijdag</span>
              <span style={{ color: FLAME }}>.</span>
            </motion.p>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

function NotificationCard({
  notification,
  index,
  scrollProgress,
}: {
  notification: Notification
  index: number
  scrollProgress: MotionValue<number>
}) {
  // Each notification appears sequentially between 0.28 and 0.65
  const start = 0.28 + index * 0.07
  const end = start + 0.08
  const opacity = useTransform(scrollProgress, [start, end], [0, 1])
  const y = useTransform(scrollProgress, [start, end], [24, 0])
  const scale = useTransform(scrollProgress, [start, end], [0.96, 1])

  const Icon = notification.icon

  return (
    <motion.div
      style={{ opacity, y, scale }}
      className="flex items-center gap-3 md:gap-4 px-4 md:px-5 py-3 md:py-3.5 mb-2.5 rounded-xl text-left"
      // Slight rotation alternation for lived-in feel
      initial={false}
      animate={{ rotate: index % 2 === 0 ? -0.4 : 0.4 }}
    >
      <div
        className="w-10 h-10 md:w-11 md:h-11 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: '#FFFFFF', boxShadow: '0 2px 8px rgba(26,83,92,0.08)' }}
      >
        <Icon className="w-5 h-5" style={{ color: PETROL }} strokeWidth={1.8} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-[13px] md:text-[14px] font-semibold truncate" style={{ color: INK }}>
            {notification.from}
          </p>
          <span className="font-mono text-[10px] md:text-[11px] flex-shrink-0" style={{ color: MUTED_SOFT }}>
            {notification.when}
          </span>
        </div>
        <p className="text-[12px] md:text-[13px] truncate" style={{ color: MUTED }}>
          {notification.text}
        </p>
      </div>
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════════════════════════
   ACT 2 — The mess: "Vijf programma's. Voor één klant."
   ═══════════════════════════════════════════════════════════════════ */

type Pain = {
  icon: LucideIcon
  title: string
  body: string
  cost: string
}

const pains: Pain[] = [
  {
    icon: MessageCircle,
    title: 'Geen klantportaal',
    body: 'Tekening als bijlage, offerte in een aparte mail, factuur in de derde. Je klant moet zelf bijhouden wat er waar staat.',
    cost: 'Klanten die afhaken zonder te bellen',
  },
  {
    icon: Mail,
    title: 'Mail draait los van alles',
    body: 'Outlook apart. Klantgesprekken in threads die je team niet ziet. Wat is er gisteren beloofd? Dat zit in de inbox van één persoon.',
    cost: 'Context kwijt, dubbele antwoorden',
  },
  {
    icon: FileText,
    title: 'Offerte verstuurd, en dan?',
    body: 'Geen opvolging. Geen weten of ze is gelezen. Je wacht, je belt, je mailt een herinnering. Je klant is intussen verder gegaan.',
    cost: 'Deals die je nooit hebt zien afkoelen',
  },
  {
    icon: ClipboardList,
    title: 'Geen log per project',
    body: 'Wat is er in dit project gebeurd? Wie reageerde waarop, wanneer? Je scrolt door drie mail-threads en hoopt dat je niks mist.',
    cost: 'Gaten in je geheugen worden gaten in je service',
  },
]

function Act2Pain() {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section className="py-24 md:py-36 bg-white relative overflow-hidden">
      <div className="container-site relative">
        <SectionReveal>
          <div className="max-w-3xl mb-16 md:mb-20">
            <p className="font-mono text-[12px] font-bold tracking-[0.2em] uppercase mb-5" style={{ color: FLAME }}>
              De diagnose
            </p>
            <h2 className="font-heading text-[36px] md:text-[56px] font-extrabold tracking-[-2px] leading-[0.98] mb-6" style={{ color: PETROL }}>
              Je software stopt waar<span style={{ color: FLAME }}>.</span>
              <br />
              <span style={{ color: MUTED_SOFT }}>je klant begint</span>
              <span style={{ color: FLAME }}>.</span>
            </h2>
            <p className="text-[17px] md:text-[20px] leading-relaxed max-w-2xl" style={{ color: MUTED }}>
              Je hebt waarschijnlijk al een systeem voor offertes en facturen. Prima. Maar waar deals gemaakt of gebroken worden (portaal, mail, opvolging, project-overzicht), sta je er alleen voor.
            </p>
          </div>
        </SectionReveal>

        <div ref={ref} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
          {pains.map((p, i) => (
            <PainCard key={i} pain={p} index={i} isInView={isInView} />
          ))}
        </div>
      </div>
    </section>
  )
}

function PainCard({ pain, index, isInView }: { pain: Pain; index: number; isInView: boolean }) {
  const Icon = pain.icon
  // Subtle alternating rotation for "chaotic" feel at rest
  const rotate = index % 2 === 0 ? -0.6 : 0.6

  return (
    <motion.div
      initial={{ opacity: 0, y: 28, rotate: rotate * 2 }}
      animate={isInView ? { opacity: 1, y: 0, rotate } : {}}
      transition={{ duration: 0.6, delay: index * 0.06, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ rotate: 0, y: -4, transition: { duration: 0.3 } }}
      className="p-6 md:p-7 rounded-2xl flex flex-col"
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #EBEBEB',
        boxShadow: '0 2px 10px rgba(26,83,92,0.04)',
      }}
    >
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center mb-5"
        style={{ backgroundColor: '#FEE8E2' }}
      >
        <Icon className="w-5 h-5" style={{ color: FLAME }} strokeWidth={1.8} />
      </div>
      <h3 className="font-heading text-[17px] md:text-[19px] font-bold tracking-tight mb-2 leading-snug" style={{ color: PETROL }}>
        {pain.title}
        <span style={{ color: FLAME }}>.</span>
      </h3>
      <p className="text-[13px] md:text-[14px] leading-relaxed flex-1 mb-5" style={{ color: MUTED }}>
        {pain.body}
      </p>
      <div className="pt-4 border-t" style={{ borderColor: '#EFEFEF' }}>
        <p className="font-mono text-[10px] font-bold tracking-[0.14em] uppercase" style={{ color: FLAME }}>
          Kost je: <span style={{ color: MUTED_SOFT }}>{pain.cost}</span>
        </p>
      </div>
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════════════════════════
   ACT 3 — Pivot: "Er was geen systeem. Dus bouwden we het."
   ═══════════════════════════════════════════════════════════════════ */

function Act3Pivot() {
  const sectionRef = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end end'],
  })

  // Orbs coalesce: floating around → converging to center
  const orbSpread = useTransform(scrollYProgress, [0.1, 0.55], [1, 0])
  const lineOpacity = useTransform(scrollYProgress, [0.3, 0.55], [0, 0.5])
  const logoOpacity = useTransform(scrollYProgress, [0.50, 0.70], [0, 1])
  const logoScale = useTransform(scrollYProgress, [0.50, 0.72], [0.6, 1])
  const statementOpacity = useTransform(scrollYProgress, [0.65, 0.85], [0, 1])
  const statementY = useTransform(scrollYProgress, [0.65, 0.85], [20, 0])

  const orbIcons = [Mail, Pencil, Calendar, Receipt, MessageCircle, FileText, Phone, CreditCard]
  // Spread positions (percentage around center)
  const orbPositions = [
    { x: -42, y: -28 },
    { x: 38, y: -32 },
    { x: -48, y: 12 },
    { x: 46, y: 18 },
    { x: -24, y: 34 },
    { x: 28, y: 36 },
    { x: -8, y: -40 },
    { x: 12, y: 42 },
  ]

  return (
    <section
      ref={sectionRef}
      className="relative"
      style={{ height: '180vh', background: 'linear-gradient(180deg, #FFFFFF 0%, #F5F4F1 30%, #143F46 100%)' }}
    >
      <div className="sticky top-0 h-screen flex items-center justify-center overflow-hidden">
        <div className="relative w-full h-full flex items-center justify-center">
          {/* Orbiting tool icons */}
          <div className="relative" style={{ width: 500, height: 400 }}>
            {orbIcons.map((Icon, i) => {
              const pos = orbPositions[i]
              return (
                <OrbIcon
                  key={i}
                  Icon={Icon}
                  baseX={pos.x}
                  baseY={pos.y}
                  spread={orbSpread}
                  index={i}
                />
              )
            })}

            {/* Connection lines — appear as convergence happens */}
            <motion.svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              viewBox="-250 -200 500 400"
              style={{ opacity: lineOpacity }}
            >
              {orbPositions.map((pos, i) => (
                <line
                  key={i}
                  x1={pos.x * 5}
                  y1={pos.y * 5}
                  x2={0}
                  y2={0}
                  stroke={FLAME}
                  strokeWidth={1}
                  opacity={0.4}
                />
              ))}
            </motion.svg>

            {/* Center doen. symbol */}
            <motion.div
              style={{
                opacity: logoOpacity,
                scale: logoScale,
                left: '50%',
                top: '50%',
                translateX: '-50%',
                translateY: '-50%',
              }}
              className="absolute flex items-center justify-center"
            >
              <div className="relative">
                <div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: `radial-gradient(circle, ${FLAME}66 0%, ${FLAME}00 70%)`,
                    filter: 'blur(30px)',
                    transform: 'scale(2)',
                  }}
                />
                <svg viewBox="82 188 390 135" style={{ height: 80, display: 'block' }}>
                  <g fill="#FFFFFF">
                    <path d="M170.03,198.76v90.76c0,7.28,0,14.65.15,21.97h-21.28c-.44-2.4-.87-6.53-1.01-8.35-3.86,6.29-10.74,10.2-22.68,10.2-20.21,0-33.07-16.23-33.07-41.17s13.67-42.48,36.31-42.48c11.5,0,17.68,4.06,19.45,7.64v-38.58h22.13ZM114.87,271.6c0,15.58,6.07,24.02,16.9,24.02,15.22,0,16.97-12.69,16.97-24.18,0-13.67-1.93-24.01-16.4-24.01-11.62,0-17.48,9.07-17.48,24.17Z" />
                    <path d="M256.16,271.37c0,24.19-14.47,41.98-39.8,41.98s-39.26-17.69-39.26-41.55,14.92-42.09,40.3-42.09c23.53,0,38.75,16.6,38.75,41.67ZM199.56,271.52c0,15.39,6.62,24.5,17.28,24.5s16.85-9.12,16.85-24.37c0-16.73-6.14-24.64-17.16-24.64-10.26,0-16.97,7.6-16.97,24.5Z" />
                    <path d="M282.01,276.26c.02,10,5.03,19.77,16.05,19.77,9.21,0,11.85-3.7,13.95-8.53h22.15c-2.84,9.78-11.56,25.85-36.68,25.85s-37.75-19.69-37.75-40.66c0-25.07,12.87-42.98,38.54-42.98,27.45,0,36.79,19.86,36.79,39.81,0,2.71,0,4.46-.29,6.74h-52.75ZM312.88,262.66c-.15-9.31-3.87-17.14-14.66-17.14s-14.87,7.31-15.75,17.14h30.41Z" />
                    <path d="M342.84,251.69c0-6.79,0-14.23-.15-20.14h21.43c.44,2.06.74,7.61.85,10.18,2.72-5.02,9.19-12.04,23.19-12.04,16.06,0,26.49,10.85,26.49,30.94v50.85h-22.13v-48.39c0-8.99-3-15.5-12.76-15.5s-14.78,5.23-14.78,19.34v44.55h-22.13v-59.8Z" />
                  </g>
                  <circle cx="444.97" cy="294.08" r="18.03" fill={FLAME} />
                </svg>
              </div>
            </motion.div>
          </div>

          {/* Statement */}
          <motion.div
            style={{ opacity: statementOpacity, y: statementY }}
            className="absolute bottom-[14vh] left-0 right-0 text-center px-6"
          >
            <p
              className="font-heading text-[22px] md:text-[32px] lg:text-[40px] font-extrabold tracking-[-1px] leading-tight"
              style={{ color: '#FFFFFF' }}
            >
              Vakidioten wachten niet op verandering
              <span style={{ color: FLAME }}>.</span>
              <br />
              <span style={{ color: 'rgba(255,255,255,0.55)' }}>
                Die maken &apos;m zelf. Daarom{' '}
              </span>
              <span style={{ color: '#FFFFFF' }}>doen</span>
              <span style={{ color: FLAME }}>.</span>
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

function OrbIcon({
  Icon,
  baseX,
  baseY,
  spread,
  index,
}: {
  Icon: LucideIcon
  baseX: number
  baseY: number
  spread: MotionValue<number>
  index: number
}) {
  const x = useTransform(spread, (v) => `${baseX * v}%`)
  const y = useTransform(spread, (v) => `${baseY * v}%`)
  const opacity = useTransform(spread, [0, 0.4, 1], [0, 1, 1])
  const iconColor = useTransform(spread, [0, 0.5], [PETROL, FLAME])

  return (
    <motion.div
      style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        x,
        y,
        translateX: '-50%',
        translateY: '-50%',
        opacity,
      }}
      animate={{
        scale: [1, 1.06, 1],
      }}
      transition={{
        duration: 3 + (index % 3),
        repeat: Infinity,
        ease: 'easeInOut',
        delay: index * 0.3,
      }}
    >
      <div
        className="w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center"
        style={{
          backgroundColor: '#FFFFFF',
          boxShadow: '0 4px 20px rgba(26,83,92,0.15)',
        }}
      >
        <motion.div style={{ color: iconColor }}>
          <Icon className="w-5 h-5 md:w-6 md:h-6" strokeWidth={1.8} />
        </motion.div>
      </div>
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════════════════════════
   ACT 4 — Solution: "Zo werkt een doen.-dag."
   Zelfde maandag. Andere uitkomst.
   ═══════════════════════════════════════════════════════════════════ */

type FlowStep = {
  nr: string
  title: string
  icon: LucideIcon
  when: string
  was: string
  is: string
  body: string
}

const flowSteps: FlowStep[] = [
  {
    nr: '01',
    title: 'Aanvraag binnen',
    icon: User,
    when: '08:15',
    was: 'Gemiste oproep. Mail gelezen, moet je nog terugbellen.',
    is: 'Aanvraag landt direct in doen., gekoppeld aan de klant. Daan vat samen wat er staat.',
    body: 'Klanten komen binnen via je website, je inbox of een telefoontje. Alles landt op één plek. Jij ziet in één oogopslag wie het is, wat hij wil, en wanneer je moet reageren.',
  },
  {
    nr: '02',
    title: 'Offerte uit template',
    icon: FileText,
    when: '08:32',
    was: '40 minuten in Excel. Marge-formule klopt niet meer. Kopiëren naar Word.',
    is: 'Selecteer template, producten erbij, marge klopt automatisch. Verstuurd voor de koffie koud is.',
    body: 'Bouw één keer je producten op. Combineer tot een offerte in een paar klikken. Verstuur per mail of laat goedkeuren via het klantportaal. Geen Excel, geen versies die op elkaar gestapeld staan.',
  },
  {
    nr: '03',
    title: 'Klant in het portaal',
    icon: ImageIcon,
    when: '09:00',
    was: 'Tekening via WeTransfer. Klant belt: ik kan hem niet openen.',
    is: 'Klant klikt op de link in de mail, ziet alles. Geen inlog, geen wachtwoord. Reageert met één klik.',
    body: 'Tekening, offerte, opdrachtbevestiging, facturen — je klant ziet het in chronologische volgorde. Hij keurt goed, reageert, en tekent digitaal. Je ziet precies wanneer hij iets bekijkt.',
  },
  {
    nr: '04',
    title: 'Akkoord, direct in planning',
    icon: Calendar,
    when: '10:12',
    was: 'Akkoord per mail. Handmatig in whiteboard zetten. Mark bellen of hij kan.',
    is: 'Sleep naar woensdag, monteur erbij. Werkbon maakt zichzelf. Weerbericht staat erbij.',
    body: 'Planning en werkbonnen zijn hetzelfde in doen. Verschuif een project, de werkbon schuift mee. Monteur ziet het op zijn telefoon. Regen op woensdag? Je weet het voordat je inplant.',
  },
  {
    nr: '05',
    title: 'Op locatie',
    icon: ClipboardList,
    when: 'Woensdag 09:00',
    was: 'Werkbon uitgeprint. Foto\'s op monteurs telefoon. Uren later doorgemaild.',
    is: 'Monteur opent de app. Uren in, foto\'s erbij, klant tekent digitaal. Alles in het project.',
    body: 'Je monteur werkt vanaf zijn telefoon. Hij ziet wat hij moet doen, registreert uren, maakt foto\'s en laat de klant tekenen. Jij ziet het live in het project zonder te bellen.',
  },
  {
    nr: '06',
    title: 'Factuur uit de deur',
    icon: Receipt,
    when: 'Donderdag 11:00',
    was: 'Overtikken in Exact. Factuur kwijt. Klant belt "waarom niet betaald?"',
    is: 'Factuur komt uit de offerte. Mollie-link erbij. Gegevens gaan direct naar Exact. Betaald binnen? Eén vinkje.',
    body: 'Offerte wordt factuur in één klik, inclusief Mollie-betaallink. De factuurgegevens gaan rechtstreeks van doen. naar Exact Online voor je boekhouding (one-way, geen dubbele invoer meer). Zodra je het geld binnen ziet komen, vink je de factuur zelf af als betaald. Inkoopfacturen? Aparte mailbox, team keurt goed.',
  },
  {
    nr: '07',
    title: 'Gedaan',
    icon: Smile,
    when: 'Vrijdag 16:45',
    was: 'Vrijdag 17:30. Nog even checken of alles klopt. Weekendstress.',
    is: 'Vrijdag 16:45. Jij sluit af. Je klant weet waar hij aan toe is. Jij ook.',
    body: 'Geen vergeten facturen. Geen openstaande offertes die onder de radar verdwenen. Alles is zichtbaar, alles is afgehandeld. Het weekend is echt weekend.',
  },
]

function Act4Solution() {
  const headerRef = useRef<HTMLDivElement>(null)
  const isHeaderInView = useInView(headerRef, { once: true, margin: '-80px' })

  return (
    <section className="relative" style={{ backgroundColor: '#F5F4F1' }}>
      {/* Header */}
      <div ref={headerRef} className="py-24 md:py-32">
        <div className="container-site text-center max-w-3xl mx-auto">
          <motion.p
            className="font-mono text-[12px] font-bold tracking-[0.2em] uppercase mb-5"
            style={{ color: FLAME }}
            initial={{ opacity: 0, y: 10 }}
            animate={isHeaderInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
          >
            Dezelfde maandag · andere uitkomst
          </motion.p>
          <motion.h2
            className="font-heading text-[36px] md:text-[56px] font-extrabold tracking-[-2px] leading-[0.98] mb-6"
            style={{ color: PETROL }}
            initial={{ opacity: 0, y: 20 }}
            animate={isHeaderInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.1 }}
          >
            Zo werkt een doen.<span style={{ color: FLAME }}>-</span>dag
            <span style={{ color: FLAME }}>.</span>
          </motion.h2>
          <motion.p
            className="text-[17px] md:text-[20px] leading-relaxed"
            style={{ color: MUTED }}
            initial={{ opacity: 0, y: 20 }}
            animate={isHeaderInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.2 }}
          >
            Van eerste klantvraag tot betaalde factuur. Eén systeem, zeven stappen.
          </motion.p>
        </div>
      </div>

      {/* Steps */}
      <div className="pb-24 md:pb-32">
        <div className="container-site">
          <div className="max-w-4xl mx-auto">
            {flowSteps.map((step, i) => (
              <FlowStepBlock key={step.nr} step={step} index={i} isLast={i === flowSteps.length - 1} />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function FlowStepBlock({ step, index, isLast }: { step: FlowStep; index: number; isLast: boolean }) {
  const blockRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(blockRef, { once: true, margin: '-120px' })
  const Icon = step.icon
  const isEven = index % 2 === 0

  return (
    <motion.div
      ref={blockRef}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className="relative flex gap-5 md:gap-8 pb-14 md:pb-20"
    >
      {/* Timeline spine */}
      <div className="relative flex flex-col items-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={isInView ? { scale: 1 } : {}}
          transition={{ duration: 0.5, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center flex-shrink-0 z-10"
          style={{
            backgroundColor: '#FFFFFF',
            border: `2px solid ${PETROL}`,
            boxShadow: '0 4px 16px rgba(26,83,92,0.12)',
          }}
        >
          <Icon className="w-6 h-6 md:w-7 md:h-7" style={{ color: PETROL }} strokeWidth={1.6} />
        </motion.div>
        {!isLast && (
          <motion.div
            initial={{ scaleY: 0 }}
            animate={isInView ? { scaleY: 1 } : {}}
            transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="w-px flex-1 origin-top mt-2"
            style={{ backgroundColor: 'rgba(26,83,92,0.2)', minHeight: 80 }}
          />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 pt-2">
        {/* Step header */}
        <div className="flex items-baseline gap-3 mb-2">
          <span className="font-mono text-[11px] md:text-[12px] font-bold tracking-[0.18em]" style={{ color: FLAME }}>
            {step.nr}
          </span>
          <span className="font-mono text-[10px] md:text-[11px] font-bold tracking-[0.15em] uppercase" style={{ color: MUTED_SOFT }}>
            {step.when}
          </span>
        </div>
        <h3 className="font-heading text-[24px] md:text-[32px] font-extrabold tracking-[-1px] leading-tight mb-4" style={{ color: PETROL }}>
          {step.title}
          <span style={{ color: FLAME }}>.</span>
        </h3>
        <p className="text-[15px] md:text-[16px] leading-relaxed mb-6 md:mb-7 max-w-xl" style={{ color: MUTED }}>
          {step.body}
        </p>

        {/* Mini-mockup — visual proof per stap */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="mb-6 md:mb-7"
        >
          <StepMockup nr={step.nr} />
        </motion.div>

        {/* Was / Is contrast */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 max-w-xl">
          <motion.div
            initial={{ opacity: 0, x: -12 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="p-4 rounded-xl relative"
            style={{ backgroundColor: '#FFFFFF', border: '1px solid #EBEBEB' }}
          >
            <div className="flex items-center gap-2 mb-2">
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: '#F8F7F5' }}
              >
                <X className="w-3 h-3" style={{ color: MUTED_SOFT }} strokeWidth={2.5} />
              </div>
              <span className="font-mono text-[10px] font-bold tracking-[0.14em] uppercase" style={{ color: MUTED_SOFT }}>
                Was
              </span>
            </div>
            <p className="text-[13px] md:text-[14px] leading-snug" style={{ color: MUTED, textDecoration: 'line-through', textDecorationColor: 'rgba(107,107,102,0.35)' }}>
              {step.was}
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 12 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="p-4 rounded-xl relative"
            style={{ backgroundColor: PETROL, color: '#FFFFFF' }}
          >
            <div className="flex items-center gap-2 mb-2">
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: FLAME }}
              >
                <Check className="w-3 h-3 text-white" strokeWidth={3} />
              </div>
              <span className="font-mono text-[10px] font-bold tracking-[0.14em] uppercase" style={{ color: 'rgba(255,255,255,0.7)' }}>
                Is
              </span>
            </div>
            <p className="text-[13px] md:text-[14px] leading-snug font-medium">{step.is}</p>
          </motion.div>
        </div>
      </div>
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════════════════════════
   Mini-mockups — show vs tell per step
   ═══════════════════════════════════════════════════════════════════ */

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

function MockupFrame({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-xl overflow-hidden max-w-[440px] ${className}`}
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #EBEBEB',
        boxShadow: '0 2px 8px rgba(26,83,92,0.04), 0 12px 32px rgba(26,83,92,0.06)',
      }}
    >
      {children}
    </div>
  )
}

function MockupAanvraag() {
  return (
    <MockupFrame>
      <div className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: '1px solid #F0EFEC' }}>
        <span className="font-heading font-extrabold text-[13px]" style={{ color: PETROL }}>
          doen<span style={{ color: FLAME }}>.</span>
        </span>
        <div className="flex items-center gap-1.5 text-[10px] font-mono">
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: FLAME }} />
          <span style={{ color: MUTED_SOFT }}>Nieuwe aanvraag</span>
        </div>
      </div>
      <div className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 font-heading font-bold text-[13px]"
            style={{ backgroundColor: '#FDE8E2', color: FLAME }}
          >
            JB
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-bold truncate" style={{ color: INK }}>Jansen Bouw</p>
            <p className="text-[10px]" style={{ color: MUTED_SOFT }}>contact@jansenbouw.nl · 2 min geleden</p>
          </div>
        </div>
        <p className="text-[12px] leading-relaxed mb-3" style={{ color: MUTED }}>
          Interesse in gevelreclame voor nieuw pand. ±8m breed, met LED-verlichting.
        </p>
        <div
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full"
          style={{ backgroundColor: 'rgba(26,83,92,0.06)' }}
        >
          <span className="text-[10px]">✨</span>
          <span className="font-mono text-[9px] font-bold tracking-wider uppercase" style={{ color: PETROL }}>
            Daan vat samen
          </span>
        </div>
      </div>
    </MockupFrame>
  )
}

function MockupOfferte() {
  const items = [
    { name: 'Gevelreclame basic', price: '€ 1.850' },
    { name: 'LED-verlichting 5m', price: '€ 340' },
    { name: 'Montage · 2p', price: '€ 420' },
  ]
  return (
    <MockupFrame>
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid #F0EFEC' }}>
        <div>
          <p className="font-mono text-[9px] font-bold tracking-wider uppercase" style={{ color: MUTED_SOFT }}>Offerte</p>
          <p className="font-heading text-[13px] font-bold" style={{ color: PETROL }}>2026-0042</p>
        </div>
        <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: '#FDE8E2', color: FLAME }}>
          CONCEPT
        </span>
      </div>
      <div className="p-4">
        {items.map((item, i) => (
          <div
            key={i}
            className="flex items-center justify-between py-1.5"
            style={{ borderBottom: i < 2 ? '1px dashed #F0EFEC' : 'none' }}
          >
            <p className="text-[11px]" style={{ color: INK }}>{item.name}</p>
            <p className="font-mono text-[11px] font-semibold" style={{ color: PETROL }}>{item.price}</p>
          </div>
        ))}
        <div className="flex items-center justify-between pt-3 mt-3" style={{ borderTop: `1.5px solid ${PETROL}` }}>
          <p className="text-[11px] font-bold" style={{ color: PETROL }}>Totaal ex. btw</p>
          <p className="font-mono text-[14px] font-extrabold" style={{ color: PETROL }}>€ 2.610</p>
        </div>
        <div
          className="w-full mt-4 py-2.5 rounded-lg font-semibold text-[11px] text-white flex items-center justify-center gap-1.5"
          style={{ backgroundColor: FLAME }}
        >
          Verstuur via portaal <span>→</span>
        </div>
      </div>
    </MockupFrame>
  )
}

function MockupPortaal() {
  return (
    <MockupFrame>
      <div className="px-3 py-2 flex items-center gap-2" style={{ backgroundColor: '#F5F4F1', borderBottom: '1px solid #EBEBEB' }}>
        <div className="flex gap-1">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#E8A9A0' }} />
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#F5D9A0' }} />
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#A8D8A0' }} />
        </div>
        <div className="flex-1 text-center">
          <span className="font-mono text-[9px]" style={{ color: MUTED_SOFT }}>portaal.doen.team/jansen-bouw</span>
        </div>
      </div>
      <div className="p-4">
        <p className="font-heading text-[14px] font-extrabold leading-tight" style={{ color: PETROL }}>
          Jouw project bij Mark<span style={{ color: FLAME }}>.</span>
        </p>
        <p className="text-[10px] mb-3" style={{ color: MUTED }}>Gevelreclame · start woensdag</p>
        <div
          className="rounded-lg mb-3 h-20 flex items-center justify-center"
          style={{ backgroundColor: '#FAFAF7', border: '1px dashed #D5D3CC' }}
        >
          <svg width="100" height="34" viewBox="0 0 100 34">
            <rect x="4" y="12" width="92" height="14" fill="none" stroke={PETROL} strokeWidth="1.2" />
            <text x="50" y="23" textAnchor="middle" fontSize="7" fontFamily="monospace" fontWeight="700" fill={PETROL}>
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
          <div
            className="flex-1 py-2 rounded-lg text-[11px] font-semibold text-white flex items-center justify-center gap-1"
            style={{ backgroundColor: FLAME }}
          >
            <span>✓</span> Akkoord
          </div>
          <div
            className="flex-1 py-2 rounded-lg text-[11px] font-semibold text-center"
            style={{ border: `1px solid ${PETROL}`, color: PETROL }}
          >
            Reageren
          </div>
        </div>
      </div>
    </MockupFrame>
  )
}

function MockupPlanning() {
  const days = ['Ma', 'Di', 'Wo', 'Do', 'Vr']
  const scheduled = [
    null,
    null,
    { title: 'Jansen Bouw', crew: 'Mark + Sophie', weather: '☀' },
    null,
    null,
  ]
  return (
    <MockupFrame>
      <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid #F0EFEC' }}>
        <p className="font-heading text-[13px] font-extrabold" style={{ color: PETROL }}>
          Week 12<span style={{ color: FLAME }}>.</span>
        </p>
        <span className="font-mono text-[9px] font-bold tracking-wider uppercase" style={{ color: MUTED_SOFT }}>Maart</span>
      </div>
      <div className="p-3">
        <div className="grid grid-cols-5 gap-1.5">
          {days.map((d, i) => {
            const job = scheduled[i]
            const isActive = !!job
            return (
              <div key={i} className="text-center">
                <p className="font-mono text-[9px] font-bold mb-1" style={{ color: MUTED_SOFT }}>{d}</p>
                <div
                  className="h-[72px] rounded-md flex items-center justify-center text-[9px] p-1.5"
                  style={{
                    backgroundColor: isActive ? FLAME : '#F5F4F1',
                    color: isActive ? 'white' : MUTED_SOFT,
                    boxShadow: isActive ? '0 4px 10px rgba(241,80,37,0.3)' : 'none',
                  }}
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
    </MockupFrame>
  )
}

function MockupWerkbon() {
  return (
    <div className="flex items-start pl-2">
      <div
        className="rounded-[24px] p-1.5"
        style={{ backgroundColor: '#1A1A1A', boxShadow: '0 12px 36px rgba(26,83,92,0.2)' }}
      >
        <div className="rounded-[18px] overflow-hidden w-[200px]" style={{ backgroundColor: '#FFFFFF' }}>
          <div className="px-3 py-2.5" style={{ backgroundColor: PETROL_DARK }}>
            <p className="text-[8px] font-mono font-bold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.55)' }}>
              Werkbon
            </p>
            <p className="text-[11px] font-bold text-white leading-tight">Jansen Bouw · Woensdag</p>
          </div>
          <div className="p-3 space-y-2">
            {[
              { text: 'Materiaal geladen', done: true },
              { text: 'Montage afgerond', done: true },
              { text: "3 foto's geüpload", done: true },
              { text: 'Klant getekend', done: false },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: item.done ? '#2D6B48' : '#F5F4F1' }}
                >
                  {item.done && <span className="text-white text-[8px] font-bold">✓</span>}
                </div>
                <p className="text-[10px]" style={{ color: item.done ? INK : MUTED_SOFT }}>
                  {item.text}
                </p>
              </div>
            ))}
            <div className="mt-2 p-2 rounded-lg flex items-center justify-between" style={{ backgroundColor: '#FDE8E2' }}>
              <p className="text-[9px] font-mono font-bold uppercase tracking-wider" style={{ color: FLAME }}>Uren vandaag</p>
              <p className="text-[14px] font-extrabold font-mono" style={{ color: FLAME }}>6:45</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function MockupFactuur() {
  return (
    <MockupFrame>
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid #F0EFEC' }}>
        <div>
          <p className="font-mono text-[9px] font-bold tracking-wider uppercase" style={{ color: MUTED_SOFT }}>Factuur</p>
          <p className="font-heading text-[13px] font-bold" style={{ color: PETROL }}>F-2026-0087</p>
        </div>
        <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: '#E4F0EA', color: '#2D6B48' }}>
          BETAALD
        </span>
      </div>
      <div className="p-4">
        <div className="flex items-center justify-between mb-3 pb-3" style={{ borderBottom: '1px dashed #F0EFEC' }}>
          <p className="text-[11px]" style={{ color: MUTED }}>Jansen Bouw</p>
          <p className="font-mono text-[14px] font-extrabold" style={{ color: PETROL }}>€ 2.610</p>
        </div>
        <div className="space-y-2">
          <StatusRow tone="green" label="Betaald via Mollie (iDEAL)" value="€ 2.610" />
          <StatusRow tone="green" label="Verstuurd naar Exact Online" arrow />
          <StatusRow tone="muted" label="Handmatig afgevinkt" />
        </div>
      </div>
    </MockupFrame>
  )
}

function StatusRow({
  tone,
  label,
  value,
  arrow,
}: {
  tone: 'green' | 'muted'
  label: string
  value?: string
  arrow?: boolean
}) {
  const color = tone === 'green' ? '#2D6B48' : MUTED_SOFT
  const bg = tone === 'green' ? '#E4F0EA' : '#F5F4F1'
  return (
    <div className="flex items-center gap-2">
      <span
        className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0"
        style={{ backgroundColor: bg, color }}
      >
        {arrow ? '→' : '✓'}
      </span>
      <p className="text-[10px] flex-1" style={{ color: INK }}>{label}</p>
      {value && <p className="font-mono text-[10px] font-semibold" style={{ color }}>{value}</p>}
    </div>
  )
}

function MockupGedaan() {
  const steps = ['Aanvraag', 'Offerte', 'Akkoord', 'Planning', 'Montage', 'Factuur']
  return (
    <MockupFrame>
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid #F0EFEC' }}>
        <div>
          <p className="font-mono text-[9px] font-bold tracking-wider uppercase" style={{ color: MUTED_SOFT }}>Project</p>
          <p className="font-heading text-[13px] font-bold" style={{ color: PETROL }}>
            Jansen Bouw<span style={{ color: FLAME }}>.</span>
          </p>
        </div>
        <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: '#E4F0EA', color: '#2D6B48' }}>
          AFGEROND
        </span>
      </div>
      <div className="p-4">
        <div className="flex items-center justify-between mb-4 relative">
          <div className="absolute top-3 left-3 right-3 h-[1.5px]" style={{ backgroundColor: '#D0E3D5' }} />
          {steps.map((s, i) => (
            <div key={i} className="relative flex flex-col items-center flex-1 z-10">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
                style={{ backgroundColor: '#2D6B48', color: 'white', boxShadow: '0 2px 6px rgba(45,107,72,0.3)' }}
              >
                ✓
              </div>
              <p className="font-mono text-[7px] font-bold uppercase mt-1.5 text-center tracking-wider" style={{ color: MUTED }}>
                {s}
              </p>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between p-2.5 rounded-lg" style={{ backgroundColor: '#F5F4F1' }}>
          <p className="text-[10px] font-semibold" style={{ color: MUTED }}>Doorlooptijd</p>
          <p className="font-mono text-[13px] font-extrabold" style={{ color: PETROL }}>5 dagen</p>
        </div>
      </div>
    </MockupFrame>
  )
}

/* ═══════════════════════════════════════════════════════════════════
   ACT 5 — CTA: "Klaar om het anders te doen?"
   ═══════════════════════════════════════════════════════════════════ */

function Act5CTA() {
  return (
    <section className="py-24 md:py-32" style={{ backgroundColor: '#FFFFFF' }}>
      <div className="container-site">
        <SectionReveal>
          <div
            className="max-w-3xl mx-auto rounded-3xl p-10 md:p-16 text-center relative overflow-hidden"
            style={{
              background: 'linear-gradient(180deg, #1A535C 0%, #143F46 100%)',
            }}
          >
            {/* Soft flame glow */}
            <div
              className="absolute pointer-events-none"
              style={{
                width: 600,
                height: 600,
                top: '-20%',
                left: '50%',
                transform: 'translateX(-50%)',
                background: `radial-gradient(circle, ${FLAME}22 0%, transparent 60%)`,
                filter: 'blur(40px)',
              }}
            />
            <div className="relative">
              <p className="font-mono text-[11px] md:text-[12px] font-bold tracking-[0.2em] uppercase mb-5" style={{ color: FLAME }}>
                Binnenkort live
              </p>
              <h2 className="font-heading text-[32px] md:text-[48px] font-extrabold tracking-[-1.5px] leading-tight mb-5 text-white">
                Klaar om het anders te doen
                <span style={{ color: FLAME }}>?</span>
              </h2>
              <p className="text-[15px] md:text-[17px] max-w-lg mx-auto mb-10" style={{ color: 'rgba(255,255,255,0.55)' }}>
                Schrijf je in voor de early access. Als doen. live gaat, hoor jij het als eerste.
              </p>
              <div className="flex justify-center">
                <WachtlijstForm />
              </div>
              <p className="text-[12px] mt-5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                30 dagen gratis. Geen creditcard. Geen lock-in.
              </p>
            </div>
          </div>
        </SectionReveal>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════════════
   Main export
   ═══════════════════════════════════════════════════════════════════ */

export default function HoeHetWerktContent() {
  const reduceMotion = useReducedMotion()

  // Reduced-motion fallback: static, readable, no scroll-scrubbed sections
  if (reduceMotion) {
    return (
      <div className="pt-28 md:pt-36">
        <section className="py-16 bg-white">
          <div className="container-site max-w-3xl">
            <p className="font-mono text-[12px] font-bold tracking-[0.2em] uppercase mb-4" style={{ color: FLAME }}>
              Hoe het werkt
            </p>
            <h1 className="font-heading text-[36px] md:text-[52px] font-extrabold tracking-[-2px] leading-tight mb-6" style={{ color: PETROL }}>
              Van aanvraag tot factuur<span style={{ color: FLAME }}>.</span>
            </h1>
            <p className="text-[17px] mb-10" style={{ color: MUTED }}>
              Je werkdag draait om zeven tabbladen en vier logins. doen. brengt ze samen. Hieronder staan de zeven stappen van een gemiddelde klantopdracht.
            </p>
            <ol className="space-y-4">
              {flowSteps.map((s) => (
                <li key={s.nr} className="p-5 rounded-xl" style={{ backgroundColor: '#F8F7F5' }}>
                  <p className="font-mono text-[11px] font-bold tracking-[0.18em]" style={{ color: FLAME }}>
                    {s.nr} · {s.when}
                  </p>
                  <h3 className="font-heading text-[20px] font-bold mt-1 mb-2" style={{ color: PETROL }}>
                    {s.title}.
                  </h3>
                  <p className="text-[14px]" style={{ color: MUTED }}>
                    {s.body}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>
        <Act5CTA />
      </div>
    )
  }

  return (
    <div>
      <Act1Opening />
      <Act2Pain />
      <Act3Pivot />
      <Act4Solution />
      <Act5CTA />
    </div>
  )
}
