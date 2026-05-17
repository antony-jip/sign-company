'use client'

import { motion, useInView } from 'framer-motion'
import { useRef, useState } from 'react'
import Image from 'next/image'
import EditorialPhotoPlaceholder from '@/components/EditorialPhotoPlaceholder'
import SerifItalic from '@/components/SerifItalic'
import { TrimCorners } from '@/components/brand/BrandMarks'
import { Link2, BellRing, Hammer, Sparkles, type LucideIcon } from 'lucide-react'

type Prop = {
  headline: string
  sub: string
  text: string
  accent: string
  icon: LucideIcon
  caption: string
  description: string
  footerLeft: string
  footerRight: string
  image?: string
}

const props: Prop[] = [
  {
    headline: 'Je klant doet mee.',
    sub: 'Zonder gedoe.',
    text: 'Eén link, geen inlog. Je klant ziet tekeningen, keurt offertes goed, reageert op bestanden.',
    accent: '#6A5A8A',
    icon: Link2,
    caption: 'Portaal · vervang me',
    description: 'Foto van het klantportaal op een tablet.',
    footerLeft: 'Klantportaal',
    footerRight: 'Nr. 011',
    image: '/images/values/portaal.webp',
  },
  {
    headline: 'Niks vergeten.',
    sub: 'doen. volgt op.',
    text: 'Offerte zonder reactie? Auto-herinnering. Factuur verlopen? Je weet het direct.',
    accent: '#F15025',
    icon: BellRing,
    caption: 'Opvolging · vervang me',
    description: 'Laptop, koffie, post-it met notitie.',
    footerLeft: 'Auto-opvolgen',
    footerRight: 'Nr. 012',
    image: '/images/values/opvolging.webp',
  },
  {
    headline: 'Door het vak.',
    sub: 'Voor het vak.',
    text: 'Niet door consultants. Door vakmensen die zelf in de werkplaats stonden.',
    accent: '#1A535C',
    icon: Hammer,
    caption: 'Vakmensen · vervang me',
    description: 'Monteurs op locatie, mid-gesture.',
    footerLeft: 'In de werkplaats',
    footerRight: 'Nr. 013',
    image: '/images/values/vakmensen.webp',
  },
  {
    headline: 'AI die doet.',
    sub: 'Niet meepraat.',
    text: 'Mail van leverancier binnen met PDF? Daan leest de inkoopfactuur uit en boekt hem klaar. Mail van klant? Samenvatten en beantwoorden in jouw toon. Werkwoord, geen toverwoord.',
    accent: '#1A535C',
    icon: Sparkles,
    caption: 'Daan AI · vervang me',
    description: 'Laptop tussen tools met klein chat-element.',
    footerLeft: 'Daan AI',
    footerRight: 'Nr. 014',
    image: '/images/values/ai.webp',
  },
]

