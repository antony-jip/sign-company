'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';

const headingWords = ['Smeed', 'je', 'bedrijf', 'tot', 'een', 'geoliede', 'machine'];

const proofPoints = [
  { label: 'Offertes', color: 'bg-blush-light text-blush-deep' },
  { label: 'Werkbonnen', color: 'bg-sage-light text-sage-deep' },
  { label: 'Facturatie', color: 'bg-lavender-light text-lavender-deep' },
  { label: 'Projecten', color: 'bg-mist-light text-mist-deep' },
  { label: 'CRM', color: 'bg-peach-light text-peach-deep' },
];

export default function Hero() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <section className="relative min-h-screen flex items-center justify-center bg-mesh-hero overflow-hidden pt-16">
      <div className="container relative z-10 text-center py-20 md:py-32">
        {/* Heading with word-by-word reveal */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-tight mb-6">
          {headingWords.map((word, i) => (
            <span key={i} className="word-reveal inline-block mr-[0.3em]">
              <span
                className={word === 'Smeed' ? 'text-ember-gradient text-ember-glow' : ''}
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

        {/* Subtitle */}
        <p
          className="text-lg md:text-xl text-gray-500 max-w-2xl mx-auto mb-10 transition-all duration-700"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(24px)',
            transitionDelay: '1s',
          }}
        >
          De alles-in-één bedrijfssoftware voor creatieve bedrijven.
          Offertes, werkbonnen, facturen en projecten — in één overzichtelijk platform.
        </p>

        {/* CTA Buttons */}
        <div
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12 transition-all duration-700"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(24px)',
            transitionDelay: '1.2s',
          }}
        >
          <Button variant="primary" size="lg" href="https://app.forgedesk.io" className="w-full sm:w-auto">
            Start gratis
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14" />
              <path d="m12 5 7 7-7 7" />
            </svg>
          </Button>
          <Button variant="secondary" size="lg" href="#stappen" className="w-full sm:w-auto">
            Bekijk hoe het werkt
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </Button>
        </div>

        {/* Proof points */}
        <div
          className="flex flex-wrap items-center justify-center gap-2 transition-all duration-700"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(24px)',
            transitionDelay: '1.4s',
          }}
        >
          {proofPoints.map((point) => (
            <span
              key={point.label}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${point.color}`}
            >
              {point.label}
            </span>
          ))}
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce-slow">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400" strokeLinecap="round" strokeLinejoin="round">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </div>
    </section>
  );
}
