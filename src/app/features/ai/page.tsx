'use client';

import React from 'react';
import { FeaturePageTemplate } from '@/components/features/FeaturePageTemplate';
import { AIPageDemo } from '@/components/features/AIPageDemo';

export default function AIFeaturesPage() {
  return (
    <FeaturePageTemplate
      colorKey="lavender"
      badge="AI-Powered"
      headline={
        <>
          AI die je bedrijf{' '}
          <span className="text-gradient-ai">begrijpt</span>
        </>
      }
      subtext="Forgie analyseert je data, schrijft je teksten en maakt je mockups. Geen prompts nodig — gewoon vragen."
      heroVisual={
        <div className="relative">
          <div className="bg-gradient-to-br from-lavender-light via-lavender/20 to-white rounded-3xl p-8 border border-lavender/20 shadow-2xl">
            <div className="space-y-4">
              {/* Simulated AI conversation preview */}
              <div className="flex gap-3 items-start">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-lavender-vivid to-lavender-deep flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                  </svg>
                </div>
                <div className="bg-white rounded-xl rounded-tl-md p-3 shadow-sm border border-lavender/10 flex-1">
                  <p className="text-sm text-gray-700">Je omzet deze maand is <strong>€24.850</strong> — 12% hoger dan vorige maand.</p>
                </div>
              </div>
              <div className="flex gap-3 items-start justify-end">
                <div className="bg-gradient-to-r from-lavender-vivid to-lavender-deep rounded-xl rounded-tr-md p-3 shadow-sm max-w-[70%]">
                  <p className="text-sm text-white">Plan de montage voor volgende week</p>
                </div>
              </div>
              {/* Metrics */}
              <div className="grid grid-cols-3 gap-2 mt-2">
                {[
                  { label: 'Omzet', value: '€24.8K', color: 'text-sage-deep' },
                  { label: 'Projecten', value: '7', color: 'text-mist-deep' },
                  { label: 'Conversie', value: '68%', color: 'text-lavender-deep' },
                ].map(m => (
                  <div key={m.label} className="bg-white/80 rounded-lg p-2.5 text-center border border-gray-100">
                    <p className="text-[10px] text-gray-400 uppercase">{m.label}</p>
                    <p className={`text-lg font-bold ${m.color}`}>{m.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
          {/* Floating badges */}
          <div className="absolute -top-3 -right-3 bg-white rounded-xl shadow-lg px-3 py-2 border border-lavender/20 animate-float">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-sage-vivid" />
              <span className="text-xs font-medium text-gray-700">3 taken voltooid</span>
            </div>
          </div>
          <div className="absolute -bottom-3 -left-3 bg-white rounded-xl shadow-lg px-3 py-2 border border-lavender/20 animate-float-slow">
            <div className="flex items-center gap-2">
              <svg className="w-3.5 h-3.5 text-lavender-vivid" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
              <span className="text-xs font-medium text-gray-700">AI-powered</span>
            </div>
          </div>
        </div>
      }
      demo={<AIPageDemo />}
      demoLabel="Probeer het zelf"
      features={[
        {
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
          ),
          title: 'Forgie Chat',
          description: 'Vraag alles over je bedrijf — omzet, klanten, planning. Forgie kent je data en geeft direct antwoord.',
        },
        {
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
            </svg>
          ),
          title: 'Tekst Verbeteraar',
          description: 'Professionele emails, offerteteksten en projectupdates — in 1 klik herschreven in de juiste toon.',
        },
        {
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
            </svg>
          ),
          title: 'Signing Visualizer',
          description: 'Upload een foto, beschrijf je concept — AI genereert een fotorealistisch mockup van je sign op locatie.',
        },
        {
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          ),
          title: 'Inkoop Analyse',
          description: 'Upload een inkoopofferte van je leverancier — AI leest en analyseert automatisch de prijzen en voorwaarden.',
        },
      ]}
      useCases={[
        {
          title: 'Offerte maken in 30 seconden',
          description: 'Vraag Forgie: "Maak een offerte voor LED lichtreclame voor Bakkerij Jansen." Forgie maakt de offerte aan met de juiste regels, prijzen en klantgegevens.',
        },
        {
          title: 'Klant overtuigen met een mockup',
          description: 'Upload een foto van het pand, typ "groene LED letters boven de deur" — binnen seconden heb je een presenteerbaar mockup voor je klant.',
        },
        {
          title: 'Professionele communicatie zonder moeite',
          description: 'Typ een snelle notitie, kies de toon (formeel/zakelijk/informeel) en de Tekst Verbeteraar maakt er een professionele email van.',
        },
      ]}
    />
  );
}
