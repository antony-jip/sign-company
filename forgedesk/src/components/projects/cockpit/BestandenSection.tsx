import { useState } from 'react'
import {
  Plus,
  FileText,
  FileSpreadsheet,
  FileArchive,
  FileImage,
  File,
  Trash2,
  Upload,
} from 'lucide-react'

function getFileIcon(type: string) {
  const size = 'h-4 w-4'
  if (type.includes('pdf')) return <FileText className={`${size} text-[#C0451A]`} />
  if (type.includes('spreadsheet') || type.includes('xlsx') || type.includes('csv'))
    return <FileSpreadsheet className={`${size} text-sage-deep`} />
  if (type.includes('zip') || type.includes('archive'))
    return <FileArchive className={`${size} text-cream-deep`} />
  if (type.includes('image') || type.includes('jpeg') || type.includes('png'))
    return <FileImage className={`${size} text-lavender-deep`} />
  if (type.includes('illustrator') || type.includes('acad'))
    return <File className={`${size} text-peach-deep`} />
  return <File className={`${size} text-muted-foreground/50`} />
}

function getFileIconBg(type: string): string {
  if (type.includes('pdf')) return 'bg-[var(--color-coral-bg)]'
  if (type.includes('spreadsheet') || type.includes('xlsx') || type.includes('csv')) return 'bg-[var(--color-sage-bg)]'
  if (type.includes('zip') || type.includes('archive')) return 'bg-[var(--color-cream-bg)]'
  if (type.includes('image') || type.includes('jpeg') || type.includes('png')) return 'bg-[var(--color-lavender-bg)]'
  if (type.includes('illustrator') || type.includes('acad')) return 'bg-peach/30'
  return 'bg-muted'
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
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
        <h3 className="text-[13px] font-semibold text-foreground flex items-center gap-2">
          Bestanden
          {documenten.length > 0 && (
            <span className="text-[10px] text-muted-foreground/50 font-mono font-normal">{documenten.length}</span>
          )}
        </h3>
        <button
          onClick={onUpload}
          className="text-[11px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
        >
          <Plus className="h-3 w-3" />
          Upload
        </button>
      </div>

      {documenten.length === 0 ? (
        <div className="text-center py-6 border border-dashed border-[hsl(35,15%,87%)] rounded-lg">
          <div className="h-10 w-10 rounded-xl bg-mist/30 flex items-center justify-center mx-auto mb-2">
            <Upload className="h-5 w-5 text-mist-deep" />
          </div>
          <p className="text-[11px] text-muted-foreground mb-2">Nog geen bestanden</p>
          <button
            onClick={onUpload}
            className="text-[11px] text-foreground font-medium hover:text-foreground/80 transition-colors"
          >
            + Upload
          </button>
        </div>
      ) : (
        <div className="space-y-0.5">
          {displayDocs.map((doc) => (
            <div
              key={doc.id}
              className="group flex items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-[hsl(35,15%,97%)] transition-colors"
            >
              <div className={`h-8 w-8 rounded-lg ${getFileIconBg(doc.type)} flex items-center justify-center flex-shrink-0`}>
                {getFileIcon(doc.type)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-medium text-foreground truncate">{doc.naam}</p>
                <p className="text-[10px] text-muted-foreground/50">
                  {formatFileSize(doc.grootte)} · {formatDate(doc.created_at)}
                </p>
              </div>
              <button
                className="opacity-0 group-hover:opacity-100 text-muted-foreground/40 hover:text-destructive transition-all p-1 rounded"
                onClick={() => onDelete(doc.id, doc.naam)}
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
          {documenten.length > 5 && !showAll && (
            <button
              onClick={() => setShowAll(true)}
              className="w-full text-[11px] text-muted-foreground hover:text-foreground mt-1 py-2 rounded-lg hover:bg-[hsl(35,15%,96%)] transition-colors"
            >
              Alle {documenten.length} bestanden tonen
            </button>
          )}
        </div>
      )}
    </div>
  )
}
