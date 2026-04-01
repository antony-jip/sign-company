import { useState, useEffect, useCallback } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Download, Loader2, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, ExternalLink } from 'lucide-react'

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

interface PdfPreviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  generatePdf: () => Promise<Blob>
}

export function PdfPreviewDialog({ open, onOpenChange, title, generatePdf }: PdfPreviewDialogProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [numPages, setNumPages] = useState<number>(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [scale, setScale] = useState(1.2)

  useEffect(() => {
    if (!open) {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl)
        setBlobUrl(null)
      }
      setPdfBlob(null)
      setError(null)
      setNumPages(0)
      setCurrentPage(1)
      setScale(1.2)
      return
    }

    let cancelled = false
    setIsLoading(true)
    setError(null)

    generatePdf()
      .then((blob) => {
        if (cancelled) return
        const url = URL.createObjectURL(blob)
        setBlobUrl(url)
        setPdfBlob(blob)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Kon PDF niet laden')
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [open, generatePdf])

  const onDocumentLoadSuccess = useCallback(({ numPages: n }: { numPages: number }) => {
    setNumPages(n)
    setCurrentPage(1)
  }, [])

  const handleDownload = () => {
    if (!blobUrl) return
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = `${title}.pdf`
    a.click()
  }

  const handleOpenNewTab = () => {
    if (!blobUrl) return
    window.open(blobUrl, '_blank')
  }

  const zoomIn = () => setScale((s) => Math.min(s + 0.2, 3))
  const zoomOut = () => setScale((s) => Math.max(s - 0.2, 0.4))
  const prevPage = () => setCurrentPage((p) => Math.max(p - 1, 1))
  const nextPage = () => setCurrentPage((p) => Math.min(p + 1, numPages))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[92vh] flex flex-col p-0 gap-0 rounded-2xl border-none shadow-[0_25px_50px_-12px_rgba(0,0,0,0.15)] bg-[#F8F7F5]">
        {/* Header */}
        <DialogHeader className="px-8 pt-6 pb-0 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-[16px] font-bold text-[#1A1A1A] tracking-[-0.3px]">
                {title}
              </DialogTitle>
              <DialogDescription className="text-[12px] text-[#9B9B95] mt-0.5">
                {numPages > 0 ? `${numPages} pagina${numPages !== 1 ? "'s" : ''}` : 'PDF preview'}
              </DialogDescription>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handleOpenNewTab}
                disabled={!blobUrl}
                className="h-8 px-3 text-[12px] font-medium text-[#1A535C] hover:bg-[#1A535C]/5 rounded-lg transition-colors disabled:opacity-30 flex items-center gap-1.5"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Open
              </button>
              <button
                onClick={handleDownload}
                disabled={!blobUrl}
                className="h-8 px-3 text-[12px] font-medium text-[#1A535C] hover:bg-[#1A535C]/5 rounded-lg transition-colors disabled:opacity-30 flex items-center gap-1.5"
              >
                <Download className="h-3.5 w-3.5" />
                Download
              </button>
            </div>
          </div>
        </DialogHeader>

        {/* Toolbar */}
        {numPages > 0 && (
          <div className="flex items-center justify-center gap-4 px-8 py-3 flex-shrink-0">
            <div className="flex items-center gap-1 bg-white rounded-lg px-1 py-1 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
              <button
                onClick={prevPage}
                disabled={currentPage <= 1}
                className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-[#F8F7F5] transition-colors disabled:opacity-20"
              >
                <ChevronLeft className="h-4 w-4 text-[#1A1A1A]" />
              </button>
              <span className="text-[12px] font-mono text-[#1A1A1A] min-w-[60px] text-center tabular-nums">
                {currentPage} / {numPages}
              </span>
              <button
                onClick={nextPage}
                disabled={currentPage >= numPages}
                className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-[#F8F7F5] transition-colors disabled:opacity-20"
              >
                <ChevronRight className="h-4 w-4 text-[#1A1A1A]" />
              </button>
            </div>

            <div className="w-px h-5 bg-[#EBEBEB]" />

            <div className="flex items-center gap-1 bg-white rounded-lg px-1 py-1 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
              <button
                onClick={zoomOut}
                disabled={scale <= 0.4}
                className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-[#F8F7F5] transition-colors disabled:opacity-20"
              >
                <ZoomOut className="h-3.5 w-3.5 text-[#1A1A1A]" />
              </button>
              <span className="text-[12px] font-mono text-[#6B6B66] min-w-[42px] text-center tabular-nums">
                {Math.round(scale * 100)}%
              </span>
              <button
                onClick={zoomIn}
                disabled={scale >= 3}
                className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-[#F8F7F5] transition-colors disabled:opacity-20"
              >
                <ZoomIn className="h-3.5 w-3.5 text-[#1A1A1A]" />
              </button>
            </div>
          </div>
        )}

        {/* PDF Content */}
        <div className="flex-1 min-h-0 overflow-auto mx-8 mb-6 rounded-xl bg-white shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
          {isLoading && (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-[#1A535C]" />
              <span className="text-[13px] text-[#9B9B95]">PDF laden...</span>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center h-full gap-2">
              <p className="text-[13px] text-[#C0451A]">{error}</p>
              <button
                onClick={() => onOpenChange(false)}
                className="text-[12px] text-[#1A535C] hover:underline mt-1"
              >
                Sluiten
              </button>
            </div>
          )}

          {pdfBlob && !error && (
            <div className="flex justify-center py-8">
              <Document
                file={pdfBlob}
                onLoadSuccess={onDocumentLoadSuccess}
                loading={
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-6 w-6 animate-spin text-[#1A535C]" />
                  </div>
                }
                error={
                  <div className="flex items-center justify-center py-20">
                    <p className="text-[13px] text-[#C0451A]">Kon PDF niet weergeven</p>
                  </div>
                }
              >
                <Page
                  pageNumber={currentPage}
                  scale={scale}
                  className="shadow-[0_2px_8px_rgba(0,0,0,0.06)] rounded-sm"
                  loading={
                    <div className="flex items-center justify-center py-20">
                      <Loader2 className="h-5 w-5 animate-spin text-[#9B9B95]" />
                    </div>
                  }
                />
              </Document>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
