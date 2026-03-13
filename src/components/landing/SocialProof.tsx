'use client';

import { useInView } from '@/hooks/useInView';
import { useState, useEffect, useRef } from 'react';

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

const stats = [
  { value: 500, suffix: '+', label: 'Offertes verstuurd', color: 'text-blush-vivid' },
  { value: 4, suffix: ' uur', label: 'Per week bespaard', color: 'text-sage-vivid' },
  { value: 30, suffix: ' sec', label: 'Factuur aanmaken', color: 'text-lavender-vivid' },
  { value: 100, suffix: '%', label: 'Nederlandse support', color: 'text-mist-vivid' },
];

export default function SocialProof() {
  const { ref: statsRef, isInView: statsVisible } = useInView();
  const { ref: storyRef, isInView: storyVisible } = useInView();

  return (
    <section className="relative bg-forge-dark noise-overlay overflow-hidden" style={{ paddingTop: 100, paddingBottom: 100 }}>
      <div className="container relative z-10">
        {/* Stats */}
        <div
          ref={statsRef}
          className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-16"
        >
          {stats.map((stat, i) => (
            <div
              key={stat.label}
              className="text-center"
              style={{
                opacity: statsVisible ? 1 : 0,
                transform: statsVisible ? 'translateY(0)' : 'translateY(24px)',
                transition: `all 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${0.1 * i}s`,
              }}
            >
              <p className={`font-heading ${stat.color}`} style={{ fontSize: 'clamp(36px, 4vw, 52px)', fontWeight: 900, letterSpacing: '-2px', lineHeight: 1 }}>
                <AnimatedCounter target={stat.value} suffix={stat.suffix} active={statsVisible} />
              </p>
              <p className="text-[14px] text-ink-40 mt-2">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Origin story */}
        <div
          ref={storyRef}
          className="max-w-[600px] mx-auto text-center"
          style={{
            opacity: storyVisible ? 1 : 0,
            transform: storyVisible ? 'translateY(0)' : 'translateY(24px)',
            transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          <div className="inline-flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-full bg-blush flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 1l2.1 4.3 4.7.7-3.4 3.3.8 4.7L8 11.5 3.8 14l.8-4.7L1.2 6l4.7-.7L8 1z" fill="#C49585" />
              </svg>
            </div>
          </div>
          <blockquote className="text-[20px] leading-[1.6] text-white/80 font-heading mb-4" style={{ fontWeight: 700, letterSpacing: '-0.5px' }}>
            &ldquo;We zochten software die past bij hoe wij werken. Die was er niet. Dus bouwden we het zelf.&rdquo;
          </blockquote>
          <p className="text-[14px] text-ink-40">
            Gebouwd door een signbedrijf met 40+ jaar ervaring. Niet door een softwarebedrijf dat denkt te weten hoe het werkt.
          </p>
        </div>
      </div>

      {/* Decorative glow orbs */}
      <div className="absolute top-0 left-1/4 w-[300px] h-[300px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(232,169,144,0.06), transparent 70%)', filter: 'blur(60px)' }} />
      <div className="absolute bottom-0 right-1/4 w-[250px] h-[250px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(125,184,138,0.06), transparent 70%)', filter: 'blur(60px)' }} />
    </section>
  );
}
