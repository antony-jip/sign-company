'use client';

import { useInView } from '@/hooks/useInView';
import { Button } from '@/components/ui/Button';

export default function CTASection() {
  const { ref, isInView } = useInView();

  return (
    <section className="relative bg-mesh-cta overflow-hidden" style={{ paddingTop: 140, paddingBottom: 140 }}>
      <div className="container relative z-10">
        <div
          ref={ref}
          className="text-center max-w-[600px] mx-auto"
          style={{
            opacity: isInView ? 1 : 0,
            transform: isInView ? 'translateY(0)' : 'translateY(32px)',
            transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          <h2 className="font-heading section-heading text-ink mb-6">
            Klaar om te <span className="text-ember-gradient">smeden</span>?
          </h2>
          <p className="text-[19px] leading-[1.7] text-ink-60 mb-10 max-w-[480px] mx-auto">
            Start vandaag gratis. Geen creditcard, geen contract, geen gedoe.
          </p>
          <Button variant="ink" href="https://app.forgedesk.io">
            Start 30 dagen gratis &rarr;
          </Button>
        </div>
      </div>
    </section>
  );
}
