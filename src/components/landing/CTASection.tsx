'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import { Button } from '@/components/ui/Button';

export default function CTASection() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });

  const y1 = useTransform(scrollYProgress, [0, 1], [40, -40]);
  const y2 = useTransform(scrollYProgress, [0, 1], [60, -20]);
  const opacity = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [0.3, 1, 1, 0.3]);

  return (
    <section ref={ref} className="relative bg-mesh-cta-dramatic overflow-hidden" style={{ paddingTop: 180, paddingBottom: 180 }}>
      {/* Noise overlay */}
      <div className="noise-overlay absolute inset-0 pointer-events-none" />

      {/* Parallax ambient glows */}
      <motion.div
        className="absolute top-[10%] left-[5%] w-[400px] h-[400px] rounded-full pointer-events-none"
        style={{ y: y1, opacity, background: 'radial-gradient(circle, rgba(232,169,144,0.15), transparent 70%)', filter: 'blur(80px)' }}
      />
      <motion.div
        className="absolute bottom-[10%] right-[10%] w-[350px] h-[350px] rounded-full pointer-events-none"
        style={{ y: y2, opacity, background: 'radial-gradient(circle, rgba(164,139,191,0.12), transparent 70%)', filter: 'blur(80px)' }}
      />

      <div className="container relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          {/* Left — text */}
          <motion.div
            className="lg:col-span-7"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <h2
              className="font-heading text-ink leading-tight mb-6"
              style={{ fontSize: 'clamp(40px, 6vw, 80px)', fontWeight: 900, letterSpacing: '-4px', lineHeight: 0.9 }}
            >
              Klaar om<br />
              te <span className="text-ember-gradient">smeden</span>?
            </h2>
            <p className="text-[18px] leading-[1.7] text-ink-60 mb-10 max-w-[440px]">
              Probeer FORGEdesk 30 dagen gratis. Geen creditcard, geen contract. Gewoon beginnen.
            </p>
            <div className="flex flex-col sm:flex-row items-start gap-4">
              <motion.div
                whileHover={{ scale: 1.04, y: -2 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              >
                <Button variant="ink" size="lg" href="https://app.forgedesk.io">
                  Probeer 30 dagen gratis &rarr;
                </Button>
              </motion.div>
              <a href="mailto:info@forgedesk.io" className="link-hover inline-flex items-center gap-2 px-4 py-4 text-sm font-semibold text-ink-40 hover:text-ink transition-colors duration-300">
                Of neem contact op
              </a>
            </div>
          </motion.div>

          {/* Right — big decorative number */}
          <motion.div
            className="lg:col-span-5 hidden lg:flex items-center justify-center"
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
          >
            <div className="relative select-none" aria-hidden="true">
              <span
                className="font-heading font-black text-ink-05"
                style={{ fontSize: 'clamp(120px, 18vw, 240px)', lineHeight: 0.8, letterSpacing: '-8px' }}
              >
                30
              </span>
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 font-mono text-[13px] text-ink-20 tracking-[0.15em] uppercase whitespace-nowrap">
                dagen gratis
              </span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
