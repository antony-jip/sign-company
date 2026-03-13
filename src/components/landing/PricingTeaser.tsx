'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';

const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', damping: 25, stiffness: 100 },
  },
};

const included = [
  'Onbeperkt offertes & facturen',
  'Werkbonnen op locatie',
  'Planning & agenda',
  'Klantportaal',
  'AI-assistent Forgie',
  'Sign Visualiser',
  'Onbeperkte opslag',
  'Nederlandse support',
];

export default function PricingTeaser() {
  return (
    <section className="relative bg-bg border-t border-ink-10" style={{ paddingTop: 120, paddingBottom: 120 }}>
      <div className="container">
        <motion.div
          className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={fadeUp}
        >
          {/* Left — pricing */}
          <div className="lg:col-span-5">
            <p className="font-mono text-[11px] tracking-[0.15em] uppercase text-ink-40 mb-4">
              <span className="inline-block w-8 h-px bg-ink-20 mr-3 align-middle" />
              Pricing
            </p>
            <h2
              className="font-heading text-ink leading-tight mb-8"
              style={{ fontSize: 'clamp(28px, 3vw, 40px)', fontWeight: 900, letterSpacing: '-1.5px' }}
            >
              Eén prijs.<br />Alles erin.
            </h2>

            {/* Price blocks — raw, no fancy cards */}
            <div className="space-y-6 mb-10">
              <div className="flex items-baseline gap-4">
                <span className="font-heading text-ink font-black tracking-tight" style={{ fontSize: 48, lineHeight: 1 }}>
                  &euro;49
                </span>
                <div>
                  <p className="text-[14px] font-semibold text-ink">/maand &middot; Starter</p>
                  <p className="text-[13px] text-ink-40">Tot 3 gebruikers</p>
                </div>
              </div>

              <div className="flex items-baseline gap-4">
                <span className="font-heading text-ink font-black tracking-tight" style={{ fontSize: 48, lineHeight: 1 }}>
                  &euro;69
                </span>
                <div>
                  <p className="text-[14px] font-semibold text-ink">/maand &middot; Team</p>
                  <p className="text-[13px] text-ink-40">Onbeperkt gebruikers</p>
                </div>
              </div>
            </div>

            <p className="text-[14px] text-ink-40 mb-6">
              Geen kosten per gebruiker. 30 dagen gratis.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.98 }}>
                <Button variant="ink" href="https://app.forgedesk.io">
                  Start gratis &rarr;
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.98 }}>
                <Button variant="soft" href="/pricing">
                  Alle details
                </Button>
              </motion.div>
            </div>
          </div>

          {/* Right — what's included, simple list */}
          <div className="lg:col-span-7 lg:pt-12">
            <p className="font-mono text-[11px] tracking-[0.15em] uppercase text-ink-40 mb-6">
              Alles inbegrepen
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-0">
              {included.map((item, i) => (
                <motion.div
                  key={item}
                  className="flex items-center gap-3 py-3 border-b border-ink-10"
                  initial={{ opacity: 0, x: 12 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ type: 'spring', damping: 25, stiffness: 120, delay: i * 0.04 }}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-sage-vivid shrink-0">
                    <path d="M4 8l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className="text-[14px] text-ink">{item}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
