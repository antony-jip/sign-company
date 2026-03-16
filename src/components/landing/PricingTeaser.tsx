'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';

const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, damping: 25, stiffness: 100 },
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
      <div className="container max-w-[800px]">
        {/* Header */}
        <motion.div
          className="text-center mb-16"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={fadeUp}
        >
          <p className="font-mono text-[11px] tracking-[0.15em] uppercase text-ink-40 mb-4">
            <span className="inline-block w-8 h-px bg-ink-20 mr-3 align-middle" />
            Pricing
            <span className="inline-block w-8 h-px bg-ink-20 ml-3 align-middle" />
          </p>
          <h2
            className="font-heading text-ink leading-tight mb-4"
            style={{ fontSize: 'clamp(32px, 4vw, 52px)', fontWeight: 900, letterSpacing: '-2px' }}
          >
            Eén prijs. Alles erin.
          </h2>
          <p className="text-[16px] text-ink-40">
            Geen kosten per gebruiker. Geen verborgen modules. 30 dagen gratis.
          </p>
        </motion.div>

        {/* Pricing cards side by side */}
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-12"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
        >
          {/* Starter */}
          <motion.div
            className="rounded-2xl border border-ink-10 bg-white p-8"
            variants={fadeUp}
            whileHover={{ y: -4, transition: { type: 'spring' as const, stiffness: 300, damping: 20 } }}
          >
            <p className="font-mono text-[11px] tracking-[0.12em] uppercase text-ink-40 mb-4">Starter</p>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="font-heading text-ink font-black tracking-tight" style={{ fontSize: 52, lineHeight: 1 }}>
                &euro;49
              </span>
              <span className="text-ink-40 text-[15px]">/maand</span>
            </div>
            <p className="text-[14px] text-ink-40 mb-6">Tot 3 gebruikers</p>
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.98 }}>
              <Button variant="soft" href="https://app.forgedesk.io">
                Start gratis &rarr;
              </Button>
            </motion.div>
          </motion.div>

          {/* Team */}
          <motion.div
            className="rounded-2xl border-2 border-ink bg-white p-8 relative"
            variants={fadeUp}
            whileHover={{ y: -4, transition: { type: 'spring' as const, stiffness: 300, damping: 20 } }}
          >
            <motion.span
              className="absolute -top-3 left-8 bg-ink text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full"
              initial={{ scale: 0 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true }}
              transition={{ type: 'spring' as const, stiffness: 400, damping: 15, delay: 0.4 }}
            >
              Populair
            </motion.span>
            <p className="font-mono text-[11px] tracking-[0.12em] uppercase text-ink-40 mb-4">Team</p>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="font-heading text-ink font-black tracking-tight" style={{ fontSize: 52, lineHeight: 1 }}>
                &euro;69
              </span>
              <span className="text-ink-40 text-[15px]">/maand</span>
            </div>
            <p className="text-[14px] text-ink-40 mb-6">Onbeperkt gebruikers</p>
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.98 }}>
              <Button variant="ink" href="https://app.forgedesk.io">
                Start gratis &rarr;
              </Button>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* What's included — compact grid */}
        <motion.div
          className="border-t border-ink-10 pt-10"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3, duration: 0.6 }}
        >
          <p className="font-mono text-[11px] tracking-[0.15em] uppercase text-ink-40 mb-5 text-center">
            Alles inbegrepen bij beide plannen
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-3 max-w-[600px] mx-auto">
            {included.map((item) => (
              <div key={item} className="flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="text-sage-vivid shrink-0">
                  <path d="M4 8l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="text-[13px] text-ink-60">{item}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
