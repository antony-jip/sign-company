'use client';

import React, { useState } from 'react';
import FeaturePage from '@/components/landing/FeaturePage';

/* ─── Offerte Wizard Demo ─── */
function OfferteWizard() {
  const [step, setStep] = useState(1);
  const [klant, setKlant] = useState('');
  const [lines, setLines] = useState([
    { id: 1, desc: 'LED lichtreclame', qty: 1, inkoop: 480, marge: 100 },
    { id: 2, desc: 'Montage op locatie', qty: 4, inkoop: 55, marge: 118 },
  ]);

  const addLine = () => {
    setLines(prev => [...prev, { id: Date.now(), desc: '', qty: 1, inkoop: 0, marge: 50 }]);
  };

  const removeLine = (id: number) => {
    if (lines.length > 1) setLines(prev => prev.filter(l => l.id !== id));
  };

  const updateLine = (id: number, field: string, value: string | number) => {
    setLines(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l));
  };

  const getVerkoop = (inkoop: number, marge: number) => inkoop + (inkoop * marge / 100);
  const subtotal = lines.reduce((sum, l) => sum + l.qty * getVerkoop(l.inkoop, l.marge), 0);
  const btw = subtotal * 0.21;
  const total = subtotal + btw;
  const totalInkoop = lines.reduce((sum, l) => sum + l.qty * l.inkoop, 0);
  const totalMarge = subtotal - totalInkoop;

  const uren = [
    { medewerker: 'Joris', uren: 6.5, tarief: 65 },
    { medewerker: 'Mark', uren: 4, tarief: 55 },
  ];
  const totalUren = uren.reduce((s, u) => s + u.uren, 0);
  const totalUrenKosten = uren.reduce((s, u) => s + u.uren * u.tarief, 0);

  const fmt = (n: number) => n.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="bg-white rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.06)] border border-ink-10 overflow-hidden">
      {/* Steps indicator */}
      <div className="bg-lavender-light/30 px-6 py-4 border-b border-ink-10">
        <div className="flex items-center justify-between max-w-md mx-auto">
          {[
            { num: 1, label: 'Klant' },
            { num: 2, label: 'Regels' },
            { num: 3, label: 'Overzicht' },
          ].map((s, i) => (
            <React.Fragment key={s.num}>
              {i > 0 && <div className={`flex-1 h-0.5 mx-3 transition-colors ${step >= s.num ? 'bg-lavender-deep' : 'bg-ink-10'}`} />}
              <button
                onClick={() => setStep(s.num)}
                className={`flex items-center gap-2 transition-colors ${step >= s.num ? 'text-lavender-deep' : 'text-ink-40'}`}
              >
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  step >= s.num ? 'bg-lavender-deep text-white' : 'bg-ink-10 text-ink-40'
                }`}>
                  {step > s.num ? '✓' : s.num}
                </span>
                <span className="text-[13px] font-medium hidden sm:inline">{s.label}</span>
              </button>
            </React.Fragment>
          ))}
        </div>
      </div>

      <div className="p-6">
        {/* Step 1: Klant */}
        {step === 1 && (
          <div className="space-y-4">
            <h3 className="font-heading text-[16px] font-bold text-ink">Selecteer klant</h3>
            <input
              type="text"
              value={klant}
              onChange={(e) => setKlant(e.target.value)}
              placeholder="Zoek een klant..."
              className="w-full bg-ink-05 rounded-xl px-4 py-3 text-[14px] border border-ink-10 focus:outline-none focus:ring-2 focus:ring-lavender/50 text-ink placeholder:text-ink-40"
            />
            <div className="space-y-2">
              {['Bakkerij Jansen', 'Matec Amsterdam', 'Van Dijk Installatie', 'Studio Bloom'].map(name => (
                <button
                  key={name}
                  onClick={() => { setKlant(name); setStep(2); }}
                  className={`w-full text-left px-4 py-3 rounded-xl border transition-all text-[14px] ${
                    klant === name
                      ? 'border-lavender bg-lavender-light/40 text-lavender-deep font-medium'
                      : 'border-ink-10 hover:border-lavender/50 text-ink'
                  }`}
                >
                  <span className="font-medium">{name}</span>
                  <span className="text-ink-40 ml-2 text-[12px]">Amsterdam</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Regels met marge */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-[16px] font-bold text-ink">Offerteregels</h3>
              <span className="pastel-pill bg-lavender-light text-lavender-deep">
                {klant || 'Geen klant'}
              </span>
            </div>

            {/* Header */}
            <div className="hidden md:grid grid-cols-12 gap-2 px-1 text-[11px] font-semibold text-ink-40 uppercase tracking-wide">
              <div className="col-span-4">Omschrijving</div>
              <div className="col-span-1 text-center">Aantal</div>
              <div className="col-span-2 text-right">Inkoop</div>
              <div className="col-span-2 text-center">Marge %</div>
              <div className="col-span-2 text-right">Verkoop</div>
              <div className="col-span-1" />
            </div>

            <div className="space-y-2">
              {lines.map((line) => (
                <div key={line.id} className="grid grid-cols-12 gap-2 items-center group">
                  <input
                    type="text"
                    value={line.desc}
                    onChange={(e) => updateLine(line.id, 'desc', e.target.value)}
                    placeholder="Omschrijving..."
                    className="col-span-12 md:col-span-4 bg-ink-05 rounded-lg px-3 py-2.5 text-[14px] border border-ink-10 focus:outline-none focus:ring-2 focus:ring-lavender/50 text-ink"
                  />
                  <input
                    type="number"
                    value={line.qty}
                    onChange={(e) => updateLine(line.id, 'qty', Number(e.target.value))}
                    className="col-span-3 md:col-span-1 bg-ink-05 rounded-lg px-2 py-2.5 text-[14px] text-center border border-ink-10 focus:outline-none focus:ring-2 focus:ring-lavender/50 text-ink"
                    min={1}
                  />
                  <div className="col-span-3 md:col-span-2 relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[13px] text-ink-40">€</span>
                    <input
                      type="number"
                      value={line.inkoop}
                      onChange={(e) => updateLine(line.id, 'inkoop', Number(e.target.value))}
                      className="w-full bg-ink-05 rounded-lg pl-7 pr-2 py-2.5 text-[14px] text-right border border-ink-10 focus:outline-none focus:ring-2 focus:ring-lavender/50 text-ink"
                    />
                  </div>
                  <div className="col-span-3 md:col-span-2 relative">
                    <input
                      type="number"
                      value={line.marge}
                      onChange={(e) => updateLine(line.id, 'marge', Number(e.target.value))}
                      className="w-full bg-ink-05 rounded-lg px-2 py-2.5 text-[14px] text-center border border-ink-10 focus:outline-none focus:ring-2 focus:ring-lavender/50 text-ink"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[13px] text-ink-40">%</span>
                  </div>
                  <div className="col-span-2 md:col-span-2 text-right text-[14px] font-mono text-ink pr-1">
                    €{fmt(getVerkoop(line.inkoop, line.marge))}
                  </div>
                  <button
                    onClick={() => removeLine(line.id)}
                    className="col-span-1 opacity-0 group-hover:opacity-100 text-ink-20 hover:text-blush-deep transition-all p-1 justify-self-center"
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
              className="w-full py-2.5 border-2 border-dashed border-ink-10 rounded-xl text-[14px] text-ink-40 hover:text-lavender-deep hover:border-lavender transition-colors flex items-center justify-center gap-1"
            >
              + Regel toevoegen
            </button>

            {/* Marge samenvatting */}
            <div className="bg-lavender-light/20 rounded-xl p-4 border border-lavender/20">
              <div className="flex justify-between text-[13px]">
                <span className="text-ink-60">Totaal inkoop</span>
                <span className="font-mono text-ink">€{fmt(totalInkoop)}</span>
              </div>
              <div className="flex justify-between text-[13px] mt-1">
                <span className="text-ink-60">Marge</span>
                <span className="font-mono text-sage-deep font-semibold">+€{fmt(totalMarge)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Overzicht */}
        {step === 3 && (
          <div className="space-y-5">
            <h3 className="font-heading text-[16px] font-bold text-ink">Overzicht</h3>
            <div className="bg-ink-05 rounded-xl p-5 border border-ink-10">
              <div className="flex justify-between mb-4">
                <span className="text-[13px] text-ink-60">Klant</span>
                <span className="text-[14px] font-medium text-ink">{klant || 'Niet geselecteerd'}</span>
              </div>
              <div className="border-t border-ink-10 pt-4 space-y-2">
                {lines.filter(l => l.desc).map(line => (
                  <div key={line.id} className="flex justify-between text-[14px]">
                    <span className="text-ink-60">{line.desc} ({line.qty}x)</span>
                    <span className="font-mono text-ink">€{fmt(line.qty * getVerkoop(line.inkoop, line.marge))}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-ink-10 mt-4 pt-4 space-y-1.5">
                <div className="flex justify-between text-[13px] text-ink-60">
                  <span>Subtotaal</span>
                  <span className="font-mono">€{fmt(subtotal)}</span>
                </div>
                <div className="flex justify-between text-[13px] text-ink-60">
                  <span>BTW 21%</span>
                  <span className="font-mono">€{fmt(btw)}</span>
                </div>
                <div className="flex justify-between text-[16px] font-bold text-ink pt-2">
                  <span>Totaal</span>
                  <span className="font-mono">€{fmt(total)}</span>
                </div>
              </div>
            </div>

            {/* Uren overzicht */}
            <div className="bg-sage-light/20 rounded-xl p-5 border border-sage/20">
              <div className="flex items-center gap-2 mb-3">
                <svg className="w-4 h-4 text-sage-deep" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-[13px] font-semibold text-sage-deep uppercase tracking-wide">Uren overzicht</p>
              </div>
              <div className="space-y-2">
                {uren.map(u => (
                  <div key={u.medewerker} className="flex justify-between text-[14px]">
                    <span className="text-ink-60">{u.medewerker} · {u.uren}u × €{u.tarief}</span>
                    <span className="font-mono text-ink">€{fmt(u.uren * u.tarief)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-sage/20 mt-3 pt-3 flex justify-between text-[14px] font-semibold">
                <span className="text-sage-deep">{totalUren} uur totaal</span>
                <span className="font-mono text-ink">€{fmt(totalUrenKosten)}</span>
              </div>
            </div>

            <button className="w-full bg-ink hover:bg-ink-80 text-white font-semibold px-6 py-3 rounded-xl transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_28px_rgba(0,0,0,0.15)] text-[14px]">
              Offerte versturen als PDF →
            </button>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-6 pt-4 border-t border-ink-10">
          <button
            onClick={() => setStep(Math.max(1, step - 1))}
            disabled={step === 1}
            className="text-[13px] text-ink-40 hover:text-ink-60 disabled:opacity-30 transition-colors"
          >
            ← Vorige
          </button>
          <button
            onClick={() => setStep(Math.min(3, step + 1))}
            disabled={step === 3}
            className="text-[13px] text-lavender-deep hover:text-lavender-vivid disabled:opacity-30 transition-colors font-medium"
          >
            Volgende →
          </button>
        </div>
      </div>
    </div>
  );
}

export default function OffertesFeaturePage() {
  return (
    <FeaturePage
      color="lavender"
      overline="Offertes"
      heading={<>Professionele offertes in <span className="neon-text-glow">drie stappen</span></>}
      subtitle="Klant selecteren, regels toevoegen, versturen. Inkoop + marge wordt automatisch doorberekend."
      highlights={[
        {
          icon: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          ),
          title: 'Slimme Templates',
          description: 'Gebruik voorgedefinieerde templates voor terugkerende offertes. Pas aan, verstuur, klaar.',
        },
        {
          icon: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V13.5zm0 2.25h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V18zm2.498-6.75h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V13.5zm0 2.25h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V18zm2.504-6.75h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V13.5z" />
              <path d="M8.25 6h7.5v2.25h-7.5V6zM12 2.25c-1.892 0-3.758.11-5.593.322C5.307 2.7 4.5 3.65 4.5 4.757V19.5a2.25 2.25 0 002.25 2.25h10.5a2.25 2.25 0 002.25-2.25V4.757c0-1.108-.806-2.057-1.907-2.185A48.507 48.507 0 0012 2.25z" />
            </svg>
          ),
          title: 'Inkoop + Marge = Verkoopprijs',
          description: 'Voer inkoop en margepercentage in, verkoopprijs wordt automatisch berekend. Plus uren-overzicht per offerte.',
        },
        {
          icon: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
          ),
          title: 'Direct Versturen als PDF',
          description: 'Stuur offertes als PDF via e-mail. Klanten kunnen online accorderen via het klantportaal.',
        },
      ]}
      demo={<OfferteWizard />}
      demoTitle="Bouw zelf een offerte"
      demoSubtitle="Doorloop de drie stappen. Let op de marge-berekening en het uren-overzicht."
    />
  );
}
