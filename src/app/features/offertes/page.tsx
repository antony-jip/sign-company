'use client';

import React, { useState } from 'react';
import { FeaturePageTemplate } from '@/components/FeaturePageTemplate';

/* ─── 3-Step Offerte Wizard ─── */
const OfferteWizard: React.FC = () => {
  const [step, setStep] = useState(1);
  const [klant, setKlant] = useState('');
  const [lines, setLines] = useState([
    { id: 1, desc: 'LED lichtreclame', qty: 1, price: 960 },
    { id: 2, desc: 'Montage op locatie', qty: 4, price: 120 },
  ]);

  const addLine = () => {
    setLines(prev => [...prev, { id: Date.now(), desc: '', qty: 1, price: 0 }]);
  };

  const removeLine = (id: number) => {
    if (lines.length > 1) setLines(prev => prev.filter(l => l.id !== id));
  };

  const updateLine = (id: number, field: string, value: string | number) => {
    setLines(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l));
  };

  const subtotal = lines.reduce((sum, l) => sum + l.qty * l.price, 0);
  const btw = subtotal * 0.21;
  const total = subtotal + btw;

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-lavender/30 overflow-hidden">
      {/* Steps indicator */}
      <div className="bg-lavender-light/30 px-6 py-4 border-b border-lavender/20">
        <div className="flex items-center justify-between max-w-md mx-auto">
          {[
            { num: 1, label: 'Klant' },
            { num: 2, label: 'Regels' },
            { num: 3, label: 'Overzicht' },
          ].map((s, i) => (
            <React.Fragment key={s.num}>
              {i > 0 && <div className={`flex-1 h-0.5 mx-3 ${step >= s.num ? 'bg-lavender-deep' : 'bg-gray-200'}`} />}
              <button
                onClick={() => setStep(s.num)}
                className={`flex items-center gap-2 ${step >= s.num ? 'text-lavender-deep' : 'text-gray-400'}`}
              >
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  step >= s.num ? 'bg-lavender-deep text-white' : 'bg-gray-200 text-gray-400'
                }`}>
                  {step > s.num ? '✓' : s.num}
                </span>
                <span className="text-sm font-medium hidden sm:inline">{s.label}</span>
              </button>
            </React.Fragment>
          ))}
        </div>
      </div>

      <div className="p-6">
        {/* Step 1: Klant */}
        {step === 1 && (
          <div className="space-y-4">
            <h3 className="font-bold text-gray-900">Selecteer klant</h3>
            <input
              type="text"
              value={klant}
              onChange={(e) => setKlant(e.target.value)}
              placeholder="Zoek een klant..."
              className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm border border-gray-100 focus:outline-none focus:ring-2 focus:ring-lavender/50"
            />
            <div className="space-y-2">
              {['Bakkerij Jansen', 'Matec Amsterdam', 'Van Dijk Installatie', 'Studio Bloom'].map(name => (
                <button
                  key={name}
                  onClick={() => { setKlant(name); setStep(2); }}
                  className={`w-full text-left px-4 py-3 rounded-xl border transition-all text-sm ${
                    klant === name
                      ? 'border-lavender bg-lavender-light/40 text-lavender-deep font-medium'
                      : 'border-gray-100 hover:border-lavender/50 text-gray-700'
                  }`}
                >
                  <span className="font-medium">{name}</span>
                  <span className="text-gray-400 ml-2 text-xs">Amsterdam</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Regels */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-900">Offerteregels</h3>
              <span className="pastel-pill bg-lavender-light text-lavender-deep">
                {klant || 'Geen klant'}
              </span>
            </div>
            <div className="space-y-2">
              {lines.map((line) => (
                <div key={line.id} className="flex items-center gap-2 group">
                  <input
                    type="text"
                    value={line.desc}
                    onChange={(e) => updateLine(line.id, 'desc', e.target.value)}
                    placeholder="Omschrijving..."
                    className="flex-1 bg-gray-50 rounded-lg px-3 py-2.5 text-sm border border-gray-100 focus:outline-none focus:ring-2 focus:ring-lavender/50 min-w-0"
                  />
                  <input
                    type="number"
                    value={line.qty}
                    onChange={(e) => updateLine(line.id, 'qty', Number(e.target.value))}
                    className="w-14 bg-gray-50 rounded-lg px-2 py-2.5 text-sm text-center border border-gray-100 focus:outline-none focus:ring-2 focus:ring-lavender/50"
                    min={1}
                  />
                  <div className="relative w-24">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-gray-400">&euro;</span>
                    <input
                      type="number"
                      value={line.price}
                      onChange={(e) => updateLine(line.id, 'price', Number(e.target.value))}
                      className="w-full bg-gray-50 rounded-lg pl-7 pr-2 py-2.5 text-sm text-right border border-gray-100 focus:outline-none focus:ring-2 focus:ring-lavender/50"
                    />
                  </div>
                  <button
                    onClick={() => removeLine(line.id)}
                    className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all p-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={addLine}
              className="w-full py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-400 hover:text-lavender-deep hover:border-lavender transition-colors flex items-center justify-center gap-1"
            >
              + Regel toevoegen
            </button>
          </div>
        )}

        {/* Step 3: Overzicht */}
        {step === 3 && (
          <div className="space-y-4">
            <h3 className="font-bold text-gray-900">Overzicht</h3>
            <div className="bg-lavender-light/20 rounded-xl p-4 border border-lavender/20">
              <div className="flex justify-between mb-3">
                <span className="text-sm text-gray-500">Klant</span>
                <span className="text-sm font-medium text-gray-900">{klant || 'Niet geselecteerd'}</span>
              </div>
              <div className="border-t border-lavender/20 pt-3 space-y-2">
                {lines.filter(l => l.desc).map(line => (
                  <div key={line.id} className="flex justify-between text-sm">
                    <span className="text-gray-600">{line.desc} ({line.qty}x)</span>
                    <span className="text-gray-900">&euro;{(line.qty * line.price).toLocaleString('nl-NL', { minimumFractionDigits: 2 })}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-lavender/20 mt-3 pt-3 space-y-1">
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Subtotaal</span>
                  <span>&euro;{subtotal.toLocaleString('nl-NL', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-500">
                  <span>BTW 21%</span>
                  <span>&euro;{btw.toLocaleString('nl-NL', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-base font-bold text-gray-900 pt-1">
                  <span>Totaal</span>
                  <span>&euro;{total.toLocaleString('nl-NL', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>
            <button className="w-full bg-gradient-to-r from-lavender-deep to-lavender-vivid hover:from-lavender-vivid hover:to-lavender-deep text-white font-semibold px-6 py-3 rounded-xl transition-all hover:scale-[1.02]">
              Offerte versturen
            </button>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-6 pt-4 border-t border-gray-100">
          <button
            onClick={() => setStep(Math.max(1, step - 1))}
            disabled={step === 1}
            className="text-sm text-gray-400 hover:text-gray-600 disabled:opacity-30 transition-colors"
          >
            &larr; Vorige
          </button>
          <button
            onClick={() => setStep(Math.min(3, step + 1))}
            disabled={step === 3}
            className="text-sm text-lavender-deep hover:text-lavender-vivid disabled:opacity-30 transition-colors font-medium"
          >
            Volgende &rarr;
          </button>
        </div>
      </div>
    </div>
  );
};

const docIcon = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
  </svg>
);

const calcIcon = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V13.5zm0 2.25h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V18zm2.498-6.75h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V13.5zm0 2.25h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V18zm2.504-6.75h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V13.5zm0 2.25h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V18zm2.498-6.75h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V13.5zM8.25 6h7.5v2.25h-7.5V6zM12 2.25c-1.892 0-3.758.11-5.593.322C5.307 2.7 4.5 3.65 4.5 4.757V19.5a2.25 2.25 0 002.25 2.25h10.5a2.25 2.25 0 002.25-2.25V4.757c0-1.108-.806-2.057-1.907-2.185A48.507 48.507 0 0012 2.25z" />
  </svg>
);

const sendIcon = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
  </svg>
);

export default function OffertesFeaturePage() {
  return (
    <FeaturePageTemplate
      color="lavender"
      badge="Offertes"
      title="Professionele offertes in"
      titleHighlight="drie stappen"
      subtitle="Van klant selecteren tot versturen — FORGEdesk maakt het maken van offertes snel en foutloos. Met automatische berekeningen en templates."
      highlights={[
        {
          icon: docIcon,
          title: 'Slimme Templates',
          description: 'Gebruik voorgedefinieerde templates voor terugkerende offertes. Pas aan, verstuur, klaar.',
        },
        {
          icon: calcIcon,
          title: 'Automatische Berekeningen',
          description: 'BTW, kortingen en marges worden automatisch berekend. Nooit meer fouten in je offertes.',
        },
        {
          icon: sendIcon,
          title: 'Direct Versturen',
          description: 'Stuur offertes als PDF via e-mail. Klanten kunnen online accorderen via het klantportaal.',
        },
      ]}
      demo={<OfferteWizard />}
      demoTitle="Bouw zelf een offerte"
      demoSubtitle="Doorloop de drie stappen: klant selecteren, regels toevoegen en versturen."
    />
  );
}
