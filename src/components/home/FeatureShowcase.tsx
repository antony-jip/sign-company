'use client'

import { motion } from 'framer-motion'
import SectionReveal from '../SectionReveal'

const features = [
  {
    module: 'Planning',
    headline: 'Wie doet wat, wanneer, waar.',
    status: 'gepland.',
    description: 'Drag-and-drop planbord, gekoppeld aan projecten, zichtbaar voor je hele team. Je monteur weet precies waar hij wanneer moet zijn.',
    color: '#9A5A48',
    lightBg: '#F2E8E5',
  },
  {
    module: 'Werkbonnen',
    headline: 'Digitaal. Op locatie. Getekend.',
    status: 'getekend.',
    description: 'Geen papieren werkbonnen meer die kwijtraken in het busje. Foto\'s erbij, handtekening van de klant, alles digitaal vastgelegd.',
    color: '#C44830',
    lightBg: '#FAE5E0',
  },
  {
    module: 'Klantportaal',
    headline: 'Je klant ziet wat hij moet zien.',
    status: 'goedgekeurd.',
    description: 'Een eigen portaal voor je klant. Projectstatus, facturen, goedkeuringen — alles transparant. Minder bellen, meer vertrouwen.',
    color: '#3A6B8C',
    lightBg: '#E5ECF6',
  },
  {
    module: 'Offertes',
    headline: 'Professionele offertes in minuten.',
    status: 'verstuurd.',
    description: 'Sjablonen, herbruikbare producten, digitale handtekening. Je klant ontvangt een offerte waar je trots op bent — in minuten, niet uren.',
    color: '#F15025',
    lightBg: '#FDE8E2',
  },
  {
    module: 'Facturen',
    headline: 'Verstuurd. Herinnerd. Betaald.',
    status: 'betaald.',
    description: 'Automatische herinneringen, betaalstatus op een rij, directe koppeling met je offertes. Geen factuur valt meer tussen wal en schip.',
    color: '#2D6B48',
    lightBg: '#E4F0EA',
  },
  {
    module: 'Daan AI',
    headline: 'Je slimste collega werkt 24/7.',
    status: 'slim.',
    description: 'Daan AI helpt je met offerteteksten, projectsamenvattingen en slimme suggesties. Geen vervanging — een versterking.',
    color: '#6A5A8A',
    lightBg: '#EEE8F5',
  },
]

export default function FeatureShowcase() {
  return (
    <section className="py-20 md:py-32">
      <div className="container-site">
        <SectionReveal>
          <h2 className="section-heading font-heading text-petrol text-center mb-4">
            Wat zit er in doen<span className="text-flame">.</span>
          </h2>
          <p className="text-muted text-center max-w-lg mx-auto mb-16">
            Zes modules. Alles erin. Geen add-ons.
          </p>
        </SectionReveal>

        <div className="space-y-6">
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
              className={`group relative overflow-hidden rounded-2xl border border-black/[0.05] bg-white ${
                i % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'
              } flex flex-col md:flex md:items-center gap-8 p-8 md:p-10`}
              style={{ boxShadow: '0 1px 3px rgba(100,80,40,0.04)' }}
            >
              {/* Left accent bar */}
              <div
                className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl"
                style={{ backgroundColor: feature.color }}
              />

              {/* Content */}
              <div className="flex-1 pl-4">
                <div className="flex items-center gap-2 mb-3">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: feature.color }}
                  />
                  <span className="font-mono text-[10px] uppercase tracking-[0.1em] font-bold" style={{ color: feature.color }}>
                    {feature.module}
                  </span>
                </div>
                <h3 className="font-heading text-2xl md:text-3xl text-petrol tracking-tight mb-3">
                  {feature.headline}
                </h3>
                <p className="text-muted leading-relaxed mb-4 max-w-md">
                  {feature.description}
                </p>
                <span
                  className="inline-block font-mono text-xs font-bold px-2.5 py-1 rounded-full"
                  style={{ backgroundColor: feature.lightBg, color: feature.color }}
                >
                  {feature.status.slice(0, -1)}
                  <span className="text-flame">.</span>
                </span>
              </div>

              {/* Visual: Module preview card */}
              <div className="flex-1 flex justify-center">
                <div
                  className="w-full max-w-sm aspect-[4/3] rounded-xl border border-black/[0.03] flex items-center justify-center relative overflow-hidden"
                  style={{ background: `linear-gradient(160deg, ${feature.lightBg} 0%, ${feature.lightBg}80 100%)` }}
                >
                  {/* Abstract module illustration */}
                  <div className="text-center px-6">
                    <div
                      className="w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center"
                      style={{ backgroundColor: feature.color + '15' }}
                    >
                      <div
                        className="w-7 h-7 rounded-lg"
                        style={{ backgroundColor: feature.color + '30' }}
                      />
                    </div>
                    <p className="font-mono text-xs font-medium" style={{ color: feature.color + '60' }}>
                      {feature.module}
                    </p>
                  </div>

                  {/* Decorative elements */}
                  <div
                    className="absolute top-3 right-3 w-8 h-8 rounded-full opacity-10"
                    style={{ backgroundColor: feature.color }}
                  />
                  <div
                    className="absolute bottom-4 left-4 w-12 h-2 rounded-full opacity-10"
                    style={{ backgroundColor: feature.color }}
                  />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
