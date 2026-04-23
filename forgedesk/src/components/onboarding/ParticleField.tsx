import { useEffect, useRef } from 'react'

type Particle = {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  opacity: number
  color: string
  phase: number
}

const PETROL = '26, 83, 92'
const CREME = '220, 214, 200'
const FLAME = '241, 80, 37'
const LINK_COLOR = PETROL
const LINK_MAX_DIST = 120
const LINK_MAX_OPACITY = 0.12
const MOUSE_PULL_RADIUS = 150
const MOUSE_PULL_STRENGTH = 0.25

function pickColor(): string {
  const r = Math.random()
  if (r < 0.6) return PETROL
  if (r < 0.9) return CREME
  return FLAME
}

function targetCount(width: number, height: number): number {
  const base = Math.round(Math.sqrt(width * height) * 0.09)
  return Math.max(40, Math.min(100, base))
}

function spawn(width: number, height: number): Particle {
  return {
    x: Math.random() * width,
    y: Math.random() * height,
    vx: (Math.random() - 0.5) * 0.5,
    vy: (Math.random() - 0.5) * 0.5,
    radius: 1 + Math.random() * 2,
    opacity: 0.15 + Math.random() * 0.25,
    color: pickColor(),
    phase: Math.random() * Math.PI * 2,
  }
}

export function ParticleField() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const wrapRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let particles: Particle[] = []
    let width = 0
    let height = 0
    let dpr = Math.max(1, window.devicePixelRatio || 1)
    let rafId: number | null = null
    let startTime = performance.now()
    const mouse = { x: -9999, y: -9999, active: false }

    const resize = () => {
      const rect = wrap.getBoundingClientRect()
      width = rect.width
      height = rect.height
      dpr = Math.max(1, window.devicePixelRatio || 1)
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      const target = targetCount(width, height)
      if (particles.length === 0) {
        particles = Array.from({ length: target }, () => spawn(width, height))
      } else if (particles.length < target) {
        while (particles.length < target) particles.push(spawn(width, height))
      } else if (particles.length > target) {
        particles.length = target
      }
      for (const p of particles) {
        if (p.x > width) p.x = Math.random() * width
        if (p.y > height) p.y = Math.random() * height
      }
    }

    const draw = (now: number) => {
      const t = now - startTime
      ctx.clearRect(0, 0, width, height)

      for (const p of particles) {
        if (!reduceMotion) {
          p.x += p.vx
          p.y += p.vy + Math.sin(t * 0.0008 + p.phase) * 0.08

          if (mouse.active) {
            const dx = mouse.x - p.x
            const dy = mouse.y - p.y
            const d = Math.hypot(dx, dy)
            if (d < MOUSE_PULL_RADIUS && d > 0.01) {
              const f = (1 - d / MOUSE_PULL_RADIUS) * MOUSE_PULL_STRENGTH
              p.x += (dx / d) * f
              p.y += (dy / d) * f
            }
          }

          if (p.x < -10) p.x = width + 10
          else if (p.x > width + 10) p.x = -10
          if (p.y < -10) p.y = height + 10
          else if (p.y > height + 10) p.y = -10
        }
      }

      ctx.lineWidth = 0.5
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i]
          const b = particles[j]
          const dx = a.x - b.x
          const dy = a.y - b.y
          const d = Math.hypot(dx, dy)
          if (d < LINK_MAX_DIST) {
            const alpha = (1 - d / LINK_MAX_DIST) * LINK_MAX_OPACITY
            ctx.strokeStyle = `rgba(${LINK_COLOR}, ${alpha})`
            ctx.beginPath()
            ctx.moveTo(a.x, a.y)
            ctx.lineTo(b.x, b.y)
            ctx.stroke()
          }
        }
      }

      for (const p of particles) {
        ctx.shadowBlur = p.radius * 2.5
        ctx.shadowColor = `rgba(${p.color}, ${p.opacity})`
        ctx.fillStyle = `rgba(${p.color}, ${p.opacity})`
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.shadowBlur = 0

      if (!reduceMotion) rafId = requestAnimationFrame(draw)
    }

    const handleMouseMove = (e: MouseEvent) => {
      const rect = wrap.getBoundingClientRect()
      mouse.x = e.clientX - rect.left
      mouse.y = e.clientY - rect.top
      mouse.active = true
    }
    const handleMouseLeave = () => {
      mouse.active = false
    }

    resize()
    startTime = performance.now()
    rafId = requestAnimationFrame(draw)

    const observer = new ResizeObserver(resize)
    observer.observe(wrap)
    window.addEventListener('mousemove', handleMouseMove, { passive: true })
    window.addEventListener('mouseout', handleMouseLeave)

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId)
      observer.disconnect()
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseout', handleMouseLeave)
    }
  }, [])

  return (
    <div
      ref={wrapRef}
      aria-hidden="true"
      className="absolute inset-0 z-0 pointer-events-none overflow-hidden"
    >
      <canvas ref={canvasRef} className="block" />
    </div>
  )
}
