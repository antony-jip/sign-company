'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';

export default function CTASection() {
  return (
    <section className="relative bg-bg border-t border-ink-10" style={{ paddingTop: 140, paddingBottom: 140 }}>
      <div className="container relative z-10 text-center">
        <motion.div
          className="max-w-[650px] mx-auto"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <h2
            className="font-heading text-ink leading-tight mb-6"
            style={{ fontSize: 'clamp(36px, 5vw, 64px)', fontWeight: 900, letterSpacing: '-3px', lineHeight: 0.95 }}
          >
            Klaar om te smeden?
          </h2>
          <p className="text-[18px] leading-[1.7] text-ink-60 mb-10 max-w-[440px] mx-auto">
            Probeer FORGEdesk 30 dagen gratis. Geen creditcard, geen contract. Gewoon beginnen.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.98 }}>
              <Button variant="ink" size="lg" href="https://app.forgedesk.io">
                Probeer 30 dagen gratis &rarr;
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.98 }}>
              <a href="mailto:info@forgedesk.io" className="inline-flex items-center gap-2 px-7 py-4 text-sm font-semibold text-ink-40 hover:text-ink transition-colors">
                Of neem contact op &rarr;
              </a>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
