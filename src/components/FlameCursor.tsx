'use client'

import { useEffect, useRef, useState } from 'react'

export default function FlameCursor() {
  const cursorRef = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  const posRef = useRef({ x: 0, y: 0 })
  const targetRef = useRef({ x: 0, y: 0 })

  useEffect(() => {
    // Only on desktop
    if (typeof window === 'undefined' || window.innerWidth < 1024) return

    const handleMouseMove = (e: MouseEvent) => {
      targetRef.current = { x: e.clientX, y: e.clientY }
      if (!isVisible) setIsVisible(true)
    }

    const handleMouseLeave = () => setIsVisible(false)
    const handleMouseEnter = () => setIsVisible(true)

    // Only track within hero section
    const hero = document.getElementById('hero-section')
    if (!hero) return

    hero.addEventListener('mousemove', handleMouseMove)
    hero.addEventListener('mouseleave', handleMouseLeave)
    hero.addEventListener('mouseenter', handleMouseEnter)

    // Lerp animation loop
    let rafId: number
    const animate = () => {
      posRef.current.x += (targetRef.current.x - posRef.current.x) * 0.15
      posRef.current.y += (targetRef.current.y - posRef.current.y) * 0.15

      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate(${posRef.current.x - 6}px, ${posRef.current.y - 6}px)`
      }
      rafId = requestAnimationFrame(animate)
    }
    rafId = requestAnimationFrame(animate)

    return () => {
      hero.removeEventListener('mousemove', handleMouseMove)
      hero.removeEventListener('mouseleave', handleMouseLeave)
      hero.removeEventListener('mouseenter', handleMouseEnter)
      cancelAnimationFrame(rafId)
    }
  }, [isVisible])

  return (
    <div
      ref={cursorRef}
      className={`fixed top-0 left-0 w-3 h-3 rounded-full bg-flame pointer-events-none z-[100] mix-blend-normal transition-opacity duration-200 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
      style={{ willChange: 'transform' }}
    />
  )
}
