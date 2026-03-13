'use client';

import { useInView } from '@/hooks/useInView';

export default function AppPreview() {
  const { ref, isInView } = useInView();

  return (
    <section ref={ref} className="relative py-16 md:py-24">
      <div className="container max-w-5xl">
        <div
          className="browser-frame transition-all duration-1000"
          style={{
            opacity: isInView ? 1 : 0,
            transform: isInView ? 'translateY(0) scale(1)' : 'translateY(40px) scale(0.96)',
          }}
        >
          {/* Browser chrome */}
          <div className="bg-gray-100 border-b border-gray-200 px-4 py-3 flex items-center gap-3">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-gray-300" />
              <div className="w-3 h-3 rounded-full bg-gray-300" />
              <div className="w-3 h-3 rounded-full bg-gray-300" />
            </div>
            <div className="flex-1 flex justify-center">
              <div className="bg-white rounded-md px-4 py-1 text-xs text-gray-400 font-mono border border-gray-200 max-w-xs w-full text-center">
                app.forgedesk.io
              </div>
            </div>
          </div>

          {/* App content mock */}
          <div className="bg-canvas p-6 md:p-8">
            {/* Top bar */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Offertes</h3>
                <p className="text-sm text-gray-400">12 offertes deze maand</p>
              </div>
              <button className="bg-gray-900 text-white text-sm px-4 py-2 rounded-full font-medium">
                + Nieuwe offerte
              </button>
            </div>

            {/* Table header */}
            <div className="hidden sm:grid grid-cols-5 gap-4 text-xs font-semibold text-gray-400 uppercase tracking-wider pb-3 border-b border-gray-100">
              <span>Nummer</span>
              <span>Klant</span>
              <span>Omschrijving</span>
              <span>Bedrag</span>
              <span>Status</span>
            </div>

            {/* Table rows */}
            {[
              { nr: 'OFF-2026-042', klant: 'Brouwer Reclame', omschrijving: 'Lichtreclame gevelletters', bedrag: '€ 4.250,00', status: 'Verstuurd', statusColor: 'bg-mist-light text-mist-deep' },
              { nr: 'OFF-2026-041', klant: 'Van Dijk Interieur', omschrijving: 'Raambelettering 3 filialen', bedrag: '€ 1.890,00', status: 'Akkoord', statusColor: 'bg-sage-light text-sage-deep' },
              { nr: 'OFF-2026-040', klant: 'Gemeente Utrecht', omschrijving: 'Wayfinding borden parkeergarage', bedrag: '€ 6.750,00', status: 'Concept', statusColor: 'bg-cream-light text-cream-deep' },
              { nr: 'OFF-2026-039', klant: 'Café De Smid', omschrijving: 'Terrasschermen + uithangbord', bedrag: '€ 2.340,00', status: 'Verlopen', statusColor: 'bg-peach-light text-peach-deep' },
            ].map((row, i) => (
              <div
                key={row.nr}
                className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-4 py-3 border-b border-gray-50 items-center text-sm hover:bg-white/50 transition-colors rounded-lg px-1"
                style={{
                  opacity: isInView ? 1 : 0,
                  transform: isInView ? 'translateY(0)' : 'translateY(16px)',
                  transition: `all 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${0.3 + i * 0.1}s`,
                }}
              >
                <span className="font-mono text-xs text-gray-500">{row.nr}</span>
                <span className="font-medium text-gray-900">{row.klant}</span>
                <span className="text-gray-500 hidden sm:block">{row.omschrijving}</span>
                <span className="font-mono font-medium text-gray-900">{row.bedrag}</span>
                <span>
                  <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${row.statusColor}`}>
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
