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
    <section className="relative min-h-screen flex items-center justify-center bg-mesh-hero overflow-hidden">
      <div className="max-w-[700px] mx-auto px-6 relative z-10 text-center" style={{ paddingTop: 140, paddingBottom: 140 }}>
        {/* Heading — word-by-word reveal */}
        <h1 className="font-heading hero-heading mb-8">
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

        {/* Sub — section 15 */}
        <p
          className="text-[19px] leading-[1.7] text-ink-60 max-w-[520px] mx-auto mb-10 transition-all duration-700"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(24px)',
            transitionDelay: '1s',
          }}
        >
          Projecten, offertes, werkbonnen en facturen in één systeem. Gebouwd door signmakers, voor de creatieve branche.
        </p>

        {/* CTA buttons — section 15 */}
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

        {/* Proof points — section 15 */}
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
