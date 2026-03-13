'use client';

import React from 'react';
import { useInView } from '@/hooks/useInView';
import { StepCircle } from '@/components/ui/StepCircle';

interface StepProps {
  number: number;
  title: string;
  description: string;
  phase: 'offerte' | 'werkbon' | 'factuur';
  align: 'left' | 'right';
  children: React.ReactNode;
}

export default function Step({ number, title, description, phase, align, children }: StepProps) {
  const { ref, isInView } = useInView();

  return (
    <div ref={ref} className="relative" style={{ paddingTop: 70, paddingBottom: 70 }}>
      <div
        className={`flex flex-col ${align === 'right' ? 'lg:flex-row-reverse' : 'lg:flex-row'} items-center`}
        style={{ gap: 80 }}
      >
        {/* Text side */}
        <div
          className="flex-1 text-center lg:text-left"
          style={{
            opacity: isInView ? 1 : 0,
            transform: isInView ? 'translateY(0)' : 'translateY(32px)',
            transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          <div className="mb-5">
            <StepCircle number={number} phase={phase} />
          </div>
          <h3 className="font-heading step-title text-ink mb-3">
            {title}
          </h3>
          <p className="text-[16px] leading-[1.7] text-ink-60 max-w-[400px] mx-auto lg:mx-0">
            {description}
          </p>
        </div>

        {/* Card side */}
        <div
          className="flex-1 w-full max-w-md"
          style={{
            opacity: isInView ? 1 : 0,
            transform: isInView ? 'translateY(0) scale(1)' : 'translateY(32px) scale(0.96)',
            transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.15s',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
