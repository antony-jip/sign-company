'use client';

import { useInView } from '@/hooks/useInView';
import { Button } from '@/components/ui/Button';

export default function CTASection() {
  const { ref, isInView } = useInView();

  return (
    <section className="relative bg-mesh-cta py-24 md:py-32 overflow-hidden">
      <div className="container relative z-10">
        <div
          ref={ref}
          className="text-center max-w-2xl mx-auto"
          style={{
            opacity: isInView ? 1 : 0,
            transform: isInView ? 'translateY(0)' : 'translateY(32px)',
            transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
            Klaar om te{' '}
            <span className="text-ember-gradient text-ember-glow">smeden</span>?
          </h2>
          <p className="text-gray-500 text-lg mb-10 max-w-lg mx-auto">
            Probeer FORGEdesk 14 dagen gratis. Geen creditcard nodig, geen verplichtingen.
          </p>
          <Button variant="primary" size="lg" href="https://app.forgedesk.io">
            Start gratis
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14" />
              <path d="m12 5 7 7-7 7" />
            </svg>
          </Button>
        </div>
      </div>
    </section>
  );
}
