import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Send,
  ArrowLeft,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Link2,
  Undo2,
  Redo2,
  FileText,
  Loader2,
  Paperclip,
  X,
  Download,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import { getOfferte, getOfferteItems, getKlant, updateOfferte } from '@/services/supabaseService'
import { generateOffertePDF } from '@/services/pdfService'
import { useDocumentStyle } from '@/hooks/useDocumentStyle'
import { sendEmail } from '@/services/gmailService'
import type { EmailAttachment } from '@/services/gmailService'
import { toast } from 'sonner'
import { cn, formatCurrency } from '@/lib/utils'
import { logger } from '../../utils/logger'
import type { Offerte, OfferteItem, Klant } from '@/types'

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getFileTypeColor(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'pdf': return 'bg-red-500'
    case 'doc': case 'docx': return 'bg-blue-600'
    case 'xls': case 'xlsx': return 'bg-green-600'
    case 'png': case 'jpg': case 'jpeg': case 'gif': case 'svg': return 'bg-primary'
    case 'ai': case 'eps': return 'bg-orange-500'
    case 'zip': case 'rar': return 'bg-yellow-600'
    default: return 'bg-gray-500'
  }
}

function getFileExt(name: string): string {
  return (name.split('.').pop() || 'FILE').toUpperCase().substring(0, 4)
}

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const result = reader.result as string
      // Remove the data:...;base64, prefix
      const base64 = result.split(',')[1] || ''
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

