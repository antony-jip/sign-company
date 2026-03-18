import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { AIContentEditableToolbar } from '@/components/ui/AIContentEditableToolbar'
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
} from 'lucide-react'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import { getOfferte, getOfferteItems, getKlant, updateOfferte } from '@/services/supabaseService'
import { generateOffertePDF } from '@/services/pdfService'
import { useDocumentStyle } from '@/hooks/useDocumentStyle'
import { sendEmail } from '@/services/gmailService'
import { toast } from 'sonner'
import { cn, formatCurrency } from '@/lib/utils'
import { logger } from '../../utils/logger'
import type { Offerte, OfferteItem, Klant } from '@/types'

export function EmailComposePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const quoteId = searchParams.get('quote_id') || ''
  const { emailHandtekening, handtekeningAfbeelding, handtekeningAfbeeldingGrootte, bedrijfsnaam, bedrijfsAdres, kvkNummer, btwNummer, primaireKleur, logoUrl } = useAppSettings()
  const documentStyle = useDocumentStyle()

  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [offerte, setOfferte] = useState<Offerte | null>(null)
  const [offerteItems, setOfferteItems] = useState<OfferteItem[]>([])
  const [klant, setKlant] = useState<Klant | null>(null)
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null)
  const [pdfFilename, setPdfFilename] = useState('')

  const [to, setTo] = useState('')
  const [subject, setSubject] = useState('')
  const editorRef = useRef<HTMLDivElement>(null)
  const [editorEmpty, setEditorEmpty] = useState(true)
  const [activeFormats, setActiveFormats] = useState({
    bold: false, italic: false, underline: false,
  })

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
              logo_url: logoUrl || '',
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

        // Set editor content with signature image
        setTimeout(() => {
          if (editorRef.current && !cancelled) {
            const klantNaam = fetchedKlant?.contactpersonen?.[0]?.naam || fetchedKlant?.contactpersoon || fetchedKlant?.bedrijfsnaam || ''
            const totaal = new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(fetchedOfferte.totaal || 0)
            const sigText = emailHandtekening || `Met vriendelijke groet,\n${bedrijfsnaam || ''}`
            const sigImgHeight = handtekeningAfbeeldingGrootte ?? 64
            const sigImgMaxWidth = Math.round(sigImgHeight * 2.5)
            const sigImgHtml = handtekeningAfbeelding
              ? `<img src="${handtekeningAfbeelding}" alt="Logo" style="max-height:${sigImgHeight}px;max-width:${sigImgMaxWidth}px;object-fit:contain;" /><br>`
              : ''
            const bodyHtml = `Beste ${klantNaam},<br><br>Hierbij ontvangt u onze offerte ${fetchedOfferte.nummer} voor &ldquo;${fetchedOfferte.titel}&rdquo;.<br><br>Het totaalbedrag van deze offerte is ${totaal} (incl. BTW).<br><br>De offerte is geldig tot ${fetchedOfferte.geldig_tot ? new Date(fetchedOfferte.geldig_tot).toLocaleDateString('nl-NL') : '-'}. Bijgevoegd vindt u de offerte als PDF.<br><br>Mocht u vragen hebben of aanvullende informatie wensen, neem dan gerust contact met ons op.<br><br>--<br>${sigImgHtml}${sigText.replace(/\n/g, '<br>')}`

            editorRef.current.innerHTML = bodyHtml
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

  const handleSend = async () => {
    if (!to.trim() || !subject.trim()) {
      toast.error('Vul een ontvanger en onderwerp in')
      return
    }

    setIsSending(true)
    try {
      const body = editorRef.current?.innerText || ''
      const html = editorRef.current?.innerHTML || ''

      await sendEmail(to.trim(), subject.trim(), body, { html })

      // Update offerte status to verzonden
      if (offerte?.id) {
        await updateOfferte(offerte.id, {
          status: 'verzonden',
          verstuurd_op: new Date().toISOString(),
        })
      }

      toast.success('Offerte verstuurd naar klant')
      navigate(offerte?.id ? `/offertes/${offerte.id}/bewerken` : '/offertes')
    } catch (err) {
      logger.error('Failed to send email:', err)
      toast.error('Kon email niet verzenden')
    } finally {
      setIsSending(false)
    }
  }

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(offerte?.id ? `/offertes/${offerte.id}/bewerken` : '/offertes')}
          className="flex-shrink-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-extrabold tracking-[-0.03em] text-foreground">Offerte versturen</h1>
          {offerte && (
            <p className="text-sm text-muted-foreground">
              <span className="font-mono">{offerte.nummer}</span> — {offerte.titel}
              {klant && <> — {klant.bedrijfsnaam}</>}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button variant="outline" onClick={() => navigate(offerte?.id ? `/offertes/${offerte.id}/bewerken` : '/offertes')}>
            Annuleren
          </Button>
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

      {/* Email form */}
      <div className="rounded-xl border border-black/[0.06] bg-card overflow-hidden shadow-sm">
        <div className="p-6 space-y-4">
          {/* To */}
          <div className="flex items-center gap-3">
            <Label className="text-sm font-medium w-24 flex-shrink-0">Aan</Label>
            <Input
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="email@voorbeeld.nl"
              type="email"
              className="h-10"
            />
          </div>

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

          {/* Attachment indicator */}
          {pdfBlob && (
            <div className="flex items-center gap-3 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="w-8 h-8 rounded flex items-center justify-center bg-red-500 text-white text-2xs font-bold flex-shrink-0">
                PDF
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{pdfFilename}</p>
                <p className="text-xs text-muted-foreground">
                  {(pdfBlob.size / 1024).toFixed(0)} KB — Automatisch bijgevoegd
                </p>
              </div>
              <FileText className="h-4 w-4 text-blue-500 flex-shrink-0" />
            </div>
          )}

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
              <AIContentEditableToolbar
                editorRef={editorRef}
                onContentChange={handleEditorInput}
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
                Offerte <span className="font-mono">{offerte.nummer}</span> — {formatCurrency(offerte.totaal)} incl. BTW
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
