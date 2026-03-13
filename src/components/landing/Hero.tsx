'use client';

import { useEffect, useState } from 'react';
import { motion, useMotionValue, useTransform, useSpring } from 'framer-motion';
import { Button } from '@/components/ui/Button';

/* ── Neon flicker effect on a word ─────────────────────────────── */

function NeonWord({ children, delay = 0 }: { children: string; delay?: number }) {
  return (
    <motion.span
      className="neon-text-glow relative"
      initial={{ opacity: 0 }}
      animate={{
        opacity: [0, 1, 0.7, 1, 0.85, 1],
      }}
      transition={{
        duration: 1.2,
        delay,
        times: [0, 0.2, 0.3, 0.5, 0.7, 1],
      }}
    >
      {children}
    </motion.span>
  );
}

/* ── Subtle mouse-driven light on dark bg ──────────────────────── */

function SpotlightGlow() {
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);

  const x = useSpring(useTransform(mouseX, [0, 1], [-200, 200]), { stiffness: 30, damping: 40 });
  const y = useSpring(useTransform(mouseY, [0, 1], [-200, 200]), { stiffness: 30, damping: 40 });

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      mouseX.set(e.clientX / window.innerWidth);
      mouseY.set(e.clientY / window.innerHeight);
    };
    window.addEventListener('mousemove', handler);
    return () => window.removeEventListener('mousemove', handler);
  }, [mouseX, mouseY]);

  return (
    <motion.div
      className="absolute pointer-events-none"
      style={{
        x,
        y,
        top: '25%',
        left: '35%',
        width: 700,
        height: 700,
        background: 'radial-gradient(circle, rgba(232,169,144,0.07), transparent 65%)',
        filter: 'blur(80px)',
      }}
    />
  );
}

/* ── Main Hero ─────────────────────────────────────────────────── */

export default function Hero() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <section className="relative min-h-screen flex items-center bg-forge-dark overflow-hidden">
      {/* Subtle grain texture */}
      <div className="absolute inset-0 noise-overlay-dark pointer-events-none" />

      {/* Background glow spots */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div
          className="absolute rounded-full"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 3, delay: 0.5 }}
          style={{
            top: '-10%', right: '-5%', width: 600, height: 600,
            background: 'radial-gradient(circle, rgba(232,169,144,0.12), transparent 70%)',
            filter: 'blur(100px)',
          }}
        />
        <motion.div
          className="absolute rounded-full"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 3, delay: 1 }}
          style={{
            bottom: '0%', left: '-5%', width: 500, height: 500,
            background: 'radial-gradient(circle, rgba(125,184,138,0.08), transparent 70%)',
            filter: 'blur(80px)',
          }}
        />
        {mounted && <SpotlightGlow />}
      </div>

      {/* Content */}
      <div className="container relative z-10" style={{ paddingTop: 160, paddingBottom: 120 }}>
        <div className="max-w-[900px]">
          {/* Overline — craft, not corporate */}
          <motion.p
            className="font-mono text-[11px] tracking-[0.15em] uppercase text-ink-40 mb-8"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 100, delay: 0.2 }}
          >
            <span className="inline-block w-8 h-px bg-blush-vivid mr-3 align-middle" />
            Gebouwd door signmakers, sinds 1983
          </motion.p>

          {/* Main heading — big, raw, asymmetric */}
          <h1 className="font-heading mb-8" style={{ lineHeight: 0.92 }}>
            <motion.span
              className="block text-white hero-heading-dark"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', damping: 20, stiffness: 80, delay: 0.4 }}
            >
              Software die
            </motion.span>
            <motion.span
              className="block hero-heading-dark"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', damping: 20, stiffness: 80, delay: 0.6 }}
            >
              <NeonWord delay={1}>smeedt</NeonWord>
              <span className="text-ink-40">,</span>
              <span className="text-white"> niet plakt.</span>
            </motion.span>
          </h1>

          {/* Subtext — left aligned, direct, no corporate */}
          <motion.p
            className="text-[20px] leading-[1.7] text-ink-40 max-w-[480px] mb-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 100, delay: 0.9 }}
          >
            Van offerte tot factuur, van werkbon tot planning. Alles in &eacute;&eacute;n systeem dat past bij hoe jullie werken. Niet andersom.
          </motion.p>

          {/* CTA — left aligned */}
          <motion.div
            className="flex flex-col sm:flex-row items-start gap-4 mb-20"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 100, delay: 1.1 }}
          >
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.98 }}>
              <Button variant="warm" href="https://app.forgedesk.io" className="w-full sm:w-auto">
                Probeer 30 dagen gratis &rarr;
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.98 }}>
              <a href="#stappen" className="inline-flex items-center gap-2 px-7 py-3 text-sm font-semibold text-ink-40 hover:text-white transition-colors rounded-full border border-ink-20 hover:border-ink-40">
                Bekijk hoe het werkt
              </a>
            </motion.div>
          </motion.div>

          {/* Stats — raw, minimal, no boxes */}
          <motion.div
            className="flex flex-wrap gap-12 sm:gap-16"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.4, duration: 0.8 }}
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

      {/* Vertical text — craft detail */}
      <motion.div
        className="absolute right-8 top-1/2 -translate-y-1/2 hidden xl:block"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2, duration: 1 }}
      >
        <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-ink-20 writing-vertical">
          FORGEdesk &mdash; Smeed je bedrijf
        </p>
      </motion.div>
    </section>
  );
}
