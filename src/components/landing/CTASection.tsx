'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';

export default function CTASection() {
  return (
    <section className="relative bg-forge-dark overflow-hidden noise-overlay-dark" style={{ paddingTop: 140, paddingBottom: 140 }}>
      <div className="container relative z-10">
        <motion.div
          className="max-w-[650px]"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ type: 'spring', damping: 25, stiffness: 100 }}
        >
          <h2
            className="font-heading text-white leading-tight mb-6"
            style={{ fontSize: 'clamp(36px, 4.5vw, 60px)', fontWeight: 900, letterSpacing: '-2px', lineHeight: 1.0 }}
          >
            Klaar om te{' '}
            <span className="neon-text-glow">smeden</span>?
          </h2>
          <p className="text-[18px] leading-[1.7] text-ink-40 mb-10 max-w-[440px]">
            Probeer FORGEdesk 30 dagen gratis. Geen creditcard, geen contract. Gewoon beginnen.
          </p>
          <div className="flex flex-col sm:flex-row items-start gap-4">
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.98 }}>
              <Button variant="warm" href="https://app.forgedesk.io">
                Start 30 dagen gratis &rarr;
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.98 }}>
              <a href="mailto:info@forgedesk.io" className="inline-flex items-center gap-2 px-7 py-3 text-sm font-semibold text-ink-40 hover:text-white transition-colors">
                Of neem contact op &rarr;
              </a>
            </motion.div>
          </div>
        </motion.div>
      </div>

      {/* Background glow — subtle neon feel */}
      <motion.div
        className="absolute top-1/2 right-0 -translate-y-1/2 w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(232,169,144,0.06), transparent 65%)', filter: 'blur(100px)' }}
        animate={{ scale: [1, 1.15, 1] }}
        transition={{ repeat: Infinity, duration: 6, ease: 'easeInOut' }}
      />
    </section>
  );
}
