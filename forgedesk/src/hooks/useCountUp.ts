import { useEffect, useRef, useState } from 'react'

/**
 * Animates a number from 0 to `target` with ease-out curve.
 *
 * @param target  The final number to animate to
 * @param duration  Animation duration in ms (default 800)
 * @param decimals  Decimal places to show (default 0)
 * @returns The current animated value as a number
 */
export function useCountUp(target: number, duration = 800, decimals = 0): number {
  const [value, setValue] = useState(0)
  const rafRef = useRef<number>()
  const startRef = useRef<number>()
  const prevTarget = useRef(0)

  useEffect(() => {
    const from = prevTarget.current
    prevTarget.current = target

    if (target === 0) {
      setValue(0)
      return
    }

    const animate = (timestamp: number) => {
      if (!startRef.current) startRef.current = timestamp
      const elapsed = timestamp - startRef.current
      const progress = Math.min(elapsed / duration, 1)

      // Ease out cubic: 1 - (1 - t)^3
      const eased = 1 - Math.pow(1 - progress, 3)

      const current = from + (target - from) * eased
      const factor = Math.pow(10, decimals)
      setValue(Math.round(current * factor) / factor)

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate)
      }
    }

    startRef.current = undefined
    rafRef.current = requestAnimationFrame(animate)

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [target, duration, decimals])

  return value
}
