'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

function AnimatedCounter({ target, suffix = '', duration = 2000, active }: { target: number; suffix?: string; duration?: number; active: boolean }) {
  const [count, setCount] = useState(0);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (!active || hasAnimated.current) return;
    hasAnimated.current = true;

    const start = performance.now();
    const step = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [active, target, duration]);

  return <>{count}{suffix}</>;
}

const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', damping: 25, stiffness: 100 },
  },
};

export default function SocialProof() {
  const [active, setActive] = useState(false);

  return (
    <section className="relative bg-forge-dark overflow-hidden noise-overlay-dark" style={{ paddingTop: 120, paddingBottom: 120 }}>
      <div className="container relative z-10">
        {/* Big quote — the origin story IS the social proof */}
        <motion.div
          className="max-w-[700px] mb-20"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={fadeUp}
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
            <span className="neon-text-glow"> Dus bouwden we het zelf.</span>&rdquo;
          </blockquote>
          <p className="text-[15px] text-ink-40 leading-[1.7] max-w-[500px]">
            Gebouwd door een signbedrijf met 40+ jaar ervaring. Niet door een softwarebedrijf dat denkt te weten hoe het werkt.
          </p>
        </motion.div>

        {/* Stats — big, raw numbers */}
        <motion.div
          className="grid grid-cols-2 md:grid-cols-4 gap-8 border-t border-ink-20 pt-12"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={fadeUp}
          onViewportEnter={() => setActive(true)}
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
                <AnimatedCounter target={stat.value} suffix={stat.suffix} active={active} />
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
