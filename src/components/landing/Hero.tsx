'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import LetterReveal from '@/components/landing/LetterReveal';
import AnimatedCounter from '@/components/landing/AnimatedCounter';

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center bg-forge-dark overflow-hidden">
      {/* Grain texture */}
      <div className="absolute inset-0 noise-overlay-dark pointer-events-none" />

      {/* Ambient glows — subtle, warm */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute rounded-full"
          style={{
            top: '-15%', right: '-10%', width: 700, height: 700,
            background: 'radial-gradient(circle, rgba(232,169,144,0.08), transparent 70%)',
            filter: 'blur(100px)',
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            bottom: '-5%', left: '-8%', width: 500, height: 500,
            background: 'radial-gradient(circle, rgba(125,184,138,0.05), transparent 70%)',
            filter: 'blur(80px)',
          }}
        />
      </div>

      {/* Content */}
      <div className="container relative z-10" style={{ paddingTop: 160, paddingBottom: 120 }}>
        <div className="max-w-[1000px]">
          {/* Overline */}
          <motion.p
            className="font-mono text-[11px] tracking-[0.15em] uppercase text-ink-40 mb-8"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
          >
            <span className="inline-block w-8 h-px bg-blush-vivid mr-3 align-middle" />
            Gebouwd door signmakers, sinds 1983
          </motion.p>

          {/* Main heading — MASSIVE */}
          <h1 className="font-heading hero-heading-redesign text-white mb-10">
            <span className="block">
              <LetterReveal text="Van offerte" delay={0.4} />
            </span>
            <span className="block">
              <LetterReveal text="tot" delay={0.6} className="text-ink-40" />
              {' '}
              <LetterReveal text="factuur." delay={0.7} className="text-blush-vivid" />
            </span>
          </h1>

          {/* Price line — animated counter */}
          <motion.div
            className="mb-10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 1.2 }}
          >
            <p className="text-[20px] leading-[1.7] text-ink-40 max-w-[520px]">
              Alles in &eacute;&eacute;n systeem dat past bij hoe jullie werken.
              Werkbonnen, planning, klantportaal, AI.{' '}
              <span className="text-white font-semibold">
                &euro;<AnimatedCounter target={49} className="font-heading text-[24px] text-white" duration={1500} />/maand
              </span>
              {' '}voor je hele team.
            </p>
          </motion.div>

          {/* CTA */}
          <motion.div
            className="flex flex-col sm:flex-row items-start gap-4 mb-20"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 1.4 }}
          >
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.98 }}>
              <Button variant="warm" size="lg" href="https://app.forgedesk.io">
                Probeer 30 dagen gratis &rarr;
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.98 }}>
              <a href="#stappen" className="inline-flex items-center gap-2 px-7 py-4 text-sm font-semibold text-ink-40 hover:text-white transition-colors rounded-full border border-ink-20 hover:border-ink-40">
                Bekijk hoe het werkt
              </a>
            </motion.div>
          </motion.div>

          {/* Stats */}
          <motion.div
            className="flex flex-wrap gap-12 sm:gap-16"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.8, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            {[
              { number: '40+', label: 'jaar in de branche' },
              { number: '€49', label: 'per maand, alles erin' },
              { number: '30', label: 'dagen gratis' },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="font-heading text-[32px] font-black text-white tracking-tight leading-none">
                  {stat.number}
                </p>
                <p className="text-[12px] text-ink-40 mt-1 font-mono tracking-wide">
                  {stat.label}
                </p>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Vertical text */}
      <motion.div
        className="absolute right-8 top-1/2 -translate-y-1/2 hidden xl:block"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.2, duration: 1, ease: [0.16, 1, 0.3, 1] }}
      >
        <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-ink-20 writing-vertical">
          FORGEdesk &mdash; Smeed je bedrijf
        </p>
      </motion.div>
    </section>
  );
}
