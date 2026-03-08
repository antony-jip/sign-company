import React, { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import {
  X, ChevronLeft, ChevronRight, Download,
} from 'lucide-react'
import { SIGNING_TYPE_LABELS } from '@/utils/visualizerDefaults'
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

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') goTo('prev')
      if (e.key === 'ArrowRight') goTo('next')
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose, goTo])

  const handleDownload = useCallback(() => {
    if (!current) return
    const a = document.createElement('a')
    a.href = current.resultaat_url
    a.download = `mockup-${current.signing_type}-${current.id.slice(0, 8)}.png`
    a.target = '_blank'
    a.click()
  }, [current])

  if (!current) return null

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Controls */}
      <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
        <Button
          size="sm"
          variant="secondary"
          onClick={(e) => { e.stopPropagation(); handleDownload() }}
          className="gap-1.5"
        >
          <Download className="h-4 w-4" /> Download
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={(e) => { e.stopPropagation(); onClose() }}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Title bar */}
      <div className="absolute top-4 left-4 text-white text-sm z-10">
        <span className="font-medium">
          {SIGNING_TYPE_LABELS[current.signing_type] || current.signing_type}
        </span>
        <span className="text-white/60 ml-2">
          — {current.kleur_instelling}
        </span>
        <span className="text-white/40 ml-2">
          {currentIndex + 1} / {visualisaties.length}
        </span>
      </div>

      {/* Navigation arrows */}
      {visualisaties.length > 1 && (
        <>
          <Button
            size="sm"
            variant="ghost"
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 z-10"
            onClick={(e) => { e.stopPropagation(); goTo('prev') }}
          >
            <ChevronLeft className="h-8 w-8" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 z-10"
            onClick={(e) => { e.stopPropagation(); goTo('next') }}
          >
            <ChevronRight className="h-8 w-8" />
          </Button>
        </>
      )}

      {/* Images */}
      <div
        className="flex items-center gap-4 max-w-[90vw] max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Original */}
        <div className="flex-1 max-w-[45vw]">
          <p className="text-white/60 text-xs text-center mb-2">Origineel</p>
          <img
            src={current.gebouw_foto_url}
            alt="Origineel"
            className="max-h-[80vh] w-auto mx-auto rounded-lg object-contain"
          />
        </div>

        {/* Generated */}
        <div className="flex-1 max-w-[45vw]">
          <p className="text-white/60 text-xs text-center mb-2">Mockup</p>
          <img
            src={current.resultaat_url}
            alt="Mockup"
            className="max-h-[80vh] w-auto mx-auto rounded-lg object-contain"
          />
        </div>
      </div>
    </div>
  )
}
