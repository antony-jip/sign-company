'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import SectionReveal from '../SectionReveal'

// Mini visual mockups for each prop
function PortaalMockup() {
  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden" style={{ backgroundColor: '#1A535C' }}>
      {/* Browser bar */}
      <div className="flex items-center gap-1.5 px-4 py-2.5" style={{ backgroundColor: '#143F46' }}>
        <div className="w-2 h-2 rounded-full bg-white/20" />
        <div className="w-2 h-2 rounded-full bg-white/20" />
        <div className="w-2 h-2 rounded-full bg-white/20" />
        <div className="ml-3 h-4 w-32 rounded bg-white/10" />
      </div>
      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Image thumbnails */}
        <div className="grid grid-cols-3 gap-2">
          <div className="aspect-square rounded-lg bg-white/10" />
          <div className="aspect-square rounded-lg bg-white/15" />
          <div className="aspect-square rounded-lg bg-white/10" />
        </div>
        {/* Approval bar */}
        <div className="flex items-center gap-2">
          <div className="h-7 flex-1 rounded-lg bg-white/8 flex items-center px-3">
            <span className="text-[9px] text-white/40 font-mono">Offerte-2025-042</span>
          </div>
          <div className="h-7 px-3 rounded-lg flex items-center" style={{ backgroundColor: '#F15025' }}>
            <span className="text-[9px] text-white font-bold">Akkoord</span>
          </div>
        </div>
        {/* Chat bubble */}
        <div className="flex gap-2">
          <div className="w-5 h-5 rounded-full bg-white/15 flex-shrink-0" />
          <div className="rounded-lg rounded-tl-sm px-3 py-2 bg-white/8">
            <span className="text-[8px] text-white/50">Tekening ziet er goed uit!</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function OpvolgingMockup() {
  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden p-5" style={{ backgroundColor: '#FEFDFB', border: '1px solid #EBEBEB' }}>
      {/* Timeline */}
      <div className="space-y-4">
        {[
          { dag: 'Ma', tekst: 'Offerte verstuurd', kleur: '#3A5A9A', done: true },
          { dag: 'Do', tekst: 'Herinnering gestuurd', kleur: '#F15025', done: true },
          { dag: 'Vr', tekst: 'Klant akkoord', kleur: '#3A7D52', done: true },
        ].map((item, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: item.kleur + '12' }}>
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.kleur }} />
              </div>
              {i < 2 && <div className="w-px h-4" style={{ backgroundColor: '#EBEBEB' }} />}
            </div>
            <div>
              <span className="text-[10px] font-mono block" style={{ color: '#9B9B95' }}>{item.dag}</span>
              <span className="text-[11px] font-semibold" style={{ color: '#1A1A1A' }}>{item.tekst}<span style={{ color: '#F15025' }}>.</span></span>
            </div>
          </div>
        ))}
      </div>
      {/* Auto badge */}
      <div className="absolute bottom-4 right-4 px-2.5 py-1 rounded-full" style={{ backgroundColor: '#F15025', boxShadow: '0 2px 8px rgba(241,80,37,0.3)' }}>
        <span className="text-[8px] font-bold text-white tracking-wide">AUTO</span>
      </div>
    </div>
  )
}

function VakMockup() {
  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden" style={{ backgroundColor: '#1A535C' }}>
      <div className="p-5 flex flex-col h-full justify-between">
        {/* Quote */}
        <div>
          <svg width="24" height="20" viewBox="0 0 24 20" fill="none" className="mb-3 opacity-30">
            <path d="M0 20V12C0 5.4 3.8 1.2 10 0l1 2c-4 1.2-5.6 3.6-5.8 6H10v12H0zm14 0V12c0-6.6 3.8-10.8 10-12l1 2c-4 1.2-5.6 3.6-5.8 6H24v12H14z" fill="white" />
          </svg>
          <p className="text-[13px] text-white/70 leading-relaxed">
            &ldquo;Geen enkel pakket begreep hoe een signbedrijf werkt.&rdquo;
          </p>
        </div>
        {/* Author */}
        <div className="flex items-center gap-2 mt-4 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="w-7 h-7 rounded-full bg-white/15 flex items-center justify-center">
            <span className="text-[9px] font-bold text-white/60">AB</span>
          </div>
          <div>
            <span className="text-[10px] font-semibold text-white/80 block">Antony Bootsma</span>
            <span className="text-[9px] text-white/30">Oprichter doen.</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function AIMockup() {
  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden p-5" style={{ backgroundColor: '#FEFDFB', border: '1px solid #EBEBEB' }}>
      {/* Connected nodes */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 200 200">
        <line x1="100" y1="100" x2="40" y2="40" stroke="#1A535C" strokeWidth="1" opacity="0.1" />
        <line x1="100" y1="100" x2="160" y2="40" stroke="#1A535C" strokeWidth="1" opacity="0.1" />
        <line x1="100" y1="100" x2="40" y2="160" stroke="#1A535C" strokeWidth="1" opacity="0.1" />
        <line x1="100" y1="100" x2="160" y2="160" stroke="#1A535C" strokeWidth="1" opacity="0.1" />
        <circle cx="40" cy="40" r="16" fill="#3A6B8C" opacity="0.1" />
        <circle cx="160" cy="40" r="16" fill="#F15025" opacity="0.1" />
        <circle cx="40" cy="160" r="16" fill="#2D6B48" opacity="0.1" />
        <circle cx="160" cy="160" r="16" fill="#6A5A8A" opacity="0.1" />
        <circle cx="100" cy="100" r="24" fill="#1A535C" opacity="0.15" />
      </svg>
      {/* Labels */}
      <div className="relative h-full flex flex-col items-center justify-center">
        <div className="absolute top-3 left-3 text-[9px] font-mono" style={{ color: '#3A6B8C' }}>Klanten</div>
        <div className="absolute top-3 right-3 text-[9px] font-mono" style={{ color: '#F15025' }}>Offertes</div>
        <div className="absolute bottom-3 left-3 text-[9px] font-mono" style={{ color: '#2D6B48' }}>Facturen</div>
        <div className="absolute bottom-3 right-3 text-[9px] font-mono" style={{ color: '#6A5A8A' }}>Portaal</div>
        {/* Center AI */}
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: '#1A535C' }}>
          <span className="text-[10px] font-bold text-white">AI</span>
        </div>
        <span className="text-[9px] font-semibold mt-2" style={{ color: '#1A535C' }}>Alles verbonden</span>
      </div>
    </div>
  )
}

