import React from 'react'
import { cn } from '@/lib/utils'

interface ForgieAvatarProps {
  size?: number
  className?: string
}

/**
 * Forgie AI avatar — minimalistisch, geometrisch vos-icoon in FORGEdesk paars (#9B8EC4).
 * Wordt gebruikt als avatar in de Forgie chat widget en sidebar.
 */
export function ForgieAvatar({ size = 40, className }: ForgieAvatarProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('flex-shrink-0', className)}
    >
      {/* Background circle */}
      <circle cx="50" cy="50" r="48" fill="#9B8EC4" opacity="0.1" />

      {/* Ears — geometric triangles */}
      <path d="M24 42L34 14L46 36Z" fill="#9B8EC4" opacity="0.85" />
      <path d="M76 42L66 14L54 36Z" fill="#9B8EC4" opacity="0.85" />
      {/* Inner ears */}
      <path d="M28 40L35 20L43 36Z" fill="#B8A8D8" opacity="0.6" />
      <path d="M72 40L65 20L57 36Z" fill="#B8A8D8" opacity="0.6" />

      {/* Head — rounded geometric shape */}
      <ellipse cx="50" cy="56" rx="28" ry="26" fill="#9B8EC4" />

      {/* Face mask — lighter area */}
      <ellipse cx="50" cy="62" rx="20" ry="18" fill="#C9BDE0" />

      {/* Snout — white triangle */}
      <path d="M42 58L50 70L58 58Z" fill="white" opacity="0.9" />

      {/* Eyes — geometric, clean */}
      <ellipse cx="40" cy="52" rx="4" ry="4.5" fill="#2D1B3E" />
      <ellipse cx="60" cy="52" rx="4" ry="4.5" fill="#2D1B3E" />
      {/* Eye highlights */}
      <circle cx="42" cy="50.5" r="1.5" fill="white" />
      <circle cx="62" cy="50.5" r="1.5" fill="white" />

      {/* Nose — small triangle */}
      <ellipse cx="50" cy="60" rx="3" ry="2" fill="#6B5B8A" />

      {/* Mouth — subtle smile */}
      <path d="M46 63Q50 66 54 63" stroke="#6B5B8A" strokeWidth="1.2" fill="none" strokeLinecap="round" />

      {/* Whisker dots */}
      <circle cx="34" cy="58" r="1" fill="#9B8EC4" opacity="0.3" />
      <circle cx="31" cy="62" r="1" fill="#9B8EC4" opacity="0.3" />
      <circle cx="66" cy="58" r="1" fill="#9B8EC4" opacity="0.3" />
      <circle cx="69" cy="62" r="1" fill="#9B8EC4" opacity="0.3" />
    </svg>
  )
}
