import { useRef, useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

interface AnimatedBadgeProps {
  children: React.ReactNode
  className?: string
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'muted'
}

const variantStyles: Record<string, string> = {
  default: 'bg-primary/10 text-primary border-primary/20',
  success: 'badge-success',
  warning: 'badge-warning',
  danger: 'badge-danger',
  info: 'badge-info',
  muted: 'badge-neutral',
}

/**
 * Badge with smooth color transition when variant changes.
 * Use for status fields that change dynamically (e.g., werkbon status, offerte status).
 */
export function AnimatedBadge({ children, className, variant = 'default' }: AnimatedBadgeProps) {
  const [isTransitioning, setIsTransitioning] = useState(false)
  const prevVariantRef = useRef(variant)

  useEffect(() => {
    if (prevVariantRef.current !== variant) {
      setIsTransitioning(true)
      const timer = setTimeout(() => setIsTransitioning(false), 300)
      prevVariantRef.current = variant
      return () => clearTimeout(timer)
    }
  }, [variant])

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-all duration-300',
        variantStyles[variant],
        isTransitioning && 'scale-105',
        className
      )}
    >
      {children}
    </span>
  )
}

/**
 * Animated check that plays once on mount.
 * Use after a successful action (save, approve, etc.)
 */
export function SuccessCheck({ className, size = 20 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={cn('text-emerald-500', className)}
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
        className="animate-[draw-circle_0.4s_ease-out_forwards]"
        style={{
          strokeDasharray: 63,
          strokeDashoffset: 63,
          animation: 'draw-circle 0.4s ease-out forwards',
        }}
      />
      <path
        d="M8 12.5l2.5 2.5 5.5-5.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          strokeDasharray: 15,
          strokeDashoffset: 15,
          animation: 'draw-check 0.3s ease-out 0.3s forwards',
        }}
      />
    </svg>
  )
}
