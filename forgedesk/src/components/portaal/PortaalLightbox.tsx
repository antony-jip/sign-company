import { useState, useEffect, useCallback, useRef } from 'react'
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react'

interface LightboxImage {
  url: string
  bestandsnaam: string
  grootte?: number | null
}

interface PortaalLightboxProps {
  images: LightboxImage[]
  startIndex: number
  onClose: () => void
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function PortaalLightbox({ images, startIndex, onClose }: PortaalLightboxProps) {
  const [index, setIndex] = useState(startIndex)
  const [scale, setScale] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const dragStart = useRef({ x: 0, y: 0, posX: 0, posY: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  // Pinch-to-zoom state
  const lastDistance = useRef(0)

  const current = images[index]

  const resetZoom = useCallback(() => {
    setScale(1)
    setPosition({ x: 0, y: 0 })
  }, [])

  const goTo = useCallback((newIndex: number) => {
    setIndex(newIndex)
    resetZoom()
  }, [resetZoom])

  const goPrev = useCallback(() => {
    if (images.length > 1) goTo(index === 0 ? images.length - 1 : index - 1)
  }, [images.length, index, goTo])

  const goNext = useCallback(() => {
    if (images.length > 1) goTo(index === images.length - 1 ? 0 : index + 1)
  }, [images.length, index, goTo])

  // Keyboard navigation
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowLeft') goPrev()
      else if (e.key === 'ArrowRight') goNext()
      else if (e.key === '+' || e.key === '=') setScale(s => Math.min(s + 0.5, 5))
      else if (e.key === '-') setScale(s => Math.max(s - 0.5, 0.5))
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose, goPrev, goNext])

  // Scroll zoom
  function handleWheel(e: React.WheelEvent) {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.25 : 0.25
    setScale(s => Math.max(0.5, Math.min(5, s + delta)))
  }

  // Touch pinch-to-zoom
  function handleTouchStart(e: React.TouchEvent) {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      lastDistance.current = Math.sqrt(dx * dx + dy * dy)
    }
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      const distance = Math.sqrt(dx * dx + dy * dy)
      if (lastDistance.current > 0) {
        const delta = (distance - lastDistance.current) * 0.01
        setScale(s => Math.max(0.5, Math.min(5, s + delta)))
      }
      lastDistance.current = distance
    }
  }

  function handleTouchEnd() {
    lastDistance.current = 0
  }

  // Mouse drag for panning when zoomed
  function handleMouseDown(e: React.MouseEvent) {
    if (scale > 1) {
      setIsDragging(true)
      dragStart.current = { x: e.clientX, y: e.clientY, posX: position.x, posY: position.y }
    }
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (isDragging) {
      setPosition({
        x: dragStart.current.posX + (e.clientX - dragStart.current.x),
        y: dragStart.current.posY + (e.clientY - dragStart.current.y),
      })
    }
  }

  function handleMouseUp() {
    setIsDragging(false)
  }

  // Click outside image to close
  function handleBackdropClick(e: React.MouseEvent) {
    if (e.target === containerRef.current) onClose()
  }

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 relative z-10">
        <div className="text-white/60 text-sm">
          {images.length > 1 && `${index + 1} / ${images.length}`}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setScale(s => Math.min(s + 0.5, 5))}
            className="p-2 text-white/60 hover:text-white transition-colors"
            title="Zoom in"
          >
            <ZoomIn className="w-5 h-5" />
          </button>
          <button
            onClick={() => setScale(s => Math.max(s - 0.5, 0.5))}
            className="p-2 text-white/60 hover:text-white transition-colors"
            title="Zoom uit"
          >
            <ZoomOut className="w-5 h-5" />
          </button>
          {scale !== 1 && (
            <button
              onClick={resetZoom}
              className="px-2 py-1 text-xs text-white/60 hover:text-white border border-white/20 rounded transition-colors"
            >
              {Math.round(scale * 100)}%
            </button>
          )}
          <button
            onClick={onClose}
            className="p-2 text-white/60 hover:text-white transition-colors"
            title="Sluiten (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main image area */}
      <div
        ref={containerRef}
        className="flex-1 flex items-center justify-center relative overflow-hidden select-none"
        onClick={handleBackdropClick}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
      >
        <img
          src={current.url}
          alt={current.bestandsnaam}
          className="max-w-[90vw] max-h-[80vh] object-contain transition-transform duration-150"
          style={{
            transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
          }}
          draggable={false}
        />

        {/* Prev/Next arrows */}
        {images.length > 1 && (
          <>
            <button
              onClick={goPrev}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/40 text-white/80 hover:bg-black/60 hover:text-white transition-colors"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={goNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/40 text-white/80 hover:bg-black/60 hover:text-white transition-colors"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </>
        )}
      </div>

      {/* Bottom info */}
      <div className="px-4 py-3 text-center">
        <p className="text-white/70 text-sm">{current.bestandsnaam}</p>
        {current.grootte && (
          <p className="text-white/40 text-xs mt-0.5">{formatFileSize(current.grootte)}</p>
        )}
      </div>
    </div>
  )
}
