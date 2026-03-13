'use client';

import { useInView } from '@/hooks/useInView';

export default function AppPreview() {
  const { ref, isInView } = useInView();

  return (
    <section ref={ref} className="relative" style={{ paddingTop: 40, paddingBottom: 80 }}>
      <div className="max-w-[1040px] mx-auto px-6">
        <div
          className="browser-frame transition-all duration-1000"
          style={{
            opacity: isInView ? 1 : 0,
            transform: isInView ? 'translateY(0) scale(1)' : 'translateY(40px) scale(0.96)',
          }}
        >
          {/* Browser chrome */}
          <div className="bg-ink-05 border-b border-ink-10 px-4 py-3 flex items-center gap-3">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-ink-20" />
              <div className="w-3 h-3 rounded-full bg-ink-20" />
              <div className="w-3 h-3 rounded-full bg-ink-20" />
            </div>
            <div className="flex-1 flex justify-center">
              <div className="bg-white rounded-md px-4 py-1 text-[11px] text-ink-40 font-mono border border-ink-10 max-w-[240px] w-full text-center">
                app.forgedesk.io
              </div>
            </div>
          </div>

          {/* App content — offerte overzicht mock */}
          <div className="bg-bg p-6 md:p-8">
            {/* Top bar */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-heading font-bold text-ink">Offertes</h3>
                <p className="text-[13px] text-ink-40">12 offertes deze maand</p>
              </div>
              <div className="bg-ink text-white text-[13px] px-4 py-2 rounded-full font-semibold">
                + Nieuwe offerte
              </div>
            </div>

            {/* Table header — overline style */}
            <div className="hidden sm:grid grid-cols-5 gap-4 text-[12px] font-mono font-medium text-ink-40 uppercase tracking-[0.06em] pb-3 border-b border-ink-10">
              <span>Nummer</span>
              <span>Klant</span>
              <span>Omschrijving</span>
              <span>Bedrag</span>
              <span>Status</span>
            </div>

            {/* Rows */}
            {[
              { nr: 'OFF-2026-042', klant: 'Brouwer Reclame', omschrijving: 'Lichtreclame gevelletters', bedrag: '\u20AC 4.250,00', status: 'Verstuurd', statusClass: 'bg-[#FEF3C7] text-[#92400E]' },
              { nr: 'OFF-2026-041', klant: 'Van Dijk Interieur', omschrijving: 'Raambelettering 3 filialen', bedrag: '\u20AC 1.890,00', status: 'Akkoord', statusClass: 'bg-sage-light text-sage-deep' },
              { nr: 'OFF-2026-040', klant: 'Gemeente Utrecht', omschrijving: 'Wayfinding borden parkeergarage', bedrag: '\u20AC 6.750,00', status: 'Concept', statusClass: 'bg-mist-light text-mist-deep' },
              { nr: 'OFF-2026-039', klant: 'Caf\u00E9 De Smid', omschrijving: 'Terrasschermen + uithangbord', bedrag: '\u20AC 2.340,00', status: 'Gefactureerd', statusClass: 'bg-lavender-light text-lavender-deep' },
            ].map((row, i) => (
              <div
                key={row.nr}
                className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-4 py-3 border-b border-ink-05 items-center text-sm"
                style={{
                  opacity: isInView ? 1 : 0,
                  transform: isInView ? 'translateY(0)' : 'translateY(16px)',
                  transition: `all 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${0.3 + i * 0.1}s`,
                }}
              >
                <span className="font-mono text-[11px] text-ink-40">{row.nr}</span>
                <span className="font-medium text-ink">{row.klant}</span>
                <span className="text-ink-60 hidden sm:block">{row.omschrijving}</span>
                <span className="font-mono font-medium text-ink">{row.bedrag}</span>
                <span>
                  <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-semibold ${row.statusClass}`}>
                    {row.status}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
