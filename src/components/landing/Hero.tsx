'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';

const headingWords = ['Alles-in-één', 'software', 'voor', 'de', 'creatieve', 'branche.'];

export default function Hero() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <section className="relative min-h-screen flex items-center justify-center bg-mesh-hero overflow-hidden noise-overlay">
      {/* Decorative floating elements — signmaking vibes */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        {/* Floating neon letter "F" */}
        <div
          className="float-element absolute"
          style={{ top: '12%', left: '8%', opacity: mounted ? 0.12 : 0, transition: 'opacity 1.5s ease 0.5s' }}
        >
          <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
            <text x="10" y="95" fontFamily="var(--font-madellin), serif" fontSize="100" fontWeight="900" fill="#E8A990">F</text>
          </svg>
        </div>

        {/* Floating tools — ruler */}
        <div
          className="float-element-slow absolute"
          style={{ top: '25%', right: '6%', opacity: mounted ? 0.08 : 0, transition: 'opacity 1.5s ease 0.8s' }}
        >
          <svg width="160" height="40" viewBox="0 0 160 40" fill="none" style={{ transform: 'rotate(-15deg)' }}>
            <rect x="0" y="8" width="160" height="24" rx="2" stroke="#C49585" strokeWidth="1.5" fill="none" />
            {[0, 20, 40, 60, 80, 100, 120, 140].map((x) => (
              <line key={x} x1={x} y1="8" x2={x} y2="20" stroke="#C49585" strokeWidth="1" />
            ))}
          </svg>
        </div>

        {/* Glow orb — warm amber */}
        <div
          className="absolute rounded-full"
          style={{
            top: '60%', left: '5%', width: 200, height: 200,
            background: 'radial-gradient(circle, rgba(232,169,144,0.15), transparent 70%)',
            filter: 'blur(40px)',
            opacity: mounted ? 1 : 0,
            transition: 'opacity 2s ease 0.3s',
          }}
        />

        {/* Glow orb — cool lavender */}
        <div
          className="absolute rounded-full"
          style={{
            top: '20%', right: '10%', width: 180, height: 180,
            background: 'radial-gradient(circle, rgba(164,139,191,0.12), transparent 70%)',
            filter: 'blur(40px)',
            opacity: mounted ? 1 : 0,
            transition: 'opacity 2s ease 0.6s',
          }}
        />

        {/* Floating vinyl roll */}
        <div
          className="float-element absolute hidden md:block"
          style={{ bottom: '18%', right: '10%', opacity: mounted ? 0.1 : 0, transition: 'opacity 1.5s ease 1s', animationDelay: '2s' }}
        >
          <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
            <circle cx="40" cy="40" r="35" stroke="#8A8A85" strokeWidth="1" fill="none" />
            <circle cx="40" cy="40" r="25" stroke="#8A8A85" strokeWidth="0.5" fill="none" />
            <circle cx="40" cy="40" r="8" stroke="#8A8A85" strokeWidth="1" fill="none" />
          </svg>
        </div>

        {/* Grid lines — werkplaats raster */}
        <div
          className="absolute inset-0 hidden md:block"
          style={{ opacity: mounted ? 0.03 : 0, transition: 'opacity 2s ease' }}
        >
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
                <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#1A1A1A" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>
      </div>

      <div className="max-w-[700px] mx-auto px-6 relative z-10 text-center" style={{ paddingTop: 140, paddingBottom: 140 }}>
        {/* Overline badge */}
        <div
          className="inline-flex items-center gap-2 mb-6 transition-all duration-700"
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

        {/* Heading — word-by-word reveal with neon glow */}
        <h1 className="font-heading hero-heading mb-8 neon-glow">
          {headingWords.map((word, i) => (
            <span key={i} className="word-reveal mr-[0.25em]">
              <span
                className={word === 'Alles-in-één' ? 'text-ember-gradient' : ''}
                style={{
                  animationDelay: mounted ? `${i * 0.12}s` : '0s',
                  opacity: mounted ? undefined : 0,
                }}
              >
                {word}
              </span>
            </span>
          ))}
        </h1>

        {/* Sub */}
        <p
          className="text-[19px] leading-[1.7] text-ink-60 max-w-[520px] mx-auto mb-10 transition-all duration-700"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(24px)',
            transitionDelay: '1s',
          }}
        >
          Offertes, werkbonnen, facturen, planning, klantportaal, e-mail en AI. Alles in één systeem. Gebouwd door signmakers.
        </p>

        {/* CTA buttons */}
        <div
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10 transition-all duration-700"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(24px)',
            transitionDelay: '1.2s',
          }}
        >
          <Button variant="ink" href="https://app.forgedesk.io" className="w-full sm:w-auto max-w-[300px]">
            Start 30 dagen gratis &rarr;
          </Button>
          <Button variant="soft" href="#stappen" className="w-full sm:w-auto max-w-[300px]">
            Bekijk hoe het werkt
          </Button>
        </div>

        {/* Proof points */}
        <div
          className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[13px] font-medium text-ink-40 transition-all duration-700"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(24px)',
            transitionDelay: '1.4s',
          }}
        >
          <span>Geen creditcard</span>
          <span className="text-ink-20">&middot;</span>
          <span>Vanaf &euro;49/maand</span>
          <span className="text-ink-20">&middot;</span>
          <span>Stap over vanuit James, Gripp of Excel</span>
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
