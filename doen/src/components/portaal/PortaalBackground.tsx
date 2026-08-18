import { useEffect, useRef } from 'react'

const COLOR = '#1A535C'
const NUM_DOTS = 38
const MAX_DIST = 150
const SPEED = 0.18

interface Dot {
  x: number
  y: number
  vx: number
  vy: number
  r: number
}

export function PortaalBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let width = window.innerWidth
    let height = window.innerHeight
    let dpr = window.devicePixelRatio || 1
    let running = true
    let frameId = 0

    function resize() {
      if (!canvas || !ctx) return
      width = window.innerWidth
      height = window.innerHeight
      dpr = window.devicePixelRatio || 1
      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()

    const dots: Dot[] = Array.from({ length: NUM_DOTS }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * SPEED * 2,
      vy: (Math.random() - 0.5) * SPEED * 2,
      r: 1.4 + Math.random() * 1.6,
    }))

    function frame() {
      if (!running || !ctx) return
      ctx.clearRect(0, 0, width, height)

      for (const d of dots) {
        d.x += d.vx
        d.y += d.vy
        if (d.x < 0) { d.x = 0; d.vx = Math.abs(d.vx) }
        if (d.x > width) { d.x = width; d.vx = -Math.abs(d.vx) }
        if (d.y < 0) { d.y = 0; d.vy = Math.abs(d.vy) }
        if (d.y > height) { d.y = height; d.vy = -Math.abs(d.vy) }
      }

      ctx.strokeStyle = COLOR
      ctx.lineWidth = 0.6
      for (let i = 0; i < dots.length; i++) {
        for (let j = i + 1; j < dots.length; j++) {
          const dx = dots[i].x - dots[j].x
          const dy = dots[i].y - dots[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < MAX_DIST) {
            ctx.globalAlpha = (1 - dist / MAX_DIST) * 0.14
            ctx.beginPath()
            ctx.moveTo(dots[i].x, dots[i].y)
            ctx.lineTo(dots[j].x, dots[j].y)
            ctx.stroke()
          }
        }
      }

      ctx.fillStyle = COLOR
      ctx.globalAlpha = 0.22
      for (const d of dots) {
        ctx.beginPath()
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2)
        ctx.fill()
      }

      frameId = requestAnimationFrame(frame)
    }
    frame()

    function onVisibility() {
      if (document.hidden) {
        running = false
        cancelAnimationFrame(frameId)
      } else if (!running) {
        running = true
        frame()
      }
    }

    window.addEventListener('resize', resize)
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      running = false
      cancelAnimationFrame(frameId)
      window.removeEventListener('resize', resize)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: -1 }}
      aria-hidden
    />
  )
}
