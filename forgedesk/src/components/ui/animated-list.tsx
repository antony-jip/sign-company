import React, { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

export interface AnimatedListProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Delay between each child animation in ms (default: 30) */
  staggerDelay?: number
  /** Whether to animate (set false to skip, e.g. during filter changes) */
  animate?: boolean
}

/**
 * Wraps children in staggered fade-in + translateY(8px) animations.
 * Each direct child gets a progressively increasing animation-delay.
 *
 * Uses CSS @starting-style where supported, falls back to opacity transition.
 */
export function AnimatedList({
  children,
  staggerDelay = 30,
  animate = true,
  className,
  ...props
}: AnimatedListProps) {
  const [hasAnimated, setHasAnimated] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!animate) return
    // Mark as animated after the last child finishes
    const childCount = React.Children.count(children)
    const timeout = setTimeout(
      () => setHasAnimated(true),
      childCount * staggerDelay + 300
    )
    return () => clearTimeout(timeout)
  }, [animate, children, staggerDelay])

  if (!animate || hasAnimated) {
    return (
      <div className={className} {...props}>
        {children}
      </div>
    )
  }

  return (
    <div ref={ref} className={className} {...props}>
      {React.Children.map(children, (child, index) => {
        if (!React.isValidElement(child)) return child
        return (
          <div
            className="animate-stagger-item"
            style={{
              animationDelay: `${index * staggerDelay}ms`,
            }}
          >
            {child}
          </div>
        )
      })}
    </div>
  )
}
