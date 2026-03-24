'use client'

import { motion } from 'framer-motion'
import SectionReveal from '../SectionReveal'

const testimonials = [
  {
    quote: 'Ik besteedde mijn avonden aan offertes typen. Nu doe ik dat in m\'n lunchpauze en heb ik mijn avonden terug.',
    name: 'Marco de Vries',
    company: 'SignWorks Rotterdam',
  },
  {
    quote: 'Eindelijk software die snapt hoe een signbedrijf werkt. Geen overkill, geen gedoe. Precies wat we nodig hadden.',
    name: 'Linda Bakker',
    company: 'Bakker Reclame',
  },
  {
    quote: 'Mijn monteurs zien alles op hun telefoon. Geen papieren werkbonnen meer die kwijtraken in het busje.',
    name: 'Jeroen Smit',
    company: 'Smit Signs & Wrapping',
  },
]

export default function SocialProof() {
  return (
    <section className="py-20 md:py-32">
      <div className="container-site">
        <SectionReveal>
          <h2 className="section-heading font-heading text-petrol text-center mb-16">
            Klanten die het gewoon doen<span className="text-flame">.</span>
          </h2>
        </SectionReveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <motion.blockquote
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.6,
                delay: i * 0.15,
                ease: [0.16, 1, 0.3, 1],
              }}
              viewport={{ once: true, margin: '-60px' }}
              className="bg-white rounded-2xl p-8 border border-ink/[0.04]"
            >
              <p className="text-ink/80 leading-relaxed mb-6 text-[15px]">
                &ldquo;{t.quote}&rdquo;
              </p>
              <footer>
                <p className="font-semibold text-sm text-petrol">{t.name}</p>
                <p className="text-xs text-muted">{t.company}</p>
              </footer>
            </blockquote>
          ))}
        </div>
      </div>
    </section>
  )
}
