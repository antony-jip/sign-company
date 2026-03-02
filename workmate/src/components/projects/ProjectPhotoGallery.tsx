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
  Check,
  Pencil,
  Eye,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { createDocument, updateDocument, deleteDocument as deleteDocRecord } from '@/services/supabaseService'
import { uploadFile, downloadFile, deleteFile } from '@/services/storageService'
import { toast } from 'sonner'
import { logger } from '../../utils/logger'
import { buildZip } from '../../utils/zipBuilder'
import type { Document } from '@/types'

interface ProjectPhotoGalleryProps {
  projectId: string
  klantId: string | null
  userId: string
  photos: Document[]
  onPhotosChanged: () => void
}

export function ProjectPhotoGallery({
  projectId,
  klantId,
  userId,
  photos,
  onPhotosChanged,
}: ProjectPhotoGalleryProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({})
  const [editingNote, setEditingNote] = useState<string | null>(null)
  const [noteText, setNoteText] = useState('')
  const [isDownloading, setIsDownloading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  // Load photo URLs
  useEffect(() => {
    let cancelled = false
    async function loadUrls() {
      const urls: Record<string, string> = {}
      for (const photo of photos) {
        try {
          const url = await downloadFile(photo.storage_path)
          if (!cancelled) urls[photo.id] = url
        } catch {
          // skip failed loads
        }
      }
      if (!cancelled) setPhotoUrls(urls)
    }
    if (photos.length > 0) loadUrls()
    return () => { cancelled = true }
  }, [photos])

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
        const storagePath = `projects/${projectId}/fotos/${Date.now()}_${file.name}`
        await uploadFile(file, storagePath)
        await createDocument({
          user_id: userId,
          project_id: projectId,
          klant_id: klantId,
          naam: file.name,
          type: file.type,
          grootte: file.size,
          map: "Situatiefoto's",
          storage_path: storagePath,
          status: 'definitief',
          tags: ['foto', 'situatie'],
          gedeeld_met: [],
          beschrijving: '',
        })
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
  }, [projectId, klantId, userId, onPhotosChanged])

  const handleDelete = async (photo: Document, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    try {
      // Delete from storage first, but don't let it block document deletion
      try {
        await deleteFile(photo.storage_path)
      } catch {
        // Storage delete may fail if file doesn't exist - continue anyway
      }
      await deleteDocRecord(photo.id)
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

  const handleSaveNote = async (photo: Document) => {
    try {
      await updateDocument(photo.id, { beschrijving: noteText })
      toast.success('Notitie opgeslagen')
      setEditingNote(null)
      onPhotosChanged()
    } catch (err) {
      logger.error('Fout bij opslaan notitie:', err)
      toast.error('Kon notitie niet opslaan')
    }
  }

  const handleBulkDownload = async () => {
    if (photos.length === 0) return
    setIsDownloading(true)

    try {
      const entries: { name: string; data: Uint8Array }[] = []
      let loaded = 0

      for (const photo of photos) {
        const url = photoUrls[photo.id]
        if (!url) continue
        try {
          const resp = await fetch(url)
          const arrayBuf = await resp.arrayBuffer()
          entries.push({ name: photo.naam, data: new Uint8Array(arrayBuf) })
          loaded++
          toast.loading(`Foto's ophalen... ${loaded}/${photos.length}`, { id: 'bulk-download' })
        } catch {
          logger.error(`Kon ${photo.naam} niet ophalen`)
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
    } catch {
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
  const currentUrl = currentPhoto ? photoUrls[currentPhoto.id] : null

  return (
    <>
      <Card className="border-border/60">
        <CardContent className="p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                <Camera className="h-3.5 w-3.5 text-white" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">Situatiefoto's</h3>
              {photos.length > 0 && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  {photos.length}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              {photos.length > 0 && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-muted-foreground"
                    onClick={() => setLightboxIndex(0)}
                  >
                    <Eye className="h-3.5 w-3.5 mr-1" />
                    Bekijk alles
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-muted-foreground"
                    onClick={handleBulkDownload}
                    disabled={isDownloading}
                  >
                    <Download className="h-3.5 w-3.5 mr-1" />
                    {isDownloading ? 'Downloaden...' : 'Download alles'}
                  </Button>
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
                  {photoUrls[photo.id] ? (
                    <img
                      src={photoUrls[photo.id]}
                      alt={photo.naam}
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
                  {photo.beschrijving && (
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
        </CardContent>
      </Card>

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
              <span className="text-white/60 text-sm font-medium">
                {lightboxIndex + 1} / {photos.length}
              </span>
              <span className="text-white/40 text-sm truncate">{currentPhoto.naam}</span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-white/60 hover:text-white hover:bg-white/10"
                onClick={() => {
                  setEditingNote(currentPhoto.id)
                  setNoteText(currentPhoto.beschrijving || '')
                }}
              >
                <MessageSquare className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Notitie</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-white/60 hover:text-white hover:bg-white/10"
                onClick={() => {
                  if (currentUrl) {
                    const a = document.createElement('a')
                    a.href = currentUrl
                    a.download = currentPhoto.naam
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
                alt={currentPhoto.naam}
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

          {/* Note display/edit bar */}
          <div className="px-4 pb-4">
            {editingNote === currentPhoto.id ? (
              <div className="max-w-xl mx-auto flex gap-2">
                <Textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Voeg een notitie toe... (bijv. 'Voorgevel, kabelgoot loopt links')"
                  className="bg-white/10 border-white/10 text-white placeholder:text-white/30 text-sm resize-none h-16"
                  autoFocus
                />
                <div className="flex flex-col gap-1">
                  <Button
                    size="sm"
                    className="h-7 px-2 bg-white/10 hover:bg-white/20 text-white"
                    onClick={() => handleSaveNote(currentPhoto)}
                  >
                    <Check className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-white/40 hover:text-white hover:bg-white/10"
                    onClick={() => setEditingNote(null)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ) : currentPhoto.beschrijving ? (
              <button
                onClick={() => {
                  setEditingNote(currentPhoto.id)
                  setNoteText(currentPhoto.beschrijving || '')
                }}
                className="max-w-xl mx-auto flex items-start gap-2 text-left bg-white/5 rounded-lg px-3 py-2 hover:bg-white/10 transition-colors w-full group"
              >
                <MessageSquare className="h-3.5 w-3.5 text-white/40 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-white/70 flex-1">{currentPhoto.beschrijving}</p>
                <Pencil className="h-3 w-3 text-white/20 group-hover:text-white/40 mt-0.5 flex-shrink-0" />
              </button>
            ) : null}
          </div>

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
                    {photoUrls[photo.id] ? (
                      <img
                        src={photoUrls[photo.id]}
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
