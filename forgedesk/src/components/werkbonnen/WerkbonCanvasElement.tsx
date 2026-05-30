import React, { useState, useRef, useCallback } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { WerkbonAfbeelding } from '@/types'
import {
  CANVAS_WERKRUIMTE_MM,
  CANVAS_SNAP_GRID_MM,
  CANVAS_MIN_ELEMENT_MM,
  CANVAS_Z_INDEX_DEFAULTS,
} from '@/utils/werkbonCanvas'

interface WerkbonCanvasElementProps {
  afbeelding: WerkbonAfbeelding
  scale: number
  selected: boolean
  /** True wanneer een ander element geselecteerd is. Onderdrukt het hover-frame
   * om dubbele frames (100% selectie + 30% hover) te vermijden. */
  anyOtherSelected: boolean
  onSelect: () => void
  onDragStart: () => void
  onDragEnd: () => void
  onMove: (x_mm: number, y_mm: number) => void
  onResize: (w_mm: number, h_mm: number) => void
  onDelete: () => void
}

type Corner = 'nw' | 'ne' | 'sw' | 'se'

const CORNERS: Corner[] = ['nw', 'ne', 'sw', 'se']

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function snapMm(value: number, shift: boolean): number {
  if (shift) return value
  return Math.round(value / CANVAS_SNAP_GRID_MM) * CANVAS_SNAP_GRID_MM
}

function formatPos(x: number, y: number): string {
  return `${Math.round(x)} · ${Math.round(y)} mm`
}

function formatSize(w: number, h: number): string {
  return `${Math.round(w)} × ${Math.round(h)} mm`
}

/**
 * Eén canvas-element (foto, logo, pdf-eerste-pagina). Absoluut gepositioneerd
 * binnen WerkbonCanvas. Drag + resize via pointer-events met setPointerCapture,
 * patroon overgenomen uit fase-2 AfbeeldingResizeHandle.
 *
 * Aspect-ratio is default gelock op de huidige w/h-verhouding; Shift omzeilt
 * de lock en de snap-to-5mm tegelijk (één toets, twee vrijheden).
 */
