'use client';

import { useInView } from '@/hooks/useInView';
import { Button } from '@/components/ui/Button';

const sources = [
  {
    name: 'James Pro',
    description: 'Exporteer je klanten, projecten en offertes. Wij importeren het.',
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <rect x="4" y="4" width="24" height="24" rx="6" fill="#EDE9F3" />
        <path d="M12 20c0-2.2 1.8-4 4-4s4 1.8 4 4" stroke="#7B6B8A" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="16" cy="12" r="3" stroke="#7B6B8A" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    name: 'Gripp',
    description: 'Draai een export, upload het bestand en je bent klaar.',
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <rect x="4" y="4" width="24" height="24" rx="6" fill="#E4EBE6" />
        <path d="M10 16h12M16 10v12" stroke="#5A8264" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    name: 'Excel / CSV',
    description: 'Werkte je met spreadsheets? Upload en klaar.',
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <rect x="4" y="4" width="24" height="24" rx="6" fill="#F6F4EC" />
        <path d="M10 10h4v4h-4zM18 10h4v4h-4zM10 18h4v4h-4zM18 18h4v4h-4z" stroke="#9A8E6E" strokeWidth="1.2" />
      </svg>
    ),
  },
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

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-10">
          {sources.map((source, i) => (
            <div
              key={source.name}
              className="rounded-2xl border border-ink-10 bg-white p-6 text-center neon-card"
              style={{
                opacity: isInView ? 1 : 0,
                transform: isInView ? 'translateY(0)' : 'translateY(16px)',
                transition: `all 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${0.1 + i * 0.1}s`,
              }}
            >
              <div className="flex justify-center mb-3">
                {source.icon}
              </div>
              <h3 className="text-[16px] font-bold text-ink mb-2">{source.name}</h3>
              <p className="text-[14px] leading-[1.6] text-ink-60">{source.description}</p>
            </div>
          ))}
        </div>

        {/* Visual arrow flow */}
        <div className="flex items-center justify-center gap-4 mb-10">
          <div className="h-[1px] w-16 bg-gradient-to-r from-transparent to-ink-20" />
          <div className="flex items-center gap-2 text-[13px] text-ink-40 font-medium">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M10 3v14m0 0l-4-4m4 4l4-4" stroke="#C0C0BA" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Import in minuten
          </div>
          <div className="h-[1px] w-16 bg-gradient-to-l from-transparent to-ink-20" />
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
