import { cn } from '@/lib/utils'
import { SPECTRUM_GRADIENT } from '@/utils/spectrumUtils'

interface SpectrumBarProps {
  /** 0-100 percentage filled */
  percentage: number
  /** Bar height in pixels (default 4) */
  height?: number
  className?: string
}

export function SpectrumBar({ percentage, height = 4, className }: SpectrumBarProps) {
  const clamped = Math.max(0, Math.min(100, percentage))

  // The gradient spans the full track width. The fill div clips it at `percentage%`.
  // We scale backgroundSize so the gradient maps to the parent (track) width,
  // not the fill's own width: if fill is 40% of track, background must be 250% of fill.
  const bgSize = clamped > 0 ? `${(100 / clamped) * 100}% 100%` : '100% 100%'

  return (
    <div
      className={cn('w-full rounded-sm overflow-hidden', className)}
      style={{ height, backgroundColor: '#E6E4E0' }}
    >
      {clamped > 0 && (
        <div
          className="h-full rounded-sm spectrum-fill-animate"
          style={{
            width: `${clamped}%`,
            backgroundImage: SPECTRUM_GRADIENT,
            backgroundSize: bgSize,
            '--target-width': `${clamped}%`,
          } as React.CSSProperties}
        />
      )}
    </div>
  )
}
