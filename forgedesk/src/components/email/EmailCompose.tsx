import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Send, Paperclip, Sparkles, ArrowLeft, X, Loader2,
  Bold, Italic, Underline, List, ListOrdered, Link2,
  ChevronDown, Image, Trash2,
} from 'lucide-react'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import { getKlanten } from '@/services/supabaseService'
import { toast } from 'sonner'
import { cn, getInitials } from '@/lib/utils'
import type { Klant } from '@/types'
import { callForgie } from '@/services/forgieService'
import { logger } from '../../utils/logger'

interface EmailComposeProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultTo?: string
  defaultSubject?: string
  defaultBody?: string
  onSend?: (data: { to: string; subject: string; body: string; html?: string; scheduledAt?: string }) => void
}

const emailTemplates: Record<string, { onderwerp: string; body: string }> = {
  none: { onderwerp: '', body: '' },
  'offerte-followup': {
    onderwerp: 'Opvolging offerte',
    body: `Beste [naam],\n\nGraag volg ik onze offerte [nummer] op die wij op [datum] hebben verstuurd.\n\nHeeft u de offerte kunnen bekijken? Wij horen graag of u nog vragen heeft of dat we verdere toelichting kunnen geven.\n\nMocht u interesse hebben, dan plannen we graag een afspraak in om de details te bespreken.`,
  },
  'project-update': {
    onderwerp: 'Project update',
    body: `Beste [naam],\n\nHierbij een update over de voortgang van uw project [projectnaam].\n\nWat is er bereikt:\n- [punt 1]\n- [punt 2]\n\nVolgende stappen:\n- [stap 1]\n\nVerwachte opleverdatum: [datum]`,
  },
  welkomstbericht: {
    onderwerp: 'Welkom bij Sign Company',
    body: `Beste [naam],\n\nWelkom bij Sign Company! Wij zijn verheugd om met u samen te werken.\n\nUw contactpersoon is [naam contactpersoon], bereikbaar via [telefoonnummer] en [emailadres].\n\nWij kijken uit naar een prettige samenwerking!`,
  },
  betaalherinnering: {
    onderwerp: 'Herinnering: openstaande factuur',
    body: `Beste [naam],\n\nUit onze administratie blijkt dat de volgende factuur nog niet is voldaan:\n\nFactuurnummer: [nummer]\nVervaldatum: [vervaldatum]\nBedrag: [bedrag]\n\nWij verzoeken u vriendelijk het openstaande bedrag binnen 7 dagen te voldoen.`,
  },
}

const mergeFields = [
  { id: 'naam', label: 'Naam', value: '[naam]' },
  { id: 'bedrijf', label: 'Bedrijf', value: '[bedrijf]' },
  { id: 'datum', label: 'Datum', value: '[datum]' },
  { id: 'projectnaam', label: 'Projectnaam', value: '[projectnaam]' },
  { id: 'offerte_nummer', label: 'Offertenummer', value: '[offerte_nummer]' },
]

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getFileExt(name: string): string {
  return (name.split('.').pop() || 'FILE').toUpperCase().substring(0, 4)
}

function getFileTypeColor(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'pdf': return 'bg-red-500'
    case 'doc': case 'docx': return 'bg-blue-600'
    case 'xls': case 'xlsx': return 'bg-green-600'
    case 'png': case 'jpg': case 'jpeg': case 'gif': case 'svg': return 'bg-primary'
    default: return 'bg-muted-foreground'
  }
}

