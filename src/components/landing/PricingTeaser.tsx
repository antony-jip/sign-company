'use client';

import { useInView } from '@/hooks/useInView';
import { Button } from '@/components/ui/Button';

export default function PricingTeaser() {
  const { ref, isInView } = useInView();

  return (
    <section className="relative bg-mesh-hero overflow-hidden" style={{ paddingTop: 100, paddingBottom: 100 }}>
      <div
        ref={ref}
        className="container max-w-[700px] text-center"
        style={{
          opacity: isInView ? 1 : 0,
          transform: isInView ? 'translateY(0)' : 'translateY(32px)',
          transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <p className="font-mono text-[12px] font-medium text-ink-40 uppercase tracking-[0.06em] mb-4">
          Pricing
        </p>
        <h2 className="font-heading section-heading text-ink mb-6">
          Eén prijs. Alles erin.
        </h2>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-8">
          <div className="rounded-2xl border border-ink-10 bg-white px-8 py-6 text-center min-w-[200px]">
            <p className="text-[13px] font-bold text-ink-40 uppercase tracking-wide mb-1">Starter</p>
            <div className="flex items-baseline justify-center gap-1">
              <span className="font-heading text-ink" style={{ fontSize: 40, fontWeight: 900, letterSpacing: '-1px', lineHeight: 1 }}>
                &euro;49
              </span>
              <span className="text-ink-40 text-[15px]">/maand</span>
            </div>
            <p className="text-[13px] text-ink-40 mt-1">Tot 3 gebruikers</p>
          </div>

          <div className="rounded-2xl border border-ink-20 bg-white px-8 py-6 text-center min-w-[200px] shadow-lg relative">
            <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-ink text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full">
              Populair
            </span>
            <p className="text-[13px] font-bold text-ink-40 uppercase tracking-wide mb-1">Team</p>
            <div className="flex items-baseline justify-center gap-1">
              <span className="font-heading text-ink" style={{ fontSize: 40, fontWeight: 900, letterSpacing: '-1px', lineHeight: 1 }}>
                &euro;69
              </span>
              <span className="text-ink-40 text-[15px]">/maand</span>
            </div>
            <p className="text-[13px] text-ink-40 mt-1">Onbeperkt gebruikers</p>
          </div>
        </div>

        <p className="text-[15px] text-ink-60 mb-6">
          Geen kosten per gebruiker. Geen verborgen modules. 30 dagen gratis proberen.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button variant="ink" href="https://app.forgedesk.io">
            Start 30 dagen gratis &rarr;
          </Button>
          <Button variant="soft" href="/pricing">
            Bekijk alle details
          </Button>
        </div>
      </div>
    </section>
  );
}
