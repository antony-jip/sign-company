'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import AnimatedCounter from '@/components/landing/AnimatedCounter';

export default function PricingTeaser() {
  return (
    <section className="relative bg-bg" style={{ paddingTop: 140, paddingBottom: 140 }}>
      {/* Mesh background */}
      <div className="bg-mesh-pricing absolute inset-0 pointer-events-none" />

      <div className="container relative z-10 max-w-[800px] text-center">
        {/* Overline */}
        <motion.p
          className="font-mono text-[11px] tracking-[0.15em] uppercase text-ink-40 mb-6"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <span className="inline-block w-8 h-px bg-ink-20 mr-3 align-middle" />
          Pricing
          <span className="inline-block w-8 h-px bg-ink-20 ml-3 align-middle" />
        </motion.p>

        {/* Price — massive */}
        <motion.div
          className="mb-6"
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
        >
          <div className="flex items-baseline justify-center gap-3">
            <span className="font-heading text-ink font-black tracking-tight" style={{ fontSize: 'clamp(64px, 10vw, 120px)', lineHeight: 0.9, letterSpacing: '-4px' }}>
              &euro;<AnimatedCounter target={49} className="font-heading" duration={1200} />
            </span>
            <span className="text-ink-40 text-[20px] font-medium">/maand</span>
          </div>
        </motion.div>

        {/* One line */}
        <motion.p
          className="text-[19px] leading-[1.7] text-ink-60 max-w-[560px] mx-auto mb-4"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
        >
          Onbeperkt gebruikers. Geen verborgen kosten.
        </motion.p>

        {/* Feature sentence — no checkmarks */}
        <motion.p
          className="text-[16px] leading-[1.8] text-ink-40 max-w-[520px] mx-auto mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
        >
          Offertes, werkbonnen, facturen, klantportaal, AI, planning. Alles.
        </motion.p>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.4 }}
        >
          <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.98 }} className="inline-block">
            <Button variant="ink" size="lg" href="https://app.forgedesk.io">
              Probeer 30 dagen gratis &rarr;
            </Button>
          </motion.div>
          <p className="text-[13px] text-ink-40 mt-4">
            Geen creditcard nodig &middot; Maandelijks opzegbaar
          </p>
        </motion.div>
      </div>
    </section>
  );
}