function PropCard({
  prop,
  index,
  inView,
}: {
  prop: Prop
  index: number
  inView: boolean
}) {
  const [hovered, setHovered] = useState(false)
  const Icon = prop.icon
  const nr = String(index + 1).padStart(2, '0')

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{
        duration: 0.55,
        delay: 0.15 + index * 0.08,
        ease: [0.16, 1, 0.3, 1],
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <motion.div
        className="relative rounded-[10px] overflow-hidden bg-white h-full flex flex-col"
        style={{
          border: '1px solid rgba(26,83,92,0.08)',
          boxShadow: hovered
            ? '0 16px 32px -12px rgba(20,40,40,0.18), 0 2px 6px rgba(0,0,0,0.04)'
            : '0 1px 2px rgba(20,40,40,0.04), 0 8px 18px -10px rgba(20,40,40,0.08)',
        }}
        animate={{ y: hovered ? -4 : 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Image — top half */}
        <div className="relative aspect-[5/4] w-full overflow-hidden">
          {prop.image ? (
            <Image
              src={prop.image}
              alt={prop.headline}
              fill
              className="object-cover transition-transform duration-500"
              style={{ transform: hovered ? 'scale(1.03)' : 'scale(1)' }}
              sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 25vw"
            />
          ) : (
            <EditorialPhotoPlaceholder
              aspect="aspect-[5/4]"
              icon={<Icon className="w-10 h-10" strokeWidth={1.4} />}
              stampLabel={nr}
              stampColor={prop.accent}
              caption={prop.caption}
              description={prop.description}
              ratio=""
              footerLeft={prop.footerLeft}
              footerRight={prop.footerRight}
            />
          )}

          {/* Stamp overlay — for real images only (placeholder has its own) */}
          {prop.image && (
            <>
              <div
                className="absolute top-3 left-3 px-2 py-0.5"
                style={{ backgroundColor: prop.accent }}
              >
                <span className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-white">
                  {nr}
                </span>
              </div>
              <div
                className="absolute bottom-0 left-0 right-0 px-3 py-2 flex items-center justify-between"
                style={{ backgroundColor: 'rgba(20,40,40,0.78)', backdropFilter: 'blur(4px)' }}
              >
                <span className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-white/85">
                  {prop.footerLeft}
                </span>
                <span className="font-mono text-[9px] text-white/55 tracking-[0.15em]">
                  {prop.footerRight}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Content — bottom half */}
        <div className="p-5 flex flex-col gap-2 flex-1">
          {/* Kicker — accent label */}
          <div className="flex items-center gap-2 mb-1">
            <span
              className="font-mono text-[10px] font-bold tracking-[0.22em] tabular-nums uppercase"
              style={{ color: '#6B6B66' }}
            >
              {nr}
            </span>
            <span className="w-4 h-px" style={{ backgroundColor: 'rgba(26,83,92,0.2)' }} />
            <span
              className="font-mono text-[9px] font-bold tracking-[0.18em] uppercase"
              style={{ color: prop.accent }}
            >
              {prop.footerLeft}
            </span>
          </div>

          {/* Headline */}
          <h3
            className="font-heading text-[20px] md:text-[22px] font-bold tracking-tight leading-[1.1]"
            style={{ color: '#1A535C' }}
          >
            {prop.headline.replace('.', '')}
            <span style={{ color: '#F15025' }}>.</span>
          </h3>

          {/* Sub — serif italic */}
          <p
            className="text-[15px] md:text-[16px] leading-[1.15] -mt-0.5"
            style={{
              color: prop.accent,
              fontFamily: '"Instrument Serif", var(--font-instrument-serif), Georgia, serif',
              fontStyle: 'italic',
              fontWeight: 400,
            }}
          >
            {prop.sub.replace('.', '')}<span style={{ color: '#F15025' }}>.</span>
          </p>

          {/* Body */}
          <p
            className="text-[13.5px] leading-[1.55] mt-2 flex-1"
            style={{ color: '#3F3F3A' }}
          >
            {prop.text}
          </p>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default function ValueProps() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section
      ref={ref}
      className="relative"
      style={{ backgroundColor: '#F3F2ED' }}
    >
      {/* Backdrop layer — scoped overflow-hidden so it doesn't break ancestors */}
      <div aria-hidden className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-20 -right-20 w-[520px] h-[520px] rounded-full"
          style={{ backgroundColor: '#E8E1D0', opacity: 0.6, filter: 'blur(80px)' }}
        />
        <div
          className="absolute top-[45%] -left-32 w-[460px] h-[460px] rounded-full"
          style={{ backgroundColor: '#E4DBC6', opacity: 0.5, filter: 'blur(90px)' }}
        />
        <div
          className="absolute bottom-[10%] right-[10%] w-[280px] h-[280px] rounded-full"
          style={{ backgroundColor: '#F15025', opacity: 0.05, filter: 'blur(100px)' }}
        />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='22' height='22' viewBox='0 0 22 22'><circle cx='11' cy='11' r='0.7' fill='%231A1A1A' opacity='0.08'/></svg>")`,
            backgroundSize: '22px 22px',
          }}
        />
      </div>

      <TrimCorners inset={28} size={16} color="rgba(26,83,92,0.28)" />

      <div className="container-site relative py-24 md:py-32">
        {/* Header — Hero-style */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-3xl mb-14 md:mb-20"
        >
          <div className="inline-flex items-center gap-2 mb-7">
            <span className="relative inline-flex items-center justify-center w-2 h-2">
              <span
                className="absolute inset-0 rounded-full animate-ping"
                style={{ backgroundColor: '#F15025', opacity: 0.4 }}
              />
              <span className="relative w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#F15025' }} />
            </span>
            <span
              className="font-mono text-[11px] font-medium tracking-[0.18em] uppercase"
              style={{ color: '#6B6B66' }}
            >
              Vier verhalen · waarom doen.
            </span>
          </div>

          <h2
            className="font-heading font-bold tracking-[-1.5px] md:tracking-[-2.5px] leading-[0.95]"
            style={{
              fontSize: 'clamp(36px, 5vw, 68px)',
              color: '#1A535C',
            }}
          >
            <span className="block">Vier dingen die</span>
            <span className="block" style={{ color: '#6B6B66' }}>
              het <SerifItalic style={{ letterSpacing: '-2px' }}>anders</SerifItalic> maken
              <span style={{ color: '#F15025' }}>.</span>
            </span>
          </h2>

          <p className="text-[16px] md:text-[18px] leading-[1.55] max-w-lg mt-6" style={{ color: '#3F3F3A' }}>
            Geen feature-lijst, vier verhalen. Lees waarom signmakers overstappen
            — en blijven.
          </p>
        </motion.div>

        {/* 4-column grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6">
          {props.map((prop, i) => (
            <PropCard key={prop.headline} prop={prop} index={i} inView={inView} />
          ))}
        </div>
      </div>
    </section>
  )
}
