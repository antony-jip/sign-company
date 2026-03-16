import React from 'react';

interface BadgeProps {
  variant: 'goedgekeurd' | 'verstuurd' | 'concept' | 'gefactureerd' | 'betaald' | 'in-uitvoering';
  children: React.ReactNode;
}

const styles: Record<BadgeProps['variant'], string> = {
  goedgekeurd: 'bg-sage-light text-sage-deep',
  betaald: 'bg-sage-light text-sage-deep',
  verstuurd: 'bg-[#FEF3C7] text-[#92400E]',
  concept: 'bg-mist-light text-mist-deep',
  gefactureerd: 'bg-lavender-light text-lavender-deep',
  'in-uitvoering': 'bg-mist-light text-mist-deep',
};

export function Badge({ variant, children }: BadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold ${styles[variant]}`}>
      {children}
    </span>
  );
}
