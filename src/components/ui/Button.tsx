import React from 'react';

type ButtonVariant = 'ink' | 'soft' | 'warm';
type ButtonSize = 'default' | 'lg';

interface ButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  href?: string;
  children: React.ReactNode;
  className?: string;
}

const variants: Record<ButtonVariant, string> = {
  ink: 'bg-ink text-white hover:-translate-y-0.5 hover:shadow-[0_8px_28px_rgba(0,0,0,0.15)]',
  soft: 'bg-white/60 text-ink border border-black/[0.06] hover:bg-white/90',
  warm: 'bg-blush-light text-blush-deep border border-blush hover:bg-blush',
};

const sizes: Record<ButtonSize, string> = {
  default: 'px-7 py-3 text-sm',
  lg: 'px-9 py-4 text-base',
};

export function Button({
  variant = 'ink',
  size = 'default',
  href,
  children,
  className = '',
}: ButtonProps) {
  const classes = `inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-all duration-200 ${sizes[size]} ${variants[variant]} ${className}`;

  if (href) {
    return (
      <a href={href} className={classes}>
        {children}
      </a>
    );
  }

  return (
    <button className={classes}>
      {children}
    </button>
  );
}
