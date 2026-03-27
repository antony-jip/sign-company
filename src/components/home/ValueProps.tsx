'use client'

import { motion } from 'framer-motion'
import SectionReveal from '../SectionReveal'

const props = [
  {
    headline: 'Tekeningen delen zonder gedoe.',
    description: 'Geen mails meer die kwijtraken, geen WhatsApp-groepen vol bestanden. Je klant ziet alles in het portaal. Tekeningen, offertes, updates. Overzichtelijk en professioneel.',
    icon: (
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
        <rect x="4" y="6" width="28" height="20" rx="3" className="stroke-petrol" strokeWidth="2" fill="none" />
        <path d="M4 20l8-6 5 4 6-5 9 7" className="stroke-flame" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="13" cy="14" r="2.5" className="fill-petrol/30" />
      </svg>
    ),
  },
  {
    headline: 'Niks schiet er meer doorheen.',
    description: 'Offerte verstuurd maar geen reactie? De klant krijgt automatisch een herinnering. Factuur verlopen? Je weet het direct. Alle opvolging geregeld, ook als het druk is.',
    icon: (
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
        <circle cx="18" cy="18" r="13" className="stroke-petrol" strokeWidth="2" fill="none" />
        <path d="M18 10v8l5 3" className="stroke-flame" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="18" cy="18" r="2" className="fill-flame" />
      </svg>
    ),
  },
  {
    headline: 'Gebouwd door signmakers.',
    description: 'We kennen het vak omdat we het zelf doen. Uiteenlopende projecten, klein tot groot, en geen enkel softwarepakket dat het echt begreep. Daarom hebben we het zelf gebouwd.',
    icon: (
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
        <path d="M18 4L6 12v12l12 8 12-8V12L18 4z" className="stroke-petrol" strokeWidth="2" fill="none" />
        <path d="M18 4v28M6 12l12 8 12-8" className="stroke-petrol/40" strokeWidth="1" />
        <circle cx="18" cy="20" r="3" className="fill-flame" />
      </svg>
    ),
  },
  {
    headline: 'Klaar voor AI. Nu al.',
    description: 'Moderne software waar alles samenhangt. Klantdata, projecten, offertes, facturen. Als een orkest. Daardoor kan AI je echt helpen. Niet over 5 jaar, nu.',
    icon: (
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
        <circle cx="18" cy="18" r="4" className="fill-petrol" />
        <circle cx="8" cy="10" r="2.5" className="fill-petrol/40" />
        <circle cx="28" cy="10" r="2.5" className="fill-petrol/40" />
        <circle cx="8" cy="26" r="2.5" className="fill-petrol/40" />
        <circle cx="28" cy="26" r="2.5" className="fill-petrol/40" />
        <line x1="10" y1="11" x2="15" y2="16" className="stroke-petrol/30" strokeWidth="1.5" />
        <line x1="26" y1="11" x2="21" y2="16" className="stroke-petrol/30" strokeWidth="1.5" />
        <line x1="10" y1="25" x2="15" y2="20" className="stroke-petrol/30" strokeWidth="1.5" />
        <line x1="26" y1="25" x2="21" y2="20" className="stroke-petrol/30" strokeWidth="1.5" />
        <circle cx="18" cy="18" r="1.5" className="fill-flame" />
      </svg>
    ),
  },
]

export default function ValueProps() {
  return (
    <section className="py-20 md:py-32">
      <div className="container-site">
        <SectionReveal>
          <h2 className="section-heading font-heading text-petrol text-center mb-4">
            Waarom doen<span className="text-flame">.</span>
          </h2>
          <p className="text-muted text-center max-w-xl mx-auto mb-16 text-lg">
            We liepen zelf tegen dezelfde problemen aan. Te druk, te veel losse tools, geen overzicht. Dus bouwden we wat we misten.
          </p>
        </SectionReveal>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
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
              className="group bg-white rounded-2xl p-8 border border-black/[0.05] hover:border-flame/20 transition-all duration-300 hover:shadow-lg hover:shadow-flame/[0.04] hover:-translate-y-[2px]"
              style={{ boxShadow: '0 1px 3px rgba(100,80,40,0.04)' }}
            >
              <div className="mb-5">{prop.icon}</div>
              <h3 className="font-heading text-xl text-petrol mb-2 tracking-tight">
                {prop.headline}
              </h3>
              <p className="text-muted text-sm leading-relaxed">
                {prop.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
