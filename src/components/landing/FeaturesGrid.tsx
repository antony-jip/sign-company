'use client';

import { motion } from 'framer-motion';

/* ── Feature data ──────────────────────────────────────────────── */

const categories = [
  {
    number: '01',
    title: 'Verkoop &\nfacturatie',
    description: 'Van offerte tot betaling — automatisch, met marge-inzicht. PDF met je eigen huisstijl, betaallinks voor je klant, UBL voor je boekhouder.',
    features: ['Offertes met marge-inzicht', 'Facturen in één klik', 'PDF & UBL-export', 'Online betaallinks'],
    accent: 'blush',
    accentColor: 'text-blush-vivid',
    dotColor: 'bg-blush-vivid',
  },
  {
    number: '02',
    title: 'Projecten &\nplanning',
    description: "Wie doet wat, wanneer. Werkbonnen op locatie invullen met foto's en uren. E-mail automatisch gekoppeld aan je project.",
    features: ['Werkbonnen op locatie', 'Planning & agenda', 'Projecten met marge', 'E-mail in je projecten'],
    accent: 'sage',
    accentColor: 'text-sage-vivid',
    dotColor: 'bg-sage-vivid',
  },
  {
    number: '03',
    title: 'Slim &\nuniek',
    description: 'AI die signing visualiseert voor je klant. Een assistent die teksten schrijft. Een klantportaal waar je klant zelf inlogt.',
    features: ['Sign Visualiser', 'AI-assistent Forgie', 'Klantportaal', 'Onbeperkte opslag'],
    accent: 'lavender',
    accentColor: 'text-lavender-vivid',
    dotColor: 'bg-lavender-vivid',
  },
];

/* ── Animation variants ────────────────────────────────────────── */

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, damping: 25, stiffness: 100 },
  },
};

/* ── Component ─────────────────────────────────────────────────── */

export default function FeaturesGrid() {
  return (
    <section className="relative bg-bg" style={{ paddingTop: 140, paddingBottom: 140 }}>
      <div className="container relative z-10">
        {/* Section header — editorial, left-aligned */}
        <motion.div
          className="mb-24 max-w-[600px]"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={fadeUp}
        >
          <p className="font-mono text-[11px] tracking-[0.15em] uppercase text-ink-40 mb-4">
            <span className="inline-block w-8 h-px bg-ink-20 mr-3 align-middle" />
            Alles inbegrepen
          </p>
          <h2 className="font-heading section-heading text-ink mb-5">
            Eén prijs.<br />Alles erin.
          </h2>
          <p className="text-[18px] leading-[1.7] text-ink-60">
            Geen losse modules. Geen verborgen kosten. Vanaf &euro;49 per maand heb je alles wat je nodig hebt.
          </p>
        </motion.div>

        {/* Feature rows — editorial, alternating */}
        <div className="space-y-0">
          {categories.map((cat, i) => (
            <motion.div
              key={cat.number}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 border-t border-ink-10 items-start"
              style={{ paddingTop: 60, paddingBottom: 60 }}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              variants={fadeUp}
            >
              {/* Number */}
              <div className="lg:col-span-1">
                <span className={`font-mono text-[13px] font-bold ${cat.accentColor}`}>
                  {cat.number}
                </span>
              </div>

              {/* Title — large, raw */}
              <div className="lg:col-span-4">
                <h3
                  className="font-heading text-ink leading-none whitespace-pre-line"
                  style={{ fontSize: 'clamp(28px, 3vw, 40px)', fontWeight: 900, letterSpacing: '-1.5px' }}
                >
                  {cat.title}
                </h3>
              </div>

              {/* Description + features */}
              <div className="lg:col-span-7">
                <p className="text-[16px] leading-[1.7] text-ink-60 mb-6 max-w-[460px]">
                  {cat.description}
                </p>
                <div className="flex flex-wrap gap-3">
                  {cat.features.map((feature) => (
                    <span
                      key={feature}
                      className="inline-flex items-center gap-2 text-[13px] font-medium text-ink-60 bg-ink-05 rounded-full px-4 py-1.5"
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${cat.dotColor}`} />
                      {feature}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
