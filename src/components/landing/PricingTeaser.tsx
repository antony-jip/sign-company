'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import { Button } from '@/components/ui/Button';
import AnimatedCounter from '@/components/landing/AnimatedCounter';

export default function PricingTeaser() {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start'],
  });

  const meshY = useTransform(scrollYProgress, [0, 1], [30, -30]);

  return (
    <section ref={sectionRef} className="relative bg-bg overflow-hidden" style={{ paddingTop: 140, paddingBottom: 140 }}>
      {/* Mesh background with parallax */}
      <motion.div className="bg-mesh-pricing absolute inset-0 pointer-events-none" style={{ y: meshY }} />

      <div className="container relative z-10 max-w-[900px]">
        {/* Overline */}
        <motion.p
          className="font-mono text-[11px] tracking-[0.15em] uppercase text-ink-40 mb-6 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <span className="inline-block w-8 h-px bg-ink-20 mr-3 align-middle" />
          Pricing
          <span className="inline-block w-8 h-px bg-ink-20 ml-3 align-middle" />
        </motion.p>

        {/* Heading */}
        <motion.h2
          className="font-heading text-ink text-center mb-4"
          style={{ fontSize: 'clamp(32px, 4vw, 52px)', fontWeight: 900, letterSpacing: '-2px', lineHeight: 0.95 }}
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
        >
          Twee plannen. Geen verrassingen.
        </motion.h2>

        <motion.p
          className="text-[16px] text-ink-40 text-center mb-16 max-w-[400px] mx-auto"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
        >
          Alles inbegrepen. Geen verborgen modules.
        </motion.p>

        {/* Two cards side by side */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Starter */}
          <motion.div
            className="rounded-[20px] border border-ink-10 bg-white elevation-2 card-lift"
            style={{ padding: 40 }}
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
          >
            <p className="font-mono text-[11px] tracking-[0.12em] uppercase text-ink-40 mb-5">Starter</p>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="font-heading text-ink font-black tracking-tight" style={{ fontSize: 'clamp(48px, 6vw, 64px)', lineHeight: 0.9, letterSpacing: '-3px' }}>
                &euro;<AnimatedCounter target={49} className="font-heading" duration={1200} />
              </span>
              <span className="text-ink-40 text-[17px] font-medium">/maand</span>
            </div>
            <p className="text-[15px] text-ink-60 mb-8">Tot 3 gebruikers</p>
            <p className="text-[14px] leading-[1.8] text-ink-40 mb-8">
              Alles wat je nodig hebt: offertes, werkbonnen, facturen, klantportaal, planning en AI.
            </p>
            <motion.div
              whileHover={{ scale: 1.04, y: -2 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            >
              <Button variant="soft" size="lg" href="https://app.forgedesk.io" className="w-full justify-center">
                Probeer 30 dagen gratis &rarr;
              </Button>
            </motion.div>
          </motion.div>

          {/* Team — popular, elevated */}
          <motion.div
            className="rounded-[20px] border-2 border-ink bg-white relative elevation-3 card-lift popular-glow"
            style={{ padding: 40 }}
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.4 }}
          >
            <motion.span
              className="absolute -top-3 left-8 bg-ink text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full"
              initial={{ scale: 0 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true }}
              transition={{ type: 'spring', stiffness: 400, damping: 15, delay: 0.6 }}
            >
              Populair
            </motion.span>
            <p className="font-mono text-[11px] tracking-[0.12em] uppercase text-ink-40 mb-5">Team</p>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="font-heading text-ink font-black tracking-tight" style={{ fontSize: 'clamp(48px, 6vw, 64px)', lineHeight: 0.9, letterSpacing: '-3px' }}>
                &euro;<AnimatedCounter target={69} className="font-heading" duration={1200} />
              </span>
              <span className="text-ink-40 text-[17px] font-medium">/maand</span>
            </div>
            <p className="text-[15px] text-ink-60 mb-8">Onbeperkt gebruikers</p>
            <p className="text-[14px] leading-[1.8] text-ink-40 mb-8">
              Voor teams die groeien. Dezelfde features, zonder limiet op gebruikers.
            </p>
            <motion.div
              whileHover={{ scale: 1.04, y: -2 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            >
              <Button variant="ink" size="lg" href="https://app.forgedesk.io" className="w-full justify-center">
                Probeer 30 dagen gratis &rarr;
              </Button>
            </motion.div>
          </motion.div>
        </div>

        {/* Bottom note */}
        <motion.p
          className="text-[13px] text-ink-40 text-center mt-8"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.5 }}
        >
          Geen creditcard nodig &middot; Maandelijks opzegbaar
        </motion.p>
      </div>
    </section>
  );
}