const sections = [
  {
    headline: 'Tekeningen delen zonder gedoe',
    oneliner: 'Je klant ziet alles in het portaal. Geen mails meer kwijt.',
    accent: '#6A5A8A',
    mockup: <PortaalMockup />,
  },
  {
    headline: 'Niks schiet er doorheen',
    oneliner: 'Automatische opvolging. Ook als het druk is.',
    accent: '#F15025',
    mockup: <OpvolgingMockup />,
  },
  {
    headline: 'Gebouwd door signmakers',
    oneliner: 'We kennen het vak. Dus bouwden we wat we misten.',
    accent: '#1A535C',
    mockup: <VakMockup />,
  },
  {
    headline: 'Klaar voor AI',
    oneliner: 'Alles hangt samen. Daardoor kan AI je echt helpen.',
    accent: '#1A535C',
    mockup: <AIMockup />,
  },
]

function PropBlock({ section, index }: { section: typeof sections[0]; index: number }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })
  const reversed = index % 2 !== 0

  return (
    <motion.div
      ref={ref}
      className={`grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16 items-center ${index > 0 ? 'mt-16 md:mt-24' : ''}`}
    >
      {/* Text */}
      <motion.div
        className={reversed ? 'md:order-2' : 'md:order-1'}
        initial={{ opacity: 0, x: reversed ? 30 : -30 }}
        animate={isInView ? { opacity: 1, x: 0 } : {}}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      >
        <span className="font-mono text-[12px] font-bold tracking-wider" style={{ color: section.accent, opacity: 0.5 }}>
          0{index + 1}
        </span>
        <h3 className="font-heading text-[32px] md:text-[40px] font-bold text-petrol tracking-[-1.5px] leading-[1.05] mt-2 mb-4">
          {section.headline}<span className="text-flame">.</span>
        </h3>
        <p className="text-[18px] md:text-[20px] leading-relaxed" style={{ color: '#6B6B66' }}>
          {section.oneliner}
        </p>
        {/* Accent line */}
        <motion.div
          className="h-[3px] rounded-full mt-6 w-16 origin-left"
          style={{ backgroundColor: section.accent }}
          initial={{ scaleX: 0 }}
          animate={isInView ? { scaleX: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
        />
      </motion.div>

      {/* Visual mockup */}
      <motion.div
        className={`${reversed ? 'md:order-1' : 'md:order-2'} h-[280px] md:h-[320px]`}
        initial={{ opacity: 0, x: reversed ? -30 : 30, scale: 0.95 }}
        animate={isInView ? { opacity: 1, x: 0, scale: 1 } : {}}
        transition={{ duration: 0.8, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
      >
        {section.mockup}
      </motion.div>
    </motion.div>
  )
}

export default function ValueProps() {
  return (
    <section className="py-24 md:py-36">
      <div className="container-site">
        <SectionReveal>
          <div className="mb-16 md:mb-24">
            <h2 className="font-heading text-[36px] md:text-[48px] font-bold text-petrol tracking-[-2px] leading-[1.05] mb-5">
              Waarom doen<span className="text-flame">.</span>
            </h2>
            <p className="text-[17px] md:text-[19px] max-w-lg leading-relaxed" style={{ color: '#6B6B66' }}>
              Te druk, te veel losse tools, geen overzicht. Dus bouwden we wat we misten.
            </p>
          </div>
        </SectionReveal>

        {sections.map((section, i) => (
          <PropBlock key={section.headline} section={section} index={i} />
        ))}
      </div>
    </section>
  )
}
