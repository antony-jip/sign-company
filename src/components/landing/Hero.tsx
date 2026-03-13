'use client';

import { useEffect, useState } from 'react';
import { motion, useMotionValue, useTransform, useSpring } from 'framer-motion';
import { Button } from '@/components/ui/Button';

/* ── Animation variants ───────────────────────────────────────── */

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      damping: 25,
      stiffness: 120,
      delay,
    },
  }),
};

const floatCard = {
  hidden: { opacity: 0, y: 40, scale: 0.95 },
  visible: (delay: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      damping: 20,
      stiffness: 100,
      delay,
    },
  }),
};

/* ── Animated counter ─────────────────────────────────────────── */

function Counter({ end, suffix = '', delay = 0 }: { end: number; suffix?: string; delay?: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      const duration = 1200;
      const steps = 30;
      const increment = end / steps;
      let current = 0;
      const interval = setInterval(() => {
        current += increment;
        if (current >= end) {
          setCount(end);
          clearInterval(interval);
        } else {
          setCount(Math.floor(current));
        }
      }, duration / steps);
    }, delay);
    return () => clearTimeout(timer);
  }, [delay, end]);

  return <>{count}{suffix}</>;
}

/* ── Floating card with mouse parallax ─────────────────────────── */

function FloatingCard({
  children,
  className,
  rotate = 0,
  delay = 1.4,
}: {
  children: React.ReactNode;
  className?: string;
  rotate?: number;
  delay?: number;
}) {
  return (
    <motion.div
      className={`absolute hidden lg:flex items-center gap-2.5 bg-white/80 backdrop-blur-md border border-ink-10 rounded-xl px-4 py-3 shadow-lg ${className || ''}`}
      variants={floatCard}
      initial="hidden"
      animate="visible"
      custom={delay}
      whileHover={{ scale: 1.05, rotate: 0, transition: { type: 'spring', stiffness: 300 } }}
      style={{ rotate }}
    >
      {children}
    </motion.div>
  );
}

/* ── Glow orb that follows mouse subtly ─────────────────────────── */