export const WerkbonCanvasElement = React.memo(function WerkbonCanvasElement({
  afbeelding,
  scale,
  selected,
  anyOtherSelected,
  onSelect,
  onDragStart,
  onDragEnd,
  onMove,
  onResize,
  onDelete,
}: WerkbonCanvasElementProps) {
  const layout = afbeelding.layout
  const x_mm = layout?.canvas_x_mm ?? 0
  const y_mm = layout?.canvas_y_mm ?? 0
  const w_mm = layout?.canvas_breedte_mm ?? 60
  const h_mm = layout?.canvas_hoogte_mm ?? 40

  const [livePos, setLivePos] = useState<{ x: number; y: number } | null>(null)
  const [liveSize, setLiveSize] = useState<{ w: number; h: number } | null>(null)
  const [activeCorner, setActiveCorner] = useState<Corner | null>(null)

  const dragStartRef = useRef<{
    pointerX: number
    pointerY: number
    elementX: number
    elementY: number
  } | null>(null)

  const resizeStartRef = useRef<{
    pointerX: number
    pointerY: number
    elementX: number
    elementY: number
    elementW: number
    elementH: number
    corner: Corner
    sourceRatio: number
  } | null>(null)

  const displayX = livePos?.x ?? x_mm
  const displayY = livePos?.y ?? y_mm
  const displayW = liveSize?.w ?? w_mm
  const displayH = liveSize?.h ?? h_mm

  // ─── Drag ─────────────────────────────────────────────────────────────
  const handleDragPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return
      if (!selected) onSelect()
      e.stopPropagation()
      e.preventDefault()
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
      dragStartRef.current = {
        pointerX: e.clientX,
        pointerY: e.clientY,
        elementX: x_mm,
        elementY: y_mm,
      }
      setLivePos({ x: x_mm, y: y_mm })
      onDragStart()
    },
    [selected, onSelect, x_mm, y_mm, onDragStart],
  )

  const handleDragPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const start = dragStartRef.current
      if (!start) return
      const dx_mm = (e.clientX - start.pointerX) / scale
      const dy_mm = (e.clientY - start.pointerY) / scale
      const shift = e.shiftKey
      let nx = snapMm(start.elementX + dx_mm, shift)
      let ny = snapMm(start.elementY + dy_mm, shift)
      nx = clamp(nx, 0, CANVAS_WERKRUIMTE_MM.breedte - displayW)
      ny = clamp(ny, 0, CANVAS_WERKRUIMTE_MM.hoogte - displayH)
      setLivePos({ x: nx, y: ny })
    },
    [scale, displayW, displayH],
  )

  const handleDragPointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!dragStartRef.current) return
      try {
        ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
      } catch {}
      dragStartRef.current = null
      const pos = livePos
      setLivePos(null)
      onDragEnd()
      if (pos && (pos.x !== x_mm || pos.y !== y_mm)) onMove(pos.x, pos.y)
    },
    [livePos, x_mm, y_mm, onMove, onDragEnd],
  )

  const handleDragPointerCancel = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      try {
        ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
      } catch {}
      dragStartRef.current = null
      setLivePos(null)
      onDragEnd()
    },
    [onDragEnd],
  )

  // ─── Resize ───────────────────────────────────────────────────────────
  const handleResizePointerDown = useCallback(
    (corner: Corner) => (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return
      e.stopPropagation()
      e.preventDefault()
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
      resizeStartRef.current = {
        pointerX: e.clientX,
        pointerY: e.clientY,
        elementX: x_mm,
        elementY: y_mm,
        elementW: w_mm,
        elementH: h_mm,
        corner,
        sourceRatio: h_mm > 0 ? w_mm / h_mm : 1,
      }
      setActiveCorner(corner)
      setLiveSize({ w: w_mm, h: h_mm })
      setLivePos({ x: x_mm, y: y_mm })
      onDragStart()
    },
    [x_mm, y_mm, w_mm, h_mm, onDragStart],
  )

  const handleResizePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const start = resizeStartRef.current
      if (!start) return
      const dx_mm = (e.clientX - start.pointerX) / scale
      const dy_mm = (e.clientY - start.pointerY) / scale
      const shift = e.shiftKey

      let nx = start.elementX
      let ny = start.elementY
      let nw = start.elementW
      let nh = start.elementH
      const r = start.sourceRatio

      // Vrije w/h-aanpassing per hoek
      switch (start.corner) {
        case 'se':
          nw = start.elementW + dx_mm
          nh = start.elementH + dy_mm
          break
        case 'sw':
          nw = start.elementW - dx_mm
          nh = start.elementH + dy_mm
          break
        case 'ne':
          nw = start.elementW + dx_mm
          nh = start.elementH - dy_mm
          break
        case 'nw':
          nw = start.elementW - dx_mm
          nh = start.elementH - dy_mm
          break
      }

      // Aspect-ratio lock tenzij Shift: dominante as wint
      if (!shift) {
        if (Math.abs(dx_mm) * r > Math.abs(dy_mm)) nh = nw / r
        else nw = nh * r
      }

      // Snap (Shift omzeilt — zelfde toets als vrije ratio)
      if (!shift) {
        nw = Math.round(nw / CANVAS_SNAP_GRID_MM) * CANVAS_SNAP_GRID_MM
        nh = Math.round(nh / CANVAS_SNAP_GRID_MM) * CANVAS_SNAP_GRID_MM
      }

      // Hard-floor 1 snap-stap (5mm) BEFORE we derive nx/ny van de nieuwe
      // afmetingen — anders kan een NW-resize naar binnen het element
      // wegklemmen tot 1mm in de rechter-onderhoek.
      // CANVAS_MIN_ELEMENT_MM (15mm) blijft soft-cap voor de rode badge.
      const MIN = CANVAS_SNAP_GRID_MM
      nw = Math.max(MIN, nw)
      nh = Math.max(MIN, nh)

      // X/Y aanpassen voor NW/SW/NE waar de west- of noord-rand verschuift
      if (start.corner === 'sw' || start.corner === 'nw') {
        nx = start.elementX + (start.elementW - nw)
      }
      if (start.corner === 'ne' || start.corner === 'nw') {
        ny = start.elementY + (start.elementH - nh)
      }

      // Clamp binnen werkruimte — nx/ny eerst tegen breedte-nw zodat de
      // element-grenzen altijd binnen 267x100mm vallen.
      nx = clamp(nx, 0, CANVAS_WERKRUIMTE_MM.breedte - nw)
      ny = clamp(ny, 0, CANVAS_WERKRUIMTE_MM.hoogte - nh)
      nw = clamp(nw, MIN, CANVAS_WERKRUIMTE_MM.breedte - nx)
      nh = clamp(nh, MIN, CANVAS_WERKRUIMTE_MM.hoogte - ny)

      setLiveSize({ w: nw, h: nh })
      setLivePos({ x: nx, y: ny })
    },
    [scale],
  )

  const handleResizePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!resizeStartRef.current) return
      try {
        ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
      } catch {}
      resizeStartRef.current = null
      const size = liveSize
      const pos = livePos
      setLiveSize(null)
      setLivePos(null)
      setActiveCorner(null)
      onDragEnd()
      if (size && (size.w !== w_mm || size.h !== h_mm)) onResize(size.w, size.h)
      if (pos && (pos.x !== x_mm || pos.y !== y_mm)) onMove(pos.x, pos.y)
    },
    [liveSize, livePos, w_mm, h_mm, x_mm, y_mm, onResize, onMove, onDragEnd],
  )

  const handleResizePointerCancel = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      try {
        ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
      } catch {}
      resizeStartRef.current = null
      setLiveSize(null)
      setLivePos(null)
      setActiveCorner(null)
      onDragEnd()
    },
    [onDragEnd],
  )

  const isResizing = activeCorner !== null
  const isDragging = livePos !== null && !isResizing
  const isTooSmall =
    displayW < CANVAS_MIN_ELEMENT_MM || displayH < CANVAS_MIN_ELEMENT_MM

  const leftPx = displayX * scale
  const topPx = displayY * scale
  const widthPx = displayW * scale
  const heightPx = displayH * scale

  return (
    <div
      onPointerDown={handleDragPointerDown}
      onPointerMove={handleDragPointerMove}
      onPointerUp={handleDragPointerUp}
      onPointerCancel={handleDragPointerCancel}
      className={cn(
        'absolute cursor-move',
        selected && 'ring-1 ring-inset ring-[#1A535C]',
        // Hover-frame onderdrukken zodra een ander element geselecteerd is —
        // voorkomt dubbele kaders (100% selectie + 30% hover).
        !selected &&
          !anyOtherSelected &&
          'hover:ring-1 hover:ring-inset hover:ring-[#1A535C]/30',
      )}
      style={{
        left: `${leftPx}px`,
        top: `${topPx}px`,
        width: `${widthPx}px`,
        height: `${heightPx}px`,
        // Dezelfde fallback als de B3 sort-logica zodat DOM-stacking en
        // render-volgorde nooit divergeren (logo automatisch boven foto/pdf).
        zIndex:
          layout?.z_index ?? CANVAS_Z_INDEX_DEFAULTS[layout?.blok_type ?? 'foto'],
      }}
    >
      <img
        src={afbeelding.url}
        alt=""
        draggable={false}
        className="w-full h-full object-contain pointer-events-none select-none"
      />

      {selected && (
        <>
          {CORNERS.map((corner) => (
            <div
              key={corner}
              onPointerDown={handleResizePointerDown(corner)}
              onPointerMove={handleResizePointerMove}
              onPointerUp={handleResizePointerUp}
              onPointerCancel={handleResizePointerCancel}
              className={cn(
                'absolute w-2.5 h-2.5 bg-[#F15025] border-2 border-white',
                'shadow-[0_0_0_0.5px_rgba(0,0,0,0.15)]',
                activeCorner === corner &&
                  'shadow-[0_0_0_3px_rgba(241,80,37,0.25)]',
              )}
              style={{
                top: corner === 'nw' || corner === 'ne' ? '-5px' : 'calc(100% - 5px)',
                left: corner === 'nw' || corner === 'sw' ? '-5px' : 'calc(100% - 5px)',
                cursor: corner === 'nw' || corner === 'se' ? 'nwse-resize' : 'nesw-resize',
                borderRadius: '1px',
              }}
            />
          ))}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className={cn(
              'absolute -top-2.5 -right-2.5 w-5 h-5 rounded-full bg-white',
              'border border-[#EBEBEB] flex items-center justify-center',
              'text-[#6B6B66] hover:text-[#F15025] hover:border-[#F15025]',
              'transition-colors cursor-pointer',
            )}
            aria-label="Element verwijderen"
          >
            <X size={12} strokeWidth={2} />
          </button>
        </>
      )}

      {isDragging && (
        <div
          className={cn(
            'absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded',
            'bg-[#1A535C] text-white text-[11px] font-mono tabular-nums whitespace-nowrap',
            'shadow-[0_2px_8px_rgba(0,0,0,0.15)] pointer-events-none select-none',
          )}
        >
          {formatPos(displayX, displayY)}
        </div>
      )}

      {isResizing && (
        <div
          className={cn(
            'absolute -bottom-7 px-2 py-0.5 rounded text-[11px] text-white',
            'font-mono tabular-nums whitespace-nowrap',
            'shadow-[0_2px_8px_rgba(0,0,0,0.15)] pointer-events-none select-none',
            isTooSmall ? 'bg-[#C0451A]' : 'bg-[#1A535C]',
          )}
          style={
            activeCorner === 'sw' || activeCorner === 'nw'
              ? { left: 0 }
              : { right: 0 }
          }
        >
          {formatSize(displayW, displayH)}
        </div>
      )}
    </div>
  )
})
