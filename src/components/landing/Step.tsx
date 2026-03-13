'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { StepCircle } from '@/components/ui/StepCircle';

interface StepProps {
  number: number;
  title: string;
  description: string;
  phase: 'offerte' | 'werkbon' | 'factuur';
  align: 'left' | 'right';
  children: React.ReactNode;
}

const textVariant = {
  hidden: { opacity: 0, y: 32 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', damping: 25, stiffness: 120 },
  },
};

const cardVariant = {
  hidden: { opacity: 0, y: 32, scale: 0.96 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring', damping: 22, stiffness: 100, delay: 0.15 },
  },
};

export default function Step({ number, title, description, phase, align, children }: StepProps) {
  return (
    <div className="relative" style={{ paddingTop: 70, paddingBottom: 70 }}>
      <div
        className={`flex flex-col ${align === 'right' ? 'lg:flex-row-reverse' : 'lg:flex-row'} items-center`}
        style={{ gap: 80 }}
      >
        {/* Text side */}
        <motion.div
          className="flex-1 text-center lg:text-left"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={textVariant}
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
        </motion.div>

        {/* Card side */}
        <motion.div
          className="flex-1 w-full max-w-md"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={cardVariant}
        >
          {children}
        </motion.div>
      </div>
    </div>
  );
}
