/**
 * BrandMarks — sign-maker craft visual vocabulary, uniquely doen.
 *
 * Borrowed from physical sign-making reality:
 *  - Trim marks (registration crosses from print)
 *  - Measurement annotations (the "2400 MM" callouts from werktekeningen)
 *  - Tape pieces (workshop sticker decoration)
 *  - Punt bullets (the flame . as list marker)
 *  - Flame stamps (oversized brand glyph)
 *  - Section watermarks (doen. as edition mark between sections)
 *
 * Use these throughout the page to create a unique visual rhythm
 * no other SaaS site has — because no other SaaS is for signmakers.
 */

import type { CSSProperties } from 'react'

const FLAME = '#F15025'
const PETROL = '#1A535C'
const SAND = '#E8E1D0'

/* ─────────────────────────────────────────────────────────────────
   TRIM CORNERS — registration cross marks at section corners
   Used to frame a section like a print sheet
   ───────────────────────────────────────────────────────────────── */
export function TrimCorners({
  inset = 20,
  size = 14,
  color = 'rgba(26,83,92,0.25)',
  thickness = 1,
}: {
  inset?: number
  size?: number
  color?: string
  thickness?: number
}) {
  const halfArm = size / 2
  const mark = (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="absolute pointer-events-none">
      <line x1="0" y1={halfArm} x2={size} y2={halfArm} stroke={color} strokeWidth={thickness} />
      <line x1={halfArm} y1="0" x2={halfArm} y2={size} stroke={color} strokeWidth={thickness} />
    </svg>
  )
  return (
    <>
      <div aria-hidden style={{ position: 'absolute', top: inset, left: inset }}>
        {mark}
      </div>
      <div aria-hidden style={{ position: 'absolute', top: inset, right: inset }}>
        {mark}
      </div>
      <div aria-hidden style={{ position: 'absolute', bottom: inset, left: inset }}>
        {mark}
      </div>
      <div aria-hidden style={{ position: 'absolute', bottom: inset, right: inset }}>
        {mark}
      </div>
    </>
  )
}

/* ─────────────────────────────────────────────────────────────────
   MEASUREMENT TAG — "2400 MM" style annotation from werktekeningen
   Two thin lines + serif-text-style measurement
   ───────────────────────────────────────────────────────────────── */
export function MeasurementTag({
  label,
  width = 80,
  position = 'top',
  style,
}: {
  label: string
  width?: number
  position?: 'top' | 'right' | 'bottom' | 'left'
  style?: CSSProperties
}) {
  const isVertical = position === 'left' || position === 'right'
  return (
    <div
      aria-hidden
      className="inline-flex items-center pointer-events-none select-none"
      style={{
        gap: 4,
        transform: isVertical ? 'rotate(-90deg)' : 'none',
        transformOrigin: 'center',
        ...style,
      }}
    >
      <span style={{ width: 6, height: 1, backgroundColor: FLAME, flexShrink: 0 }} />
      <span style={{ width: 1, height: 6, backgroundColor: FLAME, flexShrink: 0 }} />
      <span
        className="font-mono font-bold tabular-nums tracking-[0.18em] uppercase whitespace-nowrap"
        style={{ fontSize: 9, color: FLAME, padding: '0 4px' }}
      >
        {label}
      </span>
      <span style={{ width: 1, height: 6, backgroundColor: FLAME, flexShrink: 0 }} />
      <span style={{ width: width - 30, height: 1, backgroundColor: FLAME, flexShrink: 0 }} />
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────
   TAPE PIECE — small rotated rectangle, workshop sticker
   ───────────────────────────────────────────────────────────────── */
export function TapePiece({
  width = 80,
  height = 22,
  rotate = -3,
  color = FLAME,
  opacity = 0.85,
  style,
  children,
}: {
  width?: number
  height?: number
  rotate?: number
  color?: string
  opacity?: number
  style?: CSSProperties
  children?: React.ReactNode
}) {
  return (
    <div
      aria-hidden
      className="pointer-events-none select-none flex items-center justify-center font-mono font-bold tracking-[0.18em] uppercase text-white"
      style={{
        width,
        height,
        backgroundColor: color,
        opacity,
        transform: `rotate(${rotate}deg)`,
        fontSize: 9,
        boxShadow: '0 2px 6px rgba(20,40,40,0.15)',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────
   PUNT BULLET — the flame . as a list marker (brand grammar)
   ───────────────────────────────────────────────────────────────── */
export function PuntBullet({ size = 6 }: { size?: number }) {
  return (
    <span
      aria-hidden
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        borderRadius: '50%',
        backgroundColor: FLAME,
        flexShrink: 0,
      }}
    />
  )
}

/* ─────────────────────────────────────────────────────────────────
   FLAME STAMP — oversized flame glyph as brand-mark
   Place at section transitions / corners bleeding off
   ───────────────────────────────────────────────────────────────── */
export function FlameStamp({
  size = 200,
  opacity = 0.08,
  style,
}: {
  size?: number
  opacity?: number
  style?: CSSProperties
}) {
  return (
    <div
      aria-hidden
      className="absolute rounded-full pointer-events-none"
      style={{
        width: size,
        height: size,
        backgroundColor: FLAME,
        opacity,
        ...style,
      }}
    />
  )
}

/* ─────────────────────────────────────────────────────────────────
   SECTION DIVIDER — thin flame line + "doen." watermark
   ───────────────────────────────────────────────────────────────── */
export function SectionWatermark({ label }: { label?: string }) {
  return (
    <div
      aria-hidden
      className="flex items-center justify-center gap-4 py-6 pointer-events-none select-none"
    >
      <span style={{ flex: 1, height: 1, backgroundColor: 'rgba(26,83,92,0.08)' }} />
      <span
        className="font-mono text-[10px] font-medium tracking-[0.28em] uppercase inline-flex items-baseline"
        style={{ color: 'rgba(26,83,92,0.35)' }}
      >
        {label ?? 'doen.'}
        {!label && (
          <span style={{ color: FLAME, marginLeft: -1 }}>.</span>
        )}
      </span>
      <span style={{ flex: 1, height: 1, backgroundColor: 'rgba(26,83,92,0.08)' }} />
    </div>
  )
}
