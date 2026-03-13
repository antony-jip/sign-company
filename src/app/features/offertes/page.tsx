'use client';

import React from 'react';
import { FeaturePageTemplate } from '@/components/features/FeaturePageTemplate';
import { OffertePageDemo } from '@/components/features/OffertePageDemo';

export default function OffertesPage() {
  return (
    <FeaturePageTemplate
      colorKey="blush"
      badge="Offertes & Facturen"
      headline={
        <>
          Van offerte tot{' '}
          <span className="text-gradient-forge">betaling</span>
        </>
      }
      subtext="Bouw professionele offertes met calculaties, verstuur ze als PDF, en converteer naar factuur met één klik."
      heroVisual={
        <div className="relative">
          <div className="bg-gradient-to-br from-blush-light via-blush/20 to-white rounded-3xl p-8 border border-blush/20 shadow-2xl">
            <div className="space-y-4">
              {/* Mini offerte preview */}
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Offerte</p>
                  <p className="font-bold text-gray-900 text-sm">OFF-2026-047</p>
                </div>
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-emerald-50 text-emerald-600 px-2 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Goedgekeurd
                </span>
              </div>

              {/* Mini line items */}
              <div className="space-y-1.5">
                {[
                  { desc: 'LED lichtreclame', amount: '€960,00' },
                  { desc: 'Montage (4 uur)', amount: '€480,00' },
                  { desc: 'Transport', amount: '€85,00' },
                ].map((item) => (
                  <div key={item.desc} className="flex justify-between text-xs">
                    <span className="text-gray-500">{item.desc}</span>
                    <span className="text-gray-800 font-medium">{item.amount}</span>
                  </div>
                ))}
              </div>

              <div className="h-px bg-blush/20" />

              <div className="flex justify-between text-sm font-bold">
                <span className="text-gray-700">Totaal incl. BTW</span>
                <span className="text-blush-deep">&euro;1.845,25</span>
              </div>

              {/* Metrics row */}
              <div className="grid grid-cols-3 gap-2 mt-2">
                {[
                  { label: 'Conversie', value: '72%', color: 'text-blush-deep' },
                  { label: 'Open', value: '3', color: 'text-amber-600' },
                  { label: 'Betaald', value: '€12.4K', color: 'text-emerald-600' },
                ].map((m) => (
                  <div key={m.label} className="bg-white/80 rounded-lg p-2.5 text-center border border-gray-100">
                    <p className="text-[10px] text-gray-400 uppercase">{m.label}</p>
                    <p className={`text-lg font-bold ${m.color}`}>{m.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Floating badges */}
          <div className="absolute -top-3 -right-3 bg-white rounded-xl shadow-lg px-3 py-2 border border-blush/20 animate-float">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-xs font-medium text-gray-700">Factuur verzonden</span>
            </div>
          </div>
          <div className="absolute -bottom-3 -left-3 bg-white rounded-xl shadow-lg px-3 py-2 border border-blush/20 animate-float-slow">
            <div className="flex items-center gap-2">
              <svg className="w-3.5 h-3.5 text-blush-vivid" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V13.5zm0 2.25h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V18zm2.498-6.75h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V13.5zm0 2.25h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V18zm2.504-6.75h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V13.5zm0 2.25h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V18zm2.498-6.75h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V13.5zM8.25 6h7.5v2.25h-7.5V6zM12 2.25c-1.892 0-3.758.11-5.593.322C5.307 2.7 4.5 3.65 4.5 4.757V19.5a2.25 2.25 0 002.25 2.25h10.5a2.25 2.25 0 002.25-2.25V4.757c0-1.108-.806-2.057-1.907-2.185A48.507 48.507 0 0012 2.25z" />
              </svg>
              <span className="text-xs font-medium text-gray-700">PDF klaar</span>
            </div>
          </div>
        </div>
      }
      demo={<OffertePageDemo />}
      demoLabel="De complete offerte-flow"
      features={[
        {
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V13.5zm0 2.25h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V18zm2.498-6.75h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V13.5zm0 2.25h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V18zm2.504-6.75h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V13.5zm0 2.25h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V18zm2.498-6.75h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V13.5zM8.25 6h7.5v2.25h-7.5V6zM12 2.25c-1.892 0-3.758.11-5.593.322C5.307 2.7 4.5 3.65 4.5 4.757V19.5a2.25 2.25 0 002.25 2.25h10.5a2.25 2.25 0 002.25-2.25V4.757c0-1.108-.806-2.057-1.907-2.185A48.507 48.507 0 0012 2.25z" />
            </svg>
          ),
          title: 'Smart Calculator',
          description: 'Complexe calculaties, simpel gepresenteerd. Voeg regels toe, pas aantallen aan en zie direct je marges.',
        },
        {
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.354a4.5 4.5 0 00-6.364-6.364L4.5 8.25l1.757 1.757" />
            </svg>
          ),
          title: 'Probo Integratie',
          description: 'Live materiaalprijzen direct uit de Probo catalogus. Altijd actuele inkoopprijzen in je offerte.',
        },
        {
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.678 48.678 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3l-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 003.7 3.7 48.656 48.656 0 007.324 0 4.006 4.006 0 003.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3l-3 3" />
            </svg>
          ),
          title: 'Versioning',
          description: 'Meerdere versies van dezelfde offerte, altijd het overzicht. Vergelijk wijzigingen en herstel eerdere versies.',
        },
        {
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          ),
          title: 'PDF & Verzending',
          description: 'Professionele PDF\'s met je eigen huisstijl, direct verstuurd per e-mail. Inclusief leesbevestiging.',
        },
      ]}
      useCases={[
        {
          title: 'Lichtreclame offerte met calculatie',
          description: 'Stel een offerte samen met materiaalkosten, productie-uren en montage. De calculator berekent automatisch marges en toont de klant een heldere prijsopbouw.',
        },
        {
          title: 'Van goedkeuring naar factuur in één klik',
          description: 'Zodra je klant akkoord geeft via het klantportaal, converteer je de offerte naar factuur. Alle regels, BTW en klantgegevens worden automatisch overgenomen.',
        },
        {
          title: 'Meerdere versies voor grote projecten',
          description: 'Bij signing projecten wijzigen specificaties vaak. Maak eenvoudig een nieuwe versie van je offerte, behoud het overzicht en laat de klant altijd de laatste versie zien.',
        },
      ]}
    />
  );
}
