'use client'

import { motion } from 'framer-motion'

interface Props {
  kicker: string
  label: string
  edition?: string
  /** Inverted colors for dark sections (petrol/teal backgrounds). */
  tone?: 'light' | 'dark'
  /** Constrain width to match a centered content container. */
  maxWidth?: string
  className?: string
}

/**
 * Editorial masthead strip — used at the top of every homepage section
 * for consistent magazine-style chrome. Pattern:
 *   [FLAME KICKER]  ─  [MUTED LABEL]              [EDITION]
 */
export default function EditorialMasthead({
  kicker,
  label,
  edition = 'Editie 2026',
  tone = 'light',
  maxWidth,
  className = '',
}: Props) {
  const isDark = tone === 'dark'

  const flame = '#F15025'
  const muted = isDark ? 'rgba(255,255,255,0.55)' : '#6B6B66'
  const faint = isDark ? 'rgba(255,255,255,0.35)' : '#9B9B95'
  const rule = isDark ? 'rgba(255,255,255,0.18)' : 'rgba(26,83,92,0.15)'
  const tick = isDark ? 'rgba(255,255,255,0.25)' : 'rgba(26,83,92,0.25)'

  return (
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.6 }}
      className={`flex items-center justify-between mb-8 md:mb-10 pb-3 md:pb-4 border-b ${className}`}
      style={{ borderColor: rule, ...(maxWidth ? { maxWidth, marginLeft: 'auto', marginRight: 'auto' } : {}) }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <span
          className="font-mono text-[10px] md:text-[11px] font-bold tracking-[0.22em] uppercase whitespace-nowrap"
          style={{ color: flame }}
        >
          {kicker}
        </span>
        <span className="w-6 h-px shrink-0" style={{ backgroundColor: tick }} />
        <span
          className="font-mono text-[10px] md:text-[11px] tracking-[0.18em] uppercase truncate"
          style={{ color: muted }}
        >
          {label}
        </span>
      </div>
      {edition && (
        <span
          className="font-mono text-[10px] md:text-[11px] tracking-[0.18em] uppercase hidden md:inline whitespace-nowrap pl-4"
          style={{ color: faint }}
        >
          {edition}
        </span>
      )}
    </motion.div>
  )
}
