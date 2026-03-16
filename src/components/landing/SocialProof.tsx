'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import AnimatedCounter from '@/components/landing/AnimatedCounter';

export default function SocialProof() {
  const [statsActive, setStatsActive] = useState(false);

  return (
    <section className="relative bg-forge-dark overflow-hidden" style={{ paddingTop: 140, paddingBottom: 140 }}>
      {/* Noise overlay */}
      <div className="absolute inset-0 noise-overlay-dark pointer-events-none" />

      <div className="container relative z-10">
        {/* Big quote — the origin story IS the social proof */}
        <motion.div
          className="max-w-[700px] mb-20"
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <p className="font-mono text-[11px] tracking-[0.15em] uppercase text-ink-40 mb-8">
            <span className="inline-block w-8 h-px bg-blush-vivid mr-3 align-middle" />
            Ons verhaal
          </p>
          <blockquote
            className="font-heading text-white/90 leading-tight mb-6"
            style={{ fontSize: 'clamp(28px, 3.5vw, 44px)', fontWeight: 900, letterSpacing: '-1.5px', lineHeight: 1.1 }}
          >
            &ldquo;We zochten software die past bij hoe wij werken. Die was er niet.
            <span className="text-blush-vivid"> Dus bouwden we het zelf.</span>&rdquo;
          </blockquote>
          <p className="text-[15px] text-ink-40 leading-[1.7] max-w-[500px]">
            Gebouwd door een signbedrijf met 40+ jaar ervaring. Niet door een softwarebedrijf dat denkt te weten hoe het werkt.
          </p>
        </motion.div>

        {/* Savings callout — massive */}
        <motion.div
          className="mb-20 text-center"
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
        >
          <p className="font-mono text-[11px] tracking-[0.15em] uppercase text-ink-40 mb-4">
            Bespaar vs James PRO
          </p>
          <p
            className="font-heading text-blush-vivid font-black tracking-tight"
            style={{ fontSize: 'clamp(48px, 8vw, 96px)', lineHeight: 0.9, letterSpacing: '-4px' }}
          >
            &euro;<AnimatedCounter target={5952} className="font-heading" duration={2000} formatNumber />
          </p>
          <p className="text-[17px] text-ink-40 mt-4">
            per jaar bespaard &middot; James PRO &euro;565/mnd vs FORGEdesk &euro;69/mnd
          </p>
        </motion.div>

        {/* Stats — big, raw numbers */}
        <motion.div
          className="grid grid-cols-2 md:grid-cols-4 gap-8 border-t border-ink-20 pt-12"
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
          onViewportEnter={() => setStatsActive(true)}
        >
          {[
            { value: 500, suffix: '+', label: 'Offertes verstuurd' },
            { value: 4, suffix: ' uur', label: 'Per week bespaard' },
            { value: 30, suffix: ' sec', label: 'Factuur aanmaken' },
            { value: 100, suffix: '%', label: 'Nederlandse support' },
          ].map((stat) => (
            <div key={stat.label}>
              <p
                className="font-heading text-white font-black leading-none tracking-tighter"
                style={{ fontSize: 'clamp(36px, 4vw, 56px)' }}
              >
                {statsActive && (
                  <AnimatedCounter target={stat.value} suffix={stat.suffix} duration={1500} />
                )}
                {!statsActive && <>0{stat.suffix}</>}
              </p>
              <p className="text-[12px] text-ink-40 mt-2 font-mono tracking-wide">
                {stat.label}
              </p>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Background glow */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(232,169,144,0.06), transparent 70%)', filter: 'blur(80px)' }} />
    </section>
  );
}
