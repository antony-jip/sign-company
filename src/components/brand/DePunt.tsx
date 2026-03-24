'use client'

import { useId } from 'react'

interface DePuntProps {
  className?: string
  variant?: 'default' | 'light'
  size?: number
}

export default function DePunt({ className = '', variant = 'default', size = 280 }: DePuntProps) {
  const id = useId()
  const isLight = variant === 'light'
  const flameColor = isLight ? '#F5F4F1' : '#F15025'
  const petrolColor = isLight ? 'rgba(245,244,241,0.6)' : '#1A535C'

  // Generate organic halftone dot cloud
  const dots: { cx: number; cy: number; r: number; color: string; opacity: number }[] = []
  const center = size / 2
  const maxRadius = size / 2 - 10

  // Seed-based pseudo-random for consistent rendering
  const seededRandom = (seed: number) => {
    const x = Math.sin(seed * 12.9898 + seed * 78.233) * 43758.5453
    return x - Math.floor(x)
  }

  for (let i = 0; i < 80; i++) {
    const angle = seededRandom(i * 3) * Math.PI * 2
    const distFactor = seededRandom(i * 7 + 1)
    const dist = distFactor * distFactor * maxRadius // Quadratic = denser center
    const cx = center + Math.cos(angle) * dist
    const cy = center + Math.sin(angle) * dist
    const distFromCenter = dist / maxRadius
    const r = (1 - distFromCenter * 0.7) * (3 + seededRandom(i * 13) * 8)
    const isFlame = seededRandom(i * 17) > 0.4 - distFromCenter * 0.3
    const color = isFlame ? flameColor : petrolColor
    const opacity = isLight
      ? 0.08 + (1 - distFromCenter) * 0.12
      : 0.3 + (1 - distFromCenter) * 0.5

    dots.push({ cx, cy, r, color, opacity })
  }

  return (
    <div className={`pointer-events-none select-none ${className}`} aria-hidden="true">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {dots.map((dot, i) => (
          <circle
            key={`${id}-${i}`}
            cx={dot.cx}
            cy={dot.cy}
            r={dot.r}
            fill={dot.color}
            opacity={dot.opacity}
          />
        ))}
      </svg>
    </div>
  )
}
