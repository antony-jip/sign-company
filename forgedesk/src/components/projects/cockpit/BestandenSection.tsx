import { useState, useCallback, lazy } from 'react'
import {
  Trash2, Eye, FileText, FileSpreadsheet, FileArchive,
  Image as ImageIcon, File, Files, Upload,
  type LucideIcon,
} from 'lucide-react'
import { getSignedUrl } from '@/services/storageService'
import type { PillTone } from '@/utils/statusColors'
const PdfPreviewDialog = lazy(() => import('@/components/shared/PdfPreviewDialog').then(m => ({ default: m.PdfPreviewDialog })))

function getFileExtension(naam: string, type: string): string {
  const dot = naam.lastIndexOf('.')
  if (dot >= 0 && dot < naam.length - 1) return naam.slice(dot + 1).toUpperCase()
  if (type.includes('pdf')) return 'PDF'
  if (type.includes('spreadsheet')) return 'XLS'
  if (type.includes('zip') || type.includes('archive')) return 'ZIP'
  if (type.includes('image')) return 'IMG'
  return 'FILE'
}

function getFileTypeBadge(ext: string): { label: string; tone: PillTone } {
  const e = ext.toUpperCase()
  if (e === 'PDF') return { label: 'PDF', tone: 'coral' }
  if (e === 'JPG' || e === 'JPEG' || e === 'PNG' || e === 'GIF' || e === 'WEBP') return { label: e, tone: 'sage' }
  if (e === 'DWG' || e === 'DXF') return { label: e, tone: 'mist' }
  if (e === 'XLS' || e === 'XLSX' || e === 'CSV') return { label: e, tone: 'cream' }
  if (e === 'DOC' || e === 'DOCX' || e === 'TXT' || e === 'RTF') return { label: e, tone: 'lavender' }
  return { label: e, tone: 'cream' }
}

const toneStyles: Record<PillTone, { bg: string; color: string }> = {
  blush:    { bg: 'var(--blush-bg)',    color: 'var(--blush-text)' },
  sage:     { bg: 'var(--sage-bg)',     color: 'var(--sage-text)' },
  mist:     { bg: 'var(--mist-bg)',     color: 'var(--mist-text)' },
  cream:    { bg: 'var(--cream-bg)',    color: 'var(--cream-text)' },
  coral:    { bg: 'var(--coral-bg)',    color: 'var(--coral-text)' },
  lavender: { bg: 'var(--lavender-bg)', color: 'var(--lavender-text)' },
}

function getFileGlyph(ext: string): LucideIcon {
  const e = ext.toUpperCase()
  if (e === 'PDF') return FileText
  if (['JPG', 'JPEG', 'PNG', 'GIF', 'WEBP'].includes(e)) return ImageIcon
  if (['XLS', 'XLSX', 'CSV'].includes(e)) return FileSpreadsheet
  if (['ZIP', 'RAR', '7Z'].includes(e)) return FileArchive
  if (['DOC', 'DOCX', 'TXT', 'RTF', 'DWG', 'DXF'].includes(e)) return FileText
  return File
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
    <div className="doen-slate-surface rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Files className="h-4 w-4" strokeWidth={1.75} style={{ color: '#1A535C' }} />
          <h3 className="font-heading text-[15px] font-bold text-foreground">
            Bestanden
          </h3>
          {documenten.length > 0 && (
            <span className="font-mono text-[10px] font-semibold bg-[rgba(26,83,92,0.08)] text-[#1A535C] rounded-full px-1.5 py-0.5 min-w-[18px] text-center tabular-nums">
              {documenten.length}
            </span>
          )}
        </div>
        <button
          onClick={onUpload}
          className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#1A535C] hover:text-[#0F3D44] hover:underline transition-colors"
        >
          <Upload className="h-3 w-3" strokeWidth={2.25} />
          Upload
        </button>
      </div>

      {documenten.length === 0 ? (
        <button
          onClick={onUpload}
          className="w-full rounded-xl border border-dashed border-[rgba(26,83,92,0.2)] bg-transparent hover:bg-white/40 hover:border-[rgba(26,83,92,0.32)] transition-all px-4 py-7 flex flex-col items-center gap-2.5 text-center group"
        >
          <Upload className="h-6 w-6 transition-transform group-hover:scale-110 group-hover:-translate-y-0.5" strokeWidth={1.5} style={{ color: 'rgba(26,83,92,0.5)' }} />
          <div>
            <p className="text-[13px] font-semibold text-foreground">Eerste bestand uploaden</p>
            <p
              className="text-[12px] text-muted-foreground mt-0.5"
              style={{ fontFamily: '"Instrument Serif", serif', fontStyle: 'italic' }}
            >
              sleep of klik om te kiezen
            </p>
          </div>
        </button>
      ) : (
        <div className="-mx-2">
          {displayDocs.map((doc) => {
            const ext = getFileExtension(doc.naam, doc.type)
            const badge = getFileTypeBadge(ext)
            const badgeStyle = toneStyles[badge.tone]
            const Glyph = getFileGlyph(ext)
            return (
              <div
                key={doc.id}
                className="group flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-white/60 transition-colors cursor-pointer"
                onClick={() => handleFileClick(doc)}
              >
                <div className="relative h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-white border border-[rgba(26,83,92,0.08)]">
                  <Glyph size={18} weight="duotone" color="#1A535C" />
                  <span
                    className="absolute -bottom-[3px] -right-[3px] font-mono text-[9px] font-semibold uppercase rounded-md px-1 py-px leading-none tracking-tight"
                    style={{ background: badgeStyle.bg, color: badgeStyle.color }}
                  >
                    {badge.label}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-foreground truncate">{doc.naam}</p>
                  <p className="font-mono text-[11px] text-muted-foreground">
                    {formatFileSize(doc.grootte)} · {formatDate(doc.created_at)}
                  </p>
                </div>
                <Eye className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 text-muted-foreground transition-all flex-shrink-0" />
                <button
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-[#C03A18] transition-all p-1 rounded"
                  onClick={(e) => { e.stopPropagation(); onDelete(doc.id, doc.naam) }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            )
          })}
          {documenten.length > 5 && !showAll && (
            <button
              onClick={() => setShowAll(true)}
              className="w-full text-[12px] font-medium text-[#1A535C] hover:text-[#0F3D44] mt-2 py-2 rounded-lg hover:bg-white/60 transition-colors"
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
