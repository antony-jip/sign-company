'use client';

import React from 'react';
import { useInView } from '@/hooks/useInView';

interface StepProps {
  number: number;
  title: string;
  description: string;
  accentColor: string;
  align: 'left' | 'right';
  children: React.ReactNode;
}

export default function Step({ number, title, description, accentColor, align, children }: StepProps) {
  const { ref, isInView } = useInView();

  return (
    <div ref={ref} className="relative py-12 md:py-20">
      <div className={`flex flex-col ${align === 'right' ? 'lg:flex-row-reverse' : 'lg:flex-row'} items-center gap-8 lg:gap-16`}>
        {/* Text side */}
        <div
          className="flex-1 text-center lg:text-left"
          style={{
            opacity: isInView ? 1 : 0,
            transform: isInView ? 'translateY(0)' : 'translateY(32px)',
            transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          <div
            className={`inline-flex items-center justify-center w-12 h-12 rounded-full text-lg font-bold text-white mb-4`}
            style={{ backgroundColor: accentColor }}
          >
            {number}
          </div>
          <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
            {title}
          </h3>
          <p className="text-gray-500 text-base md:text-lg leading-relaxed max-w-md mx-auto lg:mx-0">
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
