'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';

const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', damping: 25, stiffness: 120 },
  },
};

const priceCard = {
  hidden: { opacity: 0, y: 24, scale: 0.96 },
  visible: (delay: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring', damping: 22, stiffness: 110, delay },
  }),
};

export default function PricingTeaser() {
  return (
    <section className="relative bg-mesh-hero overflow-hidden" style={{ paddingTop: 100, paddingBottom: 100 }}>
      <div className="container max-w-[700px] text-center">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={fadeUp}
        >
          <p className="font-mono text-[12px] font-medium text-ink-40 uppercase tracking-[0.06em] mb-4">
            Pricing
          </p>
          <h2 className="font-heading section-heading text-ink mb-6">
            Eén prijs. Alles erin.
          </h2>
        </motion.div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-8">
          <motion.div
            className="rounded-2xl border border-ink-10 bg-white px-8 py-6 text-center min-w-[200px]"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            custom={0.15}
            variants={priceCard}
            whileHover={{ y: -4, transition: { type: 'spring', stiffness: 300, damping: 20 } }}
          >
            <p className="text-[13px] font-bold text-ink-40 uppercase tracking-wide mb-1">Starter</p>
            <div className="flex items-baseline justify-center gap-1">
              <span className="font-heading text-ink" style={{ fontSize: 40, fontWeight: 900, letterSpacing: '-1px', lineHeight: 1 }}>
                &euro;49
              </span>
              <span className="text-ink-40 text-[15px]">/maand</span>
            </div>
            <p className="text-[13px] text-ink-40 mt-1">Tot 3 gebruikers</p>
          </motion.div>

          <motion.div
            className="rounded-2xl border border-ink-20 bg-white px-8 py-6 text-center min-w-[200px] shadow-lg relative"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            custom={0.25}
            variants={priceCard}
            whileHover={{ y: -6, scale: 1.02, transition: { type: 'spring', stiffness: 300, damping: 20 } }}
          >
            <motion.span
              className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-ink text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full"
              initial={{ scale: 0 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true }}
              transition={{ type: 'spring', stiffness: 400, damping: 15, delay: 0.5 }}
            >
              Populair
            </motion.span>
            <p className="text-[13px] font-bold text-ink-40 uppercase tracking-wide mb-1">Team</p>
            <div className="flex items-baseline justify-center gap-1">
              <span className="font-heading text-ink" style={{ fontSize: 40, fontWeight: 900, letterSpacing: '-1px', lineHeight: 1 }}>
                &euro;69
              </span>
              <span className="text-ink-40 text-[15px]">/maand</span>
            </div>
            <p className="text-[13px] text-ink-40 mt-1">Onbeperkt gebruikers</p>
          </motion.div>
        </div>

        <motion.p
          className="text-[15px] text-ink-60 mb-6"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4, duration: 0.6 }}
        >
          Geen kosten per gebruiker. Geen verborgen modules. 30 dagen gratis proberen.
        </motion.p>

        <motion.div
          className="flex flex-col sm:flex-row items-center justify-center gap-3"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ type: 'spring', damping: 25, stiffness: 120, delay: 0.5 }}
        >
          <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.98 }}>
            <Button variant="ink" href="https://app.forgedesk.io">
              Start 30 dagen gratis &rarr;
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.98 }}>
            <Button variant="soft" href="/pricing">
              Bekijk alle details
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
