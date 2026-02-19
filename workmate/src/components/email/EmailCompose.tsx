import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Send,
  Paperclip,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Clock,
  CalendarClock,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Link2,
  Undo2,
  Redo2,
  Quote,
  X,
  Type,
  FileText,
} from 'lucide-react'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import { useAuth } from '@/contexts/AuthContext'
import { generateEmailDraft } from '@/services/aiService'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface EmailComposeProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultTo?: string
  defaultSubject?: string
  defaultBody?: string
  onSend?: (data: { to: string; subject: string; body: string; scheduledAt?: string }) => void
}

const emailTemplates: Record<string, { onderwerp: string; body: string }> = {
  none: { onderwerp: '', body: '' },
  'offerte-followup': {
    onderwerp: 'Opvolging offerte',
    body: `Beste [naam],

Graag volg ik onze offerte [nummer] op die wij op [datum] hebben verstuurd.

Heeft u de offerte kunnen bekijken? Wij horen graag of u nog vragen heeft of dat we verdere toelichting kunnen geven.

Mocht u interesse hebben, dan plannen we graag een afspraak in om de details te bespreken.

Met vriendelijke groet,
[uw naam]`,
  },
  'project-update': {
    onderwerp: 'Project update',
    body: `Beste [naam],

Hierbij een update over de voortgang van uw project [projectnaam].

Wat is er bereikt:
- [punt 1]
- [punt 2]
- [punt 3]

Volgende stappen:
- [stap 1]
- [stap 2]

Verwachte opleverdatum: [datum]

Heeft u vragen? Neem gerust contact op.

Met vriendelijke groet,
[uw naam]`,
  },
  welkomstbericht: {
    onderwerp: 'Welkom bij Sign Company',
    body: `Beste [naam],

Welkom bij Sign Company! Wij zijn verheugd om met u samen te werken.

Uw contactpersoon is [naam contactpersoon], bereikbaar via [telefoonnummer] en [emailadres].

De volgende stappen zijn:
1. Kennismakingsgesprek inplannen
2. Wensen en eisen inventariseren
3. Ontwerp voorstel opstellen

Wij kijken uit naar een prettige samenwerking!

Met vriendelijke groet,
[uw naam]`,
  },
  betaalherinnering: {
    onderwerp: 'Herinnering: openstaande factuur',
    body: `Beste [naam],

Uit onze administratie blijkt dat de volgende factuur nog niet is voldaan:

Factuurnummer: [nummer]
Factuurdatum: [datum]
Bedrag: [bedrag]
Vervaldatum: [vervaldatum]

Wij verzoeken u vriendelijk het openstaande bedrag binnen 7 dagen te voldoen op rekeningnummer [IBAN] o.v.v. het factuurnummer.

Mocht de betaling reeds zijn verricht, dan kunt u deze herinnering als niet verzonden beschouwen.

Met vriendelijke groet,
[uw naam]`,
  },
}

const mergeFields = [
  { id: 'naam', label: 'Naam', value: '[naam]' },
  { id: 'bedrijf', label: 'Bedrijf', value: '[bedrijf]' },
  { id: 'datum', label: 'Datum', value: '[datum]' },
  { id: 'projectnaam', label: 'Projectnaam', value: '[projectnaam]' },
  { id: 'offerte_nummer', label: 'Offertenummer', value: '[offerte_nummer]' },
  { id: 'mijn_naam', label: 'Mijn naam', value: '[mijn_naam]' },
  { id: 'telefoon', label: 'Telefoonnummer', value: '[telefoon]' },
]

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
    case 'zip': case 'rar': return 'bg-yellow-600'
    default: return 'bg-gray-500'
  }
}

function getFileExt(name: string): string {
  return (name.split('.').pop() || 'FILE').toUpperCase().substring(0, 4)
}

