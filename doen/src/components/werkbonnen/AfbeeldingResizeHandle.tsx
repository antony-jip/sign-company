import React, { useCallback, useRef, useState } from 'react'

interface AfbeeldingResizeHandleProps {
  schaalPercentage: number
  onSchaalChange: (schaal: number) => void
  onSchaalCommit: (schaal: number) => void
  disabled?: boolean
}

const SNAP_WAARDEN = [25, 50, 75, 100] as const

function clamp(min: number, max: number, value: number): number {
  return Math.max(min, Math.min(max, value))
}

function dichtstbijzijndeSnap(waarde: number): number {
  let beste = SNAP_WAARDEN[0] as number
  let kleinsteAfstand = Math.abs(waarde - beste)
  for (const snap of SNAP_WAARDEN) {
    const afstand = Math.abs(waarde - snap)
    if (afstand < kleinsteAfstand) {
      kleinsteAfstand = afstand
      beste = snap
    }
  }
  return beste
}

export function AfbeeldingResizeHandle({
  schaalPercentage,
  onSchaalChange,
  onSchaalCommit,
  disabled,
}: AfbeeldingResizeHandleProps) {
  const startRef = useRef<{ x: number; y: number; schaal: number } | null>(null)
  const lastValueRef = useRef<number>(schaalPercentage)
  const lastShiftRef = useRef<boolean>(false)
  const [isDragging, setIsDragging] = useState(false)

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled) return
    e.preventDefault()
    e.stopPropagation()
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    startRef.current = { x: e.clientX, y: e.clientY, schaal: schaalPercentage }
    lastValueRef.current = schaalPercentage
    lastShiftRef.current = e.shiftKey
    setIsDragging(true)
  }, [disabled, schaalPercentage])

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!startRef.current) return
    e.preventDefault()
    const dx = e.clientX - startRef.current.x
    const dy = e.clientY - startRef.current.y
    const delta = Math.max(dx, dy)
    const nieuw = clamp(0, 100, startRef.current.schaal + delta)
    lastValueRef.current = nieuw
    lastShiftRef.current = e.shiftKey
    onSchaalChange(nieuw)
  }, [onSchaalChange])

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!startRef.current) return
    e.preventDefault()
    try {
      ;(e.target as HTMLElement).releasePointerCapture(e.pointerId)
    } catch {
      // capture kan al vrij zijn
    }
    const finaal = lastShiftRef.current
      ? Math.round(lastValueRef.current)
      : dichtstbijzijndeSnap(lastValueRef.current)
    startRef.current = null
    setIsDragging(false)
    onSchaalCommit(finaal)
  }, [onSchaalCommit])

  const handlePointerCancel = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!startRef.current) return
    try {
      ;(e.target as HTMLElement).releasePointerCapture(e.pointerId)
    } catch {
      // capture kan al vrij zijn
    }
    const reset = startRef.current.schaal
    startRef.current = null
    setIsDragging(false)
    onSchaalChange(reset)
  }, [onSchaalChange])

  const bg = isDragging ? 'rgba(241, 80, 37, 0.85)' : undefined
  const borderColor = isDragging ? '#F15025' : '#9B9B95'

  return (
    <div
      role="slider"
      aria-label="Afbeelding-grootte aanpassen"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(schaalPercentage)}
      aria-disabled={disabled || undefined}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      className="absolute bottom-0 right-0 z-10"
      style={{
        width: 14,
        height: 14,
        cursor: disabled ? 'default' : 'nwse-resize',
        pointerEvents: disabled ? 'none' : 'auto',
        opacity: disabled ? 0.4 : 1,
        backgroundColor: bg ?? 'rgba(255, 255, 255, 0.6)',
        backgroundImage: isDragging
          ? undefined
          : `linear-gradient(135deg, transparent 0%, transparent 35%, ${borderColor} 35%, ${borderColor} 45%, transparent 45%, transparent 65%, ${borderColor} 65%, ${borderColor} 75%, transparent 75%)`,
        borderTop: `1px solid ${borderColor}`,
        borderLeft: `1px solid ${borderColor}`,
        transition: 'background-color 120ms ease',
      }}
      onMouseEnter={(e) => {
        if (disabled || isDragging) return
        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.9)'
      }}
      onMouseLeave={(e) => {
        if (disabled || isDragging) return
        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.6)'
      }}
    />
  )
}
