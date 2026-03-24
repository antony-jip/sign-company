'use client'

import { motion } from 'framer-motion'
import SectionReveal from '../SectionReveal'

const props = [
  {
    headline: 'Alles op een plek.',
    description: 'Projecten, offertes, facturen en planning. Geen losse tools meer, geen Excel-chaos. Een systeem dat samenwerkt.',
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <rect x="4" y="4" width="10" height="10" rx="2" className="fill-petrol" />
        <rect x="18" y="4" width="10" height="10" rx="2" className="fill-petrol/60" />
        <rect x="4" y="18" width="10" height="10" rx="2" className="fill-petrol/60" />
        <rect x="18" y="18" width="10" height="10" rx="2" className="fill-flame" />
      </svg>
    ),
  },
  {
    headline: 'Morgen aan de slag.',
    description: 'Geen implementatietraject van weken. Geen cursus. Account aanmaken, gegevens invullen, aan de slag. Zo simpel.',
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <circle cx="16" cy="16" r="12" className="stroke-petrol" strokeWidth="2" fill="none" />
        <path d="M16 8v8l6 4" className="stroke-flame" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    headline: 'Jouw data. Altijd.',
    description: 'Export wanneer je wilt. Geen lock-in, geen gedoe. Jouw bedrijf, jouw gegevens. Wij bewaken ze alleen.',
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <rect x="8" y="14" width="16" height="14" rx="2" className="fill-petrol" />
        <path d="M12 14V10a4 4 0 018 0v4" className="stroke-flame" strokeWidth="2" fill="none" />
      </svg>
    ),
  },
  {
    headline: 'Geen per-user pricing.',
    description: 'Eenvoudig en eerlijk. Vast bedrag per maand, ongeacht hoeveel mensen je team telt. Groei zonder extra kosten.',
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <circle cx="16" cy="16" r="12" className="fill-petrol" />
        <text x="16" y="21" textAnchor="middle" className="fill-white font-mono text-sm font-bold">&#8364;</text>
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
          <p className="text-muted text-center max-w-lg mx-auto mb-16">
            Goed gedaan begint met goed gereedschap.
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
                ease: [0.16, 1, 0.3, 1],
              }}
              viewport={{ once: true, margin: '-60px' }}
              className="group bg-white rounded-2xl p-8 border border-ink/[0.04] hover:border-flame/20 transition-all duration-300 hover:shadow-lg hover:shadow-flame/[0.04]"
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
