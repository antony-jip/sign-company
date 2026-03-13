'use client';

import { useInView } from '@/hooks/useInView';
import { Button } from '@/components/ui/Button';

const sources = [
  { name: 'James Pro', description: 'Exporteer je klanten, projecten en offertes. Wij importeren het.' },
  { name: 'Gripp', description: 'Draai een export, upload het bestand en je bent klaar.' },
  { name: 'Excel / CSV', description: 'Werkte je met spreadsheets? Dat kan ook. Upload en klaar.' },
];

export default function SwitchSection() {
  const { ref, isInView } = useInView();

  return (
    <section className="border-t border-ink-10" style={{ paddingTop: 100, paddingBottom: 100 }}>
      <div
        ref={ref}
        className="container max-w-[800px]"
        style={{
          opacity: isInView ? 1 : 0,
          transform: isInView ? 'translateY(0)' : 'translateY(32px)',
          transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <div className="text-center mb-12">
          <p className="font-mono text-[12px] font-medium text-ink-40 uppercase tracking-[0.06em] mb-4">
            Overstappen
          </p>
          <h2 className="font-heading section-heading text-ink mb-5">
            Je data meenemen? Geregeld.
          </h2>
          <p className="text-[19px] leading-[1.7] text-ink-60 max-w-[500px] mx-auto">
            Of je nu van James Pro, Gripp of Excel komt. Wij helpen je met de overstap.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
          {sources.map((source) => (
            <div key={source.name} className="rounded-2xl border border-ink-10 bg-white p-6 text-center">
              <h3 className="text-[16px] font-bold text-ink mb-2">{source.name}</h3>
              <p className="text-[14px] leading-[1.6] text-ink-60">{source.description}</p>
            </div>
          ))}
        </div>

        <div className="text-center">
          <Button variant="soft" href="https://app.forgedesk.io">
            Start gratis en importeer je data &rarr;
          </Button>
        </div>
      </div>
    </section>
  );
}