function MouseGlow() {
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);

  const x = useSpring(useTransform(mouseX, [0, 1], [-100, 100]), { stiffness: 50, damping: 30 });
  const y = useSpring(useTransform(mouseY, [0, 1], [-100, 100]), { stiffness: 50, damping: 30 });

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
      className="absolute rounded-full pointer-events-none"
      style={{
        x,
        y,
        top: '30%',
        left: '40%',
        width: 500,
        height: 500,
        background: 'radial-gradient(circle, rgba(232,169,144,0.12), transparent 70%)',
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
    <section className="relative min-h-screen flex items-center justify-center bg-mesh-hero overflow-hidden noise-overlay">
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        {/* Static glow orbs */}
        <motion.div
          className="absolute rounded-full"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 2, delay: 0.2 }}
          style={{
            top: '10%', left: '15%', width: 350, height: 350,
            background: 'radial-gradient(circle, rgba(232,169,144,0.2), transparent 70%)',
            filter: 'blur(60px)',
          }}
        />
        <motion.div
          className="absolute rounded-full"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 2, delay: 0.5 }}
          style={{
            bottom: '15%', right: '10%', width: 300, height: 300,
            background: 'radial-gradient(circle, rgba(164,139,191,0.15), transparent 70%)',
            filter: 'blur(50px)',
          }}
        />

        {/* Mouse-following glow */}
        {mounted && <MouseGlow />}

        {/* Subtle grid */}
        <motion.div
          className="absolute inset-0 hidden md:block"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.025 }}
          transition={{ duration: 2 }}
        >
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
                <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#1A1A1A" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </motion.div>
      </div>

      {/* Floating product hint cards */}
      <FloatingCard className="float-element" style={{ top: '22%', left: '5%' }} rotate={-2} delay={1.4}>
        <div className="w-8 h-8 rounded-lg bg-sage-light flex items-center justify-center">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-sage-deep" strokeLinecap="round" strokeLinejoin="round">
            <path d="m9 12 2 2 4-4" />
            <rect width="18" height="18" x="3" y="3" rx="2" />
          </svg>
        </div>
        <div>
          <p className="text-[12px] font-bold text-ink">Werkbon afgerond</p>
          <p className="text-[11px] text-ink-40">Montage LED letters — 3u 20m</p>
        </div>
      </FloatingCard>

      <FloatingCard className="float-element-slow" style={{ top: '18%', right: '4%' }} rotate={1} delay={1.6}>
        <div className="w-8 h-8 rounded-lg bg-blush-light flex items-center justify-center">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-blush-deep" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
            <path d="M14 2v6h6" />
          </svg>
        </div>
        <div>
          <p className="text-[12px] font-bold text-ink">Offerte geaccepteerd</p>
          <p className="text-[11px] text-ink-40">Brouwer Reclame — &euro;4.250</p>
        </div>
      </FloatingCard>

      <FloatingCard className="float-element" style={{ bottom: '22%', left: '6%' }} rotate={1.5} delay={1.8}>
        <div className="w-8 h-8 rounded-lg bg-lavender-light flex items-center justify-center">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-lavender-deep" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M16 8h-5a2 2 0 1 0 0 4h2a2 2 0 1 1 0 4H8" />
            <path d="M12 18V6" />
          </svg>
        </div>
        <div>
          <p className="text-[12px] font-bold text-ink">Factuur betaald</p>
          <p className="text-[11px] text-sage-vivid font-semibold">&euro;1.890,00 ontvangen</p>
        </div>
      </FloatingCard>

      <FloatingCard className="float-element-slow" style={{ bottom: '25%', right: '5%' }} rotate={-1} delay={2}>
        <div className="w-8 h-8 rounded-lg bg-peach-light flex items-center justify-center">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-peach-deep" strokeLinecap="round" strokeLinejoin="round">
            <rect width="18" height="18" x="3" y="4" rx="2" />
            <line x1="16" x2="16" y1="2" y2="6" />
            <line x1="8" x2="8" y1="2" y2="6" />
            <line x1="3" x2="21" y1="10" y2="10" />
          </svg>
        </div>
        <div>
          <p className="text-[12px] font-bold text-ink">Morgen 09:00</p>
          <p className="text-[11px] text-ink-40">Montage Van Dijk Interieur</p>
        </div>
      </FloatingCard>

      {/* Main content */}
      <div className="max-w-[760px] mx-auto px-6 relative z-10 text-center" style={{ paddingTop: 140, paddingBottom: 100 }}>
        {/* Overline badge */}
        <motion.div
          className="inline-flex items-center gap-2 mb-8"
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={0.2}
        >
          <span className="inline-flex items-center gap-2 bg-white/60 backdrop-blur-sm border border-ink-10 rounded-full px-4 py-1.5 text-[12px] font-mono font-medium text-ink-60 tracking-wide">
            <span className="w-2 h-2 rounded-full bg-sage-vivid animate-pulse" />
            Gebouwd door signmakers, sinds 1983
          </span>
        </motion.div>

        {/* Heading — staggered spring reveal */}
        <h1 className="font-heading hero-heading mb-6">
          <motion.span
            className="block overflow-hidden"
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={0.4}
          >
            <span className="text-ember-gradient">Eén systeem.</span>
          </motion.span>
          <motion.span
            className="block overflow-hidden"
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={0.55}
          >
            Nul gedoe.
          </motion.span>
        </h1>

        {/* Sub */}
        <motion.p
          className="text-[20px] leading-[1.7] text-ink-60 max-w-[500px] mx-auto mb-10"
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={0.7}
        >
          Van offerte tot factuur, van werkbon tot planning. Alles op één plek — zodat jij kunt doen waar je goed in bent.
        </motion.p>

        {/* CTA buttons */}
        <motion.div
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-14"
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={0.85}
        >
          <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.98 }}>
            <Button variant="ink" href="https://app.forgedesk.io" className="w-full sm:w-auto max-w-[300px]">
              Probeer 30 dagen gratis &rarr;
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.98 }}>
            <Button variant="soft" href="#stappen" className="w-full sm:w-auto max-w-[300px]">
              Bekijk hoe het werkt
            </Button>
          </motion.div>
        </motion.div>

        {/* Animated trust stats */}
        <motion.div
          className="flex flex-wrap items-center justify-center gap-8 sm:gap-14"
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={1}
        >
          {[
            { value: 40, suffix: '+', label: 'jaar ervaring', delay: 1200 },
            { value: 49, prefix: '€', label: 'per maand, alles erin', delay: 1400 },
            { value: 30, label: 'dagen gratis proberen', delay: 1600 },
          ].map((stat, i) => (
            <div key={stat.label} className="flex items-center gap-8 sm:gap-14">
              {i > 0 && <div className="w-px h-10 bg-ink-10" />}
              <div className="text-center">
                <p className="text-[28px] font-heading font-bold text-ink leading-none">
                  {stat.prefix}{mounted && <Counter end={stat.value} suffix={stat.suffix} delay={stat.delay} />}
                </p>
                <p className="text-[12px] text-ink-40 mt-1">{stat.label}</p>
              </div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.5 }}
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-ink-20" strokeLinecap="round" strokeLinejoin="round">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </motion.div>
      </motion.div>
    </section>
  );
}
