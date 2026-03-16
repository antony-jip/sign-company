'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import Navbar from './Navbar';
import Footer from './Footer';

type ColorTheme = 'peach' | 'lavender' | 'mist' | 'cream' | 'sage' | 'blush';

interface Highlight {
  icon: React.ReactNode;
  title: string;
  description: string;
}

interface FeaturePageProps {
  color: ColorTheme;
  overline: string;
  heading: React.ReactNode;
  subtitle: string;
  highlights: Highlight[];
  demo: React.ReactNode;
  demoTitle: string;
  demoSubtitle: string;
}

const accentColors: Record<ColorTheme, { glow: string; iconBg: string; iconText: string }> = {
  peach:    { glow: 'rgba(213,133,107,0.08)', iconBg: 'bg-peach-light', iconText: 'text-peach-deep' },
  lavender: { glow: 'rgba(164,139,191,0.08)', iconBg: 'bg-lavender-light', iconText: 'text-lavender-deep' },
  mist:     { glow: 'rgba(93,122,147,0.08)', iconBg: 'bg-mist-light', iconText: 'text-mist-deep' },
  cream:    { glow: 'rgba(154,142,110,0.08)', iconBg: 'bg-cream-light', iconText: 'text-cream-deep' },
  sage:     { glow: 'rgba(90,130,100,0.08)', iconBg: 'bg-sage-light', iconText: 'text-sage-deep' },
  blush:    { glow: 'rgba(232,169,144,0.08)', iconBg: 'bg-blush-light', iconText: 'text-blush-deep' },
};

const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] },
  },
};

export default function FeaturePage({
  color,
  overline,
  heading,
  subtitle,
  highlights,
  demo,
  demoTitle,
  demoSubtitle,
}: FeaturePageProps) {
  const accent = accentColors[color];

  return (
    <>
      <Navbar />
      <main id="main-content">
        {/* ── Dark hero ───────────────────────────────────────── */}
        <section className="relative bg-forge-dark overflow-hidden noise-overlay-dark">
          <div
            className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full pointer-events-none"
            style={{ background: `radial-gradient(circle, ${accent.glow}, transparent 65%)`, filter: 'blur(100px)' }}
          />

          <div className="container relative z-10" style={{ paddingTop: 160, paddingBottom: 100 }}>
            <div className="max-w-[700px]">
              <motion.p
                className="font-mono text-[11px] tracking-[0.15em] uppercase text-ink-40 mb-8"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ type: 'spring' as const, damping: 25, stiffness: 100, delay: 0.2 }}
              >
                <span className={`inline-block w-8 h-px mr-3 align-middle ${accent.iconBg}`} />
                {overline}
              </motion.p>

              <motion.h1
                className="font-heading text-white leading-tight mb-6"
                style={{ fontSize: 'clamp(40px, 6vw, 72px)', fontWeight: 900, letterSpacing: '-3px', lineHeight: 0.95 }}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring' as const, damping: 20, stiffness: 80, delay: 0.4 }}
              >
                {heading}
              </motion.h1>

              <motion.p
                className="text-[18px] leading-[1.7] text-ink-40 max-w-[500px]"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring' as const, damping: 25, stiffness: 100, delay: 0.6 }}
              >
                {subtitle}
              </motion.p>
            </div>
          </div>
        </section>

        {/* ── Highlights — editorial rows ─────────────────────── */}
        <section className="bg-bg" style={{ paddingTop: 100, paddingBottom: 100 }}>
          <div className="container">
            {highlights.map((item, i) => (
              <motion.div
                key={item.title}
                className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-12 border-t border-ink-10 items-start"
                style={{ paddingTop: 48, paddingBottom: 48 }}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.3 }}
                variants={fadeUp}
              >
                <div className="lg:col-span-1">
                  <span className={`font-mono text-[13px] font-bold ${accent.iconText}`}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                </div>

                <div className="lg:col-span-4 flex items-start gap-4">
                  <div className={`w-11 h-11 rounded-xl ${accent.iconBg} ${accent.iconText} flex items-center justify-center shrink-0`}>
                    {item.icon}
                  </div>
                  <h3
                    className="font-heading text-ink leading-tight"
                    style={{ fontSize: 'clamp(22px, 2.5vw, 30px)', fontWeight: 900, letterSpacing: '-1px' }}
                  >
                    {item.title}
                  </h3>
                </div>

                <div className="lg:col-span-7">
                  <p className="text-[16px] leading-[1.7] text-ink-60 max-w-[460px]">
                    {item.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── Demo section ───────────────────────────────────── */}
        <section className="bg-bg border-t border-ink-10" style={{ paddingTop: 100, paddingBottom: 100 }}>
          <div className="container">
            <motion.div
              className="mb-12 max-w-[500px]"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
              variants={fadeUp}
            >
              <p className="font-mono text-[11px] tracking-[0.15em] uppercase text-ink-40 mb-4">
                <span className="inline-block w-8 h-px bg-ink-20 mr-3 align-middle" />
                Bekijk het in actie
              </p>
              <h2
                className="font-heading text-ink leading-tight mb-3"
                style={{ fontSize: 'clamp(28px, 3vw, 40px)', fontWeight: 900, letterSpacing: '-1.5px' }}
              >
                {demoTitle}
              </h2>
              <p className="text-[16px] leading-[1.7] text-ink-60">
                {demoSubtitle}
              </p>
            </motion.div>

            <motion.div
              className="max-w-[900px] relative"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.1 }}
              transition={{ type: 'spring' as const, damping: 22, stiffness: 80, delay: 0.15 }}
            >
              {demo}
            </motion.div>
          </div>
        </section>

        {/* ── CTA — dark ─────────────────────────────────────── */}
        <section className="relative bg-forge-dark overflow-hidden noise-overlay-dark" style={{ paddingTop: 120, paddingBottom: 120 }}>
          <div className="container relative z-10">
            <motion.div
              className="max-w-[550px]"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
              variants={fadeUp}
            >
              <h2
                className="font-heading text-white leading-tight mb-6"
                style={{ fontSize: 'clamp(32px, 4vw, 52px)', fontWeight: 900, letterSpacing: '-2px', lineHeight: 1.0 }}
              >
                Klaar om te{' '}
                smeden?
              </h2>
              <p className="text-[18px] leading-[1.7] text-ink-40 mb-10 max-w-[420px]">
                Start vandaag gratis. Geen creditcard, geen contract.
              </p>
              <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.98 }}>
                <Button variant="warm" size="lg" href="https://app.forgedesk.io">
                  Probeer 30 dagen gratis &rarr;
                </Button>
              </motion.div>
            </motion.div>
          </div>

          <div
            className="absolute top-1/2 right-0 -translate-y-1/2 w-[500px] h-[500px] rounded-full pointer-events-none"
            style={{ background: `radial-gradient(circle, ${accent.glow}, transparent 65%)`, filter: 'blur(100px)' }}
          />
        </section>
      </main>
      <Footer />
    </>
  );
}
