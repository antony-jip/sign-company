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

export default function CTASection() {
  return (
    <section className="relative bg-mesh-cta overflow-hidden noise-overlay" style={{ paddingTop: 140, paddingBottom: 140 }}>
      <div className="container relative z-10">
        <motion.div
          className="text-center max-w-[600px] mx-auto"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={fadeUp}
        >
          <h2 className="font-heading section-heading text-ink mb-6 neon-glow">
            Klaar om te <span className="text-ember-gradient">starten</span>?
          </h2>
          <p className="text-[19px] leading-[1.7] text-ink-60 mb-10 max-w-[480px] mx-auto">
            Probeer FORGEdesk 30 dagen gratis. Geen creditcard, geen contract.
          </p>
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          >
            <Button variant="ink" href="https://app.forgedesk.io">
              Start 30 dagen gratis &rarr;
            </Button>
          </motion.div>
        </motion.div>
      </div>

      {/* Animated background glow */}
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(232,169,144,0.08), transparent 70%)', filter: 'blur(80px)' }}
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ repeat: Infinity, duration: 5, ease: 'easeInOut' }}
      />
    </section>
  );
}
