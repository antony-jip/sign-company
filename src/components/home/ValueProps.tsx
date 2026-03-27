'use client'

import { motion } from 'framer-motion'
import SectionReveal from '../SectionReveal'

const props = [
  {
    headline: 'Tekeningen delen zonder gedoe.',
    description: 'Geen mails die kwijtraken, geen WhatsApp-groepen vol bestanden. Je klant ziet alles in het portaal. Tekeningen, offertes, updates.',
    color: '#6A5A8A',
    wide: true,
    icon: (
      <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
        <rect x="4" y="6" width="36" height="28" rx="5" stroke="currentColor" strokeWidth="1.5" fill="none" />
        <path d="M4 26l12-9 7 6 8-7 9 10" stroke="#F15025" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="16" cy="17" r="3.5" fill="currentColor" opacity="0.15" />
      </svg>
    ),
  },
  {
    headline: 'Niks schiet er doorheen.',
    description: 'Automatische herinneringen bij openstaande offertes en verlopen facturen. Ook als het druk is.',
    color: '#F15025',
    icon: (
      <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
        <circle cx="22" cy="22" r="17" stroke="currentColor" strokeWidth="1.5" fill="none" />
        <path d="M22 12v10l7 4" stroke="#F15025" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="22" cy="22" r="2.5" fill="#F15025" />
      </svg>
    ),
  },
  {
    headline: 'Gebouwd door signmakers.',
    description: 'We kennen het vak. Uiteenlopende projecten, klein tot groot, en geen software die het begreep. Dus bouwden we het zelf.',
    color: '#1A535C',
    icon: (
      <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
        <path d="M22 4L6 14v16l16 10 16-10V14L22 4z" stroke="currentColor" strokeWidth="1.5" fill="none" />
        <circle cx="22" cy="24" r="5" fill="#F15025" />
        <path d="M19.5 24l2 2L25 22" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    headline: 'Klaar voor AI.',
    description: 'Alles hangt samen als een orkest. Klantdata, projecten, offertes. Daardoor kan AI je echt helpen. Nu al.',
    color: '#1A535C',
    icon: (
      <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
        <circle cx="22" cy="22" r="6" fill="currentColor" />
        <circle cx="9" cy="11" r="3.5" fill="currentColor" opacity="0.2" />
        <circle cx="35" cy="11" r="3.5" fill="currentColor" opacity="0.2" />
        <circle cx="9" cy="33" r="3.5" fill="currentColor" opacity="0.2" />
        <circle cx="35" cy="33" r="3.5" fill="currentColor" opacity="0.2" />
        <line x1="12" y1="13" x2="18" y2="19" stroke="currentColor" strokeWidth="1" opacity="0.15" />
        <line x1="32" y1="13" x2="26" y2="19" stroke="currentColor" strokeWidth="1" opacity="0.15" />
        <line x1="12" y1="31" x2="18" y2="25" stroke="currentColor" strokeWidth="1" opacity="0.15" />
        <line x1="32" y1="31" x2="26" y2="25" stroke="currentColor" strokeWidth="1" opacity="0.15" />
        <circle cx="22" cy="22" r="2.5" fill="#F15025" />
      </svg>
    ),
  },
]

export default function ValueProps() {
  return (
    <section className="py-24 md:py-36">
      <div className="container-site">
        <SectionReveal>
          <div className="text-center mb-16 md:mb-20">
            <h2 className="font-heading text-[36px] md:text-[48px] font-bold text-petrol tracking-[-2px] leading-[1.05] mb-5">
              Waarom doen<span className="text-flame">.</span>
            </h2>
            <p className="text-muted text-[17px] max-w-lg mx-auto leading-relaxed">
              We liepen zelf tegen dezelfde problemen aan. Te druk, te veel losse tools, geen overzicht. Dus bouwden we wat we misten.
            </p>
          </div>
        </SectionReveal>

        {/* Bento grid */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 lg:gap-5">
          {props.map((prop, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.6,
                delay: i * 0.1,
                ease: [0.16, 1, 0.3, 1] as const,
              }}
              viewport={{ once: true, margin: '-60px' }}
              className={`group relative rounded-2xl md:rounded-3xl overflow-hidden transition-all duration-500 hover:-translate-y-[2px] ${
                prop.wide ? 'md:col-span-4' : 'md:col-span-3'
              } ${i === 3 ? 'md:col-span-3' : ''}`}
              style={{ backgroundColor: '#FEFDFB', border: '1px solid rgba(0,0,0,0.04)' }}
            >
              {/* Top accent line */}
              <div
                className="h-[2px] transition-all duration-500 group-hover:h-[3px]"
                style={{ background: `linear-gradient(90deg, ${prop.color}, ${prop.color}30)` }}
              />

              <div className="p-7 md:p-9">
                {/* Icon */}
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5 transition-all duration-300 group-hover:scale-105"
                  style={{ color: prop.color, backgroundColor: `${prop.color}08` }}
                >
                  {prop.icon}
                </div>

                <h3 className="font-heading text-[20px] md:text-[22px] text-petrol mb-2.5 tracking-tight leading-tight">
                  {prop.headline}
                </h3>
                <p className="text-muted text-[14px] leading-[1.7]">
                  {prop.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
