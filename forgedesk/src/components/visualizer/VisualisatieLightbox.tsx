import { useState, useEffect, useCallback } from 'react'
import { X, ChevronLeft, ChevronRight, Download } from 'lucide-react'
import { SIGNING_TYPE_LABELS } from '@/utils/visualizerDefaults'
import { resolvePortaalBestandUrl } from '@/services/storageService'
import type { SigningVisualisatie } from '@/types'

interface VisualisatieLightboxProps {
  visualisaties: SigningVisualisatie[]
  startIndex: number
  onClose: () => void
}

export function VisualisatieLightbox({
  visualisaties,
  startIndex,
  onClose,
}: VisualisatieLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(startIndex)
  const current = visualisaties[currentIndex]

  const goTo = useCallback((dir: 'prev' | 'next') => {
    setCurrentIndex(prev => {
      if (dir === 'prev') return prev > 0 ? prev - 1 : visualisaties.length - 1
      return prev < visualisaties.length - 1 ? prev + 1 : 0
    })
  }, [visualisaties.length])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') goTo('prev')
      if (e.key === 'ArrowRight') goTo('next')
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose, goTo])

  const mockupUrl = resolvePortaalBestandUrl(current?.resultaat_url) || current?.resultaat_url || ''
  const origineelUrl = resolvePortaalBestandUrl(current?.gebouw_foto_url) || current?.gebouw_foto_url || ''

  const handleDownload = useCallback(() => {
    if (!mockupUrl) return
    const a = document.createElement('a')
    a.href = mockupUrl
    a.download = `mockup-${current.signing_type}-${current.id.slice(0, 8)}.png`
    a.target = '_blank'
    a.click()
  }, [mockupUrl, current])

  if (!current) return null

  const titel = SIGNING_TYPE_LABELS[current.signing_type] || current.signing_type

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex flex-col animate-in fade-in duration-150"
      onClick={onClose}
    >
      {/* ── Topbalk ── */}
      <div
        className="flex items-center justify-between gap-4 px-5 py-3.5 flex-shrink-0 border-b border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-baseline gap-2.5 min-w-0">
          <span className="text-white font-semibold truncate">{titel}<span className="text-[#F15025]">.</span></span>
          {current.kleur_instelling && (
            <span className="text-white/50 text-sm truncate">{current.kleur_instelling}</span>
          )}
          <span className="text-white/40 text-xs font-mono flex-shrink-0">{currentIndex + 1} / {visualisaties.length}</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); handleDownload() }}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-white bg-white/10 hover:bg-white/20 rounded-lg px-3 py-1.5 transition-colors"
          >
            <Download className="h-4 w-4" /> Download
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onClose() }}
            className="h-9 w-9 inline-flex items-center justify-center text-white bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
            title="Sluiten (Esc)"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── Vergelijking ── */}
      <div
        className="flex-1 min-h-0 relative flex items-center justify-center px-14 py-6"
        onClick={onClose}
      >
        {visualisaties.length > 1 && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); goTo('prev') }}
              className="absolute left-4 top-1/2 -translate-y-1/2 h-11 w-11 inline-flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-10"
              title="Vorige (←)"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); goTo('next') }}
              className="absolute right-4 top-1/2 -translate-y-1/2 h-11 w-11 inline-flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-10"
              title="Volgende (→)"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </>
        )}

        <div
          className="grid grid-cols-1 lg:grid-cols-2 gap-5 w-full max-w-[1700px] h-full"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Origineel */}
          <figure className="min-h-0 flex flex-col items-center justify-center">
            <figcaption className="text-white/60 text-[11px] font-medium uppercase tracking-wider mb-2.5">Origineel</figcaption>
            {origineelUrl ? (
              <img
                src={origineelUrl}
                alt="Origineel"
                className="max-h-full max-w-full rounded-xl object-contain ring-1 ring-white/10 shadow-2xl"
              />
            ) : (
              <div className="flex items-center justify-center w-full max-w-md aspect-[4/3] rounded-xl bg-white/5 ring-1 ring-white/10 text-white/40 text-sm">
                Geen origineel beschikbaar
              </div>
            )}
          </figure>

          {/* Mockup */}
          <figure className="min-h-0 flex flex-col items-center justify-center">
            <figcaption className="text-[11px] font-medium uppercase tracking-wider mb-2.5">
              <span className="text-[#F15025]">Mockup</span>
            </figcaption>
            <img
              src={mockupUrl}
              alt="Mockup"
              className="max-h-full max-w-full rounded-xl object-contain ring-1 ring-white/10 shadow-2xl"
            />
          </figure>
        </div>
      </div>
    </div>
  )
}
