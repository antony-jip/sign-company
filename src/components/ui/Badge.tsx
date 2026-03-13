import React from 'react';

type BadgeColor = 'blush' | 'sage' | 'mist' | 'lavender' | 'peach' | 'cream';

interface BadgeProps {
  color?: BadgeColor;
  children: React.ReactNode;
  className?: string;
}

const colorMap: Record<BadgeColor, string> = {
  blush: 'bg-blush-light text-blush-deep',
  sage: 'bg-sage-light text-sage-deep',
  mist: 'bg-mist-light text-mist-deep',
  lavender: 'bg-lavender-light text-lavender-deep',
  peach: 'bg-peach-light text-peach-deep',
  cream: 'bg-cream-light text-cream-deep',
};

export function Badge({ color = 'blush', children, className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${colorMap[color]} ${className}`}
    >
      {children}
    </span>
  );
}
