'use client'

import { motion } from 'framer-motion'
import SectionReveal from '../SectionReveal'

const props = [
  {
    headline: 'Tekeningen delen zonder gedoe.',
    description: 'Geen mails die kwijtraken, geen WhatsApp-groepen vol bestanden. Je klant ziet alles in het portaal. Tekeningen, offertes, updates. Overzichtelijk en professioneel.',
    color: '#6A5A8A',
    icon: (
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
        <rect x="4" y="6" width="32" height="24" rx="4" fill="#6A5A8A" opacity="0.12" />
        <rect x="4" y="6" width="32" height="24" rx="4" stroke="#6A5A8A" strokeWidth="1.5" fill="none" />
        <path d="M4 22l10-7 6 5 7-6 9 8" stroke="#F15025" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="14" cy="15" r="3" fill="#6A5A8A" opacity="0.3" />
      </svg>
    ),
  },
  {
    headline: 'Niks schiet er meer doorheen.',
    description: 'Offerte verstuurd maar geen reactie? De klant krijgt automatisch een herinnering. Factuur verlopen? Je weet het direct. Alle opvolging geregeld, ook als het druk is.',
    color: '#F15025',
    icon: (
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
        <circle cx="20" cy="20" r="15" fill="#F15025" opacity="0.08" />
        <circle cx="20" cy="20" r="15" stroke="#F15025" strokeWidth="1.5" fill="none" />
        <path d="M20 10v10l6 4" stroke="#F15025" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="20" cy="20" r="2" fill="#F15025" />
      </svg>
    ),
  },
  {
    headline: 'Gebouwd door signmakers.',
    description: 'We kennen het vak omdat we het zelf doen. Uiteenlopende projecten, klein tot groot, en geen enkel softwarepakket dat het echt begreep. Daarom hebben we het zelf gebouwd.',
    color: '#1A535C',
    icon: (
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
        <path d="M20 4L6 13v14l14 9 14-9V13L20 4z" fill="#1A535C" opacity="0.08" />
        <path d="M20 4L6 13v14l14 9 14-9V13L20 4z" stroke="#1A535C" strokeWidth="1.5" fill="none" />
        <path d="M20 4v32M6 13l14 9 14-9" stroke="#1A535C" strokeWidth="0.8" opacity="0.3" />
        <circle cx="20" cy="22" r="4" fill="#F15025" />
        <path d="M18 22l1.5 1.5L23 21" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    headline: 'Klaar voor AI. Nu al.',
    description: 'Moderne software waar alles samenhangt. Klantdata, projecten, offertes, facturen. Als een orkest. Daardoor kan AI je echt helpen. Niet over 5 jaar, nu.',
    color: '#1A535C',
    icon: (
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
        <circle cx="20" cy="20" r="5" fill="#1A535C" />
        <circle cx="8" cy="10" r="3" fill="#1A535C" opacity="0.25" />
        <circle cx="32" cy="10" r="3" fill="#1A535C" opacity="0.25" />
        <circle cx="8" cy="30" r="3" fill="#1A535C" opacity="0.25" />
        <circle cx="32" cy="30" r="3" fill="#1A535C" opacity="0.25" />
        <line x1="10.5" y1="11.5" x2="16.5" y2="17.5" stroke="#1A535C" strokeWidth="1" opacity="0.2" />
        <line x1="29.5" y1="11.5" x2="23.5" y2="17.5" stroke="#1A535C" strokeWidth="1" opacity="0.2" />
        <line x1="10.5" y1="28.5" x2="16.5" y2="22.5" stroke="#1A535C" strokeWidth="1" opacity="0.2" />
        <line x1="29.5" y1="28.5" x2="23.5" y2="22.5" stroke="#1A535C" strokeWidth="1" opacity="0.2" />
        <circle cx="20" cy="20" r="2" fill="#F15025" />
      </svg>
    ),
  },
]

export default function ValueProps() {
  return (
    <section className="py-24 md:py-36 relative overflow-hidden">
      {/* Subtle background texture */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[10%] right-[-5%] w-[300px] h-[300px] rounded-full opacity-[0.03]" style={{ backgroundColor: '#1A535C' }} />
        <div className="absolute bottom-[5%] left-[-3%] w-[200px] h-[200px] rounded-full opacity-[0.02]" style={{ backgroundColor: '#F15025' }} />
      </div>

      <div className="container-site relative z-10">
        <SectionReveal>
          <div className="text-center mb-20">
            <h2 className="font-heading text-[40px] md:text-[52px] font-bold text-petrol tracking-[-2px] leading-[1] mb-5">
              Waarom doen<span className="text-flame">.</span>
            </h2>
            <p className="text-muted text-[17px] max-w-xl mx-auto leading-relaxed">
              We liepen zelf tegen dezelfde problemen aan. Te druk, te veel losse tools, geen overzicht. Dus bouwden we wat we misten.
            </p>
          </div>
        </SectionReveal>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 lg:gap-6">
          {props.map((prop, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.7,
                delay: i * 0.12,
                ease: [0.16, 1, 0.3, 1] as const,
              }}
              viewport={{ once: true, margin: '-80px' }}
              className="group relative bg-white rounded-3xl p-8 md:p-10 overflow-hidden transition-all duration-500 hover:-translate-y-[3px]"
              style={{
                border: '1px solid rgba(0,0,0,0.04)',
                boxShadow: '0 1px 4px rgba(100,80,40,0.04)',
              }}
            >
              {/* Color accent bar top */}
              <div
                className="absolute top-0 left-8 right-8 h-[3px] rounded-b-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{ background: `linear-gradient(90deg, ${prop.color}, ${prop.color}40)` }}
              />

              {/* Hover glow */}
              <div
                className="absolute -top-20 -right-20 w-40 h-40 rounded-full opacity-0 group-hover:opacity-[0.04] transition-opacity duration-500 blur-3xl"
                style={{ backgroundColor: prop.color }}
              />

              <div className="relative">
                {/* Icon in colored circle */}
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-transform duration-300 group-hover:scale-110"
                  style={{ backgroundColor: `${prop.color}0A` }}
                >
                  {prop.icon}
                </div>

                <h3 className="font-heading text-[22px] md:text-[24px] text-petrol mb-3 tracking-tight leading-tight">
                  {prop.headline}
                </h3>
                <p className="text-muted text-[15px] leading-[1.7] max-w-md">
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
