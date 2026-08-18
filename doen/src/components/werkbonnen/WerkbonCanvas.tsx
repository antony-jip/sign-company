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
}

// Read-only werkbon-states (gefactureerd, afgerond) renderen deze
// component niet · parent kiest tussen WerkbonCanvas en een statische
// preview. Daarom geen disabled-prop hier.

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
// React.memo bewust weggelaten: WerkbonCanvasElement krijgt callbacks via
// inline arrows (id-capture per element), waardoor memoization toch niet
// zou hitten. Soft-cap = 6 elementen, render-cost is verwaarloosbaar.
export function WerkbonCanvas({
  itemId,
  afbeeldingen,
  onElementMove,
  onElementResize,
  onElementDelete,
  onFilesDropped,
}: WerkbonCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
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

  // Delete verwijdert geselecteerd element. Backspace bewust NIET, want
  // dat triggert ook bij focus op willekeurige buttons en zou per ongeluk
  // canvas-elementen wissen tijdens toetsenbordnavigatie (macOS-gebruikers
  // hitten Backspace permanent). Skip ook wanneer focus in tekst-input ligt.
  useEffect(() => {
    if (!selectedId) return
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Delete') return
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
    if (!e.dataTransfer.types.includes('Files')) return
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    if (!e.dataTransfer.types.includes('Files')) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
    if (!isDragOver) setIsDragOver(true)
  }, [isDragOver])

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    const related = e.relatedTarget as Node | null
    if (related && e.currentTarget.contains(related)) return
    setIsDragOver(false)
  }, [])

  const handleFiles = useCallback((fileList: FileList | null) => {
    const files = Array.from(fileList || []).filter(
      (f) => f.type.startsWith('image/') || f.type === 'application/pdf',
    )
    if (files.length === 0) return
    void onFilesDropped(itemId, files)
  }, [itemId, onFilesDropped])

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragOver(false)
    handleFiles(e.dataTransfer.files)
  }, [handleFiles])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files)
    e.target.value = ''
  }, [handleFiles])

  const openFilePicker = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    fileInputRef.current?.click()
  }, [])

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
          ? 'bg-[#FDE8E4] dark:bg-flame/10 border-2 border-dashed border-flame'
          : 'bg-[#F8F7F5] dark:bg-[#0E2025] border border-[#EBEBEB] dark:border-white/[0.08]',
      )}
      style={{
        aspectRatio: `${CANVAS_WERKRUIMTE_MM.breedte} / ${CANVAS_WERKRUIMTE_MM.hoogte}`,
      }}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf"
        multiple
        className="hidden"
        onChange={handleInputChange}
      />

      {isEmpty && !isDragOver && (
        <button
          type="button"
          onClick={openFilePicker}
          aria-label="Kies een foto, logo of PDF om toe te voegen"
          className="absolute inset-0 flex items-center justify-center text-[13px] text-muted-foreground select-none cursor-pointer rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-flame"
        >
          Sleep een foto, logo of PDF op het werkblad, of{' '}
          <span className="ml-1 font-medium text-flame underline underline-offset-2">kies een bestand</span>
        </button>
      )}

      {isDragOver && (
        <div className="absolute inset-0 flex items-center justify-center text-[14px] font-medium text-foreground dark:text-[#E8E8E8] pointer-events-none select-none">
          Laat los om toe te voegen<span className="text-flame">.</span>
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
}
