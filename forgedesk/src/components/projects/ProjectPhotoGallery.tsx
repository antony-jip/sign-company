import React, { useState, useRef, useCallback, useEffect } from 'react'
import {
  Camera,
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  Upload,
  Trash2,
  MessageSquare,
  Eye,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { createProjectFoto, deleteProjectFoto } from '@/services/supabaseService'
import { toast } from 'sonner'
import { logger } from '../../utils/logger'
import { buildZip } from '../../utils/zipBuilder'
import type { ProjectFoto } from '@/types'

interface ProjectPhotoGalleryProps {
  projectId: string
  userId: string
  photos: ProjectFoto[]
  onPhotosChanged: () => void
}

export function ProjectPhotoGallery({
  projectId,
  userId,
  photos,
  onPhotosChanged,
}: ProjectPhotoGalleryProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [isDownloading, setIsDownloading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  const handleUpload = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files).filter(f =>
      f.type.startsWith('image/')
    )
    if (fileArray.length === 0) {
      toast.error('Selecteer afbeeldingen (JPG, PNG, etc.)')
      return
    }

    setIsUploading(true)
    let uploaded = 0

    for (const file of fileArray) {
      try {
        await createProjectFoto(
          { user_id: userId, project_id: projectId, omschrijving: file.name, type: 'situatie' },
          file,
        )
        uploaded++
      } catch (err) {
        logger.error(`Fout bij uploaden ${file.name}:`, err)
        toast.error(`Kon "${file.name}" niet uploaden`)
      }
    }

    if (uploaded > 0) {
      toast.success(`${uploaded} foto${uploaded > 1 ? "'s" : ''} geüpload`)
      onPhotosChanged()
    }
    setIsUploading(false)
  }, [projectId, userId, onPhotosChanged])

  const handleDelete = async (photo: ProjectFoto, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    try {
      await deleteProjectFoto(photo.id)
      toast.success('Foto verwijderd')
      if (lightboxIndex !== null) {
        if (photos.length <= 1) setLightboxIndex(null)
        else if (lightboxIndex >= photos.length - 1) setLightboxIndex(photos.length - 2)
      }
      onPhotosChanged()
    } catch (err) {
      logger.error('Fout bij verwijderen foto:', err)
      toast.error('Kon foto niet verwijderen')
    }
  }

  const handleBulkDownload = async () => {
    if (photos.length === 0) return
    setIsDownloading(true)

    try {
      const entries: { name: string; data: Uint8Array }[] = []
      let loaded = 0

      for (const photo of photos) {
        if (!photo.url) continue
        try {
          const resp = await fetch(photo.url)
          const arrayBuf = await resp.arrayBuffer()
          const name = photo.omschrijving || `foto-${photo.id.slice(0, 8)}`
          entries.push({ name, data: new Uint8Array(arrayBuf) })
          loaded++
          toast.loading(`Foto's ophalen... ${loaded}/${photos.length}`, { id: 'bulk-download' })
        } catch (err) {
          logger.error(`Kon ${photo.omschrijving} niet ophalen`, err)
        }
      }

      if (entries.length === 0) {
        toast.error("Geen foto's beschikbaar voor download", { id: 'bulk-download' })
        return
      }

      const zipBlob = buildZip(entries)
      const url = URL.createObjectURL(zipBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = `fotos-${projectId.slice(0, 8)}.zip`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast.success(`${entries.length} foto's gedownload als ZIP`, { id: 'bulk-download' })
    } catch (err) {
      logger.error('Download mislukt:', err)
      toast.error('Download mislukt', { id: 'bulk-download' })
    } finally {
      setIsDownloading(false)
    }
  }

  // Keyboard nav for lightbox
  useEffect(() => {
    if (lightboxIndex === null) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setLightboxIndex(null)
      if (e.key === 'ArrowRight') setLightboxIndex(i => i !== null ? Math.min(i + 1, photos.length - 1) : null)
      if (e.key === 'ArrowLeft') setLightboxIndex(i => i !== null ? Math.max(i - 1, 0) : null)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [lightboxIndex, photos.length])

  // Lock body scroll when lightbox open
  useEffect(() => {
    if (lightboxIndex !== null) {
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = '' }
    }
  }, [lightboxIndex])

  const currentPhoto = lightboxIndex !== null ? photos[lightboxIndex] : null
  const currentUrl = currentPhoto?.url || null

  return (
    <>
      <div className="bg-[#FFFFFF] rounded-lg p-4 border border-[#EBEBEB]">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-[#1A1A1A] uppercase tracking-wider">
              Situatiefoto's
              {photos.length > 0 && <span className="font-mono text-[#9B9B95] ml-1.5">{photos.length}</span>}
            </h3>
            <div className="flex items-center gap-1.5">
              {photos.length > 0 && (
                <>
                  <button
                    className="text-[12px] font-medium text-[#1A535C] hover:underline"
                    onClick={() => setLightboxIndex(0)}
                  >
                    Bekijken
                  </button>
                  <span className="text-[#EBEBEB]">·</span>
                  <button
                    className="text-[12px] font-medium text-[#1A535C] hover:underline disabled:opacity-40"
                    onClick={handleBulkDownload}
                    disabled={isDownloading}
                  >
                    {isDownloading ? 'Downloaden...' : 'Download'}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Photo Grid */}
          {photos.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-3">
              {photos.map((photo, index) => (
                <button
                  key={photo.id}
                  onClick={() => setLightboxIndex(index)}
                  className="group relative aspect-square rounded-lg overflow-hidden bg-muted border border-border/40 hover:border-primary/30 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  {photo.url ? (
                    <img
                      src={photo.url}
                      alt={photo.omschrijving}
                      className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Camera className="h-5 w-5 text-muted-foreground/30" />
                    </div>
                  )}
                  {/* Overlay on hover */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-150" />
                  {/* Delete button on hover */}
                  <div
                    role="button"
                    tabIndex={-1}
                    onClick={(e) => handleDelete(photo, e)}
                    className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/60 hover:bg-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 cursor-pointer"
                  >
                    <X className="h-3 w-3 text-white" />
                  </div>
                  {/* Note indicator */}
                  {photo.omschrijving && (
                    <div className="absolute bottom-1 left-1">
                      <div className="h-4 w-4 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
                        <MessageSquare className="h-2.5 w-2.5 text-white" />
                      </div>
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Upload Area */}
          <div className="flex gap-2">
            {/* File picker */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border border-dashed transition-colors text-xs',
                isUploading
                  ? 'border-border/40 text-muted-foreground/40 cursor-wait'
                  : 'border-border/60 text-muted-foreground hover:border-primary/30 hover:text-primary hover:bg-primary/5 cursor-pointer'
              )}
            >
              <Upload className="h-4 w-4" />
              {isUploading ? 'Uploaden...' : "Foto's toevoegen"}
            </button>

            {/* Camera button (mobile) */}
            <button
              onClick={() => cameraInputRef.current?.click()}
              disabled={isUploading}
              className={cn(
                'flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-dashed transition-colors text-xs sm:hidden',
                isUploading
                  ? 'border-border/40 text-muted-foreground/40 cursor-wait'
                  : 'border-border/60 text-muted-foreground hover:border-primary/30 hover:text-primary hover:bg-primary/5 cursor-pointer'
              )}
            >
              <Camera className="h-4 w-4" />
              Camera
            </button>
          </div>

          {/* Hidden inputs */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) handleUpload(e.target.files)
              e.target.value = ''
            }}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              if (e.target.files) handleUpload(e.target.files)
              e.target.value = ''
            }}
          />
      </div>

      {/* ── Lightbox ── */}
      {lightboxIndex !== null && currentPhoto && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex flex-col"
          onClick={(e) => {
            if (e.target === e.currentTarget) setLightboxIndex(null)
          }}
        >
          {/* Top bar */}
          <div className="flex items-center justify-between px-4 py-3 bg-black/40">
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-white/60 text-sm font-mono font-medium">
                {lightboxIndex + 1} / {photos.length}
              </span>
              <span className="text-white/40 text-sm truncate">{currentPhoto.omschrijving}</span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-white/60 hover:text-white hover:bg-white/10"
                onClick={() => {
                  if (currentPhoto.url) {
                    const a = document.createElement('a')
                    a.href = currentPhoto.url
                    a.download = currentPhoto.omschrijving || 'foto'
                    a.click()
                  }
                }}
              >
                <Download className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-red-400/60 hover:text-red-400 hover:bg-red-400/10"
                onClick={() => handleDelete(currentPhoto)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-white/60 hover:text-white hover:bg-white/10"
                onClick={() => setLightboxIndex(null)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Image area */}
          <div className="flex-1 flex items-center justify-center relative px-12 py-4 min-h-0">
            {/* Prev */}
            {lightboxIndex > 0 && (
              <button
                onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex - 1) }}
                className="absolute left-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors z-10"
              >
                <ChevronLeft className="h-6 w-6 text-white" />
              </button>
            )}

            {/* Image */}
            {currentUrl ? (
              <img
                src={currentUrl}
                alt={currentPhoto.omschrijving}
                className="max-w-full max-h-full object-contain rounded-lg select-none"
                draggable={false}
              />
            ) : (
              <div className="text-white/30 text-sm">Laden...</div>
            )}

            {/* Next */}
            {lightboxIndex < photos.length - 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex + 1) }}
                className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors z-10"
              >
                <ChevronRight className="h-6 w-6 text-white" />
              </button>
            )}
          </div>

          {/* Description bar */}
          {currentPhoto.omschrijving && (
            <div className="px-4 pb-4">
              <div className="max-w-xl mx-auto flex items-start gap-2 bg-white/5 rounded-lg px-3 py-2">
                <MessageSquare className="h-3.5 w-3.5 text-white/40 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-white/70 flex-1">{currentPhoto.omschrijving}</p>
              </div>
            </div>
          )}

          {/* Thumbnail strip */}
          {photos.length > 1 && (
            <div className="px-4 pb-4">
              <div className="flex justify-center gap-1.5 overflow-x-auto py-1">
                {photos.map((photo, i) => (
                  <button
                    key={photo.id}
                    onClick={(e) => { e.stopPropagation(); setLightboxIndex(i) }}
                    className={cn(
                      'flex-shrink-0 w-12 h-12 rounded-md overflow-hidden border-2 transition-all duration-150',
                      i === lightboxIndex
                        ? 'border-white ring-1 ring-white/20'
                        : 'border-transparent opacity-50 hover:opacity-80'
                    )}
                  >
                    {photo.url ? (
                      <img
                        src={photo.url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-white/10" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  )
}
