import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Download, Loader2 } from 'lucide-react'

interface PdfPreviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  generatePdf: () => Promise<Blob>
}

export function PdfPreviewDialog({ open, onOpenChange, title, generatePdf }: PdfPreviewDialogProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl)
        setBlobUrl(null)
      }
      setError(null)
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
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Kon PDF niet genereren')
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [open, generatePdf])

  const handleDownload = () => {
    if (!blobUrl) return
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = `${title}.pdf`
    a.click()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-5 pb-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription>PDF preview</DialogDescription>
            </div>
            {blobUrl && (
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-1.5" />
                Download
              </Button>
            )}
          </div>
        </DialogHeader>
        <div className="flex-1 min-h-0 px-6 pb-6">
          {isLoading && (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-3 text-muted-foreground">PDF genereren...</span>
            </div>
          )}
          {error && (
            <div className="flex items-center justify-center h-full">
              <p className="text-destructive">{error}</p>
            </div>
          )}
          {blobUrl && (
            <iframe
              src={blobUrl}
              className="w-full h-full rounded-lg border border-border"
              title={`PDF preview: ${title}`}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