export function EmailCompose({
  open,
  onOpenChange,
  defaultTo = '',
  defaultSubject = '',
  defaultBody = '',
  onSend,
}: EmailComposeProps) {
  const { emailHandtekening, bedrijfsnaam } = useAppSettings()
  const { user } = useAuth()

  const [to, setTo] = useState(defaultTo)
  const [cc, setCc] = useState('')
  const [showCc, setShowCc] = useState(false)
  const [subject, setSubject] = useState(defaultSubject)
  const [template, setTemplate] = useState('none')
  const [isSending, setIsSending] = useState(false)
  const [scheduledAt, setScheduledAt] = useState('')
  const [showScheduleDropdown, setShowScheduleDropdown] = useState(false)
  const [scheduleOption, setScheduleOption] = useState<string>('now')
  const [customDate, setCustomDate] = useState('')
  const [customTime, setCustomTime] = useState('09:00')

  // File upload
  const [attachments, setAttachments] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ContentEditable editor
  const editorRef = useRef<HTMLDivElement>(null)
  const [editorEmpty, setEditorEmpty] = useState(true)
  const [activeFormats, setActiveFormats] = useState({
    bold: false, italic: false, underline: false, strikethrough: false,
  })

  // Merge fields
  const [showMergeFields, setShowMergeFields] = useState(false)
  const mergeFieldRef = useRef<HTMLDivElement>(null)

  const scheduleDropdownRef = useRef<HTMLDivElement>(null)

  // Set initial editor content when dialog opens
  useEffect(() => {
    if (open && editorRef.current) {
      const timer = setTimeout(() => {
        if (!editorRef.current) return
        if (defaultBody) {
          editorRef.current.innerHTML = defaultBody.replace(/\n/g, '<br>')
        } else if (emailHandtekening) {
          editorRef.current.innerHTML = `<br><br>--<br>${emailHandtekening.replace(/\n/g, '<br>')}`
        }
        setEditorEmpty(!editorRef.current.innerText?.trim())
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [open, defaultBody, emailHandtekening])

  // Sync state when defaults change (reply/forward)
  useEffect(() => {
    setTo(defaultTo)
    setSubject(defaultSubject)
  }, [defaultTo, defaultSubject])

  // Close dropdowns on outside click
  useEffect(() => {
    if (!showScheduleDropdown && !showMergeFields) return
    function handleClickOutside(e: MouseEvent) {
      if (showScheduleDropdown && scheduleDropdownRef.current && !scheduleDropdownRef.current.contains(e.target as Node)) {
        setShowScheduleDropdown(false)
      }
      if (showMergeFields && mergeFieldRef.current && !mergeFieldRef.current.contains(e.target as Node)) {
        setShowMergeFields(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showScheduleDropdown, showMergeFields])

  // Format commands
  const updateFormatState = useCallback(() => {
    setActiveFormats({
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline'),
      strikethrough: document.queryCommandState('strikeThrough'),
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

  const insertMergeField = useCallback((value: string) => {
    editorRef.current?.focus()
    document.execCommand('insertText', false, value)
    setShowMergeFields(false)
    setEditorEmpty(false)
  }, [])

  // File upload
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments(prev => [...prev, ...Array.from(e.target.files!)])
    }
    e.target.value = ''
  }, [])

  const removeAttachment = useCallback((index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index))
  }, [])

  const handleTemplateChange = (value: string) => {
    setTemplate(value)
    if (value !== 'none' && emailTemplates[value] && editorRef.current) {
      const tmpl = emailTemplates[value]
      if (tmpl.onderwerp && !subject) setSubject(tmpl.onderwerp)
      const signature = emailHandtekening ? `\n\n--\n${emailHandtekening}` : ''
      const fullBody = tmpl.body + signature
      editorRef.current.innerHTML = fullBody.replace(/\n/g, '<br>')
      setEditorEmpty(false)
    }
  }

  const getNextMonday = () => {
    const now = new Date()
    const dayOfWeek = now.getDay()
    const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek
    const nextMonday = new Date(now)
    nextMonday.setDate(now.getDate() + daysUntilMonday)
    return nextMonday
  }

  const handleScheduleSelect = (option: string) => {
    setScheduleOption(option)
    const now = new Date()
    const tomorrow = new Date(now)
    tomorrow.setDate(now.getDate() + 1)
    const tomorrowStr = tomorrow.toISOString().split('T')[0]

    switch (option) {
      case 'now':
        setScheduledAt('')
        break
      case 'tomorrow-9':
        setScheduledAt(`${tomorrowStr}T09:00`)
        break
      case 'tomorrow-14':
        setScheduledAt(`${tomorrowStr}T14:00`)
        break
      case 'next-monday': {
        const monday = getNextMonday()
        const mondayStr = monday.toISOString().split('T')[0]
        setScheduledAt(`${mondayStr}T09:00`)
        break
      }
      case 'custom':
        if (customDate && customTime) {
          setScheduledAt(`${customDate}T${customTime}`)
        } else {
          setScheduledAt('')
        }
        break
    }
    if (option !== 'custom') {
      setShowScheduleDropdown(false)
    }
  }

  const handleAiGenerate = async () => {
    try {
      const draft = await generateEmailDraft({
        onderwerp: subject || undefined,
        doel: subject || 'zakelijke email',
      })
      if (editorRef.current) {
        editorRef.current.innerText = draft
        setEditorEmpty(false)
      }
      toast.success('AI tekst gegenereerd')
    } catch (err: any) {
      toast.error(err.message || 'AI generatie mislukt')
    }
  }

  const handleSend = async () => {
    if (!to.trim() || !subject.trim()) return
    setIsSending(true)

    try {
      const body = editorRef.current?.innerText || ''

      // Delegate actual sending + saving to parent via onSend callback
      // Parent (EmailLayout) handles /api/send-email + createEmail
      onSend?.({ to: to.trim(), subject: subject.trim(), body, scheduledAt: scheduledAt || undefined })
      resetAndClose()
    } catch (error) {
      console.error('Verzenden mislukt:', error)
    } finally {
      setIsSending(false)
    }
  }

  const resetAndClose = () => {
    setTo(defaultTo)
    setCc('')
    setShowCc(false)
    setSubject(defaultSubject)
    setTemplate('none')
    setScheduledAt('')
    setShowScheduleDropdown(false)
    setScheduleOption('now')
    setCustomDate('')
    setCustomTime('09:00')
    setAttachments([])
    setShowMergeFields(false)
    setEditorEmpty(true)
    if (editorRef.current) editorRef.current.innerHTML = ''
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={resetAndClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Nieuwe email</DialogTitle>
          <DialogDescription>Stel een nieuw bericht op en verstuur het.</DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-y-auto">
          {/* Template selector */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Template</Label>
            <Select value={template} onValueChange={handleTemplateChange}>
              <SelectTrigger>
                <SelectValue placeholder="Selecteer template" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Geen template</SelectItem>
                <SelectItem value="offerte-followup">Offerte follow-up</SelectItem>
                <SelectItem value="project-update">Project update</SelectItem>
                <SelectItem value="welkomstbericht">Welkomstbericht</SelectItem>
                <SelectItem value="betaalherinnering">Betaalherinnering</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* To field */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Aan</Label>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs text-muted-foreground"
                onClick={() => setShowCc(!showCc)}
              >
                CC {showCc ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
              </Button>
            </div>
            <Input value={to} onChange={(e) => setTo(e.target.value)} placeholder="email@voorbeeld.nl" type="email" />
          </div>

          {/* CC field */}
          {showCc && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">CC</Label>
              <Input value={cc} onChange={(e) => setCc(e.target.value)} placeholder="cc@voorbeeld.nl" type="email" />
            </div>
          )}

          {/* Subject */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Onderwerp</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Onderwerp van de email..." />
          </div>

          {/* Body - Rich Editor */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Bericht</Label>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1.5 text-xs text-accent hover:text-accent hover:bg-wm-pale/20 dark:hover:bg-primary/20"
                onClick={handleAiGenerate}
              >
                <Sparkles className="w-3.5 h-3.5" />
                AI Genereren
              </Button>
            </div>

            {/* Editor card - one cohesive unit */}
            <div className="border rounded-lg overflow-hidden">
              {/* Merge fields toolbar */}
              <div className="flex items-center gap-0.5 px-2 py-1.5 border-b bg-muted/20">
                <div className="relative" ref={mergeFieldRef}>
                  <button
                    onClick={() => setShowMergeFields(!showMergeFields)}
                    className={cn(
                      'flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded hover:bg-accent transition-colors',
                      showMergeFields && 'bg-accent'
                    )}
                  >
                    <Type className="w-3.5 h-3.5" />
                    Veld invoegen
                    <ChevronDown className="w-3 h-3" />
                  </button>
                  {showMergeFields && (
                    <div className="absolute left-0 top-full mt-1 w-52 rounded-md border bg-popover p-1 shadow-lg z-50">
                      {mergeFields.map(f => (
                        <button
                          key={f.id}
                          onClick={() => insertMergeField(f.value)}
                          className="w-full text-left px-3 py-2 text-sm rounded hover:bg-accent transition-colors flex items-center justify-between"
                        >
                          <span>{f.label}</span>
                          <span className="text-[10px] text-muted-foreground font-mono">{f.value}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* ContentEditable - full width, no side gaps */}
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
                  className="min-h-[280px] max-h-[500px] overflow-y-auto px-4 py-3 text-sm leading-relaxed focus:outline-none"
                  suppressContentEditableWarning
                />
              </div>

              {/* Attachments */}
              {attachments.length > 0 && (
                <div className="px-3 py-2 border-t bg-muted/10">
                  <div className="flex flex-wrap gap-2">
                    {attachments.map((file, i) => (
                      <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 bg-muted rounded-md text-xs">
                        <div className={`w-6 h-6 rounded flex items-center justify-center text-white text-[8px] font-bold flex-shrink-0 ${getFileTypeColor(file.name)}`}>
                          {getFileExt(file.name)}
                        </div>
                        <span className="font-medium max-w-[120px] truncate">{file.name}</span>
                        <span className="text-muted-foreground">({formatFileSize(file.size)})</span>
                        <button onClick={() => removeAttachment(i)} className="text-muted-foreground hover:text-red-500 transition-colors">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Formatting toolbar */}
              <div className="flex items-center gap-0.5 px-2 py-1 border-t bg-muted/30 flex-wrap">
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
                  title="Vet (Ctrl+B)"
                >
                  <Bold className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => execFormat('italic')}
                  className={cn('p-1.5 rounded hover:bg-accent transition-colors', activeFormats.italic && 'bg-accent text-foreground')}
                  title="Cursief (Ctrl+I)"
                >
                  <Italic className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => execFormat('underline')}
                  className={cn('p-1.5 rounded hover:bg-accent transition-colors', activeFormats.underline && 'bg-accent text-foreground')}
                  title="Onderstrepen (Ctrl+U)"
                >
                  <Underline className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => execFormat('strikeThrough')}
                  className={cn('p-1.5 rounded hover:bg-accent transition-colors', activeFormats.strikethrough && 'bg-accent text-foreground')}
                  title="Doorhalen"
                >
                  <Strikethrough className="w-3.5 h-3.5" />
                </button>

                <Separator orientation="vertical" className="h-4 mx-1" />

                <button onClick={() => execFormat('insertUnorderedList')} className="p-1.5 rounded hover:bg-accent transition-colors" title="Opsommingslijst">
                  <List className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
                <button onClick={() => execFormat('insertOrderedList')} className="p-1.5 rounded hover:bg-accent transition-colors" title="Genummerde lijst">
                  <ListOrdered className="w-3.5 h-3.5 text-muted-foreground" />
                </button>

                <Separator orientation="vertical" className="h-4 mx-1" />

                <button onClick={() => execFormat('justifyLeft')} className="p-1.5 rounded hover:bg-accent transition-colors" title="Links uitlijnen">
                  <AlignLeft className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
                <button onClick={() => execFormat('justifyCenter')} className="p-1.5 rounded hover:bg-accent transition-colors" title="Centreren">
                  <AlignCenter className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
                <button onClick={() => execFormat('justifyRight')} className="p-1.5 rounded hover:bg-accent transition-colors" title="Rechts uitlijnen">
                  <AlignRight className="w-3.5 h-3.5 text-muted-foreground" />
                </button>

                <Separator orientation="vertical" className="h-4 mx-1" />

                <button onClick={() => execFormat('formatBlock', 'blockquote')} className="p-1.5 rounded hover:bg-accent transition-colors" title="Citaat">
                  <Quote className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
                <button onClick={insertLink} className="p-1.5 rounded hover:bg-accent transition-colors" title="Link invoegen">
                  <Link2 className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-shrink-0 flex items-center justify-between sm:justify-between">
          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              multiple
              onChange={handleFileSelect}
              className="hidden"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.svg,.zip,.rar,.txt,.csv"
            />
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-muted-foreground"
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip className="w-4 h-4" />
              Bijlage toevoegen
            </Button>
            {attachments.length > 0 && (
              <span className="text-xs text-muted-foreground">
                {attachments.length} bestand{attachments.length > 1 ? 'en' : ''}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={resetAndClose}>
              Annuleren
            </Button>
            <div className="relative" ref={scheduleDropdownRef}>
              <div className="flex">
                <Button
                  onClick={handleSend}
                  disabled={!to.trim() || !subject.trim() || isSending}
                  className="gap-2 rounded-r-none"
                >
                  {scheduledAt ? (
                    <><Clock className="w-4 h-4" />{isSending ? 'Inplannen...' : 'Inplannen'}</>
                  ) : (
                    <><Send className="w-4 h-4" />{isSending ? 'Verzenden...' : 'Verzenden'}</>
                  )}
                </Button>
                <Button
                  variant="default"
                  size="icon"
                  className="rounded-l-none border-l border-l-primary-foreground/20 px-2"
                  onClick={() => setShowScheduleDropdown(!showScheduleDropdown)}
                  type="button"
                >
                  <CalendarClock className="w-4 h-4" />
                </Button>
              </div>
              {showScheduleDropdown && (
                <div className="absolute right-0 bottom-full mb-2 w-72 rounded-md border bg-popover p-2 shadow-md z-50">
                  <div className="space-y-1">
                    <button
                      type="button"
                      className={cn('w-full text-left px-3 py-2 text-sm rounded-md hover:bg-accent', scheduleOption === 'now' && 'bg-accent font-medium')}
                      onClick={() => handleScheduleSelect('now')}
                    >
                      <div className="flex items-center gap-2"><Send className="w-4 h-4" /> Nu verzenden</div>
                    </button>
                    <button
                      type="button"
                      className={cn('w-full text-left px-3 py-2 text-sm rounded-md hover:bg-accent', scheduleOption === 'tomorrow-9' && 'bg-accent font-medium')}
                      onClick={() => handleScheduleSelect('tomorrow-9')}
                    >
                      <div className="flex items-center gap-2"><Clock className="w-4 h-4" /> Morgen 09:00</div>
                    </button>
                    <button
                      type="button"
                      className={cn('w-full text-left px-3 py-2 text-sm rounded-md hover:bg-accent', scheduleOption === 'tomorrow-14' && 'bg-accent font-medium')}
                      onClick={() => handleScheduleSelect('tomorrow-14')}
                    >
                      <div className="flex items-center gap-2"><Clock className="w-4 h-4" /> Morgen 14:00</div>
                    </button>
                    <button
                      type="button"
                      className={cn('w-full text-left px-3 py-2 text-sm rounded-md hover:bg-accent', scheduleOption === 'next-monday' && 'bg-accent font-medium')}
                      onClick={() => handleScheduleSelect('next-monday')}
                    >
                      <div className="flex items-center gap-2"><CalendarClock className="w-4 h-4" /> Volgende week maandag 09:00</div>
                    </button>
                    <div className="border-t my-1" />
                    <button
                      type="button"
                      className={cn('w-full text-left px-3 py-2 text-sm rounded-md hover:bg-accent', scheduleOption === 'custom' && 'bg-accent font-medium')}
                      onClick={() => handleScheduleSelect('custom')}
                    >
                      <div className="flex items-center gap-2"><CalendarClock className="w-4 h-4" /> Aangepaste datum/tijd</div>
                    </button>
                    {scheduleOption === 'custom' && (
                      <div className="px-3 py-2 space-y-2">
                        <div>
                          <Label className="text-xs">Datum</Label>
                          <Input
                            type="date"
                            value={customDate}
                            onChange={(e) => {
                              setCustomDate(e.target.value)
                              if (e.target.value && customTime) setScheduledAt(`${e.target.value}T${customTime}`)
                            }}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Tijd</Label>
                          <Input
                            type="time"
                            value={customTime}
                            onChange={(e) => {
                              setCustomTime(e.target.value)
                              if (customDate && e.target.value) setScheduledAt(`${customDate}T${e.target.value}`)
                            }}
                            className="h-8 text-sm"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
