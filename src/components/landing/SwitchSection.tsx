'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';

const sources = [
  { name: 'James Pro', note: 'Export klanten, projecten, offertes' },
  { name: 'Gripp', note: 'Export draaien, bestand uploaden' },
  { name: 'Excel / CSV', note: 'Spreadsheets direct importeren' },
];

const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, damping: 25, stiffness: 100 },
  },
};

export default function SwitchSection() {
  return (
    <section className="relative bg-bg border-t border-ink-10" style={{ paddingTop: 100, paddingBottom: 100 }}>
      <div className="container">
        <motion.div
          className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={fadeUp}
        >
          {/* Left — text */}
          <div className="lg:col-span-5">
            <p className="font-mono text-[11px] tracking-[0.15em] uppercase text-ink-40 mb-4">
              <span className="inline-block w-8 h-px bg-ink-20 mr-3 align-middle" />
              Overstappen
            </p>
            <h2
              className="font-heading text-ink leading-tight mb-5"
              style={{ fontSize: 'clamp(28px, 3vw, 40px)', fontWeight: 900, letterSpacing: '-1.5px' }}
            >
              Je data meenemen?<br />Geregeld.
            </h2>
            <p className="text-[16px] leading-[1.7] text-ink-60 mb-8 max-w-[380px]">
              Of je nu van James Pro, Gripp of Excel komt. Import in minuten, niet in dagen.
            </p>
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.98 }}>
              <Button variant="ink" href="https://app.forgedesk.io">
                Probeer 30 dagen gratis &rarr;
              </Button>
            </motion.div>
          </div>

          {/* Right — sources list */}
          <div className="lg:col-span-7">
            <div className="space-y-0">
              {sources.map((source, i) => (
                <motion.div
                  key={source.name}
                  className="flex items-center justify-between py-5 border-b border-ink-10"
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ type: 'spring' as const, damping: 25, stiffness: 120, delay: 0.1 + i * 0.08 }}
                >
                  <div className="flex items-center gap-4">
                    <span className="font-mono text-[12px] text-ink-20 w-6">{String(i + 1).padStart(2, '0')}</span>
                    <span className="text-[17px] font-bold text-ink">{source.name}</span>
                  </div>
                  <span className="text-[14px] text-ink-40 hidden sm:block">{source.note}</span>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-ink-20 sm:hidden">
                    <path d="M7 5l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
