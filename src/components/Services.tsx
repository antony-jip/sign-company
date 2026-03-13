'use client';

import React from 'react';
import { useScrollAnimation } from './useScrollAnimation';

const OfferteShowcase: React.FC = () => {
  const ref = useScrollAnimation();
  return (
    <section id="features" ref={ref} className="py-20 lg:py-32 bg-gradient-to-b from-blush-light/30 to-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:gap-16">
          <div className="lg:w-[40%] mb-10 lg:mb-0">
            <span className="pastel-pill bg-blush-light text-blush-deep mb-4 inline-flex">Offertes</span>
            <h2 className="slide-left text-[32px] lg:text-[36px] font-black tracking-tight leading-tight mb-6">
              Offertes die <span className="text-gradient-forge">indruk</span> maken
            </h2>
            <p className="slide-left stagger-1 text-lg text-gray-500 leading-relaxed">
              Bouw je offerte op met regels, calculaties en materiaallijsten. Je klant ziet een strakke <strong className="text-gray-900">PDF</strong> — jij ziet je <strong className="text-gray-900">marge</strong>.
            </p>
          </div>
          <div className="lg:w-[55%]">
            <div className="slide-right bg-white rounded-2xl shadow-xl p-6 lg:p-8 border border-blush/20 interactive-card">
              <div className="flex justify-between items-start mb-6">
                <div><p className="font-bold text-gray-900">FORGEdesk</p><p className="text-sm text-gray-400">Enkhuizen</p></div>
                <div className="text-right"><p className="text-xs text-blush-deep uppercase tracking-wider font-semibold">OFF-2026-048</p><p className="text-sm text-gray-500">14 maart 2026</p></div>
              </div>
              <p className="text-sm text-gray-500 mb-6">Klant: <span className="text-gray-900 font-medium">Bakkerij Jansen</span></p>
              <div className="border-t border-gray-100">
                <div className="grid grid-cols-12 gap-2 py-3 text-xs uppercase tracking-wider text-gray-400 font-semibold">
                  <div className="col-span-1">#</div><div className="col-span-5">Omschrijving</div><div className="col-span-2 text-right">Aantal</div><div className="col-span-2 text-right">Prijs</div><div className="col-span-2 text-right">Totaal</div>
                </div>
                {[
                  { nr: '1', desc: 'LED lichtreclame', qty: '1', price: '960,00', total: '960,00' },
                  { nr: '2', desc: 'Montage', qty: '4u', price: '120,00', total: '480,00' },
                  { nr: '3', desc: 'Transport', qty: '1', price: '85,00', total: '85,00' },
                ].map((row) => (
                  <div key={row.nr} className="grid grid-cols-12 gap-2 py-3 text-sm border-b border-gray-50">
                    <div className="col-span-1 text-gray-400">{row.nr}</div><div className="col-span-5 text-gray-900">{row.desc}</div>
                    <div className="col-span-2 text-right text-gray-500">{row.qty}</div><div className="col-span-2 text-right text-gray-500">&euro;{row.price}</div>
                    <div className="col-span-2 text-right text-gray-900">&euro;{row.total}</div>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex flex-col items-end gap-1">
                <div className="flex justify-between w-48 text-sm"><span className="text-gray-400">Subtotaal</span><span className="text-gray-900">&euro;1.525,00</span></div>
                <div className="flex justify-between w-48 text-sm"><span className="text-gray-400">BTW 21%</span><span className="text-gray-900">&euro;320,25</span></div>
                <div className="flex justify-between w-48 text-lg font-bold border-t border-blush/30 pt-2 mt-1"><span className="text-gray-500">Totaal</span><span className="text-gray-900">&euro;1.845,25</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const PlanningShowcase: React.FC = () => {
  const ref = useScrollAnimation();
  return (
    <section ref={ref} className="py-20 lg:py-32 bg-gradient-to-b from-white to-sage-light/20">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col-reverse lg:flex-row lg:items-center lg:gap-16">
          <div className="lg:w-[55%]">
            <div className="slide-left bg-white rounded-2xl shadow-xl p-6 border border-sage/20 interactive-card">
              <div className="space-y-4">
                {[
                  { day: 'Ma 14', color: 'blush', title: 'Montage lichtreclame', detail: 'Bakkerij Jansen', time: '09:00 - 14:00' },
                  { day: 'Di 15', color: 'sage', title: 'Opmeting gevel', detail: 'Matec Amsterdam', time: '10:00 - 11:30' },
                  { day: 'Wo 16', color: 'mist', title: 'Productie', detail: 'intern', time: 'hele dag' },
                ].map((item) => (
                  <div key={item.day} className="flex items-stretch gap-4">
                    <div className="w-16 flex-shrink-0 text-sm font-bold text-gray-400 pt-3">{item.day}</div>
                    <div className={`flex-1 rounded-xl p-4 border-l-4 ${
                      item.color === 'blush' ? 'border-l-blush-vivid bg-blush-light/40' :
                      item.color === 'sage' ? 'border-l-sage-vivid bg-sage-light/40' :
                      'border-l-mist-vivid bg-mist-light/40'
                    }`}>
                      <p className="font-bold text-gray-900 text-sm">{item.title}</p>
                      <p className="text-xs text-gray-500">{item.detail} &middot; {item.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="lg:w-[40%] mb-10 lg:mb-0">
            <span className="pastel-pill bg-sage-light text-sage-deep mb-4 inline-flex">Planning</span>
            <h2 className="slide-right text-[32px] lg:text-[36px] font-black tracking-tight leading-tight mb-6">Planning die <span className="text-gradient-ai">werkt</span></h2>
            <p className="slide-right stagger-1 text-lg text-gray-500 leading-relaxed">Plan montages, wijs teams toe, synchroniseer met je agenda. <strong className="text-gray-900">Overzicht</strong> voor kantoor en <strong className="text-gray-900">buitendienst</strong>.</p>
          </div>
        </div>
      </div>
    </section>
  );
};

const WerkbonnenShowcase: React.FC = () => {
  const ref = useScrollAnimation();
  return (
    <section ref={ref} className="py-20 lg:py-32 bg-gradient-to-b from-sage-light/20 to-mist-light/20">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:gap-16">
          <div className="lg:w-[40%] mb-10 lg:mb-0">
            <span className="pastel-pill bg-mist-light text-mist-deep mb-4 inline-flex">Werkbonnen</span>
            <h2 className="slide-left text-[32px] lg:text-[36px] font-black tracking-tight leading-tight mb-6">Werkbonnen op locatie</h2>
            <p className="slide-left stagger-1 text-lg text-gray-500 leading-relaxed">Je team vult werkbonnen in op locatie. Met uren, materiaal en <strong className="text-gray-900">digitale handtekening</strong>. Direct in het systeem.</p>
          </div>
          <div className="lg:w-[55%]">
            <div className="slide-right bg-white rounded-2xl shadow-xl p-6 border border-mist/20 interactive-card">
              <div className="flex justify-between items-start mb-4">
                <div><p className="text-xs text-mist-deep uppercase tracking-wider font-semibold">WB-2026-018</p><p className="font-bold text-gray-900 mt-1">Montage lichtreclame</p><p className="text-sm text-gray-500">Bakkerij Jansen &middot; Hoorn</p></div>
              </div>
              <div className="border-t border-gray-50 pt-4 space-y-3">
                <div className="flex justify-between text-sm"><span className="text-gray-500">Arbeid: Joris &middot; 6u</span><span className="text-gray-900">&euro;720</span></div>
                <div className="flex justify-between text-sm"><span className="text-gray-500">Materiaal: LED module</span><span className="text-gray-900">&euro;960</span></div>
                <div className="flex justify-between text-sm font-bold border-t border-mist/20 pt-3 mt-3"><span>Totaal</span><span>&euro;1.680</span></div>
              </div>
              <div className="mt-6 pt-4 border-t border-gray-50">
                <svg className="w-40 h-10 mb-1" viewBox="0 0 160 40"><path d="M 10,30 Q 20,5 40,25 T 70,20 Q 85,15 100,25 T 140,18" fill="none" stroke="#A48BBF" strokeWidth="1.5" strokeLinecap="round" /></svg>
                <p className="text-xs text-gray-400">Getekend door: K. Jansen</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const FacturatieShowcase: React.FC = () => {
  const ref = useScrollAnimation();
  return (
    <section ref={ref} className="py-20 lg:py-32 bg-gradient-to-b from-mist-light/20 to-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col-reverse lg:flex-row lg:items-center lg:gap-16">
          <div className="lg:w-[55%]">
            <div className="slide-left relative bg-white rounded-2xl shadow-xl p-6 border border-cream/30 overflow-hidden interactive-card">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-12 pointer-events-none">
                <span className="text-3xl font-black text-sage-vivid opacity-15 tracking-wider">BETAALD</span>
              </div>
              <div className="relative z-10">
                <p className="text-xs text-cream-deep uppercase tracking-wider font-semibold">F-2026-031</p>
                <p className="font-bold text-gray-900 text-2xl mt-2 mb-4">&euro;1.845,25</p>
                <div className="flex items-center gap-3 mb-4">
                  <span className="inline-block bg-gradient-to-r from-sage-vivid to-sage-deep text-white text-xs font-semibold px-3 py-1 rounded-full">Betaald op 18 mrt</span>
                </div>
                <div className="border-t border-gray-50 pt-4 space-y-2 text-sm text-gray-500">
                  <div className="flex justify-between"><span>Bakkerij Jansen</span><span className="text-gray-900">Hoorn</span></div>
                  <div className="flex justify-between"><span>Lichtreclame voorgevel</span><span className="text-gray-900">&euro;1.525,00</span></div>
                  <div className="flex justify-between"><span>BTW 21%</span><span className="text-gray-900">&euro;320,25</span></div>
                </div>
              </div>
            </div>
          </div>
          <div className="lg:w-[40%] mb-10 lg:mb-0">
            <span className="pastel-pill bg-cream-light text-cream-deep mb-4 inline-flex">Facturatie</span>
            <h2 className="slide-right text-[32px] lg:text-[36px] font-black tracking-tight leading-tight mb-6">Facturatie zonder gedoe</h2>
            <p className="slide-right stagger-1 text-lg text-gray-500 leading-relaxed">Factureer direct vanuit je projecten. Automatische <strong className="text-gray-900">herinneringen</strong>, BTW-berekening en altijd inzicht in je <strong className="text-gray-900">cashflow</strong>.</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export const Features: React.FC = () => (
  <>
    <OfferteShowcase />
    <PlanningShowcase />
    <WerkbonnenShowcase />
    <FacturatieShowcase />
  </>
);

export default Features;
