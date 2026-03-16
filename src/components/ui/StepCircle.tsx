import React from 'react';

interface StepCircleProps {
  number: number;
  phase: 'offerte' | 'werkbon' | 'factuur';
}

const phaseStyles: Record<StepCircleProps['phase'], string> = {
  offerte: 'border-blush-vivid text-blush-deep',
  werkbon: 'border-lavender text-lavender-deep',
  factuur: 'border-sage text-sage-deep',
};

export function StepCircle({ number, phase }: StepCircleProps) {
  return (
    <div
      className={`flex items-center justify-center w-10 h-10 rounded-full border-2 font-mono text-sm font-medium ${phaseStyles[phase]}`}
    >
      {number}
    </div>
  );
}
