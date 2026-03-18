import { useState } from 'react'
import {
  Plus,
  FileText,
  FileSpreadsheet,
  FileArchive,
  FileImage,
  File,
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils'

function getFileIcon(type: string) {
  const size = 'h-4 w-4'
  if (type.includes('pdf')) return <FileText className={`${size} text-red-500`} />
  if (type.includes('spreadsheet') || type.includes('xlsx') || type.includes('csv'))
    return <FileSpreadsheet className={`${size} text-green-600`} />
  if (type.includes('zip') || type.includes('archive'))
    return <FileArchive className={`${size} text-yellow-600`} />
  if (type.includes('image') || type.includes('jpeg') || type.includes('png'))
    return <FileImage className={`${size} text-primary`} />
  return <File className={`${size} text-muted-foreground/60`} />
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

interface BestandenSectionProps {
  documenten: { id: string; naam: string; type: string; grootte: number; created_at: string }[]
  onUpload: () => void
  onDelete: (id: string, naam: string) => void
}

export function BestandenSection({ documenten, onUpload, onDelete }: BestandenSectionProps) {
  const [showAll, setShowAll] = useState(false)
  const displayDocs = showAll ? documenten : documenten.slice(0, 5)

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[13px] font-medium text-foreground">
          Bestanden
          {documenten.length > 0 && (
            <span className="text-muted-foreground font-normal ml-1.5">{documenten.length}</span>
          )}
        </h3>
        <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={onUpload}>
          <Plus className="h-3 w-3 mr-1" />
          Upload
        </Button>
      </div>

      {documenten.length === 0 ? (
        <div className="text-center py-4 border border-dashed border-border rounded-lg">
          <p className="text-xs text-muted-foreground mb-2">Nog geen bestanden</p>
          <Button variant="outline" size="sm" className="h-6 px-2 text-xs" onClick={onUpload}>
            <Plus className="h-3 w-3 mr-1" />
            Upload
          </Button>
        </div>
      ) : (
        <div className="space-y-1">
          {displayDocs.map((doc) => (
            <div
              key={doc.id}
              className="group flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/50 transition-colors"
            >
              <div className="flex-shrink-0">{getFileIcon(doc.type)}</div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-foreground truncate">{doc.naam}</p>
                <p className="text-[10px] text-muted-foreground">
                  {formatFileSize(doc.grootte)} · {formatDate(doc.created_at)}
                </p>
              </div>
              <button
                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                onClick={() => onDelete(doc.id, doc.naam)}
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
          {documenten.length > 5 && !showAll && (
            <button
              onClick={() => setShowAll(true)}
              className="text-xs text-primary hover:text-primary/80 mt-1 transition-colors px-2"
            >
              Alle bestanden bekijken →
            </button>
          )}
        </div>
      )}
    </div>
  )
}
