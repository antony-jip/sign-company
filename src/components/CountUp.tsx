'use client'

import { useEffect, useRef, useState } from 'react'
import { useInView } from 'framer-motion'

interface CountUpProps {
  end: number
  prefix?: string
  suffix?: string
  duration?: number
  className?: string
}

export default function CountUp({
  end,
  prefix = '',
  suffix = '',
  duration = 1500,
  className = '',
}: CountUpProps) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-60px' })
  const [value, setValue] = useState(0)

  useEffect(() => {
    if (!isInView) return

    const startTime = Date.now()
    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(eased * end))
      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }
    requestAnimationFrame(animate)
  }, [isInView, end, duration])

  return (
    <span ref={ref} className={`font-mono tabular-nums ${className}`}>
      {prefix}{value}{suffix}
    </span>
  )
}
