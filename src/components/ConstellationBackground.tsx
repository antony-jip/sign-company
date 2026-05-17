'use client'

import { useEffect, useRef } from 'react'

/**
 * Cursor-reactive constellation. Dots within the cursor's influence radius
 * are pushed gently away from the cursor (force-field) AND brighten. Lines
 * between nearby dots redraw based on the new positions, so the network
 * "ripples" as the user moves. Pure SVG + requestAnimationFrame, no canvas.
 */

// Hand-placed positions on a 1600x900 viewBox. Mix of brand colors.
type Node = { x: number; y: number; r: number; c: 'p' | 'f' | 's' }

const SEEDS: Node[] = [
  { x: 180, y: 90, r: 1.4, c: 's' },
  { x: 420, y: 140, r: 1.8, c: 'p' },
  { x: 680, y: 70, r: 1.4, c: 's' },
  { x: 920, y: 130, r: 1.8, c: 's' },
  { x: 1180, y: 90, r: 1.4, c: 'p' },
  { x: 1440, y: 140, r: 2.0, c: 'f' },
  { x: 90, y: 280, r: 1.8, c: 'p' },
  { x: 340, y: 320, r: 1.4, c: 's' },
  { x: 590, y: 250, r: 2.0, c: 's' },
  { x: 820, y: 330, r: 1.6, c: 'f' },
  { x: 1080, y: 280, r: 1.8, c: 's' },
  { x: 1330, y: 320, r: 1.6, c: 'p' },
  { x: 200, y: 510, r: 1.6, c: 's' },
  { x: 470, y: 450, r: 2.0, c: 'p' },
  { x: 720, y: 520, r: 1.4, c: 'f' },
  { x: 980, y: 460, r: 1.8, c: 's' },
  { x: 1240, y: 510, r: 1.6, c: 'p' },
  { x: 130, y: 720, r: 1.8, c: 's' },
  { x: 400, y: 770, r: 1.4, c: 'p' },
  { x: 680, y: 720, r: 1.6, c: 'f' },
  { x: 980, y: 780, r: 1.8, c: 's' },
  { x: 1290, y: 730, r: 1.6, c: 's' },
]

const COLOR_MAP = {
  p: '#1A535C',
  f: '#F15025',
  s: '#9B9B95',
} as const

const STROKE = 'rgba(26,83,92,0.08)'
const STROKE_NEAR = 'rgba(241,80,37,0.28)'
const MAX_LINK_DIST = 250 // sparser network — more breathing room
const INFLUENCE_R = 260
const MAX_PUSH = 18 // subtler cursor push
const IDLE_AMPL = 7 // idle drift amplitude in svg units
const IDLE_SPEED = 0.00018 // very slow drift speed

