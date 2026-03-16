'use client';

import React, { useState } from 'react';
import FeaturePage from '@/components/landing/FeaturePage';

/* ─── Klantportaal Demo ─── */
function KlantportaalDemo() {
  const [tab, setTab] = useState<'offertes' | 'facturen' | 'tekeningen'>('offertes');
  const [approved, setApproved] = useState<Record<string, boolean>>({});

  const offertes = [
    { nr: 'OFF-2026-089', titel: 'LED Lichtreclame', bedrag: '€2.450', status: 'Wacht op goedkeuring' },
    { nr: 'OFF-2026-076', titel: 'Gevelreclame + montage', bedrag: '€4.800', status: 'Goedgekeurd' },
  ];

  const facturen = [
    { nr: 'FAC-2026-041', titel: 'Factuur gevelletters', bedrag: '€1.200', status: 'Betaald', betaald: true },
    { nr: 'FAC-2026-045', titel: 'Factuur LED montage', bedrag: '€3.800', status: 'Open', betaald: false },
  ];

  const tekeningen = [
    { naam: 'Gevelontwerp v2.pdf', datum: '8 maart 2026', grootte: '2.4 MB' },
    { naam: 'Lichtreclame_render.png', datum: '5 maart 2026', grootte: '1.8 MB' },
    { naam: 'Plattegrond_montage.pdf', datum: '1 maart 2026', grootte: '540 KB' },
  ];

  return (
    <div className="bg-white rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.06)] border border-ink-10 overflow-hidden">
      {/* Portal Header */}
      <div className="bg-mist-light/40 px-6 py-4 border-b border-ink-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-mist flex items-center justify-center text-mist-deep font-bold text-[13px]">
              BJ
            </div>
            <div>
              <p className="font-heading text-[15px] font-bold text-ink">Bakkerij Jansen</p>
              <p className="text-[11px] text-ink-40">Klantportaal · 3 actieve projecten</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-sage-vivid" />
            <span className="text-[11px] text-ink-40">Online</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-ink-10">
        {[
          { key: 'offertes' as const, label: 'Offertes', count: 2 },
          { key: 'facturen' as const, label: 'Facturen', count: 2 },
          { key: 'tekeningen' as const, label: 'Tekeningen', count: 3 },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-3.5 text-[13px] font-medium transition-all flex items-center justify-center gap-1.5 ${
              tab === t.key
                ? 'text-mist-deep border-b-2 border-mist-deep'
                : 'text-ink-40 hover:text-ink-60'
            }`}
          >
            {t.label}
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
              tab === t.key ? 'bg-mist-light text-mist-deep' : 'bg-ink-05 text-ink-40'
            }`}>{t.count}</span>
          </button>
        ))}
      </div>

      <div className="p-5">
        {/* Offertes */}
        {tab === 'offertes' && (
          <div className="space-y-3">
            {offertes.map(o => (
              <div key={o.nr} className="p-4 rounded-xl border border-ink-10 hover:border-mist/40 transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-medium text-ink text-[14px]">{o.titel}</p>
                    <p className="text-[12px] text-ink-40 font-mono">{o.nr}</p>
                  </div>
                  <span className="text-[16px] font-bold font-mono text-ink">{o.bedrag}</span>
                </div>
                {o.status === 'Wacht op goedkeuring' && !approved[o.nr] ? (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setApproved(prev => ({ ...prev, [o.nr]: true }))}
                      className="flex-1 bg-sage-vivid hover:bg-sage-deep text-white font-semibold py-2.5 rounded-xl text-[13px] transition-all hover:-translate-y-0.5"
                    >
                      ✓ Goedkeuren
                    </button>
                    <button className="flex-1 bg-ink-05 hover:bg-ink-10 text-ink-60 font-medium py-2.5 rounded-xl text-[13px] transition-colors">
                      Vraag stellen
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-sage-light flex items-center justify-center">
                      <svg className="w-3 h-3 text-sage-deep" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                    <span className="text-[13px] text-sage-deep font-medium">Goedgekeurd</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Facturen */}
        {tab === 'facturen' && (
          <div className="space-y-3">
            {facturen.map(f => (
              <div key={f.nr} className="p-4 rounded-xl border border-ink-10 flex items-center justify-between">
                <div>
                  <p className="font-medium text-ink text-[14px]">{f.titel}</p>
                  <p className="text-[12px] text-ink-40 font-mono">{f.nr}</p>
                </div>
                <div className="text-right">
                  <span className="text-[16px] font-bold font-mono text-ink block">{f.bedrag}</span>
                  <span className={`text-[11px] font-semibold ${f.betaald ? 'text-sage-deep' : 'text-blush-deep'}`}>
                    {f.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tekeningen */}
        {tab === 'tekeningen' && (
          <div className="space-y-3">
            {tekeningen.map(t => (
              <div key={t.naam} className="p-4 rounded-xl border border-ink-10 flex items-center justify-between hover:border-mist/40 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-mist-light flex items-center justify-center">
                    <svg className="w-5 h-5 text-mist-deep" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-ink text-[14px]">{t.naam}</p>
                    <p className="text-[12px] text-ink-40">{t.datum} · {t.grootte}</p>
                  </div>
                </div>
                <button className="text-[12px] text-mist-deep font-medium hover:text-mist-vivid transition-colors">
                  Download ↓
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function KlantportaalFeaturePage() {
  return (
    <FeaturePage
      color="mist"
      overline="Klantportaal"
      heading={<>Je klant keurt <span className="neon-text-glow">direct</span> goed</>}
      subtitle="Eigen portaal voor je klanten. Offertes goedkeuren, facturen bekijken, tekeningen downloaden."
      highlights={[
        {
          icon: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
            </svg>
          ),
          title: 'Online Goedkeurflow',
          description: 'Klanten keuren offertes direct goed in hun portaal. Geen e-mail heen-en-weer, geen PDF\'s ondertekenen.',
        },
        {
          icon: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          ),
          title: 'Documenten & Tekeningen',
          description: 'Alle documenten op één plek. Tekeningen, renders en bestanden direct beschikbaar voor je klant.',
        },
        {
          icon: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
            </svg>
          ),
          title: 'Facturen Inzien',
          description: 'Klanten zien hun facturen en betalingsstatus. Transparant en overzichtelijk.',
        },
      ]}
      demo={<KlantportaalDemo />}
      demoTitle="Bekijk het klantportaal"
      demoSubtitle="Zo ziet jouw klant het. Keur een offerte goed en bekijk de tekeningen."
    />
  );
}
