'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';

const capabilities = [
  {
    number: '01',
    title: 'Verkoop &\nfacturatie',
    body: 'Maak offertes met marge-inzicht in minuten. Eén klik en het is een factuur. PDF met je eigen huisstijl, UBL voor je boekhouder, betaallinks voor je klant. Je weet precies wat je verdient voordat de klant tekent.',
    accent: 'bg-blush-vivid',
    accentText: 'text-blush-vivid',
  },
  {
    number: '02',
    title: 'Projecten &\nplanning',
    body: 'Werkbonnen op locatie invullen met foto\'s en uren. Een planning die je team begrijpt zonder uitleg. Projecten met realtime marge-overzicht. E-mail automatisch gekoppeld aan het juiste project.',
    accent: 'bg-sage-vivid',
    accentText: 'text-sage-vivid',
  },
  {
    number: '03',
    title: 'Slim &\nuniek',
    body: 'Forgie, je AI-assistent, schrijft e-mails en vat gesprekken samen. De Sign Visualiser toont je klant een gevelreclame op hun eigen pand — voordat je begint. Een klantportaal waar ze zelf offertes goedkeuren en facturen bekijken.',
    accent: 'bg-lavender-vivid',
    accentText: 'text-lavender-vivid',
  },
];

export default function FeaturesGrid() {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start'],
  });

  const dotY = useTransform(scrollYProgress, [0, 1], [20, -20]);

  return (
    <section ref={sectionRef} className="relative bg-bg" style={{ paddingTop: 140, paddingBottom: 140 }}>
      {/* Dot grid pattern with parallax */}
      <motion.div className="dot-grid-pattern absolute inset-0" style={{ y: dotY }} />

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

        {/* Capability blocks — editorial with hover interactions */}
        <div className="space-y-0">
          {capabilities.map((cap, i) => (
            <motion.div
              key={cap.number}
              className="group border-t border-ink-10 py-16 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-start cursor-default"
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: i * 0.1 }}
            >
              {/* Number + accent dot */}
              <div className="lg:col-span-2 flex items-center gap-3">
                <span className={`w-2.5 h-2.5 rounded-full ${cap.accent} transition-transform duration-500 ease-out group-hover:scale-[2]`} />
                <span className={`font-mono text-[13px] text-ink-20 transition-colors duration-500 group-hover:${cap.accentText}`}>
                  {cap.number}
                </span>
              </div>

              {/* Title — grows on hover */}
              <div className="lg:col-span-4">
                <h3
                  className="font-heading text-ink leading-none whitespace-pre-line transition-transform duration-500 ease-out origin-left group-hover:translate-x-2"
                  style={{ fontSize: 'clamp(28px, 3.5vw, 44px)', fontWeight: 900, letterSpacing: '-1.5px' }}
                >
                  {cap.title}
                </h3>
              </div>

              {/* Body — narrative prose */}
              <div className="lg:col-span-6">
                <p className="text-[17px] leading-[1.8] text-ink-60 transition-colors duration-500 group-hover:text-ink">
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