export function EmailComposePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const quoteId = searchParams.get('quote_id') || ''
  const { emailHandtekening, bedrijfsnaam, bedrijfsAdres, kvkNummer, btwNummer, primaireKleur } = useAppSettings()
  const documentStyle = useDocumentStyle()

  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [offerte, setOfferte] = useState<Offerte | null>(null)
  const [offerteItems, setOfferteItems] = useState<OfferteItem[]>([])
  const [klant, setKlant] = useState<Klant | null>(null)
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null)
  const [pdfFilename, setPdfFilename] = useState('')

  const [to, setTo] = useState('')
  const [cc, setCc] = useState('')
  const [bcc, setBcc] = useState('')
  const [showCcBcc, setShowCcBcc] = useState(false)
  const [subject, setSubject] = useState('')
  const editorRef = useRef<HTMLDivElement>(null)
  const [editorEmpty, setEditorEmpty] = useState(true)
  const [activeFormats, setActiveFormats] = useState({
    bold: false, italic: false, underline: false,
  })

  // Extra file attachments
  const [extraAttachments, setExtraAttachments] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Back navigation target
  const backUrl = offerte?.id ? `/offertes/${offerte.id}/preview` : '/offertes'

  // Load quote data and generate PDF
  useEffect(() => {
    if (!quoteId) {
      setIsLoading(false)
      return
    }

    let cancelled = false

    async function loadData() {
      try {
        const [fetchedOfferte, fetchedItems] = await Promise.all([
          getOfferte(quoteId),
          getOfferteItems(quoteId),
        ])
        if (cancelled || !fetchedOfferte) {
          setIsLoading(false)
          return
        }

        setOfferte(fetchedOfferte)
        setOfferteItems(fetchedItems)

        const fetchedKlant = await getKlant(fetchedOfferte.klant_id)
        if (cancelled) return
        setKlant(fetchedKlant)

        // Pre-fill email fields
        const contactEmail = fetchedKlant?.contactpersonen?.[0]?.email || fetchedKlant?.email || ''
        setTo(contactEmail)
        setSubject(`Offerte ${fetchedOfferte.nummer} - ${fetchedKlant?.bedrijfsnaam || ''}`)

        // Generate PDF
        try {
          const doc = generateOffertePDF(
            fetchedOfferte,
            fetchedItems,
            fetchedKlant || {},
            {
              bedrijfsnaam: bedrijfsnaam || 'Uw Bedrijf',
              bedrijfs_adres: bedrijfsAdres || '',
              kvk_nummer: kvkNummer || '',
              btw_nummer: btwNummer || '',
              primaireKleur: primaireKleur || '#2563eb',
            },
            documentStyle
          )
          const blob = doc.output('blob')
          setPdfBlob(blob)
          setPdfFilename(`${fetchedOfferte.nummer}.pdf`)
        } catch (err) {
          logger.error('Failed to generate PDF:', err)
        }

        // Set editor content
        setTimeout(() => {
          if (editorRef.current && !cancelled) {
            const klantNaam = fetchedKlant?.contactpersonen?.[0]?.naam || fetchedKlant?.contactpersoon || fetchedKlant?.bedrijfsnaam || ''
            const totaal = new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(fetchedOfferte.totaal || 0)
            const body = `Beste ${klantNaam},

Hierbij ontvangt u onze offerte ${fetchedOfferte.nummer} voor "${fetchedOfferte.titel}".

Het totaalbedrag van deze offerte is ${totaal} (incl. BTW).

De offerte is geldig tot ${fetchedOfferte.geldig_tot ? new Date(fetchedOfferte.geldig_tot).toLocaleDateString('nl-NL') : '-'}. Bijgevoegd vindt u de offerte als PDF.

Mocht u vragen hebben of aanvullende informatie wensen, neem dan gerust contact met ons op.

${emailHandtekening || `Met vriendelijke groet,\n${bedrijfsnaam || ''}`}`

            editorRef.current.innerText = body
            setEditorEmpty(false)
          }
        }, 100)
      } catch (err) {
        logger.error('Failed to load quote data for email:', err)
        toast.error('Kon offertegegevens niet laden')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    loadData()
    return () => { cancelled = true }
  }, [quoteId])

  // Format commands
  const updateFormatState = useCallback(() => {
    setActiveFormats({
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline'),
    })
  }, [])

  const execFormat = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value)
    editorRef.current?.focus()
    updateFormatState()
  }, [updateFormatState])

  const handleEditorInput = useCallback(() => {
    if (editorRef.current) {
      setEditorEmpty(!editorRef.current.innerText?.trim())
    }
  }, [])

  const insertLink = useCallback(() => {
    const url = prompt('Voer de URL in:', 'https://')
    if (url) execFormat('createLink', url)
  }, [execFormat])

  // File upload
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files)
      const totalSize = newFiles.reduce((sum, f) => sum + f.size, 0)
        + extraAttachments.reduce((sum, f) => sum + f.size, 0)
        + (pdfBlob?.size || 0)

      if (totalSize > 25 * 1024 * 1024) {
        toast.error('Totale bijlagen mogen niet groter zijn dan 25 MB')
        return
      }

      setExtraAttachments(prev => [...prev, ...newFiles])
    }
    e.target.value = ''
  }, [extraAttachments, pdfBlob])

  const removeAttachment = useCallback((index: number) => {
    setExtraAttachments(prev => prev.filter((_, i) => i !== index))
  }, [])

  // Download PDF preview
  const handleDownloadPdf = useCallback(() => {
    if (!pdfBlob || !pdfFilename) return
    const url = URL.createObjectURL(pdfBlob)
    const a = document.createElement('a')
    a.href = url
    a.download = pdfFilename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [pdfBlob, pdfFilename])

  const handleSend = async () => {
    if (!to.trim() || !subject.trim()) {
      toast.error('Vul een ontvanger en onderwerp in')
      return
    }

    setIsSending(true)
    try {
      const body = editorRef.current?.innerText || ''
      const html = editorRef.current?.innerHTML || ''

      // Build attachments array
      const attachments: EmailAttachment[] = []

      // Add auto-generated PDF
      if (pdfBlob) {
        const pdfBase64 = await blobToBase64(pdfBlob)
        attachments.push({
          filename: pdfFilename,
          content: pdfBase64,
          contentType: 'application/pdf',
        })
      }

      // Add extra uploaded files
      for (const file of extraAttachments) {
        const base64 = await blobToBase64(file)
        attachments.push({
          filename: file.name,
          content: base64,
          contentType: file.type || 'application/octet-stream',
        })
      }

      await sendEmail(to.trim(), subject.trim(), body, {
        html,
        cc: cc.trim() || undefined,
        bcc: bcc.trim() || undefined,
        attachments: attachments.length > 0 ? attachments : undefined,
      })

      // Update offerte status to verzonden
      if (offerte?.id) {
        await updateOfferte(offerte.id, {
          status: 'verzonden',
          verstuurd_op: new Date().toISOString(),
        })
      }

      toast.success('Offerte verstuurd naar klant')
      navigate(offerte?.id ? `/offertes/${offerte.id}/preview` : '/offertes')
    } catch (err) {
      logger.error('Failed to send email:', err)
      toast.error('Kon email niet verzenden')
    } finally {
      setIsSending(false)
    }
  }

  // Calculate total attachment size
  const totalAttachmentSize = (pdfBlob?.size || 0) + extraAttachments.reduce((sum, f) => sum + f.size, 0)
  const totalAttachmentCount = (pdfBlob ? 1 : 0) + extraAttachments.length

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Offerte laden...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(backUrl)}
          className="flex-shrink-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-foreground">Offerte versturen</h1>
          {offerte && (
            <p className="text-sm text-muted-foreground">
              {offerte.nummer} — {offerte.titel}
              {klant && <> — {klant.bedrijfsnaam}</>}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button variant="outline" onClick={() => navigate(backUrl)}>
            Annuleren
          </Button>
          <Button
            onClick={handleSend}
            disabled={!to.trim() || !subject.trim() || isSending}
            className="bg-gradient-to-r from-accent to-primary border-0 gap-2"
          >
            <Send className="h-4 w-4" />
            {isSending ? 'Verzenden...' : 'Verstuur email'}
          </Button>
        </div>
      </div>

      {/* Email form */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden shadow-sm">
        <div className="p-6 space-y-4">
          {/* To */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-between w-24 flex-shrink-0">
              <Label className="text-sm font-medium">Aan</Label>
              <Button
                variant="ghost"
                size="sm"
                className="h-5 px-1 text-[10px] text-muted-foreground"
                onClick={() => setShowCcBcc(!showCcBcc)}
              >
                CC/BCC {showCcBcc ? <ChevronUp className="w-2.5 h-2.5 ml-0.5" /> : <ChevronDown className="w-2.5 h-2.5 ml-0.5" />}
              </Button>
            </div>
            <Input
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="email@voorbeeld.nl"
              type="email"
              className="h-10"
            />
          </div>

          {/* CC / BCC */}
          {showCcBcc && (
            <>
              <div className="flex items-center gap-3">
                <Label className="text-sm font-medium w-24 flex-shrink-0">CC</Label>
                <Input
                  value={cc}
                  onChange={(e) => setCc(e.target.value)}
                  placeholder="cc@voorbeeld.nl"
                  type="email"
                  className="h-10"
                />
              </div>
              <div className="flex items-center gap-3">
                <Label className="text-sm font-medium w-24 flex-shrink-0">BCC</Label>
                <Input
                  value={bcc}
                  onChange={(e) => setBcc(e.target.value)}
                  placeholder="bcc@voorbeeld.nl"
                  type="email"
                  className="h-10"
                />
              </div>
            </>
          )}

          {/* Subject */}
          <div className="flex items-center gap-3">
            <Label className="text-sm font-medium w-24 flex-shrink-0">Onderwerp</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Onderwerp..."
              className="h-10"
            />
          </div>

          <Separator />

          {/* Attachments section */}
          <div className="space-y-2">
            {/* Auto-generated PDF */}
            {pdfBlob && (
              <div className="flex items-center gap-3 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="w-8 h-8 rounded flex items-center justify-center bg-red-500 text-white text-[9px] font-bold flex-shrink-0">
                  PDF
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{pdfFilename}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(pdfBlob.size)} — Offerte PDF (automatisch)
                  </p>
                </div>
                <button
                  onClick={handleDownloadPdf}
                  className="p-1.5 rounded hover:bg-blue-100 dark:hover:bg-blue-800 transition-colors"
                  title="Download PDF"
                >
                  <Download className="h-4 w-4 text-blue-500" />
                </button>
              </div>
            )}

            {/* Extra uploaded files */}
            {extraAttachments.map((file, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2 bg-muted/30 rounded-lg border border-border">
                <div className={`w-8 h-8 rounded flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0 ${getFileTypeColor(file.name)}`}>
                  {getFileExt(file.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                </div>
                <button
                  onClick={() => removeAttachment(i)}
                  className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                  title="Bijlage verwijderen"
                >
                  <X className="h-4 w-4 text-muted-foreground hover:text-red-500" />
                </button>
              </div>
            ))}

            {/* Add attachment button */}
            <div className="flex items-center gap-3">
              <input
                type="file"
                ref={fileInputRef}
                multiple
                onChange={handleFileSelect}
                className="hidden"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.svg,.ai,.eps,.zip,.rar,.txt,.csv,.dwg,.dxf"
              />
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-muted-foreground"
                onClick={() => fileInputRef.current?.click()}
              >
                <Paperclip className="w-4 h-4" />
                Bijlage toevoegen
              </Button>
              {totalAttachmentCount > 0 && (
                <span className="text-xs text-muted-foreground">
                  {totalAttachmentCount} bijlage{totalAttachmentCount > 1 ? 'n' : ''} ({formatFileSize(totalAttachmentSize)})
                </span>
              )}
            </div>
          </div>

          <Separator />

          {/* Body editor */}
          <div className="border rounded-lg overflow-hidden">
            <div className="relative">
              {editorEmpty && (
                <div className="absolute top-3 left-4 text-sm text-muted-foreground pointer-events-none select-none">
                  Schrijf uw bericht hier...
                </div>
              )}
              <div
                ref={editorRef}
                contentEditable
                onInput={handleEditorInput}
                onMouseUp={updateFormatState}
                onKeyUp={updateFormatState}
                className="min-h-[300px] max-h-[600px] overflow-y-auto px-4 py-3 text-sm leading-relaxed focus:outline-none whitespace-pre-wrap"
                suppressContentEditableWarning
              />
            </div>

            {/* Formatting toolbar */}
            <div className="flex items-center gap-0.5 px-2 py-1.5 border-t bg-muted/30">
              <button onClick={() => execFormat('undo')} className="p-1.5 rounded hover:bg-accent transition-colors" title="Ongedaan maken">
                <Undo2 className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
              <button onClick={() => execFormat('redo')} className="p-1.5 rounded hover:bg-accent transition-colors" title="Opnieuw">
                <Redo2 className="w-3.5 h-3.5 text-muted-foreground" />
              </button>

              <Separator orientation="vertical" className="h-4 mx-1" />

              <button
                onClick={() => execFormat('bold')}
                className={cn('p-1.5 rounded hover:bg-accent transition-colors', activeFormats.bold && 'bg-accent text-foreground')}
                title="Vet"
              >
                <Bold className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => execFormat('italic')}
                className={cn('p-1.5 rounded hover:bg-accent transition-colors', activeFormats.italic && 'bg-accent text-foreground')}
                title="Cursief"
              >
                <Italic className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => execFormat('underline')}
                className={cn('p-1.5 rounded hover:bg-accent transition-colors', activeFormats.underline && 'bg-accent text-foreground')}
                title="Onderstrepen"
              >
                <Underline className="w-3.5 h-3.5" />
              </button>

              <Separator orientation="vertical" className="h-4 mx-1" />

              <button onClick={() => execFormat('insertUnorderedList')} className="p-1.5 rounded hover:bg-accent transition-colors" title="Opsommingslijst">
                <List className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
              <button onClick={() => execFormat('insertOrderedList')} className="p-1.5 rounded hover:bg-accent transition-colors" title="Genummerde lijst">
                <ListOrdered className="w-3.5 h-3.5 text-muted-foreground" />
              </button>

              <Separator orientation="vertical" className="h-4 mx-1" />

              <button onClick={insertLink} className="p-1.5 rounded hover:bg-accent transition-colors" title="Link invoegen">
                <Link2 className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t bg-muted/10">
          <div className="text-xs text-muted-foreground">
            {offerte && (
              <span>
                Offerte {offerte.nummer} — {formatCurrency(offerte.totaal)} incl. BTW
              </span>
            )}
          </div>
          <Button
            onClick={handleSend}
            disabled={!to.trim() || !subject.trim() || isSending}
            className="gap-2"
          >
            <Send className="h-4 w-4" />
            {isSending ? 'Verzenden...' : 'Verstuur email'}
          </Button>
        </div>
      </div>
    </div>
  )
}
