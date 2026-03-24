'use client'

import { motion } from 'framer-motion'

const steps = [
  {
    time: '07:00',
    title: 'Nieuwe aanvraag binnen',
    description: 'Je maakt een offerte in 5 minuten. Sjabloon kiezen, prijzen aanpassen, versturen.',
    status: 'verstuurd.',
  },
  {
    time: '09:00',
    title: 'Klant akkoord',
    description: 'Een klik: project aangemaakt. Alle gegevens overgenomen. Werkbon klaarstaan.',
    status: 'akkoord.',
  },
  {
    time: '12:00',
    title: 'Montage op locatie',
    description: 'Je monteur ziet alles op z\'n telefoon. Adres, specificaties, contactpersoon. Geen belletjes nodig.',
    status: 'gepland.',
  },
  {
    time: '16:00',
    title: 'Werkbon getekend',
    description: 'Foto\'s erbij, handtekening van de klant, alles digitaal vastgelegd. Klaar.',
    status: 'getekend.',
  },
  {
    time: '17:00',
    title: 'Factuur verstuurd',
    description: 'Automatisch gegenereerd vanuit de werkbon. Eén klik en je klant heeft \'m in z\'n mail.',
    status: 'verstuurd.',
  },
]

export default function DayScroll() {
  return (
    <section className="py-20 md:py-32 bg-white/50">
      <div className="container-site">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="section-heading font-heading text-petrol mb-4">
            Wat zou jij doen met 2 uur extra per dag?
          </h2>
          <p className="text-muted max-w-lg mx-auto">
            Een doorsnee werkdag met doen<span className="text-flame">.</span> — van eerste aanvraag tot betaalde factuur.
          </p>
        </motion.div>

        <div className="relative max-w-2xl mx-auto">
          {/* Timeline line */}
          <div className="absolute left-[27px] md:left-[39px] top-0 bottom-0 w-[2px] bg-gradient-to-b from-flame/20 via-petrol/20 to-petrol/5" />

          {steps.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{
                duration: 0.6,
                delay: i * 0.1,
                ease: [0.16, 1, 0.3, 1],
              }}
              viewport={{ once: true, margin: '-60px' }}
              className="relative flex gap-5 md:gap-8 mb-10 last:mb-0"
            >
              {/* Time dot */}
              <div className="flex flex-col items-center shrink-0">
                <div className="w-14 md:w-20 h-8 flex items-center justify-center">
                  <span className="font-mono text-xs md:text-sm font-medium text-petrol">
                    {step.time}
                  </span>
                </div>
                <div className="w-3 h-3 rounded-full bg-flame mt-1 shrink-0 relative z-10" />
              </div>

              {/* Content */}
              <div className="bg-white rounded-xl p-6 border border-ink/[0.04] flex-1 mt-1">
                <h3 className="font-heading text-lg text-petrol tracking-tight mb-1">
                  {step.title}
                </h3>
                <p className="text-muted text-sm leading-relaxed mb-3">
                  {step.description}
                </p>
                <span className="font-mono text-xs text-ink/60">
                  {step.status.slice(0, -1)}<span className="text-flame">.</span>
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
