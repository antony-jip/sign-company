'use client'

import { useRef, useState } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import Link from 'next/link'
import type { HTMLMotionProps } from 'framer-motion'

type Variant = 'primary' | 'secondary' | 'ghost'
type Size = 'sm' | 'md' | 'lg'

type BaseProps = {
  variant?: Variant
  size?: Size
  magnetic?: boolean
  strength?: number
  loading?: boolean
  children: React.ReactNode
  className?: string
}

type LinkProps = BaseProps & {
  href: string
  onClick?: never
  type?: never
  disabled?: never
}

type ButtonProps = BaseProps & {
  href?: never
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void
  type?: 'button' | 'submit' | 'reset'
  disabled?: boolean
}

type Props = LinkProps | ButtonProps

const PETROL = '#1A535C'
const FLAME = '#F15025'

const sizeClasses: Record<Size, string> = {
  sm: 'h-9 px-4 text-[13px]',
  md: 'h-12 px-6 text-[14px]',
  lg: 'h-14 px-8 text-[15px]',
}

export default function MagneticButton(props: Props) {
  const { variant = 'primary', size = 'md', magnetic = true, strength = 8, loading, children, className = '' } = props
  const ref = useRef<HTMLElement>(null)
  const [hovered, setHovered] = useState(false)

  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  const x = useSpring(useTransform(mouseX, [-1, 1], [-strength, strength]), {
    stiffness: 180,
    damping: 18,
  })
  const y = useSpring(useTransform(mouseY, [-1, 1], [-strength, strength]), {
    stiffness: 180,
    damping: 18,
  })

  function handleMouseMove(e: React.MouseEvent) {
    if (!magnetic || !ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    mouseX.set((e.clientX - centerX) / (rect.width / 2))
    mouseY.set((e.clientY - centerY) / (rect.height / 2))
  }

  function handleMouseLeave() {
    mouseX.set(0)
    mouseY.set(0)
    setHovered(false)
  }

  const baseClasses = `inline-flex items-center justify-center gap-2 font-semibold rounded-xl whitespace-nowrap transition-colors duration-200 ${sizeClasses[size]} ${className}`

  // Variant-specific styling
  const style: React.CSSProperties = {
    x,
    y,
    ...(variant === 'primary' && {
      backgroundColor: FLAME,
      color: '#FFFFFF',
      boxShadow: hovered
        ? '0 8px 22px rgba(241,80,37,0.35)'
        : '0 4px 14px rgba(241,80,37,0.25)',
    }),
    ...(variant === 'secondary' && {
      backgroundColor: 'transparent',
      color: PETROL,
      border: `1.5px solid ${PETROL}`,
    }),
    ...(variant === 'ghost' && {
      backgroundColor: 'transparent',
      color: PETROL,
    }),
  }

  const content = loading ? (
    <>
      <LoadingSpinner />
      <span>Bezig…</span>
    </>
  ) : (
    children
  )

  const motionProps: HTMLMotionProps<'a'> & HTMLMotionProps<'button'> = {
    onMouseMove: handleMouseMove,
    onMouseEnter: () => setHovered(true),
    onMouseLeave: handleMouseLeave,
    whileHover: { scale: 1.025 },
    whileTap: { scale: 0.97 },
    transition: { type: 'spring', stiffness: 400, damping: 28 },
    className: baseClasses,
    style,
  }

  if ('href' in props && props.href) {
    return (
      <Link href={props.href} passHref legacyBehavior>
        <motion.a
          {...(motionProps as HTMLMotionProps<'a'>)}
          ref={ref as React.RefObject<HTMLAnchorElement>}
        >
          {content}
        </motion.a>
      </Link>
    )
  }

  return (
    <motion.button
      {...(motionProps as HTMLMotionProps<'button'>)}
      ref={ref as React.RefObject<HTMLButtonElement>}
      type={props.type ?? 'button'}
      onClick={props.onClick}
      disabled={props.disabled || loading}
    >
      {content}
    </motion.button>
  )
}

function LoadingSpinner() {
  return (
    <svg
      className="animate-spin"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path
        d="M12 2a10 10 0 0 1 10 10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  )
}
