import React from 'react';

interface StepCardProps {
  gradient: string;
  children: React.ReactNode;
}

export default function StepCard({ gradient, children }: StepCardProps) {
  return (
    <div className={`${gradient} rounded-2xl p-4 md:p-6`}>
      <div className="bg-white rounded-xl p-4 md:p-5 shadow-sm">
        {children}
      </div>
    </div>
  );
}

/* ===== Mock data cards for each step ===== */

export function OfferteCard() {
  return (
    <StepCard gradient="step-card-blush">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Offerte</span>
          <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sage-light text-sage-deep">Akkoord</span>
        </div>
        <h4 className="font-bold text-gray-900 text-sm">Lichtreclame gevelletters</h4>
        <p className="text-xs text-gray-400">Brouwer Reclame B.V.</p>
        <div className="border-t border-gray-100 pt-3 flex items-center justify-between">
          <span className="text-xs text-gray-400">Totaal excl. BTW</span>
          <span className="font-mono font-bold text-gray-900">&euro; 4.250,00</span>
        </div>
      </div>
    </StepCard>
  );
}

export function WerkbonCard() {
  return (
    <StepCard gradient="step-card-sage">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Werkbon</span>
          <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold bg-mist-light text-mist-deep">In uitvoering</span>
        </div>
        <h4 className="font-bold text-gray-900 text-sm">Montage gevelletters</h4>
        <p className="text-xs text-gray-400">WB-2026-018 &middot; Brouwer Reclame</p>
        <div className="space-y-1.5">
          {['Materiaal ophalen', 'Letters monteren', 'Elektra aansluiten'].map((task, i) => (
            <div key={task} className="flex items-center gap-2 text-xs">
              <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                i < 2 ? 'bg-sage-vivid border-sage-vivid' : 'border-gray-200'
              }`}>
                {i < 2 && (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                )}
              </div>
              <span className={i < 2 ? 'text-gray-400 line-through' : 'text-gray-700'}>{task}</span>
            </div>
          ))}
        </div>
      </div>
    </StepCard>
  );
}

export function FactuurCard() {
  return (
    <StepCard gradient="step-card-lavender">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Factuur</span>
          <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sage-light text-sage-deep">Betaald</span>
        </div>
        <h4 className="font-bold text-gray-900 text-sm">Lichtreclame gevelletters</h4>
        <p className="text-xs text-gray-400">FAC-2026-031 &middot; Brouwer Reclame</p>
        <div className="border-t border-gray-100 pt-3 space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400">Subtotaal</span>
            <span className="font-mono text-gray-700">&euro; 4.250,00</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400">BTW 21%</span>
            <span className="font-mono text-gray-700">&euro; 892,50</span>
          </div>
          <div className="flex items-center justify-between text-sm font-bold pt-1 border-t border-gray-100">
            <span className="text-gray-900">Totaal</span>
            <span className="font-mono text-gray-900">&euro; 5.142,50</span>
          </div>
        </div>
      </div>
    </StepCard>
  );
}
