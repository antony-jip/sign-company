'use client';

import { motion } from 'framer-motion';

const capabilities = [
  {
    number: '01',
    title: 'Verkoop &\nfacturatie',
    body: 'Maak offertes met marge-inzicht in minuten. Eén klik en het is een factuur. PDF met je eigen huisstijl, UBL voor je boekhouder, betaallinks voor je klant. Je weet precies wat je verdient voordat de klant tekent.',
    accent: 'bg-blush-vivid',
  },
  {
    number: '02',
    title: 'Projecten &\nplanning',
    body: 'Werkbonnen op locatie invullen met foto\'s en uren. Een planning die je team begrijpt zonder uitleg. Projecten met realtime marge-overzicht. E-mail automatisch gekoppeld aan het juiste project.',
    accent: 'bg-sage-vivid',
  },
  {
    number: '03',
    title: 'Slim &\nuniek',
    body: 'Forgie, je AI-assistent, schrijft e-mails en vat gesprekken samen. De Sign Visualiser toont je klant een gevelreclame op hun eigen pand — voordat je begint. Een klantportaal waar ze zelf offertes goedkeuren en facturen bekijken.',
    accent: 'bg-lavender-vivid',
  },
];

export default function FeaturesGrid() {
  return (
    <section className="relative bg-bg" style={{ paddingTop: 140, paddingBottom: 140 }}>
      {/* Dot grid pattern */}
      <div className="dot-grid-pattern absolute inset-0" />

      <div className="container relative z-10">
        {/* Section header */}
        <motion.div
          className="mb-20"
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <p className="font-mono text-[11px] tracking-[0.15em] uppercase text-ink-40 mb-4">
            <span className="inline-block w-8 h-px bg-ink-20 mr-3 align-middle" />
            Alles inbegrepen
          </p>
          <h2
            className="font-heading text-ink"
            style={{ fontSize: 'clamp(36px, 5vw, 64px)', fontWeight: 900, letterSpacing: '-3px', lineHeight: 0.95 }}
          >
            Alles in &eacute;&eacute;n systeem.
          </h2>
        </motion.div>

        {/* Capability blocks — editorial, no checklists */}
        <div className="space-y-0">
          {capabilities.map((cap, i) => (
            <motion.div
              key={cap.number}
              className="border-t border-ink-10 py-16 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-start"
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: i * 0.1 }}
            >
              {/* Number + accent dot */}
              <div className="lg:col-span-2 flex items-center gap-3">
                <span className={`w-2.5 h-2.5 rounded-full ${cap.accent}`} />
                <span className="font-mono text-[13px] text-ink-20">{cap.number}</span>
              </div>

              {/* Title */}
              <div className="lg:col-span-4">
                <h3
                  className="font-heading text-ink leading-none whitespace-pre-line"
                  style={{ fontSize: 'clamp(28px, 3.5vw, 44px)', fontWeight: 900, letterSpacing: '-1.5px' }}
                >
                  {cap.title}
                </h3>
              </div>

              {/* Body — narrative prose, not a list */}
              <div className="lg:col-span-6">
                <p className="text-[17px] leading-[1.8] text-ink-60">
                  {cap.body}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
