import React, { useState, useRef, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Upload, X, FileText, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createDocument } from '@/services/supabaseService'
import { uploadFile } from '@/services/storageService'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'
import { logger } from '../../utils/logger'

interface DocumentUploadProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const folderOptions = [
  'Ontwerpen',
  'Technisch',
  'Offertes',
  'Contracten',
  'Branding',
  'Planning',
  "Foto's",
]

export function DocumentUpload({ open, onOpenChange }: DocumentUploadProps) {
  const { user } = useAuth()
  const [files, setFiles] = useState<File[]>([])
  const [folder, setFolder] = useState('Ontwerpen')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const droppedFiles = Array.from(e.dataTransfer.files)
    setFiles((prev) => [...prev, ...droppedFiles])
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files)
      setFiles((prev) => [...prev, ...selectedFiles])
    }
  }, [])

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const addTag = () => {
    const trimmed = tagInput.trim()
    if (trimmed && !tags.includes(trimmed)) {
      setTags((prev) => [...prev, trimmed])
      setTagInput('')
    }
  }

  const removeTag = (tag: string) => {
    setTags((prev) => prev.filter((t) => t !== tag))
  }

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTag()
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  const handleUpload = async () => {
    if (files.length === 0) return
    setIsUploading(true)

    try {
      for (const file of files) {
        const storagePath = `/${folder.toLowerCase()}/${Date.now()}_${file.name}`

        await uploadFile(file, storagePath)

        await createDocument({
          user_id: user?.id || '',
          project_id: null,
          klant_id: null,
          naam: file.name,
          type: file.type || 'application/octet-stream',
          grootte: file.size,
          map: folder,
          storage_path: storagePath,
          status: 'concept',
          tags: tags,
          gedeeld_met: [],
        })
      }

      toast.success(`${files.length} bestand${files.length > 1 ? 'en' : ''} geüpload`)
      setFiles([])
      setTags([])
      setTagInput('')
      onOpenChange(false)
    } catch (error) {
      logger.error('Upload fout:', error)
      toast.error('Uploaden mislukt. Probeer het opnieuw.')
    } finally {
      setIsUploading(false)
    }
  }

  const resetAndClose = () => {
    setFiles([])
    setTags([])
    setTagInput('')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={resetAndClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Documenten uploaden</DialogTitle>
          <DialogDescription>
            Sleep bestanden naar het upload veld of klik om te selecteren.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Drop zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
              isDragging
                ? 'border-blue-400 bg-blue-50 dark:bg-blue-950/20'
                : 'border-gray-300 hover:border-gray-400 dark:border-gray-700 dark:hover:border-gray-600'
            )}
          >
            <Upload className={cn(
              'w-8 h-8 mx-auto mb-3',
              isDragging ? 'text-blue-500' : 'text-gray-400'
            )} />
            <p className="text-sm text-muted-foreground">
              Sleep bestanden hierheen of <span className="text-blue-600 font-medium">klik om te selecteren</span>
            </p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>

          {/* Selected files */}
          {files.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Geselecteerde bestanden</Label>
              <div className="space-y-1.5 max-h-32 overflow-y-auto">
                {files.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between px-3 py-2 bg-muted rounded-md"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-sm truncate">{file.name}</span>
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        ({formatFileSize(file.size)})
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-6 h-6 flex-shrink-0"
                      onClick={(e) => {
                        e.stopPropagation()
                        removeFile(index)
                      }}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Folder picker */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Map</Label>
            <Select value={folder} onValueChange={setFolder}>
              <SelectTrigger>
                <SelectValue placeholder="Selecteer map" />
              </SelectTrigger>
              <SelectContent>
                {folderOptions.map((f) => (
                  <SelectItem key={f} value={f}>
                    {f}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tags input */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Tags</Label>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                placeholder="Voeg tag toe..."
                className="flex-1"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={addTag}
                disabled={!tagInput.trim()}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    {tag}
                    <button onClick={() => removeTag(tag)} className="ml-0.5 hover:text-destructive">
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={resetAndClose}>
            Annuleren
          </Button>
          <Button
            onClick={handleUpload}
            disabled={files.length === 0 || isUploading}
          >
            {isUploading ? 'Uploaden...' : `Upload ${files.length > 0 ? `(${files.length})` : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
