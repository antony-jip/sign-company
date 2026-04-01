import { useState, useCallback } from 'react'
import {
  Plus,
  FileText,
  FileSpreadsheet,
  FileArchive,
  FileImage,
  File,
  Trash2,
  Upload,
  Eye,
} from 'lucide-react'
import { getSignedUrl } from '@/services/storageService'
import { PdfPreviewDialog } from '@/components/shared/PdfPreviewDialog'

function getFileIcon(type: string) {
  const size = 'h-4 w-4'
  if (type.includes('pdf')) return <FileText className={`${size} text-mod-werkbonnen-text`} />
  if (type.includes('spreadsheet') || type.includes('xlsx') || type.includes('csv'))
    return <FileSpreadsheet className={`${size} text-mod-projecten-text`} />
  if (type.includes('zip') || type.includes('archive'))
    return <FileArchive className={`${size} text-mod-taken-text`} />
  if (type.includes('image') || type.includes('jpeg') || type.includes('png'))
    return <FileImage className={`${size} text-mod-email-text`} />
  if (type.includes('illustrator') || type.includes('acad'))
    return <File className={`${size} text-mod-planning-text`} />
  return <File className={`${size} text-muted-foreground/50`} />
}

function getFileIconBg(type: string): string {
  if (type.includes('pdf')) return 'bg-mod-werkbonnen-light'
  if (type.includes('spreadsheet') || type.includes('xlsx') || type.includes('csv')) return 'bg-mod-projecten-light'
  if (type.includes('zip') || type.includes('archive')) return 'bg-mod-taken-light'
  if (type.includes('image') || type.includes('jpeg') || type.includes('png')) return 'bg-mod-email-light'
  if (type.includes('illustrator') || type.includes('acad')) return 'bg-mod-planning-light'
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
  documenten: { id: string; naam: string; type: string; grootte: number; created_at: string; storage_path: string }[]
  onUpload: () => void
  onDelete: (id: string, naam: string) => void
}

function isPdf(type: string, naam: string): boolean {
  return type.includes('pdf') || naam.toLowerCase().endsWith('.pdf')
}

export function BestandenSection({ documenten, onUpload, onDelete }: BestandenSectionProps) {
  const [showAll, setShowAll] = useState(false)
  const [pdfPreview, setPdfPreview] = useState<{ naam: string; storagePath: string } | null>(null)
  const displayDocs = showAll ? documenten : documenten.slice(0, 5)

  const handleFileClick = async (doc: BestandenSectionProps['documenten'][0]) => {
    if (isPdf(doc.type, doc.naam)) {
      setPdfPreview({ naam: doc.naam, storagePath: doc.storage_path })
    } else {
      const url = await getSignedUrl(doc.storage_path)
      if (url) window.open(url, '_blank')
    }
  }

  const generatePdf = useCallback(async () => {
    if (!pdfPreview) throw new Error('Geen bestand geselecteerd')
    const url = await getSignedUrl(pdfPreview.storagePath)
    if (!url) throw new Error('Kon signed URL niet ophalen')
    const response = await fetch(url)
    if (!response.ok) throw new Error('Kon PDF niet laden')
    return await response.blob()
  }, [pdfPreview])

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-[#1A1A1A] uppercase tracking-wider">Bestanden</h3>
        <button
          onClick={onUpload}
          className="text-[12px] text-[#1A535C] hover:underline transition-colors"
        >
          + Upload
        </button>
      </div>

      {documenten.length === 0 ? (
        <div className="py-6 text-center">
          <p className="text-sm text-[#9B9B95]">Nog geen bestanden</p>
          <button
            onClick={onUpload}
            className="text-sm text-[#1A535C] hover:underline mt-1"
          >
            Bestand uploaden
          </button>
        </div>
      ) : (
        <div className="space-y-0.5">
          {displayDocs.map((doc) => (
            <div
              key={doc.id}
              className="group flex items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-[hsl(35,15%,97%)] transition-colors cursor-pointer"
              onClick={() => handleFileClick(doc)}
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
              <Eye className="h-3 w-3 opacity-0 group-hover:opacity-100 text-muted-foreground/40 transition-all flex-shrink-0" />
              <button
                className="opacity-0 group-hover:opacity-100 text-muted-foreground/40 hover:text-destructive transition-all p-1 rounded"
                onClick={(e) => { e.stopPropagation(); onDelete(doc.id, doc.naam) }}
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

      <PdfPreviewDialog
        open={!!pdfPreview}
        onOpenChange={(open) => { if (!open) setPdfPreview(null) }}
        title={pdfPreview?.naam ?? ''}
        generatePdf={generatePdf}
      />
    </div>
  )
}
