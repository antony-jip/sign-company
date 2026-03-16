import React from 'react';

interface StepCardProps {
  gradient: string;
  children: React.ReactNode;
}

export default function StepCard({ gradient, children }: StepCardProps) {
  return (
    <div className={`${gradient} rounded-[20px]`} style={{ padding: 32 }}>
      <div
        className="bg-white/85 rounded-[14px] border border-black/[0.04]"
        style={{ padding: 22, boxShadow: '0 2px 16px rgba(0,0,0,0.03)' }}
      >
        {children}
      </div>
    </div>
  );
}

/* ===== Step 1: Offerte card ===== */
export function OfferteCard() {
  return (
    <StepCard gradient="step-card-offerte">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[12px] font-medium text-ink-40 uppercase tracking-[0.06em]">Offerte</span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-sage-light text-sage-deep">
            <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="2 6 5 9 10 3" /></svg>
            Akkoord
          </span>
        </div>
        <h4 className="font-heading text-sm font-bold text-ink">Lichtreclame gevelletters</h4>
        <p className="text-[13px] text-ink-40">Brouwer Reclame B.V.</p>
        <div className="border-t border-ink-10 pt-3 flex items-center justify-between">
          <span className="text-[13px] text-ink-40">Totaal excl. BTW</span>
          <span className="font-mono font-bold text-ink">&euro; 4.250,00</span>
        </div>
      </div>
    </StepCard>
  );
}

/* ===== Step 2: Werkbon card ===== */
export function WerkbonCard() {
  return (
    <StepCard gradient="step-card-werkbon">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[12px] font-medium text-ink-40 uppercase tracking-[0.06em]">Werkbon</span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-mist-light text-mist-deep">
            <svg width="9" height="9" viewBox="0 0 12 12"><circle cx="6" cy="6" r="3" fill="currentColor" /></svg>
            In uitvoering
          </span>
        </div>
        <h4 className="font-heading text-sm font-bold text-ink">Montage gevelletters</h4>
        <p className="text-[13px] text-ink-40">
          <span className="font-mono text-[11px]">WB-2026-018</span> &middot; Brouwer Reclame
        </p>
        <div className="space-y-1.5">
          {['Materiaal ophalen', 'Letters monteren', 'Elektra aansluiten'].map((task, i) => (
            <div key={task} className="flex items-center gap-2 text-[13px]">
              <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                i < 2 ? 'bg-sage-vivid border-sage-vivid' : 'border-ink-20'
              }`}>
                {i < 2 && (
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                    <polyline points="2 6 5 9 10 3" />
                  </svg>
                )}
              </div>
              <span className={i < 2 ? 'text-ink-40 line-through' : 'text-ink'}>{task}</span>
            </div>
          ))}
        </div>
      </div>
    </StepCard>
  );
}

/* ===== Step 3: Factuur card ===== */
export function FactuurCard() {
  return (
    <StepCard gradient="step-card-factuur">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[12px] font-medium text-ink-40 uppercase tracking-[0.06em]">Factuur</span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-sage-light text-sage-deep">
            <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="2 6 5 9 10 3" /></svg>
            Betaald
          </span>
        </div>
        <h4 className="font-heading text-sm font-bold text-ink">Lichtreclame gevelletters</h4>
        <p className="text-[13px] text-ink-40">
          <span className="font-mono text-[11px]">FAC-2026-031</span> &middot; Brouwer Reclame
        </p>
        <div className="border-t border-ink-10 pt-3 space-y-1">
          <div className="flex items-center justify-between text-[13px]">
            <span className="text-ink-40">Subtotaal</span>
            <span className="font-mono text-ink-60">&euro; 4.250,00</span>
          </div>
          <div className="flex items-center justify-between text-[13px]">
            <span className="text-ink-40">BTW 21%</span>
            <span className="font-mono text-ink-60">&euro; 892,50</span>
          </div>
          <div className="flex items-center justify-between text-sm font-bold pt-1 border-t border-ink-10">
            <span className="text-ink">Totaal</span>
            <span className="font-mono text-ink">&euro; 5.142,50</span>
          </div>
        </div>
      </div>
    </StepCard>
  );
}
