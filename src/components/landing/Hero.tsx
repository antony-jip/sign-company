'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';

/* ── Animated counter ─────────────────────────────────────────── */
function Counter({ end, suffix = '', delay = 0 }: { end: number; suffix?: string; delay?: number }) {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  useEffect(() => {
    if (!started) return;
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
    return () => clearInterval(interval);
  }, [started, end]);

  return <>{count}{suffix}</>;
}

/* ── Floating mini-cards that show product features ────────────── */
function FloatingCard({ children, className, style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`absolute hidden lg:flex items-center gap-2.5 bg-white/80 backdrop-blur-md border border-ink-10 rounded-xl px-4 py-3 shadow-lg ${className || ''}`}
      style={style}
    >
      {children}
    </div>
  );
}

export default function Hero() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <section className="relative min-h-screen flex items-center justify-center bg-mesh-hero overflow-hidden noise-overlay">
      {/* Background glow orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div
          className="absolute rounded-full"
          style={{
            top: '10%', left: '15%', width: 350, height: 350,
            background: 'radial-gradient(circle, rgba(232,169,144,0.2), transparent 70%)',
            filter: 'blur(60px)',
            opacity: mounted ? 1 : 0,
            transition: 'opacity 2s ease 0.3s',
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            bottom: '15%', right: '10%', width: 300, height: 300,
            background: 'radial-gradient(circle, rgba(164,139,191,0.15), transparent 70%)',
            filter: 'blur(50px)',
            opacity: mounted ? 1 : 0,
            transition: 'opacity 2s ease 0.6s',
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            top: '40%', right: '30%', width: 200, height: 200,
            background: 'radial-gradient(circle, rgba(125,184,138,0.1), transparent 70%)',
            filter: 'blur(60px)',
            opacity: mounted ? 1 : 0,
            transition: 'opacity 2s ease 0.9s',
          }}
        />
      </div>

      {/* Floating product hint cards */}
      <FloatingCard
        className="float-element"
        style={{
          top: '22%', left: '5%',
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0) rotate(-2deg)' : 'translateY(30px) rotate(-2deg)',
          transition: 'all 1s cubic-bezier(0.16, 1, 0.3, 1) 1.4s',
        }}
      >
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

      <FloatingCard
        className="float-element-slow"
        style={{
          top: '18%', right: '4%',
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0) rotate(1deg)' : 'translateY(30px) rotate(1deg)',
          transition: 'all 1s cubic-bezier(0.16, 1, 0.3, 1) 1.6s',
        }}
      >
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

      <FloatingCard
        className="float-element"
        style={{
          bottom: '22%', left: '6%',
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0) rotate(1.5deg)' : 'translateY(30px) rotate(1.5deg)',
          transition: 'all 1s cubic-bezier(0.16, 1, 0.3, 1) 1.8s',
        }}
      >
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

      <FloatingCard
        className="float-element-slow"
        style={{
          bottom: '25%', right: '5%',
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0) rotate(-1deg)' : 'translateY(30px) rotate(-1deg)',
          transition: 'all 1s cubic-bezier(0.16, 1, 0.3, 1) 2s',
        }}
      >
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
        <div
          className="inline-flex items-center gap-2 mb-8 transition-all duration-700"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(16px)',
            transitionDelay: '0.2s',
          }}
        >
          <span className="inline-flex items-center gap-2 bg-white/60 backdrop-blur-sm border border-ink-10 rounded-full px-4 py-1.5 text-[12px] font-mono font-medium text-ink-60 tracking-wide">
            <span className="w-2 h-2 rounded-full bg-sage-vivid animate-pulse" />
            Gebouwd door signmakers, sinds 1983
          </span>
        </div>

        {/* Heading */}
        <h1 className="font-heading hero-heading mb-6">
          <span className="word-reveal mr-[0.25em]">
            <span
              className="text-ember-gradient"
              style={{ animationDelay: mounted ? '0s' : '0s', opacity: mounted ? undefined : 0 }}
            >
              Eén systeem.
            </span>
          </span>
          <br />
          <span className="word-reveal mr-[0.25em]">
            <span style={{ animationDelay: mounted ? '0.15s' : '0s', opacity: mounted ? undefined : 0 }}>
              Nul gedoe.
            </span>
          </span>
        </h1>

        {/* Sub */}
        <p
          className="text-[20px] leading-[1.7] text-ink-60 max-w-[500px] mx-auto mb-10 transition-all duration-700"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(24px)',
            transitionDelay: '0.8s',
          }}
        >
          Van offerte tot factuur, van werkbon tot planning. Alles op één plek — zodat jij kunt doen waar je goed in bent.
        </p>

        {/* CTA buttons */}
        <div
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-14 transition-all duration-700"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(24px)',
            transitionDelay: '1s',
          }}
        >
          <Button variant="ink" href="https://app.forgedesk.io" className="w-full sm:w-auto max-w-[300px]">
            Probeer 30 dagen gratis &rarr;
          </Button>
          <Button variant="soft" href="#stappen" className="w-full sm:w-auto max-w-[300px]">
            Bekijk hoe het werkt
          </Button>
        </div>

        {/* Animated trust stats */}
        <div
          className="flex flex-wrap items-center justify-center gap-8 sm:gap-14 transition-all duration-700"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(24px)',
            transitionDelay: '1.2s',
          }}
        >
          <div className="text-center">
            <p className="text-[28px] font-heading font-bold text-ink leading-none">
              {mounted && <Counter end={40} suffix="+" delay={1400} />}
            </p>
            <p className="text-[12px] text-ink-40 mt-1">jaar ervaring</p>
          </div>
          <div className="w-px h-10 bg-ink-10" />
          <div className="text-center">
            <p className="text-[28px] font-heading font-bold text-ink leading-none">
              &euro;{mounted && <Counter end={49} delay={1600} />}
            </p>
            <p className="text-[12px] text-ink-40 mt-1">per maand, alles erin</p>
          </div>
          <div className="w-px h-10 bg-ink-10" />
          <div className="text-center">
            <p className="text-[28px] font-heading font-bold text-ink leading-none">
              {mounted && <Counter end={30} delay={1800} />}
            </p>
            <p className="text-[12px] text-ink-40 mt-1">dagen gratis proberen</p>
          </div>
        </div>
      </div>

      {/* Scroll chevron */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce-slow">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-ink-20" strokeLinecap="round" strokeLinejoin="round">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </div>
    </section>
  );
}
