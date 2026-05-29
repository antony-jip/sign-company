import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { cn } from '@/lib/utils'
import type { WerkbonAfbeelding } from '@/types'
import { WerkbonCanvasElement } from './WerkbonCanvasElement'
import {
  CANVAS_WERKRUIMTE_MM,
  CANVAS_SNAP_GRID_MM,
  CANVAS_Z_INDEX_DEFAULTS,
  heeftCanvasCoords,
} from '@/utils/werkbonCanvas'

interface WerkbonCanvasProps {
  itemId: string
  afbeeldingen: WerkbonAfbeelding[]
  onElementMove: (afbeeldingId: string, x_mm: number, y_mm: number) => void
  onElementResize: (afbeeldingId: string, w_mm: number, h_mm: number) => void
  onElementDelete: (afbeeldingId: string) => void
  onFilesDropped: (itemId: string, files: File[]) => void | Promise<void>
  disabled?: boolean
}

/**
 * Canvas-werkblad per werkbon-item. 267x100mm landscape-ratio,
 * cream bg, vrij plaatsbare elementen via WerkbonCanvasElement.
 *
 * State-eigenaarschap:
 *  - selectie-id      → hier (één per canvas, gescoped per item)
 *  - drag/resize live → bij het element zelf (C3)
 *  - scale (px/mm)    → hier, via ResizeObserver, doorgegeven aan elementen
 *  - file-drop        → hier, doorgegeven naar parent via onFilesDropped
 *  - keyboard delete  → hier, alleen actief bij selectie en niet in input
 */
export const WerkbonCanvas = React.memo(function WerkbonCanvas({
  itemId,
  afbeeldingen,
  onElementMove,
  onElementResize,
  onElementDelete,
  onFilesDropped,
  disabled = false,
}: WerkbonCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState<number>(3)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      const widthPx = entry.contentRect.width
      if (widthPx > 0) setScale(widthPx / CANVAS_WERKRUIMTE_MM.breedte)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Z-sort: lager z eerst (achter), tiebreaker created_at (newer-on-top).
  // Foto/pdf default z=1, logo z=2 → logo komt automatisch bovenop.
  const canvasElementen = useMemo(() => {
    return afbeeldingen
      .filter((a) => heeftCanvasCoords(a.layout))
      .sort((a, b) => {
        const blokTypeA = a.layout?.blok_type ?? 'foto'
        const blokTypeB = b.layout?.blok_type ?? 'foto'
        const za = a.layout?.z_index ?? CANVAS_Z_INDEX_DEFAULTS[blokTypeA]
        const zb = b.layout?.z_index ?? CANVAS_Z_INDEX_DEFAULTS[blokTypeB]
        if (za !== zb) return za - zb
        return a.created_at.localeCompare(b.created_at)
      })
  }, [afbeeldingen])

  const isEmpty = canvasElementen.length === 0

  const handleBgClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) setSelectedId(null)
  }, [])

  // Delete/Backspace deselecteert + verwijdert geselecteerd element.
  // Skip wanneer focus in input/textarea — voorkomt dat typen in de
  // omschrijving het element op de canvas wist.
  useEffect(() => {
    if (!selectedId) return
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Delete' && e.key !== 'Backspace') return
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
      e.preventDefault()
      onElementDelete(selectedId)
      setSelectedId(null)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [selectedId, onElementDelete])

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    if (disabled) return
    if (!e.dataTransfer.types.includes('Files')) return
    e.preventDefault()
    setIsDragOver(true)
  }, [disabled])

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    if (disabled) return
    if (!e.dataTransfer.types.includes('Files')) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
    if (!isDragOver) setIsDragOver(true)
  }, [disabled, isDragOver])

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    if (disabled) return
    const related = e.relatedTarget as Node | null
    if (related && e.currentTarget.contains(related)) return
    setIsDragOver(false)
  }, [disabled])

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    if (disabled) return
    e.preventDefault()
    setIsDragOver(false)
    const files = Array.from(e.dataTransfer.files || []).filter(
      (f) => f.type.startsWith('image/') || f.type === 'application/pdf',
    )
    if (files.length === 0) return
    void onFilesDropped(itemId, files)
  }, [disabled, itemId, onFilesDropped])

  const snapPx = CANVAS_SNAP_GRID_MM * scale

  return (
    <div
      ref={containerRef}
      onClick={handleBgClick}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        'relative w-full select-none overflow-hidden rounded-lg transition-colors',
        isDragOver
          ? 'bg-[#FDE8E4] border-2 border-dashed border-[#F15025]'
          : 'bg-[#F8F7F5] border border-[#EBEBEB]',
      )}
      style={{
        aspectRatio: `${CANVAS_WERKRUIMTE_MM.breedte} / ${CANVAS_WERKRUIMTE_MM.hoogte}`,
      }}
    >
      {isEmpty && !isDragOver && (
        <div className="absolute inset-0 flex items-center justify-center text-[13px] text-[#9B9B95] pointer-events-none select-none">
          Sleep een foto, logo of PDF op het werkblad
        </div>
      )}

      {isDragOver && (
        <div className="absolute inset-0 flex items-center justify-center text-[14px] font-medium text-[#1A1A1A] pointer-events-none select-none">
          Laat los om toe te voegen<span className="text-[#F15025]">.</span>
        </div>
      )}

      {/* Snap-grid dots tijdens drag of resize, half-transparant */}
      {draggingId && (
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none opacity-50"
          style={{
            backgroundImage:
              'radial-gradient(circle, #1A535C 0.5px, transparent 0.5px)',
            backgroundSize: `${snapPx}px ${snapPx}px`,
          }}
        />
      )}

      {canvasElementen.map((afb) => (
        <WerkbonCanvasElement
          key={afb.id}
          afbeelding={afb}
          scale={scale}
          selected={selectedId === afb.id}
          anyOtherSelected={selectedId !== null && selectedId !== afb.id}
          onSelect={() => setSelectedId(afb.id)}
          onDragStart={() => setDraggingId(afb.id)}
          onDragEnd={() => setDraggingId(null)}
          onMove={(x, y) => onElementMove(afb.id, x, y)}
          onResize={(w, h) => onElementResize(afb.id, w, h)}
          onDelete={() => {
            onElementDelete(afb.id)
            setSelectedId(null)
          }}
        />
      ))}
    </div>
  )
})
