'use client';

import React from 'react';
import { FeaturePageTemplate } from '@/components/features/FeaturePageTemplate';
import { PortaalPageDemo } from '@/components/features/PortaalPageDemo';

export default function KlantportaalPage() {
  return (
    <FeaturePageTemplate
      colorKey="sage"
      badge="Klantportaal"
      headline={
        <>
          Je klant ziet wat jij{' '}
          <span className="text-gradient-forge">wilt</span>
        </>
      }
      subtext="Deel offertes, ontwerpen en facturen via een professioneel portaal. Je klant reageert, keurt goed of betaalt — zonder in te loggen."
      heroVisual={
        <div className="relative">
          <div className="bg-gradient-to-br from-sage-light via-sage/20 to-white rounded-3xl p-8 border border-sage/20 shadow-2xl">
            <div className="space-y-4">
              {/* Portal preview card */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="bg-gradient-to-r from-sage-light to-sage/20 px-4 py-3 flex items-center gap-2 border-b border-sage/10">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-sage-vivid to-sage-deep flex items-center justify-center">
                    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" />
                    </svg>
                  </div>
                  <span className="text-xs font-bold text-gray-700">Klantportaal</span>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Offerte OFF-2026-052</span>
                    <span className="text-xs font-semibold text-sage-deep bg-sage-light px-2 py-0.5 rounded-full">Goedgekeurd</span>
                  </div>
                  <div className="h-1.5 bg-sage-light rounded-full overflow-hidden">
                    <div className="h-full w-3/4 bg-gradient-to-r from-sage-vivid to-sage-deep rounded-full" />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: 'Offerte', status: 'done' },
                      { label: 'Ontwerp', status: 'active' },
                      { label: 'Factuur', status: 'pending' },
                    ].map((step) => (
                      <div key={step.label} className="text-center">
                        <div className={`w-6 h-6 rounded-full mx-auto mb-1 flex items-center justify-center ${
                          step.status === 'done' ? 'bg-sage-deep' :
                          step.status === 'active' ? 'bg-sage-vivid' :
                          'bg-gray-200'
                        }`}>
                          {step.status === 'done' ? (
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                          ) : step.status === 'active' ? (
                            <span className="w-2 h-2 rounded-full bg-white" />
                          ) : (
                            <span className="w-2 h-2 rounded-full bg-gray-400" />
                          )}
                        </div>
                        <p className={`text-[10px] font-medium ${
                          step.status === 'done' ? 'text-sage-deep' :
                          step.status === 'active' ? 'text-sage-vivid' :
                          'text-gray-400'
                        }`}>{step.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Floating notification badges */}
          <div className="absolute -top-3 -right-3 bg-white rounded-xl shadow-lg px-3 py-2 border border-sage/20 animate-float">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-sage-vivid" />
              <span className="text-xs font-medium text-gray-700">Offerte bekeken</span>
            </div>
          </div>
          <div className="absolute -bottom-3 -left-3 bg-white rounded-xl shadow-lg px-3 py-2 border border-sage/20 animate-float-slow">
            <div className="flex items-center gap-2">
              <svg className="w-3.5 h-3.5 text-sage-vivid" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-xs font-medium text-gray-700">Klant akkoord</span>
            </div>
          </div>
          <div className="absolute top-1/2 -right-5 bg-white rounded-xl shadow-lg px-3 py-2 border border-sage/20 animate-float">
            <div className="flex items-center gap-2">
              <svg className="w-3.5 h-3.5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
              </svg>
              <span className="text-xs font-medium text-gray-700">Betaling ontvangen</span>
            </div>
          </div>
        </div>
      }
      demo={<PortaalPageDemo />}
      demoLabel="Zo ervaart je klant het"
      features={[
        {
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
          ),
          title: 'Veilige links',
          description: 'Unieke token per klant, verloopdatum instelbaar. Geen account nodig — gewoon klikken en bekijken.',
        },
        {
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          title: 'Goedkeuringsworkflow',
          description: 'Akkoord met 1 klik, wijzigingen aanvragen. Alles wordt automatisch teruggekoppeld in je project.',
        },
        {
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
          ),
          title: 'Bestandsuploads',
          description: 'Klant kan bestanden uploaden en reageren. Foto\'s, documenten of feedback — alles op één plek.',
        },
        {
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.64 0 8.577 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.64 0-8.577-3.007-9.963-7.178z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          ),
          title: 'Bekeken-tracking',
          description: 'Zie wanneer je klant de offerte opent. Weet precies of je moet nabellen of rustig kunt afwachten.',
        },
      ]}
      useCases={[
        {
          title: 'Offerte goedkeuren zonder gedoe',
          description: 'Je klant ontvangt een link, bekijkt de offerte in een professioneel portaal en keurt goed met één klik. Geen PDF\'s meer heen en weer mailen — alles wordt direct verwerkt in je project.',
        },
        {
          title: 'Ontwerp feedback verzamelen',
          description: 'Deel je ontwerp via het portaal en laat je klant direct op de afbeelding reageren met pinpoints. Geen misverstanden meer over "die tekst linksboven" — elke opmerking zit op de juiste plek.',
        },
        {
          title: 'Factuur betalen vanuit het portaal',
          description: 'Na oplevering ziet je klant de factuur in hetzelfde portaal. Betalen kan direct via iDEAL of overschrijving. Jij ziet realtime wanneer de betaling binnenkomt.',
        },
      ]}
    />
  );
}
