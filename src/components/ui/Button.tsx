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
  ink: 'bg-ink text-white hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(0,0,0,0.2)] active:translate-y-0 active:shadow-[0_4px_12px_rgba(0,0,0,0.1)]',
  soft: 'bg-white/60 text-ink border border-black/[0.06] hover:bg-white hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] active:translate-y-0',
  warm: 'bg-blush text-white hover:bg-blush-vivid hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(232,169,144,0.3)] active:translate-y-0',
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
  const classes = `inline-flex items-center justify-center gap-2 rounded-full font-semibold cursor-pointer transition-all duration-300 ease-out ${sizes[size]} ${variants[variant]} ${className}`;

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
