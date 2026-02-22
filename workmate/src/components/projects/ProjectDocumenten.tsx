import React, { useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  Plus,
  Upload,
  FileText,
  FileSpreadsheet,
  FileArchive,
  FileImage,
  File,
  Send,
  Trash2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { getStatusColor } from '@/lib/utils'
import { createDocument, deleteDocument } from '@/services/supabaseService'
import { useAuth } from '@/contexts/AuthContext'
import type { Document, Project } from '@/types'
import { logger } from '@/utils/logger'

interface ProjectDocumentenProps {
  projectId: string
  project: Project
  documenten: Document[]
  onDocumentenChanged: () => Promise<void>
  onVerstuurClick: () => void
}

function getFileIcon(type: string, size: string = 'h-8 w-8') {
  if (type.includes('pdf')) return <FileText className={`${size} text-red-500`} />
  if (type.includes('spreadsheet') || type.includes('xlsx') || type.includes('csv'))
    return <FileSpreadsheet className={`${size} text-green-600`} />
  if (type.includes('zip') || type.includes('archive'))
    return <FileArchive className={`${size} text-yellow-600`} />
  if (type.includes('image') || type.includes('jpeg') || type.includes('png'))
    return <FileImage className={`${size} text-primary`} />
  if (type.includes('illustrator') || type.includes('acad'))
    return <File className={`${size} text-orange-500`} />
  return <File className={`${size} text-gray-400`} />
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

export function ProjectDocumenten({
  projectId,
  project,
  documenten,
  onDocumentenChanged,
  onVerstuurClick,
}: ProjectDocumentenProps) {
  const { user } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<Document | null>(null)

  const handleFileUpload = async (files: FileList | File[]) => {
    const fileArray = Array.from(files)
    if (fileArray.length === 0) return

    for (const file of fileArray) {
      try {
        await createDocument({
          user_id: user?.id || '',
          project_id: projectId,
          klant_id: project.klant_id || null,
          naam: file.name,
          type: file.type || 'application/octet-stream',
          grootte: file.size,
          map: 'Tekeningen',
          storage_path: `projects/${projectId}/${file.name}`,
          status: 'concept',
          tags: ['tekening'],
          gedeeld_met: [],
        })
      } catch (err) {
        logger.error(`Fout bij uploaden ${file.name}:`, err)
        toast.error(`Kon "${file.name}" niet uploaden`)
      }
    }
    toast.success(`${fileArray.length} bestand${fileArray.length > 1 ? 'en' : ''} geüpload`)
    await onDocumentenChanged()
  }

  const handleDelete = async () => {
    if (!deleteConfirm) return
    try {
      await deleteDocument(deleteConfirm.id)
      toast.success(`"${deleteConfirm.naam}" verwijderd`)
      setDeleteConfirm(null)
      await onDocumentenChanged()
    } catch (err) {
      logger.error('Fout bij verwijderen:', err)
      toast.error('Kon bestand niet verwijderen')
    }
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) {
            handleFileUpload(e.target.files)
            e.target.value = ''
          }
        }}
      />

      <Card className="border-gray-200/80 dark:border-gray-700/80">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-accent to-primary flex items-center justify-center">
                <FileText className="h-3.5 w-3.5 text-white" />
              </div>
              Bestanden
              <span className="text-xs text-muted-foreground font-normal">{documenten.length}</span>
            </CardTitle>
            <div className="flex items-center gap-1">
              {documenten.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={onVerstuurClick}
                  title="Verstuur naar klant"
                >
                  <Send className="h-3.5 w-3.5 mr-1" />
                  Verstuur
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => fileInputRef.current?.click()}
                title="Bestand uploaden"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Drag & drop zone */}
          <div
            className={`border-2 border-dashed rounded-xl p-4 text-center transition-all duration-200 cursor-pointer ${
              isDragging
                ? 'border-primary bg-primary/10 dark:bg-primary/20'
                : 'border-gray-300 dark:border-gray-700 hover:border-primary'
            }`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault()
              setIsDragging(true)
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault()
              setIsDragging(false)
              const files = Array.from(e.dataTransfer.files)
              if (files.length > 0) handleFileUpload(files)
            }}
          >
            <div className="flex flex-col items-center gap-2">
              <Upload className={`h-5 w-5 transition-colors ${
                isDragging ? 'text-accent dark:text-primary' : 'text-muted-foreground opacity-60'
              }`} />
              <p className={`text-xs font-medium ${isDragging ? 'text-accent dark:text-primary' : 'text-muted-foreground'}`}>
                {isDragging ? 'Laat los om te uploaden' : 'Sleep bestanden of klik om te uploaden'}
              </p>
            </div>
          </div>

          {/* Bestandenlijst */}
          {documenten.length > 0 && (
            <div className="space-y-2">
              {documenten.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center gap-2.5 bg-gray-50 dark:bg-gray-800/50 rounded-lg px-3 py-2 group hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                >
                  <div className="flex-shrink-0 group-hover:scale-110 transition-transform duration-200">
                    {getFileIcon(doc.type)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate group-hover:text-accent dark:group-hover:text-primary transition-colors">
                      {doc.naam}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground">{formatFileSize(doc.grootte)}</span>
                      <Badge className={`${getStatusColor(doc.status)} text-[9px] px-1 py-0`}>
                        {doc.status}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-600"
                    onClick={(e) => {
                      e.stopPropagation()
                      setDeleteConfirm(doc)
                    }}
                    title="Verwijderen"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bevestigingsdialog voor verwijderen */}
      <Dialog open={!!deleteConfirm} onOpenChange={(open) => { if (!open) setDeleteConfirm(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-red-500" />
              Bestand verwijderen
            </DialogTitle>
            <DialogDescription>
              Weet je zeker dat je "{deleteConfirm?.naam}" wilt verwijderen? Dit kan niet ongedaan worden gemaakt.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Annuleren</Button>
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="h-4 w-4 mr-1.5" />
              Verwijderen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export { getFileIcon, formatFileSize }