export function EmailCompose({
  open,
  onOpenChange,
  defaultTo = '',
  defaultSubject = '',
  defaultBody = '',
  onSend,
}: EmailComposeProps) {
  const { emailHandtekening, handtekeningAfbeelding, handtekeningAfbeeldingGrootte } = useAppSettings()

  const [to, setTo] = useState(defaultTo)
  const [cc, setCc] = useState('')
  const [bcc, setBcc] = useState('')
  const [showCcBcc, setShowCcBcc] = useState(false)
  const [subject, setSubject] = useState(defaultSubject)
  const [isSending, setIsSending] = useState(false)
  const [template, setTemplate] = useState('none')
  const [showTemplateMenu, setShowTemplateMenu] = useState(false)
  const [showMergeFields, setShowMergeFields] = useState(false)

  // Contacts autocomplete
  const [contacts, setContacts] = useState<Klant[]>([])
  const [suggestions, setSuggestions] = useState<Klant[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const toInputRef = useRef<HTMLInputElement>(null)

  // Files
  const [attachments, setAttachments] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  // Editor
  const editorRef = useRef<HTMLDivElement>(null)

  // Forgie AI
  const [forgieLoading, setForgieLoading] = useState(false)

  // Auto-save timer
  const autoSaveRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Build signature HTML
  const signatureHtml = useMemo(() => {
    const imgHeight = handtekeningAfbeeldingGrootte ?? 64
    const imgMaxWidth = Math.round(imgHeight * 2.5)
    const parts: string[] = []
    if (emailHandtekening) {
      parts.push(emailHandtekening.replace(/\n/g, '<br>'))
    }
    if (handtekeningAfbeelding) {
      parts.push(`<img src="${handtekeningAfbeelding}" alt="Logo" style="max-height:${imgHeight}px;max-width:${imgMaxWidth}px;object-fit:contain;" />`)
    }
    return parts.length ? `<br><br>--<br>${parts.join('<br>')}` : ''
  }, [emailHandtekening, handtekeningAfbeelding, handtekeningAfbeeldingGrootte])

  // Initialize editor with signature
  useEffect(() => {
    if (open && editorRef.current) {
      const timer = setTimeout(() => {
        if (!editorRef.current) return
        if (defaultBody) {
          editorRef.current.innerHTML = `<br>${signatureHtml}${defaultBody.replace(/\n/g, '<br>')}`
        } else {
          editorRef.current.innerHTML = signatureHtml || '<br>'
        }
        // Place cursor at start
        const range = document.createRange()
        const sel = window.getSelection()
        range.setStart(editorRef.current, 0)
        range.collapse(true)
        sel?.removeAllRanges()
        sel?.addRange(range)
        editorRef.current.focus()
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [open, defaultBody, signatureHtml])

  useEffect(() => {
    setTo(defaultTo)
    setSubject(defaultSubject)
  }, [defaultTo, defaultSubject])

  // Load contacts
  useEffect(() => {
    if (open) {
      getKlanten().then(setContacts).catch(() => {})
    }
  }, [open])

  // Auto-save concept every 30s
  useEffect(() => {
    if (open) {
      autoSaveRef.current = setInterval(() => {
        // Could save to localStorage or Supabase
        logger.info('Auto-save concept')
      }, 30000)
      return () => {
        if (autoSaveRef.current) clearInterval(autoSaveRef.current)
      }
    }
  }, [open])

  const handleToChange = useCallback((value: string) => {
    setTo(value)
    if (value.length >= 2 && contacts.length > 0) {
      const q = value.toLowerCase()
      const matches = contacts.filter(k =>
        k.bedrijfsnaam?.toLowerCase().includes(q) ||
        k.contactpersoon?.toLowerCase().includes(q) ||
        k.email?.toLowerCase().includes(q)
      ).slice(0, 5)
      setSuggestions(matches)
      setShowSuggestions(matches.length > 0)
    } else {
      setShowSuggestions(false)
    }
  }, [contacts])

  const handleSelectContact = useCallback((klant: Klant) => {
    setTo(klant.email || '')
    setShowSuggestions(false)
  }, [])

  const handleTemplateSelect = useCallback((key: string) => {
    const tmpl = emailTemplates[key]
    if (tmpl && editorRef.current) {
      if (tmpl.onderwerp) setSubject(tmpl.onderwerp)
      if (tmpl.body) {
        editorRef.current.innerHTML = `${tmpl.body.replace(/\n/g, '<br>')}${signatureHtml}`
      }
    }
    setTemplate(key)
    setShowTemplateMenu(false)
  }, [signatureHtml])

  const handleMergeFieldInsert = useCallback((value: string) => {
    document.execCommand('insertText', false, value)
    setShowMergeFields(false)
    editorRef.current?.focus()
  }, [])

  const handleForgieWrite = useCallback(async () => {
    if (!editorRef.current) return
    setForgieLoading(true)
    try {
      const context = `Onderwerp: ${subject}\nAan: ${to}`
      const response = await callForgie('generate-reply', context)
      if (response?.result && editorRef.current) {
        editorRef.current.innerHTML = `${response.result.replace(/\n/g, '<br>')}${signatureHtml}`
      }
    } catch {
      toast.error('Forgie kon geen email genereren')
    } finally {
      setForgieLoading(false)
    }
  }, [subject, to, signatureHtml])

  const execCommand = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value)
    editorRef.current?.focus()
  }, [])

  const handleSend = useCallback(async () => {
    if (!to.trim()) {
      toast.error('Vul een ontvanger in')
      return
    }
    if (!subject.trim()) {
      toast.error('Vul een onderwerp in')
      return
    }
    setIsSending(true)
    try {
      const html = editorRef.current?.innerHTML || ''
      const body = editorRef.current?.innerText || ''
      await onSend?.({ to, subject, body, html })
      toast.success('Email verzonden')
      onOpenChange(false)
    } catch {
      toast.error('Verzenden mislukt')
    } finally {
      setIsSending(false)
    }
  }, [to, subject, onSend, onOpenChange])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setAttachments(prev => [...prev, ...files])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files = Array.from(e.dataTransfer.files)
    setAttachments(prev => [...prev, ...files])
  }, [])

  if (!open) return null

  return (
    <div className="flex flex-col h-full bg-card">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/50 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-foreground/60" onClick={() => onOpenChange(false)}>
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="text-xs">Terug naar inbox</span>
          </Button>
        </div>
        <h2 className="text-sm font-medium text-foreground/60">Nieuw bericht</h2>
        <div />
      </div>

      {/* Compose form */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[800px] mx-auto px-6 py-4">
          {/* To field with autocomplete */}
          <div className="relative">
            <div className="flex items-center border-b border-border/30 py-2">
              <label className="text-sm text-foreground/40 w-12 flex-shrink-0">Aan</label>
              <Input
                ref={toInputRef}
                type="email"
                value={to}
                onChange={(e) => handleToChange(e.target.value)}
                onFocus={() => to.length >= 2 && suggestions.length > 0 && setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                className="border-none shadow-none h-8 text-sm focus-visible:ring-0 px-0"
                placeholder="ontvanger@voorbeeld.nl"
              />
              {!showCcBcc && (
                <button
                  onClick={() => setShowCcBcc(true)}
                  className="text-xs text-foreground/40 hover:text-foreground/60 flex-shrink-0"
                >
                  CC BCC
                </button>
              )}
            </div>
            {/* Autocomplete dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute left-12 top-full mt-1 w-80 bg-card rounded-lg border border-border shadow-lg z-50 py-1">
                {suggestions.map(klant => (
                  <button
                    key={klant.id}
                    onClick={() => handleSelectContact(klant)}
                    className="w-full text-left px-3 py-2 hover:bg-foreground/5 flex items-center gap-2"
                  >
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-medium text-primary">{getInitials(klant.bedrijfsnaam || klant.contactpersoon || '')}</span>
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{klant.bedrijfsnaam || klant.contactpersoon}</div>
                      <div className="text-xs text-foreground/40 truncate">{klant.email}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* CC/BCC */}
          {showCcBcc && (
            <>
              <div className="flex items-center border-b border-border/30 py-2">
                <label className="text-sm text-foreground/40 w-12 flex-shrink-0">CC</label>
                <Input
                  type="email"
                  value={cc}
                  onChange={(e) => setCc(e.target.value)}
                  className="border-none shadow-none h-8 text-sm focus-visible:ring-0 px-0"
                  placeholder="cc@voorbeeld.nl"
                />
              </div>
              <div className="flex items-center border-b border-border/30 py-2">
                <label className="text-sm text-foreground/40 w-12 flex-shrink-0">BCC</label>
                <Input
                  type="email"
                  value={bcc}
                  onChange={(e) => setBcc(e.target.value)}
                  className="border-none shadow-none h-8 text-sm focus-visible:ring-0 px-0"
                  placeholder="bcc@voorbeeld.nl"
                />
              </div>
            </>
          )}

          {/* Subject */}
          <div className="flex items-center border-b border-border/30 py-2">
            <label className="text-sm text-foreground/40 w-12 flex-shrink-0">Onderwerp</label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="border-none shadow-none h-8 text-sm focus-visible:ring-0 px-0"
              placeholder="Onderwerp..."
            />
          </div>

          {/* Action bar: template, merge fields, AI */}
          <div className="flex items-center gap-2 py-2 border-b border-border/20">
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1 text-foreground/40"
                onClick={() => setShowTemplateMenu(!showTemplateMenu)}
              >
                Template kiezen <ChevronDown className="h-3 w-3" />
              </Button>
              {showTemplateMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowTemplateMenu(false)} />
                  <div className="absolute left-0 top-full mt-1 w-48 bg-card rounded-lg border border-border shadow-lg z-50 py-1">
                    {Object.entries(emailTemplates).filter(([k]) => k !== 'none').map(([key, tmpl]) => (
                      <button
                        key={key}
                        onClick={() => handleTemplateSelect(key)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-foreground/5"
                      >
                        {tmpl.onderwerp}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1 text-foreground/40"
                onClick={() => setShowMergeFields(!showMergeFields)}
              >
                Veld invoegen <ChevronDown className="h-3 w-3" />
              </Button>
              {showMergeFields && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowMergeFields(false)} />
                  <div className="absolute left-0 top-full mt-1 w-40 bg-card rounded-lg border border-border shadow-lg z-50 py-1">
                    {mergeFields.map(field => (
                      <button
                        key={field.id}
                        onClick={() => handleMergeFieldInsert(field.value)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-foreground/5"
                      >
                        {field.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1 text-foreground/40"
              onClick={handleForgieWrite}
              disabled={forgieLoading}
            >
              {forgieLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
              Schrijf mijn e-mail
            </Button>
          </div>

          {/* Editor */}
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            className={cn(
              'min-h-[300px] py-4 text-base leading-relaxed text-foreground outline-none [&_img]:max-w-[200px]',
              isDragging && 'ring-2 ring-primary/30 ring-inset rounded-lg bg-primary/5',
            )}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                handleSend()
              }
            }}
          />

          {/* Attachments */}
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 py-3 border-t border-border/30">
              {attachments.map((file, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border/50 bg-foreground/[0.02] text-sm">
                  <div className={cn('w-6 h-6 rounded text-white text-[8px] font-bold flex items-center justify-center', getFileTypeColor(file.name))}>
                    {getFileExt(file.name)}
                  </div>
                  <span className="text-foreground/70 max-w-[150px] truncate">{file.name}</span>
                  <span className="text-foreground/30 text-xs">{formatFileSize(file.size)}</span>
                  <button onClick={() => setAttachments(prev => prev.filter((_, idx) => idx !== i))}>
                    <X className="h-3 w-3 text-foreground/30 hover:text-foreground/60" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom toolbar */}
      <div className="flex items-center justify-between px-6 py-3 border-t border-border/50 bg-foreground/[0.02] flex-shrink-0">
        <div className="flex items-center gap-0.5">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-foreground/40" onClick={() => execCommand('bold')}><Bold className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-foreground/40" onClick={() => execCommand('italic')}><Italic className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-foreground/40" onClick={() => execCommand('underline')}><Underline className="h-4 w-4" /></Button>
          <div className="w-px h-5 bg-border/50 mx-1" />
          <Button variant="ghost" size="icon" className="h-8 w-8 text-foreground/40" onClick={() => execCommand('insertUnorderedList')}><List className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-foreground/40" onClick={() => execCommand('insertOrderedList')}><ListOrdered className="h-4 w-4" /></Button>
          <div className="w-px h-5 bg-border/50 mx-1" />
          <Button variant="ghost" size="icon" className="h-8 w-8 text-foreground/40" onClick={() => {
            const url = prompt('URL:')
            if (url) execCommand('createLink', url)
          }}><Link2 className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-foreground/40" onClick={() => fileInputRef.current?.click()}>
            <Paperclip className="h-4 w-4" />
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileSelect}
            accept=".pdf,.jpg,.jpeg,.png,.dwg,.dxf,.doc,.docx"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-sm text-foreground/40"
            onClick={() => onOpenChange(false)}
          >
            Annuleren
          </Button>
          <Button size="sm" className="h-8 gap-1.5" onClick={handleSend} disabled={isSending}>
            <Send className="h-3.5 w-3.5" />
            {isSending ? 'Verzenden...' : 'Verzenden'}
          </Button>
        </div>
      </div>
    </div>
  )
}
