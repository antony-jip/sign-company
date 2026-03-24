'use client'

import { motion } from 'framer-motion'
import SectionReveal from '../SectionReveal'

const features = [
  {
    headline: 'Van eerste contact tot oplevering.',
    status: 'opgeleverd.',
    description: 'Elk project van A tot Z op een plek. Notities, documenten, foto\'s, communicatie. Nooit meer zoeken in je mail of WhatsApp.',
    color: 'petrol' as const,
  },
  {
    headline: 'Professionele offertes in minuten.',
    status: 'verstuurd.',
    description: 'Sjablonen, herbruikbare producten, digitale handtekening. Je klant ontvangt een offerte waar je trots op bent — in minuten, niet uren.',
    color: 'flame' as const,
  },
  {
    headline: 'Verstuurd. Herinnerd. Betaald.',
    status: 'betaald.',
    description: 'Automatische herinneringen, betaalstatus op een rij, directe koppeling met je offertes. Geen factuur valt meer tussen wal en schip.',
    color: 'petrol' as const,
  },
  {
    headline: 'Wie doet wat, wanneer, waar.',
    status: 'gepland.',
    description: 'Drag-and-drop planning, koppeling met projecten, zichtbaar voor je hele team. Je monteur weet precies waar hij moet zijn.',
    color: 'flame' as const,
  },
  {
    headline: 'Je klant ziet wat hij moet zien.',
    status: 'goedgekeurd.',
    description: 'Een eigen portaal voor je klant. Projectstatus, facturen, goedkeuringen — alles transparant. Minder bellen, meer vertrouwen.',
    color: 'petrol' as const,
  },
  {
    headline: 'Je slimste collega werkt 24/7.',
    status: 'slim.',
    description: 'Daan AI helpt je met offerteteksten, projectsamenvattingen en slimme suggesties. Geen vervanging — een versterking.',
    color: 'flame' as const,
  },
]

const moduleNames = ['Projecten', 'Offertes', 'Facturen', 'Planning', 'Klantportaal', 'Daan AI']

export default function FeatureShowcase() {
  return (
    <section className="py-20 md:py-32">
      <div className="container-site">
        <SectionReveal>
          <h2 className="section-heading font-heading text-petrol text-center mb-4">
            Wat zit er in doen<span className="text-flame">.</span>
          </h2>
          <p className="text-muted text-center max-w-lg mx-auto mb-16">
            Zes modules. Een systeem. Alles verbonden.
          </p>
        </SectionReveal>

        <div className="space-y-8">
          {features.map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.7,
                ease: [0.16, 1, 0.3, 1],
              }}
              viewport={{ once: true, margin: '-80px' }}
              className={`group relative overflow-hidden rounded-2xl border border-ink/[0.04] bg-white p-8 md:p-12 ${
                i % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'
              } flex flex-col md:flex md:items-center gap-8`}
            >
              {/* Content */}
              <div className="flex-1">
                <span className="inline-block font-mono text-xs text-muted/50 uppercase tracking-widest mb-3">
                  {moduleNames[i]}
                </span>
                <h3 className="font-heading text-2xl md:text-3xl text-petrol tracking-tight mb-3">
                  {feature.headline}
                </h3>
                <p className="text-muted leading-relaxed mb-4 max-w-md">
                  {feature.description}
                </p>
                <span className="inline-block font-mono text-sm font-medium text-ink/80">
                  {feature.status.slice(0, -1)}
                  <span className="text-flame">.</span>
                </span>
              </div>

              {/* Visual placeholder — abstract module illustration */}
              <div className="flex-1 flex justify-center">
                <div
                  className={`w-full max-w-sm aspect-[4/3] rounded-xl ${
                    feature.color === 'flame'
                      ? 'bg-gradient-to-br from-flame/[0.06] to-flame/[0.02]'
                      : 'bg-gradient-to-br from-petrol/[0.06] to-petrol/[0.02]'
                  } border border-ink/[0.03] flex items-center justify-center`}
                >
                  <div className="text-center px-6">
                    <div
                      className={`w-12 h-12 rounded-lg mx-auto mb-3 ${
                        feature.color === 'flame' ? 'bg-flame/10' : 'bg-petrol/10'
                      } flex items-center justify-center`}
                    >
                      <div
                        className={`w-5 h-5 rounded ${
                          feature.color === 'flame' ? 'bg-flame/30' : 'bg-petrol/30'
                        }`}
                      />
                    </div>
                    <p className="font-mono text-xs text-muted/40">{moduleNames[i]}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