export default function ConstellationBackground() {
  const wrapRef = useRef<HTMLDivElement>(null)
  const dotsRef = useRef<(SVGCircleElement | null)[]>([])
  const linesRef = useRef<(SVGLineElement | null)[]>([])

  // Live position state (mutates without React re-render for 60fps)
  const positionsRef = useRef<{ x: number; y: number }[]>(
    SEEDS.map((n) => ({ x: n.x, y: n.y }))
  )
  const cursorRef = useRef<{ x: number; y: number; active: boolean }>({
    x: -9999,
    y: -9999,
    active: false,
  })

  // Precompute potential links (pairs of indices). Lines update positions live.
  const links = useRef<{ a: number; b: number }[]>([])
  if (links.current.length === 0) {
    for (let i = 0; i < SEEDS.length; i++) {
      for (let j = i + 1; j < SEEDS.length; j++) {
        const dx = SEEDS[i].x - SEEDS[j].x
        const dy = SEEDS[i].y - SEEDS[j].y
        if (Math.sqrt(dx * dx + dy * dy) < MAX_LINK_DIST) {
          links.current.push({ a: i, b: j })
        }
      }
    }
  }

  useEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) return

    // Respect prefers-reduced-motion — skip rAF loop entirely
    const reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reducedMotion) return

    let rafId = 0

    function handleMove(e: MouseEvent) {
      if (!wrap) return
      const r = wrap.getBoundingClientRect()
      // Map to viewBox coordinates (1600x900)
      cursorRef.current.x = ((e.clientX - r.left) / r.width) * 1600
      cursorRef.current.y = ((e.clientY - r.top) / r.height) * 900
      cursorRef.current.active = true
    }
    function handleLeave() {
      cursorRef.current.active = false
    }

    // Use the parent section (hero) for cursor tracking so cursor effect is felt across the whole hero
    const parent = wrap.parentElement
    parent?.addEventListener('mousemove', handleMove)
    parent?.addEventListener('mouseleave', handleLeave)

    function tick() {
      const cx = cursorRef.current.x
      const cy = cursorRef.current.y
      const cursorActive = cursorRef.current.active
      const t = performance.now()

      // Update node positions: idle drift + cursor force-field
      for (let i = 0; i < SEEDS.length; i++) {
        const seed = SEEDS[i]
        const pos = positionsRef.current[i]

        // Per-dot phase so they never sync — uses index for deterministic seed
        const phaseX = i * 0.83
        const phaseY = i * 1.27
        const idleX = seed.x + Math.sin(t * IDLE_SPEED + phaseX) * IDLE_AMPL
        const idleY = seed.y + Math.cos(t * IDLE_SPEED * 0.85 + phaseY) * IDLE_AMPL * 0.7

        let targetX = idleX
        let targetY = idleY
        let nearness = 0

        if (cursorActive) {
          const dx = pos.x - cx
          const dy = pos.y - cy
          const d = Math.sqrt(dx * dx + dy * dy)
          if (d < INFLUENCE_R && d > 0) {
            const force = (1 - d / INFLUENCE_R) ** 2 * MAX_PUSH
            targetX = idleX + (dx / d) * force
            targetY = idleY + (dy / d) * force
            nearness = 1 - d / INFLUENCE_R
          }
        }

        // Smooth ease toward target
        pos.x += (targetX - pos.x) * 0.08
        pos.y += (targetY - pos.y) * 0.08

        const dotEl = dotsRef.current[i]
        if (dotEl) {
          dotEl.setAttribute('cx', String(pos.x))
          dotEl.setAttribute('cy', String(pos.y))
          // Scale + opacity boost when near cursor
          const baseR = seed.r
          const boostedR = baseR * (1 + nearness * 1.2)
          dotEl.setAttribute('r', String(boostedR))
          const baseOpacity =
            seed.c === 'f' ? 0.55 : seed.c === 'p' ? 0.42 : 0.32
          const finalOpacity = baseOpacity + nearness * 0.6
          dotEl.setAttribute('opacity', String(Math.min(finalOpacity, 1)))
        }
      }

      // Update lines
      for (let i = 0; i < links.current.length; i++) {
        const { a, b } = links.current[i]
        const lineEl = linesRef.current[i]
        if (!lineEl) continue
        const pa = positionsRef.current[a]
        const pb = positionsRef.current[b]
        lineEl.setAttribute('x1', String(pa.x))
        lineEl.setAttribute('y1', String(pa.y))
        lineEl.setAttribute('x2', String(pb.x))
        lineEl.setAttribute('y2', String(pb.y))

        // Update opacity based on midpoint nearness to cursor
        if (cursorActive) {
          const mx = (pa.x + pb.x) / 2
          const my = (pa.y + pb.y) / 2
          const dx = mx - cx
          const dy = my - cy
          const d = Math.sqrt(dx * dx + dy * dy)
          if (d < INFLUENCE_R) {
            const nearness = 1 - d / INFLUENCE_R
            lineEl.setAttribute('stroke', STROKE_NEAR)
            lineEl.setAttribute('opacity', String(0.15 + nearness * 0.4))
          } else {
            lineEl.setAttribute('stroke', STROKE)
            lineEl.setAttribute('opacity', '0.5')
          }
        } else {
          lineEl.setAttribute('stroke', STROKE)
          lineEl.setAttribute('opacity', '0.5')
        }
      }

      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(rafId)
      parent?.removeEventListener('mousemove', handleMove)
      parent?.removeEventListener('mouseleave', handleLeave)
    }
  }, [])

  return (
    <div
      ref={wrapRef}
      aria-hidden
      className="absolute inset-0 pointer-events-none"
    >
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 1600 900"
        preserveAspectRatio="xMidYMid slice"
      >
        <g>
          {links.current.map((l, i) => {
            const a = SEEDS[l.a]
            const b = SEEDS[l.b]
            return (
              <line
                key={i}
                ref={(el) => {
                  linesRef.current[i] = el
                }}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={STROKE}
                strokeWidth={0.6}
                opacity={0.5}
              />
            )
          })}
        </g>
        <g>
          {SEEDS.map((n, i) => (
            <circle
              key={i}
              ref={(el) => {
                dotsRef.current[i] = el
              }}
              cx={n.x}
              cy={n.y}
              r={n.r}
              fill={COLOR_MAP[n.c]}
              opacity={n.c === 'f' ? 0.55 : n.c === 'p' ? 0.42 : 0.32}
            />
          ))}
        </g>
      </svg>
    </div>
  )
}
