'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';

export default function Hero() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <section className="relative min-h-screen flex items-center justify-center bg-mesh-hero overflow-hidden noise-overlay">
      {/* Background decorations */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        {/* Glow orbs */}
        <div
          className="absolute rounded-full"
          style={{
            top: '15%', left: '10%', width: 300, height: 300,
            background: 'radial-gradient(circle, rgba(232,169,144,0.18), transparent 70%)',
            filter: 'blur(60px)',
            opacity: mounted ? 1 : 0,
            transition: 'opacity 2s ease 0.3s',
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            bottom: '20%', right: '8%', width: 250, height: 250,
            background: 'radial-gradient(circle, rgba(164,139,191,0.14), transparent 70%)',
            filter: 'blur(50px)',
            opacity: mounted ? 1 : 0,
            transition: 'opacity 2s ease 0.6s',
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            top: '50%', left: '50%', width: 400, height: 400,
            transform: 'translate(-50%, -50%)',
            background: 'radial-gradient(circle, rgba(125,184,138,0.08), transparent 70%)',
            filter: 'blur(80px)',
            opacity: mounted ? 1 : 0,
            transition: 'opacity 2s ease 0.9s',
          }}
        />

        {/* Subtle grid */}
        <div
          className="absolute inset-0 hidden md:block"
          style={{ opacity: mounted ? 0.025 : 0, transition: 'opacity 2s ease' }}
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

        {/* Sub — speaks to pain, not features */}
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
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12 transition-all duration-700"
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

        {/* Trust bar — visual stats instead of plain text */}
        <div
          className="flex flex-wrap items-center justify-center gap-8 sm:gap-12 transition-all duration-700"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(24px)',
            transitionDelay: '1.2s',
          }}
        >
          <div className="text-center">
            <p className="text-[22px] font-heading font-bold text-ink">40+</p>
            <p className="text-[12px] text-ink-40 mt-0.5">jaar ervaring</p>
          </div>
          <div className="w-px h-8 bg-ink-10" />
          <div className="text-center">
            <p className="text-[22px] font-heading font-bold text-ink">&euro;49</p>
            <p className="text-[12px] text-ink-40 mt-0.5">per maand, alles erin</p>
          </div>
          <div className="w-px h-8 bg-ink-10" />
          <div className="text-center">
            <p className="text-[22px] font-heading font-bold text-ink">30</p>
            <p className="text-[12px] text-ink-40 mt-0.5">dagen gratis proberen</p>
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
